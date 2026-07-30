/**
 * Admin auth helpers — store/retrieve the HMAC token issued by the server
 * after a successful owner OTP login.
 *
 * Token is day-scoped (HMAC includes YYYY-MM-DD UTC). We store the saved date
 * alongside the credentials so the client can self-detect expiry without a
 * round-trip — clearing stale tokens before they cause blank screens.
 */

const STORAGE_KEY = 'confirmed_admin_token';

export interface AdminCredentials {
  username: string;
  token: string;
  savedDate: string; // YYYY-MM-DD UTC at save time
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export function saveAdminCredentials(username: string, token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      username,
      token,
      savedDate: todayUTC(),
    }));
  } catch { /* ignore */ }
}

export function clearAdminCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

/**
 * Returns true if there is a non-expired admin credential stored locally.
 * Does NOT verify the HMAC — that is the server's job.
 */
export function hasValidAdminSession(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { username, token, savedDate } = JSON.parse(raw) as AdminCredentials;
    if (!username || !token) return false;
    // Expire at UTC midnight
    if (savedDate !== todayUTC()) {
      clearAdminCredentials();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getAdminHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const { username, token, savedDate } = JSON.parse(raw) as AdminCredentials;
    if (!username || !token) return {};
    // Auto-clear expired or legacy token (no savedDate = assume expired)
    if (savedDate !== todayUTC()) {
      clearAdminCredentials();
      return {};
    }
    return {
      'X-Admin-User':  username,
      'X-Admin-Token': token,
    };
  } catch {
    return {};
  }
}
