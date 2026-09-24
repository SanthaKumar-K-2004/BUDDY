import { Card } from './Card';
import { Badge } from './Badge';

export interface BlockedCardProps {
  adsBlocked: number;
  trackersBlocked: number;
  totalBlocked?: number;
  isShieldActive?: boolean;
}

export function BlockedCard({
  adsBlocked,
  trackersBlocked,
  totalBlocked,
  isShieldActive = true,
}: BlockedCardProps) {
  const calculatedTotal = totalBlocked !== undefined ? totalBlocked : adsBlocked + trackersBlocked;

  return (
    <Card
      title="Buddy Shield Protection"
      subtitle="Local network interception & privacy enforcement"
      className="blocked-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isShieldActive ? 'var(--buddy-accent-green, #10b981)' : 'var(--buddy-accent-red, #ef4444)',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--buddy-text-main, #0f172a)' }}>
            {isShieldActive ? 'Shield Active' : 'Shield Paused'}
          </span>
        </div>
        <Badge variant={isShieldActive ? 'success' : 'neutral'}>
          {isShieldActive ? 'Filtering ON' : 'Disabled'}
        </Badge>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          padding: '12px',
          backgroundColor: 'var(--buddy-bg-subtle, #f8fafc)',
          borderRadius: 'var(--buddy-radius-sm, 6px)',
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>Ads Blocked</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--buddy-primary, #6366f1)' }}>
            {adsBlocked.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>Trackers Blocked</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--buddy-accent-purple, #a855f7)' }}>
            {trackersBlocked.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>Total Intercepts</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--buddy-accent-green, #10b981)' }}>
            {calculatedTotal.toLocaleString()}
          </div>
        </div>
      </div>
    </Card>
  );
}
