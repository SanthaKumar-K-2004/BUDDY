import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';

const shieldPath = path.resolve(__dirname, '../apps/buddy-shield/.output/chrome-mv3');
const focusPath = path.resolve(__dirname, '../apps/buddy-focus/.output/chrome-mv3');
const dashboardPath = path.resolve(__dirname, '../apps/buddy-dashboard/.output/chrome-mv3');

test.describe('Buddy Extension E2E Suite', () => {
  test('launches Chrome MV3 with Buddy extensions, runs service worker, and opens popup', async () => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        '--headless=new',
        `--disable-extensions-except=${shieldPath},${focusPath},${dashboardPath}`,
        `--load-extension=${shieldPath},${focusPath},${dashboardPath}`,
      ],
    });

    try {
      // 1. Wait for service worker registration
      let serviceWorkers = context.serviceWorkers();
      if (serviceWorkers.length === 0) {
        await new Promise((r) => setTimeout(r, 1500));
        serviceWorkers = context.serviceWorkers();
      }
      expect(serviceWorkers.length).toBeGreaterThan(0);

      const sw = serviceWorkers[0];
      const swUrl = sw?.url() ?? '';
      const extensionId = new URL(swUrl).host;
      expect(extensionId).toBeTruthy();

      // 2. Open a test page and verify DOM interaction
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.setContent('<html><body><div id="test-node">Buddy Local Test</div></body></html>');
      const text = await page.textContent('#test-node');
      expect(text).toBe('Buddy Local Test');

      // 3. Navigate to the extension popup UI
      const popupPage = await context.newPage();
      await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
      await popupPage.waitForLoadState('domcontentloaded');

      const bodyContent = await popupPage.content();
      expect(bodyContent).toContain('Buddy Shield');
      expect(bodyContent).toContain('Active');
      expect(bodyContent).toContain('Block Ads');

      await popupPage.close();
      await page.close();
    } finally {
      await context.close();
    }
  });
});
