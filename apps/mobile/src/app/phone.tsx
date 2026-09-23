import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Body, Button, ErrorText, Field, Screen, Title } from '../components/ui';
import { authApi, errorMessage, useAuth } from '../lib/auth/AuthProvider';

/**
 * Phone OTP. Default: sign in / sign up with a phone.
 * `?purpose=verify_phone`: add a phone to the signed-in (email/Google) account.
 */
export default function PhoneScreen() {
  const router = useRouter();
  const { purpose } = useLocalSearchParams<{ purpose?: string }>();
  const verifyOnly = purpose === 'verify_phone';
  const { acceptSession, getAccessToken, setUser } = useAuth();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const send = () =>
    run(async () => {
      const res = verifyOnly
        ? await authApi.sendOtp(phone, {
            purpose: 'verify_phone',
            accessToken: await getAccessToken(),
          })
        : await authApi.sendOtp(phone);
      setSentTo(res.sentTo);
    });

  const verify = () =>
    run(async () => {
      if (verifyOnly) {
        const { user } = await authApi.verifyPhone(phone, code, await getAccessToken());
        setUser(user);
        router.replace({ pathname: '/signed-in', params: { reason: 'phone' } });
      } else {
        const session = await authApi.verifyOtp(phone, code);
        await acceptSession(session);
        router.replace({
          pathname: '/signed-in',
          params: { fresh: session.isNewUser ? '1' : '0' },
        });
      }
    });

  return (
    <Screen>
      <Title>{verifyOnly ? 'Verify your phone' : 'Continue with phone'}</Title>
      {!sentTo ? (
        <>
          <Body muted>
            We’ll text you a 6-digit code. Use your Nigerian number, like 0803 123 4567.
          </Body>
          <Field
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="0803 123 4567"
          />
          <ErrorText message={error} />
          <Button
            label="Send code"
            onPress={send}
            loading={busy}
            disabled={phone.trim().length < 7}
          />
        </>
      ) : (
        <>
          <Body muted>Enter the 6-digit code we sent to {sentTo}.</Body>
          <Field
            label="6-digit code"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            placeholder="123456"
          />
          <ErrorText message={error} />
          <Button label="Verify" onPress={verify} loading={busy} disabled={code.length !== 6} />
          <Button label="Send a new code" variant="ghost" onPress={send} disabled={busy} />
        </>
      )}
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
