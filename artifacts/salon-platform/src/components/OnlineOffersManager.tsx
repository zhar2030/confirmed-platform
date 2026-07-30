/**
 * OnlineOffersManager — إدارة الخدمات والحجز الأونلاين
 * نسخة مُعادة البناء: بدون stale closures، بدون مشاكل cache
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Pencil, Trash2, Check, X, Loader2,
  ToggleLeft, ToggleRight, Copy, CheckCircle2,
  Globe, Scissors, AlertCircle, RefreshCw,
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { getUnifiedHeaders } from '../lib/unifiedAuth';

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') + '/api';
const SITE_ORIGIN = window.location.origin;

// ── helpers ──────────────────────────────────────────────────────────────────

/** Always-fresh headers — never stale */
function h() {
  return { 'Content-Type': 'application/json', ...getUnifiedHeaders() };
}

interface Service {
  id: string;
  nameAr: string;
  nameEn: string;
  price: number;
  duration: number;
  categoryAr: string;
  categoryEn: string;
  isActive: boolean;
}

interface Branch { id: string; name: string; isActive?: boolean; }

interface Props {
  dbProviderId?: number | null;
  providerSlug?: string | null;
  branches?: Branch[];
  initialOnlineBookingEnabled?: boolean;
  onBookingToggled?: (v: boolean) => void;
}

const EMPTY: {
  nameAr: string; nameEn: string;
  price: string; duration: string;
  categoryAr: string; categoryEn: string;
} = { nameAr: '', nameEn: '', price: '', duration: '', categoryAr: '', categoryEn: '' };

