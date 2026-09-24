# Buddy Analytics Architecture

## 1. Overview & Core Philosophy

The Buddy Dashboard analytics layer is an audited, 100% local, read-optimized measurement pipeline.
It adheres strictly to the project's foundational constraints:

1. **Zero Fake Data:** No simulated stats, no hardcoded demo metrics, and no synthetic activity. A fresh install legitimately starts at exact zero.
2. **Local-First & Offline Guarantee:** ₹0 backend, ₹0 external telemetry, ₹0 cloud synchronization. All operations happen in `chrome.storage.local`.
3. **Strict Privacy Boundary:** No raw URLs, full browsing histories, page titles, private messages, or DOM contents are ever measured or stored. Metrics are strictly coarse aggregates categorized by verified platform identifiers (`youtube`, `spotify`, etc.) or high-level categories (`video`, `social`, `music`).

---

## 2. Real Data Pipeline Topology

The complete Phase 4 event pipeline transforms raw browser signals into aggregated dashboard presentations:

```text
REAL USER ACTIVITY
        ↓
REAL SITE ADAPTERS (YouTube, Spotify, Instagram, etc.)
        ↓
WATCH-TIME ENGINE (HTML5 media events, foreground focus)
        ↓
BUDDY SHIELD (DeclarativeNetRequest ad & tracker interceptions)
        ↓
ACTIVITY / FOCUS ENGINE (Session start/end, doomscroll checks)
        ↓
CHROME.STORAGE.LOCAL (StorageSchema: dailyStats, streakState, moodState)
        ↓
ANALYTICS AGGREGATOR (DailySummaries, 7-day rollups, platform stats)
        ↓
MOOD ENGINE & PET ENGINE (Deterministic stimulus, anti-gaming, states)
        ↓
STREAK ENGINE (Goal verification, midnight rollover, freeze tokens)
        ↓
BUDDY DASHBOARD (Sidepanel, Popup, Declarative SVG Charts)
```

---

## 3. Data Schemas & Aggregation Contracts

### 3.1 Raw Storage Layer (`StorageSchema['dailyStats']`)
Stored in `chrome.storage.local` under the `dailyStats` key, keyed by ISO date string (`YYYY-MM-DD`):

```ts
export interface DailyStats {
  readonly date: string; // YYYY-MM-DD
  readonly totalActiveSeconds: number;
  readonly totalMediaWatchSeconds: number;
  readonly totalFocusSeconds?: number;
  readonly totalAdsBlocked: number;
  readonly totalTrackersBlocked: number;
  readonly doomscrollAlertsCount: number;
  readonly sessionsCount?: number;
  readonly limitsReachedCount?: number;
  readonly categorySeconds: Readonly<Record<PlatformCategory, number>>;
  readonly platformStats?: Readonly<Record<string, PlatformDailyStats>>;
}
```

### 3.2 Read-Oriented Aggregates (`DailySummary`)
Computed on demand by `AnalyticsAggregator`:

```ts
export interface DailySummary {
  readonly date: string;
  readonly totalActiveMs: number;
  readonly mediaMs: number;
  readonly focusMs: number;
  readonly socialMs: number;
  readonly videoMs: number;
  readonly musicMs: number;
  readonly adsBlocked: number;
  readonly trackersBlocked: number;
  readonly sessions: number;
  readonly limitsReached: number;
  readonly doomscrollAlerts: number;
  readonly platformStats: Record<string, PlatformSummary>;
}
```

### 3.3 7-Day Rollup (`WeeklySummary`)
Aggregated from 7 contiguous daily summaries to eliminate scanning historical raw session records on popup open:

```ts
export interface WeeklySummary {
  readonly startDate: string;
  readonly endDate: string;
  readonly totalActiveMs: number;
  readonly totalMediaMs: number;
  readonly totalFocusMs: number;
  readonly totalAdsBlocked: number;
  readonly totalTrackersBlocked: number;
  readonly totalSessions: number;
  readonly dailySummaries: DailySummary[];
  readonly topPlatforms: PlatformSummary[];
}
```

---

## 4. Watch-Time & Measurement Reconciliation

To maintain absolute data integrity, the analytics pipeline enforces the following mathematical invariants:

1. **Daily Active Time Reconciliation:**
   $$\sum_{p \in \text{Platforms}} \text{PlatformActiveMs}(p) \le \text{TotalActiveMs}$$
2. **Weekly Aggregation Reconciliation:**
   $$\text{WeeklyActiveMs} = \sum_{d=0}^{6} \text{DailyActiveMs}(d)$$
   $$\text{WeeklyMediaMs} = \sum_{d=0}^{6} \text{DailyMediaMs}(d)$$
   $$\text{WeeklyBlocked} = \sum_{d=0}^{6} \left(\text{AdsBlocked}(d) + \text{TrackersBlocked}(d)\right)$$
3. **Zero Negative Invariant:**
   $$\forall m \in \text{Metrics}, \quad m \ge 0$$

---

## 5. Storage Lifecycle & Data Maintenance

The Dashboard provides user-initiated local database maintenance with explicit confirmation:
- **Clear Today:** Erases `dailyStats[todayKey]` without affecting historical days or Shield configurations.
- **Clear History:** Erases all past days in `dailyStats`.
- **Reset Pet & Streaks:** Restores `moodState` to baseline (50.0) and resets `streakState`.
- **Full Local Reset:** Completely clears `chrome.storage.local` back to clean initial factory defaults.
- **JSON Export:** Downloads aggregated metrics only; zero private browsing content.
