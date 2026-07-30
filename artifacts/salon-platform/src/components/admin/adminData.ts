import type { RegisteredProvider, PlatformUser, SupportTicket, AuditLogEntry, Integration, RevenueDataPoint } from './adminTypes';

// ─── Registered Providers (Salons) ───────────────────────────────────────────
export const MOCK_PROVIDERS: RegisteredProvider[] = [
  { id: 'prov-1', storeName: 'صالون لمسة الأناقة', ownerName: 'نوف السبيعي', phone: '0551234567', email: 'lamsa@salon.sa', activity: 'صالون نسائي متكامل', city: 'الرياض', status: 'active', joinedAt: '2025-11-01', subdomain: 'lamsa', totalSales: 184500, paidOut: 155000, pendingPayout: 29500, subscriptionTier: 'pro', subscriptionPrice: 299, subscriptionStatus: 'active', staffCount: 8, bookingsCount: 1240, rating: 4.9, branches: 2, country: 'SA', mrr: 299, churnRisk: 'low' },
  { id: 'prov-2', storeName: 'مشغل هيفاء للتجميل', ownerName: 'هيفاء العتيبي', phone: '0557890123', email: 'haifa@beauty.sa', activity: 'مشغل تجميل نسائي', city: 'جدة', status: 'active', joinedAt: '2025-12-15', subdomain: 'haifa', totalSales: 97200, paidOut: 80000, pendingPayout: 17200, subscriptionTier: 'basic', subscriptionPrice: 149, subscriptionStatus: 'active', staffCount: 4, bookingsCount: 620, rating: 4.7, branches: 1, country: 'SA', mrr: 149, churnRisk: 'low' },
  { id: 'prov-3', storeName: 'مركز سبا رويال ريلاكس', ownerName: 'منى الزهراني', phone: '0554561230', email: 'royal@spa.sa', activity: 'مركز سبا ومساج', city: 'الرياض', status: 'active', joinedAt: '2026-01-20', subdomain: 'royal', totalSales: 231000, paidOut: 190000, pendingPayout: 41000, subscriptionTier: 'enterprise', subscriptionPrice: 0, subscriptionStatus: 'active', staffCount: 15, bookingsCount: 2100, rating: 4.8, branches: 4, country: 'SA', mrr: 0, churnRisk: 'low' },
  { id: 'prov-4', storeName: 'صالون بيوتي هوم', ownerName: 'رنا الشهراني', phone: '0559871234', email: 'beauty@home.sa', activity: 'خدمات التجميل المنزلية', city: 'الدمام', status: 'trial', joinedAt: '2026-07-01', subdomain: 'bhome', totalSales: 12400, paidOut: 0, pendingPayout: 12400, subscriptionTier: 'basic', subscriptionPrice: 149, subscriptionStatus: 'trial', staffCount: 2, bookingsCount: 87, rating: 4.5, branches: 1, country: 'SA', mrr: 149, churnRisk: 'medium' },
  { id: 'prov-5', storeName: 'كليوباترا للعروس', ownerName: 'سلمى القحطاني', phone: '0553214567', email: 'cleo@bride.sa', activity: 'تجميل عرائس', city: 'مكة', status: 'suspended', joinedAt: '2025-10-05', subdomain: 'cleo', totalSales: 44800, paidOut: 44800, pendingPayout: 0, subscriptionTier: 'pro', subscriptionPrice: 299, subscriptionStatus: 'overdue', staffCount: 3, bookingsCount: 310, rating: 4.3, branches: 1, country: 'SA', mrr: 299, churnRisk: 'high' },
  { id: 'prov-6', storeName: 'فيلا نيل السبا', ownerName: 'ديمة الحربي', phone: '0556780934', email: 'villa@nile.sa', activity: 'مركز عناية متكامل', city: 'جدة', status: 'active', joinedAt: '2026-02-10', subdomain: 'nile', totalSales: 156700, paidOut: 130000, pendingPayout: 26700, subscriptionTier: 'pro', subscriptionPrice: 299, subscriptionStatus: 'active', staffCount: 10, bookingsCount: 980, rating: 4.6, branches: 2, country: 'SA', mrr: 299, churnRisk: 'low' },
];

