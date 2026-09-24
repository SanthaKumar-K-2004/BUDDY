import type { DailySummary } from '@buddy/shared-types';
import { BlockedCard, Card, TimeChart, EmptyState } from '@buddy/ui-components';

export interface BlockedScreenProps {
  today: DailySummary | null;
  isShieldActive: boolean;
}

export function BlockedScreen({ today, isShieldActive }: BlockedScreenProps) {
  const adsBlocked = today?.adsBlocked ?? 0;
  const trackersBlocked = today?.trackersBlocked ?? 0;
  const totalBlocked = adsBlocked + trackersBlocked;

  const chartData = [
    { label: 'Ads Blocked', value: adsBlocked, color: '#6366f1' },
    { label: 'Trackers Blocked', value: trackersBlocked, color: '#a855f7' },
  ].filter((item) => item.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--buddy-text-main, #0f172a)' }}>
          Buddy Shield Interceptions
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)' }}>
          Real local request blocking statistics from declarativeNetRequest & DNR rule engines
        </p>
      </div>

      <BlockedCard
        adsBlocked={adsBlocked}
        trackersBlocked={trackersBlocked}
        totalBlocked={totalBlocked}
        isShieldActive={isShieldActive}
      />

      {totalBlocked === 0 ? (
        <EmptyState
          title="No blocked requests today"
          message="Buddy Shield runs locally using verified filter lists. When web pages attempt to load invasive ads or privacy trackers, they will be blocked and recorded here."
          icon="🛡️"
        />
      ) : (
        <>
          <TimeChart
            title="Blocking Breakdown"
            type="donut"
            data={chartData}
            unit="reqs"
          />

          <Card title="Shield Privacy & Security Guarantees">
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)', lineHeight: 1.6 }}>
              <li>All rule matching occurs directly inside browser runtime engines.</li>
              <li>Blocked URLs and browsing domains never leave your local machine.</li>
              <li>Protects your privacy against fingerprinting, third-party analytics, and telemetry.</li>
              <li>Saves bandwidth and accelerates page load times across all tabs.</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
