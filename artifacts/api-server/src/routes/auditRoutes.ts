/**
 * /api/audit-logs — Audit log viewer (owner only)
 *
 * GET /audit-logs          — last N entries for this tenant
 * GET /audit-logs/actions  — distinct action types (for filtering)
 */

import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { tenantAuth, requireOwner } from '../middlewares/tenantAuth';

const router = Router();

router.use('/audit-logs', tenantAuth);
router.use('/audit-logs', requireOwner);

router.get('/audit-logs', async (req, res) => {
  try {
    const tenantId = (req as any).tenant!.tenantId;
    const limit    = Math.min(parseInt(String(req.query['limit'] ?? '100'), 10), 500);
    const action   = req.query['action'] ? String(req.query['action']) : null;

    const rows = await db.execute(sql`
      SELECT id, actor_id, actor_type, actor_role, action, resource_type,
             resource_id, metadata, ip_address, created_at
      FROM audit_logs
      WHERE tenant_id = ${tenantId}
        ${action ? sql`AND action ILIKE ${'%' + action + '%'}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);

    return res.json({ logs: rows.rows });
  } catch (err) {
    console.error('[GET /audit-logs]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

router.get('/audit-logs/actions', async (req, res) => {
  try {
    const tenantId = (req as any).tenant!.tenantId;
    const rows = await db.execute(sql`
      SELECT DISTINCT action FROM audit_logs
      WHERE tenant_id = ${tenantId}
      ORDER BY action
    `);
    return res.json({ actions: (rows.rows as any[]).map(r => r.action) });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
