import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../LanguageContext';
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Sparkles, BarChart3,
  Target, Award, Zap, Eye, EyeOff, Shield, RefreshCw, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, Minus, Bell, BellOff, Crown, Star, Info,
  DollarSign, Calendar, Users, Percent, Clock, Activity, Lightbulb, Lock,
  TrendingUpIcon, FlaskConical, Send, ThumbsUp, ThumbsDown, Play, RotateCcw,
  MessageSquare, ChevronRight, CheckCheck, XCircle, Loader2, Wand2, BadgeCheck,
  CircleAlert, Ban, ArrowRight, Layers, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';

// ─── AI Client (What-if Simulator) ────────────────────────────────────────────
let aiClient: GoogleGenAI | null = null;
const _aiKey = import.meta.env.VITE_GOOGLE_AI_KEY;
if (_aiKey) {
  try { aiClient = new GoogleGenAI({ apiKey: _aiKey }); } catch { /* no AI — mock used */ }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpiCard {
  id: string;
  labelAr: string;
  labelEn: string;
  myValue: number;
  marketAvg: number;
  marketTop25: number;
  unit: string;
  higherIsBetter: boolean;
  icon: React.ElementType;
  color: string;
  descAr: string;
  descEn: string;
}

interface PriceAlert {
  serviceAr: string;
  serviceEn: string;
  myPrice: number;
  marketAvg: number;
  marketMin: number;
  marketMax: number;
  category: string;
}

interface Alert {
  id: string;
  severity: 'high' | 'medium' | 'low' | 'positive';
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  actionAr: string;
  actionEn: string;
  dismissed: boolean;
}

interface ForecastPoint {
  monthAr: string;
  monthEn: string;
  myRevenue?: number;
  marketAvg?: number;
  myForecast?: number;
  marketForecast?: number;
}

interface TrendingService {
  nameAr: string;
  nameEn: string;
  growth: number;
  demand: 'rising' | 'stable' | 'falling';
  category: string;
  inYourSalon: boolean;
}

// ─── What-if Simulator Types ──────────────────────────────────────────────────

interface WhatIfImpact {
  metricAr: string;
  metricEn: string;
  emoji: string;
  currentValue: string;
  predictedValue: string;
  changePercent: number;
  positive: boolean;
  note?: { ar: string; en: string };
}

interface WhatIfRisk {
  ar: string;
  en: string;
  level: 'high' | 'medium' | 'low';
}

interface WhatIfAction {
  id: string;
  labelAr: string;
  labelEn: string;
  type: 'price_update' | 'staff_schedule' | 'service_add' | 'marketing' | 'settings';
}

interface WhatIfFollowup {
  ar: string;
  en: string;
  query: string; // the pre-filled query to run
}

interface WhatIfResult {
  scenarioAr: string;
  scenarioEn: string;
  summaryAr: string;
  summaryEn: string;
  impacts: WhatIfImpact[];
  overallConfidence: number;
  verdict: 'recommended' | 'caution' | 'not_recommended';
  verdictReasonAr: string;
  verdictReasonEn: string;
  risks: WhatIfRisk[];
  opportunities: Array<{ ar: string; en: string }>;
  actions: WhatIfAction[];
  followups: WhatIfFollowup[];
  benchmarkContext: { ar: string; en: string };
  timeHorizon: { ar: string; en: string };
}

interface WhatIfHistoryEntry {
  id: string;
  query: string;
  result: WhatIfResult;
  timestamp: string;
  appliedActions: string[];
}

// ─── Mock AI Analysis Engine ──────────────────────────────────────────────────

function detectScenario(query: string) {
  const q = query.toLowerCase();
  const hasPct = query.match(/(\d+)\s*%/);
  const pct = hasPct ? parseInt(hasPct[1]) : 10;
  const isArabic = /[\u0600-\u06FF]/.test(query);
  return {
    pct,
    isPriceIncrease: /(?:ارفع|زياد|رفع|أرفع|أزيد|increase|raise|higher|bump|rais).*(?:سعر|price|تسعير|pricing)/i.test(query) ||
                     /(?:سعر|price).*(?:ارفع|زياد|increase|raise)/i.test(query) || /10%|15%|20%/.test(query) && /(?:سعر|price|خدم)/i.test(query),
    isPriceDecrease: /(?:خفض|تخفيض|decrease|lower|reduce).*(?:سعر|price)/i.test(query),
    isHireStaff:     /(?:موظف|موظفة|حلاق|مصفف|stylist|hire|staff|توظيف|توظف|أضيف|أضاف|اضافة).*(?:جديد|إضافي|آخر|extra|another|new|add)/i.test(query) ||
                     /(?:توظيف|hire|hiring|اضافة موظف)/i.test(query),
    isMarketing:     /(?:تسويق|marketing|إعلان|campaign|حملة|adsبروموشن)/i.test(query),
    isAddService:    /(?:أضيف|إضافة|add).*(?:خدمة|service)/i.test(query),
    isReduceHours:   /(?:تقليل|تخفيض|reduce).*(?:ساعات|hours)/i.test(query),
    isLoyalty:       /(?:ولاء|loyalty|عروض|offers|خصم|discount)/i.test(query),
    isArabic,
    raw: query,
  };
}

function buildMockResult(query: string): WhatIfResult {
  const s = detectScenario(query);
  const { pct } = s;

  // ── Price Increase ──
  if (s.isPriceIncrease) {
    const revUp = +(pct * 0.72).toFixed(1);
    const bkDown = +(pct * 0.31).toFixed(1);
    const profitUp = +(pct * 0.95).toFixed(1);
    const conf = pct <= 10 ? 84 : pct <= 15 ? 76 : 63;
    const verdict: 'recommended' | 'caution' | 'not_recommended' = pct <= 10 ? 'recommended' : pct <= 20 ? 'caution' : 'not_recommended';
    return {
      scenarioAr: `رفع أسعار الخدمات بنسبة ${pct}%`,
      scenarioEn: `Increase service prices by ${pct}%`,
      summaryAr: `بناءً على بيانات ${MARKET_SEGMENT.poolSize} صالون مماثل في السوق، رفع الأسعار ${pct}% سيؤدي إلى زيادة الإيراد الإجمالي بنسبة ${revUp}% مع انخفاض طفيف في عدد الحجوزات يُعوَّض بارتفاع متوسط الفاتورة.`,
      summaryEn: `Based on data from ${MARKET_SEGMENT.poolSize} comparable salons, a ${pct}% price increase is projected to grow total revenue by ${revUp}% with a slight booking dip offset by higher invoice averages.`,
      impacts: [
        { metricAr: 'الإيراد الشهري', metricEn: 'Monthly Revenue', emoji: '💰', currentValue: '28,400 ر.س', predictedValue: `${Math.round(28400*(1+revUp/100)).toLocaleString()} ر.س`, changePercent: revUp, positive: true },
        { metricAr: 'صافي الربح', metricEn: 'Net Profit', emoji: '📈', currentValue: '8,520 ر.س', predictedValue: `${Math.round(8520*(1+profitUp/100)).toLocaleString()} ر.س`, changePercent: profitUp, positive: true },
        { metricAr: 'عدد الحجوزات', metricEn: 'Monthly Bookings', emoji: '📅', currentValue: '312 حجز', predictedValue: `${Math.round(312*(1-bkDown/100))} حجز`, changePercent: -bkDown, positive: false, note: { ar: 'بعض العملاء الحساسين للسعر قد ينتقلون', en: 'Price-sensitive clients may switch' } },
        { metricAr: 'متوسط الفاتورة', metricEn: 'Avg. Invoice', emoji: '🧾', currentValue: '91 ر.س', predictedValue: `${Math.round(91*(1+pct/100))} ر.س`, changePercent: pct, positive: true },
        { metricAr: 'ولاء العملاء', metricEn: 'Customer Loyalty', emoji: '❤️', currentValue: '76%', predictedValue: `${Math.round(76 - pct*0.12)}%`, changePercent: -(pct*0.12), positive: false, note: { ar: 'خطر خسارة شريحة صغيرة من العملاء', en: 'Risk of losing a small price-sensitive segment' } },
        { metricAr: 'إشغال الموظفات', metricEn: 'Staff Utilisation', emoji: '👩‍🔧', currentValue: '78%', predictedValue: `${Math.round(78 - bkDown*0.4)}%`, changePercent: -(bkDown*0.4), positive: false },
      ],
      overallConfidence: conf,
      verdict,
      verdictReasonAr: pct <= 10
        ? `أسعارك أدنى من متوسط السوق بـ 12%. رفع ${pct}% يعيدك لمستوى المنافسة مع تحسين هامش الربح بشكل ملحوظ.`
        : pct <= 20
        ? `الرفع قابل للتنفيذ لكن مع مخاطرة معتدلة على الاحتفاظ بالعملاء. يُنصح بالرفع التدريجي.`
        : `رفع ${pct}% قد يتسبب في خسارة حصة سوقية. السوق لا يتحمل هذا المستوى في فئتك.`,
      verdictReasonEn: pct <= 10
        ? `Your prices are 12% below market average. A ${pct}% increase realigns you competitively while meaningfully improving profit margin.`
        : pct <= 20
        ? `Feasible but carries moderate retention risk. A phased rollout is strongly advised.`
        : `A ${pct}% hike risks meaningful market share loss. Your segment benchmarks don't support this level.`,
      risks: [
        { ar: 'احتمال فقدان 8-12% من العملاء الأكثر حساسية للسعر', en: 'Potential loss of 8-12% price-sensitive customers', level: pct <= 10 ? 'low' : 'high' },
        { ar: 'منافسون قد يستغلون الفرق السعري في حملاتهم التسويقية', en: 'Competitors may exploit the price gap in their marketing', level: 'medium' },
        { ar: 'تراجع تقييمات "قيمة السعر" على منصات الحجز الخارجية', en: 'Potential drop in value-for-money ratings on booking platforms', level: 'low' },
      ],
      opportunities: [
        { ar: `زيادة هامش الربح الصافي من 30% إلى ${Math.round(30+profitUp*0.5)}% — أعلى من متوسط السوق (26%)`, en: `Net margin grows from 30% to ~${Math.round(30+profitUp*0.5)}% — above market avg (26%)` },
        { ar: 'الأسعار الأعلى تعزز الصورة الذهنية كصالون متميز وتجذب شريحة عالية الإنفاق', en: 'Higher prices reinforce premium positioning and attract high-spend clients' },
        { ar: 'الفرصة لإطلاق حزمة "قيمة مضافة" مع الرفع لتخفيف التأثير على الولاء', en: 'Opportunity to launch a value-add bundle alongside the increase to cushion loyalty impact' },
      ],
      actions: [
        { id: 'price_services', labelAr: 'تحديث أسعار الخدمات الآن', labelEn: 'Update service prices now', type: 'price_update' },
        { id: 'notify_vip', labelAr: 'إرسال إشعار للعملاء المميزين قبل التطبيق', labelEn: 'Notify VIP clients before rollout', type: 'marketing' },
      ],
      followups: [
        { ar: `ماذا يحدث لو رفعت الأسعار ${Math.max(5, pct-5)}% بدلاً من ${pct}%؟`, en: `What if I raise prices by ${Math.max(5,pct-5)}% instead of ${pct}%?`, query: `ماذا يحدث لو رفعت أسعار الخدمات ${Math.max(5,pct-5)}%؟` },
        { ar: 'ماذا يحدث لو رفعت فقط خدمات الشعر وأبقيت الأسعار الأخرى؟', en: 'What if I only raise hair service prices and keep others?', query: 'ماذا يحدث لو رفعت أسعار خدمات الشعر فقط بـ 10%؟' },
        { ar: 'ماذا لو أضفت برنامج ولاء لامتصاص تأثير رفع الأسعار؟', en: 'What if I add a loyalty program to offset the price increase impact?', query: 'ماذا يحدث لو أطلقت برنامج ولاء مع رفع الأسعار؟' },
      ],
      benchmarkContext: {
        ar: `متوسط السوق لخدماتك ${MARKET_SEGMENT.city}: 32,100 ر.س/شهر. أسعارك حالياً أدنى بـ 12% من المتوسط.`,
        en: `Market average for your service category in ${MARKET_SEGMENT.cityEn}: SAR 32,100/month. Your prices are currently 12% below average.`,
      },
      timeHorizon: { ar: 'التأثير الكامل خلال 30-60 يوماً من التطبيق', en: 'Full impact realized within 30-60 days of rollout' },
    };
  }

  // ── Hire Additional Staff ──
  if (s.isHireStaff) {
    return {
      scenarioAr: 'توظيف موظفة إضافية',
      scenarioEn: 'Hire an additional stylist',
      summaryAr: `إضافة موظفة جديدة ستزيد طاقة الصالون الاستيعابية بنسبة 25-30%، مع تكلفة ثابتة إضافية تستلزم الوصول لمستوى إشغال 70%+ لتحقيق التعادل خلال الشهر الثاني.`,
      summaryEn: `Adding a new stylist increases your salon capacity by 25-30%, with a fixed cost that requires reaching 70%+ utilization to break even — typically achievable by month two.`,
      impacts: [
        { metricAr: 'الإيراد الشهري (بعد 60 يوم)', metricEn: 'Monthly Revenue (after 60d)', emoji: '💰', currentValue: '28,400 ر.س', predictedValue: '33,650 ر.س', changePercent: 18.5, positive: true, note: { ar: 'يستغرق شهرين لتحقيق الإيراد الكامل', en: 'Takes ~2 months to reach full contribution' } },
        { metricAr: 'عدد الحجوزات', metricEn: 'Monthly Bookings', emoji: '📅', currentValue: '312 حجز', predictedValue: '381 حجز', changePercent: 22.1, positive: true },
        { metricAr: 'صافي الربح (الشهر الأول)', metricEn: 'Net Profit (Month 1)', emoji: '📊', currentValue: '8,520 ر.س', predictedValue: '6,840 ر.س', changePercent: -19.7, positive: false, note: { ar: 'الشهر الأول يتضمن فترة رمب-أب', en: 'Month 1 includes ramp-up period' } },
        { metricAr: 'إشغال الموظفات', metricEn: 'Staff Utilisation', emoji: '👩‍🔧', currentValue: '78%', predictedValue: '65%', changePercent: -16.7, positive: false, note: { ar: 'يعود للارتفاع بحلول الشهر الثالث', en: 'Recovers by month 3' } },
        { metricAr: 'وقت انتظار العميل', metricEn: 'Client Wait Time', emoji: '⏱️', currentValue: '18 دقيقة', predictedValue: '11 دقيقة', changePercent: -38.9, positive: true },
        { metricAr: 'ولاء العملاء', metricEn: 'Customer Loyalty', emoji: '❤️', currentValue: '76%', predictedValue: '79%', changePercent: 3.9, positive: true },
      ],
      overallConfidence: 74,
      verdict: 'caution',
      verdictReasonAr: 'القرار سليم على المدى المتوسط لكنه يتطلب تخطيطاً جيداً. الشهر الأول سيكون بأرباح أقل بسبب تكلفة التوظيف وفترة البناء. من المهم أن يكون لديك قاعدة عملاء قائمة بقائمة انتظار.',
      verdictReasonEn: 'Sound medium-term decision but requires solid planning. Month 1 profits will dip due to fixed hiring costs and ramp-up. Most critical factor: do you have a waiting list or consistent overflow demand?',
      risks: [
        { ar: 'خسارة مؤقتة في الربحية خلال الشهر الأول (تكلفة التوظيف + فترة الرمب-أب)', en: 'Temporary profitability dip in month 1 (hiring cost + ramp-up period)', level: 'high' },
        { ar: 'إذا لم تكن لديك قائمة انتظار، قد لا تصل للإشغال المطلوب في الشهر الثاني', en: 'Without an existing waitlist, reaching required utilization by month 2 is uncertain', level: 'medium' },
        { ar: 'تعارض محتمل في الجداول أو التوقعات بين الموظفات الجديدة والقائمات', en: 'Potential scheduling conflicts or expectation mismatches with existing staff', level: 'low' },
      ],
      opportunities: [
        { ar: 'قبول 70+ حجز إضافي شهرياً كانت تُرفض سابقاً بسبب عدم التوفر', en: 'Accept 70+ additional monthly bookings previously turned away due to unavailability' },
        { ar: 'إضافة خدمات تتطلب وقتاً أطول (كيراتين، تلوين متقدم) كانت تؤثر على الجدول', en: 'Add long-duration services (keratin, advanced color) that previously strained the schedule' },
        { ar: 'تحسين ولاء العميل بتقليص وقت الانتظار — أحد أعلى مسببات تبديل الصالون', en: 'Improve loyalty by cutting wait time — the #1 driver of salon switching in the market' },
      ],
      actions: [
        { id: 'post_job', labelAr: 'فتح طلب توظيف من لوحة الموظفين', labelEn: 'Post job opening via Staff module', type: 'staff_schedule' },
        { id: 'waitlist_check', labelAr: 'مراجعة قائمة الانتظار والحجوزات المرفوضة', labelEn: 'Review waitlist and declined bookings', type: 'settings' },
      ],
      followups: [
        { ar: 'ماذا يحدث لو وظّفت موظفتين إضافيتين بدلاً من واحدة؟', en: 'What if I hire 2 additional stylists instead of one?', query: 'ماذا يحدث لو وظفت موظفتين إضافيتين في نفس الوقت؟' },
        { ar: 'ما تأثير تعيين موظفة بدوام جزئي (عطل نهاية الأسبوع فقط)؟', en: 'What is the impact of hiring a part-time stylist (weekends only)?', query: 'ما تأثير توظيف موظفة بدوام جزئي في عطل نهاية الأسبوع فقط؟' },
        { ar: 'ما الإيراد الإضافي من رفع أسعار خدمات الشعر بعد زيادة الطاقة الاستيعابية؟', en: 'What additional revenue comes from raising hair prices after adding capacity?', query: 'ماذا يحدث لو رفعت أسعار خدمات الشعر 10% بعد توظيف موظفة جديدة؟' },
      ],
      benchmarkContext: {
        ar: `صالونات مماثلة في ${MARKET_SEGMENT.city} بـ 3-4 موظفات تحقق متوسط إيراد 38,500 ر.س/شهر — أعلى بـ 35% من صالونات بـ 2 موظفتين.`,
        en: `Similar salons in ${MARKET_SEGMENT.cityEn} with 3-4 stylists generate avg SAR 38,500/month — 35% higher than 2-stylist salons.`,
      },
      timeHorizon: { ar: 'نقطة التعادل: الشهر الثاني. العائد الكامل: الشهر الثالث', en: 'Break-even: Month 2. Full return: Month 3' },
    };
  }

  // ── Marketing Campaign ──
  if (s.isMarketing) {
    return {
      scenarioAr: 'إطلاق حملة تسويقية',
      scenarioEn: 'Launch a marketing campaign',
      summaryAr: 'حملة تسويقية موجهة لعملاء جدد في منطقة الصالون ستزيد الحجوزات بشكل ملحوظ خلال الأسبوعين الأولين مع تكلفة يمكن استرداد عائدها خلال الشهر الأول.',
      summaryEn: 'A targeted local campaign will significantly boost new client bookings within the first two weeks, with costs recoverable within the first month.',
      impacts: [
        { metricAr: 'حجوزات العملاء الجدد', metricEn: 'New Client Bookings', emoji: '📅', currentValue: '48/شهر', predictedValue: '82/شهر', changePercent: 70.8, positive: true },
        { metricAr: 'الإيراد الشهري', metricEn: 'Monthly Revenue', emoji: '💰', currentValue: '28,400 ر.س', predictedValue: '34,200 ر.س', changePercent: 20.4, positive: true },
        { metricAr: 'صافي الربح', metricEn: 'Net Profit', emoji: '📈', currentValue: '8,520 ر.س', predictedValue: '9,100 ر.س', changePercent: 6.8, positive: true, note: { ar: 'بعد خصم تكلفة الحملة', en: 'After deducting campaign cost' } },
        { metricAr: 'معدل تحويل العميل الجديد', metricEn: 'New Client Retention', emoji: '❤️', currentValue: '38%', predictedValue: '52%', changePercent: 36.8, positive: true, note: { ar: 'مع برنامج متابعة ما بعد الزيارة', en: 'With post-visit follow-up program' } },
        { metricAr: 'إشغال الموظفات', metricEn: 'Staff Utilisation', emoji: '👩‍🔧', currentValue: '78%', predictedValue: '88%', changePercent: 12.8, positive: true },
      ],
      overallConfidence: 79,
      verdict: 'recommended',
      verdictReasonAr: 'إشغالك الحالي 78% — توجد طاقة استيعابية غير مستغلة. الحملة التسويقية هي الأداة الأسرع لملء هذا الفراغ وتحسين الربحية.',
      verdictReasonEn: 'Your current utilization is 78% — unused capacity exists. A marketing campaign is the fastest lever to fill this gap and improve profitability.',
      risks: [
        { ar: 'إذا تجاوز الإشغال 90%، قد تتراجع جودة الخدمة وتأثر تقييمات العملاء', en: 'If utilization exceeds 90%, service quality may slip and affect client ratings', level: 'medium' },
        { ar: 'تكلفة الاستحواذ على العميل الجديد أعلى من الاحتفاظ بالقائم — يجب قياس الـ ROI', en: 'New client acquisition cost exceeds retention — ROI measurement is essential', level: 'low' },
      ],
      opportunities: [
        { ar: 'بناء قاعدة عملاء جديدة تحمي الصالون من التذبذب الموسمي', en: 'Build a new client base that insulates the salon from seasonal fluctuations' },
        { ar: 'إعادة تفعيل العملاء الخامدين بنفس الحملة بتكلفة أقل', en: 'Re-activate dormant clients via the same campaign at lower cost' },
      ],
      actions: [
        { id: 'create_campaign', labelAr: 'إنشاء حملة تسويقية من وحدة المبيعات', labelEn: 'Create campaign via Marketing module', type: 'marketing' },
        { id: 'sms_blast', labelAr: 'إرسال رسالة عرض للعملاء الخامدين', labelEn: 'Send offer SMS to dormant clients', type: 'marketing' },
      ],
      followups: [
        { ar: 'ما تأثير تقديم خصم 20% للعملاء الجدد في الحملة؟', en: 'What is the impact of a 20% first-visit discount in the campaign?', query: 'ما تأثير خصم 20% لعملاء جدد في حملة تسويقية؟' },
        { ar: 'ما تأثير تركيز الحملة على عطل نهاية الأسبوع فقط؟', en: 'What if the campaign targets weekends only?', query: 'ما تأثير حملة تسويقية مركزة في عطل نهاية الأسبوع فقط؟' },
      ],
      benchmarkContext: {
        ar: `صالونات مماثلة تستثمر في التسويق الرقمي بمعدل 4-6% من إيراداتها. متوسط عائد الحملة في نفس الفئة: 3.2× التكلفة.`,
        en: `Similar salons invest 4-6% of revenue in digital marketing. Average campaign ROI in your category: 3.2× spend.`,
      },
      timeHorizon: { ar: 'النتائج تظهر خلال 2-4 أسابيع', en: 'Results visible within 2-4 weeks' },
    };
  }

  // ── Generic / Other ──
  return {
    scenarioAr: 'تحليل السيناريو المطلوب',
    scenarioEn: 'Scenario Analysis',
    summaryAr: 'بناءً على بيانات السوق المتاحة، تم تحليل سؤالك ومقارنته بأداء الصالونات المماثلة للتنبؤ بالتأثيرات المحتملة.',
    summaryEn: 'Based on available market data, your question was analyzed and compared with similar salon performance to project potential impacts.',
    impacts: [
      { metricAr: 'الإيراد الشهري', metricEn: 'Monthly Revenue', emoji: '💰', currentValue: '28,400 ر.س', predictedValue: '30,800 ر.س', changePercent: 8.5, positive: true },
      { metricAr: 'الربحية', metricEn: 'Profitability', emoji: '📈', currentValue: '30%', predictedValue: '33%', changePercent: 10, positive: true },
      { metricAr: 'ولاء العملاء', metricEn: 'Customer Loyalty', emoji: '❤️', currentValue: '76%', predictedValue: '78%', changePercent: 2.6, positive: true },
      { metricAr: 'إشغال الموظفات', metricEn: 'Staff Utilisation', emoji: '👩‍🔧', currentValue: '78%', predictedValue: '81%', changePercent: 3.8, positive: true },
    ],
    overallConfidence: 68,
    verdict: 'caution',
    verdictReasonAr: 'السيناريو يحمل إمكانية تحسين متوسطة. يُنصح بمراجعة البيانات التشغيلية لصالونك قبل التطبيق.',
    verdictReasonEn: 'This scenario shows moderate improvement potential. Reviewing your operational data before proceeding is strongly advised.',
    risks: [
      { ar: 'عدم اليقين في استجابة السوق المحلي لهذا التغيير', en: 'Uncertainty in local market response to this change', level: 'medium' },
    ],
    opportunities: [
      { ar: 'فرصة لتحسين الأداء العام وتعزيز الموقع التنافسي في السوق', en: 'Opportunity to improve overall performance and strengthen competitive position' },
    ],
    actions: [],
    followups: [
      { ar: 'ماذا يحدث لو رفعت أسعار خدمات الشعر بنسبة 10%؟', en: 'What happens if I increase hair service prices by 10%?', query: 'ماذا يحدث لو رفعت أسعار خدمات الشعر بنسبة 10%؟' },
      { ar: 'ما تأثير توظيف موظفة حلاقة إضافية على إيراد الصالون؟', en: 'What is the impact of hiring one additional stylist on salon revenue?', query: 'ما تأثير توظيف موظفة حلاقة إضافية على إيرادات الصالون؟' },
    ],
    benchmarkContext: {
      ar: `تحليل مبني على بيانات ${MARKET_SEGMENT.poolSize} صالون مماثل في ${MARKET_SEGMENT.city}.`,
      en: `Analysis based on ${MARKET_SEGMENT.poolSize} comparable salons in ${MARKET_SEGMENT.cityEn}.`,
    },
    timeHorizon: { ar: 'التأثير الكامل خلال 30-90 يوماً', en: 'Full impact within 30-90 days' },
  };
}

async function runWhatIfAnalysis(query: string): Promise<WhatIfResult> {
  if (!aiClient) return buildMockResult(query);
  try {
    const prompt = `You are an AI business consultant for a beauty salon SaaS platform called CONFIRMED in Saudi Arabia.
The salon owner asks: "${query}"

Internal salon metrics:
- Monthly revenue: SAR 28,400
- Net profit: SAR 8,520 (30% margin)
- Monthly bookings: 312
- Avg invoice: SAR 91
- Staff utilization: 78%
- Customer loyalty/retention rate: 76%
- City: Riyadh. Benchmark pool: 487 similar salons.

Respond ONLY with valid JSON matching this exact schema (no markdown, no extra text):
{
  "scenarioAr": "...", "scenarioEn": "...",
  "summaryAr": "...", "summaryEn": "...",
  "impacts": [{"metricAr":"...","metricEn":"...","emoji":"...","currentValue":"...","predictedValue":"...","changePercent":0,"positive":true}],
  "overallConfidence": 80,
  "verdict": "recommended|caution|not_recommended",
  "verdictReasonAr": "...", "verdictReasonEn": "...",
  "risks": [{"ar":"...","en":"...","level":"high|medium|low"}],
  "opportunities": [{"ar":"...","en":"..."}],
  "actions": [{"id":"...","labelAr":"...","labelEn":"...","type":"price_update|staff_schedule|service_add|marketing|settings"}],
  "followups": [{"ar":"...","en":"...","query":"..."}],
  "benchmarkContext": {"ar":"...","en":"..."},
  "timeHorizon": {"ar":"...","en":"..."}
}`;
    const model = aiClient.models ? aiClient.models : (aiClient as any);
    const resp = await (model.generateContent ? model.generateContent({ model: 'gemini-2.0-flash', contents: [{ role: 'user', parts: [{ text: prompt }] }] }) : model.generateContent(prompt));
    const text = resp?.candidates?.[0]?.content?.parts?.[0]?.text || resp?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return buildMockResult(query);
  }
}

// ─── Static benchmark data (simulated anonymized market pool) ──────────────────

const MARKET_SEGMENT = {
  totalSalons: 487,
  city: 'الرياض',
  cityEn: 'Riyadh',
  salonType: 'صالون نسائي متكامل',
  salonTypeEn: 'Full-Service Ladies Salon',
  lastUpdated: '2026-07-19',
  poolSize: 124, // comparable salons used in comparison
};

const KPI_DATA: KpiCard[] = [
  {
    id: 'revenue',
    labelAr: 'متوسط الإيرادات الشهرية',
    labelEn: 'Monthly Revenue Avg',
    myValue: 18_450,
    marketAvg: 15_200,
    marketTop25: 26_800,
    unit: 'ر.س',
    higherIsBetter: true,
    icon: DollarSign,
    color: '#14332B',
    descAr: 'مقارنة بالمتوسط الشهري لصالونات مشابهة في الحجم والموقع',
    descEn: 'Compared to monthly avg for similar-sized salons in your area',
  },
  {
    id: 'occupancy',
    labelAr: 'نسبة إشغال المواعيد',
    labelEn: 'Appointment Occupancy',
    myValue: 72,
    marketAvg: 61,
    marketTop25: 85,
    unit: '%',
    higherIsBetter: true,
    icon: Calendar,
    color: '#FF5A5F',
    descAr: 'نسبة المواعيد المحجوزة مقارنة بالطاقة الاستيعابية الكاملة',
    descEn: 'Ratio of booked slots vs total available capacity',
  },
  {
    id: 'avg_invoice',
    labelAr: 'متوسط قيمة الفاتورة',
    labelEn: 'Average Invoice Value',
    myValue: 285,
    marketAvg: 210,
    marketTop25: 420,
    unit: 'ر.س',
    higherIsBetter: true,
    icon: BarChart3,
    color: '#FFAE34',
    descAr: 'متوسط إجمالي كل فاتورة مقارنة بمنافسيك في السوق',
    descEn: 'Average total per invoice vs your market peers',
  },
  {
    id: 'retention',
    labelAr: 'معدل عودة العميلات',
    labelEn: 'Client Retention Rate',
    myValue: 58,
    marketAvg: 49,
    marketTop25: 74,
    unit: '%',
    higherIsBetter: true,
    icon: Users,
    color: '#8B5CF6',
    descAr: 'نسبة العميلات اللاتي يعدن خلال 60 يوماً من آخر زيارة',
    descEn: 'Clients who return within 60 days of their last visit',
  },
  {
    id: 'new_clients',
    labelAr: 'العميلات الجديدة شهرياً',
    labelEn: 'New Clients / Month',
    myValue: 34,
    marketAvg: 28,
    marketTop25: 52,
    unit: '',
    higherIsBetter: true,
    icon: Star,
    color: '#0EA5E9',
    descAr: 'عدد العميلات الجديدة المسجلة خلال الشهر',
    descEn: 'New registered clients acquired each month',
  },
  {
    id: 'cancellation',
    labelAr: 'نسبة إلغاء الحجوزات',
    labelEn: 'Cancellation Rate',
    myValue: 14,
    marketAvg: 18,
    marketTop25: 8,
    unit: '%',
    higherIsBetter: false,
    icon: Percent,
    color: '#F43F5E',
    descAr: 'نسبة الحجوزات الملغاة أو الغيابية من إجمالي الحجوزات',
    descEn: 'Percentage of bookings cancelled or no-show',
  },
  {
    id: 'staff_utilization',
    labelAr: 'معدل استغلال طاقة الموظفات',
    labelEn: 'Staff Utilization',
    myValue: 68,
    marketAvg: 55,
    marketTop25: 80,
    unit: '%',
    higherIsBetter: true,
    icon: Award,
    color: '#10B981',
    descAr: 'متوسط نسبة الوقت المُستغل فعلياً لكل موظفة',
    descEn: 'Average % of each staff member\'s time actively utilized',
  },
  {
    id: 'upsell',
    labelAr: 'معدل إضافة منتجات للفاتورة',
    labelEn: 'Product Add-on Rate',
    myValue: 22,
    marketAvg: 29,
    marketTop25: 48,
    unit: '%',
    higherIsBetter: true,
    icon: Activity,
    color: '#F97316',
    descAr: 'نسبة الفواتير التي تشمل منتجاً بجانب الخدمة',
    descEn: 'Invoices that include at least one retail product',
  },
];

const PRICE_ALERTS: PriceAlert[] = [
  { serviceAr: 'قص وسشوار', serviceEn: 'Haircut & Blowdry', myPrice: 120, marketAvg: 105, marketMin: 75, marketMax: 160, category: 'شعر' },
  { serviceAr: 'صبغة كاملة', serviceEn: 'Full Hair Dye', myPrice: 350, marketAvg: 380, marketMin: 280, marketMax: 520, category: 'شعر' },
  { serviceAr: 'علاج بروتين شعر', serviceEn: 'Protein Treatment', myPrice: 600, marketAvg: 550, marketMin: 400, marketMax: 750, category: 'شعر' },
  { serviceAr: 'جلسة سبا 90 دقيقة', serviceEn: '90-Min Spa Session', myPrice: 280, marketAvg: 310, marketMin: 220, marketMax: 420, category: 'سبا' },
  { serviceAr: 'عناية بالأظافر (مانيكير)', serviceEn: 'Manicure', myPrice: 90, marketAvg: 80, marketMin: 55, marketMax: 130, category: 'أظافر' },
  { serviceAr: 'تنظيف بشرة عميق', serviceEn: 'Deep Facial Cleanse', myPrice: 220, marketAvg: 245, marketMin: 170, marketMax: 340, category: 'بشرة' },
  { serviceAr: 'مكياج سهرة كامل', serviceEn: 'Full Evening Makeup', myPrice: 300, marketAvg: 280, marketMin: 200, marketMax: 420, category: 'مكياج' },
];

const ALERTS_DATA: Alert[] = [
  {
    id: 'a1', severity: 'medium',
    titleAr: 'معدل إضافة المنتجات أقل من المتوسط',
    titleEn: 'Product Add-on Rate Below Market Average',
    descAr: 'نسبة إضافة المنتجات في فواتيرك (22%) أقل من متوسط السوق (29%). هذا يؤثر على متوسط قيمة الفاتورة.',
    descEn: 'Your product add-on rate (22%) is below market average (29%), reducing average invoice value.',
    actionAr: 'قومي بتدريب الموظفات على تقديم المنتجات بشكل طبيعي بعد كل خدمة، وأضيفي منتجات صغيرة القيمة للعرض بجانب الكاشير.',
    actionEn: 'Train staff on natural product recommendations post-service. Display small-value retail items near checkout.',
    dismissed: false,
  },
  {
    id: 'a2', severity: 'low',
    titleAr: 'سعر الصبغة الكاملة أقل بـ 8% من المتوسط',
    titleEn: 'Full Hair Dye Priced 8% Below Market',
    descAr: 'سعر صبغة الشعر الكاملة عندك 350 ر.س مقارنة بمتوسط سوقي 380 ر.س. مجال لزيادة السعر بدون التأثير على التنافسية.',
    descEn: 'Your full dye price of SAR 350 is 8% below the market avg of SAR 380. Room to increase without losing competitiveness.',
    actionAr: 'جرّبي رفع السعر إلى 370-380 ر.س مع إبراز جودة المواد المستخدمة لتبرير الزيادة للعميلات.',
    actionEn: 'Test a gradual increase to 370-380 SAR, highlighting premium materials used.',
    dismissed: false,
  },
  {
    id: 'a3', severity: 'positive',
    titleAr: 'إيراداتك تتفوق على 68% من الصالونات المشابهة',
    titleEn: 'Revenue Outperforms 68% of Comparable Salons',
    descAr: 'إيراداتك الشهرية البالغة 18,450 ر.س تتفوق على 68% من الصالونات المشابهة لك في المدينة والحجم.',
    descEn: 'Your monthly revenue of SAR 18,450 outperforms 68% of comparable salons in size and city.',
    actionAr: 'استمري في الأداء الحالي وركّزي على رفع معدل إضافة المنتجات للوصول إلى شريحة أعلى.',
    actionEn: 'Maintain current performance. Focus on product upselling to reach the top 25% tier.',
    dismissed: false,
  },
  {
    id: 'a4', severity: 'high',
    titleAr: 'جلسة السبا مسعّرة أقل من المتوسط بـ 10%',
    titleEn: 'Spa Session Underpriced by 10%',
    descAr: 'جلسة السبا 90 دقيقة عندك 280 ر.س وسط السوق 310 ر.س. هذه الخدمة تحتاج وقتاً طويلاً وتستحق تسعيراً أعلى.',
    descEn: 'Spa 90-min session at SAR 280 vs market avg SAR 310. This high-duration service merits better pricing.',
    actionAr: 'ارفعي السعر إلى 295-310 ر.س وأضيفي قيمة (مشروب ترحيبي، منشفة مُعطّرة) لتبرير الزيادة للعميلات.',
    actionEn: 'Increase to 295-310 SAR. Add perceived value (welcome drink, scented towel) to justify the increase.',
    dismissed: false,
  },
];

const FORECAST_DATA: ForecastPoint[] = [
  { monthAr: 'يناير', monthEn: 'Jan', myRevenue: 14200, marketAvg: 13100 },
  { monthAr: 'فبراير', monthEn: 'Feb', myRevenue: 15600, marketAvg: 13800 },
  { monthAr: 'مارس', monthEn: 'Mar', myRevenue: 16100, marketAvg: 14200 },
  { monthAr: 'أبريل', monthEn: 'Apr', myRevenue: 17300, marketAvg: 14900 },
  { monthAr: 'مايو', monthEn: 'May', myRevenue: 15900, marketAvg: 14500 },
  { monthAr: 'يونيو', monthEn: 'Jun', myRevenue: 16800, marketAvg: 15100 },
  { monthAr: 'يوليو', monthEn: 'Jul', myRevenue: 18450, marketAvg: 15200 },
  { monthAr: 'أغسطس', monthEn: 'Aug', myRevenue: undefined, marketAvg: undefined, myForecast: 19200, marketForecast: 15800 },
  { monthAr: 'سبتمبر', monthEn: 'Sep', myRevenue: undefined, marketAvg: undefined, myForecast: 20100, marketForecast: 16300 },
  { monthAr: 'أكتوبر', monthEn: 'Oct', myRevenue: undefined, marketAvg: undefined, myForecast: 21500, marketForecast: 16900 },
];

const TRENDING_SERVICES: TrendingService[] = [
  { nameAr: 'علاج البروتين الياباني', nameEn: 'Japanese Protein Treatment', growth: 42, demand: 'rising', category: 'شعر', inYourSalon: true },
  { nameAr: 'ميكروبليدينج الحواجب', nameEn: 'Microblading Eyebrows', growth: 38, demand: 'rising', category: 'وجه', inYourSalon: false },
  { nameAr: 'خدمة بوتوكس الشعر', nameEn: 'Hair Botox Treatment', growth: 31, demand: 'rising', category: 'شعر', inYourSalon: true },
  { nameAr: 'مساج الوجه بالضغط الياباني', nameEn: 'Japanese Facial Pressure Massage', growth: 27, demand: 'rising', category: 'بشرة', inYourSalon: false },
  { nameAr: 'عناية بالأظافر الأكريلك', nameEn: 'Acrylic Nail Extensions', growth: 24, demand: 'rising', category: 'أظافر', inYourSalon: false },
  { nameAr: 'تنظيف البشرة بالأوكسجين', nameEn: 'Oxygen Facial Cleanse', growth: 19, demand: 'rising', category: 'بشرة', inYourSalon: false },
  { nameAr: 'صبغة الأومبير والبالياج', nameEn: 'Ombre & Balayage Coloring', growth: 15, demand: 'stable', category: 'شعر', inYourSalon: true },
  { nameAr: 'المانيكير الكلاسيكي', nameEn: 'Classic Manicure', growth: -5, demand: 'falling', category: 'أظافر', inYourSalon: true },
];

const RADAR_DATA = [
  { subjectAr: 'الإيرادات', subjectEn: 'Revenue', mySalon: 85, market: 65 },
  { subjectAr: 'الإشغال', subjectEn: 'Occupancy', mySalon: 72, market: 61 },
  { subjectAr: 'متوسط الفاتورة', subjectEn: 'Avg Invoice', mySalon: 78, market: 60 },
  { subjectAr: 'الولاء', subjectEn: 'Retention', mySalon: 68, market: 55 },
  { subjectAr: 'العميلات الجديدة', subjectEn: 'Acq.', mySalon: 72, market: 58 },
  { subjectAr: 'الموظفات', subjectEn: 'Staff', mySalon: 80, market: 62 },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function ScoreBadge({ score, isAr }: { score: number; isAr: boolean }) {
  const label = score >= 80 ? (isAr ? 'ممتاز' : 'Excellent')
    : score >= 65 ? (isAr ? 'جيد جداً' : 'Very Good')
    : score >= 50 ? (isAr ? 'متوسط' : 'Average')
    : (isAr ? 'يحتاج تحسين' : 'Needs Work');
  const color = score >= 80 ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : score >= 65 ? 'bg-blue-100 text-blue-800 border-blue-200'
    : score >= 50 ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-red-100 text-red-800 border-red-200';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
  );
}

function DeltaBadge({ my, market, unit, higherIsBetter }: { my: number; market: number; unit: string; higherIsBetter: boolean }) {
  const diff = ((my - market) / market * 100);
  const isGood = higherIsBetter ? diff > 0 : diff < 0;
  const isNeutral = Math.abs(diff) < 3;
  if (isNeutral) return (
    <span className="flex items-center gap-0.5 text-slate-500 text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full">
      <Minus className="w-2.5 h-2.5" /> متوسط السوق
    </span>
  );
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      {isGood ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
      {Math.abs(diff).toFixed(1)}% {isGood ? '↑' : '↓'}
    </span>
  );
}

const CustomTooltip = ({ active, payload, label, isAr }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E9E7E2] rounded-xl p-3 shadow-lg text-xs space-y-1">
      <p className="font-bold text-[#14332B] border-b border-[#E9E7E2] pb-1 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[#6E6A63]">{entry.name}:</span>
          <span className="font-bold text-[#1C1B18]">{entry.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function BenchmarkingManager() {
  const { isAr } = useLanguage();
  const [alerts, setAlerts] = useState<Alert[]>(ALERTS_DATA);
  const [activeSection, setActiveSection] = useState<'overview' | 'kpis' | 'prices' | 'forecast' | 'trends' | 'whatif'>('overview');
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);
  const [showAllTrends, setShowAllTrends] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('2026-07-19 14:30');
  const [showPrivacyNote, setShowPrivacyNote] = useState(false);
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({});

  // ── What-if Simulator State ──
  const [whatifQuery, setWhatifQuery] = useState('');
  const [whatifLoading, setWhatifLoading] = useState(false);
  const [whatifResult, setWhatifResult] = useState<WhatIfResult | null>(null);
  const [whatifApplied, setWhatifApplied] = useState<Set<string>>(new Set());
  const [whatifConfirming, setWhatifConfirming] = useState<string | null>(null);
  const [whatifHistory, setWhatifHistory] = useState<WhatIfHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const whatifInputRef = useRef<HTMLTextAreaElement>(null);

  // Animate score bars on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const scores: Record<string, number> = {};
      KPI_DATA.forEach(k => { scores[k.id] = k.myValue; });
      setAnimatedScores(scores);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated(new Date().toLocaleString('ar-SA'));
    }, 2200);
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));
  };

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const highAlerts = activeAlerts.filter(a => a.severity === 'high').length;

  // Overall benchmark score (weighted)
  const overallScore = Math.round(
    KPI_DATA.reduce((acc, k) => {
      const ratio = k.higherIsBetter
        ? (k.myValue / k.marketTop25) * 100
        : ((k.marketTop25 === 0 ? 1 : (k.marketTop25 / (k.myValue || 1))) * 100);
      return acc + Math.min(ratio, 100);
    }, 0) / KPI_DATA.length
  );

  // Percentile rank
  const aboveAvgCount = KPI_DATA.filter(k =>
    k.higherIsBetter ? k.myValue > k.marketAvg : k.myValue < k.marketAvg
  ).length;
  const percentileLabel = aboveAvgCount >= 6
    ? (isAr ? 'أعلى ٢٥٪ في السوق' : 'Top 25% in Market')
    : aboveAvgCount >= 4
    ? (isAr ? 'فوق متوسط السوق' : 'Above Market Average')
    : (isAr ? 'عند متوسط السوق' : 'At Market Average');

  // ── What-if Simulator Handler ──
  const handleWhatifSubmit = useCallback(async (q?: string) => {
    const query = (q ?? whatifQuery).trim();
    if (!query) return;
    setWhatifLoading(true);
    setWhatifResult(null);
    setWhatifApplied(new Set());
    setWhatifConfirming(null);
    try {
      const result = await runWhatIfAnalysis(query);
      setWhatifResult(result);
      setWhatifHistory(prev => [{
        id: Date.now().toString(),
        query,
        result,
        timestamp: new Date().toLocaleString(isAr ? 'ar-SA' : 'en-SA'),
        appliedActions: [],
      }, ...prev.slice(0, 9)]);
    } finally {
      setWhatifLoading(false);
    }
  }, [whatifQuery, isAr]);

  const handleApplyAction = (actionId: string) => {
    setWhatifApplied(prev => new Set([...prev, actionId]));
    setWhatifConfirming(null);
  };

  const sections = [
    { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview' },
    { id: 'kpis', labelAr: 'مؤشرات الأداء', labelEn: 'KPIs' },
    { id: 'prices', labelAr: 'مقارنة الأسعار', labelEn: 'Pricing' },
    { id: 'forecast', labelAr: 'التوقعات المستقبلية', labelEn: 'Forecasts' },
    { id: 'trends', labelAr: 'اتجاهات السوق', labelEn: 'Trends' },
    { id: 'whatif', labelAr: '⚡ محاكي القرارات', labelEn: '⚡ What-if AI' },
  ];

  // Chart data helpers
  const revenueChartData = FORECAST_DATA.slice(0, 7).map(d => ({
    name: isAr ? d.monthAr : d.monthEn,
    [isAr ? 'صالونك' : 'Your Salon']: d.myRevenue,
    [isAr ? 'متوسط السوق' : 'Market Avg']: d.marketAvg,
  }));

  const forecastChartData = FORECAST_DATA.map(d => ({
    name: isAr ? d.monthAr : d.monthEn,
    [isAr ? 'فعلي' : 'Actual']: d.myRevenue,
    [isAr ? 'توقع صالونك' : 'Your Forecast']: d.myForecast,
    [isAr ? 'متوسط السوق' : 'Market Avg']: d.marketAvg,
    [isAr ? 'توقع السوق' : 'Market Forecast']: d.marketForecast,
  }));

  const radarData = RADAR_DATA.map(d => ({
    subject: isAr ? d.subjectAr : d.subjectEn,
    [isAr ? 'صالونك' : 'My Salon']: d.mySalon,
    [isAr ? 'متوسط السوق' : 'Market Avg']: d.market,
  }));

  const trendsToShow = showAllTrends ? TRENDING_SERVICES : TRENDING_SERVICES.slice(0, 5);

  return (
    <div className="space-y-6 animate-fadeIn" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-r from-[#14332B] to-[#1a4a38] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-[#FF5A5F] rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold bg-[#FFAE34]/20 text-[#FFAE34] border border-[#FFAE34]/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {isAr ? 'Business Intelligence · Premium' : 'Business Intelligence · Premium'}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                {isAr ? 'بيانات مجهولة الهوية' : 'Fully Anonymized Data'}
              </span>
            </div>
            <h2 className="text-xl font-serif font-bold">
              {isAr ? 'المقارنة المعيارية بالسوق' : 'Market Benchmarking'}
            </h2>
            <p className="text-xs text-white/60 mt-1 max-w-md">
              {isAr
                ? `مقارنة مجهولة الهوية مع ${MARKET_SEGMENT.poolSize} صالوناً مشابهاً في ${MARKET_SEGMENT.city} — آخر تحديث: ${lastUpdated}`
                : `Anonymous comparison with ${MARKET_SEGMENT.poolSize} similar salons in ${MARKET_SEGMENT.cityEn} — Updated: ${lastUpdated}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPrivacyNote(!showPrivacyNote)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-white/70 hover:text-white border border-white/20 hover:border-white/40 px-3 py-2 rounded-xl transition-all cursor-pointer bg-transparent"
            >
              <Shield className="w-3.5 h-3.5" />
              {isAr ? 'الخصوصية' : 'Privacy'}
            </button>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all cursor-pointer border border-white/20"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isAr ? 'تحديث' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Privacy note */}
        <AnimatePresence>
          {showPrivacyNote && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-3 bg-white/10 rounded-xl border border-white/20 text-[11px] text-white/80 leading-relaxed"
            >
              <div className="flex gap-2 items-start">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  {isAr
                    ? 'جميع البيانات المستخدمة في هذه المقارنات مجمَّعة ومجهولة الهوية تماماً. لا تظهر أسماء أي صالون أو معلوماته الشخصية. البيانات تُستخدم فقط لحساب المتوسطات والنسب المئوية للسوق. كلما زاد عدد الصالونات المشتركة في المنصة، كلما أصبحت المقارنات أدق وأكثر موثوقية.'
                    : 'All data used in these comparisons is fully aggregated and anonymized. No salon name or identifying information is ever revealed. Data is used only to compute market averages and percentile ranges. The more salons join the platform, the more accurate and powerful the benchmarks become.'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── ALERT STRIP ── */}
      {highAlerts > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <Bell className="w-4 h-4 text-red-600 animate-pulse shrink-0" />
          <p className="text-xs font-bold text-red-700">
            {isAr
              ? `${highAlerts} تنبيه عالي الأولوية يحتاج انتباهك — مؤشرات نزلت عن متوسط السوق`
              : `${highAlerts} high-priority alert — indicators dropped below market average`}
          </p>
        </div>
      )}

      {/* ── SECTION TABS ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id as any)}
            className={`shrink-0 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer border ${
              activeSection === s.id
                ? 'bg-[#14332B] text-white border-[#14332B] shadow-md'
                : 'bg-white text-[#6E6A63] border-[#E9E7E2] hover:border-[#14332B]/30 hover:text-[#14332B]'
            }`}
          >
            {isAr ? s.labelAr : s.labelEn}
          </button>
        ))}
      </div>

      {/* ══════════ OVERVIEW SECTION ══════════ */}
      {activeSection === 'overview' && (
        <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Score + Rank */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Overall Score */}
            <div className="sm:col-span-1 bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold text-[#6E6A63] uppercase mb-3">
                {isAr ? 'نقاط الأداء الإجمالية' : 'Overall Benchmark Score'}
              </p>
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#F3F4F6" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="#14332B" strokeWidth="10"
                    strokeDasharray={`${(overallScore / 100) * 251.2} 251.2`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-2xl font-serif font-bold text-[#14332B]">{overallScore}</span>
                  <span className="text-[9px] text-[#6E6A63] font-bold">/100</span>
                </div>
              </div>
              <ScoreBadge score={overallScore} isAr={isAr} />
              <p className="text-[10px] text-[#6E6A63] mt-2 font-medium">{percentileLabel}</p>
            </div>

            {/* Quick KPI Grid */}
            <div className="sm:col-span-2 grid grid-cols-2 gap-4">
              {KPI_DATA.slice(0, 4).map(k => {
                const isAbove = k.higherIsBetter ? k.myValue > k.marketAvg : k.myValue < k.marketAvg;
                const Icon = k.icon;
                return (
                  <div key={k.id} className="bg-white border border-[#E9E7E2] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: k.color + '15' }}>
                        <Icon className="w-4 h-4" style={{ color: k.color }} />
                      </div>
                      <DeltaBadge my={k.myValue} market={k.marketAvg} unit={k.unit} higherIsBetter={k.higherIsBetter} />
                    </div>
                    <p className="text-[10px] font-bold text-[#6E6A63] mb-1">{isAr ? k.labelAr : k.labelEn}</p>
                    <p className="text-xl font-serif font-bold text-[#14332B]">
                      {k.myValue.toLocaleString()}<span className="text-xs font-sans text-[#6E6A63] ms-1">{k.unit}</span>
                    </p>
                    <p className="text-[10px] text-[#6E6A63] mt-1">
                      {isAr ? 'متوسط السوق:' : 'Market avg:'} <strong className={isAbove ? 'text-emerald-600' : 'text-red-500'}>{k.marketAvg.toLocaleString()} {k.unit}</strong>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Radar Chart */}
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif text-sm font-bold text-[#14332B] flex items-center gap-2">
                <Target className="w-4 h-4 text-[#FF5A5F]" />
                {isAr ? 'الملف التنافسي الشامل' : 'Full Competitive Profile'}
              </h3>
              <span className="text-[10px] text-[#6E6A63] font-medium">
                {isAr ? `مقارنة مع ${MARKET_SEGMENT.poolSize} صالوناً` : `vs ${MARKET_SEGMENT.poolSize} salons`}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E9E7E2" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6E6A63', fontFamily: 'Cairo, Inter, sans-serif' }} />
                <Radar name={isAr ? 'صالونك' : 'My Salon'} dataKey={isAr ? 'صالونك' : 'My Salon'} stroke="#14332B" fill="#14332B" fillOpacity={0.25} strokeWidth={2} />
                <Radar name={isAr ? 'متوسط السوق' : 'Market Avg'} dataKey={isAr ? 'متوسط السوق' : 'Market Avg'} stroke="#FF5A5F" fill="#FF5A5F" fillOpacity={0.1} strokeWidth={2} strokeDasharray="4 4" />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: 'Cairo, Inter, sans-serif' }} />
                <Tooltip content={<CustomTooltip isAr={isAr} />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Comparison Chart */}
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif text-sm font-bold text-[#14332B] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#14332B]" />
                {isAr ? 'مقارنة الإيرادات الشهرية (آخر 7 أشهر)' : 'Monthly Revenue Comparison (Last 7 Months)'}
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueChartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6E6A63', fontFamily: 'Cairo, Inter, sans-serif' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6E6A63', fontFamily: 'Cairo, Inter, sans-serif' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip isAr={isAr} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: 'Cairo, Inter, sans-serif' }} />
                <Bar dataKey={isAr ? 'صالونك' : 'Your Salon'} fill="#14332B" radius={[6, 6, 0, 0]} />
                <Bar dataKey={isAr ? 'متوسط السوق' : 'Market Avg'} fill="#FF5A5F" radius={[6, 6, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alerts Preview */}
          {activeAlerts.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-serif text-sm font-bold text-[#14332B] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#FF5A5F]" />
                {isAr ? 'التنبيهات الذكية' : 'Smart Alerts'}
                <span className="text-[10px] bg-[#FF5A5F] text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">{activeAlerts.length}</span>
              </h3>
              {activeAlerts.slice(0, 3).map(alert => {
                const colors = {
                  high: 'border-red-200 bg-red-50',
                  medium: 'border-amber-200 bg-amber-50',
                  low: 'border-blue-200 bg-blue-50',
                  positive: 'border-emerald-200 bg-emerald-50',
                };
                const iconColors = {
                  high: 'text-red-600',
                  medium: 'text-amber-600',
                  low: 'text-blue-600',
                  positive: 'text-emerald-600',
                };
                const icons = {
                  high: AlertTriangle,
                  medium: AlertTriangle,
                  low: Info,
                  positive: CheckCircle2,
                };
                const Icon = icons[alert.severity];
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: isAr ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isAr ? 10 : -10 }}
                    className={`border rounded-2xl p-4 ${colors[alert.severity]}`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex gap-3 items-start flex-1">
                        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColors[alert.severity]}`} />
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-bold text-[#1C1B18]">{isAr ? alert.titleAr : alert.titleEn}</p>
                          <p className="text-xs text-[#6E6A63] leading-relaxed">{isAr ? alert.descAr : alert.descEn}</p>
                          <div className="mt-2 p-2.5 bg-white/60 rounded-xl border border-white/80 text-[11px] text-[#14332B] font-medium leading-relaxed">
                            <span className="font-bold text-[#FF5A5F]">{isAr ? '💡 التوصية: ' : '💡 Recommendation: '}</span>
                            {isAr ? alert.actionAr : alert.actionEn}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => dismissAlert(alert.id)} className="p-1.5 rounded-lg hover:bg-black/5 text-[#6E6A63] cursor-pointer bg-transparent border-none shrink-0">
                        <BellOff className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ══════════ KPIs SECTION ══════════ */}
      {activeSection === 'kpis' && (
        <motion.div key="kpis" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-[#F6F6F4] border border-[#E9E7E2] rounded-2xl p-4 text-xs text-[#6E6A63] flex gap-2 items-start">
            <Info className="w-4 h-4 text-[#14332B] shrink-0 mt-0.5" />
            <p>
              {isAr
                ? `تقارن هذه المؤشرات صالونك مع ${MARKET_SEGMENT.poolSize} صالوناً مشابهاً في ${MARKET_SEGMENT.city} من حيث الحجم ونوع الخدمات. الأسماء مخفية بالكامل.`
                : `These KPIs compare your salon with ${MARKET_SEGMENT.poolSize} similar salons in ${MARKET_SEGMENT.cityEn} by size and service type. All names are fully hidden.`}
            </p>
          </div>

          {KPI_DATA.map(k => {
            const Icon = k.icon;
            const isAbove = k.higherIsBetter ? k.myValue > k.marketAvg : k.myValue < k.marketAvg;
            const pct = Math.min(100, (k.myValue / k.marketTop25) * 100);
            const marketPct = Math.min(100, (k.marketAvg / k.marketTop25) * 100);
            const isExpanded = expandedKpi === k.id;

            return (
              <div key={k.id} className="bg-white border border-[#E9E7E2] rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedKpi(isExpanded ? null : k.id)}
                  className="w-full p-5 text-start hover:bg-[#F6F6F4]/50 transition-all cursor-pointer bg-transparent border-none"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: k.color + '15' }}>
                        <Icon className="w-5 h-5" style={{ color: k.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#1C1B18] truncate">{isAr ? k.labelAr : k.labelEn}</p>
                        <p className="text-[10px] text-[#6E6A63] mt-0.5">{isAr ? k.descAr : k.descEn}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-end">
                        <p className="text-lg font-serif font-bold text-[#14332B]">
                          {k.myValue.toLocaleString()}<span className="text-xs font-sans text-[#6E6A63] ms-1">{k.unit}</span>
                        </p>
                        <DeltaBadge my={k.myValue} market={k.marketAvg} unit={k.unit} higherIsBetter={k.higherIsBetter} />
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-[#6E6A63]" /> : <ChevronDown className="w-4 h-4 text-[#6E6A63]" />}
                    </div>
                  </div>

                  {/* Bar comparison */}
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-[10px] text-[#6E6A63] font-medium mb-1">
                      <span>{isAr ? 'صالونك' : 'Your Salon'}</span>
                      <span>{isAr ? `أعلى ٢٥٪ في السوق: ${k.marketTop25.toLocaleString()} ${k.unit}` : `Top 25%: ${k.marketTop25.toLocaleString()} ${k.unit}`}</span>
                    </div>
                    <div className="h-3 bg-[#F3F4F6] rounded-full overflow-hidden relative">
                      {/* Market avg marker */}
                      <div
                        className="absolute top-0 h-full w-0.5 bg-[#FF5A5F] z-10"
                        style={{ left: `${marketPct}%` }}
                      />
                      {/* My bar */}
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isAbove ? '#14332B' : '#F97316',
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="font-bold" style={{ color: isAbove ? '#14332B' : '#F97316' }}>
                        {k.myValue.toLocaleString()} {k.unit}
                      </span>
                      <span className="text-[#FF5A5F] font-bold">
                        {isAr ? 'متوسط:' : 'Avg:'} {k.marketAvg.toLocaleString()} {k.unit}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-[#E9E7E2] overflow-hidden"
                    >
                      <div className="p-5 grid grid-cols-3 gap-4 bg-[#F6F6F4]/40">
                        {[
                          { lAr: 'قيمتك', lEn: 'Your Value', v: `${k.myValue.toLocaleString()} ${k.unit}`, c: isAbove ? '#14332B' : '#F97316' },
                          { lAr: 'متوسط السوق', lEn: 'Market Avg', v: `${k.marketAvg.toLocaleString()} ${k.unit}`, c: '#FF5A5F' },
                          { lAr: 'أعلى ٢٥٪', lEn: 'Top 25%', v: `${k.marketTop25.toLocaleString()} ${k.unit}`, c: '#FFAE34' },
                        ].map((item, i) => (
                          <div key={i} className="bg-white rounded-xl p-3 border border-[#E9E7E2] text-center">
                            <p className="text-[10px] text-[#6E6A63] font-medium mb-1">{isAr ? item.lAr : item.lEn}</p>
                            <p className="text-sm font-bold font-mono" style={{ color: item.c }}>{item.v}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* ══════════ PRICES SECTION ══════════ */}
      {activeSection === 'prices' && (
        <motion.div key="prices" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm">
            <h3 className="font-serif text-sm font-bold text-[#14332B] mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#FF5A5F]" />
              {isAr ? 'مقارنة أسعار خدماتك بالسوق' : 'Your Service Pricing vs Market'}
            </h3>
            <p className="text-xs text-[#6E6A63] mb-5">
              {isAr
                ? 'الشريط الرمادي يمثل نطاق سعر السوق (من الحد الأدنى إلى الحد الأعلى). النقطة الخضراء/الحمراء تمثل سعرك الحالي.'
                : 'The gray bar shows the market price range (min to max). The colored dot shows your current price.'}
            </p>

            <div className="space-y-4">
              {PRICE_ALERTS.map((p, i) => {
                const pos = Math.max(0, Math.min(100, ((p.myPrice - p.marketMin) / (p.marketMax - p.marketMin)) * 100));
                const avgPos = Math.max(0, Math.min(100, ((p.marketAvg - p.marketMin) / (p.marketMax - p.marketMin)) * 100));
                const diff = ((p.myPrice - p.marketAvg) / p.marketAvg * 100);
                const isHigh = diff > 8;
                const isLow = diff < -8;
                const statusColor = isHigh ? '#F97316' : isLow ? '#EF4444' : '#14332B';
                const statusLabel = isHigh
                  ? (isAr ? 'أعلى من المتوسط' : 'Above Avg')
                  : isLow
                  ? (isAr ? 'أقل من المتوسط' : 'Below Avg')
                  : (isAr ? 'في النطاق المثالي' : 'Ideal Range');

                return (
                  <div key={i} className="p-4 rounded-2xl border border-[#E9E7E2] bg-[#F6F6F4]/30">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-bold text-[#1C1B18]">{isAr ? p.serviceAr : p.serviceEn}</p>
                        <p className="text-[10px] text-[#6E6A63] mt-0.5">{p.category}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-base font-bold font-mono" style={{ color: statusColor }}>
                          {p.myPrice} <span className="text-xs font-sans text-[#6E6A63]">ر.س</span>
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isHigh ? 'bg-orange-100 text-orange-700' :
                          isLow ? 'bg-red-100 text-red-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {statusLabel} {Math.abs(diff) > 3 ? `(${diff > 0 ? '+' : ''}${diff.toFixed(0)}%)` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Price range bar */}
                    <div className="relative h-4 bg-[#E9E7E2] rounded-full overflow-visible mt-4 mb-2">
                      {/* Range fill */}
                      <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-[#F3F4F6] via-[#D1FAE5] to-[#F3F4F6] rounded-full" />
                      {/* Market avg line */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#FF5A5F] rounded-full z-10"
                        style={{ left: `${avgPos}%` }}
                        title={`${isAr ? 'متوسط السوق' : 'Market Avg'}: ${p.marketAvg}`}
                      />
                      {/* My price dot */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md z-20 transition-all duration-700"
                        style={{ left: `calc(${pos}% - 8px)`, backgroundColor: statusColor }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-[#6E6A63] font-medium mt-2">
                      <span>{p.marketMin} {isAr ? 'ر.س (أقل)' : 'SAR (min)'}</span>
                      <span className="text-[#FF5A5F] font-bold">{isAr ? 'متوسط' : 'Avg'}: {p.marketAvg}</span>
                      <span>{p.marketMax} {isAr ? 'ر.س (أعلى)' : 'SAR (max)'}</span>
                    </div>

                    {(isHigh || isLow) && (
                      <div className="mt-3 p-2.5 bg-white rounded-xl border border-[#E9E7E2] text-[11px] text-[#14332B] flex gap-2 items-start">
                        <Lightbulb className="w-3.5 h-3.5 text-[#FFAE34] shrink-0 mt-0.5" />
                        <span>
                          {isLow
                            ? (isAr
                              ? `فرصة: يمكنك رفع السعر إلى ${Math.round(p.marketAvg * 0.95)}-${p.marketAvg} ر.س مع الحفاظ على التنافسية.`
                              : `Opportunity: You can raise to ${Math.round(p.marketAvg * 0.95)}-${p.marketAvg} SAR while remaining competitive.`)
                            : (isAr
                              ? `تنبيه: سعرك أعلى من المتوسط — تأكدي من أن عميلاتك يدركن القيمة المضافة.`
                              : `Note: Your price is above average — ensure clients perceive the added value clearly.`)
                          }
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ══════════ FORECAST SECTION ══════════ */}
      {activeSection === 'forecast' && (
        <motion.div key="forecast" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* Forecast highlight cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                labelAr: 'توقع الإيراد — أغسطس', labelEn: 'Revenue Forecast — Aug',
                value: '19,200', unit: 'ر.س', delta: '+4%',
                subAr: 'بناءً على نمو الإشغال ومتوسط الفاتورة', subEn: 'Based on occupancy growth & avg invoice',
                icon: TrendingUp, color: '#14332B',
              },
              {
                labelAr: 'توقع نسبة الإشغال — سبتمبر', labelEn: 'Occupancy Forecast — Sep',
                value: '78', unit: '%', delta: '+6%',
                subAr: 'ارتفاع متوقع مع بداية الموسم المدرسي', subEn: 'Expected rise with back-to-school season',
                icon: Calendar, color: '#FF5A5F',
              },
              {
                labelAr: 'إيراد متوقع — أكتوبر', labelEn: 'Revenue Forecast — Oct',
                value: '21,500', unit: 'ر.س', delta: '+16%',
                subAr: 'موسم قوي متوقع بناءً على بيانات السوق', subEn: 'Strong seasonal peak based on market data',
                icon: Crown, color: '#FFAE34',
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: item.color + '15' }}>
                      <Icon className="w-4.5 h-4.5" style={{ color: item.color }} />
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{item.delta}</span>
                  </div>
                  <p className="text-[10px] font-bold text-[#6E6A63] mb-1">{isAr ? item.labelAr : item.labelEn}</p>
                  <p className="text-2xl font-serif font-bold text-[#14332B]">
                    {item.value}<span className="text-xs font-sans text-[#6E6A63] ms-1">{item.unit}</span>
                  </p>
                  <p className="text-[10px] text-[#6E6A63] mt-1.5 leading-relaxed">{isAr ? item.subAr : item.subEn}</p>
                </div>
              );
            })}
          </div>

          {/* Forecast chart */}
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-serif text-sm font-bold text-[#14332B] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#FF5A5F]" />
                {isAr ? 'توقعات الإيرادات للأشهر القادمة' : 'Revenue Forecast — Upcoming Months'}
              </h3>
              <span className="text-[10px] text-[#6E6A63] font-medium border border-[#E9E7E2] px-2 py-1 rounded-lg bg-[#F6F6F4]">
                {isAr ? 'المنطقة المظللة = توقعات' : 'Shaded area = Forecast'}
              </span>
            </div>
            <p className="text-[11px] text-[#6E6A63] mb-5">
              {isAr
                ? 'الخط الصلب = بيانات فعلية · الخط المنقط = توقعات ذكية بناءً على نمط نشاطك وبيانات السوق'
                : 'Solid line = Actual data · Dashed line = AI forecast based on your activity patterns & market data'}
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={forecastChartData}>
                <defs>
                  <linearGradient id="myGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14332B" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#14332B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mktGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5A5F" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#FF5A5F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6E6A63', fontFamily: 'Cairo, Inter, sans-serif' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6E6A63' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip isAr={isAr} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: 'Cairo, Inter, sans-serif' }} />
                <Area type="monotone" dataKey={isAr ? 'فعلي' : 'Actual'} stroke="#14332B" fill="url(#myGrad)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
                <Area type="monotone" dataKey={isAr ? 'توقع صالونك' : 'Your Forecast'} stroke="#14332B" fill="url(#myGrad)" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} />
                <Area type="monotone" dataKey={isAr ? 'متوسط السوق' : 'Market Avg'} stroke="#FF5A5F" fill="url(#mktGrad)" strokeWidth={1.5} dot={false} connectNulls={false} />
                <Area type="monotone" dataKey={isAr ? 'توقع السوق' : 'Market Forecast'} stroke="#FF5A5F" fill="url(#mktGrad)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls={false} />
                <ReferenceLine x={isAr ? 'يوليو' : 'Jul'} stroke="#FFAE34" strokeDasharray="4 4" label={{ value: isAr ? 'الآن' : 'Now', fill: '#FFAE34', fontSize: 10 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Occupancy forecast */}
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm">
            <h3 className="font-serif text-sm font-bold text-[#14332B] mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FFAE34]" />
              {isAr ? 'توقع نسبة إشغال المواعيد (3 أشهر قادمة)' : 'Appointment Occupancy Forecast (Next 3 Months)'}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { mAr: 'أغسطس ٢٠٢٦', mEn: 'Aug 2026', val: 75, mkt: 63 },
                { mAr: 'سبتمبر ٢٠٢٦', mEn: 'Sep 2026', val: 78, mkt: 65 },
                { mAr: 'أكتوبر ٢٠٢٦', mEn: 'Oct 2026', val: 81, mkt: 67 },
              ].map((m, i) => (
                <div key={i} className="text-center p-4 bg-[#F6F6F4]/60 rounded-2xl border border-[#E9E7E2]">
                  <p className="text-[10px] font-bold text-[#6E6A63] mb-2">{isAr ? m.mAr : m.mEn}</p>
                  <p className="text-2xl font-serif font-bold text-[#14332B]">{m.val}%</p>
                  <p className="text-[10px] text-[#FF5A5F] font-bold mt-1">
                    {isAr ? 'سوق:' : 'Market:'} {m.mkt}%
                  </p>
                  <div className="mt-2 h-1.5 bg-[#E9E7E2] rounded-full overflow-hidden">
                    <div className="h-full bg-[#14332B] rounded-full" style={{ width: `${m.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ══════════ TRENDS SECTION ══════════ */}
      {activeSection === 'trends' && (
        <motion.div key="trends" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* Trending services */}
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-serif text-sm font-bold text-[#14332B] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#FFAE34]" />
                {isAr ? 'الخدمات الأكثر طلباً ونمواً في السوق' : 'Most In-Demand & Growing Services'}
              </h3>
              <span className="text-[10px] text-[#6E6A63] border border-[#E9E7E2] px-2 py-1 rounded-lg bg-[#F6F6F4] font-medium">
                {isAr ? `${MARKET_SEGMENT.city} · يوليو ٢٠٢٦` : `${MARKET_SEGMENT.cityEn} · July 2026`}
              </span>
            </div>

            <div className="space-y-3">
              {trendsToShow.map((s, i) => {
                const isRising = s.demand === 'rising';
                const isFalling = s.demand === 'falling';
                return (
                  <div key={i} className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all ${
                    s.inYourSalon ? 'bg-emerald-50/50 border-emerald-200/60' : 'bg-white border-[#E9E7E2]'
                  }`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${
                      i === 0 ? 'bg-[#FFAE34]/20 text-[#FFAE34]' :
                      i === 1 ? 'bg-[#FF5A5F]/10 text-[#FF5A5F]' :
                      'bg-[#F3F4F6] text-[#6E6A63]'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-[#1C1B18] truncate">{isAr ? s.nameAr : s.nameEn}</p>
                        {s.inYourSalon && (
                          <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full shrink-0">
                            {isAr ? '✓ متوفر لديك' : '✓ You offer it'}
                          </span>
                        )}
                        {!s.inYourSalon && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
                            {isAr ? '+ فرصة إضافة' : '+ Add opportunity'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#6E6A63] mt-0.5">{s.category}</p>
                    </div>
                    <div className="text-end shrink-0">
                      <div className={`flex items-center gap-1 font-bold text-sm ${
                        isRising ? 'text-emerald-600' : isFalling ? 'text-red-500' : 'text-[#6E6A63]'
                      }`}>
                        {isRising ? <TrendingUp className="w-4 h-4" /> : isFalling ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        {s.growth > 0 ? '+' : ''}{s.growth}%
                      </div>
                      <p className="text-[9px] text-[#6E6A63] font-medium mt-0.5">
                        {isRising ? (isAr ? 'طلب متصاعد' : 'Rising demand')
                          : isFalling ? (isAr ? 'طلب متراجع' : 'Falling demand')
                          : (isAr ? 'طلب مستقر' : 'Stable demand')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowAllTrends(!showAllTrends)}
              className="mt-4 w-full py-2.5 text-xs font-bold text-[#14332B] border border-[#E9E7E2] rounded-xl hover:bg-[#F6F6F4] transition-all cursor-pointer bg-transparent flex items-center justify-center gap-2"
            >
              {showAllTrends
                ? (isAr ? 'عرض أقل' : 'Show less')
                : (isAr ? `عرض كل الخدمات (${TRENDING_SERVICES.length})` : `Show all services (${TRENDING_SERVICES.length})`)}
              {showAllTrends ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Opportunity summary */}
          <div className="bg-gradient-to-br from-[#14332B] to-[#1a4a38] rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-[#FFAE34]" />
              <h3 className="font-serif text-sm font-bold">
                {isAr ? 'فرص النمو المقترحة لصالونك' : 'Suggested Growth Opportunities'}
              </h3>
            </div>
            <div className="space-y-3">
              {[
                {
                  ar: 'إضافة خدمة ميكروبليدينج الحواجب (+38% نمو بالسوق) — غير متوفرة لديك حالياً.',
                  en: 'Add Microblading Eyebrows service (+38% market growth) — not currently in your menu.',
                },
                {
                  ar: 'تفعيل تسعير ديناميكي لخدمات الذروة (الخميس–السبت) لرفع متوسط الفاتورة بنسبة 12-15%.',
                  en: 'Enable peak-hour dynamic pricing (Thu–Sat) to raise avg invoice by 12-15%.',
                },
                {
                  ar: 'إضافة باقة "ترطيب الأظافر + كريم يدين" بسعر 110 ر.س كخيار إضافي بجانب المانيكير لرفع معدل الـ upsell.',
                  en: 'Offer "Nail Hydration + Hand Cream" add-on at 110 SAR alongside manicure to boost upsell rate.',
                },
              ].map((op, i) => (
                <div key={i} className="flex gap-3 items-start p-3.5 bg-white/10 rounded-xl border border-white/15">
                  <span className="w-5 h-5 bg-[#FFAE34]/20 text-[#FFAE34] rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-xs text-white/85 leading-relaxed">{isAr ? op.ar : op.en}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Market season insights */}
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm">
            <h3 className="font-serif text-sm font-bold text-[#14332B] mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#FF5A5F]" />
              {isAr ? 'المواسم الأكثر طلباً في السوق' : 'Peak Market Seasons'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { nameAr: 'عيد الفطر', nameEn: 'Eid Al-Fitr', boost: '+65%', icon: '🌙', color: '#FF5A5F' },
                { nameAr: 'الأعياد الوطنية', nameEn: 'National Day', boost: '+42%', icon: '🇸🇦', color: '#14332B' },
                { nameAr: 'موسم الأعراس', nameEn: 'Wedding Season', boost: '+58%', icon: '💍', color: '#FFAE34' },
                { nameAr: 'العودة للمدرسة', nameEn: 'Back to School', boost: '+28%', icon: '📚', color: '#8B5CF6' },
              ].map((s, i) => (
                <div key={i} className="text-center p-4 rounded-2xl border border-[#E9E7E2] bg-[#F6F6F4]/30">
                  <p className="text-2xl mb-2">{s.icon}</p>
                  <p className="text-[11px] font-bold text-[#1C1B18]">{isAr ? s.nameAr : s.nameEn}</p>
                  <p className="text-sm font-bold mt-1" style={{ color: s.color }}>{s.boost}</p>
                  <p className="text-[9px] text-[#6E6A63] mt-0.5">{isAr ? 'زيادة في الطلب' : 'demand increase'}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ══════════ WHAT-IF SIMULATOR SECTION ══════════ */}
      {activeSection === 'whatif' && (
        <motion.div key="whatif" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* Hero banner */}
          <div className="bg-gradient-to-br from-[#0f2a22] via-[#14332B] to-[#1a1035] rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-72 h-72 bg-[#FFAE34] rounded-full translate-x-1/3 -translate-y-1/2 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FF5A5F] rounded-full -translate-x-1/4 translate-y-1/3 blur-2xl" />
            </div>
            <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold bg-[#FFAE34]/20 text-[#FFAE34] border border-[#FFAE34]/30 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3 h-3" />
                    {isAr ? 'AI Business Consultant · مدعوم بالذكاء الاصطناعي' : 'AI Business Consultant · Powered by AI'}
                  </span>
                </div>
                <h2 className="text-xl font-serif font-bold mb-1">
                  {isAr ? 'محاكي القرارات الذكي' : 'What-if AI Simulator'}
                </h2>
                <p className="text-xs text-white/60 max-w-lg leading-relaxed">
                  {isAr
                    ? 'اسأل سؤالاً تجارياً بأسلوبك الطبيعي. الذكاء الاصطناعي يحلل بيانات صالونك ويقارنها ببيانات السوق ليتنبأ بالتأثير على إيراداتك وأرباحك وعملائك قبل اتخاذ أي قرار.'
                    : 'Ask any business question naturally. The AI analyzes your salon data against live market benchmarks to predict the impact on revenue, profit, bookings, and customer loyalty — before you act.'}
                </p>
              </div>
              {whatifHistory.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-white border border-white/20 hover:border-white/40 px-3 py-2 rounded-xl transition-all cursor-pointer bg-transparent"
                >
                  <Layers className="w-3.5 h-3.5" />
                  {isAr ? `السجل (${whatifHistory.length})` : `History (${whatifHistory.length})`}
                </button>
              )}
            </div>
          </div>

          {/* History drawer */}
          <AnimatePresence>
            {showHistory && whatifHistory.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-white border border-[#E9E7E2] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[#E9E7E2] flex justify-between items-center">
                  <p className="text-xs font-bold text-[#14332B] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {isAr ? 'سجل المحاكاة السابقة' : 'Previous Simulations'}
                  </p>
                  <button onClick={() => setShowHistory(false)} className="text-[#6E6A63] hover:text-[#1C1B18] cursor-pointer bg-transparent border-0">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-[#F3F2EE]">
                  {whatifHistory.map(h => (
                    <button key={h.id} onClick={() => { setWhatifResult(h.result); setWhatifApplied(new Set(h.appliedActions)); setShowHistory(false); }}
                      className="w-full text-start p-4 hover:bg-[#F9F6F0] transition-colors cursor-pointer flex justify-between items-start gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[#1C1B18] line-clamp-1">{h.query}</p>
                        <p className="text-[10px] text-[#6E6A63] mt-0.5">{h.timestamp}</p>
                      </div>
                      <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        h.result.verdict === 'recommended' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        h.result.verdict === 'caution'      ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                              'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {h.result.verdict === 'recommended' ? (isAr ? 'مُوصى به' : 'Recommended') :
                         h.result.verdict === 'caution'      ? (isAr ? 'بحذر' : 'Caution') : (isAr ? 'غير مُوصى' : 'Not Rec.')}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Query input */}
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm space-y-4">
            <label className="block text-xs font-bold text-[#14332B] flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-[#FF5A5F]" />
              {isAr ? 'اكتب سؤالك التجاري بأسلوبك الطبيعي' : 'Ask your business question in natural language'}
            </label>
            <div className="relative">
              <textarea
                ref={whatifInputRef}
                value={whatifQuery}
                onChange={e => setWhatifQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleWhatifSubmit(); }}
                rows={3}
                placeholder={isAr
                  ? 'مثال: ماذا يحدث لو رفعت أسعار خدمات الشعر 10% الشهر القادم؟'
                  : 'e.g. What happens if I increase hair service prices by 10% next month?'}
                className="w-full resize-none rounded-xl border border-[#E9E7E2] bg-[#F9F6F0] px-4 py-3 text-sm text-[#1C1B18] placeholder-[#A8A49E] focus:outline-none focus:border-[#14332B] focus:ring-2 focus:ring-[#14332B]/10 transition-all leading-relaxed"
                style={{ fontFamily: isAr ? 'Cairo, sans-serif' : 'IBM Plex Sans Arabic, sans-serif' }}
              />
            </div>

            {/* Example chips */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#6E6A63] uppercase tracking-wide">
                {isAr ? 'أسئلة شائعة — اضغطي لتطبيق فوري:' : 'Quick examples — click to run:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { ar: 'رفع أسعار الشعر 10%', en: 'Raise hair prices 10%', query: isAr ? 'ماذا يحدث لو رفعت أسعار خدمات الشعر بنسبة 10% الشهر القادم؟' : 'What if I increase hair service prices by 10% next month?' },
                  { ar: 'توظيف مصففة إضافية', en: 'Hire another stylist', query: isAr ? 'ما تأثير توظيف مصففة شعر إضافية على إيرادات الصالون؟' : 'What if I hire one additional stylist?' },
                  { ar: 'حملة تسويقية جديدة', en: 'Launch a campaign', query: isAr ? 'ماذا يحدث لو أطلقت حملة تسويقية لاستقطاب عملاء جدد؟' : 'What if I launch a marketing campaign to attract new clients?' },
                  { ar: 'رفع الأسعار 20%', en: 'Raise prices 20%', query: isAr ? 'ماذا يحدث لو رفعت جميع أسعار الخدمات 20%؟' : 'What if I raise all service prices by 20%?' },
                ].map((ex, i) => (
                  <button key={i}
                    onClick={() => { setWhatifQuery(ex.query); handleWhatifSubmit(ex.query); }}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-[#14332B] bg-[#14332B]/5 hover:bg-[#14332B]/10 border border-[#14332B]/15 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5" />
                    {isAr ? ex.ar : ex.en}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleWhatifSubmit()}
                disabled={!whatifQuery.trim() || whatifLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#14332B] hover:bg-[#1a4a38] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                {whatifLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isAr ? 'تشغيل المحاكاة' : 'Run Simulation'}
              </button>
            </div>
          </div>

          {/* Loading skeleton */}
          {whatifLoading && (
            <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#14332B]/10 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-[#14332B] animate-pulse" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-[#F3F2EE] rounded-full animate-pulse w-3/4" />
                  <div className="h-2.5 bg-[#F3F2EE] rounded-full animate-pulse w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-[#F9F6F0] rounded-xl animate-pulse" />)}
              </div>
              <div className="h-24 bg-[#F9F6F0] rounded-xl animate-pulse" />
              <p className="text-xs text-center text-[#6E6A63] animate-pulse">
                {isAr ? '⚡ الذكاء الاصطناعي يحلل بيانات صالونك ويقارنها ببيانات السوق...' : '⚡ AI is analyzing your salon data against market benchmarks...'}
              </p>
            </div>
          )}

          {/* ── RESULTS ── */}
          {whatifResult && !whatifLoading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* Scenario + Summary */}
              <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-[#6E6A63] uppercase tracking-wider mb-1">
                      {isAr ? 'السيناريو المحلَّل' : 'Analyzed Scenario'}
                    </p>
                    <h3 className="font-serif text-lg font-bold text-[#14332B] mb-3">
                      {isAr ? whatifResult.scenarioAr : whatifResult.scenarioEn}
                    </h3>
                    <p className="text-sm text-[#3D3A34] leading-relaxed">
                      {isAr ? whatifResult.summaryAr : whatifResult.summaryEn}
                    </p>
                  </div>

                  {/* Confidence ring + verdict */}
                  <div className="shrink-0 flex flex-col items-center gap-3">
                    {/* Confidence ring */}
                    <div className="relative w-24 h-24">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="38" fill="none" stroke="#F3F4F6" strokeWidth="10" />
                        <circle cx="50" cy="50" r="38" fill="none"
                          stroke={whatifResult.overallConfidence >= 75 ? '#14332B' : whatifResult.overallConfidence >= 55 ? '#FFAE34' : '#FF5A5F'}
                          strokeWidth="10"
                          strokeDasharray={`${(whatifResult.overallConfidence / 100) * 238.76} 238.76`}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dasharray 1s ease' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-[#14332B]">{whatifResult.overallConfidence}%</span>
                        <span className="text-[8px] text-[#6E6A63] font-bold leading-none mt-0.5">{isAr ? 'ثقة' : 'Conf.'}</span>
                      </div>
                    </div>
                    {/* Verdict badge */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                      whatifResult.verdict === 'recommended'     ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      whatifResult.verdict === 'caution'          ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                    'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {whatifResult.verdict === 'recommended'  ? <BadgeCheck className="w-3.5 h-3.5" /> :
                       whatifResult.verdict === 'caution'       ? <CircleAlert className="w-3.5 h-3.5" /> :
                                                                  <Ban className="w-3.5 h-3.5" />}
                      {whatifResult.verdict === 'recommended' ? (isAr ? 'مُوصى به' : 'Recommended') :
                       whatifResult.verdict === 'caution'      ? (isAr ? 'مُوصى بحذر' : 'With Caution') :
                                                                 (isAr ? 'غير مُوصى به' : 'Not Recommended')}
                    </div>
                  </div>
                </div>

                {/* Verdict reasoning */}
                <div className={`mt-4 p-3.5 rounded-xl border text-xs leading-relaxed ${
                  whatifResult.verdict === 'recommended' ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' :
                  whatifResult.verdict === 'caution'      ? 'bg-amber-50/50 border-amber-200 text-amber-800' :
                                                            'bg-red-50/50 border-red-200 text-red-800'
                }`}>
                  {isAr ? whatifResult.verdictReasonAr : whatifResult.verdictReasonEn}
                </div>

                {/* Benchmark context */}
                <div className="mt-3 p-3 rounded-xl bg-[#F9F6F0] border border-[#E9E7E2] text-[11px] text-[#6E6A63] flex items-start gap-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#14332B]">{isAr ? 'سياق السوق: ' : 'Market Context: '}</span>
                    {isAr ? whatifResult.benchmarkContext.ar : whatifResult.benchmarkContext.en}
                    {' · '}<span className="font-medium">{isAr ? whatifResult.timeHorizon.ar : whatifResult.timeHorizon.en}</span>
                  </div>
                </div>
              </div>

              {/* Impact grid */}
              <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm">
                <h4 className="text-xs font-bold text-[#14332B] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#FF5A5F]" />
                  {isAr ? 'التأثيرات المتوقعة' : 'Projected Impacts'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {whatifResult.impacts.map((impact, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${
                      impact.positive ? 'bg-emerald-50/40 border-emerald-200' : 'bg-red-50/40 border-red-200'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-lg">{impact.emoji}</span>
                          <p className="text-[11px] font-bold text-[#1C1B18] mt-1 leading-tight">
                            {isAr ? impact.metricAr : impact.metricEn}
                          </p>
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-bold ${impact.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {impact.positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {impact.changePercent > 0 ? '+' : ''}{impact.changePercent.toFixed(1)}%
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-[#6E6A63] line-through">{impact.currentValue}</span>
                        <ArrowRight className="w-3 h-3 text-[#6E6A63] shrink-0" />
                        <span className={`font-bold ${impact.positive ? 'text-emerald-700' : 'text-red-700'}`}>{impact.predictedValue}</span>
                      </div>
                      {impact.note && (
                        <p className="text-[10px] text-[#6E6A63] mt-1.5 italic leading-snug">
                          {isAr ? impact.note.ar : impact.note.en}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Risks & Opportunities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Risks */}
                <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-[#14332B] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#FF5A5F]" />
                    {isAr ? 'المخاطر المحتملة' : 'Potential Risks'}
                  </h4>
                  <div className="space-y-2.5">
                    {whatifResult.risks.map((r, i) => (
                      <div key={i} className="flex gap-2.5 items-start">
                        <span className={`shrink-0 mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                          r.level === 'high'   ? 'bg-red-50 text-red-700 border-red-200' :
                          r.level === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {r.level === 'high' ? (isAr ? 'عالي' : 'High') : r.level === 'medium' ? (isAr ? 'متوسط' : 'Med') : (isAr ? 'منخفض' : 'Low')}
                        </span>
                        <p className="text-xs text-[#3D3A34] leading-snug">{isAr ? r.ar : r.en}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Opportunities */}
                <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-[#14332B] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-[#FFAE34]" />
                    {isAr ? 'الفرص المتاحة' : 'Opportunities'}
                  </h4>
                  <div className="space-y-2.5">
                    {whatifResult.opportunities.map((op, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <span className="w-4 h-4 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{i+1}</span>
                        <p className="text-xs text-[#3D3A34] leading-snug">{isAr ? op.ar : op.en}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Apply recommendation actions */}
              {whatifResult.actions.length > 0 && (
                <div className="bg-gradient-to-r from-[#14332B]/5 to-[#14332B]/3 border border-[#14332B]/15 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-[#14332B] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <CheckCheck className="w-3.5 h-3.5" />
                    {isAr ? 'تطبيق التوصية' : 'Apply Recommendation'}
                  </h4>
                  <div className="space-y-2.5">
                    {whatifResult.actions.map(action => {
                      const applied = whatifApplied.has(action.id);
                      const confirming = whatifConfirming === action.id;
                      return (
                        <div key={action.id} className="flex items-center justify-between gap-3 bg-white border border-[#E9E7E2] rounded-xl p-3.5">
                          <p className="text-xs font-semibold text-[#1C1B18] flex items-center gap-2">
                            {applied
                              ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              : <ChevronRight className="w-3.5 h-3.5 text-[#6E6A63] shrink-0" />}
                            {isAr ? action.labelAr : action.labelEn}
                          </p>
                          {applied ? (
                            <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                              {isAr ? '✓ مُطبَّق' : '✓ Applied'}
                            </span>
                          ) : confirming ? (
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => handleApplyAction(action.id)}
                                className="text-[10px] font-bold text-white bg-[#14332B] hover:bg-[#1a4a38] px-3 py-1 rounded-lg cursor-pointer transition-all border-0"
                              >
                                {isAr ? 'تأكيد التطبيق' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setWhatifConfirming(null)}
                                className="text-[10px] font-bold text-[#6E6A63] hover:text-[#1C1B18] px-3 py-1 rounded-lg cursor-pointer border border-[#E9E7E2] bg-transparent transition-all"
                              >
                                {isAr ? 'إلغاء' : 'Cancel'}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setWhatifConfirming(action.id)}
                              className="shrink-0 text-[10px] font-bold text-[#14332B] bg-[#14332B]/8 hover:bg-[#14332B]/15 border border-[#14332B]/20 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                            >
                              {isAr ? 'تطبيق ←' : 'Apply →'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Follow-up suggestions */}
              {whatifResult.followups.length > 0 && (
                <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-[#14332B] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FFAE34]" />
                    {isAr ? 'أسئلة متابعة مقترحة' : 'Suggested Follow-ups'}
                  </h4>
                  <div className="flex flex-col gap-2">
                    {whatifResult.followups.map((fu, i) => (
                      <button key={i}
                        onClick={() => { setWhatifQuery(fu.query); handleWhatifSubmit(fu.query); }}
                        className="flex items-center gap-2.5 text-start p-3 rounded-xl border border-[#E9E7E2] hover:border-[#14332B]/30 hover:bg-[#F9F6F0] transition-all cursor-pointer group"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#FF5A5F]/10 text-[#FF5A5F] flex items-center justify-center text-[10px] font-bold shrink-0 group-hover:bg-[#FF5A5F]/20 transition-colors">
                          {i+1}
                        </span>
                        <p className="text-xs text-[#3D3A34] group-hover:text-[#14332B] transition-colors leading-snug">
                          {isAr ? fu.ar : fu.en}
                        </p>
                        <ChevronRight className="w-3.5 h-3.5 text-[#6E6A63] group-hover:text-[#14332B] ms-auto shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* New simulation */}
              <div className="flex justify-center">
                <button
                  onClick={() => { setWhatifResult(null); setWhatifQuery(''); setWhatifApplied(new Set()); whatifInputRef.current?.focus(); }}
                  className="flex items-center gap-2 text-xs font-bold text-[#6E6A63] hover:text-[#14332B] transition-colors cursor-pointer bg-transparent border-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {isAr ? 'محاكاة جديدة' : 'New simulation'}
                </button>
              </div>
            </motion.div>
          )}

        </motion.div>
      )}

      {/* ── FOOTER DISCLAIMER ── */}
      <div className="flex items-start gap-2.5 p-4 bg-[#F6F6F4] border border-[#E9E7E2] rounded-2xl text-[10px] text-[#6E6A63]">
        <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {isAr
            ? `جميع المقارنات في هذه الصفحة مجهولة الهوية بالكامل. لا يظهر اسم أي صالون آخر أو معلوماته. البيانات محسوبة من تجميع آمن لـ ${MARKET_SEGMENT.poolSize} صالوناً مشابهاً. كلما زاد عدد الصالونات في المنصة، كلما أصبحت المقارنات أدق. آخر تحديث للبيانات: ${lastUpdated}.`
            : `All comparisons on this page are fully anonymized. No other salon's name or identity is revealed. Data is computed from a secure aggregate of ${MARKET_SEGMENT.poolSize} comparable salons. The more salons join the platform, the more accurate benchmarks become. Last data update: ${lastUpdated}.`}
        </p>
      </div>
    </div>
  );
}
