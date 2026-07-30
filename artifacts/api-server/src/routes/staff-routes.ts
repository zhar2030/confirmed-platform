/**
 * /api/staff — CRUD for salon staff.
 * All endpoints scoped to a provider via X-Provider-Id header.
 */
import { Router } from 'express';
import { db, staff, bookings } from '../lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { tenantAuth, requirePermission } from '../middlewares/tenantAuth';
import { logAudit, auditFromReq } from '../lib/auditLog';

const router = Router();

// All staff routes require tenant auth + subscription check
router.use('/staff', tenantAuth);

function resolveProviderId(req: any): number | null {
  return (req as any).tenant?.tenantId ?? (req as any).providerId ?? null;
}

function toFrontend(s: any, bookingsToday = 0) {
  return {
    id: String(s.id),
    name: s.name,
    role: s.role ?? '',
    email: s.email ?? '',
    phone: s.phone ?? '',
    isActive: s.isActive ?? true,
    username: s.username ?? '',
    permissions: s.permissions ?? '',
    // ⛔ secureLinkToken intentionally excluded — must not reach the client
    bookingsToday,
  };
}

// ── GET /api/staff ────────────────────────────────────────────────────────────
router.get('/staff', async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(400).json({ error: 'x-provider-id header required' });

  try {
    const today = new Date().toISOString().split('T')[0];

    // Fetch staff + count today's bookings for each
    const [staffRows, todayBookings] = await Promise.all([
      db.select().from(staff)
        .where(eq(staff.providerId, providerId))
        .orderBy(staff.name),
      db.select({
        staffId: bookings.staffId,
        count: sql<number>`count(*)::int`,
      })
        .from(bookings)
        .where(and(
          eq(bookings.providerId, providerId),
          eq(bookings.date, today),
          sql`status != 'cancelled'`,
        ))
        .groupBy(bookings.staffId),
    ]);

    const countMap: Record<number, number> = {};
    for (const row of todayBookings) {
      if (row.staffId != null) countMap[row.staffId] = row.count;
    }

    return res.json({ staff: staffRows.map(s => toFrontend(s, countMap[s.id] ?? 0)) });
  } catch (err) {
    console.error('[GET /staff]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── POST /api/staff ───────────────────────────────────────────────────────────
router.post('/staff', requirePermission('staff:manage'), async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(400).json({ error: 'x-provider-id header required' });

  try {
    const { name, role, email, phone, username, secureLinkToken, permissions = '' } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const [created] = await db
      .insert(staff)
      .values({
        providerId,
        name:            String(name),
        role:            role ? String(role) : null,
        email:           email ? String(email) : null,
        phone:           phone ? String(phone) : null,
        username:        username ? String(username) : null,
        secureLinkToken: secureLinkToken ? String(secureLinkToken) : null,
        permissions:     String(permissions),
        invitedById:     (req as any).tenant?.actorType === 'owner' ? (req as any).tenant.actorId : null,
        isActive:        true,
      })
      .returning();

    logAudit({
      ...auditFromReq(req, 'staff_created'),
      resourceType: 'staff',
      resourceId:   created.id,
      metadata:     { name, role },
    }).catch(() => {});

    return res.status(201).json({ staff: toFrontend(created, 0) });
  } catch (err) {
    console.error('[POST /staff]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── PUT /api/staff/:id ────────────────────────────────────────────────────────
router.put('/staff/:id', requirePermission('staff:manage'), async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(400).json({ error: 'x-provider-id header required' });

  try {
    const id = parseInt(String(req.params["id"] ?? ""), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });

    const allowed = ['name', 'role', 'email', 'phone', 'isActive', 'username', 'secureLinkToken', 'permissions'] as const;
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'no fields to update' });
    }

    const [updated] = await db
      .update(staff)
      .set(updates as any)
      .where(and(eq(staff.id, id), eq(staff.providerId, providerId)))
      .returning();

    if (!updated) return res.status(404).json({ error: 'not_found' });

    logAudit({
      ...auditFromReq(req, 'staff_updated'),
      resourceType: 'staff',
      resourceId:   id,
      metadata:     updates,
    }).catch(() => {});

    return res.json({ staff: toFrontend(updated) });
  } catch (err) {
    console.error('[PUT /staff/:id]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── DELETE /api/staff/:id ─────────────────────────────────────────────────────
router.delete('/staff/:id', requirePermission('staff:manage'), async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(400).json({ error: 'x-provider-id header required' });

  try {
    const id = parseInt(String(req.params["id"] ?? ""), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });

    // Soft-delete: set isActive = false
    const [updated] = await db
      .update(staff)
      .set({ isActive: false })
      .where(and(eq(staff.id, id), eq(staff.providerId, providerId)))
      .returning();

    if (!updated) return res.status(404).json({ error: 'not_found' });

    logAudit({
      ...auditFromReq(req, 'staff_deactivated'),
      resourceType: 'staff',
      resourceId:   id,
    }).catch(() => {});

    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /staff/:id]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
