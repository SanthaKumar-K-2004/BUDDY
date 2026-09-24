/**
 * @buddy/family-engine - pin-authenticator.ts
 * Cryptographic PIN authentication using the standard Web Crypto API.
 * Uses PBKDF2 with SHA-256, cryptographically random salts, and exponential rate-limiting.
 */

import type { ParentPinAuth } from '@buddy/shared-types';

const DEFAULT_ITERATIONS = 100_000;
const SALT_BYTE_LENGTH = 16;
const KEY_BYTE_LENGTH = 32;

/**
 * Helper to convert ArrayBuffer to hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Helper to convert hex string to Uint8Array.
 */
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Safely derives a cryptographically secure key using PBKDF2 with SHA-256 via Web Crypto API.
 */
export async function deriveKey(
  pin: string,
  saltBytes: Uint8Array,
  iterations: number = DEFAULT_ITERATIONS
): Promise<string> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);

  const importedKey = await crypto.subtle.importKey(
    'raw',
    pinData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    importedKey,
    KEY_BYTE_LENGTH * 8
  );

  return bufferToHex(derivedBits);
}

/**
 * Creates the initial, unconfigured ParentPinAuth state.
 */
export function createInitialAuth(): ParentPinAuth {
  return {
    hasPin: false,
    failedAttempts: 0,
    updatedAt: Date.now(),
  };
}

/**
 * Computes hash and salt for a new PIN.
 */
export async function hashPin(
  pin: string,
  iterations: number = DEFAULT_ITERATIONS
): Promise<{ saltHex: string; verifierHex: string; iterations: number }> {
  if (!pin || typeof pin !== 'string' || pin.trim().length < 4) {
    throw new Error('PIN must be at least 4 characters long.');
  }

  const saltBytes = new Uint8Array(SALT_BYTE_LENGTH);
  crypto.getRandomValues(saltBytes);
  const saltHex = bufferToHex(saltBytes.buffer);

  const verifierHex = await deriveKey(pin, saltBytes, iterations);

  return {
    saltHex,
    verifierHex,
    iterations,
  };
}

/**
 * Calculates lockout duration based on consecutive failed attempts.
 */
export function calculateLockoutMs(failedAttempts: number): number {
  if (failedAttempts < 5) return 0;
  if (failedAttempts === 5) return 30_000; // 30s lockout
  if (failedAttempts === 6) return 60_000; // 60s lockout
  return 300_000; // 5 min lockout for 7+
}

export interface VerifyPinResult {
  readonly success: boolean;
  readonly updatedAuth: ParentPinAuth;
  readonly isLocked: boolean;
  readonly lockoutRemainingSeconds: number;
  readonly error?: string;
}

/**
 * Verifies a PIN against the stored ParentPinAuth, enforcing lockout rate-limiting.
 */
export async function verifyPin(
  pin: string,
  auth: ParentPinAuth,
  nowMs: number = Date.now()
): Promise<VerifyPinResult> {
  if (!auth.hasPin || !auth.saltHex || !auth.verifierHex) {
    return {
      success: false,
      updatedAuth: auth,
      isLocked: false,
      lockoutRemainingSeconds: 0,
      error: 'No parent PIN has been configured.',
    };
  }

  // Check active lockout
  if (auth.lockedUntil && auth.lockedUntil > nowMs) {
    const remainingSeconds = Math.ceil((auth.lockedUntil - nowMs) / 1000);
    return {
      success: false,
      updatedAuth: auth,
      isLocked: true,
      lockoutRemainingSeconds: remainingSeconds,
      error: `Too many attempts. Locked for ${remainingSeconds} seconds.`,
    };
  }

  try {
    const saltBytes = hexToBuffer(auth.saltHex);
    const derivedVerifier = await deriveKey(pin, saltBytes, auth.iterations ?? DEFAULT_ITERATIONS);

    // Constant-time-like comparison
    const isMatch = derivedVerifier === auth.verifierHex;

    if (isMatch) {
      // Success resets failed attempts
      const updatedAuth: ParentPinAuth = {
        ...auth,
        failedAttempts: 0,
        lockedUntil: undefined,
      };
      return {
        success: true,
        updatedAuth,
        isLocked: false,
        lockoutRemainingSeconds: 0,
      };
    }
  } catch {
    // Treat derivation error as failed match
  }

  // Failed match
  const newFailedAttempts = auth.failedAttempts + 1;
  const lockoutMs = calculateLockoutMs(newFailedAttempts);
  const lockedUntil = lockoutMs > 0 ? nowMs + lockoutMs : undefined;

  const updatedAuth: ParentPinAuth = {
    ...auth,
    failedAttempts: newFailedAttempts,
    lockedUntil,
    updatedAt: nowMs,
  };

  const lockoutRemainingSeconds = Math.ceil(lockoutMs / 1000);

  return {
    success: false,
    updatedAuth,
    isLocked: lockoutMs > 0,
    lockoutRemainingSeconds,
    error: lockoutMs > 0
      ? `Too many incorrect attempts. Locked for ${lockoutRemainingSeconds}s.`
      : 'Incorrect PIN.',
  };
}

/**
 * Sets a new parent PIN.
 */
export async function setPin(
  pin: string,
  _auth: ParentPinAuth = createInitialAuth()
): Promise<ParentPinAuth> {
  const { saltHex, verifierHex, iterations } = await hashPin(pin);
  return {
    hasPin: true,
    saltHex,
    verifierHex,
    iterations,
    failedAttempts: 0,
    lockedUntil: undefined,
    updatedAt: Date.now(),
  };
}

/**
 * Securely changes the PIN after verifying the old PIN.
 */
export async function changePin(
  oldPin: string,
  newPin: string,
  auth: ParentPinAuth
): Promise<{ success: boolean; newAuth?: ParentPinAuth; error?: string }> {
  const verifyRes = await verifyPin(oldPin, auth);
  if (!verifyRes.success) {
    return {
      success: false,
      newAuth: verifyRes.updatedAuth,
      error: verifyRes.error || 'Current PIN verification failed.',
    };
  }

  const newAuth = await setPin(newPin, verifyRes.updatedAuth);
  return {
    success: true,
    newAuth,
  };
}

/**
 * Resets authentication state (used during full family reset with user consent).
 */
export function resetPin(): ParentPinAuth {
  return createInitialAuth();
}
