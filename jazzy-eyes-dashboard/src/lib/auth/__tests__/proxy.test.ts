import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proxy } from '../../../../proxy';
import { createSession, SESSION_COOKIE } from '../session';

const SECRET = 'a'.repeat(32);

function request(path: string, cookie?: string) {
  const headers = cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : undefined;
  return new NextRequest(new URL(path, 'http://localhost:3000'), { headers });
}

describe('proxy', () => {
  beforeEach(() => vi.stubEnv('SESSION_SECRET', SECRET));
  afterEach(() => vi.unstubAllEnvs());

  it('rejects API calls without a valid session, including the old fixed cookie', async () => {
    for (const cookie of [undefined, 'authenticated']) {
      const response = await proxy(request('/api/reports/inventory?brandId=1', cookie));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ success: false, error: 'Unauthorized' });
    }
  });

  it('lets a signed session through to the API and admin pages', async () => {
    const token = await createSession(SECRET, new Date());
    expect((await proxy(request('/api/brands', token))).headers.get('x-middleware-next')).toBe('1');
    expect((await proxy(request('/admin/manage', token))).headers.get('x-middleware-next')).toBe('1');
  });

  it('leaves login and logout open', async () => {
    for (const path of ['/api/auth/login', '/api/auth/logout']) {
      expect((await proxy(request(path))).headers.get('x-middleware-next')).toBe('1');
    }
  });

  it('sends signed-out admin visits to the login page and signed-in home visits to the app', async () => {
    expect((await proxy(request('/admin/manage', 'authenticated'))).headers.get('location')).toBe('http://localhost:3000/');
    const token = await createSession(SECRET, new Date());
    expect((await proxy(request('/', token))).headers.get('location')).toBe('http://localhost:3000/admin/manage');
  });
});
