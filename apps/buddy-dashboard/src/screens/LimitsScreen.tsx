import { useState } from 'preact/hooks';
import type { DailySummary, LimitRule } from '@buddy/shared-types';
import { LimitCard, Card, EmptyState } from '@buddy/ui-components';
import { StorageClient } from '@buddy/storage';

export interface LimitsScreenProps {
  today: DailySummary | null;
  limits: LimitRule[];
  onRefresh: () => void;
}

export function LimitsScreen({ today, limits, onRefresh }: LimitsScreenProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTarget, setNewTarget] = useState('youtube');
  const [newType, setNewType] = useState<'platform' | 'category'>('platform');
  const [newMinutes, setNewMinutes] = useState(60);

  const platformStats = today?.platformStats ?? {};

  const handleAddLimit = async () => {
    const storageClient = new StorageClient();
    const stored = await storageClient.getStorage();
    const currentLimits = stored.limits || [];

    const newRule: LimitRule = {
      id: `limit-${Date.now()}`,
      type: newType,
      target: newTarget,
      maxDailyMinutes: newMinutes,
      warningThresholdMinutes: Math.max(5, Math.floor(newMinutes * 0.8)),
      action: 'block',
      enabled: true,
    };

    await storageClient.set('limits', [...currentLimits, newRule]);
    setShowAddForm(false);
    onRefresh();
  };

  const handleRemoveLimit = async (limitId: string) => {
    const storageClient = new StorageClient();
    const stored = await storageClient.getStorage();
    const updated = (stored.limits || []).filter((l) => l.id !== limitId);
    await storageClient.set('limits', updated);
    onRefresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--buddy-text-main, #0f172a)' }}>
            Usage Limits & Intentional Boundaries
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)' }}>
            Real-time usage calculated against your local daily activity
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '6px 12px',
            backgroundColor: 'var(--buddy-primary, #6366f1)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--buddy-radius-sm, 6px)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add Limit'}
        </button>
      </div>

      {showAddForm && (
        <Card title="Configure New Limit Rule">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)', marginBottom: '4px' }}>
                Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType((e.target as HTMLSelectElement).value as 'platform' | 'category')}
                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--buddy-border-subtle, #cbd5e1)' }}
              >
                <option value="platform">Platform</option>
                <option value="category">Category</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)', marginBottom: '4px' }}>
                Target Name (e.g. youtube, social, video)
              </label>
              <input
                type="text"
                value={newTarget}
                onInput={(e) => setNewTarget((e.target as HTMLInputElement).value)}
                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--buddy-border-subtle, #cbd5e1)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)', marginBottom: '4px' }}>
                Max Daily Minutes ({newMinutes} min)
              </label>
              <input
                type="number"
                min="5"
                max="480"
                value={newMinutes}
                onInput={(e) => setNewMinutes(parseInt((e.target as HTMLInputElement).value, 10) || 30)}
                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--buddy-border-subtle, #cbd5e1)' }}
              />
            </div>

            <button
              type="button"
              onClick={handleAddLimit}
              style={{
                marginTop: '6px',
                padding: '8px',
                backgroundColor: 'var(--buddy-accent-green, #10b981)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Save Limit Rule
            </button>
          </div>
        </Card>
      )}

      {limits.length === 0 ? (
        <EmptyState
          title="No limits configured"
          message="Set daily usage boundaries for platforms or categories to prevent accidental overtime and preserve healthy habits."
          icon="⏳"
          actionText="Add First Limit"
          onAction={() => setShowAddForm(true)}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {limits.map((rule) => {
            let usedMinutes = 0;
            if (rule.type === 'platform') {
              const stats = platformStats[rule.target.toLowerCase()];
              usedMinutes = stats ? Math.round(stats.activeMs / 60000) : 0;
            } else if (rule.type === 'category') {
              if (rule.target === 'video') usedMinutes = Math.round((today?.videoMs ?? 0) / 60000);
              else if (rule.target === 'social') usedMinutes = Math.round((today?.socialMs ?? 0) / 60000);
              else if (rule.target === 'music') usedMinutes = Math.round((today?.musicMs ?? 0) / 60000);
            }

            return (
              <div key={rule.id} style={{ position: 'relative' }}>
                <LimitCard
                  name={rule.target.toUpperCase()}
                  type={rule.type}
                  usedMinutes={usedMinutes}
                  limitMinutes={rule.maxDailyMinutes}
                  warningMinutes={rule.warningThresholdMinutes}
                  isBlocked={usedMinutes >= rule.maxDailyMinutes}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLimit(rule.id)}
                  title="Delete limit"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--buddy-text-muted, #94a3b8)',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
