/**
 * @buddy/shield-policy - policy-engine.ts
 * Core site policy engine managing global and per-site ad/tracker blocking states.
 */

import { storage, type StorageAdapter } from '@buddy/storage';
import type { BuddyManagedPolicy } from '@buddy/shared-types';
import type { IPolicyEngine, ShieldSitePolicy } from './types.js';

export class PolicyEngine implements IPolicyEngine {
  private readonly storageAdapter: StorageAdapter;
  private managedPolicy: BuddyManagedPolicy | null = null;

  constructor(storageAdapter: StorageAdapter = storage) {
    this.storageAdapter = storageAdapter;
  }

  /**
   * Set or update enterprise managed policy constraints.
   */
  setManagedPolicy(policy: BuddyManagedPolicy | null): void {
    this.managedPolicy = policy;
  }

  /**
   * Canonicalize an arbitrary URL or hostname to a clean, lowercase domain name.
   */
  canonicalizeDomain(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let clean = input.trim().toLowerCase();

    // If input contains a protocol or slash, extract hostname
    if (clean.includes('://')) {
      try {
        const parsed = new URL(clean);
        clean = parsed.hostname;
      } catch {
        // Fallback: strip scheme manually
        clean = clean.replace(/^[a-z0-9+.-]+:\/\//i, '');
      }
    }

    // Strip leading path or query if present
    const slashIdx = clean.indexOf('/');
    if (slashIdx !== -1) {
      clean = clean.slice(0, slashIdx);
    }

    const questionIdx = clean.indexOf('?');
    if (questionIdx !== -1) {
      clean = clean.slice(0, questionIdx);
    }

    // Strip port if present (unless IPv6)
    if (!clean.startsWith('[') && clean.includes(':')) {
      clean = clean.split(':')[0] ?? clean;
    }

    // Strip trailing dot if present
    if (clean.endsWith('.')) {
      clean = clean.slice(0, -1);
    }

    // Normalize www. prefix for consistent matching
    if (clean.startsWith('www.')) {
      clean = clean.slice(4);
    }

    return clean;
  }

  /**
   * Check whether Shield protection is globally enabled.
   */
  async isGloballyEnabled(): Promise<boolean> {
    if (this.managedPolicy?.enforce_shield === true) {
      return true;
    }

    const settings = await this.storageAdapter.get('settings');
    return settings.isShieldEnabled;
  }

  /**
   * Toggle or set global Shield protection state.
   */
  async setGloballyEnabled(enabled: boolean): Promise<void> {
    // Enterprise enforcement lock
    if (this.managedPolicy?.enforce_shield === true && !enabled) {
      throw new Error('Shield protection is strictly enforced by Enterprise Managed Policy');
    }

    await this.storageAdapter.update('settings', (prev) => ({
      ...prev,
      isShieldEnabled: enabled,
    }));
  }

  /**
   * Check whether a specific site or URL should be protected by Shield.
   */
  async isSiteProtected(urlOrDomain: string): Promise<boolean> {
    const domain = this.canonicalizeDomain(urlOrDomain);
    if (!domain) {
      return false;
    }

    // Enterprise locked domains must always be protected
    if (this.managedPolicy?.shield_locked_domains?.includes(domain)) {
      return true;
    }

    // If globally disabled, no site is protected
    const globallyEnabled = await this.isGloballyEnabled();
    if (!globallyEnabled) {
      return false;
    }

    // Check whitelist
    const settings = await this.storageAdapter.get('settings');
    if (settings.whitelistDomains.includes(domain)) {
      return false;
    }

    // Check per-site focus/shield policy if present
    const sitePolicies = await this.storageAdapter.get('sitePolicies');
    const policy = sitePolicies[domain];
    if (policy && policy.isShieldPaused) {
      return false;
    }

    return true;
  }

  /**
   * Retrieve the active policy state for a given site.
   */
  async getSitePolicy(urlOrDomain: string): Promise<ShieldSitePolicy> {
    const domain = this.canonicalizeDomain(urlOrDomain);
    const protectedState = await this.isSiteProtected(domain);
    const sitePolicies = await this.storageAdapter.get('sitePolicies');
    const existing = sitePolicies[domain];

    return {
      site: domain,
      enabled: protectedState,
      cosmeticFiltering: protectedState,
      networkFiltering: protectedState,
      pausedAt: existing?.isShieldPaused ? Date.now() : undefined,
    };
  }

  /**
   * Pause Shield protection on a specific site.
   */
  async pauseForSite(urlOrDomain: string): Promise<void> {
    const domain = this.canonicalizeDomain(urlOrDomain);
    if (!domain) {
      return;
    }

    if (this.managedPolicy?.shield_locked_domains?.includes(domain)) {
      throw new Error(`Protection for ${domain} is enforced by enterprise policy and cannot be paused.`);
    }

    await this.storageAdapter.update('sitePolicies', (prev) => {
      const existing = prev[domain];
      return {
        ...prev,
        [domain]: {
          ...(existing ?? {}),
          isShieldPaused: true,
        },
      };
    });
  }

  /**
   * Resume Shield protection on a specific site.
   */
  async resumeForSite(urlOrDomain: string): Promise<void> {
    const domain = this.canonicalizeDomain(urlOrDomain);
    if (!domain) {
      return;
    }

    await this.storageAdapter.update('sitePolicies', (prev) => {
      const existing = prev[domain];
      if (!existing) {
        return prev;
      }

      return {
        ...prev,
        [domain]: {
          ...existing,
          isShieldPaused: false,
        },
      };
    });

    // Also remove from whitelist if present
    await this.removeFromWhitelist(domain);
  }

  /**
   * Retrieve all whitelisted domains.
   */
  async getWhitelist(): Promise<readonly string[]> {
    const settings = await this.storageAdapter.get('settings');
    return settings.whitelistDomains;
  }

  /**
   * Add a domain to the permanent user whitelist.
   */
  async addToWhitelist(domain: string): Promise<void> {
    const clean = this.canonicalizeDomain(domain);
    if (!clean) return;

    if (this.managedPolicy?.shield_locked_domains?.includes(clean)) {
      throw new Error(`Domain ${clean} is locked by enterprise policy and cannot be whitelisted.`);
    }

    await this.storageAdapter.update('settings', (prev) => {
      if (prev.whitelistDomains.includes(clean)) {
        return prev;
      }
      return {
        ...prev,
        whitelistDomains: [...prev.whitelistDomains, clean],
      };
    });
  }

  /**
   * Remove a domain from the permanent user whitelist.
   */
  async removeFromWhitelist(domain: string): Promise<void> {
    const clean = this.canonicalizeDomain(domain);
    if (!clean) return;

    await this.storageAdapter.update('settings', (prev) => ({
      ...prev,
      whitelistDomains: prev.whitelistDomains.filter((d) => d !== clean),
    }));
  }
}
