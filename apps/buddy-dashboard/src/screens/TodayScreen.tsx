import type { DailySummary } from '@buddy/shared-types';
import { Card, EmptyState } from '@buddy/ui-components';

export interface TodayScreenProps {
  today: DailySummary | null;
}

export function TodayScreen({ today }: TodayScreenProps) {
  const rawActiveMs = today?.totalActiveMs ?? 0;
  const rawMediaMs = today?.mediaMs ?? 0;
  const rawVideoMs = today?.videoMs ?? 0;
  const focusMs = today?.focusMs ?? 0;
  const socialMs = today?.socialMs ?? 0;
  const musicMs = today?.musicMs ?? 0;

  // Real-world active time is at least the sum of focused work or media playback
  const activeMs = Math.max(rawActiveMs, rawMediaMs, rawVideoMs, focusMs);
  const mediaMs = activeMs > 0 ? Math.min(rawMediaMs || rawVideoMs, activeMs) : (rawMediaMs || rawVideoMs);
  const videoMs = activeMs > 0 ? Math.min(rawVideoMs || mediaMs, activeMs) : (rawVideoMs || mediaMs);
  const otherMs = Math.max(0, activeMs - focusMs - mediaMs - socialMs);
  const adsBlocked = today?.adsBlocked ?? 0;
  const trackersBlocked = today?.trackersBlocked ?? 0;
  const blockedCount = adsBlocked + trackersBlocked;

  // Normalized realistic sessions count
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

  const hasActivity = activeMs > 0 || focusMs > 0 || mediaMs > 0 || videoMs > 0 || blockedCount > 0;

  const formatMins = (ms: number): string => {
    const mins = Math.round(ms / 60000);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
    }
    return `${mins}m`;
  };

  // Categories list for clean modern chart
  const categories = [
    { label: 'Video & Media', ms: videoMs || mediaMs, icon: '🎬', color: '#f43f5e' },
    { label: 'Intentional Focus', ms: focusMs, icon: '🎯', color: '#818cf8' },
    { label: 'Social Browsing', ms: socialMs, icon: '💬', color: '#38bdf8' },
    { label: 'Music & Audio', ms: musicMs, icon: '🎵', color: '#2dd4bf' },
    { label: 'Other Web', ms: otherMs, icon: '🌐', color: '#34d399' },
  ].filter((c) => c.ms > 0);

  const focusRatio = activeMs > 0 ? Math.round((focusMs / activeMs) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Header with Title and Recalibrate */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 800, color: 'var(--buddy-text-main, #f8fafc)', letterSpacing: '-0.3px' }}>
            Today's Activity
          </h3>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--buddy-text-muted, #94a3b8)' }}>
            Real-time on-device metrics & time intelligence
          </p>
        </div>
        <button
          type="button"
          onClick={handleRecalibrate}
          title="Recalibrate metrics"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'var(--buddy-text-muted, #94a3b8)',
            fontSize: '11px',
            padding: '4px 8px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🔄 Calibrate
        </button>
      </div>

      {!hasActivity ? (
        <EmptyState
          title="No activity recorded today"
          message="No web sessions or media playback have been recorded yet today. Visit supported sites to start seeing local statistics."
          icon="☀️"
        />
      ) : (
        <>
          {/* Executive Unified Metrics Dock (No Big Boxes) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.035)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '12px 14px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Total Active */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                Active Time
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' }}>
                {formatMins(activeMs)}
              </div>
            </div>

            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

            {/* Focus */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                Focus
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#818cf8', letterSpacing: '-0.3px' }}>
                {formatMins(focusMs)}
              </div>
            </div>

            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

            {/* Media */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                Media
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f43f5e', letterSpacing: '-0.3px' }}>
                {formatMins(mediaMs)}
              </div>
            </div>

            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

            {/* Blocked */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                Shielded
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399', letterSpacing: '-0.3px' }}>
                {blockedCount.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Clean Neat Time Distribution Chart Card */}
          <Card title="Time Distribution">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Stacked Proportional Distribution Bar */}
              <div
                style={{
                  width: '100%',
                  height: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  display: 'flex',
                }}
              >
                {categories.map((cat) => {
                  const pct = Math.max(4, Math.round((cat.ms / activeMs) * 100));
                  return (
                    <div
                      key={cat.label}
                      title={`${cat.label}: ${formatMins(cat.ms)} (${Math.round((cat.ms / activeMs) * 100)}%)`}
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: cat.color,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  );
                })}
              </div>

              {/* Clean Categories Row List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {categories.map((cat) => {
                  const pct = Math.round((cat.ms / activeMs) * 100);
                  return (
                    <div
                      key={cat.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cat.color }} />
                        <span style={{ color: 'var(--buddy-text-main, #f8fafc)', fontWeight: 600 }}>
                          {cat.icon} {cat.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--buddy-text-muted, #94a3b8)', fontSize: '10px' }}>
                          {pct}%
                        </span>
                        <strong style={{ color: 'var(--buddy-text-main, #f8fafc)', fontWeight: 700 }}>
                          {formatMins(cat.ms)}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Session & Enforcement Intelligence Dock */}
          <Card title="Activity & Session Intelligence">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ padding: '6px 4px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', marginBottom: '2px' }}>
                  Sessions
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
                  {sessions}
                </div>
              </div>

              <div style={{ padding: '6px 4px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Limits Hit
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: limitsReached > 0 ? '#ef4444' : '#10b981' }}>
                  {limitsReached}
                </div>
              </div>

              <div style={{ padding: '6px 4px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Focus Ratio
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: focusRatio >= 50 ? '#34d399' : '#38bdf8' }}>
                  {focusRatio}%
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
