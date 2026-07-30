/**
 * Daily scheduler — runs reminder jobs at 9:00 AM Riyadh time (UTC+3 = 06:00 UTC).
 * Uses node-cron for reliable scheduling.
 */

import cron from 'node-cron';
import { runReminderJob } from './subscriptionReminder';

let started = false;

export function startScheduler(): void {
  if (started) return;
  started = true;

  // ── Daily at 09:00 Riyadh time (06:00 UTC) ──
  // Cron: minute hour day month weekday
  cron.schedule('0 6 * * *', async () => {
    console.info('[SCHEDULER] ▶ Daily reminder job starting...');
    try {
      const { sent, errors } = await runReminderJob();
      console.info(`[SCHEDULER] ✅ Reminder job complete — ${sent} sent, ${errors} errors`);
    } catch (err: any) {
      console.error('[SCHEDULER] ❌ Reminder job failed:', err?.message);
    }
  }, {
    timezone: 'UTC',
  });

  console.info('[SCHEDULER] ✅ Daily reminder job scheduled — runs 09:00 Riyadh (06:00 UTC)');

  // Also run once shortly after startup (in dev only), with a delay
  if (process.env['NODE_ENV'] !== 'production') {
    setTimeout(async () => {
      console.info('[SCHEDULER] Running startup reminder check (dev mode)...');
      try {
        await runReminderJob();
      } catch (err: any) {
        console.warn('[SCHEDULER] Startup check failed:', err?.message);
      }
    }, 10_000); // 10s after boot
  }
}
