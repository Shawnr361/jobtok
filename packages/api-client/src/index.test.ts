import { describe, expect, it, vi } from 'vitest';
import { ApiClientError, createAuthApi, createProfileApi, createVideoApi } from './index.js';

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

describe('createProfileApi', () => {
  it('updates the signed-in profile with PATCH and a bearer token', async () => {
    const f = fakeFetch(200, { ok: true, data: { profile: { id: 'p1' } } });
    const api = createProfileApi({ baseUrl: 'http://api.test', client: 'mobile', fetch: f });
    await api.updateMine('tok', { headline: 'I weld gates' });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test/api/v1/profiles/me');
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ headline: 'I weld gates' }));
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok' });
  });

  it('encodes public handles and skill searches, without a token', async () => {
    const f = fakeFetch(200, { ok: true, data: {} });
    const api = createProfileApi({ baseUrl: 'http://api.test', client: 'web', fetch: f });
    await api.getPublic('a/b?c');
    await api.searchSkills({ q: 'solar & inverter', limit: 5 });
    const urls = f.mock.calls.map((c) => (c as unknown as [string])[0]);
    expect(urls).toEqual([
      'http://api.test/api/v1/profiles/a%2Fb%3Fc',
      'http://api.test/api/v1/skills?q=solar+%26+inverter&limit=5',
    ]);
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.headers).not.toHaveProperty('Authorization');
  });
});

describe('createVideoApi', () => {
  it('creates a draft with the bearer token and resolves relative media URLs', async () => {
    const f = fakeFetch(201, { ok: true, data: { video: { id: 'v1' }, upload: {} } });
    const api = createVideoApi({ baseUrl: 'http://api.test/', client: 'mobile', fetch: f });
    await api.create('tok', { caption: 'Building a gate' });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test/api/v1/videos');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok' });
    expect(api.absolute('/api/v1/media/videos/x.mp4?exp=1&sig=a')).toBe(
      'http://api.test/api/v1/media/videos/x.mp4?exp=1&sig=a',
    );
    expect(api.absolute('https://cdn.example.com/v.mp4')).toBe('https://cdn.example.com/v.mp4');
  });

  it('uses DELETE to unlike and builds feed queries', async () => {
    const f = fakeFetch(200, { ok: true, data: {} });
    const api = createVideoApi({ baseUrl: 'http://api.test', client: 'mobile', fetch: f });
    await api.like('tok', 'v1', false);
    await api.feed({ tab: 'near', cursor: 'abc', limit: 5 });
    const calls = f.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0]![0]).toBe('http://api.test/api/v1/videos/v1/like');
    expect(calls[0]![1].method).toBe('DELETE');
    expect(calls[1]![0]).toBe('http://api.test/api/v1/feed?tab=near&cursor=abc&limit=5');
  });
});
