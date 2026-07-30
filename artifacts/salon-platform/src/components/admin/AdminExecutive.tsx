import { useState } from 'react';
import {
  TrendingUp, TrendingDown, Users, Building2, DollarSign, Activity,
  AlertTriangle, ArrowUpRight, ChevronRight, Minus,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import type { RegisteredProvider } from './adminTypes';

interface Props {
  providers: RegisteredProvider[];
  pendingCount: number;
  isAr: boolean;
  onNavigate: (section: string) => void;
}

// ── KPI Card — editorial style ─────────────────────────────────────────────
function KPICard({
  label, value, sub, accentColor, trend, onClick,
}: {
  label: string; value: string | number; sub?: string;
  accentColor: string; trend?: number; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative text-start w-full rounded-2xl p-5 transition-all duration-200"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
    >
      {/* Color bar — left/top accent */}
      <div className="absolute top-0 start-0 w-0.5 h-full rounded-s-2xl" style={{ backgroundColor: accentColor }} />

      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-[9px] font-black tracking-[0.16em] uppercase" style={{ color: '#9B968E' }}>
          {label}
        </p>
        {trend !== undefined && (
          <span
            className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md"
            style={{
              backgroundColor: trend > 0 ? '#ECFDF5' : trend < 0 ? '#FEF2F2' : '#F5F3EF',
              color: trend > 0 ? '#065F46' : trend < 0 ? '#991B1B' : '#6B6860',
            }}
          >
            {trend > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : trend < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
            {trend !== 0 && `${Math.abs(trend)}%`}
          </span>
        )}
      </div>

      <p className="text-[28px] font-black font-mono tracking-tight leading-none mb-1" style={{ color: '#1C1B18' }}>
        {value}
      </p>

      {sub && (
        <p className="text-[10px] mt-2" style={{ color: '#9B968E' }}>{sub}</p>
      )}

      {onClick && (
        <div className="absolute bottom-4 end-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="w-3.5 h-3.5" style={{ color: accentColor }} />
        </div>
      )}
    </button>
  );
}

// ── Stat pill ──────────────────────────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="flex-1 rounded-xl px-4 py-3 flex flex-col gap-1"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE6DF' }}
    >
      <p className="text-[9px] font-black tracking-widest uppercase" style={{ color: '#9B968E' }}>{label}</p>
      <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
    </div>
  );
}

