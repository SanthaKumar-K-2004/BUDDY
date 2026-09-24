/**
 * @buddy/shared-types - events.ts
 * Strictly typed inter-extension message and event contracts.
 */

import type { ActivityEvent } from './media.js';

export type BuddyAppId =
  | 'buddy-shield'
  | 'buddy-focus'
  | 'buddy-family'
  | 'buddy-dashboard'
  | 'buddy-business';

export type BuddyEventType =
  | 'MOOD_EVENT'
  | 'BLOCK_EVENT'
  | 'WATCH_TIME_EVENT'
  | 'FOCUS_ALERT'
  | 'POLICY_UPDATE'
  | 'CONTENT_SAFETY_EVENT'
  | 'ACTIVITY_EVENT';

export interface BuddyEvent<TPayload = unknown> {
  readonly type: BuddyEventType;
  readonly schemaVersion: 1;
  readonly source: BuddyAppId;
  readonly timestamp: number;
  readonly payload: TPayload;
}

export interface MoodEventPayload {
  readonly action: string;
  readonly delta: number;
  readonly reason: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface BlockEventPayload {
  readonly domain: string;
  readonly category: 'ad' | 'tracker' | 'cosmetic' | 'malware';
  readonly count: number;
}

export interface WatchTimeEventPayload {
  readonly domain: string;
  readonly platform: string;
  readonly contentType: string;
  readonly activeSeconds: number;
  readonly isCompleted: boolean;
}

export interface FocusAlertPayload {
  readonly domain: string;
  readonly trigger: 'LIMIT_REACHED' | 'DOOMSCROLL_DETECTED' | 'BREAK_REMINDER';
  readonly thresholdPercentage?: number;
  readonly message: string;
}

export interface PolicyUpdatePayload {
  readonly policyKey: string;
  readonly value: unknown;
  readonly enforcedByOrg: boolean;
}

export interface ContentSafetyEventPayload {
  readonly domain: string;
  readonly category: 'porn' | 'hentai' | 'sexy' | 'drawing' | 'neutral';
  readonly score: number;
  readonly actionTaken: 'blurred' | 'blocked' | 'allowed';
}

export interface ActivityEventPayload {
  readonly event: ActivityEvent;
}

/** Runtime Validator for BuddyEvent */
export function isBuddyEvent(value: unknown): value is BuddyEvent<unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  const validTypes: BuddyEventType[] = [
    'MOOD_EVENT',
    'BLOCK_EVENT',
    'WATCH_TIME_EVENT',
    'FOCUS_ALERT',
    'POLICY_UPDATE',
    'CONTENT_SAFETY_EVENT',
    'ACTIVITY_EVENT',
  ];

  const validSources: BuddyAppId[] = [
    'buddy-shield',
    'buddy-focus',
    'buddy-family',
    'buddy-dashboard',
    'buddy-business',
  ];

  return (
    typeof candidate['type'] === 'string' &&
    validTypes.includes(candidate['type'] as BuddyEventType) &&
    candidate['schemaVersion'] === 1 &&
    typeof candidate['source'] === 'string' &&
    validSources.includes(candidate['source'] as BuddyAppId) &&
    typeof candidate['timestamp'] === 'number' &&
    candidate['timestamp'] > 0 &&
    candidate['payload'] !== undefined &&
    candidate['payload'] !== null
  );
}
