/**
 * @buddy/site-adapters - platforms/instagram/instagram-adapter.ts
 * Real-world adapter for Instagram web client and Reels observation.
 */

import type { ActivityDetection, ContentState, ContentType, FocusPolicy, PlatformCategory, PlatformId, SiteCapabilities } from '@buddy/shared-types';
import { BaseSiteAdapter } from '../../core/BaseSiteAdapter.js';

export const INSTAGRAM_REELS_SELECTORS = [
  'a[href*="/reels/"]',
  'a[aria-label="Reels"]',
  'div[role="dialog"] video',
  'div._ab18',
];

export const INSTAGRAM_FEED_SELECTORS = [
  'main[role="main"] article',
  'div._aaoo',
];

export const INSTAGRAM_COMMENTS_SELECTORS = [
  'ul._a9z6',
  'div[role="dialog"] ul._a9ym',
];

export class InstagramAdapter extends BaseSiteAdapter {
  readonly id: PlatformId = 'instagram';
  readonly name = 'Instagram Adapter';
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
      if (document.querySelector('a[href*="/reels/"], div[role="dialog"] video')) {
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
    return host === 'instagram.com' || host.endsWith('.instagram.com');
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

    const hasShortForm = Boolean(document.querySelector(INSTAGRAM_REELS_SELECTORS.join(', ')));
    const hasFeed = Boolean(document.querySelector(INSTAGRAM_FEED_SELECTORS.join(', ')));
    const hasComments = Boolean(document.querySelector(INSTAGRAM_COMMENTS_SELECTORS.join(', ')));

    return {
      hasShortForm,
      hasFeed,
      hasRecommendations: hasFeed,
      hasComments,
      hasAutoplay: true, // Instagram feeds auto-play on scroll
    };
  }

  applyFocusPolicy(policy: FocusPolicy): void {
    if (typeof document === 'undefined') return;

    // 1. Hide Reels / Short-form
    this.applyScopedStyle(
      'buddy-ig-reels-policy',
      `${INSTAGRAM_REELS_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideShortForm)
    );

    // 2. Hide Feed / Recommendations
    this.applyScopedStyle(
      'buddy-ig-feed-policy',
      `${INSTAGRAM_FEED_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideRecommendations || policy.hideSidebars)
    );

    // 3. Hide Comments
    this.applyScopedStyle(
      'buddy-ig-comments-policy',
      `${INSTAGRAM_COMMENTS_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideComments)
    );

    // 3. Grayscale Media
    this.applyScopedStyle(
      'buddy-ig-grayscale-policy',
      'main video, main img { filter: grayscale(100%) !important; }',
      Boolean(policy.grayscaleMedia)
    );
  }
}
