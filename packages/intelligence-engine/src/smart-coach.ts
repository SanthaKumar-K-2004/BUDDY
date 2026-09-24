/**
 * @buddy/intelligence-engine - smart-coach.ts
 * Manages continuous activity monitoring, smart break notifications,
 * scheduled focus coaching, and break state transitions.
 */

import type { AdaptivePolicyConfig, SmartBreakState } from '@buddy/shared-types';

export interface SmartCoachListener {
  onBreakSuggested(continuousMinutes: number, suggestedBreakMinutes: number): void;
  onFocusSuggested(reason: string): void;
}

export class SmartCoach {
  private continuousActiveMs = 0;
  private lastActiveTimestamp = 0;
  private breakState: SmartBreakState;
  private listener?: SmartCoachListener;
  private promptCooldownMs: number;

  constructor(
    private config: AdaptivePolicyConfig,
    initialBreakState?: SmartBreakState,
    promptCooldownMinutes = 30
  ) {
    this.breakState = initialBreakState || {
      isInBreak: false,
      breakStartTime: null,
      breakDurationMinutes: config.breakDurationMinutes,
      lastBreakPromptTime: null,
    };
    this.promptCooldownMs = promptCooldownMinutes * 60 * 1000;
  }

  setListener(listener: SmartCoachListener): void {
    this.listener = listener;
  }

  updateConfig(config: AdaptivePolicyConfig): void {
    this.config = config;
  }

  getBreakState(): SmartBreakState {
    return { ...this.breakState };
  }

  getContinuousActiveMinutes(): number {
    return Math.floor(this.continuousActiveMs / 60000);
  }

  /**
   * Called on active browsing tick (e.g. every second or deltaMs).
   */
  tick(deltaMs: number, now = Date.now()): void {
    if (this.breakState.isInBreak) {
      // Check if break duration has elapsed
      if (
        this.breakState.breakStartTime &&
        now - this.breakState.breakStartTime >= this.breakState.breakDurationMinutes * 60 * 1000
      ) {
        this.endBreak(now);
      }
      return;
    }

    // Check for idle gap since last active tick (e.g. gap >= 5 minutes counts as a natural break)
    if (this.lastActiveTimestamp > 0 && now - this.lastActiveTimestamp >= 5 * 60 * 1000) {
      this.resetContinuousCounter();
    }

    this.lastActiveTimestamp = now;
    this.continuousActiveMs += deltaMs;

    const continuousMinutes = Math.floor(this.continuousActiveMs / 60000);
    const threshold = this.config.continuousActivityThresholdMinutes;

    // Check if break reminder should fire
    if (this.config.breakReminderEnabled && continuousMinutes >= threshold) {
      const timeSinceLastPrompt = now - (this.breakState.lastBreakPromptTime || 0);
      if (timeSinceLastPrompt >= this.promptCooldownMs) {
        this.breakState = {
          ...this.breakState,
          lastBreakPromptTime: now,
        };
        this.listener?.onBreakSuggested(continuousMinutes, this.config.breakDurationMinutes);
      }
    }
  }

  /**
   * Starts a formal rest break.
   */
  startBreak(durationMinutes = this.config.breakDurationMinutes, now = Date.now()): void {
    this.breakState = {
      isInBreak: true,
      breakStartTime: now,
      breakDurationMinutes: durationMinutes,
      lastBreakPromptTime: this.breakState.lastBreakPromptTime,
    };
    this.resetContinuousCounter();
  }

  /**
   * Ends the current rest break.
   */
  endBreak(now = Date.now()): void {
    this.breakState = {
      isInBreak: false,
      breakStartTime: null,
      breakDurationMinutes: this.config.breakDurationMinutes,
      lastBreakPromptTime: this.breakState.lastBreakPromptTime,
    };
    this.lastActiveTimestamp = now;
    this.resetContinuousCounter();
  }

  /**
   * Resets continuous activity counter.
   */
  resetContinuousCounter(): void {
    this.continuousActiveMs = 0;
  }
}
