/**
 * Internationalization (i18n) Configuration
 * Supports: Italian (default), English, Deutsch
 * WCAG 2.1 AA Compliant with accessibility features
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Italian translations
import itCommon from './it/common.json';
import itForm from './it/form.json';
import itValidation from './it/validation.json';
import itA11y from './it/a11y.json';

// English translations
import enCommon from './en/common.json';
import enForm from './en/form.json';
import enValidation from './en/validation.json';
import enA11y from './en/a11y.json';

// German translations
import deCommon from './de/common.json';
import deForm from './de/form.json';
import deValidation from './de/validation.json';
import deA11y from './de/a11y.json';

export const resources = {
  it: {
    common: itCommon,
    form: itForm,
    validation: itValidation,
    a11y: itA11y,
  },
  en: {
    common: enCommon,
    form: enForm,
    validation: enValidation,
    a11y: enA11y,
  },
  de: {
    common: deCommon,
    form: deForm,
    validation: deValidation,
    a11y: deA11y,
  },
} as const;

export type Language = 'it' | 'en' | 'de';
export type Namespace = 'common' | 'form' | 'validation' | 'a11y';

export const SUPPORTED_LANGUAGES: Language[] = ['it', 'en', 'de'];
export const DEFAULT_LANGUAGE: Language = 'it';

export const LANGUAGE_NAMES: Record<Language, { name: string; flag: string; ariaLabel: string }> = {
  it: { name: 'Italiano', flag: '🇮🇹', ariaLabel: 'Italiano' },
  en: { name: 'English', flag: '🇬🇧', ariaLabel: 'English' },
  de: { name: 'Deutsch', flag: '🇩🇪', ariaLabel: 'Deutsch' },
};

// Language detection options
const detectionOptions = {
  order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
  caches: ['localStorage', 'cookie'],
  lookupLocalStorage: 'i18n_language',
  lookupCookie: 'i18n_language',
  cookieMinutes: 10080, // 7 days
};

// Initialize i18n

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: SUPPORTED_LANGUAGES,
      detection: detectionOptions,
      defaultNS: 'common',
      ns: ['common', 'form', 'validation', 'a11y'],
      interpolation: {
        escapeValue: false, // React already escapes values
      },
      react: {
        useSuspense: false,
      },
      // Accessibility: announce language changes to screen readers
      initImmediate: false,
    });
}

// Helper function to change language with accessibility announcement
export const changeLanguage = async (lang: Language): Promise<void> => {
  await i18n.changeLanguage(lang);
  // Update document lang attribute for screen readers
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    // Announce language change to screen readers
    const announcement = document.getElementById('language-change-announcer');
    if (announcement) {
      announcement.textContent = i18n.t('a11y:language.changed', { lng: lang, lang: LANGUAGE_NAMES[lang].name });
    }
  }
};

// Get current language
export const getCurrentLanguage = (): Language => {
  return (i18n.language as Language) || DEFAULT_LANGUAGE;
};

// Get text direction (for future RTL support)
export const getTextDirection = (): 'ltr' | 'rtl' => {
  return 'ltr';
};

// Format message with accessibility context
export const formatA11yMessage = (
  key: string,
  options?: Record<string, unknown>
): string => {
  return i18n.t(key, { ns: 'a11y', ...options });
};

export default i18n;
