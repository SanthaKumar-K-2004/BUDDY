/**
 * @buddy/shield-core - messages.ts
 * Strictly typed message contracts and runtime validators for extension IPC.
 */

import type { BlockCategory } from '@buddy/shield-stats';

export type ShieldMessageType =
  | 'GET_SHIELD_STATUS'
  | 'TOGGLE_GLOBAL_SHIELD'
  | 'PAUSE_SITE'
  | 'RESUME_SITE'
  | 'REPORT_BLOCK_EVENT'
  | 'GET_COSMETIC_RULES';

export interface BaseShieldMessage {
  readonly type: ShieldMessageType;
}

export interface GetShieldStatusMessage extends BaseShieldMessage {
  readonly type: 'GET_SHIELD_STATUS';
  readonly site?: string;
}

export interface ToggleGlobalShieldMessage extends BaseShieldMessage {
  readonly type: 'TOGGLE_GLOBAL_SHIELD';
  readonly enabled: boolean;
}

export interface PauseSiteMessage extends BaseShieldMessage {
  readonly type: 'PAUSE_SITE';
  readonly site: string;
}

export interface ResumeSiteMessage extends BaseShieldMessage {
  readonly type: 'RESUME_SITE';
  readonly site: string;
}

export interface ReportBlockEventMessage extends BaseShieldMessage {
  readonly type: 'REPORT_BLOCK_EVENT';
  readonly site: string;
  readonly category: BlockCategory;
  readonly count?: number;
}

export interface GetCosmeticRulesMessage extends BaseShieldMessage {
  readonly type: 'GET_COSMETIC_RULES';
  readonly site: string;
}

export type ShieldMessage =
  | GetShieldStatusMessage
  | ToggleGlobalShieldMessage
  | PauseSiteMessage
  | ResumeSiteMessage
  | ReportBlockEventMessage
  | GetCosmeticRulesMessage;

const VALID_MESSAGE_TYPES: readonly ShieldMessageType[] = [
  'GET_SHIELD_STATUS',
  'TOGGLE_GLOBAL_SHIELD',
  'PAUSE_SITE',
  'RESUME_SITE',
  'REPORT_BLOCK_EVENT',
  'GET_COSMETIC_RULES',
];

/**
 * Runtime type guard validating incoming IPC messages before processing.
 * Prevents message injection, prototype pollution, and malformed requests.
 */
export function isShieldMessage(value: unknown): value is ShieldMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const msg = value as Record<string, unknown>;
  if (typeof msg['type'] !== 'string') {
    return false;
  }

  if (!VALID_MESSAGE_TYPES.includes(msg['type'] as ShieldMessageType)) {
    return false;
  }

  switch (msg['type']) {
    case 'GET_SHIELD_STATUS':
      return msg['site'] === undefined || typeof msg['site'] === 'string';
    case 'TOGGLE_GLOBAL_SHIELD':
      return typeof msg['enabled'] === 'boolean';
    case 'PAUSE_SITE':
    case 'RESUME_SITE':
      return typeof msg['site'] === 'string' && msg['site'].trim().length > 0;
    case 'REPORT_BLOCK_EVENT':
      return (
        typeof msg['site'] === 'string' &&
        typeof msg['category'] === 'string' &&
        (msg['count'] === undefined || typeof msg['count'] === 'number')
      );
    case 'GET_COSMETIC_RULES':
      return typeof msg['site'] === 'string';
    default:
      return false;
  }
}
