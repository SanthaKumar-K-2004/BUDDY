/**
 * @buddy/site-adapters - platforms/youtube/youtube-adapter.ts
 * Real-world adapter for YouTube (Desktop, Mobile, Music).
 * Observes html5-main-video and enforces granular focus policies.
 */

import type { ActivityDetection, ContentState, ContentType, FocusPolicy, PlatformCategory, PlatformId, SiteCapabilities } from '@buddy/shared-types';
import { BaseSiteAdapter } from '../../core/BaseSiteAdapter.js';

export const YOUTUBE_SHORTS_SELECTORS = [
  'ytd-rich-shelf-renderer[is-shorts]',
  'ytd-reel-shelf-renderer',
  'ytd-reel-video-renderer',
  'a[href^="/shorts"]',
  'ytd-guide-entry-renderer a[title="Shorts"]',
  'ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
  '#shorts-container',
  'ytd-shorts',
];

export const YOUTUBE_RECOMMENDATIONS_SELECTORS = [
  '#related',
  '#secondary',
  'ytd-watch-next-secondary-results-renderer',
  'ytd-rich-grid-renderer:not([is-shorts])',
  '#chips-wrapper',
];

export const YOUTUBE_COMMENTS_SELECTORS = [
  '#comments',
  'ytd-comments',
  'ytd-item-section-renderer[section-identifier="comment-item-section"]',
];

export class YouTubeAdapter extends BaseSiteAdapter {
  readonly id: PlatformId = 'youtube';
  readonly name = 'YouTube Adapter';
  readonly category: PlatformCategory = 'video';

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

  protected override getContentType(): ContentType {
    if (this.context?.url.pathname.startsWith('/shorts')) {
      return 'short_form';
    }
    if (typeof document !== 'undefined') {
      if (document.querySelector('ytd-shorts, #shorts-container')) {
        return 'short_form';
      }
    }
    return 'long_form_video';
  }

  override detectActivity(): ActivityDetection | null {
    const base = super.detectActivity();
    if (!base) return null;
    const isShort = this.getContentType() === 'short_form';
    return {
      ...base,
      activityType: isShort ? 'short' : 'video',
      isShortForm: isShort,
    };
  }

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host === 'youtube.com' || host.endsWith('.youtube.com');
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

    const hasShortForm = Boolean(document.querySelector(YOUTUBE_SHORTS_SELECTORS.join(', ')));
    const hasRecommendations = Boolean(document.querySelector(YOUTUBE_RECOMMENDATIONS_SELECTORS.join(', ')));
    const hasComments = Boolean(document.querySelector(YOUTUBE_COMMENTS_SELECTORS.join(', ')));
    const autoplayToggle = document.querySelector('button.ytp-autonav-toggle-button[aria-checked="true"]');
    const hasFeed = Boolean(document.querySelector('ytd-rich-grid-renderer'));

    return {
      hasShortForm,
      hasFeed,
      hasRecommendations,
      hasComments,
      hasAutoplay: Boolean(autoplayToggle),
    };
  }

  applyFocusPolicy(policy: FocusPolicy): void {
    if (typeof document === 'undefined') return;

    // 1. Hide Shorts
    this.applyScopedStyle(
      'buddy-yt-shorts-policy',
      `${YOUTUBE_SHORTS_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideShortForm)
    );

    // 2. Hide Recommendations / Related Videos
    this.applyScopedStyle(
      'buddy-yt-recs-policy',
      `${YOUTUBE_RECOMMENDATIONS_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideRecommendations)
    );

    // 3. Hide Comments
    this.applyScopedStyle(
      'buddy-yt-comments-policy',
      `${YOUTUBE_COMMENTS_SELECTORS.join(',\n')} { display: none !important; }`,
      Boolean(policy.hideComments)
    );

    // 4. Disable Autoplay
    if (policy.disableAutoplay) {
      try {
        const toggle = document.querySelector<HTMLButtonElement>(
          'button.ytp-autonav-toggle-button[aria-checked="true"]'
        );
        if (toggle) {
          toggle.click();
        }
      } catch {
        // Safe degradation if autoplay button layout changed
      }
    }

    // 5. Grayscale Media
    this.applyScopedStyle(
      'buddy-yt-grayscale-policy',
      'video.html5-main-video { filter: grayscale(100%) !important; }',
      Boolean(policy.grayscaleMedia)
    );
  }
}
