'use client';

import { ApiClientError, createAuthApi } from '@jobtok/api-client';
import type { AuthSessionResponse, AuthUser } from '@jobtok/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { API_URL } from './config';

// Web session model: the refresh token is an HTTP-only, SameSite=Strict cookie set by the API
// (JavaScript can never read it). The short-lived access token lives only in memory.
export const authApi = createAuthApi({ baseUrl: API_URL, client: 'web' });

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: Status;
  user: AuthUser | null;
  acceptSession(session: AuthSessionResponse): void;
  getAccessToken(): Promise<string>;
  setUser(user: AuthUser): void;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const access = useRef<{ token: string; expiresAt: number } | null>(null);
  const refreshing = useRef<Promise<string> | null>(null);

  const acceptSession = useCallback((session: AuthSessionResponse) => {
    access.current = {
      token: session.accessToken,
      expiresAt: new Date(session.accessTokenExpiresAt).getTime(),
    };
    setUser(session.user);
    setStatus('signedIn');
  }, []);

  const signedOut = useCallback(() => {
    access.current = null;
    setUser(null);
    setStatus('signedOut');
  }, []);

  /** Single-flight refresh using the cookie. */
  const refresh = useCallback((): Promise<string> => {
    refreshing.current ??= authApi
      .refresh()
      .then((session) => {
        acceptSession(session);
        return session.accessToken;
      })
      .catch((err: unknown) => {
        if (err instanceof ApiClientError && err.status !== 0) signedOut();
        throw err;
      })
      .finally(() => {
        refreshing.current = null;
      });
    return refreshing.current;
  }, [acceptSession, signedOut]);

  const getAccessToken = useCallback(async () => {
    const current = access.current;
    if (current && current.expiresAt - Date.now() > 30_000) return current.token;
    return refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout(access.current?.token);
    } finally {
      signedOut();
    }
  }, [signedOut]);

  useEffect(() => {
    refresh().catch(() => signedOut());
  }, [refresh, signedOut]);

  const value = useMemo(
    () => ({ status, user, acceptSession, getAccessToken, setUser, logout }),
    [status, user, acceptSession, getAccessToken, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function errorMessage(err: unknown): string {
  return err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.';
}
