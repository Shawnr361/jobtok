// Auth API contracts (/api/v1/auth). Shared by the API, web and mobile clients.
import type { User } from './entities.js';

export const AUTH_CLIENTS = ['web', 'mobile'] as const;
/** web: refresh token in an HTTP-only cookie. mobile: refresh token in the response body (SecureStore). */
export type AuthClient = (typeof AUTH_CLIENTS)[number];

/** Header clients send to say which session style they use. Defaults to `web`. */
export const AUTH_CLIENT_HEADER = 'x-jobtok-client';

export const OAUTH_PROVIDERS = ['google'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const OTP_PURPOSES = ['login', 'verify_phone'] as const;
/** login: sign in / sign up with a phone. verify_phone: add a phone to the signed-in user. */
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const OTP_LENGTH = 6;

/** The signed-in user, as returned by the auth endpoints. Never includes secrets. */
export interface AuthUser extends User {
  hasPassword: boolean;
  linkedProviders: OAuthProvider[];
}

export interface AuthSessionResponse {
  user: AuthUser;
  accessToken: string;
  accessTokenExpiresAt: string;
  /** Only for mobile clients. Web clients receive it as an HTTP-only cookie instead. */
  refreshToken?: string;
  refreshTokenExpiresAt: string;
  /** True when this sign-in created a new account. */
  isNewUser: boolean;
}

export interface OtpSendRequest {
  phone: string;
  purpose?: OtpPurpose;
  country?: string;
}

export interface OtpSendResponse {
  /** Masked destination, e.g. +234803*****67. */
  sentTo: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface OtpVerifyRequest {
  phone: string;
  code: string;
  purpose?: OtpPurpose;
  country?: string;
}

export interface EmailRegisterRequest {
  email: string;
  password: string;
}

export interface EmailLoginRequest {
  email: string;
  password: string;
}

export interface GoogleAuthRequest {
  /** Google ID token (OIDC) obtained by the client. Verified server-side. */
  idToken: string;
}
