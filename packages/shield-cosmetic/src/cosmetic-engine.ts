/**
 * @buddy/shield-cosmetic - cosmetic-engine.ts
 * Lightweight, high-performance cosmetic filter engine running in page context.
 */

import { extractFeaturesFromDOM } from '@ghostery/adblocker-content';
import type { CosmeticBlockCallback, CosmeticRuleSet, ICosmeticEngine } from './types.js';

const STYLE_ELEMENT_ID = 'buddy-shield-cosmetics';

export class CosmeticEngine implements ICosmeticEngine {
  private hostname: string = '';
  private currentRules: CosmeticRuleSet = { standardSelectors: [] };
  private observer: MutationObserver | null = null;
  private hiddenCount: number = 0;
  private onBlockCallback?: CosmeticBlockCallback;
  private isDestroyed: boolean = false;
  private mutationDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(onBlock?: CosmeticBlockCallback) {
    this.onBlockCallback = onBlock;
  }

  initialize(hostname: string): void {
    if (this.isDestroyed) return;
    this.hostname = hostname.toLowerCase();
    this.setupHistoryListeners();
  }

  /**
   * Apply standard and extended cosmetic rules to the page.
   */
  applyRules(rules: CosmeticRuleSet): void {
    if (this.isDestroyed || typeof document === 'undefined') return;

    this.currentRules = rules;
    this.injectStyleSheet(rules.standardSelectors, rules.injectedStyles);
    this.evaluateExtendedSelectors();
  }

  /**
   * Fast, native CSS injection for standard ad-hiding selectors.
   */
  private injectStyleSheet(selectors: readonly string[], customStyles?: string): void {
    if (typeof document === 'undefined') return;

    let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ELEMENT_ID;
      (document.head || document.documentElement).appendChild(styleEl);
    }

    const rulesCSS = selectors.length > 0
      ? `${selectors.join(',\n')} { display: none !important; visibility: hidden !important; height: 0 !important; max-height: 0 !important; opacity: 0 !important; pointer-events: none !important; }`
      : '';

    styleEl.textContent = `${rulesCSS}\n${customStyles ?? ''}`;

    // Count currently matched elements
    this.countMatchedElements(selectors);
  }

  /**
   * Count elements currently hidden in the DOM.
   */
  private countMatchedElements(selectors: readonly string[]): void {
    if (typeof document === 'undefined' || selectors.length === 0) return;

    let matchedThisPass = 0;
    try {
      for (const sel of selectors) {
        try {
          const els = document.querySelectorAll(sel);
          matchedThisPass += els.length;
        } catch {
          // Skip invalid individual selector syntax
        }
      }
    } catch {
      // Ignore querySelector exceptions
    }

    if (matchedThisPass > 0 && matchedThisPass !== this.hiddenCount) {
      const delta = matchedThisPass - this.hiddenCount;
      if (delta > 0) {
        this.hiddenCount = matchedThisPass;
        this.onBlockCallback?.(this.hostname, delta);
      }
    }
  }

  /**
   * Evaluate extended selectors (e.g. :has() or custom attribute directives).
   */
  private evaluateExtendedSelectors(): void {
    if (typeof document === 'undefined' || !this.currentRules.extendedSelectors) return;

    for (const sel of this.currentRules.extendedSelectors) {
      try {
        const matches = document.querySelectorAll(sel);
        for (const el of Array.from(matches)) {
          if (el instanceof HTMLElement && el.style.display !== 'none') {
            el.style.setProperty('display', 'none', 'important');
            this.hiddenCount += 1;
            this.onBlockCallback?.(this.hostname, 1);
          }
        }
      } catch {
        // Extended selector may require specific parser in unsupported engines
      }
    }
  }

  /**
   * Observe DOM mutations for dynamically loaded ads (lazy-loaded feeds, SPA updates).
   */
  observeMutations(): void {
    if (this.isDestroyed || typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver(() => {
      // Debounce mutation handling to prevent CPU thrashing
      if (this.mutationDebounceTimer) {
        clearTimeout(this.mutationDebounceTimer);
      }

      this.mutationDebounceTimer = setTimeout(() => {
        if (this.isDestroyed) return;
        this.evaluateExtendedSelectors();
        this.countMatchedElements(this.currentRules.standardSelectors);

        // Feature extraction for intelligent scriptlet / cosmetic matching
        if (document.body) {
          try {
            extractFeaturesFromDOM([document.body]);
          } catch {
            // Ignore feature extraction errors
          }
        }
      }, 150);
    });

    const target = document.body || document.documentElement;
    if (target) {
      this.observer.observe(target, {
        childList: true,
        subtree: true,
      });
    }
  }

  /**
   * Listen to browser history events for SPA navigation without full page reload.
   */
  private setupHistoryListeners(): void {
    if (typeof window === 'undefined') return;

    const handleNav = () => {
      if (window.location.hostname.toLowerCase() !== this.hostname) {
        this.handleSPANavigation(window.location.href);
      }
    };

    window.addEventListener('popstate', handleNav);
  }

  /**
   * Handle SPA route transition (YouTube, Reddit, X, etc.).
   */
  handleSPANavigation(newUrl: string): void {
    if (this.isDestroyed) return;

    try {
      const parsed = new URL(newUrl);
      this.hostname = parsed.hostname.toLowerCase();
    } catch {
      // Keep existing hostname
    }

    // Re-apply rules for the new route
    this.applyRules(this.currentRules);
  }

  getHiddenCount(): number {
    return this.hiddenCount;
  }

  /**
   * Clean up all injected styles and disconnect observers (e.g. when site is paused).
   */
  cleanup(): void {
    if (this.mutationDebounceTimer) {
      clearTimeout(this.mutationDebounceTimer);
      this.mutationDebounceTimer = null;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (typeof document !== 'undefined') {
      const styleEl = document.getElementById(STYLE_ELEMENT_ID);
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    this.cleanup();
  }
}
