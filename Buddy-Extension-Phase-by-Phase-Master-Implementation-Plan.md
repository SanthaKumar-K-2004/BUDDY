# BUDDY EXTENSION SUITE

# PHASE-BY-PHASE MASTER IMPLEMENTATION PLAN

## Enterprise Edition --- Zero-Cost / Open-Source / Local-First

**Document ID:** `BUDDY-PHASE-MASTER-FINAL`\
**Status:** Master implementation reference\
**Date:** September 2026\
**Primary target:** Chromium MV3 + Firefox MV3\
**Development model:** Loop Engineering + continuous validation\
**Infrastructure requirement:** ₹0 for core development and operation\
**Mandatory backend:** None\
**Mandatory database:** None\
**Mandatory web application:** None\
**Architecture:** Local-first, privacy-first, open-source-first

------------------------------------------------------------------------

## 0. PURPOSE OF THIS DOCUMENT

This document converts the existing Buddy master specification, phase
plan, and v3 implementation plan into one executable phase-by-phase
engineering roadmap.

The existing source documents establish the core suite as:

-   Buddy Shield
-   Buddy Focus
-   Buddy Family
-   Buddy Dashboard
-   enterprise management/deployment

They also establish a monorepo approach using `pnpm`, Turborepo, WXT,
TypeScript, Preact, shared packages, Vitest, WXT Fake Browser and
Playwright; an ad-filter pipeline based on upstream lists and browser
DNR/adblock-rust technology; LiteRT.js for on-device content
classification; cross-extension communication; and a phased launch plan.

This final implementation plan adds the project's current requirements:

1.  Buddy must not be limited to YouTube.
2.  Global ad/tracker blocking must work across supported websites.
3.  Site-specific adapters must support YouTube, Instagram, Facebook,
    Spotify Web Player, TikTok, Reddit, X, Twitch and generic media
    sites where technically observable.
4.  Watch-time/activity tracking must be reusable across all supported
    sites.
5.  Reels, Shorts, videos, streams and music playback should be tracked
    separately where reliably detectable.
6.  No paid hosting is required for the core product.
7.  No cloud database is required for the core product.
8.  No separate Buddy website is required for extension operation.
9.  Mature open-source projects must be reused instead of rebuilding
    equivalent technology.
10. Every phase must be implemented, built, tested, validated, repaired
    and regression-tested before the next phase is accepted.
11. The engineering process must use a loop rather than a one-shot
    code-generation workflow.

------------------------------------------------------------------------

# 1. FINAL PRODUCT MODEL

Buddy is a browser extension ecosystem rather than a single website.

``` text
                           BUDDY
                             |
          +------------------+------------------+
          |                  |                  |
       SHIELD              FOCUS              FAMILY
          |                  |                  |
   Ads / trackers      Site adapters       Local AI safety
   DNR                  Watch time           Profiles
   Cosmetic filter     Focus policies       Bedtime
   Privacy             Limits               Block / blur
          |                  |                  |
          +------------------+------------------+
                             |
                         DASHBOARD
                             |
             +---------------+---------------+
             |               |               |
           Pet             Mood          Analytics
```

## 1.1 Core extension products

### Buddy Shield

Global:

-   ad blocking
-   tracker blocking
-   cosmetic filtering
-   scriptlet support
-   per-site pause
-   filter-list updates
-   block statistics
-   privacy protection

### Buddy Focus

Cross-site:

-   watch-time measurement
-   media-session tracking
-   Shorts/Reels/video controls
-   feed distraction controls
-   autoplay controls where technically possible
-   focus mode
-   session warnings
-   watch limits
-   doomscroll pattern detection

### Buddy Family

Local:

-   content classification
-   adult-content protection
-   blur/block
-   URL/domain policies
-   profiles
-   parental PIN
-   bedtime schedules
-   sensitivity controls

### Buddy Dashboard

Local:

-   watch-time analytics
-   focus analytics
-   blocked counts
-   mood
-   Buddy pet
-   streaks
-   limits
-   settings
-   privacy center

### Enterprise layer

Optional deployment layer:

-   managed settings
-   `storage.managed`
-   policy deployment
-   MDM compatibility
-   organization-level aggregate reporting

------------------------------------------------------------------------

# 2. NON-NEGOTIABLE PRODUCT RULES

## Rule 1 --- No unnecessary rebuilding

If mature open-source software already solves a problem, evaluate and
reuse it.

Do not build a new:

-   browser extension framework
-   adblock parser
-   adblock engine
-   ML runtime
-   chart library
-   test framework
-   package manager
-   browser automation framework

unless there is a documented technical reason.

## Rule 2 --- Core must work without cloud

The following must work locally:

-   blocking
-   watch-time
-   focus
-   limits
-   dashboard
-   mood
-   pet
-   content classification
-   settings
-   profiles
-   statistics

## Rule 3 --- No mandatory separate web app

The extension is the product.

A future marketing website may exist, but it is not part of the runtime
architecture.

## Rule 4 --- No mandatory database

Use browser storage:

-   `chrome.storage.local`
-   `chrome.storage.sync` where appropriate
-   IndexedDB where larger local datasets are needed

## Rule 5 --- No browsing-content telemetry

Do not upload:

-   URLs
-   page contents
-   private messages
-   screenshots
-   images
-   browsing history

for core functionality.

## Rule 6 --- Global blocking and site adapters are separate

Network blocking is global.

Site-specific behavior is implemented by adapters.

## Rule 7 --- No fake compatibility

If a site capability cannot be reliably detected, mark it unsupported
rather than fabricating data.

## Rule 8 --- No false watch-time measurements

Opening a tab is not automatically watching content.

## Rule 9 --- Every phase has an exit gate

A phase is not complete because the code exists.

A phase is complete only when:

``` text
Implementation
    +
Build
    +
Unit tests
    +
Integration tests
    +
E2E tests where applicable
    +
Security checks
    +
License checks
    +
Performance checks
    +
Manual verification
    +
Regression verification
```

all pass.

------------------------------------------------------------------------

# 3. OPEN-SOURCE-FIRST TECHNOLOGY STACK

  --------------------------------------------------------------------------------------
  Layer                   Primary technology              Purpose
  ----------------------- ------------------------------- ------------------------------
  Extension framework     WXT                             Cross-browser extension
                                                          development

  Language                TypeScript                      Application and shared types

  Runtime UI              Preact                          Lightweight extension UI

  Workspace               pnpm                            Dependency/workspace
                                                          management

  Monorepo                Turborepo                       Build orchestration

  Network rules           Browser DNR                     Chromium declarative blocking

  Filter engine           adblock-rust                    Filtering/cosmetic/scriptlet
                                                          capabilities

  DNR compiler            `@adguard/dnr-converter`        Build-time filter conversion

  Filter download         `@adguard/filters-downloader`   Upstream filter retrieval

  Local ML runtime        LiteRT.js                       On-device `.tflite` inference

  Analytics charts        Chart.js                        Dashboard charts

  Unit testing            Vitest                          Fast test suite

  Browser API testing     WXT Fake Browser                Extension API simulation

  E2E                     Playwright                      Chromium/Firefox browser tests

  Storage                 `chrome.storage` / IndexedDB    Local-first state

  CI                      GitHub Actions                  Automated validation
  --------------------------------------------------------------------------------------

### License boundary

Known source-plan boundaries must be preserved.

Examples:

-   adblock-rust: MPL-2.0
-   LiteRT.js: Apache 2.0
-   Chart.js: MIT
-   Buddy original code: project-controlled
-   `@adguard/dnr-converter`: GPLv3 build-time component and must remain
    quarantined according to the legal architecture

Do not copy GPL browser-extension code into runtime code merely because
it appears useful.

