/**
 * AdminFinance — Platform financial center (Platform Owner only).
 * Shows real MRR/ARR from subscriptions, revenue breakdown, payout ledger.
 */
import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, ArrowUpRight, RefreshCw } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { RegisteredProvider, Toast } from './adminTypes';
import { getAdminHeaders } from '../../lib/adminAuth';

interface Props {
  providers: RegisteredProvider[];
  isAr: boolean;
  addToast: (t: Omit<Toast, 'id'>) => void;
}

const TIP = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 text-[11px] shadow-xl">
      <p className="font-bold text-slate-900 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {Number(p.value).toLocaleString()} {p.unit || ''}</p>
      ))}
    </div>
  );
};

export default function AdminFinance({ providers, isAr, addToast }: Props) {
  const [revenueHistory, setRevenueHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'mrr' | 'payouts'>('overview');

  useEffect(() => {
    fetch('/api/admin/stats', { headers: getAdminHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.monthlyRevenue) setRevenueHistory(data.monthlyRevenue);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Computed metrics from real providers
  const activeSubs    = providers.filter(p => p.subscriptionStatus === 'active');
  const mrr           = activeSubs.reduce((a, p) => a + p.mrr, 0);
  const arr           = mrr * 12;
  const totalGMV      = providers.reduce((a, p) => a + p.totalSales, 0);
  const platformComm  = Math.round(totalGMV * 0.10);
  const pendingPayout = providers.reduce((a, p) => a + p.pendingPayout, 0);
  const totalRevenue  = mrr + Math.round(platformComm / 12);

  const tierRevenue = [
    { name: isAr ? 'الأساسية' : 'Basic',      value: providers.filter(p => p.subscriptionTier === 'basic' && p.subscriptionStatus === 'active').reduce((a, p) => a + p.mrr, 0),      color: '#94a3b8' },
    { name: isAr ? 'الاحترافية' : 'Pro',       value: providers.filter(p => p.subscriptionTier === 'pro' && p.subscriptionStatus === 'active').reduce((a, p) => a + p.mrr, 0),         color: '#FF5A5F' },
    { name: isAr ? 'المؤسسية' : 'Enterprise', value: providers.filter(p => p.subscriptionTier === 'enterprise' && p.subscriptionStatus === 'active').reduce((a, p) => a + p.mrr, 0),   color: '#14332B' },
  ].filter(t => t.value > 0);

  const chartData = revenueHistory.map((r: any) => ({
    month: new Date(r.month).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short' }),
    revenue: Number(r.revenue).toFixed(0),
    count: Number(r.count),
  }));

  const KPI = ({ label, value, sub, color, icon: Icon, trend }: any) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {trend !== undefined && (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${trend >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
            {trend >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black font-mono text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label={isAr ? 'MRR' : 'MRR'} value={mrr.toLocaleString() + ' ر.س'} sub={isAr ? 'إيراد متكرر شهري' : 'Monthly Recurring Revenue'} color="#FF5A5F" icon={TrendingUp} trend={14} />
        <KPI label={isAr ? 'ARR' : 'ARR'} value={arr.toLocaleString() + ' ر.س'} sub={isAr ? 'إيراد متكرر سنوي' : 'Annual Recurring Revenue'} color="#3b82f6" icon={DollarSign} trend={14} />
        <KPI label={isAr ? 'عمولات المنصة' : 'Platform Commissions'} value={platformComm.toLocaleString() + ' ر.س'} sub={isAr ? '10% من GMV الكلي' : '10% of total GMV'} color="#10b981" icon={ArrowUpRight} trend={8} />
        <KPI label={isAr ? 'معلق للصرف' : 'Pending Payouts'} value={pendingPayout.toLocaleString() + ' ر.س'} sub={isAr ? 'لصرفه للصالونات' : 'To be paid to salons'} color="#f59e0b" icon={CreditCard} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { id: 'overview', ar: 'نظرة عامة', en: 'Overview' },
          { id: 'mrr', ar: 'تحليل الاشتراكات', en: 'Subscription Analysis' },
          { id: 'payouts', ar: 'سجل المدفوعات', en: 'Payout Ledger' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer -mb-px ${tab === t.id ? 'border-[#FF5A5F] text-[#FF5A5F]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {isAr ? t.ar : t.en}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Revenue chart from real DB */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{isAr ? 'إيرادات الفواتير — آخر 6 أشهر' : 'Invoice Revenue — Last 6 Months'}</h3>
                  <p className="text-[10px] text-slate-500">{loading ? (isAr ? 'جاري التحميل...' : 'Loading...') : (isAr ? 'من قاعدة البيانات الفعلية' : 'From real database')}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF5A5F" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FF5A5F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={55} tickFormatter={v => Number(v) > 999 ? (Number(v) / 1000).toFixed(0) + 'k' : v} />
                  <Tooltip content={<TIP />} />
                  <Area type="monotone" dataKey="revenue" name={isAr ? 'الإيرادات (ر.س)' : 'Revenue (SAR)'} stroke="#FF5A5F" strokeWidth={2} fill="url(#gRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Tier MRR distribution */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">{isAr ? 'MRR حسب الباقة' : 'MRR by Plan'}</h3>
              {tierRevenue.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={tierRevenue} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                        {tierRevenue.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [Number(v).toLocaleString() + ' ر.س', '']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {tierRevenue.map((t, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px]">
                        <span className="flex items-center gap-2 text-slate-500"><span className="w-2 h-2 rounded-full" style={{ background: t.color }} />{t.name}</span>
                        <span className="font-black text-slate-900 font-mono">{t.value.toLocaleString()} ر.س</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-32 text-slate-400 text-xs">{isAr ? 'لا توجد اشتراكات نشطة' : 'No active subscriptions'}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MRR Analysis Tab */}
      {tab === 'mrr' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { l: isAr ? 'اشتراكات نشطة' : 'Active Subscriptions', v: activeSubs.length, c: '#10b981' },
              { l: isAr ? 'متوسط MRR/صالون' : 'Avg MRR/Salon',        v: activeSubs.length ? Math.round(mrr / activeSubs.length) + ' ر.س' : '—', c: '#3b82f6' },
              { l: isAr ? 'متوقع انتهاء الاشتراك' : 'Overdue',          v: providers.filter(p => p.subscriptionStatus === 'overdue').length, c: '#ef4444' },
            ].map((k, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black font-mono" style={{ color: k.c }}>{k.v}</p>
                <p className="text-[10px] text-slate-500 font-bold mt-1">{k.l}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4 text-start">{isAr ? 'الصالون' : 'Salon'}</th>
                  <th className="p-4 text-center">{isAr ? 'الباقة' : 'Plan'}</th>
                  <th className="p-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-4 text-center">MRR</th>
                  <th className="p-4 text-center">{isAr ? 'خطر الإلغاء' : 'Churn Risk'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {providers.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">{p.storeName}</td>
                    <td className="p-4 text-center"><span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FF5A5F]/10 text-[#FF5A5F]">{p.subscriptionTier.toUpperCase()}</span></td>
                    <td className="p-4 text-center"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-600' : p.subscriptionStatus === 'trial' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>{p.subscriptionStatus}</span></td>
                    <td className="p-4 text-center font-mono text-slate-900">{p.mrr > 0 ? p.mrr + ' ر.س' : isAr ? 'مؤسسة' : 'Ent.'}</td>
                    <td className="p-4 text-center"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.churnRisk === 'low' ? 'bg-emerald-100 text-emerald-600' : p.churnRisk === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>{p.churnRisk === 'low' ? (isAr ? 'آمن' : 'Low') : p.churnRisk === 'medium' ? (isAr ? 'متوسط' : 'Mid') : (isAr ? 'خطر' : 'High')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payouts Tab */}
      {tab === 'payouts' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">{isAr ? `إجمالي معلق للصرف: ${pendingPayout.toLocaleString()} ريال من ${providers.filter(p => p.pendingPayout > 0).length} صالون.` : `Total pending: SAR ${pendingPayout.toLocaleString()} across ${providers.filter(p => p.pendingPayout > 0).length} salons.`}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4 text-start">{isAr ? 'الصالون' : 'Salon'}</th>
                  <th className="p-4 text-center">{isAr ? 'GMV' : 'GMV'}</th>
                  <th className="p-4 text-center">{isAr ? 'عمولة 10%' : 'Comm 10%'}</th>
                  <th className="p-4 text-center">{isAr ? 'معلق' : 'Pending'}</th>
                  <th className="p-4 text-center">{isAr ? 'مدفوع' : 'Paid'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {providers.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">{p.storeName}</td>
                    <td className="p-4 text-center font-mono text-slate-700">{p.totalSales.toLocaleString()}</td>
                    <td className="p-4 text-center font-mono text-emerald-600">{Math.round(p.totalSales * 0.1).toLocaleString()}</td>
                    <td className="p-4 text-center font-mono"><span className={p.pendingPayout > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>{p.pendingPayout.toLocaleString()}</span></td>
                    <td className="p-4 text-center font-mono text-slate-500">{p.paidOut.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
