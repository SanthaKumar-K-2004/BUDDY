/**
 * @buddy/activity-engine - universal-activity-engine.ts
 * Real-world engine managing cross-site web intelligence, active time tracking,
 * session lifecycles, URL sanitization, and crash-resilient event batching.
 */

import type {
  ActivityEvent,
  ActivityState,
  ActivityType,
  PlatformCategory,
  PlatformId,
} from '@buddy/shared-types';
import {
  AdapterRegistry,
  defaultAdapterRegistry,
  BaseSiteAdapter,
  type SiteAdapter,
} from '@buddy/site-adapters';
import { classifyDomain, normalizeDomain } from './classifier.js';

export interface ActivityEngineOptions {
  registry?: AdapterRegistry;
  inactivityThresholdSeconds?: number;
  maxSessionHours?: number;
  onEvent?: (event: ActivityEvent) => void | Promise<void>;
}

export interface ActiveSessionState {
  readonly sessionId: string;
  readonly url: URL;
  readonly cleanUrl: string;
  readonly domain: string;
  readonly platform: PlatformId;
  readonly category: PlatformCategory;
  activityType: ActivityType;
  readonly startTime: number;
  lastActiveTime: number;
  totalActiveDurationMs: number;
  totalMediaProgressMs: number;
  state: ActivityState;
  isShortForm: boolean;
}

export class UniversalActivityEngine {
  private registry: AdapterRegistry;
  private currentAdapter: SiteAdapter | null = null;
  private currentSession: ActiveSessionState | null = null;
  private inactivityThresholdSeconds: number;
  private maxSessionHours: number;
  private onEventCallback?: (event: ActivityEvent) => void | Promise<void>;
  private eventBuffer: ActivityEvent[] = [];
  private lastTickTime: number = Date.now();

  constructor(options: ActivityEngineOptions = {}) {
    this.registry = options.registry ?? defaultAdapterRegistry;
    this.inactivityThresholdSeconds = options.inactivityThresholdSeconds ?? 30;
    this.maxSessionHours = options.maxSessionHours ?? 8;
    this.onEventCallback = options.onEvent;
  }

  public getCurrentSession(): Readonly<ActiveSessionState> | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  public getActiveAdapter(): SiteAdapter | null {
    return this.currentAdapter;
  }

  public getMaxSessionHours(): number {
    return this.maxSessionHours;
  }

  /**
   * Starts or transitions an activity session for a real web URL.
   * Strips sensitive query parameters, binds adapter, and emits 'started' event.
   */
  public startSession(rawUrl: URL, timestamp: number = Date.now()): ActivityEvent {
    if (this.currentSession) {
      this.endSession(timestamp);
    }

    const sanitizedUrl = BaseSiteAdapter.sanitizeUrl(rawUrl);
    const domain = normalizeDomain(sanitizedUrl.hostname);
    const adapter = this.registry.resolve(sanitizedUrl);

    adapter.initialize({ url: sanitizedUrl });
    this.currentAdapter = adapter;

    const detection = adapter.detectActivity();
    const fallbackCategory = classifyDomain(domain);
    const category = detection?.category ?? adapter.category ?? fallbackCategory;
    const activityType = detection?.activityType ?? 'page';
    const isShortForm = detection?.isShortForm ?? (activityType === 'short' || activityType === 'reel');

    const sessionId = `${adapter.id}-${timestamp}-${Math.random().toString(36).substring(2, 7)}`;

    this.currentSession = {
      sessionId,
      url: sanitizedUrl,
      cleanUrl: sanitizedUrl.origin + sanitizedUrl.pathname,
      domain,
      platform: adapter.id,
      category,
      activityType,
      startTime: timestamp,
      lastActiveTime: timestamp,
      totalActiveDurationMs: 0,
      totalMediaProgressMs: 0,
      state: 'started',
      isShortForm,
    };

    this.lastTickTime = timestamp;

    const event: ActivityEvent = {
      id: `evt-${sessionId}-start`,
      timestamp,
      site: domain,
      domain,
      platform: adapter.id,
      activityType,
      category,
      state: 'started',
      isShortForm,
      metadata: {
        cleanUrl: this.currentSession.cleanUrl,
      },
    };

    this.emitEvent(event);
    return event;
  }

