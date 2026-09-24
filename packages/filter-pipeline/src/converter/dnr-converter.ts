/**
 * @buddy/filter-pipeline - converter/dnr-converter.ts
 * Transforms parsed adblock and network rules into Chrome/Firefox MV3 DeclarativeNetRequest rules.
 */

import { FilterConverter, Filter } from '@adguard/dnr-converter';

export interface DnrRuleAction {
  type: 'block' | 'allow' | 'upgradeScheme' | 'modifyHeaders' | 'redirect';
  redirect?: { extensionPath?: string; url?: string };
  requestHeaders?: Array<{ header: string; operation: 'set' | 'append' | 'remove'; value?: string }>;
  responseHeaders?: Array<{ header: string; operation: 'set' | 'append' | 'remove'; value?: string }>;
}

export interface DnrRuleCondition {
  urlFilter?: string;
  regexFilter?: string;
  isUrlFilterCaseSensitive?: boolean;
  domains?: string[];
  excludedDomains?: string[];
  initiatorDomains?: string[];
  excludedInitiatorDomains?: string[];
  requestDomains?: string[];
  excludedRequestDomains?: string[];
  resourceTypes?: string[];
  excludedResourceTypes?: string[];
  domainType?: 'firstParty' | 'thirdParty';
}

export interface DnrRule {
  id: number;
  priority: number;
  action: DnrRuleAction;
  condition: DnrRuleCondition;
}

export interface DnrRuleset {
  id: string;
  declarativeRules: DnrRule[];
  safeRulesCount: number;
  unsafeRulesCount: number;
  regexpRulesCount: number;
}

export interface DnrConversionResult {
  rulesetId: string;
  rules: DnrRule[];
  safeRulesCount: number;
  unsafeRulesCount: number;
  regexpRulesCount: number;
  errors: Array<{ rule: string; error: string }>;
  warnings: Array<{ rule: string; warning: string }>;
}

export class DnrConverter {
  /**
   * Converts a raw or normalized adblock filter list string into DNR rules.
   */
  public static async convertList(
    rulesetId: string,
    filterContent: string,
    numericId = 1
  ): Promise<DnrConversionResult> {
    // 1. Preprocess: convert standard hosts lines (127.0.0.1 domain / 0.0.0.0 domain) to standard adblock syntax
    const preprocessed = DnrConverter.preprocessHostsLines(filterContent);

    // 2. Use @adguard/dnr-converter
    const filter = new Filter(numericId, preprocessed);
    const converter = new FilterConverter();
    const converted = await converter.convert([filter]);

    if (!converted || converted.length === 0 || !converted[0]?.ruleset) {
      throw new Error(`DNR conversion produced no ruleset for '${rulesetId}'`);
    }

    const firstRuleset = converted[0].ruleset;
    const errors: Array<{ rule: string; error: string }> = (converted[0].errors || []).map((e: any) => ({
      rule: String(e?.rule || ''),
      error: String(e?.message || e?.error || 'Unknown conversion error'),
    }));

    const warnings: Array<{ rule: string; warning: string }> = (converted[0].limitations || []).map((l: any) => ({
      rule: String(l?.rule || ''),
      warning: String(l?.message || l?.error || 'DNR limitation warning'),
    }));

    const declarativeRules = firstRuleset.getDeclarativeRules() as unknown as DnrRule[];

    return {
      rulesetId,
      rules: declarativeRules,
      safeRulesCount: firstRuleset.getSafeRulesCount(),
      unsafeRulesCount: firstRuleset.getUnsafeRulesCount(),
      regexpRulesCount: firstRuleset.getRegexpRulesCount(),
      errors,
      warnings,
    };
  }

  /**
   * Converts plain /etc/hosts style entries (127.0.0.1 domain / 0.0.0.0 domain)
   * into ||domain^ adblock syntax so they can be parsed by standard adblock conversion engines.
   */
  public static preprocessHostsLines(content: string): string {
    const lines = content.split('\n');
    const out: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const hostsMatch = trimmed.match(/^(?:127\.0\.0\.1|0\.0\.0\.0)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
      if (hostsMatch) {
        const domain = hostsMatch[1].toLowerCase();
        // Skip localhost entries
        if (domain === 'localhost' || domain.endsWith('.local') || domain === 'broadcasthost') {
          continue;
        }
        out.push(`||${domain}^`);
      } else {
        out.push(line);
      }
    }

    return out.join('\n');
  }
}
