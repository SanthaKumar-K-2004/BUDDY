/**
 * @buddy/shared-types - intelligence.ts
 * Contracts for Phase 7 Local Intelligence, Behavioral Pattern Detection,
 * Trend Analysis, Personal Baselines, Explainable Insights, and Adaptive Control.
 */

import type { PlatformCategory } from './media.js';

export type InsightType =
  | 'usage'
  | 'trend'
  | 'session'
  | 'category'
  | 'limit'
  | 'focus'
  | 'shield'
  | 'goal'
  | 'streak';

export type InsightPriority = 'low' | 'medium' | 'high';

export interface InsightAction {
  readonly type: 'start_focus' | 'set_limit' | 'take_break' | 'review_site' | 'dismiss';
  readonly label: string;
  readonly payload?: Record<string, unknown>;
}

export interface Insight {
  readonly id: string;
  readonly type: InsightType;
  readonly priority: InsightPriority;
  readonly createdAt: number;
  readonly title: string;
  readonly message: string;
  readonly evidence: readonly string[]; // Observable facts only
  readonly confidence?: number; // 0.0 to 1.0
  readonly action?: InsightAction;
  readonly category?: PlatformCategory;
  readonly domain?: string;
  readonly isDismissed?: boolean;
}

export type PatternType =
  | 'rapid_reopen'          // Same site reopened within short window (e.g. 60s)
  | 'frequent_site_switch'  // Rapid jumping across multiple sites within short window
  | 'long_uninterrupted'    // Continuous browsing session exceeding threshold (e.g. 50m)
  | 'repeated_short_form'   // High frequency of vertical video sessions
  | 'late_session'          // Browsing in late night / bedtime hours
  | 'high_frequency';       // Frequent brief visits in a short timeframe

export interface BehavioralPattern {
  readonly id: string;
  readonly type: PatternType;
  readonly detectedAt: number;
  readonly description: string;
  readonly evidence: readonly string[];
  readonly occurrences: number;
  readonly domain?: string;
  readonly category?: PlatformCategory;
}

export interface BaselineStats {
  readonly averageActiveMs: number;
  readonly averageMediaMs: number;
  readonly averageShortFormMs: number;
  readonly averageFocusMs: number;
  readonly daysCounted: number;
  readonly hasSufficientData: boolean; // true if daysCounted >= 2
}

export interface UsageTrend {
  readonly period: 'today_vs_yesterday' | 'week_vs_last_week';
  readonly currentActiveMs: number;
  readonly previousActiveMs: number;
  readonly diffMs: number;
  readonly percentChange: number | null; // null if previous was 0
  readonly topCategoryChange?: {
    readonly category: PlatformCategory;
    readonly diffMs: number;
  };
}

export interface TimeOfDayDistribution {
  readonly morningMs: number;   // 05:00 - 12:00
  readonly afternoonMs: number; // 12:00 - 17:00
  readonly eveningMs: number;   // 17:00 - 22:00
  readonly nightMs: number;     // 22:00 - 05:00
}

export interface DayOfWeekDistribution {
  readonly [day: number]: number; // 0 (Sunday) to 6 (Saturday) -> activeMs
}

export interface AdaptivePolicyConfig {
  readonly isAdaptiveLimitsEnabled: boolean;
  readonly breakReminderEnabled: boolean;
  readonly continuousActivityThresholdMinutes: number; // default: 50
  readonly breakDurationMinutes: number; // default: 5
  readonly smartFocusSuggestionsEnabled: boolean;
  readonly excludedDomains: readonly string[];
  readonly quietHoursStart?: number; // e.g. 22
  readonly quietHoursEnd?: number;   // e.g. 7
}

export interface PolicyDecisionLog {
  readonly id: string;
  readonly timestamp: number;
  readonly trigger: string;
  readonly policy: string;
  readonly action: 'allow' | 'warn' | 'block' | 'suggest_break' | 'suggest_focus' | 'adjust_limit';
  readonly reason: string;
  readonly target?: string;
}

export interface SmartBreakState {
  readonly isInBreak: boolean;
  readonly breakStartTime: number | null;
  readonly breakDurationMinutes: number;
  readonly lastBreakPromptTime: number | null;
}
