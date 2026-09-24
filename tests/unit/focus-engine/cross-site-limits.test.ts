import { describe, it, expect } from 'vitest';
import {
  evaluateUniversalLimit,
  computeLimitUsageMinutes,
  type UsageSource,
} from '@buddy/focus-engine';
import type { WatchLimit } from '@buddy/shared-types';

describe('Phase 6 - Cross-Site Universal Limits & Shared Category Budgets', () => {
  const shortFormLimit: WatchLimit = {
    id: 'limit-short-form-60m',
    targetType: 'category',
    targetValue: 'short_form',
    maxMinutesPerDay: 60,
    currentMinutesUsed: 0,
    warningThresholdPercent: 80,
    intervention: 'hard_block',
    isEnabled: true,
  };

  it('aggregates short-form usage across YouTube Shorts, Instagram Reels, and TikTok', () => {
    // 25 mins on YouTube Shorts + 25 mins on Instagram Reels + 10 mins on TikTok = 60 mins
    const usage: UsageSource = {
      platformStats: {
        youtube: { activeSeconds: 2400, mediaSeconds: 2400, shortFormSeconds: 1500 }, // 25 min Shorts
        instagram: { activeSeconds: 1500, mediaSeconds: 1500, shortFormSeconds: 1500 }, // 25 min Reels
        tiktok: { activeSeconds: 600, mediaSeconds: 600, shortFormSeconds: 600 }, // 10 min TikTok
      },
    };

    const computedMinutes = computeLimitUsageMinutes(shortFormLimit, usage);
    expect(computedMinutes).toBe(60);

    const evalResult = evaluateUniversalLimit(shortFormLimit, usage);
    expect(evalResult.isBreached).toBe(true);
    expect(evalResult.status).toBe('LIMIT_REACHED');
    expect(evalResult.percentageUsed).toBe(100);
    expect(evalResult.activeMinutes).toBe(60);
    expect(evalResult.intervention).toBe('hard_block');
  });

  it('triggers gentle nudge and strong warning at 80% and 90% across platforms', () => {
    // 30 mins YouTube Shorts + 18 mins Instagram Reels = 48 mins (80% of 60m)
    const usage80: UsageSource = {
      platformStats: {
        youtube: { shortFormSeconds: 1800 },
        instagram: { shortFormSeconds: 1080 },
      },
    };
    const res80 = evaluateUniversalLimit(shortFormLimit, usage80);
    expect(res80.isBreached).toBe(false);
    expect(res80.status).toBe('GENTLE_NUDGE');
    expect(res80.percentageUsed).toBe(80);

    // Add 7 mins TikTok = 55 mins (92% of 60m)
    const usage92: UsageSource = {
      platformStats: {
        youtube: { shortFormSeconds: 1800 },
        instagram: { shortFormSeconds: 1080 },
        tiktok: { shortFormSeconds: 420 },
      },
    };
    const res92 = evaluateUniversalLimit(shortFormLimit, usage92);
    expect(res92.isBreached).toBe(false);
    expect(res92.status).toBe('STRONG_WARNING');
    expect(res92.percentageUsed).toBe(92);
  });

  it('evaluates platform-specific limits independently from category limits', () => {
    const spotifyLimit: WatchLimit = {
      id: 'limit-spotify-120m',
      targetType: 'platform',
      targetValue: 'spotify',
      maxMinutesPerDay: 120,
      currentMinutesUsed: 0,
      warningThresholdPercent: 80,
      intervention: 'gentle_nudge',
      isEnabled: true,
    };

    const usage: UsageSource = {
      platformStats: {
        spotify: { activeSeconds: 7200, mediaSeconds: 7200, shortFormSeconds: 0 }, // 120 mins
        youtube: { activeSeconds: 3600, mediaSeconds: 3600, shortFormSeconds: 0 },
      },
    };

    const evalResult = evaluateUniversalLimit(spotifyLimit, usage);
    expect(evalResult.isBreached).toBe(true);
    expect(evalResult.status).toBe('LIMIT_REACHED');
    expect(evalResult.activeMinutes).toBe(120);
  });
});
