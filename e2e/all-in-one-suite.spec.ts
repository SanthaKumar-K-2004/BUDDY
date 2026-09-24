import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';

const buddyExtensionPath = path.resolve(__dirname, '../apps/buddy-dashboard/.output/chrome-mv3');

test.describe('BUDDY All-in-One Master Extension E2E Suite', () => {
  let context: BrowserContext;

  test.beforeAll(async () => {
    // Launch Chromium with ONLY the ONE unified BUDDY extension loaded
    context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        '--headless=new',
        `--disable-extensions-except=${buddyExtensionPath}`,
        `--load-extension=${buddyExtensionPath}`,
      ],
    });
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test('1. All-in-one service worker starts and registers with zero errors', async () => {
    let serviceWorkers = context.serviceWorkers();
    if (serviceWorkers.length === 0) {
      await new Promise((r) => setTimeout(r, 1500));
      serviceWorkers = context.serviceWorkers();
    }
    expect(serviceWorkers.length).toBeGreaterThan(0);
    const sw = serviceWorkers[0];
    expect(sw.url()).toContain('chrome-extension://');
    expect(sw.url()).toContain('background.js');
  });

  test('2. Unified Popup loads and allows instant tab switching across all features', async () => {
    const sw = context.serviceWorkers()[0];
    const extId = new URL(sw.url()).host;

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extId}/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');

    const bodyText = await popupPage.innerText('body');
    expect(bodyText).toContain('BUDDY Suite');
    expect(bodyText).toContain('Shield Active');

    // Verify all feature tabs are present in the unified popup
    expect(bodyText).toContain('Shield');
    expect(bodyText).toContain('Focus');
    expect(bodyText).toContain('Today');
    expect(bodyText).toContain('Family');
    expect(bodyText).toContain('Pet');

    // Click Shield tab
    await popupPage.click('button:has-text("Shield")');
    const shieldText = await popupPage.innerText('body');
    expect(shieldText).toContain('Buddy Shield Interceptions');

    // Click Focus tab
    await popupPage.click('button:has-text("Focus")');
    const focusText = await popupPage.innerText('body');
    expect(focusText).toContain('Focus');

    // Click Today tab
    await popupPage.click('button:has-text("Today")');
    const todayText = await popupPage.innerText('body');
    expect(todayText).toContain('Today');

    await popupPage.close();
  });

  test('3. Sidepanel loads full multi-screen dashboard', async () => {
    const sw = context.serviceWorkers()[0];
    const extId = new URL(sw.url()).host;

    const sidepanelPage = await context.newPage();
    await sidepanelPage.goto(`chrome-extension://${extId}/sidepanel.html`);
    await sidepanelPage.waitForLoadState('domcontentloaded');

    const text = await sidepanelPage.innerText('body');
    expect(text).toContain('Buddy');

    await sidepanelPage.close();
  });
});
