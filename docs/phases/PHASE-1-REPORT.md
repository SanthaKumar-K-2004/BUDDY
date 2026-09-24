# Buddy Phase 1 Report — Filter Ingestion & DNR Compilation Pipeline

## Status
**PASSED** — All Exit Gates Satisfied

---

## Objective

Phase 1 establishes the **quarantined, reproducible, local-first filter-data ingestion and Declarative Net Request (DNR) compilation pipeline** for the Buddy Extension Suite. 

The pipeline ingests authoritative open-source ad and tracker filter lists, normalizes text directives, parses rules into Abstract Syntax Trees (AST), converts network blocking and exception rules into Chrome/Firefox MV3 `chrome.declarativeNetRequest` static rulesets, deduplicates semantically identical rules, allocates stable deterministic rule IDs, validates against browser rule ceilings, and outputs verified declarative JSON artifacts accompanied by cryptographic checksums and coverage reports.

All work strictly conforms to the project's non-negotiable constraints: **zero mandatory hosting, zero paid APIs, zero cloud databases, local-first execution, and a strict legal quarantine ensuring zero GPL tooling bleeds into the extension runtime.**

---

## Repository Changes

1. **`packages/filter-pipeline/` (New Quarantined Package):**
   - `src/sources/`: FilterSource typed definitions, category taxonomies, and authoritative registry (`registry.ts`).
   - `src/downloader/`: Secure HTTPS downloader with exponential backoff, SSRF prevention, and atomic file writes (`downloader.ts`).
   - `src/cache/`: Local content-addressed SHA-256 cache manager (`cache-manager.ts`).
   - `src/normalizer/`: BOM stripper, CRLF->LF standardizer, whitespace trimmer, and metadata extractor (`normalizer.ts`).
   - `src/parser/`: AST rule classifier distinguishing network block, exception, cosmetic, scriptlet, and hosts rules (`parser.ts`).
   - `src/converter/`: Chrome/Firefox MV3 Declarative Net Request rule generator (`dnr-converter.ts`).
   - `src/deduplicator/`: Semantic deduplicator with canonical condition signatures and stable sequential rule ID allocation (`deduplicator.ts`).
   - `src/validator/`: Schema validator enforcing Chromium 30,000 static rule and 1,000 regex rule limits (`validator.ts`).
   - `src/metadata/`: Generators for `filter-manifest.json`, `filter-licenses.json`, and `filter-report.json`.
   - `src/artifacts/`: Packager writing deterministic sorted JSON and synchronizing to `apps/buddy-shield/public/rulesets/`.
   - `src/cli/`: CLI commands for local build, live update, and ruleset validation.
   - `src/pipeline.ts`: Master orchestrator.

2. **`tools/filter-pipeline/` (New Monorepo CLI Infrastructure):**
   - `scripts/build.ts`, `scripts/update.ts`, `scripts/validate.ts`.
   - `fetch/fetch.ts`, `convert/convert.ts`, `validate/validate.ts`.

3. **`data/` (Local Pipeline Data):**
   - `data/filters/`: Local cache of downloaded filter lists.
   - `data/generated/`: `ruleset_ads.json`, `ruleset_trackers.json`, `filter-manifest.json`, `filter-licenses.json`, `filter-report.json`.

4. **`tests/fixtures/` & Tests:**
   - Fixtures: `easylist.txt`, `easyprivacy.txt`, `peter-lowe.txt`, `ublock-filters.txt`, `ublock-privacy.txt`, `ublock-annoyances.txt`, `synthetic-sample.txt`.
   - 9 new unit, integration, and reproducibility test suites (40 tests total).

5. **Extension Manifest Update (`apps/buddy-shield/wxt.config.ts`):**
   - Registered static rulesets `ruleset_ads` and `ruleset_trackers` under `declarative_net_request.rule_resources`.

6. **Documentation (`docs/filters/`, `docs/phases/`):**
   - `docs/filters/SOURCES.md`
   - `docs/filters/PIPELINE.md`
   - `docs/filters/LICENSES.md`
   - `docs/filters/TROUBLESHOOTING.md`
   - `docs/filters/FILTER-COVERAGE.md`
   - `docs/phases/PHASE-1-INITIAL-AUDIT.md`
   - `docs/phases/PHASE-1-REPORT.md`

---

## Filter Sources

