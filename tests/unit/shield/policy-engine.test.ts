import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine } from '@buddy/shield-policy';
import { MemoryStorageAdapter } from '@buddy/storage';

describe('PolicyEngine', () => {
  let memoryStorage: MemoryStorageAdapter;
  let policy: PolicyEngine;

  beforeEach(() => {
    memoryStorage = new MemoryStorageAdapter();
    policy = new PolicyEngine(memoryStorage);
  });

  describe('Domain Canonicalization', () => {
    it('normalizes full URLs to canonical lowercase domain', () => {
      expect(policy.canonicalizeDomain('https://WWW.Example.COM/path?arg=1')).toBe('example.com');
      expect(policy.canonicalizeDomain('http://sub.domain.co.uk:8080/')).toBe('sub.domain.co.uk');
      expect(policy.canonicalizeDomain('www.google.com')).toBe('google.com');
      expect(policy.canonicalizeDomain('localhost:3000')).toBe('localhost');
    });

    it('handles empty or malformed input safely', () => {
      expect(policy.canonicalizeDomain('')).toBe('');
      expect(policy.canonicalizeDomain('   ')).toBe('');
    });
  });

  describe('Global Enable / Disable', () => {
    it('defaults to globally enabled', async () => {
      const enabled = await policy.isGloballyEnabled();
      expect(enabled).toBe(true);
    });

    it('toggles global enable and persists to settings', async () => {
      await policy.setGloballyEnabled(false);
      expect(await policy.isGloballyEnabled()).toBe(false);

      const settings = await memoryStorage.get('settings');
      expect(settings.isShieldEnabled).toBe(false);

      await policy.setGloballyEnabled(true);
      expect(await policy.isGloballyEnabled()).toBe(true);
    });

    it('respects enterprise managed policy enforcement', async () => {
      policy.setManagedPolicy({ enforce_shield: true });
      expect(await policy.isGloballyEnabled()).toBe(true);

      // Attempting to disable when enforced must throw
      await expect(policy.setGloballyEnabled(false)).rejects.toThrow(
        'Shield protection is strictly enforced'
      );
    });
  });

  describe('Per-Site Pause and Resume', () => {
    it('protects regular sites by default', async () => {
      expect(await policy.isSiteProtected('example.com')).toBe(true);
      expect(await policy.isSiteProtected('https://news.ycombinator.com/')).toBe(true);
    });

    it('pauses protection for a specific site without affecting others', async () => {
      await policy.pauseForSite('https://www.nytimes.com/article');

      expect(await policy.isSiteProtected('nytimes.com')).toBe(false);
      expect(await policy.isSiteProtected('www.nytimes.com')).toBe(false);

      // Other sites remain protected
      expect(await policy.isSiteProtected('example.com')).toBe(true);
      expect(await policy.isSiteProtected('google.com')).toBe(true);
    });

    it('resumes protection for a paused site', async () => {
      await policy.pauseForSite('nytimes.com');
      expect(await policy.isSiteProtected('nytimes.com')).toBe(false);

      await policy.resumeForSite('nytimes.com');
      expect(await policy.isSiteProtected('nytimes.com')).toBe(true);
    });

    it('prevents pausing enterprise locked domains', async () => {
      policy.setManagedPolicy({ shield_locked_domains: ['company-portal.internal'] });

      await expect(policy.pauseForSite('company-portal.internal')).rejects.toThrow(
        'Protection for company-portal.internal is enforced by enterprise policy'
      );
    });
  });

  describe('Whitelist Management', () => {
    it('allows adding and removing domains from whitelist', async () => {
      expect(await policy.getWhitelist()).toEqual([]);

      await policy.addToWhitelist('partner-site.com');
      expect(await policy.getWhitelist()).toContain('partner-site.com');
      expect(await policy.isSiteProtected('partner-site.com')).toBe(false);

      await policy.removeFromWhitelist('partner-site.com');
      expect(await policy.getWhitelist()).not.toContain('partner-site.com');
      expect(await policy.isSiteProtected('partner-site.com')).toBe(true);
    });
  });
});
