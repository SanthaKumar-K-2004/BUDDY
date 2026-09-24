import type { ComponentChildren } from 'preact';

export interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: string;
  actionText?: string;
  onAction?: () => void;
  children?: ComponentChildren;
  className?: string;
}

export function EmptyState({
  title = 'No activity yet',
  message = 'Buddy is actively monitoring your browsing sessions locally. As you use supported platforms or start Focus sessions, your metrics will appear here.',
  icon = '🌱',
  actionText,
  onAction,
  children,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`buddy-empty-state ${className}`}
      style={{
        padding: '32px 16px',
        textAlign: 'center',
        backgroundColor: 'var(--buddy-bg-card, #ffffff)',
        border: '1px dashed var(--buddy-border-subtle, #e2e8f0)',
        borderRadius: 'var(--buddy-radius-md, 8px)',
        margin: '12px 0',
      }}
    >
      <div style={{ fontSize: '36px', marginBottom: '8px' }} role="img" aria-label={title}>
        {icon}
      </div>
      <h4
        style={{
          margin: '0 0 6px 0',
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--buddy-text-main, #0f172a)',
        }}
      >
        {title}
      </h4>
      <p
        style={{
          margin: '0 auto 16px auto',
          fontSize: '13px',
          color: 'var(--buddy-text-muted, #64748b)',
          maxWidth: '340px',
          lineHeight: '1.4',
        }}
      >
        {message}
      </p>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--buddy-primary, #6366f1)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--buddy-radius-sm, 6px)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {actionText}
        </button>
      )}

      {children}
    </div>
  );
}
