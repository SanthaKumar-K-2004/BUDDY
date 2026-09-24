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
      return '#f97316'; // Warm Corgi Orange
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
      const centerY = rect.top + 55; // Eye level

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Smooth normalization bounded between -5.5 and +5.5 pixels
      const normX = Math.max(-5.5, Math.min(5.5, deltaX * 0.04));
      const normY = Math.max(-4, Math.min(4.5, deltaY * 0.04));

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
          color: var(--buddy-text-main, #f8fafc);
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
          color: var(--buddy-text-muted, #94a3b8);
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
          color: var(--buddy-text-main, #f8fafc);
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
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--buddy-text-main, #f8fafc)', letterSpacing: '-0.3px' }}>
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

        {/* Realistic Orange & White Corgi Guardian Avatar with Live Cursor-Tracking Eyes */}
        <div
          onClick={() => triggerAction('pet')}
          title="Click to pet Buddy! (Eyes follow your cursor)"
          style={{
            width: compact ? '96px' : '110px',
            height: compact ? '96px' : '110px',
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
          {/* Ambient Glow Aura */}
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
            width={compact ? 96 : 110}
            height={compact ? 96 : 110}
            style={{ overflow: 'visible', filter: `drop-shadow(0 4px 14px ${accentColor}33)` }}
          >
            <defs>
              {/* Rich Orange Fur Gradients */}
              <linearGradient id="corgiOrange" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="60%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>

              {/* Soft White Muzzle Gradient */}
              <linearGradient id="corgiWhite" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f1f5f9" />
              </linearGradient>

              {/* Inner Ear Soft Pink Gradient */}
              <linearGradient id="earPink" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fecdd3" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.75" />
              </linearGradient>

              {/* Hazel Dog Eye Gradient */}
              <radialGradient id="dogEyeGrad" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#78350f" />
                <stop offset="60%" stopColor="#451a03" />
                <stop offset="100%" stopColor="#1c1917" />
              </radialGradient>
            </defs>

            {/* Glowing Aura Ring */}
            <circle
              cx="60"
              cy="60"
              r="53"
              fill="none"
              stroke={accentColor}
              strokeWidth="1.5"
              opacity="0.45"
              strokeDasharray="4 4"
            />

            {/* Left Perked Corgi Ear */}
            <path
              d="M 36 36 C 24 10, 16 16, 26 44"
              fill="#f97316"
              stroke="#ea580c"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Left Inner Ear Pink Fluff */}
            <path
              d="M 33 34 C 25 18, 20 22, 27 40"
              fill="#fca5a5"
            />

            {/* Right Perked Corgi Ear */}
            <path
              d="M 84 36 C 96 10, 104 16, 94 44"
              fill="#f97316"
              stroke="#ea580c"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Right Inner Ear Pink Fluff */}
            <path
              d="M 87 34 C 95 18, 100 22, 93 40"
              fill="#fca5a5"
            />

            {/* Main Rounded Orange Corgi Head */}
            <ellipse
              cx="60"
              cy="58"
              rx="36"
              ry="32"
              fill="#f97316"
              stroke="#ea580c"
              strokeWidth="2"
            />

            {/* Snowy White Face Blaze & Cheeks */}
            <path
              d="M 54 36 C 54 44, 46 50, 36 56 C 28 62, 30 76, 42 78 C 50 80, 56 78, 60 76 C 64 78, 70 80, 78 78 C 90 76, 92 62, 84 56 C 74 50, 66 44, 66 36 Z"
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />

            {/* Soft Cheeks Blushing */}
            <circle cx="37" cy="65" r="5" fill="#f43f5e" opacity="0.3" />
            <circle cx="83" cy="65" r="5" fill="#f43f5e" opacity="0.3" />

            {/* Corgi Button Nose (Soft Rounded Inverted Triangle) */}
            <path
              d="M 56 65 Q 60 63 64 65 Q 64 69 60 71 Q 56 69 56 65 Z"
              fill="#1e293b"
            />
            {/* Nose Specular Highlight */}
            <ellipse cx="59" cy="65" rx="1.5" ry="0.8" fill="#94a3b8" />

            {/* EYES & FACIAL EXPRESSIONS */}
            {animType === 'sleep' || visualState === 'sleeping' ? (
              // Sleeping calm happy curved lines
              <g>
                <path d="M 39 54 Q 45 59 51 54" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 69 54 Q 75 59 81 54" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 57 74 Q 60 76 63 74" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                <text x="88" y="34" fill="#a78bfa" fontSize="12" fontWeight="bold">Z</text>
                <text x="96" y="24" fill="#a78bfa" fontSize="9" fontWeight="bold">z</text>
              </g>
            ) : animType === 'petting' || animType === 'bounce' || visualState === 'happy' || visualState === 'ecstatic' ? (
              // Happy squint eyes with cute pink tongue
              <g>
                <path d="M 39 53 Q 45 45 51 53" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
                <path d="M 69 53 Q 75 45 81 53" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
                {/* Cheerful Mouth & Tongue */}
                <path d="M 54 72 Q 60 75 66 72" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                <path d="M 57 73 Q 60 82 63 73 Z" fill="#f43f5e" stroke="#1e293b" strokeWidth="1" />
              </g>
            ) : isBlinking ? (
              // Organic blink
              <g>
                <line x1="40" y1="54" x2="50" y2="54" stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" />
                <line x1="70" y1="54" x2="80" y2="54" stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" />
                <path d="M 55 73 Q 60 76 65 73" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
              </g>
            ) : (
              // Dynamic Live Cursor-Tracking Eyes (Hazel Corgi Eyes)
              <g>
                {/* Left Eye Sclera */}
                <ellipse cx="45" cy="54" rx="7.5" ry="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                {/* Left Eye Iris & Pupil */}
                <circle
                  cx={45 + pupilPos.x}
                  cy={54 + pupilPos.y}
                  r="5"
                  fill="#78350f"
                />
                <circle
                  cx={45 + pupilPos.x}
                  cy={54 + pupilPos.y}
                  r="3.2"
                  fill="#000000"
                />
                {/* Specular Catchlights */}
                <circle cx={43.5 + pupilPos.x * 0.7} cy={52.5 + pupilPos.y * 0.7} r="1.8" fill="#ffffff" />
                <circle cx={46.5 + pupilPos.x * 0.7} cy={55.5 + pupilPos.y * 0.7} r="0.9" fill="#ffffff" opacity="0.8" />

                {/* Right Eye Sclera */}
                <ellipse cx="75" cy="54" rx="7.5" ry="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                {/* Right Eye Iris & Pupil */}
                <circle
                  cx={75 + pupilPos.x}
                  cy={54 + pupilPos.y}
                  r="5"
                  fill="#78350f"
                />
                <circle
                  cx={75 + pupilPos.x}
                  cy={54 + pupilPos.y}
                  r="3.2"
                  fill="#000000"
                />
                {/* Specular Catchlights */}
                <circle cx={73.5 + pupilPos.x * 0.7} cy={52.5 + pupilPos.y * 0.7} r="1.8" fill="#ffffff" />
                <circle cx={76.5 + pupilPos.x * 0.7} cy={55.5 + pupilPos.y * 0.7} r="0.9" fill="#ffffff" opacity="0.8" />

                {/* Sweet Corgi Smile */}
                <path d="M 54 72 Q 57 74 60 72 Q 63 74 66 72" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}

            {/* Emerald Guardian Collar with Shield Charm */}
            <path
              d="M 44 82 Q 60 87 76 82"
              fill="none"
              stroke="#0f766e"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Heart/Shield Charm */}
            <circle cx="60" cy="86" r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
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
            color: 'var(--buddy-text-muted, #cbd5e1)',
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
              color: 'var(--buddy-text-muted, #94a3b8)',
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
