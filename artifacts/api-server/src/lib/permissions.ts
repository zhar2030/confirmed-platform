/**
 * Permission Matrix — Multi-Tenant SaaS
 * ─────────────────────────────────────
 * Granular permissions per role.  Roles are additive:
 *   owner       = all permissions
 *   manager     = most, except staff:manage and settings:write
 *   cashier     = booking + client read/write
 *   specialist  = own bookings read-only + client read
 *
 * Staff may also have custom permissions stored in staff.permissions
 * (comma-separated overrides that EXTEND the role defaults).
 */

export type Permission =
  | 'bookings:read'
  | 'bookings:write'
  | 'bookings:delete'
  | 'bookings:change_price'   // requires approval if cashier/specialist
  | 'clients:read'
  | 'clients:write'
  | 'clients:delete'
  | 'staff:read'
  | 'staff:manage'            // invite / deactivate / update permissions
  | 'reports:read'
  | 'settings:read'
  | 'settings:write'
  | 'approvals:review';       // can approve/reject pending requests

export type StaffRole = 'owner' | 'manager' | 'cashier' | 'specialist';

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: [
    'bookings:read', 'bookings:write', 'bookings:delete', 'bookings:change_price',
    'clients:read', 'clients:write', 'clients:delete',
    'staff:read', 'staff:manage',
    'reports:read',
    'settings:read', 'settings:write',
    'approvals:review',
  ],
  manager: [
    'bookings:read', 'bookings:write', 'bookings:delete', 'bookings:change_price',
    'clients:read', 'clients:write',
    'staff:read',
    'reports:read',
    'settings:read',
    'approvals:review',
  ],
  cashier: [
    'bookings:read', 'bookings:write',
    'clients:read', 'clients:write',
  ],
  specialist: [
    'bookings:read',
    'clients:read',
  ],
};

/** Operations that require manager/owner approval if performed by cashier or specialist */
export const APPROVAL_REQUIRED_ACTIONS: Record<string, { roles: StaffRole[]; description: string }> = {
  price_change: {
    roles: ['cashier', 'specialist'],
    description: 'تغيير سعر الحجز',
  },
  large_discount: {
    roles: ['cashier', 'specialist', 'manager'],
    description: 'خصم يتجاوز 20%',
  },
  booking_delete: {
    roles: ['cashier', 'specialist'],
    description: 'حذف حجز',
  },
  refund: {
    roles: ['cashier', 'specialist', 'manager'],
    description: 'استرجاع مبلغ',
  },
  client_delete: {
    roles: ['cashier', 'specialist'],
    description: 'حذف بيانات عميل',
  },
  invoice_delete: {
    roles: ['cashier', 'specialist', 'manager'],
    description: 'حذف فاتورة',
  },
};

/**
 * Compute effective permissions for a user:
 *   base role permissions ∪ custom staff.permissions overrides
 */
export function computePermissions(
  role: string,
  customPermissions: string,
): Permission[] {
  const base: Permission[] =
    ROLE_PERMISSIONS[role as StaffRole] ?? [];

  const custom = customPermissions
    .split(',')
    .map(p => p.trim())
    .filter(Boolean) as Permission[];

  return [...new Set([...base, ...custom])];
}

export function hasPermission(
  userPermissions: Permission[],
  required: Permission,
): boolean {
  return userPermissions.includes(required);
}

/** Does this action require approval for this role? */
export function requiresApproval(actionType: string, role: string): boolean {
  const rule = APPROVAL_REQUIRED_ACTIONS[actionType];
  if (!rule) return false;
  return rule.roles.includes(role as StaffRole);
}
