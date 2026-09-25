// "Verified" success badge (Stitch animated_svg), the app's biggest delight moment:
// the badge springs in, the check draws itself left to right, then two rings breathe out
// and sparkles twinkle. Springs and reveals run on the UI thread (Reanimated); the loops
// are Reanimated CSS animations. One success haptic when it lands. Reduced motion: the
// finished badge, still.
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';
import { CSS_EASE_OUT, EASE_OUT, spring } from '../../theme/motion';

// The check's horizontal extent in the 200×200 viewBox (M78 → 124).
const CHECK_LEFT = 74;
const CHECK_WIDTH = 54;

function Ring({
  size,
  r,
  color,
  width,
  delay,
  from,
  to,
  peak,
}: {
  size: number;
  r: number;
  color: string;
  width: number;
  delay: number;
  from: number;
  to: number;
  peak: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <Reanimated.View
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: 0,
          animationName: {
            from: { opacity: peak, transform: [{ scale: from }] },
            to: { opacity: 0, transform: [{ scale: to }] },
          },
          animationDuration: '2200ms',
          animationDelay: `${delay}ms`,
          animationIterationCount: 'infinite',
          animationTimingFunction: CSS_EASE_OUT,
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Circle cx={100} cy={100} r={r} fill="none" stroke={color} strokeWidth={width} />
      </Svg>
    </Reanimated.View>
  );
}

function Sparkle({
  x,
  y,
  size,
  color,
  delay,
  star,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  star?: boolean;
}) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  const box = size * 2;
  return (
    <Reanimated.View
      style={{
        position: 'absolute',
        left: x - size,
        top: y - size,
        width: box,
        height: box,
        transform: [{ scale: 0 }],
        animationName: {
          '0%': { transform: [{ scale: 0 }, { rotate: '0deg' }] },
          '50%': { transform: [{ scale: 1.2 }, { rotate: '45deg' }] },
          '100%': { transform: [{ scale: 0 }, { rotate: '0deg' }] },
        },
        animationDuration: '2000ms',
        animationDelay: `${delay}ms`,
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
      }}
    >
      <Svg width={box} height={box} viewBox={`${-size} ${-size} ${box} ${box}`}>
        {star ? (
          <Polygon
            fill={color}
            points={[0, -1, 0.3, -0.3, 1, 0, 0.3, 0.3, 0, 1, -0.3, 0.3, -1, 0, -0.3, -0.3]
              .map((p) => p * size)
              .join(',')}
          />
        ) : (
          <Circle cx={0} cy={0} r={size * 0.45} fill={color} />
        )}
      </Svg>
    </Reanimated.View>
  );
}

/**
 * @param size rendered width/height in px.
 * @param ringsDelay ms before the rings start pulsing (e.g. after the check has drawn).
 */
export function VerifiedBadge({
  size = 160,
  ringsDelay = 0,
}: {
  size?: number;
  ringsDelay?: number;
}) {
  const reduced = useReducedMotion();
  const k = size / 200; // viewBox → px
  const pop = useSharedValue(reduced ? 1 : 0.5);
  const shown = useSharedValue(reduced ? 1 : 0);
  const draw = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    shown.set(withTiming(1, { duration: 180 }));
    pop.set(withSpring(1, spring.pop));
    draw.set(withDelay(380, withTiming(1, { duration: 480, easing: EASE_OUT })));
    // The haptic lands with the check, the moment the success is confirmed.
    const t = setTimeout(() => {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 420);
    return () => clearTimeout(t);
  }, [reduced, pop, shown, draw]);

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ scale: pop.get() }],
  }));
  // Reveal the check left to right: a clipping window that widens over it.
  const checkStyle = useAnimatedStyle(() => ({ width: draw.get() * CHECK_WIDTH * k }));

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityLabel="Verified"
      accessibilityRole="image"
    >
      <Ring
        size={size}
        r={62}
        color="#06B6D4"
        width={2}
        delay={ringsDelay + 600}
        from={0.85}
        to={1.65}
        peak={0.6}
      />
      <Ring
        size={size}
        r={54}
        color="#8B5CF6"
        width={2.5}
        delay={ringsDelay}
        from={0.85}
        to={1.45}
        peak={0.8}
      />

      <Reanimated.View style={[StyleSheet.absoluteFill, styles.center, badgeStyle]}>
        <View style={[styles.shade, { width: 92 * k, height: 92 * k, borderRadius: 46 * k }]} />
        <Svg style={StyleSheet.absoluteFill} width={size} height={size} viewBox="0 0 200 200">
          <Defs>
            <LinearGradient id="successGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#10B981" />
              <Stop offset="0.5" stopColor="#06B6D4" />
              <Stop offset="1" stopColor="#8B5CF6" />
            </LinearGradient>
          </Defs>
          <Circle cx={100} cy={100} r={46} fill="url(#successGrad)" />
          <Circle
            cx={100}
            cy={100}
            r={43}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={0.3}
            strokeWidth={1.5}
          />
        </Svg>
        <Reanimated.View
          style={[styles.checkClip, { left: CHECK_LEFT * k, top: 0, height: size }, checkStyle]}
        >
          <Svg
            style={{ position: 'absolute', left: -CHECK_LEFT * k, top: 0 }}
            width={size}
            height={size}
            viewBox="0 0 200 200"
          >
            <Path
              d="M78 100.5L92.5 115L124 83.5"
              stroke="#FFFFFF"
              strokeWidth={6.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Reanimated.View>
      </Reanimated.View>

      <Sparkle x={148 * k} y={54 * k} size={10 * k} color="#38BDF8" delay={ringsDelay} star />
      <Sparkle x={48 * k} y={142 * k} size={8 * k} color="#A78BFA" delay={ringsDelay + 1000} star />
      <Sparkle x={52 * k} y={60 * k} size={7 * k} color="#34D399" delay={ringsDelay + 300} />
      <Sparkle x={150 * k} y={138 * k} size={6 * k} color="#38BDF8" delay={ringsDelay + 1300} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  // Soft neutral depth under the badge (no coloured glow).
  shade: {
    backgroundColor: '#0b1220',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  checkClip: { position: 'absolute', overflow: 'hidden' },
});
