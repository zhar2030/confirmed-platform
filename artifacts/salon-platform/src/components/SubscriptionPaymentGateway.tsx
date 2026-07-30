import React, { useState, useEffect } from 'react';
import { getProviderHeaders } from '../lib/providerAuth';
import {
  ShieldCheck, Lock, Sparkles, Check, ArrowRight, ArrowLeft,
  CheckCircle2, Loader2, AlertCircle, ExternalLink, CreditCard,
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface SubscriptionPaymentGatewayProps {
  initialPackage?: string;
  providerData: {
    id?: string | number;  // numeric DB id — used as X-Provider-Id header for auth
    username: string;
    storeName?: string;
    activity?: string;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  onPaymentSuccess: (packageType: string, billingCycle: 'monthly' | 'yearly', amountPaid: string, paymentMethod: string) => void;
  onCancel: () => void;
}

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') + '/api' || '/api';

const plans = {
  basic: {
    nameAr: 'الباقة الأساسية الميسرة',
    nameEn: 'Starter Basic Plan',
    descAr: 'مثالية للصالونات الفردية والخدمات المستقلة للبدء فوراً وبكل سهولة.',
    descEn: 'Perfect for individual salons and independent beauty artists starting up.',
    monthlyPrice: 199,
    yearlyPrice: 159,
    featuresAr: [
      'فرع رئيسي واحد كامل الصلاحيات',
      'حتى ٣ موظفين بجدولة مستقلة',
      'نظام حجز فوري وتأكيد تلقائي',
      'سجل مبسط للعملاء (CRM)',
      'إصدار فواتير رقمية مبسطة مع VAT',
      'نسخ احتياطي يومي آمن ومحمي',
    ],
    featuresEn: [
      '1 Full-featured Main Branch',
      'Up to 3 Staff Members schedules',
      'Instant Booking & Auto Confirmation',
      'Simplified Customer Registry (CRM)',
      'Digital VAT-compliant Invoicing',
      'Secure Daily Automatic Backups',
    ],
  },
  pro: {
    nameAr: 'الباقة المتقدمة الاحترافية',
    nameEn: 'Professional Growth Plan',
    descAr: 'الحزمة الأكثر طلباً للنمو والتشغيل المتكامل وإدارة الحجوزات السحابية.',
    descEn: 'The most popular package for growing salons and full-scale cloud booking.',
    monthlyPrice: 399,
    yearlyPrice: 319,
    featuresAr: [
      'فروع متعددة مع تبديل ذكي فوري',
      'عدد غير محدود من الموظفين والأخصائيات',
      'نظام الكاشير المطور (POS) مع دعم باركود',
      'إدارة متقدمة للمخزون وتنبيهات النواقص',
      'بطاقات الهدايا وأكواد الخصم والولاء',
      'تقارير ذكاء الأعمال والأداء المالي',
      'الأمان الثنائي والامتثال لـ سدايا / هيئة الزكاة',
    ],
    featuresEn: [
      'Multi-Branch management with instant switching',
      'Unlimited Staff & Beauty Specialists',
      'Advanced Point of Sale (POS) with Barcode',
      'Inventory Tracking & Low Stock Smart Alerts',
      'Gift Cards, Loyalty Points & Promo Codes',
      'Advanced Business Intelligence & Analytics',
      'MFA Security & ZATCA Compliant Invoicing',
    ],
  },
};

export default function SubscriptionPaymentGateway({
  initialPackage = 'pro',
  providerData,
  onPaymentSuccess,
  onCancel,
}: SubscriptionPaymentGatewayProps) {
  const { isAr, dir } = useLanguage();

  const [selectedPlan, setSelectedPlan]     = useState<'basic' | 'pro'>(
    (initialPackage === 'basic' ? 'basic' : 'pro'),
  );
  const [billingCycle, setBillingCycle]     = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [verifying, setVerifying]           = useState(false);
  const [dbProviderId, setDbProviderId]     = useState<number | null>(null);
  const [idLoading, setIdLoading]           = useState(true);

  // ── Resolve numeric DB provider ID (used as X-Provider-Id auth header) ──────
  useEffect(() => {
    if (!providerData?.username) { setIdLoading(false); return; }
    fetch(`${API_BASE}/auth/provider/${encodeURIComponent(providerData.username)}`)
      .then(r => r.json())
      .then(data => {
        if (data.provider?.id) setDbProviderId(data.provider.id);
        else console.warn('[SubscriptionPaymentGateway] could not resolve DB provider id');
      })
      .catch(e => console.error('[SubscriptionPaymentGateway] id lookup failed', e))
      .finally(() => setIdLoading(false));
  }, [providerData?.username]); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = plans[selectedPlan];
  const unitPrice  = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  const subtotal   = unitPrice * (billingCycle === 'monthly' ? 1 : 12);
  const vat        = Math.round(subtotal * 0.15 * 100) / 100;
  const total      = subtotal + vat;

  // ── Detect Stripe redirect back ─────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing   = params.get('billing');
    const sessionId = params.get('session_id');
    const planParam = params.get('plan') as 'basic' | 'pro' | null;
    const cycle     = params.get('cycle') as 'monthly' | 'yearly' | null;

    if (billing === 'success' && sessionId) {
      setVerifying(true);
      // Strip query params from URL
      window.history.replaceState({}, '', window.location.pathname);

      // Resolve DB provider id (may not be in state yet on first mount after Stripe redirect)
      const resolveId = async (): Promise<number | null> => {
        if (dbProviderId) return dbProviderId;
        if (!providerData?.username) return null;
        try {
          const r = await fetch(`${API_BASE}/auth/provider/${encodeURIComponent(providerData.username)}`);
          const d = await r.json();
          if (d.provider?.id) { setDbProviderId(d.provider.id); return d.provider.id; }
        } catch { /* ignore */ }
        return null;
      };

      // Use async IIFE to avoid promise-chain double-parse bug
      (async () => {
        try {
          const pid = await resolveId();
          if (!pid) {
            setError(isAr ? 'تعذّر التحقق من هويتك' : 'Could not verify identity');
            return;
          }

          const res = await fetch(`${API_BASE}/billing/verify-session?sessionId=${sessionId}`, {
            headers: { ...getProviderHeaders() },
          });
          const data = await res.json(); // parse exactly once

          if (res.ok && data.success) {
            const pkg    = data.plan         || planParam    || selectedPlan;
            const cyc    = (data.billingCycle || cycle       || billingCycle) as 'monthly' | 'yearly';
            const amount = String(data.amountSAR || total);
            onPaymentSuccess(pkg, cyc, amount, 'stripe');
          } else {
            const msg = data?.error ?? 'unknown';
            console.warn('[verify-session] failed:', msg);
            setError(isAr
              ? 'تعذّر التحقق من الدفعة — يرجى التواصل مع الدعم'
              : 'Could not verify payment — contact support');
          }
        } catch (err) {
          console.error('[verify-session] error:', err);
          setError(isAr ? 'خطأ في التحقق من الدفعة' : 'Verification error');
        } finally {
          setVerifying(false);
        }
      })();
    }

    if (billing === 'cancel') {
      window.history.replaceState({}, '', window.location.pathname);
      setError(isAr ? 'تم إلغاء عملية الدفع.' : 'Checkout was cancelled.');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start Stripe Checkout ────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!dbProviderId) {
      setError(isAr ? 'جارٍ تحميل بيانات الحساب — حاول مرة أخرى' : 'Loading account data — please try again');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const successUrl = `${window.location.origin}${window.location.pathname}?billing=success&session_id={CHECKOUT_SESSION_ID}&plan=${selectedPlan}&cycle=${billingCycle}`;
      const cancelUrl  = `${window.location.origin}${window.location.pathname}?billing=cancel`;

      // Auth: X-Provider-Id header (numeric DB id) — never trust username from body alone
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getProviderHeaders(),
        },
        body: JSON.stringify({
          plan: selectedPlan,
          billingCycle,
          successUrl,
          cancelUrl,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.message || 'No checkout URL');
      }
    } catch (err: any) {
      setError(isAr
        ? `حدث خطأ أثناء فتح بوابة الدفع: ${err.message}`
        : `Error opening payment gateway: ${err.message}`);
      setLoading(false);
    }
  };

  // ── Loading / verifying screen ───────────────────────────────────────────────
  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" dir={dir}>
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto" />
          <p className="text-white text-lg font-bold">{isAr ? 'جارٍ التحقق من الدفعة…' : 'Verifying payment…'}</p>
          <p className="text-slate-400 text-sm">{isAr ? 'ثوانٍ فقط' : 'Just a moment'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 md:p-10 font-sans relative overflow-hidden" dir={dir}>

      {/* Background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#FF5A5F]/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="w-full max-w-5xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A5F]" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFAE34]" />
            </div>
            <div>
              <span className="font-serif text-lg font-black tracking-tight text-white block">
                {providerData?.storeName || 'CONFIRMED'}
              </span>
              <span className="text-[9px] text-teal-400 font-black tracking-wider uppercase block mt-0.5">
                {isAr ? 'بوابة الاشتراك الآمن' : 'Secured SaaS Subscription'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 rounded-full border border-slate-800 text-[10px] font-bold text-slate-400">
              <Lock className="w-3 h-3 text-[#FF5A5F]" />
              <span>Powered by Stripe · PCI-DSS</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-10 flex-1 flex flex-col space-y-8">

          {/* Heading */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="px-3.5 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-bold border border-teal-500/20 uppercase tracking-widest inline-block">
              {isAr ? '✓ حسابك مفعل — اختر باقتك' : '✓ Account Verified — Choose your plan'}
            </span>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-white leading-tight">
              {isAr ? 'اختر باقة صالونك وابدأ رحلتك الرقمية' : 'Select your subscription and launch your portal'}
            </h2>
            <p className="text-xs text-slate-400">
              {isAr
                ? 'سيتم توجيهك لصفحة Stripe الآمنة لإتمام الدفع. بياناتك البنكية لا تصل إلينا.'
                : 'You\'ll be redirected to Stripe\'s secure checkout. We never touch your card details.'}
            </p>

            {/* Billing cycle toggle */}
            <div className="pt-4 inline-flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 select-none">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${billingCycle === 'monthly' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                {isAr ? 'الدفع الشهري' : 'Pay Monthly'}
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-[#FF5A5F] text-white shadow-lg shadow-[#FF5A5F]/20' : 'text-slate-400 hover:text-white'}`}
              >
                <span>{isAr ? 'الدفع السنوي' : 'Pay Yearly'}</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[9px] uppercase">
                  {isAr ? 'وفر ٢٠٪' : 'SAVE 20%'}
                </span>
              </button>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">

            {/* Basic */}
            <div
              onClick={() => setSelectedPlan('basic')}
              className={`group relative rounded-3xl p-6 border-2 transition-all cursor-pointer flex flex-col min-h-[400px] ${
                selectedPlan === 'basic'
                  ? 'bg-slate-900 border-teal-500 shadow-xl shadow-teal-500/5'
                  : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-white">{isAr ? plans.basic.nameAr : plans.basic.nameEn}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">{isAr ? plans.basic.descAr : plans.basic.descEn}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${selectedPlan === 'basic' ? 'border-teal-500 bg-teal-500' : 'border-slate-700'}`}>
                  {selectedPlan === 'basic' && <Check className="w-3.5 h-3.5 text-slate-900 stroke-[3]" />}
                </div>
              </div>
              <div className="mb-4">
                <span className="font-serif text-3xl font-black text-white">
                  {billingCycle === 'monthly' ? plans.basic.monthlyPrice : plans.basic.yearlyPrice}
                </span>
                <span className="text-xs text-slate-400 ms-1.5 font-bold">{isAr ? 'ر.س / شهرياً' : 'SAR / mo'}</span>
                {billingCycle === 'yearly' && (
                  <p className="text-[10px] text-slate-500 mt-1">{isAr ? 'فاتورة سنوية: 1,908 ر.س' : 'Billed annually: 1,908 SAR'}</p>
                )}
              </div>
              <ul className="border-t border-slate-800 pt-4 space-y-2.5 flex-1">
                {(isAr ? plans.basic.featuresAr : plans.basic.featuresEn).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro */}
            <div
              onClick={() => setSelectedPlan('pro')}
              className={`group relative rounded-3xl p-6 border-2 transition-all cursor-pointer flex flex-col min-h-[400px] overflow-hidden ${
                selectedPlan === 'pro'
                  ? 'bg-gradient-to-b from-slate-900 to-[#142220] border-[#FF5A5F] shadow-2xl shadow-[#FF5A5F]/10'
                  : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="absolute top-4 start-4">
                <span className="px-2.5 py-1 bg-[#FF5A5F] text-white text-[9px] font-black rounded-full uppercase tracking-wider">
                  {isAr ? 'الأكثر طلباً' : 'Most Popular'}
                </span>
              </div>
              <div className="flex justify-between items-start mt-8 mb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-white">{isAr ? plans.pro.nameAr : plans.pro.nameEn}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">{isAr ? plans.pro.descAr : plans.pro.descEn}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${selectedPlan === 'pro' ? 'border-[#FF5A5F] bg-[#FF5A5F]' : 'border-slate-700'}`}>
                  {selectedPlan === 'pro' && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </div>
              </div>
              <div className="mb-4">
                <span className="font-serif text-3xl font-black text-white">
                  {billingCycle === 'monthly' ? plans.pro.monthlyPrice : plans.pro.yearlyPrice}
                </span>
                <span className="text-xs text-slate-400 ms-1.5 font-bold">{isAr ? 'ر.س / شهرياً' : 'SAR / mo'}</span>
                {billingCycle === 'yearly' && (
                  <p className="text-[10px] text-slate-500 mt-1">{isAr ? 'فاتورة سنوية: 3,828 ر.س' : 'Billed annually: 3,828 SAR'}</p>
                )}
              </div>
              <ul className="border-t border-slate-800/50 pt-4 space-y-2.5 flex-1">
                {(isAr ? plans.pro.featuresAr : plans.pro.featuresEn).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-[#FF5A5F] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Summary + CTA */}
          <div className="max-w-md mx-auto w-full space-y-4">
            {/* Price summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
                <span className="font-mono">{subtotal.toLocaleString()} {isAr ? 'ر.س' : 'SAR'}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{isAr ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}</span>
                <span className="font-mono">{vat.toLocaleString()} {isAr ? 'ر.س' : 'SAR'}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-white border-t border-slate-800 pt-3">
                <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                <span className="font-mono text-[#FF5A5F]">{total.toLocaleString()} {isAr ? 'ر.س' : 'SAR'}</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Stripe CTA */}
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-[#FF5A5F] hover:bg-[#E04B50] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl py-4 transition-all shadow-lg shadow-[#FF5A5F]/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isAr ? 'جارٍ التحويل لـ Stripe…' : 'Redirecting to Stripe…'}</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>
                    {isAr
                      ? `الاشتراك في ${selectedPlan === 'basic' ? 'الباقة الأساسية' : 'الباقة المتقدمة'}`
                      : `Subscribe to ${selectedPlan === 'basic' ? 'Basic' : 'Pro'} Plan`}
                  </span>
                  <ExternalLink className="w-4 h-4 opacity-70" />
                </>
              )}
            </button>

            {/* Trust signals */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Stripe Secured</span>
              <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> PCI-DSS</span>
              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> ZATCA Invoices</span>
            </div>

            {/* Cancel */}
            <button
              onClick={onCancel}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-400 py-2 transition-all flex items-center justify-center gap-1"
            >
              {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              {isAr ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
