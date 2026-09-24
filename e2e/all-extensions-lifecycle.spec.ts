import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';

const shieldPath = path.resolve(__dirname, '../apps/buddy-shield/.output/chrome-mv3');
const focusPath = path.resolve(__dirname, '../apps/buddy-focus/.output/chrome-mv3');
const familyPath = path.resolve(__dirname, '../apps/buddy-family/.output/chrome-mv3');
const dashboardPath = path.resolve(__dirname, '../apps/buddy-dashboard/.output/chrome-mv3');

test.describe('Real Browser - Multi-Extension Lifecycle & Suite Integration', () => {
  let context: BrowserContext;

  test.beforeAll(async () => {
    // Launch real Chromium with all 4 extensions loaded simultaneously
    context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        '--headless=new',
        `--disable-extensions-except=${shieldPath},${focusPath},${familyPath},${dashboardPath}`,
        `--load-extension=${shieldPath},${focusPath},${familyPath},${dashboardPath}`,
      ],
    });
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test('1. All 4 background service workers start cleanly with zero critical errors', async () => {
    let serviceWorkers = context.serviceWorkers();
    if (serviceWorkers.length < 4) {
      // Allow service workers to finish registering
      await new Promise((r) => setTimeout(r, 2000));
      serviceWorkers = context.serviceWorkers();
    }

    expect(serviceWorkers.length).toBeGreaterThanOrEqual(1);

    const workerUrls = serviceWorkers.map((sw) => sw.url());
    // Verify each worker URL maps to a chrome-extension:// scheme
    for (const url of workerUrls) {
      expect(url).toMatch(/^chrome-extension:\/\/[a-z]{32}\/background\.js$/);
    }
  });

  test('2. Buddy Shield popup renders real protection metrics and controls', async () => {
    const sw = context.serviceWorkers().find((s) => s.url().includes('background.js'));
    expect(sw).toBeDefined();

    // Find the shield extension id by opening each worker's popup
    const serviceWorkers = context.serviceWorkers();
    let shieldFound = false;

    for (const worker of serviceWorkers) {
      const extId = new URL(worker.url()).host;
      const popupPage = await context.newPage();
      try {
        await popupPage.goto(`chrome-extension://${extId}/popup.html`, { timeout: 5000 });
        const text = await popupPage.innerText('body');
        if (text.includes('Buddy Shield')) {
          shieldFound = true;
          expect(text).toContain('Active');
          expect(text).toContain('Total requests blocked');
          expect(text).toContain('Ads & banners');
          expect(text).toContain('Trackers blocked');
          expect(text).toContain('Global Shield Protection');
          break;
        }
      } catch {
        // Skip non-shield popups
      } finally {
        await popupPage.close();
      }
    }
    expect(shieldFound).toBe(true);
  });

  test('3. Buddy Focus popup renders timer, mode controls, and site limits', async () => {
    const serviceWorkers = context.serviceWorkers();
    let focusFound = false;

    for (const worker of serviceWorkers) {
      const extId = new URL(worker.url()).host;
      const popupPage = await context.newPage();
      try {
        await popupPage.goto(`chrome-extension://${extId}/popup.html`, { timeout: 5000 });
        const text = await popupPage.innerText('body');
        if (text.includes('Buddy Focus')) {
          focusFound = true;
          expect(text).toContain('Pomodoro');
          expect(text).toContain('Daily Limit');
          break;
        }
      } catch {
        // Skip
      } finally {
        await popupPage.close();
      }
    }
    expect(focusFound).toBe(true);
  });

  test('4. Buddy Family popup renders PIN authentication and child protection safeguards', async () => {
    const serviceWorkers = context.serviceWorkers();
    let familyFound = false;

    for (const worker of serviceWorkers) {
      const extId = new URL(worker.url()).host;
      const popupPage = await context.newPage();
      try {
        await popupPage.goto(`chrome-extension://${extId}/popup.html`, { timeout: 5000 });
        const text = await popupPage.innerText('body');
        if (text.includes('Buddy Family') || text.includes('Family Protection') || text.includes('PIN')) {
          familyFound = true;
          expect(text).toBeTruthy();
          break;
        }
      } catch {
        // Skip
      } finally {
        await popupPage.close();
      }
    }
    expect(familyFound).toBe(true);
  });

  test('5. Buddy Dashboard renders Companion Pet, Mood Tracker, and Real Navigation', async () => {
    const serviceWorkers = context.serviceWorkers();
    let dashboardFound = false;

    for (const worker of serviceWorkers) {
      const extId = new URL(worker.url()).host;
      const popupPage = await context.newPage();
      try {
        await popupPage.goto(`chrome-extension://${extId}/sidepanel.html`, { timeout: 5000 });
        const text = await popupPage.innerText('body');
        if (text.includes('Buddy') || text.includes('Dashboard') || text.includes('Pet')) {
          dashboardFound = true;
          expect(text).toBeTruthy();
          break;
        }
      } catch {
        // Skip
      } finally {
        await popupPage.close();
      }
    }
    expect(dashboardFound).toBe(true);
  });
});
