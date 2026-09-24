import { describe, it, expect } from 'vitest';
import { AdaptivePolicyEngine } from '@buddy/intelligence-engine';
import type { AdaptivePolicyConfig } from '@buddy/shared-types';

describe('AdaptivePolicyEngine', () => {
  const config: AdaptivePolicyConfig = {
    isAdaptiveLimitsEnabled: false,
    breakReminderEnabled: true,
    continuousActivityThresholdMinutes: 50,
    breakDurationMinutes: 5,
    smartFocusSuggestionsEnabled: true,
    excludedDomains: ['work.internal', 'docs.google.com'],
  };

  const engine = new AdaptivePolicyEngine(config);

  it('respects domain exclusions above standard policies', () => {
    const decision = engine.evaluate({
      domain: 'work.internal',
      isDailyLimitReached: true,
    });

    expect(decision.action).toBe('allow');
    expect(decision.policy).toBe('domain_exclusion');
    expect(decision.isEnforced).toBe(false);
  });

  it('enforces Emergency Override as priority 1', () => {
    const decision = engine.evaluate({
      domain: 'youtube.com',
      isEmergencyOverride: true,
      isFamilyBlocked: true,
      isDailyLimitReached: true,
    });

    expect(decision.action).toBe('allow');
    expect(decision.policy).toBe('emergency_override');
  });

  it('enforces Family Policy above user blocks and limits', () => {
    const decision = engine.evaluate({
      domain: 'instagram.com',
      isFamilyBlocked: true,
      familyReason: 'Bedtime curfew in effect',
      isDailyLimitReached: true,
    });

    expect(decision.action).toBe('block');
    expect(decision.policy).toBe('family_policy');
    expect(decision.reason).toContain('Bedtime curfew');
  });

  it('enforces User Blocklist when active', () => {
    const decision = engine.evaluate({
      domain: 'distracting-site.com',
      isUserBlocked: true,
    });

    expect(decision.action).toBe('block');
    expect(decision.policy).toBe('user_blocklist');
  });

  it('enforces Focus Mode when active', () => {
    const decision = engine.evaluate({
      domain: 'reddit.com',
      isFocusActive: true,
    });

    expect(decision.action).toBe('block');
    expect(decision.policy).toBe('focus_mode');
  });

  it('enforces Daily Limits when quota reached', () => {
    const decision = engine.evaluate({
      domain: 'tiktok.com',
      isDailyLimitReached: true,
      limitRule: { id: 'l1', type: 'site', target: 'tiktok.com', maxDailyMinutes: 30 },
    });

    expect(decision.action).toBe('block');
    expect(decision.policy).toBe('daily_limit');
    expect(decision.reason).toContain('30m');
  });

  it('suggests smart break when continuous activity threshold is reached', () => {
    const decision = engine.evaluate({
      domain: 'youtube.com',
      currentContinuousMinutes: 52,
    });

    expect(decision.action).toBe('suggest_break');
    expect(decision.policy).toBe('smart_break');
    expect(decision.isEnforced).toBe(false); // Non-blocking by default
  });

  it('generates structured policy decision logs for explainability', () => {
    const decision = engine.evaluate({
      domain: 'instagram.com',
      isDailyLimitReached: true,
    });

    expect(decision.log).toBeDefined();
    expect(decision.log.trigger).toBe('instagram.com');
    expect(decision.log.action).toBe('block');
    expect(decision.log.policy).toBe('daily_limit');
    expect(decision.log.reason).toBeDefined();
  });
});
