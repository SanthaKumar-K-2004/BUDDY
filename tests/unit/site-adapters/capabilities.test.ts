import { describe, it, expect, beforeEach } from 'vitest';
import {
  YouTubeAdapter,
  InstagramAdapter,
  FacebookAdapter,
  SpotifyAdapter,
  TikTokAdapter,
  RedditAdapter,
  XAdapter,
  TwitchAdapter,
  GenericMediaAdapter,
  BaseSiteAdapter,
} from '@buddy/site-adapters';

describe('Phase 6 - Universal Site Capabilities & Activity Detection', () => {
  let yt: YouTubeAdapter;
  let ig: InstagramAdapter;
  let fb: FacebookAdapter;
  let spotify: SpotifyAdapter;
  let tiktok: TikTokAdapter;
  let reddit: RedditAdapter;
  let x: XAdapter;
  let twitch: TwitchAdapter;
  let generic: GenericMediaAdapter;

  beforeEach(() => {
    yt = new YouTubeAdapter();
    ig = new InstagramAdapter();
    fb = new FacebookAdapter();
    spotify = new SpotifyAdapter();
    tiktok = new TikTokAdapter();
    reddit = new RedditAdapter();
    x = new XAdapter();
    twitch = new TwitchAdapter();
    generic = new GenericMediaAdapter();
  });

  describe('Explicit Site Capabilities', () => {
    it('declares verified YouTube capabilities', () => {
      expect(yt.capabilities.video).toBe(true);
      expect(yt.capabilities.shortVideo).toBe(true);
      expect(yt.capabilities.reels).toBe(false);
      expect(yt.capabilities.music).toBe(false);
      expect(yt.capabilities.watchTime).toBe(true);
      expect(yt.capabilities.ads).toBe(true);
      expect(yt.capabilities.trackers).toBe(true);
      expect(yt.capabilities.feed).toBe(true);
    });

    it('declares verified Instagram capabilities', () => {
      expect(ig.capabilities.video).toBe(true);
      expect(ig.capabilities.shortVideo).toBe(true);
      expect(ig.capabilities.reels).toBe(true);
      expect(ig.capabilities.music).toBe(false);
      expect(ig.capabilities.feed).toBe(true);
      expect(ig.capabilities.watchTime).toBe(true);
    });

    it('declares verified Facebook capabilities', () => {
      expect(fb.capabilities.video).toBe(true);
      expect(fb.capabilities.shortVideo).toBe(true);
      expect(fb.capabilities.reels).toBe(true);
      expect(fb.capabilities.feed).toBe(true);
      expect(fb.capabilities.watchTime).toBe(true);
    });

    it('declares verified Spotify capabilities', () => {
      expect(spotify.capabilities.music).toBe(true);
      expect(spotify.capabilities.video).toBe(false);
      expect(spotify.capabilities.shortVideo).toBe(false);
      expect(spotify.capabilities.reels).toBe(false);
      expect(spotify.capabilities.watchTime).toBe(true);
      expect(spotify.capabilities.sessionTime).toBe(true);
    });

    it('declares verified TikTok capabilities', () => {
      expect(tiktok.capabilities.shortVideo).toBe(true);
      expect(tiktok.capabilities.video).toBe(true);
      expect(tiktok.capabilities.reels).toBe(false);
      expect(tiktok.capabilities.feed).toBe(true);
    });

    it('declares conservative generic fallback capabilities', () => {
      expect(generic.capabilities.ads).toBe(false);
      expect(generic.capabilities.shortVideo).toBe(false);
      expect(generic.capabilities.reels).toBe(false);
      expect(generic.capabilities.music).toBe(false);
      expect(generic.capabilities.sessionTime).toBe(true);
      expect(generic.capabilities.watchTime).toBe(true);
    });
  });

  describe('Activity Detection Across Sites', () => {
    it('classifies YouTube Shorts vs standard Video from URL signals', () => {
      yt.initialize({ url: new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ') });
      const standardDetection = yt.detectActivity();
      expect(standardDetection?.activityType).toBe('video');
      expect(standardDetection?.isShortForm).toBe(false);

      yt.destroy();
      yt.initialize({ url: new URL('https://www.youtube.com/shorts/abcdef123') });
      const shortsDetection = yt.detectActivity();
      expect(shortsDetection?.activityType).toBe('short');
      expect(shortsDetection?.isShortForm).toBe(true);
    });

    it('classifies Instagram Reels vs Feed/Page', () => {
      ig.initialize({ url: new URL('https://www.instagram.com/p/feeditem123/') });
      const feedDetection = ig.detectActivity();
      expect(feedDetection?.isShortForm).toBe(false);

      ig.destroy();
      ig.initialize({ url: new URL('https://www.instagram.com/reels/xyz789/') });
      const reelDetection = ig.detectActivity();
      expect(reelDetection?.activityType).toBe('reel');
      expect(reelDetection?.isShortForm).toBe(true);
    });

    it('classifies Facebook Reels vs Standard', () => {
      fb.initialize({ url: new URL('https://www.facebook.com/reel/123456789') });
      const fbReelDetection = fb.detectActivity();
      expect(fbReelDetection?.activityType).toBe('reel');
      expect(fbReelDetection?.isShortForm).toBe(true);
    });

    it('classifies Spotify as music playback', () => {
      spotify.initialize({ url: new URL('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT') });
      const musicDetection = spotify.detectActivity();
      expect(musicDetection?.activityType).toBe('music');
      expect(musicDetection?.category).toBe('music');
    });

    it('classifies TikTok as short-form', () => {
      tiktok.initialize({ url: new URL('https://www.tiktok.com/@user/video/72123456789') });
      const tiktokDetection = tiktok.detectActivity();
      expect(tiktokDetection?.activityType).toBe('short');
      expect(tiktokDetection?.isShortForm).toBe(true);
    });
  });

  describe('URL Sanitization & Privacy', () => {
    it('strips tracking parameters, tokens, and session identifiers from URLs', () => {
      const rawUrl = new URL(
        'https://example.com/watch?v=123&utm_source=twitter&utm_medium=social&fbclid=IwAR123&token=secret123&sessionid=sess456&cleanParam=keepMe'
      );
      const cleanUrl = BaseSiteAdapter.sanitizeUrl(rawUrl);

      expect(cleanUrl.searchParams.get('v')).toBe('123');
      expect(cleanUrl.searchParams.get('cleanParam')).toBe('keepMe');
      expect(cleanUrl.searchParams.has('utm_source')).toBe(false);
      expect(cleanUrl.searchParams.has('utm_medium')).toBe(false);
      expect(cleanUrl.searchParams.has('fbclid')).toBe(false);
      expect(cleanUrl.searchParams.has('token')).toBe(false);
      expect(cleanUrl.searchParams.has('sessionid')).toBe(false);
    });
  });
});
