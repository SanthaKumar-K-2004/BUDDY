/**
 * @buddy/shield-stats - stats-engine.ts
 * In-memory aggregating statistics engine for privacy-preserving block telemetry.
 */

import { storage, type StorageAdapter } from '@buddy/storage';
import type { DailyStats } from '@buddy/shared-types';
import type { BlockCategory, BlockEvent, IStatsEngine, ShieldStatsSummary, SiteStats } from './types.js';

export class StatsEngine implements IStatsEngine {
  private readonly storageAdapter: StorageAdapter;
  private readonly siteStatsMap: Map<string, SiteStats> = new Map();
  private pendingAdsCount = 0;
  private pendingTrackersCount = 0;
  private pendingCosmeticsCount = 0;
  private eventCounter = 0;
  private lastFlushTimestamp = Date.now();

  constructor(storageAdapter: StorageAdapter = storage) {
    this.storageAdapter = storageAdapter;
  }

  /**
   * Sanitizes domain/siteId: strips any query strings, paths, or protocols.
   * Ensures zero sensitive browsing history or URLs enter statistics.
   */
  private sanitizeSiteId(rawSite: string): string {
    if (!rawSite || typeof rawSite !== 'string') {
      return 'unknown';
    }

    let site = rawSite.trim().toLowerCase();
    if (site.includes('://')) {
      try {
        site = new URL(site).hostname;
      } catch {
        site = site.replace(/^[a-z]+:\/\//i, '');
      }
    }

    const slashIdx = site.indexOf('/');
    if (slashIdx !== -1) site = site.slice(0, slashIdx);

    const queryIdx = site.indexOf('?');
    if (queryIdx !== -1) site = site.slice(0, queryIdx);

    const colonIdx = site.indexOf(':');
    if (colonIdx !== -1 && !site.startsWith('[')) site = site.slice(0, colonIdx);

    if (site.startsWith('www.')) site = site.slice(4);

    return site || 'unknown';
  }

  /**
   * Record a blocked request or cosmetic hiding event in the in-memory aggregator.
   */
  recordBlock(eventData: Omit<BlockEvent, 'id' | 'timestamp'>): void {
    const site = this.sanitizeSiteId(eventData.siteId);
    const category: BlockCategory = eventData.category;
    const now = Date.now();

    // Increment site-specific counter
    let siteStat = this.siteStatsMap.get(site);
    if (!siteStat) {
      siteStat = {
        site,
        totalBlocked: 0,
        adsBlocked: 0,
        trackersBlocked: 0,
        cosmeticsBlocked: 0,
        lastBlockedAt: now,
      };
      this.siteStatsMap.set(site, siteStat);
    }

    siteStat.totalBlocked += 1;
    siteStat.lastBlockedAt = now;

    if (category === 'ad') {
      siteStat.adsBlocked += 1;
      this.pendingAdsCount += 1;
    } else if (category === 'tracker' || category === 'privacy') {
      siteStat.trackersBlocked += 1;
      this.pendingTrackersCount += 1;
    } else if (category === 'cosmetic') {
      siteStat.cosmeticsBlocked += 1;
      this.pendingCosmeticsCount += 1;
    }

    this.eventCounter += 1;

    // Auto-flush if threshold is reached (e.g. 50 events accumulated)
    if (this.eventCounter >= 50) {
      void this.flush();
    }
  }

  /**
   * Flush in-memory accumulated counts to persistent local storage (DailyStats).
   */
  async flush(): Promise<void> {
    if (this.pendingAdsCount === 0 && this.pendingTrackersCount === 0 && this.pendingCosmeticsCount === 0) {
      return;
    }

    const adsToFlush = this.pendingAdsCount;
    const trackersToFlush = this.pendingTrackersCount;
    const cosmeticsToFlush = this.pendingCosmeticsCount;

    // Reset pending in-memory buffer before async write to avoid double-counting
    this.pendingAdsCount = 0;
    this.pendingTrackersCount = 0;
    this.pendingCosmeticsCount = 0;
    this.eventCounter = 0;
    this.lastFlushTimestamp = Date.now();

    const today = new Date().toISOString().split('T')[0] ?? 'unknown_date';

    await this.storageAdapter.update('dailyStats', (prev) => {
      const existing: DailyStats = prev[today] ?? {
        date: today,
        totalActiveSeconds: 0,
        totalMediaWatchSeconds: 0,
        totalAdsBlocked: 0,
        totalTrackersBlocked: 0,
        doomscrollAlertsCount: 0,
        categorySeconds: {
          youtube: 0,
          instagram: 0,
          facebook: 0,
          spotify: 0,
          tiktok: 0,
          reddit: 0,
          x: 0,
          twitch: 0,
          generic: 0,
        },
      };

      return {
        ...prev,
        [today]: {
          ...existing,
          totalAdsBlocked: existing.totalAdsBlocked + adsToFlush + cosmeticsToFlush,
          totalTrackersBlocked: existing.totalTrackersBlocked + trackersToFlush,
        },
      };
    });
  }

  /**
   * Retrieve aggregate summary statistics across all time / current day.
   */
  async getSummary(): Promise<ShieldStatsSummary> {
    const dailyStatsMap = await this.storageAdapter.get('dailyStats');

    let totalAds = this.pendingAdsCount;
    let totalTrackers = this.pendingTrackersCount;
    let totalCosmetics = this.pendingCosmeticsCount;

    for (const stats of Object.values(dailyStatsMap)) {
      totalAds += stats.totalAdsBlocked;
      totalTrackers += stats.totalTrackersBlocked;
    }

    const totalBlocked = totalAds + totalTrackers + totalCosmetics;

    // Top sites from in-memory map
    const topSites = Array.from(this.siteStatsMap.values())
      .sort((a, b) => b.totalBlocked - a.totalBlocked)
      .slice(0, 10);

    return {
      totalBlocked,
      totalAds,
      totalTrackers,
      totalCosmetics,
      topSites,
    };
  }

  /**
   * Retrieve statistics for a specific site.
   */
  async getSiteStats(siteId: string): Promise<SiteStats> {
    const site = this.sanitizeSiteId(siteId);
    const existing = this.siteStatsMap.get(site);
    if (existing) {
      return { ...existing };
    }

    return {
      site,
      totalBlocked: 0,
      adsBlocked: 0,
      trackersBlocked: 0,
      cosmeticsBlocked: 0,
      lastBlockedAt: 0,
    };
  }

  getLastFlushTimestamp(): number {
    return this.lastFlushTimestamp;
  }

  /**
   * Reset in-memory statistics buffer and clear daily counters.
   */
  async reset(): Promise<void> {
    this.siteStatsMap.clear();
    this.pendingAdsCount = 0;
    this.pendingTrackersCount = 0;
    this.pendingCosmeticsCount = 0;
    this.eventCounter = 0;

    await this.storageAdapter.set('dailyStats', {});
  }
}
