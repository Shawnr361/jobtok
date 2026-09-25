import type { ReactNode } from 'react';
import { View } from 'react-native';
import Reanimated, { css, useReducedMotion } from 'react-native-reanimated';
import { CSS_EASE_OUT } from '../../theme/motion';

/**
 * Web only: browsers have no native stack transition, so new screens fade in quickly instead
 * of cutting. A Reanimated CSS animation (opacity only), so it never moves the layout.
 * Phones use the platform's own push transition.
 */
export function ScreenEnter({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <View style={styles.fill}>{children}</View>;
  return <Reanimated.View style={styles.fade}>{children}</Reanimated.View>;
}

const styles = css.create({
  fill: { flex: 1 },
  fade: {
    flex: 1,
    animationName: css.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } }),
    animationDuration: 220,
    animationTimingFunction: CSS_EASE_OUT,
  },
});
