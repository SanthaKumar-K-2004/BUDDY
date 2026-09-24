import type { PetVisualState } from '@buddy/shared-types';

export interface HeaderProps {
  petState: PetVisualState;
  score: number;
  isFocusActive: boolean;
  isShieldActive: boolean;
  onRefresh: () => void;
}

export function Header({
  petState,
  score,
  isFocusActive,
  isShieldActive,
  onRefresh,
}: HeaderProps) {
  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: 'var(--buddy-bg-surface, #ffffff)',
        borderBottom: '1px solid var(--buddy-border-subtle, #e2e8f0)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'var(--buddy-primary-light, #e0e7ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}
          title={`Buddy status: ${petState} (${Math.round(score)}/100)`}
        >
          🐾
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--buddy-text-main, #0f172a)', lineHeight: 1.1 }}>
            Buddy
          </div>
          <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>
            {todayStr}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: 'var(--buddy-radius-full, 9999px)',
            backgroundColor: isShieldActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: isShieldActive ? '#059669' : '#dc2626',
            fontWeight: 600,
          }}
          title={isShieldActive ? 'Buddy Shield Active' : 'Buddy Shield Disabled'}
        >
          🛡️ {isShieldActive ? 'Protected' : 'Off'}
        </span>

        {isFocusActive && (
          <span
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: 'var(--buddy-radius-full, 9999px)',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              color: '#4f46e5',
              fontWeight: 600,
            }}
          >
            🎯 Focusing
          </span>
        )}

        <button
          type="button"
          onClick={onRefresh}
          title="Refresh metrics"
          aria-label="Refresh local analytics"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--buddy-text-muted, #64748b)',
            cursor: 'pointer',
            padding: '4px',
            fontSize: '14px',
            borderRadius: '4px',
          }}
        >
          🔄
        </button>
      </div>
    </header>
  );
}
