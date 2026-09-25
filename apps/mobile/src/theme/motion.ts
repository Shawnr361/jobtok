// Motion tokens. Curves and springs are the Expo/Emil Kowalski reference values, not guesses:
// strong ease-out for anything entering or reacting, ease-in-out for things moving across the
// screen, springs (Apple's duration + damping form) wherever momentum or bounce is the point.
import { cubicBezier, Easing } from 'react-native-reanimated';

/** Entering, exiting, reacting. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** Moving or morphing on screen. */
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
/** The same ease-out, for Reanimated CSS transitions/animations. */
export const CSS_EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
export const CSS_EASE_IN_OUT = cubicBezier(0.77, 0, 0.175, 1);

export const spring = {
  /** Settle with no overshoot. */
  settle: { duration: 400, dampingRatio: 1 },
  /** Snap back / reposition, a little life. */
  snap: { duration: 400, dampingRatio: 0.8 },
  /** A pop that overshoots once (likes, follows, badges). */
  pop: { duration: 450, dampingRatio: 0.55 },
} as const;

export const duration = {
  press: 120,
  toggle: 180,
  enter: 260,
  exit: 160,
} as const;
