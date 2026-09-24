/**
 * @buddy/family-engine - schedule-evaluator.ts
 * Deterministic schedule evaluation handling day-of-week filters and overnight midnight wrap-arounds.
 */

import type { ScheduleAction, ScheduleRule, TimeWindow } from '@buddy/shared-types';

/**
 * Checks if a specific day and minute-of-day falls within a start/end window,
 * correctly handling overnight spans where startMinute > endMinute (e.g. 22:00 -> 06:00).
 *
 * @param currentMinute Minute of the day (0 - 1439)
 * @param currentDay Day of the week (0 = Sunday, ..., 6 = Saturday)
 * @param startMinute Window start minute (0 - 1439)
 * @param endMinute Window end minute (0 - 1439)
 * @param activeDays Days the schedule starts on (defaults to all 7 days if omitted or empty)
 */
export function isMinuteInSchedule(
  currentMinute: number,
  currentDay: number,
  startMinute: number,
  endMinute: number,
  activeDays?: readonly number[]
): boolean {
  const days = activeDays && activeDays.length > 0 ? activeDays : [0, 1, 2, 3, 4, 5, 6];

  if (startMinute <= endMinute) {
    // Same-day window (e.g. 09:00 -> 17:00)
    if (!days.includes(currentDay)) {
      return false;
    }
    return currentMinute >= startMinute && currentMinute < endMinute;
  } else {
    // Overnight window (e.g. 22:00 -> 06:00)
    // 1. Started today before midnight
    if (days.includes(currentDay) && currentMinute >= startMinute) {
      return true;
    }
    // 2. Started yesterday and continuing into today after midnight
    const previousDay = (currentDay + 6) % 7;
    if (days.includes(previousDay) && currentMinute < endMinute) {
      return true;
    }
    return false;
  }
}

/**
 * Helper to extract local day-of-week (0-6) and minute-of-day (0-1439) from a timestamp.
 */
export function getLocalDayAndMinute(nowMs: number = Date.now()): { day: number; minute: number } {
  const d = new Date(nowMs);
  const day = d.getDay();
  const minute = d.getHours() * 60 + d.getMinutes();
  return { day, minute };
}

/**
 * Evaluates whether a configured Bedtime window is active right now.
 */
export function isBedtimeActive(nowMs: number = Date.now(), bedtime?: TimeWindow): boolean {
  if (!bedtime || !bedtime.enabled) {
    return false;
  }
  const { day, minute } = getLocalDayAndMinute(nowMs);
  return isMinuteInSchedule(minute, day, bedtime.startMinute, bedtime.endMinute, bedtime.days);
}

/**
 * Evaluates whether a configured Study Time window is active right now.
 */
export function isStudyTimeActive(nowMs: number = Date.now(), studyTime?: TimeWindow): boolean {
  if (!studyTime || !studyTime.enabled) {
    return false;
  }
  const { day, minute } = getLocalDayAndMinute(nowMs);
  return isMinuteInSchedule(minute, day, studyTime.startMinute, studyTime.endMinute, studyTime.days);
}

export interface ScheduleEvaluationResult {
  readonly isRestricted: boolean;
  readonly isBedtime: boolean;
  readonly isStudyTime: boolean;
  readonly activeRules: readonly ScheduleRule[];
  readonly effectiveAction?: ScheduleAction;
}

/**
 * Evaluates all configured schedules and returns whether navigation is currently restricted,
 * alongside any active rules.
 */
export function evaluateSchedules(
  nowMs: number = Date.now(),
  schedules: readonly ScheduleRule[] = []
): ScheduleEvaluationResult {
  if (!schedules || schedules.length === 0) {
    return {
      isRestricted: false,
      isBedtime: false,
      isStudyTime: false,
      activeRules: [],
    };
  }

  const { day, minute } = getLocalDayAndMinute(nowMs);
  const activeRules: ScheduleRule[] = [];
  let isBedtime = false;
  let isStudyTime = false;
  let isRestricted = false;
  let effectiveAction: ScheduleAction | undefined;

  for (const rule of schedules) {
    if (!rule.isEnabled) continue;

    if (isMinuteInSchedule(minute, day, rule.startMinute, rule.endMinute, rule.days)) {
      activeRules.push(rule);
      if (rule.action === 'bedtime') {
        isBedtime = true;
        isRestricted = true;
        effectiveAction = 'bedtime';
      } else if (rule.action === 'restrict') {
        isRestricted = true;
        effectiveAction = effectiveAction || 'restrict';
      } else if (rule.action === 'focus') {
        isStudyTime = true;
        effectiveAction = effectiveAction || 'focus';
      }
    }
  }

  return {
    isRestricted,
    isBedtime,
    isStudyTime,
    activeRules,
    effectiveAction,
  };
}
