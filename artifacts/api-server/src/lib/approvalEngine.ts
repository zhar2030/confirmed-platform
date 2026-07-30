/**
 * Approval Engine — Multi-Tenant SaaS
 * ─────────────────────────────────────
 * Flexible approval workflow for sensitive operations.
 *
 * Flow:
 *   1. Staff attempts a sensitive action
 *   2. requireApprovalFor() middleware intercepts it
 *   3. Creates an approval_request record
 *   4. Sends notification (in-app + email to manager/owner)
 *   5. Returns 202 with { pendingApproval: true, requestId }
 *   6. Manager/owner reviews via GET/POST /approvals
 *   7. On approve: action executes automatically using stored payload
 *   8. On reject: staff is notified
 *   9. Every step logged in audit_logs
 */

import { Request, Response, NextFunction } from 'express';
import { db, providers, staff as staffTable } from './db';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { requiresApproval } from './permissions';
import { logAudit } from './auditLog';

const APP_URL    = process.env['APP_URL']   || 'https://confirmedgrowth.com';
const FROM_NAME  = 'CONFIRMED';
const FROM_EMAIL = process.env['FROM_EMAIL'] || 'noreply@confirmedgrowth.com';

// ── Types ──────────────────────────────────────────────────────────────────────
export type ApprovalActionType =
  | 'price_change'
  | 'large_discount'
  | 'booking_delete'
  | 'refund'
  | 'client_delete'
  | 'invoice_delete';

export interface ApprovalRequest {
  id:            number;
  tenantId:      number;
  requesterId:   number;
  requesterType: string;
  requesterName: string | null;
  actionType:    string;
  resourceType:  string | null;
  resourceId:    number | null;
  payload:       string;       // JSON
  currentValue:  string | null; // JSON
  status:        string;
  reviewerId:    number | null;
  reviewerType:  string | null;
  reviewerNote:  string | null;
  requestedAt:   Date;
  reviewedAt:    Date | null;
  expiresAt:     Date;
}

// ── Create approval request ───────────────────────────────────────────────────
export async function createApprovalRequest(params: {
  tenantId:      number;
  requesterId:   number;
  requesterType: 'owner' | 'staff';
  requesterName: string;
  actionType:    string;
  resourceType?: string;
  resourceId?:   number;
  payload:       Record<string, unknown>;
  currentValue?: Record<string, unknown>;
}): Promise<number> {
  const result = await db.execute(sql`
    INSERT INTO approval_requests
      (tenant_id, requester_id, requester_type, requester_name,
       action_type, resource_type, resource_id, payload, current_value, expires_at)
    VALUES
      (${params.tenantId}, ${params.requesterId}, ${params.requesterType},
       ${params.requesterName}, ${params.actionType},
       ${params.resourceType ?? null}, ${params.resourceId ?? null},
       ${JSON.stringify(params.payload)},
       ${params.currentValue ? JSON.stringify(params.currentValue) : null},
       NOW() + INTERVAL '24 hours')
    RETURNING id
  `);
  return (result.rows[0] as any).id as number;
}

// ── Send approval notification email ─────────────────────────────────────────
async function sendApprovalNotification(params: {
  toEmail:       string;
  salonName:     string;
  requesterName: string;
  actionType:    string;
  description:   string;
  requestId:     number;
  payload:       Record<string, unknown>;
}): Promise<void> {
  const reviewUrl = `${APP_URL}/dashboard?approvals=1&id=${params.requestId}`;
  const html = buildApprovalEmail(params.salonName, params.requesterName, params.description, reviewUrl, params.payload);

  const RESEND_KEY   = process.env['RESEND_API_KEY'];
  const SENDGRID_KEY = process.env['SENDGRID_API_KEY'];
  const BREVO_KEY    = process.env['BREVO_API_KEY'];

  if (RESEND_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: params.toEmail,
        subject: `⚡ طلب موافقة: ${params.description} — ${params.salonName}`, html }),
    });
    if (res.ok) { console.info(`[APPROVAL] Notification sent via Resend`); return; }
  }
  if (SENDGRID_KEY) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: params.toEmail }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: `⚡ طلب موافقة: ${params.description} — ${params.salonName}`,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    if (res.ok || res.status === 202) { console.info(`[APPROVAL] Notification sent via SendGrid`); return; }
  }
  if (BREVO_KEY) {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: params.toEmail }],
        subject: `⚡ طلب موافقة: ${params.description} — ${params.salonName}`,
        htmlContent: html,
      }),
    });
  }
  if (process.env['NODE_ENV'] !== 'production') {
    console.log(`[DEV APPROVAL] Notification to: ${params.toEmail}`);
  }
}

// ── Middleware factory ────────────────────────────────────────────────────────
/**
 * requireApprovalFor(actionType)
 *
 * Place AFTER tenantAuth on a route. If the actor's role requires approval
 * for this action, the request is intercepted, an approval request is created,
 * notification sent, and a 202 is returned. Otherwise, next() is called.
 *
 * @param actionType    Key from APPROVAL_REQUIRED_ACTIONS
 * @param getPayload    Extract the proposed payload from req (defaults to req.body)
 * @param getResourceId Extract the resource id from req (defaults to req.params.id)
 * @param resourceType  Human-readable resource name
 */
