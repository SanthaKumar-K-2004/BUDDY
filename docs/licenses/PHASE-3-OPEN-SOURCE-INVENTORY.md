# Phase 3 Open-Source Inventory & License Audit

## Overview
Buddy Extension Suite adheres strictly to a zero-GPL runtime policy and requires real, verifiable open-source dependencies with permissive licenses (MIT, Apache-2.0, BSD-3-Clause). No fake or invented package names exist in the codebase.

## Open Source Dependency Inventory

| Project | Repository | Version | License | Purpose | Runtime |
|---|---|---|---|---|---|
| **TypeScript** | https://github.com/microsoft/TypeScript | `^5.7.3` | Apache-2.0 | Type safety, compilation, declarations | No (Build) |
| **WXT** | https://github.com/wxt-dev/wxt | `^0.19.29` | MIT | Cross-browser MV3 build framework (Chrome/Firefox) | No (Build) |
| **Vite** | https://github.com/vitejs/vite | `^6.4.3` | MIT | Content script & background module bundler | No (Build) |
| **Preact** | https://github.com/preactjs/preact | `^10.26.4` | MIT | Lightweight UI component rendering for popup | Yes (Client) |
| **Vitest** | https://github.com/vitest-dev/vitest | `^3.0.7` | MIT | Unit and integration test orchestration | No (Test) |
| **happy-dom** | https://github.com/capricorn86/happy-dom | `^17.1.8` | MIT | Headless browser DOM environment for testing | No (Test) |
| **@preact/preset-vite**| https://github.com/preactjs/preset-vite | `^2.10.1` | MIT | Vite plugin for Preact JSX transforms | No (Build) |
| **@types/chrome** | https://github.com/DefinitelyTyped/DefinitelyTyped | `^0.0.308` | MIT | MV3 WebExtension type declarations | No (Build) |

## Repository Verification & Pinning
- All dependencies verified via npm registry and Git repository checks.
- All versions strictly locked in `pnpm-lock.yaml`.
- Zero GPL, AGPL, or non-commercial licenses present in runtime artifacts.
