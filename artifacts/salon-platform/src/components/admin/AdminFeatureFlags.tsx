/**
 * AdminFeatureFlags — Platform-wide feature toggle control (Platform Owner only).
 * Enables/disables features globally or per-salon.
 */
import { useState, useEffect, useCallback } from 'react';
import { Zap, RefreshCw, Plus, Search } from 'lucide-react';
import type { FeatureFlag, Toast } from './adminTypes';
import { getAdminHeaders } from '../../lib/adminAuth';

interface Props { isAr: boolean; addToast: (t: Omit<Toast, 'id'>) => void; }

const CAT_COLORS: Record<string, string> = {
  booking:       'bg-blue-100 text-blue-700',
  billing:       'bg-emerald-100 text-emerald-700',
  hr:            'bg-purple-100 text-purple-700',
  crm:           'bg-amber-100 text-amber-700',
  notifications: 'bg-sky-100 text-sky-700',
  ai:            'bg-pink-100 text-pink-700',
  advanced:      'bg-orange-100 text-orange-700',
  compliance:    'bg-teal-100 text-teal-700',
  general:       'bg-slate-100 text-slate-700',
};

const CAT_LABELS: Record<string, { ar: string; en: string }> = {
  booking:       { ar: 'حجوزات', en: 'Booking' },
  billing:       { ar: 'فوترة', en: 'Billing' },
  hr:            { ar: 'موارد بشرية', en: 'HR' },
  crm:           { ar: 'CRM', en: 'CRM' },
  notifications: { ar: 'إشعارات', en: 'Notifications' },
  ai:            { ar: 'ذكاء اصطناعي', en: 'AI' },
  advanced:      { ar: 'متقدم', en: 'Advanced' },
  compliance:    { ar: 'امتثال', en: 'Compliance' },
  general:       { ar: 'عام', en: 'General' },
};

