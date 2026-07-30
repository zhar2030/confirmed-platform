import React, { useState, useEffect } from 'react';
import confirmedLogo from '../assets/logo.png';
import { getProviderHeaders } from '../lib/providerAuth';
import { getUnifiedHeaders, getUnifiedSession, clearUnifiedSession } from '../lib/unifiedAuth';
import { usePermissions } from '../lib/usePermissions';
import AdminApprovals from './AdminApprovals';
import SubscriptionExpiredWall from './SubscriptionExpiredWall';
import DashboardOverview from './DashboardOverview';
import BookingsManager from './BookingsManager';
import POSManager from './POSManager';
import InventoryManager from './InventoryManager';
import CRMManager from './CRMManager';
import StaffManager from './StaffManager';
import MarketingManager from './MarketingManager';
import GiftCardsManager from './GiftCardsManager';
import ReportsManager from './ReportsManager';
import SettingsManager from './SettingsManager';
import CustomerIntelligence from './CustomerIntelligence';
import ExpensesManager from './ExpensesManager';
import ProviderProfileManager from './ProviderProfileManager';
import BenchmarkingManager from './BenchmarkingManager';
import IdealClientProfile from './IdealClientProfile';
import ExperienceManager from './ExperienceManager';
import DataSourcesManager from './DataSourcesManager';
import SubscriptionPaymentGateway from './SubscriptionPaymentGateway';
import WhatsAppManager from './WhatsAppManager';
import BranchManager from './BranchManager';
import AccountingIntegration from './AccountingIntegration';
import OnlineOffersManager from './OnlineOffersManager';
import { useLanguage } from '../LanguageContext';
import LogoutConfirmModal from './LogoutConfirmModal';
import { DASHBOARD_FEATURES, COMING_SOON_LABELS } from '../config/featureFlags';

import { 
  initialBookings, 
  initialServices, 
  initialProducts, 
  initialClients, 
  initialStaff, 
  initialInvoices, 
  initialPromotions, 
  initialGiftCards,
  initialBranches
} from '../data';

import { Booking, Service, Product, Client, Staff, Invoice, Promotion, GiftCard, Branch, ProviderRequest } from '../types';

import { 
  Calendar, 
  LayoutDashboard, 
  ShoppingBag, 
  Boxes, 
  Users, 
  Award, 
  Megaphone, 
  Gift, 
  BarChart3, 
  Settings as SettingsIcon, 
  LogOut, 
  Sparkles,
  Menu,
  X,
  Building2,
  CheckCircle,
  HelpCircle,
  BadgeAlert,
  Receipt,
  AlertTriangle,
  Lock,
  Target,
  Star,
  Database,
  ClipboardCheck,
  MessageCircle,
  GitBranch,
  Link2,
  Scissors,
  Globe,
} from 'lucide-react';

interface ProviderDashboardProps {
  onLogout: () => void;
  providerData: {
    id?: string;
    username: string;
    storeName?: string;
    activity?: string;
    name?: string;
    email?: string;
    phone?: string;
    paymentStatus?: string;
    selectedPackage?: string;
    billingCycle?: string;
    trialDaysLeft?: number;
    logoUrl?: string | null;
  } | null;
  providerRequests?: ProviderRequest[];
  onApproveProviderRequest?: (reqId: string) => void;
  onUpdateProviderSubscription?: (reqId: string, packageType: string, billingCycle: 'monthly' | 'yearly', amountPaid: string, paymentMethod: string) => void;
  onUpdateProviderPaymentStatus?: (reqId: string, newStatus: string) => void;
}

