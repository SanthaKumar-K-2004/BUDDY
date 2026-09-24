# Buddy Shield — Filter Ingestion & Coverage Report

**Generated:** 2026-09-22T17:06:14.820Z  
**Pipeline Status:** OPERATIONAL — ALL INTEGRITY CHECKS PASSED  

---

## 1. Executive Summary

| Metric | Count |
| :--- | :--- |
| **Total Registered Sources** | 5 |
| **Total Raw Input Lines** | 70 |
| **Syntactically Valid Rules** | 41 |
| **Invalid / Errored Rules** | 0 |
| **Comments / Metadata Ignored** | 29 |
| **Compiled DeclarativeNetRequest Rules** | 37 |

---

## 2. Ruleset Budgets & Chromium MV3 Limits

Chromium Manifest V3 enforces strict declarativeNetRequest limits: maximum 30,000 static rules per ruleset, and maximum 1,000 regex rules per ruleset.

| Ruleset ID | Total Rules | Regex Rules | Safe / Unsafe | Status | % of Static Ceiling |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ruleset_ads** | 23 | 0 | 23 / 0 | PASS | 0% |
| **ruleset_trackers** | 14 | 0 | 14 / 0 | PASS | 0% |

---

## 3. Coverage by Category

| Category | Sources | Raw Lines | Valid Parsed Rules | Compiled DNR Rules |
| :--- | :--- | :--- | :--- | :--- |
| **ADS** | 3 | 46 | 27 | 23 |
| **TRACKERS** | 2 | 24 | 14 | 14 |

---

## 4. Source Breakdown

| Source ID | Source Name | Category | Total Lines | Valid Rules | Network Rules | Hosts Rules | Cosmetic Rules | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `easylist` | EasyList Standard | ADS | 29 | 16 | 13 | 2 | 3 | 0 |
| `easyprivacy` | EasyPrivacy Tracking Protection | TRACKERS | 19 | 11 | 11 | 0 | 0 | 0 |
| `peter-lowe` | Peter Lowe's Ad and Tracking Server List | ADS | 9 | 5 | 5 | 0 | 0 | 0 |
| `ublock-filters` | uBlock Origin Filters | ADS | 8 | 6 | 5 | 0 | 1 | 0 |
| `ublock-privacy` | uBlock Origin Privacy | TRACKERS | 5 | 3 | 3 | 0 | 0 | 0 |
