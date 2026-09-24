/**
 * @buddy/site-adapters - core/adapter-registry.ts
 * Registry and resolver for modular site adapters with fallback.
 */

import { GenericMediaAdapter } from '../generic/generic-adapter.js';
import { YouTubeAdapter } from '../platforms/youtube/youtube-adapter.js';
import { InstagramAdapter } from '../platforms/instagram/instagram-adapter.js';
import { FacebookAdapter } from '../platforms/facebook/facebook-adapter.js';
import { SpotifyAdapter } from '../platforms/spotify/spotify-adapter.js';
import { TikTokAdapter } from '../platforms/tiktok/tiktok-adapter.js';
import { RedditAdapter } from '../platforms/reddit/reddit-adapter.js';
import { XAdapter } from '../platforms/x/x-adapter.js';
import { TwitchAdapter } from '../platforms/twitch/twitch-adapter.js';
import type { SiteAdapter } from './SiteAdapter.js';

export class AdapterRegistry {
  private adapters: SiteAdapter[] = [];
  private genericFallback: SiteAdapter = new GenericMediaAdapter();

  constructor(initialAdapters: SiteAdapter[] = []) {
    this.adapters = [...initialAdapters];
  }

  public register(adapter: SiteAdapter): void {
    const existingIndex = this.adapters.findIndex((a) => a.id === adapter.id);
    if (existingIndex >= 0) {
      this.adapters[existingIndex] = adapter;
    } else {
      this.adapters.push(adapter);
    }
  }

  public unregister(adapterId: string): void {
    this.adapters = this.adapters.filter((a) => a.id !== adapterId);
  }

  public resolve(url: URL): SiteAdapter {
    for (const adapter of this.adapters) {
      if (adapter.id !== 'generic' && adapter.matches(url)) {
        return adapter;
      }
    }
    return this.genericFallback;
  }

  public getAll(): SiteAdapter[] {
    return [...this.adapters];
  }

  public clear(): void {
    this.adapters = [];
  }
}

export function createDefaultAdapterRegistry(): AdapterRegistry {
  return new AdapterRegistry([
    new YouTubeAdapter(),
    new InstagramAdapter(),
    new FacebookAdapter(),
    new SpotifyAdapter(),
    new TikTokAdapter(),
    new RedditAdapter(),
    new XAdapter(),
    new TwitchAdapter(),
  ]);
}

export const defaultAdapterRegistry = createDefaultAdapterRegistry();
