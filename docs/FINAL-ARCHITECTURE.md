# Final System Architecture Specification — Buddy Extension Suite

**Generated:** September 2026  
**Audited By:** Principal Extension Architect & Systems Engineering Team  
**Scope:** Complete End-to-End System (Phases 0–10)  
**Status:** PRODUCTION-GRADE ARCHITECTURE  

---

## 1. Global End-to-End Architecture

```text
                                  REAL BROWSER
                         (Tabs, Windows, HTML5 Media)
                                       │
                                       ▼
                             BUDDY EXTENSION SUITE
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       ▼                               ▼                               ▼
CONTENT SCRIPTS               BACKGROUND WORKERS                    UI LAYER
- BaseSiteAdapter             - Focus Orchestrator         - Sidepanel Dashboard
- Platform Adapters           - Shield DNR & Stats         - Extension Popup UI
- Cosmetic Hide Engine        - Family Policy Guard        - Insight Center
       │                               │                               │
       └───────────────────────────────┼───────────────────────────────┘
                                       ▼
                                EVENT PIPELINE
                     (Validation, Sanitization, Deduplication)
                                       │
                                       ▼
                              LOCAL DATA ENGINE
                      (Atomic Storage, Mutex, Retention)
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       ▼                               ▼                               ▼
  SHIELD CORE                     ANALYTICS                      POLICY ENGINE
- DNR Rulesets               - Incremental Aggregator       - 7-Tier Precedence
- Cosmetic Injection         - Platform & Category Stats    - Deterministic Conflict
- Local Block Counters       - Precision Active Watch Time  - Immutable Decision Log
       │                               │                               │
       │                               ▼                               │
       │                      INTELLIGENCE ENGINE                      │
       │                     - Pattern Detection                       │
       │                     - Personal Rolling Baselines              │
       │                     - Explainable Insights                    │
       │                     - Smart Break Coach                       │
       │                               │                               │
       └───────────────────────────────┼───────────────────────────────┘
                                       ▼
                            FOCUS & LIMIT ENFORCEMENT
                          - Category & Platform Limits
                          - Scheduled Focus Modes
                          - Soft Nudges & Hard Overlays
                                       │
                                       ▼
                              DASHBOARD & PET UI
                          - Real-time Analytics Visuals
                          - Virtual Companion Pet & Mood
                          - Streak & Habit Recovery
                                       │
                                       ▼
                                     USER
```

---

## 2. Core Subsystems & Operational Flow

### 2.1 Content Script & Site Adapter Layer
- **Discovery & Resolution**: When a page loads, `AdapterRegistry` matches the URL against supported adapters (YouTube, Instagram, Facebook, Spotify, TikTok, Reddit, X, Twitch) or falls back to `GenericSiteAdapter`.
- **Media State Machine**: Standard `<video>` and `<audio>` elements are tracked via `WatchTimeStateMachine` managing playback, pauses, seeks, playback rate scaling, and loop recycling.
- **Active State Validation**: Media duration only counts when `document.visibilityState === 'visible'` (or audio media explicitly active in background).
- **Safe Dynamic Intervention**: Distraction elements (e.g. Shorts, Reels, recommendations) are hidden via scoped `<style>` tags. Limit warnings use safe DOM elements without `innerHTML`.

### 2.2 Event Pipeline & Validation Layer
- Incoming events pass through `LocalDataPipeline.validateEvent()`.
- Unreasonable timestamps, negative durations, future dates, or malformed payloads are rejected.
- Composite key deduplication (`site:tabId:timestamp`) prevents double-counting caused by rapid DOM events.

### 2.3 Storage & Persistence Engine (`@buddy/storage`)
- Local-first architecture running on `chrome.storage.local`.
- **Atomic Mutex**: `AsyncKeyLock` prevents write race conditions across multiple simultaneous tabs.
- **Schema Migrations**: `runMigrations()` ensures seamless transitions between schema versions without data loss.
- **Automatic Pruning**: Daily maintenance job prunes records older than 90 days, keeping storage footprint under 500 KB.

### 2.4 Intelligence & Coaching Engine (`@buddy/intelligence-engine`)
- **Pattern Detection**: Detects rapid reopens (≤ 3 min), frequent site switching (≤ 5 min sliding window), long sessions (≥ 45 min), high short-form velocity, and late-night sessions.
- **Rolling Baselines**: Computes 7-day, 14-day, and 30-day personal averages. Strictly suppresses trends when fewer than 2 days of data exist.
- **Fact-Based Insights**: Synthesizes actionable, explainable insights with evidence arrays. Strictly forbids medical or psychological diagnosis.
- **Smart Coach**: Monitors continuous active browsing, recognizes natural idle pauses (≥ 5 min), and provides gentle, non-forced break prompts.

### 2.5 Policy & Deterministic Hierarchy (`@buddy/focus-engine` & `AdaptivePolicyEngine`)
When multiple policies apply, conflict is resolved using a strict 7-tier deterministic hierarchy:
1. **Emergency Override** (`emergency_override`)
2. **Family & Parental Policy** (`family_policy`)
3. **User Explicit Block** (`user_block`)
4. **Focus Mode** (`focus_mode`)
5. **Daily / Category Limit** (`daily_limit`)
6. **Smart Break Prompt** (`smart_break`)
7. **Neutral Suggestion** (`suggestion`)

Adaptive limit adjustments require explicit user opt-in (`isAdaptiveLimitsEnabled: true`) and are never applied silently. Every decision is recorded in an immutable local audit log.
