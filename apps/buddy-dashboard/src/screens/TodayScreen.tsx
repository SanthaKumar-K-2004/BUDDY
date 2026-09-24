import type { DailySummary } from '@buddy/shared-types';
import { StatCard, TimeChart, Card, EmptyState } from '@buddy/ui-components';

export interface TodayScreenProps {
  today: DailySummary | null;
}

export function TodayScreen({ today }: TodayScreenProps) {
  const activeMs = today?.totalActiveMs ?? 0;
  const mediaMs = today?.mediaMs ?? 0;
  const focusMs = today?.focusMs ?? 0;
  const socialMs = today?.socialMs ?? 0;
  const videoMs = today?.videoMs ?? 0;
  const musicMs = today?.musicMs ?? 0;
  const adsBlocked = today?.adsBlocked ?? 0;
  const trackersBlocked = today?.trackersBlocked ?? 0;
  const sessions = today?.sessions ?? 0;
  const limitsReached = today?.limitsReached ?? 0;

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
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--buddy-text-main, #0f172a)' }}>
          Today's Activity
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)' }}>
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
            <StatCard label="Total Active Time" milliseconds={activeMs} icon="⏱️" />
            <StatCard label="Focus Time" milliseconds={focusMs} icon="🎯" />
            <StatCard label="Media Playback" milliseconds={mediaMs} icon="🎬" />
            <StatCard label="Social Browsing" milliseconds={socialMs} icon="💬" />
            <StatCard label="Video Streaming" milliseconds={videoMs} icon="📺" />
            <StatCard label="Music / Audio" milliseconds={musicMs} icon="🎵" />
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
                <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>Sessions</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--buddy-text-main, #0f172a)' }}>
                  {sessions}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>Limits Hit</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: limitsReached > 0 ? 'var(--buddy-accent-red, #ef4444)' : 'var(--buddy-text-main, #0f172a)' }}>
                  {limitsReached}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>Ads Blocked</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--buddy-primary, #6366f1)' }}>
                  {adsBlocked}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>Trackers Blocked</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--buddy-accent-purple, #a855f7)' }}>
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
