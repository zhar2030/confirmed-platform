/**
 * AdminContent — Editable platform content (Platform Owner only).
 * Edit homepage text, FAQs, and email templates stored in the DB.
 */
import { useState, useEffect, useCallback } from 'react';
import { FileText, Save, RefreshCw, Globe, Mail, HelpCircle, Check } from 'lucide-react';
import type { ContentBlock, Toast } from './adminTypes';
import { getAdminHeaders, hasValidAdminSession } from '../../lib/adminAuth';

interface Props { isAr: boolean; addToast: (t: Omit<Toast, 'id'>) => void; }

const SECTION_CFG: Record<string, { icon: any; ar: string; en: string; color: string }> = {
  homepage: { icon: Globe,       ar: 'الصفحة الرئيسية', en: 'Homepage',       color: '#3b82f6' },
  faq:      { icon: HelpCircle,  ar: 'الأسئلة الشائعة', en: 'FAQ',            color: '#f59e0b' },
  email:    { icon: Mail,        ar: 'قوالب الإيميل',    en: 'Email Templates', color: '#10b981' },
  general:  { icon: FileText,    ar: 'عام',              en: 'General',         color: '#94a3b8' },
};

export default function AdminContent({ isAr, addToast }: Props) {
  const [blocks, setBlocks]     = useState<ContentBlock[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving]     = useState<string | null>(null);
  const [saved, setSaved]       = useState<string | null>(null);
  const [edits, setEdits]       = useState<Record<string, { valueAr: string; valueEn: string }>>({});
  const [tab, setTab]           = useState('homepage');

  const loadContent = useCallback(() => {
    if (!hasValidAdminSession()) {
      setFetchError('session_expired');
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(null);
    fetch('/api/admin/content', { headers: getAdminHeaders() })
      .then(r => {
        if (r.status === 401) { setFetchError('session_expired'); throw new Error('401'); }
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(d => {
        if (d.content) {
          setBlocks(d.content);
          const initial: Record<string, { valueAr: string; valueEn: string }> = {};
          d.content.forEach((b: ContentBlock) => {
            initial[b.content_key] = { valueAr: b.value_ar, valueEn: b.value_en };
          });
          setEdits(initial);
        }
      })
      .catch(err => {
        if (err.message !== '401') addToast({ type: 'error', message: isAr ? 'فشل تحميل المحتوى' : 'Failed to load content' });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);

  const save = async (key: string) => {
    const edit = edits[key];
    if (!edit) return;
    setSaving(key);
    try {
      await fetch(`/api/admin/content/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({ valueAr: edit.valueAr, valueEn: edit.valueEn }),
      });
      setSaved(key);
      addToast({ type: 'success', message: isAr ? 'تم حفظ المحتوى' : 'Content saved' });
      setTimeout(() => setSaved(null), 2000);
    } catch {
      addToast({ type: 'error', message: isAr ? 'فشل الحفظ' : 'Save failed' });
    }
    setSaving(null);
  };

  const updateEdit = (key: string, field: 'valueAr' | 'valueEn', value: string) => {
    setEdits(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const bySection = blocks.reduce<Record<string, ContentBlock[]>>((acc, b) => {
    (acc[b.section] = acc[b.section] || []).push(b); return acc;
  }, {});

  const sections = Object.keys(bySection);

  // ── Session-expired wall ──────────────────────────────────────────────────
  if (fetchError === 'session_expired') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-amber-500" />
        </div>
        <p className="text-base font-bold text-slate-800">
          {isAr ? 'انتهت الجلسة' : 'Session Expired'}
        </p>
        <p className="text-sm text-slate-500 max-w-xs">
          {isAr
            ? 'تنتهي صلاحية الجلسة كل يوم عند منتصف الليل (UTC). سجّل الدخول مرة أخرى للمتابعة.'
            : 'Your session expires at UTC midnight each day. Please log in again to continue.'}
        </p>
        <button
          onClick={() => { window.location.assign('/'); }}
          className="mt-2 px-6 py-2.5 bg-[#FF5A5F] text-white text-sm font-bold rounded-xl hover:bg-[#E04B50] transition-colors cursor-pointer">
          {isAr ? 'تسجيل الدخول من جديد' : 'Log In Again'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Section tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {sections.map(s => {
          const cfg = SECTION_CFG[s] || SECTION_CFG.general;
          const Icon = cfg.icon;
          return (
            <button key={s} onClick={() => setTab(s)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer -mb-px whitespace-nowrap ${tab === s ? 'border-[#FF5A5F] text-[#FF5A5F]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Icon className="w-3.5 h-3.5" />{isAr ? cfg.ar : cfg.en}
              <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 rounded-full">{bySection[s]?.length}</span>
            </button>
          );
        })}
        <div className="flex-1" />
        <button onClick={loadContent} className="mb-1 p-2 text-slate-400 hover:text-slate-700 cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : (
        <div className="space-y-4">
          {(bySection[tab] || []).map(block => {
            const edit = edits[block.content_key] || { valueAr: block.value_ar, valueEn: block.value_en };
            const isDirty = edit.valueAr !== block.value_ar || edit.valueEn !== block.value_en;
            const isSaved = saved === block.content_key;
            const isSaving = saving === block.content_key;
            const isLong = block.value_ar.length > 60 || block.value_en.length > 60;

            return (
              <div key={block.id} className={`bg-white border rounded-2xl p-5 space-y-4 transition-all ${isDirty ? 'border-amber-300' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{block.content_key.replace(/_/g, ' ')}</p>
                    <p className="text-[9px] font-mono text-slate-400">{block.content_key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDirty && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{isAr ? 'غير محفوظ' : 'Unsaved'}</span>}
                    <button onClick={() => save(block.content_key)}
                      disabled={isSaving || !isDirty}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all
                        ${isSaved ? 'bg-emerald-100 text-emerald-600' : isDirty ? 'bg-[#FF5A5F] text-white hover:bg-[#E04B50]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                      {isSaved ? <><Check className="w-3 h-3" />{isAr ? 'محفوظ' : 'Saved'}</> : isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3" />{isAr ? 'حفظ' : 'Save'}</>}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'valueAr', label: isAr ? 'النص العربي' : 'Arabic Text', dir: 'rtl' },
                    { key: 'valueEn', label: isAr ? 'النص الإنجليزي' : 'English Text', dir: 'ltr' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5">{f.label}</label>
                      {isLong ? (
                        <textarea
                          value={(edit as any)[f.key]}
                          onChange={e => updateEdit(block.content_key, f.key as any, e.target.value)}
                          rows={3}
                          dir={f.dir}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-[#FF5A5F] resize-none"
                        />
                      ) : (
                        <input
                          value={(edit as any)[f.key]}
                          onChange={e => updateEdit(block.content_key, f.key as any, e.target.value)}
                          dir={f.dir}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-[#FF5A5F]"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
