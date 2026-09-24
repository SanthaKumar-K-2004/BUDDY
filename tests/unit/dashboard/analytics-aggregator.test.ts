import { describe, it, expect, beforeEach } from 'vitest';
import {
  AnalyticsAggregator,
  MemoryStorageAdapter,
  formatDateKey,
} from '@buddy/storage';
import type { WatchSession } from '@buddy/shared-types';

describe('AnalyticsAggregator - Real Local Analytics Engine', () => {
  let memoryStorage: MemoryStorageAdapter;
  let aggregator: AnalyticsAggregator;

  beforeEach(() => {
    memoryStorage = new MemoryStorageAdapter();
    aggregator = new AnalyticsAggregator(memoryStorage);
  });

  describe('Zero-Data State (Fresh Installation)', () => {
    it('returns legitimate zero daily summary without simulated or fake statistics', async () => {
      const today = formatDateKey(new Date());
      const summary = await aggregator.getDailySummary(today);

      expect(summary.date).toBe(today);
      expect(summary.totalActiveMs).toBe(0);
      expect(summary.mediaMs).toBe(0);
      expect(summary.focusMs).toBe(0);
      expect(summary.socialMs).toBe(0);
      expect(summary.videoMs).toBe(0);
      expect(summary.musicMs).toBe(0);
      expect(summary.adsBlocked).toBe(0);
      expect(summary.trackersBlocked).toBe(0);
      expect(summary.sessions).toBe(0);
      expect(summary.limitsReached).toBe(0);
      expect(summary.doomscrollAlerts).toBe(0);
      expect(Object.keys(summary.platformStats)).toHaveLength(0);
    });

    it('returns legitimate zero weekly summary when no days have activity', async () => {
      const weekly = await aggregator.getWeeklySummary();

      expect(weekly.totalActiveMs).toBe(0);
      expect(weekly.totalMediaMs).toBe(0);
      expect(weekly.totalFocusMs).toBe(0);
      expect(weekly.totalAdsBlocked).toBe(0);
      expect(weekly.totalTrackersBlocked).toBe(0);
      expect(weekly.totalSessions).toBe(0);
      expect(weekly.dailySummaries).toHaveLength(7);
      expect(weekly.topPlatforms).toHaveLength(0);
    });
  });

  describe('Recording Real Activity & Aggregation', () => {
    it('accurately accumulates real watch sessions and platform metrics', async () => {
      const session: WatchSession = {
        id: 'session-yt-1',
        platform: 'youtube',
        domain: 'youtube.com',
        category: 'video',
        activeDurationMs: 120_000, // 2 minutes
        mediaDurationMs: 110_000,
        shortFormDurationMs: 30_000,
        startedAt: Date.now() - 120_000,
        endedAt: Date.now(),
      };

      await aggregator.recordWatchActivity(session);

      const today = formatDateKey(new Date());
      const summary = await aggregator.getDailySummary(today);

      expect(summary.totalActiveMs).toBe(120_000);
      expect(summary.mediaMs).toBe(110_000);
      expect(summary.videoMs).toBe(120_000);
      expect(summary.sessions).toBe(1);

      // Verify platform-specific breakdown
      const yt = summary.platformStats.youtube;
      expect(yt).toBeDefined();
      expect(yt.platform).toBe('youtube');
      expect(yt.activeMs).toBe(120_000);
      expect(yt.mediaMs).toBe(110_000);
      expect(yt.shortFormMs).toBe(30_000);
      expect(yt.sessions).toBe(1);
    });

    it('records focus sessions accurately', async () => {
      await aggregator.recordFocusSession(25 * 60 * 1000); // 25 min

      const today = formatDateKey(new Date());
      const summary = await aggregator.getDailySummary(today);

      expect(summary.focusMs).toBe(25 * 60 * 1000);
    });

    it('records blocked ads and trackers accurately without fabrication', async () => {
      await aggregator.recordBlocked(14, 5);

      const today = formatDateKey(new Date());
      const summary = await aggregator.getDailySummary(today);

      expect(summary.adsBlocked).toBe(14);
      expect(summary.trackersBlocked).toBe(5);

      // Accumulates subsequent blocked calls
      await aggregator.recordBlocked(6, 2);
      const updated = await aggregator.getDailySummary(today);
      expect(updated.adsBlocked).toBe(20);
      expect(updated.trackersBlocked).toBe(7);
    });

    it('records doomscroll intervention alerts', async () => {
      await aggregator.recordDoomscrollAlert();
      await aggregator.recordDoomscrollAlert();

      const today = formatDateKey(new Date());
      const summary = await aggregator.getDailySummary(today);
      expect(summary.doomscrollAlerts).toBe(2);
    });
  });

  describe('Reconciliation & Weekly Rollup Invariants', () => {
    it('guarantees that weekly sum equals the sum of daily totals', async () => {
      // Simulate 3 distinct sessions today
      const s1: WatchSession = {
        id: 's-1',
        platform: 'youtube',
        domain: 'youtube.com',
        category: 'video',
        activeDurationMs: 60_000,
        mediaDurationMs: 50_000,
        startedAt: Date.now() - 60_000,
        endedAt: Date.now(),
      };
      const s2: WatchSession = {
        id: 's-2',
        platform: 'spotify',
        domain: 'open.spotify.com',
        category: 'music',
        activeDurationMs: 180_000,
        mediaDurationMs: 180_000,
        startedAt: Date.now() - 180_000,
        endedAt: Date.now(),
      };

      await aggregator.recordWatchActivity(s1);
      await aggregator.recordWatchActivity(s2);
      await aggregator.recordFocusSession(15 * 60 * 1000);
      await aggregator.recordBlocked(10, 3);

      const weekly = await aggregator.getWeeklySummary();

      // Sum of dailySummaries in weekly
      const sumActive = weekly.dailySummaries.reduce((acc, d) => acc + d.totalActiveMs, 0);
      const sumMedia = weekly.dailySummaries.reduce((acc, d) => acc + d.mediaMs, 0);
      const sumFocus = weekly.dailySummaries.reduce((acc, d) => acc + d.focusMs, 0);
      const sumAds = weekly.dailySummaries.reduce((acc, d) => acc + d.adsBlocked, 0);
      const sumTrackers = weekly.dailySummaries.reduce((acc, d) => acc + d.trackersBlocked, 0);

      expect(weekly.totalActiveMs).toBe(sumActive);
      expect(weekly.totalMediaMs).toBe(sumMedia);
      expect(weekly.totalFocusMs).toBe(sumFocus);
      expect(weekly.totalAdsBlocked).toBe(sumAds);
      expect(weekly.totalTrackersBlocked).toBe(sumTrackers);
    });
  });

  describe('Data Reset & Deletion Integrity', () => {
    it('clears specific day data cleanly', async () => {
      const today = formatDateKey(new Date());
      await aggregator.recordFocusSession(30 * 60 * 1000);
      await aggregator.recordBlocked(5, 2);

      let summary = await aggregator.getDailySummary(today);
      expect(summary.focusMs).toBe(30 * 60 * 1000);

      await aggregator.clearDay(today);
      summary = await aggregator.getDailySummary(today);
      expect(summary.focusMs).toBe(0);
      expect(summary.adsBlocked).toBe(0);
    });

    it('clears all historical analytics cleanly without corrupting other storage', async () => {
      await aggregator.recordFocusSession(30 * 60 * 1000);
      await aggregator.clearAllAnalytics();

      const today = formatDateKey(new Date());
      const summary = await aggregator.getDailySummary(today);
      expect(summary.focusMs).toBe(0);
    });
  });
});
