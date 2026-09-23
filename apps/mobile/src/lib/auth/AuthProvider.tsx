import { ApiClientError, createAuthApi } from '@jobtok/api-client';
import type { AuthSessionResponse, AuthUser } from '@jobtok/types';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { API_URL } from '../config';

// The refresh token lives only in the OS keychain/keystore (SecureStore).
// The short-lived access token is kept in memory and never persisted.
const REFRESH_TOKEN_KEY = 'jobtok.refreshToken';

export const authApi = createAuthApi({ baseUrl: API_URL, client: 'mobile' });

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: Status;
  user: AuthUser | null;
  /** Stores a session returned by any sign-in endpoint. */
  acceptSession(session: AuthSessionResponse): Promise<void>;
  /** A valid access token, refreshing it first if it is about to expire. */
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

  const clear = useCallback(async () => {
    access.current = null;
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    setUser(null);
    setStatus('signedOut');
  }, []);

  const acceptSession = useCallback(async (session: AuthSessionResponse) => {
    if (!session.refreshToken) throw new Error('Mobile session without refresh token');
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken);
    access.current = {
      token: session.accessToken,
      expiresAt: new Date(session.accessTokenExpiresAt).getTime(),
    };
    setUser(session.user);
    setStatus('signedIn');
  }, []);

  /** Rotates the refresh token. Single-flight: concurrent callers share one request. */
  const refresh = useCallback((): Promise<string> => {
    refreshing.current ??= (async () => {
      try {
        const stored = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!stored) throw new ApiClientError(401, 'signed_out', 'Signed out');
        const session = await authApi.refresh(stored);
        await acceptSession(session);
        return session.accessToken;
      } catch (err) {
        if (err instanceof ApiClientError && err.status !== 0) await clear();
        throw err;
      } finally {
        refreshing.current = null;
      }
    })();
    return refreshing.current;
  }, [acceptSession, clear]);

  const getAccessToken = useCallback(async () => {
    const current = access.current;
    if (current && current.expiresAt - Date.now() > 30_000) return current.token;
    return refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    const stored = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    try {
      await authApi.logout(access.current?.token, stored ?? undefined);
    } catch {
      // Still sign out locally if the network is down.
    }
    await clear();
  }, [clear]);

  // Restore the session on launch.
  useEffect(() => {
    refresh().catch(() => setStatus('signedOut'));
  }, [refresh]);

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
  if (err instanceof ApiClientError) return err.message;
  return 'Something went wrong. Please try again.';
}
