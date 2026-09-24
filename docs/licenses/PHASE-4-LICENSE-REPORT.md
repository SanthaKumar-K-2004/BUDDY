# Phase 4 Open-Source Dependency & License Report

## 1. Compliance Standard

In strict accordance with Sections 5, 6, 102, and 134 of the Phase 4 specification:
- Every open-source package has been verified for licensing compatibility (MIT, Apache 2.0, BSD-3-Clause).
- Zero GPL/AGPL contamination.
- Zero invented packages or unverified GitHub repositories.

---

## 2. Dependency Audit Table

| Package Name | Upstream Repository | Version | License | Usage Scope | Product Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `preact` | `https://github.com/preactjs/preact` | `^10.26.4` | **MIT** | Runtime | Lightweight 3kB reactive UI engine for popup & sidepanel |
| `wxt` | `https://github.com/wxt-dev/wxt` | `^0.19.27` | **MIT** | Build-time | Cross-browser MV3 build framework (Chrome, Firefox) |
| `@preact/preset-vite` | `https://github.com/preactjs/preset-vite` | `^2.10.1` | **MIT** | Build-time | Vite plugin for compiling Preact JSX components |
| `typescript` | `https://github.com/microsoft/TypeScript` | `^5.7.3` | **Apache-2.0** | Build-time | Static type safety and contract enforcement |
| `vitest` | `https://github.com/vitest-dev/vitest` | `^3.0.7` | **MIT** | Test-time | Unit, property, and integration test execution |

---

## 3. License Safety Verification

All dependencies utilized in Phase 4 are permissible for commercial and open-source distribution without viral copyleft obligations. No remote CDN scripts or runtime scripts are loaded.