// ─── Platform Users ───────────────────────────────────────────────────────────
export const MOCK_USERS: PlatformUser[] = [
  { id: 'u1', name: 'مالكة المنصة', email: 'owner@confirmed.sa', phone: '0500000001', role: 'super_admin', joinedAt: '2024-01-01', lastLogin: '2026-07-20T09:15:00Z', permissions: ['all'], status: 'active', mfaEnabled: true },
  { id: 'u2', name: 'سارة المدير التنفيذي', email: 'sara@confirmed.sa', phone: '0500000002', role: 'senior_admin', joinedAt: '2024-03-15', lastLogin: '2026-07-20T08:45:00Z', permissions: ['manage_salons', 'manage_users', 'view_financials', 'send_broadcasts'], status: 'active', mfaEnabled: true },
  { id: 'u3', name: 'عمر مشرف العمليات', email: 'omar@confirmed.sa', phone: '0500000003', role: 'ops_supervisor', joinedAt: '2024-06-01', lastLogin: '2026-07-19T16:30:00Z', permissions: ['manage_salons', 'view_reports', 'approve_requests'], status: 'active', mfaEnabled: false },
  { id: 'u4', name: 'ريم تسويق', email: 'reem@confirmed.sa', phone: '0500000004', role: 'marketing_spec', joinedAt: '2024-09-01', lastLogin: '2026-07-18T11:20:00Z', permissions: ['send_broadcasts', 'view_analytics'], status: 'active', mfaEnabled: false },
  { id: 'u5', name: 'فيصل الدعم الفني', email: 'faisal@confirmed.sa', phone: '0500000005', role: 'tech_support', joinedAt: '2025-01-10', lastLogin: '2026-07-20T10:05:00Z', permissions: ['view_reports', 'manage_tickets'], status: 'active', mfaEnabled: true },
  { id: 'u6', name: 'ليلى المالية', email: 'layla@confirmed.sa', phone: '0500000006', role: 'finance_admin', joinedAt: '2025-03-01', lastLogin: '2026-07-19T14:00:00Z', permissions: ['view_financials', 'process_payouts', 'manage_billing'], status: 'suspended', mfaEnabled: false },
];

