/**
 * AdminMonitoring — System health and backup center (Platform Owner only).
 * Real metrics from the server + backup management.
 */
import { useState, useEffect, useCallback } from 'react';
import { Server, Cpu, HardDrive, Wifi, Database, Mail, Download, Play, RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import type { SystemHealth, BackupEntry, Toast } from './adminTypes';
import { getAdminHeaders } from '../../lib/adminAuth';

interface Props { isAr: boolean; addToast: (t: Omit<Toast, 'id'>) => void; }

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function fmtUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function AdminMonitoring({ isAr, addToast }: Props) {
  const [health, setHealth]     = useState<SystemHealth | null>(null);
  const [backups, setBackups]   = useState<BackupEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [backing, setBacking]   = useState(false);
  const [tab, setTab]           = useState<'health' | 'backup'>('health');

  const loadHealth = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/health',  { headers: getAdminHeaders() }).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
      fetch('/api/admin/backups', { headers: getAdminHeaders() }).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
    ]).then(([h, b]) => {
      if (h.status) setHealth(h);
      if (b.backups) setBackups(b.backups);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  const triggerBackup = async () => {
    setBacking(true);
    try {
      const res  = await fetch('/api/admin/backups', { method: 'POST', headers: getAdminHeaders() });
      const data = await res.json();
      addToast({ type: 'success', message: isAr ? `تم إنشاء نسخة احتياطية: ${data.filename}` : `Backup created: ${data.filename}` });
      loadHealth();
    } catch {
      addToast({ type: 'error', message: isAr ? 'فشل إنشاء النسخة الاحتياطية' : 'Backup failed' });
    }
    setBacking(false);
  };

  const Gauge = ({ label, value, max = 100, unit = '%', icon: Icon, warn = 70, crit = 90 }: any) => {
    const pct   = Math.min(100, (value / max) * 100);
    const color = pct >= crit ? '#ef4444' : pct >= warn ? '#f59e0b' : '#10b981';
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Icon className="w-4 h-4 text-slate-400" />
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${pct >= crit ? 'bg-red-100 text-red-600' : pct >= warn ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {pct >= crit ? (isAr ? 'حرج' : 'Critical') : pct >= warn ? (isAr ? 'تنبيه' : 'Warning') : (isAr ? 'طبيعي' : 'Healthy')}
          </span>
        </div>
        <p className="text-3xl font-black font-mono" style={{ color }}>{value}{unit}</p>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: pct + '%', background: color }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { id: 'health', ar: 'صحة النظام', en: 'System Health' },
          { id: 'backup', ar: 'النسخ الاحتياطي', en: 'Backups' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer -mb-px ${tab === t.id ? 'border-[#FF5A5F] text-[#FF5A5F]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {isAr ? t.ar : t.en}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={loadHealth} className="mb-1 p-2 text-slate-400 hover:text-slate-700 cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Health Tab */}
      {tab === 'health' && (
        <div className="space-y-5">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">{isAr ? 'جاري قراءة بيانات السيرفر...' : 'Reading server metrics...'}</div>
          ) : health ? (
            <>
              {/* Overall status banner */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${health.status === 'healthy' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                {health.status === 'healthy'
                  ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                  : <AlertTriangle className="w-5 h-5 text-red-600" />}
                <div>
                  <p className="text-sm font-bold text-slate-900">{health.status === 'healthy' ? (isAr ? 'جميع الأنظمة تعمل بشكل طبيعي' : 'All systems operational') : (isAr ? 'تحذير: مشكلة في النظام' : 'Warning: System issue detected')}</p>
                  <p className="text-[10px] text-slate-500">{isAr ? 'آخر فحص:' : 'Last check:'} {new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US')}</p>
                </div>
              </div>

              {/* Metrics gauges */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Gauge label={isAr ? 'استخدام الذاكرة' : 'Memory Usage'} value={health.memory.percent} icon={Server} />
                <Gauge label={isAr ? 'وقت استجابة DB' : 'DB Response'} value={health.db.responseMs} max={500} unit="ms" icon={Database} warn={100} crit={200} />
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Wifi className="w-4 h-4 text-slate-400" />
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">{isAr ? 'طبيعي' : 'OK'}</span>
                  </div>
                  <p className="text-3xl font-black font-mono text-emerald-600">{fmtUptime(health.uptime)}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{isAr ? 'وقت التشغيل' : 'Uptime'}</p>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <HardDrive className="w-4 h-4 text-slate-400" />
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">{isAr ? 'طبيعي' : 'OK'}</span>
                  </div>
                  <p className="text-lg font-black font-mono text-slate-900">{health.db.totalRows.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{isAr ? 'إجمالي الصفوف في DB' : 'Total DB Rows'}</p>
                  <p className="text-[9px] text-slate-400">{health.db.tables} {isAr ? 'جدول' : 'tables'}</p>
                </div>
              </div>

              {/* Services status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: Database, label: isAr ? 'قاعدة البيانات' : 'Database', status: health.db.status === 'healthy', detail: health.db.responseMs + 'ms' },
                  { icon: Mail,     label: 'Brevo Email',                        status: health.email.brevo,     detail: health.email.brevo ? (isAr ? 'متصل' : 'Connected') : (isAr ? 'مفتاح غير موجود' : 'Key missing') },
                  { icon: Mail,     label: 'Resend Email',                       status: health.email.resend,    detail: health.email.resend ? (isAr ? 'متصل' : 'Connected') : (isAr ? 'مفتاح غير موجود' : 'Key missing') },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border ${s.status ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.status ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                        <Icon className={`w-4 h-4 ${s.status ? 'text-emerald-600' : 'text-amber-600'}`} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{s.label}</p>
                        <p className={`text-[10px] font-bold ${s.status ? 'text-emerald-600' : 'text-amber-600'}`}>{s.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Node info */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-6 text-[10px]">
                {[
                  { l: 'Node.js', v: health.nodeVersion },
                  { l: isAr ? 'البيئة' : 'Environment', v: health.env },
                  { l: isAr ? 'ذاكرة مستخدمة' : 'Heap Used', v: health.memory.usedMB + ' MB / ' + health.memory.totalMB + ' MB' },
                ].map((i, idx) => (
                  <div key={idx}>
                    <p className="text-slate-400 font-bold">{i.l}</p>
                    <p className="text-slate-900 font-mono mt-0.5">{i.v}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-red-400 text-sm">{isAr ? 'تعذّر قراءة بيانات السيرفر' : 'Failed to read server metrics'}</div>
          )}
        </div>
      )}

      {/* Backup Tab */}
      {tab === 'backup' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{isAr ? 'النسخ الاحتياطية' : 'Database Backups'}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{isAr ? 'نسخ احتياطية يدوية لجميع بيانات المنصة' : 'Manual backups of all platform data'}</p>
            </div>
            <button onClick={triggerBackup} disabled={backing}
              className={`flex items-center gap-2 px-4 py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white text-xs font-bold rounded-xl cursor-pointer transition-all ${backing ? 'opacity-70' : ''}`}>
              {backing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {isAr ? (backing ? 'جاري الإنشاء...' : 'إنشاء نسخة احتياطية') : (backing ? 'Creating...' : 'Create Backup')}
            </button>
          </div>

          {backups.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{isAr ? 'لا توجد نسخ احتياطية بعد' : 'No backups yet'}</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-4 text-start">{isAr ? 'اسم الملف' : 'Filename'}</th>
                    <th className="p-4 text-center">{isAr ? 'الحجم' : 'Size'}</th>
                    <th className="p-4 text-center">{isAr ? 'الجداول' : 'Tables'}</th>
                    <th className="p-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="p-4 text-center">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="p-4 text-center">{isAr ? 'تنزيل' : 'Download'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {backups.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono text-slate-600 text-[10px] max-w-xs truncate">{b.filename}</td>
                      <td className="p-4 text-center text-slate-500">{fmtBytes(b.size_bytes)}</td>
                      <td className="p-4 text-center text-slate-500">{b.tables_backed_up}</td>
                      <td className="p-4 text-center"><span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">{b.status}</span></td>
                      <td className="p-4 text-center text-slate-500 flex items-center justify-center gap-1"><Clock className="w-3 h-3" />{new Date(b.created_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</td>
                      <td className="p-4 text-center">
                        <button className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
