/**
 * @buddy/watch-time - watch-machine.ts
 * Reusable finite state machine for active watch-time calculation.
 */

import type { WatchEngineState } from '@buddy/shared-types';

export type WatchInputEvent =
  | 'TAB_ACTIVE'
  | 'TAB_INACTIVE'
  | 'DOC_VISIBLE'
  | 'DOC_HIDDEN'
  | 'MEDIA_PLAY'
  | 'MEDIA_PAUSE'
  | 'MEDIA_ENDED'
  | 'USER_IDLE'
  | 'USER_ACTIVE'
  | 'NAVIGATION';

export interface WatchStateContext {
  isTabActive: boolean;
  isDocVisible: boolean;
  isMediaPlaying: boolean;
  isUserActive: boolean;
}

export interface WatchMachineConfig {
  initialState?: WatchEngineState;
  allowBackgroundAudio?: boolean;
  idleTimeoutSeconds?: number;
}

export class WatchTimeStateMachine {
  private currentState: WatchEngineState = 'IDLE';
  private context: WatchStateContext = {
    isTabActive: false,
    isDocVisible: true,
    isMediaPlaying: false,
    isUserActive: false,
  };

  private activeWatchSeconds = 0;
  private mediaProgressSeconds = 0;
  private backgroundAudioSeconds = 0;
  private currentPlaybackRate = 1.0;
  private lastReportedMediaTime = -1;
  private allowBackgroundAudio = false;
  private idleTimeoutSeconds = 30;
  private lastUserActivityTime = Date.now();
  private lastTimeUpdated = Date.now();
  private onStateChangeListeners: Array<(from: WatchEngineState, to: WatchEngineState) => void> = [];

  constructor(configOrState: WatchEngineState | WatchMachineConfig = 'IDLE') {
    if (typeof configOrState === 'string') {
      this.currentState = configOrState;
    } else if (configOrState) {
      this.currentState = configOrState.initialState ?? 'IDLE';
      this.allowBackgroundAudio = Boolean(configOrState.allowBackgroundAudio);
      this.idleTimeoutSeconds = configOrState.idleTimeoutSeconds ?? 30;
    }
    this.lastTimeUpdated = Date.now();
    this.lastUserActivityTime = Date.now();
  }

  public getState(): WatchEngineState {
    return this.currentState;
  }

  public getActiveWatchSeconds(): number {
    this.tick();
    return Math.floor(this.activeWatchSeconds);
  }

  public getMediaProgressSeconds(): number {
    this.tick();
    return Math.floor(this.mediaProgressSeconds);
  }

  public getBackgroundAudioSeconds(): number {
    this.tick();
    return Math.floor(this.backgroundAudioSeconds);
  }

  public getPlaybackRate(): number {
    return this.currentPlaybackRate;
  }

  public setPlaybackRate(rate: number): void {
    if (rate > 0 && isFinite(rate)) {
      this.tick();
      this.currentPlaybackRate = rate;
    }
  }

  /**
   * Records media element currentTime and playbackRate.
   * Handles seeking (not counting jumped intervals) and looping (resetting interval).
   */
  public recordMediaProgress(currentTime: number, playbackRate?: number): void {
    this.tick();
    if (playbackRate && playbackRate > 0 && isFinite(playbackRate)) {
      this.currentPlaybackRate = playbackRate;
    }

    if (this.lastReportedMediaTime >= 0) {
      // 1. Detect media looping: if currentTime jumped back significantly
      if (currentTime < this.lastReportedMediaTime - 1.0) {
        // Media has looped or restarted. Reset reference to prevent runaway duration
        this.lastReportedMediaTime = currentTime;
        return;
      }

      // 2. Detect seeking forward: if currentTime jumped ahead far more than real elapsed time
      const mediaDelta = currentTime - this.lastReportedMediaTime;
      if (mediaDelta > 5.0) {
        // User seeked/jumped forward. Reset reference without accruing the skipped gap
        this.lastReportedMediaTime = currentTime;
        return;
      }
    }

    this.lastReportedMediaTime = currentTime;
  }

  /**
   * Resets active watch timers for a new session or video change.
   */
  public resetCounters(): void {
    this.activeWatchSeconds = 0;
    this.mediaProgressSeconds = 0;
    this.backgroundAudioSeconds = 0;
    this.lastReportedMediaTime = -1;
    this.lastTimeUpdated = Date.now();
  }

  public getIdleTimeoutSeconds(): number {
    return this.idleTimeoutSeconds;
  }

  /**
   * Checks if session has been inactive beyond the idle timeout.
   * If inactive and no media is playing, transitions to IDLE.
   */
  public checkInactivity(now: number = Date.now()): boolean {
    const inactiveSeconds = (now - this.lastUserActivityTime) / 1000;
    if (inactiveSeconds >= this.idleTimeoutSeconds && !this.context.isMediaPlaying && this.currentState !== 'IDLE') {
      this.transition('USER_IDLE');
      return true;
    }
    return false;
  }

  public onStateChange(listener: (from: WatchEngineState, to: WatchEngineState) => void): () => void {
    this.onStateChangeListeners.push(listener);
    return () => {
      this.onStateChangeListeners = this.onStateChangeListeners.filter((l) => l !== listener);
    };
  }

