/**
 * Email service — transport priority chain:
 *   1. Brevo REST      (primary — verified sender ahmedazhr23@gmail.com)
 *   2. SendGrid        (fallback)
 *   3. Resend          (fallback — requires verified domain)
 *   4. Console log     (dev only)
 *
 * ⚠️  FROM_EMAIL must match a verified sender in Brevo.
 *     Current verified sender: ahmedazhr23@gmail.com
 */
import nodemailer from 'nodemailer';

const BREVO_API_KEY   = process.env['BREVO_API_KEY'];
const BREVO_SMTP_KEY  = process.env['BREVO_SMTP_KEY'] || BREVO_API_KEY;
const BREVO_SMTP_USER = process.env['BREVO_SMTP_USER'] || 'b2bddb001@smtp-brevo.com';
const RESEND_API_KEY  = process.env['RESEND_API_KEY'];

// Must be a sender verified in your Brevo account (custom domain preferred).
const FROM_EMAIL      = process.env['FROM_EMAIL'] || 'noreply@confirmedgrowth.com';
const FROM_NAME       = 'CONFIRMED';
const APP_URL         = process.env['APP_URL'] || 'https://confirmedgrowth.com';
const ADMIN_EMAIL     = process.env['ADMIN_EMAIL'] || 'u0u@hotmail.fr';
const IS_PRODUCTION   = process.env['NODE_ENV'] === 'production';

// ── SMTP transporter (Brevo SMTP relay) ──────────────────────────────────────
let smtpTransporter: nodemailer.Transporter | null = null;

function getSmtpTransporter(): nodemailer.Transporter | null {
  if (!BREVO_SMTP_KEY) return null;
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: BREVO_SMTP_USER,
        pass: BREVO_SMTP_KEY,
      },
      pool: true,         // Reuse connections for speed
      maxConnections: 5,
      rateDelta: 1000,
      rateLimit: 10,      // Max 10 emails/second
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
    });
  }
  return smtpTransporter;
}

// ── Core send function ────────────────────────────────────────────────────────

interface SendParams {
  to: string;
  subject: string;
  html: string;
}

async function sendViaSMTP({ to, subject, html }: SendParams): Promise<void> {
  const transporter = getSmtpTransporter();
  if (!transporter) throw new Error('SMTP not configured');
  const start = Date.now();
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
  console.info(`[EMAIL SMTP] Delivered to ${to} in ${Date.now() - start}ms`);
}

async function sendViaBrevoRest({ to, subject, html }: SendParams): Promise<void> {
  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY not set');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (res.ok) return;
  const errBody = await res.json().catch(() => ({}));
  throw new Error(`Brevo REST failed (${res.status}): ${JSON.stringify(errBody)}`);
}

async function sendViaSendGrid({ to, subject, html }: SendParams): Promise<void> {
  const key = process.env['SENDGRID_API_KEY'];
  if (!key) throw new Error('SENDGRID_API_KEY not set');
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });
  if (res.ok || res.status === 202) return;
  const errBody = await res.json().catch(() => ({}));
  throw new Error(`SendGrid failed (${res.status}): ${JSON.stringify(errBody)}`);
}

