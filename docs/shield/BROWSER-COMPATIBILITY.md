# Buddy Shield: Browser Compatibility & Cross-Browser Engine

## 1. Supported Browser Targets

Buddy Shield is engineered to provide feature parity across modern Manifest V3 browser engines:

| Browser | Engine | Minimum Version | Target | Validation Status |
| :--- | :--- | :--- | :--- | :--- |
| **Google Chrome** | Chromium | 109+ | Chromium MV3 | **VERIFIED** |
| **Microsoft Edge** | Chromium | 109+ | Chromium MV3 | **VERIFIED** |
| **Brave Browser** | Chromium | 109+ | Chromium MV3 | **VERIFIED** |
| **Mozilla Firefox** | Gecko | 109.0+ | Firefox MV3 | **VERIFIED** |

---

## 2. Platform Nuances & Abstraction Layer

### Declarative Net Request Differences
* **Chrome / Chromium**: Supports background Service Workers and full `chrome.declarativeNetRequest` APIs with `updateDynamicRules` and `updateEnabledRulesets`.
* **Firefox**: In MV3, Firefox requires explicit `browser_specific_settings.gecko.id` in `manifest.json`.

In `apps/buddy-shield/wxt.config.ts`, WXT automatically adapts manifest metadata based on the target browser:
```ts
browser_specific_settings: browser === 'firefox' ? {
  gecko: {
    id: 'shield@buddyextension.local',
    strict_min_version: '109.0',
  },
} : undefined
```

---

## 3. Build & Packaging Commands

```bash
# Build Chromium MV3 extension
pnpm --filter buddy-shield run build:chrome

# Build Firefox MV3 extension
pnpm --filter buddy-shield run build:firefox

# Build both simultaneously
pnpm shield:build
```

Build outputs are generated in:
* `.output/chrome-mv3/`
* `.output/firefox-mv3/`
