# Phase 5 Open-Source License Report — Buddy Extension Suite

**Generated:** September 2026  
**Status:** AUDITED & COMPLIANT  
**Scope:** `@buddy/family-engine`, `apps/buddy-family`, `apps/buddy-dashboard`  

---

## 1. Executive Summary

Phase 5 introduced family profiles, parental limits, schedules, access requests, and cryptographic PIN authentication. In accordance with the **Open-Source-First & Zero-Cost Mandate**, mature platform standards were evaluated before considering external packages.

By leveraging the **W3C Web Cryptography API (`crypto.subtle`)** native to modern browser runtimes, Buddy Phase 5 required **ZERO new external third-party runtime dependencies**. All new code resides in the internal `@buddy/family-engine` workspace package.

---

## 2. Dependency Audit Table

| Package / API | Source / Repository | Version | License | Category | Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Web Crypto API (`crypto.subtle`)** | Native Browser Platform Standard | W3C Standard | N/A (Standard) | Runtime | Cryptographically secure PBKDF2 with SHA-256 derivation and random salt generation (`crypto.getRandomValues`). Avoids heavy external crypto libraries (e.g. `crypto-js`, `bcrypt`). |
| **`@buddy/shared-types`** | Internal Workspace Package (`packages/shared-types`) | `0.1.0` | MIT | Runtime | Shared TypeScript contracts (`FamilyProfile`, `FamilyPolicy`, `AccessRequest`, `ParentPinAuth`). |
| **`@buddy/family-engine`** | Internal Workspace Package (`packages/family-engine`) | `0.1.0` | MIT | Runtime | Core domain normalization, schedule calculation, policy evaluation, and PIN authentication. |
| **`preact`** | `https://github.com/preactjs/preact` | `^10.26.4` | **MIT** | Runtime | Fast 3 kB UI rendering for Dashboard and Family popups. |
| **`wxt`** | `https://github.com/wxt-dev/wxt` | `^0.19.27` | **MIT** | Build-time | Web Extension Framework targeting Chrome MV3 and Firefox MV3. |
| **`typescript`** | `https://github.com/microsoft/TypeScript` | `^5.7.3` | **Apache-2.0** | Build-time | Strict type-safety verification across all workspace packages. |
| **`vitest`** | `https://github.com/vitest-dev/vitest` | `^3.2.7` | **MIT** | Test-time | Fast unit and integration test runner. |

---

## 3. License Compliance Analysis

1. **Permissive Licensing:** All runtime code is governed by permissive **MIT** licenses or standard browser runtime APIs.
2. **Zero Copyleft / GPL Contamination:** No GPL, AGPL, LGPL, or SSPL code was imported or copied into the codebase.
3. **No Invented Repositories:** All packages correspond to authentic, published open-source repositories verified in the npm registry.
4. **Zero Cloud SDKs:** No AWS, GCP, Firebase, Supabase, or remote telemetry SDKs are present.
