// Entrances for content the person is waiting on (first-time screens, a success moment).
// Reanimated CSS animations (keyframes that play on mount): they run off the JS thread and,
// unlike Reanimated's `entering` layout animations, never re-position elements on the web.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Reanimated, { css, useReducedMotion } from 'react-native-reanimated';
import { CSS_EASE_OUT } from '../../theme/motion';

const riseSmall = css.keyframes({
  from: { opacity: 0, transform: [{ translateY: 12 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
});
const riseLine = css.keyframes({
  from: { opacity: 0, transform: [{ translateY: 36 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
});

/** Rises 12px into place while fading in, after `delay` ms. */
export function FadeUp({
  delay = 0,
  duration = 420,
  children,
}: {
  delay?: number;
  duration?: number;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <View>{children}</View>;
  return (
    <Reanimated.View
      style={{
        animationName: riseSmall,
        animationDuration: duration,
        animationDelay: delay,
        // Hold the first frame during the delay, so nothing flashes before it starts.
        animationFillMode: 'backwards',
        animationTimingFunction: CSS_EASE_OUT,
      }}
    >
      {children}
    </Reanimated.View>
  );
}

/** A headline line revealed from under a mask: it slides up out of its own baseline. */
export function RevealLine({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <View style={{ overflow: 'hidden' }}>
      {reduced ? (
        children
      ) : (
        <Reanimated.View
          style={{
            animationName: riseLine,
            animationDuration: 640,
            animationDelay: delay,
            animationFillMode: 'backwards',
            animationTimingFunction: CSS_EASE_OUT,
          }}
        >
          {children}
        </Reanimated.View>
      )}
    </View>
  );
}
