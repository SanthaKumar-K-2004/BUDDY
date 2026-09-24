# Buddy Shield: Privacy Policy & Data Minimization

## 1. Zero External Network Requests

Buddy Shield is built from the ground up to operate without cloud infrastructure or third-party analytics:
* **No Telemetry Servers**: No crash analytics, telemetry pings, or user tracking are sent over the network.
* **No Remote APIs**: All blocking decisions are made locally using the browser's Declarative Net Request engine and pre-bundled local rulesets.
* **No Account Required**: Buddy Shield requires no login, no email address, and no account creation.

---

## 2. Data Minimization & Sanitization

| Data Item | Buddy Shield Behavior |
| :--- | :--- |
| **Full Request URLs** | **Discarded immediately.** Only the bare hostname (`example.com`) is processed. Query strings (containing search queries, tokens, or IDs) are never read or stored. |
| **Page Content** | **Never accessed or uploaded.** Cosmetic filtering only touches CSS classes and HTML IDs matching known ad selectors. |
| **Browsing History** | **Never tracked.** Buddy does not keep a chronological log of visited pages or timestamps. |
| **Form Inputs & Keystrokes** | **Never read.** Buddy does not listen to input fields or key events. |
| **IP Addresses** | **Never logged or inspected.** |

---

## 3. Storage Transparency

All persistent data is stored locally in `chrome.storage.local`. Users can inspect their data at any time via Chrome Developer Tools:
* `settings`: Global enable flag, user language, and whitelisted domains.
* `sitePolicies`: Per-site pause flags.
* `dailyStats`: Daily aggregated numeric totals of blocked ads and trackers.
