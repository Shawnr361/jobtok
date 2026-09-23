'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { GoogleSignIn } from '@/components/GoogleSignIn';
import { AuthCard, Button, ErrorText, Field } from '@/components/ui';
import { authApi, errorMessage, useAuth } from '@/lib/auth';

export default function LoginPage() {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  return (
    <AuthCard title="Sign in">
      <div className="grid grid-cols-2 gap-2" role="tablist">
        {(['email', 'phone'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={method === m}
            onClick={() => setMethod(m)}
            className={`rounded-full py-2 text-sm font-medium ${method === m ? 'bg-surface-raised text-white' : 'text-muted'}`}
          >
            {m === 'email' ? 'Email' : 'Phone'}
          </button>
        ))}
      </div>
      {method === 'email' ? <EmailLogin /> : <PhoneLogin />}
      <div className="border-t border-border pt-4">
        <GoogleSignIn />
      </div>
      <p className="text-center text-sm text-muted">
        New to JobTok?{' '}
        <Link href="/register" className="text-secondary">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}

function EmailLogin() {
  const router = useRouter();
  const { acceptSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      acceptSession(await authApi.login(email, password));
      router.push('/account');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <ErrorText message={error} />
      <Button type="submit" loading={busy}>
        Sign in
      </Button>
      <Link href="/forgot-password" className="block text-center text-sm text-secondary">
        Forgot password?
      </Link>
      <Link href="/resend-verification" className="block text-center text-sm text-secondary">
        Resend verification email
      </Link>
    </form>
  );
}

function PhoneLogin() {
  const router = useRouter();
  const { acceptSession } = useAuth();
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

  const send = () => run(async () => setSentTo((await authApi.sendOtp(phone)).sentTo));
  const verify = () =>
    run(async () => {
      acceptSession(await authApi.verifyOtp(phone, code));
      router.push('/account');
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void (sentTo ? verify() : send());
      }}
      className="space-y-4"
    >
      <Field
        label="Phone number"
        type="tel"
        autoComplete="tel"
        placeholder="0803 123 4567"
        required
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={Boolean(sentTo)}
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
      <Button type="submit" loading={busy}>
        {sentTo ? 'Verify' : 'Send code'}
      </Button>
      {sentTo && (
        <Button type="button" variant="secondary" onClick={() => void send()} disabled={busy}>
          Send a new code
        </Button>
      )}
    </form>
  );
}
