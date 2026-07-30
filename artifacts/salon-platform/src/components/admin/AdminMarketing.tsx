import { useState } from 'react';
import { Send, Megaphone, Users, Mail, Smartphone, CheckCircle, Clock, Filter } from 'lucide-react';
import type { RegisteredProvider, Toast } from './adminTypes';

interface Props {
  providers: RegisteredProvider[];
  isAr: boolean;
  addToast: (t: Omit<Toast, 'id'>) => void;
}

interface Campaign { id: string; title: string; target: string; channel: string; sentAt: string; status: string; count: number; }

const INITIAL_LOGS: Campaign[] = [
  { id: 'c1', title: 'تذكير تجديد الاشتراك — يوليو 2026', target: 'جميع المزودين', channel: 'SMS & Email', sentAt: '2026-07-15T10:00:00Z', status: 'completed', count: 6 },
  { id: 'c2', title: 'ميزة جديدة: مصادر البيانات', target: 'جميع المزودين', channel: 'Email', sentAt: '2026-07-20T12:00:00Z', status: 'completed', count: 6 },
  { id: 'c3', title: 'عرض الصيف — خصم 20% على الباقة السنوية', target: 'الفترة التجريبية', channel: 'SMS & Email', sentAt: '2026-07-10T09:00:00Z', status: 'completed', count: 1 },
];

const SEGMENTS = [
  { id: 'all',        label_ar: 'جميع الصالونات',       label_en: 'All Salons',         count: 6 },
  { id: 'active',     label_ar: 'النشطة',                label_en: 'Active Salons',      count: 4 },
  { id: 'trial',      label_ar: 'الفترة التجريبية',      label_en: 'Trial Salons',       count: 1 },
  { id: 'churn_risk', label_ar: 'خطر الإلغاء (عالي)',   label_en: 'High Churn Risk',    count: 1 },
  { id: 'overdue',    label_ar: 'متأخرة في الدفع',      label_en: 'Overdue Billing',    count: 1 },
  { id: 'pro',        label_ar: 'باقة احترافية',         label_en: 'Pro Plan',           count: 3 },
  { id: 'enterprise', label_ar: 'باقة مؤسسية',          label_en: 'Enterprise',         count: 1 },
];

