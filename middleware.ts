import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware runs in Edge runtime — just checks cookie format
// Full HMAC verification happens in each API route via requireAuth()
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('mc_auth')?.value;
  // Token must exist and have the "value.signature" format (two dot-separated parts)
  const looksValid = !!token && token.includes('.') && token.split('.').length === 2;

  if (!looksValid) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
