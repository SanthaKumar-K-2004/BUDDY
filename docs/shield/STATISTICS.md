# Buddy Shield: Statistics & Telemetry Architecture

## 1. Core Principles

Buddy Shield adheres to **Privacy-First Local Telemetry**:
1. **Zero Remote Uploads**: Statistics are stored exclusively inside `chrome.storage.local`. Zero bytes are transmitted to any external server or API.
2. **Zero URL Retention**: Statistics track only canonical domain names (e.g. `example.com`). Full request URLs, URL paths, query parameters, authorization tokens, and personal browsing history are discarded immediately upon arrival.
3. **Aggregated Storage**: Rather than appending an unbounded log of raw events, Buddy maintains fixed daily counters (`dailyStats`) broken down by category.

---

## 2. Block Event Pipeline

```text
  [ DNR Rule Matched ]                    [ Cosmetic Elements Hidden ]
            │                                           │
            ▼                                           ▼
      { domain, 'ad' }                          { domain, 'cosmetic' }
            │                                           │
            └─────────────────────┬─────────────────────┘
                                  ▼
                     StatsEngine.recordBlock()
                                  │
                                  ▼
                   ┌─────────────────────────────┐
                   │ In-Memory Aggregator Buffer │
                   │  - Site map counters        │
                   │  - Category pending buffer  │
                   └──────────────┬──────────────┘
                                  │
                 Threshold >= 50 or 60s Alarm
                                  │
                                  ▼
                        StatsEngine.flush()
                                  │
                                  ▼
                   ┌─────────────────────────────┐
                   │    @buddy/storage (local)   │
                   │  - DailyStats[YYYY-MM-DD]   │
                   └─────────────────────────────┘
```

---

## 3. Service Worker Suspension Safety

Chrome MV3 service workers can be terminated by the browser when idle for ~30 seconds. To prevent data loss:
1. **Periodic Alarm**: A Chrome alarm (`buddy-shield-flush-stats`) runs every 1 minute to flush in-memory buffers to storage.
2. **Threshold Flush**: If 50 block events accumulate in memory before the alarm fires, `flush()` is triggered immediately.
3. **Popup Trigger**: Opening the extension popup automatically requests an up-to-date summary from the in-memory buffer, reflecting live blocking counts without lag.

---

## 4. Schema Contract

Statistics are persisted to the strongly-typed `DailyStats` schema in `@buddy/shared-types`:

```ts
export interface DailyStats {
  readonly date: string; // YYYY-MM-DD
  readonly totalActiveSeconds: number;
  readonly totalMediaWatchSeconds: number;
  readonly totalAdsBlocked: number;
  readonly totalTrackersBlocked: number;
  readonly doomscrollAlertsCount: number;
  readonly categorySeconds: Readonly<Record<PlatformCategory, number>>;
}
```
