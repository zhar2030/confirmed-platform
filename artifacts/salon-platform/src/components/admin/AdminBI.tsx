import { TrendingUp, TrendingDown, BarChart2, Users, DollarSign, AlertCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Cell } from 'recharts';
import type { RegisteredProvider } from './adminTypes';
import { REVENUE_DATA, CHURN_DATA } from './adminData';

interface Props { providers: RegisteredProvider[]; isAr: boolean; }

const CITY_DATA = [
  { city: 'الرياض', salons: 2, revenue: 415500 },
  { city: 'جدة',   salons: 2, revenue: 253900 },
  { city: 'مكة',   salons: 1, revenue: 44800 },
  { city: 'الدمام',salons: 1, revenue: 12400 },
];

const FORECAST = [
  { month: 'أغسطس',   revenue: 128000, salons: 7 },
  { month: 'سبتمبر',  revenue: 145000, salons: 9 },
  { month: 'أكتوبر',  revenue: 162000, salons: 11 },
  { month: 'نوفمبر',  revenue: 181000, salons: 13 },
  { month: 'ديسمبر',  revenue: 204000, salons: 15 },
];

const RADAR_DATA = [
  { metric: 'حجوزات', A: 85, fullMark: 100 },
  { metric: 'إيرادات', A: 92, fullMark: 100 },
  { metric: 'رضا العملاء', A: 88, fullMark: 100 },
  { metric: 'معدل الاحتفاظ', A: 96, fullMark: 100 },
  { metric: 'نشاط المنصة', A: 78, fullMark: 100 },
  { metric: 'نمو الصالونات', A: 72, fullMark: 100 },
];

const TIP = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] shadow-xl">
      <p className="font-bold text-slate-900 mb-1">{label}</p>
      {payload.map((p: any, i: number) => <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value > 1000 ? p.value.toLocaleString() : p.value}{p.unit || ''}</p>)}
    </div>
  );
};

