# Buddy Extension Suite — Master Engineering Phase Plan & Architectural Split (Enterprise Edition v3.0)

**Document Version:** 3.0.0-PROD  
**Target Platform:** Chromium MV3 (Chrome, Edge, Brave, Opera) & Firefox MV3  
**Status:** Approved & Definitive Reference  
**Project Workspace:** `/home/santhakumar/Desktop/BUDDY`  

---

## Executive Overview & Architectural Rationale

This document defines the **granularity-level phase plan**, the **exhaustive tool inventory**, and the **proper architectural, package, license, and runtime split** for the Buddy Extension Suite.

### The Four Pillars of the "Proper Split"
1. **Single-Purpose Split (Store Survival):** Rather than bundling ad-blocking, YouTube stripping, adult filtering, and gamification into a single high-risk extension that triggers Chrome Web Store rejections (Single Purpose Policy 2026 revision), the suite is split into **four focused consumer extensions** + **one unified enterprise bundle**.
2. **License Quarantine Split (Legal Safety):** Build-time conversion tools licensed under GPLv3 (`@adguard/dnr-converter`, `@adguard/filters-downloader`) and reference pattern modules (`ImprovedTube`) are isolated into isolated build scripts that generate raw declarative JSON data. Zero GPLv3 code is shipped in runtime binaries, preserving the proprietary and commercial status of Buddy's core code.
3. **Runtime Context Split (Performance & Security):** Heavy ML runs strictly in an `offscreen document` (LiteRT.js with WebGPU/XNNPACK), cosmetic ad-blocking runs in `content scripts` via WASM (`adblock-rs`), network blocking is handled natively by the browser kernel (`declarativeNetRequest`), YouTube ad-marker patching runs in `world: "MAIN"`, and administrative locks operate via `storage.managed`.
4. **Monorepo Split (Engineering Velocity):** Standardized under `pnpm workspaces` and `Turborepo` with isolated shared libraries (`shared-types`, `mood-engine`, `i18n`, `ui-components`, `license-client`).

---

## 1. Architectural & Package Split ("Split Properly")

```
                                    ┌────────────────────────────────────────────────────────┐
                                    │               Google Workspace Admin /                 │
                                    │                  IT Policy Controller                  │
                                    └──────────────────────────┬─────────────────────────────┘
                                                               │ storage.managed
                                                               ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                                           BUDDY EXTENSION SUITE                                             │
 │                                                                                                             │
 │  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐ │
 │  │     Buddy Shield      │  │      Buddy Focus      │  │     Buddy Family      │  │    Buddy Dashboard    │ │
 │  │   (Ad/Tracker Block)  │  │   (YouTube Distract)  │  │   (Content Safety)    │  │     (Pet & Stats)     │ │
 │  └──────────┬────────────┘  └──────────┬────────────┘  └──────────┬────────────┘  └───────────▲───────────┘ │
 │             │                          │                          │                           │             │
 │             │                          │                          │                           │             │
 │             └──────────────────────────┴──────────────────────────┴───────────────────────────┘             │
 │                                          chrome.runtime.sendMessage                                         │
 │                                       (externally_connectable bus)                                          │
 └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                               │
                                                               ▼
                                              ┌─────────────────────────────────┐
                                              │      Buddy Backend & Cloud      │
                                              │  (Supabase + Cloudflare Edge)   │
                                              └─────────────────────────────────┘
```

### 1.1 Applications Breakdown (`apps/`)

| App Directory | Output Target | Store Listing | Core Responsibility | Runtime Model |
|---|---|---|---|---|
| `apps/buddy-shield` | Chrome/Firefox Ext | "Buddy Shield: Ad & Tracker Blocker" | Ad, tracker, and malware network/cosmetic blocking | Background Service Worker + DNR rulesets + Content Script (WASM cosmetic) |
| `apps/buddy-focus` | Chrome/Firefox Ext | "Buddy Focus: Distraction-Free YouTube" | Shorts removal, feed cleaner, doomscroll limiter, ad-defeat | Content Scripts (`world: "ISOLATED"` + `world: "MAIN"`) + Background timer alarms |
| `apps/buddy-family` | Chrome/Firefox Ext | "Buddy Family: Safe Web & Content Shield" | On-device adult image blur, safe search, domain blocker, parental PIN | Background SW + Content Script (DOM scanner) + Offscreen Document (LiteRT.js) |
| `apps/buddy-dashboard` | Chrome/Firefox Ext | "Buddy Dashboard: Productivity Pet & Habits" | Pet mood engine, gamified streaks, habit reports, account, Stripe sync | Popup / Side Panel (Preact) + Background listener service |
| `apps/buddy-business` | Enterprise CRX/Zip | Enterprise Force-Install Bundle (Google Admin) | Wraps Shield + Focus (+ Family opt-in) with locked `storage.managed` | Single administrative package deployed via Chrome Management Console |
| `apps/buddy-web` | Web Application | `https://buddyextension.com` | Landing page, documentation, subscription management, enterprise portal | Vite SPA + Cloudflare Pages + Supabase Auth |

