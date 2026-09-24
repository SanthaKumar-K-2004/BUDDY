import { useState, useEffect, useRef } from 'preact/hooks';
import type { PetVisualState } from '@buddy/shared-types';
import { Card } from './Card.js';
import {
  playPetSound,
  playTreatSound,
  playBoostSound,
  playRestSound,
  isPetAudioMuted,
  setPetAudioMuted,
} from './pet-audio.js';

export interface PetCardProps {
  name?: string;
  visualState: PetVisualState;
  dialogue?: string;
  score?: number;
  className?: string;
  interactive?: boolean;
  compact?: boolean;
  onInteraction?: (action: 'pet' | 'treat' | 'boost' | 'rest') => void;
}

interface Particle {
  id: number;
  emoji: string;
  x: number;
}

function getPetStateColor(state: PetVisualState): string {
  switch (state) {
    case 'ecstatic':
    case 'happy':
      return '#10b981'; // Emerald
    case 'focused':
      return '#38bdf8'; // Cyan
    case 'recovering':
      return '#06b6d4'; // Teal
    case 'tired':
      return '#f59e0b'; // Amber
    case 'distracted':
    case 'worried':
      return '#ec4899'; // Pink
    case 'sleeping':
      return '#8b5cf6'; // Violet
    case 'sad':
      return '#64748b'; // Slate
    case 'neutral':
    default:
      return '#38bdf8'; // Sky
  }
}

function getPetTitle(state: PetVisualState): string {
  switch (state) {
    case 'focused':
      return 'Deep in Focus';
    case 'happy':
      return 'Feeling Great';
    case 'ecstatic':
      return 'Super Energized!';
    case 'tired':
      return 'Needs a Break';
    case 'distracted':
      return 'Mind Wandering';
    case 'recovering':
      return 'Regaining Energy';
    case 'sleeping':
      return 'Quiet Slumber';
    case 'worried':
      return 'Feeling Strained';
    case 'sad':
      return 'Needs Care';
    case 'neutral':
    default:
      return 'Guardian Companion';
  }
}

