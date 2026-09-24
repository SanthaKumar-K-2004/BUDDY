export interface ProgressBarProps {
  percentage: number; // 0 to 100
  color?: string;
  height?: number;
}

export function ProgressBar({ percentage, color = 'var(--buddy-primary)', height = 6 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        backgroundColor: 'var(--buddy-border-subtle)',
        borderRadius: 'var(--buddy-radius-full)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: 'var(--buddy-radius-full)',
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}
