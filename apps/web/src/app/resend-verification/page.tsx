'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthCard, Button, ErrorText, Field } from '@/components/ui';
import { authApi, errorMessage } from '@/lib/auth';

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setDone((await authApi.resendVerificationEmail(email)).message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Resend confirmation email">
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
          <ErrorText message={error} />
          <Button type="submit" loading={busy}>
            Send link
          </Button>
        </form>
      )}
      <Link href="/login" className="block text-center text-sm text-secondary">
        Back to sign in
      </Link>
    </AuthCard>
  );
}
