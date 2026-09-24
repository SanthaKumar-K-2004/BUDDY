import { describe, it, expect, beforeEach } from 'vitest';
import { AdapterRegistry, GenericMediaAdapter, type SiteAdapter } from '@buddy/site-adapters';

describe('Site Adapters Foundation - Registry & Fallback', () => {
  let registry: AdapterRegistry;

  beforeEach(() => {
    registry = new AdapterRegistry();
  });

  it('falls back to GenericMediaAdapter for unknown URLs when no custom adapters match', () => {
    const url = new URL('https://random-news-portal.org/article/123');
    const adapter = registry.resolve(url);

    expect(adapter).toBeInstanceOf(GenericMediaAdapter);
    expect(adapter.id).toBe('generic');
    expect(adapter.matches(url)).toBe(true);
  });

  it('registers and resolves a specialized site adapter for matching URLs', () => {
    const mockYouTubeAdapter: SiteAdapter = {
      id: 'youtube',
      name: 'YouTube Focus Adapter',
      category: 'video',
      matches: (url: URL) => url.hostname.includes('youtube.com'),
      initialize: () => {},
      destroy: () => {},
      getMediaState: () => ({
        isPlaying: false,
        isPaused: true,
        isMuted: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        playbackRate: 1,
        hasVideo: true,
        hasAudio: true,
      }),
      getContentState: () => ({
        hasShortForm: true,
        hasFeed: true,
        hasRecommendations: true,
        hasComments: true,
        hasAutoplay: true,
      }),
      getWatchSession: () => null,
      applyFocusPolicy: () => {},
      observe: () => {},
      stopObserving: () => {},
      getHealth: () => 'healthy' as const,
    };

    registry.register(mockYouTubeAdapter);

    const ytUrl = new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const resolved = registry.resolve(ytUrl);

    expect(resolved.id).toBe('youtube');
    expect(resolved.name).toBe('YouTube Focus Adapter');

    // Non-matching URL still falls back to generic
    const otherUrl = new URL('https://vimeo.com/12345');
    expect(registry.resolve(otherUrl).id).toBe('generic');
  });

  it('allows unregistering adapters', () => {
    const mockInstagramAdapter: SiteAdapter = {
      id: 'instagram',
      name: 'Instagram Adapter',
      category: 'social',
      matches: (url: URL) => url.hostname.includes('instagram.com'),
      initialize: () => {},
      destroy: () => {},
      getMediaState: () => ({
        isPlaying: false,
        isPaused: true,
        isMuted: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        playbackRate: 1,
        hasVideo: true,
        hasAudio: false,
      }),
      getContentState: () => ({
        hasShortForm: true,
        hasFeed: true,
        hasRecommendations: false,
        hasComments: true,
        hasAutoplay: false,
      }),
      getWatchSession: () => null,
      applyFocusPolicy: () => {},
      observe: () => {},
      stopObserving: () => {},
      getHealth: () => 'healthy' as const,
    };

    registry.register(mockInstagramAdapter);
    const instaUrl = new URL('https://www.instagram.com/reels/');
    expect(registry.resolve(instaUrl).id).toBe('instagram');

    registry.unregister('instagram');
    expect(registry.resolve(instaUrl).id).toBe('generic');
  });
});
