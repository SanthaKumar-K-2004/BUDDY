import { describe, it, expect, beforeEach } from 'vitest';
import {
  AnalyticsAggregator,
  formatDateKey,
  getTotalShortFormMs,
  type StorageAdapter,
} from '@buddy/storage';
import type { ActivityEvent, StorageSchema } from '@buddy/shared-types';

class MemoryStorageAdapter implements StorageAdapter {
  private data: Partial<StorageSchema> = {};

  async get<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K]> {
    return (this.data[key] ?? {}) as StorageSchema[K];
  }

  async set<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]): Promise<void> {
    this.data[key] = value;
  }

  async update<K extends keyof StorageSchema>(
    key: K,
    updater: (current: StorageSchema[K]) => StorageSchema[K]
  ): Promise<void> {
    const current = await this.get(key);
    this.data[key] = updater(current);
  }

  async remove(key: keyof StorageSchema): Promise<void> {
    delete this.data[key];
  }

  async clear(): Promise<void> {
    this.data = {};
  }
}

describe('Phase 6 - Cross-Site Analytics & Universal Aggregation Flow', () => {
  let storage: MemoryStorageAdapter;
  let aggregator: AnalyticsAggregator;
  const testDate = new Date('2026-09-23T12:00:00Z');

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    aggregator = new AnalyticsAggregator(storage);
  });

  it('aggregates real activity events across YouTube, Instagram, Spotify, and Generic Web', async () => {
    // 1. 15 minutes of YouTube regular video
    const ytVideoEvent: ActivityEvent = {
      id: 'evt-yt-1',
      timestamp: testDate.getTime(),
      site: 'youtube.com',
      domain: 'youtube.com',
      platform: 'youtube',
      activityType: 'video',
      category: 'video',
      state: 'active',
      durationMs: 15 * 60 * 1000, // 15 mins
    };
    await aggregator.recordActivityEvent(ytVideoEvent, testDate);

    // 2. 10 minutes of YouTube Shorts
    const ytShortsEvent: ActivityEvent = {
      id: 'evt-yt-shorts-1',
      timestamp: testDate.getTime() + 1000,
      site: 'youtube.com',
      domain: 'youtube.com',
      platform: 'youtube',
      activityType: 'short',
      category: 'video',
      state: 'active',
      isShortForm: true,
      durationMs: 10 * 60 * 1000, // 10 mins
    };
    await aggregator.recordActivityEvent(ytShortsEvent, testDate);

    // 3. 20 minutes of Instagram Reels
    const igReelsEvent: ActivityEvent = {
      id: 'evt-ig-reels-1',
      timestamp: testDate.getTime() + 2000,
      site: 'instagram.com',
      domain: 'instagram.com',
      platform: 'instagram',
      activityType: 'reel',
      category: 'social',
      state: 'active',
      isShortForm: true,
      durationMs: 20 * 60 * 1000, // 20 mins
    };
    await aggregator.recordActivityEvent(igReelsEvent, testDate);

    // 4. 30 minutes of Spotify Music
    const spotifyEvent: ActivityEvent = {
      id: 'evt-spotify-1',
      timestamp: testDate.getTime() + 3000,
      site: 'open.spotify.com',
      domain: 'spotify.com',
      platform: 'spotify',
      activityType: 'music',
      category: 'music',
      state: 'active',
      durationMs: 30 * 60 * 1000, // 30 mins
    };
    await aggregator.recordActivityEvent(spotifyEvent, testDate);

    // 5. 10 minutes of Generic Web browsing
    const genericEvent: ActivityEvent = {
      id: 'evt-web-1',
      timestamp: testDate.getTime() + 4000,
      site: 'developer.mozilla.org',
      domain: 'developer.mozilla.org',
      platform: 'generic',
      activityType: 'page',
      category: 'education',
      state: 'active',
      durationMs: 10 * 60 * 1000, // 10 mins
    };
    await aggregator.recordActivityEvent(genericEvent, testDate);

    // Retrieve daily summary
    const summary = await aggregator.getDailySummary(formatDateKey(testDate));

    // Verify Total Active Time: (15 + 10 + 20 + 30 + 10) = 85 mins = 5,100,000 ms
    expect(summary.totalActiveMs).toBe(85 * 60 * 1000);

    // Verify Category Breakdown:
    expect(summary.videoMs).toBe((15 + 10) * 60 * 1000); // 25 mins video
    expect(summary.socialMs).toBe(20 * 60 * 1000); // 20 mins social
    expect(summary.musicMs).toBe(30 * 60 * 1000); // 30 mins music

    // Verify Cross-Platform Short-form aggregation:
    // YouTube Shorts (10m) + Instagram Reels (20m) = 30m = 1,800,000 ms
    const totalShortFormMs = getTotalShortFormMs(summary);
    expect(totalShortFormMs).toBe(30 * 60 * 1000);

    // Verify Per-Platform breakdown:
    expect(summary.platformStats['youtube']?.activeMs).toBe(25 * 60 * 1000);
    expect(summary.platformStats['youtube']?.shortFormMs).toBe(10 * 60 * 1000);

    expect(summary.platformStats['instagram']?.activeMs).toBe(20 * 60 * 1000);
    expect(summary.platformStats['instagram']?.shortFormMs).toBe(20 * 60 * 1000);

    expect(summary.platformStats['spotify']?.activeMs).toBe(30 * 60 * 1000);
    expect(summary.platformStats['spotify']?.shortFormMs).toBe(0);

    expect(summary.platformStats['generic']?.activeMs).toBe(10 * 60 * 1000);

    // Mathematical reconciliation invariant:
    const sumOfPlatformActive = Object.values(summary.platformStats).reduce(
      (acc, p) => acc + p.activeMs,
      0
    );
    expect(summary.totalActiveMs).toBe(sumOfPlatformActive);
  });
});
