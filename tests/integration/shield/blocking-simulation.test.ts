import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface DNRRule {
  id: number;
  priority: number;
  action: { type: string };
  condition: {
    urlFilter?: string;
    regexFilter?: string;
    resourceTypes?: string[];
    initiatorDomains?: string[];
    requestDomains?: string[];
  };
}

describe('DNR Network Blocking Simulation', () => {
  const adsPath = path.resolve(process.cwd(), 'data/generated/ruleset_ads.json');
  const trackersPath = path.resolve(process.cwd(), 'data/generated/ruleset_trackers.json');

  const adsRules: DNRRule[] = JSON.parse(fs.readFileSync(adsPath, 'utf-8'));
  const trackersRules: DNRRule[] = JSON.parse(fs.readFileSync(trackersPath, 'utf-8'));
  const allStaticRules: DNRRule[] = [...adsRules, ...trackersRules];

  /**
   * Minimal declarativeNetRequest condition evaluator matching Chrome MV3 behavior.
   */
  function matchRule(url: string, initiatorDomain: string, dynamicRules: DNRRule[] = []): { action: string; ruleId: number; priority: number } | null {
    // 1. Check dynamic rules first (e.g. allow rules installed for paused sites)
    for (const rule of dynamicRules) {
      if (rule.condition.initiatorDomains?.includes(initiatorDomain)) {
        return { action: rule.action.type, ruleId: rule.id, priority: rule.priority };
      }
    }

    // 2. Check static blocking rules
    let bestMatch: { action: string; ruleId: number; priority: number } | null = null;

    for (const rule of allStaticRules) {
      if (rule.condition.urlFilter) {
        const filter = rule.condition.urlFilter;
        let isMatch = false;

        if (filter.startsWith('||') && filter.endsWith('^')) {
          const domainPattern = filter.slice(2, -1);
          isMatch = url.includes(`://${domainPattern}`) || url.includes(`.${domainPattern}`);
        } else if (filter.startsWith('||')) {
          const domainPattern = filter.slice(2);
          isMatch = url.includes(domainPattern);
        } else if (filter.includes('^')) {
          const part = filter.replace(/\^/g, '');
          isMatch = url.includes(part);
        } else {
          isMatch = url.includes(filter);
        }

        if (isMatch) {
          if (!bestMatch || rule.priority > bestMatch.priority) {
            bestMatch = { action: rule.action.type, ruleId: rule.id, priority: rule.priority };
          }
        }
      }
    }

    return bestMatch;
  }

  it('blocks known ad network requests when site is protected', () => {
    // Known test request matching doubleclick
    const testAdUrl = 'https://ad.doubleclick.net/ad/banner.js';
    const match = matchRule(testAdUrl, 'example.com');

    expect(match).not.toBeNull();
    expect(match?.action).toBe('block');
    expect(match?.priority).toBeGreaterThanOrEqual(1);
  });

  it('allows benign non-ad network requests', () => {
    const cleanUrl = 'https://cdn.example.com/assets/app.bundle.js';
    const match = matchRule(cleanUrl, 'example.com');

    expect(match).toBeNull();
  });

  it('overrides static block rules when site is paused via high-priority allowAllRequests dynamic rule', () => {
    const testAdUrl = 'https://ad.doubleclick.net/ad/banner.js';

    // Before pause: blocked
    const beforePause = matchRule(testAdUrl, 'nytimes.com');
    expect(beforePause?.action).toBe('block');

    // Simulate pause on nytimes.com: dynamic rule installed with priority 9999
    const dynamicPauseRules: DNRRule[] = [
      {
        id: 12345,
        priority: 9999,
        action: { type: 'allowAllRequests' },
        condition: { initiatorDomains: ['nytimes.com'] },
      },
    ];

    // After pause: allowed on nytimes.com
    const onPausedSite = matchRule(testAdUrl, 'nytimes.com', dynamicPauseRules);
    expect(onPausedSite?.action).toBe('allowAllRequests');
    expect(onPausedSite?.priority).toBe(9999);

    // Meanwhile, other sites remain blocked!
    const onOtherSite = matchRule(testAdUrl, 'other-site.com', dynamicPauseRules);
    expect(onOtherSite?.action).toBe('block');
  });
});
