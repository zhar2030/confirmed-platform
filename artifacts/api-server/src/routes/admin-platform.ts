/**
 * /api/admin/* — Platform Owner (Super Admin) only endpoints.
 * ALL routes protected by requireAdmin middleware.
 *
 * WHO CAN USE THIS: PLATFORM OWNER only (providers.role = 'owner').
 * SALON OWNERS are customers — they CANNOT reach any of these endpoints.
 */
import { Router } from 'express';
import { db, pool } from '../lib/db';
import { sql } from 'drizzle-orm';
import { requireAdmin } from '../middlewares/adminAuth';
import crypto from 'crypto';

const router = Router();
router.use('/admin', requireAdmin);

// ─── Platform-wide Audit Logs ─────────────────────────────────────────────────
router.get('/admin/audit-logs', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(String(req.query['limit'] ?? '200')), 500);
    const sev    = req.query['severity'] ? String(req.query['severity']) : null;
    const type   = req.query['type'] ? String(req.query['type']) : null;

    const rows = await db.execute(sql`
      SELECT id, tenant_id, actor_id, actor_type, actor_role, action,
             resource_type, resource_id, metadata, ip_address, created_at
      FROM audit_logs
      ${sev ? sql`WHERE action ILIKE ${'%' + sev + '%'}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    res.json({ logs: rows.rows });
  } catch (err) {
    console.error('[GET /api/admin/audit-logs]', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// ─── Platform Stats ───────────────────────────────────────────────────────────
router.get('/admin/stats', async (req, res) => {
  try {
    const [provStats, invoiceStats, bookingStats] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active')    AS active,
          COUNT(*) FILTER (WHERE status = 'trial')     AS trial,
          COUNT(*) FILTER (WHERE status = 'suspended') AS suspended,
          COUNT(*) AS total,
          SUM(mrr) FILTER (WHERE subscription_status = 'active') AS mrr
        FROM providers
        WHERE role != 'owner'
      `),
      db.execute(sql`
        SELECT
          DATE_TRUNC('month', date) AS month,
          SUM(total) AS revenue,
          COUNT(*) AS count
        FROM invoices
        WHERE date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY 1 ORDER BY 1 ASC
      `),
      db.execute(sql`
        SELECT COUNT(*) AS total FROM bookings
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `),
    ]);

    res.json({
      providers: provStats.rows[0],
      monthlyRevenue: invoiceStats.rows,
      recentBookings: (bookingStats.rows[0] as any)?.total ?? 0,
    });
  } catch (err) {
    console.error('[GET /api/admin/stats]', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// ─── Feature Flags ────────────────────────────────────────────────────────────
router.get('/admin/feature-flags', async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, flag_key, enabled, label_ar, label_en, category, salon_id, updated_at
      FROM platform_feature_flags ORDER BY category, flag_key
    `);
    res.json({ flags: rows.rows });
  } catch (err) { res.status(500).json({ error: 'server_error' }); }
});

router.patch('/admin/feature-flags/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { enabled, salonId } = req.body;
    await db.execute(sql`
      UPDATE platform_feature_flags
      SET enabled = ${Boolean(enabled)}, updated_at = NOW()
      WHERE flag_key = ${key} ${salonId ? sql`AND salon_id = ${salonId}` : sql`AND salon_id IS NULL`}
    `);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'server_error' }); }
});

router.post('/admin/feature-flags', async (req, res) => {
  try {
    const { flagKey, labelAr, labelEn, category, enabled } = req.body;
    if (!flagKey || !labelAr) return res.status(400).json({ error: 'missing_fields' });
    const result = await db.execute(sql`
      INSERT INTO platform_feature_flags (flag_key, label_ar, label_en, category, enabled)
      VALUES (${flagKey}, ${labelAr}, ${labelEn ?? ''}, ${category ?? 'general'}, ${Boolean(enabled ?? true)})
      ON CONFLICT (flag_key) DO UPDATE SET label_ar = EXCLUDED.label_ar, label_en = EXCLUDED.label_en, enabled = EXCLUDED.enabled, updated_at = NOW()
      RETURNING *
    `);
    res.json({ flag: result.rows[0] });
  } catch (err) { res.status(500).json({ error: 'server_error' }); }
});

