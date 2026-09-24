import type { DailySummary, WeeklySummary } from '@buddy/shared-types';
import { StatCard, TimeChart, Card, EmptyState } from '@buddy/ui-components';

export interface WatchTimeScreenProps {
  today: DailySummary | null;
  yesterday: DailySummary | null;
  weekly: WeeklySummary | null;
}

export function WatchTimeScreen({ today, yesterday, weekly }: WatchTimeScreenProps) {
  const todayMs = today?.mediaMs ?? 0;
  const yesterdayMs = yesterday?.mediaMs ?? 0;
  const weeklyMs = weekly?.totalMediaMs ?? 0;
  const sessionsCount = today?.sessions ?? 0;

  // Average session calculation
  const avgSessionMs = sessionsCount > 0 ? Math.round((today?.totalActiveMs ?? 0) / sessionsCount) : 0;

  // Weekly trend chart data
  const weeklyChartData = (weekly?.dailySummaries ?? []).map((day) => ({
    label: new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' }),
    value: Math.round(day.mediaMs / 60000),
    color: '#6366f1',
  }));

  // Platform breakdown chart
  const platformChartData = Object.entries(today?.platformStats ?? {})
    .filter(([_, stats]) => stats.mediaMs > 0)
    .map(([platform, stats]) => ({
      label: platform.charAt(0).toUpperCase() + platform.slice(1),
      value: Math.round(stats.mediaMs / 60000),
      color: '#3b82f6',
    }));

  const hasWatchTime = todayMs > 0 || yesterdayMs > 0 || weeklyMs > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--buddy-text-main, #0f172a)' }}>
          Watch Time Intelligence
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)' }}>
          Precision local media tracking from the Phase 3 Watch-Time Engine
        </p>
      </div>

      {/* Comparisons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <StatCard label="Today" milliseconds={todayMs} icon="🎬" />
        <StatCard label="Yesterday" milliseconds={yesterdayMs} icon="⏮️" />
        <StatCard label="Last 7 Days" milliseconds={weeklyMs} icon="📅" />
      </div>

      {!hasWatchTime ? (
        <EmptyState
          title="No watch time recorded"
          message="Play videos, music, or streams on supported platforms (like YouTube, Spotify, or Twitch) to track your media consumption locally."
          icon="📺"
        />
      ) : (
        <>
          {/* Weekly 7-Day Trend Chart */}
          <TimeChart
            title="7-Day Media Trend (Minutes)"
            type="bar"
            data={weeklyChartData}
            unit="min"
            emptyMessage="No weekly media history yet"
          />

          {/* Platform Breakdown */}
          {platformChartData.length > 0 && (
            <TimeChart
              title="Today's Watch Time by Platform"
              type="horizontal-bar"
              data={platformChartData}
              unit="min"
            />
          )}

          {/* Session Dynamics */}
          <Card title="Session Statistics">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>Today's Sessions</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--buddy-text-main, #0f172a)' }}>
                  {sessionsCount}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>Average Active Session</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--buddy-text-main, #0f172a)' }}>
                  {Math.round(avgSessionMs / 60000)}m
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
