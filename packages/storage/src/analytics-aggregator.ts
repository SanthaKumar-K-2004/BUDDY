/**
 * @buddy/storage - analytics-aggregator.ts
 * Real-world local analytics aggregation engine.
 * Computes daily and weekly summaries, platform breakdowns, and maintains
 * strict reconciliation invariants with zero mock or synthetic data.
 */

import type {
  ActivityEvent,
  DailyStats,
  DailySummary,
  PlatformCategory,
  PlatformDailyStats,
  PlatformSummary,
  StorageSchema,
  WatchSession,
  WeeklySummary,
} from '@buddy/shared-types';
import { storage as defaultStorage, type StorageAdapter } from './storage-client.js';

export function formatDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTotalShortFormMs(dailySummary: DailySummary): number {
  return Object.values(dailySummary.platformStats).reduce((acc, p) => acc + p.shortFormMs, 0);
}

export function getDateNDaysAgo(n: number, fromDate: Date = new Date()): Date {
  const d = new Date(fromDate);
  d.setDate(d.getDate() - n);
  return d;
}

export function createZeroDailySummary(date: string): DailySummary {
  return {
    date,
    totalActiveMs: 0,
    mediaMs: 0,
    focusMs: 0,
    socialMs: 0,
    videoMs: 0,
    musicMs: 0,
    adsBlocked: 0,
    trackersBlocked: 0,
    sessions: 0,
    limitsReached: 0,
    doomscrollAlerts: 0,
    platformStats: {},
  };
}

export class AnalyticsAggregator {
  constructor(private storage: StorageAdapter = defaultStorage) {}

  /**
   * Retrieves the daily summary for a given date (YYYY-MM-DD).
   * If no data exists, returns a genuine zero-data summary (no fake metrics).
   */
  async getDailySummary(dateStr: string): Promise<DailySummary> {
    const allStats = await this.storage.get('dailyStats');
    const dayStats: DailyStats | undefined = allStats[dateStr];

    if (!dayStats) {
      return createZeroDailySummary(dateStr);
    }

    const platformStats: Record<string, PlatformSummary> = {};
    if (dayStats.platformStats) {
      for (const [platformId, pStat] of Object.entries(dayStats.platformStats)) {
        const pActiveMs = pStat.activeSeconds * 1000;
        const pMediaMs = pActiveMs > 0 ? Math.min(pStat.mediaSeconds * 1000, pActiveMs) : pStat.mediaSeconds * 1000;
        const pSessions = pActiveMs > 0
          ? Math.min(pStat.sessionsCount, Math.max(1, Math.ceil(pStat.activeSeconds / 60)))
          : pStat.sessionsCount;

        platformStats[platformId] = {
          platform: pStat.platform,
          activeMs: pActiveMs,
          mediaMs: pMediaMs,
          shortFormMs: Math.min(pStat.shortFormSeconds * 1000, pActiveMs),
          sessions: pSessions,
          limitsReached: pStat.limitsReachedCount,
        };
      }
    }

    const catSeconds = dayStats.categorySeconds || {
      social: 0,
      video: 0,
      music: 0,
      news: 0,
      gaming: 0,
      shopping: 0,
      education: 0,
      productivity: 0,
      entertainment: 0,
      communication: 0,
      other: 0,
    };

    // Sanitize: media playback cannot exceed active browsing time on standard video tabs
    const totalActiveMs = dayStats.totalActiveSeconds * 1000;
    const safeMediaMs = totalActiveMs > 0
      ? Math.min(dayStats.totalMediaWatchSeconds * 1000, totalActiveMs)
      : dayStats.totalMediaWatchSeconds * 1000;

    // Sanitize runaway session counts from past heartbeat ticks
    const safeSessions = totalActiveMs > 0
      ? Math.min(dayStats.sessionsCount || 0, Math.max(1, Math.ceil(dayStats.totalActiveSeconds / 60)))
      : (dayStats.sessionsCount || 0);

    return {
      date: dateStr,
      totalActiveMs,
      mediaMs: safeMediaMs,
      focusMs: (dayStats.totalFocusSeconds || 0) * 1000,
      socialMs: (catSeconds.social || 0) * 1000,
      videoMs: (catSeconds.video || 0) * 1000,
      musicMs: (catSeconds.music || 0) * 1000,
      adsBlocked: dayStats.totalAdsBlocked || 0,
      trackersBlocked: dayStats.totalTrackersBlocked || 0,
      sessions: safeSessions,
      limitsReached: dayStats.limitsReachedCount || 0,
      doomscrollAlerts: dayStats.doomscrollAlertsCount || 0,
      platformStats,
    };
  }

