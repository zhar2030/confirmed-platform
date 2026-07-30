/**
 * /api/invoices — Full CRUD for POS invoices.
 * All endpoints scoped to the authenticated provider via tenantAuth.
 * SECURITY: all queries use parameterized sql`` — zero string interpolation in SQL.
 */
import { Router } from 'express';
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import { tenantAuth } from '../middlewares/tenantAuth';

const router = Router();
router.use('/invoices', tenantAuth);

function resolveProviderId(req: any): number | null {
  return (req as any).tenant?.tenantId ?? (req as any).providerId ?? null;
}

function toInvoice(r: any) {
  return {
    id: String(r.id),
    clientName: r.client_name,
    items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items ?? []),
    subtotal: Number(r.subtotal),
    tax: Number(r.tax),
    total: Number(r.total),
    paymentMethod: r.payment_method,
    date: typeof r.date === 'string' ? r.date : (r.date?.toISOString?.().split('T')[0] ?? ''),
    time: r.time ?? '',
    branchId: r.branch_id ?? '',
  };
}

// ── GET /api/invoices ─────────────────────────────────────────────────────────
// Tenant-scoped: only returns invoices WHERE provider_id = currentTenant
router.get('/invoices', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const { date } = req.query;
    const limitVal = Math.min(500, parseInt(String(req.query.limit ?? '200')) || 200);

    let result;
    if (date && typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      result = await db.execute(sql`
        SELECT id, client_name, items, subtotal, tax, total,
               payment_method, date::text, time, branch_id, created_at
        FROM invoices
        WHERE provider_id = ${providerId}
          AND date = ${date}::date
        ORDER BY created_at DESC
        LIMIT ${limitVal}
      `);
    } else {
      result = await db.execute(sql`
        SELECT id, client_name, items, subtotal, tax, total,
               payment_method, date::text, time, branch_id, created_at
        FROM invoices
        WHERE provider_id = ${providerId}
        ORDER BY created_at DESC
        LIMIT ${limitVal}
      `);
    }

    res.json({ invoices: result.rows.map(toInvoice) });
  } catch (err) {
    console.error('[GET /api/invoices]', err);
    res.status(500).json({ error: 'failed_to_fetch_invoices' });
  }
});

// ── POST /api/invoices ────────────────────────────────────────────────────────
// Tenant-scoped: INSERT always includes provider_id from authenticated token
router.post('/invoices', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const { clientName, items, subtotal, tax, total, paymentMethod, date, time, branchId } = req.body;

    if (!clientName || !date || total == null) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ error: 'invalid_date_format' });
    }

    const result = await db.execute(sql`
      INSERT INTO invoices
        (provider_id, client_name, items, subtotal, tax, total, payment_method, date, time, branch_id)
      VALUES
        (${providerId}, ${String(clientName)}, ${JSON.stringify(items ?? [])}::jsonb,
         ${Number(subtotal ?? 0)}, ${Number(tax ?? 0)}, ${Number(total)},
         ${String(paymentMethod ?? 'cash')}, ${String(date)}::date,
         ${String(time ?? '')}, ${String(branchId ?? '')})
      RETURNING id
    `);

    const id = String((result.rows[0] as any).id);
    res.status(201).json({
      success: true,
      invoice: { id, clientName, items, subtotal, tax, total, paymentMethod, date, time, branchId },
    });
  } catch (err) {
    console.error('[POST /api/invoices]', err);
    res.status(500).json({ error: 'failed_to_create_invoice' });
  }
});

// ── GET /api/invoices/stats ───────────────────────────────────────────────────
// Tenant-scoped: aggregates only WHERE provider_id = currentTenant
router.get('/invoices/stats', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const result = await db.execute(sql`
      SELECT date::text, SUM(total) AS revenue, COUNT(*) AS count
      FROM invoices
      WHERE provider_id = ${providerId}
        AND date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY date
      ORDER BY date ASC
    `);

    res.json({
      stats: result.rows.map((r: any) => ({
        date: r.date,
        revenue: Number(r.revenue),
        count: Number(r.count),
      })),
    });
  } catch (err) {
    console.error('[GET /api/invoices/stats]', err);
    res.status(500).json({ error: 'failed_to_fetch_stats' });
  }
});

export default router;
