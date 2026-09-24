import { describe, it, expect } from 'vitest';
import { isBuddyEvent, isValidManagedPolicy, type BuddyEvent } from '@buddy/shared-types';

describe('Shared Types - Event Validation', () => {
  it('validates a correct BuddyEvent', () => {
    const validEvent: BuddyEvent<{ delta: number; reason: string }> = {
      type: 'MOOD_EVENT',
      schemaVersion: 1,
      source: 'buddy-shield',
      timestamp: Date.now(),
      payload: {
        delta: 2,
        reason: 'Blocked 5 trackers',
      },
    };

    expect(isBuddyEvent(validEvent)).toBe(true);
  });

  it('rejects an event with missing schemaVersion or incorrect version', () => {
    const invalidVersion = {
      type: 'MOOD_EVENT',
      schemaVersion: 2,
      source: 'buddy-shield',
      timestamp: Date.now(),
      payload: {},
    };
    expect(isBuddyEvent(invalidVersion)).toBe(false);
  });

  it('rejects an event with unknown event type', () => {
    const invalidType = {
      type: 'UNKNOWN_CUSTOM_EVENT',
      schemaVersion: 1,
      source: 'buddy-shield',
      timestamp: Date.now(),
      payload: {},
    };
    expect(isBuddyEvent(invalidType)).toBe(false);
  });

  it('rejects an event with invalid source application', () => {
    const invalidSource = {
      type: 'BLOCK_EVENT',
      schemaVersion: 1,
      source: 'malicious-extension-id',
      timestamp: Date.now(),
      payload: {},
    };
    expect(isBuddyEvent(invalidSource)).toBe(false);
  });

  it('rejects null or non-object payloads', () => {
    expect(isBuddyEvent(null)).toBe(false);
    expect(isBuddyEvent(undefined)).toBe(false);
    expect(isBuddyEvent('string-event')).toBe(false);
    expect(isBuddyEvent(42)).toBe(false);
  });
});

describe('Shared Types - Enterprise Policy Validation', () => {
  it('accepts a valid managed policy', () => {
    const policy = {
      org_id: 'enterprise-org-123',
      enforce_shield: true,
      enforce_focus_youtube: true,
      youtube_max_session_minutes: 30,
    };
    expect(isValidManagedPolicy(policy)).toBe(true);
  });

  it('rejects an invalid policy with incorrect types', () => {
    const badPolicy = {
      org_id: 12345, // should be string
    };
    expect(isValidManagedPolicy(badPolicy)).toBe(false);
  });
});
