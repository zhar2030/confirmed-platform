/**
 * WhatsApp appointment reminders.
 * Runs every 15 minutes via node-cron.
 * Sends reminders 24h and 1h before each booking with interactive action buttons.
 * Simple retry mechanism: up to 3 attempts tracked in booking.reminder_attempts.
 */

import cron from 'node-cron';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { WhatsAppClient } from './whatsappClient';
import { decrypt } from './encryption';

const MAX_ATTEMPTS = 3;

async function sendReminderForBooking(booking: any, hoursAhead: number): Promise<boolean> {
  // Find the salon's active WhatsApp number
  const phoneRes = await db.execute(sql`
    SELECT * FROM whatsapp_phone_numbers
    WHERE provider_id = ${booking.provider_id} AND is_active = true AND is_primary = true
    LIMIT 1
  `);
  if (phoneRes.rows.length === 0) return false;

  const phone  = phoneRes.rows[0] as any;
  const client = new WhatsAppClient(phone.phone_number_id, decrypt(phone.system_user_token));

  const clientPhone = booking.client_phone as string | null;
  if (!clientPhone) return false;

  // Normalise to WhatsApp format (remove + and spaces)
  const waTo = clientPhone.replace(/\D/g, '');
  if (!waTo || waTo.length < 7) return false;

  const lang: 'ar' | 'en' = 'ar'; // Default; per-conversation lang isn't available at reminder time

  const dateStr = booking.date as string;
  const time    = booking.time as string;
  const service = booking.service_name as string ?? '';

  const when = hoursAhead === 24
    ? (lang === 'ar' ? 'غداً' : 'tomorrow')
    : (lang === 'ar' ? 'خلال ساعة' : 'in 1 hour');

  const body = lang === 'ar'
    ? `⏰ *تذكير بموعدك*\n\n` +
      `لديكِ موعد *${when}*!\n` +
      `📅 التاريخ: ${dateStr}\n` +
      `🕐 الوقت: ${time}\n` +
      `💆 الخدمة: ${service}\n\n` +
      `ماذا تودين فعله؟`
    : `⏰ *Appointment Reminder*\n\n` +
      `You have an appointment *${when}*!\n` +
      `📅 Date: ${dateStr}\n` +
      `🕐 Time: ${time}\n` +
      `💆 Service: ${service}\n\n` +
      `What would you like to do?`;

  const result = await client.send(waTo, {
    type:    'buttons',
    body,
    buttons: [
      { id: `confirm_reminder_${booking.id}`, title: lang === 'ar' ? '✅ تأكيد حضور' : '✅ Confirm' },
      { id: `reschedule_${booking.id}`,       title: lang === 'ar' ? '📅 إعادة جدولة' : '📅 Reschedule' },
      { id: `cancel_reminder_${booking.id}`,  title: lang === 'ar' ? '❌ إلغاء'       : '❌ Cancel' },
    ],
  });

  return result.ok;
}

export async function runWhatsAppReminderJob(): Promise<{ sent: number; failed: number }> {
  let sent   = 0;
  let failed = 0;

  try {
    // ── 24-hour reminders ────────────────────────────────────────────────────
    const in24h = await db.execute(sql`
      SELECT b.id, b.provider_id, b.client_phone, b.service_name, b.date::text, b.time,
             b.reminder_attempts
      FROM bookings b
      INNER JOIN whatsapp_phone_numbers w ON w.provider_id = b.provider_id AND w.is_active = true
      WHERE b.status NOT IN ('cancelled')
        AND b.date = CURRENT_DATE + INTERVAL '1 day'
        AND b.time::time BETWEEN NOW()::time AND (NOW() + INTERVAL '25 hours')::time
        AND b.reminder_24h_sent_at IS NULL
        AND b.reminder_attempts < ${MAX_ATTEMPTS}
        AND b.client_phone IS NOT NULL
    `);

    for (const row of in24h.rows) {
      const ok = await sendReminderForBooking(row, 24);
      if (ok) {
        await db.execute(sql`
          UPDATE bookings SET reminder_24h_sent_at = NOW()
          WHERE id = ${(row as any).id}
        `);
        sent++;
      } else {
        await db.execute(sql`
          UPDATE bookings SET reminder_attempts = reminder_attempts + 1
          WHERE id = ${(row as any).id}
        `);
        failed++;
      }
    }

    // ── 1-hour reminders ─────────────────────────────────────────────────────
    const in1h = await db.execute(sql`
      SELECT b.id, b.provider_id, b.client_phone, b.service_name, b.date::text, b.time,
             b.reminder_attempts
      FROM bookings b
      INNER JOIN whatsapp_phone_numbers w ON w.provider_id = b.provider_id AND w.is_active = true
      WHERE b.status NOT IN ('cancelled')
        AND b.date = CURRENT_DATE
        AND b.time::time BETWEEN (NOW()::time + INTERVAL '55 minutes')
                              AND (NOW()::time + INTERVAL '75 minutes')
        AND b.reminder_1h_sent_at IS NULL
        AND b.reminder_attempts < ${MAX_ATTEMPTS}
        AND b.client_phone IS NOT NULL
    `);

    for (const row of in1h.rows) {
      const ok = await sendReminderForBooking(row, 1);
      if (ok) {
        await db.execute(sql`
          UPDATE bookings SET reminder_1h_sent_at = NOW()
          WHERE id = ${(row as any).id}
        `);
        sent++;
      } else {
        await db.execute(sql`
          UPDATE bookings SET reminder_attempts = reminder_attempts + 1
          WHERE id = ${(row as any).id}
        `);
        failed++;
      }
    }
  } catch (err: any) {
    console.error('[WhatsApp Reminders] Job error:', err?.message);
  }

  return { sent, failed };
}

let reminderStarted = false;

export function startWhatsAppReminderScheduler(): void {
  if (reminderStarted) return;
  reminderStarted = true;

  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const { sent, failed } = await runWhatsAppReminderJob();
      if (sent > 0 || failed > 0) {
        console.info(`[WhatsApp Reminders] ✅ ${sent} sent, ${failed} failed`);
      }
    } catch (err: any) {
      console.error('[WhatsApp Reminders] Scheduler error:', err?.message);
    }
  });

  console.info('[WhatsApp Reminders] ✅ Reminder scheduler started (every 15 min)');
}
