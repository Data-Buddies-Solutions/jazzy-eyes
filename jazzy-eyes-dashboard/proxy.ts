import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, sessionSecret, verifySession } from '@/lib/auth/session';

// Every API route needs a signed session except signing in and out.
const PUBLIC_API = new Set(['/api/auth/login', '/api/auth/logout']);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_API.has(pathname)) return NextResponse.next();

  const isAuthenticated = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, sessionSecret(), new Date());

  if (pathname.startsWith('/api/') && !isAuthenticated) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (pathname.startsWith('/admin') && !isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (pathname === '/' && isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/manage', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin/:path*', '/api/:path*'],
};
