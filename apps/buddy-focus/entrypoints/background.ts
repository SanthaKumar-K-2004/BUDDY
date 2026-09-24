/**
 * @buddy-focus/entrypoints/background.ts
 * Real-world background service worker managing watch-time aggregation,
 * limit evaluation, focus policy synchronization, behavioral pattern detection,
 * smart break coaching, and privacy-preserving local intelligence.
 */

import { defineBackground } from 'wxt/sandbox';
import { storage, StorageClient, AnalyticsAggregator, formatDateKey } from '@buddy/storage';
import { evaluateUniversalLimit } from '@buddy/focus-engine';
import {
  LocalDataPipeline,
  PatternDetector,
  SmartCoach,
  NotificationManager,
  InsightEngine,
  TrendEngine,
} from '@buddy/intelligence-engine';
import type {
  ActivityEvent,
  FocusPolicy,
  PlatformCategory,
  WatchSession,
} from '@buddy/shared-types';

export default defineBackground(() => {
  console.log('[Buddy Focus] Background Service Worker running with Phase 7 Local Intelligence');
  const aggregator = new AnalyticsAggregator(storage);
  const storageClient = new StorageClient(storage);
  const dataPipeline = new LocalDataPipeline();
  const patternDetector = new PatternDetector();
  const notificationManager = new NotificationManager();
  const trendEngine = new TrendEngine();
  const insightEngine = new InsightEngine();

  let smartCoach: SmartCoach | null = null;

  // Initialize SmartCoach asynchronously with stored config
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
            title: 'Time for a Quick Break',
            message: `You've been browsing for ${continuousMins} minutes continuously. Take a ${breakMins}-minute break to rest your eyes!`,
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
      console.error('[Buddy Focus] Error initializing SmartCoach:', err);
    }
  })();

  // Run migrations on install/update
  chrome.runtime.onInstalled?.addListener(async () => {
    try {
      await storageClient.runMigrations();
      await storageClient.pruneOldData(90);
    } catch (err) {
      console.warn('[Buddy Focus] Installation migration error:', err);
    }
  });

  // Daily maintenance alarm for automatic retention pruning
  chrome.alarms?.create('buddy-daily-maintenance', { periodInMinutes: 1440 });
  chrome.alarms?.onAlarm?.addListener(async (alarm) => {
    if (alarm.name === 'buddy-daily-maintenance') {
      try {
        await storageClient.pruneOldData(90);
      } catch (err) {
        console.warn('[Buddy Focus] Daily maintenance error:', err);
      }
    }
  });

  // Listen for runtime messages from content scripts and dashboard
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    // Security: reject external messages from other extensions or malicious web pages
    if (_sender.id && _sender.id !== chrome.runtime.id) {
      return false;
    }

    if (!message || typeof message !== 'object') return false;

    if (message.type === 'GET_FOCUS_POLICY') {
      const { domain } = message;
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
        } catch (err) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }

    if (message.type === 'ACTIVITY_EVENT') {
      const { event } = message as { event: ActivityEvent };
      (async () => {
        try {
          // 1. Validate event sanity
          const validation = dataPipeline.validateEvent(event);
          if (!validation.isValid) {
            sendResponse({ success: false, error: validation.reason });
            return;
          }

          // 2. Event deduplication
          if (dataPipeline.isDuplicate(event)) {
            sendResponse({ success: true, duplicate: true });
            return;
          }

          // 3. Record in local analytics aggregator
          await aggregator.recordActivityEvent(event);

          // 4. Update Smart Coach continuous time
          if (smartCoach && event.durationMs && event.durationMs > 0) {
            smartCoach.tick(event.durationMs);
            await storageClient.setSmartBreakState(smartCoach.getBreakState());
          }

          // 5. Detect behavioral patterns
          const currentContinuousMs = smartCoach ? smartCoach.getContinuousActiveMinutes() * 60000 : 0;
          const detected = patternDetector.analyzePatterns([event], currentContinuousMs, event.domain);
          for (const p of detected) {
            await storageClient.addPattern(p);
          }

          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }

    if (message.type === 'BUDDY_WATCH_UPDATE') {
      const { session, deltaSeconds, category } = message as {
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

          // Update Smart Coach continuous time
          if (smartCoach) {
            smartCoach.tick(deltaSeconds * 1000);
            await storageClient.setSmartBreakState(smartCoach.getBreakState());
          }

          // Evaluate universal cross-site limits
          const today = formatDateKey(new Date());
          const allStats = await storage.get('dailyStats');
          const currentStats = allStats[today];

          const limits = await storage.get('watchLimits');
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
        } catch (err) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }

    if (message.type === 'RECORD_DOOMSCROLL') {
      (async () => {
        try {
          await aggregator.recordDoomscrollAlert();
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }

    if (message.type === 'GET_INSIGHTS') {
      (async () => {
        try {
          const [today, yesterday, week, patterns, streak, storedInsights] = await Promise.all([
            aggregator.getTodaySummary(),
            aggregator.getYesterdaySummary(),
            aggregator.getWeeklySummary(),
            storageClient.getPatterns(),
            storageClient.get('streakState'),
            storageClient.getInsights(),
          ]);

          const baseline = trendEngine.calculateBaseline(week.dailySummaries);
          const dayTrend = trendEngine.calculateDayTrend(today, yesterday);

          const generated = await insightEngine.generateInsights({
            today,
            yesterday,
            baseline,
            dayTrend,
            patterns,
            streak,
          });

          // Merge generated with stored insights avoiding duplicate IDs
          const mergedMap = new Map<string, typeof generated[0]>();
          for (const ins of storedInsights) mergedMap.set(ins.id, ins);
          for (const ins of generated) {
            if (!mergedMap.has(ins.id)) mergedMap.set(ins.id, ins);
          }

          const result = Array.from(mergedMap.values());
          await storageClient.setInsights(result);
          sendResponse({ success: true, insights: result, baseline, dayTrend });
        } catch (err) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }

    if (message.type === 'DISMISS_INSIGHT') {
      const { id } = message as { id: string };
      (async () => {
        try {
          await storageClient.dismissInsight(id);
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }

    if (message.type === 'GET_PATTERNS') {
      (async () => {
        try {
          const patterns = await storageClient.getPatterns();
          sendResponse({ success: true, patterns });
        } catch (err) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }

    if (message.type === 'GET_ADAPTIVE_CONFIG') {
      (async () => {
        try {
          const config = await storageClient.getAdaptiveConfig();
          sendResponse({ success: true, config });
        } catch (err) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }

    if (message.type === 'UPDATE_ADAPTIVE_CONFIG') {
      const { config } = message;
      (async () => {
        try {
          await storageClient.setAdaptiveConfig(config);
          if (smartCoach) smartCoach.updateConfig(config);
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }

    if (message.type === 'START_SMART_BREAK') {
      const { durationMinutes } = message;
      if (smartCoach) {
        smartCoach.startBreak(durationMinutes);
        (async () => {
          await storageClient.setSmartBreakState(smartCoach!.getBreakState());
          sendResponse({ success: true });
        })();
        return true;
      }
      sendResponse({ success: false, error: 'SmartCoach not initialized' });
      return false;
    }

    if (message.type === 'END_SMART_BREAK') {
      if (smartCoach) {
        smartCoach.endBreak();
        (async () => {
          await storageClient.setSmartBreakState(smartCoach!.getBreakState());
          sendResponse({ success: true });
        })();
        return true;
      }
      sendResponse({ success: false, error: 'SmartCoach not initialized' });
      return false;
    }

    if (message.type === 'EXPORT_DATA') {
      (async () => {
        try {
          const jsonString = await dataPipeline.exportData(storageClient);
          sendResponse({ success: true, data: jsonString });
        } catch (err) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }

    if (message.type === 'RESET_ALL_DATA') {
      (async () => {
        try {
          await dataPipeline.executeFullReset(storageClient);
          if (smartCoach) smartCoach.resetContinuousCounter();
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }

    return false;
  });
});
