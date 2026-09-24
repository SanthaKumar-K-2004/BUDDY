/**
 * @buddy/shared-types - storage.ts
 * Type definitions for typed local storage operations.
 */

import type { FocusPolicy, WatchLimit, DailyGoalConfig, StreakState, LimitRule } from './focus.js';
import type { MoodState, PetConfig } from './mood.js';
import type { PlatformCategory } from './media.js';
import type { FamilyProfile, FamilyState, AccessRequest } from './family.js';
import type {
  Insight,
  BehavioralPattern,
  AdaptivePolicyConfig,
  PolicyDecisionLog,
  SmartBreakState,
} from './intelligence.js';

export interface UserSettings {
  readonly language: 'en' | 'ta' | 'ar';
  readonly theme: 'system' | 'dark' | 'light';
  readonly isShieldEnabled: boolean;
  readonly isFocusEnabled: boolean;
  readonly isFamilyEnabled: boolean;
  readonly whitelistDomains: readonly string[];
  readonly dailyGoal?: DailyGoalConfig;
}

export interface PlatformDailyStats {
  readonly platform: string;
  readonly activeSeconds: number;
  readonly mediaSeconds: number;
  readonly shortFormSeconds: number;
  readonly sessionsCount: number;
  readonly limitsReachedCount: number;
}

export interface PlatformSummary {
  readonly platform: string;
  readonly activeMs: number;
  readonly mediaMs: number;
  readonly shortFormMs: number;
  readonly sessions: number;
  readonly limitsReached: number;
}

export interface DailySummary {
  readonly date: string;
  readonly totalActiveMs: number;
  readonly mediaMs: number;
  readonly focusMs: number;
  readonly socialMs: number;
  readonly videoMs: number;
  readonly musicMs: number;
  readonly adsBlocked: number;
  readonly trackersBlocked: number;
  readonly sessions: number;
  readonly limitsReached: number;
  readonly doomscrollAlerts: number;
  readonly platformStats: Record<string, PlatformSummary>;
}

export interface WeeklySummary {
  readonly startDate: string;
  readonly endDate: string;
  readonly totalActiveMs: number;
  readonly totalMediaMs: number;
  readonly totalFocusMs: number;
  readonly totalAdsBlocked: number;
  readonly totalTrackersBlocked: number;
  readonly totalSessions: number;
  readonly dailySummaries: DailySummary[];
  readonly topPlatforms: PlatformSummary[];
}

export interface DailyStats {
  readonly date: string; // YYYY-MM-DD
  readonly totalActiveSeconds: number;
  readonly totalMediaWatchSeconds: number;
  readonly totalFocusSeconds?: number;
  readonly totalAdsBlocked: number;
  readonly totalTrackersBlocked: number;
  readonly doomscrollAlertsCount: number;
  readonly sessionsCount?: number;
  readonly limitsReachedCount?: number;
  readonly categorySeconds: Readonly<Record<PlatformCategory, number>>;
  readonly platformStats?: Readonly<Record<string, PlatformDailyStats>>;
}

export const CURRENT_SCHEMA_VERSION = 1;

export interface StorageSchema {
  schemaVersion?: number;
  settings: UserSettings;
  sitePolicies: Record<string, FocusPolicy>;
  watchLimits: WatchLimit[];
  dailyStats: Record<string, DailyStats>;
  petConfig: PetConfig;
  moodState: MoodState;
  streakState?: StreakState;
  familyProfile?: FamilyProfile | null;
  familyState?: FamilyState;
  accessRequests?: AccessRequest[];
  limits?: LimitRule[];
  focusState?: {
    isActive: boolean;
    sessionStartTime: number | null;
    targetDurationMinutes?: number;
    mode?: string;
  };
  shieldConfig?: {
    mode: string;
  };
  insights?: Insight[];
  patterns?: BehavioralPattern[];
  adaptiveConfig?: AdaptivePolicyConfig;
  decisionLogs?: PolicyDecisionLog[];
  smartBreakState?: SmartBreakState;
}

export type StorageKey = keyof StorageSchema;
