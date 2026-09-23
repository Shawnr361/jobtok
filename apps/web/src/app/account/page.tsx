'use client';

import type { AuthUser } from '@jobtok/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthCard, Button, ErrorText, Field, Notice } from '@/components/ui';
import { authApi, errorMessage, useAuth } from '@/lib/auth';

/** Signed-in placeholder proving the session works. Profiles and onboarding come later. */
export default function AccountPage() {
  const router = useRouter();
  const { status, user, logout, getAccessToken, setUser } = useAuth();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'signedOut') router.replace('/login');
  }, [status, router]);

  if (status !== 'signedIn' || !user) {
    return <AuthCard title="Loading…">{null}</AuthCard>;
  }

  const methods = [
    user.phone && 'phone',
    user.hasPassword && 'password',
    ...user.linkedProviders,
  ].filter(Boolean);

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
    <AuthCard title="Your account">
      <dl className="space-y-1 text-sm">
        {user.email && (
          <div>
            <dt className="inline text-muted">Email: </dt>
            <dd className="inline text-white">
              {user.email} {user.verification.email ? '(verified)' : '(not verified)'}
            </dd>
          </div>
        )}
        <div>
          <dt className="inline text-muted">Phone: </dt>
          <dd className="inline text-white">{user.phone ?? 'not added'}</dd>
        </div>
        <div>
          <dt className="inline text-muted">Sign-in methods: </dt>
          <dd className="inline text-white">{methods.join(', ')}</dd>
        </div>
      </dl>

      {!user.verification.phone && (
        <VerifyPhone
          getAccessToken={getAccessToken}
          onVerified={(u) => {
            setUser(u);
            setInfo('Phone verified.');
          }}
        />
      )}
      {user.email && !user.verification.email && (
        <Button variant="secondary" onClick={() => void resendEmail()}>
          Resend email verification
        </Button>
      )}
      {info && <p className="text-sm text-success">{info}</p>}
      <ErrorText message={error} />
      <Button
        variant="secondary"
        onClick={async () => {
          await logout();
          router.replace('/login');
        }}
      >
        Log out
      </Button>
    </AuthCard>
  );
}

function VerifyPhone({
  getAccessToken,
  onVerified,
}: {
  getAccessToken: () => Promise<string>;
  onVerified: (user: AuthUser) => void;
}) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const token = await getAccessToken();
      if (!sentTo) {
        setSentTo(
          (await authApi.sendOtp(phone, { purpose: 'verify_phone', accessToken: token })).sentTo,
        );
      } else {
        onVerified((await authApi.verifyPhone(phone, code, token)).user);
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Notice>Verify your phone number to start using JobTok.</Notice>
      <Field
        label="Phone number"
        type="tel"
        required
        value={phone}
        disabled={Boolean(sentTo)}
        onChange={(e) => setPhone(e.target.value)}
      />
      {sentTo && (
        <Field
          label={`Code sent to ${sentTo}`}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
      )}
      <ErrorText message={error} />
      <Button type="submit">{sentTo ? 'Verify phone' : 'Send code'}</Button>
    </form>
  );
}
