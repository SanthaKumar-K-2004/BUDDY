import { Card } from './Card';
import { Badge } from './Badge';

export interface StreakCardProps {
  currentStreak?: number;
  longestStreak?: number;
  freezesRemaining?: number;
  currentStreakDays?: number;
  bestStreakDays?: number;
  freezeTokensAvailable?: number;
  isTodayGoalMet: boolean;
  goalDescription?: string;
  className?: string;
}

export function StreakCard({
  currentStreak,
  longestStreak,
  freezesRemaining,
  currentStreakDays,
  bestStreakDays,
  freezeTokensAvailable,
  isTodayGoalMet,
  goalDescription = 'Complete at least 25m of Focus or stay under all limits',
  className = '',
}: StreakCardProps) {
  const effectiveCurrent = currentStreakDays ?? currentStreak ?? 0;
  const effectiveLongest = bestStreakDays ?? longestStreak ?? 0;
  const effectiveFreezes = freezeTokensAvailable ?? freezesRemaining ?? 0;

  return (
    <Card
      title="Habit Streaks"
      subtitle="Consistent, measured positive habits"
      className={`streak-card ${className}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }} role="img" aria-label="Fire Flame">
            🔥
          </span>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--buddy-accent-orange, #f59e0b)' }}>
              {effectiveCurrent} {effectiveCurrent === 1 ? 'Day' : 'Days'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>
              Best record: {effectiveLongest} {effectiveLongest === 1 ? 'day' : 'days'}
            </div>
          </div>
        </div>

        <Badge variant={isTodayGoalMet ? 'success' : 'neutral'}>
          {isTodayGoalMet ? 'Today: Completed ✓' : 'Today: In Progress'}
        </Badge>
      </div>

      <div
        style={{
          padding: '10px 12px',
          backgroundColor: 'var(--buddy-bg-subtle, #f8fafc)',
          borderRadius: 'var(--buddy-radius-sm, 6px)',
          marginBottom: '10px',
        }}
      >
        <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)', marginBottom: '2px' }}>
          Qualifying Daily Target
        </div>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--buddy-text-main, #0f172a)' }}>
          {goalDescription}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <span style={{ color: 'var(--buddy-text-muted, #64748b)' }}>Streak Freezes Available</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1, 2].map((tokenIdx) => (
            <span
              key={tokenIdx}
              style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: tokenIdx <= effectiveFreezes ? 'var(--buddy-accent-cyan, #06b6d4)' : 'var(--buddy-border-subtle, #cbd5e1)',
                textAlign: 'center',
                lineHeight: '16px',
                fontSize: '10px',
                color: '#ffffff',
              }}
              title={tokenIdx <= effectiveFreezes ? 'Freeze Token Available' : 'Used'}
            >
              ❄
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
