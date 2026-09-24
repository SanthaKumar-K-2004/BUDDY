import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UniversalActivityEngine } from '@buddy/activity-engine';
import type { ActivityEvent } from '@buddy/shared-types';

describe('Phase 6 - Universal Activity Engine', () => {
  let engine: UniversalActivityEngine;
  let receivedEvents: ActivityEvent[];

  beforeEach(() => {
    receivedEvents = [];
    engine = new UniversalActivityEngine({
      inactivityThresholdSeconds: 30,
      onEvent: (evt) => {
        receivedEvents.push(evt);
      },
    });
  });

  it('starts a session with sanitized URL and emits started event', () => {
    const rawUrl = new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=twitter&token=secretToken123');
    const startEvent = engine.startSession(rawUrl, 1000);

    expect(startEvent.state).toBe('started');
    expect(startEvent.platform).toBe('youtube');
    expect(startEvent.domain).toBe('youtube.com');
    expect(startEvent.activityType).toBe('video');
    expect(startEvent.metadata?.cleanUrl).toBe('https://www.youtube.com/watch');
    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0]?.id).toBe(startEvent.id);
  });

  it('accrues active duration during visible user activity', () => {
    const rawUrl = new URL('https://www.youtube.com/watch?v=123');
    engine.startSession(rawUrl, 1000);

    const tick1 = engine.tick(6000, true, true); // +5s
    expect(tick1).not.toBeNull();
    expect(tick1?.state).toBe('active');
    expect(tick1?.durationMs).toBe(5000);

    const tick2 = engine.tick(16000, true, true); // +10s
    expect(tick2?.durationMs).toBe(15000);
  });

  it('transitions to paused when tab becomes hidden', () => {
    const rawUrl = new URL('https://www.instagram.com/reels/xyz123/');
    engine.startSession(rawUrl, 1000);

    engine.tick(6000, true, true);
    expect(engine.getCurrentSession()?.state).toBe('active');

    // Tab becomes hidden
    const pauseEvt = engine.tick(10000, false, false);
    expect(pauseEvt?.state).toBe('paused');
    expect(engine.getCurrentSession()?.state).toBe('paused');
  });

  it('transitions to paused when user is idle beyond threshold without media playing', () => {
    const rawUrl = new URL('https://reddit.com/r/technology');
    engine.startSession(rawUrl, 1000);

    engine.tick(5000, true, true); // Active at t=5000

    // 40s pass with no user activity and no media playing
    const idleEvt = engine.tick(45000, true, false);
    expect(idleEvt?.state).toBe('paused');
    expect(engine.getCurrentSession()?.state).toBe('paused');
  });

  it('resumes from paused state cleanly when user activity resumes', () => {
    const rawUrl = new URL('https://reddit.com/r/technology');
    engine.startSession(rawUrl, 1000);
    engine.tick(5000, true, true);
    engine.pauseSession(10000);

    expect(engine.getCurrentSession()?.state).toBe('paused');

    const resumeEvt = engine.resumeSession(15000);
    expect(resumeEvt?.state).toBe('active');
    expect(engine.getCurrentSession()?.state).toBe('active');
  });

  it('finalizes active activity upon endSession', () => {
    const rawUrl = new URL('https://open.spotify.com/track/123');
    engine.startSession(rawUrl, 1000);
    engine.tick(11000, true, true);

    const endEvt = engine.endSession(11000);
    expect(endEvt?.state).toBe('ended');
    expect(endEvt?.durationMs).toBe(10000);
    expect(endEvt?.activityType).toBe('music');
    expect(engine.getCurrentSession()).toBeNull();
  });

  it('safely recovers crashed sessions with conservative duration caps', () => {
    const crashedSession = {
      sessionId: 'crashed-yt-session',
      domain: 'youtube.com',
      platform: 'youtube' as const,
      activityType: 'video' as const,
      category: 'video' as const,
      totalActiveDurationMs: 60000, // 1 minute recorded
    };

    const recoveryEvt = engine.recoverCrashedSession(crashedSession, 500000);
    expect(recoveryEvt.state).toBe('ended');
    expect(recoveryEvt.durationMs).toBe(90000); // capped at 60s + 30s buffer
    expect(recoveryEvt.metadata?.recoveredFromCrash).toBe(true);
  });

  it('buffers events and empties buffer on flush', () => {
    const rawUrl = new URL('https://www.tiktok.com/@user/video/123');
    engine.startSession(rawUrl, 1000);
    engine.tick(6000, true, true);

    const buffered = engine.getBufferedEvents();
    expect(buffered.length).toBeGreaterThanOrEqual(2);

    const flushed = engine.flush();
    expect(flushed).toEqual(buffered);
    expect(engine.getBufferedEvents()).toHaveLength(0);
  });
});
