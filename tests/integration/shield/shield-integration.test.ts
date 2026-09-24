import { describe, it, expect, beforeEach } from 'vitest';
import { ShieldEngine } from '@buddy/shield-core';
import { MemoryStorageAdapter } from '@buddy/storage';
import { PolicyEngine } from '@buddy/shield-policy';
import { StatsEngine } from '@buddy/shield-stats';
import { DNRRulesetManager, MemoryBlockingRuntime } from '@buddy/shield-dnr';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Shield End-to-End Integration Flow', () => {
  let memoryStorage: MemoryStorageAdapter;
  let policy: PolicyEngine;
  let stats: StatsEngine;
  let dnrRuntime: MemoryBlockingRuntime;
  let dnr: DNRRulesetManager;
  let shield: ShieldEngine;

  beforeEach(() => {
    memoryStorage = new MemoryStorageAdapter();
    policy = new PolicyEngine(memoryStorage);
    stats = new StatsEngine(memoryStorage);
    dnrRuntime = new MemoryBlockingRuntime();
    dnr = new DNRRulesetManager(dnrRuntime);
    shield = new ShieldEngine(memoryStorage, policy, stats, dnr);
  });

  it('verifies Phase 1 generated ruleset artifacts are valid and loadable', () => {
    const adsPath = path.resolve(process.cwd(), 'data/generated/ruleset_ads.json');
    const trackersPath = path.resolve(process.cwd(), 'data/generated/ruleset_trackers.json');

    expect(fs.existsSync(adsPath)).toBe(true);
    expect(fs.existsSync(trackersPath)).toBe(true);

    const adsRules = JSON.parse(fs.readFileSync(adsPath, 'utf-8'));
    const trackersRules = JSON.parse(fs.readFileSync(trackersPath, 'utf-8'));

    expect(Array.isArray(adsRules)).toBe(true);
    expect(Array.isArray(trackersRules)).toBe(true);
    expect(adsRules.length).toBeGreaterThan(0);
    expect(trackersRules.length).toBeGreaterThan(0);

    // Verify rules have valid DNR structure
    expect(adsRules[0].id).toBeGreaterThan(0);
    expect(['block', 'allow', 'allowAllRequests']).toContain(adsRules[0].action.type);
    expect(adsRules.some((r: any) => r.action.type === 'block')).toBe(true);
    expect(adsRules[0].condition).toBeDefined();
  });

  it('orchestrates complete lifecycle: initialize -> block events -> flush -> popup query -> per-site pause', async () => {
    await shield.initialize();

    // 1. Record block events from content script and network
    shield.stats.recordBlock({ siteId: 'news.com', category: 'ad', source: 'dnr' });
    shield.stats.recordBlock({ siteId: 'news.com', category: 'ad', source: 'dnr' });
    shield.stats.recordBlock({ siteId: 'news.com', category: 'tracker', source: 'dnr' });
    shield.stats.recordBlock({ siteId: 'news.com', category: 'cosmetic', source: 'cosmetic' });

    // 2. Query status for news.com
    let status = await shield.getStatus('news.com');
    expect(status.isGloballyEnabled).toBe(true);
    expect(status.isProtected).toBe(true);
    expect(status.totalBlocked).toBe(4);
    expect(status.adsBlocked).toBe(2);
    expect(status.trackersBlocked).toBe(1);

    // 3. Flush stats to storage (e.g. on service worker lifecycle alarm)
    await shield.stats.flush();

    // Verify persisted in dailyStats
    const today = new Date().toISOString().split('T')[0] ?? '';
    const dailyStats = (await memoryStorage.get('dailyStats'))[today];
    expect(dailyStats).toBeDefined();
    expect(dailyStats?.totalAdsBlocked).toBe(3); // 2 ads + 1 cosmetic
    expect(dailyStats?.totalTrackersBlocked).toBe(1);

    // 4. User pauses protection on news.com
    await shield.pauseForSite('news.com');

    status = await shield.getStatus('news.com');
    expect(status.isGloballyEnabled).toBe(true);
    expect(status.isProtected).toBe(false);

    // Verify DNR runtime has active allowAllRequests rule for news.com
    const dynamicRules = await dnrRuntime.getDynamicRules();
    expect(dynamicRules.length).toBe(1);
    expect(dynamicRules[0]?.condition.initiatorDomains).toEqual(['news.com']);

    // 5. User resumes protection on news.com
    await shield.resumeForSite('news.com');
    status = await shield.getStatus('news.com');
    expect(status.isProtected).toBe(true);
    expect((await dnrRuntime.getDynamicRules()).length).toBe(0);
  });
});
