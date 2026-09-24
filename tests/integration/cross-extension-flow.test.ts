import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isBuddyEvent, type BuddyEvent, type MoodEventPayload } from '@buddy/shared-types';
import { MemoryStorageAdapter } from '@buddy/storage';
import { MoodEngine } from '@buddy/mood-engine';

describe('Integration - Cross-Extension Communication & State Flow', () => {
  let storage: MemoryStorageAdapter;
  let moodEngine: MoodEngine;
  const ALLOWED_EXTENSION_IDS = ['buddy-shield', 'buddy-focus', 'buddy-family'];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-22T14:00:00Z')); // 2 PM daytime
    storage = new MemoryStorageAdapter();
    moodEngine = new MoodEngine({ score: 50.0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Simulated Background Listener
  async function handleExternalMessage(
    message: unknown,
    senderId: string
  ): Promise<{ status: string; newScore?: number }> {
    // 1. Sender validation
    if (!ALLOWED_EXTENSION_IDS.includes(senderId)) {
      return { status: 'REJECTED_UNAUTHORIZED_SENDER' };
    }

    // 2. Event schema validation
    if (!isBuddyEvent(message)) {
      return { status: 'MALFORMED_EVENT' };
    }

    // 3. Process event & update state
    if (message.type === 'MOOD_EVENT') {
      const payload = message.payload as MoodEventPayload;
      moodEngine.applyStimulus(payload.delta, payload.reason, message.source as 'buddy-shield');
      const updatedState = moodEngine.getState();
      await storage.set('moodState', updatedState);
      return { status: 'ACCEPTED', newScore: updatedState.score };
    }

    return { status: 'IGNORED_EVENT_TYPE' };
  }

  it('processes a valid event from buddy-shield and updates pet mood in storage', async () => {
    const validEvent: BuddyEvent<MoodEventPayload> = {
      type: 'MOOD_EVENT',
      schemaVersion: 1,
      source: 'buddy-shield',
      timestamp: Date.now(),
      payload: {
        action: 'BLOCK_SESSION',
        delta: 2.0,
        reason: 'Blocked 12 tracking requests',
      },
    };

    const response = await handleExternalMessage(validEvent, 'buddy-shield');
    expect(response.status).toBe('ACCEPTED');
    expect(response.newScore).toBe(52.0);

    // Verify storage reflects new mood state
    const storedMood = await storage.get('moodState');
    expect(storedMood.score).toBe(52.0);
  });

  it('rejects an event from an unauthorized sender extension ID', async () => {
    const validEvent: BuddyEvent<MoodEventPayload> = {
      type: 'MOOD_EVENT',
      schemaVersion: 1,
      source: 'buddy-shield',
      timestamp: Date.now(),
      payload: {
        action: 'BLOCK_SESSION',
        delta: 2.0,
        reason: 'Blocked 12 trackers',
      },
    };

    const response = await handleExternalMessage(validEvent, 'unauthorized-malicious-id');
    expect(response.status).toBe('REJECTED_UNAUTHORIZED_SENDER');
    expect(moodEngine.getScore()).toBe(50.0);
  });

  it('rejects a malformed event missing required fields', async () => {
    const malformedEvent = {
      type: 'MOOD_EVENT',
      schemaVersion: 99, // Invalid version
      source: 'buddy-shield',
    };

    const response = await handleExternalMessage(malformedEvent, 'buddy-shield');
    expect(response.status).toBe('MALFORMED_EVENT');
    expect(moodEngine.getScore()).toBe(50.0);
  });

  it('handles negative stimulus from buddy-focus on doomscrolling and reflects in storage', async () => {
    const doomscrollEvent: BuddyEvent<MoodEventPayload> = {
      type: 'MOOD_EVENT',
      schemaVersion: 1,
      source: 'buddy-focus',
      timestamp: Date.now(),
      payload: {
        action: 'DOOMSCROLL_DETECTED',
        delta: -8.0,
        reason: 'Continuous Shorts swiping detected',
      },
    };

    const response = await handleExternalMessage(doomscrollEvent, 'buddy-focus');
    expect(response.status).toBe('ACCEPTED');
    expect(response.newScore).toBe(42.0);

    const storedMood = await storage.get('moodState');
    expect(storedMood.score).toBe(42.0);
    expect(storedMood.visualState).toBe('neutral'); // 41-60 is neutral
  });
});
