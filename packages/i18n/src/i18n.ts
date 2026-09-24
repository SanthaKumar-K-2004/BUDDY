/**
 * @buddy/i18n - i18n.ts
 * Translation engine and RTL direction manager.
 */

import { en, type TranslationKey } from './locales/en.js';
import { ta } from './locales/ta.js';
import { ar } from './locales/ar.js';

export type SupportedLocale = 'en' | 'ta' | 'ar';
export const DEFAULT_LOCALE: SupportedLocale = 'en';

const CATALOGS: Record<SupportedLocale, Record<TranslationKey, string>> = {
  en,
  ta,
  ar,
};

export class I18nManager {
  private currentLocale: SupportedLocale = DEFAULT_LOCALE;

  constructor(initialLocale: SupportedLocale = DEFAULT_LOCALE) {
    this.currentLocale = initialLocale;
  }

  public setLocale(locale: SupportedLocale): void {
    if (CATALOGS[locale]) {
      this.currentLocale = locale;
    }
  }

  public getLocale(): SupportedLocale {
    return this.currentLocale;
  }

  public t(key: TranslationKey, locale = this.currentLocale): string {
    const catalog = CATALOGS[locale] || CATALOGS[DEFAULT_LOCALE];
    return catalog[key] || en[key] || String(key);
  }

  public isRtl(locale = this.currentLocale): boolean {
    return locale === 'ar';
  }

  public applyDocumentDirection(locale = this.currentLocale): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dir = this.isRtl(locale) ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }
}

export const i18n = new I18nManager();
export { en, ta, ar, type TranslationKey };
