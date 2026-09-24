import { describe, it, expect } from 'vitest';
import { PatternDetector } from '@buddy/intelligence-engine';
import type { ActivityEvent } from '@buddy/shared-types';

describe('PatternDetector', () => {
  const detector = new PatternDetector({
    rapidReopenWindowSeconds: 60,
    siteSwitchWindowMinutes: 10,
    siteSwitchThreshold: 4,
    uninterruptedSessionThresholdMinutes: 50,
    shortFormSessionCountThreshold: 3,
    lateNightStartHour: 23,
    lateNightEndHour: 5,
  });

  it('detects rapid reopens on the same domain within window', () => {
    const baseTime = 1700000000000;
    const events: ActivityEvent[] = [
      {
        id: 'ev1',
        timestamp: baseTime,
        site: 'instagram',
        domain: 'instagram.com',
        activityType: 'feed',
        state: 'ended',
        durationMs: 30000,
      },
      {
        id: 'ev2',
        timestamp: baseTime + 20000, // 20s later
        site: 'instagram',
        domain: 'instagram.com',
        activityType: 'feed',
        state: 'started',
      },
      {
        id: 'ev3',
        timestamp: baseTime + 45000, // 25s later
        site: 'instagram',
        domain: 'instagram.com',
        activityType: 'feed',
        state: 'started',
      },
    ];

    const patterns = detector.detectRapidReopens(events);
    expect(patterns.length).toBe(1);
    expect(patterns[0]!.type).toBe('rapid_reopen');
    expect(patterns[0]!.domain).toBe('instagram.com');
    expect(patterns[0]!.occurrences).toBe(2);
    expect(patterns[0]!.evidence.length).toBeGreaterThanOrEqual(2);
  });

  it('detects frequent site switching across multiple domains', () => {
    const baseTime = 1700000000000;
    const events: ActivityEvent[] = [
      { id: '1', timestamp: baseTime, site: 'youtube', domain: 'youtube.com', activityType: 'video', state: 'active' },
      { id: '2', timestamp: baseTime + 60000, site: 'instagram', domain: 'instagram.com', activityType: 'feed', state: 'active' },
      { id: '3', timestamp: baseTime + 120000, site: 'reddit', domain: 'reddit.com', activityType: 'social', state: 'active' },
      { id: '4', timestamp: baseTime + 180000, site: 'x', domain: 'x.com', activityType: 'social', state: 'active' },
    ];

    const patterns = detector.detectSiteSwitching(events);
    expect(patterns.length).toBe(1);
    expect(patterns[0]!.type).toBe('frequent_site_switch');
    expect(patterns[0]!.occurrences).toBe(4);
    expect(patterns[0]!.evidence[0]).toContain('youtube.com → instagram.com → reddit.com → x.com');
  });

  it('detects long uninterrupted sessions exceeding threshold', () => {
    // 55 minutes active
    const pattern = detector.detectUninterruptedSession(55 * 60 * 1000, 'youtube.com');
    expect(pattern).not.toBeNull();
    expect(pattern!.type).toBe('long_uninterrupted');
    expect(pattern!.description).toContain('55 minutes');
    expect(pattern!.evidence[0]).toContain('55 minutes continuously');

    // 40 minutes (below 50m threshold)
    const below = detector.detectUninterruptedSession(40 * 60 * 1000, 'youtube.com');
    expect(below).toBeNull();
  });

  it('detects repeated short-form velocity across platforms', () => {
    const events: ActivityEvent[] = [
      { id: 's1', timestamp: 1000, site: 'youtube', domain: 'youtube.com', activityType: 'short', state: 'ended', durationMs: 45000 },
      { id: 's2', timestamp: 2000, site: 'instagram', domain: 'instagram.com', activityType: 'reel', state: 'ended', durationMs: 30000 },
      { id: 's3', timestamp: 3000, site: 'tiktok', domain: 'tiktok.com', activityType: 'short', state: 'ended', durationMs: 60000 },
    ];

    const pattern = detector.detectRepeatedShortForm(events);
    expect(pattern).not.toBeNull();
    expect(pattern!.type).toBe('repeated_short_form');
    expect(pattern!.occurrences).toBe(3);
    expect(pattern!.evidence[0]).toContain('3 short-form sessions detected');
  });

  it('detects late night browsing sessions', () => {
    // 23:30 (11:30 PM)
    const lateTime = new Date('2026-09-23T23:30:00');
    const pattern = detector.detectLateSession(lateTime, 'reddit.com');
    expect(pattern).not.toBeNull();
    expect(pattern!.type).toBe('late_session');
    expect(pattern!.domain).toBe('reddit.com');

    // 14:00 (2:00 PM)
    const daytime = new Date('2026-09-23T14:00:00');
    const dayPattern = detector.detectLateSession(daytime, 'reddit.com');
    expect(dayPattern).toBeNull();
  });
});
