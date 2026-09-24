# Privacy Architecture & Data Minimization Specification — Buddy Extension Suite

**Generated:** September 2026  
**Audited By:** Principal Privacy & Security Engineering Team  
**Status:** AUDITED & PRIVACY-FIRST COMPLIANT  

---

## 1. Core Privacy Manifesto

Buddy is architected under the uncompromising principle of **Local-First, Zero-Telemetry Privacy**:
1. **Zero External Servers**: Buddy operates completely offline. No browsing history, site events, watch durations, or analytics are ever transmitted to any remote server or cloud service.
2. **Zero Commercial Analytics**: Buddy includes 0 third-party tracking scripts, 0 telemetry beacons, and 0 user profiling SDKs.
3. **Zero Monetization of Data**: User data belongs solely to the user and resides strictly on the local machine.

---

## 2. Data Collection & Minimization Matrix

| Data Category | Collected? | Stored Locally? | Leaves Device? | Purpose & Implementation |
| :--- | :---: | :---: | :---: | :--- |
| **Domain / Origin** | **Yes** | Yes (`dailyStats`) | **NO** | Aggregates daily browsing time per domain to display usage analytics. |
| **Clean URL (Path)** | **Minimal** | No (Session only) | **NO** | Used only during active session to distinguish sub-features (e.g. `/shorts/` vs `/watch`). Stripped of all query parameters. |
| **URL Query Parameters** | **NO** | **NO** | **NO** | All parameters (`utm_*`, `fbclid`, tokens, passwords, keys) are stripped before event normalization. |
| **Page Text / Body** | **NO** | **NO** | **NO** | Buddy never reads, indexes, or parses page text, articles, or messages. |
| **Form Inputs & Keystrokes** | **NO** | **NO** | **NO** | Content scripts do not attach listeners to input, textarea, password, or form elements. |
| **Passwords / Credit Cards** | **NO** | **NO** | **NO** | Zero collection or access to sensitive credentials. |
| **Cookies & Session Tokens** | **NO** | **NO** | **NO** | Extension does not inspect, read, or store web cookies. |
| **Active Watch Time** | **Yes** | Yes (Aggregated) | **NO** | Measures video/audio active playback seconds using HTMLMediaElement state machine. |
| **Shield Block Counters** | **Yes** | Yes (Counter) | **NO** | Increments local integer counter of ads and trackers blocked per day. |
| **Parental PIN** | **Yes** | Yes (Hashed) | **NO** | Stored as local cryptographic SHA-256 hash in storage for family control authorization. |

---

## 3. URL Privacy & Sanitization

In accordance with **Rule 19**:
1. When an activity event occurs, `BaseSiteAdapter.sanitizeUrl()` purges all tracking and session tokens:
   - Query parameter prefixes purged: `utm_`, `fbclid`, `gclid`, `igshid`, `mc_cid`, `mc_eid`, `_hsenc`, `_hsmi`.
   - Exact query keys purged: `token`, `auth`, `access_token`, `session`, `sessionid`, `api_key`, `key`, `secret`, `password`, `pwd`.
2. Normalized activity events store only:
   ```ts
   cleanUrl: url.origin + url.pathname
   domain: normalizeDomain(url.hostname)
   ```
3. Long-term historical storage (`dailyStats`) stores only domain-level and category-level aggregates (`totalActiveSeconds`, `categorySeconds`), discarding all pathnames.

---

## 4. Storage Security & Automatic Data Retention

1. **Storage Mechanism**: All local data is persisted to `chrome.storage.local`.
2. **Short-Term vs Long-Term Aggregation**:
   - Raw activity events are buffered in memory and aggregated incrementally into daily summaries.
   - Raw individual events are never retained indefinitely.
3. **Automatic 90-Day Retention Pruning**:
   - `StorageClient.pruneOldData(90)` runs on service worker startup and via daily alarm (`buddy-daily-maintenance`).
   - Daily summaries older than 90 days are automatically removed.
   - Decision audit logs are capped at 200 items.
   - Behavioral patterns are capped at 100 items.
   - Insights are capped at 50 items.

---

## 5. Complete User Data Control: Export & Wipe

### 5.1 Real Data Export
- The user can export their entire stored analytics at any time via the Dashboard or background message `EXPORT_DATA`.
- Returns a structured JSON bundle including schema version, timestamp, daily statistics, and settings.
- No synthetic or fabricated records are ever introduced.

### 5.2 Complete Privacy Data Wipe (Reset)
- The user can execute a complete data purge via the Dashboard or background message `RESET_ALL_DATA`.
- Instantly clears:
  - All daily statistics (`dailyStats`)
  - All active and historical insights (`insights`)
  - All detected behavioral patterns (`patterns`)
  - All policy decision logs (`decisionLogs`)
  - All smart coach break states (`smartBreakState`)
  - Resets companion pet score to default
- Restarting the browser or reloading the extension confirms that cleared records do not return.
