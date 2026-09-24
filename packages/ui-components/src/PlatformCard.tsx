/**
 * @buddy/ui-components - PlatformCard.tsx
 * Real platform activity card displaying only supported metrics.
 */

export interface PlatformCardProps {
  platform?: string;
  name?: string;
  domain?: string;
  icon?: string;
  activeMs: number;
  mediaMs?: number;
  shortFormMs?: number;
  sessions?: number;
  limitsReached?: number;
  isShortFormSupported?: boolean;
  supportsShortForm?: boolean;
}

export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${totalSeconds}s`;
}

export function PlatformCard({
  platform,
  name,
  domain,
  icon,
  activeMs,
  mediaMs = 0,
  shortFormMs,
  sessions = 0,
  limitsReached = 0,
  isShortFormSupported = false,
  supportsShortForm = false,
}: PlatformCardProps) {
  const rawName = name || platform || 'Platform';
  const platformName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const effectiveShortFormSupported = isShortFormSupported || supportsShortForm;

  return (
    <div
      className="buddy-platform-card"
      style={{
        backgroundColor: 'var(--buddy-bg-card)',
        borderRadius: 'var(--buddy-radius-md)',
        border: '1px solid var(--buddy-border-subtle)',
        padding: '14px 16px',
        marginBottom: '10px',
        boxShadow: 'var(--buddy-shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon && <span style={{ fontSize: '20px' }}>{icon}</span>}
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--buddy-text-main)' }}>
              {platformName}
            </h4>
            {domain && (
              <span style={{ fontSize: '11px', color: 'var(--buddy-text-muted)' }}>{domain}</span>
            )}
          </div>
        </div>
        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--buddy-accent-blue)' }}>
          {formatDurationMs(activeMs)}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: effectiveShortFormSupported && shortFormMs !== undefined ? '1fr 1fr 1fr' : '1fr 1fr',
          gap: '8px',
          fontSize: '11px',
          color: 'var(--buddy-text-muted)',
          backgroundColor: 'var(--buddy-bg-hover)',
          borderRadius: 'var(--buddy-radius-sm)',
          padding: '8px 10px',
        }}
      >
        <div>
          <span style={{ display: 'block', color: 'var(--buddy-text-muted)' }}>Media Time</span>
          <strong style={{ color: 'var(--buddy-text-main)' }}>{formatDurationMs(mediaMs)}</strong>
        </div>

        {isShortFormSupported && shortFormMs !== undefined && (
          <div>
            <span style={{ display: 'block', color: 'var(--buddy-text-muted)' }}>Short-form</span>
            <strong style={{ color: 'var(--buddy-text-main)' }}>{formatDurationMs(shortFormMs)}</strong>
          </div>
        )}

        <div>
          <span style={{ display: 'block', color: 'var(--buddy-text-muted)' }}>Sessions</span>
          <strong style={{ color: 'var(--buddy-text-main)' }}>{sessions}</strong>
        </div>
      </div>

      {limitsReached > 0 && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--buddy-accent-amber)', fontWeight: 600 }}>
          ⚠️ Daily limit reached {limitsReached}x
        </div>
      )}
    </div>
  );
}
