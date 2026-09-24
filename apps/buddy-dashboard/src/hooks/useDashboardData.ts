import { useState, useEffect, useCallback } from 'preact/hooks';
import type {
  DailySummary,
  WeeklySummary,
  MoodState,
  StreakState,
  LimitRule,
} from '@buddy/shared-types';
import { AnalyticsAggregator, StorageClient } from '@buddy/storage';
import { MoodEngine, StreakEngine } from '@buddy/mood-engine';

export interface DashboardDataState {
  today: DailySummary | null;
  yesterday: DailySummary | null;
  weekly: WeeklySummary | null;
  mood: MoodState;
  streak: StreakState;
  limits: LimitRule[];
  isFocusActive: boolean;
  focusSessionStart: number | null;
  isShieldActive: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardDataState>({
    today: null,
    yesterday: null,
    weekly: null,
    mood: {
      score: 75.0,
      visualState: 'happy',
      lastUpdatedAt: Date.now(),
      dailyRecoveryAccumulated: 0,
      streakDays: 0,
      streakFreezesAvailable: 2,
      lastStreakEvaluatedDate: '',
    },
    streak: {
      currentStreakDays: 0,
      bestStreakDays: 0,
      lastCompletedDate: '',
      freezeTokensAvailable: 2,
      history: {},
      currentStreak: 0,
      longestStreak: 0,
      freezesRemaining: 2,
      lastEvaluatedDate: '',
    },
    limits: [],
    isFocusActive: false,
    focusSessionStart: null,
    isShieldActive: true,
    isLoading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    try {
      const aggregator = new AnalyticsAggregator();
      const storageClient = new StorageClient();
      const moodEngine = new MoodEngine();
      const streakEngine = new StreakEngine();

      const [today, yesterday, weekly, storedData] = await Promise.all([
        aggregator.getTodaySummary(),
        aggregator.getYesterdaySummary(),
        aggregator.getWeeklySummary(),
        storageClient.getStorage(),
      ]);

      const mood = moodEngine.getState();
      const streak = storedData.streakState || streakEngine.getState();
      const limits = storedData.limits || [];
      const isShieldActive = storedData.shieldConfig?.mode !== 'disabled';
      const isFocusActive = storedData.focusState?.isActive ?? false;
      const focusSessionStart = storedData.focusState?.sessionStartTime ?? null;

      setData({
        today,
        yesterday,
        weekly,
        mood,
        streak,
        limits,
        isFocusActive,
        focusSessionStart,
        isShieldActive,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      console.error('[Buddy Dashboard] Failed to load local analytics:', err);
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Unable to read local Buddy data.',
      }));
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen to chrome.storage changes for reactive updates across contexts
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      const storageListener = () => {
        loadData();
      };
      chrome.storage.onChanged.addListener(storageListener);
      return () => {
        chrome.storage.onChanged.removeListener(storageListener);
      };
    }
    return undefined;
  }, [loadData]);

  const clearToday = useCallback(async () => {
    const aggregator = new AnalyticsAggregator();
    await aggregator.clearDay(new Date().toISOString().split('T')[0]);
    await loadData();
  }, [loadData]);

  const clearAllAnalytics = useCallback(async () => {
    const aggregator = new AnalyticsAggregator();
    await aggregator.clearAllAnalytics();
    await loadData();
  }, [loadData]);

  const resetPetAndStreaks = useCallback(async () => {
    const moodEngine = new MoodEngine();
    moodEngine.reset();
    const streakEngine = new StreakEngine();
    streakEngine.reset();
    const storageClient = new StorageClient();
    await storageClient.set('streakState', streakEngine.getState());
    await loadData();
  }, [loadData]);

  const resetAllLocalData = useCallback(async () => {
    const aggregator = new AnalyticsAggregator();
    await aggregator.clearAllAnalytics();
    const moodEngine = new MoodEngine();
    moodEngine.reset();
    const streakEngine = new StreakEngine();
    streakEngine.reset();
    const storageClient = new StorageClient();
    await storageClient.resetAll();
    await loadData();
  }, [loadData]);

  const exportAnalytics = useCallback(async () => {
    const aggregator = new AnalyticsAggregator();
    const storageClient = new StorageClient();
    const [weekly, storageData] = await Promise.all([
      aggregator.getWeeklySummary(),
      storageClient.getStorage(),
    ]);

    const exportPayload = {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      weeklySummary: weekly,
      dailyStats: storageData.dailyStats,
      streakState: storageData.streakState,
      limits: storageData.limits,
      privacyGuarantee: 'Export contains aggregated metrics only. No URLs, page titles, or message contents are ever collected or stored.',
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `buddy-analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    ...data,
    refresh: loadData,
    clearToday,
    clearAllAnalytics,
    resetPetAndStreaks,
    resetAllLocalData,
    exportAnalytics,
  };
}
