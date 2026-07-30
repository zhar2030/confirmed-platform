/**
 * /api/auth/staff — Staff authentication routes.
 *
 * POST /auth/staff/login              — password login (email or username)
 * POST /staff/invite                  — owner invites a staff member (tenantAuth + staff:manage)
 * POST /auth/staff/accept-invitation  — staff accepts invite and sets password (public)
 * GET  /auth/staff/invitation-info    — get salon/role info for invitation page (public, ?token=)
 * POST /auth/staff/refresh            — refresh unified token for current staff session
 */

import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db, providers, staff as staffTable } from '../lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { generateUnifiedToken } from '../lib/unifiedToken';
import { computePermissions } from '../lib/permissions';
import { tenantAuth, requirePermission } from '../middlewares/tenantAuth';
import { logAudit, auditFromReq } from '../lib/auditLog';
import { sendStaffInvitationEmail } from '../lib/emailService';
import { requiresApproval } from '../lib/permissions';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildUnifiedResponse(
  tenantId: number,
  actorId:  number,
  actorType: 'owner' | 'staff',
  role:     string,
  customPermissions = '',
) {
  const permissions = computePermissions(role, customPermissions);
  const token = generateUnifiedToken(tenantId, actorId, actorType, role);
  return {
    token,
    tenantId,
    actorId,
    actorType,
    role,
    permissions,
  };
}

