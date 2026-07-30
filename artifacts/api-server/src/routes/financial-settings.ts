/**
 * Financial settings & revenue summary routes.
 * All endpoints tenant-scoped via tenantAuth.
 *
 * GET  /api/settings/financial           — read salon's financial mode
 * PUT  /api/settings/financial           — update financial mode
 * GET  /api/invoices/revenue-summary     — daily/weekly/monthly/annual totals
 * POST /api/invoices/import-csv          — bulk-import parsed invoice rows
 */
import { Router } from 'express';
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import { tenantAuth } from '../middlewares/tenantAuth';

const router = Router();

// Apply tenant auth to all routes in this file
router.use(tenantAuth);

function resolveProviderId(req: any): number | null {
  return (req as any).tenant?.tenantId ?? (req as any).providerId ?? null;
}

// ── GET /api/settings/financial ───────────────────────────────────────────────
router.get('/settings/financial', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const result = await db.execute(sql`
      SELECT financial_mode, invoice_source_config
      FROM providers
      WHERE id = ${providerId}
      LIMIT 1
    `);

    const row = result.rows[0] as any;
    return res.json({
      financialMode: row?.financial_mode ?? 'manual',
      invoiceSourceConfig: row?.invoice_source_config ?? {},
    });
  } catch (err) {
    console.error('[GET /settings/financial]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── PUT /api/settings/financial ───────────────────────────────────────────────
router.put('/settings/financial', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const { financialMode, invoiceSourceConfig } = req.body as {
      financialMode?: string;
      invoiceSourceConfig?: Record<string, unknown>;
    };

    const validModes = ['manual', 'accounting', 'gateway'];
    if (financialMode && !validModes.includes(financialMode)) {
      return res.status(400).json({ error: 'invalid_financial_mode' });
    }

    await db.execute(sql`
      UPDATE providers
      SET
        financial_mode = ${financialMode ?? 'manual'},
        invoice_source_config = ${JSON.stringify(invoiceSourceConfig ?? {})}::jsonb,
        updated_at = NOW()
      WHERE id = ${providerId}
    `);

    return res.json({ success: true, financialMode: financialMode ?? 'manual' });
  } catch (err) {
    console.error('[PUT /settings/financial]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── GET /api/invoices/revenue-summary ─────────────────────────────────────────
// Returns daily / weekly / monthly / annual totals from invoices table.
// Works regardless of invoice source (manual POS, imported CSV, or future gateway).
router.get('/invoices/revenue-summary', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const result = await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN date = CURRENT_DATE THEN total END), 0)                                          AS today,
        COALESCE(SUM(CASE WHEN date >= date_trunc('week',  CURRENT_DATE)::date THEN total END), 0)              AS this_week,
        COALESCE(SUM(CASE WHEN date >= date_trunc('month', CURRENT_DATE)::date THEN total END), 0)              AS this_month,
        COALESCE(SUM(CASE WHEN date >= date_trunc('year',  CURRENT_DATE)::date THEN total END), 0)              AS this_year,
        COUNT(CASE WHEN date = CURRENT_DATE THEN 1 END)                                                          AS today_count,
        COUNT(CASE WHEN date >= date_trunc('week',  CURRENT_DATE)::date THEN 1 END)                             AS week_count,
        COUNT(CASE WHEN date >= date_trunc('month', CURRENT_DATE)::date THEN 1 END)                             AS month_count,
        COUNT(CASE WHEN date >= date_trunc('year',  CURRENT_DATE)::date THEN 1 END)                             AS year_count
      FROM invoices
      WHERE provider_id = ${providerId}
    `);

    const r = result.rows[0] as any;
    return res.json({
      today:      { total: Number(r.today),      count: Number(r.today_count) },
      thisWeek:   { total: Number(r.this_week),   count: Number(r.week_count) },
      thisMonth:  { total: Number(r.this_month),  count: Number(r.month_count) },
      thisYear:   { total: Number(r.this_year),   count: Number(r.year_count) },
    });
  } catch (err) {
    console.error('[GET /invoices/revenue-summary]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── POST /api/invoices/import-csv ─────────────────────────────────────────────
// Accepts an array of parsed invoice rows (from frontend CSV/Excel parser).
// Inserts each row into the invoices table with source='import'.
router.post('/invoices/import-csv', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const { rows } = req.body as {
      rows?: Array<{
        clientName?: string;
        date?: string;
        subtotal?: number;
        tax?: number;
        total?: number;
        paymentMethod?: string;
        invoiceNumber?: string;
      }>;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows_required' });
    }

    if (rows.length > 1000) {
      return res.status(400).json({ error: 'max_1000_rows_per_import' });
    }

    let imported = 0;
    let skipped  = 0;

    for (const row of rows) {
      const clientName = String(row.clientName ?? 'مستورد').slice(0, 255);
      const dateStr    = String(row.date ?? '').trim();
      const total      = Number(row.total ?? 0);

      // Skip rows with invalid date or zero total
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || total <= 0) {
        skipped++;
        continue;
      }

      const subtotal      = Number(row.subtotal ?? total);
      const tax           = Number(row.tax ?? 0);
      const paymentMethod = String(row.paymentMethod ?? 'cash').slice(0, 20);
      const invoiceRef    = String(row.invoiceNumber ?? '').slice(0, 50);

      await db.execute(sql`
        INSERT INTO invoices
          (provider_id, client_name, items, subtotal, tax, total, payment_method, date, time, branch_id, source)
        VALUES
          (${providerId},
           ${clientName},
           ${JSON.stringify([{ name: invoiceRef || 'مستورد من نظام محاسبي', price: total, type: 'service' }])}::jsonb,
           ${subtotal}, ${tax}, ${total},
           ${paymentMethod},
           ${dateStr}::date,
           '', '', 'import')
      `);
      imported++;
    }

    return res.json({ success: true, imported, skipped });
  } catch (err) {
    console.error('[POST /invoices/import-csv]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
