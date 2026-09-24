/**
 * @buddy/site-adapters - platforms/x/x-adapter.ts
 * Real-world adapter for X (formerly Twitter) web client.
 * Observes timeline video/audio playback and manages feed/sidebar focus controls.
 */

import type { ActivityDetection, ContentState, ContentType, FocusPolicy, PlatformCategory, PlatformId, SiteCapabilities } from '@buddy/shared-types';
import { BaseSiteAdapter } from '../../core/BaseSiteAdapter.js';

export const X_RECOMMENDATIONS_SELECTORS = [
  'div[aria-label="Timeline: Trending now"]',
  'aside[aria-label="Who to follow"]',
  'div[data-testid="sidebarColumn"]',
  'div[data-testid="trend"]',
];

export const X_COMMENTS_SELECTORS = [
  'div[aria-label="Timeline: Conversation"]',
  'section[aria-label="Timeline: Conversation"]',
];

export const X_SHORT_FORM_SELECTORS = [
  'div[data-testid="videoPlayer"][aria-label*="reels"]',
  'div[data-testid="immersiveVideoPlayer"]',
];

export class XAdapter extends BaseSiteAdapter {
  readonly id: PlatformId = 'x';
  readonly name = 'X / Twitter Adapter';
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
    if (this.context?.url.pathname.includes('/status/') && this.context?.url.pathname.includes('/video/')) {
      return 'short_form';
    }
    return 'generic_media';
  }

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return (
      host === 'x.com' ||
      host.endsWith('.x.com') ||
      host === 'twitter.com' ||
      host.endsWith('.twitter.com')
    );
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

    const hasShortForm = Boolean(document.querySelector(X_SHORT_FORM_SELECTORS.join(', ')));
    const hasRecommendations = Boolean(document.querySelector(X_RECOMMENDATIONS_SELECTORS.join(', ')));
    const hasComments = Boolean(document.querySelector(X_COMMENTS_SELECTORS.join(', ')));
    const hasFeed = Boolean(
      document.querySelector('div[aria-label="Timeline: Your Home Timeline"], div[data-testid="primaryColumn"]')
    );

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

    // 1. Hide Recommendations / Trending Sidebar
    this.applyScopedStyle(
      'buddy-x-recs-policy',
      `${X_RECOMMENDATIONS_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideRecommendations || policy.hideSidebars)
    );

    // 2. Hide Comments / Conversation Replies
    this.applyScopedStyle(
      'buddy-x-comments-policy',
      `${X_COMMENTS_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideComments)
    );

    // 3. Hide Short-form
    this.applyScopedStyle(
      'buddy-x-shortform-policy',
      `${X_SHORT_FORM_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideShortForm)
    );

    // 4. Grayscale Media
    this.applyScopedStyle(
      'buddy-x-grayscale-policy',
      'div[data-testid="videoPlayer"] video, div[data-testid="tweetPhoto"] img, video { filter: grayscale(100%) !important; }',
      Boolean(policy.grayscaleMedia)
    );
  }
}
