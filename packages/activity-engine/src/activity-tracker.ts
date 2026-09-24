/**
 * @buddy/activity-engine - activity-tracker.ts
 * Manages active, inactive, visible, hidden, and idle user presence.
 */

import type { PlatformCategory } from '@buddy/shared-types';
import { classifyDomain } from './classifier.js';

export type UserPresenceState = 'ACTIVE' | 'INACTIVE' | 'VISIBLE' | 'HIDDEN' | 'IDLE';

export interface ActivitySnapshot {
  domain: string;
  category: PlatformCategory;
  presence: UserPresenceState;
  timestamp: number;
}

export class ActivityTracker {
  private currentPresence: UserPresenceState = 'ACTIVE';
  private currentDomain = '';
  private currentCategory: PlatformCategory = 'other';
  private lastStateChangeTime: number = Date.now();
  private accumulatedCategorySeconds: Record<PlatformCategory, number> = {
    social: 0,
    video: 0,
    music: 0,
    news: 0,
    gaming: 0,
    shopping: 0,
    education: 0,
    productivity: 0,
    entertainment: 0,
    communication: 0,
    other: 0,
  };

  private userOverrides: Record<string, PlatformCategory> = {};

  constructor(initialDomain = '', userOverrides: Record<string, PlatformCategory> = {}) {
    this.userOverrides = userOverrides;
    if (initialDomain) {
      this.setDomain(initialDomain);
    }
  }

  public setDomain(domain: string): void {
    this.flush();
    this.currentDomain = domain;
    this.currentCategory = classifyDomain(domain, this.userOverrides);
  }

  public setPresence(presence: UserPresenceState): void {
    this.flush();
    this.currentPresence = presence;
  }

  public getPresence(): UserPresenceState {
    return this.currentPresence;
  }

  public getCurrentCategory(): PlatformCategory {
    return this.currentCategory;
  }

  public getCategorySeconds(category: PlatformCategory): number {
    this.flush();
    return Math.floor(this.accumulatedCategorySeconds[category]);
  }

  public getAllCategorySeconds(): Readonly<Record<PlatformCategory, number>> {
    this.flush();
    return { ...this.accumulatedCategorySeconds };
  }

  private flush(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastStateChangeTime) / 1000;
    this.lastStateChangeTime = now;

    // Only accumulate if tab is active or visible and not idle
    if (
      this.currentDomain &&
      (this.currentPresence === 'ACTIVE' || this.currentPresence === 'VISIBLE')
    ) {
      this.accumulatedCategorySeconds[this.currentCategory] += elapsedSeconds;
    }
  }
}
