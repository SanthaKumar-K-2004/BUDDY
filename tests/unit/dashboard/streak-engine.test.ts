import { describe, it, expect } from 'vitest';
import { StreakEngine, DEFAULT_STREAK_STATE } from '@buddy/mood-engine';
import type { DailyGoalConfig, DailyStats, StreakState } from '@buddy/shared-types';

describe('StreakEngine - Deterministic Habit Streak Engine', () => {
  const defaultGoal: DailyGoalConfig = {
    targetFocusMinutes: 25,
    maxMediaMinutes: 120,
    isEnabled: true,
  };

  const createStats = (focusMinutes: number, mediaMinutes: number): DailyStats => ({
    date: '2026-09-22',
    totalActiveSeconds: (focusMinutes + mediaMinutes) * 60,
    totalMediaWatchSeconds: mediaMinutes * 60,
    totalFocusSeconds: focusMinutes * 60,
    totalAdsBlocked: 0,
    totalTrackersBlocked: 0,
    doomscrollAlertsCount: 0,
    categorySeconds: {
      social: 0,
      video: mediaMinutes * 60,
      music: 0,
      news: 0,
      gaming: 0,
      shopping: 0,
      education: 0,
      productivity: focusMinutes * 60,
      entertainment: 0,
      communication: 0,
      other: 0,
    },
  });

  describe('Goal Evaluation', () => {
    it('evaluates true when focus meets or exceeds target and media is within limit', () => {
      const stats = createStats(30, 60);
      const met = StreakEngine.evaluateGoal(defaultGoal, stats);
      expect(met).toBe(true);
    });

    it('evaluates false when focus is below target', () => {
      const stats = createStats(15, 60);
      const met = StreakEngine.evaluateGoal(defaultGoal, stats);
      expect(met).toBe(false);
    });

    it('evaluates false when media watch time exceeds maximum allowed', () => {
      const stats = createStats(30, 150); // 150 min > 120 max
      const met = StreakEngine.evaluateGoal(defaultGoal, stats);
      expect(met).toBe(false);
    });

    it('returns false if goal is disabled', () => {
      const stats = createStats(60, 10);
      const met = StreakEngine.evaluateGoal({ ...defaultGoal, isEnabled: false }, stats);
      expect(met).toBe(false);
    });
  });

  describe('Day Rollover & Freezes', () => {
    it('increments streak on successful goal and records history', () => {
      const state: StreakState = {
        currentStreakDays: 2,
        bestStreakDays: 5,
        lastCompletedDate: '2026-09-21',
        freezeTokensAvailable: 1,
        history: {},
      };

      const next = StreakEngine.processDayRollover(state, '2026-09-22', true);

      expect(next.currentStreakDays).toBe(3);
      expect(next.bestStreakDays).toBe(5);
      expect(next.lastCompletedDate).toBe('2026-09-22');
      expect(next.history['2026-09-22']).toBe(true);
    });

    it('updates bestStreakDays when current streak exceeds previous record', () => {
      const state: StreakState = {
        currentStreakDays: 5,
        bestStreakDays: 5,
        lastCompletedDate: '2026-09-21',
        freezeTokensAvailable: 1,
        history: {},
      };

      const next = StreakEngine.processDayRollover(state, '2026-09-22', true);

      expect(next.currentStreakDays).toBe(6);
      expect(next.bestStreakDays).toBe(6);
    });

    it('consumes a freeze token when goal is missed, preserving current streak', () => {
      const state: StreakState = {
        currentStreakDays: 4,
        bestStreakDays: 4,
        lastCompletedDate: '2026-09-21',
        freezeTokensAvailable: 1,
        history: {},
      };

      const next = StreakEngine.processDayRollover(state, '2026-09-22', false);

      expect(next.currentStreakDays).toBe(4); // Preserved!
      expect(next.freezeTokensAvailable).toBe(0); // Consumed
      expect(next.history['2026-09-22']).toBe(false);
    });

    it('resets streak to 0 when goal is missed and no freeze tokens are available', () => {
      const state: StreakState = {
        currentStreakDays: 4,
        bestStreakDays: 10,
        lastCompletedDate: '2026-09-21',
        freezeTokensAvailable: 0,
        history: {},
      };

      const next = StreakEngine.processDayRollover(state, '2026-09-22', false);

      expect(next.currentStreakDays).toBe(0); // Reset
      expect(next.bestStreakDays).toBe(10); // Record retained
      expect(next.freezeTokensAvailable).toBe(0);
    });

    it('awards a freeze token every 7 days (capped at 3)', () => {
      const state: StreakState = {
        currentStreakDays: 6,
        bestStreakDays: 6,
        lastCompletedDate: '2026-09-21',
        freezeTokensAvailable: 1,
        history: {},
      };

      const next = StreakEngine.processDayRollover(state, '2026-09-22', true);

      expect(next.currentStreakDays).toBe(7);
      expect(next.freezeTokensAvailable).toBe(2); // +1 freeze earned
    });
  });

  describe('Reconciliation From History', () => {
    it('deterministically recalculates streak from ordered historical dates', () => {
      const history = {
        '2026-09-18': true,
        '2026-09-19': true,
        '2026-09-20': false, // missed, but had freeze token
        '2026-09-21': true,
        '2026-09-22': true,
      };

      const reconciled = StreakEngine.reconcileFromHistory(history);

      expect(reconciled.currentStreakDays).toBe(4);
      expect(reconciled.bestStreakDays).toBe(4);
      expect(reconciled.history).toEqual(history);
    });
  });

  describe('Instance API', () => {
    it('supports instance operations and reset', () => {
      const engine = new StreakEngine();
      expect(engine.getState().currentStreakDays).toBe(0);

      engine.processDayRollover('2026-09-22', true);
      expect(engine.getState().currentStreakDays).toBe(1);

      engine.reset();
      expect(engine.getState().currentStreakDays).toBe(0);
    });
  });
});
