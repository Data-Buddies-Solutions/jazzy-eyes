import { describe, expect, it } from 'vitest';
import { createSession, SESSION_MAX_AGE_SECONDS, verifySession } from '../session';

const SECRET = 'a'.repeat(32);
const NOW = new Date('2026-11-02T12:00:00.000Z');
const later = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);

describe('session tokens', () => {
  it('accepts its own token until it expires', async () => {
    const token = await createSession(SECRET, NOW);
    expect(await verifySession(token, SECRET, NOW)).toBe(true);
    expect(await verifySession(token, SECRET, later(SESSION_MAX_AGE_SECONDS - 1))).toBe(true);
    expect(await verifySession(token, SECRET, later(SESSION_MAX_AGE_SECONDS))).toBe(false);
  });

  it('rejects the old fixed cookie value, missing tokens and junk', async () => {
    for (const token of [undefined, '', 'authenticated', '123', '123.', '.abc', 'x.y.z', 'NaN.abc']) {
      expect(await verifySession(token, SECRET, NOW)).toBe(false);
    }
  });

  it('rejects a token signed with another secret', async () => {
    const token = await createSession('b'.repeat(32), NOW);
    expect(await verifySession(token, SECRET, NOW)).toBe(false);
  });

  it('rejects a token whose expiry was extended', async () => {
    const [, signature] = (await createSession(SECRET, NOW)).split('.');
    const extended = `${later(SESSION_MAX_AGE_SECONDS * 10).getTime()}.${signature}`;
    expect(await verifySession(extended, SECRET, later(SESSION_MAX_AGE_SECONDS + 1))).toBe(false);
  });

  it('refuses a missing or short secret', async () => {
    await expect(createSession('', NOW)).rejects.toThrow('SESSION_SECRET');
    await expect(verifySession('1.a', 'short', NOW)).rejects.toThrow('SESSION_SECRET');
  });
});
