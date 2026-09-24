/**
 * @buddy/intelligence-engine - pattern-detector.ts
 * Real-world behavioral pattern recognition running locally from actual ActivityEvent streams.
 * Strictly explainable with concrete observable evidence.
 * NEVER diagnoses psychiatric/medical conditions.
 */

import type { ActivityEvent, BehavioralPattern } from '@buddy/shared-types';

export interface PatternDetectorConfig {
  readonly rapidReopenWindowSeconds?: number;
  readonly siteSwitchWindowMinutes?: number;
  readonly siteSwitchThreshold?: number;
  readonly uninterruptedSessionThresholdMinutes?: number;
  readonly shortFormSessionCountThreshold?: number;
  readonly lateNightStartHour?: number;
  readonly lateNightEndHour?: number;
}

export class PatternDetector {
  private rapidReopenWindowMs: number;
  private siteSwitchWindowMs: number;
  private siteSwitchThreshold: number;
  private uninterruptedSessionThresholdMs: number;
  private shortFormThreshold: number;
  private lateNightStart: number;
  private lateNightEnd: number;

  constructor(config?: PatternDetectorConfig) {
    this.rapidReopenWindowMs = (config?.rapidReopenWindowSeconds ?? 60) * 1000;
    this.siteSwitchWindowMs = (config?.siteSwitchWindowMinutes ?? 10) * 60 * 1000;
    this.siteSwitchThreshold = config?.siteSwitchThreshold ?? 4;
    this.uninterruptedSessionThresholdMs = (config?.uninterruptedSessionThresholdMinutes ?? 50) * 60 * 1000;
    this.shortFormThreshold = config?.shortFormSessionCountThreshold ?? 4;
    this.lateNightStart = config?.lateNightStartHour ?? 23; // 23:00 (11 PM)
    this.lateNightEnd = config?.lateNightEndHour ?? 5;      // 05:00 (5 AM)
  }

  /**
   * Detects rapid reopening of the same domain within a short time window.
   */
  detectRapidReopens(events: readonly ActivityEvent[]): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = [];
    if (events.length < 2) return patterns;

    // Group events by domain
    const domainEvents: Record<string, ActivityEvent[]> = {};
    for (const ev of events) {
      if (!domainEvents[ev.domain]) domainEvents[ev.domain] = [];
      domainEvents[ev.domain]!.push(ev);
    }

    for (const [domain, dEvents] of Object.entries(domainEvents)) {
      // Sort chronologically
      dEvents.sort((a, b) => a.timestamp - b.timestamp);

      let reopenCount = 0;
      const evidence: string[] = [];

      for (let i = 1; i < dEvents.length; i++) {
        const prev = dEvents[i - 1]!;
        const curr = dEvents[i]!;

        // Check if previous was ended/paused and current started/active within window
        const gapMs = curr.timestamp - prev.timestamp;
        if (gapMs > 0 && gapMs <= this.rapidReopenWindowMs) {
          reopenCount++;
          const gapSec = Math.round(gapMs / 1000);
          evidence.push(`Reopened ${domain} ${gapSec}s after prior activity`);
        }
      }

      if (reopenCount >= 2) {
        patterns.push({
          id: `pattern_rapid_reopen_${domain}_${Date.now()}`,
          type: 'rapid_reopen',
          detectedAt: Date.now(),
          description: `Frequent rapid reopenings detected on ${domain}`,
          evidence,
          occurrences: reopenCount,
          domain,
        });
      }
    }

