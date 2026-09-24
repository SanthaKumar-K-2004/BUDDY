/**
 * @buddy/shared-types - media.ts
 * Types for watch-time, media detection, and session tracking.
 */

export type PlatformCategory =
  | 'social'
  | 'video'
  | 'music'
  | 'news'
  | 'gaming'
  | 'shopping'
  | 'education'
  | 'productivity'
  | 'entertainment'
  | 'communication'
  | 'other';

export type PlatformId =
  | 'youtube'
  | 'instagram'
  | 'facebook'
  | 'spotify'
  | 'tiktok'
  | 'reddit'
  | 'x'
  | 'twitch'
  | 'generic';

export type ContentType =
  | 'short_form'
  | 'long_form_video'
  | 'music'
  | 'podcast'
  | 'stream'
  | 'generic_media';

export type WatchEngineState =
  | 'IDLE'
  | 'ACTIVE'
  | 'MEDIA_PLAYING'
  | 'PAUSED'
  | 'BACKGROUND'
  | 'ENDED';

export interface MediaPlaybackState {
  readonly isPlaying: boolean;
  readonly isPaused: boolean;
  readonly isMuted: boolean;
  readonly currentTime: number;
  readonly duration: number;
  readonly volume: number;
  readonly playbackRate: number;
  readonly hasVideo: boolean;
  readonly hasAudio: boolean;
}

export interface WatchSession {
  readonly sessionId?: string;
  readonly id?: string;
  readonly domain: string;
  readonly platform: PlatformId;
  readonly contentType?: ContentType;
  readonly category?: PlatformCategory;
  readonly startTime?: number;
  readonly endTime?: number | null;
  readonly startedAt?: number;
  readonly endedAt?: number | null;
  readonly activeWatchSeconds?: number;
  readonly activeDurationMs?: number;
  readonly mediaDurationMs?: number;
  readonly shortFormDurationMs?: number;
  readonly backgroundAudioSeconds?: number;
  readonly isCompleted?: boolean;
}

export interface ContentState {
  readonly hasShortForm: boolean;
  readonly hasFeed: boolean;
  readonly hasRecommendations: boolean;
  readonly hasComments: boolean;
  readonly hasAutoplay: boolean;
}

export type ActivityType =
  | 'page'
  | 'video'
  | 'short'
  | 'reel'
  | 'music'
  | 'feed'
  | 'social'
  | 'gaming'
  | 'reading'
  | 'unknown';

export type ActivityState = 'started' | 'active' | 'paused' | 'ended';

export interface SiteCapabilities {
  readonly ads: boolean;
  readonly trackers: boolean;
  readonly video: boolean;
  readonly shortVideo: boolean;
  readonly reels: boolean;
  readonly music: boolean;
  readonly feed: boolean;
  readonly watchTime: boolean;
  readonly sessionTime: boolean;
}

export interface ActivityEvent {
  readonly id: string;
  readonly timestamp: number;
  readonly site: string;
  readonly domain: string;
  readonly platform: PlatformId;
  readonly activityType: ActivityType;
  readonly category: PlatformCategory;
  readonly state: ActivityState;
  readonly durationMs?: number;
  readonly mediaProgressMs?: number;
  readonly playbackRate?: number;
  readonly isShortForm?: boolean;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface ActivityDetection {
  readonly activityType: ActivityType;
  readonly category: PlatformCategory;
  readonly confidence: number;
  readonly mediaElement?: HTMLMediaElement | null;
  readonly title?: string;
  readonly isShortForm?: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
