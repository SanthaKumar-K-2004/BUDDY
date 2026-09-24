export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading analytics...', className = '' }: LoadingStateProps) {
  return (
    <div
      className={`buddy-loading-state ${className}`}
      role="status"
      aria-live="polite"
      style={{
        padding: '36px 16px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          border: '3px solid var(--buddy-border-subtle, #e2e8f0)',
          borderTopColor: 'var(--buddy-primary, #6366f1)',
          borderRadius: '50%',
          animation: 'buddy-spin 0.8s linear infinite',
          marginBottom: '12px',
        }}
      />
      <span style={{ fontSize: '13px', color: 'var(--buddy-text-muted, #64748b)' }}>{message}</span>
      <style>{`
        @keyframes buddy-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Unable to read local Buddy data',
  message = 'An unexpected error occurred while accessing your local storage. Your data remains safe on your device.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`buddy-error-state ${className}`}
      role="alert"
      style={{
        padding: '24px 16px',
        textAlign: 'center',
        backgroundColor: '#fff1f2',
        border: '1px solid #fecdd3',
        borderRadius: 'var(--buddy-radius-md, 8px)',
        margin: '12px 0',
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '8px' }} role="img" aria-label="Error Warning">
        ⚠️
      </div>
      <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: '#9f1239' }}>
        {title}
      </h4>
      <p style={{ margin: '0 auto 12px auto', fontSize: '12px', color: '#be123c', maxWidth: '300px' }}>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: '6px 14px',
            backgroundColor: '#e11d48',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--buddy-radius-sm, 6px)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
