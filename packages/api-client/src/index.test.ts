import { describe, expect, it, vi } from 'vitest';
import { ApiClientError, createAuthApi } from './index.js';

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(body === null ? null : JSON.stringify(body), { status }));
}

describe('createAuthApi', () => {
  it('sends the client header, JSON body and bearer token', async () => {
    const f = fakeFetch(200, { ok: true, data: { user: { id: 'u1' } } });
    const api = createAuthApi({ baseUrl: 'http://api.test/', client: 'mobile', fetch: f });
    await api.me('tok');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test/api/v1/auth/me');
    expect(init.headers).toMatchObject({
      'x-jobtok-client': 'mobile',
      Authorization: 'Bearer tok',
    });
    expect(init.credentials).toBe('omit');
  });

  it('includes cookies for web clients', async () => {
    const f = fakeFetch(204, null);
    const api = createAuthApi({ baseUrl: 'http://api.test', client: 'web', fetch: f });
    await api.logout();
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].credentials).toBe('include');
  });

  it('turns error envelopes into ApiClientError', async () => {
    const f = fakeFetch(401, {
      ok: false,
      error: { code: 'invalid_credentials', message: 'nope' },
    });
    const api = createAuthApi({ baseUrl: 'http://api.test', client: 'web', fetch: f });
    await expect(api.login('a@b.co', 'x')).rejects.toMatchObject({
      status: 401,
      code: 'invalid_credentials',
    });
  });

  it('reports network failures', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const api = createAuthApi({ baseUrl: 'http://api.test', client: 'web', fetch: f });
    await expect(api.forgotPassword('a@b.co')).rejects.toBeInstanceOf(ApiClientError);
  });
});
