import { useState, useEffect } from 'preact/hooks';
import { useDashboardData } from '../../src/hooks/useDashboardData.js';
import { PetCard, LoadingState, ErrorState } from '@buddy/ui-components';
import { TodayScreen } from '../../src/screens/TodayScreen.js';
import { PetScreen } from '../../src/screens/PetScreen.js';
import { BlockedScreen } from '../../src/screens/BlockedScreen.js';
import { FocusScreen } from '../../src/screens/FocusScreen.js';
import { FamilyScreen } from '../../src/screens/FamilyScreen.js';

interface ActiveSource {
  icon: string;
  title: string;
  status: string;
  category: string;
  url: string;
}

function parseSourceInfo(rawUrl?: string): ActiveSource {
  if (
    !rawUrl ||
    rawUrl.startsWith('chrome://') ||
    rawUrl.startsWith('about:') ||
    rawUrl.startsWith('edge://') ||
    rawUrl.startsWith('chrome-extension://') ||
    rawUrl.startsWith('moz-extension://')
  ) {
    return {
      icon: '🐾',
      title: 'BUDDY Companion',
      status: 'Shields Armed & Active',
      category: 'system',
      url: rawUrl || '',
    };
  }
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      const isShorts = parsed.pathname.includes('/shorts');
      return {
        icon: '🎬',
        title: 'YouTube',
        status: isShorts ? 'Shorts Feed' : 'Watching Video',
        category: 'video',
        url: host,
      };
    }
    if (host.includes('github.com') || host.includes('gitlab.com') || host.includes('stackoverflow.com')) {
      return {
        icon: '💻',
        title: 'GitHub / Dev',
        status: 'Coding & Engineering',
        category: 'productivity',
        url: host,
      };
    }
    if (host.includes('wikipedia.org')) {
      return {
        icon: '📚',
        title: 'Wikipedia',
        status: 'Reading & Learning',
        category: 'education',
        url: host,
      };
    }
    if (host.includes('reddit.com')) {
      return {
        icon: '💬',
        title: 'Reddit',
        status: 'Social Discussion',
        category: 'social',
        url: host,
      };
    }
    if (host.includes('twitter.com') || host.includes('x.com')) {
      return {
        icon: '💬',
        title: 'X / Twitter',
        status: 'Social Stream',
        category: 'social',
        url: host,
      };
    }
    if (host.includes('netflix.com') || host.includes('twitch.tv') || host.includes('disneyplus.com')) {
      return {
        icon: '📺',
        title: host,
        status: 'Media Streaming',
        category: 'video',
        url: host,
      };
    }
    if (host.includes('spotify.com') || host.includes('soundcloud.com')) {
      return {
        icon: '🎵',
        title: 'Spotify Audio',
        status: 'Music Playback',
        category: 'music',
        url: host,
      };
    }
    return {
      icon: '🌐',
      title: host,
      status: 'Protected Browsing',
      category: 'web',
      url: host,
    };
  } catch {
    return {
      icon: '🛡️',
      title: 'Web Browsing',
      status: 'Ad & Privacy Shielded',
      category: 'web',
      url: '',
    };
  }
}

