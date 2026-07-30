import React, { useState } from 'react';
import { GiftCard } from '../types';
import { Gift, Plus, Sparkles, User, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface GiftCardsManagerProps {
  giftCards: GiftCard[];
  onAddGiftCard: (card: GiftCard) => void;
  onToggleCardStatus: (cardId: string) => void;
}

export default function GiftCardsManager({ giftCards, onAddGiftCard, onToggleCardStatus }: GiftCardsManagerProps) {
  const { t, isAr } = useLanguage();
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [cardCode, setCardCode] = useState('');
  const [cardValue, setCardValue] = useState(250);

  const handleCreateGiftCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardCode) return;

    const newCard: GiftCard = {
      id: 'gc-' + Math.random().toString(36).substr(2, 9),
      code: cardCode.toUpperCase(),
      value: cardValue,
      status: 'active'
    };

    onAddGiftCard(newCard);
    
    // Reset Form
    setCardCode('');
    setCardValue(250);
    setShowAddModal(false);
  };

  // Membership Packages
  const packages = [
    { 
      name: isAr ? 'باقة العناية الشهرية' : 'Monthly Care Package', 
      price: 450, 
      desc: isAr 
        ? 'تشمل جلستي سبا عميق شهرياً مع خدمة غسيل ومساج فروة رأس مجاناً' 
        : 'Includes two deep spa sessions monthly plus complimentary scalp massage & blow dry treatments.', 
      subscribers: 29 
    },
    { 
      name: isAr ? 'عضوية الملكة VIP لشعر صحي' : 'Queen VIP Hair Membership', 
      price: 700, 
      desc: isAr 
        ? 'تشمل خدمات قص وتسريح صبغة كاملة كل شهر مضاف إليها أولوية تامة وجلسات حماية من الحرارة' 
        : 'Includes premium haircut, styling, full coloring sessions, high priority scheduling & thermal heat shield treatments.', 
      subscribers: 17 
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Gift Cards Table list */}
        <div className="lg:col-span-7 bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-serif text-base font-bold text-[#14332B] flex items-center gap-1.5">
              <Gift className="w-5 h-5 text-[#FF5A5F]" />
              <span>{isAr ? 'سجل وقسائم بطاقات الإهداء' : 'Gift Card & Voucher Ledger'}</span>
            </h3>
            <button 
              onClick={() => {
                // Generate a random-like gift card code
                setCardCode('GC-' + Math.floor(1000 + Math.random() * 9000));
                setShowAddModal(true);
              }}
              className="text-xs font-bold bg-[#FF5A5F] hover:bg-[#E04B50] text-white px-3 py-2 rounded-lg transition-all cursor-pointer"
            >
              + {isAr ? 'توليد بطاقة إهداء جديدة' : 'Generate Gift Card'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#E9E7E2] text-xs text-[#6E6A63] font-bold">
                  <th className="pb-3 text-start">{isAr ? 'رمز البطاقة الإلكترونية' : 'Electronic Code'}</th>
                  <th className="pb-3 text-start">{isAr ? 'القيمة المحملة' : 'Preloaded Value'}</th>
                  <th className="pb-3 text-center">{isAr ? 'حالة الصلاحية' : 'Status'}</th>
                  <th className="pb-3 text-end">{isAr ? 'الإجراء' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F6F6F4]">
                {giftCards.map((gc) => (
                  <tr key={gc.id} className="hover:bg-[#F6F6F4]/50 text-[#1C1B18]">
                    <td className="py-3.5">
                      <span className="font-mono font-bold text-sm text-[#14332B] bg-[#F6F6F4] px-2.5 py-1 rounded-md border border-[#E9E7E2]/60">
                        {gc.code}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold font-mono text-[#FF5A5F]">{gc.value} {t('currency')}</td>
                    <td className="py-3.5 text-center">
                      <span 
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          gc.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : gc.status === 'used'
                            ? 'bg-gray-100 text-gray-500 border border-gray-200'
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}
                      >
                        {gc.status === 'active' 
                          ? (isAr ? 'متاحة للعميلة' : 'Available') 
                          : gc.status === 'used' 
                          ? (isAr ? 'مستخدمة بالكامل' : 'Fully Redeemed') 
                          : (isAr ? 'منتهية الصلاحية' : 'Expired')}
                      </span>
                    </td>
                    <td className="py-3.5 text-end">
                      {gc.status === 'active' ? (
                        <button 
                          onClick={() => onToggleCardStatus(gc.id)}
                          className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                        >
                          {isAr ? 'إلغاء وتعيين كمستخدمة' : 'Revoke / Mark Redeemed'}
                        </button>
                      ) : (
                        <button 
                          onClick={() => onToggleCardStatus(gc.id)}
                          className="text-xs font-bold text-[#FF5A5F] hover:underline cursor-pointer"
                        >
                          {isAr ? 'تنشيط مجدداً' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Memberships Packages with subscribers list */}
        <div className="lg:col-span-5 bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-serif text-base font-bold text-[#14332B]">{isAr ? 'باقات العضوية الشهرية للصالون' : 'Monthly Salon Memberships'}</h3>
            <p className="text-xs text-[#6E6A63] mt-1">
              {isAr 
                ? `إجمالي العضويات والاشتراكات النشطة بفرع الرياض: ` 
                : 'Total active recurring subscriptions at branch: '}
              <span className="font-bold text-[#FF5A5F]">46 {isAr ? 'عضوة' : 'members'}</span>
            </p>
          </div>

          <div className="space-y-4">
            {packages.map((pkg, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-[#E9E7E2] bg-[#F6F6F4] relative overflow-hidden">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-[#14332B]">{pkg.name}</h4>
                    <p className="text-xs text-[#6E6A63] mt-1 leading-relaxed">{pkg.desc}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="font-serif font-bold text-[#FF5A5F] block text-base">{pkg.price} {t('currency')}</span>
                    <span className="text-[10px] text-[#6E6A63]">{isAr ? 'شهرياً' : '/mo'}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-[#E9E7E2]/50 flex justify-between items-center text-xs">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {isAr ? 'باقة تدر اشتراكاً ثابتاً' : 'Generates recurring MRR'}
                  </span>
                  <span className="font-semibold text-[#14332B] font-mono">
                    {pkg.subscribers} {isAr ? 'مشتركات نشطات' : 'active subscribers'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== ADD GIFT CARD MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#1C1B18]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E9E7E2] w-full max-w-sm p-6 shadow-2xl relative animate-scaleIn">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 left-4 p-2 rounded-full hover:bg-[#F6F6F4] text-[#6E6A63] cursor-pointer"
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>

            <h3 className="font-serif text-xl font-bold text-[#14332B] mb-5">{isAr ? 'توليد بطاقة إهداء تجميلية جديدة' : 'Generate Premium Gift Voucher'}</h3>

            <form onSubmit={handleCreateGiftCard} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'رمز القسيمة التلقائي *' : 'Voucher Code *'}</label>
                <input 
                  type="text" 
                  required
                  value={cardCode}
                  onChange={(e) => setCardCode(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl font-mono text-center font-bold tracking-widest focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'القيمة التقديرية بالريال السعودي *' : 'Preloaded Gift Card Balance *'}</label>
                <select
                  value={cardValue}
                  onChange={(e) => setCardValue(parseInt(e.target.value) || 250)}
                  className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18] bg-white font-mono"
                >
                  <option value={100}>100 {t('currency')}</option>
                  <option value={150}>150 {t('currency')}</option>
                  <option value={200}>200 {t('currency')}</option>
                  <option value={250}>250 {t('currency')}</option>
                  <option value={300}>300 {t('currency')}</option>
                  <option value={500}>500 {t('currency')}</option>
                  <option value={1000}>1,000 {t('currency')}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#FF5A5F]/20 transition-all cursor-pointer"
                >
                  {isAr ? 'توليد وحفظ البطاقة بالفرع' : 'Issue & Activate Voucher'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 border border-[#E9E7E2] text-[#6E6A63] hover:bg-[#F6F6F4] font-bold text-sm rounded-xl transition-all cursor-pointer"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
