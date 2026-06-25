/**
 * i18n module — re-exports locale metadata for components that need
 * language list / switching UI.  All translation lookups go through
 * react-i18next's `useTranslation()` (see i18next.ts for config).
 */
import i18next from './i18next';

export type Locale = 'zh' | 'en' | 'th' | 'vi' | 'ms' | 'id';

export const LOCALES: Record<Locale, { name: string; nativeName: string; flag: string }> = {
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  th: { name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
};

/**
 * Change the active locale.  Persists to localStorage and updates
 * document.documentElement.lang automatically via i18next detector.
 */
export function setLocale(locale: Locale) {
  i18next.changeLanguage(locale);
}
