/**
 * Subscription Renewal Reminder System
 * Sends tiered professional email reminders before subscription expiry.
 *
 * Reminder windows: 30 → 7 → 3 → 1 day before expiry, then day-0 (expired).
 * Each window fires exactly once per provider (tracked in `remindersSent`).
 */

import { db, providers } from './db';
import { and, eq, isNotNull, lte, gte, sql } from 'drizzle-orm';

const APP_URL   = process.env['APP_URL']  || 'https://confirmedgrowth.com';
const FROM_NAME = 'CONFIRMED';
const FROM_EMAIL = process.env['FROM_EMAIL'] || 'noreply@confirmedgrowth.com';

// ── Reminder stages ────────────────────────────────────────────────────────────
// Key = days remaining threshold, value = label used in remindersSent tracking
export const REMINDER_STAGES = [
  { days: 30, key: 'd30' },
  { days: 7,  key: 'd7'  },
  { days: 3,  key: 'd3'  },
  { days: 1,  key: 'd1'  },
  { days: 0,  key: 'd0'  }, // expiry day
] as const;

type ReminderKey = (typeof REMINDER_STAGES)[number]['key'];

// ── Email transport (reuse existing service) ────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const RESEND_KEY   = process.env['RESEND_API_KEY'];
  const SENDGRID_KEY = process.env['SENDGRID_API_KEY'];
  const BREVO_KEY    = process.env['BREVO_API_KEY'];
  const IS_PROD      = process.env['NODE_ENV'] === 'production';

  // 1. Resend
  if (RESEND_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to, subject, html }),
    });
    if (res.ok) { console.info(`[REMINDER] Sent via Resend to ${to}`); return; }
    console.warn('[REMINDER] Resend failed:', await res.text());
  }

  // 2. SendGrid
  if (SENDGRID_KEY) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    if (res.ok || res.status === 202) { console.info(`[REMINDER] Sent via SendGrid to ${to}`); return; }
    console.warn('[REMINDER] SendGrid failed:', await res.text());
  }

  // 3. Brevo REST
  if (BREVO_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (res.ok) { console.info(`[REMINDER] Sent via Brevo to ${to}`); return; }
    console.warn('[REMINDER] Brevo failed:', await res.text());
  }

  // 4. Dev fallback
  if (!IS_PROD) {
    console.log(`[DEV REMINDER] To: ${to} | Subject: ${subject}`);
    return;
  }

  throw new Error(`[REMINDER] All transports failed for ${to}`);
}

// ── Send reminder email ────────────────────────────────────────────────────────
export async function sendRenewalReminder(
  provider: { email: string; nameAr: string; subscriptionTier: string; subscriptionEndsAt: Date },
  stage: ReminderKey,
): Promise<void> {
  const daysLeft = Math.ceil(
    (provider.subscriptionEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  const { subject, html } = buildReminderEmail(provider, stage, daysLeft);
  await sendEmail(provider.email, subject, html);
}

// ── Daily reminder job ─────────────────────────────────────────────────────────
export async function runReminderJob(): Promise<{ sent: number; errors: number }> {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // midnight local

  // Fetch all active providers with a subscriptionEndsAt set
  const rows = await db
    .select({
      id:                providers.id,
      email:             providers.email,
      nameAr:            providers.nameAr,
      subscriptionTier:  providers.subscriptionTier,
      subscriptionEndsAt: providers.subscriptionEndsAt,
      remindersSent:     providers.remindersSent,
      status:            providers.status,
    })
    .from(providers)
    .where(
      and(
        isNotNull(providers.subscriptionEndsAt),
        // Only remind active/trial providers (not suspended/deleted)
        sql`${providers.status} IN ('active','trial')`,
        // Don't send reminders more than 31 days in advance
        lte(providers.subscriptionEndsAt, sql`NOW() + INTERVAL '31 days'`),
        // Don't send for already-expired-by-more-than-1-day (except d0)
        gte(providers.subscriptionEndsAt, sql`NOW() - INTERVAL '1 day'`),
      ),
    );

  let sent = 0;
  let errors = 0;

  for (const row of rows) {
    if (!row.subscriptionEndsAt) continue;

    const msLeft   = row.subscriptionEndsAt.getTime() - today.getTime();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24)); // positive = future

    const alreadySent = new Set((row.remindersSent || '').split(',').filter(Boolean));

    for (const stage of REMINDER_STAGES) {
      // Match: daysLeft <= stage.days AND stage not yet sent
      if (daysLeft <= stage.days && !alreadySent.has(stage.key)) {
        try {
          await sendRenewalReminder(
            {
              email:             row.email,
              nameAr:            row.nameAr,
              subscriptionTier:  row.subscriptionTier,
              subscriptionEndsAt: row.subscriptionEndsAt,
            },
            stage.key,
          );

          // Mark this stage as sent
          alreadySent.add(stage.key);
          await db.update(providers)
            .set({
              remindersSent: [...alreadySent].join(','),
              updatedAt: new Date(),
            })
            .where(eq(providers.id, row.id));

          sent++;
          console.info(`[REMINDER] ✅ ${stage.key} sent to ${row.email} (${daysLeft}d left)`);
        } catch (err: any) {
          errors++;
          console.error(`[REMINDER] ❌ Failed ${stage.key} for ${row.email}:`, err?.message);
        }
        break; // send only the most urgent unsent stage per run
      }
    }
  }

  console.info(`[REMINDER JOB] Done — ${sent} sent, ${errors} errors, ${rows.length} providers checked`);
  return { sent, errors };
}

