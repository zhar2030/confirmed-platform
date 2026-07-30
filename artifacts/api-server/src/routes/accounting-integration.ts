/**
 * Accounting system integration routes.
 *
 * PUBLIC (token-based):
 *   POST /api/webhooks/accounting/:token   — push webhook from any accounting system
 *
 * PRIVATE (tenantAuth):
 *   GET  /api/settings/accounting          — read integration config + webhook URL
 *   PUT  /api/settings/accounting          — save pull-sync config
 *   POST /api/settings/accounting/sync     — manually trigger pull sync
 *   GET  /api/settings/accounting/logs     — last 20 sync events
 *   POST /api/settings/accounting/token    — regenerate webhook token
 */
import { Router } from 'express';
import { randomBytes } from 'crypto';
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import { tenantAuth } from '../middlewares/tenantAuth';
import { normalize } from '../handlers/accounting/normalize';
import type { NormalizedInvoice } from '../handlers/accounting/normalize';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateToken(): string {
  return randomBytes(32).toString('hex'); // 64-char hex string
}

/** Insert normalized invoices; skips duplicates by (provider_id, external_id). */
async function upsertInvoices(
  providerId: number,
  invoices: NormalizedInvoice[],
): Promise<{ imported: number; skipped: number; duplicates: number }> {
  let imported = 0, skipped = 0, duplicates = 0;

  for (const inv of invoices) {
    if (!inv.date || !/^\d{4}-\d{2}-\d{2}$/.test(inv.date) || inv.total <= 0) {
      skipped++;
      continue;
    }

    // Deduplication: if external_id already exists for this provider, skip
    if (inv.externalId) {
      const existing = await db.execute(sql`
        SELECT id FROM invoices
        WHERE provider_id = ${providerId} AND external_id = ${inv.externalId}
        LIMIT 1
      `);
      if (existing.rows.length > 0) { duplicates++; continue; }
    }

    await db.execute(sql`
      INSERT INTO invoices
        (provider_id, client_name, items, subtotal, tax, total,
         payment_method, date, time, branch_id, source, source_system, external_id)
      VALUES
        (${providerId},
         ${inv.clientName.slice(0, 255)},
         ${JSON.stringify(inv.items)}::jsonb,
         ${inv.subtotal}, ${inv.tax}, ${inv.total},
         ${inv.paymentMethod.slice(0, 20)},
         ${inv.date}::date,
         '', '', 'accounting',
         ${inv.sourceSystem},
         ${inv.externalId || null})
    `);
    imported++;
  }

  return { imported, skipped, duplicates };
}

/** Write a line to the sync log. */
async function writeSyncLog(
  providerId: number,
  opts: { syncType: string; sourceSystem: string; status: string; imported: number; skipped: number; duplicates: number; errorMessage?: string },
): Promise<void> {
  await db.execute(sql`
    INSERT INTO accounting_sync_logs
      (provider_id, sync_type, source_system, status, imported, skipped, duplicates, error_message)
    VALUES
      (${providerId}, ${opts.syncType}, ${opts.sourceSystem}, ${opts.status},
       ${opts.imported}, ${opts.skipped}, ${opts.duplicates}, ${opts.errorMessage ?? null})
  `);
}

