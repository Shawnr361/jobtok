import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Reanimated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { FadeUp, RevealLine } from '../../components/animations/Enter';
import { GoogleSignIn } from '../../components/GoogleSignIn';
import { Gradient, Icon, type IconName } from '../../components/primitives';
import { Button, Eyebrow, Logo, TextLink } from '../../components/ui';
import type { AuthNav } from './AuthFlow';
import { alpha, brand, c, EASE_IN_OUT, gradients, type } from '../../theme';

// JobTok is video discovery first: watch real work, learn from it, show your own, connect.
// One account does it all (no seeker/employer split); opportunity grows out of the work.
const JOURNEY: { icon: IconName; label: string }[] = [
  { icon: 'play-circle-outline', label: 'Watch' },
  { icon: 'lightbulb-outline', label: 'Learn' },
  { icon: 'videocam', label: 'Create' },
  { icon: 'handshake', label: 'Connect' },
];

// Only claims the product actually delivers.
const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'smart-display',
    title: 'Skills worth seeing',
    body: 'Chefs, welders, designers, farmers and builders showing real work, start to finish.',
  },
  {
    icon: 'lightbulb-outline',
    title: 'Learn from people who do',
    body: 'Tools, steps and tips straight from the work. Save the good ones for later.',
  },
  {
    icon: 'videocam',
    title: 'Your work speaks for you',
    body: 'Post short videos of what you make. No CV needed.',
  },
  {
    icon: 'handshake',
    title: 'Turn your talent into opportunity',
    body: 'Find talented people near you, team up on projects or hire a skilled worker.',
  },
];

/** The first panel of the sign-in card: what JobTok is, and the ways in. */
export function WelcomePanel({ nav }: { nav: AuthNav }) {
  return (
    <>
      <FadeUp delay={0}>
        <Logo />
      </FadeUp>

      <View style={{ gap: 10 }}>
        <FadeUp delay={80}>
          <Eyebrow icon="play-circle-outline">Africa’s skills, talents and ideas, on video</Eyebrow>
        </FadeUp>
        {/* Brand promise: the tagline is the headline (spec). */}
        <View accessible accessibilityRole="header" accessibilityLabel="Show what you can do.">
          <RevealLine delay={160}>
            <Text style={[type.displayHeroMobile, styles.hero]}>Show what</Text>
          </RevealLine>
          <RevealLine delay={300}>
            <Text style={[type.displayHeroMobile, styles.hero, { color: brand.lavender }]}>
              you can do.
            </Text>
          </RevealLine>
        </View>
        <FadeUp delay={460}>
          <Text style={[type.bodyMd, styles.muted]}>
            Discover skills, ideas, talent and creativity from across Africa.
          </Text>
        </FadeUp>
      </View>

      <FadeUp delay={560}>
        <JourneyStrip />
      </FadeUp>

      {/* A plain list: type and spacing do the grouping, no boxes or badges. */}
      <View>
        {FEATURES.map((f, i) => (
          <FadeUp key={f.title} delay={660 + i * 90}>
            <View style={[styles.row, i > 0 && styles.rowRule]}>
              <Icon name={f.icon} size={22} color={brand.lavender} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[type.labelLg, { color: c.onSurface }]}>{f.title}</Text>
                <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>{f.body}</Text>
              </View>
            </View>
          </FadeUp>
        ))}
      </View>

      {/* A verified phone comes first (spec), then you land straight in the feed or the studio. */}
      <FadeUp delay={1060}>
        <View style={{ gap: 12 }}>
          <Button label="Start exploring" onPress={() => nav.go('phone', { next: undefined })} />
          <Button
            label="Show your skills"
            variant="secondary"
            onPress={() => nav.go('phone', { next: 'create' })}
          />
        </View>
      </FadeUp>
      <View style={styles.signIn}>
        <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>Prefer email?</Text>
        <TextLink label="Sign in with email" onPress={() => nav.go('email')} />
      </View>
      <GoogleSignIn />
    </>
  );
}

/**
 * The JobTok loop in one glance: a spark travels Watch → Learn → Create → Connect once,
 * lighting each step as it passes, and the finished journey stays lit.
 */
