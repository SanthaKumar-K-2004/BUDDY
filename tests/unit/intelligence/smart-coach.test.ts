import { describe, it, expect, vi } from 'vitest';
import { SmartCoach, NotificationManager } from '@buddy/intelligence-engine';
import type { AdaptivePolicyConfig } from '@buddy/shared-types';

describe('SmartCoach & NotificationManager', () => {
  const config: AdaptivePolicyConfig = {
    isAdaptiveLimitsEnabled: false,
    breakReminderEnabled: true,
    continuousActivityThresholdMinutes: 50,
    breakDurationMinutes: 5,
    smartFocusSuggestionsEnabled: true,
    excludedDomains: [],
  };

  it('tracks continuous active time and triggers break notification when threshold crossed', () => {
    const coach = new SmartCoach(config);
    const onBreakSuggested = vi.fn();
    coach.setListener({
      onBreakSuggested,
      onFocusSuggested: vi.fn(),
    });

    const now = 1700000000000;
    // Tick 49 minutes
    coach.tick(49 * 60 * 1000, now);
    expect(coach.getContinuousActiveMinutes()).toBe(49);
    expect(onBreakSuggested).not.toHaveBeenCalled();

    // Tick another 2 minutes (1 minute later in real time)
    coach.tick(2 * 60 * 1000, now + 60 * 1000);
    expect(coach.getContinuousActiveMinutes()).toBe(51);
    expect(onBreakSuggested).toHaveBeenCalledWith(51, 5);
  });

  it('enforces notification cooldown and suppresses repeated prompt spam', () => {
    const coach = new SmartCoach(config, undefined, 30); // 30 min cooldown
    const onBreakSuggested = vi.fn();
    coach.setListener({
      onBreakSuggested,
      onFocusSuggested: vi.fn(),
    });

    const now = 1700000000000;
    // Cross threshold at 51m
    coach.tick(51 * 60 * 1000, now);
    expect(onBreakSuggested).toHaveBeenCalledTimes(1);

    // Another tick 1 minute later (still in cooldown)
    coach.tick(60 * 1000, now + 60 * 1000);
    expect(onBreakSuggested).toHaveBeenCalledTimes(1); // Should not be called again

    // Continue browsing for 35 minutes continuously (ticks every minute)
    for (let m = 2; m <= 35; m++) {
      coach.tick(60 * 1000, now + m * 60 * 1000);
    }
    expect(onBreakSuggested).toHaveBeenCalledTimes(2);
  });

  it('handles startBreak and endBreak transitions correctly', () => {
    const coach = new SmartCoach(config);
    const now = 1700000000000;
    coach.tick(40 * 60 * 1000, now);
    expect(coach.getContinuousActiveMinutes()).toBe(40);

    coach.startBreak(5, now + 40 * 60 * 1000);
    expect(coach.getBreakState().isInBreak).toBe(true);
    expect(coach.getContinuousActiveMinutes()).toBe(0);

    // Activity during break should not increment active continuous counter
    coach.tick(60000, now + 41 * 60 * 1000);
    expect(coach.getContinuousActiveMinutes()).toBe(0);

    // Ending break
    coach.endBreak(now + 46 * 60 * 1000);
    expect(coach.getBreakState().isInBreak).toBe(false);
  });

  it('resets continuous counter after a natural idle gap (>= 5 minutes)', () => {
    const coach = new SmartCoach(config);
    const now = 1700000000000;
    coach.tick(30 * 60 * 1000, now);
    expect(coach.getContinuousActiveMinutes()).toBe(30);

    // Jump 6 minutes into the future (simulating user walking away)
    coach.tick(60000, now + 6 * 60 * 1000);
    expect(coach.getContinuousActiveMinutes()).toBe(1); // Reset occurred!
  });

  it('NotificationManager suppresses notifications during quiet hours and deduplicates identical bodies', () => {
    const manager = new NotificationManager({
      defaultCooldownMinutes: 30,
      quietHoursStart: 22,
      quietHoursEnd: 7,
    });

    // 23:00 (Quiet hours)
    const lateNight = new Date('2026-09-23T23:00:00').getTime();
    expect(
      manager.canNotify(
        { id: '1', category: 'break', title: 'Break', message: 'Take a break' },
        lateNight
      )
    ).toBe(false);

    // 14:00 (Daytime)
    const daytime = new Date('2026-09-23T14:00:00').getTime();
    const req = { id: '2', category: 'break', title: 'Break', message: 'Take a break' };
    expect(manager.canNotify(req, daytime)).toBe(true);

    // Record dispatched
    manager.recordDispatched(req, daytime);

    // Immediate duplicate
    expect(manager.canNotify(req, daytime + 5000)).toBe(false);
  });
});
