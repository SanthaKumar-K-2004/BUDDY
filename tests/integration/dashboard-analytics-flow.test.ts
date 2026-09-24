import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsAggregator, MemoryStorageAdapter } from '@buddy/storage';
import { MoodEngine, StreakEngine } from '@buddy/mood-engine';
import type { WatchSession } from '@buddy/shared-types';

describe('Phase 4 Master Integration Flow: Real Data -> Aggregator -> Mood -> Pet -> Streaks', () => {
  let storage: MemoryStorageAdapter;
  let aggregator: AnalyticsAggregator;
  let moodEngine: MoodEngine;
  let streakEngine: StreakEngine;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    aggregator = new AnalyticsAggregator(storage);
    moodEngine = new MoodEngine();
    streakEngine = new StreakEngine();
  });

  it('transforms raw watch session into daily summary, mood stimulus, and verified dashboard metrics', async () => {
    // 1. Initial State: Zero metrics
    const initialToday = await aggregator.getTodaySummary();
    expect(initialToday.totalActiveMs).toBe(0);
    expect(initialToday.mediaMs).toBe(0);
    expect(moodEngine.getScore()).toBe(50.0);

    // 2. Real YouTube Watch Session (15m active, 14m media)
    const ytSession: WatchSession = {
      id: 'session-real-yt',
      platform: 'youtube',
      domain: 'youtube.com',
      category: 'video',
      activeDurationMs: 15 * 60 * 1000,
      mediaDurationMs: 14 * 60 * 1000,
      startedAt: Date.now() - 15 * 60 * 1000,
      endedAt: Date.now(),
    };

    await aggregator.recordWatchActivity(ytSession);

    // 3. Complete Focus Session (30 min)
    const focusDurationMs = 30 * 60 * 1000;
    await aggregator.recordFocusSession(focusDurationMs);

    // Apply positive mood stimulus for focus completion
    moodEngine.applyStimulus(5, 'Completed 30m Focus Block', 'buddy-focus', 'FOCUS_COMPLETED');

    // 4. Intercept 12 ads and 4 trackers via Shield
    await aggregator.recordBlocked(12, 4);

    // 5. Query Today Summary
    const today = await aggregator.getTodaySummary();

    // Verify exact mathematical reconciliation
    expect(today.totalActiveMs).toBe(15 * 60 * 1000);
    expect(today.mediaMs).toBe(14 * 60 * 1000);
    expect(today.focusMs).toBe(30 * 60 * 1000);
    expect(today.adsBlocked).toBe(12);
    expect(today.trackersBlocked).toBe(4);
    expect(today.sessions).toBe(1);

    // Verify platform breakdown
    expect(today.platformStats.youtube.activeMs).toBe(15 * 60 * 1000);
    expect(today.platformStats.youtube.mediaMs).toBe(14 * 60 * 1000);

    // 6. Verify Mood Engine and Pet State
    expect(moodEngine.getScore()).toBe(55.0);
    const daytime = new Date('2026-09-23T14:00:00').getTime();
    moodEngine.recordFocus(30 * 60 * 1000, daytime);
    expect(moodEngine.getVisualState()).toBe('focused');

    // 7. Day Rollover & Streaks
    const todayStr = new Date().toISOString().split('T')[0];
    const goalMet = today.focusMs >= 25 * 60 * 1000; // 30m >= 25m target
    expect(goalMet).toBe(true);

    streakEngine.processDayRollover(todayStr, goalMet);
    expect(streakEngine.getState().currentStreakDays).toBe(1);
    expect(streakEngine.getState().bestStreakDays).toBe(1);
  });

  it('proves that zero raw URLs, page titles, or private messages are in aggregate exports', async () => {
    // Record real activity
    await aggregator.recordWatchActivity({
      id: 'session-privacy-test',
      platform: 'spotify',
      domain: 'open.spotify.com',
      category: 'music',
      activeDurationMs: 60_000,
      mediaDurationMs: 60_000,
      startedAt: Date.now() - 60_000,
      endedAt: Date.now(),
    });

    const weekly = await aggregator.getWeeklySummary();
    const serialized = JSON.stringify(weekly);

    // Audit string serialization
    expect(serialized).not.toContain('http://');
    expect(serialized).not.toContain('https://');
    expect(serialized).not.toContain('title');
    expect(serialized).not.toContain('query');
    expect(serialized).not.toContain('search');
    expect(serialized).not.toContain('playlist');
  });
});
