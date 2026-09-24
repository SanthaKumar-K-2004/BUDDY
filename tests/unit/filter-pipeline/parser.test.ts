import { describe, it, expect } from 'vitest';
import { FilterParser } from '@buddy/filter-pipeline';

describe('FilterParser - AGTree AST Parsing and Rule Classification', () => {
  it('parses standard network blocking rules and extracts modifiers', () => {
    const lines = [
      '||doubleclick.net^$third-party,image',
      '||googlesyndication.com^$script,domain=example.com|~safe.org',
    ];

    const result = FilterParser.parse('test-source', lines);

    expect(result.networkRules).toHaveLength(2);
    expect(result.stats.networkRules).toBe(2);
    expect(result.stats.validRules).toBe(2);

    const first = result.networkRules[0];
    expect(first.isException).toBe(false);
    expect(first.pattern).toBe('||doubleclick.net^');
    expect(first.thirdParty).toBe(true);
    expect(first.resourceTypes).toContain('image');

    const second = result.networkRules[1];
    expect(second.pattern).toBe('||googlesyndication.com^');
    expect(second.domains).toEqual(['example.com']);
    expect(second.excludedDomains).toEqual(['safe.org']);
    expect(second.resourceTypes).toContain('script');
  });

  it('parses network exception (allow) rules', () => {
    const lines = [
      '@@||allowed.example.com/ad.js$script',
      '@@||partner.com^$domain=whitelisted.org',
    ];

    const result = FilterParser.parse('test-source', lines);

    expect(result.networkRules).toHaveLength(2);
    expect(result.networkRules[0].isException).toBe(true);
    expect(result.networkRules[0].pattern).toBe('||allowed.example.com/ad.js');
    expect(result.networkRules[1].isException).toBe(true);
  });

  it('parses cosmetic element hiding rules', () => {
    const lines = ['##.ad-banner', '###sidebar-sponsored-box', '##div[class*="promoted"]'];
    const result = FilterParser.parse('test-source', lines);

    expect(result.cosmeticRules).toHaveLength(3);
    expect(result.stats.cosmeticRules).toBe(3);
    expect(result.cosmeticRules[0].selector).toBe('.ad-banner');
  });

  it('parses scriptlet injection rules', () => {
    const lines = ['##+js(set-local-storage-item, ad-seen, true)'];
    const result = FilterParser.parse('test-source', lines);

    expect(result.scriptletRules).toHaveLength(1);
    expect(result.stats.scriptletRules).toBe(1);
    expect(result.scriptletRules[0].scriptletName).toBe('set-local-storage-item');
    expect(result.scriptletRules[0].args).toEqual(['ad-seen', 'true']);
  });

  it('parses hosts file format lines into both hosts rules and synthetic network rules', () => {
    const lines = [
      '127.0.0.1 malicious-ad.com',
      '0.0.0.0 telemetry-tracker.org',
    ];

    const result = FilterParser.parse('test-source', lines);

    expect(result.hostsRules).toHaveLength(2);
    expect(result.stats.hostsRules).toBe(2);
    expect(result.hostsRules[0].domain).toBe('malicious-ad.com');
    expect(result.hostsRules[1].domain).toBe('telemetry-tracker.org');

    // Synthesized network rules for DNR conversion
    expect(result.networkRules).toHaveLength(2);
    expect(result.networkRules[0].pattern).toBe('||malicious-ad.com^');
  });

  it('collects diagnostics and reports errors for malformed rules', () => {
    const lines = [
      '||valid-rule.com^',
      'example.com##+js(',
    ];

    const result = FilterParser.parse('test-source', lines);

    expect(result.stats.validRules).toBe(1);
    expect(result.stats.errorRules).toBe(1);
    expect(result.diagnostics.some((d) => d.severity === 'ERROR')).toBe(true);
  });
});
