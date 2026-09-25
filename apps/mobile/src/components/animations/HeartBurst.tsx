import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { brand } from '../../theme';
import { EASE_OUT, spring } from '../../theme/motion';
import { Icon } from '../primitives';

const SIZE = 104;

/**
 * The big heart that pops where you double-tap a video (the rare "delight" moment): it
 * springs in with a tilt, holds, then floats up and fades. Mount one per double-tap.
 */
export function HeartBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : 0.4);
  const lift = useSharedValue(0);
  const opacity = useSharedValue(0);
  const [tilt] = useState(() => (Math.random() - 0.5) * 30);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const finish = () => done.current();
    opacity.set(
      withSequence(
        withTiming(1, { duration: 90 }),
        withTiming(1, { duration: reduced ? 300 : 380 }),
        withTiming(0, { duration: 260, easing: EASE_OUT }, (ok) => {
          if (ok) scheduleOnRN(finish);
        }),
      ),
    );
    if (!reduced) {
      scale.set(withSpring(1, spring.pop));
      lift.set(
        withSequence(
          withTiming(0, { duration: 420 }),
          withTiming(-80, { duration: 300, easing: EASE_OUT }),
        ),
      );
    }
  }, [opacity, scale, lift, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: lift.get() }, { scale: scale.get() }, { rotate: `${tilt}deg` }],
  }));

  return (
    <Reanimated.View
      pointerEvents="none"
      style={[styles.heart, { left: x - SIZE / 2, top: y - SIZE / 2 }, style]}
    >
      <Icon name="favorite" size={SIZE} color={brand.like} />
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  heart: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
});
