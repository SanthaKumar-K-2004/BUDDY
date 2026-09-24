import type { ComponentChildren } from 'preact';

export interface WarningProps {
  children: ComponentChildren;
  level?: 'info' | 'warning' | 'danger';
}

export function Warning({ children, level = 'warning' }: WarningProps) {
  const styles = {
    info: { bg: 'var(--buddy-primary-light)', text: 'var(--buddy-primary)', border: 'var(--buddy-primary)' },
    warning: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
    danger: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
  }[level];

  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 'var(--buddy-radius-sm)',
        backgroundColor: styles.bg,
        color: styles.text,
        borderLeft: `4px solid ${styles.border}`,
        fontSize: '13px',
        lineHeight: 1.4,
        marginBottom: '10px',
      }}
    >
      {children}
    </div>
  );
}

export interface SiteRowProps {
  domain: string;
  category?: string;
  timeSpentMinutes?: number;
  isBlocked?: boolean;
  onToggleBlock?: (blocked: boolean) => void;
}

export function SiteRow({
  domain,
  category,
  timeSpentMinutes = 0,
  isBlocked = false,
  onToggleBlock,
}: SiteRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid var(--buddy-border-subtle)',
      }}
    >
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--buddy-text-main)' }}>{domain}</div>
        {category && (
          <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted)' }}>{category}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--buddy-text-muted)' }}>
          {timeSpentMinutes}m
        </span>
        {onToggleBlock && (
          <button
            onClick={() => onToggleBlock(!isBlocked)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              borderRadius: 'var(--buddy-radius-sm)',
              border: '1px solid var(--buddy-border-subtle)',
              cursor: 'pointer',
              backgroundColor: isBlocked ? '#fee2e2' : 'var(--buddy-bg-card)',
              color: isBlocked ? 'var(--buddy-danger)' : 'var(--buddy-text-main)',
            }}
          >
            {isBlocked ? 'Blocked' : 'Active'}
          </button>
        )}
      </div>
    </div>
  );
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function MetricCard({ title, value, subtext }: MetricCardProps) {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: 'var(--buddy-bg-card)',
        padding: '12px',
        borderRadius: 'var(--buddy-radius-md)',
        border: '1px solid var(--buddy-border-subtle)',
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--buddy-text-muted)', marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--buddy-text-main)', lineHeight: 1.2 }}>
        {value}
      </div>
      {subtext && (
        <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted)', marginTop: '4px' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

export interface ChartContainerProps {
  title: string;
  children: ComponentChildren;
}

export function ChartContainer({ title, children }: ChartContainerProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--buddy-bg-card)',
        padding: '16px',
        borderRadius: 'var(--buddy-radius-md)',
        border: '1px solid var(--buddy-border-subtle)',
        marginBottom: '12px',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--buddy-text-main)', marginBottom: '12px' }}>
        {title}
      </div>
      <div style={{ position: 'relative', width: '100%', minHeight: '140px' }}>
        {children}
      </div>
    </div>
  );
}
