# Buddy Extension — Master Project Document v2.0 (Enterprise Edition, Corrected)

**Status:** Fixed and re-architected after direct verification of every open-source component and platform constraint referenced in v1, as of September 2026.
**What this version changes:** v1 was a strong concept with one structural flaw — it designed around Manifest V2-era assumptions that no longer hold on Chrome. This version keeps everything that was right (the open-source-first philosophy, the pet-mood hook, the enterprise angle) and fixes the architecture, the packaging strategy, the timeline, and the risk model so it survives contact with the actual platform in late 2026.

---

## 0. What changed and why (read this first)

| # | v1 claim | Verified reality (Sept 2026) | Fix applied in v2 |
|---|---|---|---|
| 1 | `adblock-rust` (WASM) in the background service worker does "the heavy lifting" for network blocking | Chrome removed Manifest V2 entirely on **August 31, 2026**. MV3 extensions on Chrome/Edge cannot use blocking `webRequest` — only `declarativeNetRequest` (DNR) can block live requests. A WASM engine running in a service worker cannot intercept and cancel a request the way it could in MV2. | `adblock-rust` is repositioned: it compiles filter lists into static/dynamic DNR rulesets at build/update time, and runs cosmetic filtering (element hiding, scriptlet injection) in the content script — both of which are unaffected by the DNR limits. Live request blocking is DNR's job, full stop, on Chrome. On **Firefox**, which still permits blocking `webRequest` under MV3, the full live-engine architecture from v1 genuinely works. |
| 2 | 7–9 weeks, one developer, then done | YouTube's anti-adblock system actively evolves — a June 2025 player-API restructure broke scriptlet-based blockers for 1–4 weeks; several surviving tools now ship filter/patch updates on a 24–48 hour cadence. | Treat YouTube-ad-defeat and distraction-removal as a **standing operational function**, not a one-time build item. Budget ongoing engineering time, not just launch time. |
| 3 | One extension can ship ad-block + tracker-block + YouTube detox + NSFW filter + pet gamification + enterprise dashboard | Chrome Web Store's **Single Purpose Policy** is actively enforced — Windscribe was blocked from updating because Google judged "masking location" + "circumventing censorship" + "blocking ads" to be unrelated functionalities in one listing. A new Chrome Web Store data-policy tightening also took effect August 1, 2026, restricting data collection to what's "strictly necessary for the extension's disclosed single purpose." | Repackage as a **product suite under one brand**, not one seven-purpose extension (see Section 3). |
| 4 | Unhook NG as the YouTube-detox fork target | Confirmed real, GPLv3, live on Firefox Add-ons — but with a tiny active user base (order of dozens), a bus-factor risk for something you'd depend on long-term. | Evaluate `code-charity/youtube` (formerly ImprovedTube) as primary reference — hundreds of commits, active ongoing PR review, far larger footprint — and treat Unhook NG as a secondary/backup reference, not the fork target. |
| 5 | `gasanache/brave-shields-extension` "already solves problems you'd otherwise discover the hard way" | Real and technically interesting (it hooks `fetch`/`XHR`/`JSON.parse` in-page to strip ads embedded in YouTube's player-API JSON — which DNR alone cannot do), but it's a young, single-maintainer project with only a handful of releases as of mid-2026. | Use it as an **architecture reference and technique source** (the in-page JSON-hooking pattern is genuinely the right idea for YouTube specifically), not as a dependency or code foundation for a commercial product. |
| 6 | NSFW filtering via `nsfwjs` presented as a solved problem | `nsfwjs` (MIT, Infinite Red) is real and widely used (8.8k★), but has open, unresolved false-positive reports dating to 2023–2024 and a slowing commit cadence. | Treat client-side ML classification as **one signal in a layered system**, not the sole gate — pair with a maintained domain/URL blocklist and make the sensitivity threshold configurable per tier, with an explicit, disclosed false-positive/negative rate rather than a marketing claim of "accurate." |

---

## 1. What this is, in one line (revised)

A **brand**, not a single extension: a family of narrowly-scoped, single-purpose browser extensions — ad/tracker blocking, YouTube distraction removal, and on-device content safety — unified by one account, one companion "pet" that reacts to real behavior across all of them, and one enterprise management layer. Built on production-grade open-source engines, not reinvented from scratch.

This single change (suite vs. monolith) is the highest-leverage fix in this document: it is the difference between "ships and stays listed" and "gets pulled from the Chrome Web Store mid-growth."

---

## 2. Corrected architecture

### 2.1 The core insight platform research forces on you

Chrome/Edge/Arc/Brave-as-Chromium and Firefox are no longer close enough to treat as one target. They now have genuinely different capabilities:

| Capability | Chrome / Edge / other Chromium (MV3-only since Aug 31, 2026) | Firefox (MV3, but keeps `webRequestBlocking`) |
|---|---|---|
| Block a live network request by inspecting it | **No** (for regular, non-policy-installed extensions) | **Yes** |
| Mechanism for blocking | `declarativeNetRequest` — precompiled static rules (guaranteed 30k+ across up to 50 rulesets, 10 enabled at once) plus dynamic rules (30k "safe" rules on Chrome 121+, 5k unsafe) | `webRequest` (blocking) *or* `declarativeNetRequest`, developer's choice |
| Regex rules | Capped at 1,000 total, 2 KB per compiled rule | Less constrained |
| Where `adblock-rust` fits | Build-time/update-time compiler: filter lists → DNR JSON. Runtime use limited to cosmetic filtering (CSS/element hiding) in the content script, which isn't subject to DNR limits. | Can run as the **live matching engine** exactly as v1 originally envisioned, since blocking `webRequest` is available. |
| Practical implication | "Brave-grade blocking quality" is achieved by shipping a **very well-compiled static ruleset** plus targeted dynamic rules for user customization — not by running Brave's live engine in the browser. | Genuinely closest to Brave/uBlock Origin classic behavior. |

**Recommendation:** design one shared core (list management, cosmetic filtering, pet/mood logic, UI) with two thin platform adapters — a Chromium DNR adapter and a Firefox `webRequest` adapter — rather than pretending the platforms are equivalent.

### 2.2 Revised architecture diagram (textual)

```
┌─────────────────────────────────────────────────────────────────┐
│  Build/Update pipeline (Node.js, runs in CI, not in the browser) │
│  EasyList + EasyPrivacy + uBO supplementary lists                │
│         │                                                        │
│         ▼                                                        │
│  AdGuard tsurlfilter (list → DNR JSON compiler)                  │
│         │                                                        │
│         ▼                                                        │
│  Versioned DNR ruleset bundles (static_rules_*.json)             │
│  + adblock-rust-derived cosmetic filter bundle (CSS/JS resources)│
└─────────────────────────────────────────────────────────────────┘
                         │  shipped with extension update
                         ▼
┌─────────────────────── Chromium build ───────────────────────────┐
│ Background service worker                                        │
│   • Loads static DNR rulesets (rule_resources)                   │
│   • Writes user-custom + enterprise-managed rules as dynamic DNR  │
│   • chrome.alarms: list refresh, streak/report resets             │
│ Content script (per tab)                                          │
│   • adblock-rust cosmetic engine: element hiding, scriptlets      │
│   • YouTube page-level JS hook (fetch/XHR/JSON.parse patch) to    │
│     strip ads embedded in player-API JSON — DNR cannot reach this │
│   • Shorts/doomscroll session detector → mood engine events       │
│ Offscreen document                                                 │
│   • nsfwjs (TF.js) inference, isolated from page/content script   │
│ storage.managed                                                    │
│   • Chrome Enterprise / Workspace policy ingestion                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────── Firefox build ─────────────────────────────┐
│ Background (event page)                                            │
│   • adblock-rust as the LIVE matching engine via webRequestBlocking│
│   • Same cosmetic + YouTube JS-hook layers as Chromium build       │
│   • Falls back to DNR only where Mozilla nudges toward it          │
└─────────────────────────────────────────────────────────────────┘

              Shared, cross-build:
        Popup + side panel UI · Mood engine · Reports & streaks
        Account/license service · Enterprise policy schema
```

### 2.3 Why the YouTube layer needs its own approach

DNR can block a *separate* ad-request URL. It cannot reach into a single JSON response from YouTube's player API that has ad break data woven into the same payload as the video metadata. That requires **in-page JavaScript interception** (patching `fetch`, `XMLHttpRequest.prototype.open`, and in some cases `JSON.parse`) running in the page's own context via a content script with `world: "MAIN"`. This is the technique `gasanache/brave-shields-extension` uses, and it is the correct pattern — just don't depend on that specific young repo as a library; implement the pattern natively and keep it isolated in its own module so it can be rewritten quickly when YouTube changes its API shape, which research confirms happens on the order of months, not years.

---

## 3. Product packaging: suite, not monolith

To respect the Single Purpose Policy while keeping the shared-brand, shared-pet hook, ship as:

| Product | Single, disclosed purpose | Store listing |
|---|---|---|
| **Buddy Shield** | Ad and tracker blocking | Standalone listing |
| **Buddy Focus** | YouTube distraction removal + session tracking | Standalone listing |
| **Buddy Family** | On-device content safety / parental filtering | Standalone listing, clearly marked as a parental-control category product (this category already tolerates broader bundling — filtering + time limits + reporting are accepted as one coherent "parental control" purpose) |
| **Buddy** (account + pet) | The shared account, mood engine, and cross-product dashboard that the above three plug into | Can be its own lightweight extension or a web dashboard; the pet itself is the retention hook that ties the suite together without becoming a store-policy problem, since "gamified wellbeing dashboard" is a coherent single purpose on its own |
| **Buddy for Business** | Chrome Enterprise/Workspace managed deployment of Shield + Focus (+ optionally Family) with centralized policy | Distributed via `ExtensionInstallForcelist`, not necessarily through the public consumer listing at all — enterprise/education deployment doesn't require public Chrome Web Store review in the same way, which meaningfully de-risks bundling for that channel specifically |

This costs a bit more engineering (four manifests instead of one) but removes the single biggest platform risk in the original plan: a mid-growth takedown for policy violation. It also gives you four App Store/Web Store listings — four surfaces for SEO and word-of-mouth — instead of one.

---

## 4. Best-of-best open-source components (verified, with fixes applied)

| Need | Component | Verified status (Sept 2026) | License | Verdict / fix |
|---|---|---|---|---|
| Filter-list → DNR compilation | **AdGuard `tsurlfilter`** | Actively used in production by AdGuard's own MV3 builds | GPLv3 | **Core dependency**, isolated in the build pipeline (not shipped as source in the closed extension) to respect GPL boundaries |
| Cosmetic filtering + list engine | **`brave/adblock-rust`** (WASM) | Actively maintained — v0.13.3 shipped August 2026, signed releases, regular cadence | MPL-2.0 | Keep, but scope its runtime role to cosmetic filtering only on Chromium; full live engine on Firefox |
| Filter lists | **EasyList + EasyPrivacy + uBO supplementary lists** | Community-maintained, continuously updated | Free | Keep, unchanged |
| MV3-native fallback / benchmark | **uBlock Origin Lite (uBOL)** | Actual replacement for classic uBO on Chrome since MV2's removal; confirmed reduced blocking power versus the MV2-era engine due to DNR's hard limits — this is a platform ceiling, not a uBOL flaw | GPLv3 | Use as a **quality benchmark**, not a dependency — if Buddy Shield can't match uBOL's block rate on Chrome, that's a signal, not an anomaly |
| Full live-engine reference | **Full uBlock Origin (classic)** | No longer runs on Chrome at all (MV2 fully removed store-wide August 31, 2026); still fully functional on Firefox | GPLv3 | Reference for the Firefox build's live-engine behavior only |
| YouTube distraction removal | **`code-charity/youtube` (ImprovedTube lineage)** | Large, active commit/PR history; far larger footprint than Unhook NG | Check per-repo (verify before depending) | **Preferred reference**, replacing Unhook NG as primary target |
| YouTube distraction removal, secondary | **Unhook NG** | Real, functional, GPLv3, but very small active user base — bus-factor risk | GPLv3 | Keep as secondary/backup reference only |
| YouTube ad-in-API-response defeat pattern | **`gasanache/brave-shields-extension`** (pattern only) | Real, working technique (fetch/XHR/JSON.parse hooking); young, single-maintainer project | Verify license before any code reuse — do not assume permissive | **Reference the technique, rebuild natively** — do not depend on the repo itself |
| NSFW filtering | **`nsfwjs`** (Infinite Red) | 8.8k★, MIT, "healthy" per community tooling but slowing commit cadence and open false-positive reports since 2023 | MIT | Keep as one signal; disclose accuracy limits; do not market as a solved problem |
| NSFW filtering, higher-accuracy tier | **`opennsfw2`** | Newer ResNet-based model; heavier than `nsfwjs`, better suited to a server-side/opt-in enterprise tier than always-on client inference | Open source | Evaluate for the enterprise/family "strict" tier specifically, given its heavier compute profile |
| Charts | **Chart.js** | De facto standard | MIT | Unchanged |
| Companion ad-free player (optional, separate product) | **NewPipeExtractor + LibreTube** | Proven lineage, actively maintained, but occupies contested legal territory with YouTube's Terms of Service (extraction-based players have faced platform and occasionally legal pushback historically) | GPLv3 | Keep clearly **out of the core Buddy suite** and, if pursued at all, ship as a wholly separate, clearly-labeled project so any platform action against it cannot touch the Shield/Focus/Family Chrome Web Store listings |

---

## 5. Full feature scope (revised by product)

### Buddy Shield (ad/tracker blocking)
- All-site ad and tracker blocking via compiled DNR rulesets (Chromium) or live `adblock-rust` matching (Firefox)
- Cosmetic filtering (element hiding, scriptlet injection) on both platforms
- User-added custom filter subscriptions, capped and validated against DNR limits on Chromium
- Per-site allow/pause controls
- Block-count stats feeding the shared pet/mood engine

### Buddy Focus (YouTube distraction removal)
- Shorts, home feed, related videos, comments, end screens, autoplay removal (configurable, not all-or-nothing)
- In-page JSON/fetch hook layer to strip ad markers embedded in player-API responses, versioned and hot-patchable independent of the extension's store review cycle where possible (e.g., via a remotely-updated, narrowly-scoped detection-pattern file — see Section 8 on maintenance)
- Doomscroll/session-time detection feeding the mood engine
- Channel allowlist, weekly/monthly reports, streaks

### Buddy Family (content safety)
- On-device NSFW image classification (`nsfwjs` baseline; `opennsfw2` on the strict tier)
- Maintained domain/URL blocklist as a second signal, reducing reliance on ML alone
- Parental PIN, bedtime lock, per-child profiles
- Configurable sensitivity per profile, with disclosed false-positive/negative expectations rather than a bare "accurate" claim

### Buddy (shared account + pet)
- Pet mood engine, driven by real signals from whichever Buddy products are installed
- Multilingual UI (English, Tamil, Arabic at launch, matching the original scope)
- Cross-product dashboard, streaks, cosmetics

### Buddy for Business (enterprise layer)
- Chrome Enterprise/Google Workspace managed deployment: `ExtensionInstallForcelist` + `storage.managed`, zero per-device setup
- Centralized policy: blocklist categories, NSFW sensitivity (if Family is included in the deployment), reporting rules, all org-wide
- Aggregate, anonymized, opt-in usage dashboards (time-in-distraction and mood-trend aggregates only — never individual browsing content), documented in the privacy policy for Workspace admin review
- Audit log export (CSV) for compliance reviews
- Priority support / SLA

---

## 6. Who buys this (unchanged from v1, still sound)

| Segment | Why they buy | Channel |
|---|---|---|
| Individual users | Free ad-block + pet is the hook; Pro unlocks more | Chrome Web Store, Firefox Add-ons, word-of-mouth |
| Parents/families | Buddy Family: NSFW filter + bedtime lock + per-child profiles | Same stores, family-safety keyword SEO |
| Schools | Buddy for Business managed deployment + reporting for lab/library machines | Direct sales, education resellers |
| SME employers | Wellbeing/productivity angle, deployed via Google Workspace in minutes | Direct sales through existing SME relationships |

---

## 7. Cost to build (revised — this is the biggest numeric change from v1)

| Phase | Effort | Notes |
|---|---|---|
| Core DNR pipeline (tsurlfilter + list compilation + CI) | 1.5–2 weeks | Simpler than v1's WASM-in-service-worker plan because it's a build-time step, not runtime |
| Cosmetic filtering (`adblock-rust` WASM, content-script integration) | 1–1.5 weeks | |
| Firefox live-engine adapter (`webRequestBlocking` + `adblock-rust`) | 1–1.5 weeks | New line item vs. v1 — needed because Chromium and Firefox now genuinely diverge |
| YouTube distraction removal (DOM/CSS layer) | 1–1.5 weeks | Based on the `code-charity/youtube` pattern set, rebuilt natively |
| YouTube JSON/fetch-hook ad-defeat layer | 1–2 weeks initial build | Isolated module by design, so it can be patched fast later without touching the rest of the codebase |
| Pet/mood engine | 1.5 weeks | As per original scope |
| NSFW filter (offscreen doc, `nsfwjs` + blocklist signal) | 1.5–2 weeks | Slightly larger than v1 to add the second (non-ML) signal and configurable thresholds |
| Enterprise layer (managed storage, admin schema) | 1 week | Mostly configuration |
| Four-manifest suite packaging + shared account/licensing service | 1–1.5 weeks | New line item — the cost of the single-purpose-policy fix |
| i18n, polish, four separate store submissions | 1.5 weeks | More than one submission now |
| **Total** | **~12–16 weeks, one senior generalist engineer** (or ~7–9 weeks with two engineers splitting platform/YouTube-layer work in parallel) | Longer than v1's 7–9 week estimate, but v1's estimate didn't cover Firefox's divergence, the suite split, or ongoing YouTube maintenance — this number reflects what actually has to be built to survive Chrome Web Store review and Chrome's own MV3 constraints |

**New line item v1 didn't have: ongoing YouTube-layer maintenance.** Budget roughly 2–6 hours/week of engineering time on an ongoing basis for filter/pattern updates in response to YouTube changes — this is a standing cost, not amortized into the build phase.

---

## 8. Cost to host and run (mostly unchanged, one addition)

| Item | Solution | Cost |
|---|---|---|
| Filter list + DNR ruleset distribution | GitHub raw + Cloudflare (free CDN tier) | $0 |
| NSFW model hosting | Cloudflare R2 free tier or GitHub Pages | $0 |
| Marketing/landing page | Cloudflare Pages or GitHub Pages | $0 |
| License/subscription verification | Cloudflare Workers free tier or Supabase free tier | $0 at launch, ~$5–25/mo at scale |
| Payment processing | Stripe | ~2.9% + $0.30/transaction |
| Chrome Web Store developer account | One-time, ×1 (covers all Chromium listings under one developer account) | $5 |
| Firefox Add-ons | Free | $0 |
| Enterprise support/status tooling | Self-hosted Cachet or a status-page SaaS once paying | $0–$29/mo |
| Error monitoring | Self-hosted or free-tier Sentry | $0 |
| **New: YouTube-breakage monitoring** | A small scheduled job (e.g., a headless-browser smoke test against a known YouTube page, run via free-tier CI) that alerts you within hours when the detection/hook layer breaks, rather than finding out from user reviews | $0–$10/mo on free CI minutes |

**Realistic total monthly run cost at launch: under $20.**

---

## 9. Monetization tiers (unchanged in structure, refined language)

| Tier | Price | Includes |
|---|---|---|
| Free | $0 | Buddy Shield + Buddy Focus basics, basic pet, basic reports |
| Pro (individual) | $2–4/month | Full Focus Mode, pet cosmetics, advanced reports, cloud sync |
| Family | $5–7/month | Buddy Family (parental controls, multi-profile) bundled with Pro |
| Enterprise | Custom, ~$1–2/seat/month | Buddy for Business: managed deployment, admin dashboard, audit logs, SLA |

---

## 10. Compliance notes (expanded)

- **GPLv3 components** (`tsurlfilter`, `code-charity/youtube`-derived code, `uBOL` reference, `NewPipeExtractor`) require that code built directly on them be GPLv3/source-available. Keep the build pipeline (where `tsurlfilter` runs) architecturally separate from the closed-source runtime (pet/mood/enterprise-dashboard code) — the output artifact (compiled DNR JSON) is data, not derived code, but get this reviewed by counsel before shipping commercially; GPL boundary questions around compiled rule output are a real diligence item, not a formality.
- **MPL-2.0 (`adblock-rust`) and MIT (`nsfwjs`, Chart.js)** components have no such restriction.
- **Chrome Web Store Single Purpose Policy**: addressed structurally in Section 3. Re-verify each listing's disclosed purpose against Google's current policy text before each submission, since enforcement has tightened as recently as August 2026.
- **Chrome Web Store data policy (effective August 1, 2026)**: data collection must be strictly necessary for the extension's *disclosed single purpose* — another reason the suite split in Section 3 matters, since a single monolithic listing would need to justify collecting NSFW-classification signals, ad-block stats, *and* YouTube session data all under one disclosed purpose.
- **Enterprise aggregate reporting** must never expose individual browsing content — time/mood aggregates only, opt-in, documented in the privacy policy for Workspace admin review.
- **Family tier / minors' data**: if Buddy Family processes data from or about children, review COPPA (US) and equivalent regional child-data rules explicitly before launch — this wasn't addressed in v1 and is a material legal gap for a parental-control product specifically.

---

## 11. Risk register (new — v1 had no explicit risk section)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| YouTube changes its player API and breaks the ad-defeat/distraction layer | High, recurring | Medium (isolated module, but visible to users) | Keep the layer isolated and independently updatable; budget standing maintenance time; monitor via the smoke-test job in Section 8 |
| Chrome Web Store rejects or later removes a listing for policy reasons | Medium if monolithic, Low if suite-split | High (loses the whole distribution channel for that product) | Suite packaging (Section 3); resubmit narrowly-scoped listings; keep enterprise deployment as a non-public-listing fallback channel |
| NSFW classifier false positive/negative undermines trust in Buddy Family specifically | Medium | Medium–High for the Family tier's reputation | Layered signal (ML + blocklist), disclosed accuracy expectations, configurable sensitivity, no marketing overclaim |
| Reference repos (Unhook NG, brave-shields-extension) are abandoned or license terms are unclear | Medium | Low if treated as reference-only (as recommended), High if depended on directly | Do not vendor these repos into the shipped product; rebuild the patterns natively |
| GPL boundary dispute over DNR JSON compiled from GPLv3 `tsurlfilter` | Low–Medium | High if it materializes (forced disclosure or takedown) | Legal review before commercial launch, not after |
| Firefox and Chromium builds drift apart in behavior over time | Medium | Medium (support burden, inconsistent user experience) | Shared core module (list management, mood engine, UI) with thin platform adapters, tested against both on every release |

---

## 12. Final recommendation and phased roadmap

**The core idea is sound and the open-source foundation is genuinely strong — but v1's architecture and packaging were written for a platform reality that ended on August 31, 2026.** With the fixes above, this is buildable as a real, defensible product. Recommended sequencing:

1. **Phase 1 (MVP, ~4–5 weeks):** Buddy Shield only, Chromium + Firefox, DNR-based on Chromium and live-engine on Firefox. Validate the pet/mood hook and the DNR-vs-live-engine split works end to end before adding anything else.
2. **Phase 2 (~3–4 weeks):** Buddy Focus, including the isolated YouTube JSON-hook module. Stand up the breakage-monitoring job from day one of this phase, not after launch.
3. **Phase 3 (~2–3 weeks):** Buddy Family, with the layered NSFW + blocklist approach and explicit accuracy disclosure. Complete the COPPA/child-data legal review before this phase ships, not during it.
4. **Phase 4 (~1.5–2 weeks):** Buddy for Business — managed deployment layer wrapping Shield + Focus (+ Family where contractually appropriate) for the SME/education channel, which can bypass the public single-purpose-review risk entirely via forced-install enterprise distribution.
5. **Ongoing, starting Phase 2:** Standing maintenance budget for the YouTube layer — this is now a permanent line item, not a launch cost.

This phasing also de-risks the business: Shield alone (Phase 1) is sellable and defensible on its own, so the suite can generate revenue and real usage data before the higher-risk, higher-maintenance pieces (YouTube layer, NSFW filtering) are added.
