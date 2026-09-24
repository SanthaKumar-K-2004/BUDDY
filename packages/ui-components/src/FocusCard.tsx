import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { Badge } from './Badge';

export interface FocusCardProps {
  isActive: boolean;
  activeSessionDurationMs?: number;
  todayFocusMinutes: number;
  completedSessions: number;
  doomscrollAlertsCount: number;
  targetMinutes?: number;
  onStartFocus?: () => void;
  onEndFocus?: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export function FocusCard({
  isActive,
  activeSessionDurationMs = 0,
  todayFocusMinutes,
  completedSessions,
  doomscrollAlertsCount,
  targetMinutes = 45,
  onStartFocus,
  onEndFocus,
}: FocusCardProps) {
  const progressPct = targetMinutes > 0
    ? Math.min(100, Math.round((todayFocusMinutes / targetMinutes) * 100))
    : 0;

  return (
    <Card
      title="Focus Mode"
      subtitle={isActive ? 'Active session in progress' : 'Stay on track and minimize distraction'}
      className="focus-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isActive ? 'var(--buddy-accent-green, #10b981)' : 'var(--buddy-text-muted, #94a3b8)',
              animation: isActive ? 'buddy-pulse 2s infinite' : 'none',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--buddy-text-main, #0f172a)' }}>
            {isActive ? `Session: ${formatDuration(activeSessionDurationMs)}` : 'Idle'}
          </span>
        </div>
        <Badge variant={isActive ? 'success' : 'neutral'}>
          {isActive ? 'Active' : 'Standby'}
        </Badge>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
          <span style={{ color: 'var(--buddy-text-muted, #64748b)' }}>Today's Focus Goal</span>
          <span style={{ fontWeight: 600, color: 'var(--buddy-text-main, #0f172a)' }}>
            {todayFocusMinutes} / {targetMinutes} min ({progressPct}%)
          </span>
        </div>
        <ProgressBar
          percentage={progressPct}
          color={progressPct >= 100 ? 'var(--buddy-accent-green, #10b981)' : 'var(--buddy-primary, #6366f1)'}
          height={8}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          padding: '10px',
          backgroundColor: 'var(--buddy-bg-subtle, #f8fafc)',
          borderRadius: 'var(--buddy-radius-sm, 6px)',
          marginBottom: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>Sessions Done</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--buddy-text-main, #0f172a)' }}>
            {completedSessions}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>Doomscroll Checks</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--buddy-accent-orange, #f59e0b)' }}>
            {doomscrollAlertsCount}
          </div>
        </div>
      </div>

      {isActive ? (
        onEndFocus && (
          <button
            type="button"
            onClick={onEndFocus}
            style={{
              width: '100%',
              padding: '8px 14px',
              backgroundColor: 'var(--buddy-accent-red, #ef4444)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--buddy-radius-sm, 6px)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            End Focus Session
          </button>
        )
      ) : (
        onStartFocus && (
          <button
            type="button"
            onClick={onStartFocus}
            style={{
              width: '100%',
              padding: '8px 14px',
              backgroundColor: 'var(--buddy-primary, #6366f1)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--buddy-radius-sm, 6px)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Start Focus Session
          </button>
        )
      )}
    </Card>
  );
}
