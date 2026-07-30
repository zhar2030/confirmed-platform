/**
 * WhatsApp configuration endpoints — tenant-scoped.
 *
 * GET    /api/whatsapp/phones             — list connected numbers
 * POST   /api/whatsapp/oauth/callback     — Embedded Signup: exchange code → store token
 * PATCH  /api/whatsapp/phones/:id         — update rate limits
 * DELETE /api/whatsapp/phones/:id         — disconnect a number
 * GET    /api/whatsapp/conversations      — recent conversations for dashboard
 */

import { Router } from 'express';
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import { tenantAuth } from '../middlewares/tenantAuth';
import { encrypt, decrypt } from '../lib/encryption';

const router = Router();

// NOTE: app-config and fetch-waba-phones are public endpoints — they live in
// whatsapp-webhook.ts (registered before bookingsRouter) to avoid tenantAuth
// from bookingsRouter intercepting them.

// All routes below require tenant authentication
router.use('/whatsapp', tenantAuth);

function resolveProviderId(req: any): number | null {
  return (req as any).tenant?.tenantId ?? null;
}

// ── GET /api/whatsapp/phones ─────────────────────────────────────────────────
router.get('/whatsapp/phones', async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(401).json({ error: 'unauthorized' });

  try {
    const r = await db.execute(sql`
      SELECT id, provider_id, phone_number_id, display_phone, waba_id,
             is_active, is_primary, rate_limit_per_min, rate_limit_per_hour, created_at
      FROM whatsapp_phone_numbers
      WHERE provider_id = ${providerId}
      ORDER BY is_primary DESC, created_at ASC
    `);
    // Never return the encrypted token to the client
    res.json({ phones: r.rows });
  } catch (err: any) {
    console.error('[GET /api/whatsapp/phones]', err?.message);
    res.status(500).json({ error: 'server_error' });
  }
});

// ── POST /api/whatsapp/oauth/callback ────────────────────────────────────────
// Receives the result of Meta Embedded Signup from the frontend.
// Expects: { accessToken, phoneNumberId, wabaId, displayPhone }
router.post('/whatsapp/oauth/callback', async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(401).json({ error: 'unauthorized' });

  const { accessToken, phoneNumberId, wabaId, displayPhone } = req.body;

  if (!accessToken || !phoneNumberId) {
    return res.status(400).json({ error: 'accessToken and phoneNumberId are required' });
  }

  try {
    // Exchange short-lived token for long-lived token (60 days)
    const appId     = process.env['WHATSAPP_APP_ID'];
    const appSecret = process.env['WHATSAPP_APP_SECRET'];
    let finalToken  = accessToken;

    if (appId && appSecret) {
      try {
        const exchangeUrl =
          `https://graph.facebook.com/oauth/access_token` +
          `?grant_type=fb_exchange_token` +
          `&client_id=${appId}` +
          `&client_secret=${appSecret}` +
          `&fb_exchange_token=${encodeURIComponent(accessToken)}`;

        const exchangeRes = await fetch(exchangeUrl);
        const data        = await exchangeRes.json() as any;
        if (data?.access_token) {
          finalToken = data.access_token;
          console.info('[whatsapp/oauth] Token exchanged for long-lived token');
        } else {
          console.warn('[whatsapp/oauth] Exchange failed, using original token:', data?.error?.message);
        }
      } catch (exErr: any) {
        console.warn('[whatsapp/oauth] Exchange request failed:', exErr?.message);
      }
    }

    // Deactivate existing primary if setting a new one
    const existing = await db.execute(sql`
      SELECT id FROM whatsapp_phone_numbers
      WHERE provider_id = ${providerId} AND phone_number_id = ${phoneNumberId}
      LIMIT 1
    `);

    const encryptedToken = encrypt(finalToken);
    const isPrimary      = true; // First connected number is always primary

    if (existing.rows.length > 0) {
      // Update existing
      const existId = (existing.rows[0] as any).id;
      await db.execute(sql`
        UPDATE whatsapp_phone_numbers
        SET system_user_token = ${encryptedToken},
            waba_id           = ${wabaId ?? ''},
            display_phone     = ${displayPhone ?? phoneNumberId},
            is_active         = true,
            updated_at        = NOW()
        WHERE id = ${existId}
      `);
      return res.json({ success: true, action: 'updated', id: existId });
    }

    // Insert new
    const inserted = await db.execute(sql`
      INSERT INTO whatsapp_phone_numbers
        (provider_id, phone_number_id, display_phone, waba_id,
         system_user_token, is_active, is_primary)
      VALUES
        (${providerId}, ${phoneNumberId}, ${displayPhone ?? phoneNumberId},
         ${wabaId ?? ''}, ${encryptedToken}, true, ${isPrimary})
      RETURNING id
    `);

    const newId = (inserted.rows[0] as any).id;
    res.json({ success: true, action: 'created', id: newId });
  } catch (err: any) {
    console.error('[POST /api/whatsapp/oauth/callback]', err?.message);
    res.status(500).json({ error: 'server_error' });
  }
});

// ── PATCH /api/whatsapp/phones/:id ───────────────────────────────────────────
router.patch('/whatsapp/phones/:id', async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(401).json({ error: 'unauthorized' });

  const id = parseInt(req.params['id'] ?? '', 10);
  if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });

  const { rateLimitPerMin, rateLimitPerHour } = req.body;

  try {
    await db.execute(sql`
      UPDATE whatsapp_phone_numbers
      SET
        rate_limit_per_min  = COALESCE(${rateLimitPerMin  != null ? Number(rateLimitPerMin)  : null}, rate_limit_per_min),
        rate_limit_per_hour = COALESCE(${rateLimitPerHour != null ? Number(rateLimitPerHour) : null}, rate_limit_per_hour)
      WHERE id = ${id} AND provider_id = ${providerId}
    `);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[PATCH /api/whatsapp/phones/:id]', err?.message);
    res.status(500).json({ error: 'server_error' });
  }
});

// ── DELETE /api/whatsapp/phones/:id ──────────────────────────────────────────
router.delete('/whatsapp/phones/:id', async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(401).json({ error: 'unauthorized' });

  const id = parseInt(req.params['id'] ?? '', 10);
  if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });

  try {
    await db.execute(sql`
      UPDATE whatsapp_phone_numbers
      SET is_active = false
      WHERE id = ${id} AND provider_id = ${providerId}
    `);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/whatsapp/phones/:id]', err?.message);
    res.status(500).json({ error: 'server_error' });
  }
});

// ── GET /api/whatsapp/conversations ─────────────────────────────────────────
router.get('/whatsapp/conversations', async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(401).json({ error: 'unauthorized' });

  try {
    const limit = Math.min(50, parseInt(String(req.query['limit'] ?? '20')) || 20);

    const r = await db.execute(sql`
      SELECT c.id, c.wa_from, c.state, c.lang, c.last_activity_at,
             COUNT(m.id)::int AS message_count,
             MAX(m.sent_at)   AS last_message_at
      FROM whatsapp_conversations c
      LEFT JOIN whatsapp_messages m ON m.conversation_id = c.id
      WHERE c.provider_id = ${providerId}
      GROUP BY c.id
      ORDER BY c.last_activity_at DESC
      LIMIT ${limit}
    `);

    res.json({ conversations: r.rows });
  } catch (err: any) {
    console.error('[GET /api/whatsapp/conversations]', err?.message);
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
