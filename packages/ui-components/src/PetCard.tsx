import type { PetVisualState } from '@buddy/shared-types';
import { Card } from './Card';
import { Badge } from './Badge';

export interface PetCardProps {
  name?: string;
  visualState: PetVisualState;
  dialogue?: string;
  score?: number;
  className?: string;
}

function getPetStateColor(state: PetVisualState): string {
  switch (state) {
    case 'ecstatic':
    case 'happy':
      return '#10b981'; // Emerald
    case 'focused':
      return '#6366f1'; // Indigo
    case 'recovering':
      return '#06b6d4'; // Cyan
    case 'tired':
      return '#f59e0b'; // Amber
    case 'distracted':
    case 'worried':
      return '#ec4899'; // Pink
    case 'sleeping':
      return '#8b5cf6'; // Purple
    case 'sad':
      return '#64748b'; // Slate
    case 'neutral':
    default:
      return '#3b82f6'; // Blue
  }
}

function getPetTitle(state: PetVisualState): string {
  switch (state) {
    case 'focused': return 'Deep in the Zone';
    case 'happy': return 'Feeling Wonderful';
    case 'ecstatic': return 'On Top of the World!';
    case 'tired': return 'Recharge Needed';
    case 'distracted': return 'Mind Wandering';
    case 'recovering': return 'Catching Breath';
    case 'sleeping': return 'Peaceful Slumber';
    case 'worried': return 'Feeling Strained';
    case 'sad': return 'Low Spirits';
    case 'neutral':
    default:
      return 'Ready to Accompany You';
  }
}