| Source ID | Name | Category | License | Target Ruleset | Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `easylist` | EasyList Standard | ADS | GPLv3 / CC BY-SA 3.0 | `ruleset_ads.json` | Primary ad network blocking |
| `easyprivacy` | EasyPrivacy | TRACKERS | GPLv3 / CC BY-SA 3.0 | `ruleset_trackers.json` | Tracking and telemetry blocking |
| `peter-lowe` | Peter Lowe's Server List | ADS | CC BY 3.0 | `ruleset_ads.json` | Curated adserver hostnames |
| `ublock-filters` | uBlock Origin Filters | ADS | GPLv3 | `ruleset_ads.json` | Modern web ad filtering |
| `ublock-privacy` | uBlock Origin Privacy | TRACKERS | GPLv3 | `ruleset_trackers.json` | Additional privacy coverage |
| `ublock-annoyances` | uBlock Origin Annoyances | ANNOYANCES | GPLv3 | `ruleset_annoyances.json` | Cookie and overlay blocking (optional) |

---

## Open-Source Components

| Component | Version | License | Integration Context | Quarantined? |
| :--- | :--- | :--- | :--- | :--- |
| `@adguard/dnr-converter` | `1.1.2` | **GPL-3.0-only** | Build-time CLI conversion in `@buddy/filter-pipeline` | **YES** (Zero runtime exposure) |
| `@adguard/agtree` | `4.2.1` | **MIT** | Build-time AST parsing & syntax validation | **YES** (Zero runtime exposure) |
| `tsx` | `4.19.3` | **MIT** | TypeScript script execution | **YES** (Build-time only) |

---

## License Analysis

1. **GPL Quarantine Enforcement:**
   - `@adguard/dnr-converter` is GPL-3.0-only. It is restricted to `devDependencies` of `packages/filter-pipeline`.
   - It is never bundled into `apps/buddy-shield`.
   - Inspection of `.output/chrome-mv3` and `.output/firefox-mv3` confirms **0 bytes** of GPL code inside the extension runtime.
2. **Data vs Derivative Work:**
   - The compiled static DNR rulesets (`ruleset_ads.json`, `ruleset_trackers.json`) constitute declarative JSON data interpretations of public filtering criteria, not executable program code or derivative works of the compiler.

---

## Pipeline Architecture

```text
Filter Source Registry
         ↓
Downloader (HTTPS / SSRF prevention / 15MB cap)
         ↓
Local Cache (Content-Addressed SHA-256)
         ↓
Normalizer (BOM / CRLF / Whitespace / Metadata)
         ↓
Parser & AST Validator (@adguard/agtree)
         ↓
DNR Converter (@adguard/dnr-converter)
         ↓
Semantic Deduplicator & Stable Rule IDs
         ↓
Ruleset Validator (<= 30k static rules limit)
         ↓
Manifest & Coverage Report Generation
         ↓
Artifact Packaging & Sync to Buddy Shield
```

---

## Generated Artifacts

| Artifact | Location | Size | SHA-256 Checksum | Rule Count |
| :--- | :--- | :--- | :--- | :--- |
| `ruleset_ads.json` | `data/generated/`, `apps/buddy-shield/public/rulesets/` | 4.37 kB | `e4ec76536a3c6504f874bb1b1a80af98b409affccf192693f0eff8fcd2902bed` | 23 rules |
| `ruleset_trackers.json` | `data/generated/`, `apps/buddy-shield/public/rulesets/` | 2.84 kB | `452cbb50ab1794bc2a688531a276f3e25022e352b5e87309140485324a8d04c5` | 14 rules |
| `filter-manifest.json` | `data/generated/` | 2.99 kB | Validated | N/A |
| `filter-licenses.json` | `data/generated/` | 3.79 kB | Validated | N/A |
| `filter-report.json` | `data/generated/` | 3.40 kB | Validated | N/A |

---

## Rule Statistics

- **Raw Input Lines Ingested:** 70
- **Comments & Metadata Processed:** 33
- **Valid Rules Parsed:** 37
- **Compiled DeclarativeNetRequest Rules:** 37
  - `ruleset_ads`: 23 rules (Safe: 23, Unsafe: 0, Regex: 0, Static Budget: 0%)
  - `ruleset_trackers`: 14 rules (Safe: 14, Unsafe: 0, Regex: 0, Static Budget: 0%)
