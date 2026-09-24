/**
 * @buddy/activity-engine - classifier.ts
 * 11-category domain classification with user override support.
 */

import type { PlatformCategory } from '@buddy/shared-types';

export const BUILT_IN_DOMAIN_MAP: Record<string, PlatformCategory> = {
  // Social
  'instagram.com': 'social',
  'facebook.com': 'social',
  'x.com': 'social',
  'twitter.com': 'social',
  'tiktok.com': 'social',
  'linkedin.com': 'social',
  'pinterest.com': 'social',
  'threads.net': 'social',
  'snapchat.com': 'social',

  // Video
  'youtube.com': 'video',
  'youtu.be': 'video',
  'twitch.tv': 'video',
  'vimeo.com': 'video',
  'netflix.com': 'video',
  'dailymotion.com': 'video',

  // Music
  'spotify.com': 'music',
  'soundcloud.com': 'music',
  'music.apple.com': 'music',
  'deezer.com': 'music',

  // News
  'theguardian.com': 'news',
  'bbc.com': 'news',
  'reuters.com': 'news',
  'nytimes.com': 'news',
  'techcrunch.com': 'news',
  'theverge.com': 'news',

  // Gaming
  'discord.com': 'gaming',
  'roblox.com': 'gaming',
  'store.steampowered.com': 'gaming',
  'chess.com': 'gaming',

  // Shopping
  'amazon.com': 'shopping',
  'amazon.in': 'shopping',
  'ebay.com': 'shopping',
  'flipkart.com': 'shopping',
  'walmart.com': 'shopping',

  // Education
  'coursera.org': 'education',
  'edx.org': 'education',
  'khanacademy.org': 'education',
  'wikipedia.org': 'education',
  'stackoverflow.com': 'education',
  'developer.mozilla.org': 'education',

  // Productivity
  'github.com': 'productivity',
  'notion.so': 'productivity',
  'docs.google.com': 'productivity',
  'linear.app': 'productivity',
  'jira.atlassian.com': 'productivity',

  // Entertainment
  'reddit.com': 'entertainment',
  '9gag.com': 'entertainment',
  'imgur.com': 'entertainment',

  // Communication
  'mail.google.com': 'communication',
  'outlook.com': 'communication',
  'web.whatsapp.com': 'communication',
  'web.telegram.org': 'communication',
};

export function normalizeDomain(hostnameOrUrl: string): string {
  let cleaned = hostnameOrUrl.toLowerCase().trim();
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      cleaned = new URL(cleaned).hostname;
    } catch {
      cleaned = cleaned.replace(/^https?:\/\//, '');
    }
  }
  // Remove port if present
  if (cleaned.includes(':')) {
    cleaned = cleaned.split(':')[0] ?? cleaned;
  }
  // Remove path if present (e.g. sub.domain.org/path)
  if (cleaned.includes('/')) {
    cleaned = cleaned.split('/')[0] ?? cleaned;
  }
  // Remove leading www.
  if (cleaned.startsWith('www.')) {
    cleaned = cleaned.slice(4);
  }
  return cleaned;
}

export function classifyDomain(
  hostname: string,
  userOverrides: Record<string, PlatformCategory> = {}
): PlatformCategory {
  const domain = normalizeDomain(hostname);

  // 1. User overrides take precedence
  if (userOverrides[domain]) {
    return userOverrides[domain];
  }

  // 2. Direct match in built-in map
  if (BUILT_IN_DOMAIN_MAP[domain]) {
    return BUILT_IN_DOMAIN_MAP[domain];
  }

  // 3. Match base root domain (e.g. sub.domain.com -> domain.com)
  const parts = domain.split('.');
  if (parts.length > 2) {
    const root = parts.slice(-2).join('.');
    if (userOverrides[root]) {
      return userOverrides[root];
    }
    if (BUILT_IN_DOMAIN_MAP[root]) {
      return BUILT_IN_DOMAIN_MAP[root];
    }
  }

  return 'other';
}
