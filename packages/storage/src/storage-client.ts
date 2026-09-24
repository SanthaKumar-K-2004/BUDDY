/**
 * @buddy/storage - storage-client.ts
 * Type-safe storage client for Buddy local data.
 */

import {
  CURRENT_SCHEMA_VERSION,
  type StorageKey,
  type StorageSchema,
  type UserSettings,
  type PetConfig,
  type MoodState,
  type AdaptivePolicyConfig,
  type SmartBreakState,
  type Insight,
  type BehavioralPattern,
  type PolicyDecisionLog,
  type DailyStats,
} from '@buddy/shared-types';

export const DEFAULT_ADAPTIVE_CONFIG: AdaptivePolicyConfig = {
  isAdaptiveLimitsEnabled: false,
  breakReminderEnabled: true,
  continuousActivityThresholdMinutes: 50,
  breakDurationMinutes: 5,
  smartFocusSuggestionsEnabled: true,
  excludedDomains: [],
};

export const DEFAULT_SMART_BREAK_STATE: SmartBreakState = {
  isInBreak: false,
  breakStartTime: null,
  breakDurationMinutes: 5,
  lastBreakPromptTime: null,
};

export const DEFAULT_SETTINGS: UserSettings = {
  language: 'en',
  theme: 'system',
  isShieldEnabled: true,
  isFocusEnabled: true,
  isFamilyEnabled: false,
  whitelistDomains: [],
};

export const DEFAULT_PET_CONFIG: PetConfig = {
  name: 'Buddy',
  activeSkin: 'default_cat',
  unlockedCosmetics: ['starter_collar'],
  quietHoursStart: 22,
  quietHoursEnd: 7,
};

export const DEFAULT_MOOD_STATE: MoodState = {
  score: 50.0,
  visualState: 'neutral',
  lastUpdatedAt: Date.now(),
  dailyRecoveryAccumulated: 0,
  streakDays: 0,
  streakFreezesAvailable: 1,
  lastStreakEvaluatedDate: new Date().toISOString().split('T')[0] ?? '',
};

export interface StorageAdapter {
  get<K extends StorageKey>(key: K): Promise<StorageSchema[K]>;
  set<K extends StorageKey>(key: K, value: StorageSchema[K]): Promise<void>;
  update<K extends StorageKey>(key: K, updater: (prev: StorageSchema[K]) => StorageSchema[K]): Promise<void>;
  remove(key: StorageKey): Promise<void>;
  clear(): Promise<void>;
}

export class MemoryStorageAdapter implements StorageAdapter {
  private data: Map<string, unknown> = new Map();

  async get<K extends StorageKey>(key: K): Promise<StorageSchema[K]> {
    if (this.data.has(key)) {
      return structuredClone(this.data.get(key) as StorageSchema[K]);
    }
    return this.getDefaultValue(key);
  }

  async set<K extends StorageKey>(key: K, value: StorageSchema[K]): Promise<void> {
    this.data.set(key, structuredClone(value));
  }

  async update<K extends StorageKey>(
    key: K,
    updater: (prev: StorageSchema[K]) => StorageSchema[K]
  ): Promise<void> {
    const prev = await this.get(key);
    const updated = updater(prev);
    await this.set(key, updated);
  }

  async remove(key: StorageKey): Promise<void> {
    this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  private getDefaultValue<K extends StorageKey>(key: K): StorageSchema[K] {
    switch (key) {
      case 'settings':
        return structuredClone(DEFAULT_SETTINGS) as unknown as StorageSchema[K];
      case 'sitePolicies':
        return {} as unknown as StorageSchema[K];
      case 'watchLimits':
        return [] as unknown as StorageSchema[K];
      case 'dailyStats':
        return {} as unknown as StorageSchema[K];
      case 'petConfig':
        return structuredClone(DEFAULT_PET_CONFIG) as unknown as StorageSchema[K];
      case 'moodState':
        return structuredClone(DEFAULT_MOOD_STATE) as unknown as StorageSchema[K];
      case 'streakState':
        return {
          currentStreakDays: 0,
          bestStreakDays: 0,
          lastCompletedDate: '',
          freezeTokensAvailable: 1,
          history: {},
        } as unknown as StorageSchema[K];
      case 'familyProfile':
        return null as unknown as StorageSchema[K];
      case 'familyState':
        return null as unknown as StorageSchema[K];
      case 'accessRequests':
        return [] as unknown as StorageSchema[K];
      case 'limits':
        return [] as unknown as StorageSchema[K];
      case 'focusState':
        return { isActive: false, sessionStartTime: null } as unknown as StorageSchema[K];
      case 'shieldConfig':
        return { mode: 'balanced' } as unknown as StorageSchema[K];
      case 'insights':
        return [] as unknown as StorageSchema[K];
      case 'patterns':
        return [] as unknown as StorageSchema[K];
      case 'adaptiveConfig':
        return structuredClone(DEFAULT_ADAPTIVE_CONFIG) as unknown as StorageSchema[K];
      case 'decisionLogs':
        return [] as unknown as StorageSchema[K];
      case 'smartBreakState':
        return structuredClone(DEFAULT_SMART_BREAK_STATE) as unknown as StorageSchema[K];
      case 'schemaVersion':
        return 0 as unknown as StorageSchema[K];
      default:
        throw new Error(`Unknown storage key: ${String(key)}`);
    }
  }
}

export class ChromeStorageAdapter implements StorageAdapter {
  private memoryFallback = new MemoryStorageAdapter();

