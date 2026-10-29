import { useColorScheme } from 'react-native';

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

const lightColors = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceMuted: '#F7F7FA',
  text: '#111114',
  secondaryText: '#6C6C70',
  tertiaryText: '#8E8E93',
  separator: '#D9D9DE',
  accent: '#4F5BD5',
  accentOn: '#FFFFFF',
  accentText: '#4450C4',
  accentSoft: 'rgba(79, 91, 213, 0.10)',
  success: '#247A3F',
  successSoft: 'rgba(36, 122, 63, 0.10)',
  warning: '#9A5800',
  warningSoft: 'rgba(154, 88, 0, 0.10)',
  danger: '#C62828',
  dangerSoft: 'rgba(198, 40, 40, 0.09)',
  fill: '#E9E9EF',
  tabBar: '#FCFCFD',
  tabBarBorder: '#D9D9DE',
  overlay: 'rgba(17, 17, 20, 0.42)',
  shadow: '#000000',
  white: '#FFFFFF',
  black: '#000000',
  mapPin: '#4F5BD5',
} as const;

const darkColors: ThemeColors = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceRaised: '#2C2C2E',
  surfaceMuted: '#161618',
  text: '#F5F5F7',
  secondaryText: '#A1A1A6',
  tertiaryText: '#7C7C80',
  separator: '#38383A',
  accent: '#737BFF',
  accentOn: '#FFFFFF',
  accentText: '#A9AEFF',
  accentSoft: 'rgba(115, 123, 255, 0.16)',
  success: '#4CD964',
  successSoft: 'rgba(76, 217, 100, 0.12)',
  warning: '#FFB340',
  warningSoft: 'rgba(255, 179, 64, 0.12)',
  danger: '#FF6961',
  dangerSoft: 'rgba(255, 105, 97, 0.12)',
  fill: '#2C2C2E',
  tabBar: '#111113',
  tabBarBorder: '#2C2C2E',
  overlay: 'rgba(0, 0, 0, 0.58)',
  shadow: '#000000',
  white: '#FFFFFF',
  black: '#000000',
  mapPin: '#9CA3FF',
};

export type ThemeColors = {
  [K in keyof typeof lightColors]: string;
};

export type AppTheme = {
  scheme: 'light' | 'dark';
  colors: ThemeColors;
  isDark: boolean;
};

export function useTheme(): AppTheme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return {
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
    isDark: scheme === 'dark',
  };
}

export type { ThemeColors as Colors };
