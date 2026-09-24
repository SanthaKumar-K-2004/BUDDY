/**
 * @buddy/filter-pipeline - validator/validator.ts
 * Validates generated Declarative Net Request rules against Chrome/Firefox MV3 constraints,
 * schema specifications, and browser static rule budgets.
 */

import type { DnrRule } from '../converter/dnr-converter.js';

export interface ValidationIssue {
  ruleId?: number;
  type: 'ERROR' | 'WARNING';
  code: string;
  message: string;
}

export interface RulesetValidationReport {
  rulesetId: string;
  isValid: boolean;
  totalRules: number;
  regexRules: number;
  safeRules: number;
  unsafeRules: number;
  issues: ValidationIssue[];
  limits: {
    maxStaticRules: number;
    maxRegexRules: number;
    percentStaticUsed: number;
    percentRegexUsed: number;
  };
}

export const CHROMIUM_DNR_LIMITS = {
  MAX_STATIC_RULES_PER_RULESET: 30000,
  MAX_REGEX_RULES_PER_RULESET: 1000,
  GUARANTEED_MINIMUM_STATIC_RULES: 30000,
  MAX_STATIC_RULESETS: 50,
  MAX_ENABLED_STATIC_RULESETS: 10,
};

export const VALID_RESOURCE_TYPES = new Set([
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'webtransport',
  'webbundle',
  'other',
]);

export const VALID_ACTIONS = new Set(['block', 'allow', 'upgradeScheme', 'modifyHeaders', 'redirect']);

export class RulesetValidator {
  public static validate(rulesetId: string, rules: DnrRule[]): RulesetValidationReport {
    const issues: ValidationIssue[] = [];
    const seenIds = new Set<number>();

    let regexCount = 0;
    let safeCount = 0;
    let unsafeCount = 0;

    // 1. Check ruleset size limits
    if (rules.length > CHROMIUM_DNR_LIMITS.MAX_STATIC_RULES_PER_RULESET) {
      issues.push({
        type: 'ERROR',
        code: 'LIMIT_STATIC_RULES_EXCEEDED',
        message: `Ruleset '${rulesetId}' contains ${rules.length} rules, exceeding Chromium static limit of ${CHROMIUM_DNR_LIMITS.MAX_STATIC_RULES_PER_RULESET}`,
      });
    } else if (rules.length > CHROMIUM_DNR_LIMITS.MAX_STATIC_RULES_PER_RULESET * 0.9) {
      issues.push({
        type: 'WARNING',
        code: 'LIMIT_STATIC_RULES_HIGH',
        message: `Ruleset '${rulesetId}' is at ${Math.round((rules.length / CHROMIUM_DNR_LIMITS.MAX_STATIC_RULES_PER_RULESET) * 100)}% of the static rule limit`,
      });
    }

    // 2. Validate each rule individually
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];

      // ID validation
      if (!Number.isInteger(rule.id) || rule.id <= 0 || rule.id > 2147483647) {
        issues.push({
          ruleId: rule.id,
          type: 'ERROR',
          code: 'INVALID_RULE_ID',
          message: `Rule at index ${i} has invalid ID: ${rule.id}. Must be positive integer <= 2,147,483,647.`,
        });
      } else if (seenIds.has(rule.id)) {
        issues.push({
          ruleId: rule.id,
          type: 'ERROR',
          code: 'DUPLICATE_RULE_ID',
          message: `Duplicate rule ID ${rule.id} found at index ${i}`,
        });
      } else {
        seenIds.add(rule.id);
      }

      // Action validation
      if (!rule.action || !VALID_ACTIONS.has(rule.action.type)) {
        issues.push({
          ruleId: rule.id,
          type: 'ERROR',
          code: 'INVALID_ACTION',
          message: `Rule ${rule.id} has invalid action type: '${rule.action?.type}'`,
        });
      }

      // Condition validation
      if (!rule.condition) {
        issues.push({
          ruleId: rule.id,
          type: 'ERROR',
          code: 'MISSING_CONDITION',
          message: `Rule ${rule.id} is missing condition object`,
        });
        continue;
      }

      const hasUrlFilter = typeof rule.condition.urlFilter === 'string' && rule.condition.urlFilter.length > 0;
      const hasRegexFilter = typeof rule.condition.regexFilter === 'string' && rule.condition.regexFilter.length > 0;

      if (!hasUrlFilter && !hasRegexFilter) {
        issues.push({
          ruleId: rule.id,
          type: 'ERROR',
          code: 'NO_FILTER_SPECIFIED',
          message: `Rule ${rule.id} condition specifies neither urlFilter nor regexFilter`,
        });
      }

      if (hasRegexFilter) {
        regexCount++;
        try {
          new RegExp(rule.condition.regexFilter!);
        } catch (regErr: any) {
          issues.push({
            ruleId: rule.id,
            type: 'ERROR',
            code: 'INVALID_REGEX',
            message: `Rule ${rule.id} regexFilter is invalid: ${regErr?.message}`,
          });
        }
      }

      // Resource types validation
      if (rule.condition.resourceTypes) {
        for (const rt of rule.condition.resourceTypes) {
          if (!VALID_RESOURCE_TYPES.has(rt)) {
            issues.push({
              ruleId: rule.id,
              type: 'ERROR',
              code: 'INVALID_RESOURCE_TYPE',
              message: `Rule ${rule.id} has invalid resourceType: '${rt}'`,
            });
          }
        }
      }

      // Domain type validation
      if (rule.condition.domainType && !['firstParty', 'thirdParty'].includes(rule.condition.domainType)) {
        issues.push({
          ruleId: rule.id,
          type: 'ERROR',
          code: 'INVALID_DOMAIN_TYPE',
          message: `Rule ${rule.id} has invalid domainType: '${rule.condition.domainType}'`,
        });
      }

      if (rule.action?.type === 'block' || rule.action?.type === 'allow') {
        safeCount++;
      } else {
        unsafeCount++;
      }
    }

    if (regexCount > CHROMIUM_DNR_LIMITS.MAX_REGEX_RULES_PER_RULESET) {
      issues.push({
        type: 'ERROR',
        code: 'LIMIT_REGEX_RULES_EXCEEDED',
        message: `Ruleset '${rulesetId}' contains ${regexCount} regex rules, exceeding limit of ${CHROMIUM_DNR_LIMITS.MAX_REGEX_RULES_PER_RULESET}`,
      });
    }

    const hasErrors = issues.some((iss) => iss.type === 'ERROR');

    return {
      rulesetId,
      isValid: !hasErrors,
      totalRules: rules.length,
      regexRules: regexCount,
      safeRules: safeCount,
      unsafeRules: unsafeCount,
      issues,
      limits: {
        maxStaticRules: CHROMIUM_DNR_LIMITS.MAX_STATIC_RULES_PER_RULESET,
        maxRegexRules: CHROMIUM_DNR_LIMITS.MAX_REGEX_RULES_PER_RULESET,
        percentStaticUsed: Math.round((rules.length / CHROMIUM_DNR_LIMITS.MAX_STATIC_RULES_PER_RULESET) * 100),
        percentRegexUsed: Math.round((regexCount / CHROMIUM_DNR_LIMITS.MAX_REGEX_RULES_PER_RULESET) * 100),
      },
    };
  }
}
