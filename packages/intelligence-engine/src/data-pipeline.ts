/**
 * @buddy/intelligence-engine - data-pipeline.ts
 * Manages raw event validation, deduplication, full analytics data export,
 * and complete privacy-preserving local resets.
 */

import type { ActivityEvent, ActivityType, StorageSchema } from '@buddy/shared-types';
import type { StorageClient } from '@buddy/storage';

const VALID_ACTIVITY_TYPES: ReadonlySet<string> = new Set<ActivityType>([
  'page',
  'video',
  'short',
  'reel',
  'music',
  'feed',
  'social',
  'gaming',
  'reading',
  'unknown',
]);

const MAX_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours max
const MAX_FUTURE_DRIFT_MS = 60 * 60 * 1000;  // 1 hour max future clock drift

export interface ExportDataPayload {
  readonly version: string;
  readonly exportedAt: string;
  readonly dailyStats: StorageSchema['dailyStats'];
  readonly insights: StorageSchema['insights'];
  readonly patterns: StorageSchema['patterns'];
  readonly decisionLogs: StorageSchema['decisionLogs'];
  readonly adaptiveConfig: StorageSchema['adaptiveConfig'];
}

export class LocalDataPipeline {
  private seenEventIds = new Set<string>();

  /**
   * Validates that an incoming ActivityEvent satisfies all sanity constraints.
   */
  validateEvent(event: ActivityEvent, now = Date.now()): { isValid: boolean; reason?: string } {
    if (!event || typeof event !== 'object') {
      return { isValid: false, reason: 'Event is not an object' };
    }

    if (!event.id || typeof event.id !== 'string') {
      return { isValid: false, reason: 'Missing or invalid event id' };
    }

    if (typeof event.timestamp !== 'number' || event.timestamp <= 0) {
      return { isValid: false, reason: 'Invalid event timestamp' };
    }

    if (event.timestamp > now + MAX_FUTURE_DRIFT_MS) {
      return { isValid: false, reason: 'Event timestamp is impossibly in the future' };
    }

    if (!event.domain || typeof event.domain !== 'string') {
      return { isValid: false, reason: 'Missing or invalid domain' };
    }

    if (!VALID_ACTIVITY_TYPES.has(event.activityType)) {
      return { isValid: false, reason: `Unknown activity type: ${String(event.activityType)}` };
    }

    if (event.durationMs !== undefined) {
      if (typeof event.durationMs !== 'number' || event.durationMs < 0) {
        return { isValid: false, reason: 'Event duration cannot be negative' };
      }
      if (event.durationMs > MAX_DURATION_MS) {
        return { isValid: false, reason: 'Event duration exceeds 24-hour physical threshold' };
      }
    }

    return { isValid: true };
  }

  /**
   * Deduplicates events based on event ID.
   */
  isDuplicate(event: ActivityEvent): boolean {
    if (this.seenEventIds.has(event.id)) {
      return true;
    }
    this.seenEventIds.add(event.id);

    // Keep seen buffer size controlled
    if (this.seenEventIds.size > 2000) {
      const iter = this.seenEventIds.values();
      for (let i = 0; i < 500; i++) {
        const next = iter.next();
        if (next.done) break;
        this.seenEventIds.delete(next.value);
      }
    }

    return false;
  }

  /**
   * Generates a complete, privacy-safe JSON export of all locally stored analytics.
   */
  async exportData(storageClient: StorageClient): Promise<string> {
    const [dailyStats, insights, patterns, decisionLogs, adaptiveConfig] = await Promise.all([
      storageClient.get('dailyStats'),
      storageClient.getInsights(),
      storageClient.getPatterns(),
      storageClient.getDecisionLogs(),
      storageClient.getAdaptiveConfig(),
    ]);

    const payload: ExportDataPayload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      dailyStats,
      insights,
      patterns,
      decisionLogs,
      adaptiveConfig,
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Executes a complete local privacy reset, clearing all historical stats,
   * insights, behavioral patterns, and policy decision audit logs.
   */
  async executeFullReset(storageClient: StorageClient): Promise<void> {
    await Promise.all([
      storageClient.set('dailyStats', {}),
      storageClient.setInsights([]),
      storageClient.setPatterns([]),
      storageClient.set('decisionLogs', []),
    ]);
  }
}
