import type {
  ActivityDetection,
  ActivityType,
  ContentState,
  ContentType,
  FocusPolicy,
  MediaPlaybackState,
  PlatformCategory,
  PlatformId,
  SiteCapabilities,
  WatchSession,
} from '@buddy/shared-types';
import { WatchTimeStateMachine } from '@buddy/watch-time';
import type { SiteAdapter, SiteContext } from './SiteAdapter.js';

export abstract class BaseSiteAdapter implements SiteAdapter {
  abstract readonly id: PlatformId;
  abstract readonly name: string;
  abstract readonly category: PlatformCategory;

  readonly capabilities: SiteCapabilities = {
    ads: false,
    trackers: false,
    video: false,
    shortVideo: false,
    reels: false,
    music: false,
    feed: false,
    watchTime: true,
    sessionTime: true,
  };

  protected context: SiteContext | null = null;
  protected watchMachine = new WatchTimeStateMachine('IDLE');
  protected isObserving = false;
  protected observedMediaElements = new Set<HTMLMediaElement>();
  protected sessionStartTime: number = Date.now();
  protected boundVisibilityHandler: (() => void) | null = null;
  protected mutationObserver: MutationObserver | null = null;
  protected lastError: Error | null = null;
  protected lastSuccessfulScanTime: number = 0;
  protected scanThrottleTimeout: ReturnType<typeof setTimeout> | null = null;

  abstract matches(url: URL): boolean;
  abstract getContentState(): ContentState;
  abstract applyFocusPolicy(policy: FocusPolicy): void;

  initialize(context: SiteContext): void {
    this.context = context;
    this.sessionStartTime = Date.now();
    this.lastError = null;
    this.observe();
  }

  destroy(): void {
    this.stopObserving();
    this.context = null;
  }

