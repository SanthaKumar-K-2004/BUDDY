# Tamper Resistance & Honest Security Model — Buddy Extension Suite

**Generated:** September 2026  
**Status:** VALIDATED  
**Architecture:** Extension Boundary Defense & Threat Model Analysis  

---

## 1. Honest Threat Model

Software vendors frequently make misleading marketing claims such as *"100% unhackable"* or *"Impossible to bypass"*. Buddy explicitly rejects false security theater.

### 1.1 Inherent Browser Extension Boundaries
A browser extension operates within the permission model granted by the underlying browser runtime and host operating system. As an engineering reality:
1. **Administrative OS Access:** An administrative OS user can uninstall applications, kill processes, edit local filesystem files, or inspect storage directly.
2. **Browser Profile Switching:** A user can create a separate, unmanaged browser profile or launch a different web browser unless restricted at the OS level (e.g. through Windows Family Safety, macOS Screen Time, or Chrome Enterprise Managed Policies).
3. **Extension Management:** In consumer Chromium or Firefox profiles, users with access to `chrome://extensions` can disable or remove extensions unless enforced via Chrome Enterprise Policy (`ExtensionInstallForcelist`).

---

## 2. Protected Attack Surfaces

Buddy actively hardens against **in-session, casual, and in-page bypass vectors**:

### 2.1 Content Script Boundary Defense
Web pages and injected content scripts have **zero administrative authority**:
- Content scripts cannot modify `FamilyState`, change PINs, or approve access requests.
- All policy decisions and temporary exceptions are evaluated within the isolated extension service worker context.
- Messages from webpage contexts (`window.postMessage`, web requests) are rejected.

### 2.2 Domain Trick & Mutation Hardening
- Normalization prevents bypasses via port suffixes (`youtube.com:8080`), uppercase characters (`TIKTOK.COM`), trailing dots (`reddit.com.`), or protocol switches (`http://` vs `https://`).
- Subdomain expansion prevents accessing mobile portals (e.g. `m.instagram.com` is caught when `instagram.com` is blocked).

### 2.3 Cryptographic PIN Protection
- The Parent PIN cannot be discovered through DOM inspection, `localStorage`, or unencrypted storage scans.
- PBKDF2 with 100,000 iterations and salt makes brute-force attacks computationally expensive.
- Exponential rate-limiting locks the unlock interface after 5 failed attempts.

### 2.4 Browser & Service Worker Restart Resilience
- Manifest V3 service workers frequently sleep and rehydrate.
- `FamilyState` and `AccessRequest` states are synchronously persisted to `chrome.storage.local`.
- When the service worker rehydrates on navigation, the policy engine is initialized immediately from local storage before any network request is allowed through.

---

## 3. Recommended Enterprise & Managed Deployment

For parents seeking unbreakable enforcement:
1. Pair Buddy with Chrome Enterprise Policy (`policies.json` or `managed-storage`).
2. Set `ExtensionInstallForcelist` to prevent disabling or removal.
3. Lock `chrome://extensions` and Guest Mode via enterprise policies.
