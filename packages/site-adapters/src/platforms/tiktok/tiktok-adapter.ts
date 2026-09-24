/**
 * @buddy/site-adapters - platforms/tiktok/tiktok-adapter.ts
 * Real-world adapter for TikTok web interface and video feed.
 */

import type { ActivityDetection, ContentState, ContentType, FocusPolicy, PlatformCategory, PlatformId, SiteCapabilities } from '@buddy/shared-types';
import { BaseSiteAdapter } from '../../core/BaseSiteAdapter.js';

export const TIKTOK_FEED_SELECTORS = [
  'div[data-e2e="recommend-list-item-container"]',
  'div[class*="DivItemContainer"]',
  'div[data-e2e="user-post-item-list"]',
];

export const TIKTOK_COMMENTS_SELECTORS = [
  'div[data-e2e="comment-list"]',
  'div[class*="DivCommentListContainer"]',
];

export class TikTokAdapter extends BaseSiteAdapter {
  readonly id: PlatformId = 'tiktok';
  readonly name = 'TikTok Adapter';
  readonly category: PlatformCategory = 'social';

  readonly capabilities: SiteCapabilities = {
    ads: true,
    trackers: true,
    video: true,
    shortVideo: true,
    reels: false,
    music: false,
    feed: true,
    watchTime: true,
    sessionTime: true,
  };

  override detectActivity(): ActivityDetection | null {
    const base = super.detectActivity();
    if (!base) return null;
    return {
      ...base,
      activityType: 'short',
      isShortForm: true,
    };
  }

  protected override getContentType(): ContentType {
    return 'short_form';
  }

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host === 'tiktok.com' || host.endsWith('.tiktok.com');
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

    const hasFeed = Boolean(document.querySelector(TIKTOK_FEED_SELECTORS.join(', ')));
    const hasComments = Boolean(document.querySelector(TIKTOK_COMMENTS_SELECTORS.join(', ')));

    return {
      hasShortForm: true, // Entire platform is short-form
      hasFeed,
      hasRecommendations: hasFeed,
      hasComments,
      hasAutoplay: true,
    };
  }

  applyFocusPolicy(policy: FocusPolicy): void {
    if (typeof document === 'undefined') return;

    // Hide Feed / Short-form
    this.applyScopedStyle(
      'buddy-tiktok-feed-policy',
      `${TIKTOK_FEED_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideShortForm || policy.hideRecommendations)
    );

    // Hide comments
    this.applyScopedStyle(
      'buddy-tiktok-comments-policy',
      `${TIKTOK_COMMENTS_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideComments)
    );

    // Grayscale media
    this.applyScopedStyle(
      'buddy-tiktok-grayscale-policy',
      'video { filter: grayscale(100%) !important; }',
      Boolean(policy.grayscaleMedia)
    );
  }
}
