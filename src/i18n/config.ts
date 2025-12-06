import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en/translation.json';
import kaTranslations from './locales/ka/translation.json';

// Поддерживаемые языки
export const SUPPORTED_LANGUAGES = ['en', 'ka'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Языки по умолчанию
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// Функция для преобразования всех строк в объекте в верхний регистр (для грузинского)
const toUpperCaseRecursive = (obj: any): any => {
  if (typeof obj === 'string') {
    return obj.toUpperCase();
  }
  if (Array.isArray(obj)) {
    return obj.map(toUpperCaseRecursive);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = toUpperCaseRecursive(obj[key]);
    }
    return result;
  }
  return obj;
};

// Преобразуем грузинские переводы в верхний регистр
const kaTranslationsUppercase = toUpperCaseRecursive(kaTranslations);

// Ресурсы переводов
const resources = {
  en: {
    translation: enTranslations,
  },
  ka: {
    translation: kaTranslationsUppercase,
  },
};

i18n
  .use(LanguageDetector) // Определяет язык браузера
  .use(initReactI18next) // Передает i18n в react-i18next
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false, // React уже экранирует значения
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;

