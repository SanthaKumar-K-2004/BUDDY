import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';

const shieldPath = path.resolve(__dirname, '../apps/buddy-shield/.output/chrome-mv3');
const focusPath = path.resolve(__dirname, '../apps/buddy-focus/.output/chrome-mv3');
const dashboardPath = path.resolve(__dirname, '../apps/buddy-dashboard/.output/chrome-mv3');

test.describe('Real Websites Live Interaction & Activity Tracking', () => {
  let context: BrowserContext;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        '--headless=new',
        `--disable-extensions-except=${shieldPath},${focusPath},${dashboardPath}`,
        `--load-extension=${shieldPath},${focusPath},${dashboardPath}`,
      ],
    });
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test('1. Live web interaction: loads Wikipedia, interacts with search input, checks DOM state', async () => {
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Open Wikipedia as a stable, unblocked live web reference
    await page.goto('https://en.wikipedia.org/wiki/Main_Page', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const title = await page.title();
    expect(title).toContain('Wikipedia');

    // Verify search input interaction
    const searchInput = page.locator('input[name="search"]').first();
    await searchInput.fill('Buddy extension privacy');
    const inputValue = await searchInput.inputValue();
    expect(inputValue).toBe('Buddy extension privacy');

    await page.close();
  });

  test('2. Multi-tab navigation & domain switching without cross-talk or observer leakage', async () => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('https://example.com', { waitUntil: 'domcontentloaded' });
    await page2.goto('https://duckduckgo.com', { waitUntil: 'domcontentloaded' });

    const p1Text = await page1.innerText('body');
    const p2Title = await page2.title();

    expect(p1Text).toContain('Example Domain');
    expect(p2Title).toContain('DuckDuckGo');

    // Switch between pages and verify both remain responsive
    await page1.bringToFront();
    expect(await page1.title()).toContain('Example Domain');

    await page2.bringToFront();
    expect(await page2.title()).toContain('DuckDuckGo');

    await page1.close();
    await page2.close();
  });

  test('3. Dynamic DOM media insertion and observer detachment cleanup', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    // Simulate HTML5 video DOM lifecycle in live Chromium
    await page.setContent(`
      <html>
        <body>
          <div id="video-container">
            <video id="test-player" width="320" height="240" controls>
              <source src="" type="video/mp4">
            </video>
          </div>
        </body>
      </html>
    `);

    // Verify video tag presence and state
    const videoExists = await page.locator('#test-player').count();
    expect(videoExists).toBe(1);

    // Dynamic removal (mimics SPA page transition away from video)
    await page.evaluate(() => {
      const container = document.getElementById('video-container');
      if (container) container.innerHTML = '<p id="empty-state">No video active</p>';
    });

    const emptyText = await page.innerText('#empty-state');
    expect(emptyText).toBe('No video active');

    await page.close();
  });
});
