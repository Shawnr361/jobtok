// Mobile theme: the shared tokens plus React Native specific helpers.
import { glows, scheme } from '@jobtok/tokens';
import { Platform, type ViewStyle } from 'react-native';

export * from '@jobtok/tokens';

/** Short alias used by the screens: `c.surfaceContainer`, `c.secondary`, ... */
export const c = scheme;

/** Colour with alpha, e.g. alpha(c.secondaryContainer, 0.2) (for 6-digit hex colours). */
export function alpha(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
}

/** Neon glow (iOS/web shadow; Android falls back to elevation without colour). */
export function glow(kind: keyof typeof glows = 'primary'): ViewStyle {
  const g = glows[kind];
  return Platform.select<ViewStyle>({
    android: { elevation: 10, shadowColor: g.color },
    default: {
      shadowColor: g.color,
      shadowOpacity: g.opacity,
      shadowRadius: g.radius / 2,
      shadowOffset: { width: 0, height: 0 },
    },
  })!;
}

/** Soft dark drop shadow for cards (DESIGN.md: shadow-md / shadow-xl). */
export function shadow(level: 'md' | 'xl' = 'md'): ViewStyle {
  const big = level === 'xl';
  return Platform.select<ViewStyle>({
    android: { elevation: big ? 12 : 5 },
    default: {
      shadowColor: '#000',
      shadowOpacity: big ? 0.45 : 0.3,
      shadowRadius: big ? 18 : 8,
      shadowOffset: { width: 0, height: big ? 10 : 4 },
    },
  })!;
}

export * from './motion';
