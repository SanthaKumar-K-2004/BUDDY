import { defineBackground } from 'wxt/sandbox';
import { ShieldEngine, isShieldMessage, type ShieldMessage } from '@buddy/shield-core';

export default defineBackground(() => {
  const engine = new ShieldEngine();

  // Initialize engine (syncs DNR rulesets, restores policies)
  engine.initialize().catch((err: unknown) => {
    console.error('[Buddy Shield] Failed to initialize ShieldEngine:', err);
  });

  // Setup periodic stats flushing alarm (every 1 minute)
  if (typeof chrome !== 'undefined' && chrome.alarms) {
    chrome.alarms.create('buddy-shield-flush-stats', { periodInMinutes: 1 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'buddy-shield-flush-stats') {
        engine.stats.flush().catch((err: unknown) => {
          console.warn('[Buddy Shield] Failed to flush stats on alarm:', err);
        });
      }
    });
  }

  // Hook into DNR debug match events when available (unpacked/developer mode)
  if (
    typeof chrome !== 'undefined' &&
    Boolean(chrome.declarativeNetRequest) &&
    typeof (chrome.declarativeNetRequest as any).onRuleMatchedDebug?.addListener === 'function'
  ) {
    (chrome.declarativeNetRequest as any).onRuleMatchedDebug.addListener((info: any) => {
      try {
        const url = info?.request?.url || '';
        const rulesetId = info?.rule?.rulesetId || '';
        let domain = '';
        if (url) {
          try {
            domain = new URL(url).hostname;
          } catch {
            domain = url;
          }
        }

        const category = rulesetId.includes('tracker') ? 'tracker' : 'ad';
        engine.stats.recordBlock({
          siteId: domain,
          category,
          source: 'dnr',
          requestType: info?.request?.type,
        });
      } catch (err: unknown) {
        console.warn('[Buddy Shield] Error recording DNR rule match:', err);
      }
    });
  }

  // Strictly validated message routing
  chrome.runtime.onMessage.addListener((rawMessage: unknown, sender, sendResponse) => {
    // Security: reject external messages from other extensions or untrusted web pages
    if (sender.id && sender.id !== chrome.runtime.id) {
      return false;
    }

    if (!isShieldMessage(rawMessage)) {
      // Ignore or reject invalid message payloads
      return false;
    }

    const message: ShieldMessage = rawMessage;

    switch (message.type) {
      case 'GET_SHIELD_STATUS': {
        const site = message.site || (sender.tab?.url ? new URL(sender.tab.url).hostname : '');
        engine.getStatus(site).then(sendResponse).catch((err: unknown) => {
          sendResponse({ error: err instanceof Error ? err.message : String(err) });
        });
        return true; // asynchronous response
      }

      case 'TOGGLE_GLOBAL_SHIELD': {
        const action = message.enabled ? engine.enable() : engine.disable();
        action
          .then(() => engine.getStatus())
          .then(sendResponse)
          .catch((err: unknown) => {
            sendResponse({ error: err instanceof Error ? err.message : String(err) });
          });
        return true;
      }

      case 'PAUSE_SITE': {
        engine
          .pauseForSite(message.site)
          .then(() => engine.getStatus(message.site))
          .then(sendResponse)
          .catch((err: unknown) => {
            sendResponse({ error: err instanceof Error ? err.message : String(err) });
          });
        return true;
      }

      case 'RESUME_SITE': {
        engine
          .resumeForSite(message.site)
          .then(() => engine.getStatus(message.site))
          .then(sendResponse)
          .catch((err: unknown) => {
            sendResponse({ error: err instanceof Error ? err.message : String(err) });
          });
        return true;
      }

      case 'REPORT_BLOCK_EVENT': {
        const count = message.count ?? 1;
        for (let i = 0; i < count; i++) {
          engine.stats.recordBlock({
            siteId: message.site,
            category: message.category,
            source: 'cosmetic',
          });
        }
        sendResponse({ success: true });
        return false;
      }

      case 'GET_COSMETIC_RULES': {
        const rules = engine.getCosmeticRules(message.site);
        sendResponse({ rules });
        return false;
      }

      default:
        return false;
    }
  });

  console.log('[Buddy Shield] Background Service Worker ready');
});