  /**
   * Returns today's summary.
   */
  async getTodaySummary(): Promise<DailySummary> {
    return this.getDailySummary(formatDateKey(new Date()));
  }

  /**
   * Returns yesterday's summary.
   */
  async getYesterdaySummary(): Promise<DailySummary> {
    const yesterday = getDateNDaysAgo(1);
    return this.getDailySummary(formatDateKey(yesterday));
  }

  /**
   * Returns the rolling 7-day weekly summary ending on the specified date (default today).
   * Reconciles weekly total with sum of daily totals.
   */
  async getWeeklySummary(endDateStr?: string): Promise<WeeklySummary> {
    const endDate = endDateStr ? new Date(`${endDateStr}T00:00:00`) : new Date();
    const dailySummaries: DailySummary[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = getDateNDaysAgo(i, endDate);
      const dateKey = formatDateKey(d);
      const summary = await this.getDailySummary(dateKey);
      dailySummaries.push(summary);
    }

    let totalActiveMs = 0;
    let totalMediaMs = 0;
    let totalFocusMs = 0;
    let totalAdsBlocked = 0;
    let totalTrackersBlocked = 0;
    let totalSessions = 0;

    const platformAggregates: Record<string, {
      activeMs: number;
      mediaMs: number;
      shortFormMs: number;
      sessions: number;
      limitsReached: number;
    }> = {};

    for (const day of dailySummaries) {
      totalActiveMs += day.totalActiveMs;
      totalMediaMs += day.mediaMs;
      totalFocusMs += day.focusMs;
      totalAdsBlocked += day.adsBlocked;
      totalTrackersBlocked += day.trackersBlocked;
      totalSessions += day.sessions;

      for (const [pId, pStat] of Object.entries(day.platformStats)) {
        if (!platformAggregates[pId]) {
          platformAggregates[pId] = {
            activeMs: 0,
            mediaMs: 0,
            shortFormMs: 0,
            sessions: 0,
            limitsReached: 0,
          };
        }
        platformAggregates[pId]!.activeMs += pStat.activeMs;
        platformAggregates[pId]!.mediaMs += pStat.mediaMs;
        platformAggregates[pId]!.shortFormMs += pStat.shortFormMs;
        platformAggregates[pId]!.sessions += pStat.sessions;
        platformAggregates[pId]!.limitsReached += pStat.limitsReached;
      }
    }

    const topPlatforms: PlatformSummary[] = Object.entries(platformAggregates)
      .map(([platform, stats]) => ({
        platform,
        activeMs: stats.activeMs,
        mediaMs: stats.mediaMs,
        shortFormMs: stats.shortFormMs,
        sessions: stats.sessions,
        limitsReached: stats.limitsReached,
      }))
      .sort((a, b) => b.activeMs - a.activeMs);

    return {
      startDate: dailySummaries[0]?.date || formatDateKey(endDate),
      endDate: dailySummaries[dailySummaries.length - 1]?.date || formatDateKey(endDate),
      totalActiveMs,
      totalMediaMs,
      totalFocusMs,
      totalAdsBlocked,
      totalTrackersBlocked,
      totalSessions,
      dailySummaries,
      topPlatforms,
    };
  }

