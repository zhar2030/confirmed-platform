/**
 * AdminSecurity — Audit logs and security center (Platform Owner only).
 * Fetches real audit logs from /api/admin/audit-logs.
 */
import { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldAlert, Activity, Eye, Download, RefreshCw, AlertTriangle, CheckCircle, Filter } from 'lucide-react';
import type { AuditLogEntry, Toast } from './adminTypes';
import { getAdminHeaders } from '../../lib/adminAuth';
import * as XLSX from 'xlsx';

interface Props { isAr: boolean; addToast: (t: Omit<Toast, 'id'>) => void; }

const SEV_CFG = {
  info:     { ar: 'معلومة', en: 'Info',     color: 'text-blue-600 bg-blue-100 border-blue-200' },
  warning:  { ar: 'تنبيه',  en: 'Warning',  color: 'text-amber-600 bg-amber-100 border-amber-200' },
  critical: { ar: 'حرج',    en: 'Critical', color: 'text-red-600 bg-red-100 border-red-200' },
};

// Map raw DB action strings to a cleaner display format
function mapLogEntry(raw: any): AuditLogEntry {
  return {
    id:         String(raw.id),
    timestamp:  raw.created_at,
    actor:      raw.actor_id ? String(raw.actor_id) : (raw.actor_type ?? 'system'),
    actorRole:  raw.actor_role ?? 'unknown',
    action:     raw.action ?? '',
    target:     raw.resource_id ? String(raw.resource_id) : (raw.resource_type ?? ''),
    targetType: (raw.resource_type ?? 'system') as AuditLogEntry['targetType'],
    severity:   raw.action?.includes('delete') || raw.action?.includes('suspend') ? 'critical'
                : raw.action?.includes('fail') || raw.action?.includes('warn') ? 'warning'
                : 'info',
    ip:         raw.ip_address ?? '—',
    result:     'success',
  };
}

