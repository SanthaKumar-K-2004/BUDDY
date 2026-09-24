import { describe, it, expect } from 'vitest';
import { RulesetValidator, CHROMIUM_DNR_LIMITS, type DnrRule } from '@buddy/filter-pipeline';

describe('RulesetValidator - Chromium MV3 Limit Enforcement and Schema Checks', () => {
  it('passes a fully valid declarativeNetRequest ruleset', () => {
    const rules: DnrRule[] = [
      {
        id: 1,
        priority: 100000,
        action: { type: 'allow' },
        condition: { urlFilter: '||safe-domain.com/ad.js', resourceTypes: ['script'] },
      },
      {
        id: 2,
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: '||tracker.net^', domainType: 'thirdParty' },
      },
    ];

    const report = RulesetValidator.validate('ruleset_test', rules);

    expect(report.isValid).toBe(true);
    expect(report.totalRules).toBe(2);
    expect(report.safeRules).toBe(2);
    expect(report.unsafeRules).toBe(0);
    expect(report.regexRules).toBe(0);
    expect(report.issues).toHaveLength(0);
  });

  it('fails ruleset when duplicate rule IDs exist', () => {
    const rules: DnrRule[] = [
      {
        id: 42,
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: '||rule-a.com^' },
      },
      {
        id: 42, // Duplicate!
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: '||rule-b.com^' },
      },
    ];

    const report = RulesetValidator.validate('ruleset_test', rules);

    expect(report.isValid).toBe(false);
    expect(report.issues.some((iss) => iss.code === 'DUPLICATE_RULE_ID')).toBe(true);
  });

  it('fails ruleset when rule ID is non-positive or non-integer', () => {
    const rules: DnrRule[] = [
      {
        id: 0, // Invalid: must be >= 1
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: '||test.com^' },
      },
      {
        id: -5, // Invalid
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: '||test2.com^' },
      },
    ];

    const report = RulesetValidator.validate('ruleset_test', rules);

    expect(report.isValid).toBe(false);
    expect(report.issues.some((iss) => iss.code === 'INVALID_RULE_ID')).toBe(true);
  });

  it('fails ruleset when action type is invalid', () => {
    const rules: DnrRule[] = [
      {
        id: 1,
        priority: 1,
        action: { type: 'invalid_action_type' as any },
        condition: { urlFilter: '||test.com^' },
      },
    ];

    const report = RulesetValidator.validate('ruleset_test', rules);

    expect(report.isValid).toBe(false);
    expect(report.issues.some((iss) => iss.code === 'INVALID_ACTION')).toBe(true);
  });

  it('fails ruleset when condition specifies neither urlFilter nor regexFilter', () => {
    const rules: DnrRule[] = [
      {
        id: 1,
        priority: 1,
        action: { type: 'block' },
        condition: {},
      },
    ];

    const report = RulesetValidator.validate('ruleset_test', rules);

    expect(report.isValid).toBe(false);
    expect(report.issues.some((iss) => iss.code === 'NO_FILTER_SPECIFIED')).toBe(true);
  });

  it('fails ruleset when regexFilter is syntactically invalid', () => {
    const rules: DnrRule[] = [
      {
        id: 1,
        priority: 1,
        action: { type: 'block' },
        condition: { regexFilter: '([unclosed-regex' },
      },
    ];

    const report = RulesetValidator.validate('ruleset_test', rules);

    expect(report.isValid).toBe(false);
    expect(report.issues.some((iss) => iss.code === 'INVALID_REGEX')).toBe(true);
  });

  it('enforces Chromium 30,000 static rules per ruleset ceiling', () => {
    // Generate a mock ruleset with 30,001 rules
    const oversizedRules: DnrRule[] = Array.from(
      { length: CHROMIUM_DNR_LIMITS.MAX_STATIC_RULES_PER_RULESET + 1 },
      (_, i) => ({
        id: i + 1,
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: `||rule-${i}.com^` },
      })
    );

    const report = RulesetValidator.validate('ruleset_huge', oversizedRules);

    expect(report.isValid).toBe(false);
    expect(report.issues.some((iss) => iss.code === 'LIMIT_STATIC_RULES_EXCEEDED')).toBe(true);
  });
});
