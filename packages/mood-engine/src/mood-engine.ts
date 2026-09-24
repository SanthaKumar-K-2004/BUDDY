/**
 * @buddy/mood-engine - mood-engine.ts
 * Deterministic mathematical behavioral mood engine for the Buddy Pet.
 * Real event stimulus processing, anti-gaming safeguards, zero randomness,
 * and supportive mindfulness dialogue.
 */

import type {
  MoodEventType,
  MoodState,
  MoodStimulus,
  PetVisualState,
} from '@buddy/shared-types';

export const MAX_DAILY_RECOVERY = 20.0;
export const BASELINE_MOOD_SCORE = 50.0;
export const QUIET_HOURS_START = 22; // 10 PM
export const QUIET_HOURS_END = 7; // 7 AM
export const DEDUP_WINDOW_MS = 60_000; // 1 minute

export const MOOD_EVENT_WEIGHTS: Record<MoodEventType, number> = {
  FOCUS_COMPLETED: 5.0,
  GOAL_COMPLETED: 10.0,
  HEALTHY_BREAK: 3.0,
  DOOMSCROLL_EVENT: -8.0,
  LIMIT_OVERTIME: -10.0,
  STREAK_BROKEN: -15.0,
  HEARTBEAT: 0.0,
};

export class MoodEngine {
  private state: MoodState;
  private stimulusHistory: MoodStimulus[] = [];
  private stimulusCounter = 0;
  private recentFocusTime = 0;
  private recentDoomscrollTime = 0;
  private recentBreakTime = 0;

  constructor(initialState?: Partial<MoodState>) {
    const today = new Date().toISOString().split('T')[0] ?? '';
    this.state = {
      score: BASELINE_MOOD_SCORE,
      visualState: 'neutral',
      lastUpdatedAt: Date.now(),
      dailyRecoveryAccumulated: 0,
      streakDays: 0,
      streakFreezesAvailable: 1,
      lastStreakEvaluatedDate: today,
      ...initialState,
    };
    this.refreshVisualState();
  }

  public getState(): Readonly<MoodState> {
    return { ...this.state };
  }

  public reset(): void {
    const today = new Date().toISOString().split('T')[0] ?? '';
    this.state = {
      score: BASELINE_MOOD_SCORE,
      visualState: 'neutral',
      lastUpdatedAt: Date.now(),
      dailyRecoveryAccumulated: 0,
      streakDays: 0,
      streakFreezesAvailable: 1,
      lastStreakEvaluatedDate: today,
    };
    this.stimulusHistory = [];
    this.recentFocusTime = 0;
    this.recentDoomscrollTime = 0;
    this.recentBreakTime = 0;
    this.refreshVisualState();
  }

  public getScore(): number {
    return this.state.score;
  }

  public getVisualState(): PetVisualState {
    return this.state.visualState;
  }

  public getHistory(): ReadonlyArray<MoodStimulus> {
    return [...this.stimulusHistory];
  }

  /**
   * Applies a typed, deterministic behavioral event with anti-gaming checks.
   */
  public applyEvent(
    eventType: MoodEventType,
    description: string,
    sourceApp: 'buddy-shield' | 'buddy-focus' | 'buddy-family' | 'buddy-dashboard',
    now: number = Date.now()
  ): MoodState {
    this.rolloverDailyLimitsIfNeeded(now);

    // Track behavioral timestamps for pet state mapping
    if (eventType === 'FOCUS_COMPLETED') this.recentFocusTime = now;
    if (eventType === 'DOOMSCROLL_EVENT') this.recentDoomscrollTime = now;
    if (eventType === 'HEALTHY_BREAK') this.recentBreakTime = now;

    // Anti-Gaming: Deduplicate rapid duplicate positive stimuli within 60 seconds
    const rawDelta = MOOD_EVENT_WEIGHTS[eventType] || 0;
    if (rawDelta > 0) {
      const recentDuplicate = this.stimulusHistory.some(
        (s) =>
          s.sourceApp === sourceApp &&
          s.description === description &&
          now - s.timestamp < DEDUP_WINDOW_MS
      );
      if (recentDuplicate) {
        return this.getState(); // Skip duplicate stimulus
      }
    }

    return this.applyStimulusInternal(rawDelta, description, sourceApp, eventType, now);
  }

  /**
   * Backward-compatible direct stimulus with daily recovery cap, anti-gaming dedup, and zero randomness.
   */
  public applyStimulus(
    delta: number,
    description: string,
    sourceApp: 'buddy-shield' | 'buddy-focus' | 'buddy-family' | 'buddy-dashboard',
    eventTypeOrNow?: MoodEventType | number,
    nowTimestamp = Date.now()
  ): MoodState {
    let eventType: MoodEventType | undefined;
    let now = nowTimestamp;

    if (typeof eventTypeOrNow === 'string') {
      eventType = eventTypeOrNow;
    } else if (typeof eventTypeOrNow === 'number') {
      now = eventTypeOrNow;
    }

    this.rolloverDailyLimitsIfNeeded(now);
    return this.applyStimulusInternal(delta, description, sourceApp, eventType, now);
  }

  public recordFocus(durationMs: number, now = Date.now()): void {
    if (durationMs > 0) {
      this.recentFocusTime = now;
      this.refreshVisualState(new Date(now).getHours(), now);
    }
  }

  public recordActiveUsage(durationMs: number, now = Date.now()): void {
    this.recentDoomscrollTime = 0;
    if (durationMs >= 90 * 60 * 1000) {
      this.state = {
        ...this.state,
        visualState: 'tired',
      };
    } else {
      this.refreshVisualState(new Date(now).getHours(), now);
    }
  }

