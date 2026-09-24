import type { ComponentChildren } from 'preact';

export interface BadgeProps {
  children: ComponentChildren;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    primary: { bg: 'var(--buddy-primary-light)', text: 'var(--buddy-primary)' },
    success: { bg: '#d1fae5', text: 'var(--buddy-success)' },
    warning: { bg: '#fef3c7', text: 'var(--buddy-warning)' },
    danger: { bg: '#fee2e2', text: 'var(--buddy-danger)' },
    neutral: { bg: 'var(--buddy-bg-subtle)', text: 'var(--buddy-text-muted)' },
  };

  const style = colorMap[variant] ?? colorMap['neutral']!;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        fontSize: '11px',
        fontWeight: 600,
        borderRadius: 'var(--buddy-radius-full)',
        backgroundColor: style.bg,
        color: style.text,
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  );
}
