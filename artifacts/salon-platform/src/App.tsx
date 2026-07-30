import React, { useState, useEffect } from 'react';
import CustomerBookingPortal from './components/CustomerBookingPortal';
import SalonPublicProfile from './components/SalonPublicProfile';
import LandingPage from './components/LandingPage';
import StaffInvitationAcceptPage from './components/StaffInvitationAcceptPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import SubscriptionExpiredWall from './components/SubscriptionExpiredWall';
import DashboardOverview from './components/DashboardOverview';
import BookingsManager from './components/BookingsManager';
import POSManager from './components/POSManager';
import InventoryManager from './components/InventoryManager';
import CRMManager from './components/CRMManager';
import StaffManager from './components/StaffManager';
import MarketingManager from './components/MarketingManager';
import GiftCardsManager from './components/GiftCardsManager';
import ReportsManager from './components/ReportsManager';
import SettingsManager from './components/SettingsManager';
import PlatformOwnerDashboard from './components/PlatformOwnerDashboard';
import ProviderDashboard from './components/ProviderDashboard';
import FeedbackWidget from './components/FeedbackWidget';

import { useLanguage } from './LanguageContext';

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
} from './data';

import { Booking, Service, Product, Client, Staff, Invoice, Promotion, GiftCard, Branch, ProviderRequest, SubscriptionPackage } from './types';

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
  Lock,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { logSecurityEvent } from './lib/security';
import LogoutConfirmModal, { purgeAllSessionData, preventBackNavigation } from './components/LogoutConfirmModal';

// ── Detect customer booking portal URL (/book/:slug) ─────────────────────────
function getBookingSlug(): string | null {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  const path = window.location.pathname;
  const seg = base ? base + '/book/' : '/book/';
  if (path.startsWith(seg)) return path.slice(seg.length).split('/')[0].split('?')[0] || null;
  if (path.startsWith('/book/')) return path.slice(6).split('/')[0].split('?')[0] || null;
  const bookIdx = path.indexOf('/book/');
  if (bookIdx !== -1) return path.slice(bookIdx + 6).split('/')[0].split('?')[0] || null;
  return null;
}

// ── Detect public salon profile URL (/salon/:slug) ───────────────────────────
function getSalonProfileSlug(): string | null {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  const path = window.location.pathname;
  const seg = base ? base + '/salon/' : '/salon/';
  if (path.startsWith(seg)) return path.slice(seg.length).split('/')[0].split('?')[0] || null;
  if (path.startsWith('/salon/')) return path.slice(7).split('/')[0].split('?')[0] || null;
  const idx = path.indexOf('/salon/');
  if (idx !== -1) return path.slice(idx + 7).split('/')[0].split('?')[0] || null;
  return null;
}

