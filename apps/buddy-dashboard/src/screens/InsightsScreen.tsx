import { useState, useEffect } from 'preact/hooks';
import type {
  DailySummary,
  WeeklySummary,
  Insight,
  BehavioralPattern,
  BaselineStats,
  UsageTrend,
  AdaptivePolicyConfig,
  PolicyDecisionLog,
} from '@buddy/shared-types';
import { StorageClient, storage } from '@buddy/storage';
import { TrendEngine, InsightEngine } from '@buddy/intelligence-engine';
import { Card, Badge, EmptyState, Button, Toggle } from '@buddy/ui-components';
import type { ScreenId } from '../components/Navigation.js';

export interface InsightsScreenProps {
  today: DailySummary | null;
  weekly: WeeklySummary | null;
  onNavigate?: (screen: ScreenId) => void;
}

export function InsightsScreen({ today, weekly, onNavigate }: InsightsScreenProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [patterns, setPatterns] = useState<BehavioralPattern[]>([]);
  const [baseline, setBaseline] = useState<BaselineStats | null>(null);
  const [dayTrend, setDayTrend] = useState<UsageTrend | null>(null);
  const [decisionLogs, setDecisionLogs] = useState<PolicyDecisionLog[]>([]);
  const [adaptiveConfig, setAdaptiveConfig] = useState<AdaptivePolicyConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'insights' | 'patterns' | 'trends' | 'audit' | 'settings'>('insights');
  const [_isLoading, setIsLoading] = useState(true);

  const storageClient = new StorageClient(storage);
  const trendEngine = new TrendEngine();
  const insightEngine = new InsightEngine();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [storedInsights, storedPatterns, storedLogs, config, streak] = await Promise.all([
        storageClient.getInsights(),
        storageClient.getPatterns(),
        storageClient.getDecisionLogs(),
        storageClient.getAdaptiveConfig(),
        storageClient.get('streakState'),
      ]);

      setAdaptiveConfig(config);
      setDecisionLogs(storedLogs);

      // Compute baseline from weekly summaries
      const summaries = weekly?.dailySummaries || [];
      const computedBaseline = trendEngine.calculateBaseline(summaries);
      setBaseline(computedBaseline);

      // Compute day-over-day trend
      let computedTrend: UsageTrend | null = null;
      if (today && summaries.length >= 2) {
        const yesterday = summaries[summaries.length - 2];
        if (yesterday) {
          computedTrend = trendEngine.calculateDayTrend(today, yesterday);
          setDayTrend(computedTrend);
        }
      }

      // Generate fresh insights
      if (today) {
        const freshInsights = await insightEngine.generateInsights({
          today,
          baseline: computedBaseline,
          dayTrend: computedTrend || undefined,
          patterns: storedPatterns,
          streak,
        });

        // Merge without duplicating IDs
        const map = new Map<string, Insight>();
        for (const ins of storedInsights) map.set(ins.id, ins);
        for (const ins of freshInsights) {
          if (!map.has(ins.id)) map.set(ins.id, ins);
        }

        const merged = Array.from(map.values());
        setInsights(merged);
        await storageClient.setInsights(merged);
      } else {
        setInsights(storedInsights);
      }

      setPatterns(storedPatterns);
    } catch (err) {
      console.error('[Buddy Insights] Error loading intelligence data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [today, weekly]);

  const handleDismissInsight = async (id: string) => {
    await storageClient.dismissInsight(id);
    setInsights((prev) => prev.map((item) => (item.id === id ? { ...item, isDismissed: true } : item)));
  };

  const handleToggleAdaptiveLimits = async (enabled: boolean) => {
    if (!adaptiveConfig) return;
    const updated: AdaptivePolicyConfig = {
      ...adaptiveConfig,
      isAdaptiveLimitsEnabled: enabled,
    };
    setAdaptiveConfig(updated);
    await storageClient.setAdaptiveConfig(updated);
  };

  const handleToggleBreakReminder = async (enabled: boolean) => {
    if (!adaptiveConfig) return;
    const updated: AdaptivePolicyConfig = {
      ...adaptiveConfig,
      breakReminderEnabled: enabled,
    };
    setAdaptiveConfig(updated);
    await storageClient.setAdaptiveConfig(updated);
  };

  const activeInsights = insights.filter((i) => !i.isDismissed);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>💡</span>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--buddy-text-main, #0f172a)' }}>
            Personal Web Intelligence
          </h2>
        </div>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)' }}>
          Local-first behavioral coaching, pattern analysis, and explainable trends with zero cloud data sharing.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          borderBottom: '1px solid var(--buddy-border-subtle, #e2e8f0)',
          paddingBottom: '8px',
          overflowX: 'auto',
        }}
      >
        {(
          [
            { id: 'insights', label: 'Insights', count: activeInsights.length },
            { id: 'patterns', label: 'Patterns', count: patterns.length },
            { id: 'trends', label: 'Baselines & Trends' },
            { id: 'audit', label: 'Policy Logs', count: decisionLogs.length },
            { id: 'settings', label: 'Adaptive Control' },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--buddy-radius-sm, 6px)',
                border: 'none',
                backgroundColor: isActive ? 'var(--buddy-primary, #6366f1)' : 'var(--buddy-bg-subtle, #f1f5f9)',
                color: isActive ? '#ffffff' : 'var(--buddy-text-muted, #64748b)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{tab.label}</span>
              {'count' in tab && tab.count !== undefined && tab.count > 0 && (
                <span
                  style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : 'var(--buddy-border-subtle, #cbd5e1)',
                    color: isActive ? '#ffffff' : 'var(--buddy-text-main, #0f172a)',
                    fontSize: '10px',
                    padding: '1px 5px',
                    borderRadius: '10px',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Active Insights */}
      {activeTab === 'insights' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activeInsights.length === 0 ? (
            <EmptyState
              title="No active insights yet"
              message="Buddy observes real activity locally over your sessions to surface intentional browsing insights."
              icon="🌱"
            />
          ) : (
            activeInsights.map((insight) => {
              const priorityColor =
                insight.priority === 'high'
                  ? 'var(--buddy-accent-red, #ef4444)'
                  : insight.priority === 'medium'
                    ? 'var(--buddy-accent-amber, #f59e0b)'
                    : 'var(--buddy-primary, #6366f1)';

              return (
                <Card key={insight.id}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: priorityColor,
                            display: 'inline-block',
                          }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--buddy-text-main, #0f172a)' }}>
                          {insight.title}
                        </span>
                        <Badge variant="neutral">
                          {insight.type}
                        </Badge>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDismissInsight(insight.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--buddy-text-muted, #94a3b8)',
                          fontSize: '14px',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title="Dismiss insight"
                      >
                        ✕
                      </button>
                    </div>

                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--buddy-text-main, #334155)', lineHeight: 1.5 }}>
                      {insight.message}
                    </p>

                    {insight.evidence && insight.evidence.length > 0 && (
                      <div
                        style={{
                          backgroundColor: 'var(--buddy-bg-subtle, #f8fafc)',
                          padding: '8px 10px',
                          borderRadius: 'var(--buddy-radius-sm, 6px)',
                          fontSize: '11px',
                          color: 'var(--buddy-text-muted, #64748b)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Observable Evidence:</span>
                        {insight.evidence.map((ev, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>•</span>
                            <span>{ev}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {insight.action && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <Button
                          variant="primary"
                          onClick={() => {
                            if (insight.action?.type === 'start_focus' && onNavigate) {
                              onNavigate('focus');
                            } else if (insight.action?.type === 'set_limit' && onNavigate) {
                              onNavigate('limits');
                            }
                          }}
                        >
                          {insight.action.label}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Behavioral Patterns */}
      {activeTab === 'patterns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {patterns.length === 0 ? (
            <EmptyState
              title="No behavioral patterns detected yet"
              message="As you browse, Buddy locally identifies repeated visit patterns, rapid reopens, and uninterrupted sessions."
              icon="🔍"
            />
          ) : (
            patterns.map((pattern) => (
              <Card key={pattern.id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--buddy-text-main, #0f172a)' }}>
                      {pattern.description}
                    </span>
                    <Badge variant="neutral">
                      {pattern.type.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>
                    Detected {new Date(pattern.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Occurrences: {pattern.occurrences}
                  </div>

                  <div
                    style={{
                      backgroundColor: 'var(--buddy-bg-subtle, #f8fafc)',
                      padding: '8px 10px',
                      borderRadius: 'var(--buddy-radius-sm, 6px)',
                      fontSize: '11px',
                      color: 'var(--buddy-text-muted, #64748b)',
                    }}
                  >
                    {pattern.evidence.map((ev, idx) => (
                      <div key={idx} style={{ marginTop: idx > 0 ? '3px' : '0' }}>
                        • {ev}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Baselines & Trends */}
      {activeTab === 'trends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Card title="Personal Baseline (Rolling Average)">
            {baseline?.hasSufficientData ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--buddy-bg-subtle, #f8fafc)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>Active Time Average</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--buddy-text-main, #0f172a)' }}>
                    {Math.round(baseline.averageActiveMs / 60000)}m / day
                  </div>
                </div>
                <div style={{ padding: '8px', backgroundColor: 'var(--buddy-bg-subtle, #f8fafc)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>Short-Form Average</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--buddy-text-main, #0f172a)' }}>
                    {Math.round(baseline.averageShortFormMs / 60000)}m / day
                  </div>
                </div>
                <div style={{ padding: '8px', backgroundColor: 'var(--buddy-bg-subtle, #f8fafc)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>Media Watch Average</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--buddy-text-main, #0f172a)' }}>
                    {Math.round(baseline.averageMediaMs / 60000)}m / day
                  </div>
                </div>
                <div style={{ padding: '8px', backgroundColor: 'var(--buddy-bg-subtle, #f8fafc)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>Focus Time Average</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--buddy-text-main, #0f172a)' }}>
                    {Math.round(baseline.averageFocusMs / 60000)}m / day
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)' }}>
                Not enough data yet. Complete at least 2 days of browsing activity to calculate your personal baseline.
              </p>
            )}
          </Card>

          {dayTrend && (
            <Card title="Day-over-Day Shift (vs Yesterday)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--buddy-text-main, #0f172a)' }}>Active Browsing Delta:</span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color:
                        dayTrend.diffMs > 0
                          ? 'var(--buddy-accent-amber, #f59e0b)'
                          : 'var(--buddy-accent-green, #10b981)',
                    }}
                  >
                    {dayTrend.diffMs > 0 ? '+' : ''}
                    {Math.round(dayTrend.diffMs / 60000)}m
                    {dayTrend.percentChange !== null && ` (${dayTrend.percentChange > 0 ? '+' : ''}${dayTrend.percentChange}%)`}
                  </span>
                </div>

                {dayTrend.topCategoryChange && (
                  <div style={{ fontSize: '12px', color: 'var(--buddy-text-muted, #64748b)' }}>
                    Largest shift in category: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{dayTrend.topCategoryChange.category}</span> ({dayTrend.topCategoryChange.diffMs > 0 ? '+' : ''}{Math.round(dayTrend.topCategoryChange.diffMs / 60000)}m)
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab 4: Policy Decision Audit Logs */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {decisionLogs.length === 0 ? (
            <EmptyState
              title="No policy decision logs recorded"
              message="All automated interventions and recommendations are logged here with transparent justifications."
              icon="📜"
            />
          ) : (
            decisionLogs.slice(0, 20).map((log) => (
              <Card key={log.id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--buddy-text-main, #0f172a)' }}>
                      {log.target || log.trigger}
                    </span>
                    <Badge variant={log.action === 'block' ? 'danger' : log.action === 'warn' ? 'warning' : 'neutral'}>
                      {log.action}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--buddy-text-main, #334155)' }}>
                    {log.reason}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--buddy-text-muted, #94a3b8)' }}>
                    Policy: {log.policy} • {new Date(log.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 5: Adaptive Control Settings */}
      {activeTab === 'settings' && adaptiveConfig && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Card title="Adaptive Intelligence Preferences">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--buddy-text-main, #0f172a)' }}>
                    Enable Adaptive Limits
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>
                    Allow Buddy to suggest dynamic limit adjustments based on personal patterns (requires opt-in)
                  </div>
                </div>
                <Toggle
                  checked={adaptiveConfig.isAdaptiveLimitsEnabled}
                  onChange={handleToggleAdaptiveLimits}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--buddy-text-main, #0f172a)' }}>
                    Smart Break Reminders
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--buddy-text-muted, #64748b)' }}>
                    Notify when browsing continuously exceeds {adaptiveConfig.continuousActivityThresholdMinutes} minutes
                  </div>
                </div>
                <Toggle
                  checked={adaptiveConfig.breakReminderEnabled}
                  onChange={handleToggleBreakReminder}
                />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