// ── HTML Email Templates ───────────────────────────────────────────────────────

const TIER_LABEL: Record<string, string> = {
  basic:      'الأساسية',
  pro:        'الاحترافية',
  enterprise: 'المؤسسية',
};

function buildReminderEmail(
  provider: { nameAr: string; subscriptionTier: string; subscriptionEndsAt: Date },
  stage: ReminderKey,
  daysLeft: number,
): { subject: string; html: string } {

  const tierLabel = TIER_LABEL[provider.subscriptionTier] || provider.subscriptionTier;
  const expiryDate = provider.subscriptionEndsAt.toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const renewUrl = `${APP_URL}/?renew=1`;

  const configs: Record<ReminderKey, {
    subject: string;
    headerBg: string;
    urgencyBg: string;
    urgencyBorder: string;
    urgencyText: string;
    urgencyIcon: string;
    headline: string;
    subline: string;
    body: string;
    btnLabel: string;
    btnBg: string;
    urgencyLabel: string;
  }> = {
    d30: {
      subject:       `تذكير ودي: اشتراكك ينتهي بعد 30 يوماً — CONFIRMED`,
      headerBg:      '#0F1923',
      urgencyBg:     '#EFF6FF',
      urgencyBorder: '#BFDBFE',
      urgencyText:   '#1E40AF',
      urgencyIcon:   '📅',
      urgencyLabel:  '30 يوماً متبقية',
      headline:      'اشتراكك يقترب من نهايته',
      subline:       'لديك وقت كافٍ — جدّدي الآن واستمتعي بالاستمرارية',
      body: `
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.9">
          مرحباً <strong style="color:#0F1923">${provider.nameAr}</strong>،
        </p>
        <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.9">
          أردنا تذكيرك بأن اشتراك باقتك <strong>${tierLabel}</strong> سينتهي في
          <strong style="color:#0F1923">${expiryDate}</strong>.
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#4B5563;line-height:1.9">
          الآن هو الوقت المثالي للتجديد المبكر — احتفظي بجميع بياناتك وسجل عملائك
          وجدولة المواعيد دون أي انقطاع.
        </p>`,
      btnLabel: 'جدّدي اشتراكك الآن',
      btnBg:    '#0F1923',
    },
    d7: {
      subject:       `⚠️ أسبوع واحد فقط — اشتراكك ينتهي قريباً`,
      headerBg:      '#0F1923',
      urgencyBg:     '#FFFBEB',
      urgencyBorder: '#FCD34D',
      urgencyText:   '#92400E',
      urgencyIcon:   '⏳',
      urgencyLabel:  '7 أيام متبقية',
      headline:      'لم يتبق سوى أسبوع واحد',
      subline:       'جدّدي اشتراكك قبل أن تفوتك الميزات',
      body: `
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.9">
          مرحباً <strong style="color:#0F1923">${provider.nameAr}</strong>،
        </p>
        <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.9">
          باقتك <strong>${tierLabel}</strong> ستنتهي في <strong style="color:#D97706">${expiryDate}</strong>
          — أي بعد <strong>7 أيام فقط</strong>.
        </p>
        <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.9">
          عند انتهاء الاشتراك ستفقدين الوصول إلى:
        </p>
        <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px">
          ${['إدارة الحجوزات وجدول المواعيد','سجل العملاء والبيانات التحليلية','الفواتير والتقارير المالية','الوصول لبوابة الحجز الإلكتروني'].map(f =>
            `<tr><td style="padding:6px 0;font-size:13px;color:#374151">
              <span style="color:#D97706;margin-left:8px">✦</span>${f}
            </td></tr>`
          ).join('')}
        </table>`,
      btnLabel: 'جدّدي الآن — 7 أيام',
      btnBg:    '#D97706',
    },
    d3: {
      subject:       `🚨 عاجل: اشتراكك ينتهي بعد 3 أيام`,
      headerBg:      '#7C2D12',
      urgencyBg:     '#FEF2F2',
      urgencyBorder: '#FECACA',
      urgencyText:   '#991B1B',
      urgencyIcon:   '🚨',
      urgencyLabel:  '3 أيام فقط',
      headline:      '3 أيام حتى انتهاء اشتراكك',
      subline:       'إجراء فوري مطلوب للحفاظ على عملك',
      body: `
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.9">
          <strong style="color:#0F1923">${provider.nameAr}</strong>،
        </p>
        <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.9">
          اشتراكك في باقة <strong>${tierLabel}</strong> سينتهي يوم <strong style="color:#DC2626">${expiryDate}</strong>.
          بعد هذا التاريخ <strong>لن تتمكني من الوصول إلى لوحة التحكم</strong>، ولن تتمكن عميلاتك من حجز المواعيد عبر الإنترنت.
        </p>
        <div style="background:#FFF7ED;border:2px solid #FED7AA;border-radius:12px;padding:18px;margin-bottom:24px">
          <p style="margin:0;font-size:13px;color:#9A3412;line-height:1.8">
            ⚡ <strong>جدّدي الآن</strong> في أقل من دقيقتين واستمري في العمل بلا انقطاع.
            بياناتك وسجل عملائك محفوظة ولن تُفقد عند التجديد.
          </p>
        </div>`,
      btnLabel: '⚡ جدّدي فوراً — 3 أيام متبقية',
      btnBg:    '#DC2626',
    },
    d1: {
      subject:       `🔴 آخر فرصة: اشتراكك ينتهي غداً`,
      headerBg:      '#7F1D1D',
      urgencyBg:     '#FEF2F2',
      urgencyBorder: '#F87171',
      urgencyText:   '#7F1D1D',
      urgencyIcon:   '🔴',
      urgencyLabel:  'يوم واحد — غداً الأخير',
      headline:      'غداً آخر يوم في اشتراكك',
      subline:       'لا تفقدي وصولك — جدّدي الآن',
      body: `
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.9">
          <strong style="color:#0F1923">${provider.nameAr}</strong>،
        </p>
        <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.9">
          هذه آخر رسالة تذكير قبل أن ينتهي اشتراكك يوم <strong style="color:#DC2626">${expiryDate}</strong>.
        </p>
        <div style="background:#7F1D1D;border-radius:14px;padding:20px;margin-bottom:24px;text-align:center">
          <p style="margin:0;font-size:36px;font-weight:900;color:#FEE2E2;font-family:monospace;letter-spacing:6px">
            24 ساعة
          </p>
          <p style="margin:8px 0 0;font-size:13px;color:#FECACA">حتى انتهاء اشتراك ${TIER_LABEL[provider.subscriptionTier] || ''}</p>
        </div>
        <p style="margin:0 0 20px;font-size:13px;color:#6B7280;line-height:1.8;text-align:center">
          لن يتأثر سجل عميلاتك أو بياناتك عند التجديد فوراً.
        </p>`,
      btnLabel: '🔴 جدّدي الآن — آخر فرصة',
      btnBg:    '#991B1B',
    },
    d0: {
      subject:       `⛔ اشتراكك في CONFIRMED قد انتهى`,
      headerBg:      '#1F2937',
      urgencyBg:     '#F9FAFB',
      urgencyBorder: '#D1D5DB',
      urgencyText:   '#374151',
      urgencyIcon:   '⛔',
      urgencyLabel:  'الاشتراك منتهٍ',
      headline:      'انتهى اشتراكك اليوم',
      subline:       'جدّدي لاستعادة وصولك الكامل',
      body: `
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.9">
          <strong style="color:#0F1923">${provider.nameAr}</strong>،
        </p>
        <p style="margin:0 0 20px;font-size:14px;color:#4B5563;line-height:1.9">
          للأسف، انتهى اشتراكك في باقة <strong>${tierLabel}</strong> اليوم.
          وصولك إلى لوحة التحكم وبوابة الحجز موقوف مؤقتاً.
        </p>
        <div style="background:#F3F4F6;border-radius:12px;padding:18px;margin-bottom:20px">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#111827">ماذا يحدث لبياناتي؟</p>
          <p style="margin:0;font-size:13px;color:#4B5563;line-height:1.8">
            بياناتك وسجل عميلاتك محفوظة ولن تُحذف.
            عند التجديد ستعودين لوضعك الطبيعي فوراً بدون أي فقدان في البيانات.
          </p>
        </div>`,
      btnLabel: 'استعيدي وصولك الآن',
      btnBg:    '#059669',
    },
  };

  const cfg = configs[stage];

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${cfg.subject}</title>
</head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:'Segoe UI',Tahoma,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F5;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.12);max-width:100%">

        <!-- ═══ Header ═══ -->
        <tr><td style="background:${cfg.headerBg};padding:36px 48px;text-align:center">
          <div style="margin-bottom:12px">
            <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#E84E4E;margin:0 2px"></span>
            <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#C9A84C;margin:0 2px"></span>
            <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#4CAF7D;margin:0 2px"></span>
          </div>
          <p style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:7px;font-family:Arial,sans-serif">CONFIRMED</p>
          <p style="margin:8px 0 0;font-size:11px;color:#C9A84C;letter-spacing:3px;font-weight:600;text-transform:uppercase">منصة إدارة الصالونات</p>
        </td></tr>

        <!-- ═══ Urgency Badge ═══ -->
        <tr><td style="background:${cfg.urgencyBg};border-bottom:1px solid ${cfg.urgencyBorder};padding:14px 48px">
          <p style="margin:0;font-size:13px;color:${cfg.urgencyText};text-align:center;font-weight:700">
            ${cfg.urgencyIcon}&nbsp;&nbsp;${cfg.urgencyLabel}
          </p>
        </td></tr>

        <!-- ═══ Headline ═══ -->
        <tr><td style="padding:36px 48px 0;text-align:center">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#0F1923">${cfg.headline}</h1>
          <p style="margin:0;font-size:14px;color:#6B7280">${cfg.subline}</p>
        </td></tr>

        <!-- ═══ Body ═══ -->
        <tr><td style="padding:28px 48px">
          ${cfg.body}
        </td></tr>

        <!-- ═══ CTA Button ═══ -->
        <tr><td style="padding:0 48px 36px;text-align:center">
          <a href="${renewUrl}" style="display:inline-block;background:${cfg.btnBg};color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:14px;font-weight:800;font-size:15px;letter-spacing:0.3px">
            ${cfg.btnLabel}
          </a>
          <p style="margin:14px 0 0;font-size:11px;color:#9CA3AF">
            أو يمكنك نسخ هذا الرابط: <a href="${renewUrl}" style="color:#C9A84C">${renewUrl}</a>
          </p>
        </td></tr>

        <!-- ═══ Separator ═══ -->
        <tr><td style="padding:0 48px"><div style="height:1px;background:#E5E7EB"></div></td></tr>

        <!-- ═══ Support & Footer ═══ -->
        <tr><td style="padding:24px 48px 36px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#374151">هل تحتاجين مساعدة؟</p>
                <p style="margin:0;font-size:12px;color:#6B7280;line-height:1.7">
                  فريق دعمنا جاهز للمساعدة على مدار الساعة.<br/>
                  راسلينا على <a href="mailto:support@confirmedgrowth.com" style="color:#C9A84C;text-decoration:none">support@confirmedgrowth.com</a>
                </p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- ═══ Footer ═══ -->
        <tr><td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 48px;text-align:center">
          <p style="margin:0 0 4px;font-size:11px;color:#9CA3AF">
            تم إرسال هذه الرسالة تلقائياً · لا تقومي بالرد مباشرة
          </p>
          <p style="margin:0;font-size:11px;color:#9CA3AF">
            © 2026 CONFIRMED · 
            <a href="${APP_URL}" style="color:#C9A84C;text-decoration:none">confirmedgrowth.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject: cfg.subject, html };
}
