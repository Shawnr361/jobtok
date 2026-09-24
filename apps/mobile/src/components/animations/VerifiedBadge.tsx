// "Verified" success badge (Stitch animated_svg): pop-in badge, self-drawing check,
// pulsing rings and sparkles. Built with react-native-svg + Animated.
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';
import { useLoop, useOnce } from './useLoop';

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
  const t = useLoop(2200, { delay, easing: Easing.bezier(0.24, 0, 0.38, 1), still: 0.2 });
  // Hidden until its loop starts, so rings only appear once the badge is confirmed.
  const shown = useOnce(250, { delay });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
  const opacity = Animated.multiply(
    shown,
    t.interpolate({ inputRange: [0, 1], outputRange: [peak, 0] }),
  );
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, transform: [{ scale }] }]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Circle cx={100} cy={100} r={r} fill="none" stroke={color} strokeWidth={width} />
      </Svg>
    </Animated.View>
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
  const t = useLoop(2000, { delay, easing: Easing.inOut(Easing.ease), still: 0.5 });
  const shown = useOnce(250, { delay });
  const scale = Animated.multiply(
    shown,
    t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.2, 0] }),
  );
  const rotate = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '45deg', '0deg'] });
  const box = size * 2;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - size,
        top: y - size,
        width: box,
        height: box,
        transform: [{ scale }, { rotate }],
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
    </Animated.View>
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
  const k = size / 200; // viewBox → px
  const pop = useOnce(800, { easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
  const draw = useOnce(900, { delay: 400, easing: Easing.bezier(0.65, 0, 0.45, 1), native: false });
  // The check is drawn from a listener rather than an animated SVG component: on web the
  // animated wrapper leaks an invalid `collapsable` attribute onto the <path>.
  const [dashoffset, setDashoffset] = useState(100);
  useEffect(() => {
    const id = draw.addListener(({ value }) => setDashoffset(100 - value * 100));
    return () => draw.removeListener(id);
  }, [draw]);
  const scale = pop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.3, 1.08, 1] });

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

      <Animated.View
        style={[StyleSheet.absoluteFill, styles.center, { opacity: pop, transform: [{ scale }] }]}
      >
        {/* Glow sits on a circle the size of the badge so it never renders as a square. */}
        <View style={[styles.glow, { width: 92 * k, height: 92 * k, borderRadius: 46 * k }]} />
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
          <Path
            d="M78 100.5L92.5 115L124 83.5"
            stroke="#FFFFFF"
            strokeWidth={6.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={100}
            strokeDashoffset={dashoffset}
          />
        </Svg>
      </Animated.View>

      <Sparkle x={148 * k} y={54 * k} size={10 * k} color="#38BDF8" delay={ringsDelay} star />
      <Sparkle x={48 * k} y={142 * k} size={8 * k} color="#A78BFA" delay={ringsDelay + 1000} star />
      <Sparkle x={52 * k} y={60 * k} size={7 * k} color="#34D399" delay={ringsDelay + 300} />
      <Sparkle x={150 * k} y={138 * k} size={6 * k} color="#38BDF8" delay={ringsDelay + 1300} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    backgroundColor: '#06B6D4',
    shadowColor: '#06B6D4',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
});
