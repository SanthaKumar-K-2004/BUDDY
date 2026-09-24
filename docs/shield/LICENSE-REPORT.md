# Buddy Shield: License Audit & Boundary Report

## 1. Compliance Statement

Buddy Shield adheres to strict license separation principles:
1. **Zero GPL Code in Runtime**: The browser extension bundle contains zero GPL-3.0 or AGPL code.
2. **Build-Time Quarantine**: Any tooling under GPL (such as `@adguard/dnr-converter`) is isolated in `packages/filter-pipeline` under `devDependencies`.
3. **Runtime Permissiveness**: All runtime libraries bundled into the browser extensions are licensed under **MIT**, **Apache-2.0**, or **MPL-2.0** (file-level copyleft).

---

## 2. Runtime Dependency Ledger

Inspection of `apps/buddy-shield/.output/chrome-mv3/` and `apps/buddy-shield/.output/firefox-mv3/`:

| Dependency / Package | License | In Runtime Bundle? | Permitted? |
| :--- | :--- | :--- | :--- |
| `preact` | MIT | Yes (UI) | **YES** |
| `@ghostery/adblocker-content` | MPL-2.0 | Yes (Content Script) | **YES** (File-level copyleft, no virality) |
| `@ghostery/adblocker` | MPL-2.0 | Yes (Selectors) | **YES** |
| `@ghostery/url-parser` | MPL-2.0 | Yes | **YES** |
| `tldts-experimental` | MIT | Yes | **YES** |
| `@remusao/smaz` | MIT / Apache-2.0 | Yes | **YES** |
| `@buddy/shared-types` | MIT | Yes (Internal) | **YES** |
| `@buddy/storage` | MIT | Yes (Internal) | **YES** |
| `@buddy/ui-components` | MIT | Yes (Internal) | **YES** |
| `@buddy/shield-core` | MIT | Yes (Internal) | **YES** |
| `@buddy/shield-policy` | MIT | Yes (Internal) | **YES** |
| `@buddy/shield-stats` | MIT | Yes (Internal) | **YES** |
| `@buddy/shield-dnr` | MIT | Yes (Internal) | **YES** |
| `@buddy/shield-cosmetic` | MIT | Yes (Internal) | **YES** |
| `@adguard/dnr-converter` | GPL-3.0 | **NO (Quarantined in filter-pipeline)** | **YES** (Build-time only) |

---

## 3. Automated License Verification

Buddy includes an automated boundary verification script (`tools/shield/verify-runtime-license.sh`), executed via:
```bash
pnpm shield:audit-licenses
```

### Verification Log
```text
==========================================
Buddy Shield: Runtime License Boundary Audit
==========================================
Inspecting Chrome MV3 bundle artifacts...
Chrome MV3 bundle: Clean (0 GPL references detected).
Inspecting Firefox MV3 bundle artifacts...
Firefox MV3 bundle: Clean (0 GPL references detected).
==========================================
PASSED: Zero GPL Runtime Contamination.
==========================================
```

### Result: 100% PASSED. Zero GPL runtime contamination.
