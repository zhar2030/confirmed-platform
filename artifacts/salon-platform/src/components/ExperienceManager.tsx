import React, { useState } from 'react';
import { Client, Booking, Staff, Service } from '../types';
import { useLanguage } from '../LanguageContext';
import {
  Star, ThumbsUp, ThumbsDown, MessageSquare, Send, Plus, Trash2,
  TrendingUp, TrendingDown, Users, Clock, CheckCircle, AlertTriangle,
  Heart, Smile, Frown, Meh, ChevronDown, BarChart3, Phone,
  Flag, ShieldAlert, CircleDot, Inbox
} from 'lucide-react';

interface ExperienceManagerProps {
  clients:   Client[];
  bookings:  Booking[];
  staffList: Staff[];
  services:  Service[];
}

interface Review {
  id: string;
  clientName: string;
  clientPhone: string;
  staffId: string;
  serviceId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  date: string;
  status: 'new' | 'replied' | 'resolved';
  reply?: string;
  tag: 'positive' | 'neutral' | 'negative';
}

interface SurveyQuestion {
  id: string;
  textAr: string;
  textEn: string;
  type: 'rating' | 'yesno' | 'text';
}

interface Complaint {
  id: string;
  clientName: string;
  clientPhone: string;
  staffId: string;
  serviceId: string;
  category: 'service_quality' | 'waiting_time' | 'staff_behavior' | 'pricing' | 'cleanliness' | 'other';
  priority: 'high' | 'medium' | 'low';
  description: string;
  date: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolution?: string;
}

const MOCK_COMPLAINTS: Complaint[] = [
  { id: 'c1', clientName: 'منى الحربي',    clientPhone: '0553210987', staffId: 'e1', serviceId: 's1', category: 'service_quality',  priority: 'high',   description: 'لم يكن مستوى الصبغة كما طلبت، اللون مختلف تماماً عما اتفقنا عليه.', date: '2026-07-19', status: 'open' },
  { id: 'c2', clientName: 'أريج السبيعي',  clientPhone: '0556547890', staffId: 'e2', serviceId: 's3', category: 'waiting_time',     priority: 'medium', description: 'انتظرت أكثر من ساعة ونصف قبل أن يُبدأ بخدمتي بدون أي إشعار مسبق.', date: '2026-07-17', status: 'in_progress', resolution: 'تم التواصل مع العميلة والاعتذار، نعمل على تحسين إدارة المواعيد.' },
  { id: 'c3', clientName: 'ابتسام العمري',  clientPhone: '0554321876', staffId: 'e3', serviceId: 's2', category: 'staff_behavior',   priority: 'high',   description: 'تعاملت معي الموظفة بطريقة غير لائقة وغير محترمة أثناء الخدمة.', date: '2026-07-15', status: 'resolved', resolution: 'تم إخطار الموظفة المعنية وإجراء تدريب على خدمة العملاء. تواصلنا مع العميلة بالاعتذار.' },
  { id: 'c4', clientName: 'ريم الزهراني',  clientPhone: '0558901234', staffId: 'e1', serviceId: 's4', category: 'pricing',          priority: 'low',    description: 'السعر المحصّل كان أعلى من المبلغ المتفق عليه عند الحجز.', date: '2026-07-14', status: 'closed', resolution: 'تم استرداد فارق السعر للعميلة وتوضيح سياسة التسعير.' },
  { id: 'c5', clientName: 'نجود القحطاني', clientPhone: '0551237654', staffId: 'e4', serviceId: 's1', category: 'cleanliness',     priority: 'medium', description: 'الأدوات المستخدمة لم تكن نظيفة بما يكفي، وهذا يثير قلقي الصحي.', date: '2026-07-13', status: 'open' },
];

const MOCK_REVIEWS: Review[] = [
  { id: 'r1', clientName: 'نوف العتيبي',   clientPhone: '0551234567', staffId: 'e2', serviceId: 's1', rating: 5, comment: 'تجربة رائعة جداً، الخدمة كانت ممتازة والجو مريح للغاية!', date: '2026-07-18', status: 'new',      tag: 'positive' },
  { id: 'r2', clientName: 'سارة المطيري',  clientPhone: '0559876543', staffId: 'e1', serviceId: 's2', rating: 3, comment: 'الخدمة عادية، كنت أتوقع أفضل. الانتظار كان طويلاً بعض الشيء.', date: '2026-07-17', status: 'replied',  tag: 'neutral',  reply: 'شكراً لك على ملاحظتك القيّمة، سنعمل على تحسين وقت الانتظار.' },
  { id: 'r3', clientName: 'لمى القحطاني',  clientPhone: '0553456789', staffId: 'e3', serviceId: 's3', rating: 2, comment: 'الخدمة لم تكن بالمستوى المطلوب، النتيجة لم تعجبني.', date: '2026-07-16', status: 'new',      tag: 'negative' },
  { id: 'r4', clientName: 'هيا الشهري',   clientPhone: '0554321098', staffId: 'e2', serviceId: 's4', rating: 5, comment: 'أفضل تجربة في الصالون! سأعود بالتأكيد وسأوصي صديقاتي.', date: '2026-07-15', status: 'resolved', tag: 'positive', reply: 'نسعد دائماً بخدمتك، نتطلع لزيارتك القادمة!' },
  { id: 'r5', clientName: 'ريم الدوسري',  clientPhone: '0556789012', staffId: 'e1', serviceId: 's2', rating: 4, comment: 'ممتازة! فقط الأسعار مرتفعة قليلاً مقارنة بالمنافسين.', date: '2026-07-14', status: 'replied',  tag: 'positive', reply: 'نحرص على تقديم أعلى جودة، ونقدر ملاحظتك بشأن الأسعار.' },
];

