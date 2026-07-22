/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#211936',
    background: '#fff7fc',
    backgroundElement: '#fffaff',
    backgroundSelected: '#fce7f3',
    textSecondary: '#756b92',
    primaryNeon: '#ec4899',
    accentGlow: '#8b5cf6',
    purpleGlow: '#a855f7',
    borderGlow: '#f2cbe7',
  },
  dark: {
    text: '#ffffff',
    background: '#0d061a',
    backgroundElement: '#17102b',
    backgroundSelected: '#2d1b50',
    textSecondary: '#c4b5fd',
    primaryNeon: '#fb7185',
    accentGlow: '#8b5cf6',
    purpleGlow: '#a855f7',
    borderGlow: '#533185',
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
