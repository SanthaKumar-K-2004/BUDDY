/**
 * @buddy/shield-cosmetic - types.ts
 * Types for cosmetic element hiding and page DOM bridges.
 */

export interface CosmeticRuleSet {
  readonly standardSelectors: readonly string[];
  readonly extendedSelectors?: readonly string[];
  readonly injectedStyles?: string;
}

export type CosmeticBlockCallback = (site: string, count: number) => void;

export interface ICosmeticEngine {
  initialize(hostname: string): void;
  applyRules(rules: CosmeticRuleSet): void;
  observeMutations(): void;
  handleSPANavigation(newUrl: string): void;
  cleanup(): void;
  destroy(): void;
  getHiddenCount(): number;
}
