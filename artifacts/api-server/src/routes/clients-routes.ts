/**
 * /api/clients — CRUD for salon clients (CRM).
 * All endpoints scoped to a provider via tenantAuth middleware.
 */
import { Router } from 'express';
import { db, clients } from '../lib/db';
import { eq, and } from 'drizzle-orm';
import { tenantAuth, requirePermission } from '../middlewares/tenantAuth';
import { requireApprovalFor } from '../lib/approvalEngine';

const router = Router();

// All client routes require tenant auth + subscription check
router.use('/clients', tenantAuth);

function resolveProviderId(req: any): number | null {
  return (req as any).tenant?.tenantId ?? (req as any).providerId ?? null;
}

function toFrontend(c: any) {
  return {
    id: String(c.id),
    name: c.name,
    phone: c.phone ?? '',
    visits: c.visits ?? 0,
    notes: c.notes ?? '',
    loyaltyPoints: c.loyaltyPoints ?? 0,
    totalSpend: c.totalSpend ?? 0,
    manualClassification: c.manualClassification ?? undefined,
    manualRating: c.manualRating ?? undefined,
  };
}

// ── GET /api/clients ──────────────────────────────────────────────────────────
router.get('/clients', requirePermission('clients:read'), async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(400).json({ error: 'provider id required' });

  try {
    const rows = await db
      .select()
      .from(clients)
      .where(eq(clients.providerId, providerId))
      .orderBy(clients.name);

    return res.json({ clients: rows.map(toFrontend) });
  } catch (err) {
    console.error('[GET /clients]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── POST /api/clients ─────────────────────────────────────────────────────────
router.post('/clients', requirePermission('clients:write'), async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(400).json({ error: 'provider id required' });

  try {
    const { name, phone, notes, manualClassification, manualRating } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const rating = manualRating !== undefined ? Number(manualRating) : null;
    if (rating !== null && (isNaN(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'manualRating must be between 1 and 5' });
    }

    const cleanPhone = phone ? String(phone).trim().replace(/\s+/g, '') : null;
    if (cleanPhone && !/^[+\d]{7,15}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'invalid phone number format' });
    }

    try {
      const [created] = await db
        .insert(clients)
        .values({
          providerId,
          name: name.trim(),
          phone: cleanPhone || null,
          notes: notes ? String(notes).trim() : null,
          manualClassification: manualClassification ? String(manualClassification) : null,
          manualRating: rating,
        })
        .returning();

      return res.status(201).json({ client: toFrontend(created) });
    } catch (err: any) {
      const pgCode = err?.code ?? err?.cause?.code;
      if (pgCode === '23505') {
        return res.status(409).json({ error: 'client_phone_duplicate', message: 'رقم الجوال مسجّل مسبقاً لدى هذا الصالون' });
      }
      throw err;
    }
  } catch (err) {
    console.error('[POST /clients]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── PUT /api/clients/:id ──────────────────────────────────────────────────────
router.put('/clients/:id', requirePermission('clients:write'), async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(400).json({ error: 'provider id required' });

  try {
    const id = parseInt(String(req.params["id"] ?? ""), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });

    const allowed = ['name', 'phone', 'notes', 'visits', 'loyaltyPoints', 'totalSpend', 'manualClassification', 'manualRating'] as const;
    const updates: Record<string, unknown> = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'manualRating') {
          const r = Number(req.body[key]);
          if (isNaN(r) || r < 1 || r > 5) {
            return res.status(400).json({ error: 'manualRating must be between 1 and 5' });
          }
          updates[key] = r;
        } else if (key === 'visits' || key === 'loyaltyPoints' || key === 'totalSpend') {
          const n = Math.max(0, Number(req.body[key]));
          updates[key] = isNaN(n) ? 0 : n;
        } else if (key === 'phone') {
          const p = String(req.body[key]).trim().replace(/\s+/g, '');
          if (p && !/^[+\d]{7,15}$/.test(p)) {
            return res.status(400).json({ error: 'invalid phone number format' });
          }
          updates[key] = p || null;
        } else {
          updates[key] = req.body[key];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'no fields to update' });
    }

    try {
      const [updated] = await db
        .update(clients)
        .set(updates as any)
        .where(and(eq(clients.id, id), eq(clients.providerId, providerId)))
        .returning();

      if (!updated) return res.status(404).json({ error: 'not_found' });
      return res.json({ client: toFrontend(updated) });
    } catch (err: any) {
      const pgCode = err?.code ?? err?.cause?.code;
      if (pgCode === '23505') {
        return res.status(409).json({ error: 'client_phone_duplicate', message: 'رقم الجوال مسجّل مسبقاً لدى هذا الصالون' });
      }
      throw err;
    }
  } catch (err) {
    console.error('[PUT /clients/:id]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── DELETE /api/clients/:id ───────────────────────────────────────────────────
// Cashier/specialist → approval request (202); owner/manager → direct delete.
// requireApprovalFor handles role-based routing without a separate permission guard,
// matching the same pattern used for booking_delete in bookings.ts.
router.delete(
  '/clients/:id',
  requireApprovalFor('client_delete', { resourceType: 'client' }),
  async (req, res) => {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(400).json({ error: 'provider id required' });

    try {
      const id = parseInt(String(req.params["id"] ?? ""), 10);
      if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });

      await db
        .delete(clients)
        .where(and(eq(clients.id, id), eq(clients.providerId, providerId)));

      return res.json({ success: true });
    } catch (err) {
      console.error('[DELETE /clients/:id]', err);
      return res.status(500).json({ error: 'server_error' });
    }
  },
);

export default router;
