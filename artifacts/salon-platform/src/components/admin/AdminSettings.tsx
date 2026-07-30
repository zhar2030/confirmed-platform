import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Plus, ExternalLink, Settings, Globe, CreditCard, Mail, Smartphone, Code } from 'lucide-react';
import type { Integration, Toast } from './adminTypes';
import { MOCK_INTEGRATIONS } from './adminData';

interface Props { isAr: boolean; addToast: (t: Omit<Toast, 'id'>) => void; }

const CAT_ICONS: Record<string, any> = { payment: CreditCard, sms: Smartphone, email: Mail, analytics: Globe, erp: Settings, api: Code };
const CAT_LABELS: Record<string, { ar: string; en: string }> = {
  payment:   { ar: 'بوابات الدفع',    en: 'Payment Gateways' },
  sms:       { ar: 'خدمات SMS',      en: 'SMS Services' },
  email:     { ar: 'البريد الإلكتروني', en: 'Email Services' },
  analytics: { ar: 'التحليلات',      en: 'Analytics' },
  erp:       { ar: 'ERP وأنظمة',     en: 'ERP & Systems' },
  api:       { ar: 'واجهات API',     en: 'API Integrations' },
};

const STATUS_ICON = { connected: CheckCircle, disconnected: XCircle, error: AlertTriangle };
const STATUS_COLOR = { connected: 'text-emerald-400', disconnected: 'text-slate-500', error: 'text-amber-400' };

