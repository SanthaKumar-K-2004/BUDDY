/**
 * @buddy/shield-dnr - ruleset-manager.ts
 * Manages static rulesets and dynamic per-site allowlist overrides.
 */

import type { BlockingRuntime, IDNRManager, RulesetInfo } from './types.js';
import { createBlockingRuntime } from './runtime.js';

export const STATIC_RULESETS: readonly RulesetInfo[] = [
  {
    id: 'ruleset_ads',
    enabled: true,
    path: 'rulesets/ruleset_ads.json',
  },
  {
    id: 'ruleset_trackers',
    enabled: true,
    path: 'rulesets/ruleset_trackers.json',
  },
];

export class DNRRulesetManager implements IDNRManager {
  private readonly runtime: BlockingRuntime;
  private readonly pausedDomainRuleMap: Map<string, number> = new Map();

  constructor(runtime: BlockingRuntime = createBlockingRuntime()) {
    this.runtime = runtime;
  }

  /**
   * Deterministically map a domain to a stable 31-bit positive rule ID in the dynamic range (10,000 - 99,999).
   */
  private getRuleIdForDomain(domain: string): number {
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
      hash = (hash << 5) - hash + domain.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);
    return 10000 + (positiveHash % 89999);
  }

  async initialize(): Promise<void> {
    // Restore any existing dynamic rules into memory map
    const existingDynamic = await this.runtime.getDynamicRules();
    for (const rule of existingDynamic) {
      if (rule.condition.initiatorDomains && rule.condition.initiatorDomains.length > 0) {
        const domain = rule.condition.initiatorDomains[0];
        if (domain) {
          this.pausedDomainRuleMap.set(domain, rule.id);
        }
      }
    }
  }

  getRegisteredRulesets(): readonly RulesetInfo[] {
    return STATIC_RULESETS;
  }

  async isRulesetEnabled(rulesetId: string): Promise<boolean> {
    const enabled = await this.runtime.getEnabledRulesets();
    return enabled.includes(rulesetId);
  }

  async enableAllRulesets(): Promise<void> {
    const ids = STATIC_RULESETS.map((r) => r.id);
    await this.runtime.enableRulesets(ids);
  }

  async disableAllRulesets(): Promise<void> {
    const ids = STATIC_RULESETS.map((r) => r.id);
    await this.runtime.disableRulesets(ids);
  }

  async pauseSite(domain: string): Promise<void> {
    if (!domain) return;
    const ruleId = this.getRuleIdForDomain(domain);
    this.pausedDomainRuleMap.set(domain, ruleId);
    await this.runtime.allowDomain(domain, ruleId);
  }

  async resumeSite(domain: string): Promise<void> {
    if (!domain) return;
    const ruleId = this.pausedDomainRuleMap.get(domain) ?? this.getRuleIdForDomain(domain);
    this.pausedDomainRuleMap.delete(domain);
    await this.runtime.disallowDomain(ruleId);
  }

  async getPausedSites(): Promise<readonly string[]> {
    return Array.from(this.pausedDomainRuleMap.keys());
  }

  async validateRulesetLimits(): Promise<{ valid: boolean; errors: string[] }> {
    const limits = await this.runtime.getRuleLimits();
    const dynamicRules = await this.runtime.getDynamicRules();
    const errors: string[] = [];

    if (dynamicRules.length >= limits.maxDynamicRules) {
      errors.push(
        `Dynamic rules count (${dynamicRules.length}) reached or exceeded browser maximum (${limits.maxDynamicRules})`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
