# Implementation Plan — Phase 7: Local Intelligence, Adaptive Control & Personal Web Coach Engine

Transform Buddy into a **Local-First Personal Web Intelligence & Adaptive Control Engine** operating strictly on real browser data without synthetic metrics, cloud dependencies, or psychological diagnosis.

---

## User Review Required

> [!IMPORTANT]
> **Local-First & Zero-Cost Guarantee:** Phase 7 requires zero paid cloud services, zero external telemetry, and zero mandatory AI backends. All pattern recognition, trend calculations, and insight generation run deterministically on the user's local machine in `chrome.storage.local`.
>
> **Ethical & Psychological Invariant:** Buddy strictly avoids psychological diagnosis (no ADHD, addiction, or depressive labels). Language is neutral, objective, and transparent. Automated limit changes require explicit user opt-in (`isAdaptiveLimitsEnabled`).

---

## Proposed Architecture

```text
                        REAL BROWSER
                             │
                             ▼
                 Universal Activity Engine (Phase 6)
                             │
                             ▼
                 Event Normalizer & Validator
                  (Reject invalid/negative/future events)
                             │
                             ▼
                 Storage & Analytics Aggregator
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
 Pattern Detection      Trend Engine        Personal Baseline
 - Rapid reopens        - Day-over-day      - 7-day/14-day average
 - Site switching       - Week-over-week    - Time of day (M/A/E/N)
 - Uninterrupted time   - Category shifts   - Day of week (Sun-Sat)
 - Short-form velocity  - Insufficient data - Own data only (no fake
        │                handling            benchmarks)
        └────────────────────┬────────────────────┘
                             ▼
                     Insight Engine
             - Explainable insights with evidence
             - Actionable recommendations
             - Deterministic scoring & ranking
             - Optional AI formatter (with hallucination guard)
                             │
        ┌────────────────────┴────────────────────┐
        ▼                                         ▼
Adaptive Policy Engine                     Smart Coach
- Deterministic priority                   - Continuous work monitor
- Smart break prompt (non-forced)          - Smart focus suggestion
- Opt-in adaptive limits                   - Cooldown & anti-spam
- Policy decision audit log                       │
        │                                         │
        └────────────────────┬────────────────────┘
                             ▼
                   Dashboard & Extensions
              - Insight Center Screen in Dashboard
              - Home Screen coaching preview
              - Shield, Focus, Family, Pet integration
              - Full local export & privacy reset
```

---

## Proposed Changes

### 1. Contracts & Types (`packages/shared-types`)

