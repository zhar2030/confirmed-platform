/**
 * ─────────────────────────────────────────────────────────────
 *  CONFIRMED — Dashboard Feature Flags
 *  لتفعيل أو إخفاء أي قسم: غيّري القيمة من false إلى true
 * ─────────────────────────────────────────────────────────────
 *
 *  true  = القسم ظاهر لمزودي الخدمة
 *  false = القسم مخفي (قادم قريباً)
 */

export const DASHBOARD_FEATURES: Record<string, boolean> = {
  dash:      true,   // الرئيسية
  book:      true,   // الحجوزات
  pos:       true,   // نقطة البيع
  inv:       true,   // المخزون
  crm:       true,   // إدارة العملاء
  staff:     true,   // الموظفات
  exp:       true,   // المصاريف
  rep:       true,   // التقارير
  profile:   true,   // الملف التعريفي
  set:       true,   // الإعدادات

  // ── قريباً — غيّري إلى true عند التفعيل ──────────────────
  mkt:       true,   // التسويق والعروض
  cx:        true,   // إدارة التجربة
  data:      true,   // مصادر البيانات
  gift:      true,   // بطاقات الهدايا
  intel:     true,   // تحليل سلوك العميلات (AI)
  icp:       true,   // العميلة المثالية
  services:   true,   // إدارة الخدمات والأسعار
  branches:   true,   // إدارة الفروع
  accounting: true,   // ربط النظام المحاسبي
  benchmark:  false,  // المقارنة المعيارية
  whatsapp:   true,   // تكامل واتساب بيزنس
};

/** الأقسام المخفية — تُعرض بشارة "قريباً" في الإعدادات */
export const COMING_SOON_LABELS: Record<string, { ar: string; en: string }> = {
  mkt:       { ar: 'التسويق والعروض',          en: 'Marketing & Promotions' },
  gift:      { ar: 'بطاقات الهدايا',            en: 'Gift Cards' },
  intel:     { ar: 'سلوك العملاء (AI)',          en: 'Customer Behaviour (AI)' },
  benchmark: { ar: 'المقارنة المعيارية',         en: 'Benchmarking' },
};