---

### 1.2 Shared Packages Breakdown (`packages/`)

```
packages/
├── shared-types/            # Canonical TypeScript interfaces, event envelopes, schemas
├── mood-engine/             # Pure math & logic: mood calculation, decay algorithms, streaks
├── i18n/                    # Localization catalogs: en, ta (Tamil), ar (Arabic RTL)
├── ui-components/           # Preact component library: buttons, toggles, cards, pet view
├── filter-pipeline/         # BUILD-TIME ONLY: Filter downloader, DNR converter (GPL quarantined)
├── cosmetic-engine/         # adblock-rs WASM wrapper for DOM element hiding
├── nsfw-engine/             # LiteRT.js wrapper, model management, image tensor transformations
└── license-client/          # Supabase client, Stripe customer status, Cloudflare Workers JWT verifier
```

#### Detailed Package Specifications:
1. **`@buddy/shared-types`**:
   - Holds the global event protocol (`MOOD_EVENT`, `BLOCK_EVENT`, `FOCUS_ALERT`, `POLICY_UPDATE`).
   - Declares the `BuddyManagedPolicy` schema matching Chrome Enterprise configuration schemas.
   - Zero runtime dependencies.
2. **`@buddy/mood-engine`**:
   - Deterministic behavioral state machine.
   - Calculates score from 0 to 100 based on positive and negative stimulus events.
   - Enforces the **decay rate** (-1 point per hour of inactivity during daytime) and **anti-gaming daily ceiling** (+20 recovery max/day).
   - Sleep mode computation based on local time or scheduled quiet hours.
3. **`@buddy/i18n`**:
   - JSON dictionaries with strict type checking.
   - Includes full RTL (Right-to-Left) layout support for Arabic (`ar`) and Unicode support for Tamil (`ta`).
4. **`@buddy/ui-components`**:
   - Ultra-lightweight components built on **Preact** and standard CSS tokens.
   - Theme engine supporting High-Contrast Dark Mode, Modern Glassmorphism, and Family Kid Mode.
5. **`@buddy/filter-pipeline` (GPLv3 Quarantined)**:
   - Contains CLI scripts executed in GitHub Actions or developer environments.
   - Ingests upstream blocklists (EasyList, EasyPrivacy, Peter Lowe, uBO filters).
   - Executes `@adguard/dnr-converter` to output pure declarative JSON files (`ruleset_1.json`, etc.).
   - Shuts down at build time; never bundled into extension runtime artifacts.
6. **`@buddy/cosmetic-engine`**:
   - Bundles `adblock-rs` compiled to WASM.
   - Receives page URLs and DOM selectors, querying the WASM engine for matching CSS injection rules.
   - Executes scriptlets inside the page safely.
7. **`@buddy/nsfw-engine`**:
   - Standardizes the Offscreen Document bridge.
   - Handles `OffscreenCanvas` image data processing, resizing to 224x224 tensors, and passing buffers to LiteRT.js.
   - Returns classification scores: `{ drawing, hentai, neutral, porn, sexy }`.
8. **`@buddy/license-client`**:
   - Communicates with Cloudflare Workers edge endpoints to validate cryptographic license tokens.
   - Synchronizes Pro/Family status with Supabase via anonymous RLS sessions.

---

### 1.3 License Quarantine Boundary

```
 ┌───────────────────────────────────────────────────────────┐
 │                   BUILD-TIME PIPELINE                     │
 │                 (Quarantined - GPLv3)                     │
 │                                                           │
 │   EasyList / uBO Raw Text                                 │
 │              │                                            │
 │              ▼                                            │
 │   @adguard/filters-downloader                             │
 │              │                                            │
 │              ▼                                            │
 │   @adguard/dnr-converter  ──────► Generates pure data:    │
 └──────────────────────────────────────┬────────────────────┘
                                        │ (Static DNR Ruleset JSON)
                                        │ ZERO GPL CODE TRANSFERRED
                                        ▼
 ┌───────────────────────────────────────────────────────────┐
 │                   RUNTIME EXTENSIONS                      │
 │          (Proprietary / Permissive MPL-2.0 / MIT)         │
 │                                                           │
 │   ├── chrome.declarativeNetRequest (Browser Native)       │
 │   ├── adblock-rs WASM (MPL-2.0, Brave)                   │
 │   ├── LiteRT.js & MobileNet (Apache-2.0 / MIT, Google)    │
 │   ├── Preact & Chart.js (MIT)                             │
 │   └── Buddy Proprietary Code (Commercial Closed Source)   │
 └───────────────────────────────────────────────────────────┘
```

---

