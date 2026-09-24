# Buddy Shield: Declarative Net Request (DNR) Architecture

## 1. Declarative Net Request Overview

In Manifest V3 (MV3), network interception has moved from synchronous blocking `webRequest` to browser-native `declarativeNetRequest`. The browser executes filtering directly inside its optimized network pipeline in C++, eliminating JavaScript thread latency and IPC bottlenecks.

Buddy Shield registers two primary static rulesets:
1. **`ruleset_ads`** (`rulesets/ruleset_ads.json`): Blocking advertisement domains, third-party banners, popunder scripts, and ad exchange networks.
2. **`ruleset_trackers`** (`rulesets/ruleset_trackers.json`): Blocking analytics beacons, tracking pixels, fingerprinting endpoints, and telemetry servers.

---

## 2. Rule Structure and Schema

Every rule follows strict Declarative Net Request schema constraints:
```json
{
  "id": 10001,
  "priority": 1,
  "action": {
    "type": "block"
  },
  "condition": {
    "urlFilter": "||ad.doubleclick.net^",
    "resourceTypes": [
      "script",
      "image",
      "sub_frame",
      "xmlhttprequest",
      "ping"
    ]
  }
}
```

---

## 3. Rule ID Strategy & Partitioning

To avoid ID collisions and maintain deterministic reproducibility across builds:

| Rule Type | ID Range | Assigned By | Purpose |
| :--- | :--- | :--- | :--- |
| **Static Ads** | `1` – `9,999` | Phase 1 Packager | Baseline advertisement blocking rules. |
| **Static Trackers** | `10,001` – `19,999` | Phase 1 Packager | Baseline tracker & telemetry blocking rules. |
| **Dynamic Allowlist** | `20,000` – `99,999` | `DNRRulesetManager` | Per-site pause overrides using deterministic domain hash mapping. |

---

## 4. Per-Site Pause Implementation

A key architectural challenge in MV3 DNR is supporting per-site pause without turning off global rulesets for other tabs. Buddy Shield solves this cleanly via **Dynamic Allow Rules**:

When a user clicks "Pause on this site" for `example.com`:
1. `DNRRulesetManager.pauseSite('example.com')` calculates a deterministic rule ID from the domain name.
2. It calls `chrome.declarativeNetRequest.updateDynamicRules` to add an `allowAllRequests` rule:
   ```json
   {
     "id": 23456,
     "priority": 9999,
     "action": { "type": "allowAllRequests" },
     "condition": { "initiatorDomains": ["example.com"] }
   }
   ```
3. Because priority `9999` exceeds static rule priority (`1` or `2`), requests initiated by `example.com` are allowed.
4. All other browser tabs and domains continue to be blocked normally!
5. When resumed, `DNRRulesetManager.resumeSite('example.com')` removes rule `23456`.

---

## 5. Browser Limits Enforcement

The `DNRRulesetManager` enforces browser ceilings before rule additions:
- **Max Static Rules**: 30,000 rules per ruleset (Chromium limit: 30,000; total active: 300,000).
- **Max Dynamic Rules**: 5,000 rules (Buddy reserves `20,000` – `99,999`).
- **Max Regex Rules**: 1,000 rules.
- If dynamic rules exceed limits, `validateRulesetLimits()` reports diagnostics and prevents silent failure.
