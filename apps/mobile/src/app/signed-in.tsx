// Successful sign-in moment. The animation tells the story of what just happened:
//   1. the badge pops in and the check draws   → you've been confirmed
//   2. rings pulse outward                      → you're now connected to the network
//   3. the greeting fades up                    → new account vs. welcome back
//   4. your real verification status ticks in   → what's done, what's next
//   5. the bar fills and you land on your feed  → (or tap to go now)
// If the phone isn't verified yet (mandatory in the spec), it asks for that instead of
// moving on.
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FadeUp } from '../components/animations/Enter';
import { MorphCard } from '../components/auth/MorphCard';
import { SILK_BASE, SilkBackdrop } from '../components/auth/SilkBackdrop';
import { VerifiedBadge } from '../components/animations/VerifiedBadge';
import { Gradient, Icon, type IconName } from '../components/primitives';
import { Button } from '../components/ui';
import { useAuth } from '../lib/auth/AuthProvider';
import { alpha, brand, c, gradients, radii, type } from '../theme';

const AUTO_CONTINUE_MS = 2600;
const STATUS_START = 1500;

function Status({
  icon,
  label,
  done,
  delay,
}: {
  icon: IconName;
  label: string;
  done: boolean;
  delay: number;
}) {
  return (
    <FadeUp delay={delay}>
      <View
        style={[
          styles.status,
          { borderColor: done ? alpha(c.secondary, 0.35) : alpha(brand.alert, 0.45) },
        ]}
      >
        <Icon name={icon} size={16} color={done ? c.secondary : brand.alert} />
        <Text style={[type.labelMd, { color: c.onSurface, flex: 1 }]}>{label}</Text>
        <Icon
          name={done ? 'check-circle' : 'schedule'}
          size={18}
          color={done ? c.secondary : brand.alert}
        />
      </View>
    </FadeUp>
  );
}

export default function SignedInScreen() {
  const router = useRouter();
  const { user, status } = useAuth();
  const { fresh, reason, next } = useLocalSearchParams<{
    fresh?: string;
    reason?: string;
    next?: string;
  }>();
  // Only known destinations, never an arbitrary path from the URL.
  const destination = next === 'create' ? '/create' : '/feed';

  const phoneDone = Boolean(user?.verification.phone);
  const autoContinue = phoneDone;

  useEffect(() => {
    if (!autoContinue) return;
    const t = setTimeout(() => router.replace(destination), STATUS_START + 500 + AUTO_CONTINUE_MS);
    return () => clearTimeout(t);
  }, [autoContinue, router, destination]);

  if (status === 'signedOut' || (!user && status !== 'loading'))
    return <Redirect href="/welcome" />;
  if (!user) return null;

  const copy =
    reason === 'phone'
      ? { title: 'Phone verified!', body: 'You’re all set to post, message and connect on JobTok.' }
      : fresh === '1'
        ? {
            title: 'You’re in!',
            body: 'Welcome to JobTok. Go see what people are making, then show us what you can do.',
          }
        : { title: 'Welcome back!', body: 'Good to see you again. There’s new work to discover.' };

  const statuses: { icon: IconName; label: string; done: boolean }[] = [
    {
      icon: 'phone-iphone',
      label: phoneDone ? 'Phone verified' : 'Verify your phone next',
      done: phoneDone,
    },
  ];
  if (user.email) {
    statuses.push({
      icon: 'mail',
      label: user.verification.email ? 'Email confirmed' : 'Confirm your email from your inbox',
      done: user.verification.email,
    });
  }
  if (user.linkedProviders.includes('google')) {
    statuses.push({ icon: 'link', label: 'Google connected', done: true });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: SILK_BASE }]}>
      <SilkBackdrop />
      <View style={styles.body}>
        <VerifiedBadge size={200} ringsDelay={1100} />

        {/* The same glass card as sign-in, so the moment reads as one journey. */}
        <View style={{ alignSelf: 'stretch' }}>
          <FadeUp delay={1000}>
            <MorphCard>
              <View style={{ gap: 6 }}>
                <Text style={[type.displayHeroMobile, styles.title]} accessibilityRole="header">
                  {copy.title}
                </Text>
                <Text style={[type.bodyLg, styles.subtitle]}>{copy.body}</Text>
              </View>
              <View style={styles.statuses}>
                {statuses.map((s, i) => (
                  <Status key={s.label} {...s} delay={STATUS_START + i * 220} />
                ))}
              </View>
            </MorphCard>
          </FadeUp>
        </View>
      </View>

      <FadeUp delay={STATUS_START + 400}>
        <View style={styles.footer}>
          {autoContinue ? (
            <>
              <View
                style={styles.track}
                accessibilityLabel={
                  next === 'create' ? 'Opening the studio' : 'Taking you to your feed'
                }
              >
                {/* Fills in real time until the auto-continue: constant motion, so linear. */}
                <Reanimated.View
                  style={{
                    height: '100%',
                    width: '0%',
                    animationName: { from: { width: '0%' }, to: { width: '100%' } },
                    animationDuration: `${AUTO_CONTINUE_MS}ms`,
                    animationDelay: `${STATUS_START + 500}ms`,
                    animationTimingFunction: 'linear',
                    animationFillMode: 'forwards',
                  }}
                >
                  <Gradient colors={gradients.apply} style={{ flex: 1 }} />
                </Reanimated.View>
              </View>
              <Button
                label={next === 'create' ? 'Show your skills' : 'Start exploring'}
                onPress={() => router.replace(destination)}
              />
              {fresh === '1' && (
                // Optional: new people can say what they do first. Nothing here is required.
                <Button
                  label="Tell us what you do first"
                  variant="ghost"
                  onPress={() => router.replace('/profile-edit')}
                />
              )}
            </>
          ) : (
            <>
              <Button
                label="Verify my phone"
                onPress={() => router.replace('/phone?purpose=verify_phone')}
              />
              <Button
                label="I’ll do it later"
                variant="ghost"
                onPress={() => router.replace('/feed')}
              />
            </>
          )}
        </View>
      </FadeUp>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.surface, paddingHorizontal: 24, paddingBottom: 24 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  title: { color: c.onSurface, textAlign: 'center' },
  subtitle: { color: c.onSurfaceVariant, textAlign: 'center', marginTop: 6, maxWidth: 320 },
  statuses: { alignSelf: 'stretch', gap: 8, marginTop: 8 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.card,
    borderWidth: 1,
    backgroundColor: alpha(c.surfaceContainer, 0.7),
  },
  footer: { gap: 12 },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: c.surfaceContainerHigh,
  },
});
