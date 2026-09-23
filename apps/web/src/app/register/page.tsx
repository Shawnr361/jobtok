'use client';

import { PASSWORD_MIN_LENGTH } from '@jobtok/types';
import Link from 'next/link';
import { useState } from 'react';
import { AuthCard, Button, ErrorText, Field } from '@/components/ui';
import { authApi, errorMessage } from '@/lib/auth';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // No session yet: the email address must be verified before password sign-in.
      setDone((await authApi.register(email, password)).message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Create your account">
      {done ? (
        <p className="text-sm text-muted" role="status">
          {done}
        </p>
      ) : (
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
            label={`Password (at least ${PASSWORD_MIN_LENGTH} characters)`}
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <ErrorText message={error} />
          <Button type="submit" loading={busy}>
            Create account
          </Button>
        </form>
      )}
      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-secondary">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
