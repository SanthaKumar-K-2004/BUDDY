import type { DailySummary } from '@buddy/shared-types';
import { PlatformCard, EmptyState } from '@buddy/ui-components';

export interface SitesScreenProps {
  today: DailySummary | null;
}

interface PlatformDefinition {
  id: string;
  name: string;
  domain: string;
  icon: string;
  supportsShortForm: boolean;
}

const SUPPORTED_PLATFORMS: PlatformDefinition[] = [
  { id: 'youtube', name: 'YouTube', domain: 'youtube.com', icon: '▶️', supportsShortForm: true },
  { id: 'instagram', name: 'Instagram', domain: 'instagram.com', icon: '📸', supportsShortForm: true },
  { id: 'tiktok', name: 'TikTok', domain: 'tiktok.com', icon: '🎵', supportsShortForm: true },
  { id: 'facebook', name: 'Facebook', domain: 'facebook.com', icon: '👥', supportsShortForm: true },
  { id: 'spotify', name: 'Spotify', domain: 'open.spotify.com', icon: '🎧', supportsShortForm: false },
  { id: 'reddit', name: 'Reddit', domain: 'reddit.com', icon: '🤖', supportsShortForm: false },
  { id: 'x', name: 'X / Twitter', domain: 'x.com', icon: '✖️', supportsShortForm: false },
  { id: 'twitch', name: 'Twitch', domain: 'twitch.tv', icon: '🎮', supportsShortForm: false },
];

export function SitesScreen({ today }: SitesScreenProps) {
  const platformStats = today?.platformStats ?? {};
  const hasAnyPlatformActivity = Object.values(platformStats).some((stats) => stats.activeMs > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--buddy-text-main, #0f172a)' }}>
          Supported Platform Analytics
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)' }}>
          Precision site-adapter metrics. Short-form reels/shorts are only displayed where supported.
        </p>
      </div>

      {!hasAnyPlatformActivity && (
        <EmptyState
          title="No site activity recorded today"
          message="Buddy automatically records active time when you visit supported websites like YouTube, Spotify, Reddit, and Instagram."
          icon="🌐"
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {SUPPORTED_PLATFORMS.map((plat) => {
          const stats = platformStats[plat.id];
          const activeMs = stats?.activeMs ?? 0;
          const mediaMs = stats?.mediaMs ?? 0;
          const shortFormMs = plat.supportsShortForm ? stats?.shortFormMs : undefined;
          const sessions = stats?.sessions ?? 0;

          return (
            <PlatformCard
              key={plat.id}
              name={plat.name}
              domain={plat.domain}
              icon={plat.icon}
              activeMs={activeMs}
              mediaMs={mediaMs}
              shortFormMs={shortFormMs}
              sessions={sessions}
              supportsShortForm={plat.supportsShortForm}
            />
          );
        })}
      </div>
    </div>
  );
}
