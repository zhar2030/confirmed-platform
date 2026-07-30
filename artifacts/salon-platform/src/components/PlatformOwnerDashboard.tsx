/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            PLATFORM OWNER DASHBOARD — SUPER ADMIN ONLY                 ║
 * ║  Design: "Command Bridge" — deep forest sidebar, warm parchment canvas ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import React, { useState, useEffect, useCallback, useId } from 'react';
import confirmedLogo from '../assets/logo.png';
import {
  LayoutDashboard, Building2, Users, CreditCard, BarChart3,
  Megaphone, MessageSquare, Settings, Shield,
  LogOut, Bell, ChevronLeft, ChevronRight, Menu, X,
  DollarSign, ToggleLeft, Key, Activity, FileText, Brain, Download,
  BellRing, Circle,
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { getAdminHeaders, hasValidAdminSession, clearAdminCredentials } from '../lib/adminAuth';
import type { SubscriptionPackage } from '../types';
import type { Toast, AdminSection, RegisteredProvider } from './admin/adminTypes';
import AdminToast from './admin/AdminToast';
import AdminConfirm from './admin/AdminConfirm';
import LogoutConfirmModal from './LogoutConfirmModal';
import AdminExecutive from './admin/AdminExecutive';
import AdminSalons from './admin/AdminSalons';
import AdminUsers from './admin/AdminUsers';
import AdminBilling from './admin/AdminBilling';
import AdminBI from './admin/AdminBI';
import AdminMarketing from './admin/AdminMarketing';
import AdminSupport from './admin/AdminSupport';
import AdminSettings from './admin/AdminSettings';
import AdminSecurity from './admin/AdminSecurity';
import AdminReminders from './admin/AdminReminders';
import AdminFinance from './admin/AdminFinance';
import AdminFeatureFlags from './admin/AdminFeatureFlags';
import AdminApiKeys from './admin/AdminApiKeys';
import AdminMonitoring from './admin/AdminMonitoring';
import AdminContent from './admin/AdminContent';
import AdminAIInsights from './admin/AdminAIInsights';
import AdminExport from './admin/AdminExport';

// ─── Design tokens ────────────────────────────────────────────────────────────
const S = {
  bg:          '#FFFFFF',  // sidebar background
  bgHover:     '#F5F5F5',  // sidebar item hover
  bgActive:    '#FFF0F0',  // sidebar item active
  border:      '#E5E7EB',  // sidebar border
  textMuted:   '#9CA3AF',  // nav icon default
  textSub:     '#6B7280',  // nav label default
  textActive:  '#FF5A5F',  // active nav label
  groupLabel:  '#D1D5DB',  // section group headers
  accent:      '#FF5A5F',  // coral — brand accent
  pill:        '#FF5A5F22',
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface ProviderRequest {
  id: string; name: string; phone: string; email: string;
  storeName: string; activity: string; status: string; requestedAt: string;
  selectedPackage?: string; billingCycle?: string; amountPaid?: string;
  paymentStatus?: string;
}

interface PlatformOwnerDashboardProps {
  providerRequests: ProviderRequest[];
  onApproveRequest: (id: string) => void;
  onLogout: () => void;
  onActivateProviderSubscription?: (reqId: string) => void;
  packages: SubscriptionPackage[];
  onAddPackage: (newPkg: SubscriptionPackage) => void;
  onUpdatePackage: (updatedPkg: SubscriptionPackage) => void;
  onDeletePackage: (id: string) => void;
}

// ─── Navigation groups ────────────────────────────────────────────────────────
const GROUPS: Record<string, { ar: string; en: string }> = {
  core:      { ar: 'الرئيسية',   en: 'CORE' },
  finance:   { ar: 'المالية',    en: 'FINANCE' },
  analytics: { ar: 'التحليلات',  en: 'ANALYTICS' },
  ops:       { ar: 'العمليات',   en: 'OPS' },
  config:    { ar: 'المنصة',     en: 'PLATFORM' },
  system:    { ar: 'النظام',     en: 'SYSTEM' },
};

const NAV: { id: AdminSection; icon: any; ar: string; en: string; group: string }[] = [
  { id: 'executive',    icon: LayoutDashboard, ar: 'نظرة تنفيذية',     en: 'Executive',    group: 'core' },
  { id: 'salons',       icon: Building2,       ar: 'الصالونات',         en: 'Salons',       group: 'core' },
  { id: 'users',        icon: Users,           ar: 'المستخدمون',        en: 'Users',        group: 'core' },
  { id: 'billing',      icon: CreditCard,      ar: 'الفوترة',           en: 'Billing',      group: 'finance' },
  { id: 'finance',      icon: DollarSign,      ar: 'الإيرادات',         en: 'Finance',      group: 'finance' },
  { id: 'bi',           icon: BarChart3,       ar: 'ذكاء الأعمال',      en: 'Intelligence', group: 'analytics' },
  { id: 'ai_insights',  icon: Brain,           ar: 'رؤى الذكاء',        en: 'AI Insights',  group: 'analytics' },
  { id: 'marketing',    icon: Megaphone,       ar: 'التسويق',           en: 'Marketing',    group: 'ops' },
  { id: 'support',      icon: MessageSquare,   ar: 'الدعم',             en: 'Support',      group: 'ops' },
  { id: 'reminders',    icon: BellRing,        ar: 'التجديدات',         en: 'Renewals',     group: 'ops' },
  { id: 'feature_flags',icon: ToggleLeft,      ar: 'الميزات',           en: 'Features',     group: 'config' },
  { id: 'api_keys',     icon: Key,             ar: 'API Keys',          en: 'API Keys',     group: 'config' },
  { id: 'content',      icon: FileText,        ar: 'المحتوى',           en: 'Content',      group: 'config' },
  { id: 'monitoring',   icon: Activity,        ar: 'المراقبة',          en: 'Monitoring',   group: 'config' },
  { id: 'export',       icon: Download,        ar: 'التصدير',           en: 'Export',       group: 'config' },
  { id: 'settings',     icon: Settings,        ar: 'الإعدادات',         en: 'Settings',     group: 'system' },
  { id: 'security',     icon: Shield,          ar: 'الأمن',             en: 'Security',     group: 'system' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlatformOwnerDashboard({
  providerRequests,
  onApproveRequest,
  onLogout,
  onActivateProviderSubscription,
  packages,
  onAddPackage,
  onUpdatePackage,
  onDeletePackage,
}: PlatformOwnerDashboardProps) {
  const { isAr } = useLanguage();
  const dir = isAr ? 'rtl' : 'ltr';
  const uid = useId();

  const [section, setSection]               = useState<AdminSection>('executive');
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [providers, setProviders]           = useState<RegisteredProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);

  // ── Guard: if the day-scoped token has expired, log out immediately ──────────
  useEffect(() => {
    if (!hasValidAdminSession()) {
      clearAdminCredentials();
      onLogout();
    }
  }, []);

  useEffect(() => {
    const headers = getAdminHeaders();
    if (!headers['X-Admin-Token']) return; // already handled above
    fetch('/api/providers', { headers })
      .then(r => { if (r.status === 401) { clearAdminCredentials(); onLogout(); return null; } return r.json(); })
      .then((data: { providers?: any[] } | null) => {
        if (!data) return;
        if (data.providers) {
          setProviders(data.providers.map(p => ({
            id:                String(p.id),
            storeName:         p.nameAr || p.nameEn || p.username,
            ownerName:         p.nameEn || p.nameAr || p.username,
            phone:             p.phone || '',
            email:             p.email || '',
            activity:          'صالون تجميل نسائي',
            city:              p.city || '',
            status:            (p.status as RegisteredProvider['status']) || 'trial',
            joinedAt:          p.createdAt ? p.createdAt.split('T')[0] : '',
            subdomain:         p.slug || p.username,
            totalSales:        0,
            paidOut:           0,
            pendingPayout:     0,
            subscriptionTier:  (p.subscriptionTier as RegisteredProvider['subscriptionTier']) || 'basic',
            subscriptionPrice: p.mrr || 0,
            subscriptionStatus:(p.subscriptionStatus === 'expired' ? 'cancelled'
                                : p.subscriptionStatus as RegisteredProvider['subscriptionStatus']) || 'trial',
            staffCount:        0,
            bookingsCount:     0,
            rating:            0,
            branches:          1,
            country:           'SA' as const,
            mrr:               p.mrr || 0,
            churnRisk:         (p.churnRisk as RegisteredProvider['churnRisk']) || 'low',
          })));
        }
      })
      .catch(err => console.error('[admin] failed to load providers:', err))
      .finally(() => setProvidersLoading(false));
  }, []);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    setToasts(prev => [...prev, { ...t, id: uid + Date.now() }]);
  }, [uid]);
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const [confirm, setConfirm] = useState<{ open: boolean; title: string; message: string; danger?: boolean; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const openConfirm = useCallback((cfg: { title: string; message: string; danger?: boolean; onConfirm: () => void }) => {
    setConfirm({ open: true, ...cfg });
  }, []);

  const pendingCount = providerRequests.filter(r => r.status === 'pending').length;
  const badges: Partial<Record<AdminSection, number>> = {
    salons:   pendingCount,
    support:  2,
    security: 1,
  };

  const current = NAV.find(n => n.id === section)!;

  const handleApprove = (id: string) => {
    onApproveRequest(id);
    if (onActivateProviderSubscription) onActivateProviderSubscription(id);
  };

  // ── Grouped nav rendering ──────────────────────────────────────────────────
  const groupOrder = ['core', 'finance', 'analytics', 'ops', 'config', 'system'];

  const NavItem = ({ item, mobile = false }: { item: typeof NAV[0]; mobile?: boolean }) => {
    const Icon  = item.icon;
    const badge = badges[item.id];
    const active = section === item.id;
    return (
      <button
        key={item.id}
        onClick={() => { setSection(item.id); if (mobile) setMobileSidebarOpen(false); }}
        style={{
          backgroundColor: active ? S.bgActive : 'transparent',
        }}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all cursor-pointer group relative text-start mb-0.5`}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = S.bgHover; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
      >
        {/* Active indicator bar */}
        {active && (
          <span
            className={`absolute ${isAr ? 'end-0' : 'start-0'} top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full`}
            style={{ backgroundColor: S.accent }}
          />
        )}

        <div className="relative shrink-0">
          <Icon
            className="w-3.5 h-3.5 transition-colors"
            style={{ color: active ? '#FFFFFF' : S.textMuted }}
          />
          {badge && badge > 0 && (
            <span
              className="absolute -top-1.5 -end-1.5 w-3.5 h-3.5 text-white text-[7px] font-black rounded-full flex items-center justify-center"
              style={{ backgroundColor: S.accent }}
            >
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </div>

        {(sidebarOpen || mobile) && (
          <span
            className="text-[11px] font-semibold transition-colors whitespace-nowrap"
            style={{ color: active ? S.textActive : S.textSub }}
          >
            {isAr ? item.ar : item.en}
          </span>
        )}
      </button>
    );
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: mobile ? S.bg : 'transparent' }}
    >
      {/* Logo + identity */}
      <div style={{ borderBottom: `1px solid ${S.border}` }}>
        <div className={`flex items-center justify-between px-4 pt-4 pb-3 ${!sidebarOpen && !mobile ? 'justify-center' : ''}`}>
          {(sidebarOpen || mobile) ? (
            <img src={confirmedLogo} alt="CONFIRMED" className="h-8 w-auto object-contain select-none brightness-0 invert opacity-90" draggable={false} />
          ) : (
            <img src={confirmedLogo} alt="CONFIRMED" className="h-6 w-6 object-contain object-left select-none brightness-0 invert opacity-90" draggable={false} />
          )}
          {!mobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-md transition-all hidden lg:flex cursor-pointer"
              style={{ color: S.textMuted }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FFFFFF'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = S.textMuted}
            >
              {isAr
                ? (sidebarOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />)
                : (sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)
              }
            </button>
          )}
        </div>

        {/* Role badge */}
        {(sidebarOpen || mobile) ? (
          <div className="mx-3 mb-3 px-3 py-2 rounded-lg flex items-center gap-2.5" style={{ backgroundColor: '#FF5A5F18', border: `1px solid #FF5A5F28` }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: '#FF5A5F22' }}>
              <Shield className="w-3 h-3" style={{ color: S.accent }} />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-wider uppercase leading-none" style={{ color: S.accent }}>
                {isAr ? 'مالك المنصة' : 'Platform Owner'}
              </p>
              <p className="text-[8px] mt-0.5 leading-none" style={{ color: S.textMuted }}>
                {isAr ? 'Super Admin' : 'Full Access'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center pb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF5A5F18', border: `1px solid #FF5A5F28` }}>
              <Shield className="w-3.5 h-3.5" style={{ color: S.accent }} />
            </div>
          </div>
        )}
      </div>

      {/* Grouped Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {groupOrder.map(groupKey => {
          const items = NAV.filter(n => n.group === groupKey);
          const grp   = GROUPS[groupKey];
          return (
            <div key={groupKey} className="mb-2">
              {(sidebarOpen || mobile) && (
                <p
                  className="text-[8px] font-black tracking-[0.18em] uppercase px-3 py-1.5 mb-0.5"
                  style={{ color: S.groupLabel }}
                >
                  {isAr ? grp.ar : grp.en}
                </p>
              )}
              {!sidebarOpen && !mobile && <div className="h-px mx-2 mb-2 mt-1" style={{ backgroundColor: S.border }} />}
              {items.map(item => <NavItem key={item.id} item={item} mobile={mobile} />)}
            </div>
          );
        })}
      </nav>

      {/* Bottom: user + logout */}
      <div className="p-3" style={{ borderTop: `1px solid ${S.border}` }}>
        {(sidebarOpen || mobile) ? (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1" style={{ backgroundColor: S.bgHover }}>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0"
              style={{ backgroundColor: S.accent }}
            >
              م
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold truncate" style={{ color: '#D0E8D8' }}>{isAr ? 'مالكة المنصة' : 'Platform Owner'}</p>
              <p className="text-[8px] font-mono truncate" style={{ color: S.textMuted }}>owner@confirmed.sa</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs" style={{ backgroundColor: S.accent }}>م</div>
          </div>
        )}
        <button
          onClick={() => setShowLogoutModal(true)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${!sidebarOpen && !mobile ? 'justify-center' : ''}`}
          style={{ color: '#EF4444' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#DC2626'; (e.currentTarget as HTMLElement).style.backgroundColor = '#FEF2F2'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {(sidebarOpen || mobile) && <span className="text-[10px] font-bold">{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
    <div className="flex h-screen overflow-hidden" dir={dir} style={{ backgroundColor: '#F9FAFB' }}>
      <AdminToast toasts={toasts} onDismiss={dismissToast} />
      <AdminConfirm
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        danger={confirm.danger}
        confirmLabel={isAr ? 'تأكيد' : 'Confirm'}
        cancelLabel={isAr ? 'إلغاء' : 'Cancel'}
        onConfirm={() => { confirm.onConfirm(); setConfirm(c => ({ ...c, open: false })); }}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <div className={`absolute top-0 bottom-0 w-60 shadow-2xl z-10 ${isAr ? 'right-0' : 'left-0'}`} style={{ backgroundColor: S.bg }}>
            <div className="flex justify-end p-3" style={{ borderBottom: `1px solid ${S.border}` }}>
              <button onClick={() => setMobileSidebarOpen(false)} className="p-1 rounded-md cursor-pointer" style={{ color: S.textMuted }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarContent mobile />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col transition-all duration-300 shrink-0 ${sidebarOpen ? 'w-52' : 'w-12'}`}
        style={{ backgroundColor: S.bg, borderInlineEnd: `1px solid ${S.border}` }}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar — clean architectural header */}
        <header
          className="flex items-center justify-between px-5 lg:px-6 py-3 shrink-0"
          style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg cursor-pointer"
              style={{ color: '#6B6860' }}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb-style title */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#B0A898' }}>
                  {isAr ? 'لوحة التحكم' : 'Admin'}
                </span>
                <span style={{ color: '#D8D2CA' }}>/</span>
                <h1 className="text-sm font-black tracking-tight" style={{ color: '#1C1B18' }}>
                  {isAr ? current.ar : current.en}
                </h1>
              </div>
              <p className="text-[9px] font-mono mt-0.5 hidden sm:block" style={{ color: '#B0A898' }}>
                {new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Pending alert chip */}
            {pendingCount > 0 && (
              <button
                onClick={() => setSection('salons')}
                className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#FDE68A'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#FEF3C7'}
              >
                <Building2 className="w-3 h-3" />
                {pendingCount} {isAr ? 'طلب معلق' : 'pending'}
              </button>
            )}

            {/* Bell */}
            <button
              className="relative p-2 rounded-lg transition-all cursor-pointer"
              style={{ color: '#8B8880' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#F3F4F6'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
            >
              <Bell className="w-4 h-4" />
              {pendingCount > 0 && (
                <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: S.accent }} />
              )}
            </button>

            {/* Live status */}
            <div
              className="hidden sm:flex items-center gap-1.5 text-[9px] font-bold px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: '#ECFDF5', border: '1px solid #D1FAE5', color: '#065F46' }}
            >
              <Circle className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500 animate-pulse" />
              {isAr ? 'متصل' : 'Live'}
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" style={{ backgroundColor: '#F9FAFB' }}>
          {section === 'executive' && (
            <AdminExecutive providers={providers} pendingCount={pendingCount} isAr={isAr} onNavigate={(s) => setSection(s as AdminSection)} />
          )}
          {section === 'salons' && (
            <AdminSalons providers={providers} setProviders={setProviders} pendingRequests={providerRequests}
              onApproveRequest={handleApprove} isAr={isAr} addToast={addToast} openConfirm={openConfirm} />
          )}
          {section === 'users' && <AdminUsers isAr={isAr} addToast={addToast} openConfirm={openConfirm} />}
          {section === 'billing' && (
            <AdminBilling providers={providers} setProviders={setProviders} packages={packages}
              onAddPackage={onAddPackage} onUpdatePackage={onUpdatePackage} onDeletePackage={onDeletePackage}
              isAr={isAr} addToast={addToast} openConfirm={openConfirm} />
          )}
          {section === 'bi'          && <AdminBI providers={providers} isAr={isAr} />}
          {section === 'marketing'   && <AdminMarketing providers={providers} isAr={isAr} addToast={addToast} />}
          {section === 'support'     && <AdminSupport isAr={isAr} addToast={addToast} />}
          {section === 'reminders'   && <AdminReminders isAr={isAr} addToast={addToast} />}
          {section === 'settings'    && <AdminSettings isAr={isAr} addToast={addToast} />}
          {section === 'security'    && <AdminSecurity isAr={isAr} addToast={addToast} />}
          {section === 'finance'     && <AdminFinance providers={providers} isAr={isAr} addToast={addToast} />}
          {section === 'feature_flags' && <AdminFeatureFlags isAr={isAr} addToast={addToast} />}
          {section === 'api_keys'    && <AdminApiKeys isAr={isAr} addToast={addToast} openConfirm={openConfirm} />}
          {section === 'monitoring'  && <AdminMonitoring isAr={isAr} addToast={addToast} />}
          {section === 'content'     && <AdminContent isAr={isAr} addToast={addToast} />}
          {section === 'ai_insights' && <AdminAIInsights providers={providers} isAr={isAr} addToast={addToast} />}
          {section === 'export'      && <AdminExport isAr={isAr} addToast={addToast} />}
        </main>
      </div>
    </div>

    <LogoutConfirmModal
      open={showLogoutModal}
      isAr={isAr}
      userName={isAr ? 'مالكة المنصة' : 'Platform Owner'}
      userRole="admin"
      onConfirm={() => { setShowLogoutModal(false); onLogout(); }}
      onCancel={() => setShowLogoutModal(false)}
    />
    </>
  );
}
