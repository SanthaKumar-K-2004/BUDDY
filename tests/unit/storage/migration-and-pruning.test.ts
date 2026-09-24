import { describe, it, expect, beforeEach } from 'vitest';
import { StorageClient, MemoryStorageAdapter, AsyncKeyLock } from '@buddy/storage';
import { CURRENT_SCHEMA_VERSION, type DailyStats } from '@buddy/shared-types';

describe('Storage Migration, Pruning & Concurrency Hardening', () => {
  let adapter: MemoryStorageAdapter;
  let client: StorageClient;

  beforeEach(() => {
    adapter = new MemoryStorageAdapter();
    client = new StorageClient(adapter);
  });

  describe('AsyncKeyLock Concurrency', () => {
    it('executes concurrent update calls sequentially without race conditions', async () => {
      await client.set('dailyStats', {});

      // Simulate 10 concurrent tabs/workers updating dailyStats at the same time
      const updates = Array.from({ length: 10 }).map((_, i) =>
        client.update('dailyStats', (stats) => {
          const dateKey = '2026-09-24';
          const existing = stats[dateKey] || {
            date: dateKey,
            totalActiveSeconds: 0,
            totalMediaWatchSeconds: 0,
            totalAdsBlocked: 0,
            totalTrackersBlocked: 0,
            doomscrollAlertsCount: 0,
            categorySeconds: {
              video: 0,
              short_form: 0,
              social: 0,
              music: 0,
              gaming: 0,
              news: 0,
              productivity: 0,
              other: 0,
            },
          };

          return {
            ...stats,
            [dateKey]: {
              ...existing,
              totalActiveSeconds: existing.totalActiveSeconds + 10,
              totalMediaWatchSeconds: existing.totalMediaWatchSeconds + 5,
            },
          };
        })
      );

      await Promise.all(updates);

      const finalStats = await client.get('dailyStats');
      expect(finalStats['2026-09-24'].totalActiveSeconds).toBe(100);
      expect(finalStats['2026-09-24'].totalMediaWatchSeconds).toBe(50);
    });
  });

  describe('Schema Versioning & Migrations', () => {
    it('initializes schemaVersion on clean installation', async () => {
      const result = await client.runMigrations();
      expect(result.migrated).toBe(true);
      expect(result.toVersion).toBe(CURRENT_SCHEMA_VERSION);

      const version = await client.get('schemaVersion');
      expect(version).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('skips migration when already on latest version', async () => {
      await client.set('schemaVersion', CURRENT_SCHEMA_VERSION);
      const result = await client.runMigrations();
      expect(result.migrated).toBe(false);
      expect(result.fromVersion).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('populates missing required configs during migration from v0', async () => {
      // Simulate older v0 schema lacking adaptiveConfig
      await adapter.remove('adaptiveConfig');
      await adapter.set('schemaVersion', 0 as any);

      const result = await client.runMigrations();
      expect(result.migrated).toBe(true);
      expect(result.toVersion).toBe(CURRENT_SCHEMA_VERSION);

      const config = await client.getAdaptiveConfig();
      expect(config.breakReminderEnabled).toBe(true);
      expect(config.continuousActivityThresholdMinutes).toBe(50);
    });
  });

  describe('Data Retention & Pruning', () => {
    it('prunes dailyStats older than retention threshold', async () => {
      const stats: Record<string, DailyStats> = {
        '2026-01-01': {
          date: '2026-01-01',
          totalActiveSeconds: 100,
          totalMediaWatchSeconds: 50,
          totalAdsBlocked: 0,
          totalTrackersBlocked: 0,
          doomscrollAlertsCount: 0,
          categorySeconds: {
            video: 50,
            short_form: 0,
            social: 0,
            music: 0,
            gaming: 0,
            news: 0,
            productivity: 0,
            other: 50,
          },
        },
        '2026-09-24': {
          date: '2026-09-24',
          totalActiveSeconds: 300,
          totalMediaWatchSeconds: 150,
          totalAdsBlocked: 5,
          totalTrackersBlocked: 2,
          doomscrollAlertsCount: 0,
          categorySeconds: {
            video: 150,
            short_form: 0,
            social: 0,
            music: 0,
            gaming: 0,
            news: 0,
            productivity: 0,
            other: 150,
          },
        },
      };

      await client.set('dailyStats', stats);
      const pruneResult = await client.pruneOldData(90);

      expect(pruneResult.prunedDays).toBe(1);
      const remainingStats = await client.get('dailyStats');
      expect(remainingStats['2026-01-01']).toBeUndefined();
      expect(remainingStats['2026-09-24']).toBeDefined();
    });

    it('bounds decisionLogs, patterns, and insights to maximum capacities', async () => {
      // Seed 250 decision logs
      const logs = Array.from({ length: 250 }).map((_, i) => ({
        id: `log_${i}`,
        timestamp: Date.now() - i * 1000,
        action: 'allow' as const,
        trigger: 'test',
        policy: 'test',
        result: 'enforced' as const,
        explanation: `Test log ${i}`,
      }));

      await client.set('decisionLogs', logs as any);
      const pruneResult = await client.pruneOldData(90);

      expect(pruneResult.prunedLogs).toBe(50);
      const remainingLogs = await client.getDecisionLogs();
      expect(remainingLogs.length).toBe(200);
    });
  });

  describe('Export & Import Security', () => {
    it('exports complete structured analytics dataset with schema version', async () => {
      const exported = await client.exportData();
      expect(exported.version).toBe(1);
      expect(exported.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(typeof exported.exportedAt).toBe('number');
      expect(exported.data.settings).toBeDefined();
    });

    it('rejects invalid or corrupted import payloads', async () => {
      const resNull = await client.importData(null);
      expect(resNull.success).toBe(false);

      const resString = await client.importData('invalid json');
      expect(resString.success).toBe(false);

      const resEmpty = await client.importData({});
      expect(resEmpty.success).toBe(false);
    });

    it('safely imports valid datasets and updates schemaVersion', async () => {
      const validPayload = {
        version: 1,
        schemaVersion: 1,
        exportedAt: Date.now(),
        data: {
          settings: {
            language: 'ta',
            theme: 'dark',
            isShieldEnabled: true,
            isFocusEnabled: true,
            isFamilyEnabled: false,
            whitelistDomains: ['example.com'],
          },
          watchLimits: [
            {
              id: 'limit_1',
              name: 'YouTube Limit',
              targetType: 'platform',
              targetValue: 'youtube',
              maxMinutesPerDay: 45,
              isEnabled: true,
              schedule: { daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
            },
          ],
        },
      };

      const result = await client.importData(validPayload);
      expect(result.success).toBe(true);

      const settings = await client.get('settings');
      expect(settings.language).toBe('ta');
      expect(settings.theme).toBe('dark');

      const limits = await client.get('watchLimits');
      expect(limits.length).toBe(1);
      expect(limits[0].maxMinutesPerDay).toBe(45);
    });
  });
});
