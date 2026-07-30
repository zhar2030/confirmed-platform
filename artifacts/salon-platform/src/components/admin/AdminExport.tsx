/**
 * AdminExport — Data export center (Platform Owner only).
 * Export salons, invoices, bookings, subscriptions as Excel/CSV.
 */
import { useState } from 'react';
import { Download, FileSpreadsheet, RefreshCw, CheckCircle, Database, Users, CreditCard, Calendar } from 'lucide-react';
import type { Toast } from './adminTypes';
import { getAdminHeaders } from '../../lib/adminAuth';
import * as XLSX from 'xlsx';

interface Props { isAr: boolean; addToast: (t: Omit<Toast, 'id'>) => void; }

interface ExportJob {
  type: string;
  label_ar: string;
  label_en: string;
  icon: any;
  color: string;
  fields_ar: string[];
  fields_en: string[];
}

const EXPORTS: ExportJob[] = [
  {
    type: 'salons', icon: Users, color: '#FF5A5F',
    label_ar: 'بيانات الصالونات', label_en: 'Salons Data',
    fields_ar: ['الاسم (عربي)', 'الاسم (إنجليزي)', 'البريد', 'الهاتف', 'المدينة', 'الحالة', 'الباقة', 'حالة الاشتراك', 'MRR', 'تاريخ التسجيل'],
    fields_en: ['Name AR', 'Name EN', 'Email', 'Phone', 'City', 'Status', 'Tier', 'Sub Status', 'MRR', 'Joined'],
  },
  {
    type: 'invoices', icon: FileSpreadsheet, color: '#10b981',
    label_ar: 'الفواتير والمبيعات', label_en: 'Invoices & Sales',
    fields_ar: ['اسم العميل', 'المبلغ الكلي', 'طريقة الدفع', 'التاريخ', 'الصالون'],
    fields_en: ['Client Name', 'Total', 'Payment Method', 'Date', 'Salon'],
  },
  {
    type: 'bookings', icon: Calendar, color: '#3b82f6',
    label_ar: 'الحجوزات', label_en: 'Bookings',
    fields_ar: ['اسم العميل', 'الخدمة', 'التاريخ', 'الوقت', 'الحالة', 'الصالون'],
    fields_en: ['Client Name', 'Service', 'Date', 'Time', 'Status', 'Salon'],
  },
  {
    type: 'subscriptions', icon: CreditCard, color: '#a855f7',
    label_ar: 'الاشتراكات', label_en: 'Subscriptions',
    fields_ar: ['الاسم', 'البريد', 'الباقة', 'الحالة', 'MRR', 'تاريخ البداية', 'تاريخ الانتهاء'],
    fields_en: ['Name', 'Email', 'Plan', 'Status', 'MRR', 'Start Date', 'End Date'],
  },
];

type Format = 'xlsx' | 'csv';

export default function AdminExport({ isAr, addToast }: Props) {
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');
  const [format, setFormat]     = useState<Format>('xlsx');
  const [loading, setLoading]   = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<Record<string, string>>({});

  const doExport = async (job: ExportJob) => {
    setLoading(job.type);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to)   params.set('to', to);

      const res  = await fetch(`/api/admin/export/${job.type}?${params}`, { headers: getAdminHeaders() });
      const data = await res.json();

      if (!data.rows || data.rows.length === 0) {
        addToast({ type: 'info', message: isAr ? 'لا توجد بيانات في النطاق المحدد' : 'No data in selected range' });
        setLoading(null);
        return;
      }

      const filename = `confirmed-${job.type}-${new Date().toISOString().split('T')[0]}`;

      if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(data.rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, job.type);
        XLSX.writeFile(wb, filename + '.xlsx');
      } else {
        const csv  = [
          Object.keys(data.rows[0]).join(','),
          ...data.rows.map((r: any) => Object.values(r).map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = filename + '.csv'; a.click();
        URL.revokeObjectURL(url);
      }

      const now = new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US');
      setLastExport(prev => ({ ...prev, [job.type]: now }));
      addToast({ type: 'success', message: isAr ? `تم تصدير ${data.count} سجل` : `Exported ${data.count} records` });
    } catch {
      addToast({ type: 'error', message: isAr ? 'فشل التصدير' : 'Export failed' });
    }
    setLoading(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FF5A5F]/10 flex items-center justify-center">
          <Database className="w-5 h-5 text-[#FF5A5F]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{isAr ? 'مركز تصدير البيانات' : 'Data Export Center'}</h3>
          <p className="text-[10px] text-slate-500">{isAr ? 'تصدير بيانات المنصة بصيغ Excel وCSV' : 'Export platform data as Excel or CSV'}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <h4 className="text-xs font-bold text-slate-700">{isAr ? 'خيارات التصدير' : 'Export Options'}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] text-slate-500 font-bold mb-1.5">{isAr ? 'من تاريخ (اختياري)' : 'From Date (optional)'}</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FF5A5F]" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 font-bold mb-1.5">{isAr ? 'إلى تاريخ (اختياري)' : 'To Date (optional)'}</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FF5A5F]" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 font-bold mb-1.5">{isAr ? 'صيغة التصدير' : 'Export Format'}</label>
            <div className="flex gap-2">
              {(['xlsx', 'csv'] as Format[]).map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all border ${format === f ? 'bg-[#FF5A5F]/10 border-[#FF5A5F]/30 text-[#FF5A5F]' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORTS.map(job => {
          const Icon = job.icon;
          const isLoading = loading === job.type;
          const last = lastExport[job.type];
          return (
            <div key={job.type} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: job.color + '15' }}>
                    <Icon className="w-5 h-5" style={{ color: job.color }} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{isAr ? job.label_ar : job.label_en}</h4>
                    {last && (
                      <p className="text-[9px] text-emerald-600 flex items-center gap-1 mt-0.5">
                        <CheckCircle className="w-2.5 h-2.5" />{isAr ? 'آخر تصدير:' : 'Last export:'} {last}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">{format}</span>
              </div>

              {/* Fields preview */}
              <div className="flex flex-wrap gap-1">
                {(isAr ? job.fields_ar : job.fields_en).map((f, i) => (
                  <span key={i} className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">{f}</span>
                ))}
              </div>

              <button onClick={() => doExport(job)} disabled={isLoading}
                className={`w-full py-2.5 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2
                  ${isLoading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white border border-slate-200 hover:border-[#FF5A5F]/40 hover:bg-[#FF5A5F]/5 text-slate-700'}`}>
                {isLoading
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />{isAr ? 'جاري التصدير...' : 'Exporting...'}</>
                  : <><Download className="w-3.5 h-3.5" style={{ color: job.color }} />{isAr ? `تصدير ${job.label_ar}` : `Export ${job.label_en}`}</>}
              </button>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <Database className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500">{isAr ? 'البيانات تُصدَّر مباشرة من قاعدة البيانات الفعلية. ملفات Excel تدعم UTF-8 للنصوص العربية.' : 'Data is exported directly from the live database. Excel files support UTF-8 for Arabic text.'}</p>
      </div>
    </div>
  );
}