## 2. Complete Tools & Technologies Inventory

### 2.1 Core Frameworks & Build Tools

| Tool / Library | Exact Package / Version | Role in Suite | Justification & Alternative Evaluation | License |
|---|---|---|---|---|
| **WXT** | `wxt@^0.19.x` | Next-gen Web Extension Framework | Auto-generates Chrome MV3 / Firefox MV3 manifests, handles file-based routing, instant HMR, native multi-browser builds. Beats Plasmo (slower updates) and raw Vite configs. | MIT |
| **pnpm** | `pnpm@^9.x` | Monorepo Package Manager | Strict dependency isolation prevents phantom dependencies; content-addressable storage saves gigabytes of disk. Beats npm/yarn. | MIT |
| **Turborepo** | `turbo@^2.x` | Monorepo Build Orchestration | High-speed pipeline execution with remote caching; parallelizes builds across all 4 extensions and 8 packages. | MIT |
| **TypeScript** | `typescript@^5.5.x` | Language & Type Safety | Enforces strict typing (`strict: true`, `noUncheckedIndexedAccess`) across inter-extension messaging and enterprise schemas. | Apache-2.0 |
| **Vite** | Integrated via WXT | Bundler / Transpiler | Sub-millisecond HMR during extension development, tree-shaking, Rollup-based production minification. | MIT |

### 2.2 Runtime Engines & Core Dependencies

| Tool / Library | Exact Package / Version | Role in Suite | Justification & Alternative Evaluation | License |
|---|---|---|---|---|
| **adblock-rs** | `adblock-rs@^0.13.x` (WASM) | Cosmetic & live matching engine | Brave's battle-tested engine. Handles uBO-style cosmetic filtering, procedural selectors (`:has()`, `:xpath()`), and scriptlets. Native Rust compiled to WASM. | MPL-2.0 |
| **LiteRT.js** | `@litertjs/core` / `@litertjs/web` | Browser ML inference engine | Google's official successor to TFLite for Web. Leverages WebGPU, WebNN, and XNNPACK CPU WASM. 2-5x faster than legacy TensorFlow.js with 70% smaller bundle size. | Apache-2.0 |
| **Preact** | `preact@^10.x` | Extension Popup & Sidepanel UI | 3KB runtime footprint vs React's 45KB. Critical for instantaneous popup opening (<50ms). Full JSX compatibility. | MIT |
| **Chart.js** | `chart.js@^4.x` | Analytics & Streak Visuals | Standard, rock-solid, tree-shakeable canvas charting. Used strictly in Buddy Dashboard for productivity and mood graphs. | MIT |
| **i18next** | `i18next@^23.x` | Internationalization Engine | Handles pluralization, context, and dynamic RTL stylesheet switching for English, Tamil, and Arabic. | MIT |

### 2.3 Build-Time Processors (GPL Quarantined)

| Tool / Library | Exact Package / Version | Role in Suite | Justification & Alternative Evaluation | License |
|---|---|---|---|---|
| **@adguard/dnr-converter** | `@adguard/dnr-converter@^1.x` | Adblock rules to DNR converter | Extracted from AdGuard's battle-tested converter. Automatically handles priority calculation, regex conversion, CSP transformations, and header rules. | GPLv3 |
| **@adguard/filters-downloader** | `@adguard/filters-downloader@^1.x` | Filter list preprocessor | Recursively resolves `!#include` and `!#if` directives in EasyList and uBO filter rules. | LGPLv3 |

### 2.4 Cloud, Edge & Infrastructure

| Tool / Platform | Service Role | Configuration & Sizing | Justification & Alternative Evaluation |
|---|---|---|---|
| **Supabase** | Primary Auth, Database & RLS | Free tier at launch → Pro ($25/mo) at 10k users | Built-in PostgreSQL, Row Level Security (RLS) ensures zero data leakage, automatic JWT issuance. Beats custom backend. |
| **Cloudflare Workers** | Edge License Verification & Telemetry Proxy | Free tier (100k req/day) → Paid ($5/mo) | <15ms response globally. Validates cryptographic license signatures without touching the primary database on every browser request. |
| **Cloudflare R2** | Dynamic Filter & Model Distribution | Zero egress fee object storage | Stores compiled `.tflite` models and hourly hot-patch rules for YouTube and adblock filters. |
| **Stripe** | Subscription Billing Engine | Stripe Checkout + Customer Portal | PCI-compliant recurring billing for Pro ($2.99/mo) and Family ($5.99/mo) tiers. |
| **Upptime** | Automated Status Page & SLA Monitor | GitHub Actions + GitHub Pages | 100% free open-source uptime monitoring with public incident reporting. |
| **Sentry** | Crash & Error Reporting | Free tier (5k events/mo) | Telemetry on background service worker exceptions and content script crashes without logging any user PII. |

### 2.5 Quality Assurance & Testing Tools

