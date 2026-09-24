import type { ComponentChildren } from 'preact';

export interface CardProps {
  children: ComponentChildren;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function Card({ children, title, subtitle, className = '' }: CardProps) {
  return (
    <div
      className={`buddy-card ${className}`}
      style={{
        backgroundColor: 'var(--buddy-bg-card)',
        borderRadius: 'var(--buddy-radius-md)',
        border: '1px solid var(--buddy-border-subtle)',
        padding: '16px',
        boxShadow: 'var(--buddy-shadow-sm)',
        marginBottom: '12px',
      }}
    >
      {title && (
        <div style={{ marginBottom: subtitle ? '4px' : '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--buddy-text-main)' }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--buddy-text-muted)' }}>{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