export default function ProviderDashboard({ 
  onLogout, 
  providerData,
  providerRequests = [],
  onApproveProviderRequest,
  onUpdateProviderSubscription,
  onUpdateProviderPaymentStatus
}: ProviderDashboardProps) {
  const { lang, toggleLanguage, t, dir, isAr, isEn } = useLanguage();
  const [activeTab, setActiveTab] = useState('dash');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [deepLinkClientId, setDeepLinkClientId] = useState<string | undefined>(undefined);

  // ── DB provider ID (resolved from session or username) ───────────────────
  const [dbProviderId, setDbProviderId] = useState<number | null>(null);
  const [providerSlug, setProviderSlug] = useState<string | null>(null);
  const [onlineBookingEnabled, setOnlineBookingEnabled] = useState(false);

  useEffect(() => {
    // Staff sessions: tenantId is already available in the unified session
    const session = getUnifiedSession();
    if (session?.actorType === 'staff' && session?.tenantId) {
      setDbProviderId(session.tenantId);
      return;
    }

    // Owner sessions: look up provider record by username
    if (!providerData?.username) return;
    const un = providerData.username === 'admin'
      ? null  // super-admin has no provider record
      : providerData.username;
    if (!un) return;
    fetch(`/api/auth/provider/${encodeURIComponent(un)}`)
      .then(r => r.json())
      .then(data => {
        if (data.provider?.id) setDbProviderId(data.provider.id);
        if (data.provider?.slug) setProviderSlug(data.provider.slug);
        if (data.provider?.online_booking_enabled != null) setOnlineBookingEnabled(data.provider.online_booking_enabled);
      })
      .catch(() => { /* offline / not found — keep local mode */ });
  }, [providerData?.username]);

  // Core App States — start empty, populated from API once provider ID is resolved
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  // ── Fetch all tenant data — hard reset on every provider ID change ────────
  useEffect(() => {
    if (!dbProviderId) return;

    // Hard reset: wipe every state to [] the moment tenant ID is known.
    // This guarantees zero cross-tenant data leakage even for one render frame
    // — same pattern used by Shopify, Stripe, and HubSpot multi-tenant SaaS.
    setBookings([]);
    setClients([]);
    setStaff([]);
    setServices([]);
    setProducts([]);
    setInvoices([]);
    setPromotions([]);
    setGiftCards([]);

    const h = { 'Content-Type': 'application/json', ...getUnifiedHeaders() };

    // Fetch wrapper that catches 402 subscription_expired responses
    const safeFetch = async (url: string) => {
      const res = await fetch(url, { headers: h });
      if (res.status === 402) {
        const body = await res.clone().json().catch(() => ({}));
        if (body?.error === 'subscription_expired') setSubscriptionExpired(true);
        return null;
      }
      if (!res.ok) return null;
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) return null;
      return res.json().catch(() => null);
    };

    const loadAll = () =>
      Promise.all([
        safeFetch('/api/bookings'),
        safeFetch('/api/clients'),
        safeFetch('/api/staff'),
        safeFetch('/api/services'),
        safeFetch('/api/invoices'),
      ]).then(([bd, cd, sd, svcD, invD]) => {
        if (bd   && Array.isArray(bd.bookings))   setBookings(bd.bookings);
        if (cd   && Array.isArray(cd.clients))    setClients(cd.clients);
        if (sd   && Array.isArray(sd.staff))      setStaff(sd.staff);
        if (svcD && Array.isArray(svcD.services)) setServices(svcD.services);
        if (invD && Array.isArray(invD.invoices)) setInvoices(invD.invoices);
      }).catch(err => console.error('[dashboard] data load error', err));

    // Initial load
    loadAll();

    // Auto-refresh every 30 seconds to keep data accurate
    const interval = setInterval(loadAll, 30_000);
    return () => clearInterval(interval);
  }, [dbProviderId]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);

  // Branch Management States — always starts from the logged-in provider's data only
  const [branches, setBranches] = useState<Branch[]>(() => {
    const name = providerData?.storeName ?? 'الصالون الرئيسي';
    return [
      {
        id: 'br-main',
        nameAr: name,
        nameEn: name,
        cityAr: 'الفرع الرئيسي',
        cityEn: 'Main Branch',
        addressAr: 'العنوان الرئيسي',
        addressEn: 'Main Address',
      },
    ];
  });

  const [currentBranchId, setCurrentBranchId] = useState<string>('br-main');

  // Filtered lists based on current selected branch
  const branchBookings = (() => {
    const all = bookings.filter(b => {
      if (providerData?.storeName) return true;
      return (b.branchId || 'br-riyadh') === currentBranchId;
    });
    // Specialist role: show only own bookings
    const _session = getUnifiedSession();
    if (_session?.role === 'specialist' && _session?.actorId) {
      const myId = String(_session.actorId);
      return all.filter(b => String(b.staffId) === myId);
    }
    return all;
  })();

  const branchProducts = products.filter(p => {
    if (providerData?.storeName) {
      return true;
    }
    return (p.branchId || 'br-riyadh') === currentBranchId;
  });

  const branchInvoices = invoices.filter(inv => {
    if (providerData?.storeName) {
      return true;
    }
    return (inv.branchId || 'br-riyadh') === currentBranchId;
  });

  const currentBranch = branches.find(b => b.id === currentBranchId) || branches[0];

  // ── Permissions ─────────────────────────────────────────────────────────────
  const perms = usePermissions();

  // ── Subscription expired wall (caught from API 402 responses) ───────────────
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);

  // ── API helpers ─────────────────────────────────────────────────────────────
  // Send unified headers when available; fall back to legacy provider headers.
  const apiHeaders = () => ({
    'Content-Type': 'application/json',
    ...getUnifiedHeaders(),  // includes unified + legacy X-Provider-* headers
  });

  // Wrap fetch so any 402 subscription_expired response shows the wall
  const apiFetch = async (url: string, opts?: RequestInit): Promise<Response> => {
    const res = await fetch(url, { ...opts, headers: { ...apiHeaders(), ...(opts?.headers ?? {}) } });
    if (res.status === 402) {
      const body = await res.clone().json().catch(() => ({}));
      if (body?.error === 'subscription_expired') setSubscriptionExpired(true);
    }
    return res;
  };

  // Core Updators
  const handleAddBooking = async (newBooking: Booking) => {
    // Optimistic update
    const bookingWithBranch = { ...newBooking, branchId: currentBranchId };
    setBookings(prev => [bookingWithBranch, ...prev]);
    setStaff(prev => prev.map(s => s.id === newBooking.staffId ? { ...s, bookingsToday: s.bookingsToday + 1 } : s));
    // Persist to DB
    if (dbProviderId) {
      try {
        const res = await fetch('/api/bookings', {
          method: 'POST', headers: apiHeaders(),
          body: JSON.stringify({ ...newBooking, branchId: currentBranchId }),
        });
        const data = await res.json();
        if (data.booking) {
          // Replace temp ID with DB-assigned ID
          setBookings(prev => prev.map(b => b.id === newBooking.id ? data.booking : b));
        }
      } catch (err) { console.error('[addBooking]', err); }
    }
  };

  const handleUpdateBookingStatus = (bookingId: string, status: 'pending' | 'confirmed' | 'attended' | 'cancelled' | 'no_show') => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
    if (dbProviderId) {
      fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT', headers: apiHeaders(), body: JSON.stringify({ status }),
      }).catch(err => console.error('[updateStatus]', err));
    }
  };

  const handleUpdateBookingTime = (bookingId: string, time: string) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, time } : b));
    if (dbProviderId) {
      fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT', headers: apiHeaders(), body: JSON.stringify({ time }),
      }).catch(err => console.error('[updateTime]', err));
    }
  };

  const handleAddInvoice = async (newInvoice: Invoice) => {
    const invoiceWithBranch = { ...newInvoice, branchId: currentBranchId };
    // Optimistic update
    setInvoices(prev => [invoiceWithBranch, ...prev]);
    // Increment client visits & loyalty points locally
    setClients(prev => prev.map(c => {
      if (c.name === newInvoice.clientName) {
        const earnedPoints = Math.max(1, Math.floor(newInvoice.total / 10));
        return { ...c, visits: c.visits + 1, loyaltyPoints: (c.loyaltyPoints || 0) + earnedPoints };
      }
      return c;
    }));
    // Persist to DB
    if (dbProviderId) {
      try {
        const res = await fetch('/api/invoices', {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify(invoiceWithBranch),
        });
        const data = await res.json().catch(() => ({}));
        if (data.invoice?.id) {
          // Replace temp ID with DB-assigned ID
          setInvoices(prev => prev.map(inv => inv.id === newInvoice.id ? { ...inv, id: data.invoice.id } : inv));
        }
      } catch (err) { console.error('[addInvoice]', err); }
    }
  };

  const handleUpdateClientPoints = (clientId: string, newPoints: number) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, loyaltyPoints: newPoints } : c));
    if (dbProviderId) {
      fetch(`/api/clients/${clientId}`, {
        method: 'PUT', headers: apiHeaders(), body: JSON.stringify({ loyaltyPoints: newPoints }),
      }).catch(err => console.error('[updatePoints]', err));
    }
  };

  const handleUpdateProductStock = (productId: string, newStock: number) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
  };

  const handleUpdateProductMinStock = (productId: string, newMinStock: number) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, minStock: newMinStock } : p));
  };

  const handleAddProduct = (newProduct: Product) => {
    const productWithBranch = { ...newProduct, branchId: currentBranchId };
    setProducts(prev => [productWithBranch, ...prev]);
  };

  const handleAddClient = async (newClient: Client) => {
    setClients(prev => [newClient, ...prev]);
    if (dbProviderId) {
      try {
        const res = await fetch('/api/clients', {
          method: 'POST', headers: apiHeaders(), body: JSON.stringify(newClient),
        });
        const data = await res.json();
        if (data.client) setClients(prev => prev.map(c => c.id === newClient.id ? data.client : c));
      } catch (err) { console.error('[addClient]', err); }
    }
  };

  const handleUpdateClientNotes = (clientId: string, newNotes: string) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, notes: newNotes } : c));
    if (dbProviderId) {
      fetch(`/api/clients/${clientId}`, {
        method: 'PUT', headers: apiHeaders(), body: JSON.stringify({ notes: newNotes }),
      }).catch(err => console.error('[updateNotes]', err));
    }
  };

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    if (dbProviderId) {
      const { id, ...rest } = updatedClient;
      fetch(`/api/clients/${id}`, {
        method: 'PUT', headers: apiHeaders(), body: JSON.stringify(rest),
      }).catch(err => console.error('[updateClient]', err));
    }
  };

  const handleIncrementVisits = (clientId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const newVisits = c.visits + 1;
      if (dbProviderId) {
        fetch(`/api/clients/${clientId}`, {
          method: 'PUT', headers: apiHeaders(), body: JSON.stringify({ visits: newVisits }),
        }).catch(err => console.error('[incrementVisits]', err));
      }
      return { ...c, visits: newVisits };
    }));
  };

  const handleAddStaff = async (newStaff: Staff) => {
    setStaff(prev => [newStaff, ...prev]);
    if (dbProviderId) {
      try {
        const res = await fetch('/api/staff', {
          method: 'POST', headers: apiHeaders(), body: JSON.stringify(newStaff),
        });
        const data = await res.json();
        if (data.staff) setStaff(prev => prev.map(s => s.id === newStaff.id ? data.staff : s));
      } catch (err) { console.error('[addStaff]', err); }
    }
  };

  const handleUpdateStaff = (updatedStaff: Staff) => {
    setStaff(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));
    if (dbProviderId) {
      const { id, ...rest } = updatedStaff;
      fetch(`/api/staff/${id}`, {
        method: 'PUT', headers: apiHeaders(), body: JSON.stringify(rest),
      }).catch(err => console.error('[updateStaff]', err));
    }
  };

  const handleAddPromotion = (newPromo: Promotion) => {
    setPromotions(prev => [newPromo, ...prev]);
  };

  const handleTogglePromoStatus = (promoId: string) => {
    setPromotions(prev => prev.map(p => p.id === promoId ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p));
  };

  const handleAddGiftCard = (newCard: GiftCard) => {
    setGiftCards(prev => [newCard, ...prev]);
  };

  const handleToggleCardStatus = (cardId: string) => {
    setGiftCards(prev => prev.map(c => c.id === cardId ? { ...c, status: c.status === 'active' ? 'used' : 'active' } : c));
  };

  // All tabs definition
  const allTabs = [
    { id: 'dash',      name: t('dash'),                                               icon: LayoutDashboard },
    { id: 'intel',     name: isAr ? 'سلوك العملاء (AI)' : 'Customer Behaviour (AI)', icon: Sparkles },
    { id: 'crm',       name: t('crm'),                                                icon: Users },
    { id: 'icp',       name: isAr ? 'العميلة المثالية'   : 'Ideal Client Profile',   icon: BadgeAlert },
    { id: 'mkt',       name: t('mkt'),                                                icon: Megaphone },
    { id: 'cx',        name: isAr ? 'إدارة التجربة' : 'Experience Management',       icon: Star },
    { id: 'gift',      name: t('gift'),                                               icon: Gift },
    { id: 'staff',     name: t('staff'),                                              icon: Award },
    { id: 'book',      name: t('book'),                                               icon: Calendar },
    { id: 'pos',       name: t('pos'),                                                icon: ShoppingBag },
    { id: 'inv',       name: t('inv'),                                                icon: Boxes },
    { id: 'exp',       name: isAr ? 'المصاريف اليومية'   : 'Daily Expenses',         icon: Receipt },
    { id: 'rep',       name: t('rep'),                                                icon: BarChart3 },
    { id: 'approvals', name: isAr ? 'طلبات الموافقة'      : 'Approval Requests',     icon: ClipboardCheck },
    { id: 'set',       name: t('set'),                                                icon: SettingsIcon },
    { id: 'profile',   name: isAr ? 'الملف التعريفي'     : 'Provider Profile',       icon: Building2 },
    { id: 'data',      name: isAr ? 'مصادر البيانات'     : 'Data Sources',            icon: Database },
    { id: 'services',   name: isAr ? 'العروض الأونلاين'     : 'Online Offers',            icon: Globe },
    { id: 'branches',   name: isAr ? 'إدارة الفروع'       : 'Branch Management',       icon: GitBranch },
    { id: 'accounting', name: isAr ? 'ربط المحاسبة'       : 'Accounting Integration',  icon: Link2 },
    { id: 'whatsapp',   name: isAr ? 'واتساب بيزنس'       : 'WhatsApp Business',       icon: MessageCircle },
    // coming soon
    { id: 'benchmark', name: isAr ? 'المقارنة المعيارية' : 'Benchmarking',           icon: Target },
  ];

  // Active tabs (feature-flagged + permission-gated for staff roles)
  const sidebarTabs = allTabs.filter(tab => {
    if (!DASHBOARD_FEATURES[tab.id]) return false; // feature flag must be on
    // Permission gates — only apply when a unified session exists (staff or owner role)
    if (tab.id === 'approvals') return perms.canReviewApprovals;
    if (tab.id === 'staff')     return perms.canReadStaff;
    if (tab.id === 'set')       return perms.canReadSettings;
    if (tab.id === 'rep')       return perms.canReadReports;
    return true;
  });

  // Coming-soon tabs (hidden from nav, shown as teaser)
  const comingSoonTabs = allTabs.filter(tab => !DASHBOARD_FEATURES[tab.id]);

  const currentTabName = sidebarTabs.find(t => t.id === activeTab)?.name || '';

  // ── Subscription expired wall ────────────────────────────────────────────────
  if (subscriptionExpired) {
    const session = getUnifiedSession();
    return (
      <SubscriptionExpiredWall
        onRenew={() => {
          setSubscriptionExpired(false);
          setShowPaymentGateway(true);
        }}
        onLogout={() => {
          clearUnifiedSession();
          onLogout();
        }}
      />
    );
  }

  // Subscription check
  const isPaid = providerData?.paymentStatus === 'paid_verified';
  const isTrialActive = providerData?.paymentStatus === 'trial_active' && (providerData?.trialDaysLeft === undefined || providerData?.trialDaysLeft > 0);
  const [localPaymentComplete, setLocalPaymentComplete] = useState(false);

  // ── بوابة الدفع — تظهر عند انتهاء التجربة أو طلب الترقية ──────────────────
  if ((!isPaid && !isTrialActive && !localPaymentComplete && providerData && providerData.username !== 'admin') || showPaymentGateway) {
    return (
      <SubscriptionPaymentGateway
        providerData={providerData ? {
          id: providerData.id,
          username: providerData.username,
          storeName: providerData.storeName,
          activity: providerData.activity,
          name: providerData.name,
          email: providerData.email,
          phone: providerData.phone,
        } : null}
        onPaymentSuccess={(packageType, billingCycle, amountPaid, paymentMethod) => {
          setShowPaymentGateway(false);
          setLocalPaymentComplete(true);
          onUpdateProviderSubscription?.(
            String(providerData?.id ?? ''),
            packageType,
            billingCycle,
            amountPaid,
            paymentMethod,
          );
        }}
        onCancel={() => {
          // إذا كانت التجربة لا تزال نشطة → يرجع للوحة التحكم
          // إذا انتهت التجربة → لا يمكن الرجوع، يظهر خيار تسجيل الخروج فقط
          if (isTrialActive || localPaymentComplete || isPaid) {
            setShowPaymentGateway(false);
          } else {
            setShowLogoutModal(true);
          }
        }}
      />
    );
  }

  return (
    <>
    <div className="min-h-screen bg-[#F6F6F4] text-[#1C1B18] flex flex-col md:flex-row antialiased select-none font-sans" dir={dir}>
      
      {/* ===== MOBILE HEADER BAR ===== */}
      <header className="md:hidden bg-[#F8FAFC] border-b border-slate-200 px-5 py-4 flex items-center justify-between sticky top-0 z-40 w-full shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer flex items-center justify-center shadow-xs"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {providerData?.logoUrl ? (
              <img src={providerData.logoUrl} alt="logo" className="h-8 w-8 rounded-lg object-cover border border-slate-200" />
            ) : null}
            <div>
              <span className="font-sans text-lg font-black text-slate-900 tracking-wider uppercase block leading-none">
                {providerData?.storeName || t('brandName')}
              </span>
              <span className="text-[9px] text-[#FF5A5F] uppercase font-bold block leading-none mt-1">
                {isAr ? 'لوحة تحكم الشركاء' : 'PARTNER DASHBOARD'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 rounded-lg bg-slate-200/80 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-all cursor-pointer"
          >
            {isAr ? 'EN' : 'AR'}
          </button>
        </div>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 md:hidden transition-all duration-300"
        />
      )}

      {/* ===== SIDEBAR ===== */}
      <aside className={`
        fixed md:sticky md:top-0 inset-y-0 top-0 z-50 w-64 md:h-screen bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9] text-slate-600 flex flex-col shrink-0 border-slate-200/80 transition-all duration-300 shadow-2xl md:shadow-none
        ${isAr ? 'right-0 border-l md:border-l-2' : 'left-0 border-r md:border-r-2'}
        ${mobileMenuOpen ? 'translate-x-0' : (isAr ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0')}
      `}>
        
        {/* Brand / Header */}
        <div className="overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col gap-3 relative">
            {/* Close Button on Mobile Drawer */}
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden absolute top-4 left-4 p-1.5 rounded-lg bg-slate-200/50 hover:bg-slate-200 text-slate-700 cursor-pointer"
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between w-full">
              {/* Logo: salon logo if uploaded, else CONFIRMED platform logo */}
              {providerData?.logoUrl ? (
                <img src={providerData.logoUrl} alt="salon logo" className="h-10 w-10 rounded-xl object-cover border border-white/20 shadow-sm" draggable={false} />
              ) : (
                <img src={confirmedLogo} alt="CONFIRMED" className="h-8 w-auto object-contain select-none" draggable={false} />
              )}
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    toggleLanguage();
                    setMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-200/80 text-slate-700 text-[11px] font-bold hover:bg-slate-300 transition-all cursor-pointer"
                  title={isAr ? 'English' : 'العربية'}
                >
                  {isAr ? 'EN' : 'AR'}
                </button>
              </div>
            </div>
            <div>
              <span className="font-serif text-lg font-black text-slate-900 tracking-tight block truncate">
                {providerData?.storeName || t('brandName')}
              </span>
              <span className="text-[9px] text-[#FF5A5F] uppercase font-bold block leading-none mt-1">
                {isAr ? 'بوابة تشغيل مزودي الخدمة' : 'Provider Cloud Portal'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {sidebarTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-start ${
                    isActive
                      ? 'bg-[#FF5A5F] text-white shadow-lg shadow-[#FF5A5F]/20'
                      : 'hover:bg-slate-200/50 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.name}</span>
                </button>
              );
            })}

            {/* ── Coming Soon ─────────────────────────────── */}
            {comingSoonTabs.length > 0 && (
              <div className="pt-3 mt-2 border-t border-slate-200/70">
                <p className="px-4 pb-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.18em]">
                  {isAr ? 'قريباً' : 'Coming Soon'}
                </p>
                {comingSoonTabs.map(tab => {
                  const Icon = tab.icon;
                  const label = COMING_SOON_LABELS[tab.id];
                  return (
                    <div
                      key={tab.id}
                      title={isAr ? 'قريباً — هذه الخدمة ستُطلق قريباً' : 'Coming soon — this feature will be available soon'}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 cursor-not-allowed select-none"
                    >
                      <Icon className="w-4 h-4 shrink-0 opacity-40" />
                      <span className="opacity-50">{label ? (isAr ? label.ar : label.en) : tab.name}</span>
                      <span className="ms-auto text-[8px] font-black bg-[#FFAE34]/15 text-[#FFAE34] px-1.5 py-0.5 rounded-md tracking-wide shrink-0">
                        {isAr ? 'قريباً' : 'SOON'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </nav>
        </div>

        {/* Footer / User card */}
        <div className="p-4 border-t border-slate-200 mt-auto">
          <div className={`px-3 py-2.5 rounded-xl text-[10px] space-y-1 border flex items-start justify-between gap-2 ${
            perms.isStaff
              ? 'bg-[#C9A84C]/5 border-[#C9A84C]/20'
              : 'bg-[#FF5A5F]/5 border-[#FF5A5F]/10'
          }`}>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-slate-800 font-bold truncate">
                👤 {providerData?.name || t('currentUser')}
              </p>
              {perms.isStaff ? (
                <>
                  <p className="font-semibold" style={{ color: '#C9A84C' }}>
                    🏷️ {(() => {
                      const roleMap: Record<string, [string, string]> = {
                        manager:    ['مدير', 'Manager'],
                        cashier:    ['كاشير', 'Cashier'],
                        specialist: ['متخصصة', 'Specialist'],
                      };
                      return roleMap[perms.role]?.[isAr ? 0 : 1] ?? perms.role;
                    })()}
                  </p>
                  <p className="text-slate-500 font-medium truncate">🏢 {providerData?.storeName || ''}</p>
                </>
              ) : (
                <p className="text-slate-500 font-medium">📍 {isAr ? currentBranch.nameAr : currentBranch.nameEn}</p>
              )}
              <p className="text-emerald-700 font-bold text-[9px] uppercase font-mono tracking-wider flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isAr ? 'حساب نشط ومفعّل' : 'Active Account'}
              </p>
            </div>

            <button
              onClick={() => { setShowLogoutModal(true); setMobileMenuOpen(false); }}
              title={isAr ? 'تسجيل الخروج' : 'Sign out'}
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer mt-0.5"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </aside>

      {/* ===== MAIN BODY ===== */}
      <main className="flex-1 p-5 md:p-10 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
        
        {/* Trial Status Banner */}
        {providerData?.paymentStatus === 'trial_active' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-bold shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p>{isAr ? `تنبيه الحساب: يتبقى لكِ ${providerData.trialDaysLeft || 14} يوماً في الفترة التجريبية المجانية.` : `Trial Alert: You have ${providerData.trialDaysLeft || 14} days left in your free trial.`}</p>
                <p className="font-normal text-[10px] text-amber-700 mt-0.5">{isAr ? 'سيتم إيقاف حسابك تلقائياً فور انتهاء المدة ما لم يتم تفعيل قيمة الباقة من قبل إدارة الموقع.' : 'Your account will lock automatically unless subscription is approved by the site administration.'}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowPaymentGateway(true)}
              className="px-3.5 py-1.5 bg-[#FF5A5F] hover:bg-[#ff4248] text-white rounded-lg transition-all cursor-pointer shadow-xs text-[10px] shrink-0"
            >
              {isAr ? 'ترقية وتفعيل الحساب الآن' : 'Upgrade & Activate Now'}
            </button>
          </div>
        )}

        {/* Breadcrumbs, Title & Dynamic Branch Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E9E7E2]">
          <div>
            <span className="text-xs font-bold text-[#6E6A63]">{providerData?.storeName || t('brandName')} / {t('dash')}</span>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-slate-900 mt-1">{currentTabName}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Business Status */}
            <div className="text-xs text-[#6E6A63] font-medium px-3 py-1.5 bg-[#F6F6F4] rounded-xl border border-[#E9E7E2] select-none flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isAr ? 'مفتوح للعمل · تشفير سحابي آمن' : 'Open for Business · Secure Encrypted Session'}</span>
            </div>

            {/* Quick Manual Lock Screen Action */}
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('request-lock'));
              }}
              title={isAr ? 'قفل الشاشة السيبرانية يدوياً لحماية السجل (Ctrl + L)' : 'Lock terminal screen manually to secure records (Ctrl + L)'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isAr ? 'قفل المحطة 🔒' : 'Lock POS 🔒'}</span>
            </button>

            {/* Premium Branch Switching select element */}
            <div className="flex items-center gap-2 bg-white border border-[#E9E7E2] rounded-xl px-3 py-1.5 shadow-xs transition-all hover:border-[#FF5A5F]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A5F] animate-ping" />
              <select
                value={currentBranchId}
                onChange={(e) => setCurrentBranchId(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-[#14332B] focus:outline-none cursor-pointer pr-1"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id} className="text-[#1C1B18] font-medium bg-white">
                    {isAr ? b.nameAr : b.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ===== SWITCH ACTIVE VIEW ===== */}
        {activeTab === 'dash' && (
          <DashboardOverview 
            bookings={branchBookings}
            products={branchProducts}
            invoices={branchInvoices}
            clientsCount={clients.length}
            onNavigate={(page) => setActiveTab(page)}
            staffList={staff}
            dbProviderId={dbProviderId}
          />
        )}

        {activeTab === 'book' && (
          <BookingsManager 
            bookings={branchBookings}
            services={services}
            staffList={staff}
            onAddBooking={handleAddBooking}
            onUpdateStatus={handleUpdateBookingStatus}
            onUpdateBookingTime={handleUpdateBookingTime}
          />
        )}

        {activeTab === 'pos' && (
          <POSManager 
            services={services}
            products={branchProducts}
            invoices={branchInvoices}
            onAddInvoice={handleAddInvoice}
            onUpdateProductStock={handleUpdateProductStock}
            currentBranch={currentBranch}
          />
        )}

        {activeTab === 'inv' && (
          <InventoryManager 
            products={branchProducts}
            onAddProduct={handleAddProduct}
            onUpdateStock={handleUpdateProductStock}
            onUpdateMinStock={handleUpdateProductMinStock}
          />
        )}

        {activeTab === 'crm' && (
          <CRMManager 
            clients={clients}
            onAddClient={handleAddClient}
            onUpdateClientNotes={handleUpdateClientNotes}
            onIncrementVisits={handleIncrementVisits}
            onUpdateClientPoints={handleUpdateClientPoints}
            onUpdateClient={handleUpdateClient}
            onOpenClientProfile={(clientId) => {
              setDeepLinkClientId(clientId);
              setActiveTab('intel');
            }}
          />
        )}

        {activeTab === 'intel' && (
          <CustomerIntelligence
            initialClientId={deepLinkClientId}
            key={deepLinkClientId ?? 'intel'}
          />
        )}

        {activeTab === 'exp' && (
          <ExpensesManager currentBranchId={currentBranchId} />
        )}

        {activeTab === 'staff' && (
          <StaffManager 
            staffList={staff}
            onAddStaff={handleAddStaff}
            onUpdateStaff={handleUpdateStaff}
          />
        )}

        {activeTab === 'mkt' && (
          <MarketingManager 
            promotions={promotions}
            onAddPromotion={handleAddPromotion}
            onTogglePromoStatus={handleTogglePromoStatus}
          />
        )}

        {activeTab === 'data' && (
          <DataSourcesManager dbProviderId={dbProviderId} />
        )}

        {activeTab === 'cx' && (
          <ExperienceManager
            clients={clients}
            bookings={branchBookings}
            staffList={staff}
            services={services}
          />
        )}

        {activeTab === 'gift' && (
          <GiftCardsManager 
            giftCards={giftCards}
            onAddGiftCard={handleAddGiftCard}
            onToggleCardStatus={handleToggleCardStatus}
          />
        )}

        {activeTab === 'rep' && (
          <ReportsManager 
            bookings={branchBookings}
            invoices={branchInvoices}
            staffList={staff}
            services={services}
          />
        )}

        {activeTab === 'icp' && (
          <IdealClientProfile
            clients={clients}
            bookings={bookings}
            invoices={invoices}
            services={services}
            products={products}
            staffList={staff}
          />
        )}

        {activeTab === 'benchmark' && (
          <BenchmarkingManager />
        )}

        {activeTab === 'approvals' && (
          <AdminApprovals />
        )}

        {activeTab === 'profile' && (
          <ProviderProfileManager initialData={providerData} />
        )}

        {activeTab === 'services' && (
          <div className="bg-white rounded-2xl border border-[#E9E7E2] p-6 shadow-sm">
            <OnlineOffersManager
              dbProviderId={dbProviderId}
              providerSlug={providerSlug}
              branches={branches.map(b => ({ id: String(b.id), name: b.nameAr || b.nameEn, isActive: true }))}
              initialOnlineBookingEnabled={onlineBookingEnabled}
              onBookingToggled={(enabled) => setOnlineBookingEnabled(enabled)}
            />
          </div>
        )}

        {activeTab === 'branches' && (
          <BranchManager dbProviderId={dbProviderId} />
        )}

        {activeTab === 'accounting' && (
          <div className="bg-white rounded-2xl border border-[#E9E7E2] p-6 shadow-sm">
            <AccountingIntegration dbProviderId={dbProviderId} />
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <WhatsAppManager />
        )}

        {activeTab === 'set' && (
          <SettingsManager
            dbProviderId={dbProviderId}
            providerSlug={providerSlug}
            initialOnlineBookingEnabled={onlineBookingEnabled}
          />
        )}

        <footer className="mt-12 pt-6 border-t border-[#E9E7E2] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#6E6A63]">
          <span>© {isAr ? 'CONFIRMED ٢٠٢٦ — جميع الحقوق محفوظة لشركاء كُونفيرمد.' : 'CONFIRMED 2026 — All rights reserved to Confirmed Partners.'}</span>
          <span className="font-bold tracking-wider text-[#FF5A5F]">{t('byAhmed')}</span>
          <span>{t('brandDesc')}</span>
        </footer>

      </main>

    </div>

    {/* نافذة تأكيد تسجيل الخروج */}
    <LogoutConfirmModal
      open={showLogoutModal}
      isAr={isAr}
      userName={providerData?.name || providerData?.username}
      userRole="provider"
      onConfirm={() => { setShowLogoutModal(false); onLogout(); }}
      onCancel={() => setShowLogoutModal(false)}
    />
    </>
  );
}
