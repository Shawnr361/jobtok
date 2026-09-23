'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { AuthCard, ErrorText } from '@/components/ui';
import { authApi, errorMessage, useAuth } from '@/lib/auth';

export default function VerifyEmailPage() {
  return (
    <AuthCard title="Verify your email">
      <Suspense fallback={null}>
        <Verify />
      </Suspense>
    </AuthCard>
  );
}

function Verify() {
  const token = useSearchParams().get('token');
  const { status, setUser, getAccessToken } = useAuth();
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Tokens are single-use: never submit twice (e.g. React strict-mode double effects).
    if (!token || started.current) return;
    started.current = true;
    authApi
      .verifyEmail(token)
      .then(() => {
        setState('done');
        // The response carries no account data; refresh ours if we are signed in.
        if (status === 'signedIn') {
          getAccessToken()
            .then((token) => authApi.me(token))
            .then(({ user }) => setUser(user))
            .catch(() => {}); // best effort; the account page reloads it anyway
        }
      })
      .catch((err: unknown) => {
        setError(errorMessage(err));
        setState('error');
      });
  }, [token, status, setUser, getAccessToken]);

  if (!token) return <ErrorText message="This verification link is missing its token." />;
  if (state === 'working') return <p className="text-sm text-muted">Verifying…</p>;
  if (state === 'error') return <ErrorText message={error} />;
  return (
    <p className="text-sm text-muted">
      Email verified.{' '}
      <Link href={status === 'signedIn' ? '/account' : '/login'} className="text-secondary">
        {status === 'signedIn' ? 'Go to your account' : 'Sign in'}
      </Link>
    </p>
  );
}