async function sendViaResend({ to, subject, html }: SendParams): Promise<void> {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend failed: ${JSON.stringify(data)}`);
}

/**
 * Send email with automatic fallback chain:
 *   1. Brevo REST  (primary — verified sender, works without domain verification)
 *   2. SendGrid    (fallback)
 *   3. Resend      (fallback — requires verified domain)
 *   4. Console log (dev mode only)
 */
async function sendEmail({ to, subject, html }: SendParams): Promise<void> {
  // 1. Brevo REST — primary transport (verified sender ahmedazhr23@gmail.com)
  if (BREVO_API_KEY) {
    try {
      await sendViaBrevoRest({ to, subject, html });
      console.info(`[EMAIL] Sent via Brevo to ${to}`);
      return;
    } catch (brevoErr: any) {
      console.warn('[EMAIL] Brevo REST failed:', brevoErr?.message);
    }
  }

  // 2. SendGrid fallback
  if (process.env['SENDGRID_API_KEY']) {
    try {
      await sendViaSendGrid({ to, subject, html });
      console.info(`[EMAIL] Sent via SendGrid to ${to}`);
      return;
    } catch (sgErr: any) {
      console.warn('[EMAIL] SendGrid failed:', sgErr?.message);
    }
  }

  // 3. Resend fallback (requires confirmedgrowth.com domain verified in Resend)
  if (RESEND_API_KEY) {
    try {
      await sendViaResend({ to, subject, html });
      console.info(`[EMAIL] Sent via Resend to ${to}`);
      return;
    } catch (resendErr: any) {
      console.warn('[EMAIL] Resend failed:', resendErr?.message);
    }
  }

  // 4. Dev console fallback
  if (!IS_PRODUCTION) {
    console.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
    return;
  }

  throw new Error('All email transports failed — check BREVO_API_KEY');
}

// ── Public helpers ────────────────────────────────────────────────────────────

export async function sendOTPEmail(to: string, otp: string): Promise<void> {
  try {
    await sendEmail({ to, subject: `رمز التحقق الخاص بك: ${otp}`, html: buildOTPEmail(otp) });
  } catch (err: any) {
    if (IS_PRODUCTION) throw err;
    console.warn('[EMAIL] Send failed — falling back to console:', err?.message);
    console.log(`[DEV OTP] ${to} → ${otp}`);
  }
}

export interface ContactFormData {
  name: string;
  facilityType: string;
  email: string;
  phone: string;
  message?: string;
}

export async function sendContactEmail(data: ContactFormData): Promise<void> {
  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `طلب عرض تجريبي جديد — ${data.name} (${data.facilityType})`,
      html: buildContactEmail(data),
    });
  } catch (err: any) {
    console.warn('[EMAIL] Contact email failed:', err?.message);
  }
}

export interface StaffInvitationData {
  to:        string;
  staffName: string;
  salonName: string;
  role:      string;
  inviteUrl: string;
}

export async function sendStaffInvitationEmail(data: StaffInvitationData): Promise<void> {
  try {
    await sendEmail({
      to:      data.to,
      subject: `دعوة للانضمام إلى فريق ${data.salonName} على CONFIRMED`,
      html:    buildStaffInvitationEmail(data),
    });
  } catch (err: any) {
    if (IS_PRODUCTION) throw err;
    console.warn('[EMAIL] Staff invitation email failed:', err?.message);
    console.log(`[DEV INVITE] ${data.to} → ${data.inviteUrl}`);
  }
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  try {
    await sendEmail({
      to,
      subject: 'طلب إعادة تعيين كلمة المرور - CONFIRMED',
      html: buildResetEmail(to, resetToken),
    });
  } catch (err: any) {
    if (IS_PRODUCTION) throw err;
    console.warn('[EMAIL] Reset email failed:', err?.message);
    console.log(`[DEV RESET] ${to} → token: ${resetToken}`);
  }
}

// ── HTML templates ────────────────────────────────────────────────────────────

function buildStaffInvitationEmail(data: StaffInvitationData): string {
  const roleLabels: Record<string, string> = {
    owner: 'مالك الصالون', manager: 'مدير', cashier: 'كاشير', specialist: 'متخصصة',
  };
  const roleLabel = roleLabels[data.role] ?? data.role;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F5;padding:40px 16px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);max-width:100%">

      <tr><td style="background:#0F1923;padding:32px 48px;text-align:center">
        <div style="margin-bottom:10px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E84E4E;margin:0 2px"></span>
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#C9A84C;margin:0 2px"></span>
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#4CAF7D;margin:0 2px"></span>
        </div>
        <p style="margin:0;font-size:24px;font-weight:900;color:#fff;letter-spacing:6px">CONFIRMED</p>
        <p style="margin:6px 0 0;font-size:11px;color:#C9A84C;letter-spacing:3px">دعوة للانضمام إلى الفريق</p>
      </td></tr>

      <tr><td style="padding:36px 48px">
        <p style="margin:0 0 6px;font-size:14px;color:#6B7280">مرحباً،</p>
        <h2 style="margin:0 0 20px;font-size:20px;font-weight:800;color:#0F1923">${data.staffName}</h2>

        <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.8">
          تمت دعوتك للانضمام إلى فريق
          <strong style="color:#0F1923">${data.salonName}</strong>
          على منصة CONFIRMED بوصفك
          <span style="display:inline-block;background:#FEF3C7;color:#92400E;padding:2px 10px;border-radius:20px;font-weight:700;font-size:13px">${roleLabel}</span>.
        </p>

        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;padding:20px 24px;margin-bottom:28px">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px">للبدء</p>
          <ol style="margin:0;padding-right:20px;color:#374151;font-size:14px;line-height:2">
            <li>اضغط على زر الدعوة أدناه</li>
            <li>أنشئ كلمة مرور خاصة بك</li>
            <li>ادخل إلى لوحة تحكم الصالون مباشرة</li>
          </ol>
        </div>

        <div style="text-align:center;margin-bottom:24px">
          <a href="${data.inviteUrl}"
             style="display:inline-block;background:#C9A84C;color:#0F1923;text-decoration:none;padding:16px 48px;border-radius:14px;font-weight:900;font-size:16px;letter-spacing:1px">
            قبول الدعوة وإنشاء الحساب
          </a>
        </div>

        <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;line-height:1.7">
          هذه الدعوة صالحة لمدة <strong>72 ساعة</strong>.<br/>
          إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا الإيميل.
        </p>
      </td></tr>

      <tr><td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:18px 48px;text-align:center">
        <p style="margin:0;font-size:11px;color:#9CA3AF">© 2026 CONFIRMED · confirmedgrowth.com</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildOTPEmail(otp: string): string {
  const digits = otp.split('').map(d =>
    `<span style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;background:#1C2532;border:1.5px solid #2D3B4E;border-radius:10px;font-size:28px;font-weight:900;color:#C9A84C;font-family:'Courier New',monospace;margin:0 3px">${d}</span>`
  ).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F5;padding:40px 16px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10)">

        <!-- Header -->
        <tr><td style="background:#0F1923;padding:36px 44px 28px;text-align:center">
          <div style="margin-bottom:14px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#E84E4E;margin:0 2px"></span>
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#C9A84C;margin:0 2px"></span>
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#4CAF7D;margin:0 2px"></span>
          </div>
          <p style="margin:0;font-size:26px;font-weight:900;color:#ffffff;letter-spacing:6px;font-family:Arial,sans-serif">CONFIRMED</p>
          <p style="margin:8px 0 0;font-size:12px;color:#C9A84C;letter-spacing:3px;font-weight:600">منصة إدارة الصالونات</p>
        </td></tr>

        <!-- Subtitle -->
        <tr><td style="background:#F8F9FA;padding:18px 44px;border-bottom:1px solid #E9ECEF">
          <p style="margin:0;font-size:14px;color:#6C757D;text-align:center">
            تحقق من هويتك في <strong style="color:#0F1923">CONFIRMED</strong> باستخدام الرمز التالي
          </p>
        </td></tr>

        <!-- OTP digits -->
        <tr><td style="padding:44px 44px 32px;text-align:center">
          <p style="margin:0 0 24px;font-size:15px;color:#343A40;line-height:1.8;text-align:center">
            مرحباً،<br/>رمز التحقق الثنائي (OTP) لحسابك هو:
          </p>
          <div style="background:#111D2B;border-radius:16px;padding:24px 20px;display:inline-block;margin-bottom:28px;border:1px solid #1E2D40">
            ${digits}
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr>
              <td style="background:#FFF8E7;border:1px solid #F5D878;border-radius:12px;padding:14px 20px;text-align:center">
                <p style="margin:0;font-size:13px;color:#856404;line-height:1.7">
                  ⏱&nbsp; هذا الرمز <strong>صالح لمدة ١٠ دقائق فقط</strong> ولا يمكن استخدامه مرتين.<br/>
                  إذا لم تطلبي هذا الرمز، تجاهلي هذا البريد فوراً.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:0;font-size:12px;color:#ADB5BD;line-height:1.7;text-align:center">
            🔒&nbsp; CONFIRMED لن تطلب منك أبداً مشاركة هذا الرمز مع أحد.
          </p>
        </td></tr>

        <tr><td style="padding:0 44px"><hr style="border:none;border-top:1px solid #E9ECEF;margin:0"/></td></tr>
        <tr><td style="background:#F8F9FA;padding:20px 44px;text-align:center">
          <p style="margin:0 0 6px;font-size:11px;color:#ADB5BD">تم إرسال هذا البريد تلقائياً — لا تقومي بالرد عليه</p>
          <p style="margin:0;font-size:11px;color:#ADB5BD">© 2026 CONFIRMED — <a href="${APP_URL}" style="color:#C9A84C;text-decoration:none">confirmedgrowth.com</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildContactEmail(data: ContactFormData): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F5;padding:48px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.08)">
        <tr><td style="background:#0F1923;padding:32px 44px;text-align:center">
          <p style="margin:0;font-size:22px;font-weight:900;color:#fff;letter-spacing:5px">CONFIRMED</p>
          <p style="margin:6px 0 0;font-size:11px;color:#C9A84C;letter-spacing:3px">طلب عرض تجريبي جديد</p>
        </td></tr>
        <tr><td style="padding:40px 44px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding-bottom:20px"><p style="margin:0 0 6px;font-size:12px;color:#9CA3AF;font-weight:600">الاسم</p><p style="margin:0;font-size:16px;color:#111827;font-weight:700">${data.name}</p></td></tr>
            <tr><td style="padding:20px 0;border-top:1px solid #F3F4F6"><p style="margin:0 0 6px;font-size:12px;color:#9CA3AF;font-weight:600">نوع النشاط</p><p style="margin:0;font-size:16px;color:#111827;font-weight:700">${data.facilityType}</p></td></tr>
            <tr><td style="padding:20px 0;border-top:1px solid #F3F4F6"><p style="margin:0 0 6px;font-size:12px;color:#9CA3AF;font-weight:600">البريد الإلكتروني</p><p style="margin:0;font-size:16px;color:#111827;font-weight:700"><a href="mailto:${data.email}" style="color:#C9A84C;text-decoration:none">${data.email}</a></p></td></tr>
            <tr><td style="padding:20px 0;border-top:1px solid #F3F4F6"><p style="margin:0 0 6px;font-size:12px;color:#9CA3AF;font-weight:600">رقم الجوال</p><p style="margin:0;font-size:16px;color:#111827;font-weight:700"><a href="tel:${data.phone}" style="color:#C9A84C;text-decoration:none">${data.phone}</a></p></td></tr>
            ${data.message ? `<tr><td style="padding:20px 0;border-top:1px solid #F3F4F6"><p style="margin:0 0 6px;font-size:12px;color:#9CA3AF;font-weight:600">رسالة إضافية</p><p style="margin:0;font-size:14px;color:#374151;background:#F9FAFB;padding:14px;border-radius:10px;border:1px solid #E5E7EB">${data.message}</p></td></tr>` : ''}
          </table>
          <div style="margin-top:32px;text-align:center">
            <a href="mailto:${data.email}" style="display:inline-block;background:#0F1923;color:#C9A84C;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:14px">الرد على العميل</a>
          </div>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:18px 44px;border-top:1px solid #E5E7EB;text-align:center">
          <p style="margin:0;font-size:11px;color:#9CA3AF">© 2026 CONFIRMED</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildResetEmail(email: string, resetToken: string): string {
  const otp = resetToken; // now a 6-digit code

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F5;padding:48px 16px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.08);max-width:100%">

        <tr><td style="background:#0F1923;padding:32px 44px;text-align:center">
          <div style="margin-bottom:8px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E84E4E;margin:0 2px"></span>
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#C9A84C;margin:0 2px"></span>
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#4CAF7D;margin:0 2px"></span>
          </div>
          <p style="margin:0;font-size:24px;font-weight:900;color:#fff;letter-spacing:6px">CONFIRMED</p>
          <p style="margin:6px 0 0;font-size:11px;color:#C9A84C;letter-spacing:2px">إعادة تعيين كلمة المرور</p>
        </td></tr>

        <tr><td style="padding:40px 44px">
          <p style="margin:0 0 8px;font-size:14px;color:#6B7280">مرحباً،</p>
          <p style="margin:0 0 28px;font-size:15px;color:#111827;line-height:1.8">
            تلقّينا طلباً لإعادة تعيين كلمة المرور لحسابك.<br/>
            استخدم الرمز التالي في الموقع لتعيين كلمة مرور جديدة:
          </p>

          <!-- 6-digit OTP code — big and centered -->
          <div style="text-align:center;margin-bottom:32px">
            <div style="display:inline-block;background:#0F1923;border-radius:16px;padding:20px 44px">
              <p style="margin:0;font-size:11px;color:#C9A84C;letter-spacing:3px;margin-bottom:8px">رمز التحقق</p>
              <p style="margin:0;font-size:42px;font-weight:900;color:#fff;letter-spacing:14px;font-family:monospace">${otp}</p>
            </div>
          </div>

          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:center">
            <p style="margin:0 0 8px;font-size:14px;color:#1D4ED8;font-weight:700">كيفية الاستخدام:</p>
            <p style="margin:0;font-size:13px;color:#1E40AF;line-height:1.8">
              ١. افتح موقع <a href="${APP_URL}" style="color:#C9A84C;font-weight:bold;text-decoration:none">confirmedgrowth.com</a><br/>
              ٢. اضغط على <strong>تسجيل الدخول</strong><br/>
              ٣. اضغط <strong>نسيت كلمة المرور؟</strong> وأدخل إيميلك<br/>
              ٤. أدخل الرمز أعلاه وكلمة المرور الجديدة
            </p>
          </div>

          <div style="background:#FFF8E7;border:1px solid #F5D878;border-radius:12px;padding:14px 18px;margin-bottom:24px">
            <p style="margin:0;font-size:12px;color:#856404;line-height:1.7">⏱ هذا الرمز صالح لمدة <strong>١٠ دقائق فقط</strong> ويُستخدم مرة واحدة فقط.</p>
          </div>

          <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.7">
            إذا لم تطلب إعادة التعيين، تجاهل هذه الرسالة بأمان.
          </p>
        </td></tr>

        <tr><td style="background:#F9FAFB;padding:20px 44px;border-top:1px solid #E5E7EB;text-align:center">
          <p style="margin:0;font-size:11px;color:#9CA3AF">© 2026 CONFIRMED · <a href="${APP_URL}" style="color:#C9A84C;text-decoration:none">confirmedgrowth.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
