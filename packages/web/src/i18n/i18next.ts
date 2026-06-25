import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import namespace resources
import zhCommon from './locales/zh/common.json';
import zhLayout from './locales/zh/layout.json';
import zhPractice from './locales/zh/practice.json';
import enCommon from './locales/en/common.json';
import enLayout from './locales/en/layout.json';
import enPractice from './locales/en/practice.json';

const resources = {
  zh: {
    common: zhCommon,
    layout: zhLayout,
    practice: zhPractice,
  },
  en: {
    common: enCommon,
    layout: enLayout,
    practice: enPractice,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    defaultNS: 'common',
    ns: ['common', 'layout', 'practice'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'sales-ai-coach-locale',
      caches: ['localStorage'],
    },
  });

export default i18n;
