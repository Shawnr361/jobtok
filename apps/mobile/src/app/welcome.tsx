import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useLoop, useOnce, useReducedMotion } from '../components/animations/useLoop';
import { GoogleSignIn } from '../components/GoogleSignIn';
import { Gradient, Icon, type IconName } from '../components/primitives';
import { Button, Eyebrow, Logo, Screen, TextLink } from '../components/ui';
import { useAuth } from '../lib/auth/AuthProvider';
import { alpha, brand, c, radii, type } from '../theme';

// JobTok is video discovery first: watch real work, learn from it, show your own, connect.
// One account does it all (no seeker/employer split); opportunity grows out of the work.
const JOURNEY: { icon: IconName; label: string }[] = [
  { icon: 'play-circle-outline', label: 'Watch' },
  { icon: 'lightbulb-outline', label: 'Learn' },
  { icon: 'videocam', label: 'Create' },
  { icon: 'handshake', label: 'Connect' },
];

// Only claims the product actually delivers.
const FEATURES: { icon: IconName; title: string; tag: string; body: string }[] = [
  {
    icon: 'smart-display',
    title: 'Skills worth seeing',
    tag: 'Watch',
    body: 'Chefs, welders, designers, farmers and builders showing real work, start to finish.',
  },
  {
    icon: 'lightbulb-outline',
    title: 'Learn from people who do',
    tag: 'Learn',
    body: 'Tools, steps and tips straight from the work. Save the good ones for later.',
  },
  {
    icon: 'videocam',
    title: 'Your work speaks for you',
    tag: 'Create',
    body: 'Post short videos of what you make. No CV needed.',
  },
  {
    icon: 'handshake',
    title: 'Turn your talent into opportunity',
    tag: 'Connect',
    body: 'Find talented people near you, team up on projects or hire a skilled worker.',
  },
];

export default function Welcome() {
  const router = useRouter();
  const { status } = useAuth();
  if (status === 'signedIn') return <Redirect href="/feed" />;

  return (
    <Screen>
      <Logo />

      <View style={{ gap: 10 }}>
        <Eyebrow icon="play-circle-outline">Africa’s skills, talents and ideas, on video</Eyebrow>
        {/* Brand promise: the tagline is the headline (spec). */}
        <Text
          style={[type.displayHeroMobile, { color: c.onSurface, textAlign: 'center' }]}
          accessibilityRole="header"
        >
          Show what{'\n'}
          <Text style={{ color: brand.lavender }}>you can do.</Text>
        </Text>
        <Text style={[type.bodyMd, styles.muted]}>
          Discover skills, ideas, talent and creativity from across Africa.
        </Text>
      </View>

      <JourneyStrip />

      <View style={{ gap: 10 }}>
        {FEATURES.map((f, i) => (
          <FadeIn key={f.title} delay={150 + i * 90}>
            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Icon name={f.icon} size={22} color={c.secondary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={[type.headlineSm, styles.cardTitle]} numberOfLines={1}>
                    {f.title}
                  </Text>
                  <Text style={[type.labelSm, styles.tag]}>{f.tag}</Text>
                </View>
                <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>{f.body}</Text>
              </View>
            </View>
          </FadeIn>
        ))}
      </View>

      {/* A verified phone comes first (spec), then you land straight in the feed or the studio. */}
      <Button label="Start exploring" onPress={() => router.push('/phone')} />
      <Button
        label="Show your skills"
        variant="secondary"
        onPress={() => router.push({ pathname: '/phone', params: { next: 'create' } })}
      />
      <View style={styles.signIn}>
        <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>Prefer email?</Text>
        <TextLink label="Sign in with email" onPress={() => router.push('/email')} />
      </View>
      <GoogleSignIn />
    </Screen>
  );
}

/**
 * The JobTok loop in one glance: a spark travels Watch → Learn → Create → Connect, lighting
 * each step as it passes, then starts again.
 */
function JourneyStrip() {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  // Reduced motion holds the "everything lit" frame.
  const t = useLoop(4600, { easing: Easing.inOut(Easing.cubic), still: ARRIVE_END + 0.05 });

  // Step centres sit in the middle of equal columns.
  const n = JOURNEY.length;
  const start = width / (2 * n);
  const span = (width * (n - 1)) / n;
  const x = t.interpolate({
    inputRange: [0, ARRIVE_END, 1],
    outputRange: [start - 5, start + span - 5, start + span - 5],
  });
  const trail = t.interpolate({ inputRange: [0, ARRIVE_END, 1], outputRange: [0, span, span] });
  const fade = t.interpolate({ inputRange: [0, 0.9, 1], outputRange: [1, 1, 0] });

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
          <Animated.View
            style={[styles.trail, { left: start, width: trail, opacity: reduced ? 1 : fade }]}
          >
            <Gradient colors={[brand.lavender, c.secondary]} style={{ flex: 1 }} />
          </Animated.View>
          {!reduced && (
            <Animated.View
              style={[styles.spark, { opacity: fade, transform: [{ translateX: x }] }]}
            />
          )}
        </>
      )}
      {JOURNEY.map((step, i) => (
        <Step key={step.label} step={step} t={t} at={i / (JOURNEY.length - 1)} />
      ))}
    </View>
  );
}

function Step({ step, t, at }: { step: (typeof JOURNEY)[number]; t: Animated.Value; at: number }) {
  // Lights up as the spark arrives and stays lit until the loop restarts.
  const arrive = at * ARRIVE_END;
  const lit = t.interpolate({
    inputRange: at === 0 ? [0, 0.9, 1] : [arrive - 0.06, arrive, 0.9, 1],
    outputRange: at === 0 ? [1, 1, 0.35] : [0.35, 1, 1, 0.35],
    extrapolate: 'clamp',
  });
  const scale = lit.interpolate({ inputRange: [0.35, 1], outputRange: [0.92, 1] });
  return (
    <View style={styles.step}>
      <Animated.View style={[styles.stepIcon, { opacity: lit, transform: [{ scale }] }]}>
        <Icon name={step.icon} size={22} color={c.onSurface} />
      </Animated.View>
      <Animated.Text style={[type.labelMd, styles.stepLabel, { opacity: lit }]}>
        {step.label}
      </Animated.Text>
    </View>
  );
}

function FadeIn({ delay, children }: { delay: number; children: React.ReactNode }) {
  const t = useOnce(380, { delay });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  return (
    <Animated.View style={{ opacity: t, transform: [{ translateY }] }}>{children}</Animated.View>
  );
}

const ICON = 48;
/** Share of the loop the spark spends travelling; the rest holds the finished journey. */
const ARRIVE_END = 0.8;

const styles = StyleSheet.create({
  signIn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  muted: { color: c.onSurfaceVariant, textAlign: 'center' },
  journey: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: alpha(c.surfaceContainer, 0.6),
  },
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: alpha(c.surfaceContainer, 0.85),
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(c.secondary, 0.12),
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: c.onSurface, flexShrink: 1, fontSize: 17 },
  tag: {
    color: c.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: alpha(c.secondary, 0.12),
    overflow: 'hidden',
  },
});
