import { describe, it, expect, beforeEach } from 'vitest';
import { LocalDataPipeline } from '@buddy/intelligence-engine';
import { MemoryStorageAdapter, StorageClient } from '@buddy/storage';
import type { ActivityEvent } from '@buddy/shared-types';

describe('LocalDataPipeline', () => {
  let pipeline: LocalDataPipeline;
  let memoryStorage: MemoryStorageAdapter;
  let storageClient: StorageClient;

  beforeEach(() => {
    pipeline = new LocalDataPipeline();
    memoryStorage = new MemoryStorageAdapter();
    storageClient = new StorageClient(memoryStorage);
  });

  it('validates activity events and rejects malformed or impossible values', () => {
    const validEvent: ActivityEvent = {
      id: 'ev_123',
      timestamp: 1700000000000,
      site: 'youtube',
      domain: 'youtube.com',
      activityType: 'video',
      state: 'active',
      durationMs: 30000,
    };
    expect(pipeline.validateEvent(validEvent, 1700000000000).isValid).toBe(true);

    // Negative duration
    const negativeDuration = { ...validEvent, durationMs: -5000 };
    expect(pipeline.validateEvent(negativeDuration, 1700000000000).isValid).toBe(false);

    // Impossible future timestamp (> 1 hr ahead)
    const futureEvent = { ...validEvent, timestamp: 1700000000000 + 4 * 60 * 60 * 1000 };
    expect(pipeline.validateEvent(futureEvent, 1700000000000).isValid).toBe(false);

    // Unknown activity type
    const unknownType = { ...validEvent, activityType: 'invalid_type' as any };
    expect(pipeline.validateEvent(unknownType, 1700000000000).isValid).toBe(false);

    // Missing domain
    const missingDomain = { ...validEvent, domain: '' };
    expect(pipeline.validateEvent(missingDomain, 1700000000000).isValid).toBe(false);
  });

  it('deduplicates events based on event ID', () => {
    const event: ActivityEvent = {
      id: 'ev_dup_1',
      timestamp: 1700000000000,
      site: 'reddit',
      domain: 'reddit.com',
      activityType: 'social',
      state: 'active',
    };

    expect(pipeline.isDuplicate(event)).toBe(false); // First time seen
    expect(pipeline.isDuplicate(event)).toBe(true);  // Duplicate detected
  });

  it('exports complete local data as structured JSON and executes full privacy reset', async () => {
    // Populate some data
    await storageClient.addInsight({
      id: 'ins_1',
      type: 'usage',
      priority: 'low',
      createdAt: 1000,
      title: 'Usage',
      message: 'Browsed for 30m',
      evidence: ['30 minutes active'],
    });

    await storageClient.addPattern({
      id: 'pat_1',
      type: 'rapid_reopen',
      detectedAt: 1000,
      description: 'Rapid reopen',
      evidence: ['Reopened in 20s'],
      occurrences: 2,
    });

    await storageClient.addDecisionLog({
      id: 'dec_1',
      timestamp: 1000,
      trigger: 'tiktok.com',
      policy: 'daily_limit',
      action: 'block',
      reason: '30m limit reached',
    });

    // Export Data
    const jsonString = await pipeline.exportData(storageClient);
    expect(jsonString).toContain('ins_1');
    expect(jsonString).toContain('pat_1');
    expect(jsonString).toContain('dec_1');

    const parsed = JSON.parse(jsonString);
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.insights.length).toBe(1);
    expect(parsed.patterns.length).toBe(1);
    expect(parsed.decisionLogs.length).toBe(1);

    // Execute Full Privacy Reset
    await pipeline.executeFullReset(storageClient);

    const clearedInsights = await storageClient.getInsights();
    const clearedPatterns = await storageClient.getPatterns();
    const clearedLogs = await storageClient.getDecisionLogs();

    expect(clearedInsights.length).toBe(0);
    expect(clearedPatterns.length).toBe(0);
    expect(clearedLogs.length).toBe(0);
  });
});