Reference-only projects must remain reference-only unless their license
permits the intended use.

------------------------------------------------------------------------

# 4. FINAL MONOREPO

``` text
buddy/
|
+-- apps/
|   +-- buddy-shield/
|   +-- buddy-focus/
|   +-- buddy-family/
|   +-- buddy-dashboard/
|
+-- packages/
|   +-- shared-types/
|   +-- ui-components/
|   +-- i18n/
|   +-- mood-engine/
|   +-- watch-time/
|   +-- activity-engine/
|   +-- focus-engine/
|   +-- site-adapters/
|   |   +-- core/
|   |   +-- generic/
|   |   +-- youtube/
|   |   +-- instagram/
|   |   +-- facebook/
|   |   +-- spotify/
|   |   +-- tiktok/
|   |   +-- reddit/
|   |   +-- x/
|   |   +-- twitch/
|   |
|   +-- filter-pipeline/
|   +-- cosmetic-engine/
|   +-- nsfw-engine/
|   +-- policy-engine/
|   +-- storage/
|
+-- e2e/
|
+-- docs/
|   +-- architecture/
|   +-- privacy/
|   +-- security/
|   +-- licenses/
|   +-- site-adapters/
|   +-- phases/
|
+-- .github/
|   +-- workflows/
|
+-- package.json
+-- pnpm-workspace.yaml
+-- turbo.json
+-- tsconfig.json
```

Optional cloud/infrastructure directories must not be required for the
core build.

------------------------------------------------------------------------

# 5. LOOP ENGINEERING SYSTEM

Every implementation task uses this exact loop.

``` text
STEP 1 — INSPECT
        |
STEP 2 — UNDERSTAND CURRENT REPO
        |
STEP 3 — RESEARCH EXISTING OPEN SOURCE
        |
STEP 4 — CHECK LICENSE / COMPATIBILITY
        |
STEP 5 — DEFINE ACCEPTANCE CRITERIA
        |
STEP 6 — IMPLEMENT SMALLEST VERTICAL SLICE
        |
STEP 7 — RUN STATIC CHECKS
        |
STEP 8 — RUN UNIT TESTS
        |
STEP 9 — RUN INTEGRATION TESTS
        |
STEP 10 — BUILD REAL EXTENSION
        |
STEP 11 — RUN E2E / MANUAL TEST
        |
STEP 12 — OBSERVE FAILURE
        |
STEP 13 — REPAIR
        |
STEP 14 — REGRESSION TEST
        |
STEP 15 — PERFORMANCE / SECURITY / LICENSE CHECK
        |
STEP 16 — DOCUMENT ACTUAL RESULT
        |
STEP 17 — ACCEPT OR LOOP AGAIN
```

## Loop rule

Never say:

> "Done."

until the exit criteria have actually been executed.

------------------------------------------------------------------------

# 6. MASTER PHASE MAP

The source phase plan defines the main eight-phase sequence:

  Phase   Name                   Main output
  ------- ---------------------- -----------------------------------
  0       Foundation & Tooling   Working monorepo
  1       Filter Ingestion       Reproducible filter pipeline
  2       Shield                 Global ad/tracker protection
  3       Focus                  Cross-site wellbeing + adapters
  4       Dashboard + Pet        Analytics + behavioral layer
  5       Family                 On-device content safety
  6       Enterprise             Managed policies
  7       i18n + Polish          Tamil/Arabic + accessibility + UX
  8       Security + Launch      Audited release

The original plan places the work over approximately 14--16 weeks for
the full enterprise launch. Actual timing depends on developer count,
existing repository state, and how much of the implementation is already
complete.

------------------------------------------------------------------------

# PHASE 0 --- FOUNDATION & TOOLING

## 0.1 Objective

Create a clean, scalable, testable foundation before implementing
product features.

Phase 0 must answer:

-   Can the monorepo install?
-   Can every app build?
-   Can shared packages compile?
-   Can browser targets be generated?
-   Can tests execute?
-   Can CI validate the repository?
-   Can extensions communicate through a typed protocol?
-   Can the architecture be extended without rewriting the foundation?

------------------------------------------------------------------------

## 0.2 Phase 0 scope

### Repository

Create:

-   root package
-   pnpm workspace
-   Turborepo configuration
-   TypeScript configuration
-   formatting/linting
-   editor configuration
-   Git configuration

### Applications

Scaffold:

-   `buddy-shield`
-   `buddy-focus`
-   `buddy-family`
-   `buddy-dashboard`

### Shared packages

Scaffold:

-   `shared-types`
-   `ui-components`
-   `i18n`
-   `mood-engine`
-   `watch-time`
-   `activity-engine`
-   `focus-engine`
-   `site-adapters`

### Testing

Configure:

-   Vitest
-   WXT Fake Browser
-   Playwright foundation

### CI

Configure:

-   install
-   lint
-   typecheck
-   test
-   build

------------------------------------------------------------------------

## 0.3 Task 0.1 --- Repository initialization

Create:

``` text
package.json
pnpm-workspace.yaml
turbo.json
tsconfig.json
```

Use strict TypeScript.

Required principles:

-   no implicit `any`
-   strict null checking
-   typed package boundaries
-   explicit public exports
-   deterministic builds

------------------------------------------------------------------------

## 0.4 Task 0.2 --- Workspace structure

The workspace must understand:

``` text
apps/*
packages/*
```

Every package must have:

-   package name
-   version
-   build script
-   test script where applicable
-   typecheck script
-   lint script where applicable

------------------------------------------------------------------------

## 0.5 Task 0.3 --- WXT apps

Initialize each extension with WXT.

Required target matrix:

``` text
Chromium
Firefox
```

Chromium derivatives such as Edge and Brave should use the Chromium
build unless a browser-specific issue requires an adapter.

------------------------------------------------------------------------

## 0.6 Task 0.4 --- Shared types

Define typed contracts for:

``` ts
ExtensionId
SiteId
PlatformId
ContentType
WatchSession
ActivityEvent
FocusPolicy
WatchLimit
MoodEvent
BlockEvent
PolicyUpdate
ContentSafetyEvent
StorageKey
```

Example:

``` ts
type PlatformId =
  | "youtube"
  | "instagram"
  | "facebook"
  | "spotify"
  | "tiktok"
  | "reddit"
  | "x"
  | "twitch"
  | "generic";
```

------------------------------------------------------------------------

## 0.7 Task 0.5 --- Event protocol

Create versioned events.

Example:

``` ts
interface BuddyEvent<TPayload> {
  type: string;
  schemaVersion: 1;
  source: string;
  timestamp: number;
  payload: TPayload;
}
```

Do not pass arbitrary unvalidated objects between extensions.

------------------------------------------------------------------------

## 0.8 Task 0.6 --- Site adapter contract

Create:

``` ts
interface SiteAdapter {
  id: string;
  matches(url: URL): boolean;

  initialize(context: SiteContext): void | Promise<void>;
  destroy(): void;

  getMediaState(): MediaState;
  getContentState(): ContentState;
  getWatchSession(): WatchSession | null;

  applyFocusPolicy(policy: FocusPolicy): void;

  observe(): void;
  stopObserving(): void;
}
```

------------------------------------------------------------------------

## 0.9 Task 0.7 --- Watch-time foundation

Implement the state model before implementing individual websites.

States:

``` text
IDLE
ACTIVE
MEDIA_PLAYING
PAUSED
BACKGROUND
ENDED
```

Inputs:

-   tab visibility
-   document visibility
-   media playback
-   user idle state
-   navigation
-   pause
-   end

------------------------------------------------------------------------

## 0.10 Task 0.8 --- Generic media detector

Implement a reusable detector for:

