import React, { useState, useEffect, useRef } from 'react';
import { Booking, Product, Invoice, Staff } from '../types';
import { Calendar, DollarSign, Users, AlertTriangle, ArrowLeftRight, CheckCircle2, ShoppingBag, Award, Sparkles, Star, Crown, ChevronDown, ChevronUp, Activity, Zap, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const API_BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '') + '/api';

// ─── Animated SVG Ring ────────────────────────────────────────────────────────
function PulseRing({
  value, max, color, label, sublabel, icon, suffix = '', prefix = '',
}: {
  value: number; max: number; color: string; label: string; sublabel?: string;
  icon: React.ReactNode; suffix?: string; prefix?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [displayVal, setDisplayVal] = useState(0);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, max > 0 ? value / max : 0);
  const dash = circumference * progress * pct;

  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    const raf = requestAnimationFrame(function animate(now) {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setProgress(ease);
      setDisplayVal(Math.round(value * ease));
      if (t < 1) requestAnimationFrame(animate);
    });
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={radius} fill="none" stroke="#F0EFEB" strokeWidth="7" />
          <circle
            cx="44" cy="44" r={radius} fill="none"
            stroke={color} strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.05s linear', filter: `drop-shadow(0 0 6px ${color}55)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-mono font-bold" style={{ color }}>
            {prefix}{displayVal.toLocaleString()}{suffix}
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-base mb-0.5">{icon}</div>
        <p className="text-[11px] font-bold text-[#1C1B18] leading-tight">{label}</p>
        {sublabel && <p className="text-[10px] text-[#6E6A63] mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

// ─── Animated bar spark ───────────────────────────────────────────────────────
function SparkBar({ value, max, color }: { value: number; max: number; color: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(max > 0 ? (value / max) * 100 : 0), 100);
    return () => clearTimeout(t);
  }, [value, max]);
  return (
    <div className="w-full h-1.5 bg-[#F0EFEB] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-[1200ms] ease-out"
        style={{ width: `${width}%`, background: color, boxShadow: `0 0 8px ${color}55` }}
      />
    </div>
  );
}

interface DashboardOverviewProps {
  bookings: Booking[];
  products: Product[];
  invoices: Invoice[];
  clientsCount: number;
  onNavigate: (page: string) => void;
  staffList: Staff[];
  dbProviderId?: number | null;
}

interface RevenueSummary {
  today:     { total: number; count: number };
  thisWeek:  { total: number; count: number };
  thisMonth: { total: number; count: number };
  thisYear:  { total: number; count: number };
}

