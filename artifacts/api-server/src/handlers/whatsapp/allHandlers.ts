/**
 * WhatsApp conversation state handlers — all flows.
 * Each class handles ONE state. Register all of them via registerAll().
 *
 * Adding a new flow (loyalty, gift cards, etc.) = add a new class + register it.
 * The ConversationEngine and existing handlers are never modified.
 */

import { db } from '../../lib/db';
import { sql } from 'drizzle-orm';
import { registerHandler, logMessage } from '../../lib/conversationEngine';
import { WhatsAppClient } from '../../lib/whatsappClient';
import { decrypt } from '../../lib/encryption';
import { t } from '../../lib/languageDetector';
import type {
  ConversationRecord,
  IncomingMessage,
  StateHandler,
  StateTransition,
  WhatsAppPhone,
  ServiceRow,
  StaffRow,
  BookingRow,
} from '../../lib/whatsappTypes';

// ── Shared helpers ────────────────────────────────────────────────────────────

function client(phone: WhatsAppPhone): WhatsAppClient {
  return new WhatsAppClient(phone.phone_number_id, decrypt(phone.system_user_token));
}

function pickId(msg: IncomingMessage): string | null {
  return (
    msg.interactive?.button_reply?.id ??
    msg.interactive?.list_reply?.id ??
    msg.button?.payload ??
    msg.text?.trim() ??
    null
  );
}

async function getProviderName(providerId: number): Promise<string> {
  try {
    const r = await db.execute(sql`SELECT name FROM providers WHERE id = ${providerId} LIMIT 1`);
    return (r.rows[0] as any)?.name ?? '';
  } catch { return ''; }
}

async function getServices(providerId: number): Promise<ServiceRow[]> {
  const r = await db.execute(sql`
    SELECT id::text, name_ar, name_en, price, duration, category_ar, is_active
    FROM provider_services
    WHERE provider_id = ${providerId} AND is_active = true
    ORDER BY sort_order ASC, id ASC
  `);
  return r.rows.map((s: any) => ({
    id:       String(s.id),
    nameAr:   s.name_ar,
    nameEn:   s.name_en,
    price:    Number(s.price),
    duration: Number(s.duration),
    category: s.category_ar ?? '',
    isActive: s.is_active,
  }));
}

async function getActiveStaff(providerId: number): Promise<StaffRow[]> {
  const r = await db.execute(sql`
    SELECT id, name, role
    FROM staff
    WHERE provider_id = ${providerId} AND is_active = true
    ORDER BY name ASC
  `);
  return r.rows.map((s: any) => ({ id: s.id, name: s.name, role: s.role ?? '', isActive: true }));
}

async function getUpcomingBookings(providerId: number, waFrom: string): Promise<BookingRow[]> {
  // Try to match client by phone (wa_from is "9665XXXXXXXX" format)
  const cleaned = waFrom.replace(/\D/g, '');
  const r = await db.execute(sql`
    SELECT id::text, client_name, service_name, date::text, time, status
    FROM bookings
    WHERE provider_id = ${providerId}
      AND date >= CURRENT_DATE
      AND status NOT IN ('cancelled')
      AND (
        client_phone LIKE ${'%' + cleaned.slice(-9)}
        OR client_phone = ${'+' + cleaned}
        OR client_phone = ${cleaned}
      )
    ORDER BY date ASC, time ASC
    LIMIT 5
  `);
  return r.rows.map((b: any) => ({
    id:          String(b.id),
    clientName:  b.client_name,
    serviceName: b.service_name ?? '',
    date:        b.date,
    time:        b.time,
    status:      b.status,
  }));
}

function timeToMin(t: string): number {
  const [h = 0, m = 0] = t.split(':').map(Number);
  return h * 60 + m;
}

function minToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

async function getAvailableSlots(
  providerId: number,
  date: string,
  staffId: number | null,
  duration: number,
): Promise<string[]> {
  const OPEN = 9 * 60;   // 09:00
  const CLOSE = 21 * 60; // 21:00

  // Fetch booked slots
  const where = staffId
    ? sql`provider_id = ${providerId} AND date = ${date}::date AND staff_id = ${staffId} AND status != 'cancelled'`
    : sql`provider_id = ${providerId} AND date = ${date}::date AND status != 'cancelled'`;

  const r = await db.execute(sql`
    SELECT time, duration FROM bookings WHERE ${where}
  `);

  const busy = r.rows.map((b: any) => ({
    start: timeToMin(b.time),
    end:   timeToMin(b.time) + Number(b.duration),
  }));

  const slots: string[] = [];
  for (let start = OPEN; start + duration <= CLOSE; start += 30) {
    const end = start + duration;
    const conflict = busy.some(b => start < b.end && end > b.start);
    if (!conflict) slots.push(minToTime(start));
  }
  return slots;
}