export default function AdminBI({ providers, isAr }: Props) {
  const totalSales = providers.reduce((a, p) => a + p.totalSales, 0);
  const avgRating  = (providers.reduce((a, p) => a + p.rating, 0) / providers.length).toFixed(1);
  const highRisk   = providers.filter(p => p.churnRisk === 'high');
  const ltv        = Math.round(totalSales / providers.length);

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: isAr ? 'LTV متوسط للصالون' : 'Avg Salon LTV', v: ltv.toLocaleString() + ' ر.س', icon: DollarSign, c: '#10b981', trend: '+18%' },
          { l: isAr ? 'متوسط التقييم' : 'Avg Rating', v: '⭐ ' + avgRating, icon: Users, c: '#f59e0b', trend: '+0.2' },
          { l: isAr ? 'معدل النمو الشهري' : 'Monthly Growth', v: '13.5%', icon: TrendingUp, c: '#3b82f6', trend: '+2.1pp' },
          { l: isAr ? 'صالونات خطر الإلغاء' : 'Churn Risk Salons', v: highRisk.length.toString(), icon: AlertCircle, c: highRisk.length > 0 ? '#ef4444' : '#10b981', trend: highRisk.length > 0 ? '!' : '✓' },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.c + '20' }}>
                  <Icon className="w-4 h-4" style={{ color: k.c }} />
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-400">{k.trend}</span>
              </div>
              <p className="text-xl font-black font-mono" style={{ color: k.c }}>{k.v}</p>
              <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">{k.l}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue forecast */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{isAr ? 'توقعات الإيرادات — Q3/Q4 2026' : 'Revenue Forecast — Q3/Q4 2026'}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">{isAr ? 'تنبؤ بناءً على نمو الصالونات ومعدلات الاستبقاء' : 'Forecast based on salon growth & retention rates'}</p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={FORECAST} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={55} tickFormatter={v => (v / 1000) + 'k'} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={25} />
            <Tooltip content={<TIP />} />
            <Bar yAxisId="left" dataKey="revenue" name={isAr ? 'الإيرادات' : 'Revenue'} fill="#FF5A5F" radius={[4, 4, 0, 0]} opacity={0.8} />
            <Line yAxisId="right" type="monotone" dataKey="salons" name={isAr ? 'عدد الصالونات' : 'Salons'} stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* City breakdown + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By city */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">{isAr ? 'الأداء حسب المدينة' : 'Performance by City'}</h3>
          <div className="space-y-3">
            {CITY_DATA.map((c, i) => {
              const pct = Math.round((c.revenue / totalSales) * 100);
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-bold">{c.city}</span>
                    <div className="flex gap-3 text-slate-500">
                      <span>{c.salons} {isAr ? 'صالون' : 'salons'}</span>
                      <span className="text-slate-900 font-mono">{c.revenue.toLocaleString()} ر.س</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#FF5A5F] to-[#FFAE34]" style={{ width: pct + '%' }} />
                  </div>
                  <p className="text-[9px] text-slate-600">{pct}% {isAr ? 'من إجمالي الإيرادات' : 'of total revenue'}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Radar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">{isAr ? 'صحة المنصة — مؤشرات الأداء' : 'Platform Health Radar'}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={RADAR_DATA} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="#ffffff10" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 10 }} />
              <Radar name="Platform" dataKey="A" stroke="#FF5A5F" fill="#FF5A5F" fillOpacity={0.15} strokeWidth={2} />
              <Tooltip contentStyle={{ background: '#0F1923', border: '1px solid #ffffff20', borderRadius: 10, fontSize: 11 }} formatter={(v: any) => [v + '%', '']} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Churn trend */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{isAr ? 'تحليل الاستنزاف والاستبقاء' : 'Churn & Retention Analysis'}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">{isAr ? 'انخفاض مستمر في معدل الاستنزاف — هدف 2026: أقل من 1.5%' : 'Continuous churn reduction — 2026 target: below 1.5%'}</p>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
            <TrendingDown className="w-4 h-4" />{isAr ? 'انخفاض 57% هذا العام' : '57% reduction YTD'}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={CHURN_DATA} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={30} tickFormatter={v => v + '%'} domain={[0, 6]} />
            <Tooltip contentStyle={{ background: '#0F1923', border: '1px solid #ffffff20', borderRadius: 10, fontSize: 11 }} formatter={(v: any) => [v + '%', isAr ? 'معدل الاستنزاف' : 'Churn Rate']} />
            <Line type="monotone" dataKey="rate" stroke="#FF5A5F" strokeWidth={2.5} dot={{ fill: '#FF5A5F', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
        {/* risk table */}
        {highRisk.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-2">
            <p className="text-[10px] text-red-400 font-bold flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" />{isAr ? 'صالونات تحتاج تدخلاً عاجلاً:' : 'Salons requiring urgent intervention:'}</p>
            {highRisk.map(p => (
              <div key={p.id} className="flex items-center justify-between text-[11px] border-b border-red-500/10 pb-1.5">
                <span className="text-red-300 font-bold">{p.storeName}</span>
                <div className="flex gap-3 text-red-400/70">
                  <span>{p.subscriptionStatus}</span>
                  <span>{p.city}</span>
                  <span className="font-mono">{p.mrr} ر.س MRR</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revenue components */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">{isAr ? 'تفصيل مصادر الإيرادات' : 'Revenue Sources Breakdown'}</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={REVENUE_DATA} margin={{ top: 5, right: 5, bottom: 0, left: 0 }} stackOffset="expand">
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={v => (v / 1000) + 'k'} />
            <Tooltip content={<TIP />} />
            <Bar dataKey="subscriptions" name={isAr ? 'اشتراكات' : 'Subscriptions'} stackId="a" fill="#FF5A5F" radius={[0, 0, 0, 0]} />
            <Bar dataKey="commissions" name={isAr ? 'عمولات' : 'Commissions'} stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