export default function OnlineOffersManager({
  dbProviderId, providerSlug, branches = [],
  initialOnlineBookingEnabled = false, onBookingToggled,
}: Props) {
  const { isAr } = useLanguage();

  const [services,  setServices]  = useState<Service[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [loadErr,   setLoadErr]   = useState('');

  const [editId,    setEditId]    = useState<string | null>(null); // null=none, 'new'=new
  const [form,      setForm]      = useState({ ...EMPTY });
  const [formErr,   setFormErr]   = useState('');
  const [saving,    setSaving]    = useState(false);

  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [toggling,  setToggling]  = useState(false);
  const [portalOn,  setPortalOn]  = useState(initialOnlineBookingEnabled);
  const [copied,    setCopied]    = useState(false);

  // keep portalOn in sync with parent prop
  useEffect(() => { setPortalOn(initialOnlineBookingEnabled); }, [initialOnlineBookingEnabled]);

  // ── Load services ─────────────────────────────────────────────────────────

  const loadRef = useRef(0);

  async function loadServices() {
    if (!dbProviderId) return;
    const seq = ++loadRef.current;
    setLoading(true);
    setLoadErr('');
    try {
      const res = await fetch(`${API_BASE}/services`, {
        headers: h(),     // fresh every call
        cache: 'no-store',
      });
      if (seq !== loadRef.current) return; // stale call
      if (res.ok) {
        const d = await res.json();
        setServices(d.services ?? []);
      } else {
        const txt = await res.text().catch(() => String(res.status));
        setLoadErr(`${res.status}: ${txt.slice(0, 120)}`);
      }
    } catch (e: any) {
      if (seq === loadRef.current) setLoadErr(e.message ?? 'network error');
    } finally {
      if (seq === loadRef.current) setLoading(false);
    }
  }

  // reload whenever provider id becomes known
  useEffect(() => { loadServices(); }, [dbProviderId]); // eslint-disable-line

  // ── Portal toggle ─────────────────────────────────────────────────────────

  async function togglePortal() {
    if (!dbProviderId || toggling) return;
    setToggling(true);
    const next = !portalOn;
    setPortalOn(next);
    try {
      const res = await fetch(`${API_BASE}/provider/booking-toggle`, {
        method: 'PATCH',
        headers: h(),
        body: JSON.stringify({ enabled: next }),
      });
      if (res.ok) {
        onBookingToggled?.(next);
      } else {
        setPortalOn(!next); // revert
      }
    } catch {
      setPortalOn(!next);
    } finally {
      setToggling(false);
    }
  }

  // ── Copy link ─────────────────────────────────────────────────────────────

  const bookingLink = providerSlug
    ? `${SITE_ORIGIN}${import.meta.env.BASE_URL?.replace(/\/$/, '')}/book/${providerSlug}`
    : null;

  async function copyLink() {
    if (!bookingLink) return;
    try { await navigator.clipboard.writeText(bookingLink); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Save (add or edit) ────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.nameAr.trim())          return setFormErr(isAr ? 'اسم الخدمة مطلوب' : 'Name is required');
    if (!form.price || +form.price < 0)   return setFormErr(isAr ? 'السعر غير صحيح' : 'Invalid price');
    if (!form.duration || +form.duration <= 0) return setFormErr(isAr ? 'المدة غير صحيحة' : 'Invalid duration');

    setSaving(true);
    setFormErr('');
    const body = {
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn.trim() || form.nameAr.trim(),
      price: +form.price,
      duration: +form.duration,
      categoryAr: form.categoryAr.trim(),
      categoryEn: form.categoryEn.trim(),
    };

    try {
      const url = editId === 'new'
        ? `${API_BASE}/services`
        : `${API_BASE}/services/${editId}`;
      const method = editId === 'new' ? 'POST' : 'PATCH';

      const res = await fetch(url, { method, headers: h(), body: JSON.stringify(body) });

      if (!res.ok) {
        const txt = await res.text().catch(() => String(res.status));
        return setFormErr(`${res.status}: ${txt.slice(0, 100)}`);
      }

      setEditId(null);
      setForm({ ...EMPTY });
      await loadServices();   // refresh list
    } catch (e: any) {
      setFormErr(e.message ?? 'network error');
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  async function toggleActive(svc: Service) {
    setServices(prev => prev.map(s => s.id === svc.id ? { ...s, isActive: !s.isActive } : s));
    try {
      await fetch(`${API_BASE}/services/${svc.id}`, {
        method: 'PATCH',
        headers: h(),
        body: JSON.stringify({ isActive: !svc.isActive }),
      });
    } catch {
      setServices(prev => prev.map(s => s.id === svc.id ? { ...s, isActive: svc.isActive } : s));
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(svc: Service) {
    if (!confirm(isAr ? `حذف "${svc.nameAr}"؟` : `Delete "${svc.nameEn}"?`)) return;
    setDeleting(svc.id);
    try {
      await fetch(`${API_BASE}/services/${svc.id}`, { method: 'DELETE', headers: h() });
      setServices(prev => prev.filter(s => s.id !== svc.id));
    } catch {}
    finally { setDeleting(null); }
  }

  // ── Edit helpers ──────────────────────────────────────────────────────────

  function openEdit(svc: Service) {
    setEditId(svc.id);
    setForm({
      nameAr: svc.nameAr, nameEn: svc.nameEn,
      price: String(svc.price), duration: String(svc.duration),
      categoryAr: svc.categoryAr, categoryEn: svc.categoryEn,
    });
    setFormErr('');
  }

  function openNew() {
    setEditId('new');
    setForm({ ...EMPTY });
    setFormErr('');
  }

  function cancelEdit() {
    setEditId(null);
    setForm({ ...EMPTY });
    setFormErr('');
  }

  const f = (k: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  // ── Render ────────────────────────────────────────────────────────────────

  if (!dbProviderId) return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
      {isAr ? 'يجب تسجيل الدخول لإدارة العروض.' : 'Login required.'}
    </div>
  );

  const activeCount = services.filter(s => s.isActive).length;

  return (
    <div className="space-y-5">

      {/* ── Portal toggle card ──────────────────────────────────────────── */}
      <div className={`rounded-2xl p-4 space-y-3 transition-all ${
        portalOn
          ? 'bg-gradient-to-r from-[#14332B] to-[#1a4d3a] text-white'
          : 'bg-[#FFF0F0] border-2 border-[#FF5A5F]/30'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Globe className={`w-4 h-4 ${portalOn ? 'text-emerald-300' : 'text-[#FF5A5F]'}`} />
              <p className={`text-sm font-bold ${portalOn ? 'text-white' : 'text-[#1C1B18]'}`}>
                {isAr ? 'تفعيل الحجز الأونلاين' : 'Online Booking'}
              </p>
            </div>
            <p className={`text-[11px] mt-0.5 ${portalOn ? 'text-emerald-300/80' : 'text-[#FF5A5F]'}`}>
              {portalOn
                ? (isAr ? '✅ الرابط شغّال — العملاء يحجزون الآن' : '✅ Live — clients can book now')
                : (isAr ? '⛔ الرابط موقوف — العملاء يشوفون "غير متاح"' : '⛔ Off — clients see "unavailable"')}
            </p>
          </div>
          <button
            type="button"
            onClick={togglePortal}
            disabled={toggling}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
            style={portalOn
              ? { background: 'rgba(0,0,0,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }
              : { background: '#FF5A5F', color: '#fff' }}
          >
            {toggling
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : portalOn
                ? <><ToggleRight className="w-5 h-5" />{isAr ? 'مفعّل' : 'Live'}</>
                : <><ToggleLeft  className="w-5 h-5" />{isAr ? 'فعّل الآن' : 'Activate'}</>}
          </button>
        </div>

        {portalOn && bookingLink && (
          <div className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2">
            <p className="flex-1 text-[11px] font-mono text-white/80 truncate" dir="ltr">{bookingLink}</p>
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-bold rounded-lg transition-all"
            >
              {copied
                ? <><CheckCircle2 className="w-3.5 h-3.5" />{isAr ? 'تم!' : 'Copied!'}</>
                : <><Copy className="w-3.5 h-3.5" />{isAr ? 'نسخ الرابط' : 'Copy'}</>}
            </button>
          </div>
        )}

        {portalOn && (
          <p className="text-[10px] text-emerald-300/60">
            {isAr ? `${activeCount} خدمة مفعّلة ظاهرة للعملاء` : `${activeCount} active service${activeCount !== 1 ? 's' : ''} visible`}
          </p>
        )}
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
            <Scissors className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1C1B18]">
              {isAr ? 'العروض والخدمات الأونلاين' : 'Online Services & Offers'}
            </h3>
            <p className="text-[11px] text-[#6E6A63]">
              {isAr
                ? 'أضف خدماتك وأسعارها — العروض المفعّلة تظهر للعملاء في رابط الحجز'
                : 'Add services & prices — active offers appear in the booking link'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadServices}
            disabled={loading}
            title={isAr ? 'تحديث' : 'Refresh'}
            className="p-2 rounded-xl border border-[#E9E7E2] hover:bg-[#F5F4F1] text-[#6E6A63] transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {editId !== 'new' && (
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-xs rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              {isAr ? 'إضافة عرض' : 'Add Offer'}
            </button>
          )}
        </div>
      </div>

      {/* ── Load error ─────────────────────────────────────────────────── */}
      {loadErr && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{isAr ? 'تعذّر تحميل الخدمات' : 'Failed to load services'}</p>
            <p className="opacity-70 font-mono mt-0.5">{loadErr}</p>
            <button type="button" onClick={loadServices} className="mt-1 underline font-bold">
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        </div>
      )}

      {/* ── Add form ───────────────────────────────────────────────────── */}
      {editId === 'new' && (
        <ServiceForm
          form={form} f={f} formErr={formErr}
          isAr={isAr} saving={saving}
          title={isAr ? '✨ إنشاء عرض جديد' : '✨ New Offer'}
          onSave={handleSave} onCancel={cancelEdit}
        />
      )}

      {/* ── Loading spinner ─────────────────────────────────────────────── */}
      {loading && services.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-[#FF5A5F]" />
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {!loading && !loadErr && services.length === 0 && editId !== 'new' && (
        <div className="text-center py-14 border-2 border-dashed border-[#E9E7E2] rounded-2xl space-y-2">
          <Scissors className="w-8 h-8 text-[#C9C7C2] mx-auto" />
          <p className="text-sm text-[#6E6A63] font-semibold">
            {isAr ? 'لا توجد عروض بعد' : 'No offers yet'}
          </p>
          <p className="text-xs text-[#9CA3AF]">
            {isAr
              ? 'أضف أول خدمة وسعرها، ثم فعّلها وأرسل الرابط'
              : 'Add your first service, activate it, then share the link'}
          </p>
        </div>
      )}

      {/* ── Services list ───────────────────────────────────────────────── */}
      {services.length > 0 && (
        <div className="space-y-2.5">
          {services.map(svc => (
            <div key={svc.id}>
              {editId === svc.id ? (
                <ServiceForm
                  form={form} f={f} formErr={formErr}
                  isAr={isAr} saving={saving}
                  title={isAr ? `تعديل: ${svc.nameAr}` : `Edit: ${svc.nameEn}`}
                  onSave={handleSave} onCancel={cancelEdit}
                />
              ) : (
                <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all ${
                  svc.isActive
                    ? 'bg-white border-emerald-200 shadow-sm'
                    : 'bg-[#FAFAF8] border-[#E9E7E2] opacity-70'
                }`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${svc.isActive ? 'bg-emerald-400' : 'bg-[#C9C7C2]'}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#1C1B18]">
                        {isAr ? svc.nameAr : (svc.nameEn || svc.nameAr)}
                      </span>
                      {(isAr ? svc.categoryAr : svc.categoryEn) && (
                        <span className="text-[10px] font-semibold bg-[#F5F4F1] text-[#6E6A63] px-2 py-0.5 rounded-full">
                          {isAr ? svc.categoryAr : svc.categoryEn}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6E6A63] mt-0.5">⏱ {svc.duration} {isAr ? 'دقيقة' : 'min'}</p>
                  </div>

                  <div className="text-end shrink-0">
                    <p className="text-base font-black text-[#FF5A5F]">{svc.price.toLocaleString()}</p>
                    <p className="text-[10px] text-[#9CA3AF]">{isAr ? 'ريال' : 'SAR'}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleActive(svc)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border"
                      style={svc.isActive
                        ? { background: '#ecfdf5', color: '#15803d', borderColor: '#bbf7d0' }
                        : { background: '#f3f4f6', color: '#6b7280', borderColor: '#e5e7eb' }}
                    >
                      {svc.isActive
                        ? <><ToggleRight className="w-4 h-4" />{isAr ? 'مفعّل' : 'Live'}</>
                        : <><ToggleLeft  className="w-4 h-4" />{isAr ? 'مخفي' : 'Off'}</>}
                    </button>
                    <button type="button" onClick={() => openEdit(svc)}
                      className="p-1.5 rounded-lg hover:bg-[#F5F4F1] text-[#6E6A63] transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(svc)} disabled={deleting === svc.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[#6E6A63] hover:text-red-500 transition-colors disabled:opacity-50">
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

      {/* ── How it works ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#E9E7E2] bg-[#FAFAF8] p-4 space-y-2.5">
        <p className="text-[11px] font-bold text-[#1C1B18]">
          {isAr ? 'كيف تعمل العروض الأونلاين؟' : 'How does it work?'}
        </p>
        <ol className="space-y-1.5 text-[11px] text-[#6E6A63]">
          {(isAr ? [
            'أنشئ عرضاً واكتب اسم الخدمة والسعر والمدة',
            'اضغط "مفعّل" لتظهر الخدمة في رابط الحجز',
            'أرسل الرابط الأخضر أعلاه للعملاء',
            'العميلة تختار الخدمة والوقت وتحجز',
            'الحجز يظهر تلقائياً في قائمة الحجوزات',
          ] : [
            'Create an offer with name, price, and duration',
            'Toggle it to "Live" to show it in the booking link',
            'Share the green link above with your clients',
            'Client picks service + time and books',
            'Booking appears automatically in the Bookings tab',
          ]).map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full bg-rose-100 text-rose-500 text-[9px] font-black flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ── ServiceForm ───────────────────────────────────────────────────────────────

interface FormProps {
  form: { nameAr: string; nameEn: string; price: string; duration: string; categoryAr: string; categoryEn: string };
  f: (k: any) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  formErr: string;
  isAr: boolean;
  saving: boolean;
  title: string;
  onSave: () => void;
  onCancel: () => void;
}

function ServiceForm({ form, f, formErr, isAr, saving, title, onSave, onCancel }: FormProps) {
  return (
    <div className="rounded-2xl border border-[#FF5A5F]/30 bg-rose-50/40 p-4 space-y-3">
      <p className="text-xs font-bold text-[#1C1B18]">{title}</p>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">{isAr ? 'اسم الخدمة (عربي) *' : 'Arabic Name *'}</label>
          <input value={form.nameAr} onChange={f('nameAr')} dir="rtl"
            placeholder={isAr ? 'مثال: كيراتين، صبغ...' : 'e.g. كيراتين'}
            className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">{isAr ? 'اسم الخدمة (إنجليزي)' : 'English Name'}</label>
          <input value={form.nameEn} onChange={f('nameEn')} dir="ltr"
            placeholder="e.g. Keratin Treatment"
            className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">{isAr ? 'السعر (ريال) *' : 'Price (SAR) *'}</label>
          <input type="number" min="0" value={form.price} onChange={f('price')} dir="ltr" placeholder="500"
            className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">{isAr ? 'المدة (دقيقة) *' : 'Duration (min) *'}</label>
          <input type="number" min="5" value={form.duration} onChange={f('duration')} dir="ltr" placeholder="60"
            className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">{isAr ? 'الفئة (عربي)' : 'Category (AR)'}</label>
          <input value={form.categoryAr} onChange={f('categoryAr')} dir="rtl"
            placeholder={isAr ? 'شعر / بشرة / مكياج...' : 'e.g. شعر'}
            className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">{isAr ? 'الفئة (إنجليزي)' : 'Category (EN)'}</label>
          <input value={form.categoryEn} onChange={f('categoryEn')} dir="ltr"
            placeholder="Hair / Skin / Makeup"
            className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white" />
        </div>
      </div>

      {formErr && (
        <p className="text-xs text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {formErr}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={onSave} disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-xs rounded-xl disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {isAr ? 'حفظ العرض' : 'Save'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-[#E9E7E2] text-[#6E6A63] font-semibold text-xs rounded-xl">
          <X className="w-4 h-4" />
          {isAr ? 'إلغاء' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
