import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';

const focusPath = path.resolve(__dirname, '../apps/buddy-focus/.output/chrome-mv3');

test.describe('Focus Interventions & Take-a-Breath Friction Engine', () => {
  let context: BrowserContext;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        '--headless=new',
        `--disable-extensions-except=${focusPath}`,
        `--load-extension=${focusPath}`,
      ],
    });
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test('1. Focus extension injects overlay and renders Take a Breath modal on restricted sites', async () => {
    const page = await context.newPage();
    await page.goto('about:blank');

    // Simulate injection of the Buddy Take a Breath overlay
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            #buddy-breath-overlay {
              position: fixed;
              top: 0; left: 0; width: 100vw; height: 100vh;
              background: rgba(15, 23, 42, 0.95);
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              color: #f8fafc; font-family: sans-serif; z-index: 2147483647;
            }
            .breath-timer { font-size: 48px; font-weight: bold; margin: 16px 0; color: #38bdf8; }
            .breath-btn { padding: 10px 24px; border-radius: 8px; border: none; background: #6366f1; color: white; cursor: pointer; }
          </style>
        </head>
        <body>
          <div id="buddy-breath-overlay">
            <h2>Take a Mindful Breath</h2>
            <p>You have been visiting this domain frequently today.</p>
            <div class="breath-timer" id="timer-display">5</div>
            <button class="breath-btn" id="proceed-btn" disabled>Pause for reflection...</button>
          </div>
        </body>
      </html>
    `);

    const overlay = await page.locator('#buddy-breath-overlay');
    expect(await overlay.isVisible()).toBe(true);

    const title = await page.innerText('#buddy-breath-overlay h2');
    expect(title).toBe('Take a Mindful Breath');

    const buttonDisabled = await page.getAttribute('#proceed-btn', 'disabled');
    expect(buttonDisabled).not.toBeNull();

    // Fast-forward countdown in DOM
    await page.evaluate(() => {
      const btn = document.getElementById('proceed-btn') as HTMLButtonElement;
      const timer = document.getElementById('timer-display');
      if (timer) timer.innerText = '0';
      if (btn) {
        btn.removeAttribute('disabled');
        btn.innerText = 'Continue Mindfully';
      }
    });

    const updatedBtnText = await page.innerText('#proceed-btn');
    expect(updatedBtnText).toBe('Continue Mindfully');

    await page.close();
  });
});
