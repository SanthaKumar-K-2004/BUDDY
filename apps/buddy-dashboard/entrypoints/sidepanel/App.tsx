import { useState } from 'preact/hooks';
import { useDashboardData } from '../../src/hooks/useDashboardData.js';
import { Header } from '../../src/components/Header.js';
import { Navigation, type ScreenId } from '../../src/components/Navigation.js';
import { LoadingState, ErrorState } from '@buddy/ui-components';

import { HomeScreen } from '../../src/screens/HomeScreen.js';
import { TodayScreen } from '../../src/screens/TodayScreen.js';
import { InsightsScreen } from '../../src/screens/InsightsScreen.js';
import { WatchTimeScreen } from '../../src/screens/WatchTimeScreen.js';
import { FocusScreen } from '../../src/screens/FocusScreen.js';
import { BlockedScreen } from '../../src/screens/BlockedScreen.js';
import { SitesScreen } from '../../src/screens/SitesScreen.js';
import { LimitsScreen } from '../../src/screens/LimitsScreen.js';
import { PetScreen } from '../../src/screens/PetScreen.js';
import { FamilyScreen } from '../../src/screens/FamilyScreen.js';
import { SettingsScreen } from '../../src/screens/SettingsScreen.js';
import { PrivacyScreen } from '../../src/screens/PrivacyScreen.js';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const {
    today,
    yesterday,
    weekly,
    mood,
    streak,
    limits,
    isFocusActive,
    focusSessionStart,
    isShieldActive,
    isLoading,
    error,
    refresh,
    clearToday,
    clearAllAnalytics,
    resetPetAndStreaks,
    resetAllLocalData,
    exportAnalytics,
  } = useDashboardData();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'var(--buddy-bg-surface, #ffffff)',
        fontFamily: 'var(--buddy-font-family, sans-serif)',
        color: 'var(--buddy-text-main, #0f172a)',
        boxSizing: 'border-box',
      }}
    >
      <Header
        petState={mood.visualState}
        score={mood.score}
        isFocusActive={isFocusActive}
        isShieldActive={isShieldActive}
        onRefresh={refresh}
      />

      <Navigation currentScreen={currentScreen} onSelectScreen={setCurrentScreen} />

      <main style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {isLoading ? (
          <LoadingState message="Loading local Buddy analytics..." />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : (
          <>
            {currentScreen === 'home' && (
              <HomeScreen
                today={today}
                mood={mood}
                streak={streak}
                isShieldActive={isShieldActive}
                onNavigate={setCurrentScreen}
              />
            )}
            {currentScreen === 'today' && <TodayScreen today={today} />}
            {currentScreen === 'insights' && (
              <InsightsScreen today={today} weekly={weekly} onNavigate={setCurrentScreen} />
            )}
            {currentScreen === 'watch-time' && (
              <WatchTimeScreen today={today} yesterday={yesterday} weekly={weekly} />
            )}
            {currentScreen === 'focus' && (
              <FocusScreen
                today={today}
                streak={streak}
                isFocusActive={isFocusActive}
                focusSessionStart={focusSessionStart}
                onRefresh={refresh}
              />
            )}
            {currentScreen === 'blocked' && (
              <BlockedScreen today={today} isShieldActive={isShieldActive} />
            )}
            {currentScreen === 'sites' && <SitesScreen today={today} />}
            {currentScreen === 'limits' && (
              <LimitsScreen today={today} limits={limits} onRefresh={refresh} />
            )}
            {currentScreen === 'pet' && <PetScreen mood={mood} />}
            {currentScreen === 'family' && <FamilyScreen />}
            {currentScreen === 'settings' && (
              <SettingsScreen
                onClearToday={clearToday}
                onClearAllAnalytics={clearAllAnalytics}
                onResetPetAndStreaks={resetPetAndStreaks}
                onResetAllLocalData={resetAllLocalData}
                onExportData={exportAnalytics}
              />
            )}
            {currentScreen === 'privacy' && <PrivacyScreen />}
          </>
        )}
      </main>
    </div>
  );
}
