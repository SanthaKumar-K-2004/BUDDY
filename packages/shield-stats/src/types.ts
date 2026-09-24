/**
 * @buddy/shield-stats - types.ts
 * Types for privacy-first, locally-aggregated blocking statistics.
 */

export type BlockCategory = 'ad' | 'tracker' | 'cosmetic' | 'malware' | 'privacy' | 'other';
export type BlockSource = 'dnr' | 'cosmetic';

export interface BlockEvent {
  readonly id: string;
  readonly timestamp: number;
  readonly siteId: string;
  readonly category: BlockCategory;
  readonly source: BlockSource;
  readonly requestType?: string;
}

export interface SiteStats {
  readonly site: string;
  totalBlocked: number;
  adsBlocked: number;
  trackersBlocked: number;
  cosmeticsBlocked: number;
  lastBlockedAt: number;
}

export interface ShieldStatsSummary {
  readonly totalBlocked: number;
  readonly totalAds: number;
  readonly totalTrackers: number;
  readonly totalCosmetics: number;
  readonly topSites: readonly SiteStats[];
}

export interface IStatsEngine {
  recordBlock(event: Omit<BlockEvent, 'id' | 'timestamp'>): void;
  getSummary(): Promise<ShieldStatsSummary>;
  getSiteStats(siteId: string): Promise<SiteStats>;
  flush(): Promise<void>;
  reset(): Promise<void>;
}
