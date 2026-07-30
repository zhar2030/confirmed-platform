/**
 * AdminReminders — Subscription renewal reminder management panel.
 * Shows all providers with subscription end dates, days remaining,
 * reminder history, and allows admin to trigger reminders or adjust dates.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Bell, RefreshCw, Play, RotateCcw, Calendar, ChevronDown,
  CheckCircle2, Clock, AlertTriangle, XCircle, Info, Loader2,
  Filter, Search, Mail,
} from 'lucide-react';
import type { Toast } from './adminTypes';
import { getAdminHeaders } from '../../lib/adminAuth';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReminderProvider {
  id: number;
  username: string;
  email: string;
  nameAr: string;
  status: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  billingCycle: string | null;
  subscriptionEndsAt: string | null;
  remindersSent: string;
  createdAt: string;
  daysLeft: number | null;
  remindersSentList: string[];
  nextReminderStage: string | null;
}

interface Props {
  isAr: boolean;
  addToast: (t: Omit<Toast, 'id'>) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES = ['d30', 'd7', 'd3', 'd1', 'd0'] as const;
type Stage = typeof STAGES[number];

const STAGE_LABEL: Record<Stage, { ar: string; color: string; bg: string }> = {
  d30: { ar: '30 يوم',  color: 'text-sky-400',    bg: 'bg-sky-500/15 border-sky-500/30' },
  d7:  { ar: '7 أيام',  color: 'text-amber-400',  bg: 'bg-amber-500/15 border-amber-500/30' },
  d3:  { ar: '3 أيام',  color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  d1:  { ar: 'يوم 1',   color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/30' },
  d0:  { ar: 'يوم 0',   color: 'text-rose-300',   bg: 'bg-rose-500/15 border-rose-500/30' },
};

const TIER_LABEL: Record<string, string> = {
  basic: 'أساسية', pro: 'احترافية', enterprise: 'مؤسسية',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function urgencyFromDays(d: number | null): { color: string; icon: React.ReactNode; label: string } {
  if (d === null) return { color: 'text-slate-400', icon: <Info className="w-3.5 h-3.5" />, label: 'غير محدد' };
  if (d < 0)     return { color: 'text-slate-500', icon: <XCircle className="w-3.5 h-3.5" />, label: 'منتهٍ' };
  if (d === 0)   return { color: 'text-rose-400',   icon: <XCircle className="w-3.5 h-3.5" />, label: 'اليوم' };
  if (d <= 1)    return { color: 'text-red-400',    icon: <AlertTriangle className="w-3.5 h-3.5" />, label: `${d} يوم` };
  if (d <= 3)    return { color: 'text-orange-400', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: `${d} أيام` };
  if (d <= 7)    return { color: 'text-amber-400',  icon: <Clock className="w-3.5 h-3.5" />, label: `${d} أيام` };
  if (d <= 30)   return { color: 'text-sky-400',    icon: <Clock className="w-3.5 h-3.5" />, label: `${d} يوم` };
  return { color: 'text-slate-400', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: `${d} يوم` };
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminReminders({ isAr, addToast }: Props) {
  const [data, setData]         = useState<ReminderProvider[]>([]);
  const [loading, setLoading]   = useState(true);
  const [running, setRunning]   = useState(false);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<'all' | 'expiring' | 'no-date' | 'expired'>('all');
  const [patchingId, setPatchingId] = useState<number | null>(null);
  const [editDrawer, setEditDrawer] = useState<ReminderProvider | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editCycle, setEditCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [resetId, setResetId]   = useState<number | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reminders', { headers: getAdminHeaders() });
      const json = await res.json();
      if (json.reminders) setData(json.reminders);
    } catch {
      addToast({ type: 'error', message: 'تعذّر تحميل بيانات التذكيرات' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  // ── Trigger job ────────────────────────────────────────────────────────────
  const runJob = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/reminders/run', { method: 'POST', headers: getAdminHeaders() });
      const json = await res.json();
      if (json.success) {
        addToast({ type: 'success', message: `تم الإرسال: ${json.sent} تذكير، ${json.errors} أخطاء` });
        await fetchReminders();
      } else {
        addToast({ type: 'error', message: 'فشل تشغيل الجدولة' });
      }
    } catch {
      addToast({ type: 'error', message: 'خطأ في الاتصال بالخادم' });
    } finally {
      setRunning(false);
    }
  };

  // ── Reset reminder history ─────────────────────────────────────────────────
  const resetReminders = async (id: number) => {
    setResetId(id);
    try {
      const res = await fetch(`/api/reminders/${id}/reset`, { method: 'POST', headers: getAdminHeaders() });
      const json = await res.json();
      if (json.success) {
        addToast({ type: 'success', message: 'تم إعادة ضبط سجل التذكيرات' });
        setData(prev => prev.map(r => r.id === id ? { ...r, remindersSentList: [], remindersSent: '', nextReminderStage: 'd30' } : r));
      }
    } catch {
      addToast({ type: 'error', message: 'فشل إعادة الضبط' });
    } finally {
      setResetId(null);
    }
  };

  // ── Patch date ─────────────────────────────────────────────────────────────
  const openEdit = (row: ReminderProvider) => {
    setEditDrawer(row);
    setEditDate(row.subscriptionEndsAt ? row.subscriptionEndsAt.split('T')[0]! : '');
    setEditCycle((row.billingCycle as 'monthly' | 'yearly') ?? 'monthly');
  };

  const saveEdit = async () => {
    if (!editDrawer) return;
    setPatchingId(editDrawer.id);
    try {
      const res = await fetch(`/api/reminders/${editDrawer.id}`, {
        method: 'PATCH',
        headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionEndsAt: editDate, billingCycle: editCycle }),
      });
      const json = await res.json();
      if (json.success) {
        addToast({ type: 'success', message: 'تم تحديث تاريخ انتهاء الاشتراك' });
        setEditDrawer(null);
        await fetchReminders();
      } else {
        addToast({ type: 'error', message: 'فشل التحديث' });
      }
    } catch {
      addToast({ type: 'error', message: 'خطأ في الاتصال' });
    } finally {
      setPatchingId(null);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = data.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.nameAr.includes(q) || r.email.toLowerCase().includes(q);
    if (!matchQ) return false;
    switch (filter) {
      case 'expiring': return r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 30;
      case 'no-date':  return r.subscriptionEndsAt === null;
      case 'expired':  return r.daysLeft !== null && r.daysLeft < 0;
      default: return true;
    }
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total:    data.length,
    expiring: data.filter(r => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 30).length,
    expired:  data.filter(r => r.daysLeft !== null && r.daysLeft < 0).length,
    noDate:   data.filter(r => r.subscriptionEndsAt === null).length,
  };

  return (
    <div className="space-y-6 pb-8" dir="rtl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            تذكيرات تجديد الاشتراك
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            تُرسل تلقائياً قبل 30، 7، 3، 1 يوم من الانتهاء — يومياً الساعة 9 صباحاً
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchReminders} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700/60 border border-slate-600/40 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <button onClick={runJob} disabled={running}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold transition-all disabled:opacity-60 shadow-lg shadow-amber-500/20">
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {running ? 'جاري الإرسال...' : 'تشغيل التذكيرات الآن'}
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المزودين', val: stats.total,    icon: Bell,          color: 'text-slate-300', bg: 'bg-slate-700/40 border-slate-600/30' },
          { label: 'ينتهي خلال 30 يوم', val: stats.expiring, icon: Clock,          color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'منتهٍ', val: stats.expired,  icon: XCircle,       color: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'بدون تاريخ', val: stats.noDate,   icon: Info,          color: 'text-slate-400', bg: 'bg-slate-700/30 border-slate-600/20' },
        ].map(({ label, val, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <div className={`text-2xl font-black mb-1 ${color}`}>{val}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Icon className={`w-3 h-3 ${color}`} /> {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── How it works ── */}
      <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 p-4">
        <p className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-sky-400" /> آلية عمل نظام التذكيرات
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { stage: 'd30', desc: 'تذكير ودي مبكر' },
            { stage: 'd7',  desc: 'تنبيه أسبوع واحد' },
            { stage: 'd3',  desc: 'عاجل — 3 أيام' },
            { stage: 'd1',  desc: 'آخر فرصة — غداً' },
            { stage: 'd0',  desc: 'يوم الانتهاء' },
          ].map(({ stage, desc }) => {
            const s = stage as Stage;
            const cfg = STAGE_LABEL[s];
            return (
              <div key={stage} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold ${cfg.bg} ${cfg.color}`}>
                <Mail className="w-3 h-3" />
                {cfg.ar} — {desc}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو البريد..."
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pr-9 pl-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all',      label: 'الكل' },
            { key: 'expiring', label: 'ينتهي قريباً' },
            { key: 'expired',  label: 'منتهٍ' },
            { key: 'no-date',  label: 'بدون تاريخ' },
          ].map(({ key, label }) => (
            <button key={key}
              onClick={() => setFilter(key as any)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                filter === key
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:text-slate-300'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">جاري التحميل...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">لا توجد نتائج</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/40 bg-slate-900/30">
                  <th className="text-right text-[11px] font-semibold text-slate-400 py-3 px-4">الصالون</th>
                  <th className="text-right text-[11px] font-semibold text-slate-400 py-3 px-4">الباقة</th>
                  <th className="text-right text-[11px] font-semibold text-slate-400 py-3 px-4">تاريخ الانتهاء</th>
                  <th className="text-right text-[11px] font-semibold text-slate-400 py-3 px-4">المتبقي</th>
                  <th className="text-right text-[11px] font-semibold text-slate-400 py-3 px-4">التذكيرات المرسلة</th>
                  <th className="text-right text-[11px] font-semibold text-slate-400 py-3 px-4">التالي</th>
                  <th className="text-right text-[11px] font-semibold text-slate-400 py-3 px-4">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const { color, icon, label } = urgencyFromDays(row.daysLeft);
                  return (
                    <tr key={row.id}
                      className={`border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors ${
                        i % 2 === 0 ? 'bg-slate-800/10' : ''
                      }`}>

                      {/* Salon */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200 text-sm">{row.nameAr}</div>
                        <div className="text-[11px] text-slate-500">{row.email}</div>
                      </td>

                      {/* Tier */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          row.subscriptionTier === 'enterprise'
                            ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                            : row.subscriptionTier === 'pro'
                              ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                              : 'bg-slate-600/30 text-slate-400 border-slate-600/30'
                        }`}>
                          {TIER_LABEL[row.subscriptionTier] ?? row.subscriptionTier}
                        </span>
                        {row.billingCycle && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {row.billingCycle === 'yearly' ? 'سنوي' : 'شهري'}
                          </div>
                        )}
                      </td>

                      {/* End date */}
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-300">{formatDate(row.subscriptionEndsAt)}</div>
                        {!row.subscriptionEndsAt && (
                          <div className="text-[11px] text-amber-500">غير محدد</div>
                        )}
                      </td>

                      {/* Days left */}
                      <td className="py-3 px-4">
                        <div className={`flex items-center gap-1.5 font-bold text-sm ${color}`}>
                          {icon} {label}
                        </div>
                      </td>

                      {/* Reminders sent */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {STAGES.map(s => {
                            const sent = row.remindersSentList.includes(s);
                            return (
                              <span key={s} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                sent
                                  ? `${STAGE_LABEL[s].bg} ${STAGE_LABEL[s].color}`
                                  : 'bg-slate-800/40 border-slate-700/30 text-slate-600'
                              }`}>
                                {STAGE_LABEL[s].ar}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Next stage */}
                      <td className="py-3 px-4">
                        {row.nextReminderStage ? (
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            STAGE_LABEL[row.nextReminderStage as Stage]?.bg ?? 'bg-slate-700/30 border-slate-600/30 text-slate-400'
                          } ${STAGE_LABEL[row.nextReminderStage as Stage]?.color ?? ''}`}>
                            {STAGE_LABEL[row.nextReminderStage as Stage]?.ar ?? row.nextReminderStage}
                          </span>
                        ) : (
                          <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> اكتمل
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {/* Edit date */}
                          <button onClick={() => openEdit(row)}
                            title="ضبط تاريخ الانتهاء"
                            className="p-1.5 rounded-lg bg-slate-700/40 border border-slate-600/40 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all">
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                          {/* Reset reminders */}
                          <button onClick={() => resetReminders(row.id)} disabled={resetId === row.id}
                            title="إعادة ضبط سجل التذكيرات"
                            className="p-1.5 rounded-lg bg-slate-700/40 border border-slate-600/40 text-slate-400 hover:text-sky-400 hover:border-sky-500/30 hover:bg-sky-500/10 transition-all disabled:opacity-50">
                            {resetId === row.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <RotateCcw className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Date Drawer ── */}
      {editDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditDrawer(null)} />
          <div className="relative bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-100">ضبط تاريخ انتهاء الاشتراك</h2>
              <p className="text-xs text-slate-400 mt-1">{editDrawer.nameAr} · {editDrawer.email}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">تاريخ الانتهاء</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">دورة الفوترة</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['monthly', 'yearly'] as const).map(c => (
                    <button key={c}
                      onClick={() => setEditCycle(c)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        editCycle === c
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                          : 'bg-slate-800 border-slate-700/40 text-slate-400 hover:text-slate-300'
                      }`}>
                      {c === 'monthly' ? 'شهري' : 'سنوي'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ⚠️ تغيير التاريخ سيُعيد ضبط سجل التذكيرات تلقائياً لهذا المزود،
                  وستبدأ دورة إرسال جديدة من أول تذكير.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditDrawer(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 border border-slate-700/40 text-slate-400 hover:text-slate-300 transition-all">
                إلغاء
              </button>
              <button onClick={saveEdit} disabled={!editDate || patchingId === editDrawer.id}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {patchingId === editDrawer.id && <Loader2 className="w-4 h-4 animate-spin" />}
                حفظ التاريخ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
