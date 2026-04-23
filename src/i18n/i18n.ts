import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import te from './locales/te.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      te: { translation: te },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'te'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'bcta_language',
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false, // Prevent flicker during language load
    },
  });

// Sync <html lang=""> attribute on init and language change
const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = lng;
  document.documentElement.dir = 'ltr'; // Both English and Telugu are LTR
};

syncHtmlLang(i18n.language || 'en');
i18n.on('languageChanged', syncHtmlLang);

export default i18n;
