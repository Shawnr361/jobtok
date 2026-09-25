// The sign-in card: frosted glass with two cut corners, each holding a glass shard.
// `morph.run(swap)` plays the transition and calls `swap` at the moment the card is empty:
//   1. the form fades and sinks away while both shards slide in along the diagonal,
//   2. they lock into one tile in the middle; `swap` changes the form; the card glides to
//      the new form's height,
//   3. a spark flashes beside the tile and rings out,
//   4. the new form rises in as the shards spring back to their corners.
// Driven by Reanimated shared values on the UI thread (no layout animations, which misplace
// elements on the web). ~0.9 s like the reference. Reduced motion: an instant swap.
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import { brand } from '../../theme';
import { CSS_EASE_IN_OUT, EASE_IN_OUT, EASE_OUT, spring } from '../../theme/motion';

const CUT = 40; // chamfer size
const SHARD = 30; // corner shard size
const INSET = 5; // gap between shard and card edge
const PAD = 24; // card padding

export interface Morph {
  content: SharedValue<number>;
  gather: SharedValue<number>;
  spark: SharedValue<number>;
  /** Plays the morph and calls `swap` when the card is empty. */
  run: (swap: () => void) => void;
}

export function useMorph(): Morph {
  const reduced = useReducedMotion();
  const content = useSharedValue(1);
  const gather = useSharedValue(0);
  const spark = useSharedValue(0);
  const running = useRef(false);
  // A change requested mid-morph (e.g. an upload finishing) waits its turn; never dropped.
  const pending = useRef<(() => void) | null>(null);

  const run = useCallback(
    function play(swap: () => void) {
      if (reduced) {
        swap();
        return;
      }
      if (running.current) {
        pending.current = swap;
        return;
      }
      running.current = true;
      if (Platform.OS !== 'web') void Haptics.selectionAsync();

      // Called back on the React Native runtime from the UI-thread animations. They run
      // whether or not the animation finished, so an interruption can't lose the swap or
      // leave the morph locked.
      const release = () => {
        running.current = false;
        const next = pending.current;
        pending.current = null;
        if (next) play(next);
      };
      const second = () => {
        swap();
        spark.set(0);
        spark.set(withDelay(40, withTiming(1, { duration: 440, easing: EASE_OUT })));
        content.set(
          withDelay(
            300,
            withTiming(1, { duration: 320, easing: EASE_OUT }, () => {
              scheduleOnRN(release);
            }),
          ),
        );
        gather.set(withDelay(260, withSpring(0, spring.snap)));
      };

      content.set(withTiming(0, { duration: 170, easing: EASE_OUT }));
      gather.set(
        withTiming(1, { duration: 340, easing: EASE_IN_OUT }, () => {
          scheduleOnRN(second);
        }),
      );
    },
    [reduced, content, gather, spark],
  );

  return { content, gather, spark, run };
}

function chamfer(w: number, h: number) {
  return `M${CUT} 0 H${w} V${h - CUT} L${w - CUT} ${h} H0 V${CUT} Z`;
}

/** A right-triangle glass shard; `corner` is where its right angle sits. */
function Shard({ corner }: { corner: 'tl' | 'br' }) {
  const d = corner === 'tl' ? `M0 0 H${SHARD} L0 ${SHARD} Z` : `M${SHARD} 0 V${SHARD} H0 Z`;
  return (
    <Svg width={SHARD} height={SHARD}>
      <Path d={d} fill="rgba(233,221,255,0.12)" stroke="rgba(233,221,255,0.35)" strokeWidth={1} />
    </Svg>
  );
}

/**
 * The glass card. Pass `morph` (from useMorph) where the content changes in steps; leave it
 * out for a static card with the same look.
 */
