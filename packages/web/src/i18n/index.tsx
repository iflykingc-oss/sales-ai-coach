import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { getTranslation } from './translations';

export type Locale = 'zh' | 'en' | 'th' | 'vi' | 'ms' | 'id';

export const LOCALES: Record<Locale, { name: string; nativeName: string; flag: string }> = {
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  th: { name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useTranslation() {
  const { locale, t } = useI18n();
  return { locale, t };
}

interface I18nProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

export function I18nProvider({ children, defaultLocale = 'zh' }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('locale') as Locale;
      if (saved && LOCALES[saved]) return saved;
    }
    return defaultLocale;
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback((key: string, fallback?: string): string => {
    return getTranslation(locale, key, fallback);
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}
