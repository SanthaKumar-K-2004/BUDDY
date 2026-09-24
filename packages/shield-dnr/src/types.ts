/**
 * @buddy/shield-dnr - types.ts
 * Types and interfaces for browser declarativeNetRequest abstraction and ruleset lifecycle.
 */

export interface RuleLimits {
  readonly maxStaticRules: number;
  readonly maxDynamicRules: number;
  readonly maxRegexRules: number;
}

export interface RulesetInfo {
  readonly id: string;
  readonly enabled: boolean;
  readonly path: string;
  readonly ruleCount?: number;
}

export interface BlockingRuntime {
  isAvailable(): boolean;
  getRuleLimits(): Promise<RuleLimits>;
  getEnabledRulesets(): Promise<string[]>;
  enableRulesets(rulesetIds: string[]): Promise<void>;
  disableRulesets(rulesetIds: string[]): Promise<void>;
  installDynamicRules(rules: chrome.declarativeNetRequest.Rule[]): Promise<void>;
  removeDynamicRules(ruleIds: number[]): Promise<void>;
  getDynamicRules(): Promise<chrome.declarativeNetRequest.Rule[]>;
  allowDomain(domain: string, ruleId: number): Promise<void>;
  disallowDomain(ruleId: number): Promise<void>;
}

export interface IDNRManager {
  initialize(): Promise<void>;
  enableAllRulesets(): Promise<void>;
  disableAllRulesets(): Promise<void>;
  isRulesetEnabled(rulesetId: string): Promise<boolean>;
  getRegisteredRulesets(): readonly RulesetInfo[];
  pauseSite(domain: string): Promise<void>;
  resumeSite(domain: string): Promise<void>;
  getPausedSites(): Promise<readonly string[]>;
  validateRulesetLimits(): Promise<{ valid: boolean; errors: string[] }>;
}
