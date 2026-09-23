'use client';

import { PASSWORD_MIN_LENGTH } from '@jobtok/types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthCard, Button, ErrorText, Field } from '@/components/ui';
import { authApi, errorMessage } from '@/lib/auth';

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password">
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </AuthCard>
  );
}

function ResetForm() {
  const token = useSearchParams().get('token');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!token) return <ErrorText message="This reset link is missing its token." />;
  if (done) {
    return (
      <p className="text-sm text-muted">
        Password updated. You have been signed out everywhere.{' '}
        <Link href="/login" className="text-secondary">
          Sign in
        </Link>
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label={`New password (at least ${PASSWORD_MIN_LENGTH} characters)`}
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <ErrorText message={error} />
      <Button type="submit" loading={busy}>
        Update password
      </Button>
    </form>
  );
}
