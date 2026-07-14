import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import vi from './vi.json';

const LANG_KEY = 'mangaflow-lang';

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export async function initLanguage() {
  try {
    const savedLang = await AsyncStorage.getItem(LANG_KEY);
    if (savedLang) {
      // eslint-disable-next-line import/no-named-as-default-member
      await i18n.changeLanguage(savedLang);
    }
  } catch (err) {
    console.error('Failed to load saved language:', err);
  }
}

i18n.on('languageChanged', (lng) => {
  AsyncStorage.setItem(LANG_KEY, lng).catch(() => {});
});

export default i18n;