- **Exception Rules Priority:** Allocated at `100,000+` to ensure exceptions always take precedence over block rules.

---

## Validation Results

- **Chromium Static Rule Limits:** PASS (37 rules << 30,000 limit)
- **Chromium Regex Limits:** PASS (0 regex rules << 1,000 limit)
- **Rule ID Uniqueness:** PASS (All rule IDs are positive sequential integers without collisions)
- **Action & Condition Conformance:** PASS (All actions are `'block'` or `'allow'`, conditions contain valid `urlFilter` and resource types)

---

## Reproducibility Results

An automated bit-for-bit reproducibility test (`tests/integration/filter-pipeline/reproducibility.test.ts`) executed two independent pipeline runs with identical inputs and configuration:
- `ruleset_ads.json`: Identical SHA-256 (`e4ec765...`) across runs
- `ruleset_trackers.json`: Identical SHA-256 (`452cbb5...`) across runs
- `filter-manifest.json`: 100% string equality across runs
- `filter-licenses.json`: 100% string equality across runs

**Reproducibility Gate: PASSED.**

---

## Security Results

1. **SSRF Prevention:** All attempts to access `localhost`, `127.0.0.1`, `0.0.0.0`, `169.254.169.254`, `metadata.google.internal`, and RFC1918 private IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) are blocked before socket creation.
2. **Insecure Protocols:** Plaintext HTTP (`http://`) and foreign schemes (`ftp://`, `gopher://`) are strictly rejected.
3. **Resource Exhaustion Limits:** Max download size capped at 15MB. Responses exceeding limit are aborted immediately.
4. **HTML Error Response Detection:** Captive portal and CDN error pages returning HTML with 200 OK are detected and rejected.
5. **Atomic File Operations:** Temporary files prevent incomplete or interrupted writes from corrupting existing valid artifacts.

---

## Performance Results

Measured in `tests/unit/filter-pipeline/performance.test.ts` on 1,000 synthetic rules:
- **Normalization Latency:** 2.1 ms
- **AST Parsing Latency:** 14.8 ms
- **DNR Conversion Latency:** 89.4 ms
- **Deduplication Latency:** 1.2 ms
- **Validation Latency:** 0.8 ms
- **Total Pipeline Execution:** ~108 ms (well under 2-second threshold)

---

## Browser Validation

Both **Chromium MV3** and **Firefox MV3** builds compile cleanly and bundle the static rulesets:
1. **Buddy Shield Chrome MV3 (`pnpm --filter buddy-shield run build`):**
   - Output: `.output/chrome-mv3`
   - Bundles `rulesets/ruleset_ads.json` (4.37 kB) and `rulesets/ruleset_trackers.json` (2.84 kB)
   - Manifest declares `declarative_net_request.rule_resources`
   - Build duration: ~930 ms
2. **Buddy Shield Firefox MV3 (`pnpm --filter buddy-shield run build:firefox`):**
   - Output: `.output/firefox-mv3`
   - Bundles `rulesets/ruleset_ads.json` and `rulesets/ruleset_trackers.json`
   - Build duration: ~1.08 s

---

## Tests

Full regression suite: **18 test files, 96 tests, 96 passed (100%)**:
- `tests/unit/filter-pipeline/registry.test.ts`: 8/8 passed
- `tests/unit/filter-pipeline/downloader.test.ts`: 8/8 passed
- `tests/unit/filter-pipeline/normalizer.test.ts`: 5/5 passed
- `tests/unit/filter-pipeline/parser.test.ts`: 6/6 passed
- `tests/unit/filter-pipeline/converter-and-dedup.test.ts`: 3/3 passed
- `tests/unit/filter-pipeline/validator.test.ts`: 7/7 passed
- `tests/unit/filter-pipeline/performance.test.ts`: 1/1 passed
- `tests/integration/filter-pipeline/pipeline-integration.test.ts`: 1/1 passed
- `tests/integration/filter-pipeline/reproducibility.test.ts`: 1/1 passed
- All 9 Phase 0 test files (56 tests): 56/56 passed

---

## Problems Found & Fixed

1. **Turbo Assertion Failure on PTY:**
   - *Problem:* `turbo 2.11.2` native binary crashed with `assertion failed: output.write(&bytes).is_ok()` when parallel jobs wrote simultaneously to piped stdout.
   - *Fix:* Executed tasks recursively via `pnpm -r run typecheck` which runs in ~3 seconds cleanly without native pipe crashes.
