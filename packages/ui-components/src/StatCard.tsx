import type { ComponentChildren } from 'preact';

export interface StatCardProps {
  title?: string;
  label?: string;
  value?: string | number;
  milliseconds?: number;
  count?: number;
  subtext?: string;
  icon?: string;
  trend?: string;
  accentColor?: string;
  children?: ComponentChildren;
}

function formatDurationMs(ms: number): string {
  if (ms <= 0) return '0m';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

export function StatCard({
  title,
  label,
  value,
  milliseconds,
  count,
  subtext,
  icon,
  trend,
  accentColor = '#6366f1',
  children,
}: StatCardProps) {
  const displayTitle = title || label || '';
  let displayValue: string | number = value ?? '';

  if (milliseconds !== undefined) {
    displayValue = formatDurationMs(milliseconds);
  } else if (count !== undefined) {
    displayValue = count.toLocaleString();
  }

  return (
    <div
      className="buddy-stat-card"
      style={{
        backgroundColor: 'var(--buddy-bg-card, rgba(255, 255, 255, 0.035))',
        borderRadius: '12px',
        border: '1px solid var(--buddy-border-subtle, rgba(255, 255, 255, 0.07))',
        borderTop: accentColor ? `2px solid ${accentColor}` : undefined,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flex: 1,
        minWidth: '85px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: 'var(--buddy-text-muted, #94a3b8)',
          }}
        >
          {displayTitle}
        </span>
        {icon && <span style={{ fontSize: '14px', opacity: 0.8 }} aria-hidden="true">{icon}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span
          style={{
            fontSize: '18px',
            fontWeight: 800,
            color: 'var(--buddy-text-main, #f8fafc)',
            letterSpacing: '-0.4px',
          }}
        >
          {displayValue}
        </span>
        {trend && (
          <span style={{ fontSize: '10px', color: 'var(--buddy-success, #10b981)', fontWeight: 600 }}>
            {trend}
          </span>
        )}
      </div>

      {subtext && (
        <span style={{ fontSize: '10px', color: 'var(--buddy-text-muted, #64748b)', marginTop: '2px' }}>
          {subtext}
        </span>
      )}

      {children}
    </div>
  );
}
