import { describe, it, expect, beforeEach } from 'vitest';
import { WatchTimeStateMachine } from '@buddy/watch-time';

describe('Watch-Time State Machine - Core Transitions', () => {
  let machine: WatchTimeStateMachine;

  beforeEach(() => {
    machine = new WatchTimeStateMachine('IDLE');
  });

  it('initializes in IDLE state', () => {
    expect(machine.getState()).toBe('IDLE');
    expect(machine.getActiveWatchSeconds()).toBe(0);
    expect(machine.getBackgroundAudioSeconds()).toBe(0);
  });

  it('transitions IDLE -> ACTIVE upon tab focus or user activity', () => {
    machine.transition('TAB_ACTIVE');
    expect(machine.getState()).toBe('ACTIVE');
  });

  it('transitions ACTIVE -> MEDIA_PLAYING when media plays while tab is visible', () => {
    machine.transition('TAB_ACTIVE');
    machine.transition('DOC_VISIBLE');
    machine.transition('MEDIA_PLAY');
    expect(machine.getState()).toBe('MEDIA_PLAYING');
  });

  it('transitions MEDIA_PLAYING -> PAUSED when media pauses', () => {
    machine.transition('TAB_ACTIVE');
    machine.transition('DOC_VISIBLE');
    machine.transition('MEDIA_PLAY');
    expect(machine.getState()).toBe('MEDIA_PLAYING');

    machine.transition('MEDIA_PAUSE');
    expect(machine.getState()).toBe('PAUSED');
  });

  it('transitions PAUSED -> MEDIA_PLAYING when playback resumes', () => {
    machine.transition('TAB_ACTIVE');
    machine.transition('DOC_VISIBLE');
    machine.transition('MEDIA_PLAY');
    machine.transition('MEDIA_PAUSE');
    expect(machine.getState()).toBe('PAUSED');

    machine.transition('MEDIA_PLAY');
    expect(machine.getState()).toBe('MEDIA_PLAYING');
  });

  it('transitions MEDIA_PLAYING -> BACKGROUND when tab is hidden but media continues playing', () => {
    machine.transition('TAB_ACTIVE');
    machine.transition('DOC_VISIBLE');
    machine.transition('MEDIA_PLAY');
    expect(machine.getState()).toBe('MEDIA_PLAYING');

    machine.transition('DOC_HIDDEN');
    expect(machine.getState()).toBe('BACKGROUND');
  });

  it('transitions BACKGROUND -> MEDIA_PLAYING when document becomes visible again', () => {
    machine.transition('TAB_ACTIVE');
    machine.transition('DOC_VISIBLE');
    machine.transition('MEDIA_PLAY');
    machine.transition('DOC_HIDDEN');
    expect(machine.getState()).toBe('BACKGROUND');

    machine.transition('DOC_VISIBLE');
    expect(machine.getState()).toBe('MEDIA_PLAYING');
  });

  it('transitions MEDIA_PLAYING -> ENDED when video reaches the end', () => {
    machine.transition('TAB_ACTIVE');
    machine.transition('DOC_VISIBLE');
    machine.transition('MEDIA_PLAY');
    expect(machine.getState()).toBe('MEDIA_PLAYING');

    machine.transition('MEDIA_ENDED');
    expect(machine.getState()).toBe('ENDED');
  });

  it('notifies registered state change listeners', () => {
    const transitions: string[] = [];
    machine.onStateChange((from, to) => {
      transitions.push(`${from}->${to}`);
    });

    machine.transition('TAB_ACTIVE');
    machine.transition('MEDIA_PLAY');
    machine.transition('MEDIA_PAUSE');

    expect(transitions).toEqual([
      'IDLE->ACTIVE',
      'ACTIVE->MEDIA_PLAYING',
      'MEDIA_PLAYING->PAUSED',
    ]);
  });
});
