export type ScreenId =
  | 'home'
  | 'today'
  | 'insights'
  | 'watch-time'
  | 'focus'
  | 'blocked'
  | 'sites'
  | 'limits'
  | 'pet'
  | 'family'
  | 'settings'
  | 'privacy';

export interface NavItem {
  id: ScreenId;
  label: string;
  icon: string;
  isTeaser?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'today', label: 'Today', icon: '📅' },
  { id: 'insights', label: 'Insights', icon: '💡' },
  { id: 'watch-time', label: 'Watch Time', icon: '⏱️' },
  { id: 'focus', label: 'Focus', icon: '🎯' },
  { id: 'blocked', label: 'Blocked', icon: '🛡️' },
  { id: 'sites', label: 'Sites', icon: '🌐' },
  { id: 'limits', label: 'Limits', icon: '⏳' },
  { id: 'pet', label: 'Buddy Pet', icon: '🐾' },
  { id: 'family', label: 'Family', icon: '👨‍👩‍👧', isTeaser: true },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'privacy', label: 'Privacy', icon: '🔒' },
];

export interface NavigationProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
}

export function Navigation({ currentScreen, onSelectScreen }: NavigationProps) {
  return (
    <nav
      aria-label="Dashboard navigation"
      style={{
        display: 'flex',
        gap: '4px',
        overflowX: 'auto',
        padding: '8px 12px',
        backgroundColor: 'var(--buddy-bg-card, #ffffff)',
        borderBottom: '1px solid var(--buddy-border-subtle, #e2e8f0)',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectScreen(item.id)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--buddy-radius-sm, 6px)',
              border: 'none',
              backgroundColor: isActive
                ? 'var(--buddy-primary, #6366f1)'
                : 'transparent',
              color: isActive
                ? '#ffffff'
                : 'var(--buddy-text-muted, #64748b)',
              fontSize: '12px',
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            <span role="img" aria-hidden="true" style={{ fontSize: '14px' }}>
              {item.icon}
            </span>
            <span>{item.label}</span>
            {item.isTeaser && (
              <span
                style={{
                  fontSize: '9px',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : 'var(--buddy-border-subtle, #e2e8f0)',
                  color: isActive ? '#ffffff' : 'var(--buddy-text-muted, #64748b)',
                }}
              >
                Soon
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