| Tool / Framework | Exact Package / Version | Role in Testing |
|---|---|---|
| **Vitest** | `vitest@^2.x` | Blazing-fast unit testing for mood engine, filter converters, and crypto utilities. |
| **WXT Fake Browser** | `wxt/testing` | In-memory mock of `chrome.*` and `browser.*` APIs (storage, runtime, alarms, DNR). |
| **Playwright** | `@playwright/test@^1.46.x` | End-to-end multi-browser test harness. Launches real headless Chromium and Firefox with unpacked extensions. |

---

## 3. Comprehensive Phase-by-Phase Execution Plan

```
Timeline: 14-16 Weeks to Full Enterprise Launch
====================================================================================================
Phase 0: Monorepo Foundation & Tooling Architecture                       [Week 1]
Phase 1: Filter Ingestion & DNR Compilation Pipeline                      [Week 2]
Phase 2: Buddy Shield Core (Chromium MV3 + Firefox MV3)                   [Weeks 3-4]
Phase 3: Buddy Focus Core (YouTube DOM & Ad-Marker Hooking)               [Weeks 5-6]
Phase 4: Buddy Dashboard & Pet Behavioral Mood Engine                     [Weeks 7-8]
Phase 5: Buddy Family Core (LiteRT.js Offscreen AI Content Filter)        [Weeks 9-10]
Phase 6: Enterprise Management Layer (storage.managed & Intune/Google)    [Week 11]
Phase 7: Internationalization (Tamil/Arabic RTL) & Design Polish          [Week 12]
Phase 8: Security Audits, COPPA Verification & Store Submissions          [Weeks 13-14]
====================================================================================================
```

---

### Phase 0: Monorepo Foundation & Tooling Architecture (Week 1)

#### Objectives:
Establish a clean, scalable monorepo using `pnpm` workspaces and `Turborepo`. Configure `WXT` extension entry points for all four extensions, establish shared TypeScript packages, and configure automated GitHub Actions linting and type-checking.

#### Milestones & Tasks:
- [x] **Task 0.1: Monorepo Initialization**
  - Initialize root `package.json` with `pnpm-workspace.yaml` and `turbo.json`.
  - Configure root `tsconfig.json` with strict mode, composite project references, and path aliases.
- [x] **Task 0.2: Shared Packages Scaffolding**
  - Scaffold `packages/shared-types`: Export interfaces for cross-extension events, telemetry, storage keys, and mood states.
  - Scaffold `packages/mood-engine`: Setup core testable math algorithms for pet state.
  - Scaffold `packages/ui-components`: Setup Preact + standard CSS tokens.
  - Scaffold `packages/i18n`: Setup type-safe translations structure.
- [x] **Task 0.3: WXT Extension Projects Scaffolding**
  - Initialize `apps/buddy-shield` with WXT (configured for Chrome and Firefox targets).
  - Initialize `apps/buddy-focus` with WXT.
  - Initialize `apps/buddy-family` with WXT.
  - Initialize `apps/buddy-dashboard` with WXT.
  - Initialize `apps/buddy-web` with Vite (React/Preact landing page).
- [x] **Task 0.4: Cross-Extension Communication Protocols**
  - Configure `manifest.json` templates with `externally_connectable` keys referencing the respective extension IDs.
  - Write strongly-typed communication wrappers in `packages/shared-types`.
- [x] **Task 0.5: CI Foundation**
  - Setup `.github/workflows/ci.yml` running `pnpm install`, `pnpm lint`, `pnpm typecheck`, and `pnpm test`.

#### Tools Used in Phase 0:
- `pnpm@9.x`, `turbo@2.x`, `typescript@5.5.x`, `wxt@0.19.x`, `vitest@2.x`, `biome` (or `eslint` + `prettier`).

#### Deliverables & Exit Criteria:
- Clean `pnpm install` and `pnpm turbo build` completes with zero TypeScript errors across all 5 apps and shared packages.
- CI pipeline green on GitHub Actions.

---

### Phase 1: Filter Ingestion & DNR Compilation Pipeline (Week 2)

#### Objectives:
Build the automated build-time pipeline that fetches upstream filter lists, cleans directives, converts them into Chrome MV3 `declarativeNetRequest` static rulesets using `@adguard/dnr-converter`, and validates them against Chromium's 30,000 static rule ceiling.

#### Milestones & Tasks:
- [x] **Task 1.1: Quarantined Filter Pipeline Scaffolding (`packages/filter-pipeline`)**
  - Isolate build scripts in dedicated package with explicit GPLv3 notice.
  - Integrate `@adguard/filters-downloader` to fetch:
    - EasyList Standard
    - EasyPrivacy Tracker List
    - Peter Lowe's Ad and Tracking Server List
    - uBlock Origin Annoyances / Filters
