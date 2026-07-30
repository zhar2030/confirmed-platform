/**
 * AES-256-GCM encryption for storing WhatsApp System User tokens.
 * Key is derived from SESSION_SECRET via scrypt so no separate env var is needed.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LEN   = 32;   // 256 bits
const SALT      = 'whatsapp-token-v1'; // static salt is intentional (key isolation only)

function getKey(): Buffer {
  const secret = process.env['SESSION_SECRET'] ?? 'fallback-dev-secret-change-in-prod';
  return scryptSync(secret, SALT, KEY_LEN);
}

/**
 * Encrypt plaintext → hex string: iv(12B) + authTag(16B) + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv   = randomBytes(12); // 96-bit IV is recommended for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag(); // 128-bit auth tag
  return Buffer.concat([iv, tag, encrypted]).toString('hex');
}

/**
 * Decrypt hex string produced by encrypt().
 * Throws if the ciphertext has been tampered with (GCM auth tag mismatch).
 */
export function decrypt(ciphertext: string): string {
  const key  = getKey();
  const data = Buffer.from(ciphertext, 'hex');
  const iv        = data.subarray(0, 12);
  const tag       = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
