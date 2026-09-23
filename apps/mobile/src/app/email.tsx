import { PASSWORD_MIN_LENGTH } from '@jobtok/types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Body, Button, ErrorText, Field, Screen, Title } from '../components/ui';
import { authApi, errorMessage, useAuth } from '../lib/auth/AuthProvider';

type Mode = 'login' | 'register' | 'forgot' | 'resend';

export default function EmailScreen() {
  const router = useRouter();
  const { acceptSession } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'forgot') {
        setInfo((await authApi.forgotPassword(email)).message);
      } else if (mode === 'resend') {
        setInfo((await authApi.resendVerificationEmail(email)).message);
      } else if (mode === 'register') {
        // No session yet: the email must be verified first.
        setInfo((await authApi.register(email, password)).message);
        setMode('login');
      } else {
        const session = await authApi.login(email, password);
        await acceptSession(session);
        router.replace({
          pathname: '/signed-in',
          params: { fresh: session.isNewUser ? '1' : '0' },
        });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const title = {
    login: 'Sign in with email',
    register: 'Create an account',
    forgot: 'Reset your password',
    resend: 'Resend confirmation email',
  }[mode];
  const cta = {
    login: 'Sign in',
    register: 'Create account',
    forgot: 'Send reset link',
    resend: 'Resend link',
  }[mode];
  const needsPassword = mode === 'login' || mode === 'register';

  return (
    <Screen>
      <Title>{title}</Title>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      {needsPassword && (
        <Field
          label={
            mode === 'register'
              ? `Password (at least ${PASSWORD_MIN_LENGTH} characters)`
              : 'Password'
          }
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          textContentType={mode === 'register' ? 'newPassword' : 'password'}
        />
      )}
      <ErrorText message={error} />
      {info && <Body muted>{info}</Body>}
      <Button
        label={cta}
        onPress={submit}
        loading={busy}
        disabled={!email || (needsPassword && !password)}
      />
      <View>
        {mode !== 'login' && (
          <Button
            label="I already have an account"
            variant="ghost"
            onPress={() => setMode('login')}
          />
        )}
        {mode !== 'register' && (
          <Button label="Create an account" variant="ghost" onPress={() => setMode('register')} />
        )}
        {mode === 'login' && (
          <>
            <Button label="Forgot password?" variant="ghost" onPress={() => setMode('forgot')} />
            <Button
              label="Resend confirmation email"
              variant="ghost"
              onPress={() => setMode('resend')}
            />
          </>
        )}
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