// ── Chart card ─────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE6DF', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="mb-4">
        <h3 className="text-[13px] font-black tracking-tight" style={{ color: '#1C1B18' }}>{title}</h3>
        {subtitle && <p className="text-[10px] mt-0.5" style={{ color: '#9B968E' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-[11px] space-y-1" style={{ backgroundColor: '#1C1B18', border: '1px solid #2E2B24' }}>
      <p className="font-bold text-white mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</p>
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function AdminExecutive({ providers, pendingCount, isAr, onNavigate }: Props) {
  const [_period] = useState<'month' | 'quarter' | 'year'>('month');

  const activeProviders    = providers.filter(p => p.status === 'active').length;
  const trialProviders     = providers.filter(p => p.status === 'trial').length;
  const suspendedProviders = providers.filter(p => p.status === 'suspended').length;
  const totalMRR           = providers.reduce((a, p) => a + (p.subscriptionStatus !== 'cancelled' ? p.mrr : 0), 0);
  const highChurn          = providers.filter(p => p.churnRisk === 'high').length;
  const totalRevenue       = totalMRR + Math.round(providers.reduce((a, p) => a + p.totalSales * 0.10, 0));

  const months = isAr
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  const REVENUE_DATA = months.map((month, i) => {
    const factor = 0.6 + (i * 0.08);
    const subs   = Math.round(totalMRR * factor);
    const comms  = Math.round(providers.reduce((a, p) => a + p.totalSales * 0.10, 0) * factor / 6);
    return { month, subscriptions: subs, commissions: comms, total: subs + comms };
  });

  const CHURN_DATA = months.map((month, i) => ({
    month,
    rate: parseFloat((Math.max(1.0, (highChurn / Math.max(providers.length, 1)) * 100 * (1.4 - i * 0.08))).toFixed(1)),
  }));

  const TIER_DATA = [
    { name: 'Basic',      value: providers.filter(p => p.subscriptionTier === 'basic').length,      color: '#C4BFB7' },
    { name: 'Pro',        value: providers.filter(p => p.subscriptionTier === 'pro').length,         color: '#FF5A5F' },
    { name: 'Enterprise', value: providers.filter(p => p.subscriptionTier === 'enterprise').length,  color: '#0B1F14' },
  ].filter(t => t.value > 0);

  const TIER_COLORS = { Basic: '#C4BFB7', Pro: '#FF5A5F', Enterprise: '#0B1F14' };

  return (
    <div className="space-y-5">

      {/* ── Alert banner ──────────────────────────────────────────────────── */}
      {(pendingCount > 0 || highChurn > 0) && (
        <div className="flex flex-wrap gap-2">
          {pendingCount > 0 && (
            <button
              onClick={() => onNavigate('salons')}
              className="flex items-center gap-2 text-[11px] font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
              style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', color: '#78350F' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#FEF3C7'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#FFFBEB'}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              {pendingCount} {isAr ? 'طلب تفعيل بانتظار مراجعتك' : 'activation requests awaiting review'}
              <ArrowUpRight className="w-3 h-3 opacity-60" />
            </button>
          )}
          {highChurn > 0 && (
            <button
              onClick={() => onNavigate('bi')}
              className="flex items-center gap-2 text-[11px] font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
              style={{ backgroundColor: '#FFF1F2', border: '1px solid #FECDD3', color: '#881337' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#FFE4E6'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#FFF1F2'}
            >
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              {highChurn} {isAr ? 'صالون في خطر الإلغاء' : 'salons at churn risk'}
              <ArrowUpRight className="w-3 h-3 opacity-60" />
            </button>
          )}
        </div>
      )}

      {/* ── Primary KPIs ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label={isAr ? 'إجمالي الصالونات' : 'Total Salons'}
          value={providers.length}
          sub={`${activeProviders} ${isAr ? 'نشط' : 'active'} · ${trialProviders} ${isAr ? 'تجريبي' : 'trial'}`}
          accentColor="#FF5A5F"
          trend={22}
          onClick={() => onNavigate('salons')}
        />
        <KPICard
          label={isAr ? 'إيرادات الشهر' : 'Monthly Revenue'}
          value={`${totalRevenue.toLocaleString()}`}
          sub={isAr ? 'ر.س · اشتراكات + عمولات' : 'SAR · subs + commissions'}
          accentColor="#10b981"
          trend={14}
          onClick={() => onNavigate('billing')}
        />
        <KPICard
          label="MRR"
          value={`${totalMRR.toLocaleString()}`}
          sub={isAr ? 'ر.س · الإيراد المتكرر الشهري' : 'SAR · Monthly Recurring Revenue'}
          accentColor="#3b82f6"
          trend={14}
          onClick={() => onNavigate('finance')}
        />
        <KPICard
          label={isAr ? 'معدل الاستبقاء' : 'Retention Rate'}
          value="98.2%"
          sub={isAr ? 'معدل الاستنزاف 1.8%' : 'Churn rate 1.8%'}
          accentColor="#a855f7"
          trend={8}
          onClick={() => onNavigate('bi')}
        />
      </div>

      {/* ── Secondary stat pills ─────────────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        <StatPill label={isAr ? 'نشطة' : 'Active'}    value={activeProviders}    color="#059669" />
        <StatPill label={isAr ? 'تجريبية' : 'Trial'}   value={trialProviders}     color="#D97706" />
        <StatPill label={isAr ? 'موقوفة' : 'Suspended'} value={suspendedProviders} color="#DC2626" />
        <StatPill label={isAr ? 'معلقة' : 'Pending'}   value={pendingCount}       color="#FF5A5F" />
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue trend */}
        <div className="lg:col-span-2">
          <ChartCard
            title={isAr ? 'منحنى الإيرادات — آخر 6 أشهر' : 'Revenue Trend — Last 6 Months'}
            subtitle={isAr ? 'اشتراكات + عمولات منصة' : 'Subscriptions + Platform Commissions'}
          >
            <div className="flex items-center gap-4 mb-3 text-[9px] font-bold">
              <span className="flex items-center gap-1.5" style={{ color: '#FF5A5F' }}>
                <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: '#FF5A5F' }} />
                {isAr ? 'اشتراكات' : 'Subscriptions'}
              </span>
              <span className="flex items-center gap-1.5" style={{ color: '#10b981' }}>
                <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: '#10b981' }} />
                {isAr ? 'عمولات' : 'Commissions'}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={REVENUE_DATA} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gSub2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#FF5A5F" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#FF5A5F" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCom2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" strokeWidth={1} />
                <XAxis dataKey="month" tick={{ fill: '#9B968E', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9B968E', fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={v => v >= 1000 ? (v / 1000) + 'k' : String(v)} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="subscriptions" name={isAr ? 'اشتراكات' : 'Subscriptions'} stroke="#FF5A5F" strokeWidth={2} fill="url(#gSub2)" dot={false} />
                <Area type="monotone" dataKey="commissions"   name={isAr ? 'عمولات' : 'Commissions'}    stroke="#10b981" strokeWidth={2} fill="url(#gCom2)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Tier distribution */}
        <ChartCard
          title={isAr ? 'توزيع الباقات' : 'Plan Distribution'}
        >
          {TIER_DATA.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={TIER_DATA} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {TIER_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {TIER_DATA.map((t, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[10px]" style={{ color: '#6E6B64' }}>
                      <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: t.color }} />
                      {t.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#EAE6DF' }}>
                        <div className="h-full rounded-full" style={{ width: `${(t.value / Math.max(providers.length, 1)) * 100}%`, backgroundColor: t.color }} />
                      </div>
                      <span className="text-[10px] font-black font-mono w-5 text-end" style={{ color: '#1C1B18' }}>{t.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-[11px]" style={{ color: '#9B968E' }}>{isAr ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Churn + Health ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Churn bar chart */}
        <ChartCard
          title={isAr ? 'معدل الاستنزاف الشهري' : 'Monthly Churn Rate'}
          subtitle={isAr ? 'الهدف: أقل من 2%' : 'Target: below 2%'}
        >
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={CHURN_DATA} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" strokeWidth={1} />
              <XAxis dataKey="month" tick={{ fill: '#9B968E', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9B968E', fontSize: 10 }} axisLine={false} tickLine={false} width={30} tickFormatter={v => v + '%'} />
              <Tooltip content={<ChartTip />} formatter={(v: any) => [v + '%', isAr ? 'معدل الاستنزاف' : 'Churn']} />
              <Bar dataKey="rate" name={isAr ? 'معدل الاستنزاف' : 'Churn Rate'} radius={[3, 3, 0, 0]}>
                {CHURN_DATA.map((e, i) => (
                  <Cell key={i} fill={e.rate > 3 ? '#EF4444' : e.rate > 2 ? '#F59E0B' : '#10B981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Salons health snapshot */}
        <ChartCard
          title={isAr ? 'صحة الصالونات' : 'Salons Health'}
          subtitle={isAr ? 'لمحة سريعة على جميع الحسابات' : 'Quick overview of all accounts'}
        >
          <div className="space-y-0 max-h-[168px] overflow-y-auto -mx-1 px-1">
            {providers.length === 0 && (
              <p className="text-[11px] text-center py-8" style={{ color: '#9B968E' }}>
                {isAr ? 'لا توجد بيانات بعد' : 'No data yet'}
              </p>
            )}
            {providers.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2.5 gap-3"
                style={{ borderBottom: '1px solid #F0EDE8' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.status === 'active' ? '#10B981' : p.status === 'trial' ? '#F59E0B' : '#EF4444' }}
                  />
                  <span className="text-[11px] font-semibold truncate" style={{ color: '#1C1B18' }}>{p.storeName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide"
                    style={{
                      backgroundColor: p.churnRisk === 'low' ? '#ECFDF5' : p.churnRisk === 'medium' ? '#FFFBEB' : '#FFF1F2',
                      color: p.churnRisk === 'low' ? '#065F46' : p.churnRisk === 'medium' ? '#78350F' : '#881337',
                    }}
                  >
                    {p.churnRisk === 'low' ? (isAr ? 'آمن' : 'Safe') : p.churnRisk === 'medium' ? (isAr ? 'متوسط' : 'Med') : (isAr ? 'خطر' : 'Risk')}
                  </span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: '#9B968E' }}>
                    {p.mrr > 0 ? `${p.mrr}` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => onNavigate('salons')}
            className="w-full mt-3 text-center text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            style={{ color: '#FF5A5F', border: '1px solid #FFD4D5', backgroundColor: 'transparent' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#FFF1F2'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
          >
            {isAr ? 'إدارة جميع الصالونات' : 'Manage All Salons'}
            <ChevronRight className="w-3 h-3" />
          </button>
        </ChartCard>
      </div>
    </div>
  );
}
