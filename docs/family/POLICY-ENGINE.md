# Policy Engine Specification — Buddy Extension Suite

**Generated:** September 2026  
**Status:** VALIDATED  
**Package:** `@buddy/family-engine`  

---

## 1. Engine Purpose

The Family Policy Engine provides deterministic, unambiguous, and explainable access decisions for all browser navigation and media consumption requests. Given an identical evaluation context and policy state, the engine is mathematically guaranteed to output identical results.

---

## 2. Evaluation Contract

### 2.1 Input: `EvaluationContext`
```ts
interface EvaluationContext {
  readonly url: string;
  readonly domain: string;
  readonly category?: PlatformCategory;
  readonly currentTimeMs: number;
  readonly activeUsageMinutesToday?: number;
  readonly categoryUsageMinutesToday?: number;
  readonly platformUsageMinutesToday?: number;
}
```

### 2.2 Output: `PolicyDecision`
```ts
interface PolicyDecision {
  readonly action: 'allow' | 'block' | 'warn' | 'limit' | 'pause' | 'request_exception';
  readonly reason: string;
  readonly ruleId?: string;
  readonly matchedDomain?: string;
  readonly matchedCategory?: string;
  readonly remainingMinutes?: number;
  readonly requiresPin?: boolean;
}
```

---

## 3. Strict Precedence Hierarchy

Policy conflicts are resolved through a fixed, documented priority order. JavaScript iteration or object key ordering is never relied upon.

```text
Priority 1: Safety / System Rules
   ↓
Priority 2: Active Temporary Access Exceptions
   ↓
Priority 3: Explicit Allowed Sites (Allowlist)
   ↓
Priority 4: Explicit Blocked Sites (Blocklist)
   ↓
Priority 5: Category Restrictions
   ↓
Priority 6: Bedtime Schedule
   ↓
Priority 7: Study Mode / Custom Schedules
   ↓
Priority 8: Daily Usage Limits
   ↓
Priority 9: Default Allow
```

### 3.1 Conflict Resolution Examples

| Scenario | Input Configuration | Decision | Resolution Rationale |
| :--- | :--- | :--- | :--- |
| **Allowlist vs Blocked Category** | Site `docs.google.com` is in `allowedSites`, but category `gaming` is blocked. | **`allow`** | Priority 3 (Explicit Allowed Sites) precedes Priority 5 (Category Restrictions). |
| **Allowlist vs Blocklist** | Site `example.com` exists in both `allowedSites` and `blockedSites`. | **`allow`** | Priority 3 precedes Priority 4. Parents explicitly whitelist educational sites. |
| **Temporary Exception vs Blocked Site** | Site `tiktok.com` is in `blockedSites`, but an approved exception has 15m remaining. | **`allow`** | Priority 2 (Exceptions) precedes Priority 4 (Blocked Sites). |
| **Expired Exception vs Blocked Site** | Approved exception expired 1 minute ago. | **`block`** | Expired exceptions are ignored; Priority 4 blocks the domain. |
| **Bedtime vs Allowed Education Site** | Bedtime is active (11:00 PM), child visits `khanacademy.org` (in `allowedSites`). | **`allow`** | Allowed sites bypass nighttime curfew to permit school emergencies. |
| **Bedtime vs General Site** | Bedtime is active (11:00 PM), child visits `wikipedia.org` (not in `allowedSites`). | **`block`** | Priority 6 restricts all non-allowlisted browsing during sleep hours. |

---

## 4. Domain Normalization & Attack Prevention

Domain comparison is handled by `domain-normalizer.ts` to prevent bypass attacks:
- **Case Insensitivity:** `TIKTOK.COM` normalizes to `tiktok.com`.
- **Protocol Stripping:** `https://`, `http://`, `ftp://` are stripped before evaluation.
- **Port Stripping:** `:8080`, `:3000` do not bypass rules.
- **Path & Query Stripping:** `/watch?v=123#header` is discarded during domain extraction.
- **Leading `www.` & Trailing Dots:** `www.reddit.com.` normalizes to `reddit.com`.
- **Subdomain Protection:** Matching `youtube.com` automatically covers `m.youtube.com` and `music.youtube.com`.
- **Substring Attack Prevention:** Matching `youtube.com` will **never** match `notyoutube.com`, `fakeyoutube.com`, or `youtube.com.evil.com`.

---

## 5. Failure Behavior

If the policy engine encounters corrupted, invalid, or missing policy inputs:
1. `validateFamilyState` sanitizes and replaces corrupted fields with safe defaults.
2. The engine fails **safely**: internal system URLs remain open, while corrupted restrictions do not crash the extension or leak private data.
