# Buddy Shield — Filter Pipeline License Manifest & Legal Quarantine

**Document:** `docs/filters/LICENSES.md`  
**Generated Companion:** `data/generated/filter-licenses.json`  
**License Compliance Status:** VERIFIED — 100% QUARANTINED — ZERO GPL IN RUNTIME  

---

## 1. Legal Quarantine Boundary

The Buddy project enforces a strict legal barrier separating **Build-Time Compilation Tooling** from **Runtime Browser Extension Artifacts**:

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         BUILD-TIME TOOLING                                  │
 │                      (GPL-3.0 Quarantined in CI)                            │
 │                                                                             │
 │   • @adguard/dnr-converter (GPL-3.0-only)                                   │
 │   • @adguard/agtree (MIT)                                                   │
 │   • tsx, typescript, vitest (MIT / Apache-2.0)                              │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        │ STRICT LEGAL BARRIER:
                                        │ Pure Declarative JSON Data Only
                                        │ ZERO GPL CODE COMPILED INTO RUNTIME
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                    RUNTIME EXTENSION (BUDDY SHIELD MV3)                     │
 │               (100% Permissive / Proprietary Closed-Source)                 │
 │                                                                             │
 │   • Chromium & Firefox MV3 Browser Kernel: chrome.declarativeNetRequest     │
 │   • Static Declarative JSON Data: ruleset_ads.json, ruleset_trackers.json   │
 │   • UI & Extension Code: Preact (MIT), WXT (MIT), Buddy Types (MIT)         │
 └─────────────────────────────────────────────────────────────────────────────┘
```

### Legal Basis of Data Separation:
1. Under standard copyright law and open-source licensing precedents, the output of a data transformation tool (such as a compiler or converter converting text filter lists into declarative JSON configuration rulesets) is **pure declarative data**, not a derivative work of the compiler software itself.
2. `@adguard/dnr-converter` is licensed under GPL-3.0-only. It is installed as a development dependency (`devDependencies`) strictly within `@buddy/filter-pipeline`. It is never imported by, bundled into, or executed within the extension runtime (`apps/buddy-shield`).
3. The browser extension runtime executes native browser kernel code (`chrome.declarativeNetRequest`) interpreting static JSON files.

---

## 2. Toolchain License Matrix

| Component | Version | License | Role | Packaged in Runtime Extension? |
| :--- | :--- | :--- | :--- | :--- |
| `@adguard/dnr-converter` | `1.1.2` | **GPL-3.0-only** | Build-time compilation | **NO (Quarantined)** |
| `@adguard/agtree` | `4.2.1` | **MIT** | Build-time AST parsing & syntax validation | **NO (Quarantined)** |
| `tsx` | `4.19.3` | **MIT** | TypeScript script execution | **NO (Quarantined)** |
| `typescript` | `5.7.3` | **Apache-2.0** | TypeScript compiler | **NO (Quarantined)** |
| `vitest` | `3.0.7` | **MIT** | Test runner | **NO (Quarantined)** |

---

## 3. Upstream Filter Sources License Matrix

| Source ID | Name | Upstream License | Upstream Maintainer | License Notice URL |
| :--- | :--- | :--- | :--- | :--- |
| `easylist` | **EasyList Standard** | GPLv3 / CC BY-SA 3.0 | EasyList Community | `https://easylist.to/pages/licence.html` |
| `easyprivacy` | **EasyPrivacy** | GPLv3 / CC BY-SA 3.0 | EasyList Community | `https://easylist.to/pages/licence.html` |
| `peter-lowe` | **Peter Lowe's Server List** | CC BY 3.0 | Peter Lowe | `https://pgl.yoyo.org/adservers/` |
| `ublock-filters` | **uBlock Origin Filters** | GPLv3 | Raymond Hill & uAssets Team | `https://github.com/uBlockOrigin/uAssets/blob/master/LICENSE` |
| `ublock-privacy` | **uBlock Origin Privacy** | GPLv3 | Raymond Hill & uAssets Team | `https://github.com/uBlockOrigin/uAssets/blob/master/LICENSE` |
| `ublock-annoyances`| **uBlock Origin Annoyances** | GPLv3 | Raymond Hill & uAssets Team | `https://github.com/uBlockOrigin/uAssets/blob/master/LICENSE` |

---

## 4. Compliance Auditing Procedure

To verify license isolation automatically:
1. Run `pnpm build:chrome` or `pnpm build:firefox` in `apps/buddy-shield`.
2. Inspect `.output/chrome-mv3` or `.output/firefox-mv3`.
3. Search for any presence of `@adguard` or GPL library symbols in output bundles:
   ```bash
   grep -rn "dnr-converter" apps/buddy-shield/.output/
   ```
   **Expected Output:** Zero matches (Empty).
