# Buddy Shield: Open-Source Components & Composition Ledger

## 1. Reused Open-Source Technology

In accordance with Section 1 and Section 44 of the Buddy Engineering Specification, Shield reuses mature open-source technology rather than reinventing adblock engines from scratch.

| Project | Upstream Repository | Version | License | Role | Integration Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Browser Declarative Net Request** | W3C / WebExtensions API | MV3 Native | W3C / Native | Network Blocking | Browser-native network interception via `declarative_net_request` static rulesets. |
| **@ghostery/adblocker-content** | `github.com/ghostery/adblocker` | `^2.18.2` | **MPL-2.0** | Cosmetic DOM Element Hiding | Injected in content scripts; provides DOM feature extraction, extended selector helpers, and auto-removing scripts. |
| **@ghostery/adblocker** | `github.com/ghostery/adblocker` | `^2.18.2` | **MPL-2.0** | Rule Engine & Selectors | Content-script extended CSS selector evaluation and DOM traversal. |
| **WXT** | `github.com/wxt-dev/wxt` | `^0.19.27` | **MIT** | Extension Framework | Bundles background service workers, content scripts, and popup HTML for Chrome & Firefox MV3. |
| **Preact** | `github.com/preactjs/preact` | `^10.26.4` | **MIT** | Popup User Interface | Ultra-compact (~3KB) reactive UI framework for the popup interface. |
| **Vitest** | `github.com/vitest-dev/vitest` | `^3.0.7` | **MIT** | Unit & Integration Testing | Test runner executing all unit, property, and integration test suites. |
| **happy-dom** | `github.com/capricorn86/happy-dom` | `^20.14.5` | **MIT** | Headless DOM Testing | Simulates browser DOM, stylesheet injection, and mutation events during CI testing. |
| **Playwright** | `github.com/microsoft/playwright` | `^1.50.1` | **Apache-2.0** | Cross-Browser E2E Testing | Browser automation across Chromium and Firefox engines. |

---

## 2. Components Evaluated But Rejected

| Candidate | License | Reason for Rejection | Selected Alternative |
| :--- | :--- | :--- | :--- |
| **@adguard/extended-css** | **GPL-3.0** | **Critical License Boundary Failure.** Bundling in runtime would contaminate the extension bundle with copyleft GPL-3.0 obligations, violating project constraints. | `@ghostery/adblocker-content` (MPL-2.0). |
| **@adguard/dnr-converter (Runtime)** | **GPL-3.0** | **Quarantined to Build-Time.** `@adguard/dnr-converter` is strictly used in `packages/filter-pipeline` during offline build/update steps. It is prohibited from runtime bundling. | Pure declarative JSON rulesets (`ruleset_ads.json`, `ruleset_trackers.json`). |
| **adblock-rs (on npm)** | **MPL-2.0** | **Environment Incompatibility.** The official `adblock-rs` package on npm distributes a native Node.js C++ addon (`index.node`), requiring `cargo` to build. It does not publish pre-compiled browser WASM artifacts on npm. | `@ghostery/adblocker` (pure TypeScript / ESM, MPL-2.0). |
| **Custom Filter Engine from Scratch** | N/A | **Violates Architectural Constraint.** Building an adblock engine from scratch would introduce parsing bugs, poor selector performance, and maintainability debt. | Native DNR + `@ghostery/adblocker`. |

---

## 3. Upstream Attribution

Buddy Shield acknowledges and attributes the following open-source contributions:
1. **Ghostery GmbH** for `@ghostery/adblocker` and `@ghostery/adblocker-content` under the Mozilla Public License 2.0 (MPL-2.0).
2. **WXT Development Team** for the WXT framework under the MIT License.
3. **Preact Core Team** for Preact under the MIT License.
4. **AdGuard Software Ltd** for `@adguard/agtree` and build-time DNR conversion tooling under GPL-3.0 (strictly quarantined in build-time data pipelines).
