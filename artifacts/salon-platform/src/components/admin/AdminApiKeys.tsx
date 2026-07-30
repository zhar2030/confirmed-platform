/**
 * AdminApiKeys — API key management (Platform Owner only).
 * Create, view, copy, and revoke API integration keys.
 */
import { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Copy, Trash2, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { ApiKey, Toast } from './adminTypes';
import { getAdminHeaders } from '../../lib/adminAuth';

interface Props { isAr: boolean; addToast: (t: Omit<Toast, 'id'>) => void; openConfirm: (cfg: any) => void; }

const PERM_LABELS: Record<string, { ar: string; en: string }> = {
  read_salons:     { ar: 'قراءة الصالونات', en: 'Read Salons' },
  read_bookings:   { ar: 'قراءة الحجوزات', en: 'Read Bookings' },
  read_analytics:  { ar: 'قراءة التحليلات', en: 'Read Analytics' },
  write_content:   { ar: 'كتابة المحتوى', en: 'Write Content' },
  manage_webhooks: { ar: 'إدارة Webhooks', en: 'Manage Webhooks' },
};

export default function AdminApiKeys({ isAr, addToast, openConfirm }: Props) {
  const [keys, setKeys]           = useState<ApiKey[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey]       = useState<{ key: ApiKey; rawKey: string } | null>(null);
  const [draft, setDraft]         = useState({ name: '', permissions: ['read_salons', 'read_analytics'], environment: 'production' });

  const loadKeys = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/api-keys', { headers: getAdminHeaders() })
      .then(r => r.json())
      .then(d => { if (d.keys) setKeys(d.keys); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const createKey = async () => {
    if (!draft.name) { addToast({ type: 'error', message: isAr ? 'أدخل اسماً للمفتاح' : 'Enter a key name' }); return; }
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      setNewKey(data);
      setShowCreate(false);
      setDraft({ name: '', permissions: ['read_salons', 'read_analytics'], environment: 'production' });
      loadKeys();
    } catch {
      addToast({ type: 'error', message: isAr ? 'فشل إنشاء المفتاح' : 'Failed to create key' });
    }
  };

  const revokeKey = (key: ApiKey) => {
    openConfirm({
      title: isAr ? 'إلغاء المفتاح' : 'Revoke API Key',
      message: isAr ? `سيتم إلغاء "${key.name}" ولن يعمل أي تكامل يستخدمه.` : `Revoking "${key.name}" will break any integration using it.`,
      danger: true,
      onConfirm: async () => {
        try {
          await fetch(`/api/admin/api-keys/${key.id}`, { method: 'DELETE', headers: getAdminHeaders() });
          setKeys(prev => prev.filter(k => k.id !== key.id));
          addToast({ type: 'success', message: isAr ? 'تم إلغاء المفتاح' : 'Key revoked' });
        } catch {
          addToast({ type: 'error', message: isAr ? 'فشل الإلغاء' : 'Revoke failed' });
        }
      },
    });
  };

  const copyKey = (text: string) => {
    navigator.clipboard.writeText(text).then(() => addToast({ type: 'info', message: isAr ? 'تم نسخ المفتاح' : 'Key copied' }));
  };

  const togglePerm = (perm: string) => {
    setDraft(d => ({
      ...d,
      permissions: d.permissions.includes(perm) ? d.permissions.filter(p => p !== perm) : [...d.permissions, perm],
    }));
  };

  const activeKeys = keys.filter(k => k.is_active);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { l: isAr ? 'إجمالي المفاتيح' : 'Total Keys',   v: activeKeys.length, c: '#3b82f6' },
          { l: isAr ? 'إنتاج' : 'Production',              v: activeKeys.filter(k => k.environment === 'production').length, c: '#10b981' },
          { l: isAr ? 'اختبار' : 'Staging',                v: activeKeys.filter(k => k.environment !== 'production').length, c: '#f59e0b' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
            <p className="text-3xl font-black font-mono" style={{ color: k.c }}>{k.v}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">{k.l}</p>
          </div>
        ))}
      </div>

      {/* Security notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">{isAr ? 'احتفظي بمفاتيح API سرية تماماً. يُعرض المفتاح مرة واحدة فقط عند الإنشاء ويُخزّن كـ hash بعد ذلك.' : 'Keep API keys completely secret. Keys are shown only once at creation and stored as a hash afterwards.'}</p>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Key className="w-4 h-4 text-[#FF5A5F]" />{isAr ? 'مفاتيح API النشطة' : 'Active API Keys'}</h3>
        <div className="flex gap-2">
          <button onClick={loadKeys} className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white text-xs font-bold rounded-xl cursor-pointer transition-all">
            <Plus className="w-3.5 h-3.5" />{isAr ? 'إنشاء مفتاح' : 'Create Key'}
          </button>
        </div>
      </div>

      {/* Keys list */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
        ) : activeKeys.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400">
            <Key className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{isAr ? 'لا توجد مفاتيح بعد' : 'No API keys yet'}</p>
          </div>
        ) : (
          activeKeys.map(key => (
            <div key={key.id} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-[#FF5A5F]/10 flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4 text-[#FF5A5F]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900">{key.name}</p>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${key.environment === 'production' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{key.environment}</span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{key.key_prefix}{'•'.repeat(16)}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {key.permissions?.map((p: string) => (
                        <span key={p} className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">{isAr ? (PERM_LABELS[p]?.ar ?? p) : (PERM_LABELS[p]?.en ?? p)}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-end hidden sm:block">
                    <p className="text-[9px] text-slate-400 flex items-center gap-1 justify-end">
                      <Clock className="w-2.5 h-2.5" />
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US') : (isAr ? 'لم يُستخدم بعد' : 'Never used')}
                    </p>
                    <p className="text-[9px] text-slate-500">{key.usage_count} {isAr ? 'طلب' : 'requests'}</p>
                  </div>
                  <button onClick={() => copyKey(key.key_prefix)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition-all">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => revokeKey(key)}
                    className="p-1.5 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Revealed new key */}
      {newKey && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{isAr ? 'تم إنشاء المفتاح بنجاح' : 'API Key Created'}</h3>
                <p className="text-[10px] text-slate-500">{isAr ? 'انسخيه الآن — لن يُعرض مرة أخرى' : 'Copy it now — it will never be shown again'}</p>
              </div>
            </div>
            <div className="bg-slate-900 rounded-xl p-4">
              <p className="font-mono text-xs text-emerald-400 break-all">{newKey.rawKey}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => copyKey(newKey.rawKey)}
                className="flex-1 py-2 bg-[#FF5A5F] text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2">
                <Copy className="w-3.5 h-3.5" />{isAr ? 'نسخ المفتاح' : 'Copy Key'}
              </button>
              <button onClick={() => setNewKey(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer">
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create key modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">{isAr ? 'إنشاء مفتاح API جديد' : 'Create New API Key'}</h3>
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1">{isAr ? 'اسم المفتاح' : 'Key Name'}</label>
              <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                placeholder={isAr ? 'مثل: تكامل CRM الداخلي' : 'e.g. Internal CRM Integration'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FF5A5F]" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-2">{isAr ? 'الصلاحيات' : 'Permissions'}</label>
              <div className="space-y-2">
                {Object.entries(PERM_LABELS).map(([p, l]) => (
                  <label key={p} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={draft.permissions.includes(p)} onChange={() => togglePerm(p)} className="accent-[#FF5A5F]" />
                    {isAr ? l.ar : l.en}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1">{isAr ? 'البيئة' : 'Environment'}</label>
              <select value={draft.environment} onChange={e => setDraft(d => ({ ...d, environment: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FF5A5F]">
                <option value="production">{isAr ? 'إنتاج' : 'Production'}</option>
                <option value="staging">{isAr ? 'اختبار' : 'Staging'}</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={createKey} className="flex-1 py-2 bg-[#FF5A5F] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#E04B50]">{isAr ? 'إنشاء' : 'Create'}</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl cursor-pointer">{isAr ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
