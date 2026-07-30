/**
 * ServicesManager — إدارة خدمات الصالون وأسعارها ومددها
 * يتيح لصاحب الصالون إضافة / تعديل / حذف الخدمات مع الأسعار يدوياً
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Check, X, Loader2, ToggleLeft, ToggleRight,
  Scissors, Clock, Tag, DollarSign, ChevronDown, AlertCircle,
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { getUnifiedHeaders } from '../lib/unifiedAuth';

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') + '/api';

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

interface Props {
  dbProviderId?: number | null;
}

const EMPTY_FORM = { nameAr: '', nameEn: '', price: '', duration: '', categoryAr: '', categoryEn: '' };

export default function ServicesManager({ dbProviderId }: Props) {
  const { isAr } = useLanguage();

  const [services,   setServices]   = useState<Service[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState<number | 'new' | null>(null);
  const [deleting,   setDeleting]   = useState<number | null>(null);
  const [editId,     setEditId]     = useState<number | 'new' | null>(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [error,      setError]      = useState('');

  const headers = { 'Content-Type': 'application/json', ...getUnifiedHeaders() };

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!dbProviderId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/services`, { headers });
      if (res.ok) {
        const d = await res.json();
        setServices(d.services ?? []);
      }
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, [dbProviderId]);

  useEffect(() => { load(); }, [load]);

  // ── Open edit form ────────────────────────────────────────────────────────
  const openEdit = (svc: Service) => {
    setEditId(svc.id);
    setForm({
      nameAr: svc.nameAr,
      nameEn: svc.nameEn,
      price: String(svc.price),
      duration: String(svc.duration),
      categoryAr: svc.categoryAr ?? '',
      categoryEn: svc.categoryEn ?? '',
    });
    setError('');
  };

  const openNew = () => {
    setEditId('new');
    setForm(EMPTY_FORM);
    setError('');
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY_FORM); setError(''); };

  // ── Validate form ─────────────────────────────────────────────────────────
  const validate = () => {
    if (!form.nameAr.trim()) return isAr ? 'الاسم بالعربي مطلوب' : 'Arabic name is required';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) return isAr ? 'السعر غير صحيح' : 'Invalid price';
    if (!form.duration || isNaN(Number(form.duration)) || Number(form.duration) <= 0) return isAr ? 'المدة غير صحيحة' : 'Invalid duration';
    return '';
  };

  // ── Save (create or update) ───────────────────────────────────────────────
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
        if (!res.ok) throw new Error(await res.text());
      } else {
        const res = await fetch(`${API_BASE}/services/${editId}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(await res.text());
      }

      await load();
      cancelEdit();
    } catch (e: any) {
      setError(isAr ? 'حدث خطأ أثناء الحفظ' : 'Save failed');
    } finally {
      setSaving(null);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────
  const toggleActive = async (svc: Service) => {
    try {
      await fetch(`${API_BASE}/services/${svc.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ isActive: !svc.isActive }),
      });
      setServices(prev => prev.map(s => s.id === svc.id ? { ...s, isActive: !s.isActive } : s));
    } catch { /* ignore */ }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (svc: Service) => {
    if (!window.confirm(isAr ? `هل تريد حذف "${svc.nameAr}"؟` : `Delete "${svc.nameEn}"?`)) return;
    setDeleting(svc.id);
    try {
      await fetch(`${API_BASE}/services/${svc.id}`, { method: 'DELETE', headers });
      setServices(prev => prev.filter(s => s.id !== svc.id));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  if (!dbProviderId) return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
      {isAr ? 'يجب تسجيل الدخول لإدارة الخدمات.' : 'Login required to manage services.'}
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-[#FF5A5F]" />
    </div>
  );

  const activeCount  = services.filter(s => s.isActive).length;
  const inactiveCount = services.filter(s => !s.isActive).length;

  return (
    <div className="space-y-5">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
            <Scissors className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1C1B18]">
              {isAr ? 'إدارة الخدمات والأسعار' : 'Services & Pricing'}
            </h3>
            <p className="text-[11px] text-[#6E6A63]">
              {isAr
                ? `${activeCount} خدمة نشطة · ${inactiveCount} مخفية`
                : `${activeCount} active · ${inactiveCount} hidden`}
            </p>
          </div>
        </div>
        {editId !== 'new' && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-xs rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            {isAr ? 'إضافة خدمة' : 'Add Service'}
          </button>
        )}
      </div>

      {/* ── Add new form ──────────────────────────────────────────────────── */}
      {editId === 'new' && (
        <ServiceForm
          form={form} setForm={setForm} error={error}
          isAr={isAr} saving={saving === 'new'}
          onSave={handleSave} onCancel={cancelEdit}
          title={isAr ? 'إضافة خدمة جديدة' : 'New Service'}
        />
      )}

      {/* ── Services list ─────────────────────────────────────────────────── */}
      {services.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[#E9E7E2] rounded-2xl">
          <Scissors className="w-8 h-8 text-[#C9C7C2] mx-auto mb-3" />
          <p className="text-sm text-[#6E6A63] font-semibold">
            {isAr ? 'لا توجد خدمات بعد' : 'No services yet'}
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1">
            {isAr ? 'اضغط "إضافة خدمة" لبدء قائمة خدماتك' : 'Click "Add Service" to build your menu'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {services.map(svc => (
            <div key={svc.id}>
              {editId === svc.id ? (
                <ServiceForm
                  form={form} setForm={setForm} error={error}
                  isAr={isAr} saving={saving === svc.id}
                  onSave={handleSave} onCancel={cancelEdit}
                  title={isAr ? `تعديل: ${svc.nameAr}` : `Edit: ${svc.nameEn}`}
                />
              ) : (
                <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all ${
                  svc.isActive ? 'bg-white border-[#E9E7E2]' : 'bg-[#FAFAF8] border-[#E9E7E2] opacity-60'
                }`}>

                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    svc.isActive ? 'bg-rose-50' : 'bg-[#F0EFEC]'
                  }`}>
                    <Scissors className={`w-4 h-4 ${svc.isActive ? 'text-rose-400' : 'text-[#C9C7C2]'}`} />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#1C1B18] truncate">
                        {isAr ? svc.nameAr : svc.nameEn}
                      </span>
                      {!isAr && svc.nameAr !== svc.nameEn && (
                        <span className="text-[11px] text-[#9CA3AF]">{svc.nameAr}</span>
                      )}
                      {(isAr ? svc.categoryAr : svc.categoryEn) && (
                        <span className="text-[10px] font-semibold bg-[#F5F4F1] text-[#6E6A63] px-2 py-0.5 rounded-full">
                          {isAr ? svc.categoryAr : svc.categoryEn}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[11px] text-[#6E6A63]">
                        <Clock className="w-3 h-3" />
                        {svc.duration} {isAr ? 'دقيقة' : 'min'}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-end shrink-0">
                    <p className="text-base font-black text-[#FF5A5F]">{svc.price.toLocaleString()}</p>
                    <p className="text-[10px] text-[#9CA3AF]">{isAr ? 'ريال' : 'SAR'}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleActive(svc)}
                      title={svc.isActive ? (isAr ? 'إخفاء من الحجز' : 'Hide from booking') : (isAr ? 'إظهار في الحجز' : 'Show in booking')}
                      className="p-1.5 rounded-lg hover:bg-[#F5F4F1] text-[#6E6A63] hover:text-[#1C1B18] transition-colors"
                    >
                      {svc.isActive
                        ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                        : <ToggleLeft  className="w-5 h-5 text-[#C9C7C2]" />}
                    </button>
                    {/* Edit */}
                    <button
                      onClick={() => openEdit(svc)}
                      className="p-1.5 rounded-lg hover:bg-[#F5F4F1] text-[#6E6A63] hover:text-[#1C1B18] transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {/* Delete */}
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

      {/* ── Tip ──────────────────────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-[11px] text-blue-700 flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          {isAr
            ? 'الخدمات المفعّلة (الخضراء) تظهر للعملاء في صفحة الحجز الأونلاين. الخدمات المخفية لا تظهر للعملاء لكنها تبقى في النظام.'
            : 'Active (green) services appear in the online booking portal. Hidden services are invisible to customers but stay in the system.'}
        </span>
      </div>

    </div>
  );
}

// ── ServiceForm ───────────────────────────────────────────────────────────────
interface FormProps {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  error: string;
  isAr: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  title: string;
}

function ServiceForm({ form, setForm, error, isAr, saving, onSave, onCancel, title }: FormProps) {
  const f = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="rounded-2xl border border-[#FF5A5F]/30 bg-rose-50/30 p-4 space-y-3">
      <p className="text-xs font-bold text-[#1C1B18]">{title}</p>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Name AR */}
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">
            {isAr ? 'اسم الخدمة (عربي) *' : 'Arabic Name *'}
          </label>
          <input
            value={form.nameAr}
            onChange={f('nameAr')}
            placeholder={isAr ? 'مثال: كيراتين، بروتين...' : 'e.g. كيراتين'}
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
            value={form.nameEn}
            onChange={f('nameEn')}
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
            type="number"
            min="0"
            value={form.price}
            onChange={f('price')}
            placeholder="500"
            dir="ltr"
            className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">
            {isAr ? 'المدة (دقيقة) *' : 'Duration (min) *'}
          </label>
          <input
            type="number"
            min="5"
            value={form.duration}
            onChange={f('duration')}
            placeholder="60"
            dir="ltr"
            className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white"
          />
        </div>

        {/* Category AR */}
        <div>
          <label className="block text-[11px] font-bold text-[#1C1B18] mb-1">
            {isAr ? 'الفئة (عربي)' : 'Category (AR)'}
          </label>
          <input
            value={form.categoryAr}
            onChange={f('categoryAr')}
            placeholder={isAr ? 'مثال: شعر، بشرة...' : 'e.g. شعر'}
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
            value={form.categoryEn}
            onChange={f('categoryEn')}
            placeholder="e.g. Hair"
            dir="ltr"
            className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {isAr ? 'حفظ' : 'Save'}
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
