/**
 * @buddy/focus-engine - limits-evaluator.ts
 * Progressive 3-tier watch limits evaluator (80% gentle, 90% strong, 100% intervention).
 */

import type { InterventionType, WatchLimit } from '@buddy/shared-types';

export type LimitThresholdStatus = 'NONE' | 'GENTLE_NUDGE' | 'STRONG_WARNING' | 'LIMIT_REACHED';

export interface LimitEvaluationResult {
  readonly limitId: string;
  readonly isBreached: boolean;
  readonly percentageUsed: number;
  readonly status: LimitThresholdStatus;
  readonly activeMinutes: number;
  readonly maxMinutes: number;
  readonly intervention: InterventionType;
}

export function evaluateWatchLimit(limit: WatchLimit, activeMinutes: number): LimitEvaluationResult {
  if (!limit.isEnabled || limit.maxMinutesPerDay <= 0) {
    return {
      limitId: limit.id,
      isBreached: false,
      percentageUsed: 0,
      status: 'NONE',
      activeMinutes,
      maxMinutes: limit.maxMinutesPerDay,
      intervention: limit.intervention,
    };
  }

  const percentageUsed = (activeMinutes / limit.maxMinutesPerDay) * 100;

  let status: LimitThresholdStatus = 'NONE';
  let isBreached = false;

  if (percentageUsed >= 100) {
    status = 'LIMIT_REACHED';
    isBreached = true;
  } else if (percentageUsed >= 90) {
    status = 'STRONG_WARNING';
  } else if (percentageUsed >= (limit.warningThresholdPercent || 80)) {
    status = 'GENTLE_NUDGE';
  }

  return {
    limitId: limit.id,
    isBreached,
    percentageUsed: Math.min(100, Math.round(percentageUsed)),
    status,
    activeMinutes,
    maxMinutes: limit.maxMinutesPerDay,
    intervention: limit.intervention,
  };
}

export interface UsageSource {
  domainStats?: Record<string, number>;
  platformStats?: Record<string, { activeSeconds?: number; mediaSeconds?: number; shortFormSeconds?: number }>;
  categorySeconds?: Record<string, number>;
  totalShortFormSeconds?: number;
}

/**
 * Computes active minutes consumed against a watch limit across all relevant platforms/domains.
 * Aggregates short-form across YouTube Shorts, Instagram Reels, Facebook Reels, and TikTok.
 */
export function computeLimitUsageMinutes(limit: WatchLimit, usage: UsageSource): number {
  if (limit.targetType === 'category') {
    if (limit.targetValue === 'short_form') {
      const shortFormSec =
        usage.totalShortFormSeconds ??
        Object.values(usage.platformStats ?? {}).reduce((acc, p) => acc + (p.shortFormSeconds || 0), 0);
      return Math.round(shortFormSec / 60);
    }
    const catSec = usage.categorySeconds?.[limit.targetValue] ?? 0;
    return Math.round(catSec / 60);
  }

  if (limit.targetType === 'content_type') {
    if (limit.targetValue === 'short_form') {
      const shortFormSec =
        usage.totalShortFormSeconds ??
        Object.values(usage.platformStats ?? {}).reduce((acc, p) => acc + (p.shortFormSeconds || 0), 0);
      return Math.round(shortFormSec / 60);
    }
  }

  if (limit.targetType === 'platform') {
    const pStat = usage.platformStats?.[limit.targetValue];
    return pStat ? Math.round((pStat.activeSeconds || pStat.mediaSeconds || 0) / 60) : 0;
  }

  if (limit.targetType === 'site') {
    const siteSec = usage.domainStats?.[limit.targetValue] ?? 0;
    return Math.round(siteSec / 60);
  }

  return 0;
}

/**
 * Evaluates watch limits using cross-site aggregated usage.
 */
export function evaluateUniversalLimit(limit: WatchLimit, usage: UsageSource): LimitEvaluationResult {
  const activeMinutes = computeLimitUsageMinutes(limit, usage);
  return evaluateWatchLimit(limit, activeMinutes);
}
