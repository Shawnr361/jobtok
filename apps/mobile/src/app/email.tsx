import { PASSWORD_MIN_LENGTH } from '@jobtok/types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { PlayShield } from '../components/animations/PlayShield';
import { GoogleSignIn } from '../components/GoogleSignIn';
import { Icon, IconButton } from '../components/primitives';
import {
  Button,
  ErrorText,
  Eyebrow,
  Field,
  OrDivider,
  Screen,
  SuccessText,
  TextLink,
  Tile,
} from '../components/ui';
import { authApi, errorMessage, useAuth } from '../lib/auth/AuthProvider';
import { brand, c, type } from '../theme';

type Mode = 'login' | 'register' | 'forgot' | 'resend';

const COPY: Record<Mode, { title: string; accent?: string; body: string; cta: string }> = {
  login: {
    title: 'Welcome back to ',
    accent: 'JobTok',
    body: 'Sign in to pick up right where you left off.',
    cta: 'Sign in to my feed',
  },
  register: {
    title: 'Join ',
    accent: 'JobTok',
    body: 'Create your account with email. We’ll send you a link to confirm it’s really you.',
    cta: 'Create my account',
  },
  forgot: {
    title: 'Reset your password',
    body: 'Enter your email and we’ll send you a link to set a new one.',
    cta: 'Send reset link',
  },
  resend: {
    title: 'Resend your link',
    body: 'Enter your email and we’ll send you a fresh confirmation link.',
    cta: 'Send new link',
  },
};

export default function EmailScreen() {
  const router = useRouter();
  const { acceptSession } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

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

  const copy = COPY[mode];
  const needsPassword = mode === 'login' || mode === 'register';
  const canSubmit = email.includes('@') && (!needsPassword || password.length > 0);

  return (
    <Screen back={mode === 'login' ? true : () => switchMode('login')}>
      <PlayShield height={needsPassword ? 150 : 110} />

      <View style={{ gap: 8, alignItems: 'center' }}>
        <Eyebrow icon="play-circle-outline">Show what you can do</Eyebrow>
        <Text
          style={[type.headlineLgMobile, { color: c.onSurface, textAlign: 'center' }]}
          accessibilityRole="header"
        >
          {copy.title}
          {copy.accent && <Text style={{ color: brand.lavender }}>{copy.accent}</Text>}
        </Text>
        <Text style={[type.bodyMd, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
          {copy.body}
        </Text>
      </View>

      <Field
        label="Email"
        icon="alternate-email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType={needsPassword ? 'next' : 'send'}
        onSubmitEditing={needsPassword || !canSubmit ? undefined : () => void submit()}
      />
      {needsPassword && (
        <Field
          label={mode === 'register' ? `Password (${PASSWORD_MIN_LENGTH}+ characters)` : 'Password'}
          labelRight={
            mode === 'login' ? (
              <TextLink label="Forgot password?" onPress={() => switchMode('forgot')} />
            ) : undefined
          }
          icon="lock-outline"
          right={
            <IconButton
              icon={showPassword ? 'visibility' : 'visibility-off'}
              label={showPassword ? 'Hide password' : 'Show password'}
              color={c.outline}
              size={36}
              onPress={() => setShowPassword((v) => !v)}
            />
          }
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          textContentType={mode === 'register' ? 'newPassword' : 'password'}
          returnKeyType="go"
          onSubmitEditing={canSubmit ? () => void submit() : undefined}
        />
      )}

      <ErrorText message={error} />
      <SuccessText message={info} />
      <Button label={copy.cta} onPress={submit} loading={busy} disabled={!canSubmit} />

      {needsPassword && (
        <>
          <OrDivider />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Tile
              label="Phone"
              icon={<Icon name="phone-iphone" size={22} color={c.secondary} />}
              onPress={() => router.push('/phone')}
            />
            <GoogleSignIn variant="tile" />
          </View>
        </>
      )}

      <View style={{ alignItems: 'center', gap: 12, paddingTop: 4 }}>
        {mode === 'login' && (
          <>
            <Text style={[type.bodyMd, { color: c.onSurfaceVariant }]}>New to JobTok?</Text>
            <TextLink label="Create an account" onPress={() => switchMode('register')} />
            <TextLink
              label="Didn’t get your confirmation email?"
              color={c.secondary}
              onPress={() => switchMode('resend')}
            />
          </>
        )}
        {mode === 'register' && (
          <TextLink label="I already have an account" onPress={() => switchMode('login')} />
        )}
        {(mode === 'forgot' || mode === 'resend') && (
          <TextLink label="Back to sign in" onPress={() => switchMode('login')} />
        )}
      </View>
    </Screen>
  );
}
