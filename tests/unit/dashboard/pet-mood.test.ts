import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MoodEngine, BASELINE_MOOD_SCORE, MAX_DAILY_RECOVERY } from '@buddy/mood-engine';

describe('MoodEngine & Buddy Pet - Deterministic States & Anti-Gaming', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-22T14:00:00Z')); // 2 PM daytime
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Deterministic Pet States', () => {
    it('sets state to focused when recent focus activity is recorded', () => {
      const engine = new MoodEngine();
      engine.recordFocus(25 * 60 * 1000); // 25 min focus
      expect(engine.getVisualState()).toBe('focused');
      expect(engine.getDialogue()).toContain('focused');
    });

    it('sets state to tired when continuous active browsing occurs without break', () => {
      const engine = new MoodEngine();
      engine.recordActiveUsage(95 * 60 * 1000); // 95 min
      expect(engine.getVisualState()).toBe('tired');
      expect(engine.getDialogue().toLowerCase()).toContain('break');
    });

    it('sets state to distracted when doomscroll events are logged', () => {
      const engine = new MoodEngine();
      engine.applyStimulus(-8, 'Rapid scroll doomloop', 'buddy-focus', 'DOOMSCROLL_EVENT');
      expect(engine.getVisualState()).toBe('distracted');
    });

    it('sets state to recovering when healthy break is logged after strain', () => {
      const engine = new MoodEngine({ score: 45.0 });
      engine.recordActiveUsage(90 * 60 * 1000); // strained
      engine.recordBreak(15 * 60 * 1000); // took healthy 15m break
      expect(engine.getVisualState()).toBe('recovering');
      expect(engine.getDialogue().toLowerCase()).toContain('refreshing');
    });

    it('sets state to sleeping during quiet hours (10 PM to 7 AM)', () => {
      vi.setSystemTime(new Date('2026-09-22T23:30:00Z')); // 11:30 PM
      const engine = new MoodEngine();
      engine.applyHourlyDecay(23);
      expect(engine.getVisualState()).toBe('sleeping');
      expect(engine.getDialogue().toLowerCase()).toContain('resting');
    });

    it('guarantees identical state given identical events (invariance)', () => {
      const engine1 = new MoodEngine({ score: 50.0 });
      const engine2 = new MoodEngine({ score: 50.0 });

      engine1.applyStimulus(5, 'Completed focus block', 'buddy-focus');
      engine2.applyStimulus(5, 'Completed focus block', 'buddy-focus');

      expect(engine1.getScore()).toBe(engine2.getScore());
      expect(engine1.getVisualState()).toBe(engine2.getVisualState());
      expect(engine1.getDialogue()).toBe(engine2.getDialogue());
    });
  });

  describe('Anti-Gaming Protections', () => {
    it('deduplicates identical stimuli within the deduplication window', () => {
      const engine = new MoodEngine({ score: 50.0 });

      // First stimulus accepted (+5)
      engine.applyStimulus(5, 'Focus done', 'buddy-focus');
      expect(engine.getScore()).toBe(55.0);

      // Rapid identical stimulus within 10 seconds rejected (anti-gaming)
      vi.advanceTimersByTime(10_000);
      engine.applyStimulus(5, 'Focus done', 'buddy-focus');
      expect(engine.getScore()).toBe(55.0); // No double-counting!

      // After dedup window (65s), accepted again
      vi.advanceTimersByTime(65_000);
      engine.applyStimulus(5, 'Focus done', 'buddy-focus');
      expect(engine.getScore()).toBe(60.0);
    });

    it('strictly caps daily positive recovery at +20.0', () => {
      const engine = new MoodEngine({ score: 40.0 });

      // Add 25 positive points across distinct events
      engine.applyStimulus(10, 'Milestone 1', 'buddy-focus');
      vi.advanceTimersByTime(65_000);
      engine.applyStimulus(10, 'Milestone 2', 'buddy-focus');
      vi.advanceTimersByTime(65_000);
      engine.applyStimulus(10, 'Milestone 3', 'buddy-focus');

      // Score should only increase by +20.0 (40 -> 60)
      expect(engine.getScore()).toBe(60.0);
      expect(engine.getState().dailyRecoveryAccumulated).toBe(MAX_DAILY_RECOVERY);
    });

    it('allows negative stimuli without artificial suppression', () => {
      const engine = new MoodEngine({ score: 60.0 });
      engine.applyStimulus(-8, 'Doomscroll detected', 'buddy-focus');
      expect(engine.getScore()).toBe(52.0);
    });
  });

  describe('Pet Language & Encouragement (No Shaming)', () => {
    it('never uses judgmental or shaming vocabulary', () => {
      const engine = new MoodEngine({ score: 10.0 }); // Low score
      const dialogue = engine.getDialogue().toLowerCase();

      expect(dialogue).not.toContain('failed');
      expect(dialogue).not.toContain('addicted');
      expect(dialogue).not.toContain('wasting');
      expect(dialogue).not.toContain('loser');
    });
  });
});