  public transition(event: WatchInputEvent): WatchEngineState {
    this.tick();
    const previousState = this.currentState;

    this.updateContext(event);

    const nextState = this.computeNextState(event);
    if (nextState !== previousState) {
      this.currentState = nextState;
      this.notifyListeners(previousState, nextState);
    }

    return this.currentState;
  }

  private updateContext(event: WatchInputEvent): void {
    switch (event) {
      case 'TAB_ACTIVE':
        this.context.isTabActive = true;
        this.context.isDocVisible = true;
        this.context.isUserActive = true;
        this.lastUserActivityTime = Date.now();
        break;
      case 'TAB_INACTIVE':
        this.context.isTabActive = false;
        break;
      case 'DOC_VISIBLE':
        this.context.isDocVisible = true;
        break;
      case 'DOC_HIDDEN':
        this.context.isDocVisible = false;
        break;
      case 'MEDIA_PLAY':
        this.context.isMediaPlaying = true;
        break;
      case 'MEDIA_PAUSE':
        this.context.isMediaPlaying = false;
        break;
      case 'MEDIA_ENDED':
        this.context.isMediaPlaying = false;
        break;
      case 'USER_IDLE':
        this.context.isUserActive = false;
        break;
      case 'USER_ACTIVE':
        this.context.isUserActive = true;
        this.lastUserActivityTime = Date.now();
        break;
      case 'NAVIGATION':
        this.context.isMediaPlaying = false;
        this.lastUserActivityTime = Date.now();
        break;
    }
  }

  private computeNextState(event: WatchInputEvent): WatchEngineState {
    const { isTabActive, isDocVisible, isMediaPlaying, isUserActive } = this.context;

    if (event === 'MEDIA_ENDED') {
      return 'ENDED';
    }

    if (event === 'NAVIGATION') {
      return isTabActive && isDocVisible ? 'ACTIVE' : 'IDLE';
    }

    switch (this.currentState) {
      case 'IDLE':
        if (event === 'MEDIA_PLAY') {
          return isDocVisible && (isTabActive || isUserActive) ? 'MEDIA_PLAYING' : 'BACKGROUND';
        }
        if (event === 'TAB_ACTIVE' || event === 'USER_ACTIVE' || event === 'DOC_VISIBLE') {
          return 'ACTIVE';
        }
        return 'IDLE';

      case 'ACTIVE':
        if (event === 'MEDIA_PLAY') {
          return isDocVisible && (isTabActive || isUserActive) ? 'MEDIA_PLAYING' : 'BACKGROUND';
        }
        if (event === 'TAB_INACTIVE' && !isDocVisible) {
          return 'IDLE';
        }
        if (event === 'USER_IDLE') {
          return 'IDLE';
        }
        return 'ACTIVE';

      case 'MEDIA_PLAYING':
        if (event === 'MEDIA_PAUSE') {
          return 'PAUSED';
        }
        if (event === 'DOC_HIDDEN' || event === 'TAB_INACTIVE' || event === 'USER_IDLE') {
          return isMediaPlaying ? 'BACKGROUND' : 'PAUSED';
        }
        return 'MEDIA_PLAYING';

      case 'PAUSED':
        if (event === 'MEDIA_PLAY') {
          return isDocVisible && isTabActive ? 'MEDIA_PLAYING' : 'BACKGROUND';
        }
        if (event === 'TAB_INACTIVE' || event === 'USER_IDLE') {
          return 'IDLE';
        }
        return 'PAUSED';

      case 'BACKGROUND':
        if (event === 'MEDIA_PAUSE') {
          return 'PAUSED';
        }
        if ((event === 'DOC_VISIBLE' || event === 'TAB_ACTIVE' || event === 'USER_ACTIVE') && isMediaPlaying) {
          return isDocVisible && isTabActive ? 'MEDIA_PLAYING' : 'ACTIVE';
        }
        if ((event === 'DOC_VISIBLE' || event === 'TAB_ACTIVE') && !isMediaPlaying) {
          return 'ACTIVE';
        }
        return 'BACKGROUND';

      case 'ENDED':
        if (event === 'MEDIA_PLAY') {
          return 'MEDIA_PLAYING';
        }
        if (event === 'USER_ACTIVE' || event === 'TAB_ACTIVE') {
          return 'ACTIVE';
        }
        return 'ENDED';

      default:
        return 'IDLE';
    }
  }

  private tick(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastTimeUpdated) / 1000;
    this.lastTimeUpdated = now;

    if (this.currentState === 'MEDIA_PLAYING') {
      this.activeWatchSeconds += elapsedSeconds;
      this.mediaProgressSeconds += elapsedSeconds * this.currentPlaybackRate;
    } else if (this.currentState === 'BACKGROUND' && this.context.isMediaPlaying) {
      this.backgroundAudioSeconds += elapsedSeconds;
      if (this.allowBackgroundAudio) {
        // Track music listening time even when tab is backgrounded
        this.mediaProgressSeconds += elapsedSeconds * this.currentPlaybackRate;
      }
    }
  }

  private notifyListeners(from: WatchEngineState, to: WatchEngineState): void {
    for (const listener of this.onStateChangeListeners) {
      try {
        listener(from, to);
      } catch (err) {
        console.error('WatchTimeStateMachine listener error:', err);
      }
    }
  }
}