export default function AdminFeatureFlags({ isAr, addToast }: Props) {
  const [flags, setFlags]     = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [saving, setSaving]   = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft]     = useState({ flagKey: '', labelAr: '', labelEn: '', category: 'general', enabled: true });

  const loadFlags = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/feature-flags', { headers: getAdminHeaders() })
      .then(r => r.json())
      .then(d => { if (d.flags) setFlags(d.flags); })
      .catch(() => addToast({ type: 'error', message: isAr ? 'فشل تحميل الإعدادات' : 'Failed to load flags' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadFlags(); }, [loadFlags]);

  const toggle = async (flag: FeatureFlag) => {
    setSaving(flag.flag_key);
    try {
      await fetch(`/api/admin/feature-flags/${flag.flag_key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({ enabled: !flag.enabled }),
      });
      setFlags(prev => prev.map(f => f.flag_key === flag.flag_key ? { ...f, enabled: !f.enabled } : f));
      addToast({ type: 'success', message: isAr ? `تم ${!flag.enabled ? 'تفعيل' : 'تعطيل'} "${flag.label_ar}"` : `${flag.label_en} ${!flag.enabled ? 'enabled' : 'disabled'}` });
    } catch {
      addToast({ type: 'error', message: isAr ? 'فشل التحديث' : 'Update failed' });
    }
    setSaving(null);
  };

  const addFlag = async () => {
    if (!draft.flagKey || !draft.labelAr) {
      addToast({ type: 'error', message: isAr ? 'أدخل المفتاح والاسم' : 'Enter key and name' }); return;
    }
    try {
      await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify(draft),
      });
      setShowAdd(false);
      setDraft({ flagKey: '', labelAr: '', labelEn: '', category: 'general', enabled: true });
      loadFlags();
      addToast({ type: 'success', message: isAr ? 'تم إضافة الميزة' : 'Feature added' });
    } catch {
      addToast({ type: 'error', message: isAr ? 'فشل الإضافة' : 'Failed to add' });
    }
  };

  const byCategory = flags
    .filter(f => !search || f.label_ar.includes(search) || f.label_en.toLowerCase().includes(search.toLowerCase()) || f.flag_key.includes(search))
    .reduce<Record<string, FeatureFlag[]>>((acc, f) => { (acc[f.category] = acc[f.category] || []).push(f); return acc; }, {});

  const totalEnabled  = flags.filter(f => f.enabled).length;
  const totalDisabled = flags.filter(f => !f.enabled).length;

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { l: isAr ? 'إجمالي الميزات' : 'Total Features', v: flags.length, c: '#3b82f6' },
          { l: isAr ? 'مفعّلة' : 'Enabled',                v: totalEnabled,  c: '#10b981' },
          { l: isAr ? 'معطّلة' : 'Disabled',                v: totalDisabled, c: '#ef4444' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
            <p className="text-3xl font-black font-mono" style={{ color: k.c }}>{k.v}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">{k.l}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isAr ? 'بحث في الميزات...' : 'Search features...'}
            className="w-full ps-9 pe-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#FF5A5F]" />
        </div>
        <div className="flex gap-2">
          <button onClick={loadFlags} className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl cursor-pointer transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white text-xs font-bold rounded-xl cursor-pointer transition-all">
            <Plus className="w-3.5 h-3.5" />{isAr ? 'ميزة جديدة' : 'New Feature'}
          </button>
        </div>
      </div>

      {/* Feature flags by category */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : (
        Object.entries(byCategory).map(([cat, items]) => {
          const catLabel = CAT_LABELS[cat] || { ar: cat, en: cat };
          return (
            <div key={cat} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${CAT_COLORS[cat] || CAT_COLORS.general}`}>
                  {isAr ? catLabel.ar : catLabel.en}
                </span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(flag => (
                  <div key={flag.id} className={`bg-white border rounded-xl p-4 flex items-center justify-between transition-all ${flag.enabled ? 'border-slate-200' : 'border-slate-100 opacity-70'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${flag.enabled ? 'bg-[#FF5A5F]/10' : 'bg-slate-100'}`}>
                        <Zap className={`w-4 h-4 ${flag.enabled ? 'text-[#FF5A5F]' : 'text-slate-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{isAr ? flag.label_ar : flag.label_en}</p>
                        <p className="text-[9px] text-slate-400 font-mono truncate">{flag.flag_key}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggle(flag)}
                      disabled={saving === flag.flag_key}
                      className={`w-11 h-6 rounded-full transition-all cursor-pointer relative shrink-0 ${flag.enabled ? 'bg-[#FF5A5F]' : 'bg-slate-200'} ${saving === flag.flag_key ? 'opacity-50' : ''}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${flag.enabled ? 'end-1' : 'start-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Add Flag Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">{isAr ? 'إضافة ميزة جديدة' : 'Add New Feature Flag'}</h3>
            <div className="space-y-3">
              {[
                { k: 'flagKey',  l: isAr ? 'مفتاح الميزة (snake_case)' : 'Flag Key (snake_case)', ph: 'my_feature' },
                { k: 'labelAr', l: isAr ? 'الاسم بالعربية' : 'Arabic Label', ph: 'اسم الميزة' },
                { k: 'labelEn', l: isAr ? 'الاسم بالإنجليزية' : 'English Label', ph: 'Feature Name' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">{f.l}</label>
                  <input value={(draft as any)[f.k]} onChange={e => setDraft(d => ({ ...d, [f.k]: e.target.value }))}
                    placeholder={f.ph} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FF5A5F]" />
                </div>
              ))}
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-1">{isAr ? 'الفئة' : 'Category'}</label>
                <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FF5A5F]">
                  {Object.keys(CAT_LABELS).map(c => <option key={c} value={c}>{isAr ? CAT_LABELS[c].ar : CAT_LABELS[c].en}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={addFlag} className="px-5 py-2 bg-[#FF5A5F] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#E04B50]">{isAr ? 'إضافة' : 'Add'}</button>
              <button onClick={() => setShowAdd(false)} className="px-5 py-2 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl cursor-pointer">{isAr ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