export default function AdminSettings({ isAr, addToast }: Props) {
  const [integrations, setIntegrations] = useState<Integration[]>(MOCK_INTEGRATIONS);
  const [testing, setTesting] = useState<string | null>(null);
  const [tab, setTab] = useState<'integrations' | 'general' | 'api'>('integrations');

  // General settings state
  const [settings, setSettings] = useState({
    platformName: 'CONFIRMED',
    platformUrl: 'https://confirmed.sa',
    supportEmail: 'support@confirmed.sa',
    commissionRate: 10,
    trialDays: 14,
    maxBranches: 20,
    autoApprove: false,
    maintenanceMode: false,
    allowNewSignups: true,
  });

  const testIntegration = async (id: string) => {
    setTesting(id);
    await new Promise(r => setTimeout(r, 1500));
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, status: 'connected', lastSync: new Date().toISOString() } : i));
    addToast({ type: 'success', message: isAr ? 'تم اختبار الاتصال بنجاح ✓' : 'Connection test successful ✓' });
    setTesting(null);
  };

  const toggleIntegration = (id: string) => {
    setIntegrations(prev => prev.map(i => {
      if (i.id !== id) return i;
      const next = i.status === 'connected' ? 'disconnected' : 'connected';
      return { ...i, status: next };
    }));
    const intg = integrations.find(i => i.id === id)!;
    const next = intg.status === 'connected' ? 'disconnected' : 'connected';
    addToast({ type: next === 'connected' ? 'success' : 'info', message: isAr ? `${next === 'connected' ? 'تم ربط' : 'تم فصل'} ${intg.name}` : `${intg.name} ${next}` });
  };

  const saveSettings = () => {
    addToast({ type: 'success', message: isAr ? 'تم حفظ إعدادات النظام بنجاح' : 'System settings saved' });
  };

  const byCategory = integrations.reduce<Record<string, Integration[]>>((acc, i) => {
    (acc[i.category] = acc[i.category] || []).push(i); return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Tab nav */}
      <div className="flex gap-1 border-b border-slate-200">
        {[{ id: 'integrations', ar: 'التكاملات والربط', en: 'Integrations' }, { id: 'general', ar: 'الإعدادات العامة', en: 'General Settings' }, { id: 'api', ar: 'مفاتيح API', en: 'API Keys' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer -mb-px ${tab === t.id ? 'border-[#FF5A5F] text-[#FF5A5F]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {isAr ? t.ar : t.en}
          </button>
        ))}
      </div>

      {/* Integrations Tab */}
      {tab === 'integrations' && (
        <div className="space-y-5">
          {Object.entries(byCategory).map(([cat, items]) => {
            const Icon = CAT_ICONS[cat] || Globe;
            const label = CAT_LABELS[cat] || { ar: cat, en: cat };
            return (
              <div key={cat} className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <Icon className="w-3.5 h-3.5" />{isAr ? label.ar : label.en}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map(intg => {
                    const SIcon = STATUS_ICON[intg.status];
                    const sColor = STATUS_COLOR[intg.status];
                    return (
                      <div key={intg.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl shrink-0">{intg.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900">{intg.name}</p>
                            <SIcon className={`w-3.5 h-3.5 ${sColor}`} />
                          </div>
                          <p className="text-[9px] text-slate-600 mt-0.5">{intg.provider} · {isAr ? 'آخر مزامنة:' : 'Last sync:'} {intg.lastSync !== '—' ? new Date(intg.lastSync).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => testIntegration(intg.id)} disabled={testing === intg.id}
                            className="p-1.5 text-slate-500 hover:text-slate-900 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all disabled:opacity-50">
                            <RefreshCw className={`w-3.5 h-3.5 ${testing === intg.id ? 'animate-spin' : ''}`} />
                          </button>
                          <button onClick={() => toggleIntegration(intg.id)}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${intg.status === 'connected' ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'}`}>
                            {intg.status === 'connected' ? (isAr ? 'فصل' : 'Disconnect') : (isAr ? 'ربط' : 'Connect')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <button className="bg-white border border-dashed border-slate-200 rounded-2xl p-4 flex items-center gap-3 text-slate-600 hover:border-[#FF5A5F]/30 hover:text-[#FF5A5F] transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-white/3 flex items-center justify-center group-hover:bg-[#FF5A5F]/10">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold">{isAr ? 'إضافة تكامل جديد' : 'Add Integration'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* General Settings Tab */}
      {tab === 'general' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-slate-900">{isAr ? 'إعدادات المنصة الأساسية' : 'Core Platform Settings'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { k: 'platformName', l: isAr ? 'اسم المنصة' : 'Platform Name' },
                { k: 'platformUrl',  l: isAr ? 'النطاق الرئيسي' : 'Main Domain' },
                { k: 'supportEmail', l: isAr ? 'بريد الدعم' : 'Support Email' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1.5">{f.l}</label>
                  <input value={(settings as any)[f.k]} onChange={e => setSettings(s => ({ ...s, [f.k]: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#FF5A5F]" />
                </div>
              ))}
              {[
                { k: 'commissionRate', l: isAr ? 'نسبة عمولة المنصة (%)' : 'Platform Commission (%)', min: 0, max: 30 },
                { k: 'trialDays',     l: isAr ? 'أيام الفترة التجريبية' : 'Trial Period (days)',       min: 7, max: 90 },
                { k: 'maxBranches',   l: isAr ? 'أقصى عدد فروع (مؤسسي)' : 'Max Branches (Enterprise)', min: 5, max: 100 },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1.5">{f.l}</label>
                  <input type="number" min={f.min} max={f.max} value={(settings as any)[f.k]} onChange={e => setSettings(s => ({ ...s, [f.k]: +e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#FF5A5F] font-mono" />
                </div>
              ))}
            </div>
            {/* Toggles */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              {[
                { k: 'autoApprove',    ar: 'الموافقة التلقائية على الصالونات الجديدة', en: 'Auto-approve new salon registrations', danger: false },
                { k: 'allowNewSignups', ar: 'السماح بتسجيلات جديدة',                 en: 'Allow new signups',                   danger: false },
                { k: 'maintenanceMode', ar: 'وضع الصيانة (يوقف الوصول للمنصة)',      en: 'Maintenance Mode (blocks all access)', danger: true },
              ].map(f => (
                <div key={f.k} className={`flex items-center justify-between p-3 rounded-xl ${f.danger ? 'bg-red-500/5 border border-red-500/10' : 'bg-slate-50'}`}>
                  <span className={`text-xs ${f.danger ? 'text-red-400' : 'text-slate-300'} font-medium`}>{isAr ? f.ar : f.en}</span>
                  <button onClick={() => setSettings(s => ({ ...s, [f.k]: !(s as any)[f.k] }))}
                    className={`w-11 h-6 rounded-full transition-all cursor-pointer relative ${(settings as any)[f.k] ? (f.danger ? 'bg-red-500' : 'bg-[#FF5A5F]') : 'bg-white/10'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${(settings as any)[f.k] ? 'end-1' : 'start-1'}`} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={saveSettings} className="px-6 py-2.5 bg-[#FF5A5F] hover:bg-[#E04B50] text-white text-xs font-bold rounded-xl cursor-pointer transition-all">
              {isAr ? 'حفظ الإعدادات' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {tab === 'api' && (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-300">{isAr ? 'احتفظي بمفاتيح API سرية. لا تشاركيها مع أي جهة خارجية. يتم تشفيرها بـ AES-256.' : 'Keep API keys secret. Never share them externally. All keys are AES-256 encrypted.'}</p>
          </div>
          {[
            { name: 'REST API Key — Production', key: 'cfrm_prod_' + 'x'.repeat(32), env: 'Production', status: 'active' },
            { name: 'REST API Key — Staging', key: 'cfrm_stag_' + 'x'.repeat(32), env: 'Staging', status: 'active' },
            { name: 'Webhook Secret', key: 'whsec_' + 'x'.repeat(40), env: 'All', status: 'active' },
          ].map((k, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
              <Code className="w-4 h-4 text-[#FF5A5F] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900">{k.name}</p>
                <p className="text-[10px] text-slate-600 font-mono mt-1 truncate">{k.key.slice(0, 20)}{'•'.repeat(20)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[9px] bg-slate-500/15 text-slate-400 px-2 py-0.5 rounded-full font-bold">{k.env}</span>
                <button onClick={() => { navigator.clipboard.writeText(k.key); addToast({ type: 'info', message: isAr ? 'تم نسخ المفتاح' : 'Key copied' }); }}
                  className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-900 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all">
                  {isAr ? 'نسخ' : 'Copy'}
                </button>
                <button onClick={() => addToast({ type: 'warning', message: isAr ? 'تم إعادة توليد المفتاح' : 'Key regenerated' })}
                  className="p-1.5 text-slate-500 hover:text-slate-900 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button className="flex items-center gap-2 text-[10px] font-bold text-[#FF5A5F] hover:underline cursor-pointer">
            <ExternalLink className="w-3.5 h-3.5" />{isAr ? 'عرض توثيق API الكامل' : 'View Full API Documentation'}
          </button>
        </div>
      )}
    </div>
  );
}
