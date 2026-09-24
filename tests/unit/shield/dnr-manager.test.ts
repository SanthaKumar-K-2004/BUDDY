import { describe, it, expect, beforeEach } from 'vitest';
import { DNRRulesetManager, MemoryBlockingRuntime } from '@buddy/shield-dnr';

describe('DNRRulesetManager', () => {
  let runtime: MemoryBlockingRuntime;
  let dnr: DNRRulesetManager;

  beforeEach(() => {
    runtime = new MemoryBlockingRuntime();
    dnr = new DNRRulesetManager(runtime);
  });

  describe('Ruleset Lifecycle', () => {
    it('registers static rulesets by default', () => {
      const rulesets = dnr.getRegisteredRulesets();
      expect(rulesets.length).toBe(2);
      expect(rulesets.map((r) => r.id)).toEqual(['ruleset_ads', 'ruleset_trackers']);
    });

    it('enables and disables all static rulesets', async () => {
      await dnr.initialize();
      expect(await dnr.isRulesetEnabled('ruleset_ads')).toBe(true);
      expect(await dnr.isRulesetEnabled('ruleset_trackers')).toBe(true);

      await dnr.disableAllRulesets();
      expect(await dnr.isRulesetEnabled('ruleset_ads')).toBe(false);
      expect(await dnr.isRulesetEnabled('ruleset_trackers')).toBe(false);

      await dnr.enableAllRulesets();
      expect(await dnr.isRulesetEnabled('ruleset_ads')).toBe(true);
      expect(await dnr.isRulesetEnabled('ruleset_trackers')).toBe(true);
    });
  });

  describe('Per-Site Pause Allow Rules', () => {
    it('installs a dynamic allow rule when pausing a site', async () => {
      await dnr.initialize();
      await dnr.pauseSite('nytimes.com');

      const pausedSites = await dnr.getPausedSites();
      expect(pausedSites).toContain('nytimes.com');

      const dynamicRules = await runtime.getDynamicRules();
      expect(dynamicRules.length).toBe(1);
      expect(dynamicRules[0]?.action.type).toBe('allowAllRequests');
      expect(dynamicRules[0]?.condition.initiatorDomains).toEqual(['nytimes.com']);
    });

    it('removes dynamic allow rule when resuming a site', async () => {
      await dnr.initialize();
      await dnr.pauseSite('nytimes.com');
      expect((await runtime.getDynamicRules()).length).toBe(1);

      await dnr.resumeSite('nytimes.com');
      expect((await runtime.getDynamicRules()).length).toBe(0);
      expect(await dnr.getPausedSites()).not.toContain('nytimes.com');
    });

    it('validates dynamic rule limits and flags overflow', async () => {
      await dnr.initialize();
      const validation = await dnr.validateRulesetLimits();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });
  });
});
