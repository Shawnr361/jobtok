// Shared animation helpers. Every looping animation respects the OS "Reduce motion" setting
// (spec: accessibility), holding a still frame instead of moving.
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduced(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/**
 * A value that runs 0 → 1 over `duration` ms, forever (after an optional delay).
 * With reduced motion it stays at `still` (default 0).
 */
export function useLoop(
  duration: number,
  { delay = 0, easing = Easing.linear, native = true, still = 0 } = {},
): Animated.Value {
  const reduced = useReducedMotion();
  const [value] = useState(() => new Animated.Value(still));
  useEffect(() => {
    if (reduced) {
      value.setValue(still);
      return;
    }
    value.setValue(0);
    const loop = Animated.loop(
      Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: native }),
    );
    const start = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [value, duration, delay, easing, native, still, reduced]);
  return value;
}

/** A value that runs 0 → 1 once (entrance animations). Instant with reduced motion. */
export function useOnce(
  duration: number,
  { delay = 0, easing = Easing.out(Easing.cubic), native = true } = {},
) {
  const reduced = useReducedMotion();
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) {
      value.setValue(1);
      return;
    }
    const anim = Animated.timing(value, {
      toValue: 1,
      duration,
      delay,
      easing,
      useNativeDriver: native,
    });
    anim.start();
    return () => anim.stop();
  }, [value, duration, delay, easing, native, reduced]);
  return value;
}
