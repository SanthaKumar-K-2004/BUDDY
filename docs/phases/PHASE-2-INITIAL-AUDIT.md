# Phase 2 Initial Audit: Buddy Shield Core

**Date:** September 2026  
**Auditor:** Principal Browser Extension & Ad-Blocking Engineer  
**Status:** COMPLETE — READY FOR IMPLEMENTATION

---

## 1. Executive Summary

Phase 1 (Filter Ingestion) successfully created a deterministic, reproducible, local-first filter pipeline that converts upstream filter lists into Chromium and Firefox MV3 compatible Declarative Net Request (DNR) rulesets (`ruleset_ads.json` and `ruleset_trackers.json`). The pipeline passed all 96 unit, integration, and reproducibility tests with zero failures.

Phase 2 builds the **Buddy Shield Core** runtime engine. Rather than reinventing filtering algorithms from scratch, Phase 2 follows the **Open-Source Composition Model**:
1. **Network Filtering:** Browser-native `declarativeNetRequest` (DNR) consuming Phase 1 generated rulesets.
2. **Cosmetic Filtering:** `@ghostery/adblocker` and `@ghostery/adblocker-content` (MPL-2.0) providing extended CSS selector evaluation and DOM element hiding without GPL contamination.
3. **Policy & Orchestration:** Buddy-specific site policy, per-site pause/resume, event aggregation, and lightweight Preact popup UI.

---

## 2. Phase 1 Artifacts Audit

Inspection of `data/generated/` and `apps/buddy-shield/public/rulesets/`:
* `ruleset_ads.json`: 23 rules, 4,365 bytes. Valid MV3 DNR syntax with actions (`block`), conditions (`urlFilter`, `resourceTypes`), and deterministic sequential IDs.
* `ruleset_trackers.json`: 14 rules, 2,844 bytes. Valid MV3 DNR syntax.
* `filter-manifest.json`: Fully typed metadata with rule counts, SHA-256 hashes, and tool versions.
* `filter-licenses.json`: Complete upstream licensing ledger.
* `filter-report.json`: Engineering statistics covering validation and conversion.

**Verification:** All generated rulesets are pre-installed in `apps/buddy-shield/public/rulesets/` and registered in `apps/buddy-shield/wxt.config.ts`.

---

## 3. Technology & Open-Source Evaluation

| Candidate | Role | License | Decision | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Browser native DNR** | Network Blocking | Browser Native | **ACCEPTED** | Zero CPU overhead, MV3 compliant, runs natively in browser network stack. |
| **@adguard/dnr-converter** | Filter conversion | GPL-3.0 | **QUARANTINED** | Strictly build-time in `packages/filter-pipeline`. Prohibited from entering extension runtime. |
| **@adguard/extended-css** | Extended CSS selector engine | GPL-3.0 | **REJECTED** | Fails license review (GPL-3.0). Bundling in runtime would contaminate extension. |
| **adblock-rs (Node)** | Adblock engine | MPL-2.0 | **EVALUATED** | Native Rust Node.js addon (`index.node`), does not provide browser WASM bundle on npm. |
| **@ghostery/adblocker-content** | Cosmetic DOM element hiding | MPL-2.0 | **ACCEPTED** | Battle-tested, zero GPL code, lightweight TypeScript content script helper with extended selector support. |
| **@ghostery/adblocker** | Rule parser & engine | MPL-2.0 | **ACCEPTED** | Pure TS/JS, parses cosmetic rules, handles element hiding style generation. |
| **Preact** | Popup UI | MIT | **ACCEPTED** | Ultra-lightweight (~3KB) reactive UI already integrated into WXT. |
| **WXT** | Extension Framework | MIT | **ACCEPTED** | Powers MV3 builds for both Chromium and Firefox. |

---

## 4. License Boundary & Quarantine Verification

The Buddy architecture strictly enforces:
```text
BUILD TIME
    ↓
GPL-3.0 conversion tooling (@adguard/dnr-converter) [Quarantined in packages/filter-pipeline]
    ↓
GENERATED DATA
    ↓
declarative JSON rulesets (ruleset_ads.json, ruleset_trackers.json)
    ↓
EXTENSION RUNTIME
    ↓
DNR (Native) + Cosmetic Engine (@ghostery/adblocker-content, MPL-2.0) + Preact (MIT)
```
**Conclusion:** Zero GPL code is present in runtime dependencies. Runtime bundles are 100% compliant with MIT, Apache-2.0, and MPL-2.0 licenses.

---

## 5. Architectural Design & Package Plan

To ensure clean isolation and separation of concerns:

1. **`packages/shield-policy`**:
   - Manages global enable/disable and per-site pause/resume policies.
   - Domain canonicalization (handling subdomains, `www.`, ports).
   - Local persistence via `@buddy/storage`.
   - Managed Enterprise Policy integration (`storage.managed`).

2. **`packages/shield-stats`**:
   - Privacy-first block event aggregation.
   - In-memory event buffering with batched storage flushing (preventing excessive disk I/O).
   - Daily rollups per category (`ad`, `tracker`, `cosmetic`, `malware`).
   - Zero retention of exact URLs, query parameters, or personal browsing history.

3. **`packages/shield-dnr`**:
   - DeclarativeNetRequest manager.
   - Cross-browser abstraction (`BlockingRuntime` interface for Chromium and Firefox).
   - Dynamic ruleset enablement/disablement and ruleset partitioning.
   - Browser rule limits validation (static rule limit, regex rule limit).

4. **`packages/shield-cosmetic`**:
   - Content script cosmetic filtering bridge using `@ghostery/adblocker-content`.
   - Injects hiding stylesheets and evaluates extended selectors.
   - SPA navigation handling (`popstate`, history changes) without re-instantiation.
   - MutationObserver DOM monitoring with debounced updates.

5. **`packages/shield-core`**:
   - Master `ShieldEngine` orchestrating DNR, Cosmetic, Policy, Stats, and Storage.
   - Background service worker messaging bridge with strict schema validation.
   - Clean handoff contracts for Phase 3 (Buddy Focus).

6. **`apps/buddy-shield`**:
   - Background service worker: lifecycle, DNR sync, alarm-based stats flushing.
   - Content script: cosmetic hiding bridge, DOM monitor.
   - Popup UI: Preact-based status display, blocked counters, per-site pause toggle, protection switch.

---

## 6. Risks & Mitigation Plan

1. **Service Worker Suspension**:
   - *Risk:* Chrome MV3 service workers can terminate when idle, losing in-memory statistics buffers.
   - *Mitigation:* Flush in-memory stats to `chrome.storage.local` on alarms (`chrome.alarms`), on popup query, and on `beforeunload` / lifecycle hooks.
2. **Excessive Storage Writes**:
   - *Risk:* Writing to storage on every blocked network request degrades browser performance.
   - *Mitigation:* Debounced in-memory aggregator flushes periodically (e.g. every 30 seconds or on page unload).
3. **Firefox MV3 DNR Variations**:
   - *Risk:* Firefox handles certain DNR rule actions or resource types with slight differences compared to Chromium.
   - *Mitigation:* Isolated browser abstraction layer; automated dual builds (`build:chrome` and `build:firefox`).
4. **Untrusted Page Content**:
   - *Risk:* Hostile websites attempting prototype pollution or spoofing message events.
   - *Mitigation:* Strictly validated message schemas with runtime type guards, origin checks, and sanitized selector injection.
