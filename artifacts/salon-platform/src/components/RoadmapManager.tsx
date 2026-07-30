import React, { useState } from 'react';
import { 
  Sparkles, TrendingUp, Compass, ShieldCheck, CheckCircle2, 
  AlertTriangle, Workflow, Zap, Brain, Percent, Award, 
  Database, Milestone, UserCheck, RefreshCw, BarChart3, 
  ChevronRight, Play, Eye, ClipboardList, Info, HelpCircle
} from 'lucide-react';

interface RoadmapManagerProps {
  isAr: boolean;
}

export default function RoadmapManager({ isAr }: RoadmapManagerProps) {
  const [activeSection, setActiveSection] = useState<'vision' | 'mvp' | 'launch' | 'validation' | 'metrics'>('vision');
  
  // Interactive closed-loop simulation state
  const [simStep, setSimStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedBehavior, setSelectedBehavior] = useState<string>('lapsed_high_value');
  const [selectedAction, setSelectedAction] = useState<string>('ai_reactivate');
  const [selectedResponse, setSelectedResponse] = useState<string>('positive');
  
  // Interactive sandbox data
  const customerBehaviors = {
    lapsed_high_value: {
      titleAr: 'عميل متميز غائب (Lapsed High-Value)',
      titleEn: 'Lapsed High-Value Client',
      descAr: 'لم تزر الصالون منذ 60 يوماً. معدل إنفاقها المعتاد 350 ر.س لكل زيارة وتفضل خدمة صبغ الشعر مع الأخصائية رانيا.',
      descEn: 'Has not visited for 60 days. Average spend is 350 SAR per visit. Prefers hair coloring with specialist Rania.',
      data: { recency: 60, frequency: 4.2, value: 'High', staffId: 'Rania' }
    },
    new_active: {
      titleAr: 'عميل جديد نشط (New Active)',
      titleEn: 'New Active Client',
      descAr: 'زارت الصالون مرة واحدة قبل أسبوعين، أنفقت 180 ر.س على قص الشعر مع خلود، ومصنفة كفرصة إعادة حجز قريبة.',
      descEn: 'Visited once 2 weeks ago, spent 180 SAR on haircut with Kholoud. High opportunity for immediate rebooking.',
      data: { recency: 14, frequency: 1.0, value: 'Medium', staffId: 'Kholoud' }
    },
    discount_reliant: {
      titleAr: 'عميل معتمد على الخصومات (Discount Reliant)',
      titleEn: 'Discount-Reliant Client',
      descAr: 'تزور فقط عند توفر كوبونات خصم (أكثر من 20٪). زارت 3 مرات بإنفاق منخفض وتعتمد على الموظفة سارة.',
      descEn: 'Only visits during active promotional coupon windows (>20% off). Visited 3 times with low margins. Relies on Sarah.',
      data: { recency: 30, frequency: 3.0, value: 'Low-Margin', staffId: 'Sarah' }
    }
  };

  const recommendations = {
    ai_reactivate: {
      titleAr: 'توصية إعادة تنشيط ذكية (AI Reactivation)',
      titleEn: 'AI Reactivation Campaign',
      descAr: 'صياغة رسالة واتساب مخصصة للأخصائية رانيا تدعوها لتجربة علاج حماية اللون الجديد بخصم ترحيبي 10٪ (معدل جودة وليس خصم مفرط).',
      descEn: 'Drafted tailored WhatsApp text from specialist Rania, inviting her for a new color-protection treatment with a subtle 10% loyalty treat.',
      type: 'AI-Assisted (Explainable)',
      explainAr: 'السبب: العميل مخلص لرانيا، مهتم بصبغ الشعر، وغائب منذ فترة طويلة.',
      explainEn: 'Reasoning: Client is loyal to Rania, prefers color services, and has breached standard frequency gap (45 days).'
    },
    ai_rebook: {
      titleAr: 'تذكير إعادة حجز الخدمة (Smart Rebooking)',
      titleEn: 'Smart Rebooking Reminder',
      descAr: 'تذكير مخصص لخلود للتواصل مع العميل لتشذيب أطراف الشعر بعد مرور 6 أسابيع من الزيارة الأولى لضمان المظهر المثالي.',
      descEn: 'A customized reminder for Kholoud to trigger an automation suggesting a trim 6 weeks post-haircut to sustain quality.',
      type: 'Rules-Based / Predictive',
      explainAr: 'السبب: الحفاظ على صحة الشعر يحتاج تشذيب كل 6-8 أسابيع لزيادة قيمة حياة العميل.',
      explainEn: 'Reasoning: Optimal hair maintenance cycle dictates trim every 6-8 weeks, elevating customer retention early.'
    }
  };

  const customerResponses = {
    positive: {
      titleAr: 'استجابة إيجابية (تم الحجز والدفع)',
      titleEn: 'Positive Response (Booked & Paid)',
      descAr: 'حجزت العميلة موعداً بقيمة 320 ر.س وقامت بتقييم الخدمة بـ 5/5 مع تأكيد عودتها مستقبلاً.',
      descEn: 'Client booked the recommended service, spent 320 SAR, and left a 5/5 satisfaction rating.',
      metrics: { revenue: 320, rating: 5, satisfaction: 'Excellent', retention: true }
    },
    partial: {
      titleAr: 'استجابة جزئية (تعديل الخدمة)',
      titleEn: 'Partial Response (Modified Booking)',
      descAr: 'حضرت العميلة ولكن طلبت خدمة أرخص بقيمة 150 ر.س، وقيمت التجربة بـ 4/5 مع ملاحظات بسيطة.',
      descEn: 'Client attended but opted for a simpler service at 150 SAR. Rated experience 4/5 with minor feedback.',
      metrics: { revenue: 150, rating: 4, satisfaction: 'Good', retention: false }
    }
  };

  const calculateCommission = () => {
    const behavior = customerBehaviors[selectedBehavior as keyof typeof customerBehaviors];
    const action = recommendations[selectedAction as keyof typeof recommendations] || recommendations.ai_reactivate;
    const response = customerResponses[selectedResponse as keyof typeof customerResponses];
    
    // Logic based parameters
    const revenue = response.metrics.revenue;
    const rating = response.metrics.rating;
    
    // Commission parameters
    let baseRate = 0.15; // 15% base
    let bonusRate = 0.0;
    let adjustment = 0;
    let qualityScore = rating >= 5 ? 1.2 : rating === 4 ? 1.0 : 0.8;

    if (selectedBehavior === 'lapsed_high_value' && response.metrics.retention) {
      bonusRate += 0.05; // 5% retention bonus for reviving high value client
    }
    
    if (selectedBehavior === 'discount_reliant') {
      baseRate = 0.10; // lower commission for heavily discounted transactions to protect margins
    }

    const baseCommission = revenue * baseRate;
    const bonusCommission = revenue * bonusRate;
    const totalBeforeQuality = baseCommission + bonusCommission;
    const finalCommission = totalBeforeQuality * qualityScore;

    return {
      staff: behavior.data.staffId,
      baseCommission: baseCommission.toFixed(1),
      bonusCommission: bonusCommission.toFixed(1),
      qualityMultiplier: qualityScore.toFixed(1),
      finalCommission: finalCommission.toFixed(1),
      businessMargin: (revenue * 0.7 - finalCommission).toFixed(1), // estimate 30% operational costs
      isRetentionSuccess: selectedBehavior === 'lapsed_high_value' && response.metrics.retention
    };
  };

  const currentComm = calculateCommission();

  // Roadmap Data Definition
  const mvpRoadmapData = [
    {
      outcome: isAr ? 'توحيد بيانات العميلات وسلوكياتهن' : 'Unified Client Behavioral Profiling',
      capability: isAr ? 'استيراد فوري لكافة البيانات (حجوزات، كاشير، خدمات، موظفين) وبناء ملف موحد لكل عميل يحسب الحداثة والتكرار والإنفاق (RFM).' : 'Real-time data ingestion (Bookings, POS, Staff) constructing unified profiles computing RFM (Recency, Frequency, Monetary) metrics.',
      value: isAr ? 'استبدال الدفاتر بنظرة رقمية دقيقة تمنع ضياع سجلات العميلات.' : 'Transitions salons from paper ledgers to transparent, structured profiles tracking high-value customer relationships.',
      data: isAr ? 'سجلات الحجوزات، الفواتير الإلكترونية، تفضيلات الموظفين، تفاصيل الخدمات.' : 'Historic bookings, transactional invoices, staff assignments, specific category service preferences.',
      techType: 'Rules-Based',
      dependency: isAr ? 'لا يوجد' : 'None',
      success: isAr ? 'دقة استيراد بنسبة 100٪ وتصنيف فوري للعميلات.' : '100% database integration accuracy with instantaneous segment classification.'
    },
    {
      outcome: isAr ? 'تصنيف شرائح العميلات ذكياً' : 'Explainable Customer Behavioral Segmentation',
      capability: isAr ? 'تجميع تلقائي للعميلات إلى شرائح (جديد، نشط، مخلص، على وشك الحجز، مهدد بالضياع، تائه، معتمد على الخصومات) مع شرح السبب.' : 'Automated segment classification (New, Active, Loyal, Due, At-Risk, Lapsed, Discount-reliant) with explicit textual explanations.',
      value: isAr ? 'معرفة دقيقة بمن يستحق الاستهداف بدلاً من الرسائل العشوائية المزعجة.' : 'Enables highly targeted customer loyalty instead of sending annoying spam to everyone.',
      data: isAr ? 'تاريخ آخر زيارة، معدل تكرار الزيارات، قيمة الفواتير، نوع الخدمات.' : 'Recency indices, service frequency distribution, total transactional margin history.',
      techType: 'AI-Assisted',
      dependency: isAr ? 'توحيد البيانات' : 'Unified Client Profiling',
      success: isAr ? 'إنشاء فوري لقوائم الجمهور المستهدف بنقرة واحدة.' : 'Automated creation of active marketing lists under 1 second.'
    },
    {
      outcome: isAr ? 'صياغة عروض ترويجية ذكية' : 'AI-Assisted Campaign Generation',
      capability: isAr ? 'توليد مسودات مخصصة لرسائل الواتساب والـ SMS بناء على الشريحة والموظف المفضل مع منع التوصيات غير الآمنة.' : 'Generates hyper-personalized promotional texts utilizing the client’s favorite staff member & segment contexts.',
      value: isAr ? 'توفير ساعات عمل في صياغة العروض وإرسالها بطريقة احترافية تعيد العميلات للصالون.' : 'Saves hours of writing marketing copy, driving 20%+ increase in promotional click-through rates.',
      data: isAr ? 'سياق الشريحة، اسم الموظف المفضل، تفاصيل الخدمة الأخيرة.' : 'Segment tags, favorite stylist names, specific historic service categories.',
      techType: 'AI-Assisted',
      dependency: isAr ? 'تصنيف الشرائح' : 'Behavioral Segmentation',
      success: isAr ? 'زيادة نسبة الحجوزات القادمة من الحملات بنسبة 15٪.' : '15%+ booking conversion rate from targeted campaigns.'
    },
    {
      outcome: isAr ? 'حساب مرن لعمولات الموظفين' : 'Flexible Commission Management Engine',
      capability: isAr ? 'دعم احتساب العمولات الثابتة، والنسب المئوية، والمستويات التصاعدية، والعمولات المشتركة بين الموظفين مع معالجة المرتجعات.' : 'Fully supports fixed, percentage, tiered, and split-stylist commission rates, safely processing service refunds or rework adjustments.',
      value: isAr ? 'القضاء التام على أخطاء الحسابات اليدوية ونزاعات الموظفين نهاية الشهر.' : 'Eradicates human spreadsheet errors and accounting disputes, saving 3 days of payroll admin.',
      data: isAr ? 'قيم الخدمات المباعة، نسب طاقم العمل، حالة الفاتورة، تفاصيل التعديلات.' : 'Service and product sales, individual contract tiers, invoice payment state, adjustments.',
      techType: 'Rules-Based',
      dependency: isAr ? 'توحيد البيانات' : 'Unified Client Profiling',
      success: isAr ? 'حساب فوري للعمولات وخلو التقارير من الأخطاء الحسابية.' : 'Instant, zero-error monthly calculation of team earnings.'
    }
  ];

  const launchRoadmapData = [
    {
      outcome: isAr ? 'التنبؤ بموعد العودة المتوقع وخطر الانقطاع' : 'Predictive Return-Date & Churn Risk',
      capability: isAr ? 'خوارزمية ذكاء اصطناعي تتنبأ بالتاريخ المتوقع لكل عميلة للزيارة القادمة وتحدد احتمالية انقطاعها (Churn Risk).' : 'AI machine learning model predicting the optimal rebooking window and churn-risk likelihood before it happens.',
      value: isAr ? 'التواصل الاستباقي مع العميل قبل تخليه عن الصالون.' : 'Enables proactive, high-efficiency retention campaigns before clients disconnect.',
      data: isAr ? 'سجل تكرار الزيارات الفردي، متوسط فترات الخدمات العامة، الاتساق التاريخي.' : 'Multi-year individual visit timelines, typical service lifespans (e.g. root touch-up decay).',
      techType: 'Predictive',
      dependency: isAr ? 'جمع بيانات 90 يوماً على الأقل' : '90 Days Real Ingested Data',
      success: isAr ? 'تقليل معدل تسرب العميلات بنسبة 25٪.' : '25% reduction in customer churn within 6 months.'
    },
    {
      outcome: isAr ? 'توصيات الخطوة القادمة المثلى (Next Best Action)' : 'Next Best Action Recommendation Engine',
      capability: isAr ? 'اقتراح ذكي للخدمات المتقاطعة (Cross-sell) والعضويات المناسبة والترقيات بناء على الأنماط الشاملة للعميلات المماثلات.' : 'Recommends high-relevance cross-sells, upsells, membership tiers, or service recovery actions based on client historical DNA.',
      value: isAr ? 'زيادة متوسط قيمة الفاتورة بطريقة ملائمة ومنطقية للعميل دون ضغط.' : 'Sustained growth in average ticket size without pushy or aggressive sales pitches.',
      data: isAr ? 'تاريخ الخدمات المتكامل، الهوامش الربحية، الفئة العمرية السلوكية.' : 'Service combination frequencies, service profit margins, customer age/affinity groups.',
      techType: 'Predictive',
      dependency: isAr ? 'بيانات تاريخية كافية وعلاقات الخدمات' : 'Sufficient transaction history',
      success: isAr ? 'ارتفاع متوسط قيمة الفاتورة بنسبة 18٪.' : '18% average ticket size growth.'
    },
    {
      outcome: isAr ? 'موجز الاستشارة المخصص للموظفين' : 'Personalized Employee Consultation Briefs',
      capability: isAr ? 'توليد بطاقة موجزة للموظفة تظهر فوراً عند حضور العميلة، تشمل أسئلة مقترحة، وتوصيات للخدمات ومحاذير صحية.' : 'Generates a 1-page digital brief for stylists detailing custom client preference, health warnings, and personalized pitch recommendations.',
      value: isAr ? 'تقديم خدمة مذهلة ومخصصة تُشعر العميلة بالاهتمام الفائق وترسخ ولائها.' : 'Enables world-class customer service that makes clients feel known and appreciated.',
      data: isAr ? 'البيانات التاريخية، الأخصائية المفضلة، تفاصيل التفاعل والشكاوى.' : 'Historical consultation notes, preferred stylist, interaction sentiment tags.',
      techType: 'AI-Assisted',
      dependency: isAr ? 'لوحة الموظفين والـ CRM' : 'Staff Portal & CRM integration',
      success: isAr ? 'نسبة رضاء العميلات تفوق 96٪ وتكرار الحجوزات.' : 'Customer satisfaction index > 96% with recurring bookings.'
    },
    {
      outcome: isAr ? 'عمولات طاقم العمل المبنية على الجودة والولاء' : 'Quality-Adjusted Commission & Retention Bonus',
      capability: isAr ? 'ربط العمولات بمؤشرات الأداء الفعلية: رضاء العميلة، الاحتفاظ بالعميلات، جودة تقديم الخدمة، وتجنب الشكاوى والمرتجعات.' : 'Links monthly payouts to quality metrics: customer feedback, verified rebooking rates, zero rework penalties, and overall loyalty goals.',
      value: isAr ? 'توجيه طاقم العمل نحو جودة الخدمة ورضاء العميلة بدلاً من محاولة البيع القسري فقط.' : 'Shifts team culture to client-care and retention, instead of toxic or aggressive upsells.',
      data: isAr ? 'تقييمات الفواتير، معدلات تكرار الحجوزات مع نفس الموظف، المرتجعات.' : 'CSAT scores, staff-specific client return rates, service adjustments.',
      techType: 'Rules-Based',
      dependency: isAr ? 'نظام التقييم ونظام العمولات' : 'Customer Feedback Loop & Commission Engine',
      success: isAr ? 'ارتفاع معدل عودة العميلات للموظف نفسه بنسبة 30٪.' : '30% increase in stylist-specific client retention.'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300" id="roadmap-manager-container">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#F1F5F9] to-[#E2E8F0] text-[#1E293B] p-6 md:p-8 rounded-3xl shadow-md border border-[#CBD5E1]/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF5A5F]/15 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/10 rounded-full blur-2xl -ml-40 -mb-40"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF5A5F]/10 border border-[#FF5A5F]/20 rounded-full text-[10px] uppercase tracking-wider font-bold text-[#FFAE34]">
              <Sparkles className="w-3.5 h-3.5" />
              {isAr ? 'منظور استراتيجي للمستثمرين وفرق التطوير' : 'Strategic Product Strategy & PM Roadmap'}
            </div>
            <h2 className="font-serif text-2xl md:text-3.5xl font-bold leading-tight text-slate-900">
              {isAr ? 'خارطة طريق منصة CONFIRMED الذكية للنمو وأداء الموظفين' : 'AI-Powered Salon Growth & Staff Performance Roadmap'}
            </h2>
            <p className="text-xs md:text-sm text-slate-600 max-w-3xl">
              {isAr 
                ? 'رؤية متكاملة لربط سلوك العملاء بالحملات التسويقية الذكية، وتقييم جودة الخدمة واحتساب عمولات طاقم العمل بناءً على النتائج ورضاء العميلات.'
                : 'A cohesive, closed-loop platform that connects customer behavioral insights to marketing actions, service delivery, and outcome-based staff commissions.'}
            </p>
          </div>
          
          <div className="shrink-0 p-4 bg-white/80 rounded-2xl border border-slate-200 shadow-sm text-center backdrop-blur-sm self-stretch md:self-auto flex md:flex-col justify-around items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{isAr ? 'رؤية المنتج' : 'Product Vision'}</span>
            <span className="font-serif text-lg font-bold text-[#FF5A5F]">{isAr ? 'مغلقة الدائرة' : '100% Closed-Loop'}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none border-b border-[#E9E7E2]">
        <button
          onClick={() => setActiveSection('vision')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
            activeSection === 'vision' 
              ? 'border-[#FF5A5F] text-[#FF5A5F] bg-white rounded-t-xl' 
              : 'border-transparent text-[#6E6A63] hover:text-[#14332B]'
          }`}
        >
          <Workflow className="w-4 h-4" />
          {isAr ? 'رؤية المنتج والدورة المغلقة' : 'Product Vision & Closed-Loop'}
        </button>
        <button
          onClick={() => setActiveSection('mvp')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
            activeSection === 'mvp' 
              ? 'border-[#FF5A5F] text-[#FF5A5F] bg-white rounded-t-xl' 
              : 'border-transparent text-[#6E6A63] hover:text-[#14332B]'
          }`}
        >
          <Milestone className="w-4 h-4" />
          {isAr ? 'خارطة طريق الـ MVP' : 'MVP Roadmap'}
        </button>
        <button
          onClick={() => setActiveSection('launch')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
            activeSection === 'launch' 
              ? 'border-[#FF5A5F] text-[#FF5A5F] bg-white rounded-t-xl' 
              : 'border-transparent text-[#6E6A63] hover:text-[#14332B]'
          }`}
        >
          <Zap className="w-4 h-4" />
          {isAr ? 'خارطة الإطلاق العام' : 'Public Launch Roadmap'}
        </button>
        <button
          onClick={() => setActiveSection('validation')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
            activeSection === 'validation' 
              ? 'border-[#FF5A5F] text-[#FF5A5F] bg-white rounded-t-xl' 
              : 'border-transparent text-[#6E6A63] hover:text-[#14332B]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          {isAr ? 'التحقق والمستبعدات' : 'Validation & Exclusions'}
        </button>
        <button
          onClick={() => setActiveSection('metrics')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
            activeSection === 'metrics' 
              ? 'border-[#FF5A5F] text-[#FF5A5F] bg-white rounded-t-xl' 
              : 'border-transparent text-[#6E6A63] hover:text-[#14332B]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          {isAr ? 'المقاييس والمخاطر' : 'Metrics & Operational Risks'}
        </button>
      </div>

      {/* ===== SECTION 1: PRODUCT VISION & INTERACTIVE WORKFLOW ===== */}
      {activeSection === 'vision' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Vision Statement */}
            <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] lg:col-span-2 space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#14332B] flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#FF5A5F]" />
                {isAr ? 'رؤية المنتج الموحدة (One-Sentence Vision)' : 'One-Sentence Product Vision'}
              </h3>
              <div className="p-4 bg-[#FF5A5F]/10 border-r-4 border-[#FF5A5F] rounded-xl text-sm font-medium leading-relaxed text-[#14332B]">
                {isAr 
                  ? 'تمكين مالكي الصالونات ومراكز التجميل من تحويل بيانات الحجوزات والمعاملات الساكنة إلى نمو حقيقي مستدام، من خلال تحويل سلوكيات العميلات إلى حملات تسويقية مخصصة بالذكاء الاصطناعي، وموجز استشاري مميز للموظفين، وحساب عمولات طاقم العمل بالربط المباشر مع جودة تقديم الخدمة ورضاء العميلات.'
                  : 'Empowering salon owners to unlock stagnant transactional and booking data into automated sustainable growth by seamlessly translating customer behavioral profiles into AI-personalized retention campaigns, client-specific stylist briefs, and outcome-and-quality-based commissions.'}
              </div>
              
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs text-[#1C1B18] uppercase tracking-wider">{isAr ? 'مبادئ تصميم وتطوير المنتج' : 'Core Product Principles'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#6E6A63]">
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-[#F6F6F4]">
                    <CheckCircle2 className="w-4 h-4 text-[#FF5A5F] shrink-0 mt-0.5" />
                    <span>{isAr ? 'أتمتة جمع البيانات تماماً لمنع الأخطاء البشرية والعبء الإداري.' : '100% automated data ingestion from POS & Bookings to prevent human error.'}</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-[#F6F6F4]">
                    <CheckCircle2 className="w-4 h-4 text-[#FF5A5F] shrink-0 mt-0.5" />
                    <span>{isAr ? 'شفافية كاملة وشرح واضح لسبب كل توصية ذكاء اصطناعي.' : 'Make every single AI recommendation fully explainable with explicit logic.'}</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-[#F6F6F4]">
                    <CheckCircle2 className="w-4 h-4 text-[#FF5A5F] shrink-0 mt-0.5" />
                    <span>{isAr ? 'مكافأة جودة الخدمة وولاية العميلات بدلاً من قيمة المبيعات وحدها.' : 'Reward service quality & retention metrics, never raw transactional volume alone.'}</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-[#F6F6F4]">
                    <CheckCircle2 className="w-4 h-4 text-[#FF5A5F] shrink-0 mt-0.5" />
                    <span>{isAr ? 'الفصل الصارم والمطلق بين البيانات المرصودة واستنتاجات الذكاء الاصطناعي.' : 'Maintain a strict wall separating hard observed transaction logs from AI inferences.'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Loop connection explanation */}
            <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#14332B] flex items-center gap-2">
                <Workflow className="w-5 h-5 text-[#FF5A5F]" />
                {isAr ? 'ترابط الأنظمة الثلاثة' : 'Connected Closed-Loop Logic'}
              </h3>
              <p className="text-xs text-[#6E6A63] leading-relaxed">
                {isAr 
                  ? 'يتميز نظامنا بالدائرة المغلقة المترابطة، حيث تؤدي بيانات سلوك العميل إلى اتخاذ إجراء فوري، ينعكس على استجابة العميل ثم العوائد وجودة الخدمة، وتنتهي بحساب دقيق وعادل لعمولات الموظفين لتعزيز الإنتاجية والولاء.'
                  : 'Our architecture enforces a bulletproof closed-loop system where client behavioral classification triggers contextual campaigns, feeding into staff briefs, tracking exact transactional outcomes, and automatically computing high-performance staff payouts.'}
              </p>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  <span className="font-medium text-slate-800">{isAr ? 'سلوك العميل' : 'Customer Behaviour'}</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-[#FF5A5F]/10 rounded-xl border border-[#FF5A5F]/20">
                  <span className="w-5 h-5 rounded-full bg-[#FF5A5F] text-white flex items-center justify-center text-[10px] font-bold">2</span>
                  <span className="font-medium text-[#FF5A5F]">{isAr ? 'الإجراء المقترح والتسويق' : 'Recommended Action'}</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                  <span className="font-medium text-slate-800">{isAr ? 'الاستجابة والأرباح المحققة' : 'Customer Response & Rev'}</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-[#FF5A5F]/10 rounded-xl border border-[#FF5A5F]/20">
                  <span className="w-5 h-5 rounded-full bg-[#FF5A5F] text-white flex items-center justify-center text-[10px] font-bold">4</span>
                  <span className="font-medium text-[#FF5A5F]">{isAr ? 'عمولة الموظفة والتقييم' : 'Employee Commission & Feedback'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Closed Loop Sandbox */}
          <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#FF5A5F]/10 text-[#FF5A5F] rounded-full text-[10px] font-bold uppercase">
                  <Brain className="w-3 h-3" />
                  {isAr ? 'تفاعلي' : 'Interactive Sandbox'}
                </div>
                <h3 className="font-serif text-lg font-bold text-[#14332B]">
                  {isAr ? 'محاكي الدورة المغلقة الذكية (SaaS Flow Simulator)' : 'Closed-Loop Workflow Interactive Simulator'}
                </h3>
                <p className="text-xs text-[#6E6A63]">
                  {isAr 
                    ? 'جرب كيف تترابط سلوكيات العميلات المسجلة مع ترشيحات الذكاء الاصطناعي لتنعكس فوراً على رضاء العميلة وأرباح الصالون وعمولات طاقم العمل.'
                    : 'Interact with the pipeline. Select a behavioral state, choose a campaign, trigger the customer feedback, and watch the commission dynamically calculate.'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setSimStep(1);
                  setSelectedBehavior('lapsed_high_value');
                  setSelectedAction('ai_reactivate');
                  setSelectedResponse('positive');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E9E7E2] hover:bg-black/5 text-xs text-[#6E6A63] hover:text-[#1C1B18] transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {isAr ? 'إعادة ضبط المحاكاة' : 'Reset Simulation'}
              </button>
            </div>

            {/* Step indicator */}
            <div className="grid grid-cols-5 gap-2 pt-2">
              {[1, 2, 3, 4, 5].map((num) => {
                const labelsAr = ['سلوك العميل', 'الإجراء الموصى به', 'استجابة العميل', 'النتيجة والأثر', 'العمولة المكتسبة'];
                const labelsEn = ['Customer Behavior', 'AI Action', 'Response', 'Outcome', 'Stylist Payout'];
                const isActive = simStep >= num;
                return (
                  <div 
                    key={num} 
                    onClick={() => setSimStep(num as any)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[#14332B] border-[#14332B] text-white shadow-sm' 
                        : 'bg-[#F6F6F4] border-[#E9E7E2] text-[#6E6A63] hover:bg-black/[0.02]'
                    }`}
                  >
                    <div className="text-[10px] font-bold opacity-60 uppercase mb-1">Step {num}</div>
                    <div className="text-[11px] font-bold truncate hidden md:block">{isAr ? labelsAr[num-1] : labelsEn[num-1]}</div>
                    <div className="text-[11px] font-bold md:hidden">{num}</div>
                  </div>
                );
              })}
            </div>

            {/* Simulator Content Area */}
            <div className="p-6 bg-[#F6F6F4] rounded-2xl border border-[#E9E7E2] grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Selector Panel */}
              <div className="lg:col-span-2 space-y-5">
                {simStep === 1 && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-xs text-[#1C1B18] uppercase tracking-wider">{isAr ? 'الخطوة ١: اختر السلوك السلوكي المرصود للعميل' : 'Step 1: Select Observed Customer Behavior'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {Object.entries(customerBehaviors).map(([key, data]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setSelectedBehavior(key);
                            setSimStep(2);
                          }}
                          className={`p-4 rounded-xl border text-start transition-all flex flex-col justify-between h-40 cursor-pointer ${
                            selectedBehavior === key 
                              ? 'bg-white border-[#FF5A5F] ring-2 ring-[#FF5A5F]/10' 
                              : 'bg-white border-[#E9E7E2] hover:border-[#14332B]/30'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-bold text-[#14332B] block mb-1">
                              {isAr ? data.titleAr : data.titleEn}
                            </span>
                            <p className="text-[11px] text-[#6E6A63] leading-relaxed line-clamp-3">
                              {isAr ? data.descAr : data.descEn}
                            </p>
                          </div>
                          <div className="text-[10px] font-mono text-[#FF5A5F] mt-2 flex justify-between items-center w-full">
                            <span>Value: {data.data.value}</span>
                            <span className="font-bold">Select →</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {simStep === 2 && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-xs text-[#1C1B18] uppercase tracking-wider">{isAr ? 'الخطوة ٢: حدد الإجراء أو الاتصال المقترح بالذكاء الاصطناعي' : 'Step 2: Select AI-Driven Campaign Recommendation'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(recommendations).map(([key, data]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setSelectedAction(key);
                            setSimStep(3);
                          }}
                          className={`p-4 rounded-xl border text-start transition-all flex flex-col justify-between h-44 cursor-pointer ${
                            selectedAction === key 
                              ? 'bg-white border-[#FF5A5F] ring-2 ring-[#FF5A5F]/10' 
                              : 'bg-white border-[#E9E7E2] hover:border-[#14332B]/30'
                          }`}
                        >
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 bg-[#FF5A5F]/10 text-[#FF5A5F] rounded text-[9px] font-bold">
                              {data.type}
                            </span>
                            <span className="text-xs font-bold text-[#14332B] block mt-1">
                              {isAr ? data.titleAr : data.titleEn}
                            </span>
                            <p className="text-[11px] text-[#6E6A63] leading-relaxed line-clamp-2">
                              {isAr ? data.descAr : data.descEn}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-dashed border-[#E9E7E2] text-[10px] text-[#FF5A5F]">
                            <strong className="block text-[#1C1B18] font-bold text-[9px] uppercase tracking-wider mb-0.5">{isAr ? 'شرح التوصية:' : 'Explainable Logic:'}</strong>
                            {isAr ? data.explainAr : data.explainEn}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {simStep === 3 && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-xs text-[#1C1B18] uppercase tracking-wider">{isAr ? 'الخطوة ٣: ما هي استجابة العميل الفعليه بعد استلام العرض؟' : 'Step 3: What is the Customer Response?'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(customerResponses).map(([key, data]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setSelectedResponse(key);
                            setSimStep(4);
                          }}
                          className={`p-4 rounded-xl border text-start transition-all flex flex-col justify-between h-36 cursor-pointer ${
                            selectedResponse === key 
                              ? 'bg-white border-[#FF5A5F] ring-2 ring-[#FF5A5F]/10' 
                              : 'bg-white border-[#E9E7E2] hover:border-[#14332B]/30'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-bold text-[#14332B] block mb-1">
                              {isAr ? data.titleAr : data.titleEn}
                            </span>
                            <p className="text-[11px] text-[#6E6A63] leading-relaxed line-clamp-3">
                              {isAr ? data.descAr : data.descEn}
                            </p>
                          </div>
                          <div className="text-[10px] font-mono text-[#FF5A5F] mt-2 flex justify-between items-center w-full">
                            <span>{isAr ? 'القيمة المتوقعة:' : 'Expected Value:'} {data.metrics.revenue} {isAr ? 'ر.س' : 'SAR'}</span>
                            <span className="font-bold">Select →</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {simStep === 4 && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-xs text-[#1C1B18] uppercase tracking-wider">{isAr ? 'الخطوة ٤: الأثر وعائد الاستثمار المحقق للصالون' : 'Step 4: Revenue & Client Quality Outcome'}</h4>
                    <div className="bg-white p-5 rounded-xl border border-[#E9E7E2] space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#14332B]">{isAr ? 'ملخص الفاتورة ورضاء العميل' : 'Invoice Details & Client CSAT'}</span>
                        <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-lg text-[10px] font-bold">
                          {isAr ? 'عملية موثقة بنجاح' : 'Outcome Logged'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-[#F6F6F4] rounded-lg text-center">
                          <span className="text-[10px] text-[#6E6A63] block">{isAr ? 'العائد المالي' : 'Revenue Generated'}</span>
                          <span className="font-serif text-lg font-bold text-[#14332B]">{customerResponses[selectedResponse as keyof typeof customerResponses].metrics.revenue} {isAr ? 'ر.س' : 'SAR'}</span>
                        </div>
                        <div className="p-3 bg-[#F6F6F4] rounded-lg text-center">
                          <span className="text-[10px] text-[#6E6A63] block">{isAr ? 'تقييم رضاء العميل' : 'Customer Experience'}</span>
                          <span className="font-serif text-lg font-bold text-amber-600">
                            {'★'.repeat(customerResponses[selectedResponse as keyof typeof customerResponses].metrics.rating)}
                            {'☆'.repeat(5 - customerResponses[selectedResponse as keyof typeof customerResponses].metrics.rating)}
                          </span>
                        </div>
                        <div className="p-3 bg-[#F6F6F4] rounded-lg text-center">
                          <span className="text-[10px] text-[#6E6A63] block">{isAr ? 'تحقيق العودة والولاء' : 'Retention Metric'}</span>
                          <span className="font-serif text-lg font-bold text-[#FF5A5F]">
                            {customerResponses[selectedResponse as keyof typeof customerResponses].metrics.retention 
                              ? (isAr ? 'نعم (مستدام)' : 'Yes (Retained)') 
                              : (isAr ? 'لا (معاملة عابرة)' : 'No (One-off)')}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSimStep(5)}
                        className="w-full py-2.5 rounded-xl bg-[#FF5A5F] text-white text-xs font-bold hover:bg-[#FFAE34] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isAr ? 'حساب عمولة الموظفة والربط النهائي' : 'Calculate Employee Payout & Close Loop'}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {simStep === 5 && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-xs text-[#1C1B18] uppercase tracking-wider">{isAr ? 'الخطوة ٥: العمولات والحوافز المحتسبة للموظفة بناء على جودة النتيجة' : 'Step 5: Quality-Adjusted Employee Commission'}</h4>
                    <div className="bg-gradient-to-br from-[#F1F5F9] to-[#E2E8F0] text-[#1E293B] p-5 rounded-xl space-y-4 shadow-sm border border-slate-200">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase tracking-wider">{isAr ? 'الموظفة المسؤولة' : 'Stylist In Charge'}</span>
                          <span className="font-serif text-base font-bold text-slate-900">{isAr ? 'الأخصائية' : 'Specialist'} {currentComm.staff}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block uppercase tracking-wider">{isAr ? 'العمولة النهائية المكتسبة' : 'Total Earned Payout'}</span>
                          <span className="font-serif text-xl font-bold text-[#FF5A5F]">{currentComm.finalCommission} {isAr ? 'ر.س' : 'SAR'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-start">
                        <div className="p-2.5 bg-white/90 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">{isAr ? 'العمولة الأساسية' : 'Base Commission'}</span>
                          <span className="font-bold text-slate-900 mt-0.5 block">{currentComm.baseCommission} {isAr ? 'ر.س' : 'SAR'}</span>
                        </div>
                        <div className="p-2.5 bg-white/90 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">{isAr ? 'حافز استعادة العميل' : 'Retention Bonus'}</span>
                          <span className="font-bold text-slate-900 mt-0.5 block">{currentComm.bonusCommission} {isAr ? 'ر.س' : 'SAR'}</span>
                        </div>
                        <div className="p-2.5 bg-white/90 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">{isAr ? 'مضاعف جودة الخدمة' : 'CSAT Multiplier'}</span>
                          <span className="font-bold text-[#FF5A5F] mt-0.5 block">x{currentComm.qualityMultiplier}</span>
                        </div>
                        <div className="p-2.5 bg-white/90 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">{isAr ? 'صافي هامش الصالون' : 'Business Margin'}</span>
                          <span className="font-bold text-green-600 mt-0.5 block">{currentComm.businessMargin} {isAr ? 'ر.س' : 'SAR'}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-white/90 rounded-lg border border-slate-200 text-[11px] leading-relaxed text-slate-600 flex gap-2">
                        <Info className="w-4 h-4 text-[#FF5A5F] shrink-0 mt-0.5" />
                        <div>
                          {selectedBehavior === 'discount_reliant' && (
                            <span>{isAr 
                              ? 'تنبيه هامش الأمان: تم تخفيض نسبة العمولة تلقائياً إلى 10٪ نظراً لاعتماد العميلة على الكوبونات، لحماية هامش ربح الصالون من الخصم المفرط.' 
                              : 'Margin Safeguard Activated: Base rate reduced to 10% because the client has a history of high discount-reliance, preventing margin erosion.'}</span>
                          )}
                          {selectedBehavior === 'lapsed_high_value' && (
                            <span>{isAr 
                              ? 'حافز استعادة عميل مفقود: تم منح الأخصائية رانيا بونص إضافي قدره 5٪ تقديراً لنجاحها في استعادة عميلة متميزة غائبة منذ 60 يوماً.' 
                              : 'Reactivation Incentive Applied: Stylist earned a +5% bonus for reviving a lapsed high-value client back into the loyal funnel.'}</span>
                          )}
                          {selectedBehavior === 'new_active' && (
                            <span>{isAr 
                              ? 'تحقيق الدورة المغلقة: معالجة بيانات الموعد أكدت نجاح التوصية، وسجلت النطاق السلوكي الجديد للزيارة القادمة.' 
                              : 'Closed-loop sequence locked. High-quality rating (5/5) multiplier applied. Customer database updated with the next expected return window.'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Summary Sandbox Sidebar */}
              <div className="bg-white p-5 rounded-xl border border-[#E9E7E2] space-y-4">
                <h4 className="font-bold text-xs text-[#14332B] uppercase tracking-wider pb-2 border-b border-[#E9E7E2]">
                  {isAr ? 'تفاصيل حالة المحاكاة الحالية' : 'Current Sandbox Context'}
                </h4>
                
                <div className="space-y-3 text-xs text-start">
                  <div>
                    <span className="text-[10px] text-[#6E6A63] block uppercase font-bold">{isAr ? 'حالة العميل' : 'Observed Client Behavior'}</span>
                    <span className="font-semibold text-[#1C1B18]">{isAr ? customerBehaviors[selectedBehavior as keyof typeof customerBehaviors].titleAr : customerBehaviors[selectedBehavior as keyof typeof customerBehaviors].titleEn}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#6E6A63] block uppercase font-bold">{isAr ? 'الإجراء المتخذ' : 'AI Action Generated'}</span>
                    <span className="font-semibold text-[#1C1B18]">{isAr ? (recommendations[selectedAction as keyof typeof recommendations]?.titleAr || '-') : (recommendations[selectedAction as keyof typeof recommendations]?.titleEn || '-')}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#6E6A63] block uppercase font-bold">{isAr ? 'الاستجابة والأرباح' : 'Response & Transaction'}</span>
                    <span className="font-semibold text-[#1C1B18]">{isAr ? customerResponses[selectedResponse as keyof typeof customerResponses].titleAr : customerResponses[selectedResponse as keyof typeof customerResponses].titleEn}</span>
                  </div>

                  <div className="pt-3 border-t border-dashed border-[#E9E7E2] space-y-1">
                    <span className="text-[10px] text-[#6E6A63] block uppercase font-bold">{isAr ? 'مؤشرات نجاح الدائرة المغلقة' : 'Closed-Loop Success Matrix'}</span>
                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <span>{isAr ? 'حجم المبيعات:' : 'Raw Revenue:'}</span>
                      <span className="font-bold text-[#14332B]">{customerResponses[selectedResponse as keyof typeof customerResponses].metrics.revenue} {isAr ? 'ر.س' : 'SAR'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <span>{isAr ? 'عمولة الموظفة:' : 'Stylist Cut:'}</span>
                      <span className="font-bold text-[#FF5A5F]">{currentComm.finalCommission} {isAr ? 'ر.س' : 'SAR'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <span>{isAr ? 'صافي هامش الصالون:' : 'Owner Net Margin:'}</span>
                      <span className="font-bold text-green-700">{currentComm.businessMargin} {isAr ? 'ر.س' : 'SAR'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#FF5A5F]/10 text-[#FFAE34] rounded-lg text-[10px] leading-relaxed text-start">
                  <strong>{isAr ? 'فكرة المنتج المغلق:' : 'The Core Concept:'}</strong>
                  <p className="mt-0.5">
                    {isAr 
                      ? 'الهدف ليس مجرد زيادة المبيعات، بل حماية الهامش ومكافأة الموظفة التي تقدم خدمة عالية الجودة وتضمن عودة العميلات.'
                      : 'Never optimize blindly for the largest ticket. Balance discounts with staff margins and adjust rewards based on customer rating and verified return behaviour.'}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ===== SECTION 2: MVP ROADMAP ===== */}
      {activeSection === 'mvp' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <h3 className="font-serif text-lg font-bold text-[#14332B] flex items-center gap-2">
                <Milestone className="w-5 h-5 text-[#FF5A5F]" />
                {isAr ? 'خارطة طريق مرحلة المنتج الأدنى (MVP Roadmap)' : 'MVP Phase - Core Outcomes & Infrastructure'}
              </h3>
              <span className="px-3 py-1 bg-[#FF5A5F]/10 text-[#FF5A5F] rounded-full text-xs font-bold">
                {isAr ? 'التركيز الحالي لمنصة CONFIRMED' : 'Current Development Focus'}
              </span>
            </div>
            
            <p className="text-xs text-[#6E6A63] leading-relaxed max-w-4xl">
              {isAr 
                ? 'الهدف من الـ MVP هو إثبات قدرة المنصة على استيراد بيانات الصالون المبعثرة، وتوحيد ملفات العميلات، وتحديد الفئات السلوكية بدقة، وتقديم توصيات مخصصة قابلة للشرح، وحساب عمولات طاقم العمل بمرونة وأمان دون أي مجال للخطأ.'
                : 'Objective: Prove that the core system can seamlessly ingest raw client transactional data, categorize behaviors into clear explainable segments, support automated campaigns, and accurately calculate standard staff commissions.'}
            </p>

            <div className="overflow-x-auto rounded-xl border border-[#E9E7E2]">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="bg-[#F6F6F4] text-[#14332B] border-b border-[#E9E7E2] font-bold">
                    <th className="p-3 text-start">{isAr ? 'النتيجة المستهدفة' : 'Target Outcome'}</th>
                    <th className="p-3 text-start">{isAr ? 'نوع التقنية' : 'Tech Classification'}</th>
                    <th className="p-3 text-start">{isAr ? 'الإمكانيات والخصائص' : 'Platform Capability'}</th>
                    <th className="p-3 text-start">{isAr ? 'البيانات المطلوبة' : 'Required Data'}</th>
                    <th className="p-3 text-start">{isAr ? 'مقياس النجاح' : 'Success Criteria'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9E7E2]">
                  {mvpRoadmapData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-black/[0.01] transition-colors">
                      <td className="p-3 font-bold text-[#14332B] whitespace-nowrap">{item.outcome}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.techType === 'Rules-Based' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-[#FF5A5F]/10 text-[#FF5A5F]'
                        }`}>
                          {item.techType === 'Rules-Based' ? <ClipboardList className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
                          {item.techType}
                        </span>
                      </td>
                      <td className="p-3 text-[#3E3A33] min-w-[250px] leading-relaxed">{item.capability}</td>
                      <td className="p-3 text-[#6E6A63] min-w-[150px] font-mono text-[11px]">{item.data}</td>
                      <td className="p-3 text-green-700 font-medium whitespace-nowrap">{item.success}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-amber-50 border-r-4 border-amber-500 rounded-xl text-xs text-amber-900 leading-relaxed flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>{isAr ? 'الحد والتحكم الصارم للذكاء الاصطناعي في الـ MVP:' : 'Strict AI Safeguards & Restrictions in MVP Stage:'}</strong>
                <p className="mt-1">
                  {isAr 
                    ? 'في مرحلة الـ MVP، يقتصر دور الذكاء الاصطناعي على تلخيص البيانات الموثقة، شرح الفئات السلوكية، والتوصية بالحملات وصياغة الرسائل. يُحظر تماماً قيام الذكاء الاصطناعي باختراع معلومات العميلات (Hallucinations)، أو تقديم نصائح علاجية تجميلية خطيرة، أو إرسال الرسائل دون موافقة مسبقة بنسبة 100٪ من مالك الصالون.'
                    : 'AI is restricted strictly to summarization, explanation of behavioral logic, and drafting of templates. It is forbidden from hallucinating customer attributes, making unverified chemical treatment recommendations, or sending communication without 100% human-in-the-loop owner review.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SECTION 3: LAUNCH ROADMAP ===== */}
      {activeSection === 'launch' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <h3 className="font-serif text-lg font-bold text-[#14332B] flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
                {isAr ? 'خارطة طريق الإطلاق العام (Public Launch Roadmap)' : 'Public Launch - Predictive & Quality Optimization'}
              </h3>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                {isAr ? 'النسخة التجارية المتقدمة' : 'Commercial Growth Release'}
              </span>
            </div>
            
            <p className="text-xs text-[#6E6A63] leading-relaxed max-w-4xl">
              {isAr 
                ? 'تنتقل المنصة في مرحلة الإطلاق العام من مجرد تحليل الماضي والعمولات البسيطة، إلى التنبؤ بالمستقبل؛ تقديم ترشيحات الخطوة القادمة المثلى (Next Best Action)، وموجز استشاري مخصص للموظفين، وحساب عمولات متقدمة مربوطة بجودة الخدمة والاحتفاظ بالعميلات لضمان الربحية المستدامة.'
                : 'Objective: Seamlessly scale from historical logging to forward-looking predictive action. Launch features predicting churn risk, return dates, smart consultative guidelines for staff, and quality-adjusted payouts ensuring commercial margin safety.'}
            </p>

            <div className="overflow-x-auto rounded-xl border border-[#E9E7E2]">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="bg-[#F6F6F4] text-[#14332B] border-b border-[#E9E7E2] font-bold">
                    <th className="p-3 text-start">{isAr ? 'النتيجة المستهدفة' : 'Target Outcome'}</th>
                    <th className="p-3 text-start">{isAr ? 'نوع التقنية' : 'Tech Classification'}</th>
                    <th className="p-3 text-start">{isAr ? 'الإمكانيات والخصائص' : 'Platform Capability'}</th>
                    <th className="p-3 text-start">{isAr ? 'البيانات المطلوبة' : 'Required Data'}</th>
                    <th className="p-3 text-start">{isAr ? 'مقياس النجاح' : 'Success Criteria'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9E7E2]">
                  {launchRoadmapData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-black/[0.01] transition-colors">
                      <td className="p-3 font-bold text-[#14332B] whitespace-nowrap">{item.outcome}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.techType === 'Predictive' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-[#FF5A5F]/10 text-[#FF5A5F]'
                        }`}>
                          {item.techType === 'Predictive' ? <Brain className="w-3 h-3 text-amber-600" /> : <Sparkles className="w-3 h-3" />}
                          {item.techType}
                        </span>
                      </td>
                      <td className="p-3 text-[#3E3A33] min-w-[250px] leading-relaxed">{item.capability}</td>
                      <td className="p-3 text-[#6E6A63] min-w-[150px] font-mono text-[11px]">{item.data}</td>
                      <td className="p-3 text-green-700 font-medium whitespace-nowrap">{item.success}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-[#FFF0F0] text-[#5B21B6] rounded-xl text-xs leading-relaxed flex gap-3">
              <Sparkles className="w-5 h-5 text-[#FF5A5F] shrink-0 mt-0.5" />
              <div>
                <strong>{isAr ? 'آلية التعلم من النتائج الكاملة (Full-Outcome Learning):' : 'Full-Outcome Intelligent Feedback Loop:'}</strong>
                <p className="mt-1">
                  {isAr 
                    ? 'في مرحلة الإطلاق، لا يقتصر تعلم النظام على معرفة هل تمت البيعة أم لا. بل يدرس الأثر الكامل: قبول العميلة للخدمة، وقيمتها المادية، وهامش الربح، والتقييم والتعليقات، والشكاوى، وطلبات إعادة الخدمة مجاناً (Rework)، وسلوك العودة المستقبلي لتعديل نماذج الذكاء الاصطناعي بشكل مستمر.'
                    : 'The launch version moves beyond transaction metrics. It maps downstream signals like: customer rating, service refund logs, stylist rework cases, operational margins, and returning behavior to automatically retrain the recommendation models.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SECTION 4: VALIDATION, EXCLUSIONS & CRITERIA ===== */}
      {activeSection === 'validation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Validation Stage Assumptions */}
          <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#14332B] flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#FF5A5F]" />
              {isAr ? 'افتراضات مرحلة التحقق والـ MVP' : 'MVP Validation & Key Assumptions'}
            </h3>
            
            <div className="space-y-3 text-xs leading-relaxed text-[#6E6A63]">
              <div className="p-3 bg-[#F6F6F4] rounded-lg border-l-4 border-green-600">
                <strong className="text-[#14332B] block mb-1">{isAr ? 'الافتراض ١: جودة وسهولة استيراد البيانات' : 'Assumption 1: Data Portability'}</strong>
                <span>{isAr ? 'نفترض أن صالونات التجميل في السوق المستهدف تحتفظ بسجلات الحجوزات والفواتير بطرق قابلة للتصدير (CSV / API) لسهولة توحيد السجل.' : 'Target salons keep digital booking or checkout histories exportable via API or clean tabular formats (CSV).'}</span>
              </div>
              
              <div className="p-3 bg-[#F6F6F4] rounded-lg border-l-4 border-green-600">
                <strong className="text-[#14332B] block mb-1">{isAr ? 'الافتراض ٢: تفاعل الموظفين مع التقارير' : 'Assumption 2: Staff transparency increases retention'}</strong>
                <span>{isAr ? 'نفترض أن شفافية عرض العمولات ومؤشرات الأداء للموظفة ستقلل من الخلافات اليدوية وتدفع طاقم العمل لتقديم رعاية أفضل للعميلات.' : 'stylists seeing their live earned commission progress bar is positive and motivates performance rather than creating gamified stress.'}</span>
              </div>

              <div className="p-3 bg-[#F6F6F4] rounded-lg border-l-4 border-green-600">
                <strong className="text-[#14332B] block mb-1">{isAr ? 'الافتراض ٣: دقة شرائح العملاء وبساطة الإرسال' : 'Assumption 3: Personalization outperforms raw discount bulk spam'}</strong>
                <span>{isAr ? 'نفترض أن إرسال رسائل مخصصة مبنية على الموظف المفضل والخدمات المفضلة سيحقق نسبة عودة تفوق بثلاثة أضعاف الرسائل الجماعية المزعجة.' : 'Sending low-discount, favorite-stylist WhatsApp triggers generates 3x higher booking rates than sending 50% off general broadcast spam.'}</span>
              </div>
            </div>
          </div>

          {/* Explicit Exclusions */}
          <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#14332B] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              {isAr ? 'المستبعدات الصارمة من الـ MVP' : 'Explicit Scope Exclusions (Postponed)'}
            </h3>
            <p className="text-xs text-[#6E6A63]">
              {isAr 
                ? 'لحفظ التركيز المالي والتقني والتحقق من النماذج الأساسية أولاً، تُستبعد الميزات التالية تماماً من الـ MVP ويتم تأجيلها للإطلاق العام أو ما بعده:'
                : 'To maintain developmental velocity and validate fundamental models, the following modules are strictly excluded from the early scope:'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 border border-[#E9E7E2] rounded-xl bg-red-50/30">
                <strong className="text-[#14332B] block mb-1">{isAr ? 'التنبؤ التلقائي بموعد الزيارة القادمة' : 'Churn & Return Predictive Models'}</strong>
                <p className="text-[11px] text-[#6E6A63]">{isAr ? 'مستبعد من الـ MVP لعدم كفاية البيانات الحية عند الانطلاق؛ يحتاج النظام 90 يوماً من البيانات الحقيقية.' : 'Predictive models for return date and churn likelihood are strictly delayed until sufficient live baseline data is logged.'}</p>
              </div>

              <div className="p-3 border border-[#E9E7E2] rounded-xl bg-red-50/30">
                <strong className="text-[#14332B] block mb-1">{isAr ? 'عمولات تقييم جودة الخدمة التلقائية' : 'Quality-Adjusted Live Payouts'}</strong>
                <p className="text-[11px] text-[#6E6A63]">{isAr ? 'يتطلب الـ MVP نظام عمولات ثابت ومتصاعد بسيط؛ تُؤجل العمولات المرتبطة برضاء العملاء للإطلاق العام.' : 'Complex commission adjustment parameters based on CSAT ratings and rework are delayed to prevent early payroll volatility.'}</p>
              </div>

              <div className="p-3 border border-[#E9E7E2] rounded-xl bg-red-50/30">
                <strong className="text-[#14332B] block mb-1">{isAr ? 'رحلات التسويق الذاتي والمحاذاة المباشرة' : 'Trigger-Based Marketing Journeys'}</strong>
                <p className="text-[11px] text-[#6E6A63]">{isAr ? 'لا يوجد تواصل مؤتمت بالكامل دون موافقة مسبقة. الحملات تحتاج لاعتماد يدوي كامل من مالك الصالون كإجراء أمان.' : 'Zero fully automated marketing pipelines running without manual, 100% human-in-the-loop owner approval first.'}</p>
              </div>

              <div className="p-3 border border-[#E9E7E2] rounded-xl bg-red-50/30">
                <strong className="text-[#14332B] block mb-1">{isAr ? 'توليد مواد تدريب وتطوير الموظفين بالذكاء الاصطناعي' : 'AI-Generated Staff Coaching'}</strong>
                <p className="text-[11px] text-[#6E6A63]">{isAr ? 'يتم تأجيل نماذج تقديم التوصيات التدريبية والملخصات الفردية للموظفات إلى ما بعد الإطلاق العام.' : 'Stylist-specific training recommendations and automated coaching loops are deferred to post-launch roadmap.'}</p>
              </div>
            </div>
          </div>

          {/* Stage Gate Criteria for Progression */}
          <div className="bg-gradient-to-br from-[#F1F5F9] to-[#E2E8F0] text-[#1E293B] p-6 rounded-2xl lg:col-span-2 space-y-4 border border-slate-200 shadow-sm relative overflow-hidden">
            <h3 className="font-serif text-lg font-bold flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="w-5 h-5 text-[#FF5A5F]" />
              {isAr ? 'بوابة الانتقال ومؤشرات التقدم (Stage-Gate Criteria)' : 'Progression Stage-Gate (MVP to Public Launch)'}
            </h3>
            <p className="text-xs text-slate-600">
              {isAr 
                ? 'للترخيص بالانتقال من مرحلة الـ MVP وإطلاق النسخة العامة التجارية المتقدمة، يجب استيفاء الشروط التالية بشكل عملي وموثق:'
                : 'To authorize the strategic shift and allocate resources from MVP testing to public commercial launch, the platform must cross the following thresholds:'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-white/90 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block uppercase mb-1">{isAr ? 'بوابة البيانات' : 'Data Ingestion Gate'}</span>
                <span className="font-bold text-slate-900 block text-sm">99.9%</span>
                <span className="text-[10px] text-slate-500">{isAr ? 'دقة ربط ومطابقة بيانات الفواتير والحجوزات دون تكرار.' : 'Accurate matching of booking logs to finalized invoice records.'}</span>
              </div>

              <div className="p-3 bg-white/90 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block uppercase mb-1">{isAr ? 'بوابة الدقة والخطأ' : 'Explainability Gate'}</span>
                <span className="font-bold text-slate-900 block text-sm">Zero</span>
                <span className="text-[10px] text-slate-500">{isAr ? 'صفر توصيات تجميلية خاطئة أو غير آمنة للعميلات من الذكاء الاصطناعي.' : 'Zero unsafe or toxic service/chemical pairings recommended to clients.'}</span>
              </div>

              <div className="p-3 bg-white/90 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block uppercase mb-1">{isAr ? 'بوابة العمولات' : 'Payroll Balance Gate'}</span>
                <span className="font-bold text-slate-900 block text-sm">3 Months</span>
                <span className="text-[10px] text-slate-500">{isAr ? 'توالي ثلاثة أشهر من الحسابات الخالية تماماً من الأخطاء والاعتراضات.' : 'Three consecutive months of zero-error staff commission cycles.'}</span>
              </div>

              <div className="p-3 bg-white/90 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block uppercase mb-1">{isAr ? 'بوابة التفاعل والولاء' : 'Retention Proof Gate'}</span>
                <span className="font-bold text-slate-900 block text-sm">&gt; 15%</span>
                <span className="text-[10px] text-slate-500">{isAr ? 'متوسط زيادة في عودة العميلات الغائبات مقارنة بالوضع السابق.' : 'Average retention uplift on validated customer rebooking loops.'}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ===== SECTION 5: METRICS & OPERATIONAL RISKS ===== */}
      {activeSection === 'metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Product Success Metrics */}
            <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#14332B] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#FF5A5F]" />
                {isAr ? 'مؤشرات نجاح المنصة (Product Success Metrics)' : 'Product Success Metrics (North Stars)'}
              </h3>

              <div className="space-y-3">
                <div className="p-3 bg-[#F6F6F4] rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <strong className="text-[#14332B] block">{isAr ? 'معدل عودة العميلات لصالونك' : 'Client Retention Lift Rate'}</strong>
                    <span className="text-[11px] text-[#6E6A63]">{isAr ? 'قياس نسبة العميلات اللواتي يعدن للحجز مرة أخرى بفضل رسائل التذكير المخصصة.' : 'Tracks percent of lapsed or at-risk customers booking returning appointments.'}</span>
                  </div>
                  <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded-lg">+20%</span>
                </div>

                <div className="p-3 bg-[#F6F6F4] rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <strong className="text-[#14332B] block">{isAr ? 'معدل نمو سلة المبيعات (Basket Size Growth)' : 'Average Ticket Size Uplift'}</strong>
                    <span className="text-[11px] text-[#6E6A63]">{isAr ? 'زيادة متوسط الفاتورة بفضل التوصيات الذكية الدقيقة أثناء الاستشارة.' : 'Measures average ticket size expansion post-launch via cross-sell recommenders.'}</span>
                  </div>
                  <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded-lg">+18%</span>
                </div>

                <div className="p-3 bg-[#F6F6F4] rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <strong className="text-[#14332B] block">{isAr ? 'تقليص العبء الإداري الشهري' : 'Payroll Operations Time Saved'}</strong>
                    <span className="text-[11px] text-[#6E6A63]">{isAr ? 'تقليل الساعات المستهلكة في مراجعة وتصفية عمولات الموظفات وحل الخلافات.' : 'Saves days of finance and operational admin compiling and resolving pay sheets.'}</span>
                  </div>
                  <span className="text-sm font-bold text-[#FF5A5F] bg-[#FF5A5F]/10 px-2 py-1 rounded-lg">80% Saved</span>
                </div>

                <div className="p-3 bg-[#F6F6F4] rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <strong className="text-[#14332B] block">{isAr ? 'مؤشر رضا العميلات (CSAT)' : 'Average Customer Satisfaction (CSAT)'}</strong>
                    <span className="text-[11px] text-[#6E6A63]">{isAr ? 'متوسط تقييمات الخدمة المستلمة عبر نظام الفواتير والرسائل.' : 'Refined quality indicator tracking clean post-visit ratings.'}</span>
                  </div>
                  <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded-lg">&gt; 4.8 / 5</span>
                </div>
              </div>
            </div>

            {/* Major Operational Risks & Mitigation */}
            <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#14332B] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-red-600" />
                {isAr ? 'إدارة المخاطر والالتزام' : 'Major Strategy & Operational Risks'}
              </h3>

              <div className="space-y-4 text-xs text-start">
                <div className="space-y-1">
                  <strong className="text-[#14332B] flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    {isAr ? 'خطر مقاومة طاقم العمل وتلاعب العمولات' : 'Risk 1: Stylist Payout Gamification'}
                  </strong>
                  <p className="text-[11px] text-[#6E6A63] leading-relaxed">
                    {isAr 
                      ? 'التخفيف: حماية هوامش الربح وربط العمولات الحقيقية بالتقييم النهائي والعودة الفعلية للعميلة للتأكد من جودة الخدمة لا بيع مفرط يضر العلامة.'
                      : 'Mitigation: Automatically link high commissions to customer retention and CSAT metrics. Block commission payouts for service rework or refunds.'}
                  </p>
                </div>

                <div className="space-y-1">
                  <strong className="text-[#14332B] flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    {isAr ? 'خطر الخصوصية وسرية بيانات العميلات' : 'Risk 2: Data Privacy & Consent'}
                  </strong>
                  <p className="text-[11px] text-[#6E6A63] leading-relaxed">
                    {isAr 
                      ? 'التخفيف: تشفير كامل لقواعد البيانات، وربط الرسائل بصلاحيات محددة، مع توفير خيار مباشر وسهل لإلغاء الاشتراك وحذف البيانات للعميلة.'
                      : 'Mitigation: Role-based access control restricting raw client numbers from non-admin staff, fully automated GDPR & Saudi PDPL privacy compliance.'}
                  </p>
                </div>

                <div className="space-y-1">
                  <strong className="text-[#14332B] flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    {isAr ? 'خطر انزعاج العميلات من كثرة الرسائل' : 'Risk 3: Spam Fatigue'}
                  </strong>
                  <p className="text-[11px] text-[#6E6A63] leading-relaxed">
                    {isAr 
                      ? 'التخفيف: نظام ذكي يضع حدوداً صارمة للتواصل (مثل رسالة واحدة كحد أقصى كل ٣٠ يوماً للعميلة الواحدة)، لمنع إزعاج العميلات وضمان الفعالية.'
                      : 'Mitigation: Enforce hard communication limits (e.g. maximum 1 automated touchpoint per 30 days per client) ensuring high-quality engagement.'}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Post-Launch Priorities */}
          <div className="bg-white p-6 rounded-2xl border border-[#E9E7E2] space-y-4 text-start">
            <h3 className="font-serif text-lg font-bold text-[#14332B] flex items-center gap-2">
              <Milestone className="w-5 h-5 text-[#FF5A5F]" />
              {isAr ? 'أولويات ما بعد الإطلاق والنمو المستدام (Post-Launch Phase)' : 'Post-Launch Phase - Multi-Salon Optimization & AI Coaching'}
            </h3>
            <p className="text-xs text-[#6E6A63] max-w-4xl leading-relaxed">
              {isAr 
                ? 'تشمل هذه المرحلة الميزات الاستراتيجية التي تم تأجيلها عن قصد لضمان استقرار العمليات الأساسية للمنشأة أولاً، لتركز لاحقاً على التوسع والتمكين الجماعي:'
                : 'Strategic features deferred to after the primary commercial launch has matured, enabling multi-location network coordination and automated workforce upskilling:'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-[#F6F6F4] rounded-xl space-y-1">
                <span className="w-2 h-2 inline-block bg-[#FF5A5F] rounded-full mr-1"></span>
                <strong className="text-[#14332B] block">{isAr ? 'رحلات العميل التسويقية الذكية وتخصيص الوقت والقنوات' : 'Trigger-Based Marketing Journeys'}</strong>
                <p className="text-[11px] text-[#6E6A63]">{isAr ? 'تحسين واختيار القناة المثلى والوقت الملائم لكل عميلة بالاعتماد التام على بيانات التفاعل السابقة.' : 'Automatic delivery personalization identifying if a specific customer prefers early morning text or evening WhatsApp.'}</p>
              </div>

              <div className="p-4 bg-[#F6F6F4] rounded-xl space-y-1">
                <span className="w-2 h-2 inline-block bg-[#FF5A5F] rounded-full mr-1"></span>
                <strong className="text-[#14332B] block">{isAr ? 'التحليلات والمقارنات المعيارية المتعددة الفروع' : 'Cross-Location Benchmark Analytics'}</strong>
                <p className="text-[11px] text-[#6E6A63]">{isAr ? 'مقارنة أداء الفروع المختلفة، وتقديم حوافز للموظفين على مستوى المجموعة بالكامل لتعزيز روح المنافسة الشريفة.' : 'Enables enterprise-wide analytics and cross-salon competitive KPIs to empower salon chains.'}</p>
              </div>

              <div className="p-4 bg-[#F6F6F4] rounded-xl space-y-1">
                <span className="w-2 h-2 inline-block bg-[#FF5A5F] rounded-full mr-1"></span>
                <strong className="text-[#14332B] block">{isAr ? 'تطوير وتدريب الموظفين الذكي بالذكاء الاصطناعي' : 'AI-Generated Professional Coaching'}</strong>
                <p className="text-[11px] text-[#6E6A63]">{isAr ? 'صياغة بطاقات أداء ذكية مخصصة تسلط الضوء على فجوات المهارات، مع تزكية محتوى تعليمي ملائم لولاية أعلى.' : 'Translates performance reviews into actionable upskilling tasks, matching stylist performance history with learning modules.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
