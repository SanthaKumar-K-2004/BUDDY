/**
 * @buddy/family-engine - family-manager.ts
 * High-level orchestration for Family Profiles, Policies, Access Requests, and Local State.
 */

import type {
  AccessRequest,
  FamilyPolicy,
  FamilyProfile,
  FamilyRole,
  FamilyState,
  ParentPinAuth,
} from '@buddy/shared-types';
import { createInitialAuth } from './pin-authenticator.js';
import { normalizeDomain } from './domain-normalizer.js';

export const CURRENT_FAMILY_SCHEMA_VERSION = 1;

/**
 * Returns a blank, valid, unconfigured initial state for fresh installations.
 */
export function getInitialFamilyState(): FamilyState {
  return {
    enabled: false,
    activeProfileId: null,
    profiles: [],
    policies: {},
    auth: createInitialAuth(),
    requests: [],
    version: CURRENT_FAMILY_SCHEMA_VERSION,
    lastSyncTimestamp: Date.now(),
  };
}

/**
 * Validates and safely migrates/recovers an arbitrary storage object into a valid FamilyState.
 */
export function validateFamilyState(data: unknown): FamilyState {
  const fallback = getInitialFamilyState();
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const raw = data as Record<string, unknown>;

  const enabled = typeof raw['enabled'] === 'boolean' ? raw['enabled'] : false;
  const activeProfileId = typeof raw['activeProfileId'] === 'string' ? raw['activeProfileId'] : null;

  // Validate profiles
  const profiles: FamilyProfile[] = [];
  if (Array.isArray(raw['profiles'])) {
    for (const p of raw['profiles']) {
      if (
        p &&
        typeof p === 'object' &&
        typeof p['id'] === 'string' &&
        (p['role'] === 'parent' || p['role'] === 'child') &&
        typeof p['displayName'] === 'string'
      ) {
        profiles.push({
          id: p['id'],
          role: p['role'],
          displayName: p['displayName'],
          avatar: typeof p['avatar'] === 'string' ? p['avatar'] : undefined,
          createdAt: typeof p['createdAt'] === 'number' ? p['createdAt'] : Date.now(),
          updatedAt: typeof p['updatedAt'] === 'number' ? p['updatedAt'] : Date.now(),
        });
      }
    }
  }

  // Validate policies
  const policies: Record<string, FamilyPolicy> = {};
  if (raw['policies'] && typeof raw['policies'] === 'object') {
    const rawPolicies = raw['policies'] as Record<string, unknown>;
    for (const [profId, pol] of Object.entries(rawPolicies)) {
      if (pol && typeof pol === 'object') {
        const pObj = pol as Record<string, unknown>;
        policies[profId] = {
          id: typeof pObj['id'] === 'string' ? pObj['id'] : `pol_${profId}`,
          profileId: profId,
          blockedSites: Array.isArray(pObj['blockedSites']) ? (pObj['blockedSites'] as string[]) : [],
          allowedSites: Array.isArray(pObj['allowedSites']) ? (pObj['allowedSites'] as string[]) : [],
          blockedCategories: Array.isArray(pObj['blockedCategories'])
            ? (pObj['blockedCategories'] as any[])
            : [],
          dailyLimits:
            pObj['dailyLimits'] && typeof pObj['dailyLimits'] === 'object'
              ? (pObj['dailyLimits'] as Record<string, number>)
              : {},
          schedules: Array.isArray(pObj['schedules']) ? (pObj['schedules'] as any[]) : [],
          bedtime: pObj['bedtime'] ? (pObj['bedtime'] as any) : undefined,
          studyTime: pObj['studyTime'] ? (pObj['studyTime'] as any) : undefined,
          enforceSafeSearch: typeof pObj['enforceSafeSearch'] === 'boolean' ? pObj['enforceSafeSearch'] : true,
          blockExplicitMedia: typeof pObj['blockExplicitMedia'] === 'boolean' ? pObj['blockExplicitMedia'] : true,
          schemaVersion: typeof pObj['schemaVersion'] === 'number' ? pObj['schemaVersion'] : 1,
          updatedAt: typeof pObj['updatedAt'] === 'number' ? pObj['updatedAt'] : Date.now(),
        };
      }
    }
  }

  // Validate auth
  let auth = fallback.auth;
  if (raw['auth'] && typeof raw['auth'] === 'object') {
    const rAuth = raw['auth'] as Record<string, unknown>;
    auth = {
      hasPin: typeof rAuth['hasPin'] === 'boolean' ? rAuth['hasPin'] : false,
      saltHex: typeof rAuth['saltHex'] === 'string' ? rAuth['saltHex'] : undefined,
      verifierHex: typeof rAuth['verifierHex'] === 'string' ? rAuth['verifierHex'] : undefined,
      iterations: typeof rAuth['iterations'] === 'number' ? rAuth['iterations'] : undefined,
      failedAttempts: typeof rAuth['failedAttempts'] === 'number' ? rAuth['failedAttempts'] : 0,
      lockedUntil: typeof rAuth['lockedUntil'] === 'number' ? rAuth['lockedUntil'] : undefined,
      updatedAt: typeof rAuth['updatedAt'] === 'number' ? rAuth['updatedAt'] : Date.now(),
    };
  }

  // Validate requests
  const requests: AccessRequest[] = [];
  if (Array.isArray(raw['requests'])) {
    for (const r of raw['requests']) {
      if (
        r &&
        typeof r === 'object' &&
        typeof r['id'] === 'string' &&
        typeof r['profileId'] === 'string' &&
        typeof r['domain'] === 'string'
      ) {
        requests.push({
          id: r['id'],
          profileId: r['profileId'],
          domain: r['domain'],
          requestedAt: typeof r['requestedAt'] === 'number' ? r['requestedAt'] : Date.now(),
          status: ['pending', 'approved', 'denied', 'expired'].includes(r['status'])
            ? r['status']
            : 'pending',
          reason: typeof r['reason'] === 'string' ? r['reason'] : undefined,
          expiresAt: typeof r['expiresAt'] === 'number' ? r['expiresAt'] : undefined,
          approvedDurationMinutes:
            typeof r['approvedDurationMinutes'] === 'number' ? r['approvedDurationMinutes'] : undefined,
          reviewedAt: typeof r['reviewedAt'] === 'number' ? r['reviewedAt'] : undefined,
        });
      }
    }
  }

  return {
    enabled,
    activeProfileId,
    profiles,
    policies,
    auth,
    requests,
    version: CURRENT_FAMILY_SCHEMA_VERSION,
    lastSyncTimestamp: Date.now(),
  };
}