#### [NEW] [intelligence.ts](file:///home/santhakumar/Desktop/BUDDY/packages/shared-types/src/intelligence.ts)
- Define `Insight`, `InsightType`, `InsightPriority`, `InsightAction`.
- Define `BehavioralPattern`, `PatternType`.
- Define `PersonalBaseline`, `UsageTrend`, `TimeOfDayDistribution`.
- Define `AdaptivePolicyConfig`, `PolicyDecisionLog`, `SmartBreakState`.
- Update [`packages/shared-types/src/index.ts`](file:///home/santhakumar/Desktop/BUDDY/packages/shared-types/src/index.ts) to export new types.

#### [MODIFY] [storage.ts](file:///home/santhakumar/Desktop/BUDDY/packages/shared-types/src/storage.ts)
- Extend `StorageSchema` with:
  - `insights: Insight[]`
  - `patterns: BehavioralPattern[]`
  - `adaptiveConfig: AdaptivePolicyConfig`
  - `decisionLogs: PolicyDecisionLog[]`
  - `smartBreakState: SmartBreakState`

---

### 2. Dedicated Intelligence Package (`packages/intelligence-engine`)

Create a new package `@buddy/intelligence-engine`:

#### [NEW] [package.json](file:///home/santhakumar/Desktop/BUDDY/packages/intelligence-engine/package.json) & [tsconfig.json](file:///home/santhakumar/Desktop/BUDDY/packages/intelligence-engine/tsconfig.json)
- Standard workspace package referencing `@buddy/shared-types` and `@buddy/storage`.

#### [NEW] [src/pattern-detector.ts](file:///home/santhakumar/Desktop/BUDDY/packages/intelligence-engine/src/pattern-detector.ts)
- Detects rapid reopens (`windowSeconds = 60`).
- Detects frequent site switching (`thresholdSwitches = 4` across domains in 10 mins).
- Detects long uninterrupted sessions (`thresholdMinutes = 50`).
- Detects repeated short-form velocity across YouTube Shorts, Instagram Reels, Facebook Reels, and TikTok.
- Detects late-night usage sessions (`23:00 - 05:00`).

#### [NEW] [src/trend-engine.ts](file:///home/santhakumar/Desktop/BUDDY/packages/intelligence-engine/src/trend-engine.ts)
- Computes personal baseline (7-day, 14-day, 30-day rolling averages) strictly from user's own history.
- Handles insufficient data honestly ("Not enough data yet") without synthesizing fake statistics.
- Computes day-over-day and week-over-week deltas with absolute and percentage shifts.
- Computes time-of-day buckets (Morning, Afternoon, Evening, Night) and day-of-week usage distributions.

#### [NEW] [src/insight-engine.ts](file:///home/santhakumar/Desktop/BUDDY/packages/intelligence-engine/src/insight-engine.ts)
- Generates transparent insights with factual `evidence` arrays.
- Ranks insights by priority (`high`, `medium`, `low`).
- Attaches actionable next steps (`start_focus`, `take_break`, `set_limit`).
- Deterministic generation with zero psychological diagnosis.
- Optional AI formatter interface with strict validation: only passes structured facts, never queries raw browsing history, and blocks hallucinations.

#### [NEW] [src/adaptive-policy-engine.ts](file:///home/santhakumar/Desktop/BUDDY/packages/intelligence-engine/src/adaptive-policy-engine.ts)
- Implements policy decision tree with deterministic priority:
  `Emergency Override > Family Policy > User Explicit Block > Focus Mode > Daily Limit > Smart Break > Suggestion`.
- Records transparent decision audit logs (`PolicyDecisionLog`).
- Manages opt-in adaptive limits: warns user before adjusting limits, never silently changes constraints.

#### [NEW] [src/smart-coach.ts](file:///home/santhakumar/Desktop/BUDDY/packages/intelligence-engine/src/smart-coach.ts)
- Continuous active time tracker for smart breaks.
- Generates break nudges when threshold is crossed with configurable cooldown.
- Scheduled focus session prompter.

#### [NEW] [src/notification-manager.ts](file:///home/santhakumar/Desktop/BUDDY/packages/intelligence-engine/src/notification-manager.ts)
- Anti-spam cooldown manager (per-category and global cooldowns).
- Deduplicates identical message payloads.

#### [NEW] [src/data-pipeline.ts](file:///home/santhakumar/Desktop/BUDDY/packages/intelligence-engine/src/data-pipeline.ts)
- Validates raw events (rejects negative durations, future timestamps, malformed types).
- Deduplicates repeated events.
- Handles data export to structured JSON and full privacy reset.

#### [NEW] [src/index.ts](file:///home/santhakumar/Desktop/BUDDY/packages/intelligence-engine/src/index.ts)
- Exports all engines and helpers.

---

### 3. Storage Layer Updates (`packages/storage`)

#### [MODIFY] [storage-client.ts](file:///home/santhakumar/Desktop/BUDDY/packages/storage/src/storage-client.ts)
- Add default values for `insights`, `patterns`, `adaptiveConfig`, `decisionLogs`, and `smartBreakState`.
- Add helper methods `getInsights()`, `saveInsight()`, `dismissInsight()`, `getPatterns()`, `getAdaptiveConfig()`, `updateAdaptiveConfig()`, `getDecisionLogs()`, `logDecision()`.

---

### 4. Focus Extension Integration (`apps/buddy-focus`)

#### [MODIFY] [entrypoints/background.ts](file:///home/santhakumar/Desktop/BUDDY/apps/buddy-focus/entrypoints/background.ts)
- Wire `PatternDetector`, `TrendEngine`, `InsightEngine`, and `SmartCoach` into the periodic tick and activity event stream.
- Evaluate continuous session duration for smart break suggestions.
- Log enforcement decisions to `decisionLogs`.

---

### 5. Dashboard UI: Insight Center & Smart Summaries (`apps/buddy-dashboard`)

#### [NEW] [src/screens/InsightsScreen.tsx](file:///home/santhakumar/Desktop/BUDDY/apps/buddy-dashboard/src/screens/InsightsScreen.tsx)
- **Today's Insights Carousel / Cards**: Actionable insights with why, what happened, and 1-click action buttons.
- **Behavioral Patterns Card**: Displays detected browsing patterns with factual evidence.
- **Personal Baseline & Trend Comparison**: Compares today against user's 7-day average. Displays "Not enough data yet" when history < 2 days.
- **Time of Day Distribution**: Visualizes Morning, Afternoon, Evening, and Night usage distribution.
- **Policy Decision History**: Expandable audit log showing trigger, policy, action, and explanation.
- **Adaptive Controls**: Toggles for adaptive limits (opt-in), break reminders, continuous activity threshold slider, and quiet hours.

#### [MODIFY] [src/components/Navigation.tsx](file:///home/santhakumar/Desktop/BUDDY/apps/buddy-dashboard/src/components/Navigation.tsx)
- Add `insights` screen (`💡 Insights`) to dashboard navigation.

#### [MODIFY] [src/screens/HomeScreen.tsx](file:///home/santhakumar/Desktop/BUDDY/apps/buddy-dashboard/src/screens/HomeScreen.tsx)
- Add a coaching highlights banner surfacing top insights and smart break reminders.

#### [MODIFY] [src/screens/PrivacyScreen.tsx](file:///home/santhakumar/Desktop/BUDDY/apps/buddy-dashboard/src/screens/PrivacyScreen.tsx)
- Integrate full local data export (JSON download) and complete privacy reset (clearing all stats, insights, and decision logs).

---

### 6. Documentation & Audits

#### [NEW] [docs/phases/PHASE-7-IMPLEMENTATION.md](file:///home/santhakumar/Desktop/BUDDY/docs/phases/PHASE-7-IMPLEMENTATION.md)
#### [NEW] [docs/phases/PHASE-7-TEST-REPORT.md](file:///home/santhakumar/Desktop/BUDDY/docs/phases/PHASE-7-TEST-REPORT.md)
#### [NEW] [docs/phases/PHASE-7-LIMITATIONS.md](file:///home/santhakumar/Desktop/BUDDY/docs/phases/PHASE-7-LIMITATIONS.md)
#### [NEW] [docs/licenses/PHASE-7-LICENSE-REPORT.md](file:///home/santhakumar/Desktop/BUDDY/docs/licenses/PHASE-7-LICENSE-REPORT.md)

---

## Verification Plan

### Automated Tests
1. **Unit Tests (`tests/unit/intelligence/`)**:
   - `pattern-detector.test.ts`
   - `trend-engine.test.ts`
   - `insight-engine.test.ts`
   - `adaptive-policy.test.ts`
   - `smart-coach.test.ts`
   - `data-pipeline.test.ts`
2. **Integration Tests (`tests/integration/intelligence/`)**:
   - `intelligence-flow.test.ts`
3. **Full Regression Suite**:
   - `pnpm test`
   - `pnpm -r run typecheck`
   - `pnpm -r run build`
