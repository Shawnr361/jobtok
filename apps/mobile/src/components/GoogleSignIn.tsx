import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { authApi, errorMessage, useAuth } from '../lib/auth/AuthProvider';
import { DEV_GOOGLE, GOOGLE_CLIENT_IDS, GOOGLE_CONFIGURED } from '../lib/config';
import { Button, ErrorText, Field, Notice } from './ui';

WebBrowser.maybeCompleteAuthSession();

/**
 * Google entry point. Three explicit states:
 * - real Google Sign-In when client IDs are configured (the ID token is verified by the API);
 * - a clearly labelled DEVELOPMENT MOCK when EXPO_PUBLIC_AUTH_DEV_GOOGLE=true;
 * - otherwise a disabled button explaining it is not configured.
 */
export function GoogleSignIn() {
  if (GOOGLE_CONFIGURED) return <RealGoogleButton />;
  if (DEV_GOOGLE) return <DevGoogleMock />;
  return (
    <View style={{ gap: 8 }}>
      <Button label="Continue with Google" variant="secondary" onPress={() => {}} disabled />
      <Notice>Google sign-in isn’t set up in this version yet.</Notice>
    </View>
  );
}

function useFinishGoogle() {
  const router = useRouter();
  const { acceptSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const finish = useCallback(
    async (idToken: string) => {
      setBusy(true);
      setError(null);
      try {
        const session = await authApi.google(idToken);
        await acceptSession(session);
        router.replace({
          pathname: '/signed-in',
          params: { fresh: session.isNewUser ? '1' : '0' },
        });
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [acceptSession, router],
  );
  return { finish, error, setError, busy };
}

function RealGoogleButton() {
  const { finish, error, setError, busy } = useFinishGoogle();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.web,
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    androidClientId: GOOGLE_CLIENT_IDS.android,
  });

  // Each Google response is handled exactly once, even if `finish` changes identity.
  const handled = useRef<typeof response>(null);
  useEffect(() => {
    if (!response || handled.current === response) return;
    handled.current = response;
    if (response.type === 'success') {
      const idToken = response.params.id_token;
      if (idToken) void finish(idToken);
      else setError("Google didn't send back your sign-in details. Please try again.");
    } else if (response.type === 'error') {
      setError("Google sign-in didn't work. Please try again.");
    }
  }, [response, finish, setError]);

  return (
    <View style={{ gap: 8 }}>
      <Button
        label="Continue with Google"
        variant="secondary"
        onPress={() => void promptAsync()}
        disabled={!request}
        loading={busy}
      />
      <ErrorText message={error} />
    </View>
  );
}

function DevGoogleMock() {
  const { finish, error, busy } = useFinishGoogle();
  const [email, setEmail] = useState('');
  return (
    <View style={{ gap: 8 }}>
      <Notice>
        Test mode only. This isn’t real Google sign-in. It signs you in with the email below.
      </Notice>
      <Field
        label="Test email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Button
        label="Continue with Google (test mode)"
        variant="secondary"
        loading={busy}
        disabled={!email.includes('@')}
        onPress={() => void finish(`dev-google:${email.trim().toLowerCase()}:${email.trim()}`)}
      />
      <ErrorText message={error} />
    </View>
  );
}