  observe(): void {
    if (this.isObserving || typeof document === 'undefined') return;
    this.isObserving = true;

    // 1. Visibility change listener (real browser signal)
    this.boundVisibilityHandler = () => {
      try {
        if (document.hidden) {
          this.watchMachine.transition('DOC_HIDDEN');
        } else {
          this.watchMachine.transition('DOC_VISIBLE');
        }
      } catch (err) {
        this.lastError = err instanceof Error ? err : new Error(String(err));
      }
    };
    document.addEventListener('visibilitychange', this.boundVisibilityHandler);

    // 2. Discover existing media elements and attach listeners
    this.scanForMediaElements();

    // 3. Setup MutationObserver for dynamic/lazy-loaded media with safe debouncing
    if (typeof MutationObserver !== 'undefined' && document.body) {
      this.mutationObserver = new MutationObserver(() => {
        if (this.scanThrottleTimeout) return;
        this.scanThrottleTimeout = setTimeout(() => {
          this.scanThrottleTimeout = null;
          this.scanForMediaElements();
        }, 300);
      });
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    // 4. Initial state transitions
    if (!document.hidden) {
      this.watchMachine.transition('TAB_ACTIVE');
      this.watchMachine.transition('DOC_VISIBLE');
    }
  }

  stopObserving(): void {
    if (!this.isObserving) return;
    this.isObserving = false;

    if (this.scanThrottleTimeout) {
      clearTimeout(this.scanThrottleTimeout);
      this.scanThrottleTimeout = null;
    }

    if (this.boundVisibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    for (const media of this.observedMediaElements) {
      this.detachMediaListeners(media);
    }
    this.observedMediaElements.clear();
  }

  getMediaState(): MediaPlaybackState {
    let isPlaying = false;
    let isPaused = true;
    let isMuted = false;
    let currentTime = 0;
    let duration = 0;
    let volume = 1;
    let playbackRate = 1;
    let hasVideo = false;
    let hasAudio = false;

    const machinePlaying = this.watchMachine.getState() === 'MEDIA_PLAYING';

    for (const media of this.observedMediaElements) {
      try {
        if (machinePlaying || (!media.paused && !media.ended)) {
          isPlaying = true;
          isPaused = false;
        }
        if (media instanceof HTMLVideoElement) hasVideo = true;
        if (media instanceof HTMLAudioElement) hasAudio = true;
        if (media.currentTime > currentTime) currentTime = media.currentTime;
        if (media.duration && !isNaN(media.duration) && media.duration > duration) {
          duration = media.duration;
        }
        isMuted = media.muted;
        volume = media.volume;
        playbackRate = media.playbackRate;
      } catch (err) {
        this.lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (machinePlaying) {
      isPlaying = true;
      isPaused = false;
    }

    return {
      isPlaying,
      isPaused,
      isMuted,
      currentTime,
      duration,
      volume,
      playbackRate,
      hasVideo,
      hasAudio,
    };
  }

  protected getContentType(): ContentType {
    return 'generic_media';
  }

  /**
   * Universal activity detection: discovers active media or page engagement,
   * classifies activity type, and associates active media elements.
   */
  detectActivity(): ActivityDetection | null {
    if (!this.context) return null;

    const primaryMedia = this.getPrimaryMediaElement();
    const isPlaying = primaryMedia
      ? (!primaryMedia.paused && !primaryMedia.ended)
      : this.watchMachine.getState() === 'MEDIA_PLAYING';

    const contentType = this.getContentType();
    const isShort = contentType === 'short_form';

    let activityType: ActivityType = 'page';
    if (this.category === 'music' || contentType === 'music') {
      activityType = 'music';
    } else if (isShort) {
      activityType = (this.id === 'instagram' || this.id === 'facebook') ? 'reel' : 'short';
    } else if (contentType === 'long_form_video' || (primaryMedia && isPlaying)) {
      activityType = 'video';
    } else {
      const contentState = this.getContentState();
      if (contentState.hasFeed) {
        activityType = 'feed';
      } else if (this.category === 'social') {
        activityType = 'social';
      }
    }

    return {
      activityType,
      category: this.category,
      confidence: primaryMedia && isPlaying ? 0.95 : 0.8,
      mediaElement: primaryMedia,
      isShortForm: isShort,
      metadata: {
        platform: this.id,
        domain: this.context.url.hostname,
        isPlaying,
        playbackRate: primaryMedia?.playbackRate ?? this.watchMachine.getPlaybackRate(),
      },
    };
  }

  /**
   * Media priority algorithm: prefers playing, audible, visible, foreground media.
   */
  protected getPrimaryMediaElement(): HTMLMediaElement | null {
    if (this.observedMediaElements.size === 0) return null;

    let bestElement: HTMLMediaElement | null = null;
    let bestScore = -1;

    for (const media of this.observedMediaElements) {
      let score = 0;
      if (!media.isConnected) continue;

      if (!media.paused && !media.ended) score += 50;
      if (!media.muted && media.volume > 0) score += 20;

      if (typeof HTMLVideoElement !== 'undefined' && media instanceof HTMLVideoElement) {
        try {
          const rect = media.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            score += 10;
            const area = rect.width * rect.height;
            if (area > 50000) score += 20;
          }
        } catch {
          // ignore layout query errors in testing
        }
      } else if (typeof HTMLAudioElement !== 'undefined' && media instanceof HTMLAudioElement) {
        score += 15;
      }

      if (score > bestScore) {
        bestScore = score;
        bestElement = media;
      }
    }

    return bestElement;
  }

  getWatchSession(): WatchSession | null {
    if (!this.context) return null;

    const activeSeconds = this.watchMachine.getActiveWatchSeconds();
    const mediaProgressSec = this.watchMachine.getMediaProgressSeconds();
    const backgroundSeconds = this.watchMachine.getBackgroundAudioSeconds();
    const contentType = this.getContentType();
    const isShort = contentType === 'short_form';

    return {
      sessionId: `${this.id}-${this.sessionStartTime}`,
      domain: this.context.url.hostname,
      platform: this.id,
      category: this.category,
      contentType,
      startTime: this.sessionStartTime,
      endTime: Date.now(),
      activeWatchSeconds: activeSeconds,
      activeDurationMs: activeSeconds * 1000,
      mediaDurationMs: mediaProgressSec * 1000,
      shortFormDurationMs: isShort ? activeSeconds * 1000 : 0,
      backgroundAudioSeconds: backgroundSeconds,
      isCompleted: this.watchMachine.getState() === 'ENDED',
    };
  }

  getHealth(): 'healthy' | 'degraded' | 'inactive' {
    if (!this.isObserving || !this.context) {
      return 'inactive';
    }
    if (this.lastError !== null) {
      return 'degraded';
    }
    return 'healthy';
  }

  protected scanForMediaElements(customSelector?: string): void {
    if (typeof document === 'undefined') return;

    try {
      const selector = customSelector ?? 'video, audio';
      const mediaList = document.querySelectorAll<HTMLMediaElement>(selector);

      for (const media of Array.from(mediaList)) {
        if (!this.observedMediaElements.has(media)) {
          this.observedMediaElements.add(media);
          this.attachMediaListeners(media);

          // If element is already playing when detected
          if (!media.paused && !media.ended) {
            this.watchMachine.transition('MEDIA_PLAY');
            this.watchMachine.recordMediaProgress(media.currentTime, media.playbackRate);
          }
        }
      }
      this.lastSuccessfulScanTime = Date.now();
    } catch (err) {
      this.lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  private attachMediaListeners(media: HTMLMediaElement): void {
    media.addEventListener('play', this.handleMediaPlay);
    media.addEventListener('pause', this.handleMediaPause);
    media.addEventListener('ended', this.handleMediaEnded);
    media.addEventListener('timeupdate', this.handleMediaTimeUpdate);
    media.addEventListener('ratechange', this.handleMediaRateChange);
  }

  private detachMediaListeners(media: HTMLMediaElement): void {
    media.removeEventListener('play', this.handleMediaPlay);
    media.removeEventListener('pause', this.handleMediaPause);
    media.removeEventListener('ended', this.handleMediaEnded);
    media.removeEventListener('timeupdate', this.handleMediaTimeUpdate);
    media.removeEventListener('ratechange', this.handleMediaRateChange);
  }

  private handleMediaPlay = (e: Event): void => {
    this.watchMachine.transition('MEDIA_PLAY');
    const media = e.target as HTMLMediaElement;
    if (media) {
      this.watchMachine.recordMediaProgress(media.currentTime, media.playbackRate);
    }
  };

  private handleMediaPause = (): void => {
    this.watchMachine.transition('MEDIA_PAUSE');
  };

  private handleMediaEnded = (): void => {
    this.watchMachine.transition('MEDIA_ENDED');
  };

  private handleMediaTimeUpdate = (e: Event): void => {
    const media = e.target as HTMLMediaElement;
    if (media) {
      this.watchMachine.recordMediaProgress(media.currentTime, media.playbackRate);
    }
  };

  private handleMediaRateChange = (e: Event): void => {
    const media = e.target as HTMLMediaElement;
    if (media && media.playbackRate) {
      this.watchMachine.setPlaybackRate(media.playbackRate);
    }
  };

  /**
   * Sanitizes URLs by removing tracking tokens, auth parameters, and session IDs.
   */
  public static sanitizeUrl(url: URL): URL {
    const sanitized = new URL(url.toString());
    const sensitiveParamPrefixes = ['utm_', 'fbclid', 'gclid', 'igshid', 'mc_cid', 'mc_eid', '_hsenc', '_hsmi'];
    const sensitiveParamExact = ['token', 'auth', 'access_token', 'session', 'sessionid', 'api_key', 'key', 'secret', 'password', 'pwd'];

    const paramsToDelete: string[] = [];
    sanitized.searchParams.forEach((_val, key) => {
      const lower = key.toLowerCase();
      if (
        sensitiveParamExact.includes(lower) ||
        sensitiveParamPrefixes.some((prefix) => lower.startsWith(prefix))
      ) {
        paramsToDelete.push(key);
      }
    });

    for (const key of paramsToDelete) {
      sanitized.searchParams.delete(key);
    }
    return sanitized;
  }

  /**
   * Injects or updates a scoped CSS style tag to hide distraction elements.
   */
  protected applyScopedStyle(styleId: string, cssRule: string, shouldApply: boolean): void {
    if (typeof document === 'undefined') return;

    try {
      const existing = document.getElementById(styleId);
      if (shouldApply) {
        if (!existing) {
          const styleEl = document.createElement('style');
          styleEl.id = styleId;
          styleEl.textContent = cssRule;
          (document.head || document.documentElement).appendChild(styleEl);
        } else {
          existing.textContent = cssRule;
        }
      } else if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }
    } catch (err) {
      this.lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
}
