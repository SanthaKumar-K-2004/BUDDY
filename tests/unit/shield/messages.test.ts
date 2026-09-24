import { describe, it, expect } from 'vitest';
import { isShieldMessage } from '@buddy/shield-core';

describe('Shield Message Contracts', () => {
  it('accepts valid GET_SHIELD_STATUS message', () => {
    expect(isShieldMessage({ type: 'GET_SHIELD_STATUS' })).toBe(true);
    expect(isShieldMessage({ type: 'GET_SHIELD_STATUS', site: 'example.com' })).toBe(true);
  });

  it('accepts valid TOGGLE_GLOBAL_SHIELD message', () => {
    expect(isShieldMessage({ type: 'TOGGLE_GLOBAL_SHIELD', enabled: true })).toBe(true);
    expect(isShieldMessage({ type: 'TOGGLE_GLOBAL_SHIELD', enabled: false })).toBe(true);
  });

  it('accepts valid PAUSE_SITE and RESUME_SITE messages', () => {
    expect(isShieldMessage({ type: 'PAUSE_SITE', site: 'nytimes.com' })).toBe(true);
    expect(isShieldMessage({ type: 'RESUME_SITE', site: 'nytimes.com' })).toBe(true);
  });

  it('accepts valid REPORT_BLOCK_EVENT message', () => {
    expect(
      isShieldMessage({
        type: 'REPORT_BLOCK_EVENT',
        site: 'example.com',
        category: 'ad',
        count: 2,
      })
    ).toBe(true);
  });

  it('rejects malformed, empty, or unknown message types', () => {
    expect(isShieldMessage(null)).toBe(false);
    expect(isShieldMessage(undefined)).toBe(false);
    expect(isShieldMessage('string-message')).toBe(false);
    expect(isShieldMessage({})).toBe(false);
    expect(isShieldMessage({ type: 'UNKNOWN_TYPE' })).toBe(false);
    expect(isShieldMessage({ type: 'TOGGLE_GLOBAL_SHIELD', enabled: 'not-a-bool' })).toBe(false);
    expect(isShieldMessage({ type: 'PAUSE_SITE', site: 12345 })).toBe(false);
    expect(isShieldMessage({ type: 'PAUSE_SITE', site: '   ' })).toBe(false);
  });
});
