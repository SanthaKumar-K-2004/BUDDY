/**
 * @buddy/shared-types - family.ts
 * Type definitions for Phase 5: Local-First Family Management & Policy Enforcement.
 */

import type { PlatformCategory } from './media.js';

export type FamilyRole = 'parent' | 'child';

export interface FamilyProfile {
  readonly id: string;
  readonly role: FamilyRole;
  readonly displayName: string;
  readonly avatar?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export type ScheduleAction = 'restrict' | 'allow' | 'focus' | 'bedtime';

export interface ScheduleRule {
  readonly id: string;
  readonly name: string;
  readonly days: readonly number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  readonly startMinute: number; // 0 to 1439 (minutes since 00:00)
  readonly endMinute: number; // 0 to 1439 (may be < startMinute for overnight windows)
  readonly action: ScheduleAction;
  readonly isEnabled: boolean;
}

export interface TimeWindow {
  readonly enabled: boolean;
  readonly startMinute: number;
  readonly endMinute: number;
  readonly days?: readonly number[];
}

export interface FamilyPolicy {
  readonly id: string;
  readonly profileId: string;
  readonly blockedSites: readonly string[];
  readonly allowedSites: readonly string[];
  readonly blockedCategories: readonly PlatformCategory[];
  readonly dailyLimits: Readonly<Record<string, number>>; // e.g. "social": 45, "youtube": 60 (in minutes)
  readonly schedules: readonly ScheduleRule[];
  readonly bedtime?: TimeWindow;
  readonly studyTime?: TimeWindow;
  readonly enforceSafeSearch?: boolean;
  readonly blockExplicitMedia?: boolean;
  readonly schemaVersion: number;
  readonly updatedAt: number;
}

export type PolicyDecisionAction =
  | 'allow'
  | 'block'
  | 'warn'
  | 'limit'
  | 'pause'
  | 'request_exception';

export interface PolicyDecision {
  readonly action: PolicyDecisionAction;
  readonly reason: string;
  readonly ruleId?: string;
  readonly matchedDomain?: string;
  readonly matchedCategory?: string;
  readonly remainingMinutes?: number;
  readonly requiresPin?: boolean;
}

export type AccessRequestStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface AccessRequest {
  readonly id: string;
  readonly profileId: string;
  readonly domain: string;
  readonly requestedAt: number;
  readonly status: AccessRequestStatus;
  readonly reason?: string;
  readonly expiresAt?: number;
  readonly approvedDurationMinutes?: number;
  readonly reviewedAt?: number;
}

export interface ParentPinAuth {
  readonly hasPin: boolean;
  readonly saltHex?: string;
  readonly verifierHex?: string;
  readonly iterations?: number;
  readonly failedAttempts: number;
  readonly lockedUntil?: number;
  readonly updatedAt: number;
}

export interface FamilyState {
  readonly enabled: boolean;
  readonly activeProfileId: string | null;
  readonly profiles: readonly FamilyProfile[];
  readonly policies: Readonly<Record<string, FamilyPolicy>>;
  readonly auth: ParentPinAuth;
  readonly requests: readonly AccessRequest[];
  readonly version: number;
  readonly lastSyncTimestamp: number;
}

export interface EvaluationContext {
  readonly url: string;
  readonly domain: string;
  readonly category?: PlatformCategory;
  readonly currentTimeMs: number;
  readonly activeUsageMinutesToday?: number;
  readonly categoryUsageMinutesToday?: number;
  readonly platformUsageMinutesToday?: number;
}