function JourneyStrip() {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  // Plays once after the headline settles (explanation, first visit only). Reduced motion
  // shows the finished journey.
  const t = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced || width === 0) return;
    t.set(withDelay(700, withTiming(1, { duration: 2400, easing: EASE_IN_OUT })));
  }, [reduced, width, t]);

  // Step centres sit in the middle of equal columns.
  const n = JOURNEY.length;
  const start = width / (2 * n);
  const span = (width * (n - 1)) / n;

  const sparkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.get(), [0, ARRIVE_END, 1], [1, 1, 0]),
    transform: [
      {
        translateX: interpolate(
          t.get(),
          [0, ARRIVE_END, 1],
          [start - 5, start + span - 5, start + span - 5],
        ),
      },
    ],
  }));
  // The trail grows with a transform (scaleX from its left edge), not a width animation.
  const trailStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(t.get(), [0, ARRIVE_END, 1], [0, 1, 1]) }],
  }));

  return (
    <View
      style={styles.journey}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="text"
      accessibilityLabel="Watch, learn, create and connect. All from one account."
    >
      {width > 0 && (
        <>
          <View style={[styles.track, { left: start, width: span }]} />
          <Reanimated.View
            style={[
              styles.trail,
              { left: start, width: span, transformOrigin: 'left' },
              trailStyle,
            ]}
          >
            <Gradient colors={gradients.apply} style={{ flex: 1 }} />
          </Reanimated.View>
          {!reduced && <Reanimated.View style={[styles.spark, sparkStyle]} />}
        </>
      )}
      {JOURNEY.map((step, i) => (
        <Step key={step.label} step={step} t={t} at={i / (JOURNEY.length - 1)} />
      ))}
    </View>
  );
}

function Step({
  step,
  t,
  at,
}: {
  step: (typeof JOURNEY)[number];
  t: SharedValue<number>;
  at: number;
}) {
  // Lights up as the spark arrives and stays lit.
  const arrive = at * ARRIVE_END;
  const litStyle = useAnimatedStyle(() => {
    const lit =
      at === 0 ? 1 : interpolate(t.get(), [arrive - 0.06, arrive], [0.35, 1], Extrapolation.CLAMP);
    return { opacity: lit, transform: [{ scale: 0.92 + (lit - 0.35) * (0.08 / 0.65) }] };
  });
  const labelStyle = useAnimatedStyle(() => ({
    opacity:
      at === 0 ? 1 : interpolate(t.get(), [arrive - 0.06, arrive], [0.35, 1], Extrapolation.CLAMP),
  }));
  return (
    <View style={styles.step}>
      <Reanimated.View style={[styles.stepIcon, litStyle]}>
        <Icon name={step.icon} size={22} color={c.onSurface} />
      </Reanimated.View>
      <Reanimated.Text style={[type.labelMd, styles.stepLabel, labelStyle]}>
        {step.label}
      </Reanimated.Text>
    </View>
  );
}

const ICON = 48;
/** Share of the animation the spark spends travelling; the rest fades it out. */
const ARRIVE_END = 0.85;

const styles = StyleSheet.create({
  signIn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  muted: { color: c.onSurfaceVariant, textAlign: 'center' },
  hero: { color: c.onSurface, textAlign: 'center' },
  journey: { flexDirection: 'row', paddingVertical: 16 },
  track: {
    position: 'absolute',
    top: 16 + ICON / 2 - 1,
    height: 2,
    backgroundColor: c.outlineVariant,
  },
  trail: {
    position: 'absolute',
    top: 16 + ICON / 2 - 1,
    height: 2,
    overflow: 'hidden',
  },
  spark: {
    position: 'absolute',
    left: 0,
    top: 16 + ICON / 2 - 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.secondary,
    shadowColor: c.secondary,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  step: { flex: 1, alignItems: 'center', gap: 8 },
  stepIcon: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: alpha(brand.lavender, 0.5),
  },
  stepLabel: { color: c.onSurface, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 14 },
  rowRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.outlineVariant },
});