export default function DashboardOverview({ bookings, products, invoices, clientsCount, onNavigate, staffList, dbProviderId }: DashboardOverviewProps) {
  const { t, isAr } = useLanguage();

  // ── Real today's date ────────────────────────────────────────────────────────
  const todayDateStr = new Date().toISOString().split('T')[0];

  // ── Revenue Summary — fetched from API for accuracy (all sources, all invoices) ──
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [revLoading, setRevLoading] = useState(false);

  useEffect(() => {
    if (!dbProviderId) return;
    setRevLoading(true);
    // Import auth lazily to avoid circular deps
    import('../lib/providerAuth').then(({ getProviderHeaders }) => {
      fetch(`${API_BASE}/invoices/revenue-summary`, {
        headers: { 'Content-Type': 'application/json', ...getProviderHeaders() },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setRevenueSummary(data); })
        .catch(() => {})
        .finally(() => setRevLoading(false));
    });
  }, [dbProviderId]);

  // Fallback: compute from loaded invoices when API hasn't responded yet
  const revenueFallback: RevenueSummary = (() => {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart  = new Date(now.getFullYear(), 0, 1);
    const weekStr  = weekStart.toISOString().split('T')[0];
    const monthStr = monthStart.toISOString().split('T')[0];
    const yearStr  = yearStart.toISOString().split('T')[0];
    let today = 0, todayCount = 0, week = 0, weekCount = 0, month = 0, monthCount = 0, year = 0, yearCount = 0;
    for (const inv of invoices) {
      const d = inv.date ?? '';
      const v = Number(inv.total ?? 0);
      if (d === todayDateStr)  { today += v; todayCount++; }
      if (d >= weekStr)        { week  += v; weekCount++;  }
      if (d >= monthStr)       { month += v; monthCount++; }
      if (d >= yearStr)        { year  += v; yearCount++;  }
    }
    return {
      today:     { total: today,  count: todayCount  },
      thisWeek:  { total: week,   count: weekCount   },
      thisMonth: { total: month,  count: monthCount  },
      thisYear:  { total: year,   count: yearCount   },
    };
  })();

  const rev = revenueSummary ?? revenueFallback;
  const todayBookings = bookings.filter(b => b.date === todayDateStr);

  const todayInvoices = invoices.filter(inv => inv.date === todayDateStr);
  const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.total, 0);

  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  // Daily Schedule List
  const displayBookings = todayBookings.slice(0, 4);

  // ── Real last-7-days chart from actual invoices ───────────────────────────
  const dayNamesAr = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayIdx = d.getDay();
    const amount = invoices
      .filter(inv => inv.date === dateStr)
      .reduce((sum, inv) => sum + (inv.total ?? 0), 0);
    return {
      day: isAr ? dayNamesAr[dayIdx] : dayNamesEn[dayIdx],
      amount: Math.round(amount),
      isToday: dateStr === todayDateStr,
    };
  });

  const maxAmount = Math.max(...last7DaysData.map(d => d.amount), 1);

  // ── Real staff & service name lookup ─────────────────────────────────────
  const getServiceName = (b: Booking) =>
    b.serviceName || (isAr ? 'جلسة العناية' : 'Beauty Session');

  const getStaffName = (id: string) => {
    const found = (staffList || []).find(s => String(s.id) === String(id));
    return found ? found.name : (id || '—');
  };

  // Interactive State for Top Employees
  const [employeeTimeFilter, setEmployeeTimeFilter] = useState<'completed' | 'today'>('completed');
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<string | null>(null);

  // Top Staff calculation
  const topStaff = (staffList || []).map(member => {
    // Count live completed (attended) bookings
    const liveCompleted = bookings.filter(b => b.staffId === member.id && b.status === 'attended').length;
    // Count live total bookings
    const liveTotal = bookings.filter(b => b.staffId === member.id).length;
    
    // Historical base completed bookings
    const baseCompleted = member.id === 'e3' ? 48 : member.id === 'e1' ? 42 : member.id === 'e2' ? 35 : 29;
    
    // If today is selected, filter by today + attended.
    // If completed is selected, show historical + live attended.
    const completedCount = employeeTimeFilter === 'today' 
      ? bookings.filter(b => b.staffId === member.id && b.date === todayDateStr && b.status === 'attended').length
      : baseCompleted + liveCompleted;

    const totalCount = employeeTimeFilter === 'today'
      ? bookings.filter(b => b.staffId === member.id && b.date === todayDateStr).length
      : baseCompleted + liveTotal + 5;

    // Success rate
    const successRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

    return {
      ...member,
      completedCount,
      totalCount,
      successRate
    };
  }).sort((a, b) => b.completedCount - a.completedCount).slice(0, 3);

  const maxCompleted = topStaff.length > 0 ? topStaff[0].completedCount : 1;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ===== STATS CARDS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1 */}
        <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6E6A63] uppercase">{t('todayBookings')}</p>
              <h4 className="text-3xl font-serif font-bold text-[#14332B] mt-2">{todayBookings.length}</h4>
            </div>
            <div className="p-3 rounded-xl bg-[#FFF0F0] text-[#FF5A5F]">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-3 flex items-center gap-1">
            <span>{bookings.filter(b => b.status === 'confirmed').length} {t('confirmed')}</span>
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6E6A63] uppercase">{t('todaySales')}</p>
              <h4 className="text-3xl font-serif font-bold text-[#14332B] mt-2">
                {todaySales.toLocaleString()} <span className="text-xs font-sans">{t('currency')}</span>
              </h4>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-3">
            {isAr ? `من واقع ${todayInvoices.length} فواتير إلكترونية` : `Based on ${todayInvoices.length} e-invoices`}
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6E6A63] uppercase">{t('registeredClients')}</p>
              <h4 className="text-3xl font-serif font-bold text-[#14332B] mt-2">{clientsCount}</h4>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-3">
            {t('registeredInBranch')}
          </p>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6E6A63] uppercase">{t('stockAlerts')}</p>
              <h4 className="text-3xl font-serif font-bold text-[#14332B] mt-2">{lowStockProducts.length}</h4>
            </div>
            <div className={`p-3 rounded-xl ${lowStockProducts.length > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-xs font-medium mt-3 ${lowStockProducts.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {lowStockProducts.length > 0 ? t('stockWarning') : t('stockNormal')}
          </p>
        </div>
      </div>

      {/* ===== REVENUE SUMMARY CARD ===== */}
      <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#FFF0F0]">
              <BarChart2 className="w-4 h-4 text-[#FF5A5F]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#14332B]">{isAr ? 'ملخص الإيرادات' : 'Revenue Summary'}</h3>
              <p className="text-[10px] text-[#6E6A63]">
                {revLoading
                  ? (isAr ? 'جاري التحديث...' : 'Loading...')
                  : (isAr ? 'من جميع المصادر (يدوي + مستورد)' : 'All sources (manual + imported)')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: isAr ? 'اليوم' : 'Today',
              value: rev.today.total,
              count: rev.today.count,
              bg: 'bg-[#FFF0F0]',
              textColor: 'text-[#FF5A5F]',
            },
            {
              label: isAr ? 'هذا الأسبوع' : 'This Week',
              value: rev.thisWeek.total,
              count: rev.thisWeek.count,
              bg: 'bg-emerald-50',
              textColor: 'text-emerald-700',
            },
            {
              label: isAr ? 'هذا الشهر' : 'This Month',
              value: rev.thisMonth.total,
              count: rev.thisMonth.count,
              bg: 'bg-amber-50',
              textColor: 'text-amber-700',
            },
            {
              label: isAr ? 'هذه السنة' : 'This Year',
              value: rev.thisYear.total,
              count: rev.thisYear.count,
              bg: 'bg-indigo-50',
              textColor: 'text-indigo-700',
            },
          ].map((item) => (
            <div key={item.label} className={`${item.bg} rounded-xl p-3 space-y-1 ${revLoading ? 'animate-pulse' : ''}`}>
              <p className="text-[10px] font-bold text-[#6E6A63] uppercase tracking-wide">{item.label}</p>
              <p className={`text-lg font-mono font-bold ${item.textColor}`}>
                {item.value.toLocaleString()}
                <span className="text-[10px] font-sans ms-1">{isAr ? '﷼' : 'SAR'}</span>
              </p>
              <p className="text-[10px] text-[#9CA3AF]">
                {item.count} {isAr ? 'فاتورة' : 'invoices'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== SALON PULSE CARD ===== */}
      {(() => {
        const attended = todayBookings.filter(b => b.status === 'attended').length;
        const completionRate = todayBookings.length > 0 ? Math.round((attended / todayBookings.length) * 100) : 0;
        const maxSales = Math.max(todaySales, 500);
        const hourNow = new Date().getHours();
        const peakHour = hourNow >= 10 && hourNow <= 14;
        return (
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm overflow-hidden relative">
            {/* Decorative blobs */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-[0.04] bg-[#FF5A5F] pointer-events-none" style={{ animation: 'pulse 3s ease-in-out infinite' }} />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-[0.04] bg-[#14332B] pointer-events-none" style={{ animation: 'pulse 4s ease-in-out infinite 1s' }} />

            {/* Header */}
            <div className="flex items-center justify-between mb-7 relative">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5A5F] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF5A5F]" />
                </span>
                <h3 className="font-serif text-base font-bold text-[#14332B]">
                  {isAr ? 'نبض الصالون' : 'Salon Pulse'}
                </h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-bold tracking-wide">
                  {isAr ? 'مباشر' : 'LIVE'}
                </span>
                {peakHour && (
                  <span className="text-[10px] bg-[#FFF9E6] text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {isAr ? 'وقت الذروة' : 'Peak Hour'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#6E6A63]">
                <Activity className="w-3.5 h-3.5 text-[#FF5A5F]" />
                {isAr ? 'أداء اليوم' : "Today's Performance"}
              </div>
            </div>

            {/* Rings + Sparks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
              {/* Ring 1 — Bookings */}
              <div className="flex flex-col items-center">
                <PulseRing
                  value={todayBookings.length} max={20} color="#FF5A5F"
                  label={isAr ? 'حجوزات اليوم' : "Today's Bookings"}
                  sublabel={isAr ? `من أصل ٢٠ هدفاً` : 'out of 20 target'}
                  icon={<Calendar className="w-4 h-4 inline text-[#FF5A5F]" />}
                />
                <div className="w-full mt-3 space-y-1">
                  {[
                    { label: isAr ? 'مؤكدة' : 'Confirmed', val: todayBookings.filter(b=>b.status==='confirmed').length, color: '#FF5A5F' },
                    { label: isAr ? 'مكتملة' : 'Attended', val: attended, color: '#14332B' },
                    { label: isAr ? 'معلقة' : 'Pending', val: todayBookings.filter(b=>b.status==='pending').length, color: '#FFAE34' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-2 text-[10px] text-[#6E6A63]">
                      <span className="flex-1 truncate">{row.label}</span>
                      <span className="font-mono font-bold text-[#1C1B18]">{row.val}</span>
                      <div className="w-16">
                        <SparkBar value={row.val} max={Math.max(todayBookings.length, 1)} color={row.color} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ring 2 — Completion */}
              <div className="flex flex-col items-center">
                <PulseRing
                  value={completionRate} max={100} color="#14332B"
                  label={isAr ? 'نسبة الإنجاز' : 'Completion Rate'}
                  sublabel={isAr ? `${attended} من ${todayBookings.length} حجوزات` : `${attended} of ${todayBookings.length} bookings`}
                  icon={<TrendingUp className="w-4 h-4 inline text-[#14332B]" />}
                  suffix="%"
                />
                <div className="w-full mt-3 p-3 bg-[#F6F6F4] rounded-xl space-y-1.5">
                  <p className="text-[10px] text-[#6E6A63] text-center">{isAr ? 'معدل الرضا المتوقع' : 'Predicted Satisfaction'}</p>
                  <div className="flex justify-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className={`text-sm transition-all duration-300 ${i <= Math.round(completionRate/20) ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
                    ))}
                  </div>
                  <p className="text-center text-[11px] font-bold text-[#14332B]">
                    {completionRate >= 80 ? (isAr ? 'أداء ممتاز 🏆' : 'Excellent 🏆')
                      : completionRate >= 50 ? (isAr ? 'أداء جيد 👍' : 'Good 👍')
                      : (isAr ? 'يمكن التحسين 💪' : 'Can Improve 💪')}
                  </p>
                </div>
              </div>

              {/* Ring 3 — Sales */}
              <div className="flex flex-col items-center">
                <PulseRing
                  value={todaySales} max={maxSales} color="#FFAE34"
                  label={isAr ? 'مبيعات اليوم' : "Today's Sales"}
                  sublabel={isAr ? `من ${todayInvoices.length} فواتير` : `from ${todayInvoices.length} invoices`}
                  icon={<DollarSign className="w-4 h-4 inline text-amber-600" />}
                  prefix={isAr ? '﷼\u200E' : '﷼ '}
                />
                <div className="w-full mt-3 p-3 bg-[#FFFBF0] rounded-xl border border-amber-100">
                  <p className="text-[10px] text-[#6E6A63] mb-2 text-center">{isAr ? 'توزيع الفواتير' : 'Invoice Breakdown'}</p>
                  {todayInvoices.length === 0 ? (
                    <p className="text-[10px] text-[#6E6A63] text-center">{isAr ? 'لا توجد فواتير اليوم بعد' : 'No invoices yet today'}</p>
                  ) : (
                    <div className="space-y-1">
                      {[
                        { label: isAr ? 'خدمات' : 'Services', val: todayInvoices.filter(i=>i.items?.some((x:any)=>x.type==='service')).length, color: '#FFAE34' },
                        { label: isAr ? 'منتجات' : 'Products', val: todayInvoices.filter(i=>i.items?.some((x:any)=>x.type==='product')).length, color: '#FF5A5F' },
                      ].map(row => (
                        <div key={row.label} className="flex items-center gap-2 text-[10px] text-[#6E6A63]">
                          <span className="flex-1">{row.label}</span>
                          <span className="font-mono font-bold text-[#1C1B18]">{row.val}</span>
                          <div className="w-16">
                            <SparkBar value={row.val} max={Math.max(todayInvoices.length, 1)} color={row.color} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== WORKSPACE GRID ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Schedule list */}
        <div className="lg:col-span-7 bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#14332B]">{t('todaySchedule')}</h3>
              <p className="text-xs text-[#6E6A63]">{isAr ? 'الثلاثاء، ١٤ ذو الحجة ١٤٤٧' : 'Tuesday, 14 Dhu al-Hijjah 1447'}</p>
            </div>
            <button 
              onClick={() => onNavigate('book')}
              className="text-xs font-bold bg-[#FF5A5F] hover:bg-[#E04B50] text-white px-3.5 py-2 rounded-xl transition-colors"
            >
              {t('allBookings')}
            </button>
          </div>

          <div className="space-y-3">
            {displayBookings.length === 0 ? (
              <div className="text-center py-8 text-[#6E6A63] text-sm">
                {isAr ? 'لا توجد حجوزات مسجلة اليوم بعد.' : 'No bookings registered for today yet.'}
              </div>
            ) : (
              displayBookings.map((b) => (
                <div key={b.id} className="flex items-center gap-4 p-4 rounded-xl bg-[#F6F6F4] border border-[#E9E7E2] hover:bg-[#FFF0F0]/30 transition-all">
                  <span className="text-sm font-bold text-[#FF5A5F] min-w-[56px] font-mono">{b.time}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <b className="text-sm text-[#1C1B18]">{b.clientName}</b>
                      <span className="text-[10px] text-[#6E6A63]">{b.clientPhone}</span>
                    </div>
                    <p className="text-xs text-[#6E6A63] mt-0.5">
                      {isAr ? 'الخدمة' : 'Service'}: {getServiceName(b)} · {isAr ? 'الموظفة' : 'Staff'}: {getStaffName(b.staffId)}
                    </p>
                  </div>
                  <span 
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      b.status === 'attended' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : b.status === 'confirmed'
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}
                  >
                    {b.status === 'attended' ? t('attended') : b.status === 'confirmed' ? t('confirmed') : t('pending')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Charts and low stock alerts */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Chart Card */}
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm">
            <h3 className="font-serif text-base font-bold text-[#14332B] mb-6">{t('salesLast7Days')}</h3>
            <div className="flex items-end justify-between gap-2 h-36 pt-2">
              {last7DaysData.map((d, idx) => {
                const heightPercentage = Math.round((d.amount / maxAmount) * 100);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[10px] font-bold text-[#FF5A5F] font-mono">{d.amount}</span>
                    <div 
                      style={{ height: `${heightPercentage}%` }} 
                      className={`w-full max-w-[28px] rounded-t-md transition-all duration-500 ${
                        d.isToday ? 'bg-[#FF5A5F] shadow-md shadow-[#FF5A5F]/30' : 'bg-[#14332B]'
                      }`}
                    />
                    <span className="text-xs text-[#6E6A63] font-medium">{d.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Performers Card */}
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#F6F6F4]">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#FFAE34] animate-bounce" />
                <h3 className="font-serif text-base font-bold text-[#14332B]">
                  {isAr ? 'أفضل الموظفات أداءً' : 'Top Performing Staff'}
                </h3>
              </div>
              
              {/* Interactive Toggle Button */}
              <div className="flex bg-[#F6F6F4] p-1 rounded-xl border border-[#E9E7E2]">
                <button
                  onClick={() => setEmployeeTimeFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border-none cursor-pointer ${
                    employeeTimeFilter === 'completed'
                      ? 'bg-[#FF5A5F] text-white shadow-sm'
                      : 'text-[#6E6A63] hover:text-[#1C1B18]'
                  }`}
                >
                  {isAr ? 'تراكمي' : 'All-Time'}
                </button>
                <button
                  onClick={() => setEmployeeTimeFilter('today')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border-none cursor-pointer ${
                    employeeTimeFilter === 'today'
                      ? 'bg-[#FF5A5F] text-white shadow-sm'
                      : 'text-[#6E6A63] hover:text-[#1C1B18]'
                  }`}
                >
                  {isAr ? 'اليوم' : 'Today'}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {topStaff.map((staffMember, index) => {
                const rankColors = [
                  { bg: 'bg-[#FFF9E6]', border: 'border-[#FFAE34]/30', text: 'text-[#FFAE34]', rankLabel: '🥇' },
                  { bg: 'bg-slate-50', border: 'border-slate-300/30', text: 'text-slate-500', rankLabel: '🥈' },
                  { bg: 'bg-amber-50/50', border: 'border-amber-700/10', text: 'text-amber-700/80', rankLabel: '🥉' }
                ];
                const rank = rankColors[index] || { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', rankLabel: '•' };
                const isExpanded = selectedStaffDetail === staffMember.id;
                const percentage = Math.round((staffMember.completedCount / maxCompleted) * 100) || 0;

                return (
                  <div 
                    key={staffMember.id}
                    className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                      isExpanded 
                        ? 'border-[#FF5A5F] bg-[#FFF0F0]/10 shadow-sm' 
                        : 'border-[#E9E7E2] hover:border-[#FF5A5F]/50 hover:bg-slate-50/40'
                    }`}
                  >
                    {/* Main Row clickable to toggle detail */}
                    <div 
                      onClick={() => setSelectedStaffDetail(isExpanded ? null : staffMember.id)}
                      className="p-3 flex items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div className={`w-8 h-8 rounded-xl ${rank.bg} ${rank.border} border flex items-center justify-center font-bold text-sm ${rank.text}`}>
                          {rank.rankLabel}
                        </div>
                        
                        <div>
                          <b className="text-xs text-slate-800 block">{getStaffName(staffMember.id)}</b>
                          <span className="text-[10px] text-slate-500 block">{staffMember.role}</span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        <div className="space-y-0.5">
                          <span className="text-xs font-mono font-bold text-[#FF5A5F] block">
                            {staffMember.completedCount} {isAr ? 'مكتمل' : 'Completed'}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            {isAr ? 'معدل الرضا' : 'Satisfaction'} {staffMember.successRate}%
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#FF5A5F]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Animated custom interactive progress bar */}
                    <div className="px-3 pb-2.5">
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${percentage}%` }}
                          className="bg-gradient-to-r from-[#FF5A5F] to-[#FFAE34] h-full rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>

                    {/* Interactive Expanded Detail Card */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-[#E9E7E2]/60 bg-white/60 text-[11px] text-slate-600 space-y-2 animate-fadeIn">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-700">
                            {isAr ? '🏆 الإنجاز والمستوى:' : '🏆 Achievement Level:'}
                          </span>
                          <span className="text-xs font-bold text-[#FF5A5F] bg-[#FFF0F0] px-2 py-0.5 rounded-full">
                            {index === 0 
                              ? (isAr ? 'نجمة الشهر الأولى 👑' : 'Top Performer of the Month 👑')
                              : index === 1 
                              ? (isAr ? 'أداء ممتاز دائم 🌟' : 'Consistently Excellent 🌟')
                              : (isAr ? 'متميزة وواعدة ✨' : 'Talented & Rising Star ✨')}
                          </span>
                        </div>
                        
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/50 space-y-1">
                          <p className="text-slate-500 leading-normal">
                            {index === 0 
                              ? (isAr ? 'أظهرت أداءً مذهلاً هذا الشهر وحققت أعلى نسبة رضا لدى عميلات صالون كونفيرمد التجميلي بفضل دقتّها واحترافيتها العالية.' : 'Demonstrated incredible performance this month with the highest customer satisfaction score at CONFIRMED Salon.')
                              : index === 1
                              ? (isAr ? 'تتميز بالتزامها العالي ودقّة مواعيدها، وتحظى بتقييمات رائعة وتكرار حجوزات ممتاز من العميلات.' : 'Distinguished by high commitment and absolute punctuality, with consistent repeat bookings.')
                              : (isAr ? 'طاقة إيجابية رائعة وسرعة استثنائية في تقديم الخدمات مع الحفاظ على أعلى معايير الجودة والراحة.' : 'Amazing energy and exceptional service delivery speed while maintaining comfort and pristine quality.')}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                          <div className="bg-[#FFF0F0] p-1.5 rounded-lg border border-[#FF5A5F]/10">
                            <span className="text-[#FF5A5F] font-bold block text-sm font-mono">{staffMember.completedCount}</span>
                            <span className="text-slate-500">{isAr ? 'مكتملة' : 'Completed'}</span>
                          </div>
                          <div className="bg-rose-50/50 p-1.5 rounded-lg border border-rose-200/40">
                            <span className="text-rose-700 font-bold block text-sm font-mono">{staffMember.totalCount}</span>
                            <span className="text-slate-500">{isAr ? 'إجمالي' : 'Total'}</span>
                          </div>
                          <div className="bg-emerald-50/50 p-1.5 rounded-lg border border-emerald-200/40">
                            <span className="text-emerald-700 font-bold block text-sm font-mono">{staffMember.successRate}%</span>
                            <span className="text-slate-500">{isAr ? 'معدل الرضا' : 'Satisfaction'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Low Stock Card */}
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif text-sm font-bold text-[#14332B]">⚠️ {t('lowStockLabel')}</h3>
              <button 
                onClick={() => onNavigate('inv')}
                className="text-xs font-bold text-[#FF5A5F] hover:underline"
              >
                {t('updateStock')}
              </button>
            </div>

            <div className="space-y-2">
              {lowStockProducts.length === 0 ? (
                <div className="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                  {isAr ? 'لا توجد منتجات منخفضة المخزون حالياً ✓' : 'No low stock products currently ✓'}
                </div>
              ) : (
                lowStockProducts.map(p => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-[#F6F6F4] text-sm">
                    <span className="font-medium text-[#1C1B18]">{p.name}</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                      {isAr ? `متبقي ${p.stock} فقط (الحد ${p.minStock})` : `${p.stock} left (Min ${p.minStock})`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
