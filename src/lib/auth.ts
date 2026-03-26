import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-change-me';
export const PASSWORD = process.env.MC_PASSWORD || 'mission2026';

// In-memory rate limiter
const loginAttempts: Record<string, { count: number; resetAt: number }> = {};
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

export function signToken(value: string): string {
  const sig = createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
  return `${value}.${sig}`;
}

export function verifyToken(token: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [value, sig] = parts;
  const expected = createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
  // Constant-time compare
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0 && value === 'authenticated';
}

export function requireAuth(request: NextRequest): NextResponse | null {
  const token = request.cookies.get('mc_auth')?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts[ip];
  if (!record || now > record.resetAt) {
    loginAttempts[ip] = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
}

export function resetRateLimit(ip: string) {
  delete loginAttempts[ip];
}
