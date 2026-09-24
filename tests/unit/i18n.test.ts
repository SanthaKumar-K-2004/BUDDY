import { describe, it, expect } from 'vitest';
import { I18nManager } from '@buddy/i18n';

describe('i18n Foundation - Locales & Direction', () => {
  it('retrieves English keys by default', () => {
    const i18n = new I18nManager('en');
    expect(i18n.t('app_name')).toBe('Buddy');
    expect(i18n.t('shield_title')).toBe('Buddy Shield');
    expect(i18n.isRtl()).toBe(false);
  });

  it('translates keys into Tamil correctly', () => {
    const i18n = new I18nManager('ta');
    expect(i18n.t('app_name')).toBe('பட்டி');
    expect(i18n.t('shield_title')).toBe('பட்டி ஷீல்ட்');
    expect(i18n.isRtl()).toBe(false);
  });

  it('translates keys into Arabic and reports RTL=true', () => {
    const i18n = new I18nManager('ar');
    expect(i18n.t('app_name')).toBe('بادي');
    expect(i18n.t('shield_title')).toBe('درع بادي');
    expect(i18n.isRtl()).toBe(true);
  });

  it('switches locales dynamically', () => {
    const i18n = new I18nManager('en');
    expect(i18n.getLocale()).toBe('en');

    i18n.setLocale('ta');
    expect(i18n.getLocale()).toBe('ta');
    expect(i18n.t('focus_title')).toBe('பட்டி போக்கஸ்');

    i18n.setLocale('ar');
    expect(i18n.getLocale()).toBe('ar');
    expect(i18n.isRtl()).toBe(true);
  });
});
