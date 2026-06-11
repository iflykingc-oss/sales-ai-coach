import type { Locale } from './index';
import zh from './locales/zh';
import en from './locales/en';
import th from './locales/th';
import vi from './locales/vi';
import ms from './locales/ms';
import id from './locales/id';

const translations: Record<Locale, Record<string, string>> = {
  zh,
  en,
  th,
  vi,
  ms,
  id,
};

export function getTranslation(locale: Locale, key: string, fallback?: string): string {
  const localeTranslations = translations[locale];
  if (localeTranslations && localeTranslations[key]) {
    return localeTranslations[key];
  }
  // Fallback to English
  if (translations.en[key]) {
    return translations.en[key];
  }
  // Fallback to key itself
  return fallback || key;
}

export function createTranslator(locale: Locale) {
  return (key: string, fallback?: string) => getTranslation(locale, key, fallback);
}
