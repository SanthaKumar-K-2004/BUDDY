import { useState, useEffect } from 'preact/hooks';
import { Card, Toggle, Badge, Button } from '@buddy/ui-components';
import type { ShieldStatus } from '@buddy/shield-core';

export function App() {
  const [status, setStatus] = useState<ShieldStatus | null>(null);
  const [currentSite, setCurrentSite] = useState<string>('example.com');
  const [loading, setLoading] = useState<boolean>(true);

  // Discover active tab hostname and query shield status
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabUrl = tabs[0]?.url;
        let site = 'unknown';
        if (tabUrl && !tabUrl.startsWith('chrome://') && !tabUrl.startsWith('about:')) {
          try {
            site = new URL(tabUrl).hostname;
          } catch {
            site = tabUrl;
          }
        }
        setCurrentSite(site);
        fetchStatus(site);
      });
    } else {
      // Mock / fallback for testing
      setStatus({
        isGloballyEnabled: true,
        isProtected: true,
        currentSite: 'example.com',
        sitePolicy: { site: 'example.com', enabled: true },
        activeRulesets: ['ruleset_ads', 'ruleset_trackers'],
        totalBlocked: 42,
        adsBlocked: 28,
        trackersBlocked: 14,
      });
      setLoading(false);
    }
  }, []);

  const fetchStatus = (site: string) => {
    setLoading(true);
    chrome.runtime.sendMessage(
      { type: 'GET_SHIELD_STATUS', site },
      (res: ShieldStatus | { error?: string }) => {
        setLoading(false);
        if (res && !('error' in res)) {
          setStatus(res as ShieldStatus);
        }
      }
    );
  };

  const handleToggleGlobal = (enabled: boolean) => {
    chrome.runtime.sendMessage(
      { type: 'TOGGLE_GLOBAL_SHIELD', enabled },
      (res: ShieldStatus | { error?: string }) => {
        if (res && !('error' in res)) {
          setStatus(res as ShieldStatus);
        }
      }
    );
  };

  const handleToggleSitePause = () => {
    if (!status || !currentSite) return;
    const isPaused = !status.isProtected && status.isGloballyEnabled;
    const msgType = isPaused ? 'RESUME_SITE' : 'PAUSE_SITE';

    chrome.runtime.sendMessage(
      { type: msgType, site: currentSite },
      (res: ShieldStatus | { error?: string }) => {
        if (res && !('error' in res)) {
          setStatus(res as ShieldStatus);
        }
      }
    );
  };

  const isGloballyActive = status?.isGloballyEnabled ?? true;
  const isSiteActive = status?.isProtected ?? true;
  const isSitePaused = isGloballyActive && !isSiteActive;

  let badgeText = 'Active';
  let badgeVariant: 'success' | 'warning' | 'neutral' = 'success';

  if (!isGloballyActive) {
    badgeText = 'Disabled';
    badgeVariant = 'neutral';
  } else if (isSitePaused) {
    badgeText = 'Paused on Site';
    badgeVariant = 'warning';
  }

  return (
    <div style={{ width: '320px', padding: '16px', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🛡️</span>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--buddy-text-main, #111827)' }}>
            Buddy Shield
          </h2>
        </div>
        <Badge variant={badgeVariant}>{badgeText}</Badge>
      </div>

      {/* Main Protection Card */}
      <Card>
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: isSiteActive ? '#10B981' : '#6B7280' }}>
            {status?.totalBlocked ?? 0}
          </div>
          <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
            Total requests blocked
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #E5E7EB', paddingTop: '10px', marginTop: '4px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
              {status?.adsBlocked ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280' }}>Ads & banners</div>
          </div>
          <div style={{ width: '1px', background: '#E5E7EB' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
              {status?.trackersBlocked ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280' }}>Trackers blocked</div>
          </div>
        </div>
      </Card>

      {/* Current Site Card */}
      <div style={{ marginTop: '12px' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#4B5563' }}>Current Domain</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
              {currentSite}
            </span>
          </div>

          {currentSite && currentSite !== 'unknown' && isGloballyActive && (
            <Button
              variant={isSitePaused ? 'primary' : 'secondary'}
              onClick={handleToggleSitePause}
              disabled={loading}
            >
              {isSitePaused ? `Resume on ${currentSite}` : `Pause on ${currentSite}`}
            </Button>
          )}
        </Card>
      </div>

      {/* Global Protection Toggle */}
      <div style={{ marginTop: '12px' }}>
        <Card>
          <Toggle
            checked={isGloballyActive}
            onChange={handleToggleGlobal}
            label="Global Shield Protection"
          />
        </Card>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <Button variant="secondary" onClick={() => window.close()}>
          Done
        </Button>
      </div>
    </div>
  );
}
