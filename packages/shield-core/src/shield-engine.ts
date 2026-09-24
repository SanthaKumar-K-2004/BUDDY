/**
 * @buddy/shield-core - shield-engine.ts
 * Master orchestrator connecting DNR ruleset management, site policies, and statistics.
 */

import { PolicyEngine } from '@buddy/shield-policy';
import { StatsEngine } from '@buddy/shield-stats';
import { DNRRulesetManager } from '@buddy/shield-dnr';
import { storage, type StorageAdapter } from '@buddy/storage';
import type { IShieldEngine, ShieldStatus } from './types.js';

export const BASELINE_COSMETIC_SELECTORS: readonly string[] = [
  '.adsbygoogle',
  '[id^="google_ads_"]',
  '.ad-banner',
  '.ad-container',
  '.advertisement',
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googlesyndication.com"]',
  'div[data-ad-unit]',
  'aside.ad-slot',
];

export class ShieldEngine implements IShieldEngine {
  readonly policy: PolicyEngine;
  readonly stats: StatsEngine;
  readonly dnr: DNRRulesetManager;
  private readonly storageAdapter: StorageAdapter;
  private isInitialized = false;

  constructor(
    storageAdapter: StorageAdapter = storage,
    policyEngine: PolicyEngine = new PolicyEngine(storageAdapter),
    statsEngine: StatsEngine = new StatsEngine(storageAdapter),
    dnrManager: DNRRulesetManager = new DNRRulesetManager()
  ) {
    this.storageAdapter = storageAdapter;
    this.policy = policyEngine;
    this.stats = statsEngine;
    this.dnr = dnrManager;
  }

  getStorageAdapter(): StorageAdapter {
    return this.storageAdapter;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.dnr.initialize();

    // Check if globally enabled and synchronize DNR state
    const globallyEnabled = await this.policy.isGloballyEnabled();
    if (globallyEnabled) {
      await this.dnr.enableAllRulesets();
    } else {
      await this.dnr.disableAllRulesets();
    }

    this.isInitialized = true;
  }

  async enable(): Promise<void> {
    await this.policy.setGloballyEnabled(true);
    await this.dnr.enableAllRulesets();
  }

  async disable(): Promise<void> {
    await this.policy.setGloballyEnabled(false);
    await this.dnr.disableAllRulesets();
  }

  async pauseForSite(site: string): Promise<void> {
    const domain = this.policy.canonicalizeDomain(site);
    if (!domain) return;

    await this.policy.pauseForSite(domain);
    await this.dnr.pauseSite(domain);
  }

  async resumeForSite(site: string): Promise<void> {
    const domain = this.policy.canonicalizeDomain(site);
    if (!domain) return;

    await this.policy.resumeForSite(domain);
    await this.dnr.resumeSite(domain);
  }

  async getStatus(currentSite: string = ''): Promise<ShieldStatus> {
    const domain = this.policy.canonicalizeDomain(currentSite);
    const isGloballyEnabled = await this.policy.isGloballyEnabled();
    const isProtected = domain ? await this.policy.isSiteProtected(domain) : isGloballyEnabled;
    const sitePolicy = await this.policy.getSitePolicy(domain);

    const registered = this.dnr.getRegisteredRulesets();
    const activeRulesets: string[] = [];
    if (isGloballyEnabled) {
      for (const r of registered) {
        if (await this.dnr.isRulesetEnabled(r.id)) {
          activeRulesets.push(r.id);
        }
      }
    }

    const summary = await this.stats.getSummary();
    const siteStat = domain ? await this.stats.getSiteStats(domain) : null;

    return {
      isGloballyEnabled,
      isProtected,
      currentSite: domain,
      sitePolicy,
      activeRulesets,
      totalBlocked: siteStat?.totalBlocked ?? summary.totalBlocked,
      adsBlocked: siteStat?.adsBlocked ?? summary.totalAds,
      trackersBlocked: siteStat?.trackersBlocked ?? summary.totalTrackers,
    };
  }

  async getStats(site?: string): Promise<{ summary: any; siteStats?: any }> {
    const summary = await this.stats.getSummary();
    if (site) {
      const domain = this.policy.canonicalizeDomain(site);
      const siteStats = await this.stats.getSiteStats(domain);
      return { summary, siteStats };
    }
    return { summary };
  }

  getCosmeticRules(_domain: string): { standardSelectors: readonly string[] } {
    return {
      standardSelectors: BASELINE_COSMETIC_SELECTORS,
    };
  }

  async refreshRules(): Promise<void> {
    const isEnabled = await this.policy.isGloballyEnabled();
    if (isEnabled) {
      await this.dnr.enableAllRulesets();
    } else {
      await this.dnr.disableAllRulesets();
    }
  }

  destroy(): void {
    void this.stats.flush();
    this.isInitialized = false;
  }
}