// ─── Support Tickets ──────────────────────────────────────────────────────────
export const MOCK_TICKETS: SupportTicket[] = [
  { id: 'TKT-001', subject: 'فشل في عملية الدفع عند إصدار فاتورة', salonName: 'صالون لمسة الأناقة', salonEmail: 'lamsa@salon.sa', category: 'billing', priority: 'critical', status: 'open', createdAt: '2026-07-20T08:00:00Z', updatedAt: '2026-07-20T08:00:00Z', sla: 2, messages: [{ id: 'm1', sender: 'نوف السبيعي', senderType: 'client', content: 'عند محاولة إصدار فاتورة للعميلة تظهر رسالة خطأ ولا يتم إتمام الدفع. المبلغ 450 ريال.', timestamp: '2026-07-20T08:00:00Z' }] },
  { id: 'TKT-002', subject: 'طلب إضافة خاصية حجز المجموعات', salonName: 'مركز سبا رويال ريلاكس', salonEmail: 'royal@spa.sa', category: 'feature_request', priority: 'low', status: 'in_progress', createdAt: '2026-07-19T10:30:00Z', updatedAt: '2026-07-20T09:00:00Z', assignedTo: 'فيصل الدعم الفني', sla: 48, messages: [{ id: 'm2', sender: 'منى الزهراني', senderType: 'client', content: 'نحتاج خاصية لحجز الجلسات الجماعية للشركات والفعاليات.', timestamp: '2026-07-19T10:30:00Z' }, { id: 'm3', sender: 'فيصل الدعم الفني', senderType: 'admin', content: 'شكراً لاقتراحكم، تم تسجيل الطلب وإحالته لفريق التطوير.', timestamp: '2026-07-20T09:00:00Z' }] },
  { id: 'TKT-003', subject: 'مشكلة في نظام المواعيد والتداخل', salonName: 'مشغل هيفاء للتجميل', salonEmail: 'haifa@beauty.sa', category: 'technical', priority: 'high', status: 'pending_reply', createdAt: '2026-07-18T14:00:00Z', updatedAt: '2026-07-19T11:00:00Z', assignedTo: 'عمر مشرف العمليات', sla: 8, messages: [{ id: 'm4', sender: 'هيفاء العتيبي', senderType: 'client', content: 'يحدث تداخل في المواعيد بين الموظفات أحياناً رغم أنهن في أوقات مختلفة.', timestamp: '2026-07-18T14:00:00Z' }] },
  { id: 'TKT-004', subject: 'استفسار عن ترقية الباقة إلى Enterprise', salonName: 'فيلا نيل السبا', salonEmail: 'villa@nile.sa', category: 'billing', priority: 'medium', status: 'resolved', createdAt: '2026-07-15T09:00:00Z', updatedAt: '2026-07-17T15:00:00Z', assignedTo: 'سارة المدير التنفيذي', sla: 0, messages: [{ id: 'm5', sender: 'ديمة الحربي', senderType: 'client', content: 'كيف يمكنني الترقية إلى الباقة المؤسسية وما هي الميزات الإضافية؟', timestamp: '2026-07-15T09:00:00Z' }] },
  { id: 'TKT-005', subject: 'عدم استلام OTP عند تسجيل الدخول', salonName: 'كليوباترا للعروس', salonEmail: 'cleo@bride.sa', category: 'account', priority: 'high', status: 'open', createdAt: '2026-07-20T07:30:00Z', updatedAt: '2026-07-20T07:30:00Z', sla: 4, messages: [{ id: 'm6', sender: 'سلمى القحطاني', senderType: 'client', content: 'لم يصلني رمز التحقق منذ الصباح وأنا غير قادرة على الدخول للوحة تحكم الصالون.', timestamp: '2026-07-20T07:30:00Z' }] },
];

// ─── Audit Log ────────────────────────────────────────────────────────────────
export const MOCK_AUDIT: AuditLogEntry[] = [
  { id: 'a1', timestamp: '2026-07-20T10:15:00Z', actor: 'سارة المدير التنفيذي', actorRole: 'senior_admin', action: 'تفعيل حساب صالون', target: 'صالون بيوتي هوم', targetType: 'salon', severity: 'info', ip: '192.168.1.10', result: 'success' },
  { id: 'a2', timestamp: '2026-07-20T09:55:00Z', actor: 'مالكة المنصة', actorRole: 'super_admin', action: 'تعديل باقة اشتراك', target: 'مركز سبا رويال ريلاكس → Enterprise', targetType: 'billing', severity: 'info', ip: '10.0.0.1', result: 'success' },
  { id: 'a3', timestamp: '2026-07-20T09:30:00Z', actor: 'عمر مشرف العمليات', actorRole: 'ops_supervisor', action: 'تعليق حساب صالون', target: 'كليوباترا للعروس', targetType: 'salon', severity: 'warning', ip: '192.168.1.22', result: 'success' },
  { id: 'a4', timestamp: '2026-07-20T08:45:00Z', actor: 'ريم تسويق', actorRole: 'marketing_spec', action: 'إرسال حملة بث', target: 'جميع المزودين (6 صالون)', targetType: 'marketing', severity: 'info', ip: '192.168.1.30', result: 'success' },
  { id: 'a5', timestamp: '2026-07-19T22:10:00Z', actor: 'مجهول', actorRole: '—', action: 'محاولة تسجيل دخول فاشلة (5 محاولات)', target: 'owner@confirmed.sa', targetType: 'security', severity: 'critical', ip: '78.45.12.99', result: 'failed' },
  { id: 'a6', timestamp: '2026-07-19T16:00:00Z', actor: 'ليلى المالية', actorRole: 'finance_admin', action: 'تسوية مستحقات', target: 'صالون لمسة الأناقة — 29,500 ريال', targetType: 'billing', severity: 'info', ip: '192.168.1.40', result: 'success' },
  { id: 'a7', timestamp: '2026-07-19T14:30:00Z', actor: 'مالكة المنصة', actorRole: 'super_admin', action: 'تعطيل حساب موظف', target: 'ليلى المالية', targetType: 'user', severity: 'warning', ip: '10.0.0.1', result: 'success' },
  { id: 'a8', timestamp: '2026-07-19T11:00:00Z', actor: 'فيصل الدعم الفني', actorRole: 'tech_support', action: 'إغلاق تذكرة دعم', target: 'TKT-004', targetType: 'system', severity: 'info', ip: '192.168.1.55', result: 'success' },
];

