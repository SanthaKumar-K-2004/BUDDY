/**
 * @buddy/shield-policy - types.ts
 * Type definitions for site filtering policies, whitelist management, and enterprise policy overrides.
 */

export interface ShieldSitePolicy {
  readonly site: string;
  readonly enabled: boolean;
  readonly cosmeticFiltering?: boolean;
  readonly networkFiltering?: boolean;
  readonly pausedAt?: number;
}

export interface ShieldPolicyState {
  readonly isGloballyEnabled: boolean;
  readonly pausedSites: Readonly<Record<string, ShieldSitePolicy>>;
  readonly whitelist: readonly string[];
}

export interface IPolicyEngine {
  isGloballyEnabled(): Promise<boolean>;
  setGloballyEnabled(enabled: boolean): Promise<void>;
  isSiteProtected(urlOrDomain: string): Promise<boolean>;
  getSitePolicy(urlOrDomain: string): Promise<ShieldSitePolicy>;
  pauseForSite(urlOrDomain: string): Promise<void>;
  resumeForSite(urlOrDomain: string): Promise<void>;
  getWhitelist(): Promise<readonly string[]>;
  addToWhitelist(domain: string): Promise<void>;
  removeFromWhitelist(domain: string): Promise<void>;
  canonicalizeDomain(input: string): string;
}
