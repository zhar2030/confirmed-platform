/**
 * /api/services — CRUD for provider services (menu).
 *
 * IMPORTANT: provider_services has Row-Level Security (RLS) ENABLED + FORCED.
 * Policy: provider_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer
 *
 * Every query MUST call set_config('app.current_tenant_id', ...) first,
 * otherwise Postgres returns 0 rows silently (no error, just empty result).
 * withTenantCtx() handles this by wrapping every operation in a transaction
 * that sets the config before the query.
 */
import { Router } from 'express';
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import { tenantAuth } from '../middlewares/tenantAuth';
import { logger } from '../lib/logger';

/** Sets app.current_tenant_id inside a transaction — required for RLS to pass. */
async function withTenantCtx<T>(
  providerId: number,
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_tenant_id', ${String(providerId)}, true)`,
    );
    return fn(tx as unknown as typeof db);
  });
}

const router = Router();
router.use('/services', tenantAuth);

function resolveProviderId(req: any): number | null {
  const id = (req as any).tenant?.tenantId ?? (req as any).providerId ?? null;
  return id ? Number(id) : null;
}

// ── GET /api/services ─────────────────────────────────────────────────────────
router.get('/services', async (req, res) => {
  const providerId = resolveProviderId(req);
  logger.info({ providerId }, '[services] GET list');

  if (!providerId) {
    logger.warn('[services] GET — no providerId after auth');
    return res.status(401).json({ error: 'unauthorized', detail: 'no provider id resolved' });
  }

  try {
    const services = await withTenantCtx(providerId, async (tx) => {
      const result = await tx.execute(sql`
        SELECT id, name_ar, name_en, price, duration,
               category_ar, category_en, is_active, sort_order
        FROM   provider_services
        WHERE  provider_id = ${providerId}
        ORDER  BY sort_order ASC, id ASC
      `);
      return (result.rows as any[]).map(s => ({
        id:         String(s.id),
        nameAr:     s.name_ar   ?? '',
        nameEn:     s.name_en   ?? '',
        name:       s.name_ar   ?? '',
        price:      Number(s.price),
        duration:   Number(s.duration),
        categoryAr: s.category_ar ?? '',
        categoryEn: s.category_en ?? '',
        category:   s.category_ar ?? '',
        isActive:   s.is_active,
        sortOrder:  s.sort_order,
      }));
    });

    logger.info({ providerId, count: services.length }, '[services] GET list OK');
    res.set('Cache-Control', 'no-store');
    return res.json({ services });
  } catch (err: any) {
    logger.error({ err, providerId }, '[services] GET list DB error');
    return res.status(500).json({
      error:  'failed_to_fetch_services',
      detail: String(err?.message ?? err),
    });
  }
});

// ── POST /api/services ────────────────────────────────────────────────────────
router.post('/services', async (req, res) => {
  const providerId = resolveProviderId(req);
  logger.info({ providerId, body: req.body }, '[services] POST create');

  if (!providerId) {
    return res.status(401).json({ error: 'unauthorized', detail: 'no provider id resolved' });
  }

  const { nameAr, nameEn, price, duration, categoryAr, categoryEn, sortOrder } = req.body;
  if (!nameAr || price == null || duration == null) {
    return res.status(400).json({ error: 'missing_required_fields', required: ['nameAr', 'price', 'duration'] });
  }

  try {
    const newId = await withTenantCtx(providerId, async (tx) => {
      const result = await tx.execute(sql`
        INSERT INTO provider_services
          (provider_id, name_ar, name_en, price, duration, category_ar, category_en, sort_order)
        VALUES
          (${providerId}, ${nameAr}, ${nameEn ?? nameAr}, ${Number(price)}, ${Number(duration)},
           ${categoryAr ?? ''}, ${categoryEn ?? ''}, ${sortOrder ?? 0})
        RETURNING id
      `);
      return String((result.rows[0] as any).id);
    });

    logger.info({ providerId, newId }, '[services] POST create OK');
    return res.json({ success: true, id: newId });
  } catch (err: any) {
    logger.error({ err, providerId }, '[services] POST create DB error');
    return res.status(500).json({
      error:  'failed_to_create_service',
      detail: String(err?.message ?? err),
    });
  }
});

// ── PATCH /api/services/:id ───────────────────────────────────────────────────
router.patch('/services/:id', async (req, res) => {
  const providerId = resolveProviderId(req);
  const id = parseInt(req.params.id, 10);

  if (!providerId) return res.status(401).json({ error: 'unauthorized' });
  if (isNaN(id))   return res.status(400).json({ error: 'invalid_id' });

  const { nameAr, nameEn, price, duration, categoryAr, categoryEn, isActive, sortOrder } = req.body;

  try {
    await withTenantCtx(providerId, async (tx) => {
      await tx.execute(sql`
        UPDATE provider_services
        SET
          name_ar     = COALESCE(${nameAr     ?? null}, name_ar),
          name_en     = COALESCE(${nameEn     ?? null}, name_en),
          price       = COALESCE(${price      != null ? Number(price)    : null}, price),
          duration    = COALESCE(${duration   != null ? Number(duration) : null}, duration),
          category_ar = COALESCE(${categoryAr ?? null}, category_ar),
          category_en = COALESCE(${categoryEn ?? null}, category_en),
          is_active   = COALESCE(${isActive   ?? null}, is_active),
          sort_order  = COALESCE(${sortOrder  != null ? Number(sortOrder) : null}, sort_order)
        WHERE id = ${id} AND provider_id = ${providerId}
      `);
    });

    logger.info({ providerId, id }, '[services] PATCH OK');
    return res.json({ success: true });
  } catch (err: any) {
    logger.error({ err, providerId, id }, '[services] PATCH DB error');
    return res.status(500).json({ error: 'failed_to_update_service', detail: String(err?.message ?? err) });
  }
});

// ── DELETE /api/services/:id ──────────────────────────────────────────────────
router.delete('/services/:id', async (req, res) => {
  const providerId = resolveProviderId(req);
  const id = parseInt(req.params.id, 10);

  if (!providerId) return res.status(401).json({ error: 'unauthorized' });
  if (isNaN(id))   return res.status(400).json({ error: 'invalid_id' });

  try {
    await withTenantCtx(providerId, async (tx) => {
      await tx.execute(sql`
        DELETE FROM provider_services WHERE id = ${id} AND provider_id = ${providerId}
      `);
    });

    logger.info({ providerId, id }, '[services] DELETE OK');
    return res.json({ success: true });
  } catch (err: any) {
    logger.error({ err, providerId, id }, '[services] DELETE DB error');
    return res.status(500).json({ error: 'failed_to_delete_service', detail: String(err?.message ?? err) });
  }
});

export default router;