const DEFAULT_SURVEY: SurveyQuestion[] = [
  { id: 'q1', textAr: 'كيف تقيّمين تجربتك الإجمالية في الصالون؟', textEn: 'How would you rate your overall salon experience?', type: 'rating' },
  { id: 'q2', textAr: 'هل ستوصين صديقاتك بصالوننا؟', textEn: 'Would you recommend our salon to friends?', type: 'yesno' },
  { id: 'q3', textAr: 'ما الذي يمكن تحسينه في خدمتنا؟', textEn: 'What can we improve in our service?', type: 'text' },
  { id: 'q4', textAr: 'هل وجدتِ موعدك بسهولة؟', textEn: 'Did you find booking your appointment easy?', type: 'yesno' },
];

export default function ExperienceManager({ clients, bookings, staffList, services }: ExperienceManagerProps) {
  const { isAr, dir } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'survey' | 'followup' | 'complaints'>('overview');
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
  const [filter, setFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>(DEFAULT_SURVEY);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Complaints state
  const [complaints, setComplaints] = useState<Complaint[]>(MOCK_COMPLAINTS);
  const [complaintFilter, setComplaintFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [showAddComplaint, setShowAddComplaint] = useState(false);
  const [newComplaint, setNewComplaint] = useState({ clientName: '', clientPhone: '', category: 'service_quality' as Complaint['category'], priority: 'medium' as Complaint['priority'], description: '' });

  const filteredComplaints = complaintFilter === 'all' ? complaints : complaints.filter(c => c.status === complaintFilter);

  const handleUpdateComplaintStatus = (id: string, status: Complaint['status'], resolution?: string) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status, ...(resolution ? { resolution } : {}) } : c));
    setResolvingId(null);
    setResolutionText('');
  };

  const handleAddComplaint = () => {
    if (!newComplaint.clientName || !newComplaint.description) return;
    const c: Complaint = {
      id: 'c' + Date.now(),
      clientName:  newComplaint.clientName,
      clientPhone: newComplaint.clientPhone,
      staffId: '',
      serviceId: '',
      category: newComplaint.category,
      priority: newComplaint.priority,
      description: newComplaint.description,
      date: new Date().toISOString().split('T')[0],
      status: 'open',
    };
    setComplaints(prev => [c, ...prev]);
    setNewComplaint({ clientName: '', clientPhone: '', category: 'service_quality', priority: 'medium', description: '' });
    setShowAddComplaint(false);
  };

  const getStaffName = (id: string) => staffList.find(s => s.id === id)?.name ?? '—';
  const getServiceName = (id: string) => services.find(s => s.id === id)?.name ?? '—';

  const avgRating = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : '—';
  const positiveCount = reviews.filter(r => r.tag === 'positive').length;
  const neutralCount  = reviews.filter(r => r.tag === 'neutral').length;
  const negativeCount = reviews.filter(r => r.tag === 'negative').length;
  const npsScore = reviews.length
    ? Math.round(((positiveCount - negativeCount) / reviews.length) * 100)
    : 0;

  const filteredReviews = filter === 'all' ? reviews : reviews.filter(r => r.tag === filter);

  const handleReply = (id: string) => {
    if (!replyText.trim()) return;
    setReviews(prev => prev.map(r =>
      r.id === id ? { ...r, reply: replyText.trim(), status: 'replied' as const } : r
    ));
    setReplyingTo(null);
    setReplyText('');
  };

  const handleResolve = (id: string) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' as const } : r));
  };

  const handleDelete = (id: string) => {
    setReviews(prev => prev.filter(r => r.id !== id));
  };

  const handleSendSurvey = () => {
    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 4000);
  };

  const ratingStars = (n: number) => Array.from({ length: 5 }, (_, i) => (
    <Star key={i} className={`w-3.5 h-3.5 ${i < n ? 'fill-[#FFAE34] text-[#FFAE34]' : 'text-slate-200'}`} />
  ));

  const tagColor: Record<string, string> = {
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    neutral:  'bg-amber-50 text-amber-700 border-amber-100',
    negative: 'bg-red-50 text-red-600 border-red-100',
  };
  const tagLabel: Record<string, string> = {
    positive: isAr ? 'إيجابية' : 'Positive',
    neutral:  isAr ? 'محايدة'  : 'Neutral',
    negative: isAr ? 'سلبية'   : 'Negative',
  };
  const statusBadge: Record<string, string> = {
    new:      'bg-[#FF5A5F]/10 text-[#FF5A5F]',
    replied:  'bg-blue-50 text-blue-700',
    resolved: 'bg-emerald-50 text-emerald-700',
  };
  const statusLabel: Record<string, string> = {
    new:      isAr ? 'جديدة'    : 'New',
    replied:  isAr ? 'تم الرد'  : 'Replied',
    resolved: isAr ? 'محلولة'   : 'Resolved',
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir={dir}>

      {/* ── Header Banner ──────────────────────────────── */}
      <div className="bg-[#14332B] text-white p-6 rounded-2xl relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 w-48 h-48 bg-[#FFAE34]/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="bg-[#FFAE34] text-[#14332B] px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase mb-2 inline-block">
              {isAr ? 'صوت العميل' : 'VOICE OF CLIENT'}
            </span>
            <h2 className="text-xl md:text-2xl font-serif font-black text-white">
              {isAr ? 'إدارة التجربة' : 'Experience Management'}
            </h2>
            <p className="text-slate-300 text-xs mt-1">
              {isAr
                ? 'تابعي آراء عميلاتك، استبياناتك، ومتابعة ما بعد الزيارة من مكان واحد'
                : 'Track client reviews, surveys, and post-visit follow-ups all in one place.'}
            </p>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            {[
              { value: avgRating,         labelAr: 'متوسط التقييم',  labelEn: 'Avg Rating' },
              { value: reviews.length,    labelAr: 'إجمالي التقييمات', labelEn: 'Total Reviews' },
              { value: `${npsScore > 0 ? '+' : ''}${npsScore}`, labelAr: 'نقاط NPS', labelEn: 'NPS Score' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-center">
                <span className="text-xl font-black font-mono block">{kpi.value}</span>
                <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wide">
                  {isAr ? kpi.labelAr : kpi.labelEn}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ─────────────────────────────── */}
      <div className="flex border-b border-[#E9E7E2] gap-1 select-none bg-white rounded-t-2xl px-2">
        {[
          { id: 'overview',    labelAr: 'نظرة عامة',             labelEn: 'Overview',             icon: BarChart3 },
          { id: 'reviews',     labelAr: 'التقييمات',             labelEn: 'Reviews',              icon: Star },
          { id: 'complaints',  labelAr: 'إدارة الشكاوى',         labelEn: 'Complaints',           icon: Flag },
          { id: 'survey',      labelAr: 'الاستبيانات',           labelEn: 'Surveys',              icon: MessageSquare },
          { id: 'followup',    labelAr: 'متابعة ما بعد الزيارة', labelEn: 'Post-Visit Follow-up', icon: Phone },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-[#FF5A5F] text-[#FF5A5F]'
                  : 'border-transparent text-[#6E6A63] hover:text-[#1C1B18]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{isAr ? tab.labelAr : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Star,          color: '#FFAE34', bg: 'bg-amber-50',   value: avgRating,        labelAr: 'متوسط التقييم العام',     labelEn: 'Avg Overall Rating' },
              { icon: ThumbsUp,      color: '#10b981', bg: 'bg-emerald-50', value: positiveCount,    labelAr: 'تقييمات إيجابية',         labelEn: 'Positive Reviews' },
              { icon: Meh,           color: '#FFAE34', bg: 'bg-amber-50',   value: neutralCount,     labelAr: 'تقييمات محايدة',          labelEn: 'Neutral Reviews' },
              { icon: ThumbsDown,    color: '#FF5A5F', bg: 'bg-red-50',     value: negativeCount,    labelAr: 'تقييمات سلبية تحتاج رد',  labelEn: 'Negative (Action Needed)' },
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i} className="bg-white rounded-2xl border border-[#E9E7E2] p-5 shadow-xs flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold mb-1">{isAr ? kpi.labelAr : kpi.labelEn}</p>
                    <p className="text-3xl font-black font-mono" style={{ color: kpi.color }}>{kpi.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" style={{ color: kpi.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sentiment distribution */}
          <div className="bg-white rounded-2xl border border-[#E9E7E2] p-6 shadow-xs">
            <h3 className="font-serif text-sm font-bold text-slate-800 mb-4">{isAr ? 'توزيع المشاعر والتقييمات' : 'Sentiment Distribution'}</h3>
            <div className="space-y-3">
              {[
                { label: isAr ? 'إيجابية' : 'Positive', count: positiveCount, color: '#10b981', bg: 'bg-emerald-500' },
                { label: isAr ? 'محايدة'  : 'Neutral',  count: neutralCount,  color: '#FFAE34', bg: 'bg-amber-400' },
                { label: isAr ? 'سلبية'   : 'Negative', count: negativeCount, color: '#FF5A5F', bg: 'bg-[#FF5A5F]' },
              ].map(row => {
                const pct = reviews.length ? Math.round((row.count / reviews.length) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700">{row.label}</span>
                      <span className="text-xs font-black font-mono" style={{ color: row.color }}>{row.count} ({pct}%)</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${row.bg} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rating breakdown */}
          <div className="bg-white rounded-2xl border border-[#E9E7E2] p-6 shadow-xs">
            <h3 className="font-serif text-sm font-bold text-slate-800 mb-4">{isAr ? 'توزيع النجوم' : 'Star Rating Breakdown'}</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(n => {
                const count = reviews.filter(r => r.rating === n).length;
                const pct   = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
                return (
                  <div key={n} className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5 shrink-0 w-24 justify-end">{ratingStars(n)}</div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FFAE34] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-black font-mono text-slate-500 w-6">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent reviews preview */}
          <div className="bg-white rounded-2xl border border-[#E9E7E2] p-6 shadow-xs">
            <h3 className="font-serif text-sm font-bold text-slate-800 mb-4">{isAr ? 'أحدث التقييمات' : 'Latest Reviews'}</h3>
            <div className="space-y-3">
              {reviews.slice(0, 3).map(r => (
                <div key={r.id} className="flex items-start gap-3 border-b border-[#F1F5F9] pb-3 last:border-0 last:pb-0">
                  <div className="w-9 h-9 rounded-full bg-[#14332B] text-white flex items-center justify-center font-serif font-bold text-sm shrink-0">
                    {r.clientName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-slate-800">{r.clientName}</p>
                      <div className="flex">{ratingStars(r.rating)}</div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${tagColor[r.tag]}`}>{tagLabel[r.tag]}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{r.comment}</p>
                  </div>
                  <span className="text-[9px] text-slate-300 shrink-0 font-mono">{r.date}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setActiveTab('reviews')} className="mt-4 text-xs font-bold text-[#FF5A5F] hover:underline">
              {isAr ? 'عرض كل التقييمات ←' : 'View all reviews →'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: REVIEWS
      ══════════════════════════════════════════════ */}
      {activeTab === 'reviews' && (
        <div className="space-y-5">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'positive', 'neutral', 'negative'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  filter === f
                    ? 'bg-[#FF5A5F] text-white border-[#FF5A5F]'
                    : 'bg-white text-[#6E6A63] border-[#E9E7E2] hover:border-[#FF5A5F]'
                }`}
              >
                {f === 'all'      ? (isAr ? 'الكل'      : 'All')
                : f === 'positive' ? (isAr ? 'إيجابية'  : 'Positive')
                : f === 'neutral'  ? (isAr ? 'محايدة'   : 'Neutral')
                :                    (isAr ? 'سلبية'    : 'Negative')}
                <span className="ms-1.5 bg-white/20 px-1.5 rounded-full">
                  {f === 'all' ? reviews.length : reviews.filter(r => r.tag === f).length}
                </span>
              </button>
            ))}
          </div>

          {/* Review cards */}
          <div className="space-y-4">
            {filteredReviews.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-[#E9E7E2] p-5 shadow-xs space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#14332B] text-white flex items-center justify-center font-serif font-bold text-base shrink-0">
                      {r.clientName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{r.clientName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{r.clientPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="flex">{ratingStars(r.rating)}</div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${tagColor[r.tag]}`}>{tagLabel[r.tag]}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusBadge[r.status]}`}>{statusLabel[r.status]}</span>
                    <span className="text-[9px] text-slate-300 font-mono">{r.date}</span>
                  </div>
                </div>

                {/* Meta */}
                <div className="flex gap-3 text-[10px] text-slate-400">
                  <span>{isAr ? 'الخدمة:' : 'Service:'} <strong className="text-slate-600">{getServiceName(r.serviceId)}</strong></span>
                  <span>·</span>
                  <span>{isAr ? 'الخبيرة:' : 'Expert:'} <strong className="text-slate-600">{getStaffName(r.staffId)}</strong></span>
                </div>

                {/* Comment */}
                <p className="text-xs text-slate-600 bg-[#F8FAFC] rounded-xl p-3 leading-relaxed border border-slate-100">
                  {r.comment}
                </p>

                {/* Existing reply */}
                {r.reply && (
                  <div className="flex items-start gap-2 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] text-emerald-600 font-bold mb-0.5">{isAr ? 'ردّك:' : 'Your reply:'}</p>
                      <p className="text-xs text-emerald-800">{r.reply}</p>
                    </div>
                  </div>
                )}

                {/* Reply input */}
                {replyingTo === r.id && (
                  <div className="space-y-2">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder={isAr ? 'اكتبي ردك هنا...' : 'Write your reply here...'}
                      rows={2}
                      className="w-full text-xs p-3 rounded-xl border border-[#E9E7E2] focus:outline-none focus:border-[#FF5A5F] resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReply(r.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14332B] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#1a4a3a] transition-all"
                      >
                        <Send className="w-3 h-3" />{isAr ? 'إرسال الرد' : 'Send Reply'}
                      </button>
                      <button
                        onClick={() => { setReplyingTo(null); setReplyText(''); }}
                        className="px-3 py-1.5 text-slate-500 text-xs font-bold rounded-lg cursor-pointer hover:bg-slate-100 transition-all"
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {r.status !== 'replied' && r.status !== 'resolved' && (
                    <button
                      onClick={() => { setReplyingTo(r.id); setReplyText(''); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF5A5F]/10 text-[#FF5A5F] text-xs font-bold rounded-lg cursor-pointer hover:bg-[#FF5A5F]/20 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />{isAr ? 'رد' : 'Reply'}
                    </button>
                  )}
                  {r.status === 'replied' && (
                    <button
                      onClick={() => handleResolve(r.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg cursor-pointer hover:bg-emerald-100 transition-all"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />{isAr ? 'حل' : 'Resolve'}
                    </button>
                  )}
                  {r.status !== 'replied' && r.status !== 'resolved' && (
                    <button
                      onClick={() => { setReplyingTo(r.id); setReplyText(''); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg cursor-pointer hover:bg-slate-100 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />{isAr ? 'رد' : 'Reply'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 text-xs font-bold rounded-lg cursor-pointer hover:bg-red-100 transition-all ms-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />{isAr ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}

            {filteredReviews.length === 0 && (
              <div className="text-center py-16 text-slate-300">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-bold">{isAr ? 'لا توجد تقييمات في هذه الفئة' : 'No reviews in this category'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: COMPLAINTS
      ══════════════════════════════════════════════ */}
      {activeTab === 'complaints' && (() => {
        const catLabel: Record<Complaint['category'], { ar: string; en: string }> = {
          service_quality: { ar: 'جودة الخدمة',      en: 'Service Quality' },
          waiting_time:    { ar: 'وقت الانتظار',     en: 'Waiting Time' },
          staff_behavior:  { ar: 'سلوك الموظفة',     en: 'Staff Behavior' },
          pricing:         { ar: 'الأسعار والفواتير', en: 'Pricing & Billing' },
          cleanliness:     { ar: 'النظافة والصحة',   en: 'Hygiene & Cleanliness' },
          other:           { ar: 'أخرى',              en: 'Other' },
        };
        const priorityBadge: Record<Complaint['priority'], string> = {
          high:   'bg-red-50 text-red-600 border-red-100',
          medium: 'bg-amber-50 text-amber-700 border-amber-100',
          low:    'bg-slate-50 text-slate-500 border-slate-100',
        };
        const priorityLabel: Record<Complaint['priority'], { ar: string; en: string }> = {
          high:   { ar: 'عاجلة',    en: 'High' },
          medium: { ar: 'متوسطة',   en: 'Medium' },
          low:    { ar: 'منخفضة',   en: 'Low' },
        };
        const statusBadgeC: Record<Complaint['status'], string> = {
          open:        'bg-red-50 text-red-600',
          in_progress: 'bg-blue-50 text-blue-700',
          resolved:    'bg-emerald-50 text-emerald-700',
          closed:      'bg-slate-100 text-slate-500',
        };
        const statusLabelC: Record<Complaint['status'], { ar: string; en: string }> = {
          open:        { ar: 'مفتوحة',    en: 'Open' },
          in_progress: { ar: 'قيد المعالجة', en: 'In Progress' },
          resolved:    { ar: 'محلولة',    en: 'Resolved' },
          closed:      { ar: 'مغلقة',     en: 'Closed' },
        };

        const openCount       = complaints.filter(c => c.status === 'open').length;
        const inProgressCount = complaints.filter(c => c.status === 'in_progress').length;
        const resolvedCount   = complaints.filter(c => c.status === 'resolved').length;
        const highPriority    = complaints.filter(c => c.priority === 'high' && c.status === 'open').length;

        return (
          <div className="space-y-5">

            {/* KPI mini-strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Inbox,         color: '#FF5A5F', bg: 'bg-red-50',     value: openCount,       labelAr: 'شكاوى مفتوحة',     labelEn: 'Open Complaints' },
                { icon: CircleDot,     color: '#3b82f6', bg: 'bg-blue-50',    value: inProgressCount, labelAr: 'قيد المعالجة',     labelEn: 'In Progress' },
                { icon: CheckCircle,   color: '#10b981', bg: 'bg-emerald-50', value: resolvedCount,   labelAr: 'تم الحل',           labelEn: 'Resolved' },
                { icon: ShieldAlert,   color: '#f59e0b', bg: 'bg-amber-50',   value: highPriority,    labelAr: 'أولوية عالية',     labelEn: 'High Priority' },
              ].map((kpi, i) => {
                const Icon = kpi.icon;
                return (
                  <div key={i} className="bg-white rounded-2xl border border-[#E9E7E2] p-5 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold mb-1">{isAr ? kpi.labelAr : kpi.labelEn}</p>
                      <p className="text-3xl font-black font-mono" style={{ color: kpi.color }}>{kpi.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5" style={{ color: kpi.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filter + Add button */}
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-wrap gap-2">
                {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setComplaintFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      complaintFilter === f
                        ? 'bg-[#FF5A5F] text-white border-[#FF5A5F]'
                        : 'bg-white text-[#6E6A63] border-[#E9E7E2] hover:border-[#FF5A5F]'
                    }`}
                  >
                    {f === 'all'         ? (isAr ? 'الكل' : 'All')
                    : f === 'open'       ? (isAr ? 'مفتوحة' : 'Open')
                    : f === 'in_progress'? (isAr ? 'قيد المعالجة' : 'In Progress')
                    : f === 'resolved'   ? (isAr ? 'محلولة' : 'Resolved')
                    :                      (isAr ? 'مغلقة' : 'Closed')}
                    <span className="ms-1.5 opacity-70">
                      {f === 'all' ? complaints.length : complaints.filter(c => c.status === f).length}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAddComplaint(v => !v)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                {isAr ? 'تسجيل شكوى جديدة' : 'New Complaint'}
              </button>
            </div>

            {/* Add Complaint form */}
            {showAddComplaint && (
              <div className="bg-white rounded-2xl border border-[#E9E7E2] p-5 shadow-xs space-y-4">
                <h4 className="font-serif text-sm font-bold text-slate-800">{isAr ? 'تسجيل شكوى جديدة' : 'Register New Complaint'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">{isAr ? 'اسم العميلة *' : 'Client Name *'}</label>
                    <input value={newComplaint.clientName} onChange={e => setNewComplaint(p => ({ ...p, clientName: e.target.value }))}
                      className="w-full text-xs px-3 py-2 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                      placeholder={isAr ? 'اسم العميلة' : 'Client name'} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">{isAr ? 'رقم الجوال' : 'Phone'}</label>
                    <input value={newComplaint.clientPhone} onChange={e => setNewComplaint(p => ({ ...p, clientPhone: e.target.value }))}
                      className="w-full text-xs px-3 py-2 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] font-mono"
                      placeholder="05XXXXXXXX" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">{isAr ? 'فئة الشكوى' : 'Category'}</label>
                    <select value={newComplaint.category} onChange={e => setNewComplaint(p => ({ ...p, category: e.target.value as Complaint['category'] }))}
                      className="w-full text-xs px-3 py-2 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white">
                      {(Object.keys(catLabel) as Complaint['category'][]).map(k => (
                        <option key={k} value={k}>{isAr ? catLabel[k].ar : catLabel[k].en}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">{isAr ? 'الأولوية' : 'Priority'}</label>
                    <select value={newComplaint.priority} onChange={e => setNewComplaint(p => ({ ...p, priority: e.target.value as Complaint['priority'] }))}
                      className="w-full text-xs px-3 py-2 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white">
                      <option value="high">{isAr ? 'عاجلة (أولوية عالية)' : 'High Priority'}</option>
                      <option value="medium">{isAr ? 'متوسطة' : 'Medium Priority'}</option>
                      <option value="low">{isAr ? 'منخفضة' : 'Low Priority'}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">{isAr ? 'وصف الشكوى *' : 'Complaint Description *'}</label>
                  <textarea value={newComplaint.description} onChange={e => setNewComplaint(p => ({ ...p, description: e.target.value }))}
                    rows={3} className="w-full text-xs px-3 py-2 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] resize-none"
                    placeholder={isAr ? 'اكتبي تفاصيل الشكوى...' : 'Describe the complaint...'} />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleAddComplaint}
                    className="px-5 py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white text-xs font-bold rounded-xl cursor-pointer transition-all">
                    {isAr ? 'تسجيل الشكوى' : 'Submit Complaint'}
                  </button>
                  <button onClick={() => setShowAddComplaint(false)}
                    className="px-5 py-2 border border-[#E9E7E2] text-slate-500 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-50 transition-all">
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}

            {/* Complaint cards */}
            <div className="space-y-4">
              {filteredComplaints.map(c => (
                <div key={c.id} className="bg-white rounded-2xl border border-[#E9E7E2] p-5 shadow-xs space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        c.priority === 'high' ? 'bg-red-50' : c.priority === 'medium' ? 'bg-amber-50' : 'bg-slate-50'
                      }`}>
                        <Flag className={`w-5 h-5 ${c.priority === 'high' ? 'text-red-500' : c.priority === 'medium' ? 'text-amber-500' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{c.clientName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{c.clientPhone || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${priorityBadge[c.priority]}`}>
                        {isAr ? priorityLabel[c.priority].ar : priorityLabel[c.priority].en}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusBadgeC[c.status]}`}>
                        {isAr ? statusLabelC[c.status].ar : statusLabelC[c.status].en}
                      </span>
                      <span className="text-[9px] text-slate-300 font-mono">{c.date}</span>
                    </div>
                  </div>

                  {/* Category + staff */}
                  <div className="flex gap-3 text-[10px] text-slate-400 flex-wrap">
                    <span>{isAr ? 'الفئة:' : 'Category:'} <strong className="text-slate-600">{isAr ? catLabel[c.category].ar : catLabel[c.category].en}</strong></span>
                    {c.staffId && <><span>·</span><span>{isAr ? 'الخبيرة:' : 'Expert:'} <strong className="text-slate-600">{getStaffName(c.staffId)}</strong></span></>}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 bg-[#F8FAFC] rounded-xl p-3 leading-relaxed border border-slate-100">
                    {c.description}
                  </p>

                  {/* Resolution block */}
                  {c.resolution && (
                    <div className="flex items-start gap-2 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] text-emerald-600 font-bold mb-0.5">{isAr ? 'إجراء الحل:' : 'Resolution:'}</p>
                        <p className="text-xs text-emerald-800">{c.resolution}</p>
                      </div>
                    </div>
                  )}

                  {/* Resolution input */}
                  {resolvingId === c.id && (
                    <div className="space-y-2">
                      <textarea
                        value={resolutionText}
                        onChange={e => setResolutionText(e.target.value)}
                        placeholder={isAr ? 'اكتبي خطوات الحل...' : 'Describe the resolution steps...'}
                        rows={2}
                        className="w-full text-xs p-3 rounded-xl border border-[#E9E7E2] focus:outline-none focus:border-[#FF5A5F] resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateComplaintStatus(c.id, 'resolved', resolutionText)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-emerald-700 transition-all"
                        >
                          <CheckCircle className="w-3 h-3" />{isAr ? 'تأكيد الحل' : 'Confirm Resolved'}
                        </button>
                        <button onClick={() => { setResolvingId(null); setResolutionText(''); }}
                          className="px-3 py-1.5 text-slate-500 text-xs font-bold rounded-lg cursor-pointer hover:bg-slate-100 transition-all">
                          {isAr ? 'إلغاء' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1 flex-wrap">
                    {c.status === 'open' && (
                      <button
                        onClick={() => handleUpdateComplaintStatus(c.id, 'in_progress')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg cursor-pointer hover:bg-blue-100 transition-all"
                      >
                        <CircleDot className="w-3.5 h-3.5" />{isAr ? 'بدء المعالجة' : 'Start Processing'}
                      </button>
                    )}
                    {(c.status === 'open' || c.status === 'in_progress') && resolvingId !== c.id && (
                      <button
                        onClick={() => { setResolvingId(c.id); setResolutionText(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg cursor-pointer hover:bg-emerald-100 transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />{isAr ? 'تسجيل الحل' : 'Mark Resolved'}
                      </button>
                    )}
                    {c.status === 'resolved' && (
                      <button
                        onClick={() => handleUpdateComplaintStatus(c.id, 'closed')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg cursor-pointer hover:bg-slate-100 transition-all"
                      >
                        <Flag className="w-3.5 h-3.5" />{isAr ? 'إغلاق الشكوى' : 'Close'}
                      </button>
                    )}
                    {c.clientPhone && (
                      <a
                        href={`https://wa.me/966${c.clientPhone.replace(/^0/, '')}?text=${encodeURIComponent(isAr ? `مرحباً ${c.clientName}، نشكرك على تواصلك معنا بخصوص ملاحظتك. نحن بصدد مراجعة الأمر وسنتواصل معك قريباً. 🌸` : `Hello ${c.clientName}, thank you for reaching out. We are reviewing your complaint and will follow up shortly.`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 text-[#128C7E] text-xs font-bold rounded-lg hover:bg-[#25D366]/20 transition-all ms-auto"
                      >
                        <Phone className="w-3.5 h-3.5" />{isAr ? 'واتساب' : 'WhatsApp'}
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {filteredComplaints.length === 0 && (
                <div className="text-center py-16 text-slate-300">
                  <Flag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-bold">{isAr ? 'لا توجد شكاوى في هذه الفئة' : 'No complaints in this category'}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════
          TAB: SURVEYS
      ══════════════════════════════════════════════ */}
      {activeTab === 'survey' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#E9E7E2] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-serif text-sm font-bold text-slate-900">{isAr ? 'استبيان رضا العملاء' : 'Client Satisfaction Survey'}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{isAr ? 'يُرسل تلقائياً بعد كل زيارة مكتملة عبر واتساب' : 'Auto-sent after every completed visit via WhatsApp'}</p>
              </div>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2.5 py-1 rounded-full">
                {isAr ? '✓ مفعّل' : '✓ Active'}
              </span>
            </div>

            <div className="space-y-3">
              {surveyQuestions.map((q, i) => (
                <div key={q.id} className="bg-[#F8FAFC] rounded-xl p-4 border border-slate-100 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#FF5A5F] text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">{isAr ? q.textAr : q.textEn}</p>
                    <span className={`inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      q.type === 'rating' ? 'bg-amber-50 text-amber-700' :
                      q.type === 'yesno'  ? 'bg-blue-50 text-blue-700'  :
                                            'bg-slate-100 text-slate-500'
                    }`}>
                      {q.type === 'rating' ? (isAr ? '⭐ تقييم بالنجوم' : '⭐ Star Rating')
                      : q.type === 'yesno'  ? (isAr ? '✓/✗ نعم / لا' : '✓/✗ Yes / No')
                      :                        (isAr ? '✏ إجابة نصية' : '✏ Open Text')}
                    </span>
                  </div>
                  <button
                    onClick={() => setSurveyQuestions(prev => prev.filter(sq => sq.id !== q.id))}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSendSurvey}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FF5A5F] hover:bg-[#E04B50] text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
              >
                <Send className="w-4 h-4" />
                {isAr ? 'إرسال الاستبيان للعملاء النشطين' : 'Send Survey to Active Clients'}
              </button>
            </div>

            {sendSuccess && (
              <div className="mt-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">{isAr ? `تم إرسال الاستبيان إلى ${clients.length} عميل نشط عبر واتساب ✓` : `Survey sent to ${clients.length} active clients via WhatsApp ✓`}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB: POST-VISIT FOLLOW-UP
      ══════════════════════════════════════════════ */}
      {activeTab === 'followup' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#E9E7E2] p-6 shadow-xs">
            <h3 className="font-serif text-sm font-bold text-slate-900 mb-1">{isAr ? 'متابعة ما بعد الزيارة' : 'Post-Visit Follow-up'}</h3>
            <p className="text-[10px] text-slate-400 mb-5">{isAr ? 'رسائل متابعة آلية بعد اكتمال الخدمة لتعزيز العلاقة وتشجيع العودة' : 'Automated follow-up messages after service completion to strengthen relationships and encourage return visits.'}</p>

            <div className="space-y-4">
              {[
                {
                  delay: isAr ? 'بعد 24 ساعة من الزيارة' : '24 hours after visit',
                  labelAr: 'رسالة الشكر والتقييم',
                  labelEn: 'Thank You & Rating Request',
                  msgAr: 'مرحباً {اسم العميلة} 🌸 نشكرك على زيارتك لصالون كونفيرمد اليوم. نتمنى أن تكوني راضية تماماً عن تجربتك. شاركينا رأيك في تجربتك للمساعدة في تطوير خدماتنا! ⭐',
                  msgEn: 'Hi {ClientName} 🌸 Thank you for visiting CONFIRMED Salon today. We hope your experience was wonderful! Share your feedback to help us improve.',
                  color: 'emerald',
                  active: true,
                },
                {
                  delay: isAr ? 'بعد 7 أيام من الزيارة' : '7 days after visit',
                  labelAr: 'تذكير بموعد العودة',
                  labelEn: 'Return Appointment Reminder',
                  msgAr: 'أهلاً {اسم العميلة} ✨ لقد مضت أسبوع على آخر زيارتك لنا! هل تودين حجز موعدك القادم؟ تواصلي معنا لنرتب لك أجمل وقت.',
                  msgEn: 'Hello {ClientName} ✨ It\'s been a week since your last visit! Ready to book your next appointment? We\'d love to see you again.',
                  color: 'blue',
                  active: true,
                },
                {
                  delay: isAr ? 'بعد 30 يوماً من الزيارة' : '30 days after visit',
                  labelAr: 'رسالة إعادة التفاعل',
                  labelEn: 'Re-Engagement Message',
                  msgAr: 'نفتقدك {اسم العميلة} 💖 لقد مضى شهر على زيارتك الأخيرة. يسعدنا رؤيتك مجدداً! احجزي موعدك الآن واستمتعي بعرض خاص لعودتك.',
                  msgEn: 'We miss you {ClientName} 💖 It\'s been a month since your last visit. We\'d love to welcome you back with a special returning-client offer!',
                  color: 'amber',
                  active: false,
                },
              ].map((step, i) => (
                <div key={i} className={`rounded-2xl border p-5 ${step.active ? 'bg-white border-[#E9E7E2]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white ${
                        step.color === 'emerald' ? 'bg-emerald-500' :
                        step.color === 'blue'    ? 'bg-blue-500'    : 'bg-amber-500'
                      }`}>{i + 1}</div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{isAr ? step.labelAr : step.labelEn}</p>
                        <p className="text-[10px] text-slate-400">{step.delay}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${step.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {step.active ? (isAr ? '✓ مفعّل' : '✓ Active') : (isAr ? 'معطّل' : 'Inactive')}
                    </span>
                  </div>
                  <div className="bg-[#F8FAFC] rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold mb-1">{isAr ? 'نص الرسالة:' : 'Message text:'}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{isAr ? step.msgAr : step.msgEn}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