``` js
HTMLVideoElement
HTMLAudioElement
```

Events:

-   play
-   pause
-   ended
-   timeupdate
-   seeking
-   volume changes where relevant
-   visibilitychange

Do not continuously scan the entire DOM.

Use observers and event listeners.

------------------------------------------------------------------------

## 0.11 Task 0.9 --- Storage layer

Create a typed storage abstraction.

Example:

``` text
settings
sitePolicies
watchLimits
dailyStats
sessions
petState
moodState
familyProfiles
```

Storage access must be centralized.

Do not scatter raw `chrome.storage.local` calls throughout the codebase.

------------------------------------------------------------------------

## 0.12 Task 0.10 --- UI foundation

Create shared Preact components:

-   Button
-   Card
-   Toggle
-   Modal
-   Badge
-   ProgressBar
-   EmptyState
-   Warning
-   SiteRow
-   MetricCard
-   ChartContainer

Use design tokens.

Avoid excessive visual styling during Phase 0.

------------------------------------------------------------------------

## 0.13 Task 0.11 --- CI

CI must run:

``` bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

------------------------------------------------------------------------

## 0.14 Phase 0 tests

### Unit

-   event schemas
-   storage serialization
-   watch-state transitions
-   site matching
-   activity classification

### Integration

-   mocked extension runtime
-   storage
-   runtime messaging
-   alarms

### Build

Every app must generate a valid extension package.

------------------------------------------------------------------------

## 0.15 Phase 0 acceptance gate

Phase 0 passes only if:

``` text
[ ] Clean clone installs
[ ] Frozen lockfile installs
[ ] TypeScript passes
[ ] Lint passes
[ ] Unit tests pass
[ ] Shared packages build
[ ] Four extension apps build
[ ] Chromium build generated
[ ] Firefox build generated
[ ] Playwright foundation launches
[ ] CI is green
[ ] No unexplained warnings
[ ] Architecture documentation exists
```

------------------------------------------------------------------------

# PHASE 1 --- FILTER INGESTION & DNR PIPELINE

## 1.1 Objective

Create a reproducible filter ingestion pipeline that consumes mature
upstream lists and produces browser-compatible filtering artifacts.

------------------------------------------------------------------------

## 1.2 Filter sources

The existing source plan identifies:

-   EasyList
-   EasyPrivacy
-   Peter Lowe's Ad and Tracking Server List
-   uBlock Origin filters/annoyances where licensing and redistribution
    are verified

Every list must have:

-   source URL
-   license
-   version
-   checksum
-   retrieval timestamp
-   transformation log

------------------------------------------------------------------------

## 1.3 Build-time architecture

``` text
Upstream filters
      |
      v
Downloader
      |
      v
Normalizer
      |
      v
Validator
      |
      v
DNR Converter
      |
      +----> Chromium static rules
      |
      +----> Cosmetic data
      |
      +----> Scriptlet resources
      |
      v
Artifact validation
```

------------------------------------------------------------------------

## 1.4 GPL quarantine

If a GPL build-time converter is used:

``` text
packages/filter-pipeline/
```

must be clearly isolated.

The runtime extension package must not contain prohibited GPL runtime
dependencies.

Add an automated runtime artifact scan.

------------------------------------------------------------------------

## 1.5 Rule optimization

Implement:

-   deduplication
-   invalid-rule removal
-   regex validation
-   priority handling
-   category splitting
-   deterministic ordering

Respect browser rule limits.

Do not assume unlimited DNR rules.

------------------------------------------------------------------------

## 1.6 Rule categories

Generate:

``` text
ads
trackers
annoyances
privacy
```

Optional future categories:

``` text
social
cookie-notices
malvertising
```

------------------------------------------------------------------------

## 1.7 Cosmetic filtering

Store:

-   CSS selectors
-   cosmetic rules
-   scriptlet resources

in a form consumable by the selected filtering runtime.

------------------------------------------------------------------------

## 1.8 Filter update strategy

Core development must work without a hosted server.

For local builds:

``` text
pnpm filter:compile
```

downloads and compiles fresh lists.

For releases:

-   generated rules are bundled into extension assets
-   a future CDN may distribute updates, but is optional

------------------------------------------------------------------------

## 1.9 Phase 1 tests

Test:

-   downloader
-   malformed lists
-   duplicate rules
-   invalid regex
-   rule counts
-   deterministic output
-   rule packaging
-   GPL boundary
-   build reproducibility

------------------------------------------------------------------------

## 1.10 Phase 1 acceptance

``` text
[ ] Upstream lists download
[ ] License metadata recorded
[ ] Conversion completes
[ ] Rule counts validated
[ ] Static rules package
[ ] Cosmetic rules package
[ ] Scriptlets package
[ ] Runtime artifact contains no prohibited GPL runtime
[ ] Re-running build produces equivalent artifacts
[ ] CI passes
```

------------------------------------------------------------------------

# PHASE 2 --- BUDDY SHIELD

## 2.1 Objective

Turn the filter pipeline into a working global browser protection layer.

------------------------------------------------------------------------

## 2.2 Chromium

Use:

``` text
declarativeNetRequest
```

for network-level blocking.

Implement:

-   static rulesets
-   dynamic user rules where appropriate
-   enabled/disabled categories
-   per-site pause
-   allowlist

------------------------------------------------------------------------

## 2.3 Firefox

Use the compatible extension architecture and adblock-rust path defined
by the v3 implementation plan.

Keep Firefox-specific behavior behind a platform adapter.

------------------------------------------------------------------------

## 2.4 Shield popup

Display:

``` text
Protection ON/OFF
Ads blocked
Trackers blocked
Current site
Pause site
Allow site
Protection categories
```

------------------------------------------------------------------------

## 2.5 Block statistics

Counts must be clearly labeled as estimates where browser APIs do not
provide exact per-request observability.

Never present a heuristic count as an exact network count.

------------------------------------------------------------------------

## 2.6 Privacy protections

Where technically safe and tested:

-   known tracker blocking
-   fingerprinting-related filter rules
-   cosmetic tracker removal
-   scriptlet protections

Do not add invasive anti-fingerprinting behavior without testing
compatibility.

------------------------------------------------------------------------

## 2.7 Site controls

User can configure:

``` text
Global
This site
Category
```

Examples:

``` text
Ads
Trackers
Annoyances
Privacy
```

------------------------------------------------------------------------

## 2.8 Shield regression matrix

Test:

``` text
news website
shopping website
blog
video website
social website
forum
unknown website
```

Test:

-   navigation
-   iframe
-   reload
-   SPA navigation
-   multiple tabs

------------------------------------------------------------------------

## 2.9 Phase 2 acceptance

``` text
[ ] Ads blocked by supported rules
[ ] Trackers blocked by supported rules
[ ] Cosmetic filtering works
[ ] Per-site pause works
[ ] Allowlist works
[ ] Chromium build works
[ ] Firefox build works
[ ] No major site-wide breakage in test matrix
[ ] Filter update process works
[ ] Block counters behave correctly
[ ] Security checks pass
```

------------------------------------------------------------------------

# PHASE 3 --- BUDDY FOCUS & CROSS-SITE ADAPTERS

## 3.1 Objective

Build the most important expansion: Buddy is no longer YouTube-only.

The Focus architecture must provide:

``` text
watch-time
activity classification
site adapters
focus policies
limits
session warnings
short-form tracking
media tracking
```

------------------------------------------------------------------------

# 3.2 Common watch-time architecture

``` text
                SITE ADAPTER
                     |
                     v
              Media / Content
                     |
                     v
              Watch-Time Engine
                     |
          +----------+----------+
          |          |          |
       Session     Content    Activity
          |          |          |
          +----------+----------+
                     |
                     v
              Local Statistics
