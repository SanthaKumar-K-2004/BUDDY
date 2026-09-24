/**
 * @buddy-focus/entrypoints/content.ts
 * Real-world content script binding site adapters, tracking real media activity,
 * enforcing focus policies, detecting doomscrolling, and displaying interventions.
 */

import { defineContentScript } from 'wxt/sandbox';
import { defaultAdapterRegistry } from '@buddy/site-adapters';
import { DoomscrollDetector } from '@buddy/focus-engine';
import type { FocusPolicy } from '@buddy/shared-types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    const currentUrl = new URL(window.location.href);
    const host = currentUrl.hostname.toLowerCase();
    const pathname = currentUrl.pathname.toLowerCase();

    // Automatic Adult & Pornographic Content Blocker
    const ADULT_PATTERNS = [
      'pornhub', 'xvideos', 'xnxx', 'xhamster', 'redtube', 'youporn', 'chaturbate',
      'stripchat', 'spankbang', 'tube8', 'beeg', 'cam4', 'livejasmin', 'bongacams',
      'brazzers', 'eporner', 'porntrex', 'hqporner', 'tnaflix', 'drtuber', 'porn',
      'xxx', 'hentai', 'adultweb'
    ];

    const isAdult = ADULT_PATTERNS.some(
      (p) => host === p || host.endsWith('.' + p) || host.includes(p + '.') || pathname.includes('/' + p)
    );

    if (isAdult) {
      renderAdultBlock();
      return;
    }

    const adapter = defaultAdapterRegistry.resolve(currentUrl);

    console.log('[Buddy Focus] Active adapter:', adapter.name, 'on', currentUrl.hostname);
    adapter.initialize({ url: currentUrl });

    let lastReportedSeconds = 0;
    const doomscrollDetector = new DoomscrollDetector();

    // 1. Fetch and apply Focus Policy from background/storage
    function loadAndApplyPolicy() {
      try {
        chrome.runtime.sendMessage(
          { type: 'GET_FOCUS_POLICY', domain: window.location.hostname },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn('[Buddy Focus] Background communication error:', chrome.runtime.lastError.message);
              return;
            }
            if (response?.success && response.policy) {
              adapter.applyFocusPolicy(response.policy);
            }
          }
        );
      } catch {
        // Fallback default policy if extension context invalidated
        const fallbackPolicy: FocusPolicy = {
          hideShortForm: true,
          hideRecommendations: false,
          disableAutoplay: true,
          hideComments: false,
          hideSidebars: false,
          grayscaleMedia: false,
        };
        adapter.applyFocusPolicy(fallbackPolicy);
      }
    }

    loadAndApplyPolicy();

    // 2. Periodic Real Watch-Time Reporting
    const watchInterval = window.setInterval(() => {
      const session = adapter.getWatchSession();
      if (!session) return;

      const watchSec = session.activeWatchSeconds ?? 0;
      const deltaSeconds = watchSec - lastReportedSeconds;
      if (deltaSeconds > 0) {
        lastReportedSeconds = watchSec;
        try {
          chrome.runtime.sendMessage(
            {
              type: 'BUDDY_WATCH_UPDATE',
              session,
              deltaSeconds,
              category: adapter.category,
            },
            (response) => {
              if (response?.intervention) {
                renderIntervention(response.intervention);
              }
            }
          );
        } catch {
          // Extension reloaded or context lost
        }
      }
    }, 5000);

    // 3. Observable Doomscroll Detection
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const deltaY = Math.abs(window.scrollY - lastScrollY);
      lastScrollY = window.scrollY;
      const viewportHeight = window.innerHeight || 800;
      const viewports = deltaY / viewportHeight;
      if (viewports > 0.1) {
        doomscrollDetector.recordScroll(viewports);
        const doomState = doomscrollDetector.evaluate();
        if (doomState.isDoomscrolling) {
          triggerDoomscrollNudge();
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 4. SPA Navigation Tracking
    const handleNavigation = () => {
      doomscrollDetector.recordContentSwitch();
      const updatedUrl = new URL(window.location.href);
      if (adapter.matches(updatedUrl)) {
        loadAndApplyPolicy();
      }
    };

    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handleNavigation();
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      handleNavigation();
    };

    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);

    // 5. Cleanup on Page Unload
    window.addEventListener('beforeunload', () => {
      window.clearInterval(watchInterval);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;

      const session = adapter.getWatchSession();
      if (session) {
        const watchSec = session.activeWatchSeconds ?? 0;
        const deltaSeconds = watchSec - lastReportedSeconds;
        if (deltaSeconds > 0) {
          try {
            chrome.runtime.sendMessage({
              type: 'BUDDY_WATCH_UPDATE',
              session,
              deltaSeconds,
              category: adapter.category,
            });
          } catch {
            // Ignore unload errors
          }
        }
      }
      adapter.destroy();
    });

    // 6. UI Intervention Overlays
    function renderIntervention(intervention: {
      status: string;
      intervention: string;
      activeMinutes: number;
      maxMinutes: number;
    }) {
      if (document.getElementById('buddy-intervention-overlay')) return;

      if (intervention.intervention === 'hard_block' || intervention.status === 'LIMIT_REACHED') {
        const overlay = document.createElement('div');
        overlay.id = 'buddy-intervention-overlay';
        overlay.style.cssText = `
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(15, 23, 42, 0.96);
          backdrop-filter: blur(12px);
          z-index: 2147483647;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: system-ui, -apple-system, sans-serif;
          color: #f8fafc;
          padding: 24px;
          text-align: center;
        `;
        const card = document.createElement('div');
        card.style.cssText = 'max-width: 480px; background: #1e293b; border-radius: 20px; padding: 32px; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);';

        const icon = document.createElement('div');
        icon.style.cssText = 'font-size: 56px; margin-bottom: 16px;';
        icon.textContent = '⏳';

        const title = document.createElement('h1');
        title.style.cssText = 'font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #38bdf8;';
        title.textContent = 'Daily Limit Reached';

        const desc = document.createElement('p');
        desc.style.cssText = 'font-size: 15px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px 0;';
        desc.textContent = `You've reached your daily media limit of ${intervention.maxMinutes} minutes on this site. Buddy is helping you step away and stay mindful of your digital time.`;

        const closeBtn = document.createElement('button');
        closeBtn.id = 'buddy-close-tab-btn';
        closeBtn.style.cssText = 'background: #38bdf8; color: #0f172a; border: none; padding: 12px 28px; border-radius: 9999px; font-weight: 600; font-size: 14px; cursor: pointer; transition: transform 0.1s;';
        closeBtn.textContent = 'Close Tab';

        card.appendChild(icon);
        card.appendChild(title);
        card.appendChild(desc);
        card.appendChild(closeBtn);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        document.getElementById('buddy-close-tab-btn')?.addEventListener('click', () => {
          window.history.back();
        });
      } else if (intervention.status === 'STRONG_WARNING') {
        renderFloatingToast(`⚠️ Watch limit warning: ${intervention.activeMinutes}m of ${intervention.maxMinutes}m used!`, '#f59e0b');
      } else if (intervention.status === 'GENTLE_NUDGE') {
        renderFloatingToast(`🌱 Gentle nudge: You've reached ${intervention.activeMinutes}m on this site today.`, '#10b981');
      }
    }

    let isNudgeActive = false;
    function triggerDoomscrollNudge() {
      if (isNudgeActive) return;
      isNudgeActive = true;
      try {
        chrome.runtime.sendMessage({ type: 'RECORD_DOOMSCROLL' });
      } catch {
        // Safe degrade
      }
      renderFloatingToast('🌊 Notice: Fast scrolling detected. Time for a breather?', '#6366f1');
      setTimeout(() => {
        isNudgeActive = false;
      }, 30000);
    }

    function renderFloatingToast(text: string, accentColor: string) {
      const existing = document.getElementById('buddy-focus-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.id = 'buddy-focus-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #1e293b;
        color: #f8fafc;
        border-left: 4px solid ${accentColor};
        border-radius: 12px;
        padding: 12px 20px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.4);
        z-index: 2147483646;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: buddy-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      `;
      toast.textContent = text;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => toast.remove(), 500);
      }, 5000);
    }

    function renderAdultBlock() {
      try {
        chrome.runtime.sendMessage({
          type: 'CONTENT_SAFETY_EVENT',
          domain: host,
          category: 'porn',
          actionTaken: 'blocked',
        });
      } catch {}

      // Pause and mute all existing media
      document.querySelectorAll('video, audio').forEach((el) => {
        try {
          (el as HTMLMediaElement).pause();
          (el as HTMLMediaElement).src = '';
        } catch {}
      });

      document.title = 'Content Blocked by BUDDY';

      const blockOverlay = document.createElement('div');
      blockOverlay.id = 'buddy-safe-shield';
      blockOverlay.style.cssText = `
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483647 !important;
        background: #090d16 !important;
        color: #f8fafc !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        text-align: center !important;
        padding: 24px !important;
        box-sizing: border-box !important;
      `;

      blockOverlay.innerHTML = `
        <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(99, 102, 241, 0.15); display: flex; align-items: center; justify-content: center; font-size: 40px; margin-bottom: 20px; border: 1px solid rgba(99, 102, 241, 0.3);">
          🛡️
        </div>
        <h1 style="font-size: 26px; font-weight: 700; margin: 0 0 12px 0; color: #ffffff; letter-spacing: -0.5px;">
          Restricted by BUDDY Content Guard
        </h1>
        <p style="font-size: 15px; color: #94a3b8; max-width: 480px; margin: 0 0 28px 0; line-height: 1.6;">
          Explicit adult content has been automatically blocked on this page to protect your focus, privacy, and digital wellbeing.
        </p>
        <button id="buddy-safe-exit-btn" style="padding: 12px 28px; border-radius: 8px; border: none; background: #6366f1; color: #ffffff; font-weight: 600; cursor: pointer; font-size: 15px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); transition: transform 0.15s ease;">
          ← Return to Safe Browsing
        </button>
      `;

      const mount = () => {
        if (document.body) {
          document.body.innerHTML = '';
          document.body.appendChild(blockOverlay);
        } else {
          document.documentElement.appendChild(blockOverlay);
        }

        const exitBtn = document.getElementById('buddy-safe-exit-btn');
        if (exitBtn) {
          exitBtn.onclick = () => {
            window.location.href = 'https://en.wikipedia.org';
          };
        }
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
      } else {
        mount();
      }
    }
  },
});