  private isChromeStorageAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      Boolean(chrome.storage) &&
      Boolean(chrome.storage.local)
    );
  }

  async get<K extends StorageKey>(key: K): Promise<StorageSchema[K]> {
    if (!this.isChromeStorageAvailable()) {
      return this.memoryFallback.get(key);
    }

    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (result && result[key] !== undefined) {
          resolve(result[key] as StorageSchema[K]);
        } else {
          // Return default
          resolve(this.memoryFallback.get(key));
        }
      });
    });
  }

  async set<K extends StorageKey>(key: K, value: StorageSchema[K]): Promise<void> {
    if (!this.isChromeStorageAvailable()) {
      return this.memoryFallback.set(key, value);
    }

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve();
      });
    });
  }

  async update<K extends StorageKey>(
    key: K,
    updater: (prev: StorageSchema[K]) => StorageSchema[K]
  ): Promise<void> {
    const prev = await this.get(key);
    const updated = updater(prev);
    await this.set(key, updated);
  }

  async remove(key: StorageKey): Promise<void> {
    if (!this.isChromeStorageAvailable()) {
      return this.memoryFallback.remove(key);
    }

    return new Promise((resolve, reject) => {
      chrome.storage.local.remove([key], () => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve();
      });
    });
  }

  async clear(): Promise<void> {
    if (!this.isChromeStorageAvailable()) {
      return this.memoryFallback.clear();
    }

    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve();
      });
    });
  }
}

export class AsyncKeyLock {
  private locks = new Map<string, Promise<void>>();

  async acquire<T>(key: string, fn: () => Promise<T>): Promise<T> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    let resolveLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.locks.set(key, lockPromise);
    try {
      return await fn();
    } finally {
      this.locks.delete(key);
      resolveLock();
    }
  }
}

export const storage: StorageAdapter = new ChromeStorageAdapter();

export class StorageClient {
  private keyLock = new AsyncKeyLock();

  constructor(private adapter: StorageAdapter = storage) {}

  async get<K extends StorageKey>(key: K): Promise<StorageSchema[K]> {
    return this.adapter.get(key);
  }

  async set<K extends StorageKey>(key: K, value: StorageSchema[K]): Promise<void> {
    return this.adapter.set(key, value);
  }

  async update<K extends StorageKey>(
    key: K,
    updater: (prev: StorageSchema[K]) => StorageSchema[K]
  ): Promise<void> {
    return this.keyLock.acquire(String(key), async () => {
      const prev = await this.get(key);
      const updated = updater(prev);
      await this.set(key, updated);
    });
  }

  async remove(key: StorageKey): Promise<void> {
    return this.adapter.remove(key);
  }

  async clear(): Promise<void> {
    return this.adapter.clear();
  }

  async resetAll(): Promise<void> {
    return this.adapter.clear();
  }