  public recordBreak(durationMs: number, now = Date.now()): void {
    if (durationMs > 0) {
      this.recentBreakTime = now;
      this.state = {
        ...this.state,
        visualState: 'recovering',
      };
    }
  }

  public getDialogue(petName = 'Buddy'): string {
    return this.getPetDialogue(petName);
  }

  private applyStimulusInternal(
    delta: number,
    description: string,
    sourceApp: 'buddy-shield' | 'buddy-focus' | 'buddy-family' | 'buddy-dashboard',
    eventType?: MoodEventType,
    now = Date.now()
  ): MoodState {
    // Anti-gaming: Deduplicate identical stimuli within DEDUP_WINDOW_MS (60s)
    const isDuplicate = this.stimulusHistory.some(
      (s) =>
        s.description === description &&
        s.sourceApp === sourceApp &&
        now - s.timestamp < DEDUP_WINDOW_MS
    );
    if (isDuplicate) {
      return this.getState();
    }

    if (eventType === 'DOOMSCROLL_EVENT') {
      this.recentDoomscrollTime = now;
    }

    let effectiveDelta = delta;

    // Apply daily positive recovery cap
    if (delta > 0) {
      const allowedRecovery = Math.max(0, MAX_DAILY_RECOVERY - this.state.dailyRecoveryAccumulated);
      effectiveDelta = Math.min(delta, allowedRecovery);
      this.state = {
        ...this.state,
        dailyRecoveryAccumulated: this.state.dailyRecoveryAccumulated + effectiveDelta,
      };
    }

    const newScore = Math.max(0, Math.min(100, this.state.score + effectiveDelta));

    this.state = {
      ...this.state,
      score: Math.round(newScore * 10) / 10,
      lastUpdatedAt: now,
    };

    // Monotonic, deterministic sequence ID (zero Math.random())
    this.stimulusCounter += 1;
    this.stimulusHistory.push({
      id: `stim-${now}-${this.stimulusCounter}`,
      delta: effectiveDelta,
      description,
      sourceApp,
      timestamp: now,
      eventType,
    });

    this.refreshVisualState(new Date(now).getHours(), now);
    return this.getState();
  }

  public applyHourlyDecay(currentHour = new Date().getHours(), now = Date.now()): MoodState {
    const isQuiet = this.isQuietHour(currentHour);

    // Freeze decay during quiet nighttime hours (10 PM to 7 AM)
    if (!isQuiet) {
      const newScore = Math.max(0, Math.min(100, this.state.score - 1.0));
      this.state = {
        ...this.state,
        score: Math.round(newScore * 10) / 10,
        lastUpdatedAt: now,
      };
    }

    this.refreshVisualState(currentHour, now);
    return this.getState();
  }

  public isQuietHour(hour = new Date().getHours()): boolean {
    return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
  }

  /**
   * Deterministically computes pet state based on score, quiet hours, and recent activity.
   */
  public computeVisualState(
    score: number,
    hour = new Date().getHours(),
    now = Date.now()
  ): PetVisualState {
    if (this.isQuietHour(hour)) {
      return 'sleeping';
    }

    // 1. Focused: Recent focus completion within last 30 minutes
    if (now - this.recentFocusTime < 30 * 60_000) {
      return 'focused';
    }

    // 2. Distracted: Recent doomscroll alert within last 15 minutes
    if (now - this.recentDoomscrollTime < 15 * 60_000) {
      return 'distracted';
    }

    // 3. Recovering: Healthy break within last 20 minutes when score was low
    if (now - this.recentBreakTime < 20 * 60_000 && score < 70) {
      return 'recovering';
    }

    // 4. Score-driven states
    if (score > 80) return 'ecstatic';
    if (score > 60) return 'happy';
    if (score > 40) return 'neutral';
    if (score > 20) return 'worried';
    return 'sad';
  }

  /**
   * Generates supportive, non-shaming dialogue based on current state.
   */
  public getPetDialogue(petName = 'Buddy'): string {
    const state = this.state.visualState;
    switch (state) {
      case 'focused':
        return `Awesome focus session! ${petName} is focused, energized, and ready for your next milestone.`;
      case 'happy':
      case 'ecstatic':
        return `${petName} is feeling great! Your digital habits are on point today.`;
      case 'recovering':
        return `Taking a refreshing break is a strength. ${petName} is recovering nicely with you.`;
      case 'distracted':
        return `Notice: fast scrolling detected. Let's take a deep breath and reset together.`;
      case 'tired':
        return `You've been online for a while. ${petName} suggests standing up, taking a break, and resting your eyes.`;
      case 'sleeping':
        return `Shh... ${petName} is resting. Quiet hours are active—have a restful night!`;
      default:
        return `${petName} is here by your side, supporting your daily focus.`;
    }
  }

  private refreshVisualState(hour?: number, now = Date.now()): void {
    const currentHour = hour !== undefined ? hour : new Date().getHours();
    const visualState = this.computeVisualState(this.state.score, currentHour, now);
    this.state = {
      ...this.state,
      visualState,
    };
  }

  private rolloverDailyLimitsIfNeeded(now: number): void {
    const today = new Date(now).toISOString().split('T')[0] ?? '';
    if (this.state.lastStreakEvaluatedDate !== today) {
      this.state = {
        ...this.state,
        dailyRecoveryAccumulated: 0,
        lastStreakEvaluatedDate: today,
      };
    }
  }
}