function formatDate(dateStr: string, lang: 'ar' | 'en'): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  } catch { return dateStr; }
}

// ── Next 7 days helper ────────────────────────────────────────────────────────
function next7Days(): Array<{ label: string; value: string }> {
  const days: Array<{ label: string; value: string }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const value = d.toISOString().split('T')[0]!;
    const label = i === 0
      ? 'اليوم / Today'
      : i === 1
        ? 'غداً / Tomorrow'
        : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    days.push({ label, value });
  }
  return days;
}

// ─────────────────────────────────────────────────────────────────────────────
// GREETING  →  send welcome + main menu  →  MENU
// ─────────────────────────────────────────────────────────────────────────────
class GreetingHandler implements StateHandler {
  readonly state = 'GREETING' as const;

  async handle(conv: ConversationRecord, msg: IncomingMessage, phone: WhatsAppPhone): Promise<StateTransition> {
    const lang = conv.lang;
    const name = await getProviderName(conv.provider_id);
    const c    = client(phone);

    const greeting = lang === 'ar'
      ? `مرحباً بك في *${name}* 💇‍♀️\nكيف يمكننا مساعدتك اليوم؟`
      : `Welcome to *${name}* 💇‍♀️\nHow can we help you today?`;

    const r = await c.send(conv.wa_from, {
      type:        'list',
      body:        greeting,
      buttonLabel: lang === 'ar' ? 'اختر خدمة' : 'Choose',
      sections: [{
        rows: [
          { id: 'book',    title: lang === 'ar' ? '📅 حجز موعد'    : '📅 Book Appointment' },
          { id: 'modify',  title: lang === 'ar' ? '✏️ تعديل موعد'  : '✏️ Modify Booking' },
          { id: 'cancel',  title: lang === 'ar' ? '❌ إلغاء موعد'  : '❌ Cancel Booking' },
          { id: 'inquiry', title: lang === 'ar' ? '💬 استفسار'     : '💬 Inquiry' },
        ],
      }],
    });

    await logMessage(conv.id, 'out', 'list', { text: greeting }, { waMessageId: r.messageId });
    return { nextState: 'MENU' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU  →  route selection  →  SERVICE_SELECT | MODIFY_PICK | CANCEL_PICK | INQUIRY
// ─────────────────────────────────────────────────────────────────────────────
class MenuHandler implements StateHandler {
  readonly state = 'MENU' as const;

  async handle(conv: ConversationRecord, msg: IncomingMessage, phone: WhatsAppPhone): Promise<StateTransition> {
    const id   = pickId(msg)?.toLowerCase() ?? '';
    const lang = conv.lang;
    const c    = client(phone);

    if (id === 'book' || id === '1' || id === 'حجز') {
      // Send service list immediately then transition
      return new ServiceSelectHandler().sendServiceList(conv, phone, c);
    }

    if (id === 'modify' || id === '2' || id === 'تعديل') {
      return new ModifyPickHandler().sendBookingList(conv, phone, c);
    }

    if (id === 'cancel' || id === '3' || id === 'إلغاء' || id === 'الغاء') {
      return new CancelPickHandler().sendBookingList(conv, phone, c);
    }

    if (id === 'inquiry' || id === '4' || id === 'استفسار') {
      const prompt = t('أكتب استفسارك وسنرد عليك قريباً 💬', 'Type your inquiry and we\'ll get back to you soon 💬', lang);
      const r = await c.send(conv.wa_from, { type: 'text', text: prompt });
      await logMessage(conv.id, 'out', 'text', { text: prompt }, { waMessageId: r.messageId });
      return { nextState: 'INQUIRY' };
    }

    // Invalid → re-send greeting
    return new GreetingHandler().handle(conv, msg, phone);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE_SELECT  →  show services list  →  STAFF_SELECT
// ─────────────────────────────────────────────────────────────────────────────
class ServiceSelectHandler implements StateHandler {
  readonly state = 'SERVICE_SELECT' as const;

  async sendServiceList(
    conv: ConversationRecord,
    phone: WhatsAppPhone,
    c: WhatsAppClient,
  ): Promise<StateTransition> {
    const lang     = conv.lang;
    const services = await getServices(conv.provider_id);

    if (services.length === 0) {
      const msg = t('لا توجد خدمات متاحة حالياً. أرسل "مرحبا" للعودة.', 'No services available right now. Send "Hi" to go back.', lang);
      await c.send(conv.wa_from, { type: 'text', text: msg });
      return { nextState: 'MENU' };
    }

    // Group by category
    const catMap = new Map<string, ServiceRow[]>();
    for (const svc of services) {
      const cat = svc.category || (lang === 'ar' ? 'خدمات' : 'Services');
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(svc);
    }

    const sections = [...catMap.entries()].slice(0, 10).map(([cat, svcs]) => ({
      title: cat,
      rows:  svcs.slice(0, 10).map(s => ({
        id:          `svc_${s.id}`,
        title:       (lang === 'ar' ? s.nameAr : s.nameEn).slice(0, 24),
        // Price intentionally omitted — financial details stay in the platform, not WhatsApp
        description: lang === 'ar' ? `مدة: ${s.duration} دقيقة` : `Duration: ${s.duration} min`,
      })),
    }));

    const header = t('اختاري الخدمة', 'Choose a Service', lang);
    const r = await c.send(conv.wa_from, {
      type:        'list',
      header,
      body:        t('ما هي الخدمة التي تودين حجزها؟', 'Which service would you like to book?', lang),
      buttonLabel: t('عرض الخدمات', 'View Services', lang),
      sections,
    });
    await logMessage(conv.id, 'out', 'list', { header }, { waMessageId: r.messageId });
    return { nextState: 'SERVICE_SELECT' };
  }

  async handle(conv: ConversationRecord, msg: IncomingMessage, phone: WhatsAppPhone): Promise<StateTransition> {
    const id   = pickId(msg) ?? '';
    const lang = conv.lang;
    const c    = client(phone);

    if (!id.startsWith('svc_')) {
      // Invalid selection → re-send list
      return this.sendServiceList(conv, phone, c);
    }

    const serviceId = id.replace('svc_', '');
    const services  = await getServices(conv.provider_id);
    const svc       = services.find(s => s.id === serviceId);

    if (!svc) return this.sendServiceList(conv, phone, c);

    // Store service, immediately send staff list
    const contextUpdates = {
      serviceId:       svc.id,
      serviceName:     lang === 'ar' ? svc.nameAr : svc.nameEn,
      servicePrice:    svc.price,
      serviceDuration: svc.duration,
    };

    return new StaffSelectHandler().sendStaffList(
      { ...conv, context: { ...conv.context, ...contextUpdates } },
      phone, c, contextUpdates,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF_SELECT  →  show staff + "any available"  →  DATE_SELECT
// ─────────────────────────────────────────────────────────────────────────────
class StaffSelectHandler implements StateHandler {
  readonly state = 'STAFF_SELECT' as const;

  async sendStaffList(
    conv: ConversationRecord,
    phone: WhatsAppPhone,
    c: WhatsAppClient,
    contextUpdates?: Record<string, unknown>,
  ): Promise<StateTransition> {
    const lang  = conv.lang;
    const staff = await getActiveStaff(conv.provider_id);

    const rows = [
      { id: 'staff_any', title: t('💆 أي موظفة متاحة', '💆 Any Available Staff', lang) },
      ...staff.map(s => ({ id: `staff_${s.id}`, title: s.name.slice(0, 24) })),
    ];

    const r = await c.send(conv.wa_from, {
      type:        'list',
      header:      t('اختاري الموظفة', 'Choose Staff', lang),
      body:        t('من تفضلين؟', 'Who would you prefer?', lang),
      buttonLabel: t('عرض الموظفات', 'View Staff', lang),
      sections:    [{ rows }],
    });
    await logMessage(conv.id, 'out', 'list', { header: 'staff' }, { waMessageId: r.messageId });
    return { nextState: 'STAFF_SELECT', contextUpdates };
  }

  async handle(conv: ConversationRecord, msg: IncomingMessage, phone: WhatsAppPhone): Promise<StateTransition> {
    const id   = pickId(msg) ?? '';
    const lang = conv.lang;
    const c    = client(phone);

    if (!id.startsWith('staff_')) return this.sendStaffList(conv, phone, c);

    let staffId:   string | null = null;
    let staffName: string        = t('أي موظفة متاحة', 'Any Available Staff', lang);

    if (id !== 'staff_any') {
      const numId = id.replace('staff_', '');
      const staff = await getActiveStaff(conv.provider_id);
      const found = staff.find(s => String(s.id) === numId);
      if (!found) return this.sendStaffList(conv, phone, c);
      staffId   = numId;
      staffName = found.name;
    }

    const contextUpdates = { staffId, staffName };
    return new DateSelectHandler().sendDateList(
      { ...conv, context: { ...conv.context, ...contextUpdates } },
      phone, c, contextUpdates,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE_SELECT  →  next 7 days  →  TIME_SELECT
// ─────────────────────────────────────────────────────────────────────────────
class DateSelectHandler implements StateHandler {
  readonly state = 'DATE_SELECT' as const;

  async sendDateList(
    conv: ConversationRecord,
    phone: WhatsAppPhone,
    c: WhatsAppClient,
    contextUpdates?: Record<string, unknown>,
  ): Promise<StateTransition> {
    const lang = conv.lang;
    const days = next7Days();

    const r = await c.send(conv.wa_from, {
      type:        'list',
      header:      t('اختاري التاريخ', 'Choose a Date', lang),
      body:        t('متى تريدين الحجز؟', 'When would you like to book?', lang),
      buttonLabel: t('عرض التواريخ', 'View Dates', lang),
      sections: [{
        rows: days.map(d => ({ id: `date_${d.value}`, title: d.label })),
      }],
    });
    await logMessage(conv.id, 'out', 'list', { header: 'date' }, { waMessageId: r.messageId });
    return { nextState: 'DATE_SELECT', contextUpdates };
  }

  async handle(conv: ConversationRecord, msg: IncomingMessage, phone: WhatsAppPhone): Promise<StateTransition> {
    const id   = pickId(msg) ?? '';
    const lang = conv.lang;
    const c    = client(phone);

    if (!id.startsWith('date_')) return this.sendDateList(conv, phone, c);

    const date     = id.replace('date_', '');
    const duration = conv.context.serviceDuration ?? 60;
    const staffNum = conv.context.staffId ? parseInt(conv.context.staffId, 10) : null;
    const slots    = await getAvailableSlots(conv.provider_id, date, staffNum, duration);

    if (slots.length === 0) {
      const noSlots = t(
        `لا توجد مواعيد متاحة في ${formatDate(date, lang)}. اختاري تاريخاً آخر.`,
        `No slots available on ${formatDate(date, lang)}. Please choose another date.`,
        lang,
      );
      await c.send(conv.wa_from, { type: 'text', text: noSlots });
      return this.sendDateList(conv, phone, c, { date });
    }

    const contextUpdates = { date };
    return new TimeSelectHandler().sendTimeList(
      { ...conv, context: { ...conv.context, ...contextUpdates } },
      phone, c, slots, contextUpdates,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIME_SELECT  →  available slots  →  BOOKING_CONFIRM
// ─────────────────────────────────────────────────────────────────────────────
class TimeSelectHandler implements StateHandler {
  readonly state = 'TIME_SELECT' as const;

  async sendTimeList(
    conv: ConversationRecord,
    phone: WhatsAppPhone,
    c: WhatsAppClient,
    slots: string[],
    contextUpdates?: Record<string, unknown>,
  ): Promise<StateTransition> {
    const lang = conv.lang;

    // Split into AM/PM sections
    const amSlots = slots.filter(s => parseInt(s) < 12);
    const pmSlots = slots.filter(s => parseInt(s) >= 12);

    const sections: Array<{ title?: string; rows: Array<{ id: string; title: string }> }> = [];
    if (amSlots.length > 0) {
      sections.push({
        title: t('صباحاً', 'Morning', lang),
        rows:  amSlots.slice(0, 10).map(s => ({ id: `time_${s}`, title: s })),
      });
    }
    if (pmSlots.length > 0) {
      sections.push({
        title: t('مساءً', 'Afternoon / Evening', lang),
        rows:  pmSlots.slice(0, 10).map(s => ({ id: `time_${s}`, title: s })),
      });
    }

    const r = await c.send(conv.wa_from, {
      type:        'list',
      header:      t('اختاري الوقت', 'Choose a Time', lang),
      body:        t('ما هو الوقت المناسب لك؟', 'What time suits you?', lang),
      buttonLabel: t('عرض الأوقات', 'View Times', lang),
      sections,
    });
    await logMessage(conv.id, 'out', 'list', { header: 'time' }, { waMessageId: r.messageId });
    return { nextState: 'TIME_SELECT', contextUpdates };
  }

  async handle(conv: ConversationRecord, msg: IncomingMessage, phone: WhatsAppPhone): Promise<StateTransition> {
    const id   = pickId(msg) ?? '';
    const lang = conv.lang;
    const c    = client(phone);

    if (!id.startsWith('time_')) {
      // Re-fetch slots and resend
      const duration = conv.context.serviceDuration ?? 60;
      const staffNum = conv.context.staffId ? parseInt(conv.context.staffId, 10) : null;
      const date     = conv.context.date ?? '';
      const slots    = await getAvailableSlots(conv.provider_id, date, staffNum, duration);
      return this.sendTimeList(conv, phone, c, slots);
    }

    const time           = id.replace('time_', '');
    const contextUpdates = { time };
    // After time is selected, collect the client's full name before confirming
    return new NameCollectHandler().sendPrompt(
      { ...conv, context: { ...conv.context, ...contextUpdates } },
      phone, c, contextUpdates,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NAME_COLLECT  →  ask for client's full name  →  BOOKING_CONFIRM
// Phone is already known from wa_from; name is the only missing CRM field.
// ─────────────────────────────────────────────────────────────────────────────
class NameCollectHandler implements StateHandler {
  readonly state = 'NAME_COLLECT' as const;

  async sendPrompt(
    conv: ConversationRecord,
    phone: WhatsAppPhone,
    c: WhatsAppClient,
    contextUpdates?: Record<string, unknown>,
  ): Promise<StateTransition> {
    const lang   = conv.lang;
    const prompt = lang === 'ar'
      ? '👤 من فضلك أكتبي *اسمك الكامل* لتأكيد الحجز:'
      : '👤 Please type your *full name* to complete the booking:';

    const r = await c.send(conv.wa_from, { type: 'text', text: prompt });
    await logMessage(conv.id, 'out', 'text', { text: prompt }, { waMessageId: r.messageId });
    return { nextState: 'NAME_COLLECT', contextUpdates };
  }

  async handle(conv: ConversationRecord, msg: IncomingMessage, phone: WhatsAppPhone): Promise<StateTransition> {
    const lang     = conv.lang;
    const c        = client(phone);
    const rawName  = (msg.text ?? '').trim();

    // Require at least 2 characters
    if (rawName.length < 2) {
      const retry = lang === 'ar'
        ? '⚠️ يرجى كتابة اسمك الكامل (حرفان على الأقل):'
        : '⚠️ Please enter your full name (at least 2 characters):';
      const r = await c.send(conv.wa_from, { type: 'text', text: retry });
      await logMessage(conv.id, 'out', 'text', { text: retry }, { waMessageId: r.messageId });
      return { nextState: 'NAME_COLLECT' };
    }

    const contextUpdates = { clientName: rawName };
    return new BookingConfirmHandler().sendSummary(
      { ...conv, context: { ...conv.context, ...contextUpdates } },
      phone, c, contextUpdates,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING_CONFIRM  →  CRM summary (no financial data) + confirm/back  →  COMPLETED | GREETING
// ─────────────────────────────────────────────────────────────────────────────
class BookingConfirmHandler implements StateHandler {
  readonly state = 'BOOKING_CONFIRM' as const;

  async sendSummary(
    conv: ConversationRecord,
    phone: WhatsAppPhone,
    c: WhatsAppClient,
    contextUpdates?: Record<string, unknown>,
  ): Promise<StateTransition> {
    const lang = conv.lang;
    const ctx  = { ...conv.context, ...contextUpdates };

    // ── Booking summary — CRM fields only; financial details stay in the platform ──
    const clientPhone = '+' + conv.wa_from.replace(/\D/g, '');
    const summary = lang === 'ar'
      ? `📋 *تفاصيل الموعد*\n\n` +
        `👤 الاسم: ${ctx.clientName ?? '—'}\n` +
        `📱 الجوال: ${clientPhone}\n` +
        `💆 الخدمة: ${ctx.serviceName ?? '—'}\n` +
        `👩 الموظفة: ${ctx.staffName ?? '—'}\n` +
        `📅 التاريخ: ${formatDate(ctx.date ?? '', lang)}\n` +
        `🕐 الوقت: ${ctx.time ?? '—'}\n\n` +
        `هل تريدين تأكيد الحجز؟`
      : `📋 *Booking Summary*\n\n` +
        `👤 Name: ${ctx.clientName ?? '—'}\n` +
        `📱 Phone: ${clientPhone}\n` +
        `💆 Service: ${ctx.serviceName ?? '—'}\n` +
        `👩 Staff: ${ctx.staffName ?? '—'}\n` +
        `📅 Date: ${formatDate(ctx.date ?? '', lang)}\n` +
        `🕐 Time: ${ctx.time ?? '—'}\n\n` +
        `Would you like to confirm this booking?`;

    const r = await c.send(conv.wa_from, {
      type:    'buttons',
      body:    summary,
      buttons: [
        { id: 'confirm', title: lang === 'ar' ? '✅ تأكيد'  : '✅ Confirm' },
        { id: 'back',    title: lang === 'ar' ? '↩️ تعديل'  : '↩️ Change' },
      ],
    });
    await logMessage(conv.id, 'out', 'buttons', { text: summary }, { waMessageId: r.messageId });
    return { nextState: 'BOOKING_CONFIRM', contextUpdates };
  }

  async handle(conv: ConversationRecord, msg: IncomingMessage, phone: WhatsAppPhone): Promise<StateTransition> {
    const id   = pickId(msg) ?? '';
    const lang = conv.lang;
    const c    = client(phone);
    const ctx  = conv.context;

    if (id === 'back') {
      return new GreetingHandler().handle(conv, msg, phone);
    }

    if (id !== 'confirm') {
      return this.sendSummary(conv, phone, c);
    }

    // ── Create booking ────────────────────────────────────────────────────────
    try {
      const staffIdInt = ctx.staffId ? parseInt(ctx.staffId, 10) : null;

      // Try to resolve client phone from wa_from
      const clientPhone = '+' + conv.wa_from.replace(/\D/g, '');

      // ── Insert booking: CRM + calendar data only ─────────────────────────────
      // servicePrice stored for the platform's financial system; never shown in WhatsApp.
      // All invoicing, VAT, and payment processing remain in the platform UI.
      await db.execute(sql`
        INSERT INTO bookings
          (provider_id, client_name, client_phone, service_id, service_name,
           staff_id, date, time, duration, price, status, branch_id, source,
           wa_conversation_id)
        VALUES
          (${conv.provider_id},
           ${ctx.clientName || (lang === 'ar' ? 'عميل واتساب' : 'WhatsApp Client')},
           ${clientPhone},
           ${ctx.serviceId ?? null},
           ${ctx.serviceName ?? null},
           ${staffIdInt},
           ${ctx.date ?? null}::date,
           ${ctx.time ?? null},
           ${ctx.serviceDuration ?? 60},
           ${ctx.servicePrice ?? 0},
           'confirmed',
           ${ctx.branchId ?? null},
           'whatsapp',
           ${conv.id})
      `);

      const success = lang === 'ar'
        ? `✅ *تم تأكيد حجزك!*\n\n` +
          `📅 ${formatDate(ctx.date ?? '', lang)}\n` +
          `🕐 ${ctx.time}\n` +
          `💆 ${ctx.serviceName}\n\n` +
          `سنرسل لك تذكيراً قبل موعدك. نتطلع لرؤيتك! 💇‍♀️`
        : `✅ *Booking Confirmed!*\n\n` +
          `📅 ${formatDate(ctx.date ?? '', lang)}\n` +
          `🕐 ${ctx.time}\n` +
          `💆 ${ctx.serviceName}\n\n` +
          `We'll send you a reminder before your appointment. See you soon! 💇‍♀️`;

      const r = await c.send(conv.wa_from, { type: 'text', text: success });
      await logMessage(conv.id, 'out', 'text', { text: success }, { waMessageId: r.messageId });
      return { nextState: 'COMPLETED', contextUpdates: {} };
    } catch (err: any) {
      console.error('[BookingConfirmHandler] DB insert error:', err?.message);
      const errMsg = lang === 'ar'
        ? '❌ تعذّر إنشاء الحجز. يرجى المحاولة مجدداً أو التواصل مع الصالون.'
        : '❌ Could not create booking. Please try again or contact the salon.';
      await c.send(conv.wa_from, { type: 'text', text: errMsg });
      return { nextState: 'BOOKING_CONFIRM' };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MODIFY_PICK  →  show upcoming bookings  →  SERVICE_SELECT (with modifyBookingId)
// ─────────────────────────────────────────────────────────────────────────────
class ModifyPickHandler implements StateHandler {
  readonly state = 'MODIFY_PICK' as const;

  async sendBookingList(
    conv: ConversationRecord,
    phone: WhatsAppPhone,
    c: WhatsAppClient,
  ): Promise<StateTransition> {
    const lang     = conv.lang;
    const bookings = await getUpcomingBookings(conv.provider_id, conv.wa_from);

    if (bookings.length === 0) {
      const none = t('لا توجد مواعيد قادمة. أرسل "مرحبا" للعودة.', 'No upcoming appointments. Send "Hi" to go back.', lang);
      await c.send(conv.wa_from, { type: 'text', text: none });
      return { nextState: 'MENU' };
    }

    const r = await c.send(conv.wa_from, {
      type:        'list',
      header:      t('مواعيدك القادمة', 'Your Upcoming Appointments', lang),
      body:        t('اختاري الموعد الذي تريدين تعديله:', 'Select the appointment you want to modify:', lang),
      buttonLabel: t('عرض المواعيد', 'View Bookings', lang),
      sections: [{
        rows: bookings.map(b => ({
          id:          `mbooking_${b.id}`,
          title:       `${b.date} — ${b.time}`.slice(0, 24),
          description: b.serviceName.slice(0, 72),
        })),
      }],
    });
    await logMessage(conv.id, 'out', 'list', { header: 'modify' }, { waMessageId: r.messageId });
    return { nextState: 'MODIFY_PICK' };
  }

  async handle(conv: ConversationRecord, msg: IncomingMessage, phone: WhatsAppPhone): Promise<StateTransition> {
    const id = pickId(msg) ?? '';
    const c  = client(phone);

    if (!id.startsWith('mbooking_')) return this.sendBookingList(conv, phone, c);

    const bookingId      = id.replace('mbooking_', '');
    const contextUpdates = { modifyBookingId: bookingId };
    // Restart booking flow to pick new service/staff/date/time
    return new ServiceSelectHandler().sendServiceList(
      { ...conv, context: { ...conv.context, ...contextUpdates } },
      phone, c,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL_PICK  →  show upcoming bookings  →  CANCEL_CONFIRM
// ─────────────────────────────────────────────────────────────────────────────
class CancelPickHandler implements StateHandler {
  readonly state = 'CANCEL_PICK' as const;

  async sendBookingList(
    conv: ConversationRecord,
    phone: WhatsAppPhone,
    c: WhatsAppClient,
  ): Promise<StateTransition> {
    const lang     = conv.lang;
    const bookings = await getUpcomingBookings(conv.provider_id, conv.wa_from);

    if (bookings.length === 0) {
      const none = t('لا توجد مواعيد قادمة.', 'No upcoming appointments.', lang);
      await c.send(conv.wa_from, { type: 'text', text: none });
      return { nextState: 'MENU' };
    }

    const r = await c.send(conv.wa_from, {
      type:        'list',
      header:      t('مواعيدك القادمة', 'Your Upcoming Appointments', lang),
      body:        t('اختاري الموعد الذي تريدين إلغاءه:', 'Select the appointment to cancel:', lang),
      buttonLabel: t('عرض المواعيد', 'View Bookings', lang),
      sections: [{
        rows: bookings.map(b => ({
          id:          `cbooking_${b.id}`,
          title:       `${b.date} — ${b.time}`.slice(0, 24),
          description: b.serviceName.slice(0, 72),
        })),
      }],
    });
    await logMessage(conv.id, 'out', 'list', { header: 'cancel' }, { waMessageId: r.messageId });
    return { nextState: 'CANCEL_PICK' };
  }

  async handle(conv: ConversationRecord, msg: IncomingMessage, phone: WhatsAppPhone): Promise<StateTransition> {
    const id   = pickId(msg) ?? '';
    const lang = conv.lang;
    const c    = client(phone);

    if (!id.startsWith('cbooking_')) return this.sendBookingList(conv, phone, c);

    const bookingId      = id.replace('cbooking_', '');
    const contextUpdates = { modifyBookingId: bookingId };

    const r = await c.send(conv.wa_from, {
      type:    'buttons',
      body:    t('هل أنت متأكدة من إلغاء الموعد؟', 'Are you sure you want to cancel?', lang),
      buttons: [
        { id: 'yes_cancel', title: t('✅ نعم، إلغاء', '✅ Yes, Cancel', lang) },
        { id: 'no_cancel',  title: t('↩️ لا، تراجع',  '↩️ No, Go Back', lang) },
      ],
    });
    await logMessage(conv.id, 'out', 'buttons', { text: 'cancel confirm' }, { waMessageId: r.messageId });
    return { nextState: 'CANCEL_CONFIRM', contextUpdates };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL_CONFIRM  →  yes/no  →  COMPLETED | GREETING
// ─────────────────────────────────────────────────────────────────────────────
class CancelConfirmHandler implements StateHandler {
  readonly state = 'CANCEL_CONFIRM' as const;

  async handle(conv: ConversationRecord, msg: IncomingMessage, phone: WhatsAppPhone): Promise<StateTransition> {
    const id   = pickId(msg) ?? '';
    const lang = conv.lang;
    const c    = client(phone);

    if (id !== 'yes_cancel') {
      return new GreetingHandler().handle(conv, msg, phone);
    }

    const bookingId = conv.context.modifyBookingId;
    if (!bookingId) return new GreetingHandler().handle(conv, msg, phone);

    try {
      await db.execute(sql`
        UPDATE bookings SET status = 'cancelled', updated_at = NOW()
        WHERE id = ${parseInt(bookingId, 10)}
          AND provider_id = ${conv.provider_id}
      `);
      const done = t(
        '✅ تم إلغاء موعدك بنجاح. نأمل أن نراك مجدداً! 💇‍♀️',
        '✅ Your appointment has been cancelled. We hope to see you again! 💇‍♀️',
        lang,
      );
      await c.send(conv.wa_from, { type: 'text', text: done });
    } catch {
      const err = t('❌ تعذّر إلغاء الموعد. يرجى التواصل مع الصالون.', '❌ Could not cancel. Please contact the salon.', lang);
      await c.send(conv.wa_from, { type: 'text', text: err });
    }
    return { nextState: 'COMPLETED', contextUpdates: {} };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INQUIRY  →  log free text  →  COMPLETED
// ─────────────────────────────────────────────────────────────────────────────
class InquiryHandler implements StateHandler {
  readonly state = 'INQUIRY' as const;

  async handle(conv: ConversationRecord, msg: IncomingMessage, phone: WhatsAppPhone): Promise<StateTransition> {
    const lang = conv.lang;
    const c    = client(phone);
    const done = t(
      '✅ شكراً! وصل استفساركِ وسنرد عليكِ في أقرب وقت. 🙏',
      '✅ Thank you! Your inquiry has been received. We\'ll get back to you soon. 🙏',
      lang,
    );
    await c.send(conv.wa_from, { type: 'text', text: done });
    return { nextState: 'COMPLETED', contextUpdates: { inquiry: msg.text } };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETED  →  show main menu again
// ─────────────────────────────────────────────────────────────────────────────
class CompletedHandler implements StateHandler {
  readonly state = 'COMPLETED' as const;

  async handle(conv: ConversationRecord, msg: IncomingMessage, phone: WhatsAppPhone): Promise<StateTransition> {
    // Any message after completion → restart with fresh greeting
    return new GreetingHandler().handle({ ...conv, state: 'GREETING', context: {} }, msg, phone);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Register all handlers
// ─────────────────────────────────────────────────────────────────────────────
export function registerAll(): void {
  [
    new GreetingHandler(),
    new MenuHandler(),
    new ServiceSelectHandler(),
    new StaffSelectHandler(),
    new DateSelectHandler(),
    new TimeSelectHandler(),
    new NameCollectHandler(),     // Collects client full name before confirmation
    new BookingConfirmHandler(),
    new ModifyPickHandler(),
    new CancelPickHandler(),
    new CancelConfirmHandler(),
    new InquiryHandler(),
    new CompletedHandler(),
  ].forEach(h => registerHandler(h));
}
