# BUDDY EXTENSION SUITE — PHASE 0 DEPENDENCY & LICENSE AUDIT

**Document:** PHASE-0-DEPENDENCIES.md  
**Scope:** Phase 0 Monorepo, Shared Packages, Extension Applications, and Build Tooling  
**Policy:** Permissive Open Source (MIT / Apache-2.0 / BSD-3-Clause / ISC). **Zero GPL code in runtime bundles.**  
**Status:** VALIDATED — PASS

---

## 1. Executive Summary

Every runtime and build-time dependency in the Buddy Phase 0 codebase was audited for license compliance, bundle overhead, security vulnerabilities, and zero-cost constraints.
All runtime client code shipped inside the extension builds (`buddy-shield`, `buddy-focus`, `buddy-family`, `buddy-dashboard`) is strictly limited to lightweight, permissively licensed libraries (MIT / Apache 2.0).

---

## 2. Runtime Dependencies (Client-Side Extension Bundles)

| Package | Version | License | Purpose | Runtime / Build |
| :--- | :--- | :--- | :--- | :--- |
| `preact` | `^10.26.4` | **MIT** | Ultra-lightweight (3kB) virtual DOM UI framework for popups & side panel | Runtime |
| `@buddy/shared-types` | `0.1.0` | **MIT** (Internal) | Canonical typed contracts, schemas, event definitions | Runtime |
| `@buddy/storage` | `0.1.0` | **MIT** (Internal) | Type-safe `chrome.storage.local` abstraction with fallback | Runtime |
| `@buddy/watch-time` | `0.1.0` | **MIT** (Internal) | Reusable 6-state watch-time state machine | Runtime |
| `@buddy/activity-engine` | `0.1.0` | **MIT** (Internal) | 11-category platform classifier and activity tracker | Runtime |
| `@buddy/focus-engine` | `0.1.0` | **MIT** (Internal) | 3-tier watch limits evaluator & doomscroll detector | Runtime |
| `@buddy/site-adapters` | `0.1.0` | **MIT** (Internal) | Site adapter registry, resolver, and generic media adapter | Runtime |
| `@buddy/mood-engine` | `0.1.0` | **MIT** (Internal) | Deterministic behavioral mood score engine (0–100) | Runtime |
| `@buddy/i18n` | `0.1.0` | **MIT** (Internal) | Lightweight locale manager (EN, TA, AR RTL) | Runtime |
| `@buddy/ui-components` | `0.1.0` | **MIT** (Internal) | Reusable Preact component library & design tokens | Runtime |

**GPL Runtime Count:** 0  
**Proprietary Telemetry / Cloud SDKs:** 0

---

## 3. Development & Build-Time Tooling

| Package | Version | License | Purpose | Runtime / Build |
| :--- | :--- | :--- | :--- | :--- |
| `typescript` | `^5.7.3` | **Apache-2.0** | Static typing and compiler | Build-time |
| `wxt` | `^0.19.29` | **MIT** | Next-generation web extension framework (Vite-based) | Build-time |
| `vite` | `^6.4.3` | **MIT** | Fast frontend bundler used by WXT | Build-time |
| `vitest` | `^3.2.7` | **MIT** | Fast unit and integration test runner | Build-time |
| `turbo` (Turborepo) | `^2.4.4` | **MIT** | High-performance monorepo build orchestration | Build-time |
| `pnpm` | `12.5.1` | **MIT** | Fast, disk-space efficient package manager | Build-time |
| `playwright` | `^1.63.0` | **Apache-2.0** | Cross-browser end-to-end automation | Build-time / Test |
| `@playwright/test` | `^1.63.0` | **Apache-2.0** | End-to-end test runner | Build-time / Test |
| `@types/chrome` | `^0.0.308` | **MIT** | TypeScript type definitions for WebExtension APIs | Build-time |
| `@types/node` | `^22.13.9` | **MIT** | TypeScript type definitions for Node.js | Build-time |
| `@preact/preset-vite` | `^2.10.1` | **MIT** | Vite preset plugin for Preact compilation | Build-time |

---

## 4. GPL Compliance Assessment

1. **No GPL Dependencies in Runtime:** No GPLv2, GPLv3, or AGPLv3 packages are bundled into any extension artifact.
2. **Planned Phase 1 Adblock Engine:** When `adblock-rust` is introduced in Phase 1, it is licensed under **MPL-2.0** (Mozilla Public License 2.0) and compiled into standalone WebAssembly (`.wasm`), which is safely linked without contaminating proprietary or MIT components.
3. **Distribution Safety:** All extensions can be safely published on the Chrome Web Store and Mozilla Add-ons without license incompatibility or forced copyleft infections.
