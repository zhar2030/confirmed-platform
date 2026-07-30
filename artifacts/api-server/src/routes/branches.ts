/**
 * Branch management routes — tenant-scoped CRUD.
 *
 * GET    /api/branches          — list all branches for this salon
 * POST   /api/branches          — create a new branch
 * PUT    /api/branches/:id      — update a branch
 * DELETE /api/branches/:id      — soft-delete (set is_active = false)
 */
import { Router } from 'express';
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import { tenantAuth } from '../middlewares/tenantAuth';

const router = Router();
router.use(tenantAuth);

function pid(req: any): number | null {
  return req.tenant?.tenantId ?? req.providerId ?? null;
}

// ── GET /api/branches ─────────────────────────────────────────────────────────
router.get('/branches', async (req, res) => {
  try {
    const providerId = pid(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const result = await db.execute(sql`
      SELECT id, name_ar, name_en, address_ar, address_en,
             city_ar, city_en, phone, is_active, created_at
      FROM branches
      WHERE provider_id = ${providerId}
      ORDER BY created_at ASC
    `);

    return res.json({ branches: result.rows });
  } catch (err) {
    console.error('[GET /branches]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── POST /api/branches ────────────────────────────────────────────────────────
router.post('/branches', async (req, res) => {
  try {
    const providerId = pid(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const { nameAr, nameEn, addressAr, addressEn, cityAr, cityEn, phone } = req.body as {
      nameAr?: string; nameEn?: string; addressAr?: string; addressEn?: string;
      cityAr?: string; cityEn?: string; phone?: string;
    };

    if (!nameAr?.trim()) return res.status(400).json({ error: 'name_ar_required' });

    const result = await db.execute(sql`
      INSERT INTO branches (provider_id, name_ar, name_en, address_ar, address_en, city_ar, city_en, phone)
      VALUES (
        ${providerId},
        ${nameAr.trim()},
        ${(nameEn ?? '').trim()},
        ${(addressAr ?? '').trim()},
        ${(addressEn ?? '').trim()},
        ${(cityAr ?? '').trim()},
        ${(cityEn ?? '').trim()},
        ${(phone ?? '').trim()}
      )
      RETURNING id, name_ar, name_en, address_ar, address_en, city_ar, city_en, phone, is_active, created_at
    `);

    return res.status(201).json({ branch: result.rows[0] });
  } catch (err) {
    console.error('[POST /branches]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── PUT /api/branches/:id ─────────────────────────────────────────────────────
router.put('/branches/:id', async (req, res) => {
  try {
    const providerId = pid(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const branchId = Number(req.params.id);
    if (!branchId) return res.status(400).json({ error: 'invalid_id' });

    const { nameAr, nameEn, addressAr, addressEn, cityAr, cityEn, phone, isActive } = req.body as {
      nameAr?: string; nameEn?: string; addressAr?: string; addressEn?: string;
      cityAr?: string; cityEn?: string; phone?: string; isActive?: boolean;
    };

    if (!nameAr?.trim()) return res.status(400).json({ error: 'name_ar_required' });

    const result = await db.execute(sql`
      UPDATE branches
      SET name_ar    = ${nameAr.trim()},
          name_en    = ${(nameEn ?? '').trim()},
          address_ar = ${(addressAr ?? '').trim()},
          address_en = ${(addressEn ?? '').trim()},
          city_ar    = ${(cityAr ?? '').trim()},
          city_en    = ${(cityEn ?? '').trim()},
          phone      = ${(phone ?? '').trim()},
          is_active  = ${isActive ?? true}
      WHERE id = ${branchId} AND provider_id = ${providerId}
      RETURNING id, name_ar, name_en, address_ar, address_en, city_ar, city_en, phone, is_active
    `);

    if (result.rows.length === 0) return res.status(404).json({ error: 'branch_not_found' });
    return res.json({ branch: result.rows[0] });
  } catch (err) {
    console.error('[PUT /branches/:id]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── DELETE /api/branches/:id ──────────────────────────────────────────────────
router.delete('/branches/:id', async (req, res) => {
  try {
    const providerId = pid(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const branchId = Number(req.params.id);
    const result = await db.execute(sql`
      DELETE FROM branches
      WHERE id = ${branchId} AND provider_id = ${providerId}
      RETURNING id
    `);

    if (result.rows.length === 0) return res.status(404).json({ error: 'branch_not_found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /branches/:id]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
