/**
 * /api/services — CRUD for provider services (menu).
 * All endpoints scoped to the authenticated provider.
 */
import { Router } from 'express';
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import { tenantAuth } from '../middlewares/tenantAuth';

/** Run a callback inside a transaction with the tenant context set (needed for RLS). */
async function withTenantCtx<T>(
  providerId: number,
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${String(providerId)}, true)`);
    return fn(tx as unknown as typeof db);
  });
}

const router = Router();
router.use('/services', tenantAuth);

function resolveProviderId(req: any): number | null {
  return (req as any).tenant?.tenantId ?? (req as any).providerId ?? null;
}

// GET /api/services — list all services for the provider
router.get('/services', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const result = await db.execute(sql`
      SELECT id, name_ar, name_en, price, duration, category_ar, category_en, is_active, sort_order
      FROM provider_services
      WHERE provider_id = ${providerId}
      ORDER BY sort_order ASC, id ASC
    `);

    const services = result.rows.map((s: any) => ({
      id: String(s.id),
      nameAr: s.name_ar,
      nameEn: s.name_en,
      name: s.name_ar,
      price: Number(s.price),
      duration: Number(s.duration),
      categoryAr: s.category_ar ?? '',
      categoryEn: s.category_en ?? '',
      category: s.category_ar ?? '',
      isActive: s.is_active,
      sortOrder: s.sort_order,
    }));

    res.set('Cache-Control', 'no-store');
    res.json({ services });
  } catch (err) {
    res.status(500).json({ error: 'failed_to_fetch_services' });
  }
});

// POST /api/services — add a new service
router.post('/services', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const { nameAr, nameEn, price, duration, categoryAr, categoryEn, sortOrder } = req.body;
    if (!nameAr || price == null || duration == null) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }

    const result = await withTenantCtx(providerId, (tx) => tx.execute(sql`
      INSERT INTO provider_services (provider_id, name_ar, name_en, price, duration, category_ar, category_en, sort_order)
      VALUES (${providerId}, ${nameAr}, ${nameEn ?? nameAr}, ${Number(price)}, ${Number(duration)},
              ${categoryAr ?? ''}, ${categoryEn ?? ''}, ${sortOrder ?? 0})
      RETURNING id
    `));

    res.json({ success: true, id: String((result.rows[0] as any).id) });
  } catch (err) {
    res.status(500).json({ error: 'failed_to_create_service' });
  }
});

// PATCH /api/services/:id — update a service
router.patch('/services/:id', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const id = parseInt(req.params.id);
    const { nameAr, nameEn, price, duration, categoryAr, categoryEn, isActive, sortOrder } = req.body;

    await withTenantCtx(providerId, (tx) => tx.execute(sql`
      UPDATE provider_services
      SET
        name_ar     = COALESCE(${nameAr ?? null}, name_ar),
        name_en     = COALESCE(${nameEn ?? null}, name_en),
        price       = COALESCE(${price != null ? Number(price) : null}, price),
        duration    = COALESCE(${duration != null ? Number(duration) : null}, duration),
        category_ar = COALESCE(${categoryAr ?? null}, category_ar),
        category_en = COALESCE(${categoryEn ?? null}, category_en),
        is_active   = COALESCE(${isActive ?? null}, is_active),
        sort_order  = COALESCE(${sortOrder != null ? Number(sortOrder) : null}, sort_order)
      WHERE id = ${id} AND provider_id = ${providerId}
    `));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'failed_to_update_service' });
  }
});

// DELETE /api/services/:id — remove a service
router.delete('/services/:id', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const id = parseInt(req.params.id);
    await withTenantCtx(providerId, (tx) => tx.execute(sql`
      DELETE FROM provider_services WHERE id = ${id} AND provider_id = ${providerId}
    `));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'failed_to_delete_service' });
  }
});

export default router;
