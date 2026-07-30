/**
 * HMAC-based provider session token.
 * Token = HMAC-SHA256("provider|providerId|username|YYYY-MM-DD", SESSION_SECRET)
 * Valid for the current UTC day — auto-expires at midnight.
 */
import { createHmac } from 'node:crypto';

const secret = process.env['SESSION_SECRET'];
if (!secret && process.env['NODE_ENV'] === 'production') {
  throw new Error('FATAL: SESSION_SECRET environment variable is required in production');
}
const _secret = secret ?? 'fallback-dev-secret-change-in-prod';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export function generateProviderToken(providerId: number, username: string): string {
  return createHmac('sha256', _secret)
    .update(`provider|${providerId}|${username}|${todayUTC()}`)
    .digest('hex');
}

export function verifyProviderToken(
  providerId: number,
  username: string,
  token: string,
): boolean {
  if (!token || !providerId || !username) return false;
  const expected = generateProviderToken(providerId, username);
  if (expected.length !== token.length) return false;
  // Constant-time comparison — prevents timing attacks
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}
