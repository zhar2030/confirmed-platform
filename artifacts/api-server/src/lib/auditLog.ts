/**
 * Audit Log Helper — Multi-Tenant SaaS
 * ──────────────────────────────────────
 * Writes to audit_logs table.  Fire-and-forget (errors are logged, not thrown).
 */

import { db } from './db';
import { sql } from 'drizzle-orm';
import type { Request } from 'express';

export interface AuditEntry {
  tenantId:     number;
  actorId:      number;
  actorType:    'owner' | 'staff';
  actorRole?:   string;
  action:       string;
  resourceType?: string;
  resourceId?:  number;
  metadata?:    Record<string, unknown>;
  ipAddress?:   string;
}

/**
 * Log an audit entry.  Does NOT throw — always resolves.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO audit_logs
        (tenant_id, actor_id, actor_type, actor_role, action,
         resource_type, resource_id, metadata, ip_address)
      VALUES
        (${entry.tenantId}, ${entry.actorId}, ${entry.actorType},
         ${entry.actorRole ?? null}, ${entry.action},
         ${entry.resourceType ?? null}, ${entry.resourceId ?? null},
         ${entry.metadata ? JSON.stringify(entry.metadata) : null},
         ${entry.ipAddress ?? null})
    `);
  } catch (err: any) {
    console.error('[AUDIT] Failed to write audit log:', err?.message);
  }
}

/**
 * Convenience: extract actor info from a request that has gone through tenantAuth.
 */
export function auditFromReq(
  req: Request,
  action: string,
  extras?: { resourceType?: string; resourceId?: number; metadata?: Record<string, unknown> },
): AuditEntry {
  const t = (req as any).tenant as {
    tenantId: number; actorId: number; actorType: 'owner' | 'staff'; role: string;
  } | undefined;

  return {
    tenantId:    t?.tenantId    ?? 0,
    actorId:     t?.actorId     ?? 0,
    actorType:   t?.actorType   ?? 'owner',
    actorRole:   t?.role,
    action,
    resourceType: extras?.resourceType,
    resourceId:   extras?.resourceId,
    metadata:     extras?.metadata,
    ipAddress:    req.ip ?? req.socket?.remoteAddress,
  };
}