- [x] **Task 1.2: DNR Converter Integration**
  - Script conversion using `@adguard/dnr-converter`:
    - Generate static DNR JSON rulesets split by category (`ads.json`, `trackers.json`, `annoyances.json`).
    - Enforce rule limit optimization: rule deduplication, priority allocation, regex validation.
  - Verify static rule count strictly stays under the 30,000 static rules limit per ruleset, with aggregate within Chrome limits.
- [x] **Task 1.3: Cosmetic Rules & Scriptlet Compilation**
  - Extract CSS cosmetic hiding selectors (`##.ad-banner`, etc.) into a compressed binary/JSON format for `adblock-rs`.
  - Bundle standard uBO scriptlets (`abort-on-property-read`, `set-local-storage-item`, etc.).
- [x] **Task 1.4: Scheduled GitHub Actions Filter Updater**
  - Create `.github/workflows/filter-update.yml` to run weekly, compiling fresh DNR rules and publishing versioned artifacts to Cloudflare R2 / extension asset folders.

#### Tools Used in Phase 1:
- `@adguard/filters-downloader`, `@adguard/dnr-converter`, `ts-node`, Node.js `fs/promises`.

#### Deliverables & Exit Criteria:
- Automated command `pnpm --filter @buddy/filter-pipeline run compile` generates valid `ruleset_ads.json` and `ruleset_trackers.json` in `apps/buddy-shield/public/rulesets/`.
- Generated rules pass `chrome.declarativeNetRequest.getAvailableStaticRuleCount()` simulation in tests.

---

### Phase 2: Buddy Shield Core (Chromium MV3 + Firefox MV3) (Weeks 3-4)

#### Objectives:
Implement the complete ad and tracker blocking engine. Deliver high-performance static DNR network blocking on Chrome, live WASM matching on Firefox, runtime cosmetic element hiding via `adblock-rs`, per-site toggle controls, and block event dispatching.

#### Milestones & Tasks:
- [x] **Task 2.1: Background Service Worker & DNR Ruleset Management**
  - Register static rulesets in `apps/buddy-shield/wxt.config.ts`.
  - Implement dynamic DNR rule manager:
    - Support user-defined custom block/allow rules (up to 5,000 dynamic rules).
    - Implement per-site pause/unpause toggles using dynamic rule conditions (`excludedInitiatorDomains`).
- [x] **Task 2.2: adblock-rs WASM Cosmetic Filtering Engine**
  - Compile/package `adblock-rs` WASM binary into `packages/cosmetic-engine`.
  - Implement Content Script:
    - Query WASM engine with current tab hostname to retrieve active cosmetic selectors.
    - Inject high-performance CSS stylesheet into DOM (`document.documentElement`).
    - Implement `MutationObserver` for dynamic procedural selectors (e.g. `:has-text()`, `iframe` ad slots).
- [x] **Task 2.3: Firefox MV3 Compatibility Layer**
  - Build Firefox-specific background adapter utilizing `browser.webRequest.blocking` with `adblock-rs` as the active matcher, maintaining identical UX across browsers.
- [x] **Task 2.4: Block Counter & Mood Event Bridge**
  - Calculate session-blocked metrics.
  - Dispatch asynchronous `MOOD_EVENT` envelopes to Buddy Dashboard via `chrome.runtime.sendMessage`.
- [x] **Task 2.5: Preact Popup UI**
  - Build sleek popup: master toggle switch, per-site whitelist toggle, block counters (Ads, Trackers, Social), and current pet status preview.

#### Tools Used in Phase 2:
- `wxt`, `adblock-rs` (WASM), `preact`, `lucide-preact`, Vitest testing harness.

#### Deliverables & Exit Criteria:
- Shield successfully loads unpacked in Chrome and Firefox.
- Blocks 99%+ of ad networks on standard test sites (e.g., `d3ward/adblock-benchmark`).
- Dispatches event `{ type: 'MOOD_EVENT', source: 'shield', action: 'AD_BLOCKED' }` reliably.

---

### Phase 3: Buddy Focus Core (YouTube DOM & Ad-Marker Hooking) (Weeks 5-6)

#### Objectives:
Create the ultimate distraction removal and ad-defeat tool for YouTube. Eliminates YouTube Shorts, hides the home feed recommendations, strips sidebar clutter, hooks player network markers in `world: "MAIN"`, and tracks doomscroll velocity.

#### Milestones & Tasks:
- [x] **Task 3.1: YouTube Cosmetic Distraction Stripper (Isolated World Content Script)**
  - Implement ultra-fast CSS injection for YouTube DOM nodes:
    - Shorts navigation tabs (`ytd-guide-entry-renderer[aria-label="Shorts"]`, etc.).
    - Shorts video carousels and shelves (`ytd-rich-shelf-renderer[is-shorts]`).
    - Recommended home video grid (`ytd-browse[page-subtype="home"] #contents`).
    - End-screen video recommendations and comment sections.
  - Setup responsive `MutationObserver` handling dynamic SPA navigation (`yt-navigate-finish` events).
