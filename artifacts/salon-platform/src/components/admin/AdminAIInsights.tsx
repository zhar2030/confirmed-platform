/**
 * AdminAIInsights — AI-driven recommendations (Platform Owner only).
 * Computes insights from real platform data: churn risk, growth, inactivity.
 */
import { useState, useEffect, useCallback } from 'react';
import { Brain, TrendingDown, TrendingUp, AlertCircle, Clock, RefreshCw, Zap, Target, Star } from 'lucide-react';
import type { RegisteredProvider, Toast } from './adminTypes';
import { getAdminHeaders } from '../../lib/adminAuth';

interface Props { providers: RegisteredProvider[]; isAr: boolean; addToast: (t: Omit<Toast, 'id'>) => void; }

interface Insights {
  churnRiskSalons: any[];
  tierGrowth: any[];
  inactiveSalons: any[];
  generatedAt: string;
}

export default function AdminAIInsights({ providers, isAr, addToast }: Props) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/ai-insights', { headers: getAdminHeaders() })
      .then(r => r.json())
      .then(d => { if (d.churnRiskSalons !== undefined) setInsights(d); })
      .catch(() => addToast({ type: 'error', message: isAr ? 'فشل تحميل الرؤى' : 'Failed to load insights' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Platform-level computed insights from providers prop
  const totalMRR   = providers.filter(p => p.subscriptionStatus === 'active').reduce((a, p) => a + p.mrr, 0);
  const highChurn  = providers.filter(p => p.churnRisk === 'high');
  const trialReady = providers.filter(p => p.status === 'trial' && p.bookingsCount > 5);
  const platformScore = Math.round(
    ((providers.filter(p => p.status === 'active').length / Math.max(providers.length, 1)) * 40) +
    ((providers.filter(p => p.churnRisk === 'low').length / Math.max(providers.length, 1)) * 30) +
    (Math.min(totalMRR / 5000, 1) * 30)
  );

  const SCORE_COLOR = platformScore >= 80 ? '#10b981' : platformScore >= 60 ? '#f59e0b' : '#ef4444';

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 space-y-3">
      <Brain className="w-10 h-10 text-[#FF5A5F] animate-pulse" />
      <p className="text-sm text-slate-500">{isAr ? 'يتم تحليل بيانات المنصة...' : 'Analyzing platform data...'}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5A5F]/20 to-purple-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-[#FF5A5F]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{isAr ? 'رؤى ذكاء اصطناعي' : 'AI-Powered Insights'}</h3>
            <p className="text-[9px] text-slate-400">{isAr ? 'مبنية على بيانات المنصة الفعلية' : 'Based on real platform data'} · {insights?.generatedAt ? new Date(insights.generatedAt).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US') : ''}</p>
          </div>
        </div>
        <button onClick={load} className="p-2 text-slate-400 hover:text-slate-700 cursor-pointer bg-white border border-slate-200 rounded-xl">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Platform Health Score */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{isAr ? 'نقاط صحة المنصة' : 'Platform Health Score'}</p>
            <p className="text-5xl font-black font-mono" style={{ color: SCORE_COLOR }}>{platformScore}<span className="text-xl text-slate-400">/100</span></p>
            <p className="text-xs text-slate-500 mt-1">{platformScore >= 80 ? (isAr ? 'منصة في وضع ممتاز' : 'Excellent platform health') : platformScore >= 60 ? (isAr ? 'منصة في وضع جيد مع فرص تحسين' : 'Good health, room for improvement') : (isAr ? 'يحتاج تدخلاً فورياً' : 'Needs immediate attention')}</p>
          </div>
          <div className="w-24 h-24 relative">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="3" />
              <circle cx="18" cy="18" r="16" fill="none" stroke={SCORE_COLOR} strokeWidth="3"
                strokeDasharray={`${platformScore} 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Star className="w-6 h-6" style={{ color: SCORE_COLOR }} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          {[
            { l: isAr ? 'صالونات نشطة' : 'Active Salons', v: providers.filter(p => p.status === 'active').length + '/' + providers.length, c: '#10b981' },
            { l: isAr ? 'خطر منخفض' : 'Low Churn Risk', v: providers.filter(p => p.churnRisk === 'low').length, c: '#3b82f6' },
            { l: 'MRR',                                   v: totalMRR.toLocaleString() + ' ر.س', c: '#FF5A5F' },
          ].map((k, i) => (
            <div key={i} className="text-center">
              <p className="text-lg font-black font-mono" style={{ color: k.c }}>{k.v}</p>
              <p className="text-[9px] text-slate-500 font-bold mt-0.5">{k.l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Churn Risk Alert */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center"><TrendingDown className="w-4 h-4 text-red-500" /></div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">{isAr ? 'صالونات معرضة للمغادرة' : 'Churn Risk Salons'}</h4>
              <p className="text-[9px] text-slate-400">{isAr ? 'تحتاج تواصلاً عاجلاً' : 'Require immediate outreach'}</p>
            </div>
          </div>
          {highChurn.length === 0 && (insights?.churnRiskSalons?.length ?? 0) === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
              <Zap className="w-4 h-4 text-emerald-500" />
              <p className="text-xs text-emerald-700">{isAr ? 'لا توجد صالونات في خطر حالياً ✓' : 'No salons at risk currently ✓'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {highChurn.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{p.storeName}</p>
                    <p className="text-[9px] text-slate-400">{p.subscriptionStatus} · {p.city}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-xs font-mono text-red-500">{p.mrr} ر.س MRR</p>
                    <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">{isAr ? 'خطر عالي' : 'High Risk'}</span>
                  </div>
                </div>
              ))}
              {insights?.churnRiskSalons?.filter(s => !highChurn.find(h => String(h.id) === String(s.id))).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{s.name_ar || s.name_en}</p>
                    <p className="text-[9px] text-slate-400">{s.subscription_status}</p>
                  </div>
                  <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">{isAr ? 'خطر' : 'Risk'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Growth Opportunities */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-emerald-500" /></div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">{isAr ? 'فرص ترقية الباقة' : 'Upgrade Opportunities'}</h4>
              <p className="text-[9px] text-slate-400">{isAr ? 'صالونات جاهزة للترقية' : 'Salons ready for upgrade'}</p>
            </div>
          </div>
          {trialReady.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
              <Target className="w-4 h-4 text-slate-400" />
              <p className="text-xs text-slate-500">{isAr ? 'لا توجد صالونات جاهزة للترقية حالياً' : 'No upgrade candidates at the moment'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trialReady.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{p.storeName}</p>
                    <p className="text-[9px] text-slate-400">{p.bookingsCount} {isAr ? 'حجز' : 'bookings'} · {isAr ? 'تجريبي' : 'trial'}</p>
                  </div>
                  <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">{isAr ? 'جاهز' : 'Ready'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inactive salons */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center"><Clock className="w-4 h-4 text-amber-500" /></div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">{isAr ? 'صالونات غير نشطة' : 'Inactive Salons'}</h4>
              <p className="text-[9px] text-slate-400">{isAr ? 'بدون حجوزات آخر 14 يوماً' : 'No bookings in last 14 days'}</p>
            </div>
          </div>
          {(insights?.inactiveSalons?.length ?? 0) === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
              <Zap className="w-4 h-4 text-emerald-500" />
              <p className="text-xs text-emerald-700">{isAr ? 'كل الصالونات نشطة ✓' : 'All salons active ✓'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {insights?.inactiveSalons?.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <p className="text-xs font-bold text-slate-900">{s.name_ar || s.name_en}</p>
                  <p className="text-[9px] text-amber-600">{s.last_booking ? new Date(s.last_booking).toLocaleDateString(isAr ? 'ar-SA' : 'en-US') : (isAr ? 'لا حجوزات' : 'No bookings')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center"><AlertCircle className="w-4 h-4 text-purple-500" /></div>
            <h4 className="text-xs font-bold text-slate-900">{isAr ? 'توصيات فورية' : 'Immediate Recommendations'}</h4>
          </div>
          <div className="space-y-2">
            {[
              highChurn.length > 0 && { icon: TrendingDown, color: 'text-red-500 bg-red-50', text: isAr ? `تواصلي مع ${highChurn.length} صالون في خطر الإلغاء` : `Reach out to ${highChurn.length} high-churn-risk salons` },
              trialReady.length > 0 && { icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50', text: isAr ? `أرسلي عرضاً ترقية لـ ${trialReady.length} صالون تجريبي نشط` : `Send upgrade offer to ${trialReady.length} active trial salons` },
              providers.filter(p => p.subscriptionStatus === 'overdue').length > 0 && { icon: AlertCircle, color: 'text-amber-500 bg-amber-50', text: isAr ? `${providers.filter(p => p.subscriptionStatus === 'overdue').length} صالون متأخر في السداد — أرسلي تذكيراً` : `${providers.filter(p => p.subscriptionStatus === 'overdue').length} salons overdue — send reminder` },
              { icon: Star, color: 'text-blue-500 bg-blue-50', text: isAr ? 'فعّلي ميزة "رؤى AI" للصالونات النشطة لزيادة الاستبقاء' : 'Enable AI Insights for active salons to increase retention' },
            ].filter(Boolean).map((rec: any, i: number) => {
              const Icon = rec.icon;
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${rec.color}`}>
                  <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium text-slate-700">{rec.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
