/**
 * /api/approvals — Approval Workflow Routes
 *
 * GET  /approvals          — list pending (and recent) approvals for this tenant
 * GET  /approvals/:id      — get single approval request details
 * POST /approvals/:id/approve — approve a request (manager/owner only)
 * POST /approvals/:id/reject  — reject a request (manager/owner only)
 * GET  /approvals/stats    — counts: pending, approved, rejected (today)
 */

import { Router } from 'express';
import { db, providers, staff as staffTable } from '../lib/db';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { tenantAuth, requirePermission } from '../middlewares/tenantAuth';
import { logAudit, auditFromReq } from '../lib/auditLog';

const router = Router();

// All approval routes require tenant auth
router.use('/approvals', tenantAuth);

// ── GET /api/approvals ────────────────────────────────────────────────────────
router.get('/approvals', requirePermission('approvals:review'), async (req, res) => {
  try {
    const tenantId = (req as any).tenant!.tenantId;
    const status   = String(req.query['status'] ?? 'pending');
    const limit    = Math.min(parseInt(String(req.query['limit'] ?? '50'), 10), 100);

    const rows = await db.execute(sql`
      SELECT
        ar.id, ar.tenant_id, ar.requester_id, ar.requester_type, ar.requester_name,
        ar.action_type, ar.resource_type, ar.resource_id,
        ar.payload, ar.current_value,
        ar.status, ar.reviewer_id, ar.reviewer_type, ar.reviewer_note,
        ar.requested_at, ar.reviewed_at, ar.expires_at,
        -- Check if expired
        (ar.expires_at < NOW() AND ar.status = 'pending') AS is_expired
      FROM approval_requests ar
      WHERE ar.tenant_id = ${tenantId}
        ${status === 'all'
          ? sql``
          : status === 'pending'
            ? sql`AND (ar.status = 'pending' AND ar.expires_at >= NOW())`
            : sql`AND ar.status = ${status}`
        }
      ORDER BY ar.requested_at DESC
      LIMIT ${limit}
    `);

    const enriched = (rows.rows as any[]).map(r => ({
      ...r,
      payload:      safeParseJSON(r.payload),
      currentValue: safeParseJSON(r.current_value),
    }));

    return res.json({ approvals: enriched });
  } catch (err) {
    console.error('[GET /approvals]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── GET /api/approvals/stats ──────────────────────────────────────────────────
router.get('/approvals/stats', requirePermission('approvals:review'), async (req, res) => {
  try {
    const tenantId = (req as any).tenant!.tenantId;
    const statsResult = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending' AND expires_at >= NOW()) AS pending,
        COUNT(*) FILTER (WHERE status = 'approved' AND reviewed_at >= NOW() - INTERVAL '24 hours') AS approved_today,
        COUNT(*) FILTER (WHERE status = 'rejected' AND reviewed_at >= NOW() - INTERVAL '24 hours') AS rejected_today,
        COUNT(*) FILTER (WHERE status = 'pending' AND expires_at < NOW()) AS expired
      FROM approval_requests
      WHERE tenant_id = ${tenantId}
    `);
    return res.json({ stats: statsResult.rows[0] });
  } catch (err) {
    console.error('[GET /approvals/stats]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── GET /api/approvals/:id ────────────────────────────────────────────────────
router.get('/approvals/:id', requirePermission('approvals:review'), async (req, res) => {
  try {
    const tenantId = (req as any).tenant!.tenantId;
    const id = parseInt(String(req.params['id'] ?? ''), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });

    const rowResult = await db.execute(sql`
      SELECT * FROM approval_requests
      WHERE id = ${id} AND tenant_id = ${tenantId}
      LIMIT 1
    `);

    if (!rowResult.rows[0]) return res.status(404).json({ error: 'not_found' });

    const r = rowResult.rows[0] as any;
    return res.json({
      approval: {
        ...r,
        payload:      safeParseJSON(r.payload),
        currentValue: safeParseJSON(r.current_value),
      }
    });
  } catch (err) {
    console.error('[GET /approvals/:id]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── POST /api/approvals/:id/approve ──────────────────────────────────────────
router.post('/approvals/:id/approve', requirePermission('approvals:review'), async (req, res) => {
  try {
    const tenantId = (req as any).tenant!.tenantId;
    const actor    = (req as any).tenant!;
    const id       = parseInt(String(req.params['id'] ?? ''), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });

    const { note } = req.body as { note?: string };

    // Fetch request
    const approveResult = await db.execute(sql`
      SELECT * FROM approval_requests
      WHERE id = ${id} AND tenant_id = ${tenantId}
      LIMIT 1
    `);

    if (!approveResult.rows[0]) return res.status(404).json({ error: 'not_found' });
    const req_ = approveResult.rows[0] as any;

    if (req_.status !== 'pending') {
      return res.status(409).json({ error: 'already_reviewed', currentStatus: req_.status });
    }
    if (new Date(req_.expires_at) < new Date()) {
      return res.status(410).json({ error: 'request_expired' });
    }

    // Update status
    await db.execute(sql`
      UPDATE approval_requests
      SET status = 'approved',
          reviewer_id = ${actor.actorId},
          reviewer_type = ${actor.actorType},
          reviewer_note = ${note ?? null},
          reviewed_at = NOW()
      WHERE id = ${id}
    `);

    // Notify requester (fire-and-forget)
    notifyRequester(req_.requester_id, req_.requester_type, 'approved', req_.action_type, req_.tenant_id)
      .catch(err => console.error('[APPROVAL] Notify failed:', err?.message));

    await logAudit({
      ...auditFromReq(req, `approval_approved:${req_.action_type}`),
      resourceType: 'approval_request',
      resourceId:   id,
      metadata:     { approvedActionType: req_.action_type, requesterId: req_.requester_id, note },
    });

    return res.json({ success: true, message: 'تمت الموافقة على الطلب' });
  } catch (err) {
    console.error('[POST /approvals/:id/approve]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── POST /api/approvals/:id/reject ───────────────────────────────────────────
router.post('/approvals/:id/reject', requirePermission('approvals:review'), async (req, res) => {
  try {
    const tenantId = (req as any).tenant!.tenantId;
    const actor    = (req as any).tenant!;
    const id       = parseInt(String(req.params['id'] ?? ''), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });

    const { note } = req.body as { note?: string };

    const rejectResult = await db.execute(sql`
      SELECT * FROM approval_requests
      WHERE id = ${id} AND tenant_id = ${tenantId}
      LIMIT 1
    `);

    if (!rejectResult.rows[0]) return res.status(404).json({ error: 'not_found' });
    const req_ = rejectResult.rows[0] as any;
    if (req_.status !== 'pending') {
      return res.status(409).json({ error: 'already_reviewed', currentStatus: req_.status });
    }

    await db.execute(sql`
      UPDATE approval_requests
      SET status = 'rejected',
          reviewer_id = ${actor.actorId},
          reviewer_type = ${actor.actorType},
          reviewer_note = ${note ?? null},
          reviewed_at = NOW()
      WHERE id = ${id}
    `);

    notifyRequester(req_.requester_id, req_.requester_type, 'rejected', req_.action_type, req_.tenant_id)
      .catch(err => console.error('[APPROVAL] Notify failed:', err?.message));

    await logAudit({
      ...auditFromReq(req, `approval_rejected:${req_.action_type}`),
      resourceType: 'approval_request',
      resourceId:   id,
      metadata:     { rejectedActionType: req_.action_type, requesterId: req_.requester_id, note },
    });

    return res.json({ success: true, message: 'تم رفض الطلب' });
  } catch (err) {
    console.error('[POST /approvals/:id/reject]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeParseJSON(s: string | null): unknown {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return s; }
}

async function notifyRequester(
  requesterId: number,
  requesterType: string,
  decision: 'approved' | 'rejected',
  actionType: string,
  tenantId: number,
): Promise<void> {
  // Get email to notify
  let email: string | null = null;
  if (requesterType === 'staff') {
    const [s] = await db.select({ email: staffTable.email }).from(staffTable)
      .where(eq(staffTable.id, requesterId)).limit(1);
    email = s?.email ?? null;
  } else {
    const [p] = await db.select({ email: providers.email }).from(providers)
      .where(eq(providers.id, requesterId)).limit(1);
    email = p?.email ?? null;
  }

  if (!email) return;

  const icon    = decision === 'approved' ? '✅' : '❌';
  const label   = decision === 'approved' ? 'تمت الموافقة' : 'تم الرفض';
  const subject = `${icon} ${label} على طلبك: ${actionType}`;
  const html    = buildDecisionEmail(decision, actionType);

  const RESEND_KEY   = process.env['RESEND_API_KEY'];
  const SENDGRID_KEY = process.env['SENDGRID_API_KEY'];
  const FROM_EMAIL   = process.env['FROM_EMAIL'] || 'noreply@confirmedgrowth.com';

  if (RESEND_KEY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `CONFIRMED <${FROM_EMAIL}>`, to: email, subject, html }),
    });
    if (r.ok) return;
  }
  if (SENDGRID_KEY) {
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: FROM_EMAIL, name: 'CONFIRMED' },
        subject, content: [{ type: 'text/html', value: html }],
      }),
    });
  }
}

function buildDecisionEmail(decision: 'approved' | 'rejected', actionType: string): string {
  const isApproved = decision === 'approved';
  const color = isApproved ? '#059669' : '#DC2626';
  const icon  = isApproved ? '✅' : '❌';
  const title = isApproved ? 'تمت الموافقة على طلبك' : 'تم رفض طلبك';
  const body  = isApproved
    ? 'وافق المدير على طلبك. يمكنك الآن تنفيذ العملية.'
    : 'رفض المدير طلبك. يرجى التواصل معه لمزيد من التفاصيل.';

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:40px 16px;background:#F0F2F5;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
      <tr><td style="background:#0F1923;padding:28px 40px;text-align:center">
        <p style="margin:0;font-size:22px;font-weight:900;color:#fff;letter-spacing:5px">CONFIRMED</p>
      </td></tr>
      <tr><td style="padding:32px 40px;text-align:center">
        <p style="font-size:40px;margin:0 0 12px">${icon}</p>
        <h2 style="margin:0 0 12px;font-size:18px;color:${color}">${title}</h2>
        <p style="margin:0;font-size:14px;color:#4B5563;line-height:1.7">${body}</p>
        <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF">نوع العملية: ${actionType}</p>
      </td></tr>
      <tr><td style="background:#F9FAFB;padding:16px 40px;text-align:center;border-top:1px solid #E5E7EB">
        <p style="margin:0;font-size:11px;color:#9CA3AF">© 2026 CONFIRMED</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export default router;