function formatDurationMinutes(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

export function App() {
  const [view, setView] = useState<'home' | 'shield' | 'focus' | 'today' | 'family' | 'pet'>('home');
  const [activeSource, setActiveSource] = useState<ActiveSource>({
    icon: '🐾',
    title: 'BUDDY Companion',
    status: 'Ready',
    category: 'system',
    url: '',
  });

  const {
    today,
    mood,
    streak,
    isFocusActive,
    focusSessionStart,
    isShieldActive,
    isLoading,
    error,
    refresh,
  } = useDashboardData();

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]?.url) {
          setActiveSource(parseSourceInfo(tabs[0].url));
        }
      });
    }
  }, []);

  const activeMs = today?.totalActiveMs ?? 0;
  const focusMs = today?.focusMs ?? 0;
  const blockedCount = (today?.adsBlocked ?? 0) + (today?.trackersBlocked ?? 0);

  const handleOpenSidePanel = () => {
    if (typeof chrome !== 'undefined' && chrome.sidePanel?.open) {
      chrome.sidePanel.open({ windowId: 0 });
    }
  };

  return (
    <div
      style={{
        width: '385px',
        maxHeight: '600px',
        overflowY: 'auto',
        padding: '14px',
        boxSizing: 'border-box',
        backgroundColor: '#090d16',
        fontFamily: 'var(--buddy-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
        color: '#f8fafc',
      }}
    >
      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 4px #10b981); }
          50% { opacity: 0.4; transform: scale(0.85); filter: none; }
        }
        .buddy-nav-pill {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
        }
        .buddy-nav-pill:hover {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.05);
        }
        .buddy-nav-pill.active {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #ffffff;
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.35);
        }
        .buddy-dock-item {
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .buddy-dock-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>

      {/* Modern Seamless Header (No Heavy Box Border) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/icons/icon-32.png"
            alt="BUDDY"
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              boxShadow: '0 0 10px rgba(6, 182, 212, 0.35)',
            }}
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.4px', color: '#f8fafc' }}>
              BUDDY
            </span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              PRO
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: isShieldActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: isShieldActive ? '#34d399' : '#f87171',
              fontWeight: 700,
              border: `1px solid ${isShieldActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isShieldActive ? '#10b981' : '#ef4444',
                display: 'inline-block',
                animation: isShieldActive ? 'pulseDot 2s infinite' : 'none',
              }}
            />
            {isShieldActive ? 'SHIELD ON' : 'OFF'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <button
            type="button"
            onClick={refresh}
            title="Refresh metrics"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '4px 7px',
              borderRadius: '8px',
              color: '#94a3b8',
              transition: 'background 0.2s',
            }}
          >
            🔄
          </button>
          <button
            type="button"
            onClick={handleOpenSidePanel}
            title="Open Side Panel"
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#f8fafc',
              transition: 'background 0.2s',
            }}
          >
            Panel ↗
          </button>
        </div>
      </div>

      {/* Floating Active Source Indicator Pill (No Box Look) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '999px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '13px' }}>{activeSource.icon}</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9' }}>
            {activeSource.title}
          </span>
        </div>
        <span
          style={{
            fontSize: '10px',
            color: '#94a3b8',
            padding: '2px 8px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '999px',
            fontWeight: 500,
          }}
        >
          {activeSource.status}
        </span>
      </div>

      {isLoading ? (
        <LoadingState message="Connecting to local engine..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <>
          {/* Frameless Segmented Pill Navigation */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '12px',
              overflowX: 'auto',
              padding: '2px',
              backgroundColor: 'rgba(255, 255, 255, 0.025)',
              borderRadius: '10px',
            }}
          >
            {([
              { id: 'home', label: 'Home', icon: '🏠' },
              { id: 'shield', label: 'Shield', icon: '🛡️' },
              { id: 'focus', label: 'Focus', icon: '⏱️' },
              { id: 'today', label: 'Today', icon: '📊' },
              { id: 'family', label: 'Family', icon: '👨‍👩‍👧' },
              { id: 'pet', label: 'Pet', icon: '🐾' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`buddy-nav-pill ${view === tab.id ? 'active' : ''}`}
                onClick={() => setView(tab.id)}
                style={{
                  flex: 1,
                  padding: '5px 2px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {view === 'home' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <PetCard
                name="Buddy"
                visualState={mood.visualState}
                score={mood.score}
              />

              {/* Cohesive Floating Glass Metrics Dock (No Box Look) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.035)',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '10px 14px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                }}
              >
                {/* Active Metric */}
                <div className="buddy-dock-item" style={{ flex: 1, textAlign: 'center', padding: '4px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '2px' }}>
                    Active
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' }}>
                    {formatDurationMinutes(activeMs)}
                  </div>
                </div>

                {/* Subtle Vertical Divider */}
                <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

                {/* Focus Metric */}
                <div className="buddy-dock-item" style={{ flex: 1, textAlign: 'center', padding: '4px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '2px' }}>
                    Focus
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#a5b4fc', letterSpacing: '-0.3px' }}>
                    {formatDurationMinutes(focusMs)}
                  </div>
                </div>

                {/* Subtle Vertical Divider */}
                <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

                {/* Blocked Metric */}
                <div className="buddy-dock-item" style={{ flex: 1, textAlign: 'center', padding: '4px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '2px' }}>
                    Blocked
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399', letterSpacing: '-0.3px' }}>
                    {blockedCount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'shield' && <BlockedScreen today={today} isShieldActive={isShieldActive} />}

          {view === 'focus' && (
            <FocusScreen
              today={today}
              streak={streak}
              isFocusActive={isFocusActive}
              focusSessionStart={focusSessionStart}
              onRefresh={refresh}
            />
          )}

          {view === 'today' && <TodayScreen today={today} />}

          {view === 'family' && <FamilyScreen />}

          {view === 'pet' && <PetScreen mood={mood} />}
        </>
      )}
    </div>
  );
}
