import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WatchTimeStateMachine } from '@buddy/watch-time';

describe('Watch-Time Precision Engine - Real Active Time vs Seeking & Rate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('distinguishes media seek (00:10 -> 15:00) from real active watch time', () => {
    const machine = new WatchTimeStateMachine({ initialState: 'IDLE' });
    machine.transition('TAB_ACTIVE');
    machine.transition('DOC_VISIBLE');
    machine.transition('MEDIA_PLAY');

    // 10 seconds of real watching
    machine.recordMediaProgress(0);
    vi.advanceTimersByTime(10000);
    machine.recordMediaProgress(10);

    expect(machine.getActiveWatchSeconds()).toBe(10);
    expect(machine.getMediaProgressSeconds()).toBe(10);

    // User seeks from 00:10 to 15:00 (900 seconds) in 1 second
    vi.advanceTimersByTime(1000);
    machine.recordMediaProgress(900); // 15:00

    // Only 11 seconds of real watch time should be registered, NOT 900s!
    expect(machine.getActiveWatchSeconds()).toBe(11);
    expect(machine.getMediaProgressSeconds()).toBe(11);
  });

  it('accurately tracks 2x and 0.5x playback rate progress vs real wall-clock time', () => {
    const machine = new WatchTimeStateMachine({ initialState: 'IDLE' });
    machine.transition('TAB_ACTIVE');
    machine.transition('DOC_VISIBLE');
    machine.transition('MEDIA_PLAY');

    // Watch for 20 seconds at 2.0x speed
    machine.setPlaybackRate(2.0);
    vi.advanceTimersByTime(20000);

    expect(machine.getActiveWatchSeconds()).toBe(20); // 20s wall-clock
    expect(machine.getMediaProgressSeconds()).toBe(40); // 40s of media watched at 2x

    // Watch for 30 seconds at 0.5x speed
    machine.setPlaybackRate(0.5);
    vi.advanceTimersByTime(30000);

    expect(machine.getActiveWatchSeconds()).toBe(50); // 20s + 30s wall-clock
    expect(machine.getMediaProgressSeconds()).toBe(55); // 40s + 15s media progress
  });

  it('handles looping media without runaway timers', () => {
    const machine = new WatchTimeStateMachine({ initialState: 'IDLE' });
    machine.transition('TAB_ACTIVE');
    machine.transition('DOC_VISIBLE');
    machine.transition('MEDIA_PLAY');

    // 15-second reel watched
    machine.recordMediaProgress(0);
    vi.advanceTimersByTime(15000);
    machine.recordMediaProgress(15);

    // Reel loops back to start (0.5s)
    machine.recordMediaProgress(0.5);
    vi.advanceTimersByTime(10000);
    machine.recordMediaProgress(10.5);

    // Real wall clock is 25s, no runaway timers
    expect(machine.getActiveWatchSeconds()).toBe(25);
    expect(machine.getMediaProgressSeconds()).toBe(25);
  });

  it('does NOT accrue active watch time when tab is hidden for video platforms', () => {
    const machine = new WatchTimeStateMachine({
      initialState: 'IDLE',
      allowBackgroundAudio: false,
    });
    machine.transition('TAB_ACTIVE');
    machine.transition('DOC_VISIBLE');
    machine.transition('MEDIA_PLAY');

    // 10s foreground watching
    vi.advanceTimersByTime(10000);
    expect(machine.getActiveWatchSeconds()).toBe(10);

    // Tab is hidden
    machine.transition('DOC_HIDDEN');
    vi.advanceTimersByTime(60000); // 60s in background

    // Active watch time must still be 10s! Background audio accrued separately
    expect(machine.getActiveWatchSeconds()).toBe(10);
    expect(machine.getBackgroundAudioSeconds()).toBe(60);
  });

  it('accrues background listening time when allowBackgroundAudio is true (e.g. Spotify)', () => {
    const machine = new WatchTimeStateMachine({
      initialState: 'IDLE',
      allowBackgroundAudio: true,
    });
    machine.transition('TAB_ACTIVE');
    machine.transition('DOC_VISIBLE');
    machine.transition('MEDIA_PLAY');

    // 15s in foreground
    vi.advanceTimersByTime(15000);
    expect(machine.getActiveWatchSeconds()).toBe(15);

    // Switch tab to background for 45s
    machine.transition('DOC_HIDDEN');
    vi.advanceTimersByTime(45000);

    // Background audio accrued 45s
    expect(machine.getBackgroundAudioSeconds()).toBe(45);
    // Media progress includes background audio for music players
    expect(machine.getMediaProgressSeconds()).toBe(60);
  });

  it('resets counters cleanly upon video or track transition', () => {
    const machine = new WatchTimeStateMachine({ initialState: 'IDLE' });
    machine.transition('TAB_ACTIVE');
    machine.transition('DOC_VISIBLE');
    machine.transition('MEDIA_PLAY');

    vi.advanceTimersByTime(30000);
    expect(machine.getActiveWatchSeconds()).toBe(30);

    machine.resetCounters();
    expect(machine.getActiveWatchSeconds()).toBe(0);
    expect(machine.getMediaProgressSeconds()).toBe(0);
  });
});
