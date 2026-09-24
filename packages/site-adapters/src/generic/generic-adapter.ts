/**
 * @buddy/site-adapters - generic/generic-adapter.ts
 * Universal event-driven media observer for any website.
 */

import type { ContentState, FocusPolicy, PlatformCategory, PlatformId, SiteCapabilities } from '@buddy/shared-types';
import { BaseSiteAdapter } from '../core/BaseSiteAdapter.js';

export class GenericMediaAdapter extends BaseSiteAdapter {
  readonly id: PlatformId = 'generic';
  readonly name = 'Generic Media Adapter';
  readonly category: PlatformCategory = 'other';

  readonly capabilities: SiteCapabilities = {
    ads: false,
    trackers: false,
    video: true,
    shortVideo: false,
    reels: false,
    music: false,
    feed: false,
    watchTime: true,
    sessionTime: true,
  };

  matches(_url: URL): boolean {
    return true; // Catch-all fallback
  }

  getContentState(): ContentState {
    return {
      hasShortForm: false,
      hasFeed: false,
      hasRecommendations: false,
      hasComments: false,
      hasAutoplay: false,
    };
  }

  applyFocusPolicy(_policy: FocusPolicy): void {
    // Generic adapter provides base no-op; specialized adapters implement site DOM hiding
  }
}
