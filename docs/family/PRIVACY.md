# Family Privacy Specification — Buddy Extension Suite

**Generated:** September 2026  
**Status:** VALIDATED  
**Architecture:** Zero-Cloud, Zero-Surveillance, Local Storage Only  

---

## 1. Guiding Philosophy: Guidance Over Surveillance

Many parental control applications operate as intrusive spyware, logging every keystroke, URL, screenshot, and private message. Buddy takes an ethical stance:

> **Family management must foster cooperative digital wellness and habit formation, not totalitarian surveillance.**

---

## 2. Explicit Privacy Guarantees

### 2.1 What Buddy STORES Locally
All stored data is kept strictly inside the browser's sandboxed `chrome.storage.local`:
1. **Pseudonymous Profiles:** Local display name (e.g. "Leo", "Mom") and role (`parent` / `child`).
2. **Policy Configuration:** Domain rules (e.g. `tiktok.com`), allowed categories, bedtime schedules, and daily minute allowances.
3. **Daily Summaries:** Aggregated minutes spent per broad category (Social, Video, Music) and total active time.
4. **Access Requests:** Domain name and optional child justification string (e.g. `khanacademy.org`, "Math homework").
5. **Cryptographic Verifiers:** Salt and PBKDF2 hash of the Parent PIN.

### 2.2 What Buddy NEVER Records or Stores
- **NO Full URLs:** Only normalized domain names (e.g. `youtube.com`, never video IDs or search queries).
- **NO Page Titles or Document Contents:** Never extracts or stores DOM text or page metadata.
- **NO Search History:** Search engine queries are never logged.
- **NO Private Messages or Social Posts:** Zero access to chat logs or form inputs.
- **NO Keystrokes or Form Values:** Keystrokes are never logged.
- **NO Screenshots or Webcams:** Zero screen capture or media recording.
- **NO Plaintext Passwords or PINs:** Plaintext secrets are strictly prohibited.

### 2.3 What LEAVES The Device
- **ABSOLUTELY NOTHING.**
- There are no cloud APIs, no backend database endpoints, no telemetry pings, and no analytics beacons.
- Buddy operates 100% offline at ₹0 cost.

---

## 3. Data Minimization Comparison

| User Action | Traditional Surveillance App | Buddy Family Approach |
| :--- | :--- | :--- |
| **Child watches YouTube** | Logs video URL, video title, channel name, search terms, comments viewed. | Records active playback time in `DailySummary.mediaMs` and `DailySummary.platformStats['youtube']`. |
| **Child visits blocked site** | Captures full URL, screenshot of screen, timestamp, alert sent to cloud server. | Blocks navigation locally, increments local `DailySummary.limitsReached`, presents optional polite access request. |
| **Parent reviews child usage** | Reviews chronological timeline of every website visited throughout the day. | Reviews high-level habit metrics: total screen time, media duration, focus time, and bedtime adherence. |