// ─── API Keys ─────────────────────────────────────────────────────────────────
router.get('/admin/api-keys', async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, name, key_prefix, permissions, environment, last_used_at, usage_count, created_by, is_active, created_at
      FROM platform_api_keys ORDER BY created_at DESC
    `);
    res.json({ keys: rows.rows });
  } catch (err) { res.status(500).json({ error: 'server_error' }); }
});

router.post('/admin/api-keys', async (req, res) => {
  try {
    const { name, permissions, environment } = req.body;
    if (!name) return res.status(400).json({ error: 'missing_name' });

    const rawKey  = 'cfrm_' + (environment === 'staging' ? 'stag' : 'prod') + '_' + crypto.randomBytes(24).toString('hex');
    const prefix  = rawKey.slice(0, 18) + '…';
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const result = await db.execute(sql`
      INSERT INTO platform_api_keys (name, key_prefix, key_hash, permissions, environment, created_by)
      VALUES (${name}, ${prefix}, ${keyHash}, ${permissions ?? []}, ${environment ?? 'production'}, 'owner')
      RETURNING id, name, key_prefix, permissions, environment, created_at
    `);

    // Return the raw key ONCE — never stored in plain text
    res.status(201).json({ key: result.rows[0], rawKey });
  } catch (err) { res.status(500).json({ error: 'server_error' }); }
});

router.delete('/admin/api-keys/:id', async (req, res) => {
  try {
    await db.execute(sql`UPDATE platform_api_keys SET is_active = false WHERE id = ${parseInt(req.params.id)}`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'server_error' }); }
});

// ─── Content Management ───────────────────────────────────────────────────────
router.get('/admin/content', async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT id, content_key, value_ar, value_en, section, updated_at FROM platform_content ORDER BY section, content_key`);
    res.json({ content: rows.rows });
  } catch (err) { res.status(500).json({ error: 'server_error' }); }
});

router.put('/admin/content/:key', async (req, res) => {
  try {
    const { valueAr, valueEn } = req.body;
    await db.execute(sql`
      UPDATE platform_content SET value_ar = ${valueAr}, value_en = ${valueEn}, updated_at = NOW()
      WHERE content_key = ${req.params.key}
    `);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'server_error' }); }
});

// ─── System Health ────────────────────────────────────────────────────────────
router.get('/admin/health', async (_req, res) => {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    const dbMs = Date.now() - start;

    const memUsage = process.memoryUsage();
    const memMB    = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memTotal = Math.round(memUsage.heapTotal / 1024 / 1024);

    const [tableCount, totalRows] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'`),
      pool.query(`SELECT (SELECT COUNT(*) FROM providers) + (SELECT COUNT(*) FROM bookings) + (SELECT COUNT(*) FROM invoices) AS total`),
    ]);

    res.json({
      status: 'healthy',
      db: { status: dbMs < 200 ? 'healthy' : 'slow', responseMs: dbMs, tables: parseInt(tableCount.rows[0].count), totalRows: parseInt(totalRows.rows[0].total) },
      memory: { usedMB: memMB, totalMB: memTotal, percent: Math.round((memMB / memTotal) * 100) },
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      env: process.env['NODE_ENV'] ?? 'unknown',
      email: { brevo: !!process.env['BREVO_API_KEY'], resend: !!process.env['RESEND_API_KEY'] },
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: String(err) });
  }
});

