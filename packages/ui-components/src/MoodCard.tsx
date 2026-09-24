import type { PetVisualState } from '@buddy/shared-types';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { Badge } from './Badge';

export interface MoodCardProps {
  score: number;
  visualState: PetVisualState;
  dailyRecoveryAccumulated: number;
  dialogue?: string;
  className?: string;
}

function getMoodBadgeVariant(score: number): 'success' | 'warning' | 'danger' | 'neutral' {
  if (score >= 70) return 'success';
  if (score >= 40) return 'neutral';
  if (score >= 20) return 'warning';
  return 'danger';
}

function getMoodStateLabel(state: PetVisualState): string {
  switch (state) {
    case 'focused': return 'Deeply Focused';
    case 'happy': return 'Cheerful & Balanced';
    case 'tired': return 'Needs a Break';
    case 'distracted': return 'Scattered Focus';
    case 'recovering': return 'Regrouping Gently';
    case 'sleeping': return 'Resting (Quiet Hours)';
    case 'ecstatic': return 'Peak Performance!';
    case 'worried': return 'Straining';
    case 'sad': return 'Low Energy';
    case 'neutral':
    default:
      return 'Calm & Steady';
  }
}

export function MoodCard({
  score,
  visualState,
  dailyRecoveryAccumulated,
  dialogue = "I'm right here with you. Let's make today count!",
  className = '',
}: MoodCardProps) {
  const roundedScore = Math.round(score);
  const badgeVariant = getMoodBadgeVariant(score);
  const stateLabel = getMoodStateLabel(visualState);

  return (
    <Card title="Buddy Mood" subtitle="Deterministic emotional harmony engine" className={`mood-card ${className}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--buddy-text-main, #0f172a)' }}>
            {roundedScore}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--buddy-text-muted, #64748b)', marginLeft: '4px' }}>
            / 100
          </span>
        </div>
        <Badge variant={badgeVariant}>{stateLabel}</Badge>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <ProgressBar
          percentage={roundedScore}
          color={
            score >= 70
              ? 'var(--buddy-accent-green, #10b981)'
              : score >= 40
              ? 'var(--buddy-primary, #6366f1)'
              : 'var(--buddy-accent-orange, #f59e0b)'
          }
          height={8}
        />
      </div>

      {dialogue && (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'var(--buddy-bg-subtle, #f8fafc)',
            borderRadius: 'var(--buddy-radius-sm, 6px)',
            borderLeft: '3px solid var(--buddy-primary, #6366f1)',
            marginBottom: '10px',
            fontSize: '12px',
            fontStyle: 'italic',
            color: 'var(--buddy-text-main, #334155)',
          }}
        >
          "{dialogue}"
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>
        <span>Daily Positive Recovery</span>
        <span style={{ fontWeight: 600 }}>{dailyRecoveryAccumulated.toFixed(1)} / 20.0 max</span>
      </div>
    </Card>
  );
}
