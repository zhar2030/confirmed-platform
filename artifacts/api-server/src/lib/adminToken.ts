/**
 * Simple HMAC-based admin token.
 * Token = HMAC-SHA256(username|YYYY-MM-DD, SESSION_SECRET)
 * Valid for the current UTC day — auto-expires at midnight.
 */
import { createHmac } from 'node:crypto';

const secret = process.env['SESSION_SECRET'] ?? 'fallback-dev-secret-change-in-prod';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export function generateAdminToken(username: string): string {
  return createHmac('sha256', secret)
    .update(`${username}|${todayUTC()}`)
    .digest('hex');
}

export function verifyAdminToken(username: string, token: string): boolean {
  if (!token || !username) return false;
  const expected = generateAdminToken(username);
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}
