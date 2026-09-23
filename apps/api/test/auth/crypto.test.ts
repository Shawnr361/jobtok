import { describe, expect, it } from 'vitest';
import {
  InvalidAccessTokenError,
  generateOtp,
  generateToken,
  hashOtp,
  hashPassword,
  safeEqualHex,
  sha256,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} from '../../src/modules/auth/crypto.js';

const secret = new TextEncoder().encode('unit-test-secret-at-least-32-characters-long');

describe('password hashing', () => {
  it('hashes with Argon2id and never stores the plaintext', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(hash).not.toContain('correct horse battery');
  });

  it('uses a unique salt per hash', async () => {
    expect(await hashPassword('same-password')).not.toBe(await hashPassword('same-password'));
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(await verifyPassword(hash, 'correct horse battery')).toBe(true);
    expect(await verifyPassword(hash, 'Correct horse battery')).toBe(false);
    expect(await verifyPassword('not-a-hash', 'anything')).toBe(false);
  });
});

describe('OTP generation', () => {
  it('produces 6-digit numeric codes, including leading zeros', () => {
    const codes = Array.from({ length: 2000 }, generateOtp);
    for (const c of codes) expect(c).toMatch(/^\d{6}$/);
    expect(new Set(codes).size).toBeGreaterThan(1900);
  });

  it('hashes codes with a server key, bound to the challenge scope', () => {
    const a = hashOtp('key-one', 'login:+2348031234567:-', '123456');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('123456');
    expect(hashOtp('key-one', 'login:+2348031234567:-', '123456')).toBe(a);
    expect(hashOtp('key-two', 'login:+2348031234567:-', '123456')).not.toBe(a);
    expect(hashOtp('key-one', 'login:+2348039999999:-', '123456')).not.toBe(a);
  });

  it('compares hashes in constant time and rejects different lengths', () => {
    expect(safeEqualHex(sha256('a'), sha256('a'))).toBe(true);
    expect(safeEqualHex(sha256('a'), sha256('b'))).toBe(false);
    expect(safeEqualHex(sha256('a'), 'abcd')).toBe(false);
  });
});

describe('random tokens', () => {
  it('are 256-bit URL-safe and unique', () => {
    const t = generateToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateToken()).not.toBe(t);
  });
});

describe('access tokens', () => {
  const now = new Date('2026-09-23T10:00:00Z');

  it('round-trips user and session ids', async () => {
    const { token, expiresAt } = await signAccessToken(
      secret,
      { userId: 'u1', sessionId: 's1' },
      now,
      900,
    );
    expect(expiresAt.toISOString()).toBe('2026-09-23T10:15:00.000Z');
    await expect(verifyAccessToken(secret, token, now)).resolves.toEqual({
      userId: 'u1',
      sessionId: 's1',
    });
  });

  it('rejects expired tokens', async () => {
    const { token } = await signAccessToken(secret, { userId: 'u1', sessionId: 's1' }, now, 900);
    const later = new Date(now.getTime() + 901_000);
    await expect(verifyAccessToken(secret, token, later)).rejects.toMatchObject({
      reason: 'expired',
    });
  });

  it('rejects tokens signed with another key or tampered with', async () => {
    const { token } = await signAccessToken(secret, { userId: 'u1', sessionId: 's1' }, now, 900);
    const other = new TextEncoder().encode('another-secret-that-is-at-least-32-chars!!');
    await expect(verifyAccessToken(other, token, now)).rejects.toBeInstanceOf(
      InvalidAccessTokenError,
    );
    const [h, p, s] = token.split('.');
    const forged = `${h}.${Buffer.from(JSON.stringify({ sub: 'admin', sid: 's1', typ: 'access' })).toString('base64url')}.${s}`;
    void p;
    await expect(verifyAccessToken(secret, forged, now)).rejects.toMatchObject({
      reason: 'invalid',
    });
  });
});