    return patterns;
  }

  /**
   * Detects rapid switching across multiple domains within a moving window.
   */
  detectSiteSwitching(events: readonly ActivityEvent[]): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = [];
    if (events.length < this.siteSwitchThreshold) return patterns;

    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i <= sorted.length - this.siteSwitchThreshold; i++) {
      const windowStart = sorted[i]!.timestamp;
      const windowEvents = sorted.slice(i).filter((ev) => ev.timestamp - windowStart <= this.siteSwitchWindowMs);

      // Collect distinct domains visited in sequence
      const domainSequence: string[] = [];
      for (const ev of windowEvents) {
        if (domainSequence[domainSequence.length - 1] !== ev.domain) {
          domainSequence.push(ev.domain);
        }
      }

      if (domainSequence.length >= this.siteSwitchThreshold) {
        patterns.push({
          id: `pattern_site_switch_${windowStart}`,
          type: 'frequent_site_switch',
          detectedAt: Date.now(),
          description: `Switched between ${domainSequence.length} sites in ${Math.round(this.siteSwitchWindowMs / 60000)} minutes`,
          evidence: [
            `Browsing sequence: ${domainSequence.slice(0, 5).join(' → ')}${domainSequence.length > 5 ? '...' : ''}`,
            `${domainSequence.length} distinct website switches within ${Math.round(this.siteSwitchWindowMs / 60000)} minutes`,
          ],
          occurrences: domainSequence.length,
        });
        break; // Record primary pattern for this window
      }
    }

    return patterns;
  }

  /**
   * Evaluates if a continuous active session duration exceeds the uninterrupted threshold.
   */
  detectUninterruptedSession(currentActiveMs: number, domain?: string): BehavioralPattern | null {
    if (currentActiveMs >= this.uninterruptedSessionThresholdMs) {
      const minutes = Math.floor(currentActiveMs / 60000);
      return {
        id: `pattern_uninterrupted_${Date.now()}`,
        type: 'long_uninterrupted',
        detectedAt: Date.now(),
        description: `Continuous browsing session without a break (${minutes} minutes)`,
        evidence: [
          `Active duration reached ${minutes} minutes continuously`,
          `Configured threshold: ${Math.round(this.uninterruptedSessionThresholdMs / 60000)} minutes`,
        ],
        occurrences: 1,
        domain,
      };
    }
    return null;
  }

  /**
   * Detects repeated consumption of short-form vertical video (Shorts, Reels, TikTok).
   */
  detectRepeatedShortForm(events: readonly ActivityEvent[]): BehavioralPattern | null {
    const shortFormEvents = events.filter(
      (ev) => ev.activityType === 'short' || ev.activityType === 'reel'
    );

    if (shortFormEvents.length >= this.shortFormThreshold) {
      const distinctSites = Array.from(new Set(shortFormEvents.map((ev) => ev.site || ev.domain)));
      const totalDurationMs = shortFormEvents.reduce((acc, ev) => acc + (ev.durationMs || 0), 0);
      const totalMinutes = Math.round(totalDurationMs / 60000);

      return {
        id: `pattern_repeated_short_form_${Date.now()}`,
        type: 'repeated_short_form',
        detectedAt: Date.now(),
        description: `High short-form video activity across ${distinctSites.join(', ')}`,
        evidence: [
          `${shortFormEvents.length} short-form sessions detected`,
          `Total active short-form time: ${totalMinutes} minutes`,
          `Platforms: ${distinctSites.join(', ')}`,
        ],
        occurrences: shortFormEvents.length,
        category: 'video',
      };
    }

    return null;
  }

  /**
   * Detects active browsing occurring during night hours.
   */
  detectLateSession(now: Date = new Date(), domain?: string): BehavioralPattern | null {
    const hour = now.getHours();
    const isLate = hour >= this.lateNightStart || hour < this.lateNightEnd;

    if (isLate) {
      return {
        id: `pattern_late_session_${now.toDateString()}`,
        type: 'late_session',
        detectedAt: now.getTime(),
        description: 'Active browsing during late night hours',
        evidence: [
          `Activity logged at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          `Night window: ${this.lateNightStart}:00 to ${this.lateNightEnd}:00`,
        ],
        occurrences: 1,
        domain,
      };
    }

    return null;
  }

  /**
   * Runs all detectors across a set of events and returns identified patterns.
   */
  analyzePatterns(
    events: readonly ActivityEvent[],
    currentActiveMs = 0,
    currentDomain?: string,
    now: Date = new Date()
  ): BehavioralPattern[] {
    const results: BehavioralPattern[] = [];

    // 1. Rapid reopens
    results.push(...this.detectRapidReopens(events));

    // 2. Site switching
    results.push(...this.detectSiteSwitching(events));

    // 3. Uninterrupted session
    const uninterrupted = this.detectUninterruptedSession(currentActiveMs, currentDomain);
    if (uninterrupted) results.push(uninterrupted);

    // 4. Repeated short form
    const shortForm = this.detectRepeatedShortForm(events);
    if (shortForm) results.push(shortForm);

    // 5. Late session
    const late = this.detectLateSession(now, currentDomain);
    if (late) results.push(late);

    return results;
  }
}
