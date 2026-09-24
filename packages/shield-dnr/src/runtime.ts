/**
 * @buddy/shield-dnr - runtime.ts
 * Cross-browser DeclarativeNetRequest runtime abstraction.
 */

import type { BlockingRuntime, RuleLimits } from './types.js';

export const CHROME_DEFAULT_LIMITS: RuleLimits = {
  maxStaticRules: 30000,
  maxDynamicRules: 5000,
  maxRegexRules: 1000,
};

export class ChromeBlockingRuntime implements BlockingRuntime {
  isAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      Boolean(chrome.declarativeNetRequest) &&
      typeof chrome.declarativeNetRequest.updateEnabledRulesets === 'function'
    );
  }

  async getRuleLimits(): Promise<RuleLimits> {
    if (!this.isAvailable()) {
      return CHROME_DEFAULT_LIMITS;
    }

    const dnr = chrome.declarativeNetRequest;
    return {
      maxStaticRules: dnr.MAX_NUMBER_OF_STATIC_RULESETS
        ? (dnr.MAX_NUMBER_OF_STATIC_RULESETS * 30000)
        : CHROME_DEFAULT_LIMITS.maxStaticRules,
      maxDynamicRules: dnr.MAX_NUMBER_OF_DYNAMIC_RULES ?? CHROME_DEFAULT_LIMITS.maxDynamicRules,
      maxRegexRules: dnr.MAX_NUMBER_OF_REGEX_RULES ?? CHROME_DEFAULT_LIMITS.maxRegexRules,
    };
  }

  async getEnabledRulesets(): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }

    return new Promise((resolve, reject) => {
      chrome.declarativeNetRequest.getEnabledRulesets((rulesets) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve(rulesets ?? []);
      });
    });
  }

  async enableRulesets(rulesetIds: string[]): Promise<void> {
    if (!this.isAvailable() || rulesetIds.length === 0) return;

    return new Promise((resolve, reject) => {
      chrome.declarativeNetRequest.updateEnabledRulesets(
        { enableRulesetIds: rulesetIds },
        () => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          resolve();
        }
      );
    });
  }

  async disableRulesets(rulesetIds: string[]): Promise<void> {
    if (!this.isAvailable() || rulesetIds.length === 0) return;

    return new Promise((resolve, reject) => {
      chrome.declarativeNetRequest.updateEnabledRulesets(
        { disableRulesetIds: rulesetIds },
        () => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          resolve();
        }
      );
    });
  }

  async installDynamicRules(rules: chrome.declarativeNetRequest.Rule[]): Promise<void> {
    if (!this.isAvailable() || rules.length === 0) return;

    const addRules = rules as chrome.declarativeNetRequest.Rule[];
    return new Promise((resolve, reject) => {
      chrome.declarativeNetRequest.updateDynamicRules(
        { addRules },
        () => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          resolve();
        }
      );
    });
  }

  async removeDynamicRules(ruleIds: number[]): Promise<void> {
    if (!this.isAvailable() || ruleIds.length === 0) return;

    return new Promise((resolve, reject) => {
      chrome.declarativeNetRequest.updateDynamicRules(
        { removeRuleIds: ruleIds },
        () => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          resolve();
        }
      );
    });
  }

  async getDynamicRules(): Promise<chrome.declarativeNetRequest.Rule[]> {
    if (!this.isAvailable()) return [];

    return new Promise((resolve, reject) => {
      chrome.declarativeNetRequest.getDynamicRules((rules) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve(rules ?? []);
      });
    });
  }

  async allowDomain(domain: string, ruleId: number): Promise<void> {
    if (!this.isAvailable()) return;

    const rule: chrome.declarativeNetRequest.Rule = {
      id: ruleId,
      priority: 9999, // Highest priority to override static block rules
      action: {
        type: 'allowAllRequests' as chrome.declarativeNetRequest.RuleActionType,
      },
      condition: {
        initiatorDomains: [domain],
        resourceTypes: [
          'main_frame',
          'sub_frame',
          'stylesheet',
          'script',
          'image',
          'font',
          'object',
          'xmlhttprequest',
          'ping',
          'other',
        ] as chrome.declarativeNetRequest.ResourceType[],
      },
    };

    // Remove existing rule with same ID before adding
    await this.removeDynamicRules([ruleId]);
    await this.installDynamicRules([rule]);
  }

  async disallowDomain(ruleId: number): Promise<void> {
    if (!this.isAvailable()) return;
    await this.removeDynamicRules([ruleId]);
  }
}

/**
 * In-memory Mock implementation for offline, testing, or headless environments.
 */
export class MemoryBlockingRuntime implements BlockingRuntime {
  private enabledRulesets: Set<string> = new Set(['ruleset_ads', 'ruleset_trackers']);
  private dynamicRules: Map<number, chrome.declarativeNetRequest.Rule> = new Map();

  isAvailable(): boolean {
    return true;
  }

  async getRuleLimits(): Promise<RuleLimits> {
    return CHROME_DEFAULT_LIMITS;
  }

  async getEnabledRulesets(): Promise<string[]> {
    return Array.from(this.enabledRulesets);
  }

  async enableRulesets(rulesetIds: string[]): Promise<void> {
    for (const id of rulesetIds) {
      this.enabledRulesets.add(id);
    }
  }

  async disableRulesets(rulesetIds: string[]): Promise<void> {
    for (const id of rulesetIds) {
      this.enabledRulesets.delete(id);
    }
  }

  async installDynamicRules(rules: chrome.declarativeNetRequest.Rule[]): Promise<void> {
    for (const r of rules) {
      this.dynamicRules.set(r.id, r);
    }
  }

  async removeDynamicRules(ruleIds: number[]): Promise<void> {
    for (const id of ruleIds) {
      this.dynamicRules.delete(id);
    }
  }

  async getDynamicRules(): Promise<chrome.declarativeNetRequest.Rule[]> {
    return Array.from(this.dynamicRules.values());
  }

  async allowDomain(domain: string, ruleId: number): Promise<void> {
    this.dynamicRules.set(ruleId, {
      id: ruleId,
      priority: 9999,
      action: { type: 'allowAllRequests' as chrome.declarativeNetRequest.RuleActionType },
      condition: { initiatorDomains: [domain] },
    });
  }

  async disallowDomain(ruleId: number): Promise<void> {
    this.dynamicRules.delete(ruleId);
  }
}

export function createBlockingRuntime(): BlockingRuntime {
  const chromeRuntime = new ChromeBlockingRuntime();
  if (chromeRuntime.isAvailable()) {
    return chromeRuntime;
  }
  return new MemoryBlockingRuntime();
}
