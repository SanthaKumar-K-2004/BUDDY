/**
 * @buddy/site-adapters - platforms/reddit/reddit-adapter.ts
 * Real-world adapter for Reddit (shreddit & legacy redesign).
 * Observes native video players and enforces distraction-free focus policies.
 */

import type { ActivityDetection, ContentState, ContentType, FocusPolicy, PlatformCategory, PlatformId, SiteCapabilities } from '@buddy/shared-types';
import { BaseSiteAdapter } from '../../core/BaseSiteAdapter.js';

export const REDDIT_RECOMMENDATIONS_SELECTORS = [
  'shreddit-recent-posts',
  'aside[aria-label*="Community"]',
  '#right-sidebar-contents',
  'div[data-testid="subreddit-sidebar"]',
  'shreddit-gallery-carousel',
];

export const REDDIT_COMMENTS_SELECTORS = [
  'shreddit-comment-tree',
  '#comment-tree',
  'div[data-test-id="comment"]',
  'shreddit-comment',
];

export const REDDIT_SHORT_FORM_SELECTORS = [
  'shreddit-aspect-ratio[watch-feed]',
  'shreddit-media-ui[watch-feed]',
  'a[href*="/r/videos/"]',
];

export class RedditAdapter extends BaseSiteAdapter {
  readonly id: PlatformId = 'reddit';
  readonly name = 'Reddit Adapter';
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
    const isShort = this.getContentType() === 'short_form';
    return {
      ...base,
      activityType: isShort ? 'short' : base.activityType,
      isShortForm: isShort,
    };
  }

  protected override getContentType(): ContentType {
    if (this.context?.url.pathname.includes('/watch/')) {
      return 'short_form';
    }
    return 'generic_media';
  }

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host === 'reddit.com' || host.endsWith('.reddit.com');
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

    const hasShortForm = Boolean(document.querySelector(REDDIT_SHORT_FORM_SELECTORS.join(', ')));
    const hasRecommendations = Boolean(document.querySelector(REDDIT_RECOMMENDATIONS_SELECTORS.join(', ')));
    const hasComments = Boolean(document.querySelector(REDDIT_COMMENTS_SELECTORS.join(', ')));
    const hasFeed = Boolean(document.querySelector('shreddit-feed, #main-content, div[role="feed"]'));

    return {
      hasShortForm,
      hasFeed,
      hasRecommendations,
      hasComments,
      hasAutoplay: false,
    };
  }

  applyFocusPolicy(policy: FocusPolicy): void {
    if (typeof document === 'undefined') return;

    // 1. Hide Recommendations / Right Sidebar
    this.applyScopedStyle(
      'buddy-reddit-recs-policy',
      `${REDDIT_RECOMMENDATIONS_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideRecommendations || policy.hideSidebars)
    );

    // 2. Hide Comments
    this.applyScopedStyle(
      'buddy-reddit-comments-policy',
      `${REDDIT_COMMENTS_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideComments)
    );

    // 3. Hide Short-form
    this.applyScopedStyle(
      'buddy-reddit-shortform-policy',
      `${REDDIT_SHORT_FORM_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideShortForm)
    );

    // 4. Grayscale Media
    this.applyScopedStyle(
      'buddy-reddit-grayscale-policy',
      'shreddit-player video, div.media-element video, video { filter: grayscale(100%) !important; }',
      Boolean(policy.grayscaleMedia)
    );
  }
}