- [x] **Task 3.2: YouTube Ad-Marker Hooking Engine (`world: "MAIN"` Content Script)**
  - Inject isolated script directly into YouTube's execution context:
    - Intercept `window.fetch` and `XMLHttpRequest`.
    - Filter out video ad payloads (`/youtubei/v1/player` adPlacements, adSlots, and playerAds objects).
    - Bypass anti-adblock detection dialogs (`ytd-enforcement-message-view-model`).
  - Strict security isolation: zero external scripts evaluated; all hook logic strictly deterministic.
- [x] **Task 3.3: Session Time Tracking & Doomscroll Velocity Engine**
  - Track active time spent in YouTube tabs using `chrome.idle` and window focus listeners.
  - Implement doomscroll detector: calculate scroll velocity and video switching frequency.
  - Trigger "Take a Break" gentle interventions when doomscroll threshold is breached.
- [x] **Task 3.4: Remote Hot-Patchable Selector Architecture**
  - Pull hot-patch CSS selectors from Cloudflare R2 every 24 hours to rapidly fix YouTube DOM structure changes without waiting for store reviews.
- [x] **Task 3.5: Preact Popup UI for Focus**
  - Granular toggles: "Hide Shorts", "Hide Comments", "Clean Home Feed", "Disable Autoplay", "Break Timer (15/30/45 min)".

#### Tools Used in Phase 3:
- `wxt`, `preact`, Chrome `world: "MAIN"` scripting, Cloudflare R2 client.

#### Deliverables & Exit Criteria:
- YouTube loads cleanly without Shorts or distracting feeds.
- Video playback runs ad-free without triggering YouTube's anti-adblock warning banner.
- Doomscroll velocity triggers a negative mood event dispatched to Buddy Dashboard.

---

### Phase 4: Behavioral Pet Engine & Buddy Dashboard (Weeks 7-8)

#### Objectives:
Develop the centerpiece consumer engagement feature: the behavioral pet whose mood, animation, and growth directly reflect the user's browsing health. Integrate Supabase Auth, Stripe Pro tier, and Chart.js productivity reporting.

#### Milestones & Tasks:
- [x] **Task 4.1: Mathematical Mood Engine (`packages/mood-engine`)**
  - Implement the core algorithm:
    - Initial baseline: 50/100 (Neutral).
    - Positive weights: `+2` for ad-free work session, `+5` for maintaining focus limits, `+10` for consecutive daily streak.
    - Negative weights: `-8` for doomscrolling, `-5` for session overtime, `-15` for broken streak.
    - Natural decay: `-1` point per hour of inactivity during active hours (8 AM - 10 PM).
    - Daily recovery cap: max `+20` points per 24 hours to prevent artificial gaming.
- [x] **Task 4.2: Pet Visual States & Animation System**
  - Create responsive Canvas/CSS sprite render engine:
    - 5 Core States: Ecstatic (81-100), Happy (61-80), Neutral (41-60), Worried (21-40), Sad (0-20).
    - Sleep State: Automatic between 10 PM and 7 AM or during quiet hours.
    - Micro-animations: Blink, bounce, celebration confetti on milestone, worried shake on doomscroll.
- [x] **Task 4.3: Central Event Bus Listener (Buddy Dashboard Background SW)**
  - Implement `chrome.runtime.onMessageExternal` receiver.
  - Authenticate sender IDs matching `buddy-shield`, `buddy-focus`, and `buddy-family`.
  - Process signals in real-time, write to `chrome.storage.local`, and trigger notification alerts.
- [x] **Task 4.4: Analytics & Visualization (Chart.js 4.x)**
  - Daily & weekly mood trend line chart.
  - Ads blocked vs time saved comparison bar chart.
  - Focus streaks counter with "Streak Freeze" mechanic.
- [x] **Task 4.5: Supabase Auth & Stripe Pro Subscription Integration**
  - Supabase client integration in `packages/license-client`.
  - Email magic link and Google OAuth sign-in.
  - Stripe Customer Portal redirect for subscription management ($2.99/mo Pro tier).
  - Cloudflare Workers edge verification validating cryptographic license tokens.

#### Tools Used in Phase 4:
- `preact`, `chart.js@4.x`, `@buddy/mood-engine`, `@supabase/supabase-js`, Cloudflare Workers.

#### Deliverables & Exit Criteria:
- Opening Buddy Dashboard displays interactive animated pet.
- Blocking ads in Shield or doomscrolling in Focus immediately updates pet mood in real-time.
- Stripe test mode subscription unlocks Pro cosmetic accessories and cloud sync.

---

### Phase 5: Buddy Family Core (LiteRT.js Offscreen AI Content Filter) (Weeks 9-10)

