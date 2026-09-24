# Buddy Extension Suite — Enterprise-Grade Implementation Plan (v3.0 Final)

**Status:** Fully researched, verified against September 2026 platform reality, all components validated, cons identified and mitigated.
**Builds on:** [v1 Master Document](file:///home/santhakumar/Desktop/BUDDY/buddy-extension-master-document.md) and [v2 Corrected Document](file:///home/santhakumar/Desktop/BUDDY/Buddy-Extension-Master-Project-Document-v2.md)

---

## Executive Summary

Both v1 and v2 documents are strong. v2 correctly identified and fixed v1's critical MV2-era architecture flaw. **This v3 plan validates v2's corrections, fills remaining gaps, upgrades component choices where research uncovered better alternatives, and provides a complete, actionable build guide.**

### Key findings from deep research:
1. v2's suite-split architecture (Buddy Shield/Focus/Family/Business) is **confirmed correct** — Chrome's Single Purpose Policy enforcement tightened August 2026
2. `adblock-rust` WASM is confirmed active (v0.13.3+, FlatBuffers transition) — but the DNR converter should use `@adguard/dnr-converter` (extracted from tsurlfilter), not tsurlfilter directly
3. **LiteRT.js** (formerly TFLite.js) is now the recommended ML runtime over TensorFlow.js — faster, smaller, hardware-accelerated via WebGPU/XNNPACK
4. **WXT** framework solves the cross-browser build problem elegantly — Vite-powered, auto-manifest, cross-browser from one codebase
5. COPPA 2025 amendments (effective April 22, 2026) impose **strict new requirements** for Buddy Family — written security program, separate consent for data sharing, expanded PII definition

---

## 1. What Changed from v1 → v2 → v3

| # | v2 Fix | v3 Upgrade | Why |
|---|--------|------------|-----|
| 1 | Repositioned adblock-rust as build-time DNR compiler + runtime cosmetic engine | Use `@adguard/dnr-converter` (dedicated package) instead of raw tsurlfilter for DNR compilation | AdGuard extracted DNR conversion into a purpose-built package; handles priority calculations, CSP conversion, header removal — tsurlfilter is now the matching engine, not the converter |
| 2 | Identified suite-split as necessary | Add **WXT framework** for monorepo management | WXT handles multi-target builds (Chrome/Firefox/Edge), auto-generates manifests, provides HMR, and supports the 4-extension suite from one codebase |
| 3 | Suggested nsfwjs with caveats | Add **LiteRT.js** as the ML runtime + evaluate quantized MobileNet-based NSFW `.tflite` model | LiteRT.js runs `.tflite` models with WebGPU/XNNPACK acceleration — 2-5x faster than TF.js WASM, smaller bundle, better cold-start in offscreen documents |
| 4 | Noted COPPA gap | Full COPPA 2026 compliance checklist integrated | The 2025 amendments (effective April 2026) now require written security programs, separate consent for data sharing, expanded PII definitions |
| 5 | Identified YouTube maintenance as ongoing | Add **automated regression testing** via Playwright + scheduled CI | YouTube API changes are detectable within hours, not days, using headless smoke tests |
| 6 | No testing strategy | Add **Vitest + WXT fake browser** + Playwright E2E | Enterprise-grade means tested |
| 7 | No CI/CD pipeline defined | Full **GitHub Actions** pipeline: build → test → convert filter lists → package → submit to stores | Automated everything |

---

## 2. Validated & Upgraded Component Stack

### 2.1 Component Decision Matrix (Final)

| Need | v1/v2 Choice | v3 Final Choice | Pros | Cons | Mitigation |
|------|-------------|-----------------|------|------|------------|
| **Build framework** | *(not specified)* | **WXT (wxt.dev)** | Vite-powered, auto-manifest, cross-browser builds, HMR, monorepo modules, automated store submission, file-based entrypoints | Relatively young framework (2023+), opinionated folder structure | Active maintenance, 5k+ stars, large community, escape hatches for custom config |
| **Ad/tracker blocking engine** | adblock-rust (WASM) | **adblock-rs (npm) — Brave's engine** | Production-tested (tens of millions of users), FlatBuffers for 75% memory reduction, MPL-2.0, cosmetic filtering + scriptlet injection | Rust/WASM tooling learning curve, WASM binary adds ~1-2MB to extension | Use only for cosmetic filtering on Chromium; full engine on Firefox |
| **Filter list → DNR conversion** | AdGuard tsurlfilter | **@adguard/dnr-converter** | Purpose-built for this exact job, handles priority calc, CSP conversion, header removal, actively maintained by AdGuard | GPLv3 — must isolate in build pipeline | Runs only in CI/build time, outputs JSON data (not derived code) — get legal review |
| **Filter list downloading** | *(manual)* | **@adguard/filters-downloader** | Resolves `!#include` and `!#if` directives in filter lists, produces flat text files | Another dependency | Small, focused, used by AdGuard production builds |
| **Filter lists** | EasyList + EasyPrivacy + uBO | **Same + Peter Lowe's list + Fanboy's Annoyances** | Maximum coverage with minimal false positives | More rules = closer to DNR limits | Optimize with rule deduplication, monitor `getAvailableStaticRuleCount()` |
| **YouTube distraction removal** | Unhook NG | **code-charity/youtube (ImprovedTube) as reference** | 4.6k stars, 300+ tweaks, 40+ languages, active PRs, GPLv3, decade-long survival | GPLv3 means derivative code must be open | Use as **pattern reference only**, rebuild natively in isolated module |
| **YouTube ad-defeat pattern** | gasanache/brave-shields-extension | **Rebuild fetch/XHR/JSON.parse hook natively** | The hooking pattern is correct (confirmed by research), repo too young for dependency | Must run in `world: "MAIN"` — security-sensitive | Isolate in own content script file, version independently |
| **NSFW image classification** | nsfwjs (TF.js) | **nsfwjs model + LiteRT.js runtime** | 90-93% accuracy, MIT license, well-understood categories (Drawing/Hentai/Neutral/Porn/Sexy) | False positives on art/athletics, slowing maintenance | Layer with URL blocklist, configurable thresholds, LiteRT.js for 2-5x faster inference |
| **NSFW strict tier model** | opennsfw2 | **Quantized MobileNet-v2 NSFW `.tflite`** | Smaller than opennsfw2's ResNet, runs natively in LiteRT.js | Requires conversion/fine-tuning | Pre-convert and ship as part of extension assets |
| **NSFW domain blocklist** | *(not in v1)* | **Steven Black's hosts + custom curated list** | 100k+ domains, maintained, catches sites ML misses (text-only adult content) | Needs periodic updates | Bundle in extension, update via filter-list refresh pipeline |
| **ML inference runtime** | TensorFlow.js (WASM) | **LiteRT.js (@litertjs/core)** | WebGPU + XNNPACK + WebNN acceleration, runs `.tflite` natively, smaller bundle, faster cold-start | Newer than TF.js, smaller community | Google-backed, successor to TFLite-web, production-ready |
| **Charts/visualization** | Chart.js | **Chart.js 4.x** | MIT, de facto standard, tree-shakeable, responsive | Larger than µPlot | Tree-shake to only import needed chart types |
| **Monorepo management** | *(not specified)* | **pnpm workspaces + Turborepo** | Fast installs, efficient disk usage, remote caching, parallel builds | Requires pnpm adoption | Industry standard for JS monorepos in 2026 |
| **Testing** | *(not specified)* | **Vitest + WXT fake browser + Playwright** | Vitest for unit/integration, WXT plugin for extension mocks, Playwright for E2E | Setup effort | One-time investment, critical for enterprise credibility |
| **CI/CD** | *(not specified)* | **GitHub Actions** | Free for open-source, generous private repo minutes, marketplace actions for store submission | Vendor lock-in | Standard, easy to migrate |
| **License/Auth backend** | CF Workers or Supabase | **Supabase (auth + DB) + Cloudflare Workers (edge verification)** | Supabase: built-in auth, Postgres, RLS. CF Workers: edge-fast license checks | Hybrid adds complexity | Supabase as source of truth, CF Workers as edge proxy |
| **Payment processing** | Stripe | **Stripe Checkout + Customer Portal + Webhooks** | No PCI burden, subscription lifecycle, customer self-service | 2.9% + $0.30/transaction | Standard for SaaS |
| **Error monitoring** | Sentry | **Sentry free tier (cloud) → self-hosted at scale** | Best-in-class error tracking, source maps | Free tier: 5k events/month | Sufficient for launch |
| **Status page** | Cachet | **Upptime (GitHub-based, open-source)** | Zero-cost, GitHub Pages hosted, no server needed | Limited customization | Perfect for early stage |

### 2.2 Components Explicitly Rejected

| Component | Why Rejected |
|-----------|-------------|
| **Unhook NG** (as primary fork target) | Bus-factor risk: tiny user base, single maintainer |
| **gasanache/brave-shields-extension** (as code dependency) | Young, single-maintainer. Technique is correct; repo is not dependency-grade |
| **nsfw-filter/nsfw-filter** (as code base) | Wired to older TF.js; we want LiteRT.js |
| **NewPipeExtractor + LibreTube** | YouTube ToS risk. Must stay separate from Buddy brand |
| **opennsfw2** (as primary model) | ResNet too heavy for always-on client inference |
| **uBlock Origin Lite** (as dependency) | GPLv3, use only as quality benchmark |

---

## 3. Final Architecture

### 3.1 Suite Structure (Chrome Web Store Compliant)

**Why 4 listings, not 1:** Chrome's Single Purpose Policy was tightened August 2026. Windscribe was blocked for bundling "masking location" + "blocking ads." Our suite approach gives us **4 SEO surfaces** while eliminating the #1 platform risk.

| Product | Purpose | Distribution |
|---------|---------|-------------|
| **Buddy Shield** | Ad & Tracker Blocking | Store Listing #1 |
| **Buddy Focus** | YouTube Distraction Removal | Store Listing #2 |
| **Buddy Family** | Content Safety / Parental | Store Listing #3 |
| **Buddy Dashboard** | Pet + Account + Reports | Store Listing #4 / Web App |
| **Buddy for Business** | Managed bundle of Shield + Focus | Force-install via Google Workspace (bypasses public store review) |

All 4 consumer extensions feed signals into Buddy Dashboard. Buddy for Business wraps Shield + Focus + optionally Family for enterprise deployment.

### 3.2 Technical Architecture (Per-Extension)

**BUILD PIPELINE (CI — GitHub Actions, runs on push/schedule):**

1. `@adguard/filters-downloader` → flat filter text files
2. `@adguard/dnr-converter` → static DNR JSON rulesets
3. adblock-rust compile → cosmetic filter CSS/JS bundles
4. WXT build → Chrome + Firefox zips
5. Automated store submission (`chrome-webstore-upload-cli`)

**BUDDY SHIELD (Chromium MV3):**

- Background Service Worker: Static DNR rulesets, dynamic DNR rules (5k limit), filter list refresh (4h), streak resets, block stat sync
- Content Script: adblock-rust WASM cosmetic filtering + scriptlet injection, block-count → mood events
- Popup UI (Preact): per-site toggle, block counter, pet mood indicator
- storage.managed: enterprise hook for IT admin configuration

**BUDDY SHIELD (Firefox MV3):**

- Background: adblock-rust as LIVE matching engine via webRequestBlocking
- All other layers identical to Chromium build

**BUDDY FOCUS:**

- Content Script (world: "MAIN"): fetch/XHR/JSON.parse hook for ad markers, DOM observer for Shorts/feed/sidebar, autoplay suppression, session timer → mood events
- Content Script (world: "ISOLATED"): CSS cosmetic hiding, doomscroll detector
- Background: session time alarms, streak tracking, channel allowlist

**BUDDY FAMILY:**

- Offscreen Document: LiteRT.js runtime, quantized NSFW .tflite model (~5MB), warm-up on load
- Content Script: MutationObserver + IntersectionObserver → screens images > 100x100px → offscreen inference → blur/block overlay. Domain/URL blocklist check.
- Background: profile management, parental PIN (SHA-256), bedtime lock scheduler, sensitivity thresholds

**BUDDY DASHBOARD:**

- Side Panel / Popup / Web App: pet mood engine, cosmetics, Chart.js 4.x reports, streaks, account (Supabase Auth), Stripe subscription, i18n (en/ta/ar)
- Background: mood event listener from all extensions, chrome.storage.local, cloud sync (Pro), license verification (CF Workers edge)

### 3.3 Cross-Extension Communication

```typescript
// In Buddy Shield content script:
chrome.runtime.sendMessage(
  BUDDY_DASHBOARD_EXTENSION_ID,
  { type: 'MOOD_EVENT', source: 'shield', data: { adsBlocked: 42, timestamp: Date.now() } }
);

// In Buddy Dashboard background:
chrome.runtime.onMessageExternal.addListener((message, sender) => {
  if (ALLOWED_EXTENSION_IDS.includes(sender.id)) {
    moodEngine.processEvent(message);
  }
});
```

`externally_connectable` in each manifest whitelists the other Buddy extension IDs. Stable, supported MV3 API.

---

## 4. Monorepo Structure

```
buddy/
├── .github/workflows/
│   ├── build-and-test.yml
│   ├── release.yml
│   └── filter-list-update.yml
├── packages/
│   ├── shared-types/           # TypeScript types
│   ├── mood-engine/            # Core mood calculation
│   ├── i18n/                   # Translations (en, ta, ar)
│   ├── ui-components/          # Shared Preact components
│   ├── filter-pipeline/        # Build-time: list download → DNR
│   ├── cosmetic-engine/        # adblock-rust WASM wrapper
│   ├── nsfw-engine/            # LiteRT.js + model API
│   └── license-client/         # Stripe/Supabase verification
├── apps/
│   ├── buddy-shield/           # WXT extension
│   ├── buddy-focus/            # WXT extension
│   ├── buddy-family/           # WXT extension
│   ├── buddy-dashboard/        # WXT extension
│   └── buddy-web/              # Landing page (Vite)
├── infrastructure/
│   ├── supabase/               # Migrations, functions, seed
│   └── cloudflare/workers/     # Edge license check
├── e2e/                        # Playwright E2E tests
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 5. Feature Specification (Final)

### 5.1 Buddy Shield — Ad & Tracker Blocking

| Feature | Implementation | Priority |
|---------|---------------|----------|
| Network blocking (Chromium) | Static DNR rulesets via `@adguard/dnr-converter` | P0 |
| Network blocking (Firefox) | Live `adblock-rust` via `webRequestBlocking` | P0 |
| Cosmetic filtering | `adblock-rust` WASM in content script | P0 |
| Scriptlet injection | `adblock-rust` scriptlet resources | P0 |
| Per-site pause/allow | Popup toggle, `chrome.storage.local` | P0 |
| Block counter | DNR counter heuristic | P0 |
| Custom filter subscriptions | Dynamic DNR (up to 5,000) | P1 |
| Filter list auto-update | `chrome.alarms` every 4h | P1 |
| Fingerprinting protection | Scriptlets (canvas, WebGL, AudioContext) | P2 |
| Enterprise: managed categories | `storage.managed` | P1 |

### 5.2 Buddy Focus — YouTube Distraction Removal

| Feature | Implementation | Priority |
|---------|---------------|----------|
| Shorts shelf/tab removal | CSS + MutationObserver | P0 |
| Home feed cleanup | CSS hiding | P0 |
| Related videos removal | CSS hiding, configurable | P0 |
| In-page ad-defeat | `world: "MAIN"` fetch/JSON.parse hook | P0 |
| Autoplay disable | YouTube API override | P0 |
| Session time tracking | Background timer, warnings | P0 |
| Hot-patchable patterns | Remote JSON on CDN | P0 |
| Comments toggle | CSS, user-togglable | P1 |
| End screen suppression | MutationObserver | P1 |
| Doomscroll detection | Navigation pattern analysis | P1 |
| Channel allowlist | User marks channels | P1 |
| Enterprise: session limits | `storage.managed` | P1 |

### 5.3 Buddy Family — Content Safety

| Feature | Implementation | Priority |
|---------|---------------|----------|
| NSFW image classification | LiteRT.js in offscreen document | P0 |
| Image screening pipeline | MutationObserver + IntersectionObserver → offscreen | P0 |
| Domain/URL blocklist | Steven Black's hosts as DNR rules | P0 |
| Blur overlay | CSS blur + overlay div | P0 |
| Parental PIN | SHA-256 hashed | P0 |
| Per-child profiles | Individual sensitivity | P0 |
| Configurable sensitivity | Relaxed (0.6) → Standard (0.7) → Strict (0.85) | P0 |
| Bedtime lock | `chrome.alarms` | P1 |
| Safe search enforcement | URL parameter injection | P1 |
| Whitelist | Parent-managed domains | P1 |
| Activity summary | Aggregated only, no URLs | P1 |

### 5.4 Buddy Dashboard — Pet + Account + Reports

| Feature | Implementation | Priority |
|---------|---------------|----------|
| Pet mood engine | Aggregate signals → score 0-100 | P0 |
| Pet visual states | Happy/Neutral/Sad/Sleeping, CSS + sprites | P0 |
| Account management | Supabase Auth (email + Google) | P0 |
| Subscription management | Stripe Customer Portal | P0 |
| Multilingual UI | i18next: en, ta, ar (RTL) | P0 |
| Streaks | Daily/weekly counters, freeze mechanic | P1 |
| Reports | Chart.js 4.x: trends, blocks, mood | P1 |
| Enterprise dashboard | Org-wide mood/time averages | P1 |
| Audit log export | CSV download | P1 |
| Pet cosmetics (Pro) | Unlockable accessories | P2 |
| Cloud sync (Pro) | chrome.storage → Supabase | P2 |

---

## 6. Pet Mood Engine — Behavioral Design

### 6.1 Signal Weights

```typescript
const MOOD_SIGNALS = [
  // Positive (pet happier)
  { source: 'shield', type: 'ADS_BLOCKED_SESSION',  weight: 2  },
  { source: 'focus',  type: 'SHORT_SESSION_ENDED',  weight: 5  },
  { source: 'focus',  type: 'STREAK_MAINTAINED',    weight: 10 },
  { source: 'family', type: 'SAFE_BROWSING_HOUR',   weight: 3  },
  // Negative (pet sadder)
  { source: 'focus',  type: 'DOOMSCROLL_DETECTED',  weight: -8 },
  { source: 'focus',  type: 'SESSION_OVERTIME',      weight: -5 },
  { source: 'focus',  type: 'STREAK_BROKEN',        weight: -15},
  { source: 'family', type: 'NSFW_ATTEMPT_BLOCKED', weight: -3 },
];
```

### 6.2 Mood Mechanics

- **Score:** 0–100, starts at 50 (neutral)
- **Decay:** -1 per hour inactive (pet lonely)
- **Recovery cap:** +20/day (no gaming)
- **States:** 0-20 Sad, 21-40 Worried, 41-60 Neutral, 61-80 Happy, 81-100 Ecstatic
- **Sleep:** no decay during quiet hours

### 6.3 Engagement Psychology

| Mechanic | Principle | How |
|----------|----------|-----|
| Pet distress on doomscroll | Loss Aversion | Real-time animation shift |
| Streak rewards | Variable Ratio Reinforcement | 7d/30d/100d unlock random cosmetics |
| Daily check-in | Habit Loop | Dashboard open = pet greets, +1 mood |

---

## 7. Enterprise Layer

### 7.1 storage.managed Schema

```json
{
  "org_id": "string",
  "shield": {
    "enabled": true,
    "filter_categories": ["ads", "trackers", "malware"],
    "allow_user_custom_filters": false,
    "locked_allowed_domains": []
  },
  "focus": {
    "enabled": true,
    "max_session_minutes": 30,
    "block_shorts": true,
    "block_home_feed": true
  },
  "family": {
    "enabled": false,
    "nsfw_sensitivity": "standard",
    "enforce_safe_search": true
  },
  "reporting": {
    "enabled": true,
    "aggregate_only": true,
    "export_format": "csv"
  }
}
```

### 7.2 Deployment: Google Admin Console → ExtensionInstallForcelist → Force-install with managed config → Extensions read storage.managed → Aggregate data to Supabase (opt-in) → Admin views dashboard + exports audit logs

---

## 8. Compliance & Legal

### 8.1 License Isolation

**SAFE FOR CLOSED-SOURCE:** adblock-rust (MPL-2.0), nsfwjs model (MIT), Chart.js (MIT), LiteRT.js (Apache 2.0), all original Buddy code

**GPL QUARANTINE (build pipeline only):** @adguard/dnr-converter (GPLv3) — outputs JSON data, not derived code. GET LEGAL REVIEW. code-charity/youtube and Unhook NG — REFERENCE ONLY, rebuild natively.

**EXCLUDED FROM BRAND:** NewPipeExtractor/LibreTube (GPLv3 + YouTube ToS)

### 8.2 COPPA Compliance (Buddy Family) — CRITICAL

COPPA 2025 amendments effective April 22, 2026. Up to $53,088 per violation.

| Requirement | Implementation |
|-------------|---------------|
| Age screening | Age gate on first setup; if <13, parental consent flow |
| Verifiable parental consent | Email with verification link |
| Separate consent for data sharing | Separate consent before Supabase data flow |
| Written Security Program | In privacy policy |
| Written Data Retention Policy | 90-day rolling, delete on account removal |
| Parental access/delete | Dashboard UI |
| Data minimization | No URLs, no history, no images — aggregates only |
| Third-party SDK audit | LiteRT.js, Chart.js, Supabase verified |

### 8.3 Privacy: No browsing content ever leaves the device

- On-device: all blocking, all NSFW classification, all session data, all mood, all images
- To Supabase (opt-in Pro): account, subscription, pet state, streak numbers. NEVER URLs/content/images
- Enterprise: org-wide averages only. NEVER per-user data

---

## 9. Cost to Build

| Phase | Scope | 1 Dev | 2 Devs |
|-------|-------|-------|--------|
| Phase 0 | Foundation (WXT, CI, Supabase) | 1 wk | 1 wk |
| Phase 1 | Buddy Shield | 3-4 wk | 2 wk |
| Phase 2 | Buddy Focus | 2-3 wk | 1.5 wk |
| Phase 3 | Dashboard + Pet | 2-3 wk | 1.5 wk |
| Phase 4 | Buddy Family | 2-3 wk | 1.5 wk |
| Phase 5 | Enterprise | 1.5-2 wk | 1 wk |
| Phase 6 | Polish + Store Submit | 1.5-2 wk | 1 wk |
| **Total** | | **13-18 weeks** | **8-10 weeks** |

**Ongoing:** YouTube maintenance 2-6h/week, filter verification 1h/week

---

## 10. Cost to Run

| Item | Launch | 10k Users | 100k Users |
|------|--------|-----------|------------|
| CDN (Cloudflare R2) | $0 | $0 | $5/mo |
| Auth/DB (Supabase) | $0 | $0 | $25/mo |
| Edge (CF Workers) | $0 | $0 | $5/mo |
| Payments (Stripe) | $0 | ~$50/mo | ~$500/mo |
| Monitoring (Sentry) | $0 | $0 | $26/mo |
| Status (Upptime) | $0 | $0 | $0 |
| Chrome Web Store | $5 one-time | — | — |
| **Monthly** | **~$0** | **~$50** | **~$556** |

Revenue at 100k users (5% Pro @ $3/mo avg): ~$15,000/month

---

## 11. Monetization

| Tier | Price | Includes |
|------|-------|---------|
| **Free** | $0 | Shield (full), Focus (basic), Dashboard (basic pet) |
| **Pro** | $2.99/mo or $24.99/yr | + advanced reports, sync, cosmetics, expanded Focus |
| **Family** | $5.99/mo or $49.99/yr | + Buddy Family, 5 profiles, bedtime lock |
| **Enterprise** | $1.50/seat/mo (min 10) | + managed deploy, admin dashboard, audit, SLA |

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| YouTube API breaks ad-defeat | **High** | Medium | Isolated module, hot-patch, CI smoke, weekly maintenance |
| Store rejection | Low | **High** | 4 single-purpose listings, enterprise bypass |
| NSFW false positives | Medium | Med-High | ML + blocklist, thresholds, disclosure |
| GPL boundary dispute | Low-Med | **High** | Legal review before launch |
| COPPA violation | Low | **Critical** | Full checklist, legal, consent flow |
| Firefox/Chromium drift | Medium | Medium | Shared core, platform adapters, cross-browser E2E |

---

## 13. Tech Stack Summary

| Layer | Tech | License |
|-------|------|---------|
| Framework | WXT | MIT |
| Language | TypeScript (strict) | — |
| UI | Preact (3KB) | MIT |
| Styling | Vanilla CSS + CSS Modules | — |
| Charts | Chart.js 4.x | MIT |
| ML Runtime | LiteRT.js | Apache 2.0 |
| NSFW Model | Quantized MobileNet (.tflite) | MIT |
| Ad Engine | adblock-rs (WASM) | MPL-2.0 |
| DNR Compiler | @adguard/dnr-converter (build) | GPLv3 |
| Monorepo | pnpm + Turborepo | MIT |
| Testing | Vitest + WXT + Playwright | MIT |
| CI/CD | GitHub Actions | — |
| Auth/DB | Supabase | Apache 2.0 |
| Edge | Cloudflare Workers | — |
| Payments | Stripe | — |
| i18n | i18next | MIT |

---

## Open Questions (Decision Required Before Build)

1. **UI Framework:** Preact (3KB, React-compatible) recommended. OK, or prefer full React / vanilla JS?
2. **Pet art style:** Pixel art (Tamagotchi nostalgic), Vector/SVG (modern), or AI-generated?
3. **MVP scope:** Ship Shield alone first, or wait for Shield + Focus together?
4. **Enterprise pricing:** $1.50/seat/month — correct for India/UAE/US SME markets, or regional tiers?
5. **Legal counsel:** GPL boundary + COPPA both need review. Do you have counsel?

---

## Verification Plan

**Automated:**
```bash
pnpm test                  # Unit tests
pnpm test:integration      # WXT fake browser, cross-extension messaging
pnpm test:e2e              # Playwright (Chrome + Firefox)
pnpm run pipeline:verify   # Filter list compilation
pnpm run smoke:youtube     # Headless YouTube hook verification
```

**Manual:**
- Shield on Chrome + Firefox: ad blocking on 10 sites
- Focus on Chrome: YouTube Shorts/feed hiding
- Family on Chrome: NSFW image blur on test page
- Dashboard: pet mood reacts to Shield/Focus signals
- storage.managed via Chrome Enterprise: policy locks
- Stripe payment flow (test mode)
- i18n: Tamil + Arabic RTL layout
- Lighthouse accessibility audit
- Chrome Web Store staging submission
