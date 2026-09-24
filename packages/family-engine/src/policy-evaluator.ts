/**
 * @buddy/family-engine - policy-evaluator.ts
 * Pure, deterministic evaluation of browsing requests against Family Policies.
 * Follows strict priority order with conflict resolution and zero ambiguity.
 */

import type {
  AccessRequest,
  EvaluationContext,
  FamilyPolicy,
  PolicyDecision,
} from '@buddy/shared-types';
import { isDomainMatch, matchesAnyDomain, normalizeDomain } from './domain-normalizer.js';
import { isBedtimeActive, isStudyTimeActive, evaluateSchedules } from './schedule-evaluator.js';

/**
 * Evaluates navigation context against a FamilyPolicy and active exceptions.
 *
 * Strict Priority Order:
 * 1. Safety / System Rules (internal browser & extension URLs always allowed)
 * 2. Active Temporary Access Exceptions (unexpired parent approval)
 * 3. Explicit Allowed Sites (allowlist overrides blocklist and category restrictions)
 * 4. Explicit Blocked Sites (direct domain blocklist)
 * 5. Category Restrictions (category blocklist)
 * 6. Bedtime Schedule (nighttime restrictions)
 * 7. Study Mode / Custom Schedules (study focus periods)
 * 8. Daily Usage Limits (platform, category, or total time thresholds)
 * 9. Default Allow
 */
export function evaluatePolicy(
  context: EvaluationContext,
  policy?: FamilyPolicy,
  activeExceptions: readonly AccessRequest[] = []
): PolicyDecision {
  const normDomain = normalizeDomain(context.domain || context.url);

  // 1. Safety / Internal System rules
  if (
    context.url.startsWith('chrome://') ||
    context.url.startsWith('chrome-extension://') ||
    context.url.startsWith('about:') ||
    context.url.startsWith('edge://') ||
    context.url.startsWith('moz-extension://')
  ) {
    return {
      action: 'allow',
      reason: 'Internal system or extension URL.',
    };
  }

  // If no policy is configured, default to allow
  if (!policy) {
    return {
      action: 'allow',
      reason: 'No family policy active.',
    };
  }

  const nowMs = context.currentTimeMs || Date.now();

  // 2. Active Temporary Access Exceptions
  const matchingException = activeExceptions.find(
    (req) =>
      req.status === 'approved' &&
      isDomainMatch(normDomain, req.domain) &&
      req.expiresAt !== undefined &&
      req.expiresAt > nowMs
  );

  if (matchingException) {
    const remainingMin = Math.max(1, Math.ceil((matchingException.expiresAt! - nowMs) / 60000));
    return {
      action: 'allow',
      reason: `Temporary parent approval active (${remainingMin}m remaining).`,
      matchedDomain: matchingException.domain,
    };
  }

  // 3. Explicit Allowed Sites (Precedence over blocklists and categories)
  if (policy.allowedSites && matchesAnyDomain(normDomain, policy.allowedSites)) {
    return {
      action: 'allow',
      reason: 'Explicitly allowed by parent policy.',
      matchedDomain: normDomain,
    };
  }

  // 4. Explicit Blocked Sites
  if (policy.blockedSites && matchesAnyDomain(normDomain, policy.blockedSites)) {
    return {
      action: 'block',
      reason: 'Domain is restricted by parent policy.',
      matchedDomain: normDomain,
      requiresPin: true,
    };
  }

  // 5. Category Policy
  if (context.category && policy.blockedCategories && policy.blockedCategories.includes(context.category)) {
    return {
      action: 'block',
      reason: `Category '${context.category}' is restricted by parent policy.`,
      matchedCategory: context.category,
      requiresPin: true,
    };
  }

  // 6. Bedtime Schedule Evaluation
  const bedtimeActive =
    isBedtimeActive(nowMs, policy.bedtime) ||
    evaluateSchedules(nowMs, policy.schedules).isBedtime;

  if (bedtimeActive) {
    return {
      action: 'block',
      reason: 'Bedtime schedule is active. Time to wind down and sleep.',
      requiresPin: true,
    };
  }

  // 7. Study Mode / Focus Schedules
  const studyActive =
    isStudyTimeActive(nowMs, policy.studyTime) ||
    evaluateSchedules(nowMs, policy.schedules).isStudyTime;

  if (studyActive) {
    const distractingCategories = ['social', 'video', 'gaming', 'entertainment', 'shopping'];
    if (context.category && distractingCategories.includes(context.category)) {
      return {
        action: 'block',
        reason: 'Study Mode is active. Distracting websites are restricted.',
        matchedCategory: context.category,
        requiresPin: true,
      };
    }
  }

  // Check general schedule restriction
  const scheduleResult = evaluateSchedules(nowMs, policy.schedules);
  if (scheduleResult.isRestricted && scheduleResult.effectiveAction === 'restrict') {
    return {
      action: 'block',
      reason: 'Restricted by active family schedule.',
      requiresPin: true,
    };
  }

  // 8. Usage Limits
  if (policy.dailyLimits) {
    // Check specific platform/site limit
    const platformKey = normDomain;
    const platformLimit = policy.dailyLimits[platformKey] ?? policy.dailyLimits[normDomain.split('.')[0] || ''];
    if (platformLimit !== undefined && (context.platformUsageMinutesToday ?? 0) >= platformLimit) {
      return {
        action: 'limit',
        reason: `Daily limit of ${platformLimit}m reached for ${normDomain}.`,
        remainingMinutes: 0,
        requiresPin: true,
      };
    }

    // Check category limit
    if (context.category) {
      const categoryLimit = policy.dailyLimits[context.category];
      if (categoryLimit !== undefined && (context.categoryUsageMinutesToday ?? 0) >= categoryLimit) {
        return {
          action: 'limit',
          reason: `Daily limit of ${categoryLimit}m reached for category '${context.category}'.`,
          remainingMinutes: 0,
          requiresPin: true,
        };
      }
    }

    // Check total active usage limit
    const totalLimit = policy.dailyLimits['total'] ?? policy.dailyLimits['daily'];
    if (totalLimit !== undefined && (context.activeUsageMinutesToday ?? 0) >= totalLimit) {
      return {
        action: 'limit',
        reason: `Daily total browsing limit of ${totalLimit}m reached.`,
        remainingMinutes: 0,
        requiresPin: true,
      };
    }
  }

  // 9. Default Allow
  return {
    action: 'allow',
    reason: 'Complies with family policy.',
  };
}
