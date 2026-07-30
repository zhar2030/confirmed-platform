/**
 * Unified Auth Session — Multi-Tenant SaaS
 * ──────────────────────────────────────────
 * Stores the unified session token for both owners (after OTP) and staff (after password login).
 * Backward-compatible: getProviderHeaders() still works via the legacy key.
 *
 * Headers sent on every authenticated API call:
 *   X-Tenant-Id          — tenantId (providerId)
 *   X-Actor-Id           — actorId (providerId or staffId)
 *   X-Actor-Type         — 'owner' | 'staff'
 *   X-Actor-Role         — 'owner' | 'manager' | 'cashier' | 'specialist'
 *   X-Auth-Token         — HMAC token from server
 *   X-Actor-Permissions  — comma-separated permissions
 *   (+ legacy headers for backward compat with providerAuth middleware)
 */

const UNIFIED_KEY = 'confirmed_unified_session';

export interface UnifiedSession {
  token:       string;
  tenantId:    number;
  actorId:     number;
  actorType:   'owner' | 'staff';
  role:        string;
  permissions: string[];
  staffName?:  string;
  salonName?:  string;
  // For backward compat — filled in for owner logins
  legacyProviderId?:    number;
  legacyProviderUser?:  string;
  legacyProviderToken?: string;
}

export function saveUnifiedSession(session: UnifiedSession): void {
  try {
    sessionStorage.setItem(UNIFIED_KEY, JSON.stringify(session));
  } catch { /* ignore */ }
}

export function getUnifiedSession(): UnifiedSession | null {
  try {
    const raw = sessionStorage.getItem(UNIFIED_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UnifiedSession;
  } catch {
    return null;
  }
}

export function clearUnifiedSession(): void {
  try {
    sessionStorage.removeItem(UNIFIED_KEY);
  } catch { /* ignore */ }
}

/**
 * Returns all auth headers needed by the server.
 * Sends both unified headers + legacy provider headers (for backward compat).
 */
export function getUnifiedHeaders(): Record<string, string> {
  try {
    const s = getUnifiedSession();
    if (!s || !s.token) return {};

    const headers: Record<string, string> = {
      'X-Tenant-Id':          String(s.tenantId),
      'X-Actor-Id':           String(s.actorId),
      'X-Actor-Type':         s.actorType,
      'X-Actor-Role':         s.role,
      'X-Auth-Token':         s.token,
      'X-Actor-Permissions':  (s.permissions ?? []).join(','),
    };

    // Legacy backward-compat headers (for routes still using providerAuth)
    if (s.legacyProviderId && s.legacyProviderToken && s.legacyProviderUser) {
      headers['X-Provider-Id']    = String(s.legacyProviderId);
      headers['X-Provider-Token'] = s.legacyProviderToken;
      headers['X-Provider-User']  = s.legacyProviderUser;
    }

    return headers;
  } catch {
    return {};
  }
}

export function hasPermission(perm: string): boolean {
  const s = getUnifiedSession();
  return s?.permissions?.includes(perm) ?? false;
}

export function isOwnerSession(): boolean {
  return getUnifiedSession()?.actorType === 'owner';
}

export function isStaffSession(): boolean {
  return getUnifiedSession()?.actorType === 'staff';
}

export function getCurrentRole(): string {
  return getUnifiedSession()?.role ?? 'guest';
}
