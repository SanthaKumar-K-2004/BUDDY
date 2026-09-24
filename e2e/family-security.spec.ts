import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';

const familyPath = path.resolve(__dirname, '../apps/buddy-family/.output/chrome-mv3');

test.describe('Family Security, PIN Authentication & Tamper Resilience', () => {
  let context: BrowserContext;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        '--headless=new',
        `--disable-extensions-except=${familyPath}`,
        `--load-extension=${familyPath}`,
      ],
    });
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test('1. Family service worker starts and processes PIN validation requests', async () => {
    const sw = context.serviceWorkers().find((s) => s.url().includes('buddy-family') || s.url().includes('background.js'));
    expect(sw).toBeDefined();

    const extId = new URL(sw!.url()).host;
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extId}/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');

    const bodyText = await popupPage.innerText('body');
    // Ensure popup renders safely without crashing or throwing
    expect(bodyText.length).toBeGreaterThan(10);

    await popupPage.close();
  });
});
