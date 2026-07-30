import { useState } from 'react';
import { DollarSign, RefreshCw, CheckCircle, AlertTriangle, Plus, Edit2, Trash2, Download } from 'lucide-react';
import type { RegisteredProvider, Toast } from './adminTypes';
import type { SubscriptionPackage } from '../../types';
import * as XLSX from 'xlsx';

interface Props {
  providers: RegisteredProvider[];
  setProviders: (fn: (prev: RegisteredProvider[]) => RegisteredProvider[]) => void;
  packages: SubscriptionPackage[];
  onAddPackage: (p: SubscriptionPackage) => void;
  onUpdatePackage: (p: SubscriptionPackage) => void;
  onDeletePackage: (id: string) => void;
  isAr: boolean;
  addToast: (t: Omit<Toast, 'id'>) => void;
  openConfirm: (cfg: any) => void;
}

export default function AdminBilling({ providers, setProviders, packages, onAddPackage, onUpdatePackage, onDeletePackage, isAr, addToast, openConfirm }: Props) {
  const [tab, setTab] = useState<'ledger' | 'packages'>('ledger');
  const [showPkgModal, setShowPkgModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<SubscriptionPackage | null>(null);

  const totalGMV     = providers.reduce((a, p) => a + p.totalSales, 0);
  const totalComm    = Math.round(totalGMV * 0.10);
  const totalSubs    = providers.reduce((a, p) => a + p.subscriptionPrice, 0);
  const totalPending = providers.reduce((a, p) => a + p.pendingPayout, 0);
  const totalPaid    = providers.reduce((a, p) => a + p.paidOut, 0);

  const settle = (id: string) => {
    const p = providers.find(p => p.id === id)!;
    if (!p.pendingPayout) { addToast({ type: 'info', message: isAr ? 'لا توجد مستحقات معلقة' : 'No pending payouts' }); return; }
    openConfirm({
      title: isAr ? 'تسوية المستحقات' : 'Settle Payouts',
      message: isAr ? `تأكيد صرف ${p.pendingPayout.toLocaleString()} ريال لـ "${p.storeName}"؟` : `Settle SAR ${p.pendingPayout.toLocaleString()} for "${p.storeName}"?`,
      onConfirm: () => {
        setProviders(prev => prev.map(pr => pr.id === id ? { ...pr, paidOut: pr.paidOut + pr.pendingPayout, pendingPayout: 0 } : pr));
        addToast({ type: 'success', message: isAr ? `تمت تسوية ${p.pendingPayout.toLocaleString()} ريال لـ "${p.storeName}"` : `Settled SAR ${p.pendingPayout.toLocaleString()} for "${p.storeName}"` });
      }
    });
  };

  const exportLedger = () => {
    const data = providers.map(p => ({
      [isAr ? 'الصالون' : 'Salon']: p.storeName,
      [isAr ? 'إجمالي المبيعات' : 'Total Sales']: p.totalSales,
      [isAr ? 'العمولة (10%)' : 'Commission (10%)']: Math.round(p.totalSales * 0.1),
      [isAr ? 'معلق' : 'Pending']: p.pendingPayout,
      [isAr ? 'مدفوع' : 'Paid Out']: p.paidOut,
      [isAr ? 'الباقة' : 'Plan']: p.subscriptionTier,
      [isAr ? 'الاشتراك الشهري' : 'Monthly Sub']: p.subscriptionPrice,
      [isAr ? 'حالة الفوترة' : 'Billing Status']: p.subscriptionStatus,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    XLSX.writeFile(wb, `confirmed-ledger-${new Date().toISOString().split('T')[0]}.xlsx`);
    addToast({ type: 'success', message: isAr ? 'تم تصدير الدفتر المالي' : 'Ledger exported' });
  };

  const [pkgForm, setPkgForm] = useState({ nameAr: '', nameEn: '', descAr: '', descEn: '', monthly: 149, yearly: 119, popular: false, enterprise: false, featuresAr: [''], featuresEn: [''] });

  const openPkgAdd = () => { setPkgForm({ nameAr: '', nameEn: '', descAr: '', descEn: '', monthly: 149, yearly: 119, popular: false, enterprise: false, featuresAr: [''], featuresEn: [''] }); setEditingPkg(null); setShowPkgModal(true); };
  const openPkgEdit = (pkg: SubscriptionPackage) => {
    setEditingPkg(pkg);
    setPkgForm({ nameAr: pkg.nameAr, nameEn: pkg.nameEn, descAr: pkg.descriptionAr || '', descEn: pkg.descriptionEn || '', monthly: pkg.priceMonthly, yearly: pkg.priceYearly, popular: !!pkg.isPopular, enterprise: !!pkg.isEnterpriseContact, featuresAr: pkg.featuresAr || [''], featuresEn: pkg.featuresEn || [''] });
    setShowPkgModal(true);
  };
  const savePkg = () => {
    if (!pkgForm.nameAr || !pkgForm.nameEn) { addToast({ type: 'error', message: isAr ? 'يرجى تعبئة الاسم بالعربي والإنجليزي' : 'Fill name in both languages' }); return; }
    const pkg: SubscriptionPackage = {
      id: editingPkg?.id || 'pkg_' + Date.now(),
      nameAr: pkgForm.nameAr, nameEn: pkgForm.nameEn,
      descriptionAr: pkgForm.descAr, descriptionEn: pkgForm.descEn,
      priceMonthly: pkgForm.monthly, priceYearly: pkgForm.yearly,
      isPopular: pkgForm.popular, isEnterpriseContact: pkgForm.enterprise,
      featuresAr: pkgForm.featuresAr.filter(Boolean),
      featuresEn: pkgForm.featuresEn.filter(Boolean),
    };
    if (editingPkg) { onUpdatePackage(pkg); addToast({ type: 'success', message: isAr ? 'تم تعديل الباقة' : 'Package updated' }); }
    else { onAddPackage(pkg); addToast({ type: 'success', message: isAr ? 'تم إضافة الباقة' : 'Package added' }); }
    setShowPkgModal(false);
  };

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { l: isAr ? 'إجمالي GMV' : 'Total GMV', v: totalGMV.toLocaleString() + ' ر.س', c: '#10b981' },
          { l: isAr ? 'عمولات المنصة' : 'Platform Comm.', v: totalComm.toLocaleString() + ' ر.س', c: '#FF5A5F' },
          { l: isAr ? 'إيرادات اشتراكات' : 'Subscription Rev.', v: totalSubs.toLocaleString() + ' ر.س', c: '#3b82f6' },
          { l: isAr ? 'معلق للصرف' : 'Pending Payout', v: totalPending.toLocaleString() + ' ر.س', c: '#f59e0b' },
          { l: isAr ? 'إجمالي المدفوع' : 'Total Paid Out', v: totalPaid.toLocaleString() + ' ر.س', c: '#a855f7' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">{k.l}</p>
            <p className="text-base font-black font-mono" style={{ color: k.c }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[{ id: 'ledger', ar: 'دفتر المستحقات', en: 'Settlement Ledger' }, { id: 'packages', ar: 'الباقات والاشتراكات', en: 'Subscription Packages' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer -mb-px ${tab === t.id ? 'border-[#FF5A5F] text-[#FF5A5F]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {isAr ? t.ar : t.en}
          </button>
        ))}
      </div>

      {/* Ledger Tab */}
      {tab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={exportLedger} className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-slate-200 text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-all">
              <Download className="w-3.5 h-3.5" />{isAr ? 'تصدير Excel' : 'Export Excel'}
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-4 text-start">{isAr ? 'الصالون' : 'Salon'}</th>
                    <th className="p-4 text-center">{isAr ? 'الباقة' : 'Plan'}</th>
                    <th className="p-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="p-4 text-center">{isAr ? 'المبيعات' : 'GMV'}</th>
                    <th className="p-4 text-center">{isAr ? 'العمولة' : 'Comm.'}</th>
                    <th className="p-4 text-center">{isAr ? 'معلق' : 'Pending'}</th>
                    <th className="p-4 text-center">{isAr ? 'مدفوع' : 'Paid'}</th>
                    <th className="p-4 text-center">{isAr ? 'إجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {providers.map(p => (
                    <tr key={p.id} className="hover:bg-white/3 transition-colors">
                      <td className="p-4"><p className="font-bold text-slate-900">{p.storeName}</p><p className="text-[9px] text-slate-500 mt-0.5">{p.subdomain}.confirmed.sa</p></td>
                      <td className="p-4 text-center"><span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FF5A5F]/15 text-[#FF5A5F] border border-[#FF5A5F]/30">{p.subscriptionTier.toUpperCase()}</span></td>
                      <td className="p-4 text-center">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.subscriptionStatus === 'active' ? 'bg-emerald-500/15 text-emerald-400' : p.subscriptionStatus === 'trial' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>
                          {p.subscriptionStatus}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono text-slate-900">{p.totalSales.toLocaleString()}</td>
                      <td className="p-4 text-center font-mono text-emerald-400">{Math.round(p.totalSales * 0.1).toLocaleString()}</td>
                      <td className="p-4 text-center font-mono">
                        <span className={p.pendingPayout > 0 ? 'text-amber-400 font-bold' : 'text-slate-600'}>{p.pendingPayout.toLocaleString()}</span>
                      </td>
                      <td className="p-4 text-center font-mono text-slate-400">{p.paidOut.toLocaleString()}</td>
                      <td className="p-4 text-center">
                        {p.pendingPayout > 0 ? (
                          <button onClick={() => settle(p.id)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-[10px] font-bold rounded-lg cursor-pointer transition-all mx-auto">
                            <RefreshCw className="w-3 h-3" />{isAr ? 'تسوية' : 'Settle'}
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold justify-center"><CheckCircle className="w-3 h-3" />{isAr ? 'مسوّى' : 'Settled'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Packages Tab */}
      {tab === 'packages' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openPkgAdd} className="flex items-center gap-2 px-4 py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white text-xs font-bold rounded-xl cursor-pointer transition-all">
              <Plus className="w-3.5 h-3.5" />{isAr ? 'إضافة باقة' : 'Add Package'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map(pkg => (
              <div key={pkg.id} className={`bg-white border rounded-2xl p-5 space-y-4 relative ${pkg.isPopular ? 'border-[#FF5A5F]/50' : 'border-slate-200'}`}>
                {pkg.isPopular && <span className="absolute -top-3 end-4 bg-[#FF5A5F] text-white text-[8px] font-bold px-2.5 py-1 rounded-full uppercase">{isAr ? 'الأكثر طلباً' : 'Popular'}</span>}
                <h3 className="font-bold text-slate-900 text-sm">{isAr ? pkg.nameAr : pkg.nameEn}</h3>
                <p className="text-[10px] text-slate-500">{isAr ? pkg.descriptionAr : pkg.descriptionEn}</p>
                {!pkg.isEnterpriseContact ? (
                  <div>
                    <p className="text-2xl font-black text-[#FF5A5F] font-mono">{pkg.priceMonthly} <span className="text-xs text-slate-500 font-normal">{isAr ? 'ر.س/شهر' : 'SAR/mo'}</span></p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{isAr ? 'سنوي:' : 'Yearly:'} {pkg.priceYearly} {isAr ? 'ر.س/شهر' : 'SAR/mo'}</p>
                  </div>
                ) : <p className="text-sm font-bold text-purple-400">{isAr ? 'تواصل معنا' : 'Contact Us'}</p>}
                <ul className="space-y-1.5">
                  {(isAr ? pkg.featuresAr : pkg.featuresEn)?.slice(0, 4).map((f, i) => <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-400"><CheckCircle className="w-3 h-3 text-[#FF5A5F] mt-0.5 shrink-0" />{f}</li>)}
                  {((isAr ? pkg.featuresAr : pkg.featuresEn)?.length || 0) > 4 && <li className="text-[9px] text-slate-600">+{((isAr ? pkg.featuresAr : pkg.featuresEn)?.length || 0) - 4} {isAr ? 'ميزة أخرى' : 'more'}</li>}
                </ul>
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <button onClick={() => openPkgEdit(pkg)} className="flex-1 py-1.5 text-[10px] font-bold text-blue-400 hover:bg-blue-500/10 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1">
                    <Edit2 className="w-3 h-3" />{isAr ? 'تعديل' : 'Edit'}
                  </button>
                  <button onClick={() => openConfirm({ title: isAr ? 'حذف الباقة' : 'Delete Package', message: isAr ? 'سيتم إزالة هذه الباقة من صفحة الأسعار فوراً.' : 'This package will be removed from the pricing page.', danger: true, onConfirm: () => { onDeletePackage(pkg.id); addToast({ type: 'success', message: isAr ? 'تم حذف الباقة' : 'Package deleted' }); } })} className="px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Package modal */}
      {showPkgModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">{editingPkg ? (isAr ? 'تعديل الباقة' : 'Edit Package') : (isAr ? 'إضافة باقة جديدة' : 'New Package')}</h3>
              <button onClick={() => setShowPkgModal(false)} className="text-slate-500 hover:text-slate-900 cursor-pointer"><AlertTriangle className="w-4 h-4 rotate-45 hidden" />×</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[{ k: 'nameAr', l: isAr ? 'الاسم عربي' : 'Name (AR)', ph: 'الباقة الأساسية' }, { k: 'nameEn', l: isAr ? 'الاسم إنجليزي' : 'Name (EN)', ph: 'Basic Plan' }, { k: 'descAr', l: isAr ? 'وصف عربي' : 'Desc (AR)', ph: '...' }, { k: 'descEn', l: isAr ? 'وصف إنجليزي' : 'Desc (EN)', ph: '...' }].map(f => (
                <div key={f.k}>
                  <label className="block text-[9px] text-slate-500 font-bold mb-1">{f.l}</label>
                  <input value={(pkgForm as any)[f.k]} onChange={e => setPkgForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#FF5A5F]" />
                </div>
              ))}
              {[{ k: 'monthly', l: isAr ? 'سعر شهري' : 'Monthly Price' }, { k: 'yearly', l: isAr ? 'سعر سنوي/شهر' : 'Yearly/mo' }].map(f => (
                <div key={f.k}>
                  <label className="block text-[9px] text-slate-500 font-bold mb-1">{f.l}</label>
                  <input type="number" value={(pkgForm as any)[f.k]} onChange={e => setPkgForm(p => ({ ...p, [f.k]: +e.target.value }))} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#FF5A5F] font-mono" />
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              {[{ k: 'popular', l: isAr ? 'الأكثر طلباً' : 'Most Popular' }, { k: 'enterprise', l: isAr ? 'مؤسسة (تواصل)' : 'Enterprise (Contact)' }].map(f => (
                <label key={f.k} className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={(pkgForm as any)[f.k]} onChange={e => setPkgForm(p => ({ ...p, [f.k]: e.target.checked }))} className="accent-[#FF5A5F]" />{f.l}
                </label>
              ))}
            </div>
            <div>
              <label className="block text-[9px] text-slate-500 font-bold mb-2">{isAr ? 'الميزات (عربي)' : 'Features (AR)'}</label>
              {pkgForm.featuresAr.map((f, i) => (
                <div key={i} className="flex gap-2 mb-1.5">
                  <input value={f} onChange={e => setPkgForm(p => { const fa = [...p.featuresAr]; fa[i] = e.target.value; return { ...p, featuresAr: fa }; })} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-[#FF5A5F]" />
                  <button onClick={() => setPkgForm(p => ({ ...p, featuresAr: p.featuresAr.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-300 cursor-pointer px-2">×</button>
                </div>
              ))}
              <button onClick={() => setPkgForm(p => ({ ...p, featuresAr: [...p.featuresAr, ''] }))} className="text-[9px] text-[#FF5A5F] cursor-pointer hover:underline">+ {isAr ? 'إضافة ميزة' : 'Add feature'}</button>
            </div>
            <div>
              <label className="block text-[9px] text-slate-500 font-bold mb-2">{isAr ? 'الميزات (إنجليزي)' : 'Features (EN)'}</label>
              {pkgForm.featuresEn.map((f, i) => (
                <div key={i} className="flex gap-2 mb-1.5">
                  <input value={f} onChange={e => setPkgForm(p => { const fe = [...p.featuresEn]; fe[i] = e.target.value; return { ...p, featuresEn: fe }; })} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-[#FF5A5F]" />
                  <button onClick={() => setPkgForm(p => ({ ...p, featuresEn: p.featuresEn.filter((_, j) => j !== i) }))} className="text-red-400 cursor-pointer px-2">×</button>
                </div>
              ))}
              <button onClick={() => setPkgForm(p => ({ ...p, featuresEn: [...p.featuresEn, ''] }))} className="text-[9px] text-[#FF5A5F] cursor-pointer hover:underline">+ {isAr ? 'إضافة' : 'Add'}</button>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={savePkg} className="px-5 py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white text-xs font-bold rounded-xl cursor-pointer">{isAr ? 'حفظ' : 'Save'}</button>
              <button onClick={() => setShowPkgModal(false)} className="px-5 py-2 border border-slate-200 text-slate-400 text-xs font-bold rounded-xl cursor-pointer">{isAr ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
