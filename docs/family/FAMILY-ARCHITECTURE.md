# Family Architecture — Buddy Extension Suite

**Generated:** September 2026  
**Status:** VALIDATED  
**Phase:** Phase 5 — Family & Parental Controls  

---

## 1. System Overview

Phase 5 introduces the cooperative, local-first Family layer to Buddy. Built directly on top of the validated Phase 0–4 architecture (Foundation, Shield, Focus, Watch-Time, Analytics, and Dashboard), Buddy Family enables parents to configure sensible house rules, bedtime curfews, focus study windows, and daily screen-time limits while strictly preserving user privacy.

The architecture strictly upholds the **Zero-Cost & Local-First Mandate**:
- **₹0 Hosting, ₹0 Cloud:** All state is persisted in local browser storage (`chrome.storage.local`).
- **No Remote Surveillance:** No browsing history, full URLs, page contents, private messages, or search terms leave the device.
- **Zero Mock Data:** All statistics and rule enforcement originate from real local session events.
- **Single Source of Truth:** Reuses Phase 3 Limit Evaluator and Phase 4 Analytics Aggregator.

---

## 2. End-to-End Pipeline

```text
User Navigation
       ↓
Domain Normalization (domain-normalizer.ts)
       ↓
Active Profile & Policy Lookup (FamilyState)
       ↓
Policy Evaluator (Strict Priority Hierarchy)
   [Safety → Exceptions → Allowed Sites → Blocked Sites → Categories → Bedtime → Study → Limits → Default Allow]
       ↓
Decision: ALLOW | BLOCK | LIMIT | WARN
       ↓
Enforcement Layer
   - Allow: Proceed
   - Block: Display Polite Restriction Screen & Offer Access Request
   - Limit: Trigger Phase 3 Limit Overlay & Remaining Allowance Indicator
```

---

## 3. Subsystem Breakdown

### 3.1 Profiles System (`packages/family-engine`)
- **Roles:** `parent` (configuration authority, PIN-protected) and `child` (guided experience, policy-enforced).
- **Pseudonymous:** Profiles only require a local display name (e.g. "Maya", "Dad") and optional avatar. No real names, emails, phone numbers, or account logins are required.
- **Active Profile:** Determines which policy and limits govern the active browser context.

### 3.2 Family Policy System
- **Blocked Sites:** Domains explicitly disallowed for a profile (e.g. `tiktok.com`, `roblox.com`).
- **Allowed Sites:** Explicit allowlist overriding category blocks (e.g. `khanacademy.org`, `wikipedia.org`).
- **Category Restrictions:** Blocks entire website classifications (e.g. `adult`, `gaming`, `social`, `shopping`).
- **Daily Limits:** Configured daily quotas (in minutes) for specific platforms, categories, or total usage. Automatically synchronized with Phase 3 `LimitRule` storage.
- **Schedules & Bedtime:** Configurable time windows for nocturnal rest and daytime study focus.

### 3.3 Access Requests & Temporary Approvals
- When a child navigates to a restricted site, they can submit an in-extension Access Request.
- Requests are stored locally in `FamilyState.requests`.
- Parents review pending requests in the Family Dashboard and can grant temporary access (e.g. +15m, +30m, +1h).
- The Policy Evaluator checks `expiresAt > nowMs`. Upon expiration, the site automatically returns to restricted status without requiring manual parent revocation.

### 3.4 Cryptographic Parent Authentication
- Protected settings and profile switches require the Parent PIN.
- Plaintext PIN storage is strictly prohibited.
- Powered by the Web Crypto API using PBKDF2 with SHA-256 and a 16-byte cryptographically random salt (`crypto.getRandomValues`).
- Rate limiting enforces an exponential lockout after 5 consecutive failed attempts (30s, 60s, 300s).

---

## 4. Integration with Prior Phases

| Subsystem | Phase 5 Integration Pattern | Single Source of Truth Guarantee |
| :--- | :--- | :--- |
| **Buddy Shield (Phases 1 & 2)** | Family blocked sites and categories append to DNR/cosmetic rules. | Shield engine performs actual network-level request blocking. |
| **Watch-Time & Limits (Phase 3)** | Policy daily limits map to `StorageSchema['limits']`. | Limits Evaluator calculates live active minutes against daily allowance. |
| **Focus Engine (Phase 3)** | Study Mode schedule applies `FocusPolicy` (hides feeds & recommendations). | Focus Engine suppresses UI distractions. |
| **Analytics & Reports (Phase 4)** | Family Reports query `AnalyticsAggregator` and `DailySummary`. | Exactly one aggregator computes daily platform/category stats. |
| **Buddy Pet & Mood (Phase 4)** | Adherence to study sessions and breaks boosts Pet happiness. | Buddy Pet dialogue remains encouraging and strictly non-shaming. |

---

## 5. Storage Schema

Family state is stored under `familyState` in `StorageSchema`:

```ts
interface FamilyState {
  enabled: boolean;
  activeProfileId: string | null;
  profiles: readonly FamilyProfile[];
  policies: Readonly<Record<string, FamilyPolicy>>;
  auth: ParentPinAuth;
  requests: readonly AccessRequest[];
  version: number;
  lastSyncTimestamp: number;
}
```

Schema migration and recovery utilities (`validateFamilyState`) ensure malformed or legacy storage is recovered safely without crashing the extension.
