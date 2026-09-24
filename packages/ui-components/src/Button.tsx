import type { ComponentChildren } from 'preact';

export interface ButtonProps {
  children: ComponentChildren;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
}: ButtonProps) {
  const baseStyle: Record<string, string | number> = {
    fontFamily: 'var(--buddy-font-family)',
    fontSize: '14px',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: 'var(--buddy-radius-sm)',
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  };

  const variantStyles: Record<string, Record<string, string | number>> = {
    primary: {
      backgroundColor: 'var(--buddy-primary)',
      color: 'var(--buddy-text-on-primary)',
    },
    secondary: {
      backgroundColor: 'var(--buddy-bg-card)',
      color: 'var(--buddy-text-main)',
      borderColor: 'var(--buddy-border-subtle)',
    },
    danger: {
      backgroundColor: 'var(--buddy-danger)',
      color: 'var(--buddy-text-on-primary)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--buddy-text-main)',
    },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`buddy-btn ${className}`}
      style={{ ...baseStyle, ...variantStyles[variant] }}
    >
      {children}
    </button>
  );
}
