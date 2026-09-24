/**
 * @buddy/filter-pipeline - deduplicator/deduplicator.ts
 * Deterministic semantic rule deduplication and stable rule ID assignment.
 */

import { createHash } from 'node:crypto';
import type { DnrRule, DnrRuleCondition } from '../converter/dnr-converter.js';

export interface DeduplicationStats {
  originalRules: number;
  uniqueRules: number;
  duplicateRules: number;
}

export interface DeduplicationResult {
  rules: DnrRule[];
  stats: DeduplicationStats;
}

export class RuleDeduplicator {
  /**
   * Computes a canonical string representation of a DNR rule condition for semantic comparison.
   */
  public static canonicalConditionKey(condition: DnrRuleCondition): string {
    const parts: string[] = [];

    if (condition.urlFilter) parts.push(`u:${condition.urlFilter}`);
    if (condition.regexFilter) parts.push(`r:${condition.regexFilter}`);
    if (condition.isUrlFilterCaseSensitive !== undefined) parts.push(`cs:${condition.isUrlFilterCaseSensitive}`);
    if (condition.domainType) parts.push(`dt:${condition.domainType}`);

    if (condition.domains && condition.domains.length > 0) {
      parts.push(`d:${[...condition.domains].sort().join(',')}`);
    }
    if (condition.excludedDomains && condition.excludedDomains.length > 0) {
      parts.push(`!d:${[...condition.excludedDomains].sort().join(',')}`);
    }
    if (condition.initiatorDomains && condition.initiatorDomains.length > 0) {
      parts.push(`id:${[...condition.initiatorDomains].sort().join(',')}`);
    }
    if (condition.excludedInitiatorDomains && condition.excludedInitiatorDomains.length > 0) {
      parts.push(`!id:${[...condition.excludedInitiatorDomains].sort().join(',')}`);
    }
    if (condition.resourceTypes && condition.resourceTypes.length > 0) {
      parts.push(`rt:${[...condition.resourceTypes].sort().join(',')}`);
    }
    if (condition.excludedResourceTypes && condition.excludedResourceTypes.length > 0) {
      parts.push(`!rt:${[...condition.excludedResourceTypes].sort().join(',')}`);
    }

    return parts.join('|');
  }

  /**
   * Computes a canonical signature for a DNR rule (action + priority + condition).
   */
  public static canonicalRuleKey(rule: DnrRule): string {
    const actionKey = rule.action.type;
    const condKey = RuleDeduplicator.canonicalConditionKey(rule.condition);
    return `${rule.priority}:${actionKey}:${condKey}`;
  }

  /**
   * Deduplicates DNR rules deterministically and assigns unique, stable rule IDs.
   */
  public static deduplicate(rules: DnrRule[], baseIdOffset = 1): DeduplicationResult {
    const seen = new Map<string, DnrRule>();
    const duplicates: DnrRule[] = [];

    for (const rule of rules) {
      const key = RuleDeduplicator.canonicalRuleKey(rule);
      if (seen.has(key)) {
        duplicates.push(rule);
      } else {
        seen.set(key, rule);
      }
    }

    // Sort uniquely and deterministically:
    // 1. By priority descending (allow rules first)
    // 2. By canonical condition string ascending
    const sorted = Array.from(seen.values()).sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      const keyA = RuleDeduplicator.canonicalConditionKey(a.condition);
      const keyB = RuleDeduplicator.canonicalConditionKey(b.condition);
      return keyA.localeCompare(keyB);
    });

    // Re-assign stable, sequential, deterministic rule IDs (1-indexed)
    const finalRules: DnrRule[] = sorted.map((r, index) => ({
      ...r,
      id: baseIdOffset + index,
    }));

    return {
      rules: finalRules,
      stats: {
        originalRules: rules.length,
        uniqueRules: finalRules.length,
        duplicateRules: duplicates.length,
      },
    };
  }

  /**
   * Generates a stable deterministic uint32 ID for a rule based on SHA-256 hash.
   */
  public static generateStableRuleId(rule: DnrRule): number {
    const sig = RuleDeduplicator.canonicalRuleKey(rule);
    const hash = createHash('sha256').update(sig).digest();
    // Read 31-bit unsigned integer (positive integer <= 2,147,483,647)
    const uint31 = hash.readUInt32BE(0) & 0x7fffffff;
    return uint31 === 0 ? 1 : uint31;
  }
}
