import { describe, it, expect } from 'vitest';
import { TrendEngine } from '@buddy/intelligence-engine';
import type { ActivityEvent, DailySummary, WeeklySummary } from '@buddy/shared-types';

describe('TrendEngine', () => {
  const engine = new TrendEngine();

  const makeDay = (date: string, activeMins: number, shortFormMins = 0, focusMins = 0): DailySummary => ({
    date,
    totalActiveMs: activeMins * 60000,
    mediaMs: activeMins * 60000,
    focusMs: focusMins * 60000,
    socialMs: 0,
    videoMs: activeMins * 60000,
    musicMs: 0,
    adsBlocked: 10,
    trackersBlocked: 20,
    sessions: 5,
    limitsReached: 0,
    doomscrollAlerts: 0,
    platformStats: {
      youtube: {
        platform: 'youtube',
        activeMs: activeMins * 60000,
        mediaMs: activeMins * 60000,
        shortFormMs: shortFormMins * 60000,
        sessions: 5,
        limitsReached: 0,
      },
    },
  });

  it('honors insufficient data policy when history is fewer than 2 days', () => {
    const singleDay = [makeDay('2026-09-23', 60)];
    const baseline = engine.calculateBaseline(singleDay);

    expect(baseline.hasSufficientData).toBe(false);
    expect(baseline.daysCounted).toBe(1);
    expect(baseline.averageActiveMs).toBe(0);
  });

  it('calculates personal baseline correctly across multiple days', () => {
    const days = [
      makeDay('2026-09-21', 60, 20, 20),
      makeDay('2026-09-22', 80, 40, 30),
      makeDay('2026-09-23', 100, 30, 40),
    ];

    const baseline = engine.calculateBaseline(days);
    expect(baseline.hasSufficientData).toBe(true);
    expect(baseline.daysCounted).toBe(3);
    // Average active: (60 + 80 + 100) / 3 = 80m = 4800000ms
    expect(baseline.averageActiveMs).toBe(80 * 60000);
    // Average short-form: (20 + 40 + 30) / 3 = 30m = 1800000ms
    expect(baseline.averageShortFormMs).toBe(30 * 60000);
    // Average focus: (20 + 30 + 40) / 3 = 30m = 1800000ms
    expect(baseline.averageFocusMs).toBe(30 * 60000);
  });

  it('calculates day-over-day trends with delta and percentage', () => {
    const yesterday = makeDay('2026-09-22', 60);
    const today = makeDay('2026-09-23', 90);

    const trend = engine.calculateDayTrend(today, yesterday);
    expect(trend.diffMs).toBe(30 * 60000); // +30 mins
    expect(trend.percentChange).toBe(50);  // +50%
  });

  it('calculates week-over-week trends', () => {
    const lastWeek: WeeklySummary = {
      startDate: '2026-09-10',
      endDate: '2026-09-16',
      totalActiveMs: 600 * 60000, // 10h
      totalMediaMs: 500 * 60000,
      totalFocusMs: 200 * 60000,
      totalAdsBlocked: 100,
      totalTrackersBlocked: 200,
      totalSessions: 30,
      dailySummaries: [],
      topPlatforms: [],
    };

    const thisWeek: WeeklySummary = {
      startDate: '2026-09-17',
      endDate: '2026-09-23',
      totalActiveMs: 450 * 60000, // 7.5h
      totalMediaMs: 400 * 60000,
      totalFocusMs: 250 * 60000,
      totalAdsBlocked: 150,
      totalTrackersBlocked: 250,
      totalSessions: 25,
      dailySummaries: [],
      topPlatforms: [],
    };

    const trend = engine.calculateWeeklyTrend(thisWeek, lastWeek);
    expect(trend.diffMs).toBe(-150 * 60000); // -2.5 hours
    expect(trend.percentChange).toBe(-25);   // -25%
  });

  it('aggregates time-of-day distributions correctly', () => {
    const events: ActivityEvent[] = [
      // 09:00 (Morning) - 30m
      { id: '1', timestamp: new Date('2026-09-23T09:00:00').getTime(), domain: 'a.com', activityType: 'video', state: 'active', durationMs: 30 * 60000, site: 'a' },
      // 14:00 (Afternoon) - 45m
      { id: '2', timestamp: new Date('2026-09-23T14:00:00').getTime(), domain: 'b.com', activityType: 'social', state: 'active', durationMs: 45 * 60000, site: 'b' },
      // 19:00 (Evening) - 60m
      { id: '3', timestamp: new Date('2026-09-23T19:00:00').getTime(), domain: 'c.com', activityType: 'music', state: 'active', durationMs: 60 * 60000, site: 'c' },
      // 23:30 (Night) - 20m
      { id: '4', timestamp: new Date('2026-09-23T23:30:00').getTime(), domain: 'd.com', activityType: 'reading', state: 'active', durationMs: 20 * 60000, site: 'd' },
    ];

    const tod = engine.calculateTimeOfDayDistribution(events);
    expect(tod.morningMs).toBe(30 * 60000);
    expect(tod.afternoonMs).toBe(45 * 60000);
    expect(tod.eveningMs).toBe(60 * 60000);
    expect(tod.nightMs).toBe(20 * 60000);
  });
});
