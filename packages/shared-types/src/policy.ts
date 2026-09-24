/**
 * @buddy/shared-types - policy.ts
 * Enterprise policy schema matching Chrome Enterprise storage.managed configuration.
 */

export interface BuddyManagedPolicy {
  readonly org_id?: string;
  readonly enforce_shield?: boolean;
  readonly shield_locked_domains?: readonly string[];
  readonly enforce_focus_youtube?: boolean;
  readonly youtube_max_session_minutes?: number;
  readonly enforce_family_content_filter?: boolean;
  readonly managed_domain_whitelist?: readonly string[];
  readonly managed_domain_blacklist?: readonly string[];
}

export function isValidManagedPolicy(value: unknown): value is BuddyManagedPolicy {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const policy = value as Record<string, unknown>;
  if (policy['org_id'] !== undefined && typeof policy['org_id'] !== 'string') return false;
  if (policy['enforce_shield'] !== undefined && typeof policy['enforce_shield'] !== 'boolean') return false;
  if (policy['enforce_focus_youtube'] !== undefined && typeof policy['enforce_focus_youtube'] !== 'boolean') return false;
  if (policy['youtube_max_session_minutes'] !== undefined && typeof policy['youtube_max_session_minutes'] !== 'number') return false;
  if (policy['enforce_family_content_filter'] !== undefined && typeof policy['enforce_family_content_filter'] !== 'boolean') return false;
  return true;
}
