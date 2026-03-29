import { signToken, verifyToken, checkRateLimit } from '@/lib/auth';

describe('Auth utilities', () => {
  test('signToken creates a token with correct format', () => {
    const token = signToken('authenticated');
    expect(token).toMatch(/^authenticated\.[a-f0-9]{64}$/);
  });

  test('verifyToken accepts a valid token', () => {
    const token = signToken('authenticated');
    expect(verifyToken(token)).toBe(true);
  });

  test('verifyToken rejects an invalid value', () => {
    expect(verifyToken('authenticated.invalidsignature')).toBe(false);
  });

  test('verifyToken rejects a tampered token', () => {
    const token = signToken('authenticated');
    const tampered = token.slice(0, -4) + 'aaaa';
    expect(verifyToken(tampered)).toBe(false);
  });

  test('verifyToken rejects empty string', () => {
    expect(verifyToken('')).toBe(false);
  });

  test('verifyToken rejects a non-authenticated value', () => {
    const token = signToken('someothervalue');
    expect(verifyToken(token)).toBe(false);
  });

  test('checkRateLimit allows requests under the limit', () => {
    const ip = `test-ip-${Date.now()}`;
    // First request should be allowed
    expect(checkRateLimit(ip)).toBe(true);
    // Second request should also be allowed
    expect(checkRateLimit(ip)).toBe(true);
  });

  test('checkRateLimit blocks after max attempts', () => {
    const ip = `test-ip-flood-${Date.now()}`;
    // Max is 10 attempts
    for (let i = 0; i < 10; i++) {
      checkRateLimit(ip);
    }
    // 11th should be blocked
    expect(checkRateLimit(ip)).toBe(false);
  });
});
