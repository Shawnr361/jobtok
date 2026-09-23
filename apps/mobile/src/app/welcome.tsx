import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { GoogleSignIn } from '../components/GoogleSignIn';
import { Cover, Glass, Icon, PulseDot, Scrim } from '../components/primitives';
import { Button, Logo, Screen } from '../components/ui';
import { images } from '../features/demo/data';
import { useAuth } from '../lib/auth/AuthProvider';
import { alpha, brand, c, radii, shadow, type } from '../theme';

export default function Welcome() {
  const router = useRouter();
  const { status } = useAuth();
  if (status === 'signedIn') return <Redirect href="/feed" />;

  return (
    <Screen>
      <Logo />

      {/* Feed teaser */}
      <View style={[styles.hero, shadow('xl')]}>
        <Cover source={images.josh.cover} />
        <Scrim
          position="bottom"
          from={c.surfaceContainerLowest}
          height="75%"
          stops={[c.surfaceContainerLowest, alpha(c.surfaceContainerLowest, 0.6), 'transparent']}
        />
        <Glass tint={alpha(c.surfaceContainerHigh, 0.8)} style={styles.match}>
          <PulseDot />
          <Text style={[type.labelSm, { color: c.secondary, letterSpacing: 1 }]}>
            SKILLS ON SHOW
          </Text>
        </Glass>
        <View style={styles.heroText}>
          <Text style={[type.headlineSm, { color: c.onSurface }]}>Josh Akindele</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="location-on" size={14} color={c.secondary} />
            <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>
              Lagos, Nigeria • Carpenter
            </Text>
          </View>
        </View>
      </View>

      {/* Brand promise: the tagline is the headline (spec). */}
      <View style={{ gap: 6 }}>
        <Text style={[type.displayHeroMobile, { color: c.onSurface }]} accessibilityRole="header">
          Show me what{'\n'}
          <Text style={{ color: brand.lavender }}>you can do.</Text>
        </Text>
        <Text style={[type.headlineSm, { color: c.onSurface }]}>
          Real People. <Text style={{ color: c.secondary }}>Real Skills.</Text>
          {'\n'}
          <Text style={{ color: brand.blue }}>Real Opportunities.</Text>
        </Text>
        <Text style={[type.bodyMd, { color: c.onSurfaceVariant }]}>
          Record a 60-second video of your skills. Get found by employers, apply for jobs or hire
          great people, all in one app.
        </Text>
      </View>

      <Button label="Continue with phone" onPress={() => router.push('/phone')} />
      <Button
        label="Continue with email"
        variant="secondary"
        onPress={() => router.push('/email')}
      />
      <GoogleSignIn />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 220,
    borderRadius: radii.media,
    overflow: 'hidden',
    backgroundColor: c.surfaceContainerLowest,
    justifyContent: 'space-between',
    padding: 16,
  },
  match: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  heroText: { gap: 2 },
});
