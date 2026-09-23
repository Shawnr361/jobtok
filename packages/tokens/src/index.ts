// JobTok design tokens — "Dynamic Discovery System" (Cyber-Glass, dark-first).
// Source: the Stitch design suite (DESIGN.md). A `light` theme can be added later under the
// same keys.

/** Material 3 colour scheme generated for the design (names match the Stitch/Tailwind config). */
export const scheme = {
  surface: '#0c1322',
  surfaceDim: '#0c1322',
  surfaceBright: '#323949',
  surfaceContainerLowest: '#070e1d',
  surfaceContainerLow: '#141b2b',
  surfaceContainer: '#191f2f',
  surfaceContainerHigh: '#232a3a',
  surfaceContainerHighest: '#2e3545',
  surfaceVariant: '#2e3545',
  onSurface: '#dce2f7',
  onSurfaceVariant: '#cbc3d7',
  outline: '#958ea0',
  outlineVariant: '#494454',
  primary: '#d0bcff',
  onPrimary: '#3c0091',
  primaryContainer: '#a078ff',
  onPrimaryContainer: '#340080',
  primaryFixed: '#e9ddff',
  primaryFixedDim: '#d0bcff',
  inversePrimary: '#6d3bd7',
  secondary: '#4cd7f6',
  onSecondary: '#003640',
  secondaryContainer: '#03b5d3',
  onSecondaryContainer: '#00424e',
  secondaryFixed: '#acedff',
  secondaryFixedDim: '#4cd7f6',
  tertiary: '#adc6ff',
  onTertiary: '#002e6a',
  tertiaryContainer: '#4d8eff',
  tertiaryFixed: '#d8e2ff',
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  white: '#ffffff',
} as const;

/** Brand identity colours (DESIGN.md "Palette Architecture"). */
export const brand = {
  violet: '#8B5CF6',
  indigo: '#6366F1',
  cyan: '#06B6D4',
  sky: '#38BDF8',
  blue: '#3B82F6',
  lavender: '#A78BFA',
  obsidian: '#0B0F19',
  slate: '#111827',
  success: '#10B981',
  alert: '#F59E0B',
  like: '#EF4444',
} as const;

/**
 * Semantic dark theme used across the apps. Keys are stable; values follow the Cyber-Glass
 * palette.
 */
export const colors = {
  dark: {
    background: scheme.surface,
    backgroundDeep: scheme.surfaceContainerLowest,
    surface: scheme.surfaceContainer,
    surfaceRaised: scheme.surfaceContainerHigh,
    border: 'rgba(255,255,255,0.10)',
    borderStrong: scheme.outlineVariant,

    text: scheme.onSurface,
    textStrong: scheme.white,
    textMuted: scheme.onSurfaceVariant,
    textSubtle: scheme.outline,

    primary: brand.violet,
    primaryHover: scheme.primary,
    secondary: brand.blue,
    secondaryHover: scheme.tertiary,
    onPrimary: scheme.white,

    accent: scheme.secondary,
    highlight: brand.like,
    warm: brand.alert,
    verified: scheme.secondary,

    success: brand.success,
    danger: scheme.error,
    warning: brand.alert,
  },
} as const;

export type ThemeName = keyof typeof colors;
export type ColorToken = keyof (typeof colors)['dark'];

/** Gradient stops (use with a linear-gradient component; angle noted per gradient). */
export const gradients = {
  /** Logo mark, 135°. */
  brand: [brand.violet, brand.indigo, brand.blue] as const,
  /** Primary CTA (profile / publish), left → right. */
  cta: [scheme.primaryContainer, scheme.inversePrimary, scheme.tertiaryContainer] as const,
  /** Quick Apply / progress, left → right. */
  apply: [scheme.primary, scheme.secondary] as const,
  /** Avatar rings and the create button, bottom-left → top-right. */
  ring: [scheme.secondary, scheme.primary] as const,
  ringHero: [scheme.secondary, scheme.primary, scheme.primaryContainer] as const,
};

/** Frosted glass layers (DESIGN.md "Elevation & Depth"). */
export const glass = {
  card: 'rgba(17, 24, 39, 0.70)',
  elevated: 'rgba(31, 41, 55, 0.85)',
  dock: 'rgba(12, 19, 34, 0.85)',
  header: 'rgba(12, 19, 34, 0.75)',
  chip: 'rgba(35, 42, 58, 0.70)',
  scrim: 'rgba(7, 14, 29, 0.80)',
  hairline: 'rgba(255, 255, 255, 0.08)',
} as const;

/** Neon glow shadows (colour + radius; opacity applied by the platform shadow props). */
export const glows = {
  primary: { color: scheme.primaryContainer, radius: 24, opacity: 0.45 },
  secondary: { color: scheme.secondary, radius: 12, opacity: 0.8 },
  create: { color: brand.violet, radius: 24, opacity: 0.6 },
} as const;

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

/** Pill-first geometry: cards 16, media frames 32, CTAs fully rounded. */
export const radii = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 32,
  xl: 48,
  card: 16,
  media: 32,
  pill: 999,
} as const;

/** Font family names as registered by the apps (Plus Jakarta Sans + Inter). */
export const fonts = {
  display: 'PlusJakartaSans_800ExtraBold',
  headline: 'PlusJakartaSans_700Bold',
  title: 'PlusJakartaSans_600SemiBold',
  label: 'PlusJakartaSans_600SemiBold',
  labelStrong: 'PlusJakartaSans_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
} as const;

/** Type scale from DESIGN.md (sizes/line heights in px, letter spacing in px at that size). */
export const type = {
  displayHeroMobile: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.85,
  },
  headlineLgMobile: {
    fontFamily: fonts.headline,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  headlineMd: { fontFamily: fonts.title, fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  headlineSm: { fontFamily: fonts.title, fontSize: 18, lineHeight: 24 },
  bodyLg: { fontFamily: fonts.body, fontSize: 16, lineHeight: 26 },
  bodyMd: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22 },
  bodySm: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  labelLg: { fontFamily: fonts.label, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  labelMd: { fontFamily: fonts.label, fontSize: 12, lineHeight: 16, letterSpacing: 0.24 },
  labelSm: { fontFamily: fonts.labelStrong, fontSize: 10, lineHeight: 14, letterSpacing: 0.5 },
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 34,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Minimum touch target (px/dp) for accessibility. */
export const MIN_TOUCH_TARGET = 44;
