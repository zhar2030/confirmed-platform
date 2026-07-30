---
name: Platform Owner / Super Admin Account
description: بيانات حساب السوبر أدمن ومالك المنصة وآلية اكتشافه
---

## بيانات الحساب (في قاعدة البيانات)

| حقل | القيمة |
|---|---|
| `username` | `u0u` |
| `email` | `u0u@hotmail.fr` |
| `role` | `owner` |
| `name_ar` | `مالك المنصة` |
| `name_en` | `Platform Owner` |
| `subscription_tier` | `enterprise` |
| `subscription_status` | `active` |
| `status` | `active` |

## آلية عمل الـ Role System

- جميع providers لديهم عمود `role` (VARCHAR 20) في جدول `providers`
- القيم الممكنة: `'owner'` و `'provider'`
- العمود أضيف بـ SQL مباشر + Drizzle schema في `lib/db/src/schema/index.ts`

## منطق الاكتشاف في Frontend

في `LandingPage.tsx → handleOTPSubmit`:
```
isPlatformAdmin = provider.role === 'owner'
```
- يجلب `GET /api/auth/provider/:identifier` بعد التحقق من OTP
- إذا `role === 'owner'` → يفتح لوحة السوبر أدمن (PlatformOwnerDashboard)
- إذا `role === 'provider'` → يفتح لوحة الصالون العادية

## منطق الاكتشاف في API

في `auth.ts → GET /api/auth/provider/:identifier`:
- إذا identifier === `'admin'` → يُرجع role='owner' مباشرة من ADMIN_EMAIL env var (بدون DB)
- غير ذلك → يُرجع من DB مع role الحقيقي

**Why:** ربط الصلاحيات بحقل `role` في DB بدل hardcoded usernames يجعل النظام قابلاً للتوسع.
**How to apply:** لإضافة owner جديد، غيّر `role` في DB إلى `'owner'`. لا تعدّل كود الـ frontend.
