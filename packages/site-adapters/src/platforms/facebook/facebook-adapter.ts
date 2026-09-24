/**
 * @buddy/site-adapters - platforms/facebook/facebook-adapter.ts
 * Real-world adapter for Facebook web client, feeds, and Reels.
 */

import type { ActivityDetection, ContentState, ContentType, FocusPolicy, PlatformCategory, PlatformId, SiteCapabilities } from '@buddy/shared-types';
import { BaseSiteAdapter } from '../../core/BaseSiteAdapter.js';

export const FACEBOOK_REELS_SELECTORS = [
  'div[aria-label*="Reels"]',
  'a[href*="/reel/"]',
  'div[data-pagelet*="Reels"]',
];

export const FACEBOOK_FEED_SELECTORS = [
  'div[role="feed"]',
  'div[data-pagelet*="Feed"]',
];

export const FACEBOOK_COMMENTS_SELECTORS = [
  'div[aria-label*="Comment"]',
  'div[aria-label*="comments"]',
];

export class FacebookAdapter extends BaseSiteAdapter {
  readonly id: PlatformId = 'facebook';
  readonly name = 'Facebook Adapter';
  readonly category: PlatformCategory = 'social';

  readonly capabilities: SiteCapabilities = {
    ads: true,
    trackers: true,
    video: true,
    shortVideo: true,
    reels: true,
    music: false,
    feed: true,
    watchTime: true,
    sessionTime: true,
  };

  protected override getContentType(): ContentType {
    if (this.context?.url.pathname.includes('/reel')) {
      return 'short_form';
    }
    if (typeof document !== 'undefined') {
      if (document.querySelector('div[aria-label*="Reels"], a[href*="/reel/"]')) {
        return 'short_form';
      }
    }
    return 'generic_media';
  }

  override detectActivity(): ActivityDetection | null {
    const base = super.detectActivity();
    if (!base) return null;
    const isReel = this.getContentType() === 'short_form';
    return {
      ...base,
      activityType: isReel ? 'reel' : base.activityType,
      isShortForm: isReel,
    };
  }

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.com';
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

    const hasShortForm = Boolean(document.querySelector(FACEBOOK_REELS_SELECTORS.join(', ')));
    const hasFeed = Boolean(document.querySelector(FACEBOOK_FEED_SELECTORS.join(', ')));
    const hasComments = Boolean(document.querySelector(FACEBOOK_COMMENTS_SELECTORS.join(', ')));

    return {
      hasShortForm,
      hasFeed,
      hasRecommendations: hasFeed,
      hasComments,
      hasAutoplay: true,
    };
  }

  applyFocusPolicy(policy: FocusPolicy): void {
    if (typeof document === 'undefined') return;

    // 1. Hide Reels / Short-form
    this.applyScopedStyle(
      'buddy-fb-reels-policy',
      `${FACEBOOK_REELS_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideShortForm)
    );

    // 2. Hide Feed / Recommendations
    this.applyScopedStyle(
      'buddy-fb-feed-policy',
      `${FACEBOOK_FEED_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideRecommendations || policy.hideSidebars)
    );

    // 3. Hide Comments
    this.applyScopedStyle(
      'buddy-fb-comments-policy',
      `${FACEBOOK_COMMENTS_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideComments)
    );

    // 3. Grayscale Media
    this.applyScopedStyle(
      'buddy-fb-grayscale-policy',
      'div[role="feed"] video, div[role="feed"] img { filter: grayscale(100%) !important; }',
      Boolean(policy.grayscaleMedia)
    );
  }
}