#### Objectives:
Implement privacy-preserving, on-device adult content filtering. Utilizes Google's LiteRT.js in an Offscreen Document with a quantized MobileNet-v2 NSFW `.tflite` model, paired with a SHA-256 parental PIN and strict COPPA 2026 compliance.

#### Milestones & Tasks:
- [x] **Task 5.1: Offscreen Document Architecture (`apps/buddy-family`)**
  - Configure `chrome.offscreen.createDocument` with `AUDIO_PLAYBACK` / `WORKERS` justification.
  - Initialize LiteRT.js runtime (`@litertjs/core`) with WebGPU acceleration (fallback to XNNPACK CPU WASM).
  - Load quantized MobileNet-v2 NSFW model (~4.8MB `.tflite` format) directly from extension package.
- [x] **Task 5.2: Content Script Image Screening Pipeline**
  - Set up `IntersectionObserver` to only inspect images entering the viewport larger than 100x100px.
  - Extract image pixels to an in-memory `OffscreenCanvas`, resize to 224x224 RGB buffer.
  - Dispatch buffer to offscreen document via `chrome.runtime.sendMessage`.
  - Apply immediate CSS `backdrop-filter: blur(25px)` on elements flagged above the configurable threshold (Standard: 0.70, Strict: 0.50).
- [x] **Task 5.3: Domain Blocklist & Safe Search Enforcement**
  - Static DNR ruleset blocking known adult domains (curated from Steven Black hosts list).
  - Inject safe search query parameters for Google (`safe=active`), Bing (`adlt=strict`), and DuckDuckGo (`kp=1`).
- [x] **Task 5.4: Parental Controls & Bedtime Lock**
  - SHA-256 hashed parental PIN stored in `chrome.storage.local`.
  - Bedtime schedule lock: disables browsing or blurs screen after designated curfew using `chrome.alarms`.
- [x] **Task 5.5: COPPA 2026 Audit Implementation**
  - Enforce strict zero-PII data collection: no browsing history or image urls ever recorded.
  - Implement age gate on initial setup.

#### Tools Used in Phase 5:
- `wxt`, `@litertjs/core`, `@litertjs/web`, Quantized MobileNet-v2 TFLite model, SHA-256 crypto.

#### Deliverables & Exit Criteria:
- NSFW test images are automatically blurred within <120ms on modern hardware via WebGPU.
- Settings locked behind parental PIN.
- Zero external network requests made during classification.

---

### Phase 6: Enterprise Management Layer (Buddy for Business) (Week 11)

#### Objectives:
Build the enterprise tier allowing seamless force-installation and policy enforcement across thousands of managed workstations via Google Workspace Admin and Microsoft Intune with zero end-user intervention.

#### Milestones & Tasks:
- [x] **Task 6.1: Chrome Enterprise `storage.managed` Schema Definition**
  - Write `apps/buddy-business/public/managed-schema.json`:
    - Define admin controls: enforce ad-blocking, enforce YouTube Shorts removal, lock parental/content filters, set maximum YouTube session duration.
  - Implement runtime schema validator in `@buddy/shared-types`.
- [x] **Task 6.2: Enterprise Policy Resolution Layer**
  - Extension checks `chrome.storage.managed` on initialization and on `chrome.storage.onChanged`.
  - If managed policy exists, UI elements become disabled ("Managed by your organization" badge), preventing user overrides.
- [x] **Task 6.3: Privacy-Preserving Aggregate Reporting**
  - Anonymous, opt-in telemetry exporter: pushes daily aggregated team focus hours and average wellness score to corporate dashboard.
  - Absolute privacy guarantee: individual browsing URLs and timestamps are cryptographically omitted at the client level.
- [x] **Task 6.4: Audit Log Exporter**
  - In-browser CSV report generator for IT compliance reviews.

#### Tools Used in Phase 6:
- Chrome `storage.managed` API, Google Admin Console test tenant, CSV generation utilities.

#### Deliverables & Exit Criteria:
- Loading sample JSON into Chrome managed policies locks settings instantly across all extensions.
- CSV audit log exports cleanly with aggregated team focus metrics.

---

### Phase 7: Internationalization, Accessibility & Design Polish (Week 12)

#### Objectives:
Ensure enterprise-grade visual aesthetics, full localization in English, Tamil, and Arabic (with complete RTL mirroring), keyboard accessibility, and a polished design system.

#### Milestones & Tasks:
- [x] **Task 7.1: Multilingual Localization (`packages/i18n`)**
  - Implement translation catalogs:
    - English (`en`) - Default
    - Tamil (`ta`) - Complete localized copy for South Indian & diaspora markets
    - Arabic (`ar`) - Complete localized copy for UAE/Middle East markets
  - RTL Dynamic Style Engine: Automatically flips layout margins, padding, chevron icons, and flex directions when `ar` locale is active.
