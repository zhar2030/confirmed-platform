import React, { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import { Client, Staff, Service } from '../types';
import { 
  Sparkles, ArrowLeft, Search, Filter, Calendar, User, Users, TrendingUp, TrendingDown, 
  MessageSquare, Settings2, Settings, Activity, FileText, CheckCircle, XCircle, 
  AlertTriangle, Percent, Clock, ArrowUpRight, Share2, Send, Edit, Trash2, Plus, 
  ChevronDown, Check, RotateCcw, ThumbsUp, ThumbsDown, ShieldAlert, Award, Star, BookOpen, Layers
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;
const _aiKey = import.meta.env.VITE_GOOGLE_AI_KEY;
if (_aiKey) {
  try { aiClient = new GoogleGenAI({ apiKey: _aiKey }); } catch { /* no AI — mock used */ }
}


// ==========================================
// 1. DATA MODELS & EVENT TAXONOMY INTERFACES
// ==========================================

export interface CustomerEvent {
  id: string;
  salon_id: string;
  branch_id: string;
  customer_id: string;
  employee_id: string | null;
  event_type: 
    | 'customer_created'
    | 'appointment_booked'
    | 'appointment_rescheduled'
    | 'appointment_cancelled'
    | 'appointment_no_show'
    | 'appointment_completed'
    | 'service_purchased'
    | 'product_purchased'
    | 'consultation_completed'
    | 'recommendation_presented'
    | 'recommendation_accepted'
    | 'recommendation_declined'
    | 'message_sent'
    | 'message_delivered'
    | 'message_read'
    | 'message_replied'
    | 'booking_attributed'
    | 'complaint_created'
    | 'complaint_resolved'
    | 'service_rework'
    | 'refund_issued'
    | 'customer_reactivated';
  event_date: string; // YYYY-MM-DD
  service_id: string | null;
  product_id: string | null;
  gross_revenue: number;
  discount_amount: number;
  net_revenue: number;
  direct_cost: number;
  commission_amount: number;
  metadata: any;
}

export interface RecommendationCatalogueItem {
  code: string;
  category: 'retention' | 'upsell' | 'marketing' | 'recovery';
  titleAr: string;
  titleEn: string;
  eligible_channels: ('whatsapp' | 'call' | 'sms')[];
  requires_human_approval: boolean;
  cooldown_days: number;
  minimum_confidence: number;
  allowed_roles: string[];
  exclusion_rules: string[];
}

export interface Recommendation {
  id: string;
  customer_id: string;
  customer_name: string;
  code: string;
  titleAr: string;
  titleEn: string;
  priority: 'high' | 'medium' | 'low';
  score: number;
  recommended_employee_id: string | null;
  recommended_employee_name: string | null;
  channel: 'whatsapp' | 'call' | 'sms';
  status: 'candidate' | 'generated' | 'awaiting_review' | 'approved' | 'edited' | 'rejected' | 'executed' | 'expired' | 'blocked';
  ai_explanation_ar: string;
  ai_explanation_en: string;
  message_draft_ar: string;
  message_draft_en: string;
  evidence: string[];
  warnings: string[];
  created_at: string;
}

export interface IntelligenceSettings {
  trialDays: number;
  cooldownDays: number;
  medianIntervalDefault: number;
  thresholdDue: number;       // e.g. 0.8
  thresholdOverdue: number;   // e.g. 1.10
  thresholdAtRisk: number;    // e.g. 1.50
  thresholdChurned: number;   // e.g. 2.00
  empDependencyLimit: number; // e.g. 0.70
  maxMessagesPerPeriod: number;
  weights: {
    relevance: number;
    timing: number;
    response: number;
    value: number;
    feasibility: number;
  };
}

// ==========================================
// 2. DETAILED MOCK DATA & EVENTS SEEDING
// ==========================================

const DEFAULT_SETTINGS: IntelligenceSettings = {
  trialDays: 14,
  cooldownDays: 14,
  medianIntervalDefault: 27,
  thresholdDue: 0.8,
  thresholdOverdue: 1.10,
  thresholdAtRisk: 1.50,
  thresholdChurned: 2.00,
  empDependencyLimit: 0.70,
  maxMessagesPerPeriod: 3,
  weights: {
    relevance: 0.30,
    timing: 0.25,
    response: 0.20,
    value: 0.15,
    feasibility: 0.10
  }
};

const RECOMMENDATION_CATALOGUE: RecommendationCatalogueItem[] = [
  {
    code: 'MAINTENANCE_REMINDER',
    category: 'retention',
    titleAr: 'تذكير الصيانة الدورية للخدمة',
    titleEn: 'Routine Service Maintenance Reminder',
    eligible_channels: ['whatsapp', 'sms'],
    requires_human_approval: true,
    cooldown_days: 14,
    minimum_confidence: 0.7,
    allowed_roles: ['manager', 'preferred_employee'],
    exclusion_rules: ['open_complaint', 'marketing_opt_out']
  },
  {
    code: 'REBOOKING_REMINDER',
    category: 'retention',
    titleAr: 'تذكير بإعادة الحجز المعتاد',
    titleEn: 'Regular Rebooking Reminder',
    eligible_channels: ['whatsapp', 'sms'],
    requires_human_approval: true,
    cooldown_days: 10,
    minimum_confidence: 0.7,
    allowed_roles: ['manager', 'preferred_employee'],
    exclusion_rules: ['marketing_opt_out']
  },
  {
    code: 'HIGH_VALUE_CHURN_RISK',
    category: 'retention',
    titleAr: 'تواصل شخصي مخصص لاستعادة عميلة نخبة',
    titleEn: 'Personal Outreach for High Value Churn Risk',
    eligible_channels: ['whatsapp', 'call'],
    requires_human_approval: true,
    cooldown_days: 20,
    minimum_confidence: 0.8,
    allowed_roles: ['manager'],
    exclusion_rules: ['open_complaint', 'recent_decline']
  },
  {
    code: 'PREFERRED_EMPLOYEE_FOLLOWUP',
    category: 'retention',
    titleAr: 'تواصل دافئ من الموظفة المفضلة',
    titleEn: 'Warm Outreach from Favorite Expert',
    eligible_channels: ['whatsapp'],
    requires_human_approval: true,
    cooldown_days: 14,
    minimum_confidence: 0.75,
    allowed_roles: ['manager', 'preferred_employee'],
    exclusion_rules: ['marketing_opt_out']
  },
  {
    code: 'SERVICE_RECOVERY_REQUIRED',
    category: 'recovery',
    titleAr: 'إجراء عاجل لمعالجة شكوى العميل',
    titleEn: 'Urgent Service Recovery Outreach',
    eligible_channels: ['call', 'whatsapp'],
    requires_human_approval: true,
    cooldown_days: 5,
    minimum_confidence: 0.9,
    allowed_roles: ['manager'],
    exclusion_rules: []
  },
  {
    code: 'PRODUCT_AFTERCARE_RECOMMENDATION',
    category: 'upsell',
    titleAr: 'توصية بمنتج العناية المنزلية الملائم',
    titleEn: 'Product Aftercare & Home Treatment Recommendation',
    eligible_channels: ['whatsapp'],
    requires_human_approval: true,
    cooldown_days: 30,
    minimum_confidence: 0.6,
    allowed_roles: ['manager', 'preferred_employee'],
    exclusion_rules: ['marketing_opt_out']
  }
];

// High fidelity immutable database for events tracking
const INITIAL_EVENTS_SEED: CustomerEvent[] = [
  // Sara Al-Mutairi historical events (c1)
  { id: 'ev-1', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c1', employee_id: 'e1', event_type: 'appointment_completed', event_date: '2025-12-15', service_id: 's1', product_id: null, gross_revenue: 120, discount_amount: 0, net_revenue: 120, direct_cost: 20, commission_amount: 15, metadata: {} },
  { id: 'ev-2', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c1', employee_id: 'e1', event_type: 'appointment_completed', event_date: '2026-01-05', service_id: 's1', product_id: null, gross_revenue: 120, discount_amount: 0, net_revenue: 120, direct_cost: 20, commission_amount: 15, metadata: {} },
  { id: 'ev-3', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c1', employee_id: 'e1', event_type: 'appointment_completed', event_date: '2026-01-29', service_id: 's1', product_id: null, gross_revenue: 120, discount_amount: 0, net_revenue: 120, direct_cost: 20, commission_amount: 15, metadata: {} },
  { id: 'ev-4', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c1', employee_id: 'e1', event_type: 'appointment_completed', event_date: '2026-02-24', service_id: 's3', product_id: null, gross_revenue: 600, discount_amount: 0, net_revenue: 600, direct_cost: 150, commission_amount: 60, metadata: {} },
  { id: 'ev-5', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c1', employee_id: 'e1', event_type: 'appointment_completed', event_date: '2026-03-24', service_id: 's3', product_id: null, gross_revenue: 600, discount_amount: 0, net_revenue: 600, direct_cost: 150, commission_amount: 60, metadata: {} },
  { id: 'ev-6', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c1', employee_id: 'e2', event_type: 'appointment_completed', event_date: '2026-04-10', service_id: 's6', product_id: null, gross_revenue: 220, discount_amount: 20, net_revenue: 200, direct_cost: 40, commission_amount: 20, metadata: {} },
  { id: 'ev-7', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c1', employee_id: null, event_type: 'message_sent', event_date: '2026-04-18', service_id: null, product_id: null, gross_revenue: 0, discount_amount: 0, net_revenue: 0, direct_cost: 0, commission_amount: 0, metadata: { message_type: 'reminder' } },
  { id: 'ev-8', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c1', employee_id: 'e1', event_type: 'appointment_completed', event_date: '2026-05-21', service_id: 's2', product_id: null, gross_revenue: 350, discount_amount: 0, net_revenue: 350, direct_cost: 90, commission_amount: 35, metadata: {} },
  { id: 'ev-9', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c1', employee_id: 'e1', event_type: 'product_purchased', event_date: '2026-05-21', service_id: null, product_id: 'p1', gross_revenue: 85, discount_amount: 0, net_revenue: 85, direct_cost: 30, commission_amount: 10, metadata: {} },
  { id: 'ev-10', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c1', employee_id: 'e1', event_type: 'recommendation_presented', event_date: '2026-05-21', service_id: null, product_id: 'p1', gross_revenue: 0, discount_amount: 0, net_revenue: 0, direct_cost: 0, commission_amount: 0, metadata: {} },
  { id: 'ev-11', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c1', employee_id: 'e1', event_type: 'recommendation_accepted', event_date: '2026-05-21', service_id: null, product_id: 'p1', gross_revenue: 0, discount_amount: 0, net_revenue: 0, direct_cost: 0, commission_amount: 0, metadata: {} },

  // Nouf Al-Otaibi (c2)
  { id: 'ev-20', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c2', employee_id: 'e1', event_type: 'appointment_completed', event_date: '2026-03-10', service_id: 's1', product_id: null, gross_revenue: 120, discount_amount: 0, net_revenue: 120, direct_cost: 20, commission_amount: 15, metadata: {} },
  { id: 'ev-21', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c2', employee_id: 'e1', event_type: 'appointment_completed', event_date: '2026-04-05', service_id: 's1', product_id: null, gross_revenue: 120, discount_amount: 0, net_revenue: 120, direct_cost: 20, commission_amount: 15, metadata: {} },
  { id: 'ev-22', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c2', employee_id: 'e1', event_type: 'appointment_completed', event_date: '2026-05-05', service_id: 's5', product_id: null, gross_revenue: 90, discount_amount: 0, net_revenue: 90, direct_cost: 15, commission_amount: 10, metadata: {} },

  // Hessa (c3)
  { id: 'ev-30', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c3', employee_id: 'e3', event_type: 'appointment_completed', event_date: '2026-02-15', service_id: 's5', product_id: null, gross_revenue: 90, discount_amount: 0, net_revenue: 90, direct_cost: 15, commission_amount: 10, metadata: {} },
  { id: 'ev-31', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c3', employee_id: 'e3', event_type: 'appointment_completed', event_date: '2026-03-20', service_id: 's5', product_id: null, gross_revenue: 90, discount_amount: 0, net_revenue: 90, direct_cost: 15, commission_amount: 10, metadata: {} },
  { id: 'ev-32', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c3', employee_id: 'e3', event_type: 'appointment_completed', event_date: '2026-04-28', service_id: 's5', product_id: null, gross_revenue: 90, discount_amount: 0, net_revenue: 90, direct_cost: 15, commission_amount: 10, metadata: {} },

  // Lama (c4)
  { id: 'ev-40', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c4', employee_id: 'e1', event_type: 'appointment_completed', event_date: '2026-04-12', service_id: 's1', product_id: null, gross_revenue: 120, discount_amount: 0, net_revenue: 120, direct_cost: 20, commission_amount: 15, metadata: {} },
  { id: 'ev-41', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c4', employee_id: 'e1', event_type: 'appointment_completed', event_date: '2026-05-15', service_id: 's1', product_id: null, gross_revenue: 120, discount_amount: 12, net_revenue: 108, direct_cost: 20, commission_amount: 12, metadata: {} },

  // Reema (c5)
  { id: 'ev-50', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c5', employee_id: 'e2', event_type: 'appointment_completed', event_date: '2026-03-01', service_id: 's4', product_id: null, gross_revenue: 280, discount_amount: 0, net_revenue: 280, direct_cost: 60, commission_amount: 30, metadata: {} },
  { id: 'ev-51', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c5', employee_id: 'e2', event_type: 'appointment_completed', event_date: '2026-04-15', service_id: 's4', product_id: null, gross_revenue: 280, discount_amount: 0, net_revenue: 280, direct_cost: 60, commission_amount: 30, metadata: {} },
  { id: 'ev-52', salon_id: 's-main', branch_id: 'br-riyadh', customer_id: 'c5', employee_id: 'e2', event_type: 'appointment_completed', event_date: '2026-05-27', service_id: 's4', product_id: null, gross_revenue: 280, discount_amount: 0, net_revenue: 280, direct_cost: 60, commission_amount: 30, metadata: {} }
];

// ==========================================
// 3. MAIN COMPONENT DECLARATION
// ==========================================

interface CustomerIntelligenceProps {
  initialClientId?: string;
}

export default function CustomerIntelligence({ initialClientId }: CustomerIntelligenceProps = {}) {
  const { lang, isAr, dir } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'segments' | 'profiles' | 'providers' | 'settings'>('overview');
  const [selectedClient, setSelectedClient] = useState<(Client & { metrics?: any }) | null>(null);
  const [profileSubTab, setProfileSubTab] = useState<'summary' | 'behavior' | 'services' | 'marketing' | 'financial' | 'experience'>('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterValue, setFilterValue] = useState<string>('all');
  
  // Settings & DB states stored in localStorage
  const [settings, setSettings] = useState<IntelligenceSettings>(() => {
    const saved = localStorage.getItem('confirmed_intel_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [eventLog, setEventLog] = useState<CustomerEvent[]>(() => {
    const saved = localStorage.getItem('confirmed_intel_events');
    return saved ? JSON.parse(saved) : INITIAL_EVENTS_SEED;
  });

  const [recList, setRecList] = useState<Recommendation[]>(() => {
    const saved = localStorage.getItem('confirmed_intel_recs');
    if (saved) return JSON.parse(saved);
    
    // Seed initial recommendation list matching screenshot
    return [
      {
        id: 'rec-sara',
        customer_id: 'c1',
        customer_name: 'سارة المطيري',
        code: 'PREFERRED_EMPLOYEE_FOLLOWUP',
        titleAr: 'تواصل شخصي من الموظفة المفضلة',
        titleEn: 'Warm Outreach from Favorite Expert',
        priority: 'high',
        score: 88,
        recommended_employee_id: 'e1',
        recommended_employee_name: 'نوف',
        channel: 'whatsapp',
        status: 'awaiting_review',
        ai_explanation_ar: 'كانت سارة تزور الصالون كل 24-30 يوماً، لكن مرّ 48 يوماً منذ آخر زيارة. انخفض متوسط إنفاقها 16% خلال آخر ثلاث زيارات، وتعتمد على موظفة واحدة في 78% من زياراتها.',
        ai_explanation_en: 'Sara visited the salon every 24-30 days, but 48 days have passed since her last visit. Average spending dropped 16% over the last 3 visits, and she is 78% employee-dependent.',
        message_draft_ar: 'مرحباً سارة، اشتقنا لكِ في صالون دلال! كيف هي نتائج خدمة صبغ الشعر الأخيرة؟ نوف تود الاطمئنان عليكِ وجدولة حجز قادم لخدمة قص شعر دافئة متى ما ناسبكِ الوقت.',
        message_draft_en: 'Hello Sara! We miss you at Dalal Salon. Nova wanted to check on your hair color results and offer a warm rebooking for hair styling at your convenience.',
        evidence: ['overdue_18_days', 'high_value', 'employee_dependency_78_percent'],
        warnings: ['لا يُنصح بإرسال خصم حالياً تجنباً للاعتياد.'],
        created_at: '2026-07-18'
      },
      {
        id: 'rec-nouf',
        customer_id: 'c2',
        customer_name: 'نوف العتيبي',
        code: 'REBOOKING_REMINDER',
        titleAr: 'تذكير بإعادة الحجز المعتاد',
        titleEn: 'Regular Rebooking Reminder',
        priority: 'medium',
        score: 72,
        recommended_employee_id: 'e1',
        recommended_employee_name: 'أمل',
        channel: 'whatsapp',
        status: 'awaiting_review',
        ai_explanation_ar: 'تخطت نوف معدل حجزها المعتاد للأظافر بـ 22 يوماً. نسبة الحضور للمواعيد ممتازة 100%، لذا هي جاهزة للتنبيه.',
        ai_explanation_en: 'Nouf exceeded her typical nail appointment rate by 22 days. Rebooking attendance rate is 100%, she is ready for a warm nudge.',
        message_draft_ar: 'أهلاً نوف! نود تذكيرك بموعد العناية المعتاد للأظافر مع أمل. هل تفضلين حجز موعد نهاية هذا الأسبوع؟',
        message_draft_en: 'Hi Nouf! Gentle reminder for your nail care with Amal. Would you like to book for this weekend?',
        evidence: ['overdue_22_days', 'perfect_attendance_100'],
        warnings: [],
        created_at: '2026-07-18'
      },
      {
        id: 'rec-hessa',
        customer_id: 'c3',
        customer_name: 'حصة الكثيري',
        code: 'HIGH_VALUE_CHURN_RISK',
        titleAr: 'تواصل شخصي مخصص لاستعادة عميلة نخبة',
        titleEn: 'Personal Outreach for High Value Churn Risk',
        priority: 'high',
        score: 85,
        recommended_employee_id: 'e3',
        recommended_employee_name: 'شهد',
        channel: 'whatsapp',
        status: 'awaiting_review',
        ai_explanation_ar: 'حصة عميلة ممتازة جداً ذات هامش مساهمة مرتفع، تأخرت 15 يوماً عن زيارتها المعتادة وتتسم بحساسية عالية تجاه المواعيد المتأخرة.',
        ai_explanation_en: 'Hessa is a top contributor with a high margin. She is 15 days overdue. Sensitive to booking delays.',
        message_draft_ar: 'مرحباً حصة الغالية، اشتقنا لكِ! شهد مجهزة لكِ مشروبك المعتاد بدون سكر وجلسة أظافر هادئة ومميزة لحجزكِ القادم.',
        message_draft_en: 'Dear Hessa, we miss you! Shahad has prepared your sugar-free drink and an absolute relaxing nails session.',
        evidence: ['overdue_15_days', 'high_contributor', 'sugar_free_tea_preference'],
        warnings: [],
        created_at: '2026-07-18'
      }
    ];
  });

  // Save state on change
  useEffect(() => {
    localStorage.setItem('confirmed_intel_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('confirmed_intel_events', JSON.stringify(eventLog));
  }, [eventLog]);

  useEffect(() => {
    localStorage.setItem('confirmed_intel_recs', JSON.stringify(recList));
  }, [recList]);

  // ==========================================
  // 4. METRICS & ENGINE COMPUTATION LOGIC
  // ==========================================

  const ANALYSIS_DATE = '2026-07-18';

  const getClientMetrics = (clientId: string): any => {
    const clientEvents = eventLog.filter(e => e.customer_id === clientId);
    const completed = clientEvents.filter(e => e.event_type === 'appointment_completed');
    
    // Total Revenue & Spend
    let totalRevenue = 0;
    let totalDirectCost = 0;
    let totalCommission = 0;
    let totalDiscount = 0;
    clientEvents.forEach(e => {
      totalRevenue += e.net_revenue;
      totalDirectCost += e.direct_cost;
      totalCommission += e.commission_amount;
      totalDiscount += e.discount_amount;
    });

    const netRevenue = totalRevenue;
    const contributionMarginAmount = Math.max(0, netRevenue - totalDirectCost - totalCommission);
    const contributionMarginPercent = netRevenue > 0 ? Math.round((contributionMarginAmount / netRevenue) * 100) : 0;
    const averageInvoice = completed.length > 0 ? Math.round(netRevenue / completed.length) : 0;

    // Recency Check
    let recencyDays = 45; // Default fallback
    let lastVisitDate = '2026-05-21';
    if (completed.length > 0) {
      completed.sort((a,b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
      lastVisitDate = completed[0].event_date;
      const diffTime = Math.abs(new Date(ANALYSIS_DATE).getTime() - new Date(lastVisitDate).getTime());
      recencyDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Expected Visit Interval (Median)
    let expectedInterval = settings.medianIntervalDefault;
    if (completed.length >= 3) {
      const dates = completed.map(c => new Date(c.event_date).getTime()).sort((a,b) => a - b);
      const intervals: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        intervals.push(Math.ceil((dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24)));
      }
      intervals.sort((a,b) => a - b);
      const mid = Math.floor(intervals.length / 2);
      expectedInterval = intervals.length % 2 !== 0 ? intervals[mid] : Math.round((intervals[mid - 1] + intervals[mid]) / 2);
    } else {
      expectedInterval = settings.medianIntervalDefault; 
    }

    // return ratio
    const returnRatio = recencyDays / expectedInterval;

    // Lifecycle determination
    let lifecycle: 'prospect' | 'new' | 'developing' | 'active' | 'due' | 'overdue' | 'at_risk' | 'churned' | 'reactivated' = 'active';
    if (completed.length === 0) {
      lifecycle = 'prospect';
    } else if (completed.length === 1) {
      lifecycle = 'new';
    } else if (completed.length === 2) {
      lifecycle = 'developing';
    } else {
      if (returnRatio < settings.thresholdDue) {
        lifecycle = 'active';
      } else if (returnRatio >= settings.thresholdDue && returnRatio < settings.thresholdOverdue) {
        lifecycle = 'due';
      } else if (returnRatio >= settings.thresholdOverdue && returnRatio < settings.thresholdAtRisk) {
        lifecycle = 'overdue';
      } else if (returnRatio >= settings.thresholdAtRisk && returnRatio < settings.thresholdChurned) {
        lifecycle = 'at_risk';
      } else {
        lifecycle = 'churned';
      }
    }

    // Employee Dependency calculation
    const empCounts: Record<string, number> = {};
    completed.forEach(c => {
      if (c.employee_id) {
        empCounts[c.employee_id] = (empCounts[c.employee_id] || 0) + 1;
      }
    });
    let preferredEmpId = null;
    let preferredEmpName = 'نوف';
    let maxEmpVisits = 0;
    Object.entries(empCounts).forEach(([empId, count]) => {
      if (count > maxEmpVisits) {
        maxEmpVisits = count;
        preferredEmpId = empId;
      }
    });
    const totalWithEmp = Object.values(empCounts).reduce((s,v) => s+v, 0);
    const employeeDependency = totalWithEmp > 0 ? maxEmpVisits / totalWithEmp : 0;

    // Value Tier
    let valueTier: 'very_high' | 'high' | 'medium' | 'developing' = 'medium';
    if (netRevenue >= 5000) {
      valueTier = 'very_high';
    } else if (netRevenue >= 2500) {
      valueTier = 'high';
    } else if (netRevenue >= 1000) {
      valueTier = 'medium';
    } else {
      valueTier = 'developing';
    }

    // Behavioral Signals
    const signals: string[] = [];
    if (employeeDependency >= settings.empDependencyLimit) signals.push('employee_dependent');
    if (returnRatio > 1.3) signals.push('declining_visits');
    if (valueTier === 'very_high' && returnRatio >= 1.2) signals.push('high_value_at_risk');
    if (totalDiscount > netRevenue * 0.15) signals.push('discount_dependent');

    return {
      clientId,
      completedVisits: completed.length,
      netRevenue,
      averageInvoice,
      recencyDays,
      lastVisitDate,
      expectedInterval,
      returnRatio,
      lifecycle,
      employeeDependency: Math.round(employeeDependency * 100),
      preferredEmpId,
      preferredEmpName: preferredEmpId === 'e1' ? 'أمل' : preferredEmpId === 'e2' ? 'دلال' : preferredEmpId === 'e3' ? 'شهد' : 'نوف',
      valueTier,
      contributionMarginAmount,
      contributionMarginPercent,
      signals
    };
  };

  // ==========================================
  // 5. SEED CLIENTS FROM TYPES
  // ==========================================

  const clientsData: (Client & { metrics: any })[] = [
    { id: 'c1', name: 'سارة المطيري', phone: '0551112222', visits: 12, loyaltyPoints: 125, notes: 'حساسية من مادة الأمونيا في الصبغات', metrics: getClientMetrics('c1') },
    { id: 'c2', name: 'نوف العتيبي', phone: '0553334444', visits: 8, loyaltyPoints: 80, notes: 'تفضل أمل دائماً لقص وسشوار الشعر', metrics: getClientMetrics('c2') },
    { id: 'c3', name: 'حصة الكثيري', phone: '0555556666', visits: 15, loyaltyPoints: 195, notes: 'تحب المشروبات الساخنة بدون سكر', metrics: getClientMetrics('c3') },
    { id: 'c4', name: 'لمى السبيعي', phone: '0557778888', visits: 5, loyaltyPoints: 50, notes: 'درجة لون الصبغة 6.35', metrics: getClientMetrics('c4') },
    { id: 'c5', name: 'ريما القحطاني', phone: '0559990000', visits: 22, loyaltyPoints: 340, notes: 'عضوة في باقة السبا الشهرية', metrics: getClientMetrics('c5') }
  ];

  // Auto-open a client profile when arriving from an external deep-link (e.g. CRM tab)
  useEffect(() => {
    if (initialClientId) {
      const target = clientsData.find(c => c.id === initialClientId);
      if (target) {
        setActiveTab('profiles');
        setSelectedClient(target);
        setProfileSubTab('summary');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClientId]);

  // Helper translations for statuses
  const translateLifecycle = (stage: string) => {
    switch (stage) {
      case 'prospect': return isAr ? 'محتملة' : 'Prospect';
      case 'new': return isAr ? 'جديدة' : 'New';
      case 'developing': return isAr ? 'قيد التطوير' : 'Developing';
      case 'active': return isAr ? 'نشطة' : 'Active';
      case 'due': return isAr ? 'حان موعد عودتها' : 'Due for Return';
      case 'overdue': return isAr ? 'متأخرة' : 'Overdue';
      case 'at_risk': return isAr ? 'معرضة للتسرب' : 'At Risk';
      case 'churned': return isAr ? 'متسربة' : 'Churned';
      case 'reactivated': return isAr ? 'تمت استعادتها' : 'Reactivated';
      default: return stage;
    }
  };

  const translateValueTier = (tier: string) => {
    switch (tier) {
      case 'very_high': return isAr ? 'قيمة فائقة' : 'Very High Value';
      case 'high': return isAr ? 'قيمة مرتفعة' : 'High Value';
      case 'medium': return isAr ? 'قيمة متوسطة' : 'Medium Value';
      case 'developing': return isAr ? 'قيمة منخفضة' : 'Developing Value';
      default: return tier;
    }
  };

  const translateSignal = (sig: string) => {
    switch (sig) {
      case 'employee_dependent': return isAr ? 'مرتبطة بموظفة واحدة' : 'Employee Dependent';
      case 'declining_visits': return isAr ? 'تراجع في الزيارات' : 'Declining Visits';
      case 'high_value_at_risk': return isAr ? 'قيمة عالية مهددة بالفقد' : 'High Value at Risk';
      case 'discount_dependent': return isAr ? 'تعتمد على الخصومات' : 'Discount Dependent';
      default: return sig;
    }
  };

  // Staff (Service Providers) performance metrics calculation
  const getStaffIntelMetrics = (staffId: string, name: string) => {
    const staffEvents = eventLog.filter(e => e.employee_id === staffId);
    const completedBookings = staffEvents.filter(e => e.event_type === 'appointment_completed');
    const totalSales = staffEvents.reduce((s, e) => s + e.net_revenue, 0);
    const totalCommission = staffEvents.reduce((s, e) => s + e.commission_amount, 0);

    // Calculate customer retention rate for this specific provider
    // Total distinct customers visited this provider, and how many returned
    const customerVisits: Record<string, number> = {};
    completedBookings.forEach(b => {
      customerVisits[b.customer_id] = (customerVisits[b.customer_id] || 0) + 1;
    });
    const distinctClients = Object.keys(customerVisits).length;
    const repeatClients = Object.values(customerVisits).filter(v => v > 1).length;
    const retentionRate = distinctClients > 0 ? Math.round((repeatClients / distinctClients) * 100) : 75; // high quality average baseline fallback

    return {
      totalBookings: completedBookings.length + (staffId === 'e1' ? 42 : staffId === 'e2' ? 28 : 34),
      retentionScore: retentionRate,
      grossRevenue: totalSales + (staffId === 'e1' ? 8400 : staffId === 'e2' ? 12400 : 6400),
      commission: totalCommission + (staffId === 'e1' ? 840 : staffId === 'e2' ? 1240 : 640),
      averageTicketSize: completedBookings.length > 0 ? Math.round(totalSales / completedBookings.length) : (staffId === 'e1' ? 200 : staffId === 'e2' ? 440 : 180),
      activeClients: distinctClients || (staffId === 'e1' ? 15 : staffId === 'e2' ? 9 : 12),
      rating: staffId === 'e1' ? 4.9 : staffId === 'e2' ? 4.8 : 4.7
    };
  };

  // ==========================================
  // 6. ACTION DISPATCH & REJECTION WORKFLOW
  // ==========================================

  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [rejectReasonModal, setRejectReasonModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('not_relevant');
  const [customRejectReason, setCustomRejectReason] = useState('');
  
  const handleApproveRecommendation = (id: string) => {
    setRecList(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
  };

  const handleEditRecommendationDraft = (id: string, text: string) => {
    setRecList(prev => prev.map(r => r.id === id ? { ...r, message_draft_ar: text, status: 'edited' } : r));
    setEditingDraft(null);
  };

  const handleExecuteRecommendation = (id: string) => {
    setRecList(prev => prev.map(r => r.id === id ? { ...r, status: 'executed' } : r));
    // Create outcome log entry as event
    const rec = recList.find(r => r.id === id);
    if (rec) {
      const newEvent: CustomerEvent = {
        id: 'ev-out-' + Math.random().toString(36).substring(2, 9),
        salon_id: 's-main',
        branch_id: 'br-riyadh',
        customer_id: rec.customer_id,
        employee_id: rec.recommended_employee_id,
        event_type: 'message_sent',
        event_date: ANALYSIS_DATE,
        service_id: null,
        product_id: null,
        gross_revenue: 0,
        discount_amount: 0,
        net_revenue: 0,
        direct_cost: 0,
        commission_amount: 0,
        metadata: { recommendation_code: rec.code, channel: rec.channel }
      };
      setEventLog(prev => [...prev, newEvent]);
    }
  };

  const handleRejectRecommendation = (id: string) => {
    setRecList(prev => prev.map(r => r.id === id ? { 
      ...r, 
      status: 'rejected',
      warnings: [...r.warnings, `تم رفض الترشيح بسبب: ${rejectReason === 'other' ? customRejectReason : rejectReason}`] 
    } : r));
    setRejectReasonModal(null);
    setCustomRejectReason('');
  };

  // Filter clients list for UI search/filter
  const filteredClients = clientsData.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
    const matchesStage = filterStage === 'all' || c.metrics.lifecycle === filterStage;
    const matchesValue = filterValue === 'all' || c.metrics.valueTier === filterValue;
    return matchesSearch && matchesStage && matchesValue;
  });

  // Chart dataset generation
  const relationshipStagesData = [
    { name: isAr ? 'جديدة' : 'New', value: 126 },
    { name: isAr ? 'نشطة' : 'Active', value: 438 },
    { name: isAr ? 'حان وقت عودتها' : 'Due', value: 82 },
    { name: isAr ? 'معرضة للتسرب' : 'At Risk', value: 47 },
    { name: isAr ? 'متسربة' : 'Churned', value: 54 },
  ];

  const donutRevenueData = [
    { name: isAr ? 'عميلات جديدات' : 'New Customers', value: 32, label: '32%', color: '#FF5A5F' },
    { name: isAr ? 'عميلات عائدات' : 'Retained Customers', value: 68, label: '68%', color: '#14332B' }
  ];

  return (
    <div className="space-y-6" dir={dir}>
      
      {/* Tab Selectors */}
      <div className="flex border-b border-[#E9E7E2] gap-1 select-none">
        <button
          onClick={() => { setSelectedClient(null); setActiveTab('overview'); }}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'overview' && !selectedClient
              ? 'border-[#FF5A5F] text-[#FF5A5F]'
              : 'border-transparent text-[#6E6A63] hover:text-[#1C1B18]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{isAr ? 'تحليل سلوك العميلات' : 'Customer Behavior Analysis'}</span>
        </button>
        <button
          onClick={() => { setSelectedClient(null); setActiveTab('segments'); }}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'segments'
              ? 'border-[#FF5A5F] text-[#FF5A5F]'
              : 'border-transparent text-[#6E6A63] hover:text-[#1C1B18]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{isAr ? 'شرائح العملاء' : 'Customer Segments'}</span>
        </button>
        <button
          onClick={() => { setSelectedClient(null); setActiveTab('profiles'); }}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'profiles' && !selectedClient
              ? 'border-[#FF5A5F] text-[#FF5A5F]'
              : 'border-transparent text-[#6E6A63] hover:text-[#1C1B18]'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{isAr ? 'بروفايل العملاء' : 'Client Profiles'}</span>
        </button>
        <button
          onClick={() => { setSelectedClient(null); setActiveTab('providers'); }}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'providers'
              ? 'border-[#FF5A5F] text-[#FF5A5F]'
              : 'border-transparent text-[#6E6A63] hover:text-[#1C1B18]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>{isAr ? 'بروفايل مقدمي الخدمة' : 'Service Provider Profiles'}</span>
        </button>
        <button
          onClick={() => { setSelectedClient(null); setActiveTab('settings'); }}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'border-[#FF5A5F] text-[#FF5A5F]'
              : 'border-transparent text-[#6E6A63] hover:text-[#1C1B18]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{isAr ? 'إعدادات الذكاء الاصطناعي' : 'Engine Settings'}</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        
        {/* ==========================================
            VIEW 1: CLIENT INTELLIGENCE MAIN OVERVIEW
            ========================================== */}
        {activeTab === 'overview' && !selectedClient && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header info */}
            <div className="bg-[#14332B] text-white p-6 rounded-2xl relative overflow-hidden shadow-xs">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF5A5F]/10 rounded-full blur-2xl" />
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="bg-[#FF5A5F] text-white px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase mb-2 inline-block">
                    {isAr ? 'محرك ذكاء العميل المفسّر' : 'EXPLAINABLE REVENUE INTELLIGENCE'}
                  </span>
                  <h2 className="text-xl md:text-2xl font-serif font-black">{isAr ? 'بوابة تحليل سلوك العميلات المتقدمة' : 'Salon Customer Intelligence Hub'}</h2>
                  <p className="text-slate-300 text-xs mt-1 font-sans">
                    {isAr ? 'فهم حركة العميلات وقيمتهن ومخاطر فقدهن لاتخاذ قرارات تسويقية وتوصيات ذكية أدق' : 'Analyze retention rates, values, drop-off risks and automate personalized campaigns.'}
                  </p>
                </div>
                <div className="flex gap-2 text-xs font-mono bg-white/10 px-4 py-2.5 rounded-xl border border-white/10">
                  <span>💡 {isAr ? 'إصدار MVP مستقر ومحمي من الاختلاقات' : 'Explainable Rule-Based Safe Architecture'}</span>
                </div>
              </div>
            </div>

            {/* KPI Cards Section */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-[#14332B] p-5 rounded-2xl shadow-xs flex justify-between items-start col-span-2 lg:col-span-3">
                <div className="space-y-1">
                  <span className="text-xs text-white/60 font-medium block">{isAr ? 'إجمالي العملاء' : 'Total Clients'}</span>
                  <span className="text-4xl font-bold text-white block font-mono">{clientsData.length.toLocaleString()}</span>
                  <span className="text-[10px] text-white/50 font-medium block">{isAr ? 'عميل مسجّل' : 'registered clients'}</span>
                </div>
                <div className="p-3 bg-white/10 rounded-xl text-white">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E9E7E2] shadow-xs flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs text-[#6E6A63] font-medium block">{isAr ? 'العميلات الجديدات' : 'New Customers'}</span>
                  <span className="text-2xl md:text-3xl font-bold text-slate-900 block font-mono">126</span>
                  <span className="text-[10px] text-emerald-600 font-bold block">↑ 14% {isAr ? 'عن الفترة السابقة' : 'vs previous'}</span>
                </div>
                <div className="p-3 bg-red-50 rounded-xl text-[#FF5A5F]">
                  <User className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E9E7E2] shadow-xs flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs text-[#6E6A63] font-medium block">{isAr ? 'العميلات المحتفظ بهن' : 'Retained Customers'}</span>
                  <span className="text-2xl md:text-3xl font-bold text-slate-900 block font-mono">438</span>
                  <span className="text-[10px] text-emerald-600 font-bold block">★ 68% {isAr ? 'من الإيرادات الكلية' : 'of total revenues'}</span>
                </div>
                <div className="p-3 bg-[#14332B]/5 rounded-xl text-[#14332B]">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E9E7E2] shadow-xs flex justify-between items-start col-span-2 lg:col-span-1">
                <div className="space-y-2">
                  <span className="text-xs text-[#6E6A63] font-medium block">{isAr ? 'العميلات المتسربات' : 'Churned Customers'}</span>
                  <span className="text-2xl md:text-3xl font-bold text-[#FF5A5F] block font-mono">54</span>
                  <span className="text-[10px] text-[#FF5A5F] font-bold block">⚠️ 31,400 {isAr ? 'ر.س مهددة بالفقد' : 'SAR Value at Risk'}</span>
                </div>
                <div className="p-3 bg-red-50 rounded-xl text-[#FF5A5F]">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E9E7E2] shadow-xs flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs text-[#6E6A63] font-medium block">{isAr ? 'معدل الاحتفاظ' : 'Retention Rate'}</span>
                  <span className="text-2xl md:text-3xl font-bold text-slate-900 block font-mono">64.8%</span>
                  <span className="text-[10px] text-emerald-600 font-bold block">↑ 3.2% {isAr ? 'نقطة زيادة' : 'pts increase'}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-700">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E9E7E2] shadow-xs flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs text-[#6E6A63] font-medium block">{isAr ? 'صافي الإيرادات' : 'Net Revenue'}</span>
                  <span className="text-2xl md:text-3xl font-bold text-slate-900 block font-mono">284,600 <span className="text-xs font-bold text-[#6E6A63]">{isAr ? 'ر.س' : 'SAR'}</span></span>
                  <span className="text-[10px] text-emerald-600 font-bold block">↑ 11.5% {isAr ? 'مقارنة بالربع الماضي' : 'vs last quarter'}</span>
                </div>
                <div className="p-3 bg-[#14332B]/5 rounded-xl text-[#14332B]">
                  <Percent className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E9E7E2] shadow-xs flex justify-between items-start col-span-2 lg:col-span-1">
                <div className="space-y-2">
                  <span className="text-xs text-[#6E6A63] font-medium block">{isAr ? 'هامش مساهمة العميلات' : 'Customer Contribution Margin'}</span>
                  <span className="text-2xl md:text-3xl font-bold text-slate-900 block font-mono">42%</span>
                  <span className="text-[10px] text-slate-500 font-bold block">💰 119,500 {isAr ? 'ر.س هامش ربح' : 'SAR net margin'}</span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-amber-700">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Sub Metric indicators block (5 micro KPIs) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white/80 border border-[#E9E7E2] px-4 py-3 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[10px] text-[#6E6A63] font-bold">{isAr ? 'حان موعد عودتهن' : 'Due for Return'}</p>
                  <p className="text-lg font-black text-[#14332B] font-mono">82</p>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="bg-white/80 border border-[#E9E7E2] px-4 py-3 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[10px] text-[#6E6A63] font-bold">{isAr ? 'معرضات للتسرب' : 'At Risk'}</p>
                  <p className="text-lg font-black text-amber-600 font-mono">47</p>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>
              <div className="bg-white/80 border border-[#E9E7E2] px-4 py-3 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[10px] text-[#6E6A63] font-bold">{isAr ? 'عالية القيمة ومعرضة للفقد' : 'High Value at Risk'}</p>
                  <p className="text-lg font-black text-[#FF5A5F] font-mono">13</p>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5A5F]" />
              </div>
              <div className="bg-white/80 border border-[#E9E7E2] px-4 py-3 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[10px] text-[#6E6A63] font-bold">{isAr ? 'تمت استعادتهن' : 'Reactivated'}</p>
                  <p className="text-lg font-black text-blue-700 font-mono">21</p>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              </div>
              {/* معدل تراجع الزيارات — محسوب من البيانات الفعلية */}
              {(() => {
                const decliningCount = clientsData.filter(c => c.metrics.signals.includes('declining_visits')).length;
                const decliningRate  = clientsData.length ? Math.round((decliningCount / clientsData.length) * 100) : 0;
                const isHigh = decliningRate >= 30;
                return (
                  <div className={`border px-4 py-3 rounded-xl shadow-xs col-span-2 md:col-span-1 ${isHigh ? 'bg-red-50/80 border-red-200' : 'bg-white/80 border-[#E9E7E2]'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-[10px] font-bold ${isHigh ? 'text-red-600' : 'text-[#6E6A63]'}`}>
                        {isAr ? 'معدل تراجع الزيارات' : 'Visit Decline Rate'}
                      </p>
                      <TrendingDown className={`w-3.5 h-3.5 ${isHigh ? 'text-red-500' : 'text-slate-400'}`} />
                    </div>
                    <p className={`text-lg font-black font-mono ${isHigh ? 'text-red-600' : 'text-slate-700'}`}>
                      {decliningRate}%
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                      {decliningCount} / {clientsData.length} {isAr ? 'عميل' : 'clients'}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Donut Chart */}
              <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] shadow-xs space-y-4">
                <h3 className="font-serif text-sm font-bold text-slate-800">{isAr ? 'توزيع الإيرادات حسب فئة العميلات' : 'Revenue Distribution by Client Loyalty'}</h3>
                <div className="h-64 flex flex-col md:flex-row items-center justify-around gap-4">
                  <div className="w-full h-48 max-w-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutRevenueData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {donutRevenueData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 shrink-0">
                    {donutRevenueData.map((d, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-[#6E6A63] font-medium">{d.name}</span>
                        <span className="font-bold text-slate-900 font-mono">({d.label})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bar Chart: Relationship Stages */}
              <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] shadow-xs space-y-4">
                <h3 className="font-serif text-sm font-bold text-slate-800">{isAr ? 'مراحل العلاقة وعدد العميلات' : 'Relationship Stages and Client Volume'}</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={relationshipStagesData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" stroke="#6E6A63" fontSize={11} tickLine={false} />
                      <YAxis stroke="#6E6A63" fontSize={11} tickLine={false} />
                      <Tooltip cursor={{ fill: '#F8FAFC' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {relationshipStagesData.map((entry, index) => {
                          const colors = ['#FF5A5F', '#14332B', '#FFAE34', '#EF4444', '#64748B'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Customers requiring action table */}
            <div className="bg-white rounded-2xl border border-[#E9E7E2] overflow-hidden shadow-xs">
              <div className="p-5 border-b border-[#E9E7E2] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-serif text-base font-bold text-slate-900">{isAr ? 'العميلات اللاتي يحتجن إلى إجراء أو مراجعة' : 'Clients Requiring Proactive Intervention'}</h3>
                  <p className="text-xs text-[#6E6A63] mt-1">{isAr ? 'عميلات مهددات بالفقد أو متأخرات تم احتساب ترشيحاتهن وتوصياتهن حالياً' : 'Automated score filters flag due/at-risk customers requiring rebooking outreach.'}</p>
                </div>
                
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  <div className="relative flex-1 md:flex-initial">
                    <Search className="w-4 h-4 text-slate-400 absolute top-2.5 right-3" />
                    <input
                      type="text"
                      placeholder={isAr ? 'البحث عن عميلة...' : 'Search customer...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full md:w-48 py-2 text-xs bg-[#F6F6F4] rounded-xl border border-[#E9E7E2] focus:outline-none focus:border-[#FF5A5F] ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                    />
                  </div>
                  
                  <select
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value)}
                    className="p-2 bg-[#F6F6F4] border border-[#E9E7E2] text-xs font-bold rounded-xl focus:outline-none"
                  >
                    <option value="all">{isAr ? 'كل الفئات' : 'All Stages'}</option>
                    <option value="active">{isAr ? 'نشطة' : 'Active'}</option>
                    <option value="due">{isAr ? 'حان موعد عودتها' : 'Due'}</option>
                    <option value="overdue">{isAr ? 'متأخرة' : 'Overdue'}</option>
                    <option value="at_risk">{isAr ? 'معرضة للتسرب' : 'At Risk'}</option>
                  </select>

                  <select
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="p-2 bg-[#F6F6F4] border border-[#E9E7E2] text-xs font-bold rounded-xl focus:outline-none"
                  >
                    <option value="all">{isAr ? 'جميع مستويات القيمة' : 'All Value Levels'}</option>
                    <option value="very_high">{isAr ? 'قيمة فائقة' : 'Very High'}</option>
                    <option value="high">{isAr ? 'قيمة مرتفعة' : 'High'}</option>
                    <option value="medium">{isAr ? 'قيمة متوسطة' : 'Medium'}</option>
                  </select>
                </div>
              </div>

              {/* Table rendering */}
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-[#6E6A63] border-b border-[#E9E7E2]">
                      <th className={`p-4 text-start font-bold ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'العميلة' : 'Customer'}</th>
                      <th className={`p-4 text-start font-bold ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'مرحلة العلاقة' : 'Relationship Stage'}</th>
                      <th className={`p-4 text-start font-bold ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'مستوى القيمة' : 'Value Level'}</th>
                      <th className={`p-4 text-start font-bold ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الإشارات السلوكية' : 'Behavioral Signals'}</th>
                      <th className={`p-4 text-start font-bold ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'آخر زيارة' : 'Last Visit'}</th>
                      <th className={`p-4 text-start font-bold ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الإيرادات' : 'Revenues'}</th>
                      <th className={`p-4 text-start font-bold ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الإجراء المقترح' : 'Action suggested'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => {
                      const clientRec = recList.find(r => r.customer_id === client.id);
                      return (
                        <tr 
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className="border-b border-[#F1F5F9] hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="p-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#14332B] text-white flex items-center justify-center font-bold text-xs">
                              {client.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-[#1C1B18]">{client.name}</p>
                              <p className="text-[10px] text-slate-500">{client.phone}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              client.metrics.lifecycle === 'active' ? 'bg-emerald-50 text-emerald-700' :
                              client.metrics.lifecycle === 'due' ? 'bg-blue-50 text-blue-700' :
                              client.metrics.lifecycle === 'overdue' ? 'bg-amber-50 text-amber-700' :
                              'bg-red-50 text-red-600'
                            }`}>
                              {translateLifecycle(client.metrics.lifecycle)}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="font-medium text-slate-700">{translateValueTier(client.metrics.valueTier)}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {client.metrics.signals.length === 0 ? (
                                <span className="text-[10px] text-slate-400 font-medium">✔️ {isAr ? 'زيارات منتظمة' : 'Regular visits'}</span>
                              ) : (
                                client.metrics.signals.map((sig: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 bg-slate-100 text-[#6E6A63] text-[9px] rounded-md font-bold">
                                    {translateSignal(sig)}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold text-[#6E6A63]">
                            {client.metrics.lastVisitDate} ({client.metrics.recencyDays} {isAr ? 'يوم' : 'days'})
                          </td>
                          <td className="p-4 font-mono font-bold text-[#14332B]">
                            {client.metrics.netRevenue.toLocaleString()} ر.س
                          </td>
                          <td className="p-4">
                            {clientRec ? (
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 w-fit ${
                                clientRec.status === 'executed' ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-[#FF5A5F] border border-red-100'
                              }`}>
                                <Sparkles className="w-3.5 h-3.5" />
                                {clientRec.status === 'executed' ? (isAr ? 'تم الإرسال والتواصل' : 'Outreach sent') : (isAr ? 'تواصل شخصي متاح' : 'Outreach candidate')}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px] font-medium">✔️ {isAr ? 'متابعة اعتيادية' : 'Normal routine'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        )}

        {/* ==========================================
            VIEW 2: CLIENT PROFILES GRID
            ========================================== */}
        {activeTab === 'profiles' && !selectedClient && (
          <motion.div
            key="profiles-grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="bg-[#14332B] text-white p-6 rounded-2xl relative overflow-hidden shadow-xs">
              <div className="absolute top-0 left-0 w-40 h-40 bg-[#FF5A5F]/10 rounded-full blur-3xl" />
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="bg-[#FF5A5F] text-white px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase mb-2 inline-block">
                    {isAr ? 'بروفايل شامل لكل عميلة' : 'FULL CLIENT PROFILES'}
                  </span>
                  <h2 className="text-xl font-serif font-black">{isAr ? 'ملفات العميلات التعريفية' : 'Client Profile Directory'}</h2>
                  <p className="text-slate-300 text-xs mt-1">{isAr ? 'اضغطي على أي عميلة لعرض ملفها الكامل وتحليل سلوكها ونتائجها المالية' : 'Click on any client to view her full behavioural profile and financial analysis.'}</p>
                </div>
                {/* Summary pill */}
                <div className="flex gap-3 shrink-0">
                  <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-center">
                    <span className="text-xl font-black font-mono block">{clientsData.length}</span>
                    <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wide">{isAr ? 'عميلة مسجلة' : 'Clients'}</span>
                  </div>
                  <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-center">
                    <span className="text-xl font-black font-mono block">{clientsData.filter(c => c.metrics.valueTier === 'very_high' || c.metrics.valueTier === 'high').length}</span>
                    <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wide">{isAr ? 'عميلة VIP' : 'VIP Clients'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className={`w-4 h-4 text-slate-400 absolute top-3 ${isAr ? 'right-4' : 'left-4'}`} />
              <input
                type="text"
                placeholder={isAr ? 'ابحثي عن عميلة باسمها أو رقمها...' : 'Search by name or phone...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full py-3 text-sm bg-white rounded-2xl border border-[#E9E7E2] focus:outline-none focus:border-[#FF5A5F] shadow-xs ${isAr ? 'pr-11 pl-4' : 'pl-11 pr-4'}`}
              />
            </div>

            {/* Client Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredClients.map((client) => {
                const m = client.metrics;
                const clientRec = recList.find(r => r.customer_id === client.id && r.status !== 'rejected' && r.status !== 'executed');
                const lifecycleColors: Record<string, string> = {
                  active:     'bg-emerald-50 text-emerald-700',
                  due:        'bg-blue-50 text-blue-700',
                  overdue:    'bg-amber-50 text-amber-700',
                  at_risk:    'bg-red-50 text-red-600',
                  churned:    'bg-slate-100 text-slate-500',
                  new:        'bg-purple-50 text-purple-700',
                  developing: 'bg-sky-50 text-sky-700',
                };
                const tierColors: Record<string, string> = {
                  very_high:  'bg-[#FF5A5F]/10 text-[#FF5A5F]',
                  high:       'bg-amber-50 text-amber-700',
                  medium:     'bg-slate-100 text-slate-600',
                  developing: 'bg-slate-50 text-slate-400',
                };
                return (
                  <motion.div
                    key={client.id}
                    whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                    onClick={() => { setSelectedClient(client); setProfileSubTab('summary'); }}
                    className="bg-white rounded-2xl border border-[#E9E7E2] overflow-hidden shadow-xs cursor-pointer group transition-all"
                  >
                    {/* Card header strip */}
                    <div className="bg-gradient-to-r from-[#14332B] to-[#1a4a3a] px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center font-serif font-black text-lg border border-white/20">
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">{client.name}</p>
                          <p className="text-slate-300 text-[10px] font-mono">{client.phone}</p>
                        </div>
                      </div>
                      <ArrowLeft className={`w-4 h-4 text-white/50 group-hover:text-white transition-colors ${!isAr ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Badges row */}
                    <div className="px-5 pt-3 flex gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${lifecycleColors[m.lifecycle] || 'bg-slate-100 text-slate-500'}`}>
                        {translateLifecycle(m.lifecycle)}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${tierColors[m.valueTier] || 'bg-slate-100 text-slate-500'}`}>
                        {translateValueTier(m.valueTier)}
                      </span>
                      {clientRec && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#FF5A5F]/10 text-[#FF5A5F] flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          {isAr ? 'يوجد توصية' : 'Action pending'}
                        </span>
                      )}
                    </div>

                    {/* Stats grid */}
                    <div className="px-5 pt-3 pb-4 grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-[#F8FAFC] rounded-xl">
                        <span className="text-[9px] text-[#6E6A63] font-bold block">{isAr ? 'الزيارات' : 'Visits'}</span>
                        <span className="text-sm font-black text-slate-900 font-mono block">{m.completedVisits}</span>
                      </div>
                      <div className="p-2 bg-[#F8FAFC] rounded-xl">
                        <span className="text-[9px] text-[#6E6A63] font-bold block">{isAr ? 'الإيرادات' : 'Revenue'}</span>
                        <span className="text-sm font-black text-[#14332B] font-mono block">{m.netRevenue.toLocaleString()}</span>
                        <span className="text-[8px] text-slate-400 font-bold">ر.س</span>
                      </div>
                      <div className="p-2 bg-[#F8FAFC] rounded-xl">
                        <span className="text-[9px] text-[#6E6A63] font-bold block">{isAr ? 'آخر زيارة' : 'Last Visit'}</span>
                        <span className={`text-sm font-black font-mono block ${m.recencyDays > m.expectedInterval ? 'text-[#FF5A5F]' : 'text-slate-900'}`}>
                          {m.recencyDays} {isAr ? 'ي' : 'd'}
                        </span>
                      </div>
                    </div>

                    {/* Notes snippet */}
                    {client.notes && (
                      <div className="mx-5 mb-4 px-3 py-2 bg-amber-50/60 border border-amber-100 rounded-xl">
                        <p className="text-[9px] text-amber-800 font-bold truncate">📝 {client.notes}</p>
                      </div>
                    )}

                    {/* CTA */}
                    <div className="border-t border-[#F1F5F9] px-5 py-3 flex items-center justify-between">
                      <span className="text-[9px] text-[#6E6A63] font-bold">{isAr ? 'الموظفة المفضلة:' : 'Preferred expert:'} {m.preferredEmpName}</span>
                      <span className="text-[9px] font-bold text-[#FF5A5F] group-hover:underline">
                        {isAr ? 'عرض الملف الكامل ←' : 'View Profile →'}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {filteredClients.length === 0 && (
              <div className="text-center py-16 space-y-2">
                <Search className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-400">{isAr ? 'لا توجد نتائج مطابقة' : 'No clients found'}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ==========================================
            VIEW 3: INDIVIDUAL CUSTOMER PROFILE VIEW
            ========================================== */}
        {selectedClient && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Back button */}
            <button 
              onClick={() => setSelectedClient(null)}
              className="flex items-center gap-2 text-xs font-bold text-[#6E6A63] hover:text-[#FF5A5F] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isAr ? 'العودة لتحليل سلوك العميلات الشامل' : 'Back to Behavioral Analytics'}</span>
            </button>

            {/* Profile main header */}
            <div className="bg-white rounded-2xl border border-[#E9E7E2] p-6 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#14332B] text-white flex items-center justify-center font-serif font-black text-2xl">
                    {selectedClient.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900">{selectedClient.name}</h2>
                      <span className="bg-[#FF5A5F]/10 text-[#FF5A5F] px-2.5 py-0.5 rounded-full text-[9px] font-bold">
                        {translateValueTier(selectedClient.metrics.valueTier)}
                      </span>
                      <span className="bg-[#14332B]/10 text-[#14332B] px-2.5 py-0.5 rounded-full text-[9px] font-bold">
                        {translateLifecycle(selectedClient.metrics.lifecycle)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1">📱 {selectedClient.phone} · {isAr ? 'عميلة مسجلة بالفرع' : 'Registered loyal customer'}</p>
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer">
                    <Calendar className="w-4 h-4" />
                    <span>{isAr ? 'حجز موعد' : 'Book Appointment'}</span>
                  </button>
                  <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#FF5A5F] hover:bg-[#ff4248] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs">
                    <MessageSquare className="w-4 h-4" />
                    <span>{isAr ? 'إرسال رسالة' : 'Send Message'}</span>
                  </button>
                </div>
              </div>

              {/* Badges list */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-[#F1F5F9]">
                <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md font-bold">
                  {isAr ? 'التواصل التسويقي: مسموح' : 'Marketing Consent: Allowed'}
                </span>
                {selectedClient.metrics.signals.map((sig: string, i: number) => (
                  <span key={i} className="text-[10px] text-[#FF5A5F] bg-red-50 px-2.5 py-1 rounded-md font-bold">
                    {translateSignal(sig)}
                  </span>
                ))}
              </div>
            </div>

            {/* Profile sub navigation */}
            <div className="flex border-b border-[#E9E7E2] overflow-x-auto select-none gap-1">
              {[
                { id: 'summary', label: isAr ? 'نظرة عامة' : 'Overview' },
                { id: 'behavior', label: isAr ? 'تحليل السلوك' : 'Behavior Analysis' },
                { id: 'services', label: isAr ? 'الخدمات المفضلة' : 'Favourite Services' },
                { id: 'marketing', label: isAr ? 'التسويق والتواصل' : 'Marketing Communications' },
                { id: 'financial', label: isAr ? 'القيمة والربحية' : 'Value & Margin' },
                { id: 'experience', label: isAr ? 'التجربة والشكاوى' : 'Complaints & Recovery' }
              ].map(subTab => (
                <button
                  key={subTab.id}
                  onClick={() => setProfileSubTab(subTab.id as any)}
                  className={`px-4 py-2.5 text-xs font-bold transition-all shrink-0 border-b-2 ${
                    profileSubTab === subTab.id
                      ? 'border-[#FF5A5F] text-[#FF5A5F]'
                      : 'border-transparent text-[#6E6A63] hover:text-slate-900'
                  }`}
                >
                  {subTab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {profileSubTab === 'summary' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Metric grids for this customer */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-[#E9E7E2] shadow-xs text-center space-y-1">
                      <span className="text-[10px] text-[#6E6A63] font-bold block">{isAr ? 'آخر زيارة' : 'Last Visit'}</span>
                      <span className="text-base font-black text-slate-900 block font-mono">منذ {selectedClient.metrics.recencyDays} يوم</span>
                      <span className="text-[9px] text-[#6E6A63] font-medium block">{selectedClient.metrics.lastVisitDate}</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-[#E9E7E2] shadow-xs text-center space-y-1">
                      <span className="text-[10px] text-[#6E6A63] font-bold block">{isAr ? 'موعد العودة المتوقع' : 'Expected Rebooking'}</span>
                      <span className={`text-base font-black block font-mono ${selectedClient.metrics.recencyDays > selectedClient.metrics.expectedInterval ? 'text-[#FF5A5F]' : 'text-[#14332B]'}`}>
                        {selectedClient.metrics.recencyDays > selectedClient.metrics.expectedInterval 
                          ? `${isAr ? 'متأخرة' : 'Overdue'} ${selectedClient.metrics.recencyDays - selectedClient.metrics.expectedInterval} ${isAr ? 'يوم' : 'days'}`
                          : (isAr ? 'خلال الموعد' : 'Within slot')
                        }
                      </span>
                      <span className="text-[9px] text-[#FF5A5F] font-bold block">🚨 {isAr ? 'المخاطرة: مرتفعة' : 'Risk Level: High'}</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-[#E9E7E2] shadow-xs text-center space-y-1">
                      <span className="text-[10px] text-[#6E6A63] font-bold block">{isAr ? 'الزيارات المكتملة' : 'Completed Visits'}</span>
                      <span className="text-base font-black text-slate-900 block font-mono">{selectedClient.metrics.completedVisits}</span>
                      <span className="text-[9px] text-slate-500 block">⭐ {isAr ? 'حضور تام للمواعيد' : 'Excellent attendance'}</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-[#E9E7E2] shadow-xs text-center space-y-1">
                      <span className="text-[10px] text-[#6E6A63] font-bold block">{isAr ? 'صافي الإيرادات' : 'Net Revenue'}</span>
                      <span className="text-base font-black text-[#14332B] block font-mono">{selectedClient.metrics.netRevenue.toLocaleString()} ر.س</span>
                      <span className="text-[9px] text-slate-500 block">💎 {isAr ? 'إيرادات محققة' : 'Delivered spend'}</span>
                    </div>

                    <div className="bg-[#14332B]/5 p-4 rounded-xl border border-[#E9E7E2] shadow-xs text-center space-y-1">
                      <span className="text-[10px] text-[#14332B] font-bold block">{isAr ? 'هامش المساهمة' : 'Contribution Margin'}</span>
                      <span className="text-base font-black text-[#14332B] block font-mono">{selectedClient.metrics.contributionMarginPercent}%</span>
                      <span className="text-[9px] text-slate-600 block">{selectedClient.metrics.contributionMarginAmount.toLocaleString()} ر.س</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-[#E9E7E2] shadow-xs text-center space-y-1">
                      <span className="text-[10px] text-[#6E6A63] font-bold block">{isAr ? 'متوسط الفاتورة' : 'Average Invoice'}</span>
                      <span className="text-base font-black text-slate-900 block font-mono">{selectedClient.metrics.averageInvoice} ر.س</span>
                      <span className="text-[9px] text-slate-500 block">⚡ {isAr ? 'معدل سلة مرتفع' : 'Premium Basket Size'}</span>
                    </div>
                  </div>

                  {/* Recommendation action and AI summary */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Left: AI behavioral summary */}
                    <div className="bg-white p-5 rounded-2xl border border-[#E9E7E2] space-y-4 shadow-xs relative">
                      <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
                        <h4 className="font-serif text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#FF5A5F]" />
                          <span>{isAr ? 'ملخص السلوك بالذكاء الاصطناعي (AI)' : 'AI Behavioral Insight Summarizer'}</span>
                        </h4>
                        <span className="text-[10px] font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          {isAr ? 'مستوى الثقة: مرتفع' : 'Confidence: High 98%'}
                        </span>
                      </div>

                      {/* AI logic description */}
                      <p className="text-xs text-slate-700 leading-relaxed font-sans bg-[#F6F6F4]/50 p-4 rounded-xl border border-dashed border-[#E9E7E2]">
                        {selectedClient.id === 'c1' 
                          ? 'كانت سارة تزور الصالون كل 24-30 يوماً، لكن مرّ 48 يوماً منذ آخر زيارة. انخفض متوسط إنفاقها 16% خلال آخر ثلاث زيارات، وتعتمد على موظفة واحدة في 78% من زياراتها.'
                          : `تظهر تحليلات المواعيد أن ${selectedClient.name} تحافظ على تواصل إيجابي. تبلغ الفاصل الزمني المعتاد بين زياراتها ${selectedClient.metrics.expectedInterval} يوماً، ونسبة اعتماديتها على خبيرتها المفضلة ${selectedClient.metrics.employeeDependency}% .`
                        }
                      </p>

                      <div className="grid grid-cols-4 gap-2 pt-2 text-center">
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <span className="text-[9px] text-[#6E6A63] block">{isAr ? 'الاعتماد على الموظفة' : 'Emp Dependency'}</span>
                          <span className="text-xs font-bold text-slate-800 block font-mono">{selectedClient.metrics.employeeDependency}%</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <span className="text-[9px] text-[#6E6A63] block">{isAr ? 'الإنفاق' : 'Spending Trend'}</span>
                          <span className="text-xs font-bold text-[#FF5A5F] block font-mono">-16%</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <span className="text-[9px] text-[#6E6A63] block">{isAr ? 'الفاصل الحالي' : 'Current Interval'}</span>
                          <span className="text-xs font-bold text-slate-800 block font-mono">{selectedClient.metrics.recencyDays} {isAr ? 'يوم' : 'd'}</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <span className="text-[9px] text-[#6E6A63] block">{isAr ? 'الفاصل المعتاد' : 'Typical Interval'}</span>
                          <span className="text-xs font-bold text-slate-800 block font-mono">{selectedClient.metrics.expectedInterval} {isAr ? 'يوم' : 'd'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Suggested Action Box */}
                    <div className="bg-white p-5 rounded-2xl border border-[#E9E7E2] space-y-4 shadow-xs">
                      <h4 className="font-serif text-sm font-bold text-[#14332B] border-b border-[#F1F5F9] pb-3 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-[#FF5A5F]" />
                        <span>{isAr ? 'الإجراء المقترح والمحقق للنمو' : 'Suggested Decision & Approved Outreach'}</span>
                      </h4>

                      {/* Render active recommendation */}
                      {recList.filter(r => r.customer_id === selectedClient.id && r.status !== 'rejected').map(rec => (
                        <div key={rec.id} className="space-y-4">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{isAr ? rec.titleAr : rec.titleEn}</p>
                            <p className="text-[11px] text-slate-500 mt-1">{isAr ? 'للإشارة إلى أن نسبة قبول الترشيح مرتفعة بناءً على التاريخ السلوكي.' : 'Calculated deterministic rules validate this outreach.'}</p>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-[#F8FAFC] p-3 rounded-xl text-center border border-slate-100">
                            <div>
                              <span className="text-[9px] text-[#6E6A63] block">{isAr ? 'الأولوية' : 'Priority'}</span>
                              <span className="text-xs font-bold text-[#FF5A5F] block">🚩 {isAr ? 'مرتفعة' : 'High'}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-[#6E6A63] block">{isAr ? 'الموظفة المعتمدة' : 'Assigned Staff'}</span>
                              <span className="text-xs font-bold text-slate-800 block">{rec.recommended_employee_name || 'نوف'}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-[#6E6A63] block">{isAr ? 'القناة' : 'Channel'}</span>
                              <span className="text-xs font-bold text-[#14332B] block">💬 {rec.channel.toUpperCase()}</span>
                            </div>
                          </div>

                          {/* Message draft review */}
                          <div className="space-y-2">
                            <span className="text-[10px] text-[#6E6A63] font-bold block">{isAr ? 'مسودة الرسالة المقترحة (اضغط للتعديل)' : 'Outreach Message Preview (Click to Edit)'}</span>
                            {editingDraft === rec.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editedText}
                                  onChange={(e) => setEditedText(e.target.value)}
                                  rows={3}
                                  className="w-full p-3 text-xs bg-white border border-[#FF5A5F] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF5A5F]"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditRecommendationDraft(rec.id, editedText)}
                                    className="px-3 py-1.5 bg-[#FF5A5F] text-white text-[10px] font-bold rounded-lg hover:bg-red-600 transition-colors"
                                  >
                                    {isAr ? 'حفظ التعديل' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setEditingDraft(null)}
                                    className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-200"
                                  >
                                    {isAr ? 'إلغاء' : 'Cancel'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                onClick={() => { setEditingDraft(rec.id); setEditedText(rec.message_draft_ar); }}
                                className="bg-[#FF5A5F]/5 p-3 rounded-xl border border-[#FF5A5F]/15 text-xs text-slate-700 leading-relaxed font-sans cursor-pointer hover:bg-[#FF5A5F]/10 transition-colors"
                              >
                                {rec.message_draft_ar}
                              </div>
                            )}
                          </div>

                          {/* Safety warning */}
                          {rec.warnings.map((w, index) => (
                            <div key={index} className="bg-amber-50 text-amber-800 p-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-amber-150">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>{w}</span>
                            </div>
                          ))}

                          {/* Interactive controls */}
                          <div className="flex gap-2 pt-1 select-none">
                            {rec.status === 'awaiting_review' || rec.status === 'edited' ? (
                              <>
                                <button
                                  onClick={() => handleApproveRecommendation(rec.id)}
                                  className="flex-1 py-2 bg-[#14332B] text-white text-xs font-bold rounded-xl hover:bg-emerald-850 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>{isAr ? 'موافقة واعتماد' : 'Approve'}</span>
                                </button>
                                <button
                                  onClick={() => setRejectReasonModal(rec.id)}
                                  className="py-2 px-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
                                  title={isAr ? 'تجاهل / رفض' : 'Ignore'}
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            ) : rec.status === 'approved' ? (
                              <button
                                onClick={() => handleExecuteRecommendation(rec.id)}
                                className="w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                              >
                                <Send className="w-4 h-4" />
                                <span>{isAr ? 'إرسال الرسالة للعميل عبر الواتساب' : 'Send via WhatsApp'}</span>
                              </button>
                            ) : (
                              <div className="w-full text-center py-2.5 bg-slate-100 text-[#6E6A63] text-xs font-bold rounded-xl flex items-center justify-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                                <span>{isAr ? 'تم تنفيذ التوصية وإرسالها بنجاح' : 'Outreach delivered successfully'}</span>
                              </div>
                            )}
                          </div>

                        </div>
                      ))}

                      {/* Fallback if no actions are available */}
                      {recList.filter(r => r.customer_id === selectedClient.id && r.status !== 'rejected').length === 0 && (
                        <div className="text-center py-8 space-y-2">
                          <p className="text-xs font-bold text-slate-800">✔️ {isAr ? 'لا توجد إجراءات معلقة حالياً' : 'No Action Required'}</p>
                          <p className="text-[10px] text-slate-400">{isAr ? 'العميلة ضمن جدول زياراتها الطبيعي ولا تتطلب تدخلاً.' : 'Customer is behaving within regular median rebooking patterns.'}</p>
                        </div>
                      )}

                    </div>

                  </div>

                  {/* Chart and history row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Value Distribution */}
                    <div className="bg-white p-5 rounded-2xl border border-[#E9E7E2] space-y-4 shadow-xs">
                      <h4 className="font-serif text-sm font-bold text-slate-900">{isAr ? 'الخدمات المفضلة' : 'Favourite Services'}</h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-[#14332B]">{isAr ? 'خدمات الشعر' : 'Hair Services'}</span>
                            <span className="font-mono font-bold">5,940 ر.س</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: '75%' }} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-[#14332B]">{isAr ? 'المنتجات والمشتريات' : 'Purchased Products'}</span>
                            <span className="font-mono font-bold">1,120 ر.س</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: '15%' }} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-[#14332B]">{isAr ? 'خدمات السبا والأخرى' : 'Spa & Other'}</span>
                            <span className="font-mono font-bold">790 ر.س</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: '10%' }} />
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-lg font-bold text-center">
                          ℹ️ {isAr ? 'تتمحور 68% من زيارات العميله مع الموظفة نوف' : '68% of this client value is captured by expert Nova.'}
                        </div>
                      </div>
                    </div>

                    {/* Relationship Intervals tracking line chart */}
                    <div className="bg-white p-5 rounded-2xl border border-[#E9E7E2] space-y-4 shadow-xs">
                      <h4 className="font-serif text-sm font-bold text-slate-900">{isAr ? 'مؤشرات الفواصل الزمنية للزيارات (بالأيام)' : 'Visit Rebooking Intervals Tracking (Days)'}</h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={[
                            { name: isAr ? 'زيارة ١' : 'Visit 1', value: 21 },
                            { name: isAr ? 'زيارة ٢' : 'Visit 2', value: 24 },
                            { name: isAr ? 'زيارة ٣' : 'Visit 3', value: 26 },
                            { name: isAr ? 'زيارة ٤' : 'Visit 4', value: 28 },
                            { name: isAr ? 'زيارة ٥' : 'Visit 5', value: 25 },
                            { name: isAr ? 'الزيارة الحالية' : 'Current', value: selectedClient.metrics.recencyDays }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="name" stroke="#6E6A63" fontSize={10} tickLine={false} />
                            <YAxis stroke="#6E6A63" fontSize={10} tickLine={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#14332B" strokeWidth={3} dot={{ r: 5, fill: '#FF5A5F' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-[10px] text-center text-[#6E6A63] font-bold">
                        {isAr ? 'الخط الأحمر يوضح تجاوز الفاصل الحالي الفاصل المتوقع البالغ ٢٧ يوماً' : 'Red dot signals substantial deviation from customer historical typical median interval.'}
                      </p>
                    </div>

                  </div>

                  {/* Customer Interactions Feed */}
                  <div className="bg-white rounded-2xl border border-[#E9E7E2] overflow-hidden shadow-xs">
                    <div className="p-4 bg-[#F8FAFC] border-b border-[#E9E7E2]">
                      <h4 className="font-serif text-sm font-bold text-slate-800">{isAr ? 'سجل التفاعلات والزيارات الأخير للعميلة' : 'Immutable Event Log & Customer Response Timeline'}</h4>
                    </div>
                    <div className="divide-y divide-[#F1F5F9]">
                      {eventLog.filter(e => e.customer_id === selectedClient.id).slice(0, 5).map((ev) => (
                        <div key={ev.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl shrink-0 ${
                              ev.event_type === 'appointment_completed' ? 'bg-emerald-50 text-emerald-700' :
                              ev.event_type === 'product_purchased' ? 'bg-blue-50 text-blue-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              <Activity className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">
                                {ev.event_type === 'appointment_completed' ? (isAr ? 'زيارة مكتملة بالفواتير' : 'Completed Appointment Visit') :
                                 ev.event_type === 'product_purchased' ? (isAr ? 'توصية بمنتج تجميل وتم الشراء' : 'Beauty Product Purchased') :
                                 (isAr ? 'رسالة تذكير وإشعار واتساب تلقائي' : 'SaaS Reminder Message Dispatched')
                                }
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {ev.employee_id ? `${isAr ? 'الموظفة المعتمدة:' : 'Expert staff:'} ${ev.employee_id === 'e1' ? 'أمل' : ev.employee_id === 'e2' ? 'دلال' : 'شهد'}` : (isAr ? 'مرسل عبر النظام السحابي' : 'System automated communication')}
                              </p>
                            </div>
                          </div>
                          <div className="text-end">
                            <span className="font-mono font-bold block text-slate-700">{ev.event_date}</span>
                            <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                              {ev.net_revenue > 0 ? `+ ${ev.net_revenue} ر.س` : (isAr ? 'تم القراءة' : 'Delivered')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </motion.div>
              )}

              {profileSubTab === 'behavior' && (
                <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] text-center py-12 space-y-2">
                  <Activity className="w-12 h-12 text-[#14332B] mx-auto animate-pulse" />
                  <h3 className="font-serif text-sm font-bold text-slate-900">{isAr ? 'تحليل الأنماط السلوكية والاعتمادية' : 'Provider Dependency Graph'}</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">{isAr ? 'تعتمد هذه العميلة بنسبة 78٪ على الموظفة نوف لإجراء خدمات الشعر، مع ثبات تام في سلوك الحضور بنسبة 100٪.' : 'Shows that 78% of her loyalty rests on Nova, with 100% attendance.'}</p>
                </div>
              )}

              {profileSubTab === 'services' && (
                <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] text-center py-12 space-y-2">
                  <BookOpen className="w-12 h-12 text-[#14332B] mx-auto" />
                  <h3 className="font-serif text-sm font-bold text-slate-900">{isAr ? 'تاريخ الخدمات ومقترحات الشراء القادمة' : 'Service & Upsell Catalogue'}</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">{isAr ? 'تم شراء شامبو علاجي 500مل مسبقاً بنجاح. الترشيح القادم المعتمد: سيروم للشعر التالف بعد 12 يوماً.' : 'Prior purchasing history highlights strong hair serum upselling opportunity.'}</p>
                </div>
              )}

              {profileSubTab === 'marketing' && (
                <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] text-center py-12 space-y-2">
                  <MessageSquare className="w-12 h-12 text-[#14332B] mx-auto" />
                  <h3 className="font-serif text-sm font-bold text-slate-900">{isAr ? 'استجابة الحملات التسويقية والواتساب' : 'Marketing Response Audit'}</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">{isAr ? 'تم إرسال تذكير واحد وقرأته دون تفاعل فوري. لا ينصح بتكثيف التواصل حالياً لتجنب الانزعاج.' : 'One communication read, no immediate booking. Frequency capped at 1 outreach/14 days.'}</p>
                </div>
              )}

              {profileSubTab === 'financial' && (
                <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] text-center py-12 space-y-2">
                  <Percent className="w-12 h-12 text-[#14332B] mx-auto" />
                  <h3 className="font-serif text-sm font-bold text-slate-900">{isAr ? 'الربحية وصافي الهامش الفردي للعميل' : 'Customer Profitability Index'}</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">{isAr ? 'تبلغ تكلفة تقديم الخدمة المباشرة 28٪ والعمولات المقتطعة 12٪، مما يوفر هامش مساهمة ممتاز بنسبة 41٪.' : 'Net lifetime contribution to salon stands at 3,220 SAR.'}</p>
                </div>
              )}

              {profileSubTab === 'experience' && (
                <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] text-center py-12 space-y-2">
                  <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto" />
                  <h3 className="font-serif text-sm font-bold text-slate-900">{isAr ? 'جودة التجربة وسجل معالجة الشكاوى' : 'Service Experience Tracking'}</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">{isAr ? 'لا توجد شكاوى أو طلبات إعادة خدمة (Rework) مسجلة لهذه العميله. مستوى الرضا الكلي: 5/5' : 'No complaints, no refunds. CSAT stands perfectly at 5/5.'}</p>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ==========================================
            VIEW 3: SERVICE PROVIDER PROFILES
            ========================================== */}
        {activeTab === 'providers' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header description */}
            <div className="bg-[#14332B] text-white p-5 rounded-2xl relative overflow-hidden shadow-xs">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF5A5F]/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <h2 className="text-lg md:text-xl font-serif font-black">{isAr ? 'ملفات مقدمي الخدمة المتقدمة (Staff)' : 'Service Provider Intelligence Profiles'}</h2>
                <p className="text-slate-300 text-xs mt-1 font-sans">
                  {isAr ? 'مراقبة أداء الموظفين، معدل استبقاء العميلات لديهم، إجمالي الإيرادات، والعمولات المستحقة' : 'Monitor provider client retention, average rating, gross revenue, and commissions.'}
                </p>
              </div>
            </div>

            {/* Providers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: 'e1', name: 'أمل', role: 'خبيرة شعر', avatar: 'أ' },
                { id: 'e2', name: 'دلال', role: 'خبيرة بشرة وسبا', avatar: 'د' },
                { id: 'e3', name: 'شهد', role: 'فنية أظافر', avatar: 'ش' },
                { id: 'e4', name: 'جواهر', role: 'خبيرة مكياج', avatar: 'ج' }
              ].map(prov => {
                const metrics = getStaffIntelMetrics(prov.id, prov.name);
                return (
                  <div key={prov.id} className="bg-white p-6 rounded-2xl border border-[#E9E7E2] shadow-xs space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#14332B]/5 text-[#14332B] font-bold text-lg flex items-center justify-center border border-[#14332B]/10">
                          {prov.avatar}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">{prov.name}</h3>
                          <span className="bg-[#FF5A5F]/5 text-[#FF5A5F] px-2.5 py-0.5 rounded-full text-[9px] font-bold">{prov.role}</span>
                        </div>
                      </div>

                      {/* Provider rating */}
                      <div className="flex items-center gap-1 text-xs bg-amber-50 text-amber-800 px-2 py-1 rounded-lg">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                        <span className="font-mono font-bold">{metrics.rating}</span>
                      </div>
                    </div>

                    {/* Stats columns */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-center text-xs">
                      <div className="p-2.5 bg-[#F8FAFC] rounded-xl border border-slate-100">
                        <span className="text-[10px] text-[#6E6A63] block font-medium">{isAr ? 'الحجوزات المكتملة' : 'Completed visits'}</span>
                        <span className="text-sm font-bold text-slate-800 block mt-0.5 font-mono">{metrics.totalBookings}</span>
                      </div>
                      <div className="p-2.5 bg-[#F8FAFC] rounded-xl border border-slate-100">
                        <span className="text-[10px] text-[#6E6A63] block font-medium">{isAr ? 'معدل الاحتفاظ' : 'Retention Rate'}</span>
                        <span className="text-sm font-bold text-emerald-700 block mt-0.5 font-mono">{metrics.retentionScore}%</span>
                      </div>
                      <div className="p-2.5 bg-[#F8FAFC] rounded-xl border border-slate-100">
                        <span className="text-[10px] text-[#6E6A63] block font-medium">{isAr ? 'إجمالي المبيعات' : 'Sales Revenue'}</span>
                        <span className="text-sm font-bold text-slate-800 block mt-0.5 font-mono">{metrics.grossRevenue.toLocaleString()} ر.س</span>
                      </div>
                      <div className="p-2.5 bg-[#F8FAFC] rounded-xl border border-slate-100 col-span-2 md:col-span-1">
                        <span className="text-[10px] text-[#6E6A63] block font-medium">{isAr ? 'العمولة المستحقة' : 'Commission'}</span>
                        <span className="text-sm font-bold text-slate-800 block mt-0.5 font-mono">{metrics.commission.toLocaleString()} ر.س</span>
                      </div>
                    </div>

                    {/* Highly dependent clients info */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] text-[#6E6A63] font-bold block">👥 {isAr ? 'أبرز العميلات المترددات بانتظام عليها:' : 'Regular Returning Clients:'}</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {prov.id === 'e1' ? (
                          <>
                            <span className="px-2 py-1 bg-slate-50 border border-slate-100 text-[10px] rounded-md font-bold">سارة المطيري (78% {isAr ? 'ارتباط' : 'dep'})</span>
                            <span className="px-2 py-1 bg-slate-50 border border-slate-100 text-[10px] rounded-md font-bold">نوف العتيبي</span>
                          </>
                        ) : prov.id === 'e2' ? (
                          <span className="px-2 py-1 bg-slate-50 border border-slate-100 text-[10px] rounded-md font-bold">ريما القحطاني</span>
                        ) : (
                          <span className="px-2 py-1 bg-slate-50 border border-slate-100 text-[10px] rounded-md font-bold">حصة الكثيري</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ==========================================
            VIEW 4: SETTINGS & MANAGER CONFIGURATION
            ========================================== */}
        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] shadow-xs space-y-6">
              <h3 className="font-serif text-base font-bold text-slate-900 border-b border-[#F1F5F9] pb-3 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-[#FF5A5F]" />
                <span>{isAr ? 'لوحة تهيئة إعدادات محرك التوصيات وقواعد العمل' : 'SaaS Recommendation Engine Parameters'}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Threshold settings */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#14332B] uppercase tracking-wider">{isAr ? '١. حدود وفترات استحقاق فئات العلاقة (Return Ratio)' : '1. Lifecycle Threshold Parameters'}</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-[#6E6A63] font-bold block">{isAr ? 'حد حان موعد عودتها (Due ratio):' : 'Due for Return ratio threshold:'}</label>
                      <input
                        type="range"
                        min="0.5"
                        max="1.0"
                        step="0.05"
                        value={settings.thresholdDue}
                        onChange={(e) => setSettings({ ...settings, thresholdDue: parseFloat(e.target.value) })}
                        className="w-full mt-1 accent-[#FF5A5F]"
                      />
                      <span className="text-[11px] font-mono font-bold text-[#1C1B18] mt-1 block">{settings.thresholdDue} ( {isAr ? 'من الفاصل المعتاد للعميلة' : 'of typical client interval'} )</span>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#6E6A63] font-bold block">{isAr ? 'حد متأخرة عن الحجز (Overdue ratio):' : 'Overdue ratio threshold:'}</label>
                      <input
                        type="range"
                        min="1.0"
                        max="1.4"
                        step="0.05"
                        value={settings.thresholdOverdue}
                        onChange={(e) => setSettings({ ...settings, thresholdOverdue: parseFloat(e.target.value) })}
                        className="w-full mt-1 accent-[#FF5A5F]"
                      />
                      <span className="text-[11px] font-mono font-bold text-[#1C1B18] mt-1 block">{settings.thresholdOverdue}</span>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#6E6A63] font-bold block">{isAr ? 'حد معرضة للتسرب (At risk ratio):' : 'At Risk ratio threshold:'}</label>
                      <input
                        type="range"
                        min="1.4"
                        max="1.9"
                        step="0.05"
                        value={settings.thresholdAtRisk}
                        onChange={(e) => setSettings({ ...settings, thresholdAtRisk: parseFloat(e.target.value) })}
                        className="w-full mt-1 accent-[#FF5A5F]"
                      />
                      <span className="text-[11px] font-mono font-bold text-[#1C1B18] mt-1 block">{settings.thresholdAtRisk}</span>
                    </div>
                  </div>
                </div>

                {/* Weights settings */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#14332B] uppercase tracking-wider">{isAr ? '٢. أوزان معادلة فرز واحتساب النقاط (Opportunity Scoring)' : '2. Opportunity Scoring Weights'}</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-[#6E6A63] font-bold block">{isAr ? 'معدل الملاءمة للصالون:' : 'Relevance Score weight:'}</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.weights.relevance}
                        onChange={(e) => setSettings({ ...settings, weights: { ...settings.weights, relevance: parseFloat(e.target.value) } })}
                        className="w-full p-2 bg-[#F6F6F4] text-xs font-mono font-bold rounded-lg border border-[#E9E7E2]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#6E6A63] font-bold block">{isAr ? 'معدل التوقيت الزمني (Timing):' : 'Timing Score weight:'}</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.weights.timing}
                        onChange={(e) => setSettings({ ...settings, weights: { ...settings.weights, timing: parseFloat(e.target.value) } })}
                        className="w-full p-2 bg-[#F6F6F4] text-xs font-mono font-bold rounded-lg border border-[#E9E7E2]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#6E6A63] font-bold block">{isAr ? 'معدل التجاوب التاريخي:' : 'Historical Response weight:'}</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.weights.response}
                        onChange={(e) => setSettings({ ...settings, weights: { ...settings.weights, response: parseFloat(e.target.value) } })}
                        className="w-full p-2 bg-[#F6F6F4] text-xs font-mono font-bold rounded-lg border border-[#E9E7E2]"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Reset defaults controls */}
              <div className="pt-4 border-t border-[#F1F5F9] flex justify-end">
                <button
                  onClick={() => { setSettings(DEFAULT_SETTINGS); localStorage.removeItem('confirmed_intel_settings'); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isAr ? 'إعادة الإعدادات الافتراضية' : 'Reset Defaults'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            VIEW: CUSTOMER SEGMENTS
            ========================================== */}
        {activeTab === 'segments' && !selectedClient && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="bg-[#14332B] text-white p-6 rounded-2xl relative overflow-hidden shadow-xs">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFAE34]/10 rounded-full blur-2xl" />
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="bg-[#FFAE34] text-[#14332B] px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase mb-2 inline-block">
                    {isAr ? 'تصنيف ذكي تلقائي' : 'SMART AUTO-SEGMENTATION'}
                  </span>
                  <h2 className="text-xl md:text-2xl font-serif font-black">{isAr ? 'شرائح العملاء' : 'Customer Segments'}</h2>
                  <p className="text-slate-300 text-xs mt-1">
                    {isAr ? 'تصنيف العملاء تلقائياً حسب القيمة ومرحلة العلاقة والسلوك الشرائي' : 'Clients auto-classified by value tier, lifecycle stage, and purchase behaviour.'}
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-center">
                    <span className="text-xl font-black font-mono block">{clientsData.length}</span>
                    <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wide">{isAr ? 'إجمالي العملاء' : 'Total Clients'}</span>
                  </div>
                  <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-center">
                    <span className="text-xl font-black font-mono block">4</span>
                    <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wide">{isAr ? 'شريحة نشطة' : 'Active Segments'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── شرائح القيمة ─────────────────────────── */}
            <div>
              <h3 className="font-serif text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-[#FF5A5F] rounded-full inline-block" />
                {isAr ? 'الشرائح حسب مستوى القيمة' : 'Segments by Value Tier'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    tier: 'very_high',
                    labelAr: 'قيمة فائقة',
                    labelEn: 'Very High Value',
                    descAr: 'صافي إيراد ≥ 5,000 ر.س',
                    descEn: 'Net revenue ≥ 5,000 SAR',
                    color: '#FF5A5F',
                    bg: 'bg-[#FF5A5F]/5 border-[#FF5A5F]/15',
                    iconBg: 'bg-[#FF5A5F]/10',
                    icon: '👑',
                  },
                  {
                    tier: 'high',
                    labelAr: 'قيمة مرتفعة',
                    labelEn: 'High Value',
                    descAr: 'صافي إيراد 2,500 – 4,999 ر.س',
                    descEn: 'Net revenue 2,500–4,999 SAR',
                    color: '#FFAE34',
                    bg: 'bg-[#FFAE34]/5 border-[#FFAE34]/15',
                    iconBg: 'bg-[#FFAE34]/10',
                    icon: '⭐',
                  },
                  {
                    tier: 'medium',
                    labelAr: 'قيمة متوسطة',
                    labelEn: 'Medium Value',
                    descAr: 'صافي إيراد 1,000 – 2,499 ر.س',
                    descEn: 'Net revenue 1,000–2,499 SAR',
                    color: '#14332B',
                    bg: 'bg-[#14332B]/5 border-[#14332B]/15',
                    iconBg: 'bg-[#14332B]/10',
                    icon: '🌿',
                  },
                  {
                    tier: 'developing',
                    labelAr: 'قيد التطوير',
                    labelEn: 'Developing',
                    descAr: 'صافي إيراد < 1,000 ر.س',
                    descEn: 'Net revenue < 1,000 SAR',
                    color: '#6E6A63',
                    bg: 'bg-slate-50 border-slate-200',
                    iconBg: 'bg-slate-100',
                    icon: '🌱',
                  },
                ].map((seg) => {
                  const group = clientsData.filter(c => c.metrics.valueTier === seg.tier);
                  const totalRevenue = group.reduce((s, c) => s + c.metrics.netRevenue, 0);
                  const pct = clientsData.length ? Math.round((group.length / clientsData.length) * 100) : 0;
                  return (
                    <div key={seg.tier} className={`bg-white rounded-2xl border p-5 shadow-xs ${seg.bg}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-10 h-10 rounded-xl ${seg.iconBg} flex items-center justify-center text-lg`}>
                          {seg.icon}
                        </div>
                        <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${seg.color}15`, color: seg.color }}>
                          {pct}%
                        </span>
                      </div>
                      <p className="font-serif text-sm font-bold text-slate-900 mb-0.5">{isAr ? seg.labelAr : seg.labelEn}</p>
                      <p className="text-[10px] text-slate-400 mb-4">{isAr ? seg.descAr : seg.descEn}</p>
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="text-3xl font-black font-mono" style={{ color: seg.color }}>{group.length}</span>
                          <span className="text-[10px] text-slate-400 ms-1">{isAr ? 'عميل' : 'clients'}</span>
                        </div>
                        <div className="text-end">
                          <p className="text-[10px] text-slate-400">{isAr ? 'إيراد الشريحة' : 'Segment revenue'}</p>
                          <p className="text-xs font-black font-mono text-slate-700">{totalRevenue.toLocaleString()} <span className="text-[9px] font-normal">{isAr ? 'ر.س' : 'SAR'}</span></p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: seg.color }} />
                      </div>
                      {/* Client names */}
                      {group.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {group.map(c => (
                            <button
                              key={c.id}
                              onClick={() => { setSelectedClient(c); setProfileSubTab('summary'); }}
                              className="text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all hover:opacity-80 cursor-pointer"
                              style={{ backgroundColor: `${seg.color}10`, color: seg.color, borderColor: `${seg.color}25` }}
                            >
                              {c.name.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── شرائح دورة الحياة ───────────────────── */}
            <div>
              <h3 className="font-serif text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-[#14332B] rounded-full inline-block" />
                {isAr ? 'الشرائح حسب مرحلة العلاقة' : 'Segments by Lifecycle Stage'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { stage: 'active',     labelAr: 'نشطة',               labelEn: 'Active',          descAr: 'تزور ضمن الفترة المتوقعة',         descEn: 'Visiting within expected interval',        color: '#10b981', badge: 'bg-emerald-50 text-emerald-700' },
                  { stage: 'due',        labelAr: 'حان موعد عودتها',    labelEn: 'Due for Return',   descAr: 'تجاوزت الفترة المعتادة قليلاً',     descEn: 'Slightly past expected return date',       color: '#3B82F6', badge: 'bg-blue-50 text-blue-700' },
                  { stage: 'overdue',    labelAr: 'متأخرة',              labelEn: 'Overdue',          descAr: 'تأخرت عن موعدها بشكل ملحوظ',        descEn: 'Notably past expected return date',        color: '#FFAE34', badge: 'bg-amber-50 text-amber-700' },
                  { stage: 'at_risk',    labelAr: 'معرضة للتسرب',       labelEn: 'At Risk',          descAr: 'خطر فقدان يتطلب تدخلاً فورياً',     descEn: 'High churn risk — needs immediate action', color: '#FF5A5F', badge: 'bg-red-50 text-red-600' },
                  { stage: 'new',        labelAr: 'جديدة',               labelEn: 'New',              descAr: 'أتمت زيارة واحدة فقط حتى الآن',     descEn: 'Completed only one visit so far',          color: '#8B5CF6', badge: 'bg-purple-50 text-purple-700' },
                  { stage: 'developing', labelAr: 'قيد البناء',          labelEn: 'Developing',       descAr: 'بين الزيارة الأولى والثالثة',        descEn: 'Between first and third visit',            color: '#06b6d4', badge: 'bg-sky-50 text-sky-700' },
                ].map((seg) => {
                  const group = clientsData.filter(c => c.metrics.lifecycle === seg.stage);
                  const avgRevenue = group.length ? Math.round(group.reduce((s, c) => s + c.metrics.netRevenue, 0) / group.length) : 0;
                  const avgVisitsLocal = group.length ? Math.round(group.reduce((s, c) => s + c.metrics.completedVisits, 0) / group.length) : 0;
                  return (
                    <div key={seg.stage} className="bg-white rounded-2xl border border-[#E9E7E2] p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${seg.badge}`}>
                          {isAr ? seg.labelAr : seg.labelEn}
                        </span>
                        <span className="text-2xl font-black font-mono" style={{ color: seg.color }}>
                          {group.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">{isAr ? seg.descAr : seg.descEn}</p>
                      <div className="grid grid-cols-2 gap-2 text-center mb-3">
                        <div className="bg-[#F6F6F4] rounded-xl p-2">
                          <p className="text-sm font-black font-mono text-slate-800">{avgRevenue.toLocaleString()}</p>
                          <p className="text-[9px] text-slate-400">{isAr ? 'متوسط الإيراد' : 'Avg revenue'}</p>
                        </div>
                        <div className="bg-[#F6F6F4] rounded-xl p-2">
                          <p className="text-sm font-black font-mono text-slate-800">{avgVisitsLocal}</p>
                          <p className="text-[9px] text-slate-400">{isAr ? 'متوسط الزيارات' : 'Avg visits'}</p>
                        </div>
                      </div>
                      {group.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {group.map(c => (
                            <button
                              key={c.id}
                              onClick={() => { setSelectedClient(c); setProfileSubTab('summary'); }}
                              className="text-[9px] font-bold px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-all"
                              style={{ backgroundColor: `${seg.color}10`, color: seg.color, borderColor: `${seg.color}25` }}
                            >
                              {c.name.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-300 italic">{isAr ? 'لا يوجد عملاء في هذه الشريحة حالياً' : 'No clients in this segment'}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── ملخص الشرائح جدول ───────────────────── */}
            <div className="bg-white rounded-2xl border border-[#E9E7E2] overflow-hidden shadow-xs">
              <div className="p-5 border-b border-[#E9E7E2]">
                <h3 className="font-serif text-sm font-bold text-slate-900">{isAr ? 'ملخص توزيع العملاء' : 'Client Distribution Summary'}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{isAr ? 'نظرة شاملة على كل شريحة مع أبرز المؤشرات' : 'Full overview of every segment with key metrics'}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-[#6E6A63] border-b border-[#E9E7E2]">
                      <th className="p-4 text-start font-bold">{isAr ? 'العميل' : 'Client'}</th>
                      <th className="p-4 text-center font-bold">{isAr ? 'شريحة القيمة' : 'Value Tier'}</th>
                      <th className="p-4 text-center font-bold">{isAr ? 'مرحلة العلاقة' : 'Lifecycle'}</th>
                      <th className="p-4 text-center font-bold">{isAr ? 'الزيارات' : 'Visits'}</th>
                      <th className="p-4 text-center font-bold">{isAr ? 'صافي الإيراد' : 'Net Revenue'}</th>
                      <th className="p-4 text-center font-bold">{isAr ? 'متوسط الفاتورة' : 'Avg Invoice'}</th>
                      <th className="p-4 text-center font-bold">{isAr ? 'الإشارات' : 'Signals'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientsData.map((c, i) => {
                      const m = c.metrics;
                      const tierColor: Record<string, string> = { very_high: '#FF5A5F', high: '#FFAE34', medium: '#14332B', developing: '#6E6A63' };
                      const lifecycleColor: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700', due: 'bg-blue-50 text-blue-700', overdue: 'bg-amber-50 text-amber-700', at_risk: 'bg-red-50 text-red-600', new: 'bg-purple-50 text-purple-700', developing: 'bg-sky-50 text-sky-700', churned: 'bg-slate-100 text-slate-500' };
                      return (
                        <tr key={c.id}
                          onClick={() => { setSelectedClient(c); setProfileSubTab('summary'); }}
                          className={`border-b border-[#F1F5F9] hover:bg-slate-50 transition-colors cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF9]'}`}>
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#14332B] text-white flex items-center justify-center font-serif font-bold text-sm shrink-0">
                                {c.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{c.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{c.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${tierColor[m.valueTier]}15`, color: tierColor[m.valueTier] }}>
                              {translateValueTier(m.valueTier)}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lifecycleColor[m.lifecycle] || 'bg-slate-100 text-slate-500'}`}>
                              {translateLifecycle(m.lifecycle)}
                            </span>
                          </td>
                          <td className="p-4 text-center font-mono font-bold text-slate-700">{m.completedVisits}</td>
                          <td className="p-4 text-center font-mono font-bold text-emerald-700">{m.netRevenue.toLocaleString()} {isAr ? 'ر.س' : 'SAR'}</td>
                          <td className="p-4 text-center font-mono font-bold text-slate-600">{m.averageInvoice.toLocaleString()} {isAr ? 'ر.س' : 'SAR'}</td>
                          <td className="p-4 text-center">
                            <div className="flex gap-1 justify-center flex-wrap">
                              {m.signals.length === 0
                                ? <span className="text-[9px] text-slate-300 italic">{isAr ? 'لا إشارات' : 'None'}</span>
                                : m.signals.map((sig: string) => (
                                  <span key={sig} className="text-[9px] font-bold bg-[#FF5A5F]/10 text-[#FF5A5F] px-1.5 py-0.5 rounded-full">
                                    {sig === 'employee_dependent'    ? (isAr ? 'تعتمد على موظفة' : 'Emp. dependent') :
                                     sig === 'declining_visits'      ? (isAr ? 'تراجع الزيارات' : 'Declining') :
                                     sig === 'high_value_at_risk'    ? (isAr ? 'VIP معرضة للتسرب' : 'VIP at risk') :
                                     sig === 'discount_dependent'    ? (isAr ? 'تعتمد على خصومات' : 'Discount dep.') : sig}
                                  </span>
                                ))
                              }
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        )}

      </AnimatePresence>

      {/* Rejection Reason Modal */}
      {rejectReasonModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-[#E9E7E2] p-6 max-w-sm w-full space-y-4">
            <h4 className="font-serif text-sm font-bold text-slate-900">{isAr ? 'تحديد سبب رفض أو تجاهل الترشيح' : 'Select Decline Reason'}</h4>
            
            <div className="space-y-2">
              {[
                { id: 'not_relevant', label: isAr ? 'غير ملائم للعميل حالياً' : 'Not relevant to customer' },
                { id: 'incorrect_timing', label: isAr ? 'التوقيت غير مناسب بالكامل' : 'Incorrect timing' },
                { id: 'already_contacted', label: isAr ? 'تم التواصل معها مسبقاً بشكل شخصي' : 'Customer already contacted' },
                { id: 'other', label: isAr ? 'أسباب أخرى...' : 'Other context' }
              ].map(reason => (
                <label key={reason.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="reject_reason"
                    checked={rejectReason === reason.id}
                    onChange={() => setRejectReason(reason.id)}
                    className="accent-[#FF5A5F]"
                  />
                  <span>{reason.label}</span>
                </label>
              ))}
            </div>

            {rejectReason === 'other' && (
              <textarea
                placeholder={isAr ? 'الرجاء إدخال تفاصيل السبب...' : 'Provide details...'}
                value={customRejectReason}
                onChange={(e) => setCustomRejectReason(e.target.value)}
                rows={2}
                className="w-full p-2.5 text-xs bg-[#F6F6F4] rounded-lg border border-[#E9E7E2] focus:outline-none"
              />
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRejectReasonModal(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleRejectRecommendation(rejectReasonModal)}
                className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700"
              >
                {isAr ? 'تأكيد الرفض والتجاهل' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
