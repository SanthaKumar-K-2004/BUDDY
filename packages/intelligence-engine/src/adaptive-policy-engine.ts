/**
 * @buddy/intelligence-engine - adaptive-policy-engine.ts
 * Evaluates contextual rules and behavioral patterns to make explainable policy decisions.
 * Enforces a strict, deterministic priority hierarchy.
 * All automated limit changes require explicit user opt-in (isAdaptiveLimitsEnabled).
 */

import type {
  AdaptivePolicyConfig,
  BehavioralPattern,
  LimitRule,
  PolicyDecisionLog,
} from '@buddy/shared-types';

export interface PolicyEvaluationContext {
  readonly domain: string;
  readonly category?: string;
  readonly isEmergencyOverride?: boolean;
  readonly isFamilyBlocked?: boolean;
  readonly familyReason?: string;
  readonly isUserBlocked?: boolean;
  readonly isFocusActive?: boolean;
  readonly isDailyLimitReached?: boolean;
  readonly limitRule?: LimitRule;
  readonly currentContinuousMinutes?: number;
  readonly activePatterns?: readonly BehavioralPattern[];
}

export interface PolicyDecision {
  readonly action: 'allow' | 'warn' | 'block' | 'suggest_break' | 'suggest_focus' | 'adjust_limit';
  readonly policy: string;
  readonly reason: string;
  readonly isEnforced: boolean;
  readonly log: PolicyDecisionLog;
}

export class AdaptivePolicyEngine {
  constructor(private config: AdaptivePolicyConfig) {}

  updateConfig(newConfig: AdaptivePolicyConfig): void {
    this.config = newConfig;
  }

  getConfig(): AdaptivePolicyConfig {
    return this.config;
  }

  /**
   * Deterministically evaluates the priority hierarchy:
   * 1. Emergency Override
   * 2. Family Policy
   * 3. Explicit User Blocklist
   * 4. Focus Mode Active
   * 5. Daily Limit Reached
   * 6. Continuous Browsing (Smart Break)
   * 7. Adaptive Suggestions
   */
  evaluate(context: PolicyEvaluationContext, now = Date.now()): PolicyDecision {
    const { domain } = context;

    // Check if domain is in user's excluded list
    if (this.config.excludedDomains.includes(domain)) {
      return this.createDecision(
        'allow',
        'domain_exclusion',
        `${domain} is explicitly excluded from adaptive interventions`,
        false,
        domain,
        now
      );
    }

    // 1. Emergency Override
    if (context.isEmergencyOverride) {
      return this.createDecision(
        'allow',
        'emergency_override',
        'Emergency override active',
        true,
        domain,
        now
      );
    }

    // 2. Family Policy
    if (context.isFamilyBlocked) {
      return this.createDecision(
        'block',
        'family_policy',
        context.familyReason || `Access to ${domain} is restricted by Family policy`,
        true,
        domain,
        now
      );
    }

    // 3. Explicit User Blocklist
    if (context.isUserBlocked) {
      return this.createDecision(
        'block',
        'user_blocklist',
        `${domain} is on your personal blocklist`,
        true,
        domain,
        now
      );
    }

    // 4. Focus Mode Active
    if (context.isFocusActive) {
      return this.createDecision(
        'block',
        'focus_mode',
        `Browsing on ${domain} is paused while Focus Mode is active`,
        true,
        domain,
        now
      );
    }

    // 5. Daily Limit Reached
    if (context.isDailyLimitReached) {
      const limitTarget = context.limitRule?.target || domain;
      return this.createDecision(
        'block',
        'daily_limit',
        `Daily usage limit for ${limitTarget} (${context.limitRule?.maxDailyMinutes || 0}m) has been reached`,
        true,
        domain,
        now
      );
    }

    // 6. Smart Break (Continuous Activity Threshold)
    if (
      this.config.breakReminderEnabled &&
      (context.currentContinuousMinutes || 0) >= this.config.continuousActivityThresholdMinutes
    ) {
      return this.createDecision(
        'suggest_break',
        'smart_break',
        `Continuous active browsing reached ${context.currentContinuousMinutes}m. Suggested: Take a ${this.config.breakDurationMinutes}m break.`,
        false, // Suggestions are non-blocking by default
        domain,
        now
      );
    }

    // 7. Adaptive Suggestions based on Patterns
    if (context.activePatterns && context.activePatterns.length > 0) {
      const shortFormPattern = context.activePatterns.find((p) => p.type === 'repeated_short_form');
      if (shortFormPattern && this.config.smartFocusSuggestionsEnabled) {
        return this.createDecision(
          'suggest_focus',
          'adaptive_pattern',
          'Multiple short-form sessions detected. Suggested: Start a 25m Focus session to stay on track.',
          false,
          domain,
          now
        );
      }
    }

    // Default Allow
    return this.createDecision(
      'allow',
      'default_policy',
      'Site activity permitted under standard rules',
      false,
      domain,
      now
    );
  }

  private createDecision(
    action: PolicyDecision['action'],
    policy: string,
    reason: string,
    isEnforced: boolean,
    target: string,
    timestamp: number
  ): PolicyDecision {
    const log: PolicyDecisionLog = {
      id: `decision_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      trigger: target,
      policy,
      action,
      reason,
      target,
    };

    return {
      action,
      policy,
      reason,
      isEnforced,
      log,
    };
  }
}