- [x] **Task 7.2: Enterprise Design System Polish (`packages/ui-components`)**
  - Implement modern glassmorphism tokens, dark mode palette, smooth micro-interactions, and accessible typography (Outfit / Inter).
  - Add celebratory particle micro-animations for pet milestones.
- [x] **Task 7.3: Accessibility (WCAG 2.1 AA / a11y Audit)**
  - Full keyboard navigation support (logical tab order, focus rings).
  - ARIA attributes (`role="switch"`, `aria-checked`, `aria-live` announcements for pet mood changes).
  - Contrast ratios exceeding 4.5:1 across all color schemes.

#### Tools Used in Phase 7:
- `i18next`, CSS Custom Properties, Chrome DevTools Lighthouse / Axe.

#### Deliverables & Exit Criteria:
- Switching between English, Tamil, and Arabic renders instantly without layout breakage.
- Lighthouse Accessibility score of 100/100 on popup and side panel surfaces.

---

### Phase 8: Comprehensive Testing, Security Audits & Store Submission (Weeks 13-14)

#### Objectives:
Execute full automated and manual testing, perform independent security and GPL license boundary reviews, verify COPPA 2026 legal compliance, generate production store assets, and submit extensions for Chrome Web Store and Firefox Add-ons publication.

#### Milestones & Tasks:
- [x] **Task 8.1: Vitest Unit & Integration Test Suite**
  - 100% test coverage for `@buddy/mood-engine`.
  - Test suite for filter-pipeline DNR conversion.
  - Test suite for `storage.managed` fallback logic.
- [x] **Task 8.2: Playwright Multi-Browser End-to-End Testing**
  - Run headless Chrome and Firefox tests with unpacked extensions:
    - Test ad blocking on sample ad-heavy pages.
    - Test YouTube DOM hiding and SPA navigation.
    - Test NSFW offscreen image blurring pipeline.
    - Test cross-extension messaging bus (`externally_connectable`).
- [x] **Task 8.3: Security, GPL & COPPA Final Compliance Audits**
  - Verify zero GPLv3 code in runtime production bundles.
  - Verify zero PII transmission to Supabase/Cloudflare.
  - Final review of privacy policy and Google Workspace installation instructions.
- [x] **Task 8.4: Store Packaging & Automated Deployment**
  - Configure `chrome-webstore-upload-cli` in `.github/workflows/release.yml`.
  - Create promotional screenshots, icons (16/48/128px), and descriptive single-purpose listings for each extension.
  - Submit Buddy Shield, Buddy Focus, Buddy Family, and Buddy Dashboard to Chrome Web Store and Mozilla Add-ons.

#### Tools Used in Phase 8:
- `playwright`, `vitest`, `chrome-webstore-upload-cli`, `web-ext`.

#### Deliverables & Exit Criteria:
- All test suites passing in CI (100% green).
- Packaged `.zip` files ready for store upload, meeting all store policy guidelines.

---

## 4. Verification & Testing Matrix

```
┌─────────────────────────┬───────────────────────────────┬───────────────────────────────┐
│ Layer                   │ Testing Tool                  │ Verification Objective        │
├─────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Mood Math & Logic       │ Vitest                        │ State transitions, caps, decay│
│ DNR Filter Generation   │ Custom Pipeline Runner        │ Validate <30k rule limits     │
│ Cross-Extension Comms   │ WXT Fake Browser Mock         │ Typed event envelope delivery │
│ YouTube Distraction DOM │ Playwright (Chromium)         │ Verify Shorts & ads removed   │
│ On-Device NSFW ML       │ Playwright + WebGPU Headless  │ Blur applied <150ms           │
│ Enterprise Policies     │ Chrome Policy Simulator       │ Verify storage.managed lock   │
│ Store Compliance        │ CWS Pre-flight Linter         │ Single-purpose manifest check │
└─────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

---

## 5. Summary of Final Architectural Commands

```bash
# 1. Monorepo execution
pnpm install                     # Install all dependencies across all packages
pnpm turbo build                 # Build all packages & extension apps in dependency order
pnpm turbo test                  # Run unit & integration tests across monorepo

# 2. Compiling ad-blocking rulesets (Build-time quarantined)
pnpm --filter @buddy/filter-pipeline run compile

# 3. Running development servers with HMR
pnpm --filter buddy-shield dev   # Chrome target with live reload
pnpm --filter buddy-focus dev    # YouTube focus extension dev server
pnpm --filter buddy-dashboard dev# Dashboard & Pet sidepanel dev server
pnpm --filter buddy-family dev   # Family & AI filter dev server

# 4. Packaging for release
pnpm turbo build:zip             # Output store-ready zip files in .output/
```

This plan constitutes the definitive, enterprise-grade build blueprint for the Buddy Extension Suite.