// ── POST /api/webhooks/accounting/:token ─────────────────────────────────────
// Public endpoint — authenticated by token only (no session required).
// Called by the external accounting system when an invoice is created/updated.
router.post('/webhooks/accounting/:token', async (req, res) => {
  const { token } = req.params;
  if (!token || token.length < 32) return res.status(400).json({ error: 'invalid_token' });

  try {
    // Look up provider by token
    const result = await db.execute(sql`
      SELECT id FROM providers
      WHERE accounting_webhook_token = ${token}
      LIMIT 1
    `);
    if (result.rows.length === 0) return res.status(401).json({ error: 'token_not_found' });

    const providerId = Number((result.rows[0] as any).id);

    // Detect source system from header or query param (optional — falls back to generic)
    const sourceSystem = String(
      req.headers['x-accounting-system'] ?? req.query.system ?? 'generic'
    ).toLowerCase();

    const raw = req.body;
    const invoices = normalize(sourceSystem, raw);

    if (invoices.length === 0) {
      return res.status(422).json({ error: 'no_valid_invoices_found' });
    }

    const { imported, skipped, duplicates } = await upsertInvoices(providerId, invoices);
    await writeSyncLog(providerId, { syncType: 'webhook', sourceSystem, status: 'success', imported, skipped, duplicates });

    return res.json({ success: true, imported, skipped, duplicates });
  } catch (err: any) {
    console.error('[POST /webhooks/accounting]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── Apply tenantAuth to all remaining routes ──────────────────────────────────
router.use(tenantAuth);

function resolveProviderId(req: any): number | null {
  return (req as any).tenant?.tenantId ?? (req as any).providerId ?? null;
}

// ── GET /api/settings/accounting ──────────────────────────────────────────────
router.get('/settings/accounting', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const result = await db.execute(sql`
      SELECT accounting_webhook_token, accounting_pull_config
      FROM providers
      WHERE id = ${providerId}
      LIMIT 1
    `);
    const row = result.rows[0] as any;

    // Auto-generate a token if none exists yet
    let token = row?.accounting_webhook_token;
    if (!token) {
      token = generateToken();
      await db.execute(sql`
        UPDATE providers SET accounting_webhook_token = ${token} WHERE id = ${providerId}
      `);
    }

    return res.json({
      webhookToken:    token,
      pullConfig:      row?.accounting_pull_config ?? {},
    });
  } catch (err) {
    console.error('[GET /settings/accounting]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── PUT /api/settings/accounting ──────────────────────────────────────────────
// Saves pull sync configuration (system type, API URL, API key, sync interval).
router.put('/settings/accounting', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const { pullConfig } = req.body as { pullConfig?: Record<string, unknown> };

    await db.execute(sql`
      UPDATE providers
      SET accounting_pull_config = ${JSON.stringify(pullConfig ?? {})}::jsonb,
          updated_at = NOW()
      WHERE id = ${providerId}
    `);

    return res.json({ success: true });
  } catch (err) {
    console.error('[PUT /settings/accounting]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── POST /api/settings/accounting/token ───────────────────────────────────────
// Regenerates the webhook token (invalidates the old one).
router.post('/settings/accounting/token', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const newToken = generateToken();
    await db.execute(sql`
      UPDATE providers SET accounting_webhook_token = ${newToken} WHERE id = ${providerId}
    `);

    return res.json({ success: true, webhookToken: newToken });
  } catch (err) {
    console.error('[POST /settings/accounting/token]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── POST /api/settings/accounting/sync ───────────────────────────────────────
// Manually triggers a pull sync from the configured external API.
// Body: { system: 'foodics' | 'marn' | 'odoo' | 'generic' | ... }
router.post('/settings/accounting/sync', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    // Read pull config — supports both legacy flat format and new per-system format
    const result = await db.execute(sql`
      SELECT accounting_pull_config FROM providers WHERE id = ${providerId} LIMIT 1
    `);
    const allConfig = (result.rows[0] as any)?.accounting_pull_config ?? {};

    // New per-system format: { foodics: { apiUrl, apiKey, authType }, ... }
    // Legacy flat format: { system, apiUrl, apiKey, authType }
    const requestedSystem = (req.body?.system ?? allConfig?.system ?? 'generic') as string;
    const systemConfig = (allConfig[requestedSystem] ?? allConfig) as Record<string, string>;
    const { apiUrl, apiKey, authType } = systemConfig;
    const system = requestedSystem;

    if (!apiUrl) {
      return res.status(400).json({ error: 'pull_config_missing', detail: 'apiUrl is required' });
    }

    const sourceSystem = (system ?? 'generic').toLowerCase();

    // Build auth headers
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) {
      if (authType === 'basic') {
        headers['Authorization'] = `Basic ${Buffer.from(apiKey).toString('base64')}`;
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    // Fetch invoices from external system
    let raw: unknown;
    try {
      const fetchRes = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(15_000) });
      if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`);
      raw = await fetchRes.json();
    } catch (fetchErr: any) {
      const msg = String(fetchErr?.message ?? fetchErr);
      await writeSyncLog(providerId, { syncType: 'manual', sourceSystem, status: 'error', imported: 0, skipped: 0, duplicates: 0, errorMessage: msg });
      return res.status(502).json({ error: 'fetch_failed', detail: msg });
    }

    const invoices = normalize(sourceSystem, raw);
    const { imported, skipped, duplicates } = await upsertInvoices(providerId, invoices);
    await writeSyncLog(providerId, { syncType: 'manual', sourceSystem, status: 'success', imported, skipped, duplicates });

    return res.json({ success: true, imported, skipped, duplicates });
  } catch (err: any) {
    console.error('[POST /settings/accounting/sync]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── GET /api/settings/accounting/logs ────────────────────────────────────────
router.get('/settings/accounting/logs', async (req, res) => {
  try {
    const providerId = resolveProviderId(req);
    if (!providerId) return res.status(401).json({ error: 'unauthorized' });

    const result = await db.execute(sql`
      SELECT id, sync_type, source_system, status, imported, skipped, duplicates,
             error_message, created_at
      FROM accounting_sync_logs
      WHERE provider_id = ${providerId}
      ORDER BY created_at DESC
      LIMIT 20
    `);

    return res.json({ logs: result.rows });
  } catch (err) {
    console.error('[GET /settings/accounting/logs]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
