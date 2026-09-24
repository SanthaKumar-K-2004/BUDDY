# Buddy Shield — Filter Ingestion & DNR Compilation Pipeline

**Document:** `docs/filters/PIPELINE.md`  
**Package:** `packages/filter-pipeline`  
**Role:** Quarantined Build-Time Filter Ingestion, Conversion, and Verification  

---

## 1. Architectural Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BUILD-TIME CI / LOCAL PIPELINE                           │
│              (Quarantined in `packages/filter-pipeline`)                    │
│                                                                             │
│   1. FILTER SOURCE REGISTRY (`src/sources/`)                                │
│      Typed catalog (EasyList, EasyPrivacy, Peter Lowe, uBO Filters)         │
│      Validates IDs, HTTPS URLs, format, category, and license metadata.     │
│                                │                                            │
│                                ▼                                            │
│   2. ROBUST HTTPS DOWNLOADER & CACHE (`src/downloader/`, `src/cache/`)       │
│      - HTTPS-only enforcement & SSRF prevention (blocks private IPv4 / RFC1918) │
│      - Exponential backoff retry (3 attempts) & 15MB size ceiling           │
│      - Atomic writes via temporary files & SHA-256 integrity caching        │
│                                │                                            │
│                                ▼                                            │
│   3. NORMALIZER (`src/normalizer/`)                                         │
│      - Strips UTF-8 BOM, standardizes CRLF/CR to LF                         │
│      - Trims trailing whitespace & parses metadata directives (! Title...)  │
│      - Excludes cosmetic rule prefixes (##, #@#) from comment matching      │
│                                │                                            │
│                                ▼                                            │
│   4. AD-BLOCK PARSER & AST VALIDATOR (`src/parser/`)                        │
│      - Full AST syntax analysis via `@adguard/agtree`                       │
│      - Classifies rules: NETWORK_BLOCK, NETWORK_ALLOW, COSMETIC, HOSTS      │
│      - Produces line-by-line validation diagnostics (ERROR, WARNING, VALID) │
│                                │                                            │
│                                ▼                                            │
│   5. DNR CONVERTER (`src/converter/`)                                       │
│      - Converts network blocking and allow rules via `@adguard/dnr-converter`│
│      - Synthesizes hosts formats (127.0.0.1 domain) to ||domain^ syntax     │
│      - Generates typed chrome.declarativeNetRequest.Rule objects            │
│                                │                                            │
│                                ▼                                            │
│   6. DETERMINISTIC DEDUPLICATOR (`src/deduplicator/`)                       │
│      - Semantic rule deduplication based on canonical condition signature   │
│      - Stable sorting: priority descending, canonical condition ascending   │
│      - Assigns sequential deterministic 31-bit positive integer IDs (1..N)  │
│                                │                                            │
│                                ▼                                            │
│   7. RULESET VALIDATOR (`src/validator/`)                                   │
│      - Enforces Chromium MV3 limits: max 30,000 static rules per ruleset    │
│      - Enforces regex limit: max 1,000 regex rules per ruleset              │
│      - Checks rule ID uniqueness, action validity, and condition syntax     │
│                                │                                            │
│                                ▼                                            │
│   8. ARTIFACT PACKAGER & SYNC (`src/artifacts/`, `src/metadata/`)           │
│      - Serializes deterministic sorted JSON with 2-space indentation        │
│      - Generates filter-manifest.json, filter-licenses.json, filter-report.json│
│      - Copies compiled rulesets to `apps/buddy-shield/public/rulesets/`     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ STRICT LICENSE QUARANTINE:
                                       │ Declarative JSON Data Only
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RUNTIME EXTENSION (BUDDY SHIELD MV3)                     │
│                        Zero GPL in Extension Runtime                        │
│                                                                             │
│   Manifest static ruleset registration (`wxt.config.ts`):                  │
│   - ruleset_ads (`rulesets/ruleset_ads.json`)                               │
│   - ruleset_trackers (`rulesets/ruleset_trackers.json`)                     │
│   - ruleset_annoyances (`rulesets/ruleset_annoyances.json`)                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Command Reference

All commands are integrated into the monorepo root:

| Command | Action |
| :--- | :--- |
| `pnpm filters:build` | Hermetic local build from offline fixtures and cache. Compiles rulesets and generates manifests. |
| `pnpm filters:update` | Live fetch from upstream URLs over HTTPS, compiles fresh rulesets, updates cache and manifests. |
| `pnpm filters:validate` | Validates generated DNR JSON files against Chromium MV3 static rule limits and schema. |
| `pnpm filters:test` | Executes the complete 40-test filter pipeline unit and integration suite. |

---

## 3. Rule ID Strategy

Declarative Net Request requires every rule within a ruleset to possess a unique, positive integer ID (`id > 0` and `id <= 2147483647`).

1. **Semantic Signature:** Each rule is normalized into a canonical condition string (e.g. `100101:allow:u:||example.com/ad.js|rt:script`).
2. **Stable Sorting:** Rules are sorted by priority descending (ensuring exception rules appear first), and alphabetically by condition.
3. **Sequential Deterministic Allocation:** Rules are numbered starting from offset `1` (or partition base offset) sequentially.
4. **Reproducibility Guarantee:** Given identical input lists, identical rule IDs and rule ordering are generated on every run, guaranteed.

---

## 4. Phase 2 Handoff Contract

The output of Phase 1 is consumed directly by Phase 2 (Buddy Shield Core) without requiring Phase 2 to bundle any build tools:

1. **Static Ruleset Artifacts:**
   - `apps/buddy-shield/public/rulesets/ruleset_ads.json`
   - `apps/buddy-shield/public/rulesets/ruleset_trackers.json`
   - `apps/buddy-shield/public/rulesets/ruleset_annoyances.json`
2. **Manifest Declaration:**
   - Declared in `apps/buddy-shield/wxt.config.ts` under `manifest.declarative_net_request.rule_resources`.
3. **Dynamic Rule Offsets:**
   - Dynamic rules in Phase 2 should allocate rule IDs in range `100,000,000+` or use `chrome.declarativeNetRequest.updateDynamicRules` to avoid any collisions with static rules.