// ── POST /api/auth/staff/login ────────────────────────────────────────────────
router.post('/auth/staff/login', async (req, res) => {
  try {
    const { identifier, password, tenantId: rawTenantId } = req.body as {
      identifier: string;    // email or username
      password:   string;
      tenantId?:  number;    // optional: scope to a specific salon
    };

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'identifier_and_password_required' });
    }

    const clean = identifier.trim().toLowerCase();

    // Look up staff by email or username
    const whereClause = clean.includes('@')
      ? eq(staffTable.email, clean)
      : eq(staffTable.username, clean);

    const [member] = await db
      .select({
        id:          staffTable.id,
        providerId:  staffTable.providerId,
        name:        staffTable.name,
        role:        staffTable.role,
        email:       staffTable.email,
        isActive:    staffTable.isActive,
        permissions: staffTable.permissions,
      })
      .from(staffTable)
      .where(rawTenantId
        ? and(whereClause, eq(staffTable.providerId, rawTenantId))
        : whereClause)
      .limit(1);

    if (!member) {
      return res.status(401).json({ success: false, error: 'invalid_credentials' });
    }

    if (!member.isActive) {
      return res.status(401).json({ success: false, error: 'account_inactive',
        message: 'حسابك موقوف — تواصل مع صاحب الصالون' });
    }

    // Load credentials
    const credResult = await db.execute(sql`
      SELECT password_hash, is_invitation_used, accepted_at
      FROM staff_credentials
      WHERE staff_id = ${member.id}
      LIMIT 1
    `);

    const credRow = credResult.rows[0] as any;
    if (!credRow || !credRow.password_hash) {
      return res.status(401).json({ success: false, error: 'invitation_pending',
        message: 'لم تقبل الدعوة بعد — تحقق من بريدك الإلكتروني' });
    }

    if (!credRow.is_invitation_used) {
      return res.status(401).json({ success: false, error: 'invitation_pending',
        message: 'يرجى قبول الدعوة أولاً عبر الرابط المُرسل لبريدك' });
    }

    const passwordOk = await bcrypt.compare(password, credRow.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ success: false, error: 'invalid_credentials' });
    }

    // Check subscription
    const [salon] = await db
      .select({ status: providers.status, subStatus: providers.subscriptionStatus, nameAr: providers.nameAr })
      .from(providers)
      .where(eq(providers.id, member.providerId))
      .limit(1);

    if (!salon || salon.status === 'suspended') {
      return res.status(402).json({ success: false, error: 'account_suspended',
        message: 'حساب الصالون موقوف — تواصل مع إدارة المنصة' });
    }
    if (salon.subStatus === 'expired' || salon.subStatus === 'cancelled') {
      return res.status(402).json({ success: false, error: 'subscription_expired',
        message: 'اشتراك الصالون منتهٍ — تواصل بصاحب الصالون للتجديد',
        salonName: salon.nameAr });
    }

    // Update last_login_at
    await db.execute(sql`
      UPDATE staff_credentials SET last_login_at = NOW(), updated_at = NOW()
      WHERE staff_id = ${member.id}
    `);

    const role = member.role ?? 'specialist';
    const session = buildUnifiedResponse(
      member.providerId, member.id, 'staff', role, member.permissions ?? '',
    );

    await logAudit({
      tenantId:  member.providerId,
      actorId:   member.id,
      actorType: 'staff',
      actorRole: role,
      action:    'staff_login',
      metadata:  { name: member.name },
      ipAddress: req.ip,
    });

    return res.json({
      success:    true,
      session,
      staffName:  member.name,
      salonName:  salon.nameAr,
    });
  } catch (err) {
    console.error('[POST /auth/staff/login]', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

// ── POST /api/staff/invite ─────────────────────────────────────────────────────
router.post('/staff/invite', tenantAuth, requirePermission('staff:manage'), async (req, res) => {
  try {
    const tenant = (req as any).tenant!;
    const { name, email, role = 'specialist', phone, customPermissions = '' } = req.body as {
      name: string; email: string; role?: string;
      phone?: string; customPermissions?: string;
    };

    if (!name || !email) {
      return res.status(400).json({ error: 'name_and_email_required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check email not already a staff member in this tenant
    const [existing] = await db
      .select({ id: staffTable.id })
      .from(staffTable)
      .where(and(eq(staffTable.providerId, tenant.tenantId), eq(staffTable.email, cleanEmail)))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: 'email_already_staff' });
    }

    // Get salon name for email
    const [salon] = await db
      .select({ nameAr: providers.nameAr })
      .from(providers)
      .where(eq(providers.id, tenant.tenantId))
      .limit(1);

    // Create staff record
    const newStaffResult = await db.execute(sql`
      INSERT INTO staff (provider_id, name, role, email, phone, permissions, invited_by_id, is_active)
      VALUES (${tenant.tenantId}, ${name}, ${role}, ${cleanEmail},
              ${phone ?? null}, ${customPermissions}, ${tenant.actorId}, true)
      RETURNING id
    `);
    const staffId = (newStaffResult.rows[0] as any).id as number;

    // Generate invitation token (128-bit hex)
    const invitationToken = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    await db.execute(sql`
      INSERT INTO staff_credentials
        (staff_id, tenant_id, invitation_token, invitation_token_expires_at, invited_at)
      VALUES
        (${staffId}, ${tenant.tenantId}, ${invitationToken}, ${expiresAt.toISOString()}, NOW())
    `);

    // Send invitation email
    const inviteUrl = `${process.env['APP_URL'] || 'https://confirmedgrowth.com'}/staff/accept?token=${invitationToken}`;
    await sendStaffInvitationEmail({
      to: cleanEmail,
      staffName: name,
      salonName: salon?.nameAr ?? 'الصالون',
      role,
      inviteUrl,
    });

    await logAudit({
      ...auditFromReq(req, 'staff_invited'),
      resourceType: 'staff',
      resourceId:   staffId,
      metadata:     { email: cleanEmail, role, name },
    });

    return res.status(201).json({
      success: true,
      staffId,
      message: `تم إرسال دعوة إلى ${cleanEmail}`,
    });
  } catch (err) {
    console.error('[POST /staff/invite]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── GET /api/auth/staff/invitation-info ──────────────────────────────────────
// Public — for the invitation acceptance page to display salon/role info
router.get('/auth/staff/invitation-info', async (req, res) => {
  try {
    const token = String(req.query['token'] ?? '');
    if (!token) return res.status(400).json({ error: 'token_required' });

    const invInfoResult = await db.execute(sql`
      SELECT sc.staff_id, sc.tenant_id, sc.is_invitation_used,
             sc.invitation_token_expires_at,
             s.name AS staff_name, s.role AS staff_role, s.email AS staff_email,
             p.name_ar AS salon_name
      FROM staff_credentials sc
      JOIN staff s ON s.id = sc.staff_id
      JOIN providers p ON p.id = sc.tenant_id
      WHERE sc.invitation_token = ${token}
      LIMIT 1
    `);

    const row = invInfoResult.rows[0] as any;
    if (!row) return res.status(404).json({ error: 'invalid_token' });
    if (row.is_invitation_used) return res.status(410).json({ error: 'invitation_already_used' });
    if (new Date(row.invitation_token_expires_at) < new Date()) {
      return res.status(410).json({ error: 'invitation_expired' });
    }

    return res.json({
      staffName: row.staff_name,
      staffRole: row.staff_role,
      staffEmail: row.staff_email,
      salonName:  row.salon_name,
    });
  } catch (err) {
    console.error('[GET /auth/staff/invitation-info]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── POST /api/auth/staff/accept-invitation ───────────────────────────────────
router.post('/auth/staff/accept-invitation', async (req, res) => {
  try {
    const { token, password } = req.body as { token: string; password: string };

    if (!token || !password) {
      return res.status(400).json({ error: 'token_and_password_required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password_too_short',
        message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    }

    const acceptResult = await db.execute(sql`
      SELECT sc.id, sc.staff_id, sc.tenant_id, sc.is_invitation_used,
             sc.invitation_token_expires_at,
             s.name AS staff_name, s.role AS staff_role, s.permissions AS staff_perms,
             p.name_ar AS salon_name, p.status AS salon_status,
             p.subscription_status AS sub_status
      FROM staff_credentials sc
      JOIN staff s ON s.id = sc.staff_id
      JOIN providers p ON p.id = sc.tenant_id
      WHERE sc.invitation_token = ${token}
      LIMIT 1
    `);

    const row = acceptResult.rows[0] as any;
    if (!row) return res.status(404).json({ error: 'invalid_token' });
    if (row.is_invitation_used) return res.status(410).json({ error: 'invitation_already_used' });
    if (new Date(row.invitation_token_expires_at) < new Date()) {
      return res.status(410).json({ error: 'invitation_expired' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.execute(sql`
      UPDATE staff_credentials
      SET password_hash = ${passwordHash},
          is_invitation_used = true,
          accepted_at = NOW(),
          invitation_token = NULL,
          updated_at = NOW()
      WHERE id = ${row.id}
    `);

    // Issue unified token — staff is now logged in
    const role = row.staff_role ?? 'specialist';
    const session = buildUnifiedResponse(
      row.tenant_id, row.staff_id, 'staff', role, row.staff_perms ?? '',
    );

    await logAudit({
      tenantId:  row.tenant_id,
      actorId:   row.staff_id,
      actorType: 'staff',
      actorRole: role,
      action:    'invitation_accepted',
      metadata:  { salonName: row.salon_name },
      ipAddress: req.ip,
    });

    return res.json({
      success:   true,
      session,
      staffName: row.staff_name,
      salonName: row.salon_name,
    });
  } catch (err) {
    console.error('[POST /auth/staff/accept-invitation]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
