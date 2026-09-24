import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorageAdapter, DEFAULT_SETTINGS, DEFAULT_PET_CONFIG, DEFAULT_MOOD_STATE } from '@buddy/storage';
import type { UserSettings, WatchLimit } from '@buddy/shared-types';

describe('Storage Package - MemoryStorageAdapter', () => {
  let storage: MemoryStorageAdapter;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
  });

  it('reads default settings when uninitialized', async () => {
    const settings = await storage.get('settings');
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.isShieldEnabled).toBe(true);
    expect(settings.language).toBe('en');
  });

  it('writes and reads updated settings', async () => {
    const newSettings: UserSettings = {
      ...DEFAULT_SETTINGS,
      language: 'ta',
      isFamilyEnabled: true,
      whitelistDomains: ['example.com'],
    };

    await storage.set('settings', newSettings);
    const retrieved = await storage.get('settings');
    expect(retrieved).toEqual(newSettings);
    expect(retrieved.language).toBe('ta');
  });

  it('updates storage atomically via updater function', async () => {
    await storage.update('settings', (prev) => ({
      ...prev,
      isShieldEnabled: false,
    }));

    const result = await storage.get('settings');
    expect(result.isShieldEnabled).toBe(false);
  });

  it('reads default pet config and mood state', async () => {
    const pet = await storage.get('petConfig');
    expect(pet).toEqual(DEFAULT_PET_CONFIG);

    const mood = await storage.get('moodState');
    expect(mood.score).toBe(DEFAULT_MOOD_STATE.score);
    expect(mood.visualState).toBe('neutral');
  });

  it('handles watch limits array operations', async () => {
    const limit: WatchLimit = {
      id: 'limit-yt',
      targetType: 'platform',
      targetValue: 'youtube',
      maxMinutesPerDay: 45,
      currentMinutesUsed: 10,
      warningThresholdPercent: 80,
      intervention: 'gentle_nudge',
      isEnabled: true,
    };

    await storage.set('watchLimits', [limit]);
    const limits = await storage.get('watchLimits');
    expect(limits).toHaveLength(1);
    expect(limits[0]?.id).toBe('limit-yt');
  });

  it('removes keys and resets to defaults', async () => {
    await storage.set('settings', {
      ...DEFAULT_SETTINGS,
      theme: 'dark',
    });
    expect((await storage.get('settings')).theme).toBe('dark');

    await storage.remove('settings');
    expect((await storage.get('settings')).theme).toBe('system');
  });

  it('clears all data', async () => {
    await storage.set('watchLimits', [
      {
        id: '1',
        targetType: 'site',
        targetValue: 'test.com',
        maxMinutesPerDay: 10,
        currentMinutesUsed: 0,
        warningThresholdPercent: 80,
        intervention: 'soft_pause',
        isEnabled: true,
      },
    ]);

    await storage.clear();
    const limits = await storage.get('watchLimits');
    expect(limits).toEqual([]);
  });
});
