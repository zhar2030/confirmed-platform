/**
 * Provider auth helpers — store/retrieve the HMAC token issued by the server
 * after a successful provider OTP login.
 *
 * Headers sent on every authenticated provider API call:
 *   X-Provider-Id    — numeric DB id
 *   X-Provider-Token — HMAC-SHA256 token (server-issued, day-scoped)
 *   X-Provider-User  — username (used as HMAC input)
 */

const STORAGE_KEY = 'confirmed_provider_token';

export interface ProviderTokenData {
  providerId: number;
  username: string;
  token: string;
}

export function saveProviderToken(data: ProviderTokenData): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function clearProviderToken(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

export function getProviderHeaders(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const { providerId, username, token } = JSON.parse(raw) as ProviderTokenData;
    if (!providerId || !username || !token) return {};
    return {
      'X-Provider-Id':    String(providerId),
      'X-Provider-Token': token,
      'X-Provider-User':  username,
    };
  } catch {
    return {};
  }
}
