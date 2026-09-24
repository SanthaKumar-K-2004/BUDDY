export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        userSelect: 'none',
      }}
    >
      <div
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: '36px',
          height: '20px',
          backgroundColor: checked ? 'var(--buddy-primary)' : 'var(--buddy-border-strong)',
          borderRadius: 'var(--buddy-radius-full)',
          position: 'relative',
          transition: 'background-color 0.2s ease',
        }}
      >
        <div
          style={{
            width: '16px',
            height: '16px',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            position: 'absolute',
            top: '2px',
            left: checked ? '18px' : '2px',
            transition: 'left 0.2s ease',
            boxShadow: 'var(--buddy-shadow-sm)',
          }}
        />
      </div>
      {label && (
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--buddy-text-main)' }}>
          {label}
        </span>
      )}
    </label>
  );
}
