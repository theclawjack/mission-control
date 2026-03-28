import { NextRequest, NextResponse } from 'next/server';
import { signToken, PASSWORD, checkRateLimit, resetRateLimit } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
    }
    const { password } = await request.json();
    if (password === PASSWORD) {
      resetRateLimit(ip);
      const token = signToken('authenticated');
      const response = NextResponse.json({ success: true });
      response.cookies.set('mc_auth', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        sameSite: 'lax',
      });
      return response;
    }
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