```

------------------------------------------------------------------------

# 3.3 Watch-time truth model

The engine should separate:

``` text
Tab active time
Page visible time
Media playing time
Actual media progress
Idle time
Background time
```

A simple default:

``` text
watchTime =
  tabActive
  AND pageVisible
  AND mediaPlaying
  AND userNotIdle
```

For non-media sites:

``` text
activeSiteTime =
  tabActive
  AND pageVisible
  AND userNotIdle
```

------------------------------------------------------------------------

# 3.4 Site capability registry

Each adapter declares capabilities.

Example:

``` ts
interface SiteCapabilities {
  activity: boolean;
  media: boolean;
  shortForm: boolean;
  feed: boolean;
  focus: boolean;
  limits: boolean;
  adRules: "global" | "site" | "none";
}
```

This prevents the UI from claiming unsupported functionality.

------------------------------------------------------------------------

# 3.5 YouTube adapter

Implement:

### Detection

-   youtube.com
-   YouTube SPA navigation
-   video page
-   Shorts
-   home feed
-   recommended sections

### Tracking

-   long-form video
-   Shorts
-   session
-   playback
-   pauses
-   limits

### Focus

-   Shorts shelf
-   Shorts tab
-   home feed
-   related videos
-   autoplay where technically possible
-   end-screen distractions
-   comments toggle
-   configurable recommendations

### Safety

Isolate fragile site-specific code.

Do not allow a YouTube failure to break Shield or the Dashboard.

------------------------------------------------------------------------

# 3.6 Instagram adapter

Target:

``` text
instagram.com
```

Track where reliably detectable:

-   active time
-   video time
-   Reels time
-   Stories time
-   sessions
-   Reels viewed

Focus:

-   Reels reduction
-   feed distraction
-   autoplay controls where possible
-   session warnings
-   watch limits

Do not assume selectors remain permanent.

Use:

-   mutation observers
-   URL patterns
-   media events
-   robust semantic selectors
-   fallback detection

------------------------------------------------------------------------

# 3.7 Facebook adapter

Track:

-   active time
-   video time
-   Reels time
-   Stories
-   sessions

Focus:

-   Reels
-   video feed
-   feed distractions
-   limits
-   warnings

------------------------------------------------------------------------

# 3.8 Spotify Web adapter

Target only:

``` text
open.spotify.com
```

Track:

-   listening time
-   media playback
-   sessions
-   pause/resume
-   podcast playback where detectable

Do not claim control over native Spotify desktop/mobile applications.

Global filtering may block supported web-player ad requests/rules, but
compatibility must be verified rather than promised universally.

------------------------------------------------------------------------

# 3.9 TikTok adapter

Track:

-   active time
-   video time
-   session duration
-   video count

Focus:

-   short-form session warnings
-   limits
-   feed distraction
-   focus mode

------------------------------------------------------------------------

# 3.10 Reddit adapter

Track:

-   active time
-   media time
-   sessions

Focus:

-   feed distraction
-   video limits
-   reading/session limits

------------------------------------------------------------------------

# 3.11 X adapter

Track:

-   active time
-   video time
-   sessions

Focus:

-   feed distractions
-   video limits
-   focus mode

------------------------------------------------------------------------

# 3.12 Twitch adapter

Track:

-   stream time
-   active session
-   playback
-   session duration

Focus:

-   stream limits
-   focus mode
-   warnings

------------------------------------------------------------------------

# 3.13 Generic adapter

For every unknown site:

-   detect HTML media
-   measure active page time
-   classify domain
-   provide generic limits

Generic adapter must never pretend to understand a site's
Reels/Shorts/feed semantics.

------------------------------------------------------------------------

# 3.14 Universal Focus Policy

Create:

``` ts
interface FocusPolicy {
  hideShortForm: boolean;
  hideRecommendations: boolean;
  disableAutoplay: boolean;
  hideTrending: boolean;
  hideSidebars: boolean;
  showSessionWarning: boolean;
}
```

Each site adapter translates the policy.

------------------------------------------------------------------------

# 3.15 Watch limits

Support:

-   daily platform limit
-   daily category limit
-   content-type limit
-   session limit
-   warning threshold

Example:

``` text
YouTube = 60m
YouTube Shorts = 20m
Instagram = 30m
Instagram Reels = 20m
Facebook = 30m
TikTok = 20m
Spotify = 120m
```

These are user-configurable examples.

------------------------------------------------------------------------

# 3.16 Warning levels

``` text
80% -> gentle
90% -> strong
100% -> configured intervention
```

The user controls whether 100% means:

-   warning
-   pause
-   focus screen
-   temporary block

------------------------------------------------------------------------

# 3.17 Doomscroll detection

Detect observable patterns:

-   rapid navigation
-   repeated feed transitions
-   repeated short-form content
-   long uninterrupted sessions
-   frequent content changes

Do not diagnose psychological conditions.

------------------------------------------------------------------------

# 3.18 Phase 3 test matrix

For each adapter:

``` text
[ ] Domain matching
[ ] Initialization
[ ] SPA navigation
[ ] Media detection
[ ] Session start
[ ] Session pause
[ ] Session resume
[ ] Session end
[ ] Visibility handling
[ ] Idle handling
[ ] Watch-time calculation
[ ] Focus policy
[ ] Limit warning
[ ] Adapter failure recovery
[ ] DOM mutation recovery
```

------------------------------------------------------------------------

# 3.19 Phase 3 acceptance

Minimum:

``` text
YouTube
Instagram
Facebook
Spotify Web
TikTok
Reddit
X
Twitch
Generic media
```

must all load without breaking the extension.

Global Shield must continue operating if any site adapter fails.

------------------------------------------------------------------------

# PHASE 4 --- DASHBOARD, PET & MOOD ENGINE

## 4.1 Objective

Turn raw local events into understandable user feedback.

------------------------------------------------------------------------

# 4.2 Dashboard screens

Required:

1.  Home
2.  Today
3.  Watch Time
4.  Focus
5.  Blocked
6.  Sites
7.  Limits
8.  Buddy Pet
9.  Family
10. Settings
11. Privacy

------------------------------------------------------------------------

# 4.3 Today dashboard

Show:

-   total active time
-   media time
-   focus time
-   social time
-   video time
-   music time
-   ads blocked
-   trackers blocked
-   sessions
-   limits reached

------------------------------------------------------------------------

# 4.4 Platform dashboard

Show:

``` text
YouTube
Instagram
Facebook
Spotify
TikTok
Reddit
X
Twitch
Other
```

Each platform can expose:

-   time
-   sessions
-   media
-   short-form
-   limits
-   trend

Only show metrics supported by that adapter.

------------------------------------------------------------------------

# 4.5 Charts

Use Chart.js or another approved lightweight chart library.

Charts:

-   daily time
-   weekly time
-   platform breakdown
-   media breakdown
-   focus sessions
-   blocked counts

Avoid dashboard clutter.

------------------------------------------------------------------------

# 4.6 Mood engine

Use deterministic events.

Example source model:

``` text
Focus completion -> positive
Goal completion -> positive
Healthy break -> positive
Doomscroll event -> negative
Overtime -> negative
Streak break -> negative
```

The exact point system must be documented and unit-tested.

------------------------------------------------------------------------

# 4.7 Anti-gaming

The original master document includes anti-gaming concepts such as:

-   maximum daily positive recovery
-   controlled decay
-   negative event weighting

Implement caps so the user cannot rapidly inflate the score.

------------------------------------------------------------------------

# 4.8 Buddy Pet

Pet states can reflect:

-   focused
-   happy
-   tired
-   distracted
-   recovering

The pet must not shame the user.

Use encouraging language.

------------------------------------------------------------------------

# 4.9 Streaks

Track:

-   daily goal streak
-   focus streak
-   healthy-session streak

Persist locally.

------------------------------------------------------------------------

# 4.10 Dashboard performance

Do not recompute all historical sessions on every popup open.

Use daily aggregates:

``` text
raw session
    |
