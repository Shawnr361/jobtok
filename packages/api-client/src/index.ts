// Typed clients for /api/v1/auth and the creator profile API, shared by the web and mobile apps.
// Token storage is the caller's job: web keeps the refresh token in an HTTP-only cookie
// (never visible to JavaScript); mobile keeps it in the device keychain (SecureStore).
import {
  AUTH_CLIENT_HEADER,
  type ApiResponse,
  type AuthClient,
  type AuthSessionResponse,
  type AuthUser,
  type ClientInteraction,
  type FeedPage,
  type FeedTabKey,
  type MyCreatorProfile,
  type MyVideo,
  type OtpPurpose,
  type OtpSendResponse,
  type ProfileLink,
  type ProfileProject,
  type ProfileUpdate,
  type ProjectInput,
  type PublicCreatorProfile,
  type SkillCategory,
  type SkillRef,
  type UsernameCheck,
  type VideoDetailsInput,
  type VideoPost,
  type VideoUploadTarget,
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

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** One request helper for every client: same headers, envelope and error handling. */
function createCaller(root: string, client: AuthClient, fetchImpl: typeof fetch) {
  return async function call<T>(
    method: Method,
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
        "Can't reach JobTok right now. Please check your internet connection.",
      );
    }
    if (res.status === 204) return undefined as T;
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json)
      throw new ApiClientError(
        res.status,
        'bad_response',
        'Something went wrong. Please try again.',
      );
    if (!json.ok) {
      throw new ApiClientError(res.status, json.error.code, json.error.message, json.error.details);
    }
    return json.data;
  };
}

