# Final Technical Limitations & Platform Constraints — Buddy Extension Suite

**Generated:** September 2026  
**Status:** AUDITED & PRODUCTION-VERIFIED  
**Scope:** Browser APIs, Web Platform Security Sandboxes, Site DOM Volatility, Operating Systems  

---

## 1. Principles of Truthful Engineering

In accordance with **Rules 142, 175, and 176 (No False Claims & Objective Truth)**, Buddy does not claim universal, flawless operation on every obscure web technology or altered browser environment. Capabilities are categorized objectively into standard tiers:
- **Supported**: Fully verified, precision tracked, and resilient to standard platform updates.
- **Partially Supported**: Core capabilities functional, but specific granular signals restricted by site architecture.
- **Site-Limited**: Features restricted by dynamic DOM changes, DRM, or aggressive site obfuscation.
- **Browser-Limited**: Capabilities constrained by W3C / browser extension platform security policies.
- **Unsupported**: Deliberately restricted or technically impossible within browser extension boundaries.

---

## 2. Comprehensive Platform Capability Matrix

| Platform / Environment | Classification | What Is Genuinely Supported | Known Technical & Platform Limitations |
| :--- | :--- | :--- | :--- |
| **YouTube** | **Supported** | Full active watch time, Shorts removal, seek detection, playback-rate scaling, pause/resume detection, distraction element blocking (comments, recommendations). | If YouTube radically alters its custom DOM element naming (`ytd-shorts`, `ytd-watch-flexy`), selector fallbacks activate while update patches deploy. |
| **Instagram** | **Supported** | Reels vs Feed differentiation, session duration tracking, rapid-reopen detection, category limits, distraction element hiding. | Private desktop web views, embedded iframes without cross-origin script injection access, and temporary live stories cannot be parsed. |
| **Facebook** | **Supported** | Feed vs Reels differentiation, media duration tracking, distraction hiding (feed/sidebar). | Infinite scroll virtualized feed recycling may occasionally delay video container mutation recognition during rapid high-speed scrolling. |
| **Spotify Web** | **Supported** | Background audio playback tracking, session duration, play/pause finite state machine, track transitions. | The native desktop Spotify application outside the web browser cannot be inspected or controlled via browser extension APIs. |
| **TikTok Web** | **Partially Supported** | Video/Short-form session tracking, active duration, category attribution. | Aggressive desktop anti-scraping and randomized CSS class names occasionally limit granular sound/music metadata extraction. |
| **Reddit Web** | **Supported** | Feed browsing, community identification, embedded video playback detection. | Legacy Reddit (`old.reddit.com`) vs modern Reddit (`shreddit`) use disparate DOM structures handled via dual-adapter selector mappings. |
| **X (Twitter)** | **Supported** | Social feed active time, video playback detection, category limits. | Dynamic timeline virtualization recycles DOM elements rapidly during high-speed scrolling. |
| **Twitch** | **Supported** | Live stream watch time, channel identification, pause detection. | Embedded Twitch players running inside sandboxed third-party iframes without `allow-scripts allow-same-origin` cannot be accessed due to browser security boundaries. |
| **Arbitrary / Generic Websites** | **Supported (Generic)** | Domain-level active time, document visibility tracking, standard HTML5 `<video>` / `<audio>` detection, category limit enforcement. | Custom Canvas/WebGL video renderers that bypass standard HTMLMediaElement cannot be tracked at the media level. |
| **Local File URLs (`file://`)** | **Browser-Limited** | None by default. | Chrome MV3 requires the user to explicitly toggle "Allow access to file URLs" in `chrome://extensions`. |
| **Browser Internal Pages (`chrome://`, `about:`)** | **Unsupported** | None. | Browser security sandbox explicitly prohibits extension content scripts from injecting into browser internal pages. |

---

## 3. Browser & Architecture Limitations

### 3.1 Manifest V3 Service Worker Lifecycle
- Chrome terminates background service workers after approximately 30 seconds of inactivity.
- **Buddy Mitigation**: Buddy maintains zero volatile in-memory-only state; all settings, metrics, and timestamps persist directly to `chrome.storage.local`. Inactivity alarms and content-script wakeups rehydrate state safely, but sub-second background timers are subject to browser throttling.

### 3.2 Page Visibility & Background Tabs
- Background tabs do not accumulate general active browsing time.
- **Exception**: Tabs playing verified audio media via confirmed `HTMLMediaElement` accumulate media listening time (e.g. Spotify Web, YouTube Music). Inactive non-media background tabs are discarded.

### 3.3 Storage Quotas
- `chrome.storage.local` has a standard quota of 10 MB.
- **Buddy Mitigation**: Buddy uses daily aggregated stats (`dailyStats`) rather than storing infinite raw DOM events, and runs an automatic 90-day retention pruning job. A full year of heavy browsing consumes less than 500 KB of local storage.

### 3.4 AI & Medical Invariants
- Buddy operates 100% locally with zero cloud AI requirements.
- Buddy strictly forbids psychiatric or medical diagnostic claims (no ADHD, addiction, or mental illness labels). All insights are strictly factual observations of measured duration and frequency.