/**
 * Creates a default sensible policy for a profile.
 */
export function createDefaultPolicy(profileId: string, role: FamilyRole = 'child'): FamilyPolicy {
  const isChild = role === 'child';
  return {
    id: `policy_${profileId}_${Date.now()}`,
    profileId,
    blockedSites: [],
    allowedSites: [],
    blockedCategories: isChild ? ['adult' as any] : [],
    dailyLimits: isChild ? { social: 60, video: 90 } : {},
    schedules: [],
    bedtime: isChild
      ? {
          enabled: true,
          startMinute: 22 * 60, // 22:00 (10:00 PM)
          endMinute: 6 * 60, // 06:00 (6:00 AM)
          days: [0, 1, 2, 3, 4, 5, 6],
        }
      : undefined,
    studyTime: isChild
      ? {
          enabled: false,
          startMinute: 16 * 60, // 16:00 (4:00 PM)
          endMinute: 18 * 60, // 18:00 (6:00 PM)
          days: [1, 2, 3, 4, 5],
        }
      : undefined,
    enforceSafeSearch: isChild,
    blockExplicitMedia: isChild,
    schemaVersion: CURRENT_FAMILY_SCHEMA_VERSION,
    updatedAt: Date.now(),
  };
}

/**
 * Adds a new profile to FamilyState and initializes its policy.
 */
export function createProfile(
  state: FamilyState,
  role: FamilyRole,
  displayName: string,
  avatar?: string
): { state: FamilyState; profile: FamilyProfile } {
  const now = Date.now();
  const id = `profile_${role}_${now}_${Math.floor(Math.random() * 1000)}`;

  const profile: FamilyProfile = {
    id,
    role,
    displayName: displayName.trim() || (role === 'parent' ? 'Parent' : 'Child'),
    avatar,
    createdAt: now,
    updatedAt: now,
  };

  const policy = createDefaultPolicy(id, role);

  const updatedProfiles = [...state.profiles, profile];
  const updatedPolicies = { ...state.policies, [id]: policy };

  const updatedState: FamilyState = {
    ...state,
    enabled: true,
    activeProfileId: state.activeProfileId ?? id,
    profiles: updatedProfiles,
    policies: updatedPolicies,
    lastSyncTimestamp: now,
  };

  return { state: updatedState, profile };
}

/**
 * Updates an existing profile's details.
 */
