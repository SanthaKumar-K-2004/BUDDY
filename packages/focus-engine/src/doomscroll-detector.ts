/**
 * @buddy/focus-engine - doomscroll-detector.ts
 * Real-time detection of observable compulsive consumption patterns.
 */

import type { DoomscrollState } from '@buddy/shared-types';

export interface DoomscrollConfig {
  maxSwitchesInWindow: number; // e.g. 10 switches
  windowMinutes: number; // e.g. 3 minutes
  maxScrollVelocity: number; // viewports per minute (e.g. 5)
  maxUninterruptedMinutes: number; // e.g. 15 minutes
}

export const DEFAULT_DOOMSCROLL_CONFIG: DoomscrollConfig = {
  maxSwitchesInWindow: 10,
  windowMinutes: 3,
  maxScrollVelocity: 5,
  maxUninterruptedMinutes: 15,
};

export class DoomscrollDetector {
  private config: DoomscrollConfig;
  private switchTimestamps: number[] = [];
  private totalViewportsScrolled = 0;
  private sessionStartTimestamp = Date.now();
  private lastActivityTimestamp = Date.now();

  constructor(config: Partial<DoomscrollConfig> = {}) {
    this.config = { ...DEFAULT_DOOMSCROLL_CONFIG, ...config };
  }

  public recordContentSwitch(): void {
    const now = Date.now();
    this.switchTimestamps.push(now);
    this.lastActivityTimestamp = now;
    this.cleanOldSwitches(now);
  }

  public recordScroll(viewports: number): void {
    this.totalViewportsScrolled += Math.max(0, viewports);
    this.lastActivityTimestamp = Date.now();
  }

  public reset(): void {
    this.switchTimestamps = [];
    this.totalViewportsScrolled = 0;
    this.sessionStartTimestamp = Date.now();
    this.lastActivityTimestamp = Date.now();
  }

  public getLastActivityTimestamp(): number {
    return this.lastActivityTimestamp;
  }

  public evaluate(): DoomscrollState {
    const now = Date.now();
    this.cleanOldSwitches(now);

    const uninterruptedMinutes = (now - this.sessionStartTimestamp) / (1000 * 60);
    const scrollVelocity = uninterruptedMinutes > 0
      ? this.totalViewportsScrolled / uninterruptedMinutes
      : 0;

    const switchCount = this.switchTimestamps.length;

    const isRapidSwitching = switchCount >= this.config.maxSwitchesInWindow;
    const isExcessiveVelocity =
      uninterruptedMinutes >= 5 && scrollVelocity >= this.config.maxScrollVelocity;
    const isSessionOvertime = uninterruptedMinutes >= this.config.maxUninterruptedMinutes;

    const isDoomscrolling = isRapidSwitching || isExcessiveVelocity || isSessionOvertime;

    return {
      isDoomscrolling,
      scrollVelocity: Math.round(scrollVelocity * 10) / 10,
      switchCount,
      uninterruptedMinutes: Math.round(uninterruptedMinutes * 10) / 10,
      lastEvaluatedAt: Math.max(now, this.lastActivityTimestamp),
    };
  }

  private cleanOldSwitches(now: number): void {
    const cutoff = now - this.config.windowMinutes * 60 * 1000;
    this.switchTimestamps = this.switchTimestamps.filter((t) => t >= cutoff);
  }
}