  /**
   * Periodic tick inspecting real browser and adapter state.
   * Accrues active duration, detects state transitions, and checks idle timeout.
   */
  public tick(
    timestamp: number = Date.now(),
    isTabVisible: boolean = true,
    isUserActive: boolean = true
  ): ActivityEvent | null {
    if (!this.currentSession || !this.currentAdapter) return null;

    const elapsedMs = Math.max(0, timestamp - this.lastTickTime);
    this.lastTickTime = timestamp;

    // Detect dynamically updated activity (e.g. video played, navigated to reels)
    const detection = this.currentAdapter.detectActivity();
    if (detection) {
      this.currentSession.activityType = detection.activityType;
      this.currentSession.isShortForm = Boolean(detection.isShortForm);
    }

    const mediaState = this.currentAdapter.getMediaState();
    const isMediaPlaying = mediaState.isPlaying && !mediaState.isPaused;

    // Inactivity evaluation
    const idleSeconds = (timestamp - this.currentSession.lastActiveTime) / 1000;
    const isIdle = idleSeconds >= this.inactivityThresholdSeconds && !isMediaPlaying;

    if (isIdle || !isTabVisible) {
      if (this.currentSession.state === 'active') {
        this.currentSession.state = 'paused';
        const pauseEvent: ActivityEvent = {
          id: `evt-${this.currentSession.sessionId}-pause-${timestamp}`,
          timestamp,
          site: this.currentSession.domain,
          domain: this.currentSession.domain,
          platform: this.currentSession.platform,
          activityType: this.currentSession.activityType,
          category: this.currentSession.category,
          state: 'paused',
          durationMs: this.currentSession.totalActiveDurationMs,
          isShortForm: this.currentSession.isShortForm,
        };
        this.emitEvent(pauseEvent);
        return pauseEvent;
      }
      return null;
    }

    // Active period
    if (isUserActive || isMediaPlaying) {
      this.currentSession.lastActiveTime = timestamp;
      this.currentSession.state = 'active';
      this.currentSession.totalActiveDurationMs += elapsedMs;

      const progressMultiplier = mediaState.playbackRate > 0 ? mediaState.playbackRate : 1.0;
      this.currentSession.totalMediaProgressMs += isMediaPlaying ? elapsedMs * progressMultiplier : 0;

      // Cap session if maximum continuous session hours reached to prevent runaway sessions
      const maxSessionMs = this.maxSessionHours * 3600 * 1000;
      if (this.currentSession.totalActiveDurationMs >= maxSessionMs) {
        return this.endSession(timestamp);
      }
    }

    const event: ActivityEvent = {
      id: `evt-${this.currentSession.sessionId}-tick-${timestamp}`,
      timestamp,
      site: this.currentSession.domain,
      domain: this.currentSession.domain,
      platform: this.currentSession.platform,
      activityType: this.currentSession.activityType,
      category: this.currentSession.category,
      state: 'active',
      durationMs: this.currentSession.totalActiveDurationMs,
      mediaProgressMs: Math.floor(this.currentSession.totalMediaProgressMs),
      playbackRate: mediaState.playbackRate,
      isShortForm: this.currentSession.isShortForm,
    };

    this.emitEvent(event);
    return event;
  }

