/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111111',
    background: '#fafaf9',
    backgroundElement: '#ffffff',
    backgroundSelected: '#eeeeec',
    textSecondary: '#6b6b67',
    primaryNeon: '#111111',
    accentGlow: '#3f3f3b',
    purpleGlow: '#73736d',
    borderGlow: '#deded8',
  },
  dark: {
    text: '#f5f5f3',
    background: '#111110',
    backgroundElement: '#1b1b19',
    backgroundSelected: '#2a2a27',
    textSecondary: '#a4a49d',
    primaryNeon: '#f5f5f3',
    accentGlow: '#c7c7bf',
    purpleGlow: '#8f8f88',
    borderGlow: '#3a3a35',
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
