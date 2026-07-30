/**
 * OnlineOffersManager — إدارة العروض الأونلاين
 *
 * هذه الشاشة هي بالضبط ما يراه العميل عند فتح رابط الحجز.
 * صاحب الصالون ينشئ العروض هنا (اسم الخدمة + السعر + المدة + الفرع)
 * ثم يشغّلها أونلاين → يرسل الرابط → العميل يحجز → الحجز يظهر في لوحة التحكم.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Check, X, Loader2,
  ToggleLeft, ToggleRight, Link2, Copy, CheckCircle2,
  Globe, EyeOff, Scissors, AlertCircle, GitBranch,
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { getUnifiedHeaders } from '../lib/unifiedAuth';

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') + '/api';
const SITE_ORIGIN = window.location.origin;

interface Service {
  id: number;
  nameAr: string;
  nameEn: string;
  price: number;
  duration: number;
  categoryAr: string;
  categoryEn: string;
  isActive: boolean;
}

interface Branch {
  id: string;
  name: string;
  isActive?: boolean;
}

interface Props {
  dbProviderId?: number | null;
  providerSlug?: string | null;
  branches?: Branch[];
  initialOnlineBookingEnabled?: boolean;
  onBookingToggled?: (enabled: boolean) => void;
}

const EMPTY_FORM = {
  nameAr: '', nameEn: '',
  price: '', duration: '',
  categoryAr: '', categoryEn: '',
  branchId: '',
};

export default function OnlineOffersManager({ dbProviderId, providerSlug, branches = [], initialOnlineBookingEnabled = false, onBookingToggled }: Props) {
  const { isAr } = useLanguage();

  const [services,       setServices]       = useState<Service[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState<number | 'new' | null>(null);
  const [deleting,       setDeleting]       = useState<number | null>(null);
  const [editId,         setEditId]         = useState<number | 'new' | null>(null);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [error,          setError]          = useState('');
  const [copied,         setCopied]         = useState(false);
  const [portalEnabled,  setPortalEnabled]  = useState(initialOnlineBookingEnabled);
  const [toggling,       setToggling]       = useState(false);

  const headers = { 'Content-Type': 'application/json', ...getUnifiedHeaders() };

  const bookingLink = providerSlug
    ? `${SITE_ORIGIN}${import.meta.env.BASE_URL?.replace(/\/$/, '')}/book/${providerSlug}`
    : null;

  // ── Toggle global portal on/off ───────────────────────────────────────────
  const togglePortal = async () => {
    if (!dbProviderId || toggling) return;
    setToggling(true);
    const next = !portalEnabled;
    setPortalEnabled(next);
    try {
      const res = await fetch(`${API_BASE}/provider/booking-toggle`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        setPortalEnabled(!next);
      } else {
        onBookingToggled?.(next);   // ← update parent so re-mount keeps correct value
      }
    } catch {
      setPortalEnabled(!next);
    } finally {
      setToggling(false);
    }
  };

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!dbProviderId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/services?t=${Date.now()}`, { headers });
      if (res.ok) {
        const d = await res.json();
        setServices(d.services ?? []);
      }
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, [dbProviderId]);

  useEffect(() => { load(); }, [load]);

  // ── Copy link ──────────────────────────────────────────────────────────────
  const copyLink = async () => {
    if (!bookingLink) return;
    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  // ── Form helpers ──────────────────────────────────────────────────────────
  const openEdit = (svc: Service) => {
    setEditId(svc.id);
    setForm({
      nameAr: svc.nameAr, nameEn: svc.nameEn,
      price: String(svc.price), duration: String(svc.duration),
      categoryAr: svc.categoryAr ?? '', categoryEn: svc.categoryEn ?? '',
      branchId: '',
    });
    setError('');
  };

  const openNew = () => { setEditId('new'); setForm(EMPTY_FORM); setError(''); };
  const cancelEdit = () => { setEditId(null); setForm(EMPTY_FORM); setError(''); };

  const validate = () => {
    if (!form.nameAr.trim()) return isAr ? 'اسم الخدمة مطلوب' : 'Service name is required';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
      return isAr ? 'السعر غير صحيح' : 'Invalid price';
    if (!form.duration || isNaN(Number(form.duration)) || Number(form.duration) <= 0)
      return isAr ? 'المدة غير صحيحة' : 'Invalid duration';
    return '';
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(editId as number | 'new');
    setError('');
    try {
      const body = {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim() || form.nameAr.trim(),
        price: Number(form.price),
        duration: Number(form.duration),
        categoryAr: form.categoryAr.trim(),
        categoryEn: form.categoryEn.trim(),
      };
      if (editId === 'new') {
        const res = await fetch(`${API_BASE}/services`, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch(`${API_BASE}/services/${editId}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
      }
      await load();
      cancelEdit();
    } catch { setError(isAr ? 'حدث خطأ أثناء الحفظ' : 'Save failed'); }
    finally { setSaving(null); }
  };

  // ── Toggle active (online visibility) ────────────────────────────────────
  const toggleActive = async (svc: Service) => {
    setServices(prev => prev.map(s => s.id === svc.id ? { ...s, isActive: !s.isActive } : s));
    try {
      await fetch(`${API_BASE}/services/${svc.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ isActive: !svc.isActive }),
      });
    } catch {
      // revert on failure
      setServices(prev => prev.map(s => s.id === svc.id ? { ...s, isActive: svc.isActive } : s));
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (svc: Service) => {
    if (!window.confirm(isAr ? `حذف "${svc.nameAr}"؟` : `Delete "${svc.nameEn}"?`)) return;
    setDeleting(svc.id);
    try {
      await fetch(`${API_BASE}/services/${svc.id}`, { method: 'DELETE', headers });
      setServices(prev => prev.filter(s => s.id !== svc.id));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  if (!dbProviderId) return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
      {isAr ? 'يجب تسجيل الدخول لإدارة العروض.' : 'Login required.'}
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-[#FF5A5F]" />
    </div>
  );

  const activeOffers = services.filter(s => s.isActive);

  return (
    <div className="space-y-5">

      {/* ── Master portal toggle ─────────────────────────────────────────── */}
      <div className={`rounded-2xl p-4 space-y-3 transition-all ${
        portalEnabled
          ? 'bg-gradient-to-r from-[#14332B] to-[#1a4d3a] text-white'
          : 'bg-[#FFF0F0] border-2 border-[#FF5A5F]/30'
      }`}>
        {/* Toggle row */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Globe className={`w-4 h-4 shrink-0 ${portalEnabled ? 'text-emerald-300' : 'text-[#FF5A5F]'}`} />
              <p className={`text-sm font-bold ${portalEnabled ? 'text-white' : 'text-[#1C1B18]'}`}>
                {isAr ? 'تفعيل الحجز الأونلاين' : 'Enable Online Booking'}
              </p>
            </div>
            <p className={`text-[11px] mt-0.5 ${portalEnabled ? 'text-emerald-300/80' : 'text-[#FF5A5F]'}`}>
              {portalEnabled
                ? (isAr ? '✅ الرابط شغّال — العملاء يقدرون يحجزون الآن' : '✅ Portal is live — clients can book now')
                : (isAr ? '⛔ الرابط موقوف — العملاء يشوفون "غير متاح"' : '⛔ Portal is off — clients see "Not Available"')}
            </p>
          </div>

          <button
            onClick={togglePortal}
            disabled={toggling || !dbProviderId}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
            style={portalEnabled
              ? { background: 'rgba(0,0,0,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }
              : { background: '#FF5A5F', color: '#fff' }}
          >
            {toggling
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : portalEnabled
                ? <><ToggleRight className="w-5 h-5" />{isAr ? 'مفعّل' : 'Live'}</>
                : <><ToggleLeft  className="w-5 h-5" />{isAr ? 'فعّل الآن' : 'Activate'}</>}
          </button>
        </div>

        {/* Link row — only when enabled */}
        {portalEnabled && bookingLink && (
          <div className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2">
            <p className="flex-1 text-[11px] font-mono text-white/80 truncate" dir="ltr">
              {bookingLink}
            </p>
            <button
              onClick={copyLink}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-bold rounded-lg transition-all"
            >
              {copied
                ? <><CheckCircle2 className="w-3.5 h-3.5" />{isAr ? 'تم!' : 'Copied!'}</>
                : <><Copy className="w-3.5 h-3.5" />{isAr ? 'نسخ الرابط' : 'Copy'}</>}
            </button>
          </div>
        )}
        {portalEnabled && (
          <p className={`text-[10px] ${portalEnabled ? 'text-emerald-300/60' : 'text-[#9CA3AF]'}`}>
            {isAr
              ? `${activeOffers.length} خدمة مفعّلة ظاهرة للعملاء`
              : `${activeOffers.length} service${activeOffers.length !== 1 ? 's' : ''} visible to customers`}
          </p>
        )}
      </div>

      {/* ── Header + Add button ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
            <Scissors className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1C1B18]">
              {isAr ? 'العروض والخدمات الأونلاين' : 'Online Services & Offers'}
            </h3>
            <p className="text-[11px] text-[#6E6A63]">
              {isAr
                ? 'أضف خدماتك وأسعارها — العروض المفعّلة تظهر للعملاء في رابط الحجز'
                : 'Add your services & prices — active offers appear in the booking link'}
            </p>
          </div>
        </div>
        {editId !== 'new' && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-xs rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            {isAr ? 'إضافة عرض' : 'Add Offer'}
          </button>
        )}
      </div>

      {/* ── New offer form ───────────────────────────────────────────────── */}
      {editId === 'new' && (
        <OfferForm
          form={form} setForm={setForm} error={error}
          isAr={isAr} saving={saving === 'new'}
          branches={branches}
          onSave={handleSave} onCancel={cancelEdit}
          title={isAr ? '✨ إنشاء عرض جديد' : '✨ New Offer'}
        />
      )}

      {/* ── Offers list ──────────────────────────────────────────────────── */}
      {services.length === 0 ? (
        <div className="text-center py-14 border-2 border-dashed border-[#E9E7E2] rounded-2xl space-y-2">
          <Scissors className="w-8 h-8 text-[#C9C7C2] mx-auto" />
          <p className="text-sm text-[#6E6A63] font-semibold">
            {isAr ? 'لا توجد عروض بعد' : 'No offers yet'}
          </p>
          <p className="text-xs text-[#9CA3AF]">
            {isAr
              ? 'أضف أول خدمة وسعرها، ثم فعّلها أونلاين وأرسل الرابط'
              : 'Add your first service with a price, activate it, then share the link'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {services.map(svc => (
            <div key={svc.id}>
              {editId === svc.id ? (
                <OfferForm
                  form={form} setForm={setForm} error={error}
                  isAr={isAr} saving={saving === svc.id}
                  branches={branches}
                  onSave={handleSave} onCancel={cancelEdit}
                  title={isAr ? `تعديل: ${svc.nameAr}` : `Edit: ${svc.nameEn}`}
                />
              ) : (
                <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all ${
                  svc.isActive
                    ? 'bg-white border-emerald-200 shadow-sm shadow-emerald-50'
                    : 'bg-[#FAFAF8] border-[#E9E7E2] opacity-70'
                }`}>
                  {/* Status indicator */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${svc.isActive ? 'bg-emerald-400' : 'bg-[#C9C7C2]'}`} />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#1C1B18]">
                        {isAr ? svc.nameAr : (svc.nameEn || svc.nameAr)}
                      </span>
                      {!isAr && svc.nameAr !== svc.nameEn && (
                        <span className="text-[10px] text-[#9CA3AF]">{svc.nameAr}</span>
                      )}
                      {(isAr ? svc.categoryAr : svc.categoryEn) && (
                        <span className="text-[10px] font-semibold bg-[#F5F4F1] text-[#6E6A63] px-2 py-0.5 rounded-full">
                          {isAr ? svc.categoryAr : svc.categoryEn}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6E6A63] mt-0.5">
                      ⏱ {svc.duration} {isAr ? 'دقيقة' : 'min'}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-end shrink-0">
                    <p className="text-base font-black text-[#FF5A5F]">{svc.price.toLocaleString()}</p>
                    <p className="text-[10px] text-[#9CA3AF]">{isAr ? 'ريال' : 'SAR'}</p>
                  </div>

                  {/* Toggle + actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleActive(svc)}
                      title={svc.isActive
                        ? (isAr ? 'إيقاف العرض — لن يظهر للعملاء' : 'Deactivate — hide from customers')
                        : (isAr ? 'تفعيل العرض — سيظهر للعملاء في رابط الحجز' : 'Activate — show to customers')}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border"
                      style={svc.isActive
                        ? { background: '#ecfdf5', color: '#15803d', borderColor: '#bbf7d0' }
                        : { background: '#f3f4f6', color: '#6b7280', borderColor: '#e5e7eb' }}
                    >
                      {svc.isActive
                        ? <><ToggleRight className="w-4 h-4" />{isAr ? 'مفعّل' : 'Live'}</>
                        : <><ToggleLeft  className="w-4 h-4" />{isAr ? 'مخفي' : 'Off'}</>}
                    </button>
                    <button
                      onClick={() => openEdit(svc)}
                      className="p-1.5 rounded-lg hover:bg-[#F5F4F1] text-[#6E6A63] hover:text-[#1C1B18] transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(svc)}
                      disabled={deleting === svc.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[#6E6A63] hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {deleting === svc.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#E9E7E2] bg-[#FAFAF8] p-4 space-y-2.5">
        <p className="text-[11px] font-bold text-[#1C1B18]">
          {isAr ? 'كيف تعمل العروض الأونلاين؟' : 'How does this work?'}
        </p>
        <ol className="space-y-1.5 text-[11px] text-[#6E6A63]">
          {(isAr ? [
            '1. أنشئ عرضاً واكتب اسم الخدمة والسعر والمدة',
            '2. اضغط "مفعّل" لتظهر الخدمة في رابط الحجز',
            '3. أرسل الرابط الأخضر أعلاه للعملاء',
            '4. العميلة تختار الخدمة والوقت وتحجز',
            '5. الحجز يظهر تلقائياً في قائمة "الحجوزات" مع الاسم والخدمة والسعر',
            '6. عند حضور العميلة وسداد المبلغ، يُضاف للإيرادات تلقائياً',
          ] : [
            '1. Create an offer with service name, price, and duration',
            '2. Toggle it to "Live" to show it in the booking link',
            '3. Share the green link above with your clients',
            '4. Client picks service + time and books',
            '5. Booking auto-appears in the Bookings tab with name, service & price',
            '6. When client arrives and pays, revenue is recorded automatically',
          ]).map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full bg-rose-100 text-rose-500 text-[9px] font-black flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span>{step.replace(/^\d+\.\s*/, '')}</span>
            </li>
          ))}
        </ol>
      </div>

    </div>
  );
}

// ── OfferForm ─────────────────────────────────────────────────────────────────
interface FormProps {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  error: string;
  isAr: boolean;
  saving: boolean;
  branches: Branch[];
  onSave: () => void;
  onCancel: () => void;
  title: string;
}

function OfferForm({ form, setForm, error, isAr, saving, branches, onSave, onCancel, title }: FormProps) {
  const f = (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));

  const activeBranches = branches.filter(b => b.isActive !== false);

  return (
    <div className="rounded-2xl border border-[#FF5A5F]/30 bg-rose-50/40 p-4 space-y-3">
      <p className="text-xs font-bold text-[#1C1B18]">{title}</p>

      <div className="grid grid-cols-2 gap-2.5">

        {/* Name AR */}
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">
            {isAr ? 'اسم الخدمة (عربي) *' : 'Arabic Name *'}
          </label>
          <input
            value={form.nameAr} onChange={f('nameAr')}
            placeholder={isAr ? 'مثال: كيراتين، صبغ...' : 'e.g. كيراتين'}
            dir="rtl"
            className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white"
          />
        </div>

        {/* Name EN */}
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">
            {isAr ? 'اسم الخدمة (إنجليزي)' : 'English Name'}
          </label>
          <input
            value={form.nameEn} onChange={f('nameEn')}
            placeholder="e.g. Keratin Treatment"
            dir="ltr"
            className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">
            {isAr ? 'السعر (ريال) *' : 'Price (SAR) *'}
          </label>
          <input
            type="number" min="0"
            value={form.price} onChange={f('price')}
            placeholder="500" dir="ltr"
            className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">
            {isAr ? 'المدة (دقيقة) *' : 'Duration (min) *'}
          </label>
          <input
            type="number" min="5"
            value={form.duration} onChange={f('duration')}
            placeholder="60" dir="ltr"
            className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white"
          />
        </div>

        {/* Category AR */}
        <div>
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">
            {isAr ? 'الفئة (عربي)' : 'Category (AR)'}
          </label>
          <input
            value={form.categoryAr} onChange={f('categoryAr')}
            placeholder={isAr ? 'شعر / بشرة / مكياج...' : 'e.g. شعر'}
            dir="rtl"
            className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white"
          />
        </div>

        {/* Category EN */}
        <div>
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">
            {isAr ? 'الفئة (إنجليزي)' : 'Category (EN)'}
          </label>
          <input
            value={form.categoryEn} onChange={f('categoryEn')}
            placeholder="Hair / Skin / Makeup"
            dir="ltr"
            className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white"
          />
        </div>

        {/* Branch (if multiple branches exist) */}
        {activeBranches.length > 1 && (
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-[#1C1B18] mb-1 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-rose-400" />
              {isAr ? 'الفرع (اختياري)' : 'Branch (optional)'}
            </label>
            <select
              value={form.branchId} onChange={f('branchId')}
              className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white"
            >
              <option value="">{isAr ? '— جميع الفروع —' : '— All branches —'}</option>
              {activeBranches.map(br => (
                <option key={br.id} value={br.id}>{br.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave} disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {isAr ? 'حفظ العرض' : 'Save Offer'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-[#E9E7E2] text-[#6E6A63] hover:text-[#1C1B18] font-semibold text-xs rounded-xl transition-all"
        >
          <X className="w-4 h-4" />
          {isAr ? 'إلغاء' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