  /**
   * Atomically records real watch session delta into storage.
   */
  async recordWatchActivity(
    session: WatchSession,
    deltaSeconds?: number,
    category?: PlatformCategory,
    now: Date = new Date()
  ): Promise<void> {
    const isIncremental = deltaSeconds !== undefined;
    const effDeltaSeconds = deltaSeconds ?? Math.floor((session.activeDurationMs || 0) / 1000);
    if (effDeltaSeconds <= 0) return;

    const effCategory = category ?? session.category ?? 'video';
    const isShortForm = session.contentType === 'short_form';

    // Prevent runaway accumulation:
    // If incremental (e.g. 5-second heartbeats), add the delta seconds.
    // If full session summary (no deltaSeconds passed), add the full session duration.
    const mediaSeconds = isIncremental
      ? effDeltaSeconds
      : (session.mediaDurationMs ? Math.floor(session.mediaDurationMs / 1000) : effDeltaSeconds);

    const shortFormSeconds = isIncremental
      ? (isShortForm ? effDeltaSeconds : 0)
      : (session.shortFormDurationMs ? Math.floor(session.shortFormDurationMs / 1000) : (isShortForm ? effDeltaSeconds : 0));

    const todayKey = formatDateKey(now);
    await this.storage.update('dailyStats', (allStats: StorageSchema['dailyStats']) => {
      const current = allStats[todayKey] || {
        date: todayKey,
        totalActiveSeconds: 0,
        totalMediaWatchSeconds: 0,
        totalFocusSeconds: 0,
        totalAdsBlocked: 0,
        totalTrackersBlocked: 0,
        doomscrollAlertsCount: 0,
        sessionsCount: 0,
        limitsReachedCount: 0,
        categorySeconds: {
          social: 0,
          video: 0,
          music: 0,
          news: 0,
          gaming: 0,
          shopping: 0,
          education: 0,
          productivity: 0,
          entertainment: 0,
          communication: 0,
          other: 0,
        },
        platformStats: {},
      };

      const updatedCategorySeconds: Record<PlatformCategory, number> = {
        ...current.categorySeconds,
        [effCategory]: ((current.categorySeconds as Record<PlatformCategory, number>)[effCategory] || 0) + effDeltaSeconds,
      };

      const platformStats = { ...(current.platformStats || {}) };
      const currentPlatform: PlatformDailyStats = platformStats[session.platform] || {
        platform: session.platform,
        activeSeconds: 0,
        mediaSeconds: 0,
        shortFormSeconds: 0,
        sessionsCount: 0,
        limitsReachedCount: 0,
      };

      // Only increment session count for a brand new session, not on every 5s heartbeat
      const shouldIncrementSession = !isIncremental || currentPlatform.sessionsCount === 0;

      const pActiveSeconds = currentPlatform.activeSeconds + effDeltaSeconds;
      const pMediaSeconds = Math.min(currentPlatform.mediaSeconds + mediaSeconds, pActiveSeconds);
      const pSessionsCount = Math.min(
        currentPlatform.sessionsCount + (shouldIncrementSession ? 1 : 0),
        Math.max(1, Math.ceil(pActiveSeconds / 60))
      );

      platformStats[session.platform] = {
        ...currentPlatform,
        activeSeconds: pActiveSeconds,
        mediaSeconds: pMediaSeconds,
        shortFormSeconds: Math.min(currentPlatform.shortFormSeconds + shortFormSeconds, pActiveSeconds),
        sessionsCount: pSessionsCount,
      };

      const shouldIncrementGlobalSession = !isIncremental || (current.sessionsCount || 0) === 0;
      const totalActiveSeconds = current.totalActiveSeconds + effDeltaSeconds;
      const totalMediaWatchSeconds = Math.min(current.totalMediaWatchSeconds + mediaSeconds, totalActiveSeconds);
      const sessionsCount = Math.min(
        (current.sessionsCount || 0) + (shouldIncrementGlobalSession ? 1 : 0),
        Math.max(1, Math.ceil(totalActiveSeconds / 60))
      );

      const updated: DailyStats = {
        ...current,
        totalActiveSeconds,
        totalMediaWatchSeconds,
        categorySeconds: updatedCategorySeconds,
        sessionsCount,
        platformStats,
      };

      return {
        ...allStats,
        [todayKey]: updated,
      };
    });
  }

  /**
   * Atomically records a Universal ActivityEvent into storage analytics.
   * Accrues active duration, media watch time, and short-form metrics per platform.
   */
  async recordActivityEvent(event: ActivityEvent, now: Date = new Date()): Promise<void> {
    const deltaSeconds = Math.max(1, Math.round((event.durationMs ?? 1000) / 1000));
    const isShortForm = Boolean(
      event.isShortForm ||
      event.activityType === 'short' ||
      event.activityType === 'reel'
    );
    const isMedia = Boolean(
      event.activityType === 'video' ||
      event.activityType === 'short' ||
      event.activityType === 'reel' ||
      event.activityType === 'music'
    );

    const session: WatchSession = {
      sessionId: event.id,
      domain: event.domain,
      platform: event.platform,
      category: event.category,
      contentType: isShortForm
        ? 'short_form'
        : event.activityType === 'music'
          ? 'music'
          : 'long_form_video',
      activeDurationMs: deltaSeconds * 1000,
      mediaDurationMs: isMedia ? deltaSeconds * 1000 : 0,
      shortFormDurationMs: isShortForm ? deltaSeconds * 1000 : 0,
    };

    return this.recordWatchActivity(session, deltaSeconds, event.category, now);
  }