export function MorphCard({
  morph: given,
  bare,
  children,
}: {
  morph?: Morph;
  /** Morph only: no glass frame or corner shards (for content that already has its own). */
  bare?: boolean;
  children: ReactNode;
}) {
  const own = useMorph();
  const morph = given ?? own;
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const measuredOnce = useRef(false);
  const [animateHeight, setAnimateHeight] = useState(false);

  const onCard = (e: LayoutChangeEvent) => {
    setW(Math.round(e.nativeEvent.layout.width));
    // Fallback measurement from the card itself (the form is in flow until measured).
    if (h === 0) setH(Math.ceil(e.nativeEvent.layout.height));
  };
  // The form sits in an absolutely positioned layer; its measured height sizes the card, and
  // after the first measurement the card glides between sizes (CSS transition on height).
  const onContent = (e: LayoutChangeEvent) => {
    setH(Math.ceil(e.nativeEvent.layout.height));
    if (!measuredOnce.current) {
      measuredOnce.current = true;
      requestAnimationFrame(() => setAnimateHeight(true));
    }
  };

  const tl = { x: w / 2 - SHARD / 2 - INSET, y: h / 2 - SHARD / 2 - INSET };
  const tlStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: morph.gather.get() * tl.x },
      { translateY: morph.gather.get() * tl.y },
    ],
  }));
  const brStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -morph.gather.get() * tl.x },
      { translateY: -morph.gather.get() * tl.y },
    ],
  }));
  const contentStyle = useAnimatedStyle(() => {
    const v = morph.content.get();
    return { opacity: v, transform: [{ translateY: (1 - v) * 12 }, { scale: 0.98 + v * 0.02 }] };
  });
  const orbStyle = useAnimatedStyle(() => {
    const t = morph.spark.get();
    return {
      opacity: t === 0 ? 0 : t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85,
      transform: [{ scale: 0.4 + Math.min(t / 0.3, 1) * 0.7 }],
    };
  });
  const ringStyle = useAnimatedStyle(() => {
    const t = morph.spark.get();
    return {
      opacity: t === 0 ? 0 : t < 0.25 ? (t / 0.25) * 0.7 : 0.7 * (1 - (t - 0.25) / 0.75),
      transform: [{ scale: 0.5 + t * 2.7 }],
    };
  });
  const sparkAt = { left: w / 2 + SHARD * 0.55, top: h / 2 + SHARD * 0.55 };

  return (
    <Reanimated.View
      onLayout={onCard}
      style={[
        styles.card,
        {
          // Until the form is measured the card simply wraps it (in flow); after that it owns
          // its height so it can glide between forms.
          height: h > 0 ? h : undefined,
          ...(animateHeight
            ? {
                transitionProperty: 'height',
                transitionDuration: 340,
                transitionTimingFunction: CSS_EASE_IN_OUT,
              }
            : null),
        },
      ]}
    >
      {!bare && w > 0 && h > 0 && (
        // Stretches with the card while its height glides, then redraws at the final size.
        <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <Path
            d={chamfer(w, h)}
            fill="rgba(16, 15, 28, 0.82)"
            stroke="rgba(233,221,255,0.18)"
            strokeWidth={1}
          />
        </Svg>
      )}

      <View style={h > 0 ? styles.layer : null} onLayout={onContent}>
        <Reanimated.View style={[bare ? styles.bareContent : styles.content, contentStyle]}>
          {children}
        </Reanimated.View>
      </View>

      {!bare && (
        <>
          <Reanimated.View pointerEvents="none" style={[styles.abs, styles.tl, tlStyle]}>
            <Shard corner="tl" />
          </Reanimated.View>
          <Reanimated.View pointerEvents="none" style={[styles.abs, styles.br, brStyle]}>
            <Shard corner="br" />
          </Reanimated.View>
        </>
      )}

      {w > 0 && h > 0 && (
        <>
          <Reanimated.View
            pointerEvents="none"
            style={[
              styles.abs,
              styles.ring,
              { left: sparkAt.left - 10, top: sparkAt.top - 10 },
              ringStyle,
            ]}
          />
          <Reanimated.View
            pointerEvents="none"
            style={[styles.abs, { left: sparkAt.left - 14, top: sparkAt.top - 14 }, orbStyle]}
          >
            <Svg width={28} height={28}>
              <Defs>
                <RadialGradient id="spark" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#ffffff" stopOpacity={1} />
                  <Stop offset="0.35" stopColor={brand.lavender} stopOpacity={0.9} />
                  <Stop offset="1" stopColor={brand.violet} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={14} cy={14} r={14} fill="url(#spark)" />
            </Svg>
          </Reanimated.View>
        </>
      )}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', overflow: 'visible' },
  // Out of flow so the card's own height can glide; the card height follows it.
  layer: { position: 'absolute', top: 0, left: 0, right: 0 },
  content: { padding: PAD, paddingTop: PAD + 6, gap: 16 },
  bareContent: { gap: 16 },
  abs: { position: 'absolute' },
  tl: { left: INSET, top: INSET },
  br: { right: INSET, bottom: INSET },
  ring: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: brand.lavender,
  },
});