  /**
   * Pauses active activity tracking (e.g. user switched windows or paused media).
   */
  public pauseSession(timestamp: number = Date.now()): ActivityEvent | null {
    if (!this.currentSession || this.currentSession.state === 'paused') return null;

    this.currentSession.state = 'paused';
    const event: ActivityEvent = {
      id: `evt-${this.currentSession.sessionId}-pause-${timestamp}`,
      timestamp,
      site: this.currentSession.domain,
      domain: this.currentSession.domain,
      platform: this.currentSession.platform,
      activityType: this.currentSession.activityType,
      category: this.currentSession.category,
      state: 'paused',
      durationMs: this.currentSession.totalActiveDurationMs,
      isShortForm: this.currentSession.isShortForm,
    };
    this.emitEvent(event);
    return event;
  }

  /**
   * Resumes active activity tracking.
   */
  public resumeSession(timestamp: number = Date.now()): ActivityEvent | null {
    if (!this.currentSession || this.currentSession.state === 'active') return null;

    this.currentSession.state = 'active';
    this.currentSession.lastActiveTime = timestamp;
    this.lastTickTime = timestamp;

    const event: ActivityEvent = {
      id: `evt-${this.currentSession.sessionId}-resume-${timestamp}`,
      timestamp,
      site: this.currentSession.domain,
      domain: this.currentSession.domain,
      platform: this.currentSession.platform,
      activityType: this.currentSession.activityType,
      category: this.currentSession.category,
      state: 'active',
      durationMs: this.currentSession.totalActiveDurationMs,
      isShortForm: this.currentSession.isShortForm,
    };
    this.emitEvent(event);
    return event;
  }

  /**
   * Finalizes session on page unload, navigation, or tab close.
   */
  public endSession(timestamp: number = Date.now()): ActivityEvent | null {
    if (!this.currentSession) return null;

    const session = this.currentSession;
    this.currentSession = null;

    if (this.currentAdapter) {
      this.currentAdapter.destroy();
      this.currentAdapter = null;
    }

    const event: ActivityEvent = {
      id: `evt-${session.sessionId}-end`,
      timestamp,
      site: session.domain,
      domain: session.domain,
      platform: session.platform,
      activityType: session.activityType,
      category: session.category,
      state: 'ended',
      durationMs: session.totalActiveDurationMs,
      mediaProgressMs: Math.floor(session.totalMediaProgressMs),
      isShortForm: session.isShortForm,
    };

    this.emitEvent(event);
    return event;
  }

  /**
   * Crash recovery: reconciles an in-progress session that was abruptly interrupted
   * by browser restart or process termination. Never allows runaway duration.
   */
  public recoverCrashedSession(
    crashedSession: Partial<ActiveSessionState>,
    recoveryTimestamp: number = Date.now()
  ): ActivityEvent {
    const rawDuration = crashedSession.totalActiveDurationMs ?? 0;
    // Cap conservative extension duration to max 5 minutes (300,000ms) beyond recorded duration
    const safeDuration = Math.min(rawDuration + 30_000, 300_000);

    const event: ActivityEvent = {
      id: `evt-recovery-${crashedSession.sessionId ?? 'unknown'}-${recoveryTimestamp}`,
      timestamp: recoveryTimestamp,
      site: crashedSession.domain ?? 'generic',
      domain: crashedSession.domain ?? 'generic',
      platform: crashedSession.platform ?? 'generic',
      activityType: crashedSession.activityType ?? 'page',
      category: crashedSession.category ?? 'other',
      state: 'ended',
      durationMs: safeDuration,
      isShortForm: Boolean(crashedSession.isShortForm),
      metadata: {
        recoveredFromCrash: true,
      },
    };

    this.emitEvent(event);
    return event;
  }

  public getBufferedEvents(): ActivityEvent[] {
    return [...this.eventBuffer];
  }

  public flush(): ActivityEvent[] {
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    return events;
  }

  private emitEvent(event: ActivityEvent): void {
    this.eventBuffer.push(event);
    if (this.onEventCallback) {
      try {
        void this.onEventCallback(event);
      } catch (err) {
        console.error('UniversalActivityEngine onEvent error:', err);
      }
    }
  }
}
