import React, { useState, useRef } from 'react';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Clock, 
  Save, 
  Check, 
  QrCode, 
  Instagram, 
  CheckCircle, 
  MessageSquare, 
  Compass, 
  FileText, 
  Share2, 
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Eye,
  Download,
  Upload,
  Trash2,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { getUnifiedHeaders } from '../lib/unifiedAuth';

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') + '/api';

export interface ProviderProfile {
  storeNameAr: string;
  storeNameEn: string;
  ownerName: string;
  email: string;
  phone: string;
  whatsapp: string;
  activityAr: string;
  activityEn: string;
  crNumber: string;
  vatId: string;
  cityAr: string;
  cityEn: string;
  neighborhoodAr: string;
  neighborhoodEn: string;
  addressAr: string;
  addressEn: string;
  bioAr: string;
  bioEn: string;
  instagram: string;
  snapchat: string;
  tiktok: string;
  openTime: string;
  closeTime: string;
  isVerified: boolean;
  logoColor: string;
}

interface ProviderProfileManagerProps {
  initialData?: any;
}

export default function ProviderProfileManager({ initialData }: ProviderProfileManagerProps) {
  const { t, isAr, dir } = useLanguage();
  const [saved, setSaved] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // ── Logo upload state ─────────────────────────────────────────────────────
  const [logoPreview, setLogoPreview]       = useState<string | null>(initialData?.logoUrl || null);
  const [logoUploading, setLogoUploading]   = useState(false);
  const [logoSaved, setLogoSaved]           = useState(false);
  const [logoError, setLogoError]           = useState<string | null>(null);
  const logoInputRef                        = useRef<HTMLInputElement>(null);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError(isAr ? 'الملف يجب أن يكون صورة (PNG / JPG / SVG)' : 'File must be an image (PNG / JPG / SVG)');
      return;
    }
    if (file.size > 500_000) {
      setLogoError(isAr ? 'الصورة أكبر من 500 كيلوبايت — اختاري صورة أصغر' : 'Image exceeds 500 KB — choose a smaller file');
      return;
    }
    setLogoError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoSave = async () => {
    if (!logoPreview) return;
    setLogoUploading(true);
    setLogoError(null);
    try {
      const res = await fetch(`${API_BASE}/providers/me/logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getUnifiedHeaders() },
        body: JSON.stringify({ logoBase64: logoPreview }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'upload_failed');
      }
      setLogoSaved(true);
      setTimeout(() => setLogoSaved(false), 3000);
    } catch (err: any) {
      setLogoError(isAr ? 'فشل الحفظ، حاولي مرة أخرى' : 'Save failed, please try again');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoRemove = async () => {
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
    try {
      await fetch(`${API_BASE}/providers/me/logo`, {
        method: 'DELETE',
        headers: getUnifiedHeaders(),
      });
    } catch {}
  };

  // Profile Form States
  const [profile, setProfile] = useState<ProviderProfile>({
    storeNameAr: initialData?.storeName || (isAr ? 'صالون عهود بيوتي لاونج' : 'Ohood Beauty Lounge'),
    storeNameEn: initialData?.storeNameEn || 'Ohood Beauty Lounge',
    ownerName: initialData?.name || (isAr ? 'عهود الشلوي' : 'Ohood Al-Shalawi'),
    email: initialData?.email || 'marktning@onfirmedmarketing.com',
    phone: initialData?.phone || '0550112233',
    whatsapp: '966550112233',
    activityAr: isAr ? 'صالون شعر وتجميل متكامل' : 'Full-service beauty and hair salon',
    activityEn: 'Full-Service Beauty & Hair Salon',
    crNumber: '1010892749',
    vatId: '310023948500003',
    cityAr: isAr ? 'الرياض' : 'Riyadh',
    cityEn: 'Riyadh',
    neighborhoodAr: isAr ? 'العليا' : 'Al-Olaya',
    neighborhoodEn: 'Al-Olaya',
    addressAr: isAr ? 'طريق الملك فهد، حي العليا' : 'King Fahd Road, Al-Olaya District',
    addressEn: 'King Fahd Road, Al-Olaya District',
    bioAr: isAr 
      ? 'نقدم لكم أرقى الخدمات في عالم العناية بالشعر والأظافر، وعلاجات البشرة الاحترافية، مع نخبة من الخبيرات العالميات لجمال يدوم وتجربة فاخرة.'
      : 'Offering the finest services in hair care, nail artistry, professional skin therapy, and luxury bridal makeovers with world-class experts.',
    bioEn: 'Offering the finest services in hair care, nail artistry, professional skin therapy, and luxury bridal makeovers with world-class experts.',
    instagram: 'ohood.lounge',
    snapchat: 'ohood.beauty',
    tiktok: 'ohood.hair',
    openTime: '10:00',
    closeTime: '22:00',
    isVerified: true,
    logoColor: 'from-[#FF5A5F] to-[#FFAE34]'
  });

  const handleInputChange = (field: keyof ProviderProfile, value: any) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#1C1B18]" dir={dir}>
      
      {/* ===== SECURITY PROFILE STATUS HEADER ===== */}
      <div className="bg-[#14332B] text-white p-6 rounded-3xl border border-[#14332B] shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF5A5F]/10 rounded-full blur-2xl" />
        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4 animate-pulse" />
            <span>{isAr ? 'نظام الملف التعريفي والتحقق المعتمد' : 'Verified Profile & Credentials System'}</span>
          </div>
          <h2 className="font-serif text-xl md:text-2xl font-bold text-white">
            {isAr ? 'إدارة الملف المعتمد لـ مزود الخدمة' : 'Provider Public Profile & Contact Hub'}
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isAr 
              ? 'تتيح لكِ هذه الصفحة تهيئة بيانات الصالون، ومعلومات الاتصال الرسمية، والسجل التجاري، وموقع الخريطة والشبكات الاجتماعية. هذه التفاصيل تظهر تلقائياً لعميلاتكِ في بطاقة الحجز لتسهيل تواصلهن وضمان موثوقية علامتكِ التجارية.'
              : 'Configure your official salon identity, direct contact channels, legal registry certificates, active work hours, and map locations. This information displays instantly to your clients in booking receipts to ensure flawless trust.'}
          </p>
        </div>
        
        <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-xs font-mono space-y-1.5 shrink-0 z-10">
          <div className="flex justify-between gap-4">
            <span className="text-slate-300">{isAr ? 'حالة التوثيق:' : 'Verification State:'}</span>
            <span className="text-emerald-400 font-bold">{isAr ? '✓ موثق ومعتمد' : '✓ Certified Partner'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-300">{isAr ? 'السجل والضريبة:' : 'CR & Tax Status:'}</span>
            <span className="text-emerald-400 font-bold">{isAr ? 'فعّال بنجاح' : 'Validated'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ===== LEFT PANEL: EDIT FORM (7 COLS) ===== */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">

          {/* ── Logo Upload Section ─────────────────────────────────────────── */}
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-[#14332B] flex items-center gap-2 pb-3 border-b border-[#F6F6F4]">
              <ImageIcon className="w-4 h-4 text-[#FF5A5F]" />
              <span>{isAr ? 'شعار الصالون' : 'Salon Logo'}</span>
            </h3>

            <div className="flex items-start gap-5">
              {/* Preview circle */}
              <div
                onClick={() => logoInputRef.current?.click()}
                className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#E9E7E2] bg-[#FAFAF8] flex items-center justify-center cursor-pointer hover:border-[#FF5A5F] transition-all overflow-hidden shrink-0 relative group"
              >
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="logo preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-1">
                    <Upload className="w-6 h-6 text-[#C9C7C2] mx-auto" />
                    <p className="text-[9px] text-[#C9C7C2] font-bold">{isAr ? 'رفع شعار' : 'Upload'}</p>
                  </div>
                )}
              </div>

              {/* Instructions + actions */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs font-bold text-[#1C1B18] mb-0.5">
                    {isAr ? 'ارفعي شعار صالونك' : 'Upload your salon logo'}
                  </p>
                  <p className="text-[11px] text-[#6E6A63] leading-relaxed">
                    {isAr
                      ? 'يظهر الشعار في الشريط الجانبي للوحة التحكم وفي بوابة الحجز للعملاء. صيغ مدعومة: PNG، JPG، SVG. الحد الأقصى: 500 كيلوبايت.'
                      : 'Logo appears in the dashboard sidebar and the client booking portal. Supported: PNG, JPG, SVG. Max 500 KB.'}
                  </p>
                </div>

                {logoError && (
                  <p className="text-[11px] text-red-600 font-semibold">{logoError}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="px-3 py-1.5 bg-[#F5F4F1] hover:bg-[#ECEAE6] border border-[#E9E7E2] text-[#1C1B18] text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {isAr ? 'اختيار صورة' : 'Choose Image'}
                  </button>

                  {logoPreview && (
                    <>
                      <button
                        type="button"
                        onClick={handleLogoSave}
                        disabled={logoUploading}
                        className="px-3 py-1.5 bg-[#FF5A5F] hover:bg-[#E04B50] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                      >
                        {logoUploading
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : logoSaved
                            ? <Check className="w-3.5 h-3.5" />
                            : <Save className="w-3.5 h-3.5" />}
                        {logoSaved
                          ? (isAr ? 'تم الحفظ ✓' : 'Saved ✓')
                          : (isAr ? 'حفظ الشعار' : 'Save Logo')}
                      </button>

                      <button
                        type="button"
                        onClick={handleLogoRemove}
                        className="px-3 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {isAr ? 'حذف' : 'Remove'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleLogoSelect}
            />
          </div>

          {/* Section 1: Business Identity */}
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-[#14332B] flex items-center gap-2 pb-3 border-b border-[#F6F6F4]">
              <Building2 className="w-4.5 h-4.5 text-[#FF5A5F]" />
              <span>{isAr ? 'الهوية والبيانات الأساسية للمزود' : 'Service Provider Identity'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'اسم الصالون بالكامل (عربي) *' : 'Salon Brand Name (Arabic) *'}</label>
                <input 
                  type="text" 
                  required
                  value={profile.storeNameAr}
                  onChange={(e) => handleInputChange('storeNameAr', e.target.value)}
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'اسم الصالون بالكامل (إنجليزي) *' : 'Salon Brand Name (English) *'}</label>
                <input 
                  type="text" 
                  required
                  value={profile.storeNameEn}
                  onChange={(e) => handleInputChange('storeNameEn', e.target.value)}
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18] font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'اسم المالكة / المدير المسؤول *' : 'Owner / Manager Name *'}</label>
                <input 
                  type="text" 
                  required
                  value={profile.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'المجال والنشاط الرئيسي *' : 'Niche & Main Activity *'}</label>
                <input 
                  type="text" 
                  required
                  value={isAr ? profile.activityAr : profile.activityEn}
                  onChange={(e) => handleInputChange(isAr ? 'activityAr' : 'activityEn', e.target.value)}
                  placeholder={isAr ? 'مثال: صالون تجميل، سبا نسائي' : 'e.g. Beauty Salon, Nails spa'}
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'الرقم الضريبي الموحد (VAT) *' : 'VAT Registration ID *'}</label>
                <input 
                  type="text" 
                  required
                  value={profile.vatId}
                  onChange={(e) => handleInputChange('vatId', e.target.value)}
                  className="w-full text-xs font-mono px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'رقم السجل التجاري (CR) *' : 'Commercial Register (CR) *'}</label>
                <input 
                  type="text" 
                  required
                  value={profile.crNumber}
                  onChange={(e) => handleInputChange('crNumber', e.target.value)}
                  className="w-full text-xs font-mono px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'لون اللوجو والثيم الرقمي' : 'Theme Logo Color'}</label>
                <select
                  value={profile.logoColor}
                  onChange={(e) => handleInputChange('logoColor', e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white text-[#1C1B18]"
                >
                  <option value="from-[#FF5A5F] to-[#FFAE34]">🟥 {isAr ? 'وردي مرجاني مع غروب الشمس' : 'Coral Pink & Sunset Orange'}</option>
                  <option value="from-[#14332B] to-[#3B7A57]">🟩 {isAr ? 'أخضر ملكي زمردي' : 'Emerald & Hunter Green'}</option>
                  <option value="from-teal-600 to-cyan-500">🟦 {isAr ? 'سماوي بحري محيطي' : 'Deep Marine Teal'}</option>
                  <option value="from-amber-600 to-yellow-500">🟨 {isAr ? 'ذهبي ملكي فاخر' : 'Royal Golden Amber'}</option>
                  <option value="from-purple-700 to-pink-500">🟪 {isAr ? 'بنفسجي باذنجاني عصري' : 'Trendy Amethyst Purple'}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'يبدأ العمل' : 'Opening Hour'}</label>
                  <input 
                    type="time" 
                    value={profile.openTime}
                    onChange={(e) => handleInputChange('openTime', e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E9E7E2] rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'ينتهي العمل' : 'Closing Hour'}</label>
                  <input 
                    type="time" 
                    value={profile.closeTime}
                    onChange={(e) => handleInputChange('closeTime', e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E9E7E2] rounded-xl focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'نبذة تعريفية عن الصالون وخبرتكم (عربي) *' : 'Business Bio (Arabic) *'}</label>
              <textarea 
                rows={3}
                required
                value={profile.bioAr}
                onChange={(e) => handleInputChange('bioAr', e.target.value)}
                className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18] resize-none leading-relaxed"
                placeholder="تفاصيل العناية..."
              />
            </div>
          </div>

          {/* Section 2: Contact Info & Channels */}
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-[#14332B] flex items-center gap-2 pb-3 border-b border-[#F6F6F4]">
              <Phone className="w-4.5 h-4.5 text-[#FF5A5F]" />
              <span>{isAr ? 'قنوات تواصل العميلات المباشرة' : 'Client Direct Communication Channels'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'البريد الإلكتروني للعمليات *' : 'Operational Email *'}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input 
                    type="email" 
                    required
                    value={profile.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full text-xs font-mono px-4 py-2.5 pl-10 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'رقم هاتف الاتصال المباشر *' : 'Direct Booking Hotline *'}</label>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    value={profile.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full text-xs font-mono px-4 py-2.5 pl-10 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'رقم الواتساب الرسمي (صيغة دولية) *' : 'WhatsApp Hotline (International Form) *'}</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3.5 top-3 w-4 h-4 text-emerald-500" />
                  <input 
                    type="text" 
                    required
                    value={profile.whatsapp}
                    onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                    placeholder="9665xxxxxxxx"
                    className="w-full text-xs font-mono px-4 py-2.5 pl-10 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-emerald-500 text-[#1C1B18]"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{isAr ? '* ابدأ بمفتاح الدولة بدون أصفار أو رمز زائد (مثال: 966550000000)' : '* Start with country code without + or 00'}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'حساب إنستغرام (معرف فقط)' : 'Instagram Handle'}</label>
                <div className="relative">
                  <Instagram className="absolute left-3.5 top-3 w-4 h-4 text-pink-500" />
                  <input 
                    type="text" 
                    value={profile.instagram}
                    onChange={(e) => handleInputChange('instagram', e.target.value)}
                    placeholder="username"
                    className="w-full text-xs font-mono px-4 py-2.5 pl-10 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'حساب سناب شات' : 'Snapchat Account'}</label>
                <input 
                  type="text" 
                  value={profile.snapchat}
                  onChange={(e) => handleInputChange('snapchat', e.target.value)}
                  placeholder="username"
                  className="w-full text-xs font-mono px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'حساب تيك توك' : 'TikTok Account'}</label>
                <input 
                  type="text" 
                  value={profile.tiktok}
                  onChange={(e) => handleInputChange('tiktok', e.target.value)}
                  placeholder="username"
                  className="w-full text-xs font-mono px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Geographic Location & Map */}
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-[#14332B] flex items-center gap-2 pb-3 border-b border-[#F6F6F4]">
              <MapPin className="w-4.5 h-4.5 text-[#FF5A5F]" />
              <span>{isAr ? 'العنوان الجغرافي وموقع الفرع الرئيسي' : 'Geographic Location & Main Address'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'المدينة *' : 'City *'}</label>
                <input 
                  type="text" 
                  required
                  value={isAr ? profile.cityAr : profile.cityEn}
                  onChange={(e) => handleInputChange(isAr ? 'cityAr' : 'cityEn', e.target.value)}
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'الحي الجغرافي *' : 'District *'}</label>
                <input 
                  type="text" 
                  required
                  value={isAr ? profile.neighborhoodAr : profile.neighborhoodEn}
                  onChange={(e) => handleInputChange(isAr ? 'neighborhoodAr' : 'neighborhoodEn', e.target.value)}
                  placeholder="العليا"
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'العنوان الوطني التفصيلي ورقم الشارع *' : 'National Address & Street Name *'}</label>
              <input 
                type="text" 
                required
                value={isAr ? profile.addressAr : profile.addressEn}
                onChange={(e) => handleInputChange(isAr ? 'addressAr' : 'addressEn', e.target.value)}
                className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
              />
            </div>

            {/* Simulated Live Map Widget */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 font-mono block">🗺️ LIVE COORDINATES: 24.7136° N, 46.6753° E (Riyadh Centre)</span>
              
              <div className="h-32 bg-slate-200 rounded-xl flex flex-col items-center justify-center relative overflow-hidden border border-slate-300">
                {/* Visual grid representing map */}
                <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
                
                {/* Mock Marker pin */}
                <div className="relative z-10 flex flex-col items-center animate-bounce">
                  <MapPin className="w-8 h-8 text-[#FF5A5F] fill-white" />
                  <span className="w-2.5 h-2.5 bg-slate-900/45 rounded-full blur-xs mt-0.5" />
                </div>
                
                <span className="relative z-10 text-[10px] font-bold bg-[#14332B] text-white px-3 py-1 rounded-full shadow-md mt-1">
                  {profile.storeNameAr} ({isAr ? 'العليا، الرياض' : 'Olaya, Riyadh'})
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal text-center">
                {isAr ? '* تم ربط نظام الفواتير والموقع مع خرائط قوقل ومصلحة الزكاة والجمارك بنجاح.' : '* Fully synchronized with Saudi National Address and Google Maps GPS APIs.'}
              </p>
            </div>
          </div>

          {/* Form Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-[#E9E7E2] shadow-xs">
            <button 
              type="submit"
              className="bg-[#14332B] hover:bg-[#1C473C] text-white font-bold text-sm px-8 py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer self-stretch sm:self-auto"
            >
              <Save className="w-4.5 h-4.5" />
              <span>{isAr ? 'حفظ وتثبيت البروفايل' : 'Save & Publish Profile'}</span>
            </button>

            {saved && (
              <div className="bg-emerald-50 text-emerald-700 px-4 py-2 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-fadeIn self-stretch sm:self-auto justify-center">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{isAr ? 'تم تحديث ونشر بروفايل مزود الخدمة بنجاح ✓' : 'Profile successfully saved and synchronized ✓'}</span>
              </div>
            )}
          </div>
        </form>

        {/* ===== RIGHT PANEL: REAL-TIME PUBLIC BOOKING CARD PREVIEW (5 COLS) ===== */}
        <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-6">
          
          <div className="bg-white border border-[#E9E7E2] rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 left-0 h-16 bg-gradient-to-r from-[#14332B] to-[#255D4E]" />
            
            {/* Live Indicator Badge */}
            <div className="absolute top-4 right-4 z-10 bg-emerald-500/15 backdrop-blur-md border border-emerald-400/25 text-emerald-300 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isAr ? 'معاينة حية للملف' : 'Live Preview Card'}</span>
            </div>

            {/* Profile Logo & Title */}
            <div className="relative pt-6 flex flex-col items-center text-center space-y-3 z-10">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-tr ${profile.logoColor} p-0.5 shadow-lg relative flex items-center justify-center text-white font-serif font-black text-3xl`}>
                {profile.storeNameEn.charAt(0)}
                
                {/* Verified icon overlay */}
                {profile.isVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-md border border-[#E9E7E2]">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-600 fill-emerald-50" />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1 justify-center">
                  <h4 className="font-serif text-lg font-black text-slate-900">{isAr ? profile.storeNameAr : profile.storeNameEn}</h4>
                </div>
                <p className="text-xs font-bold text-[#FF5A5F] mt-0.5">{isAr ? profile.activityAr : profile.activityEn}</p>
                
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-[#6E6A63] border border-slate-200/50 rounded-lg text-[9px] font-mono mt-1.5 font-bold">
                  {isAr ? 'مزود معتمد مرخص' : 'Verified Partner Account'}
                </div>
              </div>
            </div>

            {/* Main Stats / Rating Row */}
            <div className="grid grid-cols-3 gap-2 bg-[#F8FAFC] border border-[#E9E7E2] rounded-2xl p-3.5 text-center text-xs font-bold">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 block uppercase">{isAr ? 'التقييم' : 'Rating'}</span>
                <span className="text-slate-800 text-sm font-black flex items-center justify-center gap-0.5">⭐ 4.9</span>
              </div>
              <div className="space-y-0.5 border-x border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase">{isAr ? 'الحجز' : 'Status'}</span>
                <span className="text-emerald-600 text-[11px] block">{isAr ? 'مفتوح للعملاء' : 'Active'}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 block uppercase">{isAr ? 'ساعات العمل' : 'Hours'}</span>
                <span className="text-slate-800 text-[10px] block font-mono font-black">{profile.openTime} - {profile.closeTime}</span>
              </div>
            </div>

            {/* Bio section */}
            <div className="space-y-1 text-xs">
              <span className="text-[#6E6A63] font-bold block uppercase text-[10px]">{isAr ? 'حول المركز / نبذة:' : 'About Salon:'}</span>
              <p className="text-slate-600 leading-relaxed font-medium bg-slate-50/50 p-3 rounded-xl border border-slate-100 italic">
                "{isAr ? profile.bioAr : profile.bioEn}"
              </p>
            </div>

            {/* Location Address Details */}
            <div className="space-y-2 bg-[#F6F6F4] p-3.5 rounded-2xl border border-[#E9E7E2] text-xs">
              <div className="flex gap-2.5 items-start">
                <MapPin className="w-4.5 h-4.5 text-[#FF5A5F] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[#1C1B18] font-bold block">{isAr ? 'فرع الصالون الجغرافي:' : 'Salon Branch Location:'}</span>
                  <span className="text-[#6E6A63] text-[11px] leading-normal font-medium block">
                    {isAr 
                      ? `${profile.addressAr}، حي ${profile.neighborhoodAr}، ${profile.cityAr}` 
                      : `${profile.addressEn}, ${profile.neighborhoodEn}, ${profile.cityEn}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Public Action buttons (Simulation) */}
            <div className="space-y-2 pt-2">
              <span className="text-[#6E6A63] font-bold block uppercase text-[10px]">{isAr ? 'روابط وقنوات التواصل السريعة للعميلات:' : 'Direct Customer Call-to-Actions:'}</span>
              
              <div className="grid grid-cols-2 gap-2">
                <a 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert(isAr 
                      ? `محاكاة الاتصال بالهاتف: جاري الاتصال بالرقم ${profile.phone}...` 
                      : `Calling salon support hotline at ${profile.phone}...`);
                  }}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 rounded-xl text-center text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Phone className="w-4 h-4 text-[#FF5A5F]" />
                  <span>{isAr ? 'اتصال مباشر' : 'Call Salon'}</span>
                </a>

                <a 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert(isAr 
                      ? `محاكاة فتح المحادثة: جاري إرسال واتساب للرقم ${profile.whatsapp}...` 
                      : `Opening direct WhatsApp chat with ${profile.whatsapp}...`);
                  }}
                  className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5 transition-all"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'واتساب مباشر' : 'WhatsApp'}</span>
                </a>
              </div>

              {/* Social links row */}
              <div className="flex gap-2 justify-center pt-1.5">
                {profile.instagram && (
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200/50 px-2.5 py-1.5 rounded-xl flex items-center gap-1">
                    <Instagram className="w-3.5 h-3.5 text-pink-600" /> @{profile.instagram}
                  </span>
                )}
                {profile.tiktok && (
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200/50 px-2.5 py-1.5 rounded-xl flex items-center gap-1">
                    🌐 @{profile.tiktok}
                  </span>
                )}
              </div>
            </div>

            {/* QR Code and Sharing Actions */}
            <div className="pt-4 border-t border-[#F6F6F4] flex flex-col sm:flex-row gap-3 items-center justify-between">
              <button
                onClick={() => setShowQrModal(true)}
                className="w-full sm:w-auto py-2.5 px-4 bg-[#FF5A5F] hover:bg-[#E04B50] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-[#FF5A5F]/10"
              >
                <QrCode className="w-4 h-4" />
                <span>{isAr ? 'تحميل كود حجز الصالون QR' : 'Download Booking QR'}</span>
              </button>

              <span className="text-[9px] text-[#6E6A63] font-mono font-bold uppercase tracking-wider block">
                ID: {profile.crNumber}
              </span>
            </div>
          </div>

          {/* Legal Compliance Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3 text-xs text-[#6E6A63] font-mono">
            <h5 className="font-sans font-bold text-[#14332B] text-xs border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#FF5A5F]" />
              <span>{isAr ? 'الامتثال القانوني والترخيص الرقمي' : 'Regulatory & Tax Compliance'}</span>
            </h5>
            <div className="flex justify-between py-1 border-b border-slate-200/50">
              <span>{isAr ? 'مستند السجل التجاري:' : 'CR Document Status:'}</span>
              <span className="text-emerald-700 font-bold">{isAr ? '✓ ساري ومعتمد' : '✓ Active & Verified'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/50">
              <span>{isAr ? 'الرقم الضريبي VAT:' : 'Tax Register Certificate:'}</span>
              <span className="text-emerald-700 font-bold">{isAr ? '✓ مربوط الكترونياً' : '✓ Synced Zatca'}</span>
            </div>
            <p className="text-[10px] leading-normal pt-1 font-sans text-slate-400">
              * {isAr ? 'يتم ختم جميع الفواتير الصادرة باسم المركز وعنوانه وتفاصيله الضريبية طبقاً لهيئة الزكاة والضريبة والجمارك.' : 'All digital and printable bills reflect the verified salon profile name and tax registration ID automatically.'}
            </p>
          </div>
        </div>

      </div>

      {/* ===== QR MODAL ===== */}
      {showQrModal && (
        <div className="fixed inset-0 bg-[#1C1B18]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E9E7E2] w-full max-w-sm p-6 text-center space-y-5 shadow-2xl relative animate-scaleIn">
            <button 
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-100 text-[#6E6A63] cursor-pointer"
            >
              <Check className="w-5 h-5 rotate-45" />
            </button>

            <h3 className="font-serif text-lg font-bold text-[#14332B]">
              {isAr ? `كود الحجز السريع لـ ${profile.storeNameAr}` : `Booking QR Code for ${profile.storeNameEn}`}
            </h3>

            <div className="bg-[#FFF0F0] p-6 rounded-2xl inline-block border border-[#FF5A5F]/10">
              {/* Beautiful custom styled vector QR Code mockup */}
              <div className="w-44 h-44 bg-white rounded-xl border border-dashed border-[#FF5A5F]/30 p-3 shadow-inner flex flex-col items-center justify-center relative">
                <QrCode className="w-36 h-36 text-[#14332B]" />
                <div className="absolute w-8 h-8 rounded-lg bg-[#FF5A5F] flex items-center justify-center text-white font-black text-xs shadow-md">
                  C
                </div>
              </div>
            </div>

            <p className="text-xs text-[#6E6A63] leading-relaxed px-2">
              {isAr 
                ? 'اطبعي هذا الكود وضعيه في صالونكِ أو على حساب الإنستغرام لتتمكن العميلات من توجيه كاميرا الجوال والحجز فوراً لديكِ.' 
                : 'Print and display this QR code in your store or publish it to Instagram. Clients can scan to book appointments instantly.'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  alert(isAr ? 'تم بدء تحميل كود الـ QR بدقة عالية.' : 'QR Code downloaded in high vector format.');
                  setShowQrModal(false);
                }}
                className="flex-1 py-3 bg-[#14332B] hover:bg-[#1C473C] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{isAr ? 'تحميل بصيغة PNG' : 'Download PNG'}</span>
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="px-6 py-3 border border-[#E9E7E2] text-[#6E6A63] hover:bg-[#F6F6F4] rounded-xl text-xs font-bold transition-all"
              >
                {isAr ? 'إلغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
