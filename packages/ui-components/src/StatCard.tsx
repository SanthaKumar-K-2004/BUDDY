/**
 * @buddy/ui-components - StatCard.tsx
 * Clean, accessible metric card displaying primary KPIs.
 */

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
  accentColor,
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
        backgroundColor: 'var(--buddy-bg-card)',
        borderRadius: 'var(--buddy-radius-md)',
        border: '1px solid var(--buddy-border-subtle)',
        borderLeft: accentColor ? `4px solid ${accentColor}` : '1px solid var(--buddy-border-subtle)',
        padding: '12px 14px',
        boxShadow: 'var(--buddy-shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flex: 1,
        minWidth: '100px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--buddy-text-muted)' }}>{displayTitle}</span>
        {icon && <span style={{ fontSize: '16px' }} aria-hidden="true">{icon}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--buddy-text-main)', letterSpacing: '-0.5px' }}>
          {displayValue}
        </span>
        {trend && (
          <span style={{ fontSize: '11px', color: 'var(--buddy-accent-green)', fontWeight: 600 }}>
            {trend}
          </span>
        )}
      </div>

      {subtext && (
        <span style={{ fontSize: '10px', color: 'var(--buddy-text-muted)', marginTop: '4px' }}>
          {subtext}
        </span>
      )}

      {children}
    </div>
  );
}
