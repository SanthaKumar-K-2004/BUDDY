/**
 * @buddy/site-adapters - platforms/twitch/twitch-adapter.ts
 * Real-world adapter for Twitch live streams and VODs.
 * Observes live video player and manages chat/recommendations focus controls.
 */

import type { ActivityDetection, ContentState, ContentType, FocusPolicy, PlatformCategory, PlatformId, SiteCapabilities } from '@buddy/shared-types';
import { BaseSiteAdapter } from '../../core/BaseSiteAdapter.js';

export const TWITCH_RECOMMENDATIONS_SELECTORS = [
  'div[aria-label="Recommended Channels"]',
  'div[data-a-target="recommended-channels"]',
  'div.side-nav-card',
  'div[data-a-target="root-carousel"]',
];

export const TWITCH_CHAT_SELECTORS = [
  'section[aria-label="Chat"]',
  'div[data-a-target="chat-room-component"]',
  'div.chat-shell',
  'div.stream-chat',
];

export class TwitchAdapter extends BaseSiteAdapter {
  readonly id: PlatformId = 'twitch';
  readonly name = 'Twitch Adapter';
  readonly category: PlatformCategory = 'gaming';

  readonly capabilities: SiteCapabilities = {
    ads: true,
    trackers: true,
    video: true,
    shortVideo: false,
    reels: false,
    music: false,
    feed: false,
    watchTime: true,
    sessionTime: true,
  };

  override detectActivity(): ActivityDetection | null {
    const base = super.detectActivity();
    if (!base) return null;
    return {
      ...base,
      activityType: 'video',
      category: 'gaming',
      isShortForm: false,
    };
  }

  protected override getContentType(): ContentType {
    return 'stream';
  }

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host === 'twitch.tv' || host.endsWith('.twitch.tv');
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

    const hasRecommendations = Boolean(document.querySelector(TWITCH_RECOMMENDATIONS_SELECTORS.join(', ')));
    const hasComments = Boolean(document.querySelector(TWITCH_CHAT_SELECTORS.join(', ')));
    const hasFeed = Boolean(document.querySelector('div[data-a-target="front-page-carousel"], div.root-scrollable'));
    const autoplayToggle = document.querySelector('button[data-a-target="player-play-pause-button"]');

    return {
      hasShortForm: false,
      hasFeed,
      hasRecommendations,
      hasComments,
      hasAutoplay: Boolean(autoplayToggle),
    };
  }

  applyFocusPolicy(policy: FocusPolicy): void {
    if (typeof document === 'undefined') return;

    // 1. Hide Recommendations / Side Nav
    this.applyScopedStyle(
      'buddy-twitch-recs-policy',
      `${TWITCH_RECOMMENDATIONS_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideRecommendations || policy.hideSidebars)
    );

    // 2. Hide Comments / Live Chat
    this.applyScopedStyle(
      'buddy-twitch-chat-policy',
      `${TWITCH_CHAT_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideComments)
    );

    // 3. Grayscale Media
    this.applyScopedStyle(
      'buddy-twitch-grayscale-policy',
      '.video-player__container video, div[data-a-target="video-player"] video, video { filter: grayscale(100%) !important; }',
      Boolean(policy.grayscaleMedia)
    );
  }
}
