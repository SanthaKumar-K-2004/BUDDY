import type { DailySummary, MoodState, StreakState } from '@buddy/shared-types';
import { StatCard, PetCard, StreakCard, EmptyState } from '@buddy/ui-components';
import type { ScreenId } from '../components/Navigation';

export interface HomeScreenProps {
  today: DailySummary | null;
  mood: MoodState;
  streak: StreakState;
  isShieldActive: boolean;
  onNavigate: (screen: ScreenId) => void;
}

export function HomeScreen({
  today,
  mood,
  streak,
  isShieldActive: _isShieldActive,
  onNavigate,
}: HomeScreenProps) {
  const activeMs = today?.totalActiveMs ?? 0;
  const focusMs = today?.focusMs ?? 0;
  const blockedCount = (today?.adsBlocked ?? 0) + (today?.trackersBlocked ?? 0);
  const hasActivity = activeMs > 0 || focusMs > 0 || blockedCount > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Buddy Companion Overview */}
      <PetCard
        name="Buddy"
        visualState={mood.visualState}
        score={mood.score}
        dialogue={
          hasActivity
            ? `We've spent ${Math.round(activeMs / 60000)}m together today. Keep up the intentional habits!`
            : "Welcome to Buddy! Start browsing or begin a Focus session, and I'll keep you balanced."
        }
      />

      {/* Key Daily Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <StatCard
          label="Active Time"
          milliseconds={activeMs}
          icon="⏱️"
        />
        <StatCard
          label="Focus Time"
          milliseconds={focusMs}
          icon="🎯"
        />
        <StatCard
          label="Blocked"
          count={blockedCount}
          icon="🛡️"
        />
      </div>

      {/* Streak Card */}
      <StreakCard
        currentStreak={streak.currentStreak}
        longestStreak={streak.longestStreak}
        freezesRemaining={streak.freezesRemaining}
        isTodayGoalMet={focusMs >= 25 * 60 * 1000}
        goalDescription="Complete at least 25 minutes of Focus Mode today"
      />

      {/* Zero State or Quick Action Jumpers */}
      {!hasActivity ? (
        <EmptyState
          title="No activity recorded today"
          message="Your local metrics will automatically reflect activity as you visit supported sites or start Focus sessions."
          icon="🌱"
          actionText="Start Focus Session"
          onAction={() => onNavigate('focus')}
        />
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => onNavigate('today')}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: 'var(--buddy-bg-card, #ffffff)',
              border: '1px solid var(--buddy-border-subtle, #e2e8f0)',
              borderRadius: 'var(--buddy-radius-sm, 6px)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--buddy-text-main, #0f172a)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>📊</span> Breakdown
          </button>
          <button
            type="button"
            onClick={() => onNavigate('insights')}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: 'var(--buddy-bg-card, #ffffff)',
              border: '1px solid var(--buddy-border-subtle, #e2e8f0)',
              borderRadius: 'var(--buddy-radius-sm, 6px)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--buddy-text-main, #0f172a)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>💡</span> Insights
          </button>
          <button
            type="button"
            onClick={() => onNavigate('focus')}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: 'var(--buddy-primary, #6366f1)',
              border: 'none',
              borderRadius: 'var(--buddy-radius-sm, 6px)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>🎯</span> Focus Mode
          </button>
        </div>
      )}
    </div>
  );
}
