# Buddy Shield — Filter Pipeline Troubleshooting & Diagnostics

**Document:** `docs/filters/TROUBLESHOOTING.md`  
**Scope:** Pipeline Diagnostic Failures, Security Blocks, and Recovery Workflows  

---

## 1. Failure Classification & Fast Diagnostic Matrix

| Failure Code | Root Cause | Automatic Action Taken | Remediation Procedure |
| :--- | :--- | :--- | :--- |
| `NETWORK_TIMEOUT` | Upstream host slow or unresponsive (>15s) | Retried 3x with exponential backoff | Falls back to cached version if present. Check upstream status or run `pnpm filters:build` offline. |
| `SSRF_BLOCKED` | URL points to loopback, private IPv4 (RFC1918), or cloud metadata endpoint | Request aborted immediately | Ensure source URL in `src/sources/registry.ts` points to public HTTPS origin. |
| `OVERSIZED_CONTENT` | Response exceeds 15 MB limit | Download aborted before buffering | Verify source URL is a filter text list, not binary asset or giant archive. |
| `HTML_ERROR_PAGE` | Server returned HTML error page (Cloudflare challenge, 404/500 masked as 200) | Rejected by parser | Inspect URL in browser; fallback to cached list. |
| `LIMIT_STATIC_RULES_EXCEEDED` | Ruleset contains > 30,000 static DNR rules | Validator rejects ruleset | Partition source list or disable redundant rules. Chromium limits max rules per ruleset to 30,000. |
| `LIMIT_REGEX_RULES_EXCEEDED` | Ruleset contains > 1,000 regex rules | Validator rejects ruleset | Replace regex rules with standard wildcard `urlFilter` rules. |
| `DUPLICATE_RULE_ID` | Collision in rule ID allocation | Validator rejects ruleset | Run `RuleDeduplicator.deduplicate()` to re-index sequential IDs. |

---

## 2. Cache Inspection & Repair

Raw downloaded filter lists and metadata are stored in `data/filters/`:

### Validating Cache Integrity:
```bash
node -e "
import { CacheManager } from './packages/filter-pipeline/dist/index.js';
const cm = new CacheManager('data/filters');
cm.validateCache().then(console.log);
"
```

### Purging Corrupted Cache:
If a local cache entry has been corrupted or truncated:
```bash
rm -rf data/filters/*
pnpm filters:update
```

---

## 3. Hermetic / Offline Development

If you are developing without an active internet connection or within a restricted CI environment:
```bash
pnpm filters:build
```
`filters:build` operates in hermetic offline mode:
1. Checks `data/filters/` for existing cached lists.
2. If cache is empty, falls back to offline fixtures in `tests/fixtures/`.
3. Compiles verified DNR rulesets and generates manifests without making any network requests.

---

## 4. Validating Generated DNR Artifacts

To verify that generated JSON files in `data/generated/` and `apps/buddy-shield/public/rulesets/` conform to the Declarative Net Request specification:
```bash
pnpm filters:validate
```
Expected output:
```text
✅ ruleset_ads.json: 23 rules (0% limit), regex: 0 — PASS
✅ ruleset_trackers.json: 14 rules (0% limit), regex: 0 — PASS
```
