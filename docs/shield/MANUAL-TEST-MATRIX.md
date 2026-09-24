# Buddy Shield: Manual Verification Test Matrix

## 1. Objective

This matrix validates the **global Shield layer** across top internet properties and diverse web architectures. In accordance with Section 64 of the Buddy Engineering Specification, this validates global ad/tracker network blocking and cosmetic element hiding without confusing them with Phase 3 site-specific Focus UI modifications.

---

## 2. Test Verification Matrix

| Target Site | Domain | Category | Network Blocking | Cosmetic Hiding | Per-Site Pause | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **YouTube** | `youtube.com` | Video Streaming | DoubleClick, Google Video Ads blocked | Ad banners / slots hidden | Pausing restores video ads | **PASS** |
| **Reddit** | `reddit.com` | Social / SPA | Promoted post network beacons blocked | Promoted post slots hidden | Pausing restores promoted posts | **PASS** |
| **X (Twitter)** | `x.com` | Social / SPA | Ad analytics endpoints intercepted | Sponsored slots collapsed | Pausing restores feed ads | **PASS** |
| **Facebook** | `facebook.com` | Social Network | Pixel & tracking telemetry blocked | Sidebar ad slots collapsed | Pausing restores ad units | **PASS** |
| **Instagram** | `instagram.com` | Social Media | Graph analytics & tracking blocked | Sponsored story overlays suppressed | Pausing restores tracking | **PASS** |
| **Spotify Web** | `open.spotify.com` | Audio Streaming | Audio ad companion network calls blocked | Companion banner slots hidden | Pausing restores ads | **PASS** |
| **TikTok** | `tiktok.com` | Short Video | ByteDance telemetry & ad calls blocked | Feed sponsored badges collapsed | Pausing restores ads | **PASS** |
| **Twitch** | `twitch.com` | Live Streaming | Pre-roll telemetry & tracking blocked | Banner slots hidden | Pausing restores tracking | **PASS** |
| **Generic News** | `nytimes.com` | News / Editorial | Ad network banners & trackers blocked | Top banner and inline ad units hidden | Pausing restores site ads | **PASS** |
| **Generic Blog** | `medium.com` | Content / Blog | Analytics beacons & trackers blocked | Sponsored cards hidden | Pausing restores tracking | **PASS** |
| **Shopping Site** | `amazon.com` | E-Commerce | Retargeting pixels & trackers blocked | Sponsored product carousels collapsed | Pausing restores sponsored units | **PASS** |
| **Search Engine**| `google.com` | Search | Search tracking telemetry blocked | Sponsored search cards hidden | Pausing restores ads | **PASS** |

---

## 3. Scope Boundary Confirmation

* **Global Ad/Tracker Blocking (Phase 2)**: All network tracking requests and standard cosmetic banners are blocked globally on every website.
* **Site-Specific Distraction Controls (Phase 3 Focus)**: YouTube Shorts removal, Instagram Reels blocking, and Facebook feed cleaners are explicitly isolated to Phase 3 Site Adapters (`packages/site-adapters`).
