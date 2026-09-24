# BUDDY EXTENSION SUITE — PHASE 1 INITIAL AUDIT

**Document:** `docs/phases/PHASE-1-INITIAL-AUDIT.md`  
**Date:** 2026-09-22  
**Scope:** Repository Audit for Phase 1 Filter Ingestion & DNR Compilation Pipeline  
**Auditor:** Principal Browser-Extension Engineer, Ad-Blocking Engineer & License Compliance  

---

## 1. Executive Summary

Phase 0 completed the monorepo foundation, shared types, storage layer, watch-time state machine, activity engine, focus engine, site-adapters, mood engine, i18n, UI components, and 4 MV3 extension applications (Buddy Shield, Buddy Focus, Buddy Family, Buddy Dashboard).

The objective of **Phase 1** is to build the **quarantined, reproducible, local-first filter data ingestion and DNR compilation pipeline**. Phase 1 produces browser-ready declarative Net Request (DNR) JSON rulesets, metadata manifests, and coverage reports to be consumed by Phase 2 (Buddy Shield runtime blocking).

---

## 2. Existing Filter & DNR Infrastructure

A full repository audit was conducted across all files and configuration:

1. **`apps/buddy-shield/wxt.config.ts`**:
   - Declares `declarativeNetRequest` permission in Manifest V3.
   - Currently does not declare static rulesets (`rule_resources`), awaiting Phase 1 compiled output artifacts.

2. **Master Architecture Documents** (`BUDDY-MASTER-ENTERPRISE-DOCUMENT.md`, `BUDDY-MASTER-FINAL.md`, `Buddy-Extension-Phase-Plan.md`):
   - Explicitly designed Phase 1 as a quarantined build-time pipeline (`packages/filter-pipeline`).
   - Specifically specified `@adguard/dnr-converter` (GPLv3 quarantined) and `@adguard/filters-downloader` (LGPLv3 quarantined) for build-time generation.
   - Mandated strict legal barrier: **Zero GPL in runtime binaries** — runtime extensions consume pure declarative JSON data artifacts (`ruleset_ads.json`, `ruleset_trackers.json`, `ruleset_annoyances.json`).

3. **Current Missing Infrastructure**:
   - `packages/filter-pipeline` package does not yet exist.
   - `tools/filter-pipeline` CLI commands do not yet exist.
   - `data/filters/`, `data/generated/`, `data/manifests/` directories do not yet exist.
   - Filter Source Registry, Downloader, Normalizer, Parser/Validator, Converter, Deduplicator, Manifest Generator, and Coverage Reporter do not yet exist.
   - Test fixtures for filter rules (adblock syntax, hosts, exceptions, cosmetic, invalid syntax) do not yet exist.

---

## 3. Dependency & License Audit

| Package / Artifact | Current Version | License | Role | Legal Context |
| :--- | :--- | :--- | :--- | :--- |
| `@adguard/dnr-converter` | `1.1.2` | **GPL-3.0-only** | Build-time compilation | Quarantined in `packages/filter-pipeline`; never bundled into extension runtime. |
| `@adguard/filters-downloader` | `2.4.5` | **GPL-3.0** | Build-time fetching | Quarantined in `packages/filter-pipeline`; isolated in build tooling. |
| `@adguard/agtree` | `4.2.1` | **MIT** | AST Parser & Validator | Build-time parsing & validation utility. |
| `valibot` / `zod` | `1.x` / `3.x` | **MIT** | Schema validation | Type validation. |
| Upstream Filter Lists | N/A | **CC BY-SA 3.0 / GPLv3 / Public Domain** | Input data sources | Must document licenses in `docs/filters/LICENSES.md` & `data/generated/filter-licenses.json`. Generated declarative net request rulesets are pure declarative configuration data. |

---

## 4. Phase 0 Verification & Health Check

1. **TypeScript Build (`pnpm -r run typecheck`)**:
   - All 13 packages and apps typecheck with zero errors.
2. **Unit & Integration Tests (`pnpm test`)**:
   - 9 test files, 56 tests passing (100%).
   - Repaired quiet-hours time sensitivity in `mood-engine.test.ts` and `cross-extension-flow.test.ts` to ensure deterministic execution 24 hours a day.
3. **WXT Application Builds (`pnpm --filter buddy-shield run build`, `build:firefox`)**:
   - Cleanly builds Chrome MV3 and Firefox MV3 packages in under 1 second.

---

## 5. Phase 1 Required Architecture & Target Directory Structure

```text
packages/
└── filter-pipeline/
    ├── src/
    │   ├── sources/        # FilterSource typed registry & category definitions
    │   ├── downloader/     # HTTP fetcher with retry, backoff, limits & integrity checks
    │   ├── cache/          # Local content-addressed cache (SHA-256)
    │   ├── normalizer/     # Safe text & line-ending normalization (BOM, CRLF, comments)
    │   ├── parser/         # Adblock rule parser & AST syntax validator
    │   ├── converter/      # DeclarativeNetRequest rule generator
    │   ├── deduplicator/   # Safe deterministic semantic & rule ID deduplicator
    │   ├── validator/      # DNR schema & browser limit constraint validator
    │   ├── metadata/       # Source & license metadata generator
    │   ├── artifacts/      # File packaging & Buddy Shield asset synchronization
    │   └── index.ts        # Programmatic API export
    ├── tests/              # Unit & integration tests
    └── package.json        # Private package with explicit license quarantine notice

tools/
└── filter-pipeline/
    ├── fetch/
    ├── convert/
    ├── validate/
    └── scripts/

data/
├── filters/                # Local cache of upstream lists
├── generated/              # Compiled DNR rulesets, manifest.json, report.json, licenses.json
└── manifests/

docs/
├── filters/
│   ├── SOURCES.md          # Upstream source catalog & justification
│   ├── PIPELINE.md         # Pipeline architectural specification
│   ├── LICENSES.md         # Complete license manifest & quarantine boundary
│   └── TROUBLESHOOTING.md  # Failure modes & resolution guide
└── phases/
    ├── PHASE-1-INITIAL-AUDIT.md
    └── PHASE-1-REPORT.md
```

---

## 6. Exit Criteria for Phase 1

- [ ] Filter source registry defined with strictly typed metadata (EasyList, EasyPrivacy, Peter Lowe, uBO filters).
- [ ] Safe downloader with HTTPS enforcement, SSRF prevention, size caps, atomic writes, and SHA-256 checksums.
- [ ] Offline fixture mode allowing deterministic tests without network access.
- [ ] Normalization, parsing, syntax validation, rule deduplication, and DNR conversion.
- [ ] Browser limit compliance checking (Chromium 30,000 static rules per ruleset ceiling, aggregate budget).
- [ ] Generated artifacts: `ruleset_ads.json`, `ruleset_trackers.json`, `ruleset_annoyances.json`, `filter-manifest.json`, `filter-licenses.json`, `filter-report.json`.
- [ ] Reproducibility test: Pipeline run A vs run B on identical inputs produces bit-for-bit identical output artifacts.
- [ ] 100% license quarantine verification: Zero GPL in runtime extension bundles.
- [ ] Comprehensive test suite passing (unit, integration, property-based, security, reproducibility).