// ─── Integrations ─────────────────────────────────────────────────────────────
export const MOCK_INTEGRATIONS: Integration[] = [
  { id: 'i1', name: 'Moyasar', category: 'payment', status: 'connected', provider: 'Moyasar', lastSync: '2026-07-20T10:00:00Z', icon: '💳' },
  { id: 'i2', name: 'Tap Payments', category: 'payment', status: 'connected', provider: 'Tap', lastSync: '2026-07-20T10:00:00Z', icon: '💳' },
  { id: 'i3', name: 'Unifonic SMS', category: 'sms', status: 'connected', provider: 'Unifonic', lastSync: '2026-07-20T09:45:00Z', icon: '📱' },
  { id: 'i4', name: 'SendGrid Email', category: 'email', status: 'error', provider: 'Twilio', lastSync: '2026-07-19T22:00:00Z', icon: '✉️' },
  { id: 'i5', name: 'Google Analytics', category: 'analytics', status: 'connected', provider: 'Google', lastSync: '2026-07-20T08:00:00Z', icon: '📊' },
  { id: 'i6', name: 'ZATCA e-Invoicing', category: 'erp', status: 'connected', provider: 'ZATCA', lastSync: '2026-07-20T07:00:00Z', icon: '🏛️' },
  { id: 'i7', name: 'WhatsApp Business API', category: 'sms', status: 'disconnected', provider: 'Meta', lastSync: '—', icon: '💬' },
  { id: 'i8', name: 'REST API v2', category: 'api', status: 'connected', provider: 'Internal', lastSync: '2026-07-20T10:15:00Z', icon: '🔌' },
];

// ─── Revenue Chart Data ───────────────────────────────────────────────────────
export const REVENUE_DATA: RevenueDataPoint[] = [
  { month: 'فبراير', subscriptions: 32000, commissions: 18400, total: 50400 },
  { month: 'مارس',   subscriptions: 38500, commissions: 22100, total: 60600 },
  { month: 'أبريل',  subscriptions: 45200, commissions: 27300, total: 72500 },
  { month: 'مايو',   subscriptions: 51800, commissions: 31200, total: 83000 },
  { month: 'يونيو',  subscriptions: 60400, commissions: 38700, total: 99100 },
  { month: 'يوليو',  subscriptions: 68900, commissions: 43500, total: 112400 },
];

export const CHURN_DATA = [
  { month: 'فبراير', rate: 4.2 },
  { month: 'مارس',   rate: 3.8 },
  { month: 'أبريل',  rate: 3.1 },
  { month: 'مايو',   rate: 2.9 },
  { month: 'يونيو',  rate: 2.5 },
  { month: 'يوليو',  rate: 1.8 },
];

export const TIER_DATA = [
  { name: 'الأساسية', value: 2, color: '#94a3b8' },
  { name: 'الاحترافية', value: 3, color: '#FF5A5F' },
  { name: 'المؤسسية', value: 1, color: '#14332B' },
];
