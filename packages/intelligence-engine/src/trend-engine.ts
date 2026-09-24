/**
 * @buddy/intelligence-engine - trend-engine.ts
 * Computes personal baselines, day-over-day and week-over-week trends,
 * time-of-day distributions, and day-of-week distributions based STRICTLY on
 * the user's real local measurements. Zero synthetic or population-benchmark data.
 */

import type {
  ActivityEvent,
  BaselineStats,
  DailySummary,
  DayOfWeekDistribution,
  PlatformCategory,
  TimeOfDayDistribution,
  UsageTrend,
  WeeklySummary,
} from '@buddy/shared-types';

export class TrendEngine {
  /**
   * Computes personal baseline from rolling daily summaries (e.g. last 7 or 14 days).
   * Honors "insufficient data" invariant when fewer than 2 active/recorded days exist.
   */
  calculateBaseline(summaries: readonly DailySummary[]): BaselineStats {
    // Only count days that have actually completed or have recorded usage
    const validDays = summaries.filter((s) => s.totalActiveMs > 0 || s.sessions > 0);

    if (validDays.length < 2) {
      return {
        averageActiveMs: 0,
        averageMediaMs: 0,
        averageShortFormMs: 0,
        averageFocusMs: 0,
        daysCounted: validDays.length,
        hasSufficientData: false,
      };
    }

    let totalActive = 0;
    let totalMedia = 0;
    let totalShortForm = 0;
    let totalFocus = 0;

    for (const day of validDays) {
      totalActive += day.totalActiveMs;
      totalMedia += day.mediaMs;
      totalFocus += day.focusMs;

      // Sum short form from platformStats
      for (const p of Object.values(day.platformStats)) {
        totalShortForm += p.shortFormMs || 0;
      }
    }

    const count = validDays.length;

    return {
      averageActiveMs: Math.round(totalActive / count),
      averageMediaMs: Math.round(totalMedia / count),
      averageShortFormMs: Math.round(totalShortForm / count),
      averageFocusMs: Math.round(totalFocus / count),
      daysCounted: count,
      hasSufficientData: true,
    };
  }

  /**
   * Calculates Day-over-Day usage trends comparing today with yesterday.
   */
  calculateDayTrend(today: DailySummary, yesterday: DailySummary): UsageTrend {
    const currentActiveMs = today.totalActiveMs;
    const previousActiveMs = yesterday.totalActiveMs;
    const diffMs = currentActiveMs - previousActiveMs;

    const percentChange =
      previousActiveMs > 0
        ? Math.round(((currentActiveMs - previousActiveMs) / previousActiveMs) * 100)
        : null;

    // Determine category with largest change
    const categories: PlatformCategory[] = ['video', 'social', 'music'];
    let largestDiff = 0;
    let topCategory: PlatformCategory | undefined;

    for (const cat of categories) {
      const todayMs = cat === 'video' ? today.videoMs : cat === 'social' ? today.socialMs : today.musicMs;
      const yestMs = cat === 'video' ? yesterday.videoMs : cat === 'social' ? yesterday.socialMs : yesterday.musicMs;
      const cDiff = todayMs - yestMs;
      if (Math.abs(cDiff) > Math.abs(largestDiff)) {
        largestDiff = cDiff;
        topCategory = cat;
      }
    }

    return {
      period: 'today_vs_yesterday',
      currentActiveMs,
      previousActiveMs,
      diffMs,
      percentChange,
      topCategoryChange: topCategory
        ? {
            category: topCategory,
            diffMs: largestDiff,
          }
        : undefined,
    };
  }

  /**
   * Calculates Week-over-Week usage trends.
   */
  calculateWeeklyTrend(thisWeek: WeeklySummary, lastWeek?: WeeklySummary | null): UsageTrend {
    const currentActiveMs = thisWeek.totalActiveMs;
    const previousActiveMs = lastWeek?.totalActiveMs ?? 0;
    const diffMs = currentActiveMs - previousActiveMs;

    const percentChange =
      previousActiveMs > 0
        ? Math.round(((currentActiveMs - previousActiveMs) / previousActiveMs) * 100)
        : null;

    return {
      period: 'week_vs_last_week',
      currentActiveMs,
      previousActiveMs,
      diffMs,
      percentChange,
    };
  }

  /**
   * Analyzes activity events and aggregates duration by time-of-day buckets.
   * Morning: 05:00 - 12:00
   * Afternoon: 12:00 - 17:00
   * Evening: 17:00 - 22:00
   * Night: 22:00 - 05:00
   */
  calculateTimeOfDayDistribution(events: readonly ActivityEvent[]): TimeOfDayDistribution {
    let morningMs = 0;
    let afternoonMs = 0;
    let eveningMs = 0;
    let nightMs = 0;

    for (const ev of events) {
      const duration = ev.durationMs || 0;
      if (duration <= 0) continue;

      const date = new Date(ev.timestamp);
      const hour = date.getHours();

      if (hour >= 5 && hour < 12) {
        morningMs += duration;
      } else if (hour >= 12 && hour < 17) {
        afternoonMs += duration;
      } else if (hour >= 17 && hour < 22) {
        eveningMs += duration;
      } else {
        nightMs += duration;
      }
    }

    return {
      morningMs,
      afternoonMs,
      eveningMs,
      nightMs,
    };
  }

  /**
   * Aggregates usage across days of the week (0 = Sunday ... 6 = Saturday)
   */
  calculateDayOfWeekDistribution(summaries: readonly DailySummary[]): DayOfWeekDistribution {
    const distribution: Record<number, number> = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
    };

    for (const s of summaries) {
      if (!s.date) continue;
      const date = new Date(`${s.date}T00:00:00`);
      const day = date.getDay();
      distribution[day] = (distribution[day] || 0) + s.totalActiveMs;
    }

    return distribution;
  }
}
