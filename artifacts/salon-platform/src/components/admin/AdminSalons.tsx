import { useState } from 'react';
import {
  Search, Plus, MoreVertical, CheckCircle, XCircle, Eye,
  Trash2, ShieldCheck, Clock, Building2, Star, TrendingUp,
  Filter, X, Loader2, UserPlus,
} from 'lucide-react';
import type { RegisteredProvider, Toast } from './adminTypes';
import { getAdminHeaders } from '../../lib/adminAuth';

interface ProviderRequest {
  id: string; name: string; phone: string; email: string;
  storeName: string; activity: string; status: string; requestedAt: string;
  selectedPackage?: string; billingCycle?: string; amountPaid?: string; paymentStatus?: string;
}

interface Props {
  providers: RegisteredProvider[];
  setProviders: (fn: (prev: RegisteredProvider[]) => RegisteredProvider[]) => void;
  pendingRequests: ProviderRequest[];
  onApproveRequest: (id: string) => void;
  isAr: boolean;
  addToast: (t: Omit<Toast, 'id'>) => void;
  openConfirm: (cfg: { title: string; message: string; danger?: boolean; onConfirm: () => void }) => void;
}

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  trial:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
  suspended: 'bg-red-500/15 text-red-400 border-red-500/30',
  deleted:   'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

type StatusFilter = 'all' | 'active' | 'trial' | 'suspended';

// ─── Add Provider Drawer ──────────────────────────────────────────────────────
interface AddProviderForm {
  nameAr: string;
  nameEn: string;
  email: string;
  phone: string;
  city: string;
  subscriptionTier: 'basic' | 'pro' | 'enterprise';
  username: string;
}

const EMPTY_FORM: AddProviderForm = {
  nameAr: '', nameEn: '', email: '', phone: '',
  city: '', subscriptionTier: 'basic', username: '',
};

