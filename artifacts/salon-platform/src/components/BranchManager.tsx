import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Plus, Pencil, Trash2, Check, X, Phone,
  Building2, Loader2, CheckCircle2, Store, ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { getProviderHeaders } from '../lib/providerAuth';

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') + '/api';

interface Branch {
  id: number;
  name_ar: string;
  name_en: string;
  address_ar: string;
  address_en: string;
  city_ar: string;
  city_en: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

const empty = (): Omit<Branch, 'id' | 'is_active' | 'created_at'> => ({
  name_ar: '', name_en: '', address_ar: '', address_en: '',
  city_ar: '', city_en: '', phone: '',
});

interface Props {
  dbProviderId?: number | null;
  onBranchesChanged?: (branches: Branch[]) => void;
}

export default function BranchManager({ dbProviderId, onBranchesChanged }: Props) {
  const { isAr } = useLanguage();
  const headers = { 'Content-Type': 'application/json', ...getProviderHeaders() };

  const [branches, setBranches]     = useState<Branch[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [form, setForm]           = useState(empty());
  const [formError, setFormError] = useState('');
  const [savedOk, setSavedOk]     = useState(false);

  const load = useCallback(async () => {
    if (!dbProviderId) return;
    try {
      const res = await fetch(`${API_BASE}/branches`, { headers });
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches ?? []);
        onBranchesChanged?.(data.branches ?? []);
      }
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, [dbProviderId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditId(null); setForm(empty()); setFormError(''); setShowForm(true);
  };
  const openEdit = (b: Branch) => {
    setEditId(b.id);
    setForm({ name_ar: b.name_ar, name_en: b.name_en, address_ar: b.address_ar,
              address_en: b.address_en, city_ar: b.city_ar, city_en: b.city_en, phone: b.phone });
    setFormError(''); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); setFormError(''); };

  const handleSave = async () => {
    if (!form.name_ar.trim()) {
      setFormError(isAr ? 'اسم الفرع مطلوب' : 'Branch name is required');
      return;
    }
    setSaving(true); setFormError('');
    try {
      const url    = editId ? `${API_BASE}/branches/${editId}` : `${API_BASE}/branches`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers,
        body: JSON.stringify({
          nameAr: form.name_ar, nameEn: form.name_en,
          addressAr: form.address_ar, addressEn: form.address_en,
          cityAr: form.city_ar, cityEn: form.city_en,
          phone: form.phone, isActive: true,
        }),
      });
      if (!res.ok) { const d = await res.json(); setFormError(d.error ?? 'error'); return; }
      await load(); closeForm();
      setSavedOk(true); setTimeout(() => setSavedOk(false), 2500);
    } catch { setFormError(isAr ? 'خطأ في الاتصال' : 'Connection error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(isAr ? 'حذف هذا الفرع نهائياً؟' : 'Delete this branch?')) return;
    setDeletingId(id);
    try { await fetch(`${API_BASE}/branches/${id}`, { method: 'DELETE', headers }); await load(); }
    catch { /* ignore */ } finally { setDeletingId(null); }
  };

  const handleToggleActive = async (b: Branch) => {
    setTogglingId(b.id);
    try {
      await fetch(`${API_BASE}/branches/${b.id}`, {
        method: 'PUT', headers,
        body: JSON.stringify({
          nameAr: b.name_ar, nameEn: b.name_en,
          addressAr: b.address_ar, addressEn: b.address_en,
          cityAr: b.city_ar, cityEn: b.city_en,
          phone: b.phone, isActive: !b.is_active,
        }),
      });
      await load();
    } catch { /* ignore */ } finally { setTogglingId(null); }
  };

  if (!dbProviderId) return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
      {isAr ? 'يجب تسجيل الدخول لإدارة الفروع.' : 'Login required to manage branches.'}
    </div>
  );

  const activeBranches   = branches.filter(b => b.is_active).length;
  const inactiveBranches = branches.filter(b => !b.is_active).length;

  return (
    <div className="space-y-6">

      {/* ══ Top bar ═══════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#14332B]/8 flex items-center justify-center shrink-0"
               style={{ background: 'rgba(20,51,43,0.07)' }}>
            <Store className="w-5 h-5 text-[#14332B]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1C1B18] leading-tight">
              {isAr ? 'إدارة الفروع' : 'Branch Management'}
            </h2>
            {branches.length > 0 && (
              <p className="text-[11px] text-[#6E6A63] mt-0.5">
                {isAr
                  ? <>{activeBranches > 0 && <span className="text-emerald-600 font-semibold">{activeBranches} نشط</span>}{inactiveBranches > 0 && <><span className="mx-1">·</span><span>{inactiveBranches} موقوف</span></>}</>
                  : <>{activeBranches > 0 && <span className="text-emerald-600 font-semibold">{activeBranches} active</span>}{inactiveBranches > 0 && <><span className="mx-1">·</span><span>{inactiveBranches} inactive</span></>}</>
                }
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedOk && (
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isAr ? 'تم الحفظ' : 'Saved'}
            </span>
          )}
          {!showForm && (
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-[#1C1B18] hover:bg-[#14332B] text-white font-bold text-xs rounded-xl transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              {isAr ? 'فرع جديد' : 'New Branch'}
            </button>
          )}
        </div>
      </div>

      {/* ══ Inline form ═══════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="rounded-2xl border border-[#E9E7E2] bg-white overflow-hidden shadow-sm">
          {/* form header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0EFEC] bg-[#FAFAF8]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#FF5A5F]/10 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-[#FF5A5F]" />
              </div>
              <p className="text-xs font-bold text-[#1C1B18]">
                {editId ? (isAr ? 'تعديل بيانات الفرع' : 'Edit Branch') : (isAr ? 'إضافة فرع جديد' : 'Add New Branch')}
              </p>
            </div>
            <button onClick={closeForm} className="w-7 h-7 rounded-lg hover:bg-[#F0EFEC] flex items-center justify-center text-[#6E6A63] hover:text-[#1C1B18] transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* form fields */}
          <div className="p-5 space-y-4">
            {/* Row 1: names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={isAr ? 'اسم الفرع (عربي) *' : 'Branch Name (Arabic) *'}>
                <input
                  value={form.name_ar}
                  onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                  placeholder={isAr ? 'مثال: فرع الملقا' : 'e.g. فرع الملقا'}
                  dir="rtl"
                  className={INPUT}
                />
              </Field>
              <Field label={isAr ? 'اسم الفرع (إنجليزي)' : 'Branch Name (English)'}>
                <input
                  value={form.name_en}
                  onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                  placeholder="e.g. Al Malqa Branch"
                  dir="ltr"
                  className={INPUT}
                />
              </Field>
            </div>

            {/* Row 2: cities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={isAr ? 'المدينة (عربي)' : 'City (Arabic)'}>
                <input
                  value={form.city_ar}
                  onChange={e => setForm(f => ({ ...f, city_ar: e.target.value }))}
                  placeholder="الرياض"
                  dir="rtl"
                  className={INPUT}
                />
              </Field>
              <Field label={isAr ? 'المدينة (إنجليزي)' : 'City (English)'}>
                <input
                  value={form.city_en}
                  onChange={e => setForm(f => ({ ...f, city_en: e.target.value }))}
                  placeholder="Riyadh"
                  dir="ltr"
                  className={INPUT}
                />
              </Field>
            </div>

            {/* Row 3: addresses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={isAr ? 'العنوان التفصيلي (عربي)' : 'Address (Arabic)'}>
                <input
                  value={form.address_ar}
                  onChange={e => setForm(f => ({ ...f, address_ar: e.target.value }))}
                  placeholder={isAr ? 'شارع الأمير محمد...' : ''}
                  dir="rtl"
                  className={INPUT}
                />
              </Field>
              <Field label={isAr ? 'العنوان التفصيلي (إنجليزي)' : 'Address (English)'}>
                <input
                  value={form.address_en}
                  onChange={e => setForm(f => ({ ...f, address_en: e.target.value }))}
                  placeholder="Prince Mohammed St..."
                  dir="ltr"
                  className={INPUT}
                />
              </Field>
            </div>

            {/* Row 4: phone */}
            <Field label={isAr ? 'رقم هاتف الفرع' : 'Branch Phone'}>
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="05XXXXXXXX"
                dir="ltr"
                className={INPUT + ' font-mono max-w-xs'}
              />
            </Field>

            {formError && (
              <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formError}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-xs rounded-xl transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {isAr ? 'حفظ الفرع' : 'Save Branch'}
              </button>
              <button
                onClick={closeForm}
                className="px-4 py-2.5 border border-[#E9E7E2] rounded-xl text-xs font-semibold text-[#6E6A63] hover:border-[#1C1B18] hover:text-[#1C1B18] transition-all"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Content ═══════════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-[#FF5A5F]" />
        </div>

      ) : branches.length === 0 ? (
        /* ── Empty state ─────────────────────────────────────────────────── */
        <div className="rounded-2xl border-2 border-dashed border-[#E9E7E2] bg-[#FAFAF8]">
          <div className="flex flex-col sm:flex-row items-center gap-6 px-8 py-10">
            {/* Illustration */}
            <div className="shrink-0 relative">
              <div className="w-20 h-20 rounded-3xl bg-white border border-[#E9E7E2] shadow-sm flex items-center justify-center">
                <Store className="w-9 h-9 text-[#C9C7C2]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FF5A5F] flex items-center justify-center shadow-sm">
                <Plus className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* Text */}
            <div className="text-center sm:text-right flex-1">
              <p className="text-sm font-bold text-[#1C1B18]">
                {isAr ? 'لا توجد فروع مضافة بعد' : 'No branches yet'}
              </p>
              <p className="text-xs text-[#6E6A63] mt-1 leading-relaxed max-w-sm">
                {isAr
                  ? 'أضف فرعك الأول لتتمكن من تنظيم الحجوزات والإيرادات بشكل مستقل لكل موقع.'
                  : 'Add your first branch to manage bookings and revenue per location independently.'}
              </p>
              <button
                onClick={openNew}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#FF5A5F] hover:text-[#E04B50] transition-colors"
              >
                {isAr ? 'ابدأ بإضافة فرع' : 'Add your first branch'}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      ) : (
        /* ── Branches list ───────────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {branches.map(b => (
            <BranchCard
              key={b.id}
              branch={b}
              isAr={isAr}
              deleting={deletingId === b.id}
              toggling={togglingId === b.id}
              onEdit={() => openEdit(b)}
              onDelete={() => handleDelete(b.id)}
              onToggle={() => handleToggleActive(b)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

const INPUT = 'w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white transition-colors placeholder:text-[#C9C7C2]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-[#1C1B18] uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

interface CardProps {
  branch: any;
  isAr: boolean;
  deleting: boolean;
  toggling: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

function BranchCard({ branch: b, isAr, deleting, toggling, onEdit, onDelete, onToggle }: CardProps) {
  return (
    <div className={`group bg-white rounded-2xl border transition-all overflow-hidden ${
      b.is_active
        ? 'border-[#E9E7E2] hover:border-[#1C1B18]/20 hover:shadow-sm'
        : 'border-dashed border-[#D1D0CC] opacity-55 hover:opacity-70'
    }`}>
      {/* Status stripe */}
      <div className={`h-1 w-full ${b.is_active ? 'bg-emerald-400' : 'bg-[#D1D0CC]'}`} />

      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              b.is_active ? 'bg-[#FFF0F0]' : 'bg-[#F5F4F1]'
            }`}>
              <Building2 className={`w-4 h-4 ${b.is_active ? 'text-[#FF5A5F]' : 'text-[#9CA3AF]'}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#1C1B18] truncate leading-tight">
                {isAr ? b.name_ar : (b.name_en || b.name_ar)}
              </p>
              {b.city_ar && (
                <p className="text-[11px] text-[#9CA3AF] truncate">
                  {isAr ? b.city_ar : (b.city_en || b.city_ar)}
                </p>
              )}
            </div>
          </div>

          {/* Status pill */}
          <button
            onClick={onToggle}
            disabled={toggling}
            title={isAr ? (b.is_active ? 'اضغط لإيقاف الفرع' : 'اضغط لتفعيل الفرع') : (b.is_active ? 'Click to deactivate' : 'Click to activate')}
            className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all disabled:opacity-50 ${
              b.is_active
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-[#F5F4F1] text-[#9CA3AF] border-[#E9E7E2] hover:bg-[#EDECE9]'
            }`}
          >
            {toggling
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <span className={`w-1.5 h-1.5 rounded-full ${b.is_active ? 'bg-emerald-500' : 'bg-[#C9C7C2]'}`} />}
            {b.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'موقوف' : 'Off')}
          </button>
        </div>

        {/* Details */}
        {(b.address_ar || b.phone) && (
          <div className="space-y-1.5">
            {b.address_ar && (
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-[#C9C7C2]" />
                <p className="text-[11px] text-[#6E6A63] leading-relaxed line-clamp-2">
                  {isAr ? b.address_ar : (b.address_en || b.address_ar)}
                </p>
              </div>
            )}
            {b.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 shrink-0 text-[#C9C7C2]" />
                <p className="text-[11px] text-[#6E6A63] font-mono" dir="ltr">{b.phone}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-1 pt-1 border-t border-[#F6F6F4]">
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-[#6E6A63] hover:text-[#1C1B18] hover:bg-[#F5F4F1] rounded-lg transition-all"
          >
            <Pencil className="w-3 h-3" />
            {isAr ? 'تعديل' : 'Edit'}
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-[#6E6A63] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            {isAr ? 'حذف' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
