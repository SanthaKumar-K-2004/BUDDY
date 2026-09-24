import { useState } from 'preact/hooks';
import type { MoodState } from '@buddy/shared-types';
import { PetCard, MoodCard, Card, playPetSound, playTreatSound, playBoostSound } from '@buddy/ui-components';

export interface PetScreenProps {
  mood: MoodState;
}

export function PetScreen({ mood }: PetScreenProps) {
  const [trickDialogue, setTrickDialogue] = useState<string | null>(null);

  const handleTrick = (trick: 'paw' | 'roll' | 'guard') => {
    if (trick === 'paw') {
      playPetSound();
      setTrickDialogue('*Buddy gently places a warm, fluffy paw in your palm* Best friends forever! 🐾');
    } else if (trick === 'roll') {
      playTreatSound();
      setTrickDialogue('*Buddy does a playful spin and rolls onto his back happily* Pure joy! ✨');
    } else if (trick === 'guard') {
      playBoostSound();
      setTrickDialogue('*Buddy sits tall with ears perked up* Shields armed! No distracting ads or trackers will pass! 🛡️');
    }

    setTimeout(() => {
      setTrickDialogue(null);
    }, 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#f8fafc', fontWeight: 800, letterSpacing: '-0.3px' }}>
          Buddy Pet Companion
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
          A deterministic reflection of your daily focus, breaks, and digital harmony
        </p>
      </div>

      <PetCard
        name="Buddy"
        visualState={mood.visualState}
        score={mood.score}
        dialogue={trickDialogue || undefined}
      />

      {/* Interactive Pet Tricks & Commands */}
      <Card title="Interactive Companion Tricks">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
            Interact directly with Buddy using real-time open-source acoustic chimes and responsive actions:
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleTrick('paw')}
              style={{
                flex: 1,
                minWidth: '90px',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                color: '#f8fafc',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              🐾 Give Paw
            </button>
            <button
              type="button"
              onClick={() => handleTrick('roll')}
              style={{
                flex: 1,
                minWidth: '90px',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                color: '#f8fafc',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              ✨ Roll Over
            </button>
            <button
              type="button"
              onClick={() => handleTrick('guard')}
              style={{
                flex: 1,
                minWidth: '90px',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                color: '#f8fafc',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              🛡️ Guard Stance
            </button>
          </div>
        </div>
      </Card>

      <MoodCard
        score={mood.score}
        visualState={mood.visualState}
        dailyRecoveryAccumulated={mood.dailyRecoveryAccumulated}
      />

      <Card title="Deterministic Pet Behavior Rules">
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
          <li>
            <strong style={{ color: '#38bdf8' }}>Focused:</strong> Displayed during or immediately following successful Focus sessions.
          </li>
          <li>
            <strong style={{ color: '#10b981' }}>Happy / Ecstatic:</strong> Sustained healthy habits with score ≥ 70.
          </li>
          <li>
            <strong style={{ color: '#f59e0b' }}>Tired:</strong> Heavy continuous active usage without sufficient breaks.
          </li>
          <li>
            <strong style={{ color: '#ec4899' }}>Distracted:</strong> Rapid tab switching or repeated doomscroll warnings.
          </li>
          <li>
            <strong style={{ color: '#06b6d4' }}>Recovering:</strong> Returning from overtime with intentional offline pauses.
          </li>
          <li>
            <strong style={{ color: '#8b5cf6' }}>Sleeping:</strong> Resting peacefully during quiet hours (10:00 PM – 7:00 AM).
          </li>
        </ul>
      </Card>

      <Card title="Anti-Gaming & Score Integrity">
        <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
          Buddy uses a capped recovery system to prevent rapid score inflation.
          Daily positive gains are capped at <strong style={{ color: '#f8fafc' }}>+20.0 points</strong>, and repeated identical
          events within 30 seconds are automatically deduplicated.
        </div>
      </Card>
    </div>
  );
}
