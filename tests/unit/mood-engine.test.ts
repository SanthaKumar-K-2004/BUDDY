import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MoodEngine, BASELINE_MOOD_SCORE, MAX_DAILY_RECOVERY } from '@buddy/mood-engine';

describe('Mood Engine - Deterministic State Machine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-22T14:00:00Z')); // 2 PM daytime
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  it('initializes at baseline score of 50.0 (neutral)', () => {
    const engine = new MoodEngine();
    expect(engine.getScore()).toBe(BASELINE_MOOD_SCORE);
    expect(engine.getState().visualState).toBe('neutral');
  });

  it('increases score upon positive focus stimulus', () => {
    const engine = new MoodEngine();
    engine.applyStimulus(5, 'Completed focus session', 'buddy-focus');
    expect(engine.getScore()).toBe(55.0);
    expect(engine.getState().visualState).toBe('neutral'); // 41-60 is neutral
  });

  it('transitions to happy and ecstatic as score grows', () => {
    const engine = new MoodEngine({ score: 60.0 });
    engine.applyStimulus(5, 'Focus streak maintained', 'buddy-focus');
    expect(engine.getScore()).toBe(65.0);
    expect(engine.getState().visualState).toBe('happy'); // 61-80 is happy

    engine.applyStimulus(16, 'Weekly milestone reached', 'buddy-dashboard' as any);
    expect(engine.getScore()).toBe(80.0); // capped by daily recovery limit
  });

  it('enforces the daily recovery limit (max +20.0 per day)', () => {
    const engine = new MoodEngine({ score: 50.0 });

    // Apply 30 points of positive delta
    engine.applyStimulus(15, 'Goal 1', 'buddy-focus');
    engine.applyStimulus(15, 'Goal 2', 'buddy-focus');

    // Only +20 should be accepted
    expect(engine.getScore()).toBe(70.0);
    expect(engine.getState().dailyRecoveryAccumulated).toBe(MAX_DAILY_RECOVERY);

    // Further positive stimulus today has delta 0
    engine.applyStimulus(10, 'Goal 3', 'buddy-focus');
    expect(engine.getScore()).toBe(70.0);
  });

  it('decreases score upon negative stimulus without limit', () => {
    const engine = new MoodEngine({ score: 50.0 });
    engine.applyStimulus(-8, 'Doomscroll spiral detected', 'buddy-focus');
    expect(engine.getScore()).toBe(42.0);

    engine.applyStimulus(-15, 'Daily streak broken', 'buddy-focus');
    expect(engine.getScore()).toBe(27.0);
    expect(engine.getState().visualState).toBe('worried'); // 21-40 is worried

    engine.applyStimulus(-10, 'Excessive session overtime', 'buddy-focus');
    expect(engine.getScore()).toBe(17.0);
    expect(engine.getState().visualState).toBe('sad'); // 0-20 is sad
  });

  it('clamps scores between 0.0 and 100.0', () => {
    const engineLow = new MoodEngine({ score: 5.0 });
    engineLow.applyStimulus(-20, 'Big penalty', 'buddy-focus');
    expect(engineLow.getScore()).toBe(0.0);

    const engineHigh = new MoodEngine({ score: 95.0, dailyRecoveryAccumulated: 0 });
    engineHigh.applyStimulus(20, 'Big bonus', 'buddy-focus');
    expect(engineHigh.getScore()).toBe(100.0);
  });

  it('applies hourly decay during daytime hours (8 AM - 10 PM)', () => {
    const engine = new MoodEngine({ score: 50.0 });
    engine.applyHourlyDecay(14); // 2 PM (daytime)
    expect(engine.getScore()).toBe(49.0);
  });

  it('freezes decay during nighttime quiet hours (10 PM - 7 AM) and shows sleeping', () => {
    const engine = new MoodEngine({ score: 50.0 });
    engine.applyHourlyDecay(23); // 11 PM (quiet hour)
    expect(engine.getScore()).toBe(50.0); // frozen!
    expect(engine.getState().visualState).toBe('sleeping');
  });
});
