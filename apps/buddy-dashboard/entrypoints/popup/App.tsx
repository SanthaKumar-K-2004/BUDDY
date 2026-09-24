import { useState } from 'preact/hooks';
import { useDashboardData } from '../../src/hooks/useDashboardData.js';
import { StatCard, PetCard, LoadingState, ErrorState } from '@buddy/ui-components';
import { TodayScreen } from '../../src/screens/TodayScreen.js';
import { PetScreen } from '../../src/screens/PetScreen.js';
import { BlockedScreen } from '../../src/screens/BlockedScreen.js';
import { FocusScreen } from '../../src/screens/FocusScreen.js';
import { FamilyScreen } from '../../src/screens/FamilyScreen.js';

export function App() {
  const [view, setView] = useState<'home' | 'shield' | 'focus' | 'today' | 'family' | 'pet'>('home');
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
        width: '380px',
        maxHeight: '600px',
        overflowY: 'auto',
        padding: '14px',
        boxSizing: 'border-box',
        backgroundColor: 'var(--buddy-bg-surface, #ffffff)',
        fontFamily: 'var(--buddy-font-family, sans-serif)',
        color: 'var(--buddy-text-main, #0f172a)',
      }}
    >
      {/* Mini Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--buddy-border-subtle, #e2e8f0)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '18px' }}>🐾</span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--buddy-text-main, #0f172a)' }}>
            BUDDY Suite
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '10px',
              backgroundColor: isShieldActive ? '#d1fae5' : '#fee2e2',
              color: isShieldActive ? '#065f46' : '#991b1b',
              fontWeight: 600,
            }}
          >
            {isShieldActive ? 'Shield Active' : 'Shield Off'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            onClick={refresh}
            title="Refresh metrics"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '4px',
            }}
          >
            🔄
          </button>
          <button
            type="button"
            onClick={handleOpenSidePanel}
            title="Open Side Panel"
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid var(--buddy-border-subtle, #cbd5e1)',
              backgroundColor: 'var(--buddy-bg-card, #ffffff)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Panel ↗
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Reading local metrics..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <>
          {/* Quick Tab Selector */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '12px',
              overflowX: 'auto',
              paddingBottom: '2px',
            }}
          >
            {(['home', 'shield', 'focus', 'today', 'family', 'pet'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setView(tab)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  borderRadius: 'var(--buddy-radius-sm, 6px)',
                  border: 'none',
                  backgroundColor:
                    view === tab ? 'var(--buddy-primary, #6366f1)' : 'var(--buddy-bg-subtle, #f1f5f9)',
                  color: view === tab ? '#ffffff' : 'var(--buddy-text-muted, #64748b)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab === 'shield' ? '🛡️ Shield' : tab === 'focus' ? '⏱️ Focus' : tab}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <StatCard label="Active" milliseconds={activeMs} />
                <StatCard label="Focus" milliseconds={focusMs} />
                <StatCard label="Blocked" count={blockedCount} />
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
