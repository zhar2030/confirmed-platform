/**
 * AdminApprovals — Approval Workflow UI (for managers/owners inside ProviderDashboard)
 * ───────────────────────────────────────────────────────────────────────────────────────
 * Shows pending approval requests, allows approve/reject with notes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { getUnifiedHeaders } from '../lib/unifiedAuth';

const API_BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');

const ACTION_LABELS: Record<string, [string, string]> = {
  price_change:   ['تغيير سعر الحجز',     'Price Change'],
  large_discount: ['خصم كبير',             'Large Discount'],
  booking_delete: ['حذف حجز',              'Delete Booking'],
  refund:         ['استرجاع مبلغ',         'Refund'],
  client_delete:  ['حذف بيانات عميل',      'Delete Client'],
  invoice_delete: ['حذف فاتورة',           'Delete Invoice'],
};

interface Approval {
  id:            number;
  requesterName: string;
  actionType:    string;
  resourceType:  string;
  resourceId:    number;
  payload:       Record<string, unknown>;
  status:        string;
  requestedAt:   string;
  expiresAt:     string;
}

interface Stats {
  pending:       number;
  approved_today: number;
  rejected_today: number;
  expired:       number;
}

export default function AdminApprovals() {
  const { isAr } = useLanguage();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [status, setStatus]       = useState('pending');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [noteMap, setNoteMap]     = useState<Record<number, string>>({});
  const [processingId, setProcessingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const h = { ...getUnifiedHeaders(), 'Content-Type': 'application/json' };
    const [appRes, statsRes] = await Promise.all([
      fetch(`${API_BASE}/api/approvals?status=${status}`, { headers: h }),
      fetch(`${API_BASE}/api/approvals/stats`, { headers: h }),
    ]);
    const [appData, statsData] = await Promise.all([appRes.json(), statsRes.json()]);
    setApprovals(appData.approvals ?? []);
    setStats(statsData.stats ?? null);
    setLoading(false);
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: number, action: 'approve' | 'reject') => {
    setProcessingId(id);
    const h = { ...getUnifiedHeaders(), 'Content-Type': 'application/json' };
    await fetch(`${API_BASE}/api/approvals/${id}/${action}`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ note: noteMap[id] ?? '' }),
    });
    setProcessingId(null);
    setExpandedId(null);
    load();
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      pending:  { label: isAr ? 'معلّق' : 'Pending',  color: '#D97706', bg: '#FEF3C7' },
      approved: { label: isAr ? 'موافق' : 'Approved', color: '#059669', bg: '#D1FAE5' },
      rejected: { label: isAr ? 'مرفوض' : 'Rejected', color: '#DC2626', bg: '#FEE2E2' },
      expired:  { label: isAr ? 'منتهي' : 'Expired',  color: '#6B7280', bg: '#F3F4F6' },
    };
    const { label, color, bg } = map[s] ?? { label: s, color: '#6B7280', bg: '#F3F4F6' };
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
        style={{ background: bg, color }}>{label}</span>
    );
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-[#0F1923]">{isAr ? 'طلبات الموافقة' : 'Approval Requests'}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{isAr ? 'راجع وأقرّ أو ارفض طلبات الموظفين' : 'Review and approve or reject staff requests'}</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: '#F3F4F6', color: '#374151' }}>
          <RefreshCw className="w-4 h-4" />
          {isAr ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: isAr ? 'معلّقة' : 'Pending',        value: stats.pending,        color: '#D97706', bg: '#FEF3C7' },
            { label: isAr ? 'موافق عليها اليوم' : 'Approved Today', value: stats.approved_today, color: '#059669', bg: '#D1FAE5' },
            { label: isAr ? 'مرفوضة اليوم' : 'Rejected Today',  value: stats.rejected_today, color: '#DC2626', bg: '#FEE2E2' },
            { label: isAr ? 'منتهية الصلاحية' : 'Expired',      value: stats.expired,       color: '#6B7280', bg: '#F3F4F6' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="p-4 rounded-2xl text-center"
              style={{ background: bg }}>
              <p className="text-2xl font-black" style={{ color }}>{value}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'pending',  label: isAr ? 'معلّقة' : 'Pending' },
          { key: 'approved', label: isAr ? 'موافق عليها' : 'Approved' },
          { key: 'rejected', label: isAr ? 'مرفوضة' : 'Rejected' },
          { key: 'all',      label: isAr ? 'الكل' : 'All' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setStatus(key)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={status === key
              ? { background: '#0F1923', color: '#C9A84C' }
              : { background: '#F3F4F6', color: '#6B7280' }}>
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : approvals.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <CheckCircle className="w-12 h-12 text-gray-200 mx-auto" />
          <p className="text-gray-500 font-medium">{isAr ? 'لا توجد طلبات في هذا القسم' : 'No requests in this section'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map(a => {
            const [arLabel, enLabel] = ACTION_LABELS[a.actionType] ?? [a.actionType, a.actionType];
            const isExpanded = expandedId === a.id;
            const isPending = a.status === 'pending';

            return (
              <div key={a.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Header row */}
                <button onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  className="w-full flex items-center justify-between p-4 gap-3 text-start hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: '#FEF3C7' }}>
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{isAr ? arLabel : enLabel}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.requesterName} · {new Date(a.requestedAt).toLocaleString(isAr ? 'ar-SA' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(a.status)}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-4">
                    {/* Payload */}
                    {a.payload && Object.keys(a.payload).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">{isAr ? 'التفاصيل المطلوبة' : 'Requested Changes'}</p>
                        <div className="bg-gray-50 rounded-xl overflow-hidden">
                          {Object.entries(a.payload).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between px-3 py-2 border-b border-gray-100 last:border-0">
                              <span className="text-xs text-gray-500 font-medium">{k}</span>
                              <span className="text-xs text-gray-900 font-semibold">{JSON.stringify(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Note + actions (only if pending) */}
                    {isPending && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            {isAr ? 'ملاحظة (اختياري)' : 'Note (optional)'}
                          </label>
                          <textarea
                            rows={2}
                            value={noteMap[a.id] ?? ''}
                            onChange={e => setNoteMap(prev => ({ ...prev, [a.id]: e.target.value }))}
                            placeholder={isAr ? 'سبب الموافقة أو الرفض…' : 'Reason for approval or rejection…'}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs resize-none focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/20"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => act(a.id, 'approve')}
                            disabled={processingId === a.id}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                            style={{ background: '#D1FAE5', color: '#059669' }}>
                            <CheckCircle className="w-4 h-4" />
                            {isAr ? 'موافقة' : 'Approve'}
                          </button>
                          <button onClick={() => act(a.id, 'reject')}
                            disabled={processingId === a.id}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                            style={{ background: '#FEE2E2', color: '#DC2626' }}>
                            <XCircle className="w-4 h-4" />
                            {isAr ? 'رفض' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Expiry info */}
                    {isPending && (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        {isAr ? 'ينتهي: ' : 'Expires: '}
                        {new Date(a.expiresAt).toLocaleString(isAr ? 'ar-SA' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
