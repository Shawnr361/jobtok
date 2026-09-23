// JobTok 3D play-shield hero (Stitch three.js_2), rebuilt without WebGL so it stays light on
// low-end phones: a tilting gradient play mark, two orbiting rings, a floating cyan
// "recording" orb and twinkling dust.
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import { useLoop } from './useLoop';

// Fixed dust positions (percent of the box) so the scene is identical on every render.
const DUST = [
  [12, 22],
  [22, 70],
  [30, 12],
  [38, 84],
  [64, 16],
  [72, 78],
  [84, 30],
  [90, 64],
  [8, 48],
  [50, 6],
  [56, 92],
  [94, 12],
  [18, 90],
  [80, 88],
] as const;

function Dust({ x, y, delay }: { x: number; y: number; delay: number }) {
  const t = useLoop(2600, { delay, easing: Easing.inOut(Easing.ease), still: 0.5 });
  const opacity = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.9, 0.15] });
  return <Animated.View style={[styles.dust, { left: `${x}%`, top: `${y}%`, opacity }]} />;
}

function OrbitRing({
  size,
  rx,
  ry,
  color,
  opacity,
  tilt,
  duration,
  reverse,
}: {
  size: number;
  rx: number;
  ry: number;
  color: string;
  opacity: number;
  tilt: string;
  duration: number;
  reverse?: boolean;
}) {
  const t = useLoop(duration);
  const spin = t.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'],
  });
  return (
    <Animated.View style={[styles.center, { transform: [{ rotate: tilt }, { rotate: spin }] }]}>
      <Svg width={size} height={size} viewBox="-100 -100 200 200">
        <Ellipse
          cx={0}
          cy={0}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={color}
          strokeOpacity={opacity}
          strokeWidth={1.6}
        />
        {/* A bright bead travelling on the ring gives the orbit a sense of direction. */}
        <Circle cx={rx} cy={0} r={3} fill={color} />
      </Svg>
    </Animated.View>
  );
}

export function PlayShield({ height = 176 }: { height?: number }) {
  const size = height;
  const sway = useLoop(5200, { easing: Easing.inOut(Easing.sin), still: 0.25 });
  const bob = useLoop(2900, { easing: Easing.inOut(Easing.sin), still: 0.25 });

  const rotateY = sway.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-22deg', '22deg', '-22deg'],
  });
  const rotateX = sway.interpolate({
    inputRange: [0, 0.25, 0.75, 1],
    outputRange: ['0deg', '10deg', '-10deg', '0deg'],
  });
  const orbY = bob.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -8, 0] });
  const orbX = bob.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 5, 0] });

  return (
    <View style={[styles.box, { height }]} accessibilityLabel="JobTok" accessibilityRole="image">
      {DUST.map(([x, y], i) => (
        <Dust key={i} x={x} y={y} delay={(i * 370) % 2600} />
      ))}

      <OrbitRing
        size={size}
        rx={88}
        ry={30}
        color="#38BDF8"
        opacity={0.65}
        tilt="-18deg"
        duration={15000}
      />
      <OrbitRing
        size={size}
        rx={96}
        ry={42}
        color="#A855F7"
        opacity={0.45}
        tilt="24deg"
        duration={21000}
        reverse
      />

      <Animated.View
        style={[
          styles.center,
          styles.markGlow,
          { transform: [{ perspective: 600 }, { rotateY }, { rotateX }] },
        ]}
      >
        <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="playGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#A78BFA" />
              <Stop offset="0.5" stopColor="#8B5CF6" />
              <Stop offset="1" stopColor="#3B82F6" />
            </LinearGradient>
            <LinearGradient id="playEdge" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {/* Rounded play triangle, with a lighter bevel edge on top for depth. */}
          <Path
            d="M28 18 Q24 16 24 21 L24 79 Q24 84 28 82 L80 54 Q85 50 80 46 Z"
            fill="url(#playGrad)"
          />
          <Path
            d="M28 18 Q24 16 24 21 L24 79 Q24 84 28 82 L80 54 Q85 50 80 46 Z"
            fill="none"
            stroke="url(#playEdge)"
            strokeWidth={2}
          />
        </Svg>
      </Animated.View>

      {/* The cyan "recording" orb floats just above the play mark. */}
      <View style={styles.center} pointerEvents="none">
        <Animated.View
          style={[
            styles.orb,
            {
              marginLeft: size * 0.36,
              marginTop: -size * 0.38,
              transform: [{ translateX: orbX }, { translateY: orbY }],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  markGlow: {
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.7,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  orb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#06B6D4',
    shadowColor: '#06B6D4',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  dust: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#38BDF8',
  },
});
