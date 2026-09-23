import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, HEADER_BODY_HEIGHT } from '../../components/AppHeader';
import { DOCK_BODY_HEIGHT } from '../../components/NavDock';
import { Glass, Icon } from '../../components/primitives';
import { Button, ErrorText, Notice } from '../../components/ui';
import { ProfileView } from '../../features/profile/ProfileView';
import { authApi, errorMessage, useAuth } from '../../lib/auth/AuthProvider';
import { alpha, c, radii, shadow, type } from '../../theme';

/**
 * The signed-in user's own profile in the design's layout. Only real account data is shown;
 * profile details (name, skills, pitches) arrive with profile setup in a later step.
 */
export default function MyProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, getAccessToken } = useAuth();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const display = user.email?.split('@')[0] ?? user.phone ?? 'You';
  const methods = [
    user.phone && 'phone',
    user.hasPassword && 'password',
    ...user.linkedProviders,
  ].filter(Boolean);

  async function resendEmail() {
    setError(null);
    try {
      setInfo((await authApi.requestEmailVerification(await getAccessToken())).message);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: HEADER_BODY_HEIGHT + insets.top + 8,
          paddingBottom: DOCK_BODY_HEIGHT + insets.bottom + 16,
        }}
      >
        <ProfileView
          avatar={null}
          initials={display.slice(0, 2).toUpperCase()}
          name={display}
          verified={user.verification.phone}
          handleLine={user.phone ?? user.email ?? ''}
          headline="Soon you'll add your name, skills and a 60-second pitch here, so employers can find you."
          status={user.verification.phone ? 'Phone verified' : 'Phone not verified'}
          stats={null}
          action={{
            label: 'Record Your Pitch',
            icon: 'videocam',
            onPress: () => router.push('/create'),
          }}
          skills={[]}
          skillsEmpty="No skills yet. You'll be able to add them soon."
          pitches={[]}
          pitchTile={{
            title: 'Record First Pitch',
            subtitle: '60 seconds max',
            icon: 'videocam',
            onPress: () => router.push('/create'),
          }}
          caseStudies={[]}
          reviews={[]}
          footer={
            <Glass tint={alpha(c.surfaceContainer, 0.7)} style={[styles.account, shadow('md')]}>
              <Text style={[type.labelMd, styles.accountTitle]}>Account</Text>
              <Row
                icon="phone-iphone"
                label="Phone"
                value={user.phone ?? 'Not added'}
                ok={user.verification.phone}
              />
              {user.email && (
                <Row icon="mail" label="Email" value={user.email} ok={user.verification.email} />
              )}
              <Row icon="lock" label="Sign-in methods" value={methods.join(', ')} />

              {!user.verification.phone && (
                <>
                  <Notice>Verify your phone number to start using JobTok.</Notice>
                  <Button
                    label="Verify phone"
                    onPress={() => router.push('/phone?purpose=verify_phone')}
                  />
                </>
              )}
              {user.email && !user.verification.email && (
                <Button
                  label="Resend confirmation email"
                  variant="secondary"
                  onPress={resendEmail}
                />
              )}
              {info && <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>{info}</Text>}
              <ErrorText message={error} />
              <Button
                label="Log out"
                variant="ghost"
                onPress={async () => {
                  await logout();
                  router.replace('/welcome');
                }}
              />
            </Glass>
          }
        />
      </ScrollView>
      <AppHeader title="Profile" />
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  ok,
}: {
  icon: 'phone-iphone' | 'mail' | 'lock';
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={18} color={c.secondary} />
      <View style={{ flex: 1 }}>
        <Text style={[type.labelSm, { color: c.onSurfaceVariant }]}>{label}</Text>
        <Text style={[type.bodyMd, { color: c.onSurface }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {ok !== undefined && (
        <Icon
          name={ok ? 'check-circle' : 'schedule'}
          size={18}
          color={ok ? c.secondary : c.outline}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },
  account: { padding: 16, borderRadius: radii.card, gap: 12 },
  accountTitle: { color: c.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
