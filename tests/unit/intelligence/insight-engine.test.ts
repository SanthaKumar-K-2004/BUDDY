import { describe, it, expect } from 'vitest';
import { InsightEngine } from '@buddy/intelligence-engine';
import type { DailySummary, BaselineStats, BehavioralPattern } from '@buddy/shared-types';

describe('InsightEngine', () => {
  const engine = new InsightEngine();

  const mockToday: DailySummary = {
    date: '2026-09-23',
    totalActiveMs: 120 * 60000, // 2h
    mediaMs: 90 * 60000,
    focusMs: 30 * 60000,
    socialMs: 30 * 60000,
    videoMs: 90 * 60000,
    musicMs: 0,
    adsBlocked: 150,
    trackersBlocked: 300,
    sessions: 8,
    limitsReached: 0,
    doomscrollAlerts: 0,
    platformStats: {
      youtube: {
        platform: 'youtube',
        activeMs: 80 * 60000,
        mediaMs: 80 * 60000,
        shortFormMs: 45 * 60000, // 45m shorts
        sessions: 4,
        limitsReached: 0,
      },
      instagram: {
        platform: 'instagram',
        activeMs: 40 * 60000,
        mediaMs: 10 * 60000,
        shortFormMs: 20 * 60000, // 20m reels
        sessions: 4,
        limitsReached: 0,
      },
    },
  };

  const mockBaseline: BaselineStats = {
    averageActiveMs: 90 * 60000, // 1.5h
    averageMediaMs: 60 * 60000,
    averageShortFormMs: 25 * 60000,
    averageFocusMs: 20 * 60000,
    daysCounted: 7,
    hasSufficientData: true,
  };

  const mockPatterns: BehavioralPattern[] = [
    {
      id: 'p1',
      type: 'long_uninterrupted',
      detectedAt: Date.now(),
      description: 'Continuous browsing session without a break',
      evidence: ['Active duration reached 55 minutes continuously'],
      occurrences: 1,
    },
  ];

  it('generates transparent, factual insights with concrete evidence', async () => {
    const insights = await engine.generateInsights({
      today: mockToday,
      baseline: mockBaseline,
      patterns: mockPatterns,
      streak: { currentStreakDays: 3, bestStreakDays: 5, freezeTokensAvailable: 1, history: {}, lastCompletedDate: '' },
    });

    expect(insights.length).toBeGreaterThanOrEqual(4);

    // Verify presence of short-form insight
    const shortFormInsight = insights.find((i) => i.id.startsWith('insight_short_form'));
    expect(shortFormInsight).toBeDefined();
    expect(shortFormInsight!.evidence[0]).toContain('65 minutes');
    expect(shortFormInsight!.action).toBeDefined();

    // Verify baseline trend insight
    const trendInsight = insights.find((i) => i.id.startsWith('insight_trend_baseline'));
    expect(trendInsight).toBeDefined();
    expect(trendInsight!.message).toContain('30m above your 7-day personal average');

    // Verify smart break / uninterrupted insight
    const breakInsight = insights.find((i) => i.id.startsWith('insight_pattern_p1'));
    expect(breakInsight).toBeDefined();
    expect(breakInsight!.action?.type).toBe('take_break');

    // Verify shield insight
    const shieldInsight = insights.find((i) => i.id.startsWith('insight_shield'));
    expect(shieldInsight).toBeDefined();
    expect(shieldInsight!.message).toContain('450 ads and tracker requests');
  });

  it('strictly adheres to the NO PSYCHOLOGICAL DIAGNOSIS rule', async () => {
    const insights = await engine.generateInsights({
      today: mockToday,
      baseline: mockBaseline,
      patterns: mockPatterns,
    });

    const forbiddenTerms = [
      'addiction',
      'addicted',
      'adhd',
      'depression',
      'disorder',
      'mental illness',
      'compulsive',
      'bad habit',
      'shame',
      'guilt',
    ];

    for (const insight of insights) {
      const fullText = `${insight.title} ${insight.message} ${insight.evidence.join(' ')}`.toLowerCase();
      for (const term of forbiddenTerms) {
        expect(fullText).not.toContain(term);
      }
    }
  });

  it('sorts insights deterministically by priority (high > medium > low)', async () => {
    const insights = await engine.generateInsights({
      today: mockToday,
      baseline: mockBaseline,
      patterns: mockPatterns,
    });

    for (let i = 1; i < insights.length; i++) {
      const prev = insights[i - 1]!;
      const curr = insights[i]!;
      const weight = (p: string) => (p === 'high' ? 3 : p === 'medium' ? 2 : 1);
      expect(weight(prev.priority)).toBeGreaterThanOrEqual(weight(curr.priority));
    }
  });
});
