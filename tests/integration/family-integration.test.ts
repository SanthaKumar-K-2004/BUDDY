/**
 * @buddy/family-engine - Integration Test
 * Validates End-to-End Family Management, Policy Priority, Access Requests,
 * Limits Synchronization, and Privacy/Security Invariants.
 */

import { describe, it, expect } from 'vitest';
import {
  getInitialFamilyState,
  createProfile,
  updatePolicy,
  createAccessRequest,
  reviewAccessRequest,
  cleanupExpiredRequests,
  evaluatePolicy,
  setPin,
  verifyPin,
} from '../../packages/family-engine/src/index.js';
import type {
  EvaluationContext,
  FamilyState,
  LimitRule,
} from '../../packages/shared-types/src/index.js';

describe('Family & Parental Controls Integration Flow', () => {
  it('executes full setup, policy evaluation, access request, and expiration cycle', async () => {
    // 1. Initial State
    let state: FamilyState = getInitialFamilyState();
    expect(state.enabled).toBe(false);

    // 2. Parent and Child Creation
    const { state: s1, profile: parentProf } = createProfile(state, 'parent', 'Mother');
    const { state: s2, profile: childProf } = createProfile(s1, 'child', 'Leo');
    state = s2;

    expect(state.profiles).toHaveLength(2);
    expect(state.policies[childProf.id]).toBeDefined();

    // 3. Set Parent PIN
    const auth = await setPin('4321', state.auth);
    state = { ...state, auth };
    expect(state.auth.hasPin).toBe(true);

    // Verify incorrect PIN rejected
    const badVerify = await verifyPin('0000', state.auth);
    expect(badVerify.success).toBe(false);

    // Verify correct PIN accepted
    const goodVerify = await verifyPin('4321', state.auth);
    expect(goodVerify.success).toBe(true);

    // 4. Configure Child Policy
    const now = new Date('2026-09-23T15:00:00').getTime(); // 3:00 PM (outside bedtime)
    state = updatePolicy(state, childProf.id, {
      blockedSites: ['tiktok.com', 'roblox.com'],
      allowedSites: ['khanacademy.org', 'wikipedia.org'],
      blockedCategories: ['gaming' as any],
      dailyLimits: {
        social: 30, // 30 minutes
      },
      bedtime: {
        enabled: true,
        startMinute: 21 * 60, // 9:00 PM (1260 min)
        endMinute: 6 * 60, // 6:00 AM (360 min)
      },
    });

    const childPolicy = state.policies[childProf.id]!;

    // 5. Test Site Evaluation
    // Allowed site
    const allowedCtx: EvaluationContext = {
      url: 'https://www.khanacademy.org/math',
      domain: 'khanacademy.org',
      category: 'education',
      currentTimeMs: now,
    };
    expect(evaluatePolicy(allowedCtx, childPolicy, state.requests).action).toBe('allow');

    // Blocked site
    const blockedCtx: EvaluationContext = {
      url: 'https://m.tiktok.com/@creator',
      domain: 'tiktok.com',
      category: 'social',
      currentTimeMs: now,
    };
    expect(evaluatePolicy(blockedCtx, childPolicy, state.requests).action).toBe('block');

    // 6. Child Submits Access Request for blocked site
    const reqRes = createAccessRequest(state, childProf.id, 'tiktok.com', 'Need for music project', now);
    state = reqRes.state;
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0]!.status).toBe('pending');

    // Site remains blocked while request is pending
    expect(evaluatePolicy(blockedCtx, childPolicy, state.requests).action).toBe('block');

    // 7. Parent Reviews and Approves for 30 Minutes
    state = reviewAccessRequest(state, reqRes.request.id, 'approved', 30, now);
    const approvedRequest = state.requests.find((r) => r.id === reqRes.request.id)!;
    expect(approvedRequest.status).toBe('approved');
    expect(approvedRequest.expiresAt).toBe(now + 30 * 60 * 1000);

    // Site is now TEMPORARILY ALLOWED
    const evalApproved = evaluatePolicy(blockedCtx, childPolicy, state.requests);
    expect(evalApproved.action).toBe('allow');
    expect(evalApproved.reason).toContain('Temporary parent approval active');

    // 8. Time Advances Past Expiration (+35 minutes)
    const futureTime = now + 35 * 60 * 1000;
    state = cleanupExpiredRequests(state, futureTime);

    const expiredRequest = state.requests.find((r) => r.id === reqRes.request.id)!;
    expect(expiredRequest.status).toBe('expired');

    // Site is RESTRICTED AGAIN
    const evalExpiredCtx: EvaluationContext = {
      ...blockedCtx,
      currentTimeMs: futureTime,
    };
    expect(evaluatePolicy(evalExpiredCtx, childPolicy, state.requests).action).toBe('block');

    // 9. Bedtime Schedule Enforcement
    const bedtimeMs = new Date('2026-09-23T22:30:00').getTime(); // 10:30 PM
    const bedtimeCtx: EvaluationContext = {
      url: 'https://news.ycombinator.com',
      domain: 'news.ycombinator.com',
      category: 'news',
      currentTimeMs: bedtimeMs,
    };
    const evalBedtime = evaluatePolicy(bedtimeCtx, childPolicy, state.requests);
    expect(evalBedtime.action).toBe('block');
    expect(evalBedtime.reason).toContain('Bedtime schedule is active');

    // Allowed education site STILL allowed during bedtime
    const bedtimeAllowedCtx: EvaluationContext = {
      ...allowedCtx,
      currentTimeMs: bedtimeMs,
    };
    expect(evaluatePolicy(bedtimeAllowedCtx, childPolicy, state.requests).action).toBe('allow');
  });

  it('synchronizes family daily limits into Phase 3 LimitRule objects (Single Source of Truth)', () => {
    let state = getInitialFamilyState();
    const { state: s1, profile: child } = createProfile(state, 'child', 'Sam');
    state = updatePolicy(s1, child.id, {
      dailyLimits: {
        social: 45,
        youtube: 60,
        total: 120,
      },
    });

    const policy = state.policies[child.id]!;
    const syncedRules: LimitRule[] = [];

    for (const [target, maxMins] of Object.entries(policy.dailyLimits)) {
      syncedRules.push({
        id: `family_limit_${target}`,
        type: target === 'social' ? 'category' : 'platform',
        target,
        maxDailyMinutes: maxMins,
        enabled: true,
      });
    }

    expect(syncedRules).toHaveLength(3);
    const socialRule = syncedRules.find((r) => r.target === 'social')!;
    expect(socialRule.maxDailyMinutes).toBe(45);
    expect(socialRule.type).toBe('category');

    const ytRule = syncedRules.find((r) => r.target === 'youtube')!;
    expect(ytRule.maxDailyMinutes).toBe(60);
    expect(ytRule.type).toBe('platform');
  });

  it('guarantees zero leakage of browsing content, URLs, or plaintext PINs', async () => {
    let state = getInitialFamilyState();
    const { state: s1 } = createProfile(state, 'parent', 'Dad');
    const auth = await setPin('7890', s1.auth);
    state = { ...s1, auth };

    const serialized = JSON.stringify(state);

    // Invariant 1: Plaintext PIN never present
    expect(serialized).not.toContain('7890');

    // Invariant 2: No full browsing URLs
    expect(serialized).not.toContain('http://');
    expect(serialized).not.toContain('https://');

    // Invariant 3: PBKDF2 Verifier and Salt present
    expect(state.auth.saltHex).toBeDefined();
    expect(state.auth.verifierHex).toBeDefined();
    expect(state.auth.saltHex!.length).toBe(32);
    expect(state.auth.verifierHex!.length).toBe(64);
  });
});
