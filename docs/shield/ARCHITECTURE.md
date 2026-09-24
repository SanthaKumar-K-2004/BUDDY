# Buddy Shield Core: Runtime Architecture

## 1. System Overview

Buddy Shield is a local-first, privacy-preserving, high-performance browser extension layer providing global ad, tracker, and scriptlet protection. Built upon the validated Declarative Net Request (DNR) rulesets generated in Phase 1, Shield Core unites network-level interception with content-layer cosmetic element hiding.

The core philosophy of Buddy Shield is **Open-Source Composition**: rather than reinventing adblock parsers or filter engines, Shield composes mature open-source software and native browser APIs:

```text
                                  ┌──────────────────────────┐
                                  │      User / Browser      │
                                  └─────────────┬────────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │     Buddy Shield      │
                                    └───────────┬───────────┘
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
        ┌─────────────────────────────┐                   ┌─────────────────────────────┐
        │   Network Filtering Layer   │                   │    Cosmetic Filter Layer    │
        │   Browser Native DNR Engine │                   │ @ghostery/adblocker-content │
        └──────────────┬──────────────┘                   └──────────────┬──────────────┘
                       │                                                 │
                       │             ┌──────────────────────┐            │
                       └────────────►│  Shield Orchestrator │◄───────────┘
                                     │    (ShieldEngine)    │
                                     └──────────┬───────────┘
                                                │
                       ┌────────────────────────┼────────────────────────┐
                       ▼                        ▼                        ▼
        ┌─────────────────────────────┐  ┌──────────────┐  ┌─────────────────────────────┐
        │     Site Policy Engine      │  │ Stats Engine │  │      Lightweight Popup      │
        │    (@buddy/shield-policy)   │  │(@buddy/stats)│  │     (Preact + WXT MV3)      │
        └──────────────┬──────────────┘  └──────┬───────┘  └─────────────────────────────┘
                       │                        │
                       └────────────────────────┼────────────────────────┐
                                                ▼                        ▼
                                     ┌──────────────────────┐ ┌────────────────────────┐
                                     │  Typed Local Storage │ │ Enterprise Managed     │
                                     │   (@buddy/storage)   │ │ Policy (storage.managed│
                                     └──────────────────────┘ └────────────────────────┘
```

---

## 2. Package Architecture & Decomposition

Buddy Shield Core is modularized across dedicated workspace packages:

| Package | Workspace | Role | Key Export |
| :--- | :--- | :--- | :--- |
| **`@buddy/shield-dnr`** | `packages/shield-dnr` | Browser DNR ruleset management, dynamic rules, browser capability abstraction | `DNRRulesetManager`, `ChromeBlockingRuntime`, `MemoryBlockingRuntime` |
| **`@buddy/shield-cosmetic`** | `packages/shield-cosmetic` | Content script cosmetic DOM hiding, extended CSS selectors, SPA navigation | `CosmeticEngine` |
| **`@buddy/shield-policy`** | `packages/shield-policy` | Domain canonicalization, per-site pause/resume, whitelist, enterprise overrides | `PolicyEngine` |
| **`@buddy/shield-stats`** | `packages/shield-stats` | In-memory block event buffering, privacy sanitization, daily storage rollups | `StatsEngine` |
| **`@buddy/shield-core`** | `packages/shield-core` | Master orchestrator coordinating all layers, typed message validation | `ShieldEngine`, `isShieldMessage` |
| **`buddy-shield`** | `apps/buddy-shield` | WXT-powered browser extension (background service worker, content script, popup) | Extension artifacts for Chrome & Firefox MV3 |

---

## 3. Communication & Message Flow

All communication between extension contexts (Content Script ↔ Background Service Worker ↔ Popup UI) is validated at runtime using strictly typed message schemas (`packages/shield-core/src/messages.ts`):

```text
[Content Script] ────► GET_SHIELD_STATUS (hostname) ────► [Background / ShieldEngine]
                 ◄──── { isProtected, ... }         ◄────
[Content Script] ────► GET_COSMETIC_RULES (hostname)───► [Background / ShieldEngine]
                 ◄──── { rules: [...] }             ◄────
[Content Script] ────► REPORT_BLOCK_EVENT (count)  ────► [Background / StatsEngine]

[Popup UI]       ────► GET_SHIELD_STATUS (activeTab)───► [Background / ShieldEngine]
                 ◄──── ShieldStatus                 ◄────
[Popup UI]       ────► PAUSE_SITE / RESUME_SITE    ────► [Background / Policy & DNR]
                 ◄──── Updated ShieldStatus         ◄────
[Popup UI]       ────► TOGGLE_GLOBAL_SHIELD        ────► [Background / ShieldEngine]
```

Any message with an unknown `type`, missing mandatory string properties, or non-boolean flags is rejected immediately without execution, preventing malicious page scripts from poisoning internal extension state.