export default function AdminSecurity({ isAr, addToast }: Props) {
  const [logs, setLogs]         = useState<AuditLogEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sevFilter, setSevFilter] = useState<'all' | AuditLogEntry['severity']>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all');
  const [search, setSearch]     = useState('');

  const loadLogs = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/audit-logs?limit=200', { headers: getAdminHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.logs) setLogs(d.logs.map(mapLogEntry));
        else addToast({ type: 'info', message: isAr ? 'لا توجد سجلات تدقيق بعد' : 'No audit logs yet' });
      })
      .catch(() => addToast({ type: 'error', message: isAr ? 'فشل تحميل سجلات التدقيق' : 'Failed to load audit logs' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = logs.filter(l => {
    if (sevFilter !== 'all' && l.severity !== sevFilter) return false;
    if (typeFilter !== 'all' && l.targetType !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.action.toLowerCase().includes(q) || l.actor.toLowerCase().includes(q) || l.target.toLowerCase().includes(q);
    }
    return true;
  });

  const criticalCount = logs.filter(l => l.severity === 'critical').length;
  const warningCount  = logs.filter(l => l.severity === 'warning').length;

  const exportAudit = () => {
    const data = filtered.map(l => ({
      [isAr ? 'الوقت' : 'Timestamp']: new Date(l.timestamp).toLocaleString(isAr ? 'ar-SA' : 'en-US'),
      [isAr ? 'المنفّذ' : 'Actor']:    l.actor,
      [isAr ? 'الدور' : 'Role']:       l.actorRole,
      [isAr ? 'الإجراء' : 'Action']:   l.action,
      [isAr ? 'الهدف' : 'Target']:     l.target,
      [isAr ? 'الخطورة' : 'Severity']: l.severity,
      [isAr ? 'IP' : 'IP']:            l.ip,
      [isAr ? 'النتيجة' : 'Result']:   l.result,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
    XLSX.writeFile(wb, `audit-logs-${new Date().toISOString().split('T')[0]}.xlsx`);
    addToast({ type: 'success', message: isAr ? 'تم تصدير السجلات' : 'Logs exported' });
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { l: isAr ? 'إجمالي الأحداث' : 'Total Events',    v: logs.length,    c: '#3b82f6', icon: Activity },
          { l: isAr ? 'تنبيهات' : 'Warnings',                v: warningCount,   c: '#f59e0b', icon: AlertTriangle },
          { l: isAr ? 'أحداث حرجة' : 'Critical Events',      v: criticalCount,  c: '#ef4444', icon: ShieldAlert },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.c + '15' }}>
                  <Icon className="w-4 h-4" style={{ color: k.c }} />
                </div>
              </div>
              <p className="text-2xl font-black font-mono" style={{ color: k.c }}>{k.v}</p>
              <p className="text-[10px] text-slate-500 font-bold mt-1">{k.l}</p>
            </div>
          );
        })}
      </div>

      {/* Security status */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${criticalCount === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        {criticalCount === 0
          ? <><CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /><p className="text-sm font-bold text-slate-900">{isAr ? 'لا توجد تهديدات أمنية نشطة' : 'No active security threats'}</p></>
          : <><ShieldAlert className="w-5 h-5 text-red-600 shrink-0" /><p className="text-sm font-bold text-slate-900">{isAr ? `يوجد ${criticalCount} حدث حرج يتطلب مراجعة` : `${criticalCount} critical events require review`}</p></>
        }
      </div>

      {/* Filters + controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isAr ? 'بحث في السجلات...' : 'Search logs...'}
            className="ps-8 pe-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#FF5A5F] w-44" />
          <Filter className="absolute top-1/2 -translate-y-1/2 start-2.5 w-3 h-3 text-slate-400" />
        </div>

        {/* Severity filter */}
        <div className="flex gap-1">
          {(['all', 'info', 'warning', 'critical'] as const).map(s => (
            <button key={s} onClick={() => setSevFilter(s)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-xl cursor-pointer border transition-all ${sevFilter === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
              {s === 'all' ? (isAr ? 'الكل' : 'All') : s === 'info' ? (isAr ? 'معلومة' : 'Info') : s === 'warning' ? (isAr ? 'تنبيه' : 'Warning') : (isAr ? 'حرج' : 'Critical')}
            </button>
          ))}
        </div>

        <div className="flex-1" />
        <button onClick={loadLogs} className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-xl cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={exportAudit}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer hover:border-slate-300">
          <Download className="w-3.5 h-3.5" />{isAr ? 'تصدير Excel' : 'Export Excel'}
        </button>
      </div>

      {/* Audit log table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />{isAr ? 'جاري تحميل السجلات...' : 'Loading logs...'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-400">{isAr ? 'لا توجد سجلات مطابقة' : 'No matching logs'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4 text-start">{isAr ? 'الوقت' : 'Timestamp'}</th>
                  <th className="p-4 text-start">{isAr ? 'المنفّذ' : 'Actor'}</th>
                  <th className="p-4 text-start">{isAr ? 'الإجراء' : 'Action'}</th>
                  <th className="p-4 text-start">{isAr ? 'المورد' : 'Resource'}</th>
                  <th className="p-4 text-center">{isAr ? 'الخطورة' : 'Severity'}</th>
                  <th className="p-4 text-center">{isAr ? 'IP' : 'IP'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.slice(0, 100).map(log => {
                  const sev = SEV_CFG[log.severity] || SEV_CFG.info;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-slate-400 font-mono whitespace-nowrap text-[9px]">
                        {new Date(log.timestamp).toLocaleString(isAr ? 'ar-SA' : 'en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center shrink-0">
                            <Eye className="w-3 h-3 text-[#FF5A5F]" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-[10px]">{log.actor}</p>
                            <p className="text-[8px] text-slate-400">{log.actorRole}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-700 font-medium text-[10px] max-w-[180px] truncate">{log.action}</td>
                      <td className="p-3 text-slate-500 text-[10px] max-w-[120px] truncate">{log.target}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${sev.color}`}>
                          {isAr ? sev.ar : sev.en}
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-400 font-mono text-[9px]">{log.ip}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <div className="px-4 py-3 text-center text-[10px] text-slate-400 border-t border-slate-100">
                {isAr ? `يُعرض أول 100 من ${filtered.length} سجل` : `Showing first 100 of ${filtered.length} logs`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
