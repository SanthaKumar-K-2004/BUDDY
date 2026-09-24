# Phase 7 Technical Limitations & Platform Constraints — Buddy Extension Suite

**Generated:** September 2026  
**Status:** COMPLETED & AUDITED  
**Scope:** Browser APIs, Operating Systems, Site DOM Structure, Storage Quotas, and Model Inference  

---

## 1. Overview & Honest Engineering Disclosures

In accordance with **Rules 129 and 130 (No False Claims)**, this document details the objective technical boundaries and operational limits of the Buddy Extension Suite Phase 7 engine. Buddy does not claim universal, flawless operation on every obscure web technology or altered browser environment. Instead, capabilities are categorized objectively as **Supported**, **Partially Supported**, or **Unsupported**.

---

## 2. Site & Platform Capability Matrix

| Platform / Website | Capability Classification | Supported Capabilities | Known Technical Limitations |
| :--- | :--- | :--- | :--- |
| **YouTube** | **Supported** | Full active watch time, Shorts detection, seek handling, playback rate scaling, pause/resume detection. | If YouTube alters its custom DOM element structure (`ytd-shorts`, `video.html5-main-video`), adapter selectors require periodic alignment. |
| **Instagram** | **Supported** | Reels vs Feed differentiation, session time, rapid-reopen detection, category limits. | Private desktop web views or embed iframes without cross-origin script access cannot be inspected. |
| **Facebook** | **Supported** | Reels vs Feed differentiation, session time, media duration tracking. | Infinite scroll feed layout changes may temporarily delay video container mutation recognition. |
| **Spotify Web** | **Supported** | Background music duration, play/pause state machine, track transitions. | Desktop app usage outside the browser cannot be captured via web extension APIs. |
| **TikTok Web** | **Partially Supported** | Video/Short-form session tracking, active duration, category attribution. | Aggressive anti-bot/anti-scraping obfuscation on desktop web occasionally prevents granular sound metadata extraction. |
| **Reddit Web** | **Supported** | Feed browsing, community identification, embedded video playback detection. | Old Reddit (`old.reddit.com`) vs new Reddit (`shreddit`) utilize disparate DOM hierarchies handled via fallback selectors. |
| **X (Twitter)** | **Supported** | Social feed active time, video playback detection, category limits. | Dynamic timeline virtualization recycles DOM elements rapidly during high-speed scrolling. |
| **Twitch** | **Supported** | Live stream watch time, channel identification, pause detection. | Embedded Twitch players within third-party domains running under restricted sandbox iframes are restricted by browser security policies. |
| **Arbitrary / Generic Websites** | **Generic Support** | Domain-level active time, document visibility tracking, standard HTML5 `<video>` / `<audio>` detection. | Custom Canvas/WebGL video renderers that do not expose standard HTMLMediaElement cannot be tracked at the media level. |
| **Local File URLs (`file://`)** | **Unsupported** | None by default. | Chrome MV3 requires explicit user toggle in `chrome://extensions` ("Allow access to file URLs"). |
| **Browser Internal Pages (`chrome://`, `about:`)** | **Unsupported** | None. | Browser security sandbox explicitly prohibits extension content scripts from injecting into browser internal pages. |

---

## 3. Browser & System Limitations

### 3.1 Service Worker Lifecycle & Dormancy
- **Manifest V3 Worker Termination**: Chrome terminates MV3 background service workers after ~30 seconds of inactivity. Buddy circumvents state loss by persisting all state immediately to `chrome.storage.local`. Inactivity alarms and content-script wakeups rehydrate state safely, but millisecond-level background timers are subject to browser suspension.

### 3.2 Page Visibility & Background Tabs
- In accordance with Phase 6 active-time principles, background tabs do not accumulate general active browsing time. Only active, focused tabs (or background tabs playing audio via confirmed HTMLMediaElement) accumulate media listening time.

### 3.3 Storage Quotas & Performance
- `chrome.storage.local` has a standard quota of 10 MB (or 100 MB with `unlimitedStorage`).
- Buddy employs incremental daily aggregations (`dailyStats`) rather than storing infinite raw DOM events, keeping total storage usage below 500 KB for an entire year of browsing.

---

## 4. AI & Inference Boundaries

1. **Zero Cloud Dependency**: Buddy does NOT rely on any paid or mandatory cloud AI service.
2. **Deterministic Fallback**: All baseline statistics, trend formulas, pattern detection, and policy decisions are 100% deterministic local algorithms.
3. **No Psychological Inference**: Buddy strictly rejects any request or model output attempting to diagnose psychiatric conditions (e.g. ADHD, addiction, depression).
4. **Hallucination Guard**: Any optional local LLM summary is audited against measured statistics before presentation. The AI layer has zero permission to mutate policies, bypass parental restrictions, or disable Shield protection.
