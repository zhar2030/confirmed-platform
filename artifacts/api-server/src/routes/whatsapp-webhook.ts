/**
 * WhatsApp Cloud API webhook endpoints.
 *
 * GET  /api/webhooks/whatsapp  — Meta webhook verification challenge
 * POST /api/webhooks/whatsapp  — Incoming messages + status updates
 *
 * These routes are intentionally PUBLIC (no tenantAuth) — Meta sends them
 * without auth headers. Security is enforced via HMAC-SHA256 signature check.
 */

import { Router } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { resolvePhoneToProvider, processMessage } from '../lib/conversationEngine';
import type { IncomingMessage } from '../lib/whatsappTypes';

const router = Router();

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Keyed by wa_from. Resets every minute. Limit is per the phone config.
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimiter) {
    if (now > v.resetAt) rateLimiter.delete(k);
  }
}, 60_000);

function isRateLimited(waFrom: string, limitPerMin: number): boolean {
  const now   = Date.now();
  const entry = rateLimiter.get(waFrom) ?? { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000; }
  entry.count++;
  rateLimiter.set(waFrom, entry);
  return entry.count > limitPerMin;
}

// ── HMAC-SHA256 signature verification ───────────────────────────────────────
function verifySignature(rawBody: Buffer, signature: string): boolean {
  const appSecret = process.env['WHATSAPP_APP_SECRET'];
  if (!appSecret) {
    console.warn('[webhook] WHATSAPP_APP_SECRET not set — skipping signature check');
    return true; // dev fallback
  }
  const expected = 'sha256=' + createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ── GET — webhook verification challenge ─────────────────────────────────────
router.get('/webhooks/whatsapp', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env['WHATSAPP_VERIFY_TOKEN'];
  if (!verifyToken) {
    console.error('[webhook] WHATSAPP_VERIFY_TOKEN not configured');
    return res.status(500).send('Server misconfigured');
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.info('[webhook] ✅ Meta webhook verified');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ── POST — incoming messages ──────────────────────────────────────────────────
router.post('/webhooks/whatsapp', async (req, res) => {
  // Acknowledge immediately (Meta requires < 20s response)
  res.sendStatus(200);

  // Verify HMAC signature
  const sig = req.headers['x-hub-signature-256'] as string | undefined;
  if (sig) {
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (rawBody && !verifySignature(rawBody, sig)) {
      console.warn('[webhook] ❌ Signature mismatch — dropping payload');
      return;
    }
  }

  try {
    const body = req.body;
    if (body?.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;
        const value = change.value;

        // ── Status updates (delivered/read) ────────────────────────────────
        for (const status of value?.statuses ?? []) {
          await handleStatusUpdate(status).catch(console.error);
        }

        // ── Incoming messages ──────────────────────────────────────────────
        const phoneNumberId: string = value?.metadata?.phone_number_id ?? '';
        if (!phoneNumberId) continue;

        for (const rawMsg of value?.messages ?? []) {
          await handleIncomingMessage(phoneNumberId, rawMsg).catch(e =>
            console.error('[webhook] message handler error:', e?.message),
          );
        }
      }
    }
  } catch (err: any) {
    console.error('[webhook] Unexpected error:', err?.message);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function handleIncomingMessage(
  phoneNumberId: string,
  raw: any,
): Promise<void> {
  const phone = await resolvePhoneToProvider(phoneNumberId);
  if (!phone) {
    console.warn(`[webhook] Unknown phone_number_id: ${phoneNumberId}`);
    return;
  }

  const waFrom = raw.from as string;
  if (!waFrom) return;

  // Rate limiting
  if (isRateLimited(waFrom, phone.rate_limit_per_min)) {
    console.warn(`[webhook] Rate limit exceeded for ${waFrom}`);
    return;
  }

  const msg = parseIncomingMessage(raw);
  if (!msg) return;

  await processMessage(phone, phone.provider_id, msg);
}

function parseIncomingMessage(raw: any): IncomingMessage | null {
  const type = raw.type as string;

  if (type === 'text') {
    return {
      messageId: raw.id,
      wa_from:   raw.from,
      type:      'text',
      text:      raw.text?.body ?? '',
    };
  }

  if (type === 'interactive') {
    const it = raw.interactive?.type;
    return {
      messageId:   raw.id,
      wa_from:     raw.from,
      type:        'interactive',
      interactive: {
        type:          it,
        button_reply:  raw.interactive?.button_reply,
        list_reply:    raw.interactive?.list_reply,
      },
    };
  }

  if (type === 'button') {
    return {
      messageId: raw.id,
      wa_from:   raw.from,
      type:      'button',
      button:    { payload: raw.button?.payload ?? '', text: raw.button?.text ?? '' },
    };
  }

  // Unsupported type (image, audio, etc.) — treat as text trigger
  return {
    messageId: raw.id,
    wa_from:   raw.from,
    type:      'other',
    text:      '',
  };
}

async function handleStatusUpdate(status: any): Promise<void> {
  const { id: waMessageId, status: newStatus } = status;
  if (!waMessageId || !newStatus) return;
  try {
    const { db } = await import('../lib/db');
    const { sql } = await import('drizzle-orm');
    await db.execute(sql`
      UPDATE whatsapp_messages
      SET status = ${newStatus}, updated_at = NOW()
      WHERE wa_message_id = ${waMessageId}
    `);
  } catch { /* non-critical */ }
}

// ── GET /api/whatsapp/app-config — PUBLIC ────────────────────────────────────
// Returns non-secret Meta App config needed by the frontend to init FB SDK.
// Must live here (before bookingsRouter) because bookingsRouter applies tenantAuth
// to every request it receives, blocking anything registered after it.
router.get('/whatsapp/app-config', (_req, res) => {
  const appId    = process.env['WHATSAPP_APP_ID'];
  const configId = process.env['WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID'] ?? '';
  if (!appId) return res.status(503).json({ error: 'not_configured' });
  return res.json({ appId, configId });
});

// ── POST /api/whatsapp/fetch-waba-phones — PUBLIC ────────────────────────────
// Called right after Embedded Signup. Exchanges authorization code for a
// long-lived token, then discovers all WABA phone numbers for selection.
router.post('/whatsapp/fetch-waba-phones', async (req, res) => {
  const { code, accessToken: rawToken } = req.body;
  const appId     = process.env['WHATSAPP_APP_ID'];
  const appSecret = process.env['WHATSAPP_APP_SECRET'];

  let userToken: string | undefined = rawToken;

  if (code && appId && appSecret) {
    try {
      const tokenRes  = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token` +
        `?client_id=${encodeURIComponent(appId)}` +
        `&client_secret=${encodeURIComponent(appSecret)}` +
        `&code=${encodeURIComponent(code)}`
      );
      const tokenData = await tokenRes.json() as any;
      if (!tokenData.access_token)
        return res.status(400).json({ error: 'token_exchange_failed', detail: tokenData.error?.message ?? 'unknown' });
      userToken = tokenData.access_token;
    } catch (err: any) {
      return res.status(500).json({ error: 'token_exchange_error', detail: err.message });
    }
  }

  if (!userToken) return res.status(400).json({ error: 'code_or_accessToken_required' });

  // Exchange short-lived → long-lived token (60 days)
  let longToken = userToken;
  if (appId && appSecret) {
    try {
      const llRes  = await fetch(
        `https://graph.facebook.com/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${encodeURIComponent(appId)}` +
        `&client_secret=${encodeURIComponent(appSecret)}` +
        `&fb_exchange_token=${encodeURIComponent(userToken)}`
      );
      const llData = await llRes.json() as any;
      if (llData.access_token) longToken = llData.access_token;
    } catch { /* keep short-lived on failure */ }
  }

  try {
    const meRes  = await fetch(`https://graph.facebook.com/v21.0/me?fields=whatsapp_business_accounts&access_token=${encodeURIComponent(longToken)}`);
    const meData = await meRes.json() as any;
    const wabas: any[] = meData.whatsapp_business_accounts?.data ?? [];
    if (wabas.length === 0) return res.json({ phones: [], token: longToken, message: 'no_waba_found' });

    const phones: Array<{ phoneNumberId: string; displayPhone: string; wabaId: string; verifiedName: string }> = [];
    await Promise.all(wabas.map(async (waba: any) => {
      try {
        const phonesData = await (await fetch(
          `https://graph.facebook.com/v21.0/${waba.id}/phone_numbers` +
          `?fields=id,display_phone_number,verified_name,code_verification_status` +
          `&access_token=${encodeURIComponent(longToken)}`
        )).json() as any;
        for (const p of phonesData.data ?? [])
          phones.push({ phoneNumberId: p.id, displayPhone: p.display_phone_number ?? '', wabaId: waba.id, verifiedName: p.verified_name ?? '' });
      } catch { /* skip failed WABA */ }
    }));
    return res.json({ phones, token: longToken });
  } catch (err: any) {
    return res.status(500).json({ error: 'waba_fetch_error', detail: err.message });
  }
});

export default router;
