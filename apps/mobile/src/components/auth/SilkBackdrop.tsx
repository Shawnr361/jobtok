// Sign-in backdrop: dark silk ribbons with a violet sheen that sway very slowly, like fabric
// in still air. Drawn with SVG (no image or video to download); holds still with reduced motion.
import { StyleSheet, View } from 'react-native';
import Reanimated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { CSS_EASE_IN_OUT } from '../../theme/motion';

/** Near-black base the ribbons sit on. */
export const SILK_BASE = '#07070d';

interface Ribbon {
  /** Where the ribbon crosses the left edge, and how it bends (400×860 canvas). */
  y: number;
  bend: [number, number, number];
  /** Band width at each end: unequal ends read as a twist in the fabric. */
  width: [number, number];
  /** Brightness of the crease highlight. */
  shine: number;
}

const RIBBONS: Ribbon[] = [
  { y: 120, bend: [-70, 90, -40], width: [70, 30], shine: 0.75 },
  { y: 215, bend: [-40, 60, -80], width: [26, 60], shine: 0.45 },
  { y: 430, bend: [-90, 70, -30], width: [90, 40], shine: 0.6 },
  { y: 520, bend: [-30, 80, -60], width: [20, 34], shine: 0.35 },
  { y: 700, bend: [-80, 50, -70], width: [60, 110], shine: 0.7 },
];

/** Layers from the outside of the ribbon in. `lit` layers scale with the ribbon's shine. */
const TONES = [
  { width: 1, color: '#140d29', opacity: 0.95, lit: false },
  { width: 0.72, color: '#241651', opacity: 0.95, lit: false },
  { width: 0.46, color: '#4a2f9a', opacity: 0.85, lit: true },
  { width: 0.2, color: '#9b7cf0', opacity: 0.8, lit: true },
  { width: 0, color: '#f1e9ff', opacity: 0.9, lit: true },
] as const;

/** The centre line of the ribbon (every layer is drawn along it). */
function crease({ y, bend: [a, b, c] }: Ribbon) {
  return `M-60 ${y} C 90 ${y + a}, 250 ${y + b}, 460 ${y + c}`;
}

function Layer({ indices, duration, sway }: { indices: number[]; duration: number; sway: number }) {
  const reduced = useReducedMotion();
  // A slow there-and-back sway: a Reanimated CSS animation, so it never touches the JS thread.
  return (
    <Reanimated.View
      style={[
        StyleSheet.absoluteFill,
        reduced
          ? null
          : {
              animationName: {
                from: { transform: [{ translateX: 0 }, { translateY: 0 }, { rotate: '0deg' }] },
                to: {
                  transform: [
                    { translateX: sway },
                    { translateY: sway * 0.5 },
                    { rotate: `${sway * 0.05}deg` },
                  ],
                },
              },
              animationDuration: `${duration / 2}ms`,
              animationDirection: 'alternate',
              animationIterationCount: 'infinite',
              animationTimingFunction: CSS_EASE_IN_OUT,
            },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice">
        {indices.map((i) => {
          const r = RIBBONS[i]!;
          const d = crease(r);
          const w = (r.width[0] + r.width[1]) / 2;
          // Stacked strokes read as a rounded fold of fabric: dark edge, mid tone, violet
          // body, light crease, and a hairline where the light catches.
          return (
            <G key={i}>
              {TONES.map((t, j) => (
                <Path
                  key={j}
                  d={d}
                  fill="none"
                  stroke={t.color}
                  strokeOpacity={t.opacity * (t.lit ? r.shine : 1)}
                  strokeWidth={Math.max(0.8, w * t.width)}
                  strokeLinecap="round"
                />
              ))}
            </G>
          );
        })}
      </Svg>
    </Reanimated.View>
  );
}

/** Fills its parent, behind the content. */
export function SilkBackdrop() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: SILK_BASE }]} pointerEvents="none">
      <Layer indices={[1, 3]} duration={26000} sway={-16} />
      <Layer indices={[0, 2, 4]} duration={19000} sway={12} />
    </View>
  );
}