export function updateProfile(
  state: FamilyState,
  profileId: string,
  updates: Partial<FamilyProfile>
): FamilyState {
  const now = Date.now();
  const updatedProfiles = state.profiles.map((p) =>
    p.id === profileId
      ? {
          ...p,
          ...updates,
          id: p.id, // Immutable ID
          role: updates.role ?? p.role,
          updatedAt: now,
        }
      : p
  );

  return {
    ...state,
    profiles: updatedProfiles,
    lastSyncTimestamp: now,
  };
}

/**
 * Deletes a profile, its policy, and pending requests.
 */
export function deleteProfile(state: FamilyState, profileId: string): FamilyState {
  const now = Date.now();
  const updatedProfiles = state.profiles.filter((p) => p.id !== profileId);
  const updatedPolicies = { ...state.policies };
  delete updatedPolicies[profileId];

  const updatedRequests = state.requests.filter((r) => r.profileId !== profileId);
  const activeProfileId =
    state.activeProfileId === profileId
      ? updatedProfiles[0]?.id ?? null
      : state.activeProfileId;

  return {
    ...state,
    activeProfileId,
    profiles: updatedProfiles,
    policies: updatedPolicies,
    requests: updatedRequests,
    lastSyncTimestamp: now,
  };
}

/**
 * Sets the active profile (e.g. child mode or parent mode).
 */
export function setActiveProfile(state: FamilyState, profileId: string | null): FamilyState {
  return {
    ...state,
    activeProfileId: profileId,
    lastSyncTimestamp: Date.now(),
  };
}

/**
 * Updates policy configuration for a specific profile.
 */
export function updatePolicy(
  state: FamilyState,
  profileId: string,
  updates: Partial<FamilyPolicy>
): FamilyState {
  const existingPolicy = state.policies[profileId] || createDefaultPolicy(profileId);
  const now = Date.now();

  const updatedPolicy: FamilyPolicy = {
    ...existingPolicy,
    ...updates,
    profileId,
    updatedAt: now,
  };

  return {
    ...state,
    policies: {
      ...state.policies,
      [profileId]: updatedPolicy,
    },
    lastSyncTimestamp: now,
  };
}

/**
 * Submits an access request for a blocked domain on behalf of a child profile.
 */
export function createAccessRequest(
  state: FamilyState,
  profileId: string,
  domain: string,
  reason?: string,
  nowMs: number = Date.now()
): { state: FamilyState; request: AccessRequest } {
  const normDomain = normalizeDomain(domain);
  const id = `req_${profileId}_${normDomain}_${nowMs}`;

  const request: AccessRequest = {
    id,
    profileId,
    domain: normDomain,
    requestedAt: nowMs,
    status: 'pending',
    reason,
  };

  // Prevent duplicate pending requests for the exact same domain
  const existingPending = state.requests.filter(
    (r) => !(r.profileId === profileId && r.domain === normDomain && r.status === 'pending')
  );

  const updatedState: FamilyState = {
    ...state,
    requests: [...existingPending, request],
    lastSyncTimestamp: nowMs,
  };

  return { state: updatedState, request };
}

/**
 * Reviews (approves or denies) an access request.
 * If approved, sets expiresAt based on durationMinutes (e.g. 15, 30, 60 minutes).
 */
export function reviewAccessRequest(
  state: FamilyState,
  requestId: string,
  decision: 'approved' | 'denied',
  durationMinutes: number = 30,
  nowMs: number = Date.now()
): FamilyState {
  const expiresAt = decision === 'approved' ? nowMs + durationMinutes * 60 * 1000 : undefined;

  const updatedRequests = state.requests.map((r) =>
    r.id === requestId
      ? {
          ...r,
          status: decision,
          reviewedAt: nowMs,
          approvedDurationMinutes: decision === 'approved' ? durationMinutes : undefined,
          expiresAt,
        }
      : r
  );

  return {
    ...state,
    requests: updatedRequests,
    lastSyncTimestamp: nowMs,
  };
}

/**
 * Marks expired approved requests as 'expired'.
 */
export function cleanupExpiredRequests(state: FamilyState, nowMs: number = Date.now()): FamilyState {
  let changed = false;
  const updatedRequests = state.requests.map((r) => {
    if (r.status === 'approved' && r.expiresAt !== undefined && r.expiresAt <= nowMs) {
      changed = true;
      return { ...r, status: 'expired' as const };
    }
    return r;
  });

  if (!changed) return state;

  return {
    ...state,
    requests: updatedRequests,
    lastSyncTimestamp: nowMs,
  };
}

/**
 * Updates ParentPinAuth state in FamilyState.
 */
export function updateAuthState(state: FamilyState, auth: ParentPinAuth): FamilyState {
  return {
    ...state,
    auth,
    lastSyncTimestamp: Date.now(),
  };
}
