/**
 * @buddy/shield-core - types.ts
 * Main type contracts for Shield engine status, events, and configuration.
 */

import type { ShieldSitePolicy } from '@buddy/shield-policy';
import type { ShieldStatsSummary, SiteStats } from '@buddy/shield-stats';

export interface ShieldStatus {
  readonly isGloballyEnabled: boolean;
  readonly isProtected: boolean;
  readonly currentSite: string;
  readonly sitePolicy: ShieldSitePolicy;
  readonly activeRulesets: readonly string[];
  readonly totalBlocked: number;
  readonly adsBlocked: number;
  readonly trackersBlocked: number;
}

export interface IShieldEngine {
  initialize(): Promise<void>;
  enable(): Promise<void>;
  disable(): Promise<void>;
  pauseForSite(site: string): Promise<void>;
  resumeForSite(site: string): Promise<void>;
  getStatus(currentSite?: string): Promise<ShieldStatus>;
  getStats(site?: string): Promise<{ summary: ShieldStatsSummary; siteStats?: SiteStats }>;
  refreshRules(): Promise<void>;
  destroy(): void;
}
