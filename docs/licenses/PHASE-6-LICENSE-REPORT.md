# Phase 6 Open-Source License Report — Buddy Extension Suite

**Generated:** September 2026  
**Status:** AUDITED & COMPLIANT  
**Scope:** `@buddy/site-adapters`, `@buddy/activity-engine`, `@buddy/watch-time`, `@buddy/storage`, `apps/buddy-focus`  

---

## 1. Executive Summary

Phase 6 implements the **Universal Web Activity Intelligence Engine**, unifying cross-site activity tracking, site capability discovery, precision media accounting, and category-level limit enforcement across YouTube, Instagram, Facebook, Spotify, TikTok, Reddit, X, Twitch, and generic web sites.

In strict adherence to the **Open-Source-First, Zero-Cost, and Zero-Invented-Repositories Mandates**, Phase 6 relies exclusively on:
1. Native Web Platform standards (`document.visibilityState`, `HTMLMediaElement`, `MutationObserver`, `History` API, and Web `URL` APIs).
2. Internal modular monorepo packages (`@buddy/shared-types`, `@buddy/site-adapters`, `@buddy/activity-engine`, `@buddy/watch-time`, `@buddy/storage`, `@buddy/focus-engine`).
3. Verified permissive open-source build tooling (`wxt`, `typescript`, `vitest`).

**ZERO external third-party runtime dependencies were added for Phase 6.**

---

## 2. Dependency Audit Table

| Package / Standard | Repository / Source | Version | License | Category | Exact Component Reused / Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **W3C `HTMLMediaElement`** | Native Browser Platform Standard | W3C Standard | Standard | Runtime | Standard media playback events (`play`, `pause`, `ended`, `timeupdate`, `ratechange`), `currentTime`, `duration`, and `playbackRate`. |
| **W3C Page Visibility API** | Native Browser Platform Standard | W3C Standard | Standard | Runtime | `document.visibilityState` and `visibilitychange` for zero-cost active-time validation. |
| **DOM `MutationObserver`** | Native Browser Platform Standard | W3C Standard | Standard | Runtime | Debounced observation of dynamically loaded media and route containers. |
| **`@buddy/shared-types`** | Internal Workspace Package (`packages/shared-types`) | `0.1.0` | MIT | Runtime | Shared TypeScript contracts (`SiteCapabilities`, `ActivityEvent`, `ActivityDetection`, `PlatformCategory`). |
| **`@buddy/watch-time`** | Internal Workspace Package (`packages/watch-time`) | `0.1.0` | MIT | Runtime | Precision active-time state machine with seek detection, playback-rate calculation, and looping media management. |
| **`@buddy/site-adapters`** | Internal Workspace Package (`packages/site-adapters`) | `0.1.0` | MIT | Runtime | Central adapter registry and platform adapters (YouTube, Instagram, Facebook, Spotify, TikTok, Reddit, X, Twitch, Generic). |
| **`@buddy/activity-engine`** | Internal Workspace Package (`packages/activity-engine`) | `0.1.0` | MIT | Runtime | Cross-site activity coordination, inactivity timeouts, URL sanitization, and crash recovery. |
| **`@buddy/storage`** | Internal Workspace Package (`packages/storage`) | `0.1.0` | MIT | Runtime | Atomic local storage aggregation and mathematical reconciliation without external telemetry. |
| **`@buddy/focus-engine`** | Internal Workspace Package (`packages/focus-engine`) | `0.1.0` | MIT | Runtime | Shared cross-site category limit evaluation (`evaluateUniversalLimit`). |
| **`typescript`** | `https://github.com/microsoft/TypeScript` | `^5.7.3` | **Apache-2.0** | Build-time | Strict static typing across all workspace projects. |
| **`vitest`** | `https://github.com/vitest-dev/vitest` | `^3.2.7` | **MIT** | Test-time | Unit, integration, and cross-site regression test suite runner. |
| **`wxt`** | `https://github.com/wxt-dev/wxt` | `^0.19.27` | **MIT** | Build-time | Multi-browser extension bundling engine for Chrome MV3 and Firefox MV3. |

---

## 3. License Compliance & Security Verification

1. **Permissive Licensing**: 100% of workspace dependencies are licensed under permissive MIT or Apache-2.0 licenses.
2. **Zero Copyleft / Restrictive Contamination**: No GPL, AGPL, LGPL, SSPL, or proprietary closed-source code has been introduced.
3. **No Invented Repositories**: Every referenced package maps to verified, publicly accessible packages on npm/GitHub.
4. **Zero Remote Network Telemetry**: Searches for remote analytics (`fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`) in Phase 6 code confirm 0 external network requests.
5. **Zero-Cost Architecture**: Fully private, local-first operation running 100% offline at ₹0 cost.
