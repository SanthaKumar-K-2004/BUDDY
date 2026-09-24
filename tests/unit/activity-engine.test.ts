import { describe, it, expect, beforeEach } from 'vitest';
import { classifyDomain, normalizeDomain, ActivityTracker } from '@buddy/activity-engine';

describe('Activity Engine - Domain Classification', () => {
  it('normalizes domain names correctly', () => {
    expect(normalizeDomain('WWW.YOUTUBE.COM:443')).toBe('youtube.com');
    expect(normalizeDomain('https://sub.domain.org')).toBe('sub.domain.org');
    expect(normalizeDomain('www.instagram.com')).toBe('instagram.com');
  });

  it('classifies standard platforms into their primary categories', () => {
    expect(classifyDomain('youtube.com')).toBe('video');
    expect(classifyDomain('instagram.com')).toBe('social');
    expect(classifyDomain('open.spotify.com')).toBe('music');
    expect(classifyDomain('theguardian.com')).toBe('news');
    expect(classifyDomain('discord.com')).toBe('gaming');
    expect(classifyDomain('amazon.com')).toBe('shopping');
    expect(classifyDomain('wikipedia.org')).toBe('education');
    expect(classifyDomain('github.com')).toBe('productivity');
    expect(classifyDomain('reddit.com')).toBe('entertainment');
    expect(classifyDomain('mail.google.com')).toBe('communication');
    expect(classifyDomain('unknown-site-12345.xyz')).toBe('other');
  });

  it('honors user custom domain category overrides', () => {
    // Override Reddit from entertainment to productivity
    const overrides = {
      'reddit.com': 'productivity' as const,
      'custom-work-hub.internal': 'productivity' as const,
    };

    expect(classifyDomain('reddit.com', overrides)).toBe('productivity');
    expect(classifyDomain('custom-work-hub.internal', overrides)).toBe('productivity');
  });
});

describe('Activity Engine - Presence & Activity Tracking', () => {
  let tracker: ActivityTracker;

  beforeEach(() => {
    tracker = new ActivityTracker('youtube.com');
  });

  it('tracks current presence and category', () => {
    expect(tracker.getCurrentCategory()).toBe('video');
    expect(tracker.getPresence()).toBe('ACTIVE');
  });

  it('updates presence states (active, inactive, visible, hidden, idle)', () => {
    tracker.setPresence('VISIBLE');
    expect(tracker.getPresence()).toBe('VISIBLE');

    tracker.setPresence('IDLE');
    expect(tracker.getPresence()).toBe('IDLE');

    tracker.setPresence('HIDDEN');
    expect(tracker.getPresence()).toBe('HIDDEN');

    tracker.setPresence('INACTIVE');
    expect(tracker.getPresence()).toBe('INACTIVE');
  });

  it('switches domain and re-evaluates category', () => {
    tracker.setDomain('github.com');
    expect(tracker.getCurrentCategory()).toBe('productivity');
  });
});
