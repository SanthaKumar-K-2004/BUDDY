# Security Architecture & Threat Model — Buddy Extension Suite

**Generated:** September 2026  
**Audited By:** Principal Browser Extension Security Engineering Team  
**Status:** AUDITED & HARDENED  

---

## 1. Security Overview & Invariants

The Buddy Extension Suite is hardened against all common browser extension attack vectors:
- **Zero Dynamic Code Execution**: Prohibits `eval()`, `new Function()`, `innerHTML`, `outerHTML`, and `document.write`.
- **Strict Content Security Policy**: Enforces `script-src 'self'; object-src 'self';` across all extension pages.
- **Cross-Context Message Validation**: Verifies sender identity (`sender.id === chrome.runtime.id`), message types, and strictly typed payloads.
- **Input Sanitization**: Treats all web page content and DOM trees as untrusted inputs.
- **Concurrency & Race Condition Hardening**: Uses `AsyncKeyLock` to guarantee atomic read-modify-write operations on local storage across concurrent tabs.

---

## 2. Threat Model & Mitigations

| Threat Vector | Potential Impact | Buddy Hardened Mitigation |
| :--- | :--- | :--- |
| **Malicious Web Page Message Spoofing** | Compromising extension background worker via forged messages | Background service workers verify `sender.id === chrome.runtime.id`. External messages from arbitrary web pages or other extensions are rejected immediately. |
| **Cross-Site Scripting (XSS)** | Arbitrary script execution in extension context | 100% elimination of `innerHTML` and `outerHTML`. Dynamic DOM construction uses safe W3C DOM APIs (`document.createElement`, `textContent`, `appendChild`). All UI components use Preact with automatic attribute and text node escaping. |
| **Prototype Pollution via Import** | Overwriting Object prototype during data restoration | `importData` explicitly checks for prototype pollution keys (`__proto__`, `constructor`, `prototype`) and rejects any malformed payloads. |
| **Storage Write Race Conditions** | Lost watch-time or corrupt stats when multiple tabs save concurrently | `StorageClient` routes all `update` calls through `AsyncKeyLock`, ensuring atomic execution per storage key. |
| **Credential & Form Scraping** | Leaking user credentials or credit card details | Content scripts attach zero event listeners to `<input>`, `<textarea>`, `<form>`, or password fields. Only standard `<video>` and `<audio>` elements are observed. |
| **URL Parameter Leakage** | Leaking authentication tokens or session IDs via URL tracking | `BaseSiteAdapter.sanitizeUrl` strips all auth tokens, session IDs, and tracking query parameters (`utm_*`, `fbclid`, `token`, `auth`, `password`, `key`) before storing or processing. |

---

## 3. Permissions Minimization & Justification

| Extension Application | Declared Permissions | Host Permissions | Security Justification |
| :--- | :--- | :--- | :--- |
| **`buddy-focus`** | `storage`, `alarms` | `<all_urls>` | Required to observe media playback, track active digital wellbeing, and enforce user distraction rules across user-visited sites. Does not request sensitive permissions (`tabs`, `webRequest`, `cookies`). |
| **`buddy-shield`** | `storage`, `alarms`, `declarativeNetRequest` | `<all_urls>` | Required for Declarative Net Request network-level ad/tracker blocking and cosmetic style injection. |
| **`buddy-dashboard`** | `storage`, `alarms`, `sidePanel` | *None* | Runs strictly in extension popup and sidepanel. **Zero host permissions** requested. |
| **`buddy-family`** | `storage`, `alarms`, `offscreen` | `<all_urls>` | Required to enforce safe search, domain category blocking, and parental controls across web traffic. |

---

## 4. Content Security Policy (CSP)

All extensions explicitly declare the following Content Security Policy in their manifests:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self';"
}
```

- Disallows remote scripts, CDNs, or WebAssembly evaluation in extension pages.
- Inline script execution is blocked by the browser engine.
- Only local bundled bundles (`/background.js`, `/popup.html`, `/chunks/*`) are executable.
