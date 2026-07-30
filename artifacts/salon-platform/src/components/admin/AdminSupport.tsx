import { useState } from 'react';
import { MessageSquare, Clock, CheckCircle, AlertCircle, Send, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import type { SupportTicket, Toast } from './adminTypes';
import { MOCK_TICKETS } from './adminData';

interface Props { isAr: boolean; addToast: (t: Omit<Toast, 'id'>) => void; }

const PRIORITY_CFG = {
  critical: { ar: 'حرج',   en: 'Critical', color: 'text-red-400 bg-red-500/15 border-red-500/30' },
  high:     { ar: 'عالي',  en: 'High',     color: 'text-orange-400 bg-orange-500/15 border-orange-500/30' },
  medium:   { ar: 'متوسط', en: 'Medium',   color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
  low:      { ar: 'منخفض', en: 'Low',      color: 'text-slate-400 bg-slate-500/15 border-slate-500/30' },
};

const STATUS_CFG = {
  open:          { ar: 'مفتوحة',       en: 'Open',           color: 'text-red-400 bg-red-500/10' },
  in_progress:   { ar: 'قيد المعالجة', en: 'In Progress',    color: 'text-blue-400 bg-blue-500/10' },
  pending_reply: { ar: 'بانتظار الرد', en: 'Pending Reply',  color: 'text-amber-400 bg-amber-500/10' },
  resolved:      { ar: 'محلولة',       en: 'Resolved',       color: 'text-emerald-400 bg-emerald-500/10' },
  closed:        { ar: 'مغلقة',        en: 'Closed',         color: 'text-slate-400 bg-slate-500/10' },
};

const CAT_CFG: Record<string, { ar: string; en: string }> = {
  billing:        { ar: 'فوترة',      en: 'Billing' },
  technical:      { ar: 'تقني',       en: 'Technical' },
  feature_request:{ ar: 'طلب ميزة',   en: 'Feature Request' },
  account:        { ar: 'حساب',       en: 'Account' },
  general:        { ar: 'عام',        en: 'General' },
};

export default function AdminSupport({ isAr, addToast }: Props) {
  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_TICKETS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SupportTicket['status']>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | SupportTicket['priority']>('all');

  const filtered = tickets.filter(t => {
    const matchS = statusFilter === 'all' || t.status === statusFilter;
    const matchP = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchS && matchP;
  });

  const sendReply = (id: string) => {
    if (!reply.trim()) return;
    setTickets(prev => prev.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        status: t.status === 'open' ? 'in_progress' : t.status,
        updatedAt: new Date().toISOString(),
        messages: [...t.messages, { id: 'm_' + Date.now(), sender: isAr ? 'فريق الدعم — CONFIRMED' : 'Support Team — CONFIRMED', senderType: 'admin', content: reply, timestamp: new Date().toISOString() }]
      };
    }));
    addToast({ type: 'success', message: isAr ? 'تم إرسال الرد بنجاح' : 'Reply sent successfully' });
    setReply('');
  };

  const changeStatus = (id: string, status: SupportTicket['status']) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t));
    addToast({ type: 'info', message: isAr ? `تم تحديث حالة التذكرة إلى "${STATUS_CFG[status].ar}"` : `Ticket status updated to "${STATUS_CFG[status].en}"` });
  };

  const open     = tickets.filter(t => t.status === 'open').length;
  const progress = tickets.filter(t => t.status === 'in_progress').length;
  const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  const critical = tickets.filter(t => t.priority === 'critical' && t.status !== 'resolved' && t.status !== 'closed').length;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: isAr ? 'تذاكر مفتوحة' : 'Open Tickets',    v: open,     c: '#ef4444' },
          { l: isAr ? 'قيد المعالجة' : 'In Progress',      v: progress, c: '#3b82f6' },
          { l: isAr ? 'تم الحل' : 'Resolved',              v: resolved, c: '#10b981' },
          { l: isAr ? 'حرجة تحتاج تدخل' : 'Critical Open', v: critical, c: critical > 0 ? '#FF5A5F' : '#10b981' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">{k.l}</p>
            <p className="text-2xl font-black font-mono" style={{ color: k.c }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-3 py-1.5">
          <Filter className="w-3 h-3 text-slate-500" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="bg-transparent text-[10px] text-slate-400 focus:outline-none cursor-pointer">
            <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{isAr ? v.ar : v.en}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-3 py-1.5">
          <AlertCircle className="w-3 h-3 text-slate-500" />
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)} className="bg-transparent text-[10px] text-slate-400 focus:outline-none cursor-pointer">
            <option value="all">{isAr ? 'كل الأولويات' : 'All Priorities'}</option>
            {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{isAr ? v.ar : v.en}</option>)}
          </select>
        </div>
      </div>

      {/* Ticket list */}
      <div className="space-y-3">
        {filtered.map(t => {
          const pri = PRIORITY_CFG[t.priority];
          const sta = STATUS_CFG[t.status];
          const isExpanded = expanded === t.id;
          return (
            <div key={t.id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${t.priority === 'critical' && (t.status === 'open' || t.status === 'in_progress') ? 'border-red-500/30' : 'border-slate-200'}`}>
              {/* Header */}
              <div className="p-4 flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : t.id)}>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${pri.color}`}>{isAr ? pri.ar : pri.en}</span>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${sta.color}`}>{isAr ? sta.ar : sta.en}</span>
                    <span className="text-[9px] text-slate-600 font-mono">{t.id}</span>
                    {t.sla > 0 && t.status !== 'resolved' && t.status !== 'closed' && (
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${t.sla <= 4 ? 'bg-red-500/15 text-red-400' : 'bg-slate-500/10 text-slate-500'}`}>
                        <Clock className="w-2 h-2 inline me-0.5" />{t.sla}h SLA
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-900 truncate">{t.subject}</p>
                  <p className="text-[10px] text-slate-500">{t.salonName} · {CAT_CFG[t.category]?.[isAr ? 'ar' : 'en']}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-end">
                    <p className="text-[9px] text-slate-600">{new Date(t.updatedAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
                    {t.assignedTo && <p className="text-[9px] text-slate-500 mt-0.5">{t.assignedTo}</p>}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-slate-200 p-4 space-y-4">
                  {/* Messages */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {t.messages.map(m => (
                      <div key={m.id} className={`flex ${m.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs space-y-1 ${m.senderType === 'admin' ? 'bg-[#FF5A5F]/20 text-slate-200' : 'bg-slate-50 text-slate-300'}`}>
                          <p className={`text-[9px] font-bold ${m.senderType === 'admin' ? 'text-[#FF5A5F]' : 'text-slate-500'}`}>{m.sender}</p>
                          <p className="leading-relaxed">{m.content}</p>
                          <p className="text-[8px] opacity-50">{new Date(m.timestamp).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply box */}
                  {t.status !== 'closed' && (
                    <div className="flex gap-2">
                      <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder={isAr ? 'اكتب ردك هنا...' : 'Type your reply...'} rows={2} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#FF5A5F] resize-none" />
                      <button onClick={() => sendReply(t.id)} className="px-4 py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white rounded-xl cursor-pointer transition-all">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Status actions */}
                  <div className="flex flex-wrap gap-2">
                    {t.status === 'open' && (
                      <button onClick={() => changeStatus(t.id, 'in_progress')} className="px-3 py-1.5 text-[10px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg cursor-pointer transition-all">
                        {isAr ? 'بدء المعالجة' : 'Start Processing'}
                      </button>
                    )}
                    {(t.status === 'open' || t.status === 'in_progress' || t.status === 'pending_reply') && (
                      <button onClick={() => changeStatus(t.id, 'resolved')} className="px-3 py-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg cursor-pointer transition-all flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />{isAr ? 'تعليم محلولة' : 'Mark Resolved'}
                      </button>
                    )}
                    {t.status === 'resolved' && (
                      <button onClick={() => changeStatus(t.id, 'closed')} className="px-3 py-1.5 text-[10px] font-bold text-slate-400 bg-slate-500/10 hover:bg-slate-500/20 rounded-lg cursor-pointer transition-all">
                        {isAr ? 'إغلاق' : 'Close Ticket'}
                      </button>
                    )}
                    <a href={`mailto:${t.salonEmail}`} className="px-3 py-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg cursor-pointer transition-all ms-auto">
                      {isAr ? 'مراسلة مباشرة' : 'Direct Email'}
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-600">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{isAr ? 'لا تذاكر مطابقة' : 'No matching tickets'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
