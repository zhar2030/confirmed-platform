/**
 * /api/reminders — Admin-only reminder management routes.
 * GET  /api/reminders         — list providers with subscription end dates + reminder status
 * POST /api/reminders/run     — trigger reminder job immediately
 * POST /api/reminders/:id/reset — reset reminder history for a provider (re-send cycle)
 * PATCH /api/reminders/:id    — manually set subscriptionEndsAt for a provider
 */

import { Router } from 'express';
import { db, providers } from '../lib/db';
import { eq, isNotNull, sql } from 'drizzle-orm';
import { requireAdmin } from '../middlewares/adminAuth';
import { runReminderJob } from '../lib/subscriptionReminder';

const router = Router();

// ─── GET /api/reminders ───────────────────────────────────────────────────────
router.get('/reminders', requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id:                providers.id,
        username:          providers.username,
        email:             providers.email,
        nameAr:            providers.nameAr,
        status:            providers.status,
        subscriptionTier:  providers.subscriptionTier,
        subscriptionStatus: providers.subscriptionStatus,
        billingCycle:      providers.billingCycle,
        subscriptionEndsAt: providers.subscriptionEndsAt,
        remindersSent:     providers.remindersSent,
        createdAt:         providers.createdAt,
      })
      .from(providers)
      .orderBy(providers.subscriptionEndsAt);

    // Enrich with daysLeft + next reminder stage
    const now = Date.now();
    const enriched = rows.map(r => {
      const endsAt  = r.subscriptionEndsAt;
      const daysLeft = endsAt
        ? Math.ceil((endsAt.getTime() - now) / (1000 * 60 * 60 * 24))
        : null;
      const sentSet  = new Set((r.remindersSent || '').split(',').filter(Boolean));
      const stages   = ['d30', 'd7', 'd3', 'd1', 'd0'];
      const nextStage = stages.find(s => !sentSet.has(s)) ?? null;

      return {
        ...r,
        subscriptionEndsAt: endsAt?.toISOString() ?? null,
        createdAt:          r.createdAt.toISOString(),
        daysLeft,
        remindersSentList:  [...sentSet],
        nextReminderStage:  nextStage,
      };
    });

    return res.json({ reminders: enriched });
  } catch (err) {
    console.error('[GET /reminders]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ─── POST /api/reminders/run ─────────────────────────────────────────────────
router.post('/reminders/run', requireAdmin, async (_req, res) => {
  try {
    console.info('[REMINDERS] Manual trigger by admin');
    const result = await runReminderJob();
    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[POST /reminders/run]', err);
    return res.status(500).json({ error: 'server_error', detail: err?.message });
  }
});

// ─── POST /api/reminders/:id/reset ───────────────────────────────────────────
router.post('/reminders/:id/reset', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params['id'] ?? ''));
    if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });

    const [updated] = await db
      .update(providers)
      .set({ remindersSent: '', updatedAt: new Date() })
      .where(eq(providers.id, id))
      .returning({ id: providers.id, remindersSent: providers.remindersSent });

    if (!updated) return res.status(404).json({ error: 'not_found' });
    return res.json({ success: true, provider: updated });
  } catch (err) {
    console.error('[POST /reminders/:id/reset]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ─── PATCH /api/reminders/:id ────────────────────────────────────────────────
// Admin can manually set subscription end date + billing cycle
router.patch('/reminders/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params['id'] ?? ''));
    if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });

    const { subscriptionEndsAt, billingCycle } = req.body as {
      subscriptionEndsAt?: string;
      billingCycle?: string;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (subscriptionEndsAt) {
      const d = new Date(subscriptionEndsAt);
      if (isNaN(d.getTime())) return res.status(400).json({ error: 'invalid_date' });
      updates['subscriptionEndsAt'] = d;
      updates['remindersSent']      = ''; // reset cycle on date change
    }

    if (billingCycle && ['monthly', 'yearly'].includes(billingCycle)) {
      updates['billingCycle'] = billingCycle;
    }

    const [updated] = await db
      .update(providers)
      .set(updates as any)
      .where(eq(providers.id, id))
      .returning({
        id:                providers.id,
        subscriptionEndsAt: providers.subscriptionEndsAt,
        billingCycle:      providers.billingCycle,
        remindersSent:     providers.remindersSent,
      });

    if (!updated) return res.status(404).json({ error: 'not_found' });
    return res.json({ success: true, provider: updated });
  } catch (err) {
    console.error('[PATCH /reminders/:id]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
