// Motion for things you switch on and off: like, save, follow, bookmark.
// ON: the icon pops (one overshoot spring) and a ring breathes out from it, with a light
// haptic in the same frame. OFF: a short give (scale dips and settles), no haptic.
// Nothing moves on the first render; reduced motion keeps only the colour change.
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View, type TextStyle } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { c } from '../../theme';
import { EASE_OUT, spring } from '../../theme/motion';
import { Icon, type IconName } from '../primitives';

/** Keeps a bare white icon readable over any video frame. */
export const ICON_SHADOW: TextStyle = {
  textShadowColor: 'rgba(0, 0, 0, 0.45)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
};

/** One light tap for a committed toggle (phones only; the visual stands on its own). */
export function tapHaptic() {
  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function useToggleMotion(on: boolean) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const ring = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    if (on) {
      scale.set(
        withSequence(
          withTiming(0.8, { duration: 70, easing: EASE_OUT }),
          withSpring(1, spring.pop),
        ),
      );
      ring.set(0);
      ring.set(withTiming(1, { duration: 520, easing: EASE_OUT }));
    } else {
      scale.set(
        withSequence(
          withTiming(0.86, { duration: 90, easing: EASE_OUT }),
          withSpring(1, spring.settle),
        ),
      );
    }
  }, [on, reduced, scale, ring]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.get() < 0.15 ? ring.get() * 5 : (1 - ring.get()) * 0.8,
    transform: [{ scale: 0.6 + ring.get() * 1.3 }],
  }));
  return { iconStyle, ringStyle };
}

/** An icon that swaps with motion: pops (with a ring) when it turns on, gives when off. */
export function ToggleIcon({
  on,
  onIcon,
  offIcon,
  size = 24,
  color = c.onSurface,
  activeColor,
  shadow,
}: {
  on: boolean;
  onIcon: IconName;
  offIcon: IconName;
  size?: number;
  color?: string;
  activeColor?: string;
  /** Soft shadow, for icons sitting directly on video. */
  shadow?: boolean;
}) {
  const { iconStyle, ringStyle } = useToggleMotion(on);
  const tint = on ? (activeColor ?? color) : color;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Reanimated.View
        pointerEvents="none"
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2, borderColor: tint },
          ringStyle,
        ]}
      />
      <Reanimated.View style={iconStyle}>
        <Icon
          name={on ? onIcon : offIcon}
          size={size}
          color={tint}
          {...(shadow ? { style: ICON_SHADOW } : {})}
        />
      </Reanimated.View>
    </View>
  );
}

/**
 * The small follow button on a creator's avatar: a "+" that becomes a tick. The fill
 * cross-fades (CSS transition) and the badge pops when you follow, gives when you unfollow.
 */
export function FollowBadge({ on, size = 22 }: { on: boolean; size?: number }) {
  const { iconStyle, ringStyle } = useToggleMotion(on);
  const round = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={round}>
      <Reanimated.View
        pointerEvents="none"
        style={[styles.ring, round, { borderColor: c.secondary }, ringStyle]}
      />
      <Reanimated.View
        style={[
          styles.fill,
          round,
          {
            backgroundColor: on ? c.secondary : c.primary,
            transitionProperty: 'backgroundColor',
            transitionDuration: 180,
          },
          iconStyle,
        ]}
      >
        <Icon
          name={on ? 'check' : 'add'}
          size={size * 0.64}
          color={on ? c.onSecondary : c.onPrimary}
        />
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 2 },
  fill: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
