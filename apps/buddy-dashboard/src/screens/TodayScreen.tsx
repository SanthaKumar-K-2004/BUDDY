import type { DailySummary } from '@buddy/shared-types';
import { StatCard, TimeChart, Card, EmptyState } from '@buddy/ui-components';

export interface TodayScreenProps {
  today: DailySummary | null;
}

export function TodayScreen({ today }: TodayScreenProps) {
  const activeMs = today?.totalActiveMs ?? 0;
  // Guard against any past runaway accumulation: media time is bounded by actual active time
  const mediaMs = activeMs > 0 ? Math.min(today?.mediaMs ?? 0, activeMs) : (today?.mediaMs ?? 0);
  const focusMs = today?.focusMs ?? 0;
  const socialMs = today?.socialMs ?? 0;
  const videoMs = today?.videoMs ?? 0;
  const musicMs = today?.musicMs ?? 0;
  const adsBlocked = today?.adsBlocked ?? 0;
  const trackersBlocked = today?.trackersBlocked ?? 0;
  // Normalize session count so 5-second heartbeats from previous runs don't show 100+ sessions
  const sessions = activeMs > 0
    ? Math.min(today?.sessions ?? 0, Math.max(1, Math.ceil(activeMs / 60000)))
    : (today?.sessions ?? 0);
  const limitsReached = today?.limitsReached ?? 0;

  const handleRecalibrate = () => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['dailyStats'], (res) => {
        const stats = res?.dailyStats || {};
        const todayKey = new Date().toISOString().split('T')[0];
        if (stats[todayKey]) {
          const day = stats[todayKey];
          day.totalMediaWatchSeconds = Math.min(day.totalMediaWatchSeconds, day.totalActiveSeconds);
          day.sessionsCount = Math.max(1, Math.min(day.sessionsCount, Math.ceil(day.totalActiveSeconds / 60)));
          chrome.storage.local.set({ dailyStats: stats }, () => {
            window.location.reload();
          });
        }
      });
    }
  };

  const hasActivity = activeMs > 0 || focusMs > 0 || (adsBlocked + trackersBlocked) > 0;

  // Category breakdown chart data (only include non-zero or supported)
  const categoryData = [
    { label: 'Focus', value: Math.round(focusMs / 60000), color: '#6366f1' },
    { label: 'Video', value: Math.round(videoMs / 60000), color: '#ef4444' },
    { label: 'Social', value: Math.round(socialMs / 60000), color: '#3b82f6' },
    { label: 'Music', value: Math.round(musicMs / 60000), color: '#10b981' },
  ].filter((item) => item.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: 'var(--buddy-text-main, #f8fafc)', letterSpacing: '-0.3px' }}>
          Today's Activity
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--buddy-text-muted, #94a3b8)' }}>
          Real local metrics recorded on this device today
        </p>
      </div>

      {!hasActivity ? (
        <EmptyState
          title="No activity recorded today"
          message="No web sessions or media playback have been recorded yet today. Visit supported sites to start seeing local statistics."
          icon="☀️"
        />
      ) : (
        <>
          {/* Primary Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <StatCard label="Total Active Time" milliseconds={activeMs} icon="⏱️" accentColor="#38bdf8" />
            <StatCard label="Focus Time" milliseconds={focusMs} icon="🎯" accentColor="#818cf8" />
            <StatCard label="Media Playback" milliseconds={mediaMs} icon="🎬" accentColor="#fb7185" />
            <StatCard label="Social Browsing" milliseconds={socialMs} icon="💬" accentColor="#60a5fa" />
            <StatCard label="Video Streaming" milliseconds={videoMs} icon="📺" accentColor="#f43f5e" />
            <StatCard label="Music / Audio" milliseconds={musicMs} icon="🎵" accentColor="#34d399" />
          </div>

          {/* Activity Breakdown Chart */}
          <TimeChart
            title="Time Distribution (Minutes)"
            type="bar"
            data={categoryData}
            unit="min"
            emptyMessage="No categorized time recorded today yet"
          />

          {/* Secondary Counts */}
          <Card title="Activity & Enforcement Summary">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--buddy-text-muted, #94a3b8)', marginBottom: '3px' }}>Sessions</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--buddy-text-main, #f8fafc)' }}>
                  {sessions}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--buddy-text-muted, #94a3b8)', marginBottom: '3px' }}>Limits Hit</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: limitsReached > 0 ? 'var(--buddy-accent-red, #ef4444)' : 'var(--buddy-text-main, #f8fafc)' }}>
                  {limitsReached}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--buddy-text-muted, #94a3b8)', marginBottom: '3px' }}>Ads Blocked</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--buddy-primary, #818cf8)' }}>
                  {adsBlocked}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--buddy-text-muted, #94a3b8)', marginBottom: '3px' }}>Trackers Blocked</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--buddy-accent-purple, #c084fc)' }}>
                  {trackersBlocked}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
