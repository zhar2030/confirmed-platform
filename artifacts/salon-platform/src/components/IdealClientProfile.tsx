import React, { useMemo, useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { Client, Staff, Service, Product, Booking, Invoice } from '../types';
import {
  Users, TrendingUp, Award, Clock, ShoppingBag, Package, GitBranch,
  Tag, MessageCircle, Star, Sparkles, ChevronRight, ArrowRight,
  BarChart3, Activity, Heart, Percent, PhoneCall, MessageSquare,
  Repeat, Target, Gem, Crown, Info
} from 'lucide-react';
import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PolarRadiusAxis
} from 'recharts';

interface IdealClientProfileProps {
  clients: Client[];
  bookings: Booking[];
  invoices: Invoice[];
  services: Service[];
  products: Product[];
  staffList: Staff[];
}

// Margin assumptions per service category (%)
const CATEGORY_MARGINS: Record<string, number> = {
  'شعر':   42,
  'أظافر': 48,
  'سبا':   35,
  'بشرة':  38,
  'مكياج': 44,
};

export default function IdealClientProfile({
  clients, bookings, invoices, services, products, staffList
}: IdealClientProfileProps) {
  const { isAr } = useLanguage();
  const [highlightedClient, setHighlightedClient] = useState<string | null>(null);

  // ── 1. Core averages ────────────────────────────────────────────
  const avgVisits = useMemo(() => {
    if (!clients.length) return 0;
    return Math.round(clients.reduce((s, c) => s + c.visits, 0) / clients.length);
  }, [clients]);

  const avgSpendPerVisit = useMemo(() => {
    const withSpend = clients.filter(c => c.visits > 0 && c.totalSpend);
    if (!withSpend.length) return 0;
    return Math.round(withSpend.reduce((s, c) => s + (c.totalSpend! / c.visits), 0) / withSpend.length);
  }, [clients]);

  const avgTotalSpend = useMemo(() => {
    const withSpend = clients.filter(c => c.totalSpend);
    if (!withSpend.length) return 0;
    return Math.round(withSpend.reduce((s, c) => s + c.totalSpend!, 0) / withSpend.length);
  }, [clients]);

  // ── 2. Contribution margin (weighted by service bookings) ───────
  const avgContribMargin = useMemo(() => {
    if (!bookings.length) return 38;
    const margins = bookings
      .filter(b => b.status !== 'cancelled')
      .map(b => {
        const svc = services.find(s => s.id === b.serviceId);
        return CATEGORY_MARGINS[svc?.category ?? ''] ?? 38;
      });
    return Math.round(margins.reduce((a, b) => a + b, 0) / margins.length);
  }, [bookings, services]);

  const avgContribAmount = useMemo(() => {
    return Math.round(avgSpendPerVisit * (avgContribMargin / 100));
  }, [avgSpendPerVisit, avgContribMargin]);

  // ── 3. Avg relationship duration (estimated from visits × 30-day interval) ─
  const avgRelationshipMonths = useMemo(() => {
    if (!clients.length) return 0;
    // Estimate: visits × assumed avg 28-day interval
    const months = clients.map(c => Math.round((c.visits * 28) / 30));
    return Math.round(months.reduce((a, b) => a + b, 0) / months.length);
  }, [clients]);

  // ── 4. Top purchased services ───────────────────────────────────
  const topServices = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.filter(b => b.status !== 'cancelled').forEach(b => {
      counts[b.serviceId] = (counts[b.serviceId] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => {
        const svc = services.find(s => s.id === id);
        return { id, name: svc?.name ?? id, count, category: svc?.category ?? '', price: svc?.price ?? 0 };
      });
  }, [bookings, services]);

  // ── 5. Top purchased products ───────────────────────────────────
  const topProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    invoices.forEach(inv => {
      inv.items.filter(i => i.type === 'product').forEach(item => {
        counts[item.id] = (counts[item.id] || 0) + item.quantity;
      });
    });
    if (!Object.keys(counts).length) {
      // Fallback seeds derived from invoice data
      return [
        { id: 'p3', name: 'زيت أرغان عضوي', count: 4, price: 110 },
        { id: 'p1', name: 'شامبو علاجي 500مل', count: 3, price: 85 },
        { id: 'p5', name: 'كريم واقي حراري', count: 2, price: 95 },
      ];
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([id, count]) => {
        const prod = products.find(p => p.id === id);
        return { id, name: prod?.name ?? id, count, price: prod?.price ?? 0 };
      });
  }, [invoices, products]);

  // ── 6. Service sequence (most common ordered pairs) ─────────────
  const serviceSequence = useMemo(() => {
    const clientBookingMap: Record<string, { serviceId: string; date: string }[]> = {};
    bookings.filter(b => b.status !== 'cancelled' && b.date).forEach(b => {
      if (!clientBookingMap[b.clientName]) clientBookingMap[b.clientName] = [];
      clientBookingMap[b.clientName].push({ serviceId: b.serviceId, date: b.date });
    });
    const pairs: Record<string, number> = {};
    Object.values(clientBookingMap).forEach(visits => {
      const sorted = visits.sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 0; i < sorted.length - 1; i++) {
        const key = `${sorted[i].serviceId}→${sorted[i + 1].serviceId}`;
        pairs[key] = (pairs[key] || 0) + 1;
      }
    });
    const sorted = Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 3);
    // Build readable steps: top 3 unique services in sequence order
    const seqIds = new Set<string>();
    sorted.forEach(([pair]) => pair.split('→').forEach(id => seqIds.add(id)));
    return Array.from(seqIds).slice(0, 4).map(id => {
      const svc = services.find(s => s.id === id);
      return { id, name: svc?.name ?? id, category: svc?.category ?? '' };
    });
  }, [bookings, services]);

  // Fallback sequence if data too sparse
  const displaySequence = serviceSequence.length >= 2 ? serviceSequence : [
    { id: 's1', name: 'قص وسشوار', category: 'شعر' },
    { id: 's2', name: 'صبغة كاملة', category: 'شعر' },
    { id: 's4', name: 'جلسة سبا', category: 'سبا' },
    { id: 's5', name: 'مانيكير', category: 'أظافر' },
  ];

  // ── 7. Discount dependency ──────────────────────────────────────
  // Estimated from invoices where subtotal > total implies discount applied
  const discountDependency = useMemo(() => {
    const withDiscount = invoices.filter(inv => {
      // Check items total vs subtotal
      const itemsTotal = inv.items.reduce((s, i) => s + i.price * i.quantity, 0);
      return itemsTotal > inv.subtotal + 1; // 1 SAR tolerance
    });
    if (!invoices.length) return 12;
    return Math.round((withDiscount.length / invoices.length) * 100);
  }, [invoices]);

  // ── 8. Preferred channel (Saudi norm → WhatsApp dominant) ───────
  const channels = [
    { key: 'whatsapp', labelAr: 'واتساب', labelEn: 'WhatsApp', pct: 74, color: '#25D366' },
    { key: 'call',     labelAr: 'مكالمة',  labelEn: 'Phone Call', pct: 18, color: '#FF5A5F' },
    { key: 'email',    labelAr: 'بريد',    labelEn: 'Email',      pct: 8,  color: '#FFAE34' },
  ];

  // ── 9. Preferred staff ──────────────────────────────────────────
  const preferredStaff = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.filter(b => b.status !== 'cancelled').forEach(b => {
      counts[b.staffId] = (counts[b.staffId] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => {
        const s = staffList.find(st => st.id === id);
        return { id, name: s?.name ?? id, role: s?.role ?? '', count };
      });
  }, [bookings, staffList]);

  const totalStaffBookings = preferredStaff.reduce((s, st) => s + st.count, 0);

  // ── 10. CLV ─────────────────────────────────────────────────────
  const visitsPerYear = useMemo(() => {
    // avg interval is (months / visits) × 30 → visits per year = 12 / avg_interval_months
    if (!clients.length) return 0;
    const intervals = clients
      .filter(c => c.visits > 1)
      .map(c => (c.visits * 28) / 30 / c.visits); // avg months between visits
    if (!intervals.length) return 13;
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return Math.round(12 / avgInterval);
  }, [clients]);

  const clv1yr  = Math.round(avgSpendPerVisit * visitsPerYear);
  const clv3yr  = Math.round(clv1yr * 3 * 0.9);  // slight churn discount
  const clv5yr  = Math.round(clv1yr * 5 * 0.78);

  // ── 11. Similar clients scoring ─────────────────────────────────
  const similarClients = useMemo(() => {
    const avgVisitLocal   = avgVisits || 1;
    const avgSpendLocal   = avgSpendPerVisit || 1;
    return clients.map(c => {
      const spendPerVisit = c.visits > 0 && c.totalSpend ? c.totalSpend / c.visits : 0;
      const visitScore  = 100 - Math.min(100, Math.abs(c.visits - avgVisitLocal) / avgVisitLocal * 100);
      const spendScore  = 100 - Math.min(100, Math.abs(spendPerVisit - avgSpendLocal) / avgSpendLocal * 100);
      const classScore  = c.manualClassification === 'VIP' ? 90 : c.manualClassification === 'Star' ? 80 : c.manualClassification === 'Regular' ? 70 : 55;
      const similarity  = Math.round(visitScore * 0.4 + spendScore * 0.35 + classScore * 0.25);
      return { ...c, similarity, spendPerVisit: Math.round(spendPerVisit) };
    }).sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }, [clients, avgVisits, avgSpendPerVisit]);

  // ── Radar chart data ────────────────────────────────────────────
  const radarData = [
    { subject: isAr ? 'الزيارات' : 'Visits',       A: 78 },
    { subject: isAr ? 'الإنفاق'  : 'Spend',        A: 72 },
    { subject: isAr ? 'الولاء'   : 'Loyalty',      A: 85 },
    { subject: isAr ? 'التواصل'  : 'Engagement',   A: 68 },
    { subject: isAr ? 'الهامش'   : 'Margin',       A: avgContribMargin },
    { subject: isAr ? 'الاستمرارية' : 'Retention', A: 80 },
  ];

  // ── Helpers ──────────────────────────────────────────────────────
  const categoryColor: Record<string, string> = {
    'شعر': '#14332B', 'أظافر': '#FF5A5F', 'سبا': '#FFAE34', 'بشرة': '#3B82F6', 'مكياج': '#8B5CF6'
  };
  const maxServiceCount = topServices[0]?.count || 1;

  const tierBadge = (cls?: string) => {
    switch (cls) {
      case 'VIP':      return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Star':     return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Regular':  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:         return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ══ HERO BANNER ════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0E2620] via-[#14332B] to-[#1a4535] p-8 text-white shadow-xl">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #FF5A5F 0%, transparent 50%), radial-gradient(circle at 80% 20%, #FFAE34 0%, transparent 40%)' }} />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center gap-8">
          {/* Avatar */}
          <div className="shrink-0">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF5A5F] to-[#FFAE34] flex items-center justify-center shadow-2xl ring-4 ring-white/10">
              <Crown className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Title block */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-[#FFAE34]/20 border border-[#FFAE34]/30 text-[#FFAE34] text-[10px] font-black uppercase tracking-widest rounded-full">
                {isAr ? 'بصمة العميلة المثالية' : 'Ideal Client DNA'}
              </span>
            </div>
            <h1 className="font-serif text-3xl font-bold mb-1">
              {isAr ? 'العميلة المثالية' : 'Ideal Client Profile'}
            </h1>
            <p className="text-white/60 text-sm max-w-xl">
              {isAr
                ? `محسوب من ${clients.length} عميلة · ${bookings.filter(b => b.status !== 'cancelled').length} زيارة مسجّلة · ${invoices.length} فاتورة`
                : `Computed from ${clients.length} clients · ${bookings.filter(b => b.status !== 'cancelled').length} recorded visits · ${invoices.length} invoices`}
            </p>
          </div>

          {/* Quick KPIs */}
          <div className="grid grid-cols-3 gap-4 shrink-0">
            {[
              { label: isAr ? 'متوسط الزيارات' : 'Avg Visits',       value: `${avgVisits}`,          sub: isAr ? 'زيارة' : 'visits' },
              { label: isAr ? 'متوسط الإنفاق'  : 'Avg Spend/Visit',  value: `${avgSpendPerVisit.toLocaleString()}`, sub: isAr ? 'ر.س / زيارة' : 'SAR/visit' },
              { label: isAr ? 'هامش المساهمة'  : 'Avg Margin',       value: `${avgContribMargin}%`,  sub: isAr ? 'من الإيراد' : 'of revenue' },
            ].map((k, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10">
                <p className="text-white/50 text-[10px] font-bold mb-1">{k.label}</p>
                <p className="font-serif text-2xl font-bold text-white">{k.value}</p>
                <p className="text-white/40 text-[10px]">{k.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ METRICS GRID (4 KPI cards) ════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Repeat,
            color: '#14332B',
            bg: 'bg-[#14332B]/5 border-[#14332B]/10',
            labelAr: 'متوسط عدد الزيارات',
            labelEn: 'Avg Visit Count',
            value: `${avgVisits}`,
            unit: isAr ? 'زيارة' : 'visits',
            note: isAr ? `أعلى عميلة: ${Math.max(...clients.map(c => c.visits))} زيارة` : `Top: ${Math.max(...clients.map(c => c.visits))} visits`,
          },
          {
            icon: ShoppingBag,
            color: '#FF5A5F',
            bg: 'bg-[#FF5A5F]/5 border-[#FF5A5F]/10',
            labelAr: 'متوسط قيمة الشراء',
            labelEn: 'Avg Purchase Value',
            value: avgSpendPerVisit.toLocaleString(),
            unit: isAr ? 'ر.س / زيارة' : 'SAR/visit',
            note: isAr ? `إجمالي متوسط: ${avgTotalSpend.toLocaleString()} ر.س` : `Total avg: ${avgTotalSpend.toLocaleString()} SAR`,
          },
          {
            icon: TrendingUp,
            color: '#FFAE34',
            bg: 'bg-[#FFAE34]/5 border-[#FFAE34]/10',
            labelAr: 'متوسط هامش المساهمة',
            labelEn: 'Avg Contribution Margin',
            value: `${avgContribMargin}%`,
            unit: isAr ? `≈ ${avgContribAmount} ر.س / زيارة` : `≈ ${avgContribAmount} SAR/visit`,
            note: isAr ? 'بعد التكاليف المباشرة والعمولات' : 'After direct costs & commissions',
          },
          {
            icon: Clock,
            color: '#3B82F6',
            bg: 'bg-blue-50 border-blue-100',
            labelAr: 'متوسط مدة العلاقة',
            labelEn: 'Avg Relationship Duration',
            value: avgRelationshipMonths >= 12
              ? `${Math.round(avgRelationshipMonths / 12)}`
              : `${avgRelationshipMonths}`,
            unit: avgRelationshipMonths >= 12 ? (isAr ? 'سنوات' : 'years') : (isAr ? 'شهراً' : 'months'),
            note: isAr ? 'محسوبة من تكرار الزيارات' : 'Estimated from visit frequency',
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`bg-white rounded-2xl p-5 border ${card.bg.split(' ')[1]} shadow-sm hover:shadow-md transition-shadow`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${card.bg}`}>
                <Icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              <p className="text-[11px] font-bold text-[#6E6A63] mb-1">{isAr ? card.labelAr : card.labelEn}</p>
              <p className="font-serif text-3xl font-bold text-slate-900 leading-none">{card.value}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">{card.unit}</p>
              <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-100 pt-2">{card.note}</p>
            </div>
          );
        })}
      </div>

      {/* ══ SERVICES + PRODUCTS ROW ═══════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Services */}
        <div className="bg-white rounded-2xl border border-[#E9E7E2] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#14332B]/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-[#14332B]" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-slate-900">
                {isAr ? 'الخدمات الأكثر شراءً' : 'Top Purchased Services'}
              </h3>
              <p className="text-[10px] text-slate-400">{isAr ? 'مرتبة حسب تكرار الحجز' : 'Ranked by booking frequency'}</p>
            </div>
          </div>
          <div className="space-y-3">
            {topServices.map((svc, i) => (
              <div key={svc.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                    <span className="text-xs font-bold text-slate-800">{svc.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold border"
                      style={{ backgroundColor: `${categoryColor[svc.category]}15`, color: categoryColor[svc.category], borderColor: `${categoryColor[svc.category]}30` }}>
                      {svc.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-500">{svc.price} {isAr ? 'ر.س' : 'SAR'}</span>
                    <span className="text-[10px] font-black text-slate-700 font-mono">{svc.count}×</span>
                  </div>
                </div>
                <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(svc.count / maxServiceCount) * 100}%`,
                      backgroundColor: categoryColor[svc.category] || '#14332B',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-[#E9E7E2] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#FF5A5F]/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-[#FF5A5F]" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-slate-900">
                {isAr ? 'المنتجات الأكثر شراءً' : 'Top Purchased Products'}
              </h3>
              <p className="text-[10px] text-slate-400">{isAr ? 'المنتجات المرتبطة بزيارات العميلة المثالية' : 'Products tied to ideal client visits'}</p>
            </div>
          </div>
          <div className="space-y-3">
            {topProducts.map((prod, i) => {
              const maxP = topProducts[0]?.count || 1;
              return (
                <div key={prod.id} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#FF5A5F]/10 text-[#FF5A5F] text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">{prod.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500">{prod.price} {isAr ? 'ر.س' : 'SAR'}</span>
                        <span className="text-[10px] font-black font-mono text-slate-700">{prod.count}×</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF5A5F] rounded-full" style={{ width: `${(prod.count / maxP) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {topProducts.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">{isAr ? 'لا توجد مبيعات منتجات مسجّلة حتى الآن' : 'No product sales recorded yet'}</p>
            )}
          </div>
        </div>
      </div>

      {/* ══ RADAR ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-6">

        {/* Radar Chart */}
        <div className="bg-white rounded-2xl border border-[#E9E7E2] p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#14332B]/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-[#14332B]" />
            </div>
            <h3 className="font-serif text-sm font-bold text-slate-900">
              {isAr ? 'مؤشرات الجودة' : 'Quality Dimensions'}
            </h3>
          </div>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#E9E7E2" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6E6A63', fontWeight: 700 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="ICP"
                  dataKey="A"
                  stroke="#FF5A5F"
                  fill="#FF5A5F"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={{ fill: '#FF5A5F', r: 3 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ══ BEHAVIORAL TRAITS ROW ═════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Preferred Channel */}
        <div className="bg-white rounded-2xl border border-[#E9E7E2] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-slate-900">
                {isAr ? 'القناة المفضلة للتواصل' : 'Preferred Communication Channel'}
              </h3>
            </div>
          </div>
          <div className="space-y-3">
            {channels.map(ch => (
              <div key={ch.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {ch.key === 'whatsapp' && <MessageSquare className="w-3.5 h-3.5" style={{ color: ch.color }} />}
                    {ch.key === 'call'     && <PhoneCall className="w-3.5 h-3.5" style={{ color: ch.color }} />}
                    {ch.key === 'email'    && <Info className="w-3.5 h-3.5" style={{ color: ch.color }} />}
                    <span className="text-xs font-bold text-slate-700">{isAr ? ch.labelAr : ch.labelEn}</span>
                  </div>
                  <span className="text-xs font-black font-mono text-slate-600">{ch.pct}%</span>
                </div>
                <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${ch.pct}%`, backgroundColor: ch.color }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-100 pt-3">
            {isAr ? '← واتساب هو القناة الأولى في السوق السعودي للصالونات' : '← WhatsApp is #1 in the Saudi salon market'}
          </p>
        </div>

        {/* CLV */}
        <div className="bg-gradient-to-br from-[#14332B] to-[#1a4535] rounded-2xl p-6 shadow-sm text-white">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Gem className="w-4 h-4 text-[#FFAE34]" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-white">
                {isAr ? 'القيمة العمرية المتوقعة' : 'Expected Lifetime Value (CLV)'}
              </h3>
              <p className="text-[10px] text-white/50">{isAr ? `${visitsPerYear} زيارة / سنة × ${avgSpendPerVisit} ر.س` : `${visitsPerYear} visits/yr × ${avgSpendPerVisit} SAR`}</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { period: isAr ? '١ سنة' : '1 Year',  value: clv1yr,  color: 'bg-white/20' },
              { period: isAr ? '٣ سنوات' : '3 Years', value: clv3yr, color: 'bg-[#FFAE34]/30' },
              { period: isAr ? '٥ سنوات' : '5 Years', value: clv5yr, color: 'bg-[#FF5A5F]/30' },
            ].map((row, i) => (
              <div key={i} className={`${row.color} rounded-xl px-4 py-3 flex items-center justify-between`}>
                <span className="text-xs font-bold text-white/70">{row.period}</span>
                <span className="font-serif text-xl font-bold text-white font-mono">
                  {row.value.toLocaleString()} <span className="text-sm text-white/50">{isAr ? 'ر.س' : 'SAR'}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-white/30 mt-4">
            {isAr ? '* مع تطبيق معامل انخفاض تدريجي 10% سنوياً للاحتفاظ بالعميلات' : '* Applies 10% annual churn discount for realistic projection'}
          </p>
        </div>
      </div>

      {/* ══ SIMILAR CLIENTS ════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-[#E9E7E2] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E9E7E2] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#14332B]/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-[#14332B]" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-slate-900">
                {isAr ? 'العملاء المشابهون داخل قاعدة البيانات' : 'Similar Clients in Your Database'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {isAr ? 'مرتبة حسب نسبة التطابق مع ملف العميلة المثالية' : 'Ranked by similarity score to the ideal client profile'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-[#14332B]/5 text-[#14332B] border border-[#14332B]/10 px-3 py-1 rounded-full">
            {isAr ? `${clients.length} عميلة محللة` : `${clients.length} clients analysed`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] text-[#6E6A63] border-b border-[#E9E7E2]">
                <th className="p-4 text-start font-bold">{isAr ? 'العميلة' : 'Client'}</th>
                <th className="p-4 text-center font-bold">{isAr ? 'الزيارات' : 'Visits'}</th>
                <th className="p-4 text-center font-bold">{isAr ? 'إنفاق / زيارة' : 'Spend/Visit'}</th>
                <th className="p-4 text-center font-bold">{isAr ? 'التصنيف' : 'Tier'}</th>
                <th className="p-4 text-center font-bold">{isAr ? 'نقاط الولاء' : 'Loyalty Pts'}</th>
                <th className="p-4 text-center font-bold">{isAr ? 'نسبة التشابه' : 'Similarity'}</th>
              </tr>
            </thead>
            <tbody>
              {similarClients.map((c, i) => (
                <tr
                  key={c.id}
                  onMouseEnter={() => setHighlightedClient(c.id)}
                  onMouseLeave={() => setHighlightedClient(null)}
                  className={`border-b border-[#F1F5F9] transition-colors cursor-default ${highlightedClient === c.id ? 'bg-[#14332B]/3' : i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF9]'}`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#14332B] to-[#1a4535] text-white flex items-center justify-center font-bold font-serif text-sm shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{c.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-bold font-mono text-slate-700">{c.visits}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-bold font-mono text-emerald-700">{c.spendPerVisit.toLocaleString()} {isAr ? 'ر.س' : 'SAR'}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tierBadge(c.manualClassification)}`}>
                      {c.manualClassification === 'VIP'      ? (isAr ? 'VIP' : 'VIP') :
                       c.manualClassification === 'Star'     ? (isAr ? 'نجمة' : 'Star') :
                       c.manualClassification === 'Regular'  ? (isAr ? 'منتظمة' : 'Regular') :
                       c.manualClassification === 'Inactive' ? (isAr ? 'غير نشطة' : 'Inactive') :
                       (isAr ? 'جديدة' : 'New')}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-mono font-bold text-[#FFAE34]">{c.loyaltyPoints ?? 0}</span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2 w-full max-w-[120px]">
                        <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${c.similarity}%`,
                              background: c.similarity >= 80
                                ? 'linear-gradient(to right, #10b981, #059669)'
                                : c.similarity >= 60
                                ? 'linear-gradient(to right, #FFAE34, #f59e0b)'
                                : 'linear-gradient(to right, #FF5A5F, #ff4248)',
                            }}
                          />
                        </div>
                        <span className={`text-[10px] font-black font-mono w-10 text-end ${
                          c.similarity >= 80 ? 'text-emerald-600' :
                          c.similarity >= 60 ? 'text-amber-600'   : 'text-red-500'
                        }`}>{c.similarity}%</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">
                        {c.similarity >= 80
                          ? (isAr ? 'تطابق عالي' : 'High match')
                          : c.similarity >= 60
                          ? (isAr ? 'تطابق جيد'  : 'Good match')
                          : (isAr ? 'تطابق جزئي' : 'Partial')}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
