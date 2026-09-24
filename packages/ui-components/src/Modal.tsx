import type { ComponentChildren } from 'preact';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ComponentChildren;
  onConfirm?: () => void;
  confirmText?: string;
  confirmVariant?: 'primary' | 'danger';
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = 'Confirm',
  confirmVariant = 'primary',
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--buddy-bg-surface)',
          borderRadius: 'var(--buddy-radius-md)',
          padding: '20px',
          width: '90%',
          maxWidth: '380px',
          boxShadow: 'var(--buddy-shadow-md)',
          border: '1px solid var(--buddy-border-subtle)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--buddy-text-main)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'var(--buddy-text-muted)',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: onConfirm ? '16px' : '0' }}>
          {children}
        </div>

        {onConfirm && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--buddy-radius-sm, 6px)',
                border: '1px solid var(--buddy-border-subtle, #cbd5e1)',
                backgroundColor: 'transparent',
                color: 'var(--buddy-text-main, #0f172a)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--buddy-radius-sm, 6px)',
                border: 'none',
                backgroundColor: confirmVariant === 'danger' ? 'var(--buddy-danger, #ef4444)' : 'var(--buddy-primary, #6366f1)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
