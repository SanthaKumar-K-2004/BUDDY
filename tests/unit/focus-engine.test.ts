import { describe, it, expect } from 'vitest';
import { evaluateWatchLimit, DoomscrollDetector } from '@buddy/focus-engine';
import type { WatchLimit } from '@buddy/shared-types';

describe('Focus Engine - Watch Limits Progressive Evaluator', () => {
  const limit: WatchLimit = {
    id: 'limit-1',
    targetType: 'platform',
    targetValue: 'youtube',
    maxMinutesPerDay: 60,
    currentMinutesUsed: 0,
    warningThresholdPercent: 80,
    intervention: 'hard_block',
    isEnabled: true,
  };

  it('returns NONE when under warning threshold', () => {
    const res = evaluateWatchLimit(limit, 30); // 50%
    expect(res.status).toBe('NONE');
    expect(res.isBreached).toBe(false);
    expect(res.percentageUsed).toBe(50);
  });

  it('returns GENTLE_NUDGE when hitting 80% threshold', () => {
    const res = evaluateWatchLimit(limit, 48); // 80%
    expect(res.status).toBe('GENTLE_NUDGE');
    expect(res.isBreached).toBe(false);
    expect(res.percentageUsed).toBe(80);
  });

  it('returns STRONG_WARNING when hitting 90% threshold', () => {
    const res = evaluateWatchLimit(limit, 55); // ~91.6%
    expect(res.status).toBe('STRONG_WARNING');
    expect(res.isBreached).toBe(false);
  });

  it('returns LIMIT_REACHED and isBreached=true when 100% is reached', () => {
    const res = evaluateWatchLimit(limit, 60); // 100%
    expect(res.status).toBe('LIMIT_REACHED');
    expect(res.isBreached).toBe(true);
    expect(res.percentageUsed).toBe(100);
    expect(res.intervention).toBe('hard_block');
  });

  it('bypasses evaluation if limit is disabled', () => {
    const disabledLimit = { ...limit, isEnabled: false };
    const res = evaluateWatchLimit(disabledLimit, 100);
    expect(res.status).toBe('NONE');
    expect(res.isBreached).toBe(false);
  });
});

describe('Focus Engine - Doomscroll Detection', () => {
  it('detects rapid swiping when threshold in window is exceeded', () => {
    const detector = new DoomscrollDetector({
      maxSwitchesInWindow: 5,
      windowMinutes: 3,
    });

    // Simulate 5 fast video switches
    for (let i = 0; i < 5; i++) {
      detector.recordContentSwitch();
    }

    const state = detector.evaluate();
    expect(state.isDoomscrolling).toBe(true);
    expect(state.switchCount).toBe(5);
  });

  it('remains not doomscrolling under normal usage', () => {
    const detector = new DoomscrollDetector({
      maxSwitchesInWindow: 10,
    });

    detector.recordContentSwitch();
    detector.recordContentSwitch();

    const state = detector.evaluate();
    expect(state.isDoomscrolling).toBe(false);
  });

  it('resets tracking data correctly', () => {
    const detector = new DoomscrollDetector();
    detector.recordContentSwitch();
    detector.recordScroll(10);
    detector.reset();

    const state = detector.evaluate();
    expect(state.switchCount).toBe(0);
    expect(state.isDoomscrolling).toBe(false);
  });
});
