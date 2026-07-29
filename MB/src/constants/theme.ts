/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Manga print palette: warm paper, blue-black ink and vermilion accents.
    text: '#1c2928',
    background: '#f6efdf',
    backgroundElement: '#fffaf0',
    backgroundSelected: '#e9ddc7',
    textSecondary: '#59615b',
    primaryNeon: '#b94234',
    accentGlow: '#8e2f27',
    purpleGlow: '#6b624f',
    borderGlow: '#cbbda5',
    danger: '#a43a32',
  },
  dark: {
    text: '#f2eadb',
    background: '#1c2928',
    backgroundElement: '#273431',
    backgroundSelected: '#35433e',
    textSecondary: '#c4bcaa',
    primaryNeon: '#df7161',
    accentGlow: '#c95649',
    purpleGlow: '#a69c80',
    borderGlow: '#4b5a52',
    danger: '#ed8375',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 68, android: 104 }) ?? 0;
export const MaxContentWidth = 800;
