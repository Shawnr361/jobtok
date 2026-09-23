'use client';

import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { authApi, errorMessage, useAuth } from '@/lib/auth';
import { DEV_GOOGLE, GOOGLE_CLIENT_ID } from '@/lib/config';
import { Button, ErrorText, Field, Notice } from './ui';

// Minimal typing for Google Identity Services (https://accounts.google.com/gsi/client).
interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (res: { credential?: string }) => void;
      }): void;
      renderButton(el: HTMLElement, options: Record<string, unknown>): void;
    };
  };
}
declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

function useFinishGoogle() {
  const router = useRouter();
  const { acceptSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const finish = useCallback(
    async (idToken: string) => {
      setError(null);
      try {
        acceptSession(await authApi.google(idToken));
        router.push('/account');
      } catch (err) {
        setError(errorMessage(err));
      }
    },
    [acceptSession, router],
  );
  return { finish, error };
}

/**
 * Google entry point: real Google Identity Services when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set
 * (the ID token is verified by the API), a labelled DEVELOPMENT MOCK when
 * NEXT_PUBLIC_AUTH_DEV_GOOGLE=true, otherwise a disabled button.
 */
export function GoogleSignIn() {
  if (GOOGLE_CLIENT_ID) return <RealGoogleButton />;
  if (DEV_GOOGLE) return <DevGoogleMock />;
  return (
    <div className="space-y-2">
      <Button variant="secondary" disabled>
        Continue with Google
      </Button>
      <p className="text-center text-xs text-muted">Google sign-in is not configured.</p>
    </div>
  );
}

function RealGoogleButton() {
  const { finish, error } = useFinishGoogle();
  const container = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded || !window.google || !container.current) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (res) => {
        if (res.credential) void finish(res.credential);
      },
    });
    window.google.accounts.id.renderButton(container.current, {
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      width: 320,
    });
  }, [loaded, finish]);

  return (
    <div className="space-y-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setLoaded(true)}
      />
      <div ref={container} className="flex justify-center" />
      <ErrorText message={error} />
    </div>
  );
}

function DevGoogleMock() {
  const { finish, error } = useFinishGoogle();
  const [email, setEmail] = useState('');
  return (
    <div className="space-y-2">
      <Notice>
        DEVELOPMENT MOCK — not real Google. Signs in as this email via a dev-only API path.
      </Notice>
      <Field
        label="Mock Google email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button
        variant="secondary"
        disabled={!email.includes('@')}
        onClick={() => void finish(`dev-google:${email.trim().toLowerCase()}:${email.trim()}`)}
      >
        Continue with Google (dev mock)
      </Button>
      <ErrorText message={error} />
    </div>
  );
}
