// JobTok design tokens. Dark-first; a `light` theme will be added later under the same keys.

const palette = {
  ink950: '#07080F',
  ink900: '#0B0D18',
  ink850: '#11142A',
  ink800: '#171B33',
  ink700: '#232846',
  ink600: '#343A5E',
  ink400: '#7C83A6',
  ink300: '#A3A9C7',
  ink100: '#E6E8F2',
  white: '#FFFFFF',

  blue500: '#3D7BFF', // electric blue
  blue400: '#5F93FF',
  purple500: '#7B3FF2',
  purple400: '#9A6BFF',
  cyan400: '#22D3EE',
  pink500: '#EC4899',
  orange500: '#F97316',
  gold400: '#F5C451',
  green500: '#22C55E',
  red500: '#EF4444',
} as const;

export const colors = {
  dark: {
    background: palette.ink900,
    backgroundDeep: palette.ink950,
    surface: palette.ink850,
    surfaceRaised: palette.ink800,
    border: palette.ink700,
    borderStrong: palette.ink600,

    text: palette.ink100,
    textStrong: palette.white,
    textMuted: palette.ink300,
    textSubtle: palette.ink400,

    primary: palette.purple500,
    primaryHover: palette.purple400,
    secondary: palette.blue500,
    secondaryHover: palette.blue400,
    onPrimary: palette.white,

    accent: palette.cyan400,
    highlight: palette.pink500,
    warm: palette.orange500,
    verified: palette.gold400,

    success: palette.green500,
    danger: palette.red500,
    warning: palette.orange500,
  },
} as const;

export type ThemeName = keyof typeof colors;
export type ColorToken = keyof (typeof colors)['dark'];

/** Brand gradient for primary CTAs and the logo mark (purple -> electric blue). */
export const gradients = {
  brand: [palette.purple500, palette.blue500] as const,
};

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 36,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Minimum touch target (px/dp) for accessibility. */
export const MIN_TOUCH_TARGET = 44;