export default function AdminMarketing({ providers, isAr, addToast }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_LOGS);
  const [segment, setSegment] = useState('all');
  const [channel, setChannel] = useState<'both' | 'email' | 'sms'>('both');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const getRecipients = () => {
    if (segment === 'all') return providers;
    if (segment === 'active') return providers.filter(p => p.status === 'active');
    if (segment === 'trial') return providers.filter(p => p.status === 'trial');
    if (segment === 'churn_risk') return providers.filter(p => p.churnRisk === 'high');
    if (segment === 'overdue') return providers.filter(p => p.subscriptionStatus === 'overdue');
    if (segment === 'pro') return providers.filter(p => p.subscriptionTier === 'pro');
    if (segment === 'enterprise') return providers.filter(p => p.subscriptionTier === 'enterprise');
    return providers;
  };

  const handleSend = async () => {
    if (!title || !message) { addToast({ type: 'error', message: isAr ? 'يرجى تعبئة العنوان والرسالة' : 'Fill title and message' }); return; }
    setSending(true);
    await new Promise(r => setTimeout(r, 1200));
    const recipients = getRecipients();
    const segLabel = SEGMENTS.find(s => s.id === segment);
    const log: Campaign = {
      id: 'c_' + Date.now(),
      title,
      target: isAr ? segLabel?.label_ar || 'الكل' : segLabel?.label_en || 'All',
      channel: channel === 'both' ? 'SMS & Email' : channel.toUpperCase(),
      sentAt: new Date().toISOString(),
      status: 'completed',
      count: recipients.length,
    };
    setCampaigns(prev => [log, ...prev]);
    addToast({ type: 'success', message: isAr ? `تم البث لـ ${recipients.length} صالون بنجاح 🚀` : `Broadcast sent to ${recipients.length} salons 🚀` });
    setTitle('');
    setMessage('');
    setSending(false);
  };

  const selectedSeg = SEGMENTS.find(s => s.id === segment);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Compose */}
      <div className="lg:col-span-7 space-y-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Megaphone className="w-4 h-4 text-[#FF5A5F]" />{isAr ? 'إنشاء حملة بث مركزية' : 'Create Broadcast Campaign'}</h3>

          {/* Segment picker */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">{isAr ? 'تقسيم الجمهور المستهدف' : 'Audience Segmentation'}</label>
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map(s => (
                <button key={s.id} onClick={() => setSegment(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${segment === s.id ? 'border-[#FF5A5F] bg-[#FF5A5F]/15 text-[#FF5A5F]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  <Users className="w-3 h-3" />
                  {isAr ? s.label_ar : s.label_en}
                  <span className="opacity-60">{s.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Channel */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">{isAr ? 'قناة الإرسال' : 'Delivery Channel'}</label>
            <div className="flex gap-2">
              {[{ v: 'both', ar: 'SMS + Email', en: 'SMS + Email', icon: <><Smartphone className="w-3 h-3" /><Mail className="w-3 h-3" /></> }, { v: 'email', ar: 'Email فقط', en: 'Email Only', icon: <Mail className="w-3 h-3" /> }, { v: 'sms', ar: 'SMS فقط', en: 'SMS Only', icon: <Smartphone className="w-3 h-3" /> }].map(c => (
                <button key={c.v} onClick={() => setChannel(c.v as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${channel === c.v ? 'border-[#FF5A5F] bg-[#FF5A5F]/15 text-[#FF5A5F]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {c.icon}{isAr ? c.ar : c.en}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">{isAr ? 'عنوان الحملة *' : 'Campaign Title *'}</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={isAr ? 'مثال: تحديث مهم لنظام الحجوزات' : 'e.g. Important booking system update'} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-[#FF5A5F] transition-all" />
          </div>

          {/* Message */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-2">{isAr ? 'نص الرسالة *' : 'Message Body *'}</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder={isAr ? 'اكتبي نص الرسالة هنا...' : 'Write your message here...'} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-[#FF5A5F] resize-none transition-all" />
            <p className="text-[9px] text-slate-600 mt-1">{message.length}/160 {isAr ? 'حرف' : 'chars'}</p>
          </div>

          {/* Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-[9px] text-slate-500 font-bold uppercase">{isAr ? 'معاينة الإرسال' : 'Send Preview'}</p>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">{isAr ? 'المستلمون:' : 'Recipients:'}</span>
              <span className="text-slate-900 font-bold">{selectedSeg ? (isAr ? selectedSeg.label_ar : selectedSeg.label_en) : ''} ({getRecipients().length} {isAr ? 'صالون' : 'salons'})</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">{isAr ? 'القناة:' : 'Channel:'}</span>
              <span className="text-slate-900 font-bold">{channel === 'both' ? 'SMS + Email' : channel.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">{isAr ? 'الرسائل المتوقعة:' : 'Expected messages:'}</span>
              <span className="text-[#FF5A5F] font-bold font-mono">{getRecipients().length * (channel === 'both' ? 2 : 1)}</span>
            </div>
          </div>

          <button onClick={handleSend} disabled={sending || !title || !message}
            className="w-full py-3.5 bg-gradient-to-r from-[#FF5A5F] to-[#FFAE34] text-slate-900 font-bold text-sm rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FF5A5F]/20">
            {sending ? <><Clock className="w-4 h-4 animate-spin" />{isAr ? 'جاري الإرسال...' : 'Sending...'}</> : <><Send className="w-4 h-4" />{isAr ? 'إطلاق الحملة 🚀' : 'Launch Campaign 🚀'}</>}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">{isAr ? 'سجل الحملات' : 'Campaign History'}</h3>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {campaigns.map(c => (
              <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900 leading-snug">{c.title}</p>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 shrink-0">{c.status.toUpperCase()}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-[9px] text-slate-500">
                  <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" />{c.target}</span>
                  <span className="flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{c.channel}</span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-600 border-t border-slate-200 pt-2">
                  <span>{new Date(c.sentAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5" />{c.count} {isAr ? 'مستلم' : 'recipients'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-[#FF5A5F]/5 border border-[#FF5A5F]/20 rounded-2xl p-4 space-y-2">
          <p className="text-[10px] text-[#FF5A5F] font-bold">{isAr ? '💡 نصائح التسويق' : '💡 Marketing Tips'}</p>
          <ul className="space-y-1.5 text-[10px] text-slate-400">
            <li>• {isAr ? 'استهدفي صالونات خطر الإلغاء برسائل احتفاظ مخصصة' : 'Target churn-risk salons with personalized retention messages'}</li>
            <li>• {isAr ? 'أفضل وقت للإرسال: الثلاثاء-الخميس 10ص-12م' : 'Best send time: Tue-Thu 10AM-12PM'}</li>
            <li>• {isAr ? 'معدل فتح الإيميل يرتفع باستخدام اسم الصالون في العنوان' : 'Email open rates improve with salon name in subject'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
