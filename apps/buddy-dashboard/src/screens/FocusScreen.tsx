import { useState, useEffect } from 'preact/hooks';
import type { DailySummary, StreakState } from '@buddy/shared-types';
import { FocusCard, TimeChart, Card } from '@buddy/ui-components';
import { StorageClient, AnalyticsAggregator } from '@buddy/storage';
import { MoodEngine } from '@buddy/mood-engine';

export interface FocusScreenProps {
  today: DailySummary | null;
  streak: StreakState;
  isFocusActive: boolean;
  focusSessionStart: number | null;
  onRefresh: () => void;
}

export function FocusScreen({
  today,
  streak: _streak,
  isFocusActive,
  focusSessionStart,
  onRefresh,
}: FocusScreenProps) {
  const [sessionElapsedMs, setSessionElapsedMs] = useState(0);

  // Live timer for active focus session
  useEffect(() => {
    if (!isFocusActive || !focusSessionStart) {
      setSessionElapsedMs(0);
      return undefined;
    }

    const interval = setInterval(() => {
      setSessionElapsedMs(Math.max(0, Date.now() - focusSessionStart));
    }, 1000);

    return () => clearInterval(interval);
  }, [isFocusActive, focusSessionStart]);

  const todayFocusMinutes = Math.round((today?.focusMs ?? 0) / 60000);
  const doomscrollChecks = today?.limitsReached ?? 0;

  const handleStartFocus = async () => {
    const storageClient = new StorageClient();
    await storageClient.set('focusState', {
      isActive: true,
      sessionStartTime: Date.now(),
      targetDurationMinutes: 45,
      mode: 'strict',
    });
    onRefresh();
  };

  const handleEndFocus = async () => {
    const storageClient = new StorageClient();
    const stored = await storageClient.getStorage();
    const startTime = stored.focusState?.sessionStartTime ?? Date.now();
    const durationMs = Math.max(0, Date.now() - startTime);

    // Apply positive mood stimulus for completing focus block
    const moodEngine = new MoodEngine();
    moodEngine.applyStimulus(5, 'Completed Focus session', 'buddy-focus');

    // Update storage
    await storageClient.set('focusState', {
      isActive: false,
      sessionStartTime: null,
      targetDurationMinutes: 0,
      mode: 'normal',
    });

    // Record session duration via AnalyticsAggregator
    const aggregator = new AnalyticsAggregator();
    await aggregator.recordFocusSession(durationMs);

    onRefresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--buddy-text-main, #0f172a)' }}>
          Focus & Wellbeing Control
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)' }}>
          Intentional work periods and doomscroll behavior interventions
        </p>
      </div>

      <FocusCard
        isActive={isFocusActive}
        activeSessionDurationMs={sessionElapsedMs}
        todayFocusMinutes={todayFocusMinutes}
        completedSessions={todayFocusMinutes > 0 ? Math.max(1, Math.floor(todayFocusMinutes / 25)) : 0}
        doomscrollAlertsCount={doomscrollChecks}
        targetMinutes={45}
        onStartFocus={handleStartFocus}
        onEndFocus={handleEndFocus}
      />

      <Card title="Focus Principles">
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)', lineHeight: 1.6 }}>
          <li>Focus sessions temporarily pause distracting feeds and social sites.</li>
          <li>Completing a 25+ minute session adds +5.0 to Buddy Pet's mood score.</li>
          <li>Doomscroll intervention triggers gentle prompts after sustained rapid-scrolling.</li>
          <li>All behavior evaluation happens 100% locally on your browser.</li>
        </ul>
      </Card>

      {todayFocusMinutes > 0 && (
        <TimeChart
          title="Today's Focus vs Other Active Time"
          type="donut"
          data={[
            { label: 'Focus Time', value: todayFocusMinutes, color: '#6366f1' },
            { label: 'Other Activity', value: Math.max(0, Math.round(((today?.totalActiveMs ?? 0) - (today?.focusMs ?? 0)) / 60000)), color: '#cbd5e1' },
          ]}
          unit="min"
        />
      )}
    </div>
  );
}
