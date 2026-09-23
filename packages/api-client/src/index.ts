// Typed client for /api/v1/auth, shared by the web and mobile apps.
// Token storage is the caller's job: web keeps the refresh token in an HTTP-only cookie
// (never visible to JavaScript); mobile keeps it in the device keychain (SecureStore).
import {
  AUTH_CLIENT_HEADER,
  type ApiResponse,
  type AuthClient,
  type AuthSessionResponse,
  type AuthUser,
  type OtpPurpose,
  type OtpSendResponse,
} from '@jobtok/types';

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export interface AuthApiOptions {
  /** API origin, e.g. http://localhost:4000 */
  baseUrl: string;
  client: AuthClient;
  fetch?: typeof fetch;
}

export function createAuthApi({ baseUrl, client, fetch: fetchImpl = fetch }: AuthApiOptions) {
  const root = `${baseUrl.replace(/\/$/, '')}/api/v1/auth`;

  async function call<T>(
    method: 'GET' | 'POST',
    path: string,
    { body, accessToken }: { body?: unknown; accessToken?: string } = {},
  ): Promise<T> {
    const headers: Record<string, string> = { [AUTH_CLIENT_HEADER]: client };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    let res: Response;
    try {
      res = await fetchImpl(`${root}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        // Web: send/receive the HTTP-only refresh cookie across origins.
        credentials: client === 'web' ? 'include' : 'omit',
      });
    } catch {
      throw new ApiClientError(
        0,
        'network_error',
        'Could not reach JobTok. Check your connection.',
      );
    }
    if (res.status === 204) return undefined as T;
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json)
      throw new ApiClientError(res.status, 'bad_response', 'Unexpected response from server');
    if (!json.ok) {
      throw new ApiClientError(res.status, json.error.code, json.error.message, json.error.details);
    }
    return json.data;
  }

  return {
    /** No session: the email must be verified first (same response for existing emails). */
    register: (email: string, password: string) =>
      call<{ message: string }>('POST', '/register', { body: { email, password } }),
    login: (email: string, password: string) =>
      call<AuthSessionResponse>('POST', '/login', { body: { email, password } }),

    sendOtp: (phone: string, opts: { purpose?: OtpPurpose; accessToken?: string } = {}) =>
      call<OtpSendResponse>('POST', '/otp/send', {
        body: { phone, purpose: opts.purpose ?? 'login' },
        ...(opts.accessToken ? { accessToken: opts.accessToken } : {}),
      }),
    /** Sign in (purpose "login") with a code. */
    verifyOtp: (phone: string, code: string) =>
      call<AuthSessionResponse>('POST', '/otp/verify', { body: { phone, code, purpose: 'login' } }),
    /** Attach a phone to the signed-in user. */
    verifyPhone: (phone: string, code: string, accessToken: string) =>
      call<{ user: AuthUser }>('POST', '/otp/verify', {
        body: { phone, code, purpose: 'verify_phone' },
        accessToken,
      }),

    /** Exchange a Google ID token (from Google Sign-In on the device/browser). */
    google: (idToken: string, accessToken?: string) =>
      call<AuthSessionResponse & { user: AuthUser }>('POST', '/google', {
        body: { idToken },
        ...(accessToken ? { accessToken } : {}),
      }),

    /** Mobile passes its stored refresh token; web relies on the HTTP-only cookie. */
    refresh: (refreshToken?: string) =>
      call<AuthSessionResponse>('POST', '/refresh', { body: refreshToken ? { refreshToken } : {} }),
    logout: (accessToken?: string, refreshToken?: string) =>
      call<void>('POST', '/logout', {
        body: refreshToken ? { refreshToken } : {},
        ...(accessToken ? { accessToken } : {}),
      }),
    me: (accessToken: string) => call<{ user: AuthUser }>('GET', '/me', { accessToken }),

    /** Resend the verification link for the signed-in user. */
    requestEmailVerification: (accessToken: string) =>
      call<{ message: string }>('POST', '/email/verification', { accessToken }),
    /** Resend by email address, when signed out (same response whatever the address). */
    resendVerificationEmail: (email: string) =>
      call<{ message: string }>('POST', '/email/verification', { body: { email } }),
    verifyEmail: (token: string) =>
      call<{ verified: boolean }>('POST', '/email/verify', { body: { token } }),
    forgotPassword: (email: string) =>
      call<{ message: string }>('POST', '/password/forgot', { body: { email } }),
    resetPassword: (token: string, password: string) =>
      call<void>('POST', '/password/reset', { body: { token, password } }),
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
