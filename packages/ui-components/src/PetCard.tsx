import { useState, useEffect } from 'preact/hooks';
import type { PetVisualState } from '@buddy/shared-types';
import { Card } from './Card.js';

export interface PetCardProps {
  name?: string;
  visualState: PetVisualState;
  dialogue?: string;
  score?: number;
  className?: string;
  interactive?: boolean;
  onInteraction?: (action: 'pet' | 'treat' | 'boost' | 'rest') => void;
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
      return '#38bdf8'; // Sky Blue
  }
}

function getPetTitle(state: PetVisualState): string {
  switch (state) {
    case 'focused': return 'Deep in Focus';
    case 'happy': return 'Feeling Great';
    case 'ecstatic': return 'Super Energized!';
    case 'tired': return 'Needs a Break';
    case 'distracted': return 'Mind Wandering';
    case 'recovering': return 'Regaining Energy';
    case 'sleeping': return 'Quiet Slumber';
    case 'worried': return 'Feeling Strained';
    case 'sad': return 'Needs Care';
    case 'neutral':
    default:
      return 'Guardian Companion';
  }
}

export function PetCard({
  name = 'Buddy',
  visualState,
  dialogue: initialDialogue = "I'm your wellness guardian! Let's protect your focus and digital peace.",
  score = 80,
  className = '',
  interactive = true,
  onInteraction,
}: PetCardProps) {
  const accentColor = getPetStateColor(visualState);
  const stateTitle = getPetTitle(visualState);

  const [activeDialogue, setActiveDialogue] = useState(initialDialogue);
  const [animType, setAnimType] = useState<'idle' | 'wiggle' | 'bounce' | 'glow' | 'sleep'>('idle');
  const [particles, setParticles] = useState<string[]>([]);
  const [interactCooldown, setInteractCooldown] = useState(false);

  useEffect(() => {
    setActiveDialogue(initialDialogue);
  }, [initialDialogue]);

  const triggerAction = (type: 'pet' | 'treat' | 'boost' | 'rest') => {
    if (interactCooldown) return;
    setInteractCooldown(true);

    if (type === 'pet') {
      setAnimType('wiggle');
      setParticles(['💖', '🐾', '✨']);
      setActiveDialogue(`Purrr... ${name} loves being your companion! Keep up the great digital balance.`);
    } else if (type === 'treat') {
      setAnimType('bounce');
      setParticles(['🍎', '⭐', '✨']);
      setActiveDialogue(`Nom nom nom! Crisp and delicious! Digital energy and wellness replenished.`);
    } else if (type === 'boost') {
      setAnimType('glow');
      setParticles(['⚡', '🎯', '🚀']);
      setActiveDialogue(`Focus shields locked in! Let's conquer your tasks with zero distractions.`);
    } else if (type === 'rest') {
      setAnimType('sleep');
      setParticles(['💤', '🌙', '☁️']);
      setActiveDialogue(`Taking a peaceful mindful breath... Rest is essential for peak focus.`);
    }

    if (onInteraction) {
      onInteraction(type);
    }

    setTimeout(() => {
      setAnimType('idle');
      setParticles([]);
    }, 2200);

    setTimeout(() => {
      setInteractCooldown(false);
    }, 150);
  };

  const animStyle =
    animType === 'wiggle'
      ? { animation: 'buddyWiggle 0.6s ease-in-out infinite' }
      : animType === 'bounce'
      ? { animation: 'buddyBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite' }
      : animType === 'glow'
      ? { animation: 'buddyGlow 1s ease-in-out infinite', filter: `drop-shadow(0 0 12px ${accentColor})` }
      : animType === 'sleep'
      ? { animation: 'buddyFloat 4s ease-in-out infinite', opacity: 0.85 }
      : { animation: 'buddyFloat 3.5s ease-in-out infinite' };

  return (
    <Card className={`pet-card ${className}`}>
      <style>{`
        @keyframes buddyFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes buddyBounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          40% { transform: translateY(-10px) scale(1.06); }
          70% { transform: translateY(-2px) scale(0.98); }
        }
        @keyframes buddyWiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-6deg) scale(1.03); }
          75% { transform: rotate(6deg) scale(1.03); }
        }
        @keyframes buddyGlow {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px ${accentColor}); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 18px ${accentColor}); }
        }
        @keyframes floatP1 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          30% { opacity: 1; transform: translate(-14px, -16px) scale(1.2); }
          100% { opacity: 0; transform: translate(-28px, -42px) scale(0.9); }
        }
        @keyframes floatP2 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          30% { opacity: 1; transform: translate(0px, -20px) scale(1.3); }
          100% { opacity: 0; transform: translate(0px, -48px) scale(0.8); }
        }
        @keyframes floatP3 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          30% { opacity: 1; transform: translate(14px, -16px) scale(1.2); }
          100% { opacity: 0; transform: translate(28px, -42px) scale(0.9); }
        }
        .buddy-action-pill {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 999px;
          color: var(--buddy-text-main, #f8fafc);
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }
        .buddy-action-pill:hover {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }
        .buddy-action-pill:active {
          transform: translateY(0px) scale(0.96);
        }
      `}</style>

      <div
        role="region"
        aria-label={`${name}'s status: ${stateTitle}. ${activeDialogue}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Floating Interaction Particles */}
        {particles.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              zIndex: 10,
              fontSize: '22px',
              display: 'flex',
              gap: '12px',
            }}
          >
            <span style={{ animation: 'floatP1 1.4s ease-out forwards' }}>{particles[0]}</span>
            <span style={{ animation: 'floatP2 1.4s ease-out 0.1s forwards' }}>{particles[1]}</span>
            <span style={{ animation: 'floatP3 1.4s ease-out 0.2s forwards' }}>{particles[2]}</span>
          </div>
        )}

        {/* Ambient Radial Glow & Interactive Avatar */}
        <div
          onClick={() => triggerAction('pet')}
          title="Click to interact with Buddy!"
          style={{
            width: '115px',
            height: '115px',
            marginBottom: '6px',
            position: 'relative',
            cursor: 'pointer',
            background: `radial-gradient(circle, ${accentColor}22 0%, transparent 70%)`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...animStyle,
          }}
        >
          <svg
            viewBox="0 0 120 120"
            width="110"
            height="110"
            aria-hidden="true"
            style={{
              transition: 'transform 0.3s ease',
              filter: `drop-shadow(0 4px 14px ${accentColor}44)`,
            }}
          >
            {/* Halo ring */}
            <circle cx="60" cy="60" r="52" fill="none" stroke={accentColor} strokeWidth="1.5" opacity="0.3" strokeDasharray="4 4" />

            {/* Antennas / Ears */}
            <path
              d="M 38 32 C 30 18, 22 24, 30 38"
              fill="none"
              stroke={accentColor}
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <circle cx="26" cy="22" r="4.5" fill={accentColor} />
            <circle cx="26" cy="22" r="1.5" fill="#ffffff" />

            <path
              d="M 82 32 C 90 18, 98 24, 90 38"
              fill="none"
              stroke={accentColor}
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <circle cx="94" cy="22" r="4.5" fill={accentColor} />
            <circle cx="94" cy="22" r="1.5" fill="#ffffff" />

            {/* Smooth Metallic Armor Head */}
            <rect
              x="26"
              y="32"
              width="68"
              height="64"
              rx="26"
              ry="26"
              fill="#141a29"
              stroke={accentColor}
              strokeWidth="2.5"
            />

            {/* Inner Cyber Screen Face */}
            <rect
              x="32"
              y="40"
              width="56"
              height="48"
              rx="18"
              ry="18"
              fill="#080c14"
            />

            {/* Soft Cheeks */}
            <circle cx="39" cy="67" r="4.5" fill="#f43f5e" opacity="0.4" />
            <circle cx="81" cy="67" r="4.5" fill="#f43f5e" opacity="0.4" />

            {/* Facial Expression based on visualState / animType */}
            {animType === 'sleep' || visualState === 'sleeping' ? (
              <g>
                <line x1="39" y1="59" x2="49" y2="59" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="71" y1="59" x2="81" y2="59" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 55 70 Q 60 72 65 70" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
                <text x="88" y="38" fill="#a78bfa" fontSize="12" fontWeight="bold">Z</text>
                <text x="96" y="28" fill="#a78bfa" fontSize="10" fontWeight="bold">z</text>
              </g>
            ) : animType === 'bounce' || animType === 'wiggle' || visualState === 'happy' || visualState === 'ecstatic' ? (
              <g>
                <path d="M 39 57 Q 45 47 51 57" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
                <path d="M 69 57 Q 75 47 81 57" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
                <path d="M 49 68 Q 60 82 71 68 Z" fill="#f43f5e" stroke="#ffffff" strokeWidth="1" />
              </g>
            ) : visualState === 'focused' || animType === 'glow' ? (
              <g>
                <rect x="32" y="44" width="56" height="6" fill={accentColor} opacity="0.85" rx="3" />
                <circle cx="45" cy="47" r="2.5" fill="#ffffff" />
                <circle cx="75" cy="47" r="2.5" fill="#ffffff" />
                <circle cx="44" cy="59" r="4.5" fill="#38bdf8" />
                <circle cx="76" cy="59" r="4.5" fill="#38bdf8" />
                <circle cx="45" cy="58" r="1.5" fill="#ffffff" />
                <circle cx="77" cy="58" r="1.5" fill="#ffffff" />
                <path d="M 53 71 Q 60 75 67 71" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
              </g>
            ) : visualState === 'tired' ? (
              <g>
                <path d="M 39 57 Q 45 63 51 57" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 69 57 Q 75 63 81 57" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
                <ellipse cx="60" cy="73" rx="3.5" ry="4.5" fill="#fbbf24" />
              </g>
            ) : visualState === 'distracted' ? (
              <g>
                <circle cx="44" cy="58" r="4.5" fill="none" stroke="#f472b6" strokeWidth="2" />
                <circle cx="44" cy="58" r="1.5" fill="#f472b6" />
                <circle cx="76" cy="58" r="4.5" fill="none" stroke="#f472b6" strokeWidth="2" />
                <circle cx="76" cy="58" r="1.5" fill="#f472b6" />
                <path d="M 51 72 Q 56 68 60 72 T 69 72" fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
              </g>
            ) : (
              <g>
                <circle cx="44" cy="58" r="4.5" fill="#38bdf8" />
                <circle cx="76" cy="58" r="4.5" fill="#38bdf8" />
                <circle cx="45.5" cy="56.5" r="1.5" fill="#ffffff" />
                <circle cx="77.5" cy="56.5" r="1.5" fill="#ffffff" />
                <path d="M 53 71 Q 60 75 67 71" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}
          </svg>
        </div>

        {/* Identity & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--buddy-text-main, #f8fafc)', letterSpacing: '-0.3px' }}>
            {name}
          </span>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: `${accentColor}1a`,
              color: accentColor,
              fontWeight: 600,
              border: `1px solid ${accentColor}33`,
            }}
          >
            {stateTitle}
          </span>
        </div>

        {/* Organic Floating Dialogue (No Box Look) */}
        <div
          style={{
            width: '100%',
            maxWidth: '320px',
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.025)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '12px',
            color: 'var(--buddy-text-muted, #cbd5e1)',
            lineHeight: '1.45',
            marginBottom: '10px',
            boxSizing: 'border-box',
            fontStyle: 'italic',
          }}
        >
          "{activeDialogue}"
        </div>

        {/* Interactive Companion Pill Actions */}
        {interactive && (
          <div
            style={{
              display: 'flex',
              gap: '6px',
              justifyContent: 'center',
              width: '100%',
              maxWidth: '320px',
              marginBottom: '10px',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="buddy-action-pill buddy-action-btn"
              onClick={() => triggerAction('pet')}
              title="Give Buddy a loving pet"
            >
              🐾 Pet
            </button>
            <button
              type="button"
              className="buddy-action-pill buddy-action-btn"
              onClick={() => triggerAction('treat')}
              title="Feed Buddy a healthy treat"
            >
              🍎 Treat
            </button>
            <button
              type="button"
              className="buddy-action-pill buddy-action-btn"
              onClick={() => triggerAction('boost')}
              title="Engage Focus Boost"
            >
              ⚡ Boost
            </button>
            <button
              type="button"
              className="buddy-action-pill buddy-action-btn"
              onClick={() => triggerAction('rest')}
              title="Encourage a calming pause"
            >
              😴 Rest
            </button>
          </div>
        )}

        {/* Digital Harmony Bar */}
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--buddy-text-muted, #94a3b8)',
              marginBottom: '4px',
            }}
          >
            <span>Digital Harmony</span>
            <strong style={{ color: accentColor }}>{Math.round(score)}%</strong>
          </div>
          <div
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.max(5, Math.min(100, score))}%`,
                height: '100%',
                backgroundColor: accentColor,
                borderRadius: '999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
