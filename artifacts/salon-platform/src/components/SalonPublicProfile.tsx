import React, { useEffect, useState } from 'react';
import {
  Phone, MapPin, Clock, Scissors, Users, Building2,
  Star, Instagram, Globe, ChevronRight, ArrowRight,
  Loader2, AlertCircle, Sparkles,
} from 'lucide-react';

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') + '/api';
const BASE_URL  = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

interface SalonData {
  nameAr: string;
  nameEn: string;
  slug: string;
  city: string | null;
  phone: string | null;
  logoUrl: string | null;
  onlineBookingEnabled: boolean;
}
interface Service {
  id: number; nameAr: string; nameEn: string;
  price: number | null; duration: number | null;
  categoryAr: string | null; categoryEn: string | null;
}
interface StaffMember { id: number; name: string; role: string; specialty?: string }
interface Branch { id: number; nameAr: string; nameEn: string; cityAr: string; cityEn: string; addressAr: string; addressEn: string; phone: string; isActive: boolean }

interface Props { slug: string }

export default function SalonPublicProfile({ slug }: Props) {
  const [salon, setSalon]       = useState<SalonData | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff]       = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lang, setLang]         = useState<'ar' | 'en'>('ar');

  const isAr = lang === 'ar';

  useEffect(() => {
    fetch(`${API_BASE}/public/profile/${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setSalon(data.salon);
        setServices(data.services || []);
        setStaff(data.staff || []);
        setBranches(data.branches || []);
      })
      .catch(code => setError(code === 404 ? 'not_found' : 'server_error'))
      .finally(() => setLoading(false));
  }, [slug]);

  /* ── Categories ────────────────────────────────────────────────────────── */
  const categories = Array.from(new Set(services.map(s => isAr ? s.categoryAr : s.categoryEn).filter(Boolean))) as string[];

  /* ── Loading ───────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen bg-[#F6F6F4] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#FF5A5F] animate-spin" />
    </div>
  );

  /* ── Error ─────────────────────────────────────────────────────────────── */
  if (error || !salon) return (
    <div className="min-h-screen bg-[#F6F6F4] flex items-center justify-center p-6" dir="rtl">
      <div className="text-center space-y-3 max-w-sm">
        <AlertCircle className="w-12 h-12 text-[#FF5A5F] mx-auto" />
        <h2 className="text-xl font-bold text-[#1C1B18]">
          {error === 'not_found' ? 'الصالون غير موجود' : 'حدث خطأ'}
        </h2>
        <p className="text-sm text-[#6E6A63]">
          {error === 'not_found'
            ? 'تأكدي من الرابط أو تواصلي مع الصالون مباشرة'
            : 'يرجى المحاولة مرة أخرى لاحقاً'}
        </p>
      </div>
    </div>
  );

  const salonName = isAr ? salon.nameAr : salon.nameEn;
  const bookLink  = `${BASE_URL}/book/${slug}`;

  return (
    <div className="min-h-screen bg-[#F6F6F4] font-sans" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="bg-[#14332B] relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#FF5A5F]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-5 py-10">
          {/* Lang toggle */}
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all"
            >
              {isAr ? 'EN' : 'AR'}
            </button>
          </div>

          <div className="flex items-center gap-5">
            {/* Logo or initial */}
            {salon.logoUrl ? (
              <img
                src={salon.logoUrl}
                alt={salonName}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/20 shadow-xl shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF5A5F] to-[#FFAE34] flex items-center justify-center text-white text-3xl font-black shrink-0 shadow-xl">
                {salonName.charAt(0)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-white leading-tight truncate">{salonName}</h1>
                <span className="shrink-0 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30">
                  {isAr ? '✓ موثق' : '✓ Verified'}
                </span>
              </div>
              {salon.city && (
                <p className="text-sm text-slate-300 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" /> {salon.city}
                </p>
              )}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {salon.phone && (
                  <a
                    href={`tel:${salon.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {salon.phone}
                  </a>
                )}
                {salon.phone && (
                  <a
                    href={`https://wa.me/${salon.phone.replace(/^0/, '966')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg transition-all border border-emerald-500/30"
                  >
                    💬 {isAr ? 'واتساب' : 'WhatsApp'}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { icon: Scissors, label: isAr ? 'خدمة' : 'Services', value: services.length },
              { icon: Users,    label: isAr ? 'موظفة' : 'Staff',    value: staff.length },
              { icon: Building2,label: isAr ? 'فرع'   : 'Branches', value: branches.length || 1 },
            ].map(stat => (
              <div key={stat.label} className="bg-white/8 rounded-xl p-3 text-center border border-white/10">
                <stat.icon className="w-4 h-4 text-[#FF5A5F] mx-auto mb-1" />
                <p className="text-xl font-black text-white">{stat.value}</p>
                <p className="text-[10px] text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sticky Book CTA ──────────────────────────────────────────────────── */}
      {salon.onlineBookingEnabled && (
        <div className="sticky top-0 z-30 bg-white border-b border-[#E9E7E2] shadow-sm">
          <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF5A5F]" />
              <span className="text-sm font-bold text-[#1C1B18]">
                {isAr ? 'الحجز أونلاين متاح الآن' : 'Online booking available'}
              </span>
            </div>
            <a
              href={bookLink}
              className="px-5 py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white text-sm font-black rounded-xl transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              {isAr ? 'احجزي الآن' : 'Book Now'}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-5 py-8 space-y-8">

        {/* Services by category */}
        {services.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-base font-black text-[#1C1B18] flex items-center gap-2">
              <Scissors className="w-4.5 h-4.5 text-[#FF5A5F]" />
              {isAr ? 'خدماتنا' : 'Our Services'}
            </h2>

            {(categories.length > 0 ? categories : [null]).map(cat => {
              const catServices = cat
                ? services.filter(s => (isAr ? s.categoryAr : s.categoryEn) === cat)
                : services;
              if (!catServices.length) return null;
              return (
                <div key={cat ?? 'all'} className="bg-white rounded-2xl overflow-hidden border border-[#E9E7E2] shadow-xs">
                  {cat && (
                    <div className="px-5 py-2.5 bg-[#F6F6F4] border-b border-[#E9E7E2]">
                      <p className="text-xs font-black text-[#1C1B18] uppercase tracking-wide">{cat}</p>
                    </div>
                  )}
                  <div className="divide-y divide-[#F6F6F4]">
                    {catServices.map(svc => (
                      <div key={svc.id} className="flex items-center justify-between px-5 py-4 gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#1C1B18] truncate">
                            {isAr ? svc.nameAr : svc.nameEn}
                          </p>
                          {svc.duration && (
                            <p className="text-[11px] text-[#9CA3AF] flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {svc.duration} {isAr ? 'دقيقة' : 'min'}
                            </p>
                          )}
                        </div>
                        {svc.price != null && (
                          <span className="shrink-0 text-sm font-black text-[#FF5A5F]">
                            {svc.price} {isAr ? 'ر.س' : 'SAR'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Staff */}
        {staff.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-black text-[#1C1B18] flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-[#FF5A5F]" />
              {isAr ? 'فريق العمل' : 'Our Team'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {staff.map(member => (
                <div key={member.id} className="bg-white rounded-2xl p-4 border border-[#E9E7E2] text-center space-y-2 shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF5A5F]/15 to-[#FFAE34]/15 flex items-center justify-center mx-auto">
                    <span className="text-lg font-black text-[#FF5A5F]">{member.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1C1B18] leading-tight">{member.name}</p>
                    <p className="text-[10px] text-[#9CA3AF] mt-0.5">{member.specialty || member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Branches */}
        {branches.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-black text-[#1C1B18] flex items-center gap-2">
              <Building2 className="w-4.5 h-4.5 text-[#FF5A5F]" />
              {isAr ? 'فروعنا' : 'Our Branches'}
            </h2>
            <div className="space-y-3">
              {branches.map(branch => (
                <div key={branch.id} className={`bg-white rounded-2xl p-4 border shadow-xs flex items-start gap-4 ${branch.isActive ? 'border-[#E9E7E2]' : 'border-[#E9E7E2] opacity-50'}`}>
                  <div className="w-9 h-9 rounded-xl bg-[#FF5A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-[#FF5A5F]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1C1B18]">
                      {isAr ? branch.nameAr : branch.nameEn}
                    </p>
                    {(branch.cityAr || branch.cityEn) && (
                      <p className="text-[11px] text-[#6E6A63] mt-0.5">
                        {isAr ? branch.cityAr : branch.cityEn}
                        {(isAr ? branch.addressAr : branch.addressEn) ? ` — ${isAr ? branch.addressAr : branch.addressEn}` : ''}
                      </p>
                    )}
                    {branch.phone && (
                      <a href={`tel:${branch.phone}`} className="text-[11px] text-[#FF5A5F] font-semibold flex items-center gap-1 mt-1.5 hover:underline">
                        <Phone className="w-3 h-3" /> {branch.phone}
                      </a>
                    )}
                  </div>
                  {branch.isActive && (
                    <span className="shrink-0 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-full border border-emerald-100">
                      {isAr ? 'نشط' : 'Open'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Book CTA bottom */}
        {salon.onlineBookingEnabled && (
          <div className="bg-[#14332B] rounded-3xl p-6 text-center space-y-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF5A5F]/10 to-transparent pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <Star className="w-6 h-6 text-[#FFAE34] mx-auto" />
              <h3 className="text-lg font-black text-white">
                {isAr ? 'احجزي موعدكِ الآن' : 'Book Your Appointment'}
              </h3>
              <p className="text-xs text-slate-300">
                {isAr ? 'حجز سريع وسهل عبر بوابتنا الإلكترونية' : 'Fast and easy booking through our online portal'}
              </p>
              <a
                href={bookLink}
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-black rounded-2xl transition-all shadow-lg shadow-[#FF5A5F]/30 text-sm"
              >
                {isAr ? 'احجزي الآن' : 'Book Now'}
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-[#C9C7C2] pb-4">
          {isAr ? 'مدعوم بواسطة' : 'Powered by'}{' '}
          <span className="font-black text-[#FF5A5F]">CONFIRMED</span>
        </p>
      </div>
    </div>
  );
}
