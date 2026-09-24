import { describe, it, expect } from 'vitest';
import {
  PatternDetector,
  TrendEngine,
  InsightEngine,
  AdaptivePolicyEngine,
  LocalDataPipeline,
} from '@buddy/intelligence-engine';
import { MemoryStorageAdapter, StorageClient, AnalyticsAggregator, formatDateKey } from '@buddy/storage';
import type { ActivityEvent, AdaptivePolicyConfig } from '@buddy/shared-types';

describe('Phase 7 Integration: End-to-End Intelligence Flow', () => {
  it('processes activity events, detects patterns, computes baselines, generates insights, enforces policies, and exports data', async () => {
    const memory = new MemoryStorageAdapter();
    const storageClient = new StorageClient(memory);
    const aggregator = new AnalyticsAggregator(memory);
    const pipeline = new LocalDataPipeline();
    const patternDetector = new PatternDetector({
      uninterruptedSessionThresholdMinutes: 50,
      shortFormSessionCountThreshold: 2,
    });
    const trendEngine = new TrendEngine();
    const insightEngine = new InsightEngine();

    const config: AdaptivePolicyConfig = {
      isAdaptiveLimitsEnabled: false,
      breakReminderEnabled: true,
      continuousActivityThresholdMinutes: 50,
      breakDurationMinutes: 5,
      smartFocusSuggestionsEnabled: true,
      excludedDomains: [],
    };
    const policyEngine = new AdaptivePolicyEngine(config);

    const now = 1700000000000;

    // 1. Generate real activity events across multiple platforms
    const events: ActivityEvent[] = [
      {
        id: 'ev_yt_1',
        timestamp: now,
        site: 'youtube',
        domain: 'youtube.com',
        activityType: 'short',
        state: 'ended',
        durationMs: 35 * 60 * 1000, // 35m shorts
      },
      {
        id: 'ev_ig_1',
        timestamp: now + 36 * 60 * 1000,
        site: 'instagram',
        domain: 'instagram.com',
        activityType: 'reel',
        state: 'ended',
        durationMs: 25 * 60 * 1000, // 25m reels
      },
      {
        id: 'ev_rd_1',
        timestamp: now + 62 * 60 * 1000,
        site: 'reddit',
        domain: 'reddit.com',
        activityType: 'social',
        state: 'ended',
        durationMs: 15 * 60 * 1000, // 15m social
      },
    ];

    // 2. Validate and record events through pipeline into aggregator
    for (const ev of events) {
      expect(pipeline.validateEvent(ev, now + 120 * 60 * 1000).isValid).toBe(true);
      expect(pipeline.isDuplicate(ev)).toBe(false);
      await aggregator.recordActivityEvent(ev, new Date(ev.timestamp));
    }

    // 3. Detect patterns
    const totalSessionMs = 75 * 60 * 1000; // 75m uninterrupted
    const patterns = patternDetector.analyzePatterns(events, totalSessionMs, 'reddit.com', new Date(now));
    expect(patterns.length).toBeGreaterThanOrEqual(1);

    const uninterrupted = patterns.find((p) => p.type === 'long_uninterrupted');
    expect(uninterrupted).toBeDefined();

    for (const p of patterns) {
      await storageClient.addPattern(p);
    }

    // 4. Retrieve today summary from aggregator
    const todaySummary = await aggregator.getDailySummary(formatDateKey(new Date(now)));
    expect(todaySummary.totalActiveMs).toBe(75 * 60 * 1000);

    // 5. Generate Insights
    const insights = await insightEngine.generateInsights({
      today: todaySummary,
      patterns,
      streak: { currentStreakDays: 2, bestStreakDays: 4, freezeTokensAvailable: 1, history: {}, lastCompletedDate: '' },
    });

    expect(insights.length).toBeGreaterThanOrEqual(2);
    for (const ins of insights) {
      await storageClient.addInsight(ins);
    }

    // 6. Evaluate Adaptive Policy on Reddit (continuous time = 75m)
    const decision = policyEngine.evaluate({
      domain: 'reddit.com',
      currentContinuousMinutes: 75,
      activePatterns: patterns,
    });

    expect(decision.action).toBe('suggest_break');
    expect(decision.reason).toContain('Take a 5m break');
    await storageClient.addDecisionLog(decision.log);

    // 7. Verify storage content and export
    const storedInsights = await storageClient.getInsights();
    const storedPatterns = await storageClient.getPatterns();
    const storedLogs = await storageClient.getDecisionLogs();

    expect(storedInsights.length).toBeGreaterThanOrEqual(2);
    expect(storedPatterns.length).toBeGreaterThanOrEqual(1);
    expect(storedLogs.length).toBe(1);

    const exportedJson = await pipeline.exportData(storageClient);
    expect(exportedJson).toContain('reddit.com');
    expect(exportedJson).toContain('suggest_break');

    // 8. Full privacy reset
    await pipeline.executeFullReset(storageClient);
    const postResetInsights = await storageClient.getInsights();
    expect(postResetInsights.length).toBe(0);
  });
});