export function PetCard({
  name = 'Buddy',
  visualState,
  dialogue: initialDialogue = "I'm monitoring your screen and keeping your focus razor-sharp.",
  score = 80,
  className = '',
  interactive = true,
  compact = false,
  onInteraction,
}: PetCardProps) {
  const accentColor = getPetStateColor(visualState);
  const stateTitle = getPetTitle(visualState);

  const [activeDialogue, setActiveDialogue] = useState(initialDialogue);
  const [animType, setAnimType] = useState<'idle' | 'wiggle' | 'bounce' | 'glow' | 'sleep' | 'petting'>('idle');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [pupilPos, setPupilPos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [muted, setMuted] = useState(isPetAudioMuted());
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveDialogue(initialDialogue);
  }, [initialDialogue]);

  // Real-time cursor tracking: Buddy's eyes follow the user's cursor dynamically
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (animType === 'sleep' || visualState === 'sleeping' || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + 60; // Approximate eye level

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Smooth normalization bounded between -6 and +6 pixels
      const normX = Math.max(-6, Math.min(6, deltaX * 0.04));
      const normY = Math.max(-4, Math.min(5, deltaY * 0.04));

      setPupilPos({ x: normX, y: normY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [animType, visualState]);

  // Natural organic eye blink cycle every 4.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (animType !== 'sleep' && visualState !== 'sleeping') {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 160);
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [animType, visualState]);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setPetAudioMuted(next);
  };

  const spawnParticles = (emojis: string[]) => {
    const newItems: Particle[] = emojis.map((emoji, index) => ({
      id: Date.now() + index,
      emoji,
      x: (index - 1) * 20,
    }));
    setParticles(newItems);
    setTimeout(() => {
      setParticles([]);
    }, 1600);
  };

  const triggerAction = (type: 'pet' | 'treat' | 'boost' | 'rest') => {
    if (type === 'pet') {
      playPetSound();
      setAnimType('petting');
      spawnParticles(['💖', '🐾', '✨']);
      setActiveDialogue('*Buddy leans into your hand happily* Purrr... Thank you! I love accompanying you.');
    } else if (type === 'treat') {
      playTreatSound();
      setAnimType('bounce');
      spawnParticles(['🍎', '⭐', '✨']);
      setActiveDialogue('*Nom nom nom!* Crisp and delicious! Digital energy and wellness replenished.');
    } else if (type === 'boost') {
      playBoostSound();
      setAnimType('glow');
      spawnParticles(['⚡', '🎯', '🚀']);
      setActiveDialogue('Focus shields locked! All distractions and ad networks intercepted.');
    } else if (type === 'rest') {
      playRestSound();
      setAnimType('sleep');
      spawnParticles(['💤', '🌙', '☁️']);
      setActiveDialogue('*Curling up softly* Deep rest restores mental clarity and balance.');
    }

    if (onInteraction) {
      onInteraction(type);
    }

    setTimeout(() => {
      if (type !== 'rest') {
        setAnimType('idle');
      }
    }, 2400);
  };

  const cleanDialogue = activeDialogue.replace(/^["'\s]+|["'\s]+$/g, '').trim();

  // Avatar SVG animations
  const animStyle =
    animType === 'wiggle'
      ? { animation: 'petJoyfulWiggle 0.6s ease-in-out infinite' }
      : animType === 'bounce'
      ? { animation: 'petHappyBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite' }
      : animType === 'glow'
      ? { animation: 'petLaserGlow 1.2s ease-in-out infinite', filter: `drop-shadow(0 0 16px ${accentColor})` }
      : animType === 'sleep' || visualState === 'sleeping'
      ? { animation: 'petSlowBreathe 4.5s ease-in-out infinite', opacity: 0.9 }
      : { animation: 'petOrganicBreathe 3.5s ease-in-out infinite' };

  return (
    <Card className={`pet-card ${className}`}>
      <style>{`
        @keyframes petOrganicBreathe {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-2px) scale(1.015); }
        }
        @keyframes petSlowBreathe {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-1px) scale(1.01); }
        }
        @keyframes petHappyBounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          35% { transform: translateY(-8px) scale(1.04); }
          65% { transform: translateY(-2px) scale(0.98); }
        }
        @keyframes petJoyfulWiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg) scale(1.02); }
          75% { transform: rotate(3deg) scale(1.02); }
        }
        @keyframes petLaserGlow {
          0%, 100% { filter: drop-shadow(0 0 8px ${accentColor}); }
          50% { filter: drop-shadow(0 0 20px ${accentColor}); }
        }
        @keyframes pFloatUp {
          0% { opacity: 0; transform: translate(0, 0) scale(0.6); }
          25% { opacity: 1; transform: translate(var(--tx, 0), -16px) scale(1.2); }
          100% { opacity: 0; transform: translate(var(--tx, 0), -45px) scale(0.7); }
        }
        .buddy-action-pill {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          color: #f8fafc;
          padding: 5px 11px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          user-select: none;
        }
        .buddy-action-pill:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
        }
        .buddy-action-pill:active {
          transform: translateY(0px) scale(0.96);
        }
        .buddy-sound-toggle {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 12px;
          cursor: pointer;
          padding: 3px 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .buddy-sound-toggle:hover {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.08);
        }
      `}</style>

      <div
        ref={cardRef}
        role="region"
        aria-label={`${name}'s status: ${stateTitle}. ${cleanDialogue}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Top Floating Controls */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: compact ? '2px' : '4px',
            padding: '0 4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' }}>
              {name}
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '1px 7px',
                borderRadius: '999px',
                backgroundColor: `${accentColor}1f`,
                color: accentColor,
                fontWeight: 700,
                border: `1px solid ${accentColor}33`,
              }}
            >
              {stateTitle}
            </span>
          </div>

          <button
            type="button"
            className="buddy-sound-toggle"
            onClick={toggleSound}
            title={muted ? 'Unmute companion audio' : 'Mute companion audio'}
            aria-label={muted ? 'Unmute companion chimes' : 'Mute companion chimes'}
          >
            {muted ? '🔇 Muted' : '🔊 Sound'}
          </button>
        </div>

        {/* Floating Interaction Particles */}
        {particles.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              zIndex: 20,
              display: 'flex',
              gap: '12px',
            }}
          >
            {particles.map((p) => (
              <span
                key={p.id}
                style={{
                  display: 'inline-block',
                  fontSize: '20px',
                  animation: 'pFloatUp 1.5s ease-out forwards',
                  ['--tx' as string]: `${p.x}px`,
                }}
              >
                {p.emoji}
              </span>
            ))}
          </div>
        )}

        {/* High-Definition Vector Guardian Avatar with Live Cursor-Tracking Eyes */}
        <div
          onClick={() => triggerAction('pet')}
          title="Click to pet Buddy! (Eyes follow your cursor)"
          style={{
            width: compact ? '92px' : '106px',
            height: compact ? '92px' : '106px',
            marginBottom: '4px',
            position: 'relative',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `rotate(${pupilPos.x * 0.8}deg)`,
            transition: 'transform 0.15s ease-out',
            ...animStyle,
          }}
        >
          {/* Ambient Radial Aura */}
          <div
            style={{
              position: 'absolute',
              inset: '-6px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${accentColor}25 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />

          <svg
            viewBox="0 0 120 120"
            width={compact ? 92 : 106}
            height={compact ? 92 : 106}
            style={{ overflow: 'visible', filter: `drop-shadow(0 4px 14px ${accentColor}33)` }}
          >
            <defs>
              {/* Luxury Metallic Body Gradients */}
              <linearGradient id="petBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              <linearGradient id="petInnerScreen" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#090d16" />
                <stop offset="100%" stopColor="#04060a" />
              </linearGradient>

              <linearGradient id="earInner" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>

            {/* Glowing Aura Ring */}
            <circle
              cx="60"
              cy="60"
              r="53"
              fill="none"
              stroke={accentColor}
              strokeWidth="1.5"
              opacity="0.4"
              strokeDasharray="4 4"
            />

            {/* Left Ear */}
            <path
              d="M 36 34 C 26 14, 18 20, 28 40"
              fill="url(#earInner)"
              stroke={accentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="23" cy="18" r="3" fill={accentColor} />

            {/* Right Ear */}
            <path
              d="M 84 34 C 94 14, 102 20, 92 40"
              fill="url(#earInner)"
              stroke={accentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="97" cy="18" r="3" fill={accentColor} />

            {/* Main Rounded Head */}
            <rect
              x="26"
              y="30"
              width="68"
              height="66"
              rx="28"
              ry="28"
              fill="url(#petBodyGrad)"
              stroke={accentColor}
              strokeWidth="2.5"
            />

            {/* Inner Visor Display */}
            <rect
              x="32"
              y="38"
              width="56"
              height="50"
              rx="20"
              ry="20"
              fill="url(#petInnerScreen)"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
            />

            {/* Soft Cheeks Blushing */}
            <circle cx="39" cy="69" r="4.5" fill="#f43f5e" opacity="0.35" />
            <circle cx="81" cy="69" r="4.5" fill="#f43f5e" opacity="0.35" />

            {/* Central Nose / Shield Crest */}
            <path
              d="M 58 64 L 62 64 L 60 67 Z"
              fill={accentColor}
              opacity="0.8"
            />

            {/* EYES & EXPRESSION */}
            {animType === 'sleep' || visualState === 'sleeping' ? (
              // Sleeping peaceful eye lines
              <g>
                <path d="M 38 60 Q 44 65 50 60" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 70 60 Q 76 65 82 60" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 56 71 Q 60 74 64 71" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
                <text x="88" y="38" fill="#a78bfa" fontSize="12" fontWeight="bold">Z</text>
                <text x="96" y="27" fill="#a78bfa" fontSize="9" fontWeight="bold">z</text>
              </g>
            ) : animType === 'petting' || animType === 'bounce' || visualState === 'happy' || visualState === 'ecstatic' ? (
              // Joyful smiling eyes ^ ^
              <g>
                <path d="M 38 59 Q 44 49 50 59" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
                <path d="M 70 59 Q 76 49 82 59" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
                <path d="M 52 70 Q 60 81 68 70 Z" fill="#f43f5e" stroke="#ffffff" strokeWidth="1" />
              </g>
            ) : isBlinking ? (
              // Natural blink state
              <g>
                <line x1="39" y1="58" x2="49" y2="58" stroke={accentColor} strokeWidth="3" strokeLinecap="round" />
                <line x1="71" y1="58" x2="81" y2="58" stroke={accentColor} strokeWidth="3" strokeLinecap="round" />
                <path d="M 54 71 Q 60 75 66 71" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
              </g>
            ) : (
              // Active, interactive cursor-following eyes!
              <g>
                {/* Left Eye Sclera */}
                <ellipse cx="44" cy="58" rx="8" ry="9" fill="#030712" stroke={`${accentColor}66`} strokeWidth="1.2" />
                {/* Left Eye Pupil (Tracks Cursor in Real Time) */}
                <circle
                  cx={44 + pupilPos.x}
                  cy={58 + pupilPos.y}
                  r="5"
                  fill={visualState === 'focused' ? '#38bdf8' : '#f8fafc'}
                />
                {/* Left Specular Highlight */}
                <circle cx={42 + pupilPos.x * 0.7} cy={56 + pupilPos.y * 0.7} r="2" fill="#ffffff" />
                <circle cx={46 + pupilPos.x * 0.7} cy={60 + pupilPos.y * 0.7} r="1" fill="#ffffff" opacity="0.7" />

                {/* Right Eye Sclera */}
                <ellipse cx="76" cy="58" rx="8" ry="9" fill="#030712" stroke={`${accentColor}66`} strokeWidth="1.2" />
                {/* Right Eye Pupil (Tracks Cursor in Real Time) */}
                <circle
                  cx={76 + pupilPos.x}
                  cy={58 + pupilPos.y}
                  r="5"
                  fill={visualState === 'focused' ? '#38bdf8' : '#f8fafc'}
                />
                {/* Right Specular Highlight */}
                <circle cx={74 + pupilPos.x * 0.7} cy={56 + pupilPos.y * 0.7} r="2" fill="#ffffff" />
                <circle cx={78 + pupilPos.x * 0.7} cy={60 + pupilPos.y * 0.7} r="1" fill="#ffffff" opacity="0.7" />

                {/* Mouth */}
                {visualState === 'focused' ? (
                  <path d="M 54 71 Q 60 74 66 71" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                ) : visualState === 'tired' ? (
                  <ellipse cx="60" cy="73" rx="3" ry="4" fill="#fbbf24" />
                ) : (
                  <path d="M 53 71 Q 60 76 67 71" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
                )}
              </g>
            )}
          </svg>
        </div>

        {/* Clean Dialogue Bubble */}
        <div
          style={{
            width: '100%',
            maxWidth: '320px',
            padding: '6px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.025)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '11px',
            color: '#cbd5e1',
            lineHeight: '1.4',
            marginBottom: '8px',
            boxSizing: 'border-box',
            fontStyle: 'italic',
          }}
        >
          "{cleanDialogue}"
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
              marginBottom: '8px',
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
              fontSize: '10px',
              color: '#94a3b8',
              marginBottom: '3px',
            }}
          >
            <span>Digital Harmony</span>
            <strong style={{ color: accentColor }}>{Math.round(score)}%</strong>
          </div>
          <div
            style={{
              width: '100%',
              height: '3px',
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
