// @vitest-environment happy-dom
/**
 * @buddy/tests - unit/site-adapters/platform-adapters.test.ts
 * Real-world unit tests for all 8 platform adapters and generic media observer.
 * Validates URL routing, DOM content queries, policy stylesheet injection,
 * real media event bindings, and lifecycle health states.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  defaultAdapterRegistry,
  GenericMediaAdapter,
  YouTubeAdapter,
  InstagramAdapter,
  FacebookAdapter,
  SpotifyAdapter,
  TikTokAdapter,
  RedditAdapter,
  XAdapter,
  TwitchAdapter,
} from '@buddy/site-adapters';

describe('Platform Site Adapters Suite', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  describe('defaultAdapterRegistry Resolution', () => {
    it('resolves YouTube URLs accurately', () => {
      expect(defaultAdapterRegistry.resolve(new URL('https://www.youtube.com/watch?v=abc'))).toBeInstanceOf(YouTubeAdapter);
      expect(defaultAdapterRegistry.resolve(new URL('https://m.youtube.com/shorts/xyz'))).toBeInstanceOf(YouTubeAdapter);
      expect(defaultAdapterRegistry.resolve(new URL('https://music.youtube.com/watch?v=123'))).toBeInstanceOf(YouTubeAdapter);
    });

    it('resolves Instagram URLs accurately', () => {
      expect(defaultAdapterRegistry.resolve(new URL('https://www.instagram.com/reels/'))).toBeInstanceOf(InstagramAdapter);
      expect(defaultAdapterRegistry.resolve(new URL('https://instagram.com/p/abc123/'))).toBeInstanceOf(InstagramAdapter);
    });

    it('resolves Facebook URLs accurately', () => {
      expect(defaultAdapterRegistry.resolve(new URL('https://www.facebook.com/reel/123'))).toBeInstanceOf(FacebookAdapter);
      expect(defaultAdapterRegistry.resolve(new URL('https://fb.com/watch/'))).toBeInstanceOf(FacebookAdapter);
    });

    it('resolves Spotify URLs accurately', () => {
      expect(defaultAdapterRegistry.resolve(new URL('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT'))).toBeInstanceOf(SpotifyAdapter);
    });

    it('resolves TikTok URLs accurately', () => {
      expect(defaultAdapterRegistry.resolve(new URL('https://www.tiktok.com/@creative/video/7192837482'))).toBeInstanceOf(TikTokAdapter);
    });

    it('resolves Reddit URLs accurately', () => {
      expect(defaultAdapterRegistry.resolve(new URL('https://www.reddit.com/r/technology/comments/123'))).toBeInstanceOf(RedditAdapter);
      expect(defaultAdapterRegistry.resolve(new URL('https://sh.reddit.com/'))).toBeInstanceOf(RedditAdapter);
    });

    it('resolves X (Twitter) URLs accurately', () => {
      expect(defaultAdapterRegistry.resolve(new URL('https://x.com/explore'))).toBeInstanceOf(XAdapter);
      expect(defaultAdapterRegistry.resolve(new URL('https://twitter.com/status/987654'))).toBeInstanceOf(XAdapter);
    });

    it('resolves Twitch URLs accurately', () => {
      expect(defaultAdapterRegistry.resolve(new URL('https://www.twitch.tv/directory'))).toBeInstanceOf(TwitchAdapter);
      expect(defaultAdapterRegistry.resolve(new URL('https://m.twitch.tv/streamer'))).toBeInstanceOf(TwitchAdapter);
    });

    it('falls back to GenericMediaAdapter for non-platform domains', () => {
      const fallback = defaultAdapterRegistry.resolve(new URL('https://vimeo.com/video/123'));
      expect(fallback).toBeInstanceOf(GenericMediaAdapter);
      expect(fallback.id).toBe('generic');
    });
  });

  describe('YouTubeAdapter', () => {
    let adapter: YouTubeAdapter;

    beforeEach(() => {
      adapter = new YouTubeAdapter();
    });

    afterEach(() => {
      adapter.destroy();
    });

    it('initializes and reports healthy status', () => {
      expect(adapter.getHealth()).toBe('inactive');
      adapter.initialize({ url: new URL('https://www.youtube.com/watch?v=test') });
      expect(adapter.getHealth()).toBe('healthy');
      expect(adapter.category).toBe('video');
    });

    it('injects scoped stylesheets when focus policies are enabled and removes them when disabled', () => {
      adapter.initialize({ url: new URL('https://www.youtube.com/watch?v=test') });

      adapter.applyFocusPolicy({
        hideShortForm: true,
        hideRecommendations: true,
        hideComments: true,
        grayscaleMedia: true,
      });

      const shortsStyle = document.getElementById('buddy-yt-shorts-policy');
      const recsStyle = document.getElementById('buddy-yt-recs-policy');
      const commentsStyle = document.getElementById('buddy-yt-comments-policy');
      const grayscaleStyle = document.getElementById('buddy-yt-grayscale-policy');

      expect(shortsStyle).not.toBeNull();
      expect(shortsStyle?.textContent).toContain('display: none !important;');
      expect(recsStyle).not.toBeNull();
      expect(commentsStyle).not.toBeNull();
      expect(grayscaleStyle?.textContent).toContain('filter: grayscale(100%)');

      // Now toggle off
      adapter.applyFocusPolicy({
        hideShortForm: false,
        hideRecommendations: false,
        hideComments: false,
        grayscaleMedia: false,
      });

      expect(document.getElementById('buddy-yt-shorts-policy')).toBeNull();
      expect(document.getElementById('buddy-yt-recs-policy')).toBeNull();
      expect(document.getElementById('buddy-yt-comments-policy')).toBeNull();
      expect(document.getElementById('buddy-yt-grayscale-policy')).toBeNull();
    });

    it('inspects DOM elements for real ContentState', () => {
      adapter.initialize({ url: new URL('https://www.youtube.com/') });

      const stateEmpty = adapter.getContentState();
      expect(stateEmpty.hasShortForm).toBe(false);
      expect(stateEmpty.hasRecommendations).toBe(false);

      // Add actual YouTube DOM markers
      const shortsDiv = document.createElement('div');
      shortsDiv.id = 'shorts-container';
      document.body.appendChild(shortsDiv);

      const recsDiv = document.createElement('div');
      recsDiv.id = 'related';
      document.body.appendChild(recsDiv);

      const commentsDiv = document.createElement('div');
      commentsDiv.id = 'comments';
      document.body.appendChild(commentsDiv);

      const statePopulated = adapter.getContentState();
      expect(statePopulated.hasShortForm).toBe(true);
      expect(statePopulated.hasRecommendations).toBe(true);
      expect(statePopulated.hasComments).toBe(true);
    });

    it('binds real HTMLMediaElement events and calculates watch session', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      adapter.initialize({ url: new URL('https://www.youtube.com/watch?v=123') });

      // Trigger real play event
      video.dispatchEvent(new Event('play'));
      const playingState = adapter.getMediaState();
      expect(playingState.isPlaying).toBe(true);

      const session = adapter.getWatchSession();
      expect(session).not.toBeNull();
      expect(session?.platform).toBe('youtube');
      expect(session?.contentType).toBe('long_form_video');
    });
  });

  describe('InstagramAdapter', () => {
    let adapter: InstagramAdapter;

    beforeEach(() => {
      adapter = new InstagramAdapter();
    });

    afterEach(() => {
      adapter.destroy();
    });

    it('applies Reels and feed focus policies via scoped stylesheets', () => {
      adapter.initialize({ url: new URL('https://www.instagram.com/reels/') });

      adapter.applyFocusPolicy({
        hideShortForm: true,
        hideSidebars: true,
        hideComments: true,
      });

      const reelsStyle = document.getElementById('buddy-ig-reels-policy');
      const feedStyle = document.getElementById('buddy-ig-feed-policy');
      const commentsStyle = document.getElementById('buddy-ig-comments-policy');

      expect(reelsStyle?.textContent).toContain('display: none !important;');
      expect(feedStyle?.textContent).toContain('display: none !important;');
      expect(commentsStyle?.textContent).toContain('display: none !important;');
    });

    it('identifies short_form content type for Reels URL', () => {
      adapter.initialize({ url: new URL('https://www.instagram.com/reels/audio/123') });
      const session = adapter.getWatchSession();
      expect(session?.contentType).toBe('short_form');
    });
  });

  describe('FacebookAdapter', () => {
    let adapter: FacebookAdapter;

    beforeEach(() => {
      adapter = new FacebookAdapter();
    });

    afterEach(() => {
      adapter.destroy();
    });

    it('applies Facebook Reels and feed focus policies', () => {
      adapter.initialize({ url: new URL('https://www.facebook.com/') });

      adapter.applyFocusPolicy({
        hideShortForm: true,
        hideSidebars: true,
        hideComments: true,
      });

      expect(document.getElementById('buddy-fb-reels-policy')).not.toBeNull();
      expect(document.getElementById('buddy-fb-feed-policy')).not.toBeNull();
      expect(document.getElementById('buddy-fb-comments-policy')).not.toBeNull();
    });
  });

  describe('SpotifyAdapter', () => {
    let adapter: SpotifyAdapter;

    beforeEach(() => {
      adapter = new SpotifyAdapter();
    });

    afterEach(() => {
      adapter.destroy();
    });

    it('observes audio element and returns music category and content type', () => {
      const audio = document.createElement('audio');
      document.body.appendChild(audio);

      adapter.initialize({ url: new URL('https://open.spotify.com/album/123') });
      expect(adapter.category).toBe('music');

      audio.dispatchEvent(new Event('play'));
      expect(adapter.getMediaState().isPlaying).toBe(true);

      const session = adapter.getWatchSession();
      expect(session?.contentType).toBe('music');
      expect(session?.platform).toBe('spotify');
    });

    it('applies recommendations hiding policy', () => {
      adapter.initialize({ url: new URL('https://open.spotify.com/') });
      adapter.applyFocusPolicy({ hideRecommendations: true });

      const style = document.getElementById('buddy-spotify-recs-policy');
      expect(style).not.toBeNull();
      expect(style?.textContent).toContain('playlist-recommended');
    });
  });

  describe('TikTokAdapter', () => {
    let adapter: TikTokAdapter;

    beforeEach(() => {
      adapter = new TikTokAdapter();
    });

    afterEach(() => {
      adapter.destroy();
    });

    it('identifies short_form content type and applies feed/comments policies', () => {
      adapter.initialize({ url: new URL('https://www.tiktok.com/@dan/video/123') });
      expect(adapter.category).toBe('social');

      adapter.applyFocusPolicy({ hideShortForm: true, hideComments: true });
      expect(document.getElementById('buddy-tiktok-feed-policy')).not.toBeNull();
      expect(document.getElementById('buddy-tiktok-comments-policy')).not.toBeNull();

      const session = adapter.getWatchSession();
      expect(session?.contentType).toBe('short_form');
    });
  });

  describe('RedditAdapter', () => {
    let adapter: RedditAdapter;

    beforeEach(() => {
      adapter = new RedditAdapter();
    });

    afterEach(() => {
      adapter.destroy();
    });

    it('targets shreddit components and applies policies', () => {
      adapter.initialize({ url: new URL('https://www.reddit.com/r/webdev') });

      adapter.applyFocusPolicy({
        hideRecommendations: true,
        hideComments: true,
        hideShortForm: true,
      });

      expect(document.getElementById('buddy-reddit-recs-policy')).not.toBeNull();
      expect(document.getElementById('buddy-reddit-comments-policy')).not.toBeNull();
      expect(document.getElementById('buddy-reddit-shortform-policy')).not.toBeNull();
    });
  });

  describe('XAdapter', () => {
    let adapter: XAdapter;

    beforeEach(() => {
      adapter = new XAdapter();
    });

    afterEach(() => {
      adapter.destroy();
    });

    it('targets X trends, comments, and grayscale', () => {
      adapter.initialize({ url: new URL('https://x.com/home') });

      adapter.applyFocusPolicy({
        hideRecommendations: true,
        hideComments: true,
        grayscaleMedia: true,
      });

      expect(document.getElementById('buddy-x-recs-policy')).not.toBeNull();
      expect(document.getElementById('buddy-x-comments-policy')).not.toBeNull();
      expect(document.getElementById('buddy-x-grayscale-policy')).not.toBeNull();
    });
  });

  describe('TwitchAdapter', () => {
    let adapter: TwitchAdapter;

    beforeEach(() => {
      adapter = new TwitchAdapter();
    });

    afterEach(() => {
      adapter.destroy();
    });

    it('targets Twitch stream and hides chat/recommendations', () => {
      adapter.initialize({ url: new URL('https://www.twitch.tv/gaming_live') });
      expect(adapter.category).toBe('gaming');

      adapter.applyFocusPolicy({
        hideRecommendations: true,
        hideComments: true,
      });

      expect(document.getElementById('buddy-twitch-recs-policy')).not.toBeNull();
      expect(document.getElementById('buddy-twitch-chat-policy')).not.toBeNull();

      const session = adapter.getWatchSession();
      expect(session?.contentType).toBe('stream');
    });
  });
});
