import { describe, it, expect } from 'vitest';
import { DnrConverter, RuleDeduplicator, type DnrRule } from '@buddy/filter-pipeline';

describe('DnrConverter & RuleDeduplicator - Declarative Net Request Compilation', () => {
  it('converts adblock rules into valid Chrome MV3 Declarative Net Request rules', async () => {
    const filterText = `
||doubleclick.net^$third-party
@@||allowed-ad.com/script.js$script
||malware-beacon.org^
`;

    const result = await DnrConverter.convertList('ruleset_test', filterText);

    expect(result.rules.length).toBeGreaterThanOrEqual(3);
    expect(result.safeRulesCount).toBeGreaterThanOrEqual(3);

    const blockRule = result.rules.find((r) => r.condition.urlFilter === '||doubleclick.net^');
    expect(blockRule).toBeDefined();
    expect(blockRule?.action.type).toBe('block');
    expect(blockRule?.condition.domainType).toBe('thirdParty');

    const allowRule = result.rules.find((r) => r.condition.urlFilter === '||allowed-ad.com/script.js');
    expect(allowRule).toBeDefined();
    expect(allowRule?.action.type).toBe('allow');
    expect(allowRule?.condition.resourceTypes).toContain('script');
    expect(allowRule!.priority).toBeGreaterThan(100000); // Exception priority
  });

  it('deduplicates identical DNR rules deterministically', () => {
    const rules: DnrRule[] = [
      {
        id: 10,
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: '||tracker.com^' },
      },
      {
        id: 20,
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: '||tracker.com^' }, // Duplicate!
      },
      {
        id: 30,
        priority: 100000,
        action: { type: 'allow' },
        condition: { urlFilter: '||safe.com^' },
      },
    ];

    const result = RuleDeduplicator.deduplicate(rules);

    expect(result.stats.originalRules).toBe(3);
    expect(result.stats.uniqueRules).toBe(2);
    expect(result.stats.duplicateRules).toBe(1);
    expect(result.rules).toHaveLength(2);

    // Prioritized ordering: allow rule first (priority 100000), then block rule (priority 1)
    expect(result.rules[0].action.type).toBe('allow');
    expect(result.rules[0].id).toBe(1);
    expect(result.rules[1].action.type).toBe('block');
    expect(result.rules[1].id).toBe(2);
  });

  it('assigns strictly unique and sequential positive integer rule IDs', () => {
    const rules: DnrRule[] = Array.from({ length: 50 }, (_, i) => ({
      id: 9999 + i,
      priority: 1,
      action: { type: 'block' },
      condition: { urlFilter: `||ad-domain-${i}.com^` },
    }));

    const result = RuleDeduplicator.deduplicate(rules, 100);

    expect(result.rules).toHaveLength(50);
    expect(result.rules[0].id).toBe(100);
    expect(result.rules[49].id).toBe(149);

    const ids = result.rules.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(50);
  });
});
