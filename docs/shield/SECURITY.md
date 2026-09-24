# Buddy Shield: Security Architecture & Threat Model

## 1. Threat Model & Boundaries

Web pages are inherently untrusted and potentially hostile environments. Buddy Shield enforces strict security isolation between untrusted page DOMs and privileged extension contexts:

```text
┌────────────────────────────────┐
│   Hostile / Untrusted Web Page │
└───────────────┬────────────────┘
                │ (Cannot access extension APIs)
                ▼
┌────────────────────────────────┐
│    Content Script Context      │
│  - Isolated DOM world          │
│  - No direct background access │
└───────────────┬────────────────┘
                │ chrome.runtime.sendMessage
                │ (Strictly validated schema)
                ▼
┌────────────────────────────────┐
│   Background Service Worker    │
│  - Privileged extension APIs   │
│  - Storage & DNR access        │
└────────────────────────────────┘
```

---

## 2. Message Validation & Anti-Poisoning

Every message crossing into the background service worker is subjected to the `isShieldMessage` runtime type guard (`packages/shield-core/src/messages.ts`):
1. **Type Whitelisting**: Messages must match a known `ShieldMessageType`.
2. **Schema Enforcement**: Strings, booleans, and counts are type-checked; unexpected properties are discarded.
3. **Prototype Pollution Protection**: Messages are handled as plain objects without prototype mutation.

---

## 3. Sensitive API Audit

A comprehensive code audit was conducted across the codebase:

| API | Status | Finding |
| :--- | :--- | :--- |
| `eval()` | **CLEAN** | Zero occurrences in codebase. |
| `new Function()` | **CLEAN** | Zero occurrences in codebase. |
| `innerHTML` | **CLEAN** | Zero occurrences in runtime extension code. Injected styles use `textContent`. |
| `document.write` | **CLEAN** | Zero occurrences in codebase. |
| `scripting.executeScript` | **MINIMAL** | Not used; declarative content scripts are utilized. |
| `webRequestBlocking` | **CLEAN** | Eliminated in favor of MV3 Declarative Net Request. |
| `postMessage` | **CLEAN** | Extension does not listen to arbitrary `window.postMessage` from web pages. |

---

## 4. Permissions Audit

In accordance with the principle of least privilege, `apps/buddy-shield/wxt.config.ts` requests only the minimal necessary permissions:
* `storage`: Required for local settings and aggregated stats.
* `declarativeNetRequest`: Required for static ruleset registration and dynamic allow rules.
* `alarms`: Required for periodic 1-minute stats flush to mitigate service worker suspension.
* `host_permissions: ["<all_urls>"]`: Required for global ad/tracker network interception across any domain.
