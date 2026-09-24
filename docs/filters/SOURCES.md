# Buddy Shield — Filter Sources Catalog & Architecture

**Document:** `docs/filters/SOURCES.md`  
**Pipeline:** Phase 1 Filter Ingestion  
**License Compliance:** Strictly Enforced  

---

## 1. Source Selection Philosophy

Buddy Shield provides global, zero-latency ad and tracker protection for Chromium MV3 and Firefox MV3. In accordance with Buddy's core principles:
1. **Zero-Cost:** Only publicly accessible, authoritative, open-source filter lists with permissive or standard open-source licenses are ingested.
2. **Local-First:** Filter lists are compiled into browser-native Declarative Net Request (DNR) static rulesets and bundled directly with the extension runtime.
3. **No Private Surveillance:** Ingested filter lists protect user privacy by terminating tracking beacons and surveillance telemetry at the browser network kernel level.
4. **Accuracy & High Performance:** Only well-maintained, mature lists with active community curation and low false-positive rates are selected.

---

## 2. Authoritative Source Catalog

| Source ID | Name | Category | License | Upstream Maintainer | Authoritative Repository / URL | Target Ruleset |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `easylist` | **EasyList Standard** | `ADS` | GPLv3 / CC BY-SA 3.0 | EasyList Community | `https://easylist.to/` / GitHub | `ruleset_ads.json` |
| `easyprivacy` | **EasyPrivacy** | `TRACKERS` | GPLv3 / CC BY-SA 3.0 | EasyList Community | `https://easylist.to/` / GitHub | `ruleset_trackers.json` |
| `peter-lowe` | **Peter Lowe's Ad & Tracking Server List** | `ADS` | CC BY 3.0 | Peter Lowe | `https://pgl.yoyo.org/adservers/` | `ruleset_ads.json` |
| `ublock-filters` | **uBlock Origin Filters** | `ADS` | GPLv3 | Raymond Hill & uAssets Team | `https://github.com/uBlockOrigin/uAssets` | `ruleset_ads.json` |
| `ublock-privacy` | **uBlock Origin Privacy** | `TRACKERS` | GPLv3 | Raymond Hill & uAssets Team | `https://github.com/uBlockOrigin/uAssets` | `ruleset_trackers.json` |
| `ublock-annoyances`| **uBlock Origin Annoyances** | `ANNOYANCES` | GPLv3 | Raymond Hill & uAssets Team | `https://github.com/uBlockOrigin/uAssets` | `ruleset_annoyances.json` |

---

## 3. Category Definitions

- **`ADS`**: General network-level advertising servers, video ad markers, third-party banners, promotional injection scripts, and sponsored frame embeds.
- **`TRACKERS`**: Web beacons, fingerprinting endpoints, behavioral analytics collectors, telemetry endpoints, and cross-site user trackers.
- **`ANNOYANCES`**: Non-ad web distractions, cookie consent popups (GDPR/CCPA overlay walls), newsletter prompt overlays, push notification prompts, and sticky mobile app banners.
- **`MALWARE`**: Phishing domains, drive-by malware download origins, cryptojacking scripts, and scam redirect networks.

---

## 4. Ingestion & Update Lifecycle

1. **Scheduled Weekly Sync:**
   - Evaluated weekly or on-demand via `pnpm filters:update`.
   - Downloads source content over secure HTTPS with exponential backoff and integrity checks.
2. **Local Content-Addressed Caching:**
   - Raw source texts are cached in `data/filters/<source-id>.txt` alongside metadata manifests (`<source-id>.meta.json`).
   - SHA-256 cryptographic hashes prevent redundant network transfers and verify data integrity.
3. **Offline Fixture Fallback:**
   - In environments without live internet access (e.g. CI runners, airgapped build environments), the pipeline falls back to offline fixtures in `tests/fixtures/` and cache files, ensuring 100% build reproducibility.
