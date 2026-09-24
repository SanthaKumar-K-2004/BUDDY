/**
 * @buddy/family-engine - Unit Tests
 * Comprehensive deterministic test suite for Phase 5 Family Management & Policy Enforcement.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeDomain,
  isValidDomainInput,
  isDomainMatch,
  matchesAnyDomain,
  createInitialAuth,
  hashPin,
  setPin,
  verifyPin,
  changePin,
  resetPin,
  isMinuteInSchedule,
  isBedtimeActive,
  isStudyTimeActive,
  evaluateSchedules,
  evaluatePolicy,
  getInitialFamilyState,
  validateFamilyState,
  createProfile,
  updateProfile,
  deleteProfile,
  setActiveProfile,
  updatePolicy,
  createAccessRequest,
  reviewAccessRequest,
  cleanupExpiredRequests,
} from '../../packages/family-engine/src/index.js';
import type {
  AccessRequest,
  EvaluationContext,
  FamilyPolicy,
  ScheduleRule,
} from '../../packages/shared-types/src/index.js';

describe('Domain Normalizer', () => {
  it('normalizes various URL formats and protocols into clean hostnames', () => {
    expect(normalizeDomain('https://www.youtube.com/watch?v=123')).toBe('youtube.com');
    expect(normalizeDomain('http://instagram.com/p/abc')).toBe('instagram.com');
    expect(normalizeDomain('WWW.REDDIT.COM:8080/r/test#top')).toBe('reddit.com');
    expect(normalizeDomain('example.com.')).toBe('example.com');
    expect(normalizeDomain('sub.m.facebook.com')).toBe('sub.m.facebook.com');
  });

  it('rejects unsafe pseudo-protocols', () => {
    expect(normalizeDomain('javascript:alert(1)')).toBe('');
    expect(normalizeDomain('data:text/html,<h1>Hello</h1>')).toBe('');
    expect(normalizeDomain('file:///etc/passwd')).toBe('');
  });

  it('validates domain input correctness', () => {
    expect(isValidDomainInput('youtube.com')).toBe(true);
    expect(isValidDomainInput('sub.example.co.uk')).toBe(true);
    expect(isValidDomainInput('localhost')).toBe(true);
    expect(isValidDomainInput('')).toBe(false);
    expect(isValidDomainInput('http://')).toBe(false);
    expect(isValidDomainInput('not a domain')).toBe(false);
    expect(isValidDomainInput('invalid_domain!.com')).toBe(false);
  });

  it('correctly matches exact domains and subdomains while preventing substring attacks', () => {
    // Exact matches
    expect(isDomainMatch('youtube.com', 'youtube.com')).toBe(true);
    expect(isDomainMatch('www.youtube.com', 'youtube.com')).toBe(true);

    // Subdomain matches
    expect(isDomainMatch('m.youtube.com', 'youtube.com')).toBe(true);
    expect(isDomainMatch('music.youtube.com', 'youtube.com')).toBe(true);

    // Substring attacks must FAIL
    expect(isDomainMatch('notyoutube.com', 'youtube.com')).toBe(false);
    expect(isDomainMatch('fakeyoutube.com', 'youtube.com')).toBe(false);
    expect(isDomainMatch('myoutube.com', 'youtube.com')).toBe(false);

    // Suffix attacks must FAIL
    expect(isDomainMatch('youtube.com.evil.com', 'youtube.com')).toBe(false);
  });

  it('matches against a list of rule patterns', () => {
    const list = ['tiktok.com', 'instagram.com'];
    expect(matchesAnyDomain('www.tiktok.com', list)).toBe(true);
    expect(matchesAnyDomain('reels.instagram.com', list)).toBe(true);
    expect(matchesAnyDomain('youtube.com', list)).toBe(false);
  });
});

describe('PIN Authenticator', () => {
  it('creates initial unconfigured auth state', () => {
    const auth = createInitialAuth();
    expect(auth.hasPin).toBe(false);
    expect(auth.failedAttempts).toBe(0);
    expect(auth.saltHex).toBeUndefined();
    expect(auth.verifierHex).toBeUndefined();
  });

  it('hashes a PIN securely with random salt and PBKDF2 derivation', async () => {
    const { saltHex, verifierHex, iterations } = await hashPin('1234');
    expect(saltHex).toBeDefined();
    expect(saltHex.length).toBe(32); // 16 bytes = 32 hex chars
    expect(verifierHex).toBeDefined();
    expect(verifierHex.length).toBe(64); // 32 bytes = 64 hex chars
    expect(iterations).toBeGreaterThanOrEqual(100_000);
  });

  it('sets and verifies a correct PIN without storing plaintext', async () => {
    const auth = await setPin('5678');
    expect(auth.hasPin).toBe(true);
    // Plaintext PIN is NOT in the object
    expect(JSON.stringify(auth)).not.toContain('5678');

    const res = await verifyPin('5678', auth);
    expect(res.success).toBe(true);
    expect(res.isLocked).toBe(false);
    expect(res.updatedAuth.failedAttempts).toBe(0);
  });

  it('enforces lockout rate limiting after 5 consecutive failed attempts', async () => {
    let auth = await setPin('9999');
    const now = 1_000_000;

    // Attempts 1 to 4 fail without lockout
    for (let i = 1; i <= 4; i++) {
      const res = await verifyPin('0000', auth, now);
      expect(res.success).toBe(false);
      expect(res.isLocked).toBe(false);
      auth = res.updatedAuth;
      expect(auth.failedAttempts).toBe(i);
    }

    // 5th attempt triggers 30s lockout
    const fifthRes = await verifyPin('0000', auth, now);
    expect(fifthRes.success).toBe(false);
    expect(fifthRes.isLocked).toBe(true);
    expect(fifthRes.lockoutRemainingSeconds).toBe(30);
    auth = fifthRes.updatedAuth;
    expect(auth.lockedUntil).toBe(now + 30_000);

    // Immediate retry during lockout is rejected
    const blockedRes = await verifyPin('9999', auth, now + 5000);
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.isLocked).toBe(true);
    expect(blockedRes.error).toContain('Locked');

    // Attempt after lockout expiry with correct PIN succeeds and resets count
    const recoveredRes = await verifyPin('9999', auth, now + 35_000);
    expect(recoveredRes.success).toBe(true);
    expect(recoveredRes.isLocked).toBe(false);
    expect(recoveredRes.updatedAuth.failedAttempts).toBe(0);
  });

  it('supports changing PIN with old PIN verification', async () => {
    const auth = await setPin('1111');

    // Change with wrong old PIN fails
    const failChange = await changePin('0000', '2222', auth);
    expect(failChange.success).toBe(false);

    // Change with right old PIN succeeds
    const successChange = await changePin('1111', '2222', auth);
    expect(successChange.success).toBe(true);
    expect(successChange.newAuth).toBeDefined();

    // Verify new PIN works
    const verifyNew = await verifyPin('2222', successChange.newAuth!);
    expect(verifyNew.success).toBe(true);
  });

  it('resets authentication state', () => {
    const reset = resetPin();
    expect(reset.hasPin).toBe(false);
    expect(reset.failedAttempts).toBe(0);
  });
});

describe('Schedule Evaluator', () => {
  it('correctly evaluates same-day schedule windows', () => {
    // 09:00 (540 min) to 17:00 (1020 min), Monday (1) to Friday (5)
    const workDays = [1, 2, 3, 4, 5];

    // Inside window on Tuesday (2) at 12:00 (720 min)
    expect(isMinuteInSchedule(720, 2, 540, 1020, workDays)).toBe(true);

    // Before start on Tuesday at 08:30 (510 min)
    expect(isMinuteInSchedule(510, 2, 540, 1020, workDays)).toBe(false);

    // After end on Tuesday at 17:30 (1050 min)
    expect(isMinuteInSchedule(1050, 2, 540, 1020, workDays)).toBe(false);

    // Inside window time but on Sunday (0)
    expect(isMinuteInSchedule(720, 0, 540, 1020, workDays)).toBe(false);
  });

  it('correctly evaluates overnight windows crossing midnight', () => {
    // 22:00 (1320 min) to 06:00 (360 min)
    // Starting on Monday (1) night
    const mondayOnly = [1];

    // Monday night at 23:00 (1380 min) -> should be active
    expect(isMinuteInSchedule(1380, 1, 1320, 360, mondayOnly)).toBe(true);

    // Monday night before start at 21:00 (1260 min) -> inactive
    expect(isMinuteInSchedule(1260, 1, 1320, 360, mondayOnly)).toBe(false);

    // Tuesday (2) morning at 03:00 (180 min) -> should be active because it started Monday night!
    expect(isMinuteInSchedule(180, 2, 1320, 360, mondayOnly)).toBe(true);

    // Tuesday morning at 07:00 (420 min) -> inactive
    expect(isMinuteInSchedule(420, 2, 1320, 360, mondayOnly)).toBe(false);
  });

  it('evaluates multiple schedules and returns active actions', () => {
    const rules: ScheduleRule[] = [
      {
        id: 'rule_study',
        name: 'Afternoon Study',
        days: [1, 2, 3, 4, 5],
        startMinute: 15 * 60, // 15:00
        endMinute: 17 * 60, // 17:00
        action: 'focus',
        isEnabled: true,
      },
    ];

    // Mock Tuesday at 16:00
    const mockDate = new Date('2026-09-22T16:00:00'); // Tuesday
    const res = evaluateSchedules(mockDate.getTime(), rules);
    expect(res.isStudyTime).toBe(true);
    expect(res.activeRules.length).toBe(1);
    expect(res.activeRules[0]!.id).toBe('rule_study');
  });
});

describe('Policy Evaluator & Priority Hierarchy', () => {
  const basePolicy: FamilyPolicy = {
    id: 'pol_child',
    profileId: 'prof_child',
    blockedSites: ['tiktok.com', 'instagram.com'],
    allowedSites: ['khanacademy.org', 'docs.google.com'],
    blockedCategories: ['gaming' as any, 'adult' as any],
    dailyLimits: {
      'youtube.com': 30, // 30 mins
      social: 45,
      total: 120,
    },
    schedules: [],
    bedtime: {
      enabled: true,
      startMinute: 22 * 60,
      endMinute: 6 * 60,
    },
    studyTime: {
      enabled: false,
      startMinute: 16 * 60,
      endMinute: 18 * 60,
    },
    schemaVersion: 1,
    updatedAt: Date.now(),
  };

  it('priority 1: always allows internal extension and browser URLs', () => {
    const ctx: EvaluationContext = {
      url: 'chrome-extension://buddy-dashboard/index.html',
      domain: 'buddy-dashboard',
      currentTimeMs: Date.now(),
    };
    const res = evaluatePolicy(ctx, basePolicy);
    expect(res.action).toBe('allow');
    expect(res.reason).toContain('system or extension');
  });

  it('priority 2: unexpired temporary approval allows previously blocked site', () => {
    const now = Date.now();
    const approvedException: AccessRequest = {
      id: 'req_1',
      profileId: 'prof_child',
      domain: 'tiktok.com',
      requestedAt: now - 5000,
      status: 'approved',
      expiresAt: now + 25 * 60 * 1000, // 25 mins remaining
    };

    const ctx: EvaluationContext = {
      url: 'https://www.tiktok.com/@user',
      domain: 'tiktok.com',
      category: 'social',
      currentTimeMs: now,
    };

    const res = evaluatePolicy(ctx, basePolicy, [approvedException]);
    expect(res.action).toBe('allow');
    expect(res.reason).toContain('Temporary parent approval active');
  });

  it('priority 2: expired approval does NOT bypass blocking', () => {
    const now = Date.now();
    const expiredException: AccessRequest = {
      id: 'req_2',
      profileId: 'prof_child',
      domain: 'tiktok.com',
      requestedAt: now - 40 * 60 * 1000,
      status: 'approved',
      expiresAt: now - 5000, // Expired 5 seconds ago
    };

    const ctx: EvaluationContext = {
      url: 'https://www.tiktok.com/@user',
      domain: 'tiktok.com',
      category: 'social',
      currentTimeMs: now,
    };

    const res = evaluatePolicy(ctx, basePolicy, [expiredException]);
    expect(res.action).toBe('block');
  });

  it('priority 3: explicit allowed sites override category blocking (Conflict Resolution)', () => {
    // Suppose docs.google.com was classified under a blocked category
    const ctx: EvaluationContext = {
      url: 'https://docs.google.com/document/1',
      domain: 'docs.google.com',
      category: 'gaming', // Blocked category in basePolicy
      currentTimeMs: Date.now(),
    };

    const res = evaluatePolicy(ctx, basePolicy);
    expect(res.action).toBe('allow');
    expect(res.reason).toContain('Explicitly allowed');
  });

  it('priority 4: explicit blocked sites are blocked', () => {
    const ctx: EvaluationContext = {
      url: 'https://m.instagram.com/explore',
      domain: 'm.instagram.com',
      category: 'social',
      currentTimeMs: Date.now(),
    };

    const res = evaluatePolicy(ctx, basePolicy);
    expect(res.action).toBe('block');
    expect(res.reason).toContain('restricted by parent policy');
  });

  it('priority 5: blocked categories are blocked', () => {
    const ctx: EvaluationContext = {
      url: 'https://ign.com/reviews',
      domain: 'ign.com',
      category: 'gaming',
      currentTimeMs: Date.now(),
    };

    const res = evaluatePolicy(ctx, basePolicy);
    expect(res.action).toBe('block');
    expect(res.reason).toContain("Category 'gaming' is restricted");
  });

  it('priority 6: bedtime schedule blocks non-allowed browsing', () => {
    // 23:30 (Nighttime during bedtime window)
    const midnightContext: EvaluationContext = {
      url: 'https://wikipedia.org',
      domain: 'wikipedia.org',
      category: 'education',
      currentTimeMs: new Date('2026-09-22T23:30:00').getTime(),
    };

    const res = evaluatePolicy(midnightContext, basePolicy);
    expect(res.action).toBe('block');
    expect(res.reason).toContain('Bedtime schedule is active');
  });

  it('priority 8: daily usage limit reached triggers limit action', () => {
    const ctx: EvaluationContext = {
      url: 'https://www.youtube.com/watch?v=abc',
      domain: 'youtube.com',
      category: 'video',
      currentTimeMs: new Date('2026-09-22T14:00:00').getTime(),
      platformUsageMinutesToday: 35, // Limit is 30
    };

    const res = evaluatePolicy(ctx, basePolicy);
    expect(res.action).toBe('limit');
    expect(res.remainingMinutes).toBe(0);
    expect(res.reason).toContain('Daily limit of 30m reached');
  });

  it('priority 9: unconstrained safe browsing is allowed by default', () => {
    const ctx: EvaluationContext = {
      url: 'https://stackexchange.com',
      domain: 'stackexchange.com',
      category: 'productivity',
      currentTimeMs: new Date('2026-09-22T14:00:00').getTime(),
      activeUsageMinutesToday: 20,
    };

    const res = evaluatePolicy(ctx, basePolicy);
    expect(res.action).toBe('allow');
  });
});

describe('Family Manager State Orchestrator', () => {
  it('initializes a valid empty state', () => {
    const state = getInitialFamilyState();
    expect(state.enabled).toBe(false);
    expect(state.profiles).toHaveLength(0);
    expect(state.activeProfileId).toBeNull();
  });

  it('creates Parent and Child profiles with corresponding default policies', () => {
    let state = getInitialFamilyState();

    const parentRes = createProfile(state, 'parent', 'Mom');
    state = parentRes.state;
    expect(parentRes.profile.role).toBe('parent');
    expect(parentRes.profile.displayName).toBe('Mom');

    const childRes = createProfile(state, 'child', 'Alex');
    state = childRes.state;
    expect(childRes.profile.role).toBe('child');
    expect(childRes.profile.displayName).toBe('Alex');

    expect(state.profiles).toHaveLength(2);
    expect(state.policies[parentRes.profile.id]).toBeDefined();
    expect(state.policies[childRes.profile.id]).toBeDefined();
    // Child default policy has bedtime enabled
    expect(state.policies[childRes.profile.id]!.bedtime?.enabled).toBe(true);
  });

  it('updates and deletes profiles safely', () => {
    let state = getInitialFamilyState();
    const { state: s1, profile } = createProfile(state, 'child', 'Tommy');
    state = s1;

    state = updateProfile(state, profile.id, { displayName: 'Thomas' });
    expect(state.profiles.find((p) => p.id === profile.id)?.displayName).toBe('Thomas');

    state = deleteProfile(state, profile.id);
    expect(state.profiles.find((p) => p.id === profile.id)).toBeUndefined();
    expect(state.policies[profile.id]).toBeUndefined();
  });

  it('manages access requests and temporary approval lifecycle', () => {
    let state = getInitialFamilyState();
    const now = 1_000_000;
    const { state: s1, request } = createAccessRequest(state, 'prof_alex', 'instagram.com', 'School project', now);
    state = s1;

    expect(state.requests).toHaveLength(1);
    expect(state.requests[0]!.status).toBe('pending');
    expect(state.requests[0]!.domain).toBe('instagram.com');

    // Parent approves request for 30 minutes
    state = reviewAccessRequest(state, request.id, 'approved', 30, now);
    const approved = state.requests.find((r) => r.id === request.id)!;
    expect(approved.status).toBe('approved');
    expect(approved.expiresAt).toBe(now + 30 * 60 * 1000);

    // After 35 minutes, cleanup marks it expired
    state = cleanupExpiredRequests(state, now + 35 * 60 * 1000);
    const expired = state.requests.find((r) => r.id === request.id)!;
    expect(expired.status).toBe('expired');
  });

  it('safely validates and recovers corrupted storage state', () => {
    const corrupted = {
      enabled: 'yes', // invalid type
      activeProfileId: 12345, // invalid type
      profiles: 'not an array',
      policies: null,
      auth: { hasPin: 'true' }, // invalid type
    };

    const recovered = validateFamilyState(corrupted);
    expect(recovered.enabled).toBe(false);
    expect(recovered.activeProfileId).toBeNull();
    expect(recovered.profiles).toHaveLength(0);
    expect(recovered.policies).toEqual({});
    expect(recovered.auth.hasPin).toBe(false);
  });
});
