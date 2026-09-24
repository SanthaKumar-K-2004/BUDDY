/**
 * @buddy/intelligence-engine - notification-manager.ts
 * Manages notification cooldowns, deduplication, and quiet hours.
 * Ensures Buddy never spams the user or engages in aggressive nagging.
 */

export interface NotificationRequest {
  readonly id: string;
  readonly category: string;
  readonly title: string;
  readonly message: string;
  readonly icon?: string;
  readonly timestamp?: number;
}

export interface NotificationManagerConfig {
  readonly defaultCooldownMinutes?: number;
  readonly quietHoursStart?: number; // e.g. 22
  readonly quietHoursEnd?: number;   // e.g. 7
  readonly isEnabled?: boolean;
}

export class NotificationManager {
  private lastNotificationTimeByCategory: Map<string, number> = new Map();
  private sentMessageHashes: Map<string, number> = new Map();
  private defaultCooldownMs: number;
  private quietHoursStart: number;
  private quietHoursEnd: number;
  private isEnabled: boolean;

  constructor(config?: NotificationManagerConfig) {
    this.defaultCooldownMs = (config?.defaultCooldownMinutes ?? 30) * 60 * 1000;
    this.quietHoursStart = config?.quietHoursStart ?? 22;
    this.quietHoursEnd = config?.quietHoursEnd ?? 7;
    this.isEnabled = config?.isEnabled ?? true;
  }

  /**
   * Evaluates if a notification request can be delivered.
   */
  canNotify(request: NotificationRequest, now = Date.now()): boolean {
    if (!this.isEnabled) return false;

    // Check Quiet Hours
    const date = new Date(now);
    const hour = date.getHours();
    const isQuietHours =
      this.quietHoursStart > this.quietHoursEnd
        ? hour >= this.quietHoursStart || hour < this.quietHoursEnd
        : hour >= this.quietHoursStart && hour < this.quietHoursEnd;

    if (isQuietHours) return false;

    // Check Category Cooldown
    const lastCategoryTime = this.lastNotificationTimeByCategory.get(request.category) || 0;
    if (now - lastCategoryTime < this.defaultCooldownMs) {
      return false;
    }

    // Check Message Deduplication Hash
    const messageHash = `${request.category}_${request.title}_${request.message}`;
    const lastMessageTime = this.sentMessageHashes.get(messageHash) || 0;
    if (now - lastMessageTime < this.defaultCooldownMs) {
      return false;
    }

    return true;
  }

  /**
   * Records that a notification was successfully dispatched.
   */
  recordDispatched(request: NotificationRequest, now = Date.now()): void {
    this.lastNotificationTimeByCategory.set(request.category, now);
    const messageHash = `${request.category}_${request.title}_${request.message}`;
    this.sentMessageHashes.set(messageHash, now);
  }

  /**
   * Dispatches notification if allowed, through chrome.notifications or console fallback.
   */
  dispatch(request: NotificationRequest, now = Date.now()): boolean {
    if (!this.canNotify(request, now)) {
      return false;
    }

    this.recordDispatched(request, now);

    if (typeof chrome !== 'undefined' && chrome.notifications && chrome.notifications.create) {
      try {
        chrome.notifications.create(request.id, {
          type: 'basic',
          iconUrl: request.icon || 'icons/icon-128.png',
          title: request.title,
          message: request.message,
          priority: 0,
        });
      } catch {
        // Safe fallback
      }
    }

    return true;
  }
}
