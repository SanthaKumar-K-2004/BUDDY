import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { Badge } from './Badge';

export interface LimitCardProps {
  name: string;
  type: 'platform' | 'category' | 'site';
  usedMinutes: number;
  limitMinutes: number;
  warningMinutes?: number;
  isBlocked?: boolean;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function LimitCard({
  name,
  type,
  usedMinutes,
  limitMinutes,
  warningMinutes,
  isBlocked = false,
}: LimitCardProps) {
  const percentage = limitMinutes > 0 ? Math.min(100, Math.round((usedMinutes / limitMinutes) * 100)) : 0;
  const remaining = Math.max(0, limitMinutes - usedMinutes);
  const isOver = usedMinutes >= limitMinutes;
  const isWarning = !isOver && warningMinutes !== undefined && usedMinutes >= warningMinutes;

  let statusBadgeVariant: 'success' | 'warning' | 'danger' | 'neutral' = 'success';
  let statusText = 'Normal';
  let barColor = 'var(--buddy-accent-green, #10b981)';

  if (isOver || isBlocked) {
    statusBadgeVariant = 'danger';
    statusText = isBlocked ? 'Blocked' : 'Exceeded';
    barColor = 'var(--buddy-accent-red, #ef4444)';
  } else if (isWarning) {
    statusBadgeVariant = 'warning';
    statusText = 'Approaching';
    barColor = 'var(--buddy-accent-orange, #f59e0b)';
  }

  return (
    <Card className="limit-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--buddy-text-main, #0f172a)' }}>
            {name}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)', marginLeft: '6px' }}>
            ({type})
          </span>
        </div>
        <Badge variant={statusBadgeVariant}>{statusText}</Badge>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
          <span style={{ color: 'var(--buddy-text-muted, #64748b)' }}>
            Used: {formatMinutes(usedMinutes)} / {formatMinutes(limitMinutes)}
          </span>
          <span style={{ fontWeight: 600, color: isOver ? 'var(--buddy-accent-red, #ef4444)' : 'var(--buddy-text-main, #0f172a)' }}>
            {isOver ? '0m left' : `${formatMinutes(remaining)} left`}
          </span>
        </div>
        <ProgressBar percentage={percentage} color={barColor} height={6} />
      </div>
    </Card>
  );
}
