import { describe, it, expect, beforeEach } from 'vitest';
import { StatsEngine } from '@buddy/shield-stats';
import { MemoryStorageAdapter } from '@buddy/storage';

describe('StatsEngine', () => {
  let memoryStorage: MemoryStorageAdapter;
  let stats: StatsEngine;

  beforeEach(() => {
    memoryStorage = new MemoryStorageAdapter();
    stats = new StatsEngine(memoryStorage);
  });

  describe('Privacy Preserving Site Sanitization', () => {
    it('sanitizes URLs to bare domains, discarding query params and sensitive paths', async () => {
      stats.recordBlock({
        siteId: 'https://bank.com/account/12345?session=secret#token',
        category: 'ad',
        source: 'dnr',
      });

      const siteStats = await stats.getSiteStats('bank.com');
      expect(siteStats.totalBlocked).toBe(1);
      expect(siteStats.adsBlocked).toBe(1);
      expect(siteStats.site).toBe('bank.com');

      // Raw URL should not exist in map
      const dirtyStats = await stats.getSiteStats('https://bank.com/account/12345?session=secret#token');
      expect(dirtyStats.site).toBe('bank.com');
    });
  });

  describe('In-Memory Aggregation and Flush', () => {
    it('accumulates counts in memory and returns accurate summary', async () => {
      stats.recordBlock({ siteId: 'example.com', category: 'ad', source: 'dnr' });
      stats.recordBlock({ siteId: 'example.com', category: 'ad', source: 'dnr' });
      stats.recordBlock({ siteId: 'example.com', category: 'tracker', source: 'dnr' });
      stats.recordBlock({ siteId: 'test.org', category: 'cosmetic', source: 'cosmetic' });

      const summary = await stats.getSummary();
      expect(summary.totalBlocked).toBe(4);
      expect(summary.totalAds).toBe(2);
      expect(summary.totalTrackers).toBe(1);
      expect(summary.totalCosmetics).toBe(1);

      const exampleStats = await stats.getSiteStats('example.com');
      expect(exampleStats.totalBlocked).toBe(3);
      expect(exampleStats.adsBlocked).toBe(2);
      expect(exampleStats.trackersBlocked).toBe(1);
    });

    it('flushes in-memory counters to DailyStats in storage', async () => {
      stats.recordBlock({ siteId: 'example.com', category: 'ad', source: 'dnr' });
      stats.recordBlock({ siteId: 'example.com', category: 'tracker', source: 'dnr' });

      await stats.flush();

      const today = new Date().toISOString().split('T')[0] ?? '';
      const dailyStatsMap = await memoryStorage.get('dailyStats');
      const todayStats = dailyStatsMap[today];

      expect(todayStats).toBeDefined();
      expect(todayStats?.totalAdsBlocked).toBe(1);
      expect(todayStats?.totalTrackersBlocked).toBe(1);

      // Summary after flush still reflects persisted numbers
      const summary = await stats.getSummary();
      expect(summary.totalBlocked).toBe(2);
      expect(summary.totalAds).toBe(1);
      expect(summary.totalTrackers).toBe(1);
    });

    it('resets all statistics cleanly', async () => {
      stats.recordBlock({ siteId: 'example.com', category: 'ad', source: 'dnr' });
      await stats.flush();

      await stats.reset();

      const summary = await stats.getSummary();
      expect(summary.totalBlocked).toBe(0);
      expect(summary.totalAds).toBe(0);
      expect(summary.totalTrackers).toBe(0);

      const siteStats = await stats.getSiteStats('example.com');
      expect(siteStats.totalBlocked).toBe(0);
    });
  });
});
