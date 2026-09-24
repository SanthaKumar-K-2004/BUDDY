import type { MoodState } from '@buddy/shared-types';
import { PetCard, MoodCard, Card } from '@buddy/ui-components';

export interface PetScreenProps {
  mood: MoodState;
}

export function PetScreen({ mood }: PetScreenProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--buddy-text-main, #0f172a)' }}>
          Buddy Pet Companion
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)' }}>
          A deterministic reflection of your daily focus, breaks, and digital harmony
        </p>
      </div>

      <PetCard
        name="Buddy"
        visualState={mood.visualState}
        score={mood.score}
      />

      <MoodCard
        score={mood.score}
        visualState={mood.visualState}
        dailyRecoveryAccumulated={mood.dailyRecoveryAccumulated}
      />

      <Card title="Deterministic Pet Behavior Rules">
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)', lineHeight: 1.6 }}>
          <li>
            <strong>Focused:</strong> Displayed during or immediately following successful Focus sessions.
          </li>
          <li>
            <strong>Happy / Ecstatic:</strong> Sustained healthy habits with score ≥ 70.
          </li>
          <li>
            <strong>Tired:</strong> Heavy continuous active usage without sufficient breaks.
          </li>
          <li>
            <strong>Distracted:</strong> Rapid tab switching or repeated doomscroll warnings.
          </li>
          <li>
            <strong>Recovering:</strong> Returning from overtime with intentional offline pauses.
          </li>
          <li>
            <strong>Sleeping:</strong> Resting peacefully during quiet hours (10:00 PM – 7:00 AM).
          </li>
        </ul>
      </Card>

      <Card title="Anti-Gaming & Score Integrity">
        <div style={{ fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)', lineHeight: 1.5 }}>
          Buddy uses a capped recovery system to prevent rapid score inflation.
          Daily positive gains are capped at <strong>+20.0 points</strong>, and repeated identical
          events within 30 seconds are automatically deduplicated.
        </div>
      </Card>
    </div>
  );
}
