import { OTP_LENGTH, toE164 } from '@jobtok/types';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CodeBoxes, Keypad, type CodeBoxesHandle } from '../../components/OtpKeypad';
import { Icon } from '../../components/primitives';
import { Button, ErrorText, Field, Notice, TextLink } from '../../components/ui';
import { authApi, errorMessage, useAuth } from '../../lib/auth/AuthProvider';
import { brand, c, radii, spacing, type } from '../../theme';
import type { AuthNav } from './AuthFlow';

/**
 * Phone OTP. Default: sign in / sign up with a phone.
 * `?purpose=verify_phone`: add a phone to the signed-in (email/Google) account.
 */
export function PhonePanel({ nav }: { nav: AuthNav }) {
  const router = useRouter();
  // `next=create`: came from "Show your skills", so open the studio after signing in.
  const { next, verifyOnly, morph } = nav;
  const { acceptSession, getAccessToken, setUser } = useAuth();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState<{ to: string; minutes: number; resendAt: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const boxes = useRef<CodeBoxesHandle>(null);

  const e164 = toE164(phone);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
    return true;
  }

  const send = () =>
    run(async () => {
      const number = e164 ?? phone;
      const res = verifyOnly
        ? await authApi.sendOtp(number, {
            purpose: 'verify_phone',
            accessToken: await getAccessToken(),
          })
        : await authApi.sendOtp(number);
      setCode('');
      const next = {
        to: res.sentTo,
        minutes: Math.round(res.expiresInSeconds / 60),
        resendAt: Date.now() + res.resendAfterSeconds * 1000,
      };
      if (sent) setSent(next);
      else toStep(next);
    });

  async function verify(value = code) {
    if (busy || value.length !== OTP_LENGTH) return;
    const ok = await run(async () => {
      const number = e164 ?? phone;
      if (verifyOnly) {
        const { user } = await authApi.verifyPhone(number, value, await getAccessToken());
        setUser(user);
        router.replace({ pathname: '/signed-in', params: { reason: 'phone' } });
      } else {
        const session = await authApi.verifyOtp(number, value);
        await acceptSession(session);
        router.replace({
          pathname: '/signed-in',
          params: {
            fresh: session.isNewUser ? '1' : '0',
            ...(next === 'create' ? { next } : {}),
          },
        });
      }
    });
    if (!ok) {
      // A wrong code shakes the bubbles and clears them for another try.
      boxes.current?.shake();
      setCode('');
    }
  }

  function changeCode(next: string) {
    setError(null);
    setCode(next);
    // Submit as soon as the last digit lands.
    if (next.length === OTP_LENGTH) void verify(next);
  }

  // Number → code (and back) plays the card morph; the step swaps while the card is empty.
  const toStep = (next: typeof sent) =>
    morph.run(() => {
      setSent(next);
      setError(null);
    });

  return (
    <>
      {!sent ? (
        <>
          <View style={styles.intro}>
            <Text style={[type.headlineLgMobile, styles.title]} accessibilityRole="header">
              {verifyOnly ? 'Add your ' : 'What’s your '}
              <Text style={{ color: brand.lavender }}>number</Text>
              {verifyOnly ? '' : '?'}
            </Text>
            <Text style={[type.bodyMd, styles.muted]}>
              {verifyOnly
                ? 'Every JobTok account is linked to a real phone number. It helps keep the community genuine.'
                : 'We’ll text you a 6-digit code. New to JobTok? The same code creates your account.'}
            </Text>
          </View>

          <Field
            label="Phone number"
            prefix={
              <View style={styles.prefix}>
                <Text style={[type.labelLg, { color: c.onSurface }]}>+234</Text>
                <View style={styles.prefixRule} />
              </View>
            }
            right={e164 ? <Icon name="check-circle" size={20} color={brand.success} /> : undefined}
            value={phone}
            onChangeText={(v) => {
              setError(null);
              setPhone(v);
            }}
            keyboardType="phone-pad"
            rule="phone"
            maxLength={16}
            counter={false}
            hint="Your Nigerian number, with or without the first 0."
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="803 123 4567"
            returnKeyType="send"
            onSubmitEditing={e164 ? () => void send() : undefined}
          />
          <ErrorText message={error} />
          <Button label="Send my code" onPress={send} loading={busy} disabled={!e164} />
          {!verifyOnly && (
            <View style={{ alignItems: 'center' }}>
              <TextLink label="Use email instead" onPress={() => nav.go('email')} />
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.intro}>
            <Text style={[type.headlineLgMobile, styles.title]} accessibilityRole="header">
              Enter your <Text style={{ color: brand.lavender }}>code</Text>
            </Text>
            <Text style={[type.bodyMd, styles.muted]}>
              We sent it to <Text style={{ color: c.onSurface }}>{sent.to}</Text>. It works for{' '}
              {sent.minutes} minutes.
            </Text>
            <TextLink label="Change number" color={c.secondary} onPress={() => toStep(null)} />
          </View>

          {__DEV__ && (
            <Notice>
              Test mode: no text message is sent. Your code is in the “JobTok API” window on your
              computer.
            </Notice>
          )}

          <CodeBoxes
            ref={boxes}
            value={code}
            onChange={changeCode}
            onSubmit={() => void verify()}
          />
          <ErrorText message={error} />

          <ResendRow resendAt={sent.resendAt} disabled={busy} onResend={() => void send()} />

          <Button
            label={verifyOnly ? 'Verify my phone' : 'Verify and continue'}
            onPress={() => void verify()}
            loading={busy}
            disabled={code.length !== OTP_LENGTH}
          />
        </>
      )}
      {sent && (
        <Keypad
          disabled={busy}
          onDigit={(d) => code.length < OTP_LENGTH && changeCode(code + d)}
          onDelete={() => setCode((v) => v.slice(0, -1))}
        />
      )}
    </>
  );
}

/** "Resend in 0:42" countdown, then a link to send a fresh code. */
function ResendRow({
  resendAt,
  onResend,
  disabled,
}: {
  resendAt: number;
  onResend: () => void;
  disabled?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => {
    if (left === 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [left]);

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  return (
    <View style={styles.resend}>
      <Icon name="schedule" size={18} color={c.onSurfaceVariant} />
      <Text style={[type.labelMd, { color: c.onSurfaceVariant, flex: 1 }]}>
        {left > 0 ? `You can resend in ${mm}:${ss}` : 'Didn’t get it?'}
      </Text>
      {left === 0 && !disabled && <TextLink label="Send a new code" onPress={onResend} />}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 6 },
  title: { color: c.onSurface },
  muted: { color: c.onSurfaceVariant },
  prefix: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prefixRule: { width: 1, height: 24, backgroundColor: c.outlineVariant, marginLeft: 6 },
  resend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.card,
    backgroundColor: c.surfaceContainer,
  },
});
