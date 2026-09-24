import type { ComponentChildren } from 'preact';

export interface CardProps {
  children: ComponentChildren;
  title?: string;
  subtitle?: string;
  className?: string;
  noPadding?: boolean;
}

export function Card({ children, title, subtitle, className = '', noPadding = false }: CardProps) {
  return (
    <div
      className={`buddy-card ${className}`}
      style={{
        backgroundColor: 'var(--buddy-bg-card, rgba(255, 255, 255, 0.035))',
        borderRadius: 'var(--buddy-radius-md, 14px)',
        border: '1px solid var(--buddy-border-subtle, rgba(255, 255, 255, 0.07))',
        backdropFilter: 'blur(12px)',
        padding: noPadding ? '0' : '14px 16px',
        boxShadow: 'var(--buddy-shadow-sm, 0 4px 12px rgba(0,0,0,0.2))',
        marginBottom: '10px',
        transition: 'border-color 0.2s ease, background-color 0.2s ease',
      }}
    >
      {title && (
        <div style={{ marginBottom: subtitle ? '4px' : '10px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--buddy-text-main, #f8fafc)', letterSpacing: '-0.3px' }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--buddy-text-muted, #94a3b8)', lineHeight: 1.4 }}>{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
