/**
 * /api/internal/* — Machine-to-machine endpoints for external cron services.
 *
 * Protected by `Authorization: Bearer <INTERNAL_CRON_SECRET>`.
 * Set INTERNAL_CRON_SECRET to a long random string in Replit Secrets,
 * then configure your external cron to send:
 *   POST /api/internal/run-reminders
 *   Authorization: Bearer <your-secret>
 *
 * Suitable callers: cron-job.org, GitHub Actions scheduled workflow,
 * Render cron job, or any HTTP-capable scheduler.
 */

import { Router } from 'express';
import { runReminderJob } from '../lib/subscriptionReminder';

const router = Router();

// ── Auth middleware ──────────────────────────────────────────────────────────
function requireCronSecret(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction,
) {
  const secret = process.env['INTERNAL_CRON_SECRET'];

  if (!secret) {
    // If the env var is not configured, this endpoint is disabled.
    return res.status(503).json({
      error:   'cron_not_configured',
      message: 'Set INTERNAL_CRON_SECRET in Replit Secrets to enable this endpoint.',
    });
  }

  const authHeader = req.headers['authorization'] ?? '';
  const provided   = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!provided || provided !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  return next();
}

// ── POST /api/internal/run-reminders ────────────────────────────────────────
// External cron service calls this daily at 09:00 Riyadh time (06:00 UTC).
// Returns JSON summary: { sent, errors, skipped }.
router.post('/internal/run-reminders', requireCronSecret, async (_req, res) => {
  console.info('[INTERNAL CRON] ▶ run-reminders triggered by external caller');
  try {
    const result = await runReminderJob();
    console.info('[INTERNAL CRON] ✅ run-reminders complete', result);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[INTERNAL CRON] ❌ run-reminders failed', err?.message);
    return res.status(500).json({ error: 'server_error', detail: err?.message });
  }
});

// ── GET /api/internal/healthz ────────────────────────────────────────────────
// Lightweight ping used by monitoring / uptime checkers (no auth required).
router.get('/internal/healthz', (_req, res) => {
  return res.json({ status: 'ok', ts: new Date().toISOString() });
});

export default router;