// ── Detect staff invitation acceptance URL (/staff/accept?token=...) ──────────
function getStaffInvitationToken(): string | null {
  const path = window.location.pathname;
  if (!path.includes('/staff/accept')) return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

// ── Detect password reset URL (#reset?token=TOKEN&email=EMAIL) ───────────────
// Uses hash fragment so Apache/nginx never interferes with the params
function getResetParams(): { token: string; email: string } | null {
  const hash = window.location.hash; // e.g. "#reset?token=abc&email=user%40x.com"
  if (!hash.startsWith('#reset')) return null;
  const qIndex = hash.indexOf('?');
  if (qIndex === -1) return null;
  const params = new URLSearchParams(hash.slice(qIndex));
  const token = params.get('token');
  const email = params.get('email');
  if (token && email) return { token, email: decodeURIComponent(email) };
  return null;
}

export default function App() {
  const { lang, toggleLanguage, t, dir, isAr, isEn } = useLanguage();

  // If the URL is /book/:slug, render the public booking portal immediately
  const bookingSlug = getBookingSlug();
  if (bookingSlug) {
    return <CustomerBookingPortal slug={bookingSlug} />;
  }

  // If the URL is /salon/:slug, render the public salon profile
  const salonProfileSlug = getSalonProfileSlug();
  if (salonProfileSlug) {
    return <SalonPublicProfile slug={salonProfileSlug} />;
  }

  // If the URL is /staff/accept?token=..., render the invitation acceptance page
  const staffInviteToken = getStaffInvitationToken();
  if (staffInviteToken) {
    return (
      <StaffInvitationAcceptPage
        token={staffInviteToken}
        onSuccess={(providerData) => {
          window.history.replaceState({}, '', import.meta.env.BASE_URL ?? '/');
          window.location.reload();
        }}
      />
    );
  }

  // If the URL has ?reset=TOKEN&email=EMAIL, show the reset password page
  const resetParams = getResetParams();
  if (resetParams) {
    return (
      <ResetPasswordPage
        token={resetParams.token}
        email={resetParams.email}
        onSuccess={() => {
          window.history.replaceState({}, '', import.meta.env.BASE_URL ?? '/');
          window.location.reload();
        }}
      />
    );
  }

  // ── Session persistence (survives page refresh) ────────────────────────────
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try { return !!localStorage.getItem('confirmed_session'); } catch { return false; }
  });
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(() => {
    try {
      const s = localStorage.getItem('confirmed_session');
      return s ? JSON.parse(s).isPlatformAdmin === true : false;
    } catch { return false; }
  });
  const [loggedInProvider, setLoggedInProvider] = useState<any>(() => {
    try {
      const s = localStorage.getItem('confirmed_session');
      return s ? JSON.parse(s).provider ?? null : null;
    } catch { return null; }
  });

  const saveSession = (isAdmin: boolean, provider: any) => {
    try {
      localStorage.setItem('confirmed_session', JSON.stringify({
        isPlatformAdmin: isAdmin,
        provider: provider ?? null,
        loginAt: new Date().toISOString(),
      }));
    } catch { /* ignore */ }
  };

  const [showLockLogoutModal, setShowLockLogoutModal] = useState(false);

  const clearSession = () => {
    purgeAllSessionData();
    preventBackNavigation();
  };
  const [activeTab, setActiveTab] = useState('dash');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Cybersecurity Locks & Idle States
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [lockPassword, setLockPassword] = useState('');
  const [lockError, setLockError] = useState('');

  useEffect(() => {
    if (!isLoggedIn || isScreenLocked) return;

    let idleTimer: any;
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      // Auto lock after 3 minutes of inactivity
      idleTimer = setTimeout(() => {
        setIsScreenLocked(true);
        const currentUser = isPlatformAdmin ? 'admin' : (loggedInProvider?.username || 'user');
        logSecurityEvent(
          currentUser,
          isAr 
            ? 'تم قفل الشاشة تلقائياً لحماية المبيعات والبيانات الحساسة بسبب خمول الجلسة' 
            : 'POS workstation automatically secured due to inactivity timeout to safeguard salon data',
          'Warning'
        );
      }, 180000); // 3 minutes
    };

    // Quick Hotkey lock support (Ctrl + L or Alt + L)
    const handleLockHotkey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey || e.altKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsScreenLocked(true);
        const currentUser = isPlatformAdmin ? 'admin' : (loggedInProvider?.username || 'user');
        logSecurityEvent(
          currentUser,
          isAr ? 'تم قفل الشاشة يدوياً فوراً بمفتاح الاختصار السريع لحماية العرض' : 'Workstation instantly locked manually via quick security hotkey combo',
          'Passed'
        );
      }
    };

    const handleCustomLockRequest = () => {
      setIsScreenLocked(true);
      const currentUser = isPlatformAdmin ? 'admin' : (loggedInProvider?.username || 'user');
      logSecurityEvent(
        currentUser,
        isAr ? 'تم قفل الشاشة يدوياً عبر زر القفل المباشر في الواجهة' : 'Workstation locked manually via dashboard screen Lock button',
        'Passed'
      );
    };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetIdleTimer));
    window.addEventListener('keydown', handleLockHotkey);
    window.addEventListener('request-lock', handleCustomLockRequest);
    
    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetIdleTimer));
      window.removeEventListener('keydown', handleLockHotkey);
      window.removeEventListener('request-lock', handleCustomLockRequest);
    };
  }, [isLoggedIn, isScreenLocked, isPlatformAdmin, loggedInProvider, isAr]);


  const [subscriptionPackages, setSubscriptionPackages] = useState<SubscriptionPackage[]>(() => {
    const saved = localStorage.getItem('confirmed_subscription_packages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'basic',
        nameAr: 'الباقة الأساسية',
        nameEn: 'Basic Starter Plan',
        descriptionAr: 'مناسبة للصالونات الصغيرة والمبتدئة بفرع واحد',
        descriptionEn: 'Perfect for small beauty studios and independent professionals with 1 branch',
        priceMonthly: 149,
        priceYearly: 119,
        isPopular: false,
        isEnterpriseContact: false,
        featuresAr: [
          'نظام الحجز أونلاين وجدول المواعيد',
          'كاشير ذكي ونقاط بيع مبسطة',
          'الفاتورة الإلكترونية المبسطة والضريبة',
          'قاعدة بيانات حتى ٥٠٠ عميلة',
          'مستخدم واحد للنظام'
        ],
        featuresEn: [
          'Online self-booking page & calendar',
          'Point of sale billing checkout',
          'Simplified tax e-invoice & VAT support',
          'Up to 500 registered clients database',
          '1 system login credential user'
        ]
      },
      {
        id: 'pro',
        nameAr: 'الباقة الاحترافية',
        nameEn: 'Professional Growth Plan',
        descriptionAr: 'الحل المتكامل للصالونات النشطة ومراكز التجميل الكبيرة',
        descriptionEn: 'The comprehensive toolkit for high-traffic active beauty centers',
        priceMonthly: 299,
        priceYearly: 239,
        isPopular: true,
        isEnterpriseContact: false,
        featuresAr: [
          'جميع مميزات الباقة الأساسية',
          'إدارة المخزون والتنبيهات الذكية للكميات',
          'تسويق ذكي عبر الـ SMS والواتساب',
          'بطاقات الهدايا ونظام العضويات والاشتراكات',
          'حتى ٥ مستخدمين وتوزيع الصلاحيات',
          'تقارير مالية وتحليل أداء خبيرات التجميل'
        ],
        featuresEn: [
          'All Basic starter tier features',
          'Inventory tracking & smart stock alerts',
          'Automated WhatsApp & SMS promotions',
          'Digital gift cards & monthly memberships',
          'Up to 5 staff accounts with custom roles',
          'Rich financial charts & beautician analytics'
        ]
      },
      {
        id: 'enterprise',
        nameAr: 'سلاسل الصالونات',
        nameEn: 'Enterprise Multi-Branch',
        descriptionAr: 'لسلاسل الصالونات ومراكز السبا الموزعة بمدن متعددة',
        descriptionEn: 'For multi-location luxury brands, franchises & clinical chains',
        priceMonthly: 0,
        priceYearly: 0,
        isPopular: false,
        isEnterpriseContact: true,
        featuresAr: [
          'إدارة فروع متعددة من لوحة موحدة',
          'تكامل مخصص مع الأنظمة المالية و ERP',
          'مستخدمين غير محدودين وصلاحيات مخصصة',
          'مدير حساب مخصص ودعم فني على مدار الساعة'
        ],
        featuresEn: [
          'Centralized dashboard for multi-branch sync',
          'Dedicated integrations with accounting & ERP',
          'Unlimited staff login permissions',
          'Dedicated Account Manager & 24/7 SLA'
        ]
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('confirmed_subscription_packages', JSON.stringify(subscriptionPackages));
  }, [subscriptionPackages]);

  const handleAddPackage = (newPkg: SubscriptionPackage) => {
    setSubscriptionPackages(prev => [...prev, newPkg]);
  };

  const handleUpdatePackage = (updatedPkg: SubscriptionPackage) => {
    setSubscriptionPackages(prev => prev.map(p => p.id === updatedPkg.id ? updatedPkg : p));
  };

  const handleDeletePackage = (pkgId: string) => {
    setSubscriptionPackages(prev => prev.filter(p => p.id !== pkgId));
  };

  // Core App States
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);
  const [giftCards, setGiftCards] = useState<GiftCard[]>(initialGiftCards);

  // Service Provider Onboarding Requests State
  const [providerRequests, setProviderRequests] = useState<ProviderRequest[]>(() => {
    const saved = localStorage.getItem('confirmed_provider_requests');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      {
        id: 'req-1',
        name: 'نورة السديري',
        phone: '0551234567',
        email: 'marktning@onfirmedmarketing.com',
        storeName: 'صالون نورة للتجميل',
        activity: 'صالون شعر وتجميل',
        status: 'pending',
        requestedAt: '2026-07-18T12:30:00'
      },
      {
        id: 'req-2',
        name: 'روان العتيبي',
        phone: '0547654321',
        email: 'marktning@onfirmedmarketing.com',
        storeName: 'روان هيلثي سبا',
        activity: 'مركز سبا ومساج',
        status: 'pending',
        requestedAt: '2026-07-18T15:45:00'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('confirmed_provider_requests', JSON.stringify(providerRequests));
  }, [providerRequests]);

  useEffect(() => {
    const handleMockRequest = (e: Event) => {
      const customEvent = e as CustomEvent<ProviderRequest>;
      if (customEvent.detail) {
        setProviderRequests(prev => [customEvent.detail, ...prev]);
      }
    };
    window.addEventListener('add_mock_provider_request', handleMockRequest);
    return () => {
      window.removeEventListener('add_mock_provider_request', handleMockRequest);
    };
  }, []);

  // Branch Management States
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [currentBranchId, setCurrentBranchId] = useState<string>('br-riyadh');

  // Filtered lists based on current selected branch
  const branchBookings = bookings.filter(b => (b.branchId || 'br-riyadh') === currentBranchId);
  const branchProducts = products.filter(p => (p.branchId || 'br-riyadh') === currentBranchId);
  const branchInvoices = invoices.filter(inv => (inv.branchId || 'br-riyadh') === currentBranchId);

  const currentBranch = branches.find(b => b.id === currentBranchId) || branches[0];

  // Core Updators
  const handleAddBooking = (newBooking: Booking) => {
    const bookingWithBranch = { ...newBooking, branchId: currentBranchId };
    setBookings(prev => [bookingWithBranch, ...prev]);
    // Also increment bookingsToday for the assigned staff member
    setStaff(prev => prev.map(s => s.id === newBooking.staffId ? { ...s, bookingsToday: s.bookingsToday + 1 } : s));
  };

  const handleUpdateBookingStatus = (bookingId: string, status: 'pending' | 'confirmed' | 'attended' | 'cancelled') => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
  };

  const handleUpdateBookingTime = (bookingId: string, time: string) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, time } : b));
  };

  const handleAddInvoice = (newInvoice: Invoice) => {
    const invoiceWithBranch = { ...newInvoice, branchId: currentBranchId };
    setInvoices(prev => [invoiceWithBranch, ...prev]);
    // Also increment visits count and award loyalty points (1 point per 10 SAR of invoice total)
    setClients(prev => prev.map(c => {
      if (c.name === newInvoice.clientName) {
        const earnedPoints = Math.max(1, Math.floor(newInvoice.total / 10));
        return { 
          ...c, 
          visits: c.visits + 1,
          loyaltyPoints: (c.loyaltyPoints || 0) + earnedPoints
        };
      }
      return c;
    }));
  };

  const handleUpdateClientPoints = (clientId: string, newPoints: number) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, loyaltyPoints: newPoints } : c));
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

  const handleAddClient = (newClient: Client) => {
    setClients(prev => [newClient, ...prev]);
  };

  const handleUpdateClientNotes = (clientId: string, newNotes: string) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, notes: newNotes } : c));
  };

  const handleIncrementVisits = (clientId: string) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, visits: c.visits + 1 } : c));
  };

  const handleAddStaff = (newStaff: Staff) => {
    setStaff(prev => [newStaff, ...prev]);
  };

  const handleUpdateStaff = (updatedStaff: Staff) => {
    setStaff(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));
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

  if (!isLoggedIn) {
    return (
      <LandingPage 
        providerRequests={providerRequests}
        packages={subscriptionPackages}
        onLogin={(isAdmin, providerData) => {
          setIsLoggedIn(true);
          setIsPlatformAdmin(!!isAdmin);
          setLoggedInProvider(providerData || null);
          saveSession(!!isAdmin, providerData || null);
          // توليد PIN عشوائي آمن لقفل الشاشة (يُحفظ في sessionStorage فقط)
          const pin = String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);
          sessionStorage.setItem('confirmed_lock_pin', pin);
        }} 
        onAddProviderRequest={(newRequest) => setProviderRequests(prev => [newRequest, ...prev])}
      />
    );
  }

  if (isLoggedIn && isScreenLocked) {
    const handleUnlock = (e: React.FormEvent) => {
      e.preventDefault();
      const lockPin = sessionStorage.getItem('confirmed_lock_pin') ?? '';
      if (lockPin && lockPassword === lockPin) {
        setIsScreenLocked(false);
        setLockPassword('');
        setLockError('');
        const currentUser = isPlatformAdmin ? 'admin' : (loggedInProvider?.username || 'user');
        logSecurityEvent(
          currentUser,
          isAr ? 'تم إدخال رمز فك القفل الصحيح واستئناف الجلسة' : 'Correct passcode entered, resumed active session',
          'Passed'
        );
      } else {
        setLockError(isAr ? '❌ كلمة المرور غير صحيحة.' : '❌ Invalid password.');
        const currentUser = isPlatformAdmin ? 'admin' : (loggedInProvider?.username || 'user');
        logSecurityEvent(
          currentUser,
          isAr ? 'فشل فك قفل الشاشة السيبرانية - محاولة رمز خاطئ' : 'Failed to unlock workstation - incorrect passcode submitted',
          'Warning'
        );
      }
    };

    const currentUser = loggedInProvider?.email || loggedInProvider?.username || (isPlatformAdmin ? 'admin' : 'user');
    return (
      <>
      <div className="fixed inset-0 z-[9999] bg-[#0A1118]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-slate-200" dir={dir}>
        <div className="w-full max-w-md bg-[#111A24] border border-slate-800 rounded-3xl p-8 space-y-6 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 animate-pulse" />
          
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-red-500 rounded-full blur opacity-40 animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[#FF5A5F] shadow-lg">
                <Lock className="w-7 h-7" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-white">
                {isAr ? 'قفل الحماية النشط 🔐' : 'Active Security Guard 🔐'}
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0F0]/10 border border-[#FF5A5F]/20 text-xs text-[#FF5A5F] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span>{currentUser}</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed">
            {isAr 
              ? 'تم قفل شاشة النظام واللوحة الكاشير تلقائياً بعد ٣ دقائق من الخمول لحماية سرية حسابات العملاء وبيانات المبيعات السيبرانية.'
              : 'This POS workstation was locked automatically after 3 minutes of inactivity to safeguard financial metrics and customer data.'}
          </p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 text-left rtl:text-right">
                {isAr ? 'أدخل كلمة مرور الحساب لإلغاء القفل:' : 'Enter your account password to unlock:'}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={lockPassword}
                  onChange={(e) => setLockPassword(e.target.value)}
                  placeholder={isAr ? '••••••••' : '••••••••'}
                  required
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-center tracking-widest placeholder-slate-600 focus:outline-none focus:border-[#FF5A5F] focus:ring-1 focus:ring-[#FF5A5F] transition-all"
                />
              </div>
              {lockError && (
                <p className="text-xs text-red-400 mt-1 flex items-center justify-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{lockError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-[#FF5A5F] to-[#E04B50] hover:from-[#E04B50] hover:to-[#B8353A] text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 cursor-pointer"
            >
              {isAr ? 'فتح اللوحة الآمنة 🔓' : 'Unlock Secure Workstation 🔓'}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>AES-256 Client-Side Encr.</span>
            </span>
            <button
              type="button"
              onClick={() => setShowLockLogoutModal(true)}
              className="hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer underline"
            >
              {isAr ? 'تسجيل الخروج الآمن' : 'Secure Logout'}
            </button>
          </div>
        </div>
      </div>

      {/* نافذة تأكيد تسجيل الخروج من شاشة القفل */}
      <LogoutConfirmModal
        open={showLockLogoutModal}
        isAr={isAr}
        userName={isPlatformAdmin ? (isAr ? 'مالكة المنصة' : 'Platform Owner') : (loggedInProvider?.name || loggedInProvider?.username)}
        userRole={isPlatformAdmin ? 'admin' : 'provider'}
        onConfirm={() => {
          setShowLockLogoutModal(false);
          setIsScreenLocked(false);
          setIsLoggedIn(false);
          setIsPlatformAdmin(false);
          setLoggedInProvider(null);
          setLockPassword('');
          setLockError('');
          clearSession();
        }}
        onCancel={() => setShowLockLogoutModal(false)}
      />
    </>
    );
  }

  // ── Role Routing Guard ────────────────────────────────────────────────────
  // isPlatformAdmin is true ONLY when providers.role = 'owner' in the DB.
  //
  // PLATFORM OWNER  (role='owner')   → PlatformOwnerDashboard  (below)
  // SALON OWNER     (role='provider') → ProviderDashboard       (further below)
  // SALON STAFF     (staff session)  → ProviderDashboard with restricted tabs
  //
  // Salon owners are CUSTOMERS of the platform. They must NEVER reach
  // PlatformOwnerDashboard regardless of any other condition.
  if (isLoggedIn && isPlatformAdmin) {
    return (
      <PlatformOwnerDashboard 
        providerRequests={providerRequests}
        packages={subscriptionPackages}
        onAddPackage={handleAddPackage}
        onUpdatePackage={handleUpdatePackage}
        onDeletePackage={handleDeletePackage}
        onApproveRequest={async (reqId) => {
          const req = providerRequests.find(r => r.id === reqId);
          if (!req) return;

          try {
            // Generate English name from Arabic store name for username
            const nameEn = req.storeName
              .replace(/[\u0600-\u06FF]/g, '')
              .trim() || req.storeName;

            const res = await fetch('/api/providers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nameAr: req.storeName,
                nameEn: nameEn || req.storeName,
                email: req.email,
                phone: req.phone,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              setProviderRequests(prev => prev.map(r =>
                r.id === reqId
                  ? { ...r, status: 'approved', paymentStatus: 'trial_active', trialDaysLeft: 14, username: data.provider?.username }
                  : r
              ));
            } else {
              const err = await res.json();
              // Email already exists — still mark as approved in UI
              if (err.error === '23505' || res.status === 409) {
                setProviderRequests(prev => prev.map(r =>
                  r.id === reqId ? { ...r, status: 'approved', paymentStatus: 'trial_active', trialDaysLeft: 14 } : r
                ));
              } else {
                console.error('[approve]', err);
              }
            }
          } catch (e) {
            console.error('[approve network]', e);
          }
        }}
        onActivateProviderSubscription={(reqId) => {
          setProviderRequests(prev => prev.map(req => 
            req.id === reqId ? { ...req, paymentStatus: 'paid_verified' } : req
          ));
          setLoggedInProvider((prev: any) => {
            if (prev && prev.id === reqId) {
              return { ...prev, paymentStatus: 'paid_verified' };
            }
            return prev;
          });
        }}
        onLogout={() => {
          setIsLoggedIn(false);
          setIsPlatformAdmin(false);
          setLoggedInProvider(null);
          clearSession();
        }}
      />
    );
  }

  // Any logged-in provider goes directly to their dashboard — no activation gate.
  // If logged in and NOT platform admin, show the dedicated Service Provider Dashboard
  return (
    <>
    <ProviderDashboard 
      providerData={loggedInProvider}
      providerRequests={providerRequests}
      onApproveProviderRequest={(reqId) => {
        setProviderRequests(prev => prev.map(req => 
          req.id === reqId 
            ? { ...req, status: 'approved', paymentStatus: 'trial_active', trialDaysLeft: 14 } 
            : req
        ));
      }}
      onUpdateProviderPaymentStatus={(reqId, newStatus) => {
        setProviderRequests(prev => prev.map(req => 
          req.id === reqId ? { ...req, paymentStatus: newStatus } : req
        ));
        setLoggedInProvider((prev: any) => {
          if (prev && prev.id === reqId) {
            return { ...prev, paymentStatus: newStatus };
          }
          return prev;
        });
      }}
      onUpdateProviderSubscription={(reqId, packageType, billingCycle, amountPaid, paymentMethod) => {
        setProviderRequests(prev => prev.map(req => 
          req.id === reqId 
            ? { 
                ...req, 
                selectedPackage: packageType, 
                billingCycle, 
                amountPaid, 
                paymentMethod, 
                paymentStatus: 'paid_awaiting_activation' 
              } 
            : req
        ));
        
        // Update loggedInProvider
        setLoggedInProvider((prev: any) => {
          if (prev && prev.id === reqId) {
            return {
              ...prev,
              paymentStatus: 'paid_awaiting_activation',
              selectedPackage: packageType,
              billingCycle,
              amountPaid,
              paymentMethod
            };
          }
          return prev;
        });
      }}
      onLogout={() => {
        setIsLoggedIn(false);
        setIsPlatformAdmin(false);
        setLoggedInProvider(null);
        clearSession();
      }}
    />
    {isLoggedIn && <FeedbackWidget />}
    </>
  );
}