function AddProviderDrawer({
  isAr,
  onClose,
  onCreated,
}: {
  isAr: boolean;
  onClose: () => void;
  onCreated: (p: RegisteredProvider) => void;
}) {
  const [form, setForm] = useState<AddProviderForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof AddProviderForm, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({
          nameAr:           form.nameAr.trim(),
          nameEn:           form.nameEn.trim() || undefined,
          email:            form.email.trim().toLowerCase(),
          phone:            form.phone.trim() || undefined,
          city:             form.city.trim() || undefined,
          subscriptionTier: form.subscriptionTier,
          username:         form.username.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'email_already_registered') {
          setError(isAr ? 'هذا البريد الإلكتروني مسجّل مسبقاً.' : 'Email already registered.');
        } else if (data.error === 'name_and_email_required') {
          setError(isAr ? 'اسم الصالون والبريد الإلكتروني مطلوبان.' : 'Name and email are required.');
        } else if (data.error === 'invalid_subscription_tier') {
          setError(isAr ? 'باقة غير صالحة.' : 'Invalid subscription tier.');
        } else {
          setError(isAr ? 'حدث خطأ في الخادم. أعد المحاولة.' : 'Server error. Please try again.');
        }
        return;
      }

      const p = data.provider;
      // Map to RegisteredProvider shape
      const newProv: RegisteredProvider = {
        id:                String(p.id),
        storeName:         p.nameAr || p.nameEn || p.username,
        ownerName:         p.nameEn || p.nameAr || p.username,
        phone:             p.phone  || '',
        email:             p.email  || '',
        activity:          'صالون تجميل نسائي',
        city:              p.city   || '',
        status:            'active',
        joinedAt:          p.createdAt ? p.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        subdomain:         p.slug   || p.username,
        totalSales:        0,
        paidOut:           0,
        pendingPayout:     0,
        subscriptionTier:  p.subscriptionTier || 'basic',
        subscriptionPrice: p.mrr || 0,
        subscriptionStatus:'active',
        staffCount:        0,
        bookingsCount:     0,
        rating:            0,
        branches:          1,
        country:           'SA',
        mrr:               p.mrr || 0,
        churnRisk:         'low',
      };
      onCreated(newProv);
    } catch {
      setError(isAr ? 'تعذّر الاتصال بالخادم.' : 'Cannot reach server.');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label, name, type = 'text', required = false, placeholder = '',
  }: {
    label: string; name: keyof AddProviderForm;
    type?: string; required?: boolean; placeholder?: string;
  }) => (
    <div>
      <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
        {label}{required && <span className="text-red-400 ms-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[name] as string}
        onChange={e => set(name, e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400
                   focus:outline-none focus:border-[#FF5A5F] focus:ring-2 focus:ring-[#FF5A5F]/20 transition-all"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-white border-s border-slate-200 w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isAr ? 'إضافة حساب صالون يدوياً' : 'Add Salon Account Manually'}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {isAr ? 'يُفعَّل الحساب فوراً بدون فترة تجريبية' : 'Account activates instantly — no trial period'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Error banner */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Active badge notice */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            <span>
              {isAr
                ? 'سيُنشأ الحساب بحالة نشط ومفعّل فوراً — يمكن للمزوّد تسجيل الدخول مباشرة برمز OTP.'
                : 'Account will be created as Active — the provider can log in immediately via OTP.'}
            </span>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {isAr ? 'معلومات الصالون' : 'Salon Information'}
            </p>
            <Field
              label={isAr ? 'اسم الصالون (عربي)' : 'Salon Name (Arabic)'}
              name="nameAr" required
              placeholder={isAr ? 'مثال: صالون أمل' : 'e.g. صالون أمل'}
            />
            <Field
              label={isAr ? 'الاسم بالإنجليزية (اختياري)' : 'Name in English (optional)'}
              name="nameEn"
              placeholder="e.g. Amal Salon"
            />
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {isAr ? 'بيانات التواصل' : 'Contact Details'}
            </p>
            <Field
              label={isAr ? 'البريد الإلكتروني' : 'Email Address'}
              name="email" type="email" required
              placeholder="owner@salon.com"
            />
            <Field
              label={isAr ? 'رقم الجوال (اختياري)' : 'Phone Number (optional)'}
              name="phone" type="tel"
              placeholder="+966 5X XXX XXXX"
            />
            <Field
              label={isAr ? 'المدينة (اختياري)' : 'City (optional)'}
              name="city"
              placeholder={isAr ? 'الرياض' : 'Riyadh'}
            />
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {isAr ? 'إعدادات الاشتراك' : 'Subscription Settings'}
            </p>

            {/* Tier picker */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-2">
                {isAr ? 'الباقة' : 'Subscription Plan'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['basic', 'pro', 'enterprise'] as const).map(tier => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => set('subscriptionTier', tier)}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      form.subscriptionTier === tier
                        ? tier === 'enterprise'
                          ? 'bg-purple-500/15 border-purple-500 text-purple-600'
                          : tier === 'pro'
                          ? 'bg-[#FF5A5F]/15 border-[#FF5A5F] text-[#FF5A5F]'
                          : 'bg-slate-800 border-slate-800 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {tier === 'basic' ? (isAr ? 'أساسية' : 'Basic')
                      : tier === 'pro' ? (isAr ? 'احترافية' : 'Pro')
                      : (isAr ? 'مؤسسية' : 'Enterprise')}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional username */}
            <Field
              label={isAr ? 'اسم المستخدم (اختياري — يُولَّد تلقائياً)' : 'Username (optional — auto-generated)'}
              name="username"
              placeholder={isAr ? 'مثال: amal.salon' : 'e.g. amal.salon'}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 p-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-40"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={saving || !form.nameAr.trim() || !form.email.trim()}
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" />{isAr ? 'جارٍ الإنشاء...' : 'Creating...'}</>
              : <><UserPlus className="w-4 h-4" />{isAr ? 'إنشاء الحساب' : 'Create Account'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminSalons({
  providers, setProviders, pendingRequests, onApproveRequest,
  isAr, addToast, openConfirm,
}: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tierFilter, setTierFilter] = useState<'all' | 'basic' | 'pro' | 'enterprise'>('all');
  const [selected, setSelected] = useState<RegisteredProvider | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);

  const filtered = providers.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.storeName.includes(q) || p.ownerName.includes(q) || p.email.includes(q) || p.city.includes(q);
    const matchS = statusFilter === 'all' || p.status === statusFilter;
    const matchT = tierFilter === 'all' || p.subscriptionTier === tierFilter;
    return matchQ && matchS && matchT;
  });

  const pending = pendingRequests.filter(r => r.status === 'pending');

  const toggle = (id: string) => {
    const p = providers.find(p => p.id === id)!;
    const next = p.status === 'active' ? 'suspended' : 'active';
    openConfirm({
      title: next === 'suspended' ? (isAr ? 'تعليق الصالون' : 'Suspend Salon') : (isAr ? 'تفعيل الصالون' : 'Activate Salon'),
      message: next === 'suspended'
        ? (isAr ? `هل أنتِ متأكدة من تعليق حساب "${p.storeName}"؟ لن يتمكن الصالون من الوصول للوحة التحكم.` : `Suspend "${p.storeName}"? They will lose dashboard access.`)
        : (isAr ? `هل تريدين تفعيل حساب "${p.storeName}" وإعادة وصولهم؟` : `Reactivate "${p.storeName}" and restore their access?`),
      danger: next === 'suspended',
      onConfirm: async () => {
        setProviders(prev => prev.map(pr => pr.id === id ? { ...pr, status: next as any } : pr));
        setMenuOpen(null);
        try {
          await fetch(`/api/providers/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
            body: JSON.stringify({ status: next }),
          });
          addToast({ type: next === 'active' ? 'success' : 'warning', message: isAr ? `تم ${next === 'active' ? 'تفعيل' : 'تعليق'} "${p.storeName}"` : `"${p.storeName}" ${next}` });
        } catch {
          setProviders(prev => prev.map(pr => pr.id === id ? { ...pr, status: p.status as any } : pr));
          addToast({ type: 'error', message: isAr ? 'فشل تحديث الحالة' : 'Failed to update status' });
        }
      },
    });
  };

  const remove = (id: string) => {
    const p = providers.find(p => p.id === id)!;
    openConfirm({
      title: isAr ? 'حذف الصالون نهائياً' : 'Permanently Delete Salon',
      message: isAr
        ? `سيتم حذف جميع بيانات "${p.storeName}" بشكل لا رجعة فيه.`
        : `All data for "${p.storeName}" will be permanently deleted. This cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        setProviders(prev => prev.filter(pr => pr.id !== id));
        setMenuOpen(null);
        if (selected?.id === id) setSelected(null);
        try {
          await fetch(`/api/providers/${id}`, { method: 'DELETE', headers: getAdminHeaders() });
          addToast({ type: 'error', message: isAr ? `تم حذف "${p.storeName}"` : `"${p.storeName}" deleted` });
        } catch {
          addToast({ type: 'error', message: isAr ? 'فشل الحذف من السيرفر' : 'Server delete failed' });
        }
      },
    });
  };

  const handleCreated = (newProv: RegisteredProvider) => {
    setProviders(prev => [newProv, ...prev]);
    setShowAddDrawer(false);
    addToast({
      type: 'success',
      message: isAr
        ? `✅ تم إنشاء حساب "${newProv.storeName}" وتفعيله فوراً`
        : `✅ "${newProv.storeName}" created and activated`,
    });
  };

  return (
    <div className="space-y-5">
      {/* Add Provider Drawer */}
      {showAddDrawer && (
        <AddProviderDrawer
          isAr={isAr}
          onClose={() => setShowAddDrawer(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {isAr ? `${pending.length} طلب تفعيل بانتظار المراجعة` : `${pending.length} activation request(s) pending review`}
          </h3>
          <div className="space-y-2">
            {pending.map(req => (
              <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">{req.storeName}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{req.email} · {req.phone}</p>
                  <div className="flex gap-2 text-[9px]">
                    <span className="bg-[#FF5A5F]/20 text-[#FF5A5F] px-2 py-0.5 rounded-full font-bold">
                      {req.selectedPackage === 'pro' ? (isAr ? 'باقة احترافية' : 'Pro') : req.selectedPackage === 'enterprise' ? (isAr ? 'مؤسسية' : 'Ent.') : (isAr ? 'أساسية' : 'Basic')}
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                      {req.amountPaid ? `${req.amountPaid} ر.س ✓` : (isAr ? 'مدفوع' : 'Paid')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onApproveRequest(req.id);
                    addToast({ type: 'success', message: isAr ? `تم تفعيل "${req.storeName}" وإرسال بيانات الدخول` : `"${req.storeName}" activated` });
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isAr ? 'تفعيل فوري' : 'Activate Now'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + Add button */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          {(['all', 'active', 'trial', 'suspended'] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border cursor-pointer transition-all ${statusFilter === s ? 'border-[#FF5A5F] bg-[#FF5A5F]/15 text-[#FF5A5F]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              {s === 'all' ? (isAr ? 'الكل' : 'All') : s === 'active' ? (isAr ? 'نشط' : 'Active') : s === 'trial' ? (isAr ? 'تجريبي' : 'Trial') : (isAr ? 'موقوف' : 'Suspended')}
              <span className="ms-1.5 opacity-60">{s === 'all' ? providers.length : providers.filter(p => p.status === s).length}</span>
            </button>
          ))}
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-2">
            <Filter className="w-3 h-3 text-slate-500" />
            <select value={tierFilter} onChange={e => setTierFilter(e.target.value as any)} className="bg-transparent text-[10px] text-slate-400 py-1.5 focus:outline-none cursor-pointer">
              <option value="all">{isAr ? 'كل الباقات' : 'All Plans'}</option>
              <option value="basic">{isAr ? 'أساسية' : 'Basic'}</option>
              <option value="pro">{isAr ? 'احترافية' : 'Pro'}</option>
              <option value="enterprise">{isAr ? 'مؤسسية' : 'Enterprise'}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={isAr ? 'بحث...' : 'Search...'}
              className="bg-white border border-slate-200 rounded-xl ps-8 pe-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#FF5A5F] w-48" />
          </div>

          {/* ── Add Account Button ── */}
          <button
            onClick={() => setShowAddDrawer(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            {isAr ? 'إضافة حساب' : 'Add Account'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-4 text-start">{isAr ? 'الصالون' : 'Salon'}</th>
                <th className="p-4 text-start">{isAr ? 'المدينة' : 'City'}</th>
                <th className="p-4 text-center">{isAr ? 'الباقة' : 'Plan'}</th>
                <th className="p-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="p-4 text-center">{isAr ? 'المبيعات' : 'Sales'}</th>
                <th className="p-4 text-center">{isAr ? 'التقييم' : 'Rating'}</th>
                <th className="p-4 text-center">{isAr ? 'خطر الإلغاء' : 'Churn Risk'}</th>
                <th className="p-4 text-center">{isAr ? 'إجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF5A5F]/30 to-[#FF5A5F]/10 flex items-center justify-center font-black text-[#FF5A5F] text-sm shrink-0">
                        {p.storeName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{p.storeName}</p>
                        <p className="text-[9px] text-slate-500 font-mono">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">{p.city || '—'}</td>
                  <td className="p-4 text-center">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      p.subscriptionTier === 'enterprise' ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                      : p.subscriptionTier === 'pro' ? 'bg-[#FF5A5F]/15 text-[#FF5A5F] border-[#FF5A5F]/30'
                      : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                    }`}>
                      {p.subscriptionTier.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[p.status]}`}>
                      {p.status === 'active' ? (isAr ? 'نشط' : 'Active')
                        : p.status === 'trial' ? (isAr ? 'تجريبي' : 'Trial')
                        : p.status === 'suspended' ? (isAr ? 'موقوف' : 'Suspended')
                        : (isAr ? 'محذوف' : 'Deleted')}
                    </span>
                  </td>
                  <td className="p-4 text-center font-mono text-slate-900 font-bold">{p.totalSales.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <span className="flex items-center justify-center gap-1 text-amber-400">
                      <Star className="w-3 h-3" />{p.rating || '—'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      p.churnRisk === 'low' ? 'bg-emerald-500/15 text-emerald-400'
                      : p.churnRisk === 'medium' ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-red-500/15 text-red-400'
                    }`}>
                      {p.churnRisk === 'low' ? (isAr ? 'منخفض' : 'Low')
                        : p.churnRisk === 'medium' ? (isAr ? 'متوسط' : 'Medium')
                        : (isAr ? 'مرتفع' : 'High')}
                    </span>
                  </td>
                  <td className="p-4 text-center relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpen === p.id && (
                      <div className="absolute end-4 top-12 z-20 bg-white border border-slate-200 rounded-xl shadow-2xl w-44 overflow-hidden">
                        <button onClick={() => { setSelected(p); setMenuOpen(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-[11px] text-slate-600 hover:bg-slate-50 cursor-pointer transition-all">
                          <Eye className="w-3.5 h-3.5 text-blue-400" />{isAr ? 'عرض التفاصيل' : 'View Details'}
                        </button>
                        <button onClick={() => toggle(p.id)}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-[11px] text-slate-600 hover:bg-slate-50 cursor-pointer transition-all">
                          {p.status === 'active'
                            ? <XCircle className="w-3.5 h-3.5 text-amber-400" />
                            : <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                          {p.status === 'active' ? (isAr ? 'تعليق الحساب' : 'Suspend') : (isAr ? 'تفعيل الحساب' : 'Activate')}
                        </button>
                        <button onClick={() => remove(p.id)}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-[11px] text-red-500 hover:bg-red-50 cursor-pointer transition-all">
                          <Trash2 className="w-3.5 h-3.5" />{isAr ? 'حذف نهائي' : 'Delete Permanently'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">{isAr ? 'لا نتائج مطابقة' : 'No matching salons'}</p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-2 text-xs text-[#FF5A5F] hover:underline cursor-pointer">
                {isAr ? 'مسح البحث' : 'Clear search'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setSelected(null)}>
          <div
            className="bg-white border-s border-slate-200 w-full max-w-md h-full overflow-y-auto p-6 space-y-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{selected.storeName}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer text-xl leading-none">&times;</button>
            </div>

            {/* Status badge */}
            <span className={`inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full border ${STATUS_BADGE[selected.status]}`}>
              {selected.status === 'active' ? (isAr ? '● نشط' : '● Active')
                : selected.status === 'trial' ? (isAr ? '● تجريبي' : '● Trial')
                : (isAr ? '● موقوف' : '● Suspended')}
            </span>

            <div className="grid grid-cols-2 gap-3">
              {[
                { l: isAr ? 'إجمالي المبيعات' : 'Total Sales', v: selected.totalSales.toLocaleString() + ' ر.س', icon: TrendingUp, c: '#10b981' },
                { l: 'MRR', v: selected.mrr + ' ر.س', icon: TrendingUp, c: '#3b82f6' },
                { l: isAr ? 'الموظفات' : 'Staff', v: selected.staffCount, icon: Building2, c: '#a855f7' },
                { l: isAr ? 'الحجوزات' : 'Bookings', v: selected.bookingsCount, icon: Star, c: '#f59e0b' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="text-[9px] text-slate-500 font-bold mb-1">{s.l}</p>
                    <p className="text-lg font-black font-mono" style={{ color: s.c }}>{s.v}</p>
                  </div>
                );
              })}
            </div>

            {[
              { l: isAr ? 'المالكة' : 'Owner',    v: selected.ownerName },
              { l: isAr ? 'البريد' : 'Email',     v: selected.email },
              { l: isAr ? 'الجوال' : 'Phone',     v: selected.phone || '—' },
              { l: isAr ? 'المدينة' : 'City',     v: selected.city  || '—' },
              { l: isAr ? 'الانضمام' : 'Joined',  v: selected.joinedAt },
              { l: 'Subdomain', v: selected.subdomain + '.confirmed.sa' },
              { l: isAr ? 'الباقة' : 'Plan',      v: selected.subscriptionTier.toUpperCase() },
              { l: isAr ? 'حالة الفوترة' : 'Billing', v: selected.subscriptionStatus },
            ].map((row, i) => (
              <div key={i} className="flex justify-between text-xs border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-bold">{row.l}</span>
                <span className="text-slate-700 font-mono">{row.v}</span>
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => toggle(selected.id)}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                  selected.status === 'active'
                    ? 'bg-amber-500/20 text-amber-600 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30'
                }`}
              >
                {selected.status === 'active' ? (isAr ? 'تعليق الحساب' : 'Suspend') : (isAr ? 'تفعيل الحساب' : 'Activate')}
              </button>
              <button
                onClick={() => remove(selected.id)}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition-all bg-red-500/20 text-red-500 hover:bg-red-500/30"
              >
                {isAr ? 'حذف نهائي' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