  /**
   * Records a completed focus session block.
   */
  async recordFocusSession(focusSecondsOrMs: number, now: Date = new Date()): Promise<void> {
    if (focusSecondsOrMs <= 0) return;
    const focusSeconds = focusSecondsOrMs > 10_000 ? Math.floor(focusSecondsOrMs / 1000) : focusSecondsOrMs;
    const todayKey = formatDateKey(now);

    await this.storage.update('dailyStats', (allStats: StorageSchema['dailyStats']) => {
      const current = allStats[todayKey] || {
        date: todayKey,
        totalActiveSeconds: 0,
        totalMediaWatchSeconds: 0,
        totalFocusSeconds: 0,
        totalAdsBlocked: 0,
        totalTrackersBlocked: 0,
        doomscrollAlertsCount: 0,
        sessionsCount: 0,
        limitsReachedCount: 0,
        categorySeconds: {
          social: 0,
          video: 0,
          music: 0,
          news: 0,
          gaming: 0,
          shopping: 0,
          education: 0,
          productivity: 0,
          entertainment: 0,
          communication: 0,
          other: 0,
        },
        platformStats: {},
      };

      return {
        ...allStats,
        [todayKey]: {
          ...current,
          totalFocusSeconds: (current.totalFocusSeconds || 0) + focusSeconds,
        },
      };
    });
  }

  /**
   * Records blocked ads or trackers from Shield.
   */
  async recordBlocked(
    typeOrAds: 'ads' | 'trackers' | number,
    countOrTrackers = 1,
    now: Date = new Date()
  ): Promise<void> {
    const todayKey = formatDateKey(now);
    let adsToAdd = 0;
    let trackersToAdd = 0;

    if (typeof typeOrAds === 'number') {
      adsToAdd = typeOrAds;
      trackersToAdd = countOrTrackers;
    } else if (typeOrAds === 'ads') {
      adsToAdd = countOrTrackers;
    } else if (typeOrAds === 'trackers') {
      trackersToAdd = countOrTrackers;
    }

    if (adsToAdd <= 0 && trackersToAdd <= 0) return;

    await this.storage.update('dailyStats', (allStats: StorageSchema['dailyStats']) => {
      const current = allStats[todayKey] || {
        date: todayKey,
        totalActiveSeconds: 0,
        totalMediaWatchSeconds: 0,
        totalFocusSeconds: 0,
        totalAdsBlocked: 0,
        totalTrackersBlocked: 0,
        doomscrollAlertsCount: 0,
        sessionsCount: 0,
        limitsReachedCount: 0,
        categorySeconds: {
          social: 0,
          video: 0,
          music: 0,
          news: 0,
          gaming: 0,
          shopping: 0,
          education: 0,
          productivity: 0,
          entertainment: 0,
          communication: 0,
          other: 0,
        },
        platformStats: {},
      };

      return {
        ...allStats,
        [todayKey]: {
          ...current,
          totalAdsBlocked: current.totalAdsBlocked + adsToAdd,
          totalTrackersBlocked: current.totalTrackersBlocked + trackersToAdd,
        },
      };
    });
  }

  /**
   * Increments doomscroll alert count.
   */
  async recordDoomscrollAlert(now: Date = new Date()): Promise<void> {
    const todayKey = formatDateKey(now);
    await this.storage.update('dailyStats', (allStats: StorageSchema['dailyStats']) => {
      const current = allStats[todayKey] || {
        date: todayKey,
        totalActiveSeconds: 0,
        totalMediaWatchSeconds: 0,
        totalFocusSeconds: 0,
        totalAdsBlocked: 0,
        totalTrackersBlocked: 0,
        doomscrollAlertsCount: 0,
        sessionsCount: 0,
        limitsReachedCount: 0,
        categorySeconds: {
          social: 0,
          video: 0,
          music: 0,
          news: 0,
          gaming: 0,
          shopping: 0,
          education: 0,
          productivity: 0,
          entertainment: 0,
          communication: 0,
          other: 0,
        },
        platformStats: {},
      };

      return {
        ...allStats,
        [todayKey]: {
          ...current,
          doomscrollAlertsCount: current.doomscrollAlertsCount + 1,
        },
      };
    });
  }

  /**
   * Clears all metrics for a given date.
   */
  async clearDay(dateStr: string): Promise<void> {
    await this.storage.update('dailyStats', (allStats: StorageSchema['dailyStats']) => {
      const updated = { ...allStats };
      delete updated[dateStr];
      return updated;
    });
  }

  /**
   * Resets all stored analytics.
   */
  async clearAllAnalytics(): Promise<void> {
    await this.storage.set('dailyStats', {});
  }
}
