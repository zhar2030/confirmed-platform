---
name: Email Configuration
description: إعدادات الإيميل — سلسلة الإرسال الحالية وحالة كل خدمة
---

## الإعداد الحالي (يوليو 2026)

| متغير | القيمة |
|---|---|
| `FROM_EMAIL` | `noreply@confirmedgrowth.com` |
| `ADMIN_EMAIL` | `u0u@hotmail.fr` |
| `BREVO_API_KEY` | (secret) |
| `SENDGRID_API_KEY` | (secret) — يعمل ✅ |
| `RESEND_API_KEY` | (secret) |

## سلسلة الإرسال

1. **Brevo REST** — ❌ يفشل دائماً بسبب IP restriction (Replit IPs ديناميكية، Brevo يرفض IPs غير المسجّلة حتى لو أُفرغت القائمة)
2. **SendGrid** — ✅ **يعمل ويُرسل فعلياً** — الإيميلات تصل لجميع العناوين
3. **Resend** — ❌ يفشل لأن `confirmedgrowth.com` غير موثّق في Resend
4. **Console log** — dev fallback فقط

## ملاحظات مهمة
- SendGrid هو المزود الفعّال الآن — لا تحذفه من السلسلة
- Brevo IP restriction مشكلة هيكلية مع Replit (IPs تتغير)، لا تحاول إصلاحها بإضافة IP
- `FROM_EMAIL=noreply@confirmedgrowth.com` — SendGrid يتطلب التحقق من الدومين أو Single Sender؛ إذا بدأ SendGrid يرفض، تحقق من Sender verification في SendGrid dashboard
- لا تستخدم Gmail/Hotmail كـ FROM_EMAIL — يفشل SPF

**Why:** Replit لا يوفر Static Outbound IP (رسمي من docs)، لذا أي خدمة تشترط IP whitelist لن تعمل بشكل موثوق.
