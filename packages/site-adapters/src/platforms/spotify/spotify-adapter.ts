/**
 * @buddy/site-adapters - platforms/spotify/spotify-adapter.ts
 * Real-world adapter for Spotify Web Player.
 * Observes audio playback, active tracks, and controls distraction recommendations.
 */

import type { ActivityDetection, ContentState, ContentType, FocusPolicy, PlatformCategory, PlatformId, SiteCapabilities } from '@buddy/shared-types';
import { WatchTimeStateMachine } from '@buddy/watch-time';
import { BaseSiteAdapter } from '../../core/BaseSiteAdapter.js';

export const SPOTIFY_RECOMMENDATIONS_SELECTORS = [
  'section[data-testid="playlist-recommended"]',
  'aside[aria-label="Friend Activity"]',
  'section[data-testid="track-recommendations"]',
];

export class SpotifyAdapter extends BaseSiteAdapter {
  readonly id: PlatformId = 'spotify';
  readonly name = 'Spotify Web Adapter';
  readonly category: PlatformCategory = 'music';

  readonly capabilities: SiteCapabilities = {
    ads: true,
    trackers: true,
    video: false,
    shortVideo: false,
    reels: false,
    music: true,
    feed: false,
    watchTime: true,
    sessionTime: true,
  };

  constructor() {
    super();
    // Allow background music listening to be accounted
    this.watchMachine = new WatchTimeStateMachine({
      initialState: 'IDLE',
      allowBackgroundAudio: true,
    });
  }

  override detectActivity(): ActivityDetection | null {
    const base = super.detectActivity();
    if (!base) return null;
    return {
      ...base,
      activityType: 'music',
      category: 'music',
      isShortForm: false,
    };
  }

  protected override getContentType(): ContentType {
    return 'music';
  }

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host === 'open.spotify.com' || host.endsWith('.spotify.com');
  }

  getContentState(): ContentState {
    if (typeof document === 'undefined') {
      return {
        hasShortForm: false,
        hasFeed: false,
        hasRecommendations: false,
        hasComments: false,
        hasAutoplay: false,
      };
    }

    const hasRecommendations = Boolean(
      document.querySelector(SPOTIFY_RECOMMENDATIONS_SELECTORS.join(', '))
    );

    return {
      hasShortForm: false,
      hasFeed: false,
      hasRecommendations,
      hasComments: false,
      hasAutoplay: true, // Spotify autoplay next track
    };
  }

  applyFocusPolicy(policy: FocusPolicy): void {
    if (typeof document === 'undefined') return;

    // Hide Recommended Playlists / Friend activity sidebar
    this.applyScopedStyle(
      'buddy-spotify-recs-policy',
      `${SPOTIFY_RECOMMENDATIONS_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideRecommendations || policy.hideSidebars)
    );
  }
}