export function requireApprovalFor(
  actionType: ApprovalActionType,
  options?: {
    resourceType?: string;
    getPayload?: (req: Request) => Record<string, unknown>;
    getCurrentValue?: (req: Request) => Record<string, unknown> | undefined;
    getResourceId?: (req: Request) => number | undefined;
  },
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenant = (req as any).tenant;
    if (!tenant) { res.status(401).json({ error: 'auth_required' }); return; }

    // Only intercept if this role requires approval
    if (!requiresApproval(actionType, tenant.role)) {
      next();
      return;
    }

    try {
      // Fetch salon + owner email for notification
      const [salon] = await db
        .select({ name: providers.nameAr, email: providers.email })
        .from(providers)
        .where(eq(providers.id, tenant.tenantId))
        .limit(1);

      // Get requester name
      let requesterName = 'موظف';
      if (tenant.actorType === 'staff') {
        const [s] = await db
          .select({ name: staffTable.name })
          .from(staffTable)
          .where(eq(staffTable.id, tenant.actorId))
          .limit(1);
        if (s) requesterName = s.name;
      }

      const payload     = options?.getPayload?.(req) ?? req.body;
      const currentVal  = options?.getCurrentValue?.(req);
      const resourceId  = options?.getResourceId?.(req) ?? parseInt(String(req.params['id'] ?? ''), 10);

      const requestId = await createApprovalRequest({
        tenantId:      tenant.tenantId,
        requesterId:   tenant.actorId,
        requesterType: tenant.actorType,
        requesterName,
        actionType,
        resourceType:  options?.resourceType,
        resourceId:    isNaN(resourceId) ? undefined : resourceId,
        payload,
        currentValue:  currentVal,
      });

      // Log audit
      await logAudit({
        tenantId:    tenant.tenantId,
        actorId:     tenant.actorId,
        actorType:   tenant.actorType,
        actorRole:   tenant.role,
        action:      `approval_requested:${actionType}`,
        resourceType: options?.resourceType,
        resourceId:  isNaN(resourceId) ? undefined : resourceId,
        metadata:    { requestId, payload },
        ipAddress:   req.ip,
      });

      // Send email to owner/manager
      if (salon) {
        const { APPROVAL_REQUIRED_ACTIONS } = await import('./permissions');
        const desc = APPROVAL_REQUIRED_ACTIONS[actionType]?.description ?? actionType;
        sendApprovalNotification({
          toEmail:       salon.email,
          salonName:     salon.name,
          requesterName,
          actionType,
          description:   desc,
          requestId,
          payload,
        }).catch(err => console.error('[APPROVAL] Notification failed:', err?.message));
      }

      res.status(202).json({
        pendingApproval: true,
        requestId,
        message: 'تم إرسال طلب الموافقة للمدير — ستُنفَّذ العملية بعد الموافقة',
        actionType,
      });
    } catch (err: any) {
      console.error('[APPROVAL ENGINE]', err);
      res.status(500).json({ error: 'approval_engine_error' });
    }
  };
}

// ── HTML Email Template ────────────────────────────────────────────────────────
function buildApprovalEmail(
  salonName: string,
  requesterName: string,
  description: string,
  reviewUrl: string,
  payload: Record<string, unknown>,
): string {
  const payloadRows = Object.entries(payload)
    .filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => `
      <tr>
        <td style="padding:6px 12px;font-size:12px;color:#6B7280;font-weight:600;border-bottom:1px solid #F3F4F6">${k}</td>
        <td style="padding:6px 12px;font-size:13px;color:#111827;border-bottom:1px solid #F3F4F6">${JSON.stringify(v)}</td>
      </tr>`)
    .join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F5;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);max-width:100%">

        <tr><td style="background:#0F1923;padding:32px 48px;text-align:center">
          <div style="margin-bottom:10px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E84E4E;margin:0 2px"></span>
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#C9A84C;margin:0 2px"></span>
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#4CAF7D;margin:0 2px"></span>
          </div>
          <p style="margin:0;font-size:24px;font-weight:900;color:#fff;letter-spacing:6px">CONFIRMED</p>
          <p style="margin:6px 0 0;font-size:11px;color:#C9A84C;letter-spacing:3px">طلب موافقة جديد</p>
        </td></tr>

        <tr><td style="background:#FFF8E7;border-bottom:2px solid #F5D878;padding:14px 48px;text-align:center">
          <p style="margin:0;font-size:13px;color:#856404;font-weight:700">
            ⚡ يتطلب موافقتك الفورية
          </p>
        </td></tr>

        <tr><td style="padding:32px 48px">
          <p style="margin:0 0 6px;font-size:13px;color:#6B7280">الصالون</p>
          <p style="margin:0 0 20px;font-size:17px;font-weight:800;color:#0F1923">${salonName}</p>

          <p style="margin:0 0 6px;font-size:13px;color:#6B7280">طلب من</p>
          <p style="margin:0 0 20px;font-size:15px;font-weight:600;color:#111827">${requesterName}</p>

          <p style="margin:0 0 6px;font-size:13px;color:#6B7280">نوع الطلب</p>
          <p style="margin:0 0 24px;font-size:15px;font-weight:700;color:#DC2626">${description}</p>

          ${payloadRows ? `
          <p style="margin:0 0 8px;font-size:13px;color:#6B7280">تفاصيل التغيير المطلوب</p>
          <table width="100%" style="border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;margin-bottom:24px">
            ${payloadRows}
          </table>` : ''}

          <div style="text-align:center">
            <a href="${reviewUrl}" style="display:inline-block;background:#0F1923;color:#C9A84C;text-decoration:none;padding:14px 40px;border-radius:12px;font-weight:800;font-size:14px">
              مراجعة الطلب والموافقة أو الرفض
            </a>
          </div>
          <p style="margin:12px 0 0;font-size:11px;color:#9CA3AF;text-align:center">
            ينتهي الطلب خلال 24 ساعة من وقت إرساله
          </p>
        </td></tr>

        <tr><td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:18px 48px;text-align:center">
          <p style="margin:0;font-size:11px;color:#9CA3AF">© 2026 CONFIRMED · confirmedgrowth.com</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
