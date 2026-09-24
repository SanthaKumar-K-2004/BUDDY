# Phase 6: Site Support & Capability Matrix

## 1. Overview

Buddy Phase 6 implements the **Universal Web Activity Intelligence Engine** with a modular site adapter architecture. Each site adapter declares explicit, validated capabilities and executes real-world DOM and media element observations.

No synthetic activity, simulated timers, or fake capabilities are permitted. Capabilities are marked `Supported` only after validation against real browser DOM patterns and media elements.

---

## 2. Universal Capability Matrix

| Platform | Category | Ad/Tracker Blocking (Shield) | Standard Video | Shorts / Vertical Video | Reels | Music Playback | Feed Session | Watch Time Engine | Precision Active Time | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **YouTube** | `video` | Supported (Shield Core) | Supported | Supported | N/A | N/A | Supported | Supported | Supported | **Supported** |
| **Instagram** | `social` | Supported (Shield Core) | Supported | Supported | Supported | N/A | Supported | Supported | Supported | **Supported** |
| **Facebook** | `social` | Supported (Shield Core) | Supported | Supported | Supported | N/A | Supported | Supported | Supported | **Supported** |
| **Spotify** | `music` | Supported (Shield Core) | N/A | N/A | N/A | Supported | N/A | Supported (Audio) | Supported (Bg Audio) | **Supported** |
| **TikTok** | `social` | Supported (Shield Core) | Supported | Supported | N/A | N/A | Supported | Supported | Supported | **Supported** |
| **Reddit** | `social` | Supported (Shield Core) | Supported | Supported | N/A | N/A | Supported | Supported | Supported | **Supported** |
| **X (Twitter)**| `social` | Supported (Shield Core) | Supported | Supported | N/A | N/A | Supported | Supported | Supported | **Supported** |
| **Twitch** | `gaming` | Supported (Shield Core) | Supported | N/A | N/A | N/A | N/A | Supported | Supported | **Supported** |
| **Generic Web**| `other` | Supported (Shield Core) | Supported | N/A | N/A | N/A | N/A | Supported | Supported | **Supported (Fallback)** |

---

## 3. Site-Specific Technical Details & Selectors

### 3.1 YouTube (`YouTubeAdapter`)
- **Category:** `video`
- **Shorts Detection:**
  - URL route pattern: `/shorts/`
  - DOM Selectors: `#shorts-container`, `ytd-shorts`, `ytd-rich-shelf-renderer[is-shorts]`, `ytd-reel-shelf-renderer`
- **Distraction Hiding Selectors:**
  - Recommendations: `#related`, `#secondary`, `ytd-watch-next-secondary-results-renderer`, `ytd-rich-grid-renderer:not([is-shorts])`
  - Comments: `#comments`, `ytd-comments`
- **Media Detection:** Primary `video.html5-main-video`
- **Ad Blocking:** Integrated through Phase 1/2 Buddy Shield (DNR filter rules + cosmetic engine).

### 3.2 Instagram (`InstagramAdapter`)
- **Category:** `social`
- **Reels Detection:**
  - URL route pattern: `/reels/`, `/reel/`
  - DOM Selectors: `a[href*="/reels/"]`, `a[aria-label="Reels"]`, `div[role="dialog"] video`, `div._ab18`
- **Feed & Distractions:**
  - Feed: `main[role="main"] article`, `div._aaoo`
  - Comments: `ul._a9z6`, `div[role="dialog"] ul._a9ym`
- **Platform Limitation Note:** Instagram SPA navigation changes routes dynamically; hooked into `pushState`, `replaceState`, and `popstate`.

### 3.3 Facebook (`FacebookAdapter`)
- **Category:** `social`
- **Reels Detection:**
  - URL route pattern: `/reel/`
  - DOM Selectors: `div[aria-label*="Reels"]`, `a[href*="/reel/"]`, `div[data-pagelet*="Reels"]`
- **Feed & Comments:**
  - Feed: `div[role="feed"]`, `div[data-pagelet*="Feed"]`
  - Comments: `div[aria-label*="Comment"]`, `div[aria-label*="comments"]`

### 3.4 Spotify (`SpotifyAdapter`)
- **Category:** `music`
- **Capabilities:**
  - Background audio listening enabled (`allowBackgroundAudio: true`). When the Spotify web player tab is hidden or backgrounded, listening time is accurately accrued rather than marked as idle.
  - Distraction hiding: `section[data-testid="playlist-recommended"]`, `aside[aria-label="Friend Activity"]`, `section[data-testid="track-recommendations"]`
- **Ad Blocking Integration:**
  - Handled via Phase 1/2 Shield network filters. Does not invent private APIs or inject synthetic scripts.

### 3.5 Generic Web Fallback (`GenericMediaAdapter`)
- **Category:** `other` (dynamically classified via `classifyDomain`)
- **Capabilities:**
  - Active tab and window focus presence tracking.
  - Media discovery for standard `<video>` and `<audio>` tags.
  - Inactivity timeout and conservative session accounting.

---

## 4. Platform Limitations & Non-Claims

1. **No Proprietary Internal Access**: Buddy does not claim to intercept private encrypted platform telemetry or private backends. All observations use standard Web APIs (`HTMLMediaElement`, `MutationObserver`, `document.visibilityState`, and URL routing).
2. **Dynamic Webpage Changes**: Websites frequently update obfuscated class names. Buddy uses semantic selectors (`role`, `aria-label`, data attributes, tag names) and degrades gracefully to generic media and session observation when selectors are unavailable.
3. **No 100% Ad Blocking Guarantee**: Ad networks evolve continuously; Shield provides layered declarative NetRequest rules and CSS cosmetic filters with transparent telemetry.
