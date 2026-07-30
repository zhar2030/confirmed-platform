import React, { useState } from 'react';
import { Promotion } from '../types';
import { Sparkles, Plus, ToggleLeft, ToggleRight, MessageSquare, Send, Calendar, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface MarketingManagerProps {
  promotions: Promotion[];
  onAddPromotion: (promo: Promotion) => void;
  onTogglePromoStatus: (promoId: string) => void;
}

export default function MarketingManager({ promotions, onAddPromotion, onTogglePromoStatus }: MarketingManagerProps) {
  const { t, isAr } = useLanguage();
  const [showAddModal, setShowAddModal] = useState(false);
  const [whatsappText, setWhatsappText] = useState(
    isAr 
      ? 'عرض الصيف من صالون CONFIRMED! احصلي على خصم ٣٠٪ على جلسات السبا هذا الأسبوع..' 
      : 'Summer Offer from CONFIRMED Salon! Get 30% off spa packages this week..'
  );
  const [campaignSent, setCampaignSent] = useState(false);

  // Form State
  const [promoTitle, setPromoTitle] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(20);
  const [promoDesc, setPromoDesc] = useState('');

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle || !promoCode) return;

    const newPromo: Promotion = {
      id: 'pr-' + Math.random().toString(36).substr(2, 9),
      title: promoTitle,
      code: promoCode.toUpperCase(),
      discount: promoDiscount,
      description: promoDesc,
      status: 'active'
    };

    onAddPromotion(newPromo);
    
    // Reset Form
    setPromoTitle('');
    setPromoCode('');
    setPromoDiscount(20);
    setPromoDesc('');
    setShowAddModal(false);
  };

  const handleSendCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    setCampaignSent(true);
    setTimeout(() => setCampaignSent(false), 5000);
  };

  const getPromoTitle = (id: string, defaultTitle: string) => {
    if (isAr) return defaultTitle;
    switch(id) {
      case 'prm1': return 'Soft Opening Special';
      case 'prm2': return 'Royal Eid Package';
      case 'prm3': return 'First Salon Visit Off';
      default: return defaultTitle;
    }
  };

  const getPromoDesc = (id: string, defaultDesc: string) => {
    if (isAr) return defaultDesc;
    switch(id) {
      case 'prm1': return 'Exclusive discount on your first appointment at our Riyadh Branch';
      case 'prm2': return 'Get total pampering for festive days with hair treatments, spa, & nails';
      case 'prm3': return 'Welcome promotion for new register clients on hair styling';
      default: return defaultDesc;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ===== METRICS BAR ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-[#6E6A63] uppercase">{isAr ? 'حملات نشطة حالياً' : 'Active Promotions'}</p>
          <h4 className="text-3xl font-serif font-bold text-[#14332B] mt-2">{promotions.filter(p => p.status === 'active').length}</h4>
          <p className="text-xs text-[#6E6A63] mt-2">{isAr ? 'عروض ترويجية وكوبونات نشطة' : 'Active rewards & coupon codes'}</p>
        </div>

        <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-[#6E6A63] uppercase">{isAr ? 'رسائل SMS مُرسلة هذا الشهر' : 'SMS Broadcasts Sent'}</p>
          <h4 className="text-3xl font-serif font-bold text-[#14332B] mt-2 text-[#FF5A5F]">1,240</h4>
          <p className="text-xs text-[#6E6A63] mt-2">{isAr ? 'تذكيرات مواعيد وحملات ترويجية' : 'Appointment alerts & promos sent'}</p>
        </div>

        <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-[#6E6A63] uppercase">{isAr ? 'حجوزات ناتجة عن عرض' : 'Promo-Driven Bookings'}</p>
          <h4 className="text-3xl font-serif font-bold text-[#14332B] mt-2 text-emerald-600">58</h4>
          <p className="text-xs text-[#6E6A63] mt-2">{isAr ? 'حجوزات تمت عن طريق كوبونات الخصم' : 'Bookings generated using promo coupons'}</p>
        </div>
      </div>

      {/* ===== ROW 1: ACTIVE PROMOTIONS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Active Promos list */}
        <div className="lg:col-span-7 bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-serif text-base font-bold text-[#14332B]">{isAr ? 'العروض الترويجية الحالية' : 'Current Promo Campaigns'}</h3>
            <button 
              onClick={() => setShowAddModal(true)}
              className="text-xs font-bold bg-[#FF5A5F] hover:bg-[#E04B50] text-white px-3 py-2 rounded-lg transition-all cursor-pointer"
            >
              {isAr ? '+ عرض أو كوبون جديد' : '+ Create Promo Code'}
            </button>
          </div>

          <div className="space-y-3">
            {promotions.map((p) => (
              <div key={p.id} className="p-4 rounded-xl border border-[#E9E7E2] bg-white flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-sm text-[#1C1B18]">{getPromoTitle(p.id, p.title)}</b>
                    <span className="bg-[#FFF0F0] text-[#FF5A5F] text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border border-[#FF5A5F]/10">
                      {isAr ? 'كود' : 'Code'}: {p.code}
                    </span>
                  </div>
                  <p className="text-xs text-[#6E6A63] leading-relaxed">{getPromoDesc(p.id, p.description)}</p>
                  <p className="text-xs text-[#FF5A5F] font-bold pt-1">
                    {isAr ? `خصم ${p.discount}٪ على جميع الخدمات ذات العلاقة` : `${p.discount}% discount off eligible treatments`}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button 
                    onClick={() => onTogglePromoStatus(p.id)}
                    className="p-1 rounded-md text-[#6E6A63] hover:text-[#FF5A5F] cursor-pointer"
                    title={isAr ? 'تعديل الحالة' : 'Toggle Status'}
                  >
                    {p.status === 'active' ? (
                      <ToggleRight className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-300" />
                    )}
                  </button>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                    {p.status === 'active' ? (isAr ? 'نشط' : 'Active') : (isAr ? 'موقوف' : 'Paused')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign Launcher (SMS & WhatsApp Broadcast tool) */}
        <div className="lg:col-span-5 bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-serif text-base font-bold text-[#14332B] flex items-center gap-1.5">
            <MessageSquare className="w-5 h-5 text-[#FF5A5F]" />
            <span>{isAr ? 'بث حملة تسويقية ذكية للعميلات' : 'Smart Campaign Broadcaster'}</span>
          </h3>
          <p className="text-xs text-[#6E6A63]">
            {isAr 
              ? 'قومي بكتابة رسالة عرض وإرسالها لجميع العميلات المسجلات لديك عبر الواتساب أو الـ SMS بضغطة زر.' 
              : 'Compose promotional messages and broadcast them instantly to your entire registered base over SMS or WhatsApp.'}
          </p>

          {!campaignSent ? (
            <form onSubmit={handleSendCampaign} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'محتوى الرسالة التسويقية' : 'Campaign Message Copy'}</label>
                <textarea 
                  value={whatsappText}
                  onChange={(e) => setWhatsappText(e.target.value)}
                  placeholder={isAr ? "مثال: عرض الصيف الخاص..." : "Write message copy..."}
                  rows={4}
                  required
                  className="w-full text-xs p-3 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#1C1B18]">{isAr ? 'تحديد شريحة العميلات' : 'Client Target Audience'}</label>
                <select className="w-full text-xs px-3 py-2 border border-[#E9E7E2] rounded-xl text-[#1C1B18] bg-white">
                  <option value="all">{isAr ? 'كل العميلات المسجلات (1,240)' : 'All Registered Clients (1,240)'}</option>
                  <option value="vip">{isAr ? 'العميلات النشطات جداً فقط (VIP)' : 'High Frequency VIP Clients Only'}</option>
                  <option value="inactive">{isAr ? 'العميلات اللاتي لم يحضرن منذ شهرين' : 'Inactive Clients (No visits in 2 months)'}</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isAr ? 'إطلاق وبث الحملة لجميع العميلات' : 'Launch & Broadcast Campaign'}</span>
              </button>
            </form>
          ) : (
            <div className="text-center py-10 space-y-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <div>
                <h4 className="font-bold text-sm text-emerald-800">{isAr ? 'تم إطلاق وبث الحملة التسويقية ✓' : 'Campaign Dispatched Successfully ✓'}</h4>
                <p className="text-xs text-emerald-700/80 mt-1">
                  {isAr 
                    ? 'يتم معالجة وإرسال الرسائل لـ 312 عميلة عبر خادم الإرسال.' 
                    : 'Dispatching messages queue to 312 targeted contacts via marketing gateway.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== ADD PROMOTION MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#1C1B18]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E9E7E2] w-full max-w-sm p-6 shadow-2xl relative animate-scaleIn">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 left-4 p-2 rounded-full hover:bg-[#F6F6F4] text-[#6E6A63] cursor-pointer"
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>

            <h3 className="font-serif text-xl font-bold text-[#14332B] mb-5">{isAr ? 'إضافة كوبون أو عرض ترويجي' : 'Create Coupon & Promotion'}</h3>

            <form onSubmit={handleCreatePromo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'عنوان العرض الترويجي *' : 'Promotion Title *'}</label>
                <input 
                  type="text" 
                  required
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  placeholder={isAr ? "مثال: خصم اليوم الوطني السعودي" : "e.g. National Day Special Offer"}
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'رمز الكوبون *' : 'Coupon Code *'}</label>
                  <input 
                    type="text" 
                    required
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="KSA96"
                    className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'نسبة الخصم (٪) *' : 'Discount Percentage (%) *'}</label>
                  <input 
                    type="number" 
                    required
                    min="5"
                    max="100"
                    value={promoDiscount}
                    onChange={(e) => setPromoDiscount(parseInt(e.target.value) || 20)}
                    placeholder="15"
                    className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'وصف وشروط العرض' : 'Rules & Limitations description'}</label>
                <textarea 
                  value={promoDesc}
                  onChange={(e) => setPromoDesc(e.target.value)}
                  placeholder={isAr ? "يسري العرض على خدمات العناية بالشعر والبشرة خلال أيام الأسبوع..." : "Offer valid on hair and spa treatments only during weekdays..."}
                  rows={3}
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#FF5A5F]/20 transition-all cursor-pointer"
                >
                  {isAr ? 'حفظ وتفعيل العرض' : 'Activate Promotion'}
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
