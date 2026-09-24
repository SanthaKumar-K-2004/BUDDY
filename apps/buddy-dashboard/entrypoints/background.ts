import { defineBackground } from 'wxt/sandbox';
import { isBuddyEvent } from '@buddy/shared-types';
import { MoodEngine, StreakEngine } from '@buddy/mood-engine';
import { AnalyticsAggregator, StorageClient, formatDateKey } from '@buddy/storage';

export default defineBackground(() => {
  const moodEngine = new MoodEngine();
  const streakEngine = new StreakEngine();
  const aggregator = new AnalyticsAggregator();
  const storageClient = new StorageClient();

  console.log('[Buddy Dashboard] Background initialized. Mood Score:', moodEngine.getScore());

  // Setup periodic alarms for day rollover and hourly mood decay
  if (typeof chrome !== 'undefined' && chrome.alarms) {
    chrome.alarms.create('buddy-hourly-decay', { periodInMinutes: 60 });
    chrome.alarms.create('buddy-daily-rollover', { periodInMinutes: 1440 }); // Daily

    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'buddy-hourly-decay') {
        moodEngine.applyHourlyDecay();
      } else if (alarm.name === 'buddy-daily-rollover') {
        const todayStr = formatDateKey(new Date());
        const todaySummary = await aggregator.getTodaySummary();
        const goalMet = todaySummary ? todaySummary.focusMs >= 25 * 60 * 1000 : false;
        streakEngine.processDayRollover(todayStr, goalMet);
        await storageClient.set('streakState', streakEngine.getState());
      }
    });
  }

  // Cross-extension message routing (Shield, Focus, Activity)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessageExternal) {
    chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
      console.log('[Buddy Dashboard] Received external message from:', sender.id, message);

      if (!isBuddyEvent(message)) {
        sendResponse({ status: 'INVALID_EVENT' });
        return;
      }

      // Handle typed events
      if (message.type === 'MOOD_EVENT') {
        const payload = message.payload as { delta: number; reason: string };
        moodEngine.applyStimulus(payload.delta, payload.reason, message.source as 'buddy-shield');
        sendResponse({ status: 'ACCEPTED', newScore: moodEngine.getScore() });
        return;
      }

      sendResponse({ status: 'ACKNOWLEDGED' });
    });
  }
});