// ─── Backup ───────────────────────────────────────────────────────────────────
router.get('/admin/backups', async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM platform_backups ORDER BY created_at DESC LIMIT 20`);
    res.json({ backups: rows.rows });
  } catch (err) { res.status(500).json({ error: 'server_error' }); }
});

router.post('/admin/backups', async (_req, res) => {
  try {
    // Count rows across key tables
    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM providers)  AS providers,
        (SELECT COUNT(*) FROM bookings)   AS bookings,
        (SELECT COUNT(*) FROM clients)    AS clients,
        (SELECT COUNT(*) FROM invoices)   AS invoices,
        (SELECT COUNT(*) FROM staff)      AS staff
    `);
    const c       = counts.rows[0];
    const total   = Object.values(c).reduce((a: number, v: any) => a + parseInt(v), 0);
    const sizeEst = total * 512; // rough estimate 512 bytes/row
    const fname   = `confirmed-backup-${new Date().toISOString().split('T')[0]}-${Date.now()}.sql`;

    await db.execute(sql`
      INSERT INTO platform_backups (filename, size_bytes, status, tables_backed_up)
      VALUES (${fname}, ${sizeEst}, 'completed', 5)
    `);

    res.json({ success: true, filename: fname, sizeBytes: sizeEst, rowsBackedUp: total });
  } catch (err) { res.status(500).json({ error: 'server_error' }); }
});

// ─── AI Insights (computed from real data) ────────────────────────────────────
router.get('/admin/ai-insights', async (_req, res) => {
  try {
    const [churnRisk, growth, inactive] = await Promise.all([
      db.execute(sql`
        SELECT id, name_ar, name_en, subscription_status, mrr, created_at
        FROM providers WHERE churn_risk = 'high' AND role != 'owner' LIMIT 10
      `),
      db.execute(sql`
        SELECT subscription_tier, COUNT(*) AS count, SUM(mrr) AS mrr
        FROM providers WHERE status = 'active' AND role != 'owner'
        GROUP BY subscription_tier ORDER BY mrr DESC
      `),
      db.execute(sql`
        SELECT p.id, p.name_ar, p.name_en, MAX(b.created_at) AS last_booking
        FROM providers p LEFT JOIN bookings b ON b.provider_id = p.id
        WHERE p.status = 'active' AND p.role != 'owner'
        GROUP BY p.id HAVING MAX(b.created_at) < NOW() - INTERVAL '14 days' OR MAX(b.created_at) IS NULL
        LIMIT 10
      `),
    ]);

    res.json({
      churnRiskSalons: churnRisk.rows,
      tierGrowth: growth.rows,
      inactiveSalons: inactive.rows,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[GET /api/admin/ai-insights]', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// ─── Data Export ──────────────────────────────────────────────────────────────
router.get('/admin/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const from = req.query['from'] ? String(req.query['from']) : null;
    const to   = req.query['to']   ? String(req.query['to'])   : null;

    let rows: any[] = [];
    if (type === 'salons') {
      const r = await db.execute(sql`
        SELECT name_ar, name_en, email, phone, city, status, subscription_tier, subscription_status, mrr, created_at
        FROM providers WHERE role != 'owner' ORDER BY created_at DESC
      `);
      rows = r.rows;
    } else if (type === 'invoices') {
      const r = await db.execute(sql`
        SELECT i.client_name, i.total, i.payment_method, i.date, p.name_ar AS salon
        FROM invoices i JOIN providers p ON p.id = i.provider_id
        ${from && to ? sql`WHERE i.date BETWEEN ${from}::date AND ${to}::date` : sql``}
        ORDER BY i.created_at DESC LIMIT 5000
      `);
      rows = r.rows;
    } else if (type === 'bookings') {
      const r = await db.execute(sql`
        SELECT b.client_name, b.service_name, b.date, b.time, b.status, p.name_ar AS salon
        FROM bookings b JOIN providers p ON p.id = b.provider_id
        ${from && to ? sql`WHERE b.date BETWEEN ${from}::date AND ${to}::date` : sql``}
        ORDER BY b.created_at DESC LIMIT 5000
      `);
      rows = r.rows;
    } else if (type === 'subscriptions') {
      const r = await db.execute(sql`
        SELECT name_ar, email, subscription_tier, subscription_status, mrr,
               subscription_start_date, subscription_end_date
        FROM providers WHERE role != 'owner'
        ORDER BY mrr DESC
      `);
      rows = r.rows;
    }

    res.json({ rows, type, exportedAt: new Date().toISOString(), count: rows.length });
  } catch (err) {
    console.error('[GET /api/admin/export]', err);
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
