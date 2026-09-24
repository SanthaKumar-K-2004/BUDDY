# Phase 7 Open-Source License Report — Buddy Extension Suite

**Generated:** September 2026  
**Status:** AUDITED & COMPLIANT  
**Scope:** `@buddy/intelligence-engine`, `@buddy/shared-types`, `@buddy/storage`, `apps/buddy-focus`, `apps/buddy-dashboard`  

---

## 1. Executive Summary

Phase 7 implements the **Local Intelligence, Adaptive Control & Personal Web Coach Engine**, adding local-first pattern detection, personal baseline analysis, rolling trends, fact-based explainable insights, smart break coaching, and transparent policy adaptation on top of Phase 0–6 systems.

In accordance with the **Open-Source-First, Zero-Cost, and Zero-Invented-Repositories Mandates**:
1. Phase 7 introduces **ZERO external runtime dependencies** into `@buddy/intelligence-engine`. All intelligence algorithms, trend calculations, pattern detections, and policy evaluations are 100% written in modern TypeScript utilizing standard ECMAScript data structures and algorithms.
2. Build and testing infrastructure reuses verified, permissive open-source packages (`typescript`, `vitest`, `wxt`).
3. Core execution runs 100% locally inside the browser extension service worker and dashboard UI with ₹0 hosting, ₹0 cloud database, ₹0 external AI fees, and 0 remote telemetry.

---

## 2. Dependency Audit Table

| Package / Library | Repository / Source | Version | License | Category | Exact Component Reused / Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`@buddy/shared-types`** | Internal Monorepo (`packages/shared-types`) | `0.1.0` | MIT | Runtime | Shared TypeScript contracts (`Insight`, `BehavioralPattern`, `UsageTrend`, `BaselineStats`, `AdaptivePolicyConfig`, `PolicyDecisionLog`, `SmartBreakState`). |
| **`@buddy/storage`** | Internal Monorepo (`packages/storage`) | `0.1.0` | MIT | Runtime | Local-first atomic persistence for insights, patterns, decision logs, and adaptive configuration via `chrome.storage.local`. |
| **`@buddy/activity-engine`** | Internal Monorepo (`packages/activity-engine`) | `0.1.0` | MIT | Runtime | Real activity event generation and cross-site event normalizer feeding the local data pipeline. |
| **`@buddy/focus-engine`** | Internal Monorepo (`packages/focus-engine`) | `0.1.0` | MIT | Runtime | Policy enforcement integration, schedule evaluation, and session management. |
| **`@buddy/shield-core`** | Internal Monorepo (`packages/shield-core`) | `0.1.0` | MIT | Runtime | Privacy and tracker blocking counter integration for fact-based Shield insights. |
| **`@buddy/mood-engine`** | Internal Monorepo (`packages/mood-engine`) | `0.1.0` | MIT | Runtime | Pet mood state and streak updates derived from real focus and break actions. |
| **`typescript`** | `https://github.com/microsoft/TypeScript` | `^5.7.3` | **Apache-2.0** | Build-time | Strict static typing and AST compilation across `@buddy/intelligence-engine`. |
| **`vitest`** | `https://github.com/vitest-dev/vitest` | `^3.2.7` | **MIT** | Test-time | Fast unit, integration, and full regression testing across all 46 test suites. |
| **`wxt`** | `https://github.com/wxt-dev/wxt` | `^0.19.27` | **MIT** | Build-time | Multi-browser extension bundling engine for Chrome MV3. |

---

## 3. License Compliance & Security Verification

1. **100% Permissive Licensing**: All dependencies are licensed under standard permissive open-source licenses (MIT and Apache-2.0).
2. **Zero Restrictive / Copyleft Code**: No GPL, AGPL, LGPL, SSPL, or proprietary commercial licenses exist in Phase 7 modules.
3. **No Fabricated / Invented Dependencies**: Every package in `package.json` maps to an existing, verified open-source package or internal monorepo workspace package.
4. **Zero Remote Telemetry & Network Calls**: Code grep across `@buddy/intelligence-engine` confirms 0 calls to `fetch`, `XMLHttpRequest`, `WebSocket`, or `sendBeacon`.
5. **No AI Vendor Lock-in**: All intelligence analysis operates deterministically with 0 external AI API calls. Any optional AI layer receives only structured fact summaries and is prevented from making enforcement decisions.
