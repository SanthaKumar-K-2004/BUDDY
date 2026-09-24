/**
 * @buddy/shared-types - mood.ts
 * Types for behavioral pet companion and deterministic mood engine.
 */

export type PetState =
  | 'focused'
  | 'happy'
  | 'tired'
  | 'distracted'
  | 'recovering'
  | 'sleeping';

export type PetVisualState =
  | PetState
  | 'neutral'
  | 'ecstatic'
  | 'worried'
  | 'sad';

export type MoodEventType =
  | 'FOCUS_COMPLETED'
  | 'GOAL_COMPLETED'
  | 'HEALTHY_BREAK'
  | 'DOOMSCROLL_EVENT'
  | 'LIMIT_OVERTIME'
  | 'STREAK_BROKEN'
  | 'HEARTBEAT';

export interface PetConfig {
  readonly name: string;
  readonly activeSkin: string;
  readonly unlockedCosmetics: readonly string[];
  readonly quietHoursStart: number; // 22 (10 PM)
  readonly quietHoursEnd: number; // 7 (7 AM)
}

export interface MoodState {
  readonly score: number; // 0.0 to 100.0
  readonly visualState: PetVisualState;
  readonly lastUpdatedAt: number;
  readonly dailyRecoveryAccumulated: number; // Max 20.0
  readonly streakDays: number;
  readonly streakFreezesAvailable: number;
  readonly lastStreakEvaluatedDate: string; // YYYY-MM-DD
}

export interface MoodStimulus {
  readonly id: string;
  readonly delta: number;
  readonly description: string;
  readonly sourceApp: 'buddy-shield' | 'buddy-focus' | 'buddy-family' | 'buddy-dashboard';
  readonly timestamp: number;
  readonly eventType?: MoodEventType;
}

export interface MoodEvent {
  readonly id: string;
  readonly type: MoodEventType;
  readonly delta: number;
  readonly description: string;
  readonly sourceApp: 'buddy-shield' | 'buddy-focus' | 'buddy-family' | 'buddy-dashboard';
  readonly timestamp: number;
}
