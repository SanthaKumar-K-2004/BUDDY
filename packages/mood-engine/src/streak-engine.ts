/**
 * @buddy/mood-engine - streak-engine.ts
 * Deterministic streak calculation, validation, and recovery engine.
 * Handles midnight rollovers, freeze token consumption, and audit integrity.
 */

import type { DailyGoalConfig, DailyStats, StreakState } from '@buddy/shared-types';

export const DEFAULT_STREAK_STATE: StreakState = {
  currentStreakDays: 0,
  bestStreakDays: 0,
  lastCompletedDate: '',
  freezeTokensAvailable: 1,
  history: {},
  currentStreak: 0,
  longestStreak: 0,
  freezesRemaining: 1,
  lastEvaluatedDate: '',
};

export class StreakEngine {
  private state: StreakState;

  constructor(initialState: StreakState = DEFAULT_STREAK_STATE) {
    this.state = structuredClone(initialState);
  }

  public getState(): StreakState {
    return {
      ...this.state,
      currentStreak: this.state.currentStreakDays,
      longestStreak: this.state.bestStreakDays,
      freezesRemaining: this.state.freezeTokensAvailable,
      lastEvaluatedDate: this.state.lastCompletedDate,
    };
  }

  public reset(): void {
    this.state = structuredClone(DEFAULT_STREAK_STATE);
  }

  public processDayRollover(yesterdayDateStr: string, yesterdayGoalMet: boolean): StreakState {
    this.state = StreakEngine.processDayRollover(this.state, yesterdayDateStr, yesterdayGoalMet);
    return this.getState();
  }
  /**
   * Deterministically evaluates whether a day's real activity met the configured goal.
   * Never fabricates goals or claims success without observable events.
   */
  public static evaluateGoal(goal: DailyGoalConfig, stats: DailyStats): boolean {
    if (!goal.isEnabled) {
      return false;
    }

    // 1. Focus goal: focus minutes must be >= target
    const focusMinutes = Math.floor((stats.totalFocusSeconds || 0) / 60);
    const metFocus = focusMinutes >= goal.targetFocusMinutes;

    // 2. Max media limit (if configured)
    let metMediaLimit = true;
    if (goal.maxMediaMinutes !== undefined && goal.maxMediaMinutes > 0) {
      const mediaMinutes = Math.floor(stats.totalMediaWatchSeconds / 60);
      metMediaLimit = mediaMinutes <= goal.maxMediaMinutes;
    }

    return metFocus && metMediaLimit;
  }

  /**
   * Advances streak state upon day rollover.
   * Handles streak freezes safely and maintains bestStreakDays invariant.
   */
  public static processDayRollover(
    currentState: StreakState,
    yesterdayDateStr: string,
    yesterdayGoalMet: boolean
  ): StreakState {
    const history = { ...currentState.history, [yesterdayDateStr]: yesterdayGoalMet };

    if (yesterdayGoalMet) {
      const newStreak = currentState.currentStreakDays + 1;
      return {
        currentStreakDays: newStreak,
        bestStreakDays: Math.max(currentState.bestStreakDays, newStreak),
        lastCompletedDate: yesterdayDateStr,
        freezeTokensAvailable: Math.min(3, currentState.freezeTokensAvailable + (newStreak % 7 === 0 ? 1 : 0)),
        history,
      };
    }

    // Goal was not met: check if freeze token can protect the streak
    if (currentState.freezeTokensAvailable > 0 && currentState.currentStreakDays > 0) {
      return {
        ...currentState,
        freezeTokensAvailable: currentState.freezeTokensAvailable - 1,
        history,
      };
    }

    // Streak broken
    return {
      ...currentState,
      currentStreakDays: 0,
      history,
    };
  }

  /**
   * Deterministically reconstructs and reconciles streak from date history.
   * Invariant: same history input => identical streak result.
   */
  public static reconcileFromHistory(
    history: Record<string, boolean>,
    todayDateStr: string
  ): StreakState {
    const dates = Object.keys(history).sort();
    let currentStreak = 0;
    let bestStreak = 0;
    let freezes = 1;
    let lastCompleted = '';

    for (const date of dates) {
      if (date >= todayDateStr) continue; // Today is still in progress

      const met = Boolean(history[date]);
      if (met) {
        currentStreak += 1;
        bestStreak = Math.max(bestStreak, currentStreak);
        lastCompleted = date;
        if (currentStreak % 7 === 0) {
          freezes = Math.min(3, freezes + 1);
        }
      } else {
        if (freezes > 0 && currentStreak > 0) {
          freezes -= 1;
        } else {
          currentStreak = 0;
        }
      }
    }

    return {
      currentStreakDays: currentStreak,
      bestStreakDays: bestStreak,
      lastCompletedDate: lastCompleted,
      freezeTokensAvailable: freezes,
      history: { ...history },
    };
  }
}
