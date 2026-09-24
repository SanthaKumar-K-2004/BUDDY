/**
 * @buddy/family-engine - domain-normalizer.ts
 * Robust, secure domain normalization and matching utilities for family policy enforcement.
 */

/**
 * Normalizes an arbitrary URL or domain string into a clean, lowercased host.
 * Strips protocols, ports, userinfo, path, query parameters, hash, and leading 'www.'.
 */
export function normalizeDomain(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let cleaned = input.trim().toLowerCase();

  // Reject dangerous pseudo-protocols
  if (
    cleaned.startsWith('javascript:') ||
    cleaned.startsWith('data:') ||
    cleaned.startsWith('vbscript:') ||
    cleaned.startsWith('file:')
  ) {
    return '';
  }

  // Ensure string has a protocol so URL constructor parses host correctly
  if (!cleaned.includes('://')) {
    cleaned = 'https://' + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    let hostname = parsed.hostname.toLowerCase();

    // Strip trailing dot (e.g. "example.com.")
    while (hostname.endsWith('.')) {
      hostname = hostname.slice(0, -1);
    }

    // Strip leading "www."
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }

    return hostname;
  } catch {
    // Fallback manual cleanup if URL parser fails on bare pattern
    let raw = input.trim().toLowerCase();
    const slashIdx = raw.indexOf('/');
    if (slashIdx !== -1) raw = raw.slice(0, slashIdx);
    const colonIdx = raw.indexOf(':');
    if (colonIdx !== -1) raw = raw.slice(0, colonIdx);
    if (raw.startsWith('www.')) raw = raw.slice(4);
    while (raw.endsWith('.')) raw = raw.slice(0, -1);
    return raw;
  }
}

/**
 * Validates whether a domain input is structurally valid and safe for allow/blocklists.
 */
export function isValidDomainInput(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const normalized = normalizeDomain(input);
  if (!normalized || normalized.length < 3 || normalized.length > 253) return false;

  // Domain must contain at least one dot or be localhost
  if (!normalized.includes('.') && normalized !== 'localhost') return false;

  // Cannot contain spaces or illegal URI characters
  if (/[\s/\\?#%&]/.test(normalized)) return false;

  // Check valid hostname characters (alphanumeric, hyphen, dot)
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
  return domainRegex.test(normalized);
}

/**
 * Checks whether a tested domain matches a configured rule domain.
 * Supports exact domain matches and subdomain matches, but prevents substring bypasses.
 *
 * Example:
 * - isDomainMatch("m.youtube.com", "youtube.com") => true (subdomain match)
 * - isDomainMatch("youtube.com", "youtube.com") => true (exact match)
 * - isDomainMatch("notyoutube.com", "youtube.com") => false (substring protection)
 * - isDomainMatch("youtube.com.evil.com", "youtube.com") => false (suffix mismatch)
 */
export function isDomainMatch(testedDomain: string, rulePattern: string): boolean {
  const normTested = normalizeDomain(testedDomain);
  const normRule = normalizeDomain(rulePattern);

  if (!normTested || !normRule) {
    return false;
  }

  // Exact match
  if (normTested === normRule) {
    return true;
  }

  // Subdomain match (e.g. sub.example.com matching example.com)
  if (normTested.endsWith('.' + normRule)) {
    return true;
  }

  return false;
}

/**
 * Checks if a domain is matched by any pattern in a list.
 */
export function matchesAnyDomain(testedDomain: string, rulePatterns: readonly string[]): boolean {
  if (!rulePatterns || rulePatterns.length === 0) return false;
  return rulePatterns.some((pattern) => isDomainMatch(testedDomain, pattern));
}
