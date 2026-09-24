/**
 * @buddy/shared-types - focus.ts
 * Types for focus policies, watch limits, doomscroll detection, and streaks.
 */

import type { ContentType, PlatformCategory, PlatformId } from './media.js';

export type InterventionType =
  | 'gentle_nudge'
  | 'strong_warning'
  | 'soft_pause'
  | 'hard_block'
  | 'grayscale';

export interface FocusPolicy {
  readonly hideShortForm?: boolean;
  readonly hideRecommendations?: boolean;
  readonly disableAutoplay?: boolean;
  readonly hideSidebars?: boolean;
  readonly hideComments?: boolean;
  readonly reduceNotifications?: boolean;
  readonly grayscaleMedia?: boolean;
  readonly isShieldPaused?: boolean;
}

export interface WatchLimit {
  readonly id: string;
  readonly targetType: 'site' | 'platform' | 'category' | 'content_type';
  readonly targetValue: string | PlatformId | PlatformCategory | ContentType;
  readonly maxMinutesPerDay: number;
  readonly currentMinutesUsed: number;
  readonly warningThresholdPercent: number; // e.g. 80
  readonly intervention: InterventionType;
  readonly isEnabled: boolean;
}

export interface DoomscrollState {
  readonly isDoomscrolling: boolean;
  readonly scrollVelocity: number; // viewports scrolled per minute
  readonly switchCount: number; // content items switched in window
  readonly uninterruptedMinutes: number;
  readonly lastEvaluatedAt: number;
}

export interface DailyGoalConfig {
  readonly targetFocusMinutes: number; // e.g. 60
  readonly maxMediaMinutes?: number; // e.g. 120
  readonly isEnabled: boolean;
}

export interface LimitRule {
  readonly id: string;
  readonly type: 'platform' | 'category' | 'site';
  readonly target: string;
  readonly maxDailyMinutes: number;
  readonly warningThresholdMinutes?: number;
  readonly action?: string;
  readonly enabled?: boolean;
}

export interface StreakState {
  readonly currentStreakDays: number;
  readonly bestStreakDays: number;
  readonly lastCompletedDate: string; // YYYY-MM-DD
  readonly freezeTokensAvailable: number;
  readonly history: Record<string, boolean>; // date -> goalMet
  readonly currentStreak?: number;
  readonly longestStreak?: number;
  readonly freezesRemaining?: number;
  readonly lastEvaluatedDate?: string;
}