export function PetCard({
  name = 'Buddy',
  visualState,
  dialogue = "I'm right here with you! Let's build healthy habits together.",
  score,
  className = '',
}: PetCardProps) {
  const accentColor = getPetStateColor(visualState);
  const stateTitle = getPetTitle(visualState);

  return (
    <Card className={`pet-card ${className}`}>
      <div
        role="region"
        aria-label={`${name}'s status: ${stateTitle}. ${dialogue}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '12px 8px',
        }}
      >
        {/* Companion SVG Avatar */}
        <div
          style={{
            width: '120px',
            height: '120px',
            marginBottom: '12px',
            position: 'relative',
          }}
        >
          <svg
            viewBox="0 0 120 120"
            width="120"
            height="120"
            aria-hidden="true"
            style={{
              transition: 'transform 0.4s ease',
            }}
          >
            {/* Background Halo */}
            <circle cx="60" cy="60" r="54" fill={accentColor} opacity="0.12" />

            {/* Antennas / Ears */}
            <path
              d="M 38 32 C 30 18, 22 24, 30 38"
              fill="none"
              stroke={accentColor}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cx="26" cy="22" r="4" fill={accentColor} />

            <path
              d="M 82 32 C 90 18, 98 24, 90 38"
              fill="none"
              stroke={accentColor}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cx="94" cy="22" r="4" fill={accentColor} />

            {/* Body */}
            <rect
              x="25"
              y="32"
              width="70"
              height="66"
              rx="28"
              ry="28"
              fill="#ffffff"
              stroke={accentColor}
              strokeWidth="3.5"
            />

            {/* Soft Cheeks */}
            <circle cx="36" cy="68" r="6" fill="#f43f5e" opacity="0.25" />
            <circle cx="84" cy="68" r="6" fill="#f43f5e" opacity="0.25" />

            {/* Eyes & Facial Expression based on visualState */}
            {visualState === 'focused' && (
              <g>
                {/* Focus Band */}
                <rect x="25" y="44" width="70" height="9" fill={accentColor} opacity="0.85" rx="3" />
                <circle cx="44" cy="48" r="4" fill="#ffffff" />
                <circle cx="76" cy="48" r="4" fill="#ffffff" />
                {/* Determined Eyes */}
                <circle cx="44" cy="60" r="4.5" fill="#0f172a" />
                <circle cx="76" cy="60" r="4.5" fill="#0f172a" />
                {/* Confident Smile */}
                <path d="M 52 72 Q 60 77 68 72" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}

            {(visualState === 'happy' || visualState === 'ecstatic') && (
              <g>
                {/* Happy curved eyes ^ ^ */}
                <path d="M 38 58 Q 44 50 50 58" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                <path d="M 70 58 Q 76 50 82 58" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                {/* Big Cheerful Smile */}
                <path d="M 48 70 Q 60 84 72 70 Z" fill="#f43f5e" stroke="#0f172a" strokeWidth="2" />
              </g>
            )}

            {visualState === 'tired' && (
              <g>
                {/* Drooping sleepy eyes */}
                <path d="M 38 58 Q 44 64 50 58" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
                <path d="M 70 58 Q 76 64 82 58" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
                {/* Yawn mouth */}
                <ellipse cx="60" cy="74" rx="4" ry="6" fill="#64748b" />
              </g>
            )}

            {visualState === 'distracted' && (
              <g>
                {/* Wandering Swirly Eyes */}
                <circle cx="42" cy="58" r="5" fill="none" stroke="#ec4899" strokeWidth="2" />
                <circle cx="42" cy="58" r="2" fill="#ec4899" />
                <circle cx="78" cy="58" r="5" fill="none" stroke="#ec4899" strokeWidth="2" />
                <circle cx="78" cy="58" r="2" fill="#ec4899" />
                {/* Wobbly mouth */}
                <path d="M 50 73 Q 56 69 60 73 T 70 73" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}

            {visualState === 'recovering' && (
              <g>
                {/* Gentle peaceful resting eyes */}
                <path d="M 38 60 Q 44 57 50 60" fill="none" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 70 60 Q 76 57 82 60" fill="none" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" />
                {/* Soft warm smile */}
                <path d="M 52 72 Q 60 77 68 72" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" />
                {/* Sparkle */}
                <path d="M 94 48 L 96 42 L 98 48 L 104 50 L 98 52 L 96 58 L 94 52 L 88 50 Z" fill="#06b6d4" />
              </g>
            )}

            {visualState === 'sleeping' && (
              <g>
                {/* Slumber closed eyes */}
                <line x1="38" y1="60" x2="50" y2="60" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" />
                <line x1="70" y1="60" x2="82" y2="60" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" />
                {/* Peaceful line mouth */}
                <path d="M 54 72 Q 60 74 66 72" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
                {/* Zzz indicators */}
                <text x="88" y="38" fill="#8b5cf6" fontSize="12" fontWeight="bold">Z</text>
                <text x="96" y="28" fill="#8b5cf6" fontSize="10" fontWeight="bold">z</text>
                <text x="102" y="20" fill="#8b5cf6" fontSize="8" fontWeight="bold">z</text>
              </g>
            )}

            {(visualState === 'neutral' || visualState === 'worried' || visualState === 'sad') && (
              <g>
                {/* Neutral/soft round eyes */}
                <circle cx="44" cy="58" r="4.5" fill="#0f172a" />
                <circle cx="76" cy="58" r="4.5" fill="#0f172a" />
                {visualState === 'worried' ? (
                  <path d="M 50 74 Q 60 68 70 74" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                ) : visualState === 'sad' ? (
                  <path d="M 52 75 Q 60 70 68 75" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
                ) : (
                  <path d="M 52 71 Q 60 76 68 71" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                )}
              </g>
            )}
          </svg>
        </div>

        {/* Identity & Current State */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--buddy-text-main, #0f172a)' }}>
            {name}
          </span>
          <Badge variant={score !== undefined && score >= 60 ? 'success' : 'neutral'}>
            {stateTitle}
          </Badge>
        </div>

        {/* Dialogue Bubble */}
        <div
          style={{
            maxWidth: '320px',
            padding: '10px 14px',
            backgroundColor: 'var(--buddy-bg-subtle, #f8fafc)',
            borderRadius: 'var(--buddy-radius-md, 8px)',
            border: '1px solid var(--buddy-border-subtle, #e2e8f0)',
            fontSize: '13px',
            color: 'var(--buddy-text-main, #334155)',
            lineHeight: '1.4',
            marginBottom: '8px',
          }}
        >
          "{dialogue}"
        </div>

        {score !== undefined && (
          <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>
            Current Mood Harmony: <strong>{Math.round(score)} / 100</strong>
          </div>
        )}
      </div>
    </Card>
  );
}
