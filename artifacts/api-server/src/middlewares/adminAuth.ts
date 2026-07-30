/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PLATFORM ROLE HIERARCHY                              ║
 * ║                                                                          ║
 * ║  This middleware guards routes that belong EXCLUSIVELY to the           ║
 * ║  PLATFORM OWNER (Super Admin) — the entity that runs the SaaS itself.  ║
 * ║                                                                          ║
 * ║  Role Definitions                                                        ║
 * ║  ─────────────────────────────────────────────────────────────────────  ║
 * ║  PLATFORM OWNER (Super Admin)                                           ║
 * ║    • Owns and operates the CONFIRMED SaaS platform                      ║
 * ║    • Can see ALL salons, ALL revenue, ALL audit logs                    ║
 * ║    • Approves / suspends / deletes salon accounts                       ║
 * ║    • Sets subscription packages and platform-wide settings              ║
 * ║    • DB field: providers.role = 'owner'                                 ║
 * ║    • Protected by: X-Admin-Token (HMAC) verified here                  ║
 * ║                                                                          ║
 * ║  SALON OWNER (Provider)                                                 ║
 * ║    • A CUSTOMER of the platform — owns a single salon                  ║
 * ║    • Sees ONLY their own salon's data (tenant-scoped)                   ║
 * ║    • CANNOT access any endpoint protected by requireAdmin               ║
 * ║    • DB field: providers.role = 'provider'                              ║
 * ║    • Protected by: tenantAuth middleware                                ║
 * ║                                                                          ║
 * ║  SALON STAFF (Employee)                                                 ║
 * ║    • Employee of a salon owner, role-scoped within one tenant           ║
 * ║    • Protected by: tenantAuth middleware (staff credentials)            ║
 * ║                                                                          ║
 * ║  ⚠️  NEVER grant requireAdmin access to a salon owner or staff.        ║
 * ║  ⚠️  NEVER use username matching to determine admin status.             ║
 * ║      Role MUST come from providers.role = 'owner' in the database.     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Request headers required:
 *   X-Admin-Token — HMAC-signed token issued at platform-owner login
 *   X-Admin-User  — platform owner username (used in HMAC verification)
 */
import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../lib/adminToken';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token    = req.headers['x-admin-token'] as string | undefined;
  const username = req.headers['x-admin-user']  as string | undefined;

  if (!token || !username) {
    res.status(401).json({ error: 'admin_auth_required' });
    return;
  }

  if (!verifyAdminToken(username, token)) {
    // 401 (not 403) — avoids leaking whether the username is valid
    res.status(401).json({ error: 'invalid_admin_token' });
    return;
  }

  next();
}