  async getStorage(): Promise<StorageSchema & { limits?: any[]; shieldConfig?: any; focusState?: any }> {
    const [
      settings,
      sitePolicies,
      watchLimits,
      dailyStats,
      petConfig,
      moodState,
      streakState,
      familyProfile,
      familyState,
      accessRequests,
    ] = await Promise.all([
      this.adapter.get('settings'),
      this.adapter.get('sitePolicies'),
      this.adapter.get('watchLimits'),
      this.adapter.get('dailyStats'),
      this.adapter.get('petConfig'),
      this.adapter.get('moodState'),
      this.adapter.get('streakState'),
      this.adapter.get('familyProfile'),
      this.adapter.get('familyState'),
      this.adapter.get('accessRequests'),
    ]);

    // Handle extra keys from chrome.storage if present
    let extraData: Record<string, any> = {};
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const raw = await new Promise<Record<string, any>>((resolve) => {
          chrome.storage.local.get(['limits', 'shieldConfig', 'focusState'], (res) => resolve(res || {}));
        });
        extraData = raw;
      } catch {
        // ignore
      }
    }

    return {
      settings,
      sitePolicies,
      watchLimits,
      dailyStats,
      petConfig,
      moodState,
      streakState,
      familyProfile,
      familyState,
      accessRequests,
      limits: extraData.limits || watchLimits,
      shieldConfig: extraData.shieldConfig || { mode: settings.isShieldEnabled ? 'enabled' : 'disabled' },
      focusState: extraData.focusState || { isActive: false, sessionStartTime: null },
    };
  }

  async getFamilyState(): Promise<StorageSchema['familyState']> {
    return this.adapter.get('familyState');
  }

  async setFamilyState(state: NonNullable<StorageSchema['familyState']>): Promise<void> {
    return this.adapter.set('familyState', state);
  }

  async getAccessRequests(): Promise<StorageSchema['accessRequests']> {
    return this.adapter.get('accessRequests');
  }

  async setAccessRequests(requests: NonNullable<StorageSchema['accessRequests']>): Promise<void> {
    return this.adapter.set('accessRequests', requests);
  }

  async getInsights(): Promise<Insight[]> {
    const list = await this.adapter.get('insights');
    return (list as Insight[]) || [];
  }

  async setInsights(insights: Insight[]): Promise<void> {
    return this.adapter.set('insights', insights as unknown as StorageSchema['insights']);
  }

  async addInsight(insight: Insight): Promise<void> {
    const current = await this.getInsights();
    // Prepend, keep max 50
    const filtered = current.filter((item) => item.id !== insight.id);
    const updated = [insight, ...filtered].slice(0, 50);
    await this.setInsights(updated);
  }

  async dismissInsight(id: string): Promise<void> {
    const current = await this.getInsights();
    const updated = current.map((item) => (item.id === id ? { ...item, isDismissed: true } : item));
    await this.setInsights(updated);
  }

  async getPatterns(): Promise<BehavioralPattern[]> {
    const list = await this.adapter.get('patterns');
    return (list as BehavioralPattern[]) || [];
  }

  async setPatterns(patterns: BehavioralPattern[]): Promise<void> {
    return this.adapter.set('patterns', patterns as unknown as StorageSchema['patterns']);
  }

  async addPattern(pattern: BehavioralPattern): Promise<void> {
    const current = await this.getPatterns();
    const filtered = current.filter((p) => p.id !== pattern.id);
    const updated = [pattern, ...filtered].slice(0, 50);
    await this.setPatterns(updated);
  }

  async getAdaptiveConfig(): Promise<AdaptivePolicyConfig> {
    const cfg = await this.adapter.get('adaptiveConfig');
    return (cfg as AdaptivePolicyConfig) || DEFAULT_ADAPTIVE_CONFIG;
  }

  async setAdaptiveConfig(config: AdaptivePolicyConfig): Promise<void> {
    return this.adapter.set('adaptiveConfig', config as unknown as StorageSchema['adaptiveConfig']);
  }

  async getDecisionLogs(): Promise<PolicyDecisionLog[]> {
    const logs = await this.adapter.get('decisionLogs');
    return (logs as PolicyDecisionLog[]) || [];
  }

  async addDecisionLog(log: PolicyDecisionLog): Promise<void> {
    const current = await this.getDecisionLogs();
    const updated = [log, ...current].slice(0, 100);
    await this.adapter.set('decisionLogs', updated as unknown as StorageSchema['decisionLogs']);
  }

  async getSmartBreakState(): Promise<SmartBreakState> {
    const state = await this.adapter.get('smartBreakState');
    return (state as SmartBreakState) || DEFAULT_SMART_BREAK_STATE;
  }

  async setSmartBreakState(state: SmartBreakState): Promise<void> {
    return this.adapter.set('smartBreakState', state as unknown as StorageSchema['smartBreakState']);
  }

  async runMigrations(): Promise<{ migrated: boolean; fromVersion: number; toVersion: number }> {
    return this.keyLock.acquire('__schema_migration__', async () => {
      const storedVersion = (await this.adapter.get('schemaVersion')) ?? 0;
      if (storedVersion >= CURRENT_SCHEMA_VERSION) {
        return { migrated: false, fromVersion: storedVersion, toVersion: CURRENT_SCHEMA_VERSION };
      }

      // Safe migration: guarantee defaults for any missing/malformed objects
      const settings = await this.adapter.get('settings');
      if (!settings || typeof settings !== 'object') {
        await this.adapter.set('settings', structuredClone(DEFAULT_SETTINGS));
      }

      const adaptive = await this.adapter.get('adaptiveConfig');
      if (!adaptive || typeof adaptive !== 'object') {
        await this.adapter.set('adaptiveConfig', structuredClone(DEFAULT_ADAPTIVE_CONFIG));
      }

      const smartBreak = await this.adapter.get('smartBreakState');
      if (!smartBreak || typeof smartBreak !== 'object') {
        await this.adapter.set('smartBreakState', structuredClone(DEFAULT_SMART_BREAK_STATE));
      }

      await this.adapter.set('schemaVersion', CURRENT_SCHEMA_VERSION as unknown as StorageSchema['schemaVersion']);

      return { migrated: true, fromVersion: storedVersion, toVersion: CURRENT_SCHEMA_VERSION };
    });
  }

  async pruneOldData(retentionDays: number = 90): Promise<{ prunedDays: number; prunedLogs: number }> {
    return this.keyLock.acquire('__prune_data__', async () => {
      let prunedDays = 0;
      let prunedLogs = 0;

      await this.update('dailyStats', (stats) => {
        if (!stats || typeof stats !== 'object') return {};
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const cutoffKey = cutoffDate.toISOString().split('T')[0];

        const pruned: Record<string, DailyStats> = {};
        for (const [key, value] of Object.entries(stats)) {
          if (key >= cutoffKey) {
            pruned[key] = value;
          } else {
            prunedDays++;
          }
        }
        return pruned;
      });

      await this.update('decisionLogs', (logs) => {
        if (!Array.isArray(logs)) return [];
        if (logs.length > 200) {
          prunedLogs = logs.length - 200;
          return logs.slice(0, 200);
        }
        return logs;
      });

      await this.update('patterns', (patterns) => {
        if (!Array.isArray(patterns)) return [];
        return patterns.slice(0, 100);
      });

      await this.update('insights', (insights) => {
        if (!Array.isArray(insights)) return [];
        return insights.slice(0, 50);
      });

      return { prunedDays, prunedLogs };
    });
  }

  async exportData(): Promise<{
    version: number;
    schemaVersion: number;
    exportedAt: number;
    data: Partial<StorageSchema>;
  }> {
    const full = await this.getStorage();
    return {
      version: 1,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: Date.now(),
      data: full,
    };
  }

  async importData(payload: unknown): Promise<{ success: boolean; error?: string }> {
    if (!payload || typeof payload !== 'object') {
      return { success: false, error: 'Invalid payload: must be an object' };
    }

    const obj = payload as Record<string, unknown>;
    if (typeof obj.data !== 'object' || obj.data === null) {
      return { success: false, error: 'Invalid payload: missing data object' };
    }

    const data = obj.data as Partial<StorageSchema>;

    return this.keyLock.acquire('__import_data__', async () => {
      if (data.settings && typeof data.settings === 'object') {
        const s = data.settings as UserSettings;
        if (['en', 'ta', 'ar'].includes(s.language) && ['system', 'dark', 'light'].includes(s.theme)) {
          await this.set('settings', s);
        }
      }

      if (Array.isArray(data.watchLimits)) {
        await this.set('watchLimits', data.watchLimits);
      }

      if (data.dailyStats && typeof data.dailyStats === 'object') {
        await this.set('dailyStats', data.dailyStats);
      }

      if (data.adaptiveConfig && typeof data.adaptiveConfig === 'object') {
        await this.setAdaptiveConfig(data.adaptiveConfig);
      }

      await this.set('schemaVersion', CURRENT_SCHEMA_VERSION as unknown as StorageSchema['schemaVersion']);

      return { success: true };
    });
  }
}