aggregation
    |
daily summary
    |
weekly summary
```

------------------------------------------------------------------------

# 4.11 Phase 4 acceptance

``` text
[ ] Dashboard opens quickly
[ ] Statistics match local events
[ ] Charts render
[ ] Pet state deterministic
[ ] Mood tests pass
[ ] Streaks persist
[ ] Watch-time totals match source sessions
[ ] No browsing URLs exposed
[ ] Dashboard works offline
```

------------------------------------------------------------------------

# PHASE 5 --- BUDDY FAMILY & ON-DEVICE AI

## 5.1 Objective

Add local content safety without uploading images.

------------------------------------------------------------------------

# 5.2 ML architecture

``` text
Content Script
     |
     v
MutationObserver
     |
     v
IntersectionObserver
     |
     v
Image candidate
     |
     v
Offscreen document
     |
     v
LiteRT.js
     |
     v
Quantized TFLite model
     |
     v
Classification
     |
     v
Policy
     |
 +---+---+
 |       |
Blur    Block
```

------------------------------------------------------------------------

# 5.3 Image processing rules

Do not classify:

-   every DOM element
-   tiny icons
-   irrelevant images

Use size thresholds and visibility.

Cache results where safe.

------------------------------------------------------------------------

# 5.4 Family policies

Profiles can define:

-   sensitivity
-   blocked domains
-   allowed domains
-   bedtime
-   content categories
-   blur/block mode

------------------------------------------------------------------------

# 5.5 PIN

Use a secure local representation for the parental PIN.

Do not store plaintext PINs.

The source implementation plan specifies SHA-256 hashing for the
parental PIN; if implemented, use a properly salted/derived credential
design rather than assuming a bare hash is sufficient for every threat
model.

------------------------------------------------------------------------

# 5.6 Bedtime

Implement local scheduling.

State:

``` text
NORMAL
BEDTIME_WARNING
BEDTIME_LOCKED
```

Handle browser restart and clock changes safely.

------------------------------------------------------------------------

# 5.7 False positives

Provide:

-   sensitivity controls
-   temporary allow
-   domain allowlist
-   clear explanation
-   user override

Do not pretend ML classification is perfect.

------------------------------------------------------------------------

# 5.8 Family privacy

Core mode:

``` text
Images -> local
Classification -> local
History -> local
```

No image upload.

------------------------------------------------------------------------

# 5.9 COPPA/privacy gate

Before any future child-oriented cloud/account functionality:

-   age/consent requirements
-   parental consent
-   data minimization
-   deletion
-   retention
-   security program
-   third-party SDK audit

must be reviewed.

Core local mode should avoid unnecessary child data collection entirely.

------------------------------------------------------------------------

# 5.10 Phase 5 acceptance

``` text
[ ] LiteRT loads
[ ] Model loads
[ ] Offscreen inference works
[ ] Images are classified locally
[ ] Blur works
[ ] Block works
[ ] Domain policy works
[ ] PIN works
[ ] Bedtime scheduler works
[ ] No image leaves device
[ ] Performance remains acceptable
[ ] Failure of ML does not crash Buddy
```

------------------------------------------------------------------------

# PHASE 6 --- ENTERPRISE MANAGEMENT

## 6.1 Objective

Make Buddy deployable in organizations without turning the product into
surveillance software.

------------------------------------------------------------------------

# 6.2 Managed policy

Use:

``` text
storage.managed
```

where supported.

Policies:

``` text
adBlocking
focusMode
watchLimits
allowedSites
blockedSites
categoryPolicies
familyPolicy
updatePolicy
```

------------------------------------------------------------------------

# 6.3 Organization controls

Administrators can manage:

-   extension settings
-   protection categories
-   focus policies
-   session limits
-   approved sites
-   restricted sites

------------------------------------------------------------------------

# 6.4 Privacy model

Enterprise reporting should use aggregate data.

Do not expose private user browsing content.

Default organization analytics:

``` text
aggregate usage
aggregate blocked events
aggregate focus participation
policy compliance
```

------------------------------------------------------------------------

# 6.5 Google / Microsoft deployment

Prepare documentation for:

-   Chrome Enterprise
-   Google Workspace management
-   Microsoft Intune
-   browser enterprise policies

Do not hardcode a single management vendor into the core.

------------------------------------------------------------------------

# 6.6 Enterprise test matrix

Test:

-   managed policy present
-   managed policy absent
-   user attempts override
-   administrator updates policy
-   browser restart
-   extension update
-   policy removal

------------------------------------------------------------------------

# 6.7 Phase 6 acceptance

``` text
[ ] Managed settings load
[ ] User settings respect policy
[ ] Policy updates propagate
[ ] Restart preserves policy
[ ] Policy removal restores expected behavior
[ ] No private browsing data enters admin reporting
[ ] Enterprise E2E tests pass
```

------------------------------------------------------------------------

# PHASE 7 --- INTERNATIONALIZATION, ACCESSIBILITY & DESIGN POLISH

## 7.1 Objective

Make the product production-quality.

------------------------------------------------------------------------

# 7.2 Languages

Initial:

-   English
-   Tamil
-   Arabic

Arabic must support RTL.

Tamil must be Unicode-safe.

------------------------------------------------------------------------

# 7.3 Translation architecture

Never hardcode user-facing text throughout components.

Use typed keys:

``` ts
t("dashboard.watchTime")
t("focus.limitReached")
t("settings.privacy")
```

------------------------------------------------------------------------

# 7.4 Accessibility

Required:

-   keyboard navigation
-   visible focus
-   semantic controls
-   ARIA labels
-   screen reader compatibility
-   reduced-motion support
-   contrast checks
-   scalable text

------------------------------------------------------------------------

# 7.5 UI polish

Design principles:

-   minimal
-   calm
-   professional
-   readable
-   low visual noise
-   consistent spacing
-   consistent typography
-   no excessive gradients
-   no unnecessary animation

------------------------------------------------------------------------

# 7.6 Performance polish

Measure:

-   popup load
-   dashboard load
-   content-script startup
-   memory
-   CPU
-   ML cold start
-   ML warm inference
-   background worker activity

------------------------------------------------------------------------

# 7.7 Phase 7 acceptance

``` text
[ ] English complete
[ ] Tamil complete
[ ] Arabic complete
[ ] RTL works
[ ] Keyboard navigation works
[ ] Reduced motion works
[ ] Screen reader labels verified
[ ] No clipped translated strings
[ ] Performance regression absent
```

------------------------------------------------------------------------

# PHASE 8 --- SECURITY, LEGAL, RELEASE & LAUNCH

## 8.1 Objective

Prove that the product is safe enough to distribute.

------------------------------------------------------------------------

# 8.2 Security audit

Search source and generated artifacts for:

``` text
eval(
new Function(
unsafe HTML
remote code execution
untrusted script injection
unsafe message handling
hardcoded secrets
tokens
credentials
```

------------------------------------------------------------------------

# 8.3 Extension permissions audit

Every permission must have a reason.

Do not request permissions simply because they may be useful later.

------------------------------------------------------------------------

# 8.4 Cross-extension security

For external messages:

-   verify sender extension ID
-   validate schema
-   validate version
-   reject unknown events
-   reject malformed payloads

------------------------------------------------------------------------

# 8.5 Content-script security

Treat page DOM as untrusted.

Never trust:

-   webpage JSON
-   DOM attributes
-   page-injected objects
-   messages from the page context

------------------------------------------------------------------------

# 8.6 License audit

Run:

``` text
dependency inventory
license scan
runtime package scan
GPL boundary scan
generated artifact scan
```

Acceptance:

``` text
No prohibited GPL runtime component.
```

------------------------------------------------------------------------

# 8.7 Privacy audit

Verify:

``` text
[ ] No URLs uploaded
[ ] No page content uploaded
[ ] No screenshots uploaded
[ ] No private messages uploaded
[ ] No images uploaded for Family
[ ] Local statistics remain local
[ ] Cloud functionality is optional
[ ] Data deletion works
```

------------------------------------------------------------------------

# 8.8 Store compliance

Prepare:

-   privacy policy
-   permission justification
-   extension descriptions
-   screenshots
-   support information
-   data-use disclosures
-   content classification disclosures where applicable

Do not submit until actual permissions match the documentation.

------------------------------------------------------------------------

# 8.9 Release build

Release pipeline:

``` text
git tag
   |
CI
   |
install
   |
lint
   |
typecheck
   |
unit
   |
integration
   |
E2E
   |
security
   |
license
   |
build
   |
artifact verification
   |
release package
```

------------------------------------------------------------------------

# 8.10 Final launch acceptance

``` text
[ ] Chromium package verified
[ ] Firefox package verified
[ ] Manifest verified
[ ] Permissions verified
[ ] Security checks pass
[ ] License checks pass
[ ] Privacy audit pass
[ ] E2E pass
[ ] Performance pass
[ ] Documentation matches build
[ ] Store assets ready
[ ] Release artifacts checksummed
```

------------------------------------------------------------------------

# 9. CONTINUOUS REGRESSION SYSTEM

Buddy is a browser-facing product.

Websites change.

Therefore maintenance is part of the architecture.

------------------------------------------------------------------------

## 9.1 Site adapter monitoring

Every supported site has:

``` text
adapter
fixtures
E2E test
capability matrix
known selectors/patterns
```

When a site changes:

``` text
E2E failure
   |
diagnosis
   |
adapter repair
   |
unit tests
   |
E2E
   |
full regression
```

------------------------------------------------------------------------

# 9.2 Filter maintenance

Filter lists should be regularly refreshed.

Build-time:

``` text
download
validate
compile
test
package
```

Never ship a new filter artifact without validation.

------------------------------------------------------------------------

# 9.3 Browser compatibility maintenance

Monitor:

-   Chrome MV3 changes
-   Firefox API changes
-   WXT changes
-   DNR behavior
-   browser permission changes

------------------------------------------------------------------------

# 10. COMPLETE TESTING MATRIX

## 10.1 Unit

``` text
shared types
storage
watch-time
activity
focus policies
mood
pet state
filter transforms
site matching
policy evaluation
```

## 10.2 Integration

``` text
storage
runtime messaging
alarms
DNR
content scripts
offscreen document
ML
managed policies
```

## 10.3 E2E

``` text
Chromium
Firefox
YouTube
Instagram
Facebook
Spotify Web
TikTok
Reddit
X
Twitch
generic media
```

## 10.4 Security

``` text
permissions
message validation
script injection
unsafe evaluation
secrets
license
privacy
```

## 10.5 Performance

``` text
startup
memory
CPU
dashboard
watch-time
filtering
ML
```

------------------------------------------------------------------------

# 11. FAILURE-INJECTION TESTING

Intentionally test:

-   site adapter throws
-   malformed DOM
-   missing media element
-   browser API unavailable
-   storage write fails
-   filter list corrupt
-   ML model missing
-   ML inference fails
-   extension message malformed
-   external sender unknown
-   managed policy malformed
-   browser restart during session
-   computer sleep during session
-   tab crash
-   navigation during playback

Expected behavior:

``` text
Fail locally.
Recover where possible.
Never crash the entire Buddy system.
Never corrupt stored state.
Never leak private data.
```

------------------------------------------------------------------------

# 12. PERFORMANCE TARGETS

Targets are engineering goals, not claims until measured.

## Extension startup

Keep initialization lightweight.

## Content scripts

Do not perform full-page polling.

## Watch time

Use event-driven updates.

## Dashboard

Read aggregated local data instead of recomputing everything.

## ML

Use:

-   lazy loading
-   offscreen document
-   quantized model
-   hardware acceleration where supported

------------------------------------------------------------------------

# 13. ZERO-COST DEVELOPMENT PLAN

Core Buddy can be developed without paid hosting.

## Required

-   local development machine
-   Git
-   GitHub repository if CI is desired
-   open-source packages
-   browser developer tools

## Optional

-   GitHub Actions free allocation where available
-   GitHub Pages for public documentation if desired
-   Cloudflare R2/Workers only if future distribution needs require it
-   Supabase only if future cloud account/sync is introduced
-   Sentry only if future opt-in crash reporting is introduced

## Not required

-   VPS
-   paid server
-   paid database
-   paid API
-   paid AI API
-   paid cloud inference

------------------------------------------------------------------------

# 14. WHAT IS DEFERRED

Do not block the core product on:

-   accounts
-   subscriptions
-   Stripe
-   Supabase
-   cloud sync
-   cloud ML
-   hosted dashboard
-   remote telemetry
-   commercial license verification

These can be future modules.

------------------------------------------------------------------------

# 15. OPTIONAL FUTURE CLOUD ARCHITECTURE

If the product later grows:

``` text
Buddy Extension
      |
      +---- local core remains
      |
      +---- optional account
      |
      +---- optional sync
      |
      +---- optional enterprise service
```

Potential components from the original planning documents:

-   Supabase
-   Cloudflare Workers
-   Cloudflare R2
-   Stripe
-   Sentry
-   Upptime

But none should be required for core local operation.

------------------------------------------------------------------------

# 16. SITE CAPABILITY MATRIX

  -----------------------------------------------------------------------------------
  Site            Global     Active Media time     Shorts/Reels      Focus     Limits
                blocking       time                                        
  ----------- ---------- ---------- ---------- ---------------- ---------- ----------
  YouTube            Yes        Yes        Yes           Shorts        Yes        Yes

  Instagram          Yes        Yes        Yes            Reels        Yes        Yes

  Facebook           Yes        Yes        Yes            Reels        Yes        Yes

  Spotify Web      Yes\*        Yes        Yes              ---        Yes        Yes

  TikTok             Yes        Yes        Yes       Short-form        Yes        Yes

  Reddit             Yes        Yes        Yes              ---        Yes        Yes

  X                  Yes        Yes        Yes              ---        Yes        Yes

  Twitch             Yes        Yes        Yes              ---        Yes        Yes

  Generic            Yes        Yes        Yes   Site-dependent    Generic        Yes
  sites                                                                    
  -----------------------------------------------------------------------------------

`*` Spotify Web Player capabilities must be tested against the actual
web implementation and supported filter rules.

------------------------------------------------------------------------

# 17. DATA MODEL

## Site

``` ts
interface SiteProfile {
  id: string;
  domainPatterns: string[];
  category: ActivityCategory;
  capabilities: SiteCapabilities;
}
```

## Watch session

``` ts
interface WatchSession {
  id: string;
  platform: PlatformId;
  contentType: ContentType;
  startedAt: number;
  endedAt?: number;
  activeMs: number;
  mediaMs: number;
}
```

## Daily aggregate

``` ts
interface DailyStats {
  date: string;
  totalActiveMs: number;
  totalMediaMs: number;
  focusMs: number;
  blockedAds: number;
  blockedTrackers: number;
  platformTotals: Record<string, number>;
}
```

------------------------------------------------------------------------

# 18. PRIVACY DATA FLOW

``` text
Website
   |
   v
Content Script
   |
   v
Local Adapter
   |
   v
Local Event
   |
   v
Watch-Time / Activity Engine
   |
   v
Local Aggregator
   |
   v
Dashboard
```

No cloud hop is required.

------------------------------------------------------------------------

# 19. SECURITY DATA FLOW

``` text
Website input
     |
     v
UNTRUSTED
     |
     v
Validate
     |
     v
Normalize
     |
     v
Typed internal object
     |
     v
Policy engine
```

Never reverse this trust boundary.

------------------------------------------------------------------------

# 20. VERTICAL-SLICE DEVELOPMENT RULE

Do not build all frontend first.

Do not build all AI first.

Do not build all infrastructure first.

Build complete vertical slices.

Example:

``` text
Slice 1:
YouTube
  -> adapter
  -> watch-time
  -> local storage
  -> dashboard
  -> test

Slice 2:
Instagram
  -> adapter
  -> Reels tracking
  -> storage
  -> dashboard
  -> test

Slice 3:
Facebook
  -> adapter
  -> Reels tracking
  -> storage
  -> dashboard
  -> test
```

This produces real working increments.

------------------------------------------------------------------------

# 21. PHASE HANDOFF RULE

At the end of each phase create:

``` text
docs/phases/PHASE-X-REPORT.md
```

It must contain:

1.  What was implemented
2.  Files changed
3.  Dependencies added
4.  Open-source components used
5.  License status
6.  Tests executed
7.  Test results
8.  Known failures
9.  Performance results
10. Security results
11. Remaining work
12. Exit-gate decision

------------------------------------------------------------------------

# 22. MASTER DEFINITION OF DONE

Buddy is not "finished" merely because all planned files exist.

The product reaches launch readiness when:

``` text
Architecture works
AND
Build works
AND
Tests work
AND
E2E works
AND
Browser packages work
AND
Site adapters work
AND
Global filtering works
AND
Watch-time is accurate within defined observable limits
AND
Dashboard matches local data
AND
Family processing remains local
AND
Security checks pass
AND
License checks pass
AND
Privacy checks pass
AND
Documentation matches implementation
```

------------------------------------------------------------------------

# 23. MASTER LOOP-ENGINEERING PROMPT

Use the following prompt with the coding agent for every phase.

``` text
You are the lead engineer for the Buddy Extension Suite.

You must work directly inside the existing Buddy repository.

Do NOT create a toy implementation.
Do NOT create pseudo-code where working code is required.
Do NOT rebuild mature open-source technology unnecessarily.
Do NOT add paid services.
Do NOT add mandatory hosting.
Do NOT add a mandatory database.
Do NOT create a separate web application for runtime functionality.

PROJECT PRINCIPLES:
- enterprise-grade
- production-oriented
- local-first
- privacy-first
- open-source-first
- zero-cost core operation
- Chromium MV3 + Firefox MV3
- TypeScript
- WXT
- pnpm
- Turborepo
- Preact
- Vitest
- WXT Fake Browser
- Playwright
- browser DNR
- adblock-rust
- LiteRT.js where local ML is required

CURRENT PHASE:
[INSERT PHASE NUMBER AND NAME]

PHASE OBJECTIVE:
[INSERT OBJECTIVE]

TASKS:
[INSERT EXACT TASK LIST]

FIRST:
1. Inspect the current repository.
2. Read existing implementation before modifying anything.
3. Identify what already works.
4. Identify missing pieces.
5. Check package versions.
6. Search existing dependencies before adding new ones.
7. Check open-source alternatives before writing custom code.
8. Check licenses.
9. Produce a short implementation plan.

THEN IMPLEMENT:
1. Work incrementally.
2. Keep architecture modular.
3. Keep browser-specific code isolated.
4. Keep site-specific code inside site adapters.
5. Keep network blocking separate from DOM behavior.
6. Keep all user data local unless an explicitly approved optional cloud module exists.
7. Do not introduce unnecessary infrastructure.
8. Preserve existing working behavior.

TEST AFTER EACH MEANINGFUL CHANGE:
- lint
- typecheck
- unit tests
- integration tests
- build
- relevant E2E tests

IF A TEST FAILS:
1. Inspect the actual error.
2. Identify root cause.
3. Fix the root cause.
4. Re-run the failed test.
5. Run related regression tests.
6. Run the full phase suite before completion.

DO NOT:
- ignore test failures
- suppress TypeScript errors
- disable lint rules without justification
- remove tests merely to make CI green
- use fake data to simulate success
- claim a site feature works without testing it
- claim ad blocking is universal when the actual filter engine cannot guarantee it
- treat a browser tab being open as watch time
- upload browsing content
- add secrets to source code
- copy GPL code into runtime
- use proprietary APIs when an open-source/local option exists

SITE ADAPTER RULE:
A site adapter must fail independently.
If YouTube breaks, Instagram, Shield and Dashboard must continue working.

WATCH-TIME RULE:
Measure only observable activity.
Separate:
- active time
- media time
- session time
- idle time
- background time

PRIVACY RULE:
No URLs, page contents, private messages, screenshots or images may leave the device for core functionality.

VALIDATION:
After implementation execute:
1. unit tests
2. integration tests
3. build
4. E2E
5. security scan
6. license scan
7. artifact inspection
8. manual smoke test where applicable

FINAL RESPONSE:
Return:
- implementation summary
- files changed
- dependencies added
- open-source components reused
- license implications
- tests executed
- exact test results
- E2E results
- known limitations
- unresolved failures
- performance observations
- security observations
- phase exit-gate status

Do not say "complete" unless the exit criteria actually pass.

If something cannot be implemented reliably, document it honestly and implement the safest tested fallback.
```

------------------------------------------------------------------------

# 24. PHASE-SPECIFIC LOOP PROMPTS

## Phase 0 prompt

``` text
Implement Phase 0 only.

Build the monorepo foundation:
- pnpm
- Turborepo
- TypeScript strict mode
- WXT
- four extension apps
- shared-types
- ui-components
- i18n
- mood-engine skeleton
- watch-time foundation
- activity-engine foundation
- focus-engine foundation
- site-adapter interface
- storage abstraction
- Vitest
- WXT Fake Browser
- Playwright foundation
- GitHub Actions

Do not implement full Shield, Focus, Family or Dashboard functionality yet.

Definition of done:
- clean install
- typecheck
- lint
- unit tests
- builds
- Chromium package
- Firefox package
- CI green
- documented architecture
```

## Phase 1 prompt

``` text
Implement Phase 1 only.

Build the filter ingestion pipeline:
- upstream filter retrieval
- license metadata
- normalization
- validation
- @adguard/dnr-converter build-time integration
- DNR generation
- cosmetic data
- scriptlet resources
- rule deduplication
- rule count validation
- deterministic artifacts
- GPL quarantine
- tests

Do not build the full Shield UI yet.

Definition of done:
- compile command works
- valid rulesets generated
- rule limits validated
- malformed inputs handled
- deterministic output verified
- runtime artifact license scan passes
```

## Phase 2 prompt

``` text
Implement Phase 2 only.

Build Buddy Shield:
- Chromium DNR
- Firefox filtering path
- cosmetic filtering
- scriptlets
- popup
- per-site pause
- allowlist
- block statistics
- settings
- filter update mechanism

Do not implement site wellbeing features in this phase.

Definition of done:
- real extension loads
- supported ads/trackers are blocked
- site pause works
- allowlist works
- Chromium and Firefox smoke tests pass
- regression tests pass
```

## Phase 3 prompt

``` text
Implement Phase 3 only.

Build Buddy Focus and the common cross-site wellbeing architecture.

Required:
- watch-time engine
- activity engine
- focus policy engine
- generic media adapter
- YouTube adapter
- Instagram adapter
- Facebook adapter
- Spotify Web adapter
- TikTok adapter
- Reddit adapter
- X adapter
- Twitch adapter
- watch limits
- warnings
- doomscroll pattern detection
- site capability registry

Do not use a single hardcoded YouTube implementation for all sites.

Definition of done:
- every adapter has matching tests
- watch time is observable and locally stored
- Reels/Shorts are separate when detectable
- generic media fallback works
- site failures are isolated
- focus policies are modular
- E2E tests pass for available environments
```

## Phase 4 prompt

``` text
Implement Phase 4 only.

Build:
- Dashboard
- local analytics
- Chart.js integration
- Mood Engine
- Buddy Pet
- streaks
- focus reports
- platform reports
- block reports

Dashboard must consume actual local events.

Do not fabricate statistics.

Definition of done:
- dashboard values match stored events
- charts work
- mood is deterministic
- pet state is deterministic
- streaks persist
- offline mode works
```

## Phase 5 prompt

``` text
Implement Phase 5 only.

Build Buddy Family:
- LiteRT.js
- offscreen inference
- quantized model integration
- MutationObserver
- IntersectionObserver
- image candidate pipeline
- blur/block
- domain policies
- profiles
- parental PIN
- bedtime scheduler
- sensitivity settings

Keep all image classification local.

Definition of done:
- model loads
- local inference works
- blur/block works
- profiles work
- PIN works
- bedtime works
- ML failure does not crash Buddy
- no image leaves the device
```

## Phase 6 prompt

``` text
Implement Phase 6 only.

Build enterprise management:
- storage.managed
- managed settings
- organization policies
- site restrictions
- focus limits
- category controls
- deployment documentation
- Chrome Enterprise / Google Workspace / Intune compatibility layer

Do not add cloud telemetry merely for enterprise functionality.

Definition of done:
- managed policy works
- user cannot override enforced policy
- policy changes propagate
- restart preserves policy
- aggregate reporting contains no private browsing data
```

## Phase 7 prompt

``` text
Implement Phase 7 only.

Build:
- English
- Tamil
- Arabic
- RTL
- accessibility
- reduced motion
- keyboard navigation
- screen-reader labels
- UI polish
- performance optimization

Do not alter core behavior unnecessarily.

Definition of done:
- translations complete
- RTL works
- accessibility checks pass
- performance does not regress
```

## Phase 8 prompt

``` text
Implement Phase 8 only.

Perform final:
- security audit
- permission audit
- license audit
- GPL runtime scan
- privacy audit
- dependency audit
- artifact inspection
- Chromium E2E
- Firefox E2E
- performance validation
- store compliance preparation
- release packaging

Do not hide failures.

Definition of done:
- all quality gates pass
- release artifacts are reproducible
- documentation matches actual behavior
- known limitations are documented
- final release checklist is complete
```

------------------------------------------------------------------------

# 25. FINAL RELEASE CHECKLIST

## Architecture

-   [ ] Monorepo
-   [ ] Shared packages
-   [ ] Four extensions
-   [ ] Site adapter system
-   [ ] Watch-time engine
-   [ ] Activity engine
-   [ ] Focus engine
-   [ ] Local storage
-   [ ] Local ML

## Shield

-   [ ] DNR
-   [ ] adblock-rust
-   [ ] filter pipeline
-   [ ] cosmetic filtering
-   [ ] scriptlets
-   [ ] per-site controls
-   [ ] allowlist
-   [ ] block counts

## Focus

-   [ ] YouTube
-   [ ] Instagram
-   [ ] Facebook
-   [ ] Spotify Web
-   [ ] TikTok
-   [ ] Reddit
-   [ ] X
-   [ ] Twitch
-   [ ] generic media
-   [ ] watch time
-   [ ] limits
-   [ ] focus
-   [ ] warnings

## Dashboard

-   [ ] analytics
-   [ ] charts
-   [ ] pet
-   [ ] mood
-   [ ] streaks
-   [ ] blocked statistics
-   [ ] platform breakdown

## Family

-   [ ] LiteRT
-   [ ] local inference
-   [ ] blur
-   [ ] block
-   [ ] profiles
-   [ ] PIN
-   [ ] bedtime
-   [ ] privacy

## Enterprise

-   [ ] managed storage
-   [ ] policy controls
-   [ ] deployment documentation
-   [ ] aggregate reporting

## Quality

-   [ ] unit
-   [ ] integration
-   [ ] E2E
-   [ ] security
-   [ ] license
-   [ ] performance
-   [ ] privacy
-   [ ] browser compatibility

------------------------------------------------------------------------

# 26. FINAL PRODUCT RULE

The project must never drift back into:

``` text
YouTube blocker only
```

The intended final architecture is:

``` text
                    BUDDY
                      |
        +-------------+-------------+
        |             |             |
      SHIELD        FOCUS         FAMILY
        |             |             |
    Global web    Cross-site      Local AI
    protection    wellbeing       safety
        |             |             |
        +-------------+-------------+
                      |
                  DASHBOARD
                      |
          +-----------+-----------+
          |           |           |
         Pet        Mood      Analytics
```

And the Focus layer must be extensible:

``` text
SiteAdapter
   |
   +-- YouTube
   +-- Instagram
   +-- Facebook
   +-- Spotify Web
   +-- TikTok
   +-- Reddit
   +-- X
   +-- Twitch
   +-- Generic
   +-- Future sites
```

The global filtering layer remains independent:

``` text
Filter Lists
     |
Filter Pipeline
     |
DNR / adblock-rust
     |
Entire Web
```

------------------------------------------------------------------------

# 27. FINAL ENGINEERING PHILOSOPHY

**Build once. Reuse everywhere.**

**Measure only what is observable.**

**Keep private data local.**

**Use open source before custom code.**

**Keep site-specific logic isolated.**

**Test continuously.**

**Fix root causes instead of suppressing failures.**

**Do not promise unsupported browser/site behavior.**

**Do not add infrastructure until the product genuinely needs it.**

**Do not call a phase complete until its exit gate passes.**

------------------------------------------------------------------------

# 28. FINAL STATUS MODEL

Every phase should have exactly one status:

``` text
NOT_STARTED
IN_PROGRESS
BLOCKED
VALIDATING
PASSED
FAILED
```

Only:

``` text
PASSED
```

allows the next phase to begin.

------------------------------------------------------------------------

# 29. PHASE REPORT TEMPLATE

Use this after every phase:

``` markdown
# Buddy Phase X Report

## Status
PASSED / FAILED / BLOCKED

## Objective

## Implemented

## Files Changed

## Dependencies Added

## Open-Source Components

## License Review

## Unit Tests

## Integration Tests

## E2E Tests

## Security Tests

## Performance Tests

## Manual Tests

## Known Limitations

## Remaining Bugs

## Regression Status

## Exit Criteria

- [ ] criterion
- [ ] criterion
- [ ] criterion

## Final Decision

PASSED / FAILED / BLOCKED
```

------------------------------------------------------------------------

# 30. MASTER COMPLETION CRITERIA

The Buddy project is ready for release only after all phases satisfy
their gates.

``` text
PHASE 0 PASSED
      ↓
PHASE 1 PASSED
      ↓
PHASE 2 PASSED
      ↓
PHASE 3 PASSED
      ↓
PHASE 4 PASSED
      ↓
PHASE 5 PASSED
      ↓
PHASE 6 PASSED
      ↓
PHASE 7 PASSED
      ↓
PHASE 8 PASSED
      ↓
FINAL RELEASE AUDIT
      ↓
RELEASE
```

# END OF MASTER PHASE-BY-PHASE IMPLEMENTATION PLAN
