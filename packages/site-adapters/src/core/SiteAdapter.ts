/**
 * @buddy/site-adapters - core/SiteAdapter.ts
 * Unified contract for all platform adapters and generic web observer.
 */

import type {
  ActivityDetection,
  ContentState,
  FocusPolicy,
  MediaPlaybackState,
  PlatformCategory,
  PlatformId,
  SiteCapabilities,
  WatchSession,
} from '@buddy/shared-types';

export interface SiteContext {
  url: URL;
  tabId?: number;
  isMainFrame?: boolean;
}

export interface SiteAdapter {
  readonly id: PlatformId;
  readonly name: string;
  readonly category: PlatformCategory;
  readonly capabilities: SiteCapabilities;

  /** Checks if the adapter handles this URL */
  matches(url: URL): boolean;

  /** Detects current real web activity (video, short, reel, music, feed, etc.) */
  detectActivity(): ActivityDetection | null;

  /** Initializes observers and hooks */
  initialize(context: SiteContext): void | Promise<void>;

  /** Clean up all listeners and observers */
  destroy(): void;

  /** Inspects active media playback state */
  getMediaState(): MediaPlaybackState;

  /** Inspects observable distraction state */
  getContentState(): ContentState;

  /** Retrieves the active watch session */
  getWatchSession(): WatchSession | null;

  /** Enforces user focus policy (hide shorts, feeds, autoplay) */
  applyFocusPolicy(policy: FocusPolicy): void;

  /** Starts observing DOM events */
  observe(): void;

  /** Stops observing DOM events */
  stopObserving(): void;

  /** Dynamically assesses adapter health based on real lifecycle and DOM signals */
  getHealth(): 'healthy' | 'degraded' | 'inactive';
}
