import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import vi from './vi.json';

const savedLang = localStorage.getItem('mangaflow-lang') || 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Persist language choice
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('mangaflow-lang', lng);
  document.documentElement.lang = lng;
});

export default i18n;

/**
 * Format a number as currency based on current locale.
 * EN → $1,234  |  VI → 1.234₫
 */
export function formatCurrency(amount: number): string {
  const lang = i18n.language;
  if (lang === 'vi') {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

/**
 * Format a number with locale-aware separators.
 * EN → 1,234  |  VI → 1.234
 */
export function formatNumber(num: number): string {
  const lang = i18n.language;
  return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(num);
}