2. **Mood Engine Time Sensitivity:**
   - *Problem:* `mood-engine.test.ts` failed when run after 10 PM because quiet hours automatically transitioned visual state to `'sleeping'`.
   - *Fix:* Added `vi.useFakeTimers()` set to 2 PM (daytime) during daytime state machine assertions.
3. **CommonJS vs ESM in Pipeline CLI:**
   - *Problem:* `tsx` attempted CommonJS loading for `@adguard/agtree`, which only exports ESM.
   - *Fix:* Added `"type": "module"` to `packages/filter-pipeline/package.json`.
4. **Cosmetic Rule vs Comment Parsing:**
   - *Problem:* Lines starting with `##` or `###` were prematurely categorized as `#` comments.
   - *Fix:* Updated comment detection to exclude cosmetic rule prefixes (`##`, `###`, `#@#`, `#?#`, `#%#`).
5. **DNR Converter Method Access:**
   - *Problem:* `convertSimple` is private in `@adguard/dnr-converter`.
   - *Fix:* Instantiated `new FilterConverter()` and invoked the public `convert()` method.

---

## Remaining Limitations

1. **Cosmetic Element Hiding Runtime:**
   - Phase 1 parses and preserves cosmetic element hiding selectors (`##.selector`), but cosmetic DOM injection runs via `adblock-rs` in Phase 2 content scripts.
2. **Scriptlet Injection Runtime:**
   - Scriptlet rules (`##+js(...)`) are extracted and categorized; execution requires Phase 2 scriptlet injection templates.

---

## Phase 2 Handoff

Phase 2 (Buddy Shield Core) can immediately consume the static rulesets:
1. **Rule Resources:** Located in `apps/buddy-shield/public/rulesets/ruleset_ads.json` and `ruleset_trackers.json`.
2. **Registration:** Pre-configured in `apps/buddy-shield/wxt.config.ts`.
3. **Dynamic Rule Allocation:** Phase 2 dynamic rules (e.g. user whitelist/blacklist, per-site pause) should allocate rule IDs at `>= 100,000,000` to avoid overlap with static ruleset IDs (`1..99,999`).

---

## Final Exit Gate

- [x] Phase 0 foundation remains healthy (all 56 Phase 0 tests passing)
- [x] Filter source registry exists with strictly typed metadata
- [x] Source licenses documented in `docs/filters/LICENSES.md` & `filter-licenses.json`
- [x] Downloader with HTTPS enforcement, timeouts, and backoff implemented
- [x] Download failure handling and cache fallback tested
- [x] Local content-addressed cache implemented with SHA-256 validation
- [x] Deterministic normalization stripping BOM, CRLF, and extracting headers
- [x] Parser with AGTree AST classification tested
- [x] Invalid rules detected and reported in diagnostics
- [x] Validation report generated (`filter-report.json`, `FILTER-COVERAGE.md`)
- [x] Semantic deduplication and deterministic sorting implemented
- [x] DNR conversion using `@adguard/dnr-converter` tested
- [x] DNR artifacts generated (`ruleset_ads.json`, `ruleset_trackers.json`)
- [x] Rule IDs deterministic, sequential, and unique
- [x] Chromium 30,000 rule and 1,000 regex limits checked
- [x] Manifest generated (`filter-manifest.json`)
- [x] Offline fixtures support hermetic testing without internet
- [x] 40/40 unit and integration tests passing in filter pipeline
- [x] Reproducibility gate passing (bit-for-bit identical SHA-256 output)
- [x] Security tests passing (SSRF, oversized responses, hostile input)
- [x] License review passing (100% quarantine, 0 bytes GPL in extension runtime)
- [x] Dependency review passing (clean workspace boundaries)
- [x] Performance smoke test passing (<200ms total pipeline on 1k rules)
- [x] Chromium-compatible artifacts validated and bundled
- [x] Firefox-compatible artifacts validated and bundled
- [x] Documentation complete (`SOURCES.md`, `PIPELINE.md`, `LICENSES.md`, `TROUBLESHOOTING.md`)
- [x] Phase 2 handoff contract documented
- [x] Full regression suite passes (18 test files, 96 tests, 100% green)

**PHASE 1 STATUS: PASSED**
