import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Body, Button, ErrorText, Logo, Notice, Screen, Title } from '../components/ui';
import { authApi, errorMessage, useAuth } from '../lib/auth/AuthProvider';

/** Signed-in placeholder: proves the session works. Onboarding/profiles come in later steps. */
export default function Home() {
  const router = useRouter();
  const { status, user, logout, getAccessToken } = useAuth();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'signedIn' || !user) return <Redirect href="/welcome" />;

  async function resendEmail() {
    setError(null);
    try {
      await authApi.requestEmailVerification(await getAccessToken());
      setInfo('Verification email sent.');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Screen>
      <Logo />
      <Title>You’re signed in</Title>
      <View style={{ gap: 4 }}>
        {user.phone && <Body>Phone: {user.phone}</Body>}
        {user.email && <Body>Email: {user.email}</Body>}
        <Body muted>
          Sign-in methods:{' '}
          {[user.phone && 'phone', user.hasPassword && 'password', ...user.linkedProviders]
            .filter(Boolean)
            .join(', ')}
        </Body>
      </View>

      {!user.verification.phone && (
        <>
          <Notice>Verify your phone number to start using JobTok.</Notice>
          <Button label="Verify phone" onPress={() => router.push('/phone?purpose=verify_phone')} />
        </>
      )}
      {user.email && !user.verification.email && (
        <Button label="Resend email verification" variant="secondary" onPress={resendEmail} />
      )}
      {info && <Body muted>{info}</Body>}
      <ErrorText message={error} />

      <Button
        label="Log out"
        variant="ghost"
        onPress={async () => {
          await logout();
          router.replace('/welcome');
        }}
      />
    </Screen>
  );
}
