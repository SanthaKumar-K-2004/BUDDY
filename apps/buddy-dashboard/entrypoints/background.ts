/**
 * Unified Master Background Service Worker for BUDDY
 * Runs 100% on-device: Shield DNR manager, Focus & Limit engine, Watch-Time aggregator,
 * Pet mood & streak evolution, and Local Intelligence Coach.
 */

import { defineBackground } from 'wxt/sandbox';
import { ShieldEngine, isShieldMessage, type ShieldMessage } from '@buddy/shield-core';
import { MoodEngine, StreakEngine } from '@buddy/mood-engine';
import { storage, StorageClient, AnalyticsAggregator, formatDateKey } from '@buddy/storage';
import { evaluateUniversalLimit } from '@buddy/focus-engine';
import {
  LocalDataPipeline,
  PatternDetector,
  SmartCoach,
  NotificationManager,
} from '@buddy/intelligence-engine';
import type {
  ActivityEvent,
  FocusPolicy,
  PlatformCategory,
  WatchLimit,
  WatchSession,
} from '@buddy/shared-types';

export default defineBackground(() => {
  console.log('[BUDDY Unified Suite] Master Background Service Worker Initializing...');

  // 1. Initialize Subsystems
  const shieldEngine = new ShieldEngine();
  const moodEngine = new MoodEngine();
  const streakEngine = new StreakEngine();
  const aggregator = new AnalyticsAggregator(storage);
  const storageClient = new StorageClient(storage);
  const dataPipeline = new LocalDataPipeline();
  const patternDetector = new PatternDetector();
  const notificationManager = new NotificationManager();

  let smartCoach: SmartCoach | null = null;

  // Initialize Shield DNR Engine
  shieldEngine.initialize().catch((err: unknown) => {
    console.error('[BUDDY Shield] Failed to sync DNR rulesets:', err);
  });

  // Initialize SmartCoach with stored configuration
  (async () => {
    try {
      const [adaptiveConfig, breakState] = await Promise.all([
        storageClient.getAdaptiveConfig(),
        storageClient.getSmartBreakState(),
      ]);

      smartCoach = new SmartCoach(adaptiveConfig, breakState);
      smartCoach.setListener({
        onBreakSuggested(continuousMins, breakMins) {
          notificationManager.dispatch({
            id: `break_${Date.now()}`,
            category: 'break',
            title: 'Time for a Mindful Break',
            message: `You've been browsing for ${continuousMins} minutes continuously. Take a ${breakMins}-minute pause to reset!`,
          });
        },
        onFocusSuggested(reason) {
          notificationManager.dispatch({
            id: `focus_${Date.now()}`,
            category: 'focus',
            title: 'Focus Suggestion',
            message: reason,
          });
        },
      });
    } catch (err) {
      console.warn('[BUDDY Intelligence] SmartCoach init warning:', err);
    }
  })();

  // 2. Scheduled Alarms & Lifecycle Maintenance
  if (typeof chrome !== 'undefined' && chrome.alarms) {
    chrome.alarms.create('buddy-shield-flush-stats', { periodInMinutes: 1 });
    chrome.alarms.create('buddy-hourly-decay', { periodInMinutes: 60 });
    chrome.alarms.create('buddy-daily-maintenance', { periodInMinutes: 1440 });

    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'buddy-shield-flush-stats') {
        shieldEngine.stats.flush().catch(() => {});
      } else if (alarm.name === 'buddy-hourly-decay') {
        moodEngine.applyHourlyDecay();
      } else if (alarm.name === 'buddy-daily-maintenance') {
        const todayStr = formatDateKey(new Date());
        const todaySummary = await aggregator.getTodaySummary();
        const goalMet = todaySummary ? todaySummary.focusMs >= 25 * 60 * 1000 : false;
        streakEngine.processDayRollover(todayStr, goalMet);
        await storageClient.set('streakState', streakEngine.getState());
        await storageClient.pruneOldData(90);
      }
    });
  }

  // 3. DeclarativeNetRequest Debug Match Listener
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
        shieldEngine.stats.recordBlock({
          siteId: domain,
          category,
          source: 'dnr',
          requestType: info?.request?.type,
        });
      } catch (err) {
        console.warn('[BUDDY Shield] Match error:', err);
      }
    });
  }

  // 4. Master Unified Runtime Message Router
  chrome.runtime.onMessage.addListener((rawMessage: any, sender, sendResponse) => {
    // Security: Reject untrusted external messages
    if (sender.id && sender.id !== chrome.runtime.id) {
      return false;
    }
    if (!rawMessage || typeof rawMessage !== 'object') {
      return false;
    }

    // A. Handle Shield Messages
    if (isShieldMessage(rawMessage)) {
      const message: ShieldMessage = rawMessage;
      switch (message.type) {
        case 'GET_SHIELD_STATUS': {
          const site = message.site || (sender.tab?.url ? new URL(sender.tab.url).hostname : '');
          shieldEngine.getStatus(site).then(sendResponse).catch((err: unknown) => {
            sendResponse({ error: err instanceof Error ? err.message : String(err) });
          });
          return true;
        }
        case 'TOGGLE_GLOBAL_SHIELD': {
          const action = message.enabled ? shieldEngine.enable() : shieldEngine.disable();
          action
            .then(() => shieldEngine.getStatus())
            .then(sendResponse)
            .catch((err: unknown) => {
              sendResponse({ error: err instanceof Error ? err.message : String(err) });
            });
          return true;
        }
        case 'PAUSE_SITE': {
          shieldEngine
            .pauseForSite(message.site)
            .then(() => shieldEngine.getStatus(message.site))
            .then(sendResponse)
            .catch((err: unknown) => {
              sendResponse({ error: err instanceof Error ? err.message : String(err) });
            });
          return true;
        }
        case 'RESUME_SITE': {
          shieldEngine
            .resumeForSite(message.site)
            .then(() => shieldEngine.getStatus(message.site))
            .then(sendResponse)
            .catch((err: unknown) => {
              sendResponse({ error: err instanceof Error ? err.message : String(err) });
            });
          return true;
        }
      }
    }

    // B. Handle Watch Updates & Focus Limits
    if (rawMessage.type === 'BUDDY_WATCH_UPDATE') {
      const { session, deltaSeconds, category } = rawMessage as {
        session: WatchSession;
        deltaSeconds: number;
        category: PlatformCategory;
      };

      if (!deltaSeconds || deltaSeconds <= 0) {
        sendResponse({ success: true });
        return false;
      }

      (async () => {
        try {
          await aggregator.recordWatchActivity(session, deltaSeconds, category);

          if (smartCoach) {
            smartCoach.tick(deltaSeconds * 1000);
            await storageClient.setSmartBreakState(smartCoach.getBreakState());
          }

          const today = formatDateKey(new Date());
          const allStats = await storage.get('dailyStats');
          const currentStats = allStats[today];

          const limits: WatchLimit[] = await storage.get('watchLimits');
          for (const limit of limits) {
            if (!limit.isEnabled) continue;

            const isShortForm = session.contentType === 'short_form';
            const applies =
              (limit.targetType === 'platform' && limit.targetValue === session.platform) ||
              (limit.targetType === 'category' && (limit.targetValue === category || (limit.targetValue === 'short_form' && isShortForm))) ||
              (limit.targetType === 'content_type' && limit.targetValue === session.contentType) ||
              (limit.targetType === 'site' && limit.targetValue === session.domain);

            if (applies && currentStats) {
              const evalResult = evaluateUniversalLimit(limit, {
                platformStats: currentStats.platformStats,
                categorySeconds: currentStats.categorySeconds,
                totalShortFormSeconds: Object.values(currentStats.platformStats ?? {}).reduce(
                  (acc, p) => acc + (p.shortFormSeconds || 0),
                  0
                ),
              });

              if (evalResult.status !== 'NONE') {
                sendResponse({
                  success: true,
                  intervention: evalResult,
                });
                return;
              }
            }
          }

          sendResponse({ success: true });
        } catch (err: unknown) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }

    // C. Handle Focus Policy Queries
    if (rawMessage.type === 'GET_FOCUS_POLICY') {
      const { domain } = rawMessage;
      (async () => {
        try {
          const policies = await storage.get('sitePolicies');
          const policy: FocusPolicy = policies[domain] ?? {
            hideShortForm: true,
            hideRecommendations: false,
            disableAutoplay: true,
            hideComments: false,
            hideSidebars: false,
            grayscaleMedia: false,
          };
          sendResponse({ success: true, policy });
        } catch (err: unknown) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }

    // D. Handle Activity Events
    if (rawMessage.type === 'ACTIVITY_EVENT') {
      const { event } = rawMessage as { event: ActivityEvent };
      (async () => {
        try {
          const validation = dataPipeline.validateEvent(event);
          if (!validation.isValid) {
            sendResponse({ success: false, error: validation.reason });
            return;
          }
          if (dataPipeline.isDuplicate(event)) {
            sendResponse({ success: true, duplicate: true });
            return;
          }
          await aggregator.recordActivityEvent(event);
          if (smartCoach && event.durationMs && event.durationMs > 0) {
            smartCoach.tick(event.durationMs);
            await storageClient.setSmartBreakState(smartCoach.getBreakState());
          }
          const currentContinuousMs = smartCoach ? smartCoach.getContinuousActiveMinutes() * 60000 : 0;
          const detected = patternDetector.analyzePatterns([event], currentContinuousMs, event.domain);
          for (const p of detected) {
            await storageClient.addPattern(p);
          }
          sendResponse({ success: true });
        } catch (err: unknown) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }

    // E. Handle Mood & Pet Events
    if (rawMessage.type === 'MOOD_EVENT') {
      const payload = rawMessage.payload as { delta: number; reason: string };
      moodEngine.applyStimulus(payload.delta, payload.reason, rawMessage.source || 'buddy-app');
      sendResponse({ status: 'ACCEPTED', newScore: moodEngine.getScore() });
      return false;
    }

    if (rawMessage.type === 'GET_PET_STATE') {
      sendResponse({
        score: moodEngine.getScore(),
        state: moodEngine.getState(),
        streak: streakEngine.getState(),
      });
      return false;
    }

    // F. Handle Content Safety & Adult Content Blocks
    if (rawMessage.type === 'CONTENT_SAFETY_EVENT') {
      const domain = rawMessage.domain || 'restricted-content';
      shieldEngine.stats.recordBlock({
        siteId: domain,
        category: 'ad',
        source: 'content_safety',
      });
      aggregator.recordBlocked('ads', 1).catch(() => {});
      sendResponse({ success: true });
      return false;
    }

    if (rawMessage.type === 'RECORD_DOOMSCROLL') {
      aggregator.recordDoomscrollAlert().catch(() => {});
      moodEngine.applyStimulus(-5, 'Rapid doomscroll detected', 'buddy-focus');
      sendResponse({ success: true });
      return false;
    }

    sendResponse({ status: 'ACKNOWLEDGED' });
    return false;
  });
});
