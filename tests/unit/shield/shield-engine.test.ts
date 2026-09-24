import { describe, it, expect, beforeEach } from 'vitest';
import { ShieldEngine } from '@buddy/shield-core';
import { MemoryStorageAdapter } from '@buddy/storage';
import { PolicyEngine } from '@buddy/shield-policy';
import { StatsEngine } from '@buddy/shield-stats';
import { DNRRulesetManager, MemoryBlockingRuntime } from '@buddy/shield-dnr';

describe('ShieldEngine Orchestrator', () => {
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

  describe('Initialization and Global Toggle', () => {
    it('initializes and enables rulesets when globally active', async () => {
      await shield.initialize();

      const status = await shield.getStatus();
      expect(status.isGloballyEnabled).toBe(true);
      expect(status.isProtected).toBe(true);
      expect(status.activeRulesets).toEqual(['ruleset_ads', 'ruleset_trackers']);
    });

    it('disables rulesets when global shield is turned off', async () => {
      await shield.initialize();
      await shield.disable();

      const status = await shield.getStatus('example.com');
      expect(status.isGloballyEnabled).toBe(false);
      expect(status.isProtected).toBe(false);
      expect(status.activeRulesets).toEqual([]);

      await shield.enable();
      const enabledStatus = await shield.getStatus('example.com');
      expect(enabledStatus.isGloballyEnabled).toBe(true);
      expect(enabledStatus.isProtected).toBe(true);
    });
  });

  describe('Per-Site Pause Orchestration', () => {
    it('pauses protection for target site in both policy and DNR', async () => {
      await shield.initialize();
      await shield.pauseForSite('https://www.forbes.com/article');

      const forbesStatus = await shield.getStatus('forbes.com');
      expect(forbesStatus.isProtected).toBe(false);
      expect(forbesStatus.isGloballyEnabled).toBe(true);

      // Other sites remain protected
      const exampleStatus = await shield.getStatus('example.com');
      expect(exampleStatus.isProtected).toBe(true);

      // Verify DNR has installed dynamic allow rule
      const dynamicRules = await dnrRuntime.getDynamicRules();
      expect(dynamicRules.length).toBe(1);
      expect(dynamicRules[0]?.condition.initiatorDomains).toEqual(['forbes.com']);
    });

    it('resumes protection for target site in both policy and DNR', async () => {
      await shield.initialize();
      await shield.pauseForSite('forbes.com');
      expect((await shield.getStatus('forbes.com')).isProtected).toBe(false);

      await shield.resumeForSite('forbes.com');
      expect((await shield.getStatus('forbes.com')).isProtected).toBe(true);
      expect((await dnrRuntime.getDynamicRules()).length).toBe(0);
    });
  });

  describe('Cosmetic Rules Retrieval', () => {
    it('provides baseline cosmetic selectors', () => {
      const rules = shield.getCosmeticRules('example.com');
      expect(rules.standardSelectors).toContain('.adsbygoogle');
      expect(rules.standardSelectors).toContain('.ad-banner');
    });
  });
});
