import { defineContentScript } from 'wxt/sandbox';
import { CosmeticEngine } from '@buddy/shield-cosmetic';
import type { ShieldStatus } from '@buddy/shield-core';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    const hostname = window.location.hostname.toLowerCase();
    if (!hostname) return;

    // Report block events back to background
    const cosmetic = new CosmeticEngine((site: string, count: number) => {
      try {
        chrome.runtime.sendMessage({
          type: 'REPORT_BLOCK_EVENT',
          site,
          category: 'cosmetic',
          count,
        });
      } catch {
        // Extension context might be invalidated
      }
    });

    // Check protection status from background
    try {
      chrome.runtime.sendMessage(
        { type: 'GET_SHIELD_STATUS', site: hostname },
        (status: ShieldStatus | { error?: string }) => {
          if (chrome.runtime.lastError || !status || 'error' in status) {
            return;
          }

          const shieldStatus = status as ShieldStatus;
          if (!shieldStatus.isProtected) {
            return;
          }

          // Fetch cosmetic rules
          chrome.runtime.sendMessage(
            { type: 'GET_COSMETIC_RULES', site: hostname },
            (response: { rules?: { standardSelectors: string[] } }) => {
              if (chrome.runtime.lastError || !response?.rules) {
                return;
              }

              cosmetic.initialize(hostname);
              cosmetic.applyRules(response.rules);
              cosmetic.observeMutations();
            }
          );
        }
      );
    } catch {
      // Ignored if runtime not available
    }

    // Cleanup when leaving page
    window.addEventListener('beforeunload', () => {
      cosmetic.cleanup();
    });
  },
});
