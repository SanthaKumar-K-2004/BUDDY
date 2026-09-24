# Parent Authentication Specification — Buddy Extension Suite

**Generated:** September 2026  
**Status:** VALIDATED  
**Package:** `@buddy/family-engine` (`pin-authenticator.ts`)  

---

## 1. Security Architecture

Parental controls require protection against casual circumvention by minors. The Parent Authentication subsystem secures policy editing, profile management, and access request reviews using standard Web Cryptography APIs.

---

## 2. Cryptographic Storage & Derivation

Plaintext PINs are **strictly forbidden** anywhere in Buddy storage, memory dumps, or log files.

```text
User PIN (e.g. "4321")
         +
Cryptographically Random Salt (16 bytes / crypto.getRandomValues)
         ↓
PBKDF2 with SHA-256 (100,000 iterations)
         ↓
Derived Verifier (32 bytes / 64 hex characters)
```

The resulting `ParentPinAuth` object stores only the public cryptographic metadata:
```ts
interface ParentPinAuth {
  readonly hasPin: boolean;
  readonly saltHex?: string;       // 32-character hex string
  readonly verifierHex?: string;   // 64-character hex string
  readonly iterations?: number;    // 100,000 iterations
  readonly failedAttempts: number; // consecutive failure counter
  readonly lockedUntil?: number;   // lockout epoch timestamp
  readonly updatedAt: number;
}
```

---

## 3. Rate Limiting & Lockout Protection

To prevent automated or manual brute-force guessing of numeric PINs:

| Consecutive Failed Attempts | Enforced Action | User Feedback |
| :--- | :--- | :--- |
| **1 to 4 Attempts** | Increment failed counter | "Incorrect PIN." |
| **5 Attempts** | **30-second lockout** (`lockedUntil = now + 30s`) | "Too many incorrect attempts. Locked for 30s." |
| **6 Attempts** | **60-second lockout** (`lockedUntil = now + 60s`) | "Too many incorrect attempts. Locked for 60s." |
| **7+ Attempts** | **300-second lockout (5 minutes)** | "Too many incorrect attempts. Locked for 300s." |

### 3.1 Lockout Recovery
Upon entering the correct PIN after a lockout period expires, `failedAttempts` is immediately reset to `0` and `lockedUntil` is cleared.

---

## 4. PIN Change Procedure

Updating an existing Parent PIN requires verifying the current PIN:
```text
verifyPin(currentPin, auth)
  ├── Success → hashPin(newPin) → store updated auth
  └── Failure → increment failedAttempts, return error
```

---

## 5. Local Reset Behavior

Because Buddy is a zero-cloud local extension without remote server backdoors or email resets:
- Forgotten PINs can be cleared only by executing an explicit **Family Reset** in the Settings tab.
- Resetting purges all family profiles, custom blocklists, and PIN verifiers, while leaving general ad-blocking filters intact.
- This prevents permanent extension lockouts while making reset actions immediately obvious to household members.