const apiRoot = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}/api/v1`;

export function createAuthApi({ baseUrl, client, fetch: fetchImpl = fetch }: AuthApiOptions) {
  const call = createCaller(`${apiRoot(baseUrl)}/auth`, client, fetchImpl);

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

/**
 * Creator profiles (/api/v1/profiles) and the skill taxonomy (/api/v1/skills).
 * Every `Mine`/`me` call acts on the signed-in user's own profile only.
 */
export function createProfileApi({ baseUrl, client, fetch: fetchImpl = fetch }: AuthApiOptions) {
  const call = createCaller(apiRoot(baseUrl), client, fetchImpl);
  const enc = encodeURIComponent;

  return {
    /** The caller's profile, or null before their first save. */
    getMine: (accessToken: string) =>
      call<{ profile: MyCreatorProfile | null }>('GET', '/profiles/me', { accessToken }),
    /** Creates the profile on first save; afterwards updates only the fields sent. */
    updateMine: (accessToken: string, update: ProfileUpdate) =>
      call<{ profile: MyCreatorProfile }>('PATCH', '/profiles/me', { body: update, accessToken }),
    /** Whether a username is valid and free, before saving it. */
    checkUsername: (accessToken: string, username: string) =>
      call<UsernameCheck>('GET', `/profiles/username-check?username=${enc(username)}`, {
        accessToken,
      }),
    /** Anyone's public profile, by username or profile id. Signed in: includes follow state. */
    getPublic: (handle: string, accessToken?: string) =>
      call<{ profile: PublicCreatorProfile }>('GET', `/profiles/${enc(handle)}`, {
        ...(accessToken ? { accessToken } : {}),
      }),
    /** Removes the caller's profile photo. (Uploading streams the file: see the mobile app.) */
    removeAvatar: (accessToken: string) =>
      call<{ profile: MyCreatorProfile }>('DELETE', '/profiles/me/avatar', { accessToken }),
    follow: (accessToken: string, handle: string) =>
      call<{ following: boolean; followers: number }>('POST', `/profiles/${enc(handle)}/follow`, {
        accessToken,
      }),
    unfollow: (accessToken: string, handle: string) =>
      call<{ following: boolean; followers: number }>('DELETE', `/profiles/${enc(handle)}/follow`, {
        accessToken,
      }),

    addSkill: (
      accessToken: string,
      skill: { skillId: string } | { name: string; categorySlug?: string },
    ) => call<{ skills: SkillRef[] }>('POST', '/profiles/me/skills', { body: skill, accessToken }),
    removeSkill: (accessToken: string, skillId: string) =>
      call<{ skills: SkillRef[] }>('DELETE', `/profiles/me/skills/${enc(skillId)}`, {
        accessToken,
      }),

    addLink: (accessToken: string, link: { label: string; url: string }) =>
      call<{ links: ProfileLink[] }>('POST', '/profiles/me/links', { body: link, accessToken }),
    removeLink: (accessToken: string, linkId: string) =>
      call<{ links: ProfileLink[] }>('DELETE', `/profiles/me/links/${enc(linkId)}`, {
        accessToken,
      }),

    addProject: (accessToken: string, project: ProjectInput) =>
      call<{ projects: ProfileProject[] }>('POST', '/profiles/me/projects', {
        body: project,
        accessToken,
      }),
    updateProject: (accessToken: string, projectId: string, project: Partial<ProjectInput>) =>
      call<{ projects: ProfileProject[] }>('PATCH', `/profiles/me/projects/${enc(projectId)}`, {
        body: project,
        accessToken,
      }),
    removeProject: (accessToken: string, projectId: string) =>
      call<{ projects: ProfileProject[] }>('DELETE', `/profiles/me/projects/${enc(projectId)}`, {
        accessToken,
      }),

    searchSkills: (opts: { q?: string; category?: string; limit?: number } = {}) => {
      const params = new URLSearchParams();
      if (opts.q) params.set('q', opts.q);
      if (opts.category) params.set('category', opts.category);
      if (opts.limit) params.set('limit', String(opts.limit));
      const qs = params.toString();
      return call<{ skills: SkillRef[] }>('GET', `/skills${qs ? `?${qs}` : ''}`);
    },
    categories: () => call<{ categories: SkillCategory[] }>('GET', '/skills/categories'),
  };
}

export type ProfileApi = ReturnType<typeof createProfileApi>;

/**
 * Videos (/api/v1/videos) and the discovery feed (/api/v1/feed). Uploading the file itself is
 * done by the app against `upload.url` (it needs upload progress, which fetch doesn't offer).
 */
export function createVideoApi({ baseUrl, client, fetch: fetchImpl = fetch }: AuthApiOptions) {
  const call = createCaller(apiRoot(baseUrl), client, fetchImpl);
  const enc = encodeURIComponent;
  const origin = baseUrl.replace(/\/$/, '');

  return {
    /** Turns an API-relative media/upload URL into an absolute one. */
    absolute: (url: string) => (/^https?:\/\//.test(url) ? url : `${origin}${url}`),

    /** Step 1: save details (a private draft) and get the upload target. */
    create: (accessToken: string, details: VideoDetailsInput) =>
      call<{ video: MyVideo; upload: VideoUploadTarget }>('POST', '/videos', {
        body: details,
        accessToken,
      }),
    /** Step 3: publish a video whose upload finished and was accepted. */
    publish: (accessToken: string, id: string) =>
      call<{ video: MyVideo }>('POST', `/videos/${enc(id)}/publish`, { accessToken }),
    update: (accessToken: string, id: string, details: Partial<VideoDetailsInput>) =>
      call<{ video: MyVideo }>('PATCH', `/videos/${enc(id)}`, { body: details, accessToken }),
    remove: (accessToken: string, id: string) =>
      call<{ deleted: boolean }>('DELETE', `/videos/${enc(id)}`, { accessToken }),
    mine: (accessToken: string) =>
      call<{ videos: MyVideo[] }>('GET', '/videos/mine', { accessToken }),
    get: (id: string, accessToken?: string) =>
      call<{ video: VideoPost | MyVideo }>('GET', `/videos/${enc(id)}`, {
        ...(accessToken ? { accessToken } : {}),
      }),

    feed: (
      opts: { tab?: FeedTabKey; cursor?: string | null; limit?: number } = {},
      accessToken?: string,
    ) => {
      const params = new URLSearchParams();
      if (opts.tab) params.set('tab', opts.tab);
      if (opts.cursor) params.set('cursor', opts.cursor);
      if (opts.limit) params.set('limit', String(opts.limit));
      const qs = params.toString();
      return call<FeedPage>('GET', `/feed${qs ? `?${qs}` : ''}`, {
        ...(accessToken ? { accessToken } : {}),
      });
    },

    like: (accessToken: string, id: string, on: boolean) =>
      call<{ liked: boolean; likes: number }>(on ? 'POST' : 'DELETE', `/videos/${enc(id)}/like`, {
        accessToken,
      }),
    save: (accessToken: string, id: string, on: boolean) =>
      call<{ saved: boolean; saves: number }>(on ? 'POST' : 'DELETE', `/videos/${enc(id)}/save`, {
        accessToken,
      }),
    /** Report a watch/share signal that really happened. */
    record: (accessToken: string, id: string, type: ClientInteraction, watchMs?: number) =>
      call<{ recorded: boolean }>('POST', `/videos/${enc(id)}/events`, {
        body: watchMs === undefined ? { type } : { type, watchMs },
        accessToken,
      }),
  };
}

export type VideoApi = ReturnType<typeof createVideoApi>;
