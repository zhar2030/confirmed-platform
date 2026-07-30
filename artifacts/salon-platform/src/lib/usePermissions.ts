/**
 * usePermissions — React hook for permission-aware UI
 * ──────────────────────────────────────────────────────
 * Reads the unified session and exposes permission helpers.
 * Re-reads on every render (session is in sessionStorage, not React state).
 */

import { getUnifiedSession } from './unifiedAuth';

export interface PermissionsState {
  role:        string;
  permissions: string[];
  actorType:   'owner' | 'staff' | null;
  isOwner:     boolean;
  isStaff:     boolean;
  isManager:   boolean;
  isCashier:   boolean;
  isSpecialist: boolean;
  hasPermission: (perm: string) => boolean;
  canManageStaff:   boolean;
  canReadStaff:     boolean;
  canWriteBookings: boolean;
  canDeleteBookings: boolean;
  canReadReports:   boolean;
  canReadSettings:  boolean;
  canWriteSettings: boolean;
  canReviewApprovals: boolean;
}

export function usePermissions(): PermissionsState {
  const session = getUnifiedSession();

  const permissions = session?.permissions ?? [];
  const role        = session?.role ?? 'guest';
  const actorType   = (session?.actorType as 'owner' | 'staff') ?? null;

  const hasPermission = (perm: string): boolean => permissions.includes(perm);

  return {
    role,
    permissions,
    actorType,
    isOwner:     actorType === 'owner' || role === 'owner',
    isStaff:     actorType === 'staff',
    isManager:   role === 'manager',
    isCashier:   role === 'cashier',
    isSpecialist: role === 'specialist',
    hasPermission,
    canManageStaff:    hasPermission('staff:manage'),
    canReadStaff:      hasPermission('staff:read'),
    canWriteBookings:  hasPermission('bookings:write'),
    canDeleteBookings: hasPermission('bookings:delete'),
    canReadReports:    hasPermission('reports:read'),
    canReadSettings:   hasPermission('settings:read'),
    canWriteSettings:  hasPermission('settings:write'),
    canReviewApprovals: hasPermission('approvals:review'),
  };
}
