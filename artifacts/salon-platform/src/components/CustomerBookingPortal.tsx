/**
 * CustomerBookingPortal — Public multi-step booking page.
 * Accessible at /book/:salonSlug — no login required.
 * Bilingual AR/EN, RTL-first, mobile responsive.
 * Steps: service → branch (if >1) → staff → datetime → info → confirm
 */
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Check, Clock, Star, User, Phone, Mail, MapPin, Calendar, Scissors, Loader2, AlertCircle, CheckCircle2, Copy, Building2 } from 'lucide-react';

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') + '/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SalonInfo   { id: number; nameAr: string; nameEn: string; slug: string; city: string; phone: string; }
interface Service     { id: number; nameAr: string; nameEn: string; price: number; duration: number; categoryAr?: string; categoryEn?: string; }
interface StaffMember { id: number; name: string; role: string; }
interface Branch      { id: number; nameAr: string; nameEn: string; cityAr?: string; cityEn?: string; addressAr?: string; addressEn?: string; }

type Step = 'service' | 'branch' | 'staff' | 'datetime' | 'info' | 'confirm';
const ALL_STEPS: Step[] = ['service', 'branch', 'staff', 'datetime', 'info', 'confirm'];

// Generate time slots 9am-9pm every 30 min
function generateSlots(): string[] {
  const slots: string[] = [];
  for (let h = 9; h < 21; h++) {
    for (const m of [0, 30]) {
      slots.push(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);
    }
  }
  return slots;
}
const ALL_SLOTS = generateSlots();

// Next 14 days
function getAvailableDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDateAr(d: Date): string {
  return d.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric', month: 'short' });
}
function formatDateEn(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CustomerBookingPortal({ slug }: { slug: string }) {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const isAr = lang === 'ar';
  const dir  = isAr ? 'rtl' : 'ltr';

  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [salon, setSalon]         = useState<SalonInfo | null>(null);
  const [services, setServices]   = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [branches, setBranches]   = useState<Branch[]>([]);

  // Derive active steps (skip branch if ≤1 branch)
  const activeSteps: Step[] = branches.length > 1
    ? ALL_STEPS
    : ALL_STEPS.filter(s => s !== 'branch');

  const [step, setStep]                       = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBranch, setSelectedBranch]   = useState<Branch | null>(null);
  const [selectedStaff, setSelectedStaff]     = useState<StaffMember | null | 'any'>('any');
  const [selectedDate, setSelectedDate]       = useState<Date | null>(null);
  const [selectedTime, setSelectedTime]       = useState<string>('');
  const [occupiedSlots, setOccupiedSlots]     = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots]       = useState(false);
  const [clientName, setClientName]           = useState('');
  const [clientPhone, setClientPhone]         = useState('');
  const [clientEmail, setClientEmail]         = useState('');
  const [notes, setNotes]                     = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [confirmed, setConfirmed]             = useState(false);
  const [confirmError, setConfirmError]       = useState('');
  const [confirmedBookingId, setConfirmedBookingId] = useState<number | null>(null);

  const t = (ar: string, en: string) => isAr ? ar : en;

  // ── Load salon data ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/public/salon/${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error === 'online_booking_disabled') {
          setError(t('الحجز الأونلاين غير متاح حالياً لهذا الصالون.', 'Online booking is currently disabled for this salon.'));
        } else if (data.error === 'salon_not_found') {
          setError(t('لم يتم العثور على الصالون.', 'Salon not found.'));
        } else if (data.salon) {
          setSalon(data.salon);
          setServices(data.services ?? []);
          setStaffList(data.staff ?? []);
          const branchData: Branch[] = data.branches ?? [];
          setBranches(branchData);
          // Auto-select if only one branch
          if (branchData.length === 1) setSelectedBranch(branchData[0]);
        } else {
          setError(t('حدث خطأ. يرجى المحاولة لاحقاً.', 'An error occurred. Please try again.'));
        }
      })
      .catch(() => setError(t('تعذّر الاتصال بالخادم.', 'Could not connect to server.')))
      .finally(() => setLoading(false));
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load availability when date/staff changes ───────────────────────────────
  const loadAvailability = useCallback(async (date: Date, staff: StaffMember | null | 'any') => {
    if (!date || !salon) return;
    setLoadingSlots(true);
    try {
      const staffParam = staff && staff !== 'any' ? `&staffId=${staff.id}` : '';
      const r = await fetch(`${API_BASE}/public/salon/${slug}/availability?date=${toISODate(date)}${staffParam}`);
      const d = await r.json();
      setOccupiedSlots(d.occupied ?? []);
    } catch { setOccupiedSlots([]); }
    finally { setLoadingSlots(false); }
  }, [salon, slug]);

  useEffect(() => {
    if (selectedDate) loadAvailability(selectedDate, selectedStaff);
  }, [selectedDate, selectedStaff, loadAvailability]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const currentStepIdx = activeSteps.indexOf(step);

  const canGoNext = (): boolean => {
    if (step === 'service')  return !!selectedService;
    if (step === 'branch')   return !!selectedBranch;
    if (step === 'staff')    return true;
    if (step === 'datetime') return !!selectedDate && !!selectedTime;
    if (step === 'info')     return clientName.trim().length >= 2;
    return false;
  };

  const goNext = () => {
    const idx = activeSteps.indexOf(step);
    if (idx < activeSteps.length - 1) setStep(activeSteps[idx + 1]);
  };
  const goBack = () => {
    const idx = activeSteps.indexOf(step);
    if (idx > 0) setStep(activeSteps[idx - 1]);
  };

  // ── Submit booking ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setConfirmError('');
    try {
      const res = await fetch(`${API_BASE}/public/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonSlug:   slug,
          serviceId:   selectedService.id,
          staffId:     selectedStaff && selectedStaff !== 'any' ? selectedStaff.id : null,
          branchId:    selectedBranch?.id ?? null,
          date:        toISODate(selectedDate),
          time:        selectedTime,
          clientName:  clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientEmail: clientEmail.trim(),
          notes:       notes.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfirmedBookingId(data.bookingId ?? null);
        setConfirmed(true);
      } else if (data.error === 'slot_taken') {
        setConfirmError(t('هذا الوقت محجوز. يرجى اختيار وقت آخر.', 'This slot is already taken. Please choose another time.'));
        setStep('datetime');
      } else {
        setConfirmError(data.message ?? t('حدث خطأ في الحجز.', 'Booking failed.'));
      }
    } catch {
      setConfirmError(t('تعذّر الاتصال بالخادم.', 'Could not connect to server.'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step labels ─────────────────────────────────────────────────────────────
  const stepLabels: Record<Step, string> = {
    service:  t('الخدمة', 'Service'),
    branch:   t('الفرع', 'Branch'),
    staff:    t('الموظفة', 'Staff'),
    datetime: t('الموعد', 'Date & Time'),
    info:     t('بياناتك', 'Your Info'),
    confirm:  t('التأكيد', 'Confirm'),
  };

  // ── Reset all ───────────────────────────────────────────────────────────────
  const resetAll = () => {
    setConfirmed(false);
    setStep('service');
    setSelectedService(null);
    if (branches.length !== 1) setSelectedBranch(null);
    setSelectedStaff('any');
    setSelectedDate(null);
    setSelectedTime('');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setNotes('');
    setConfirmError('');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-[#6E6A63]">
          <Loader2 className="w-10 h-10 animate-spin text-[#FF5A5F]" />
          <p className="font-semibold">{t('جارٍ التحميل...', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6" dir={dir}>
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-[#FF5A5F]" />
          </div>
          <h2 className="text-xl font-bold text-[#1C1B18]">{t('غير متاح', 'Not Available')}</h2>
          <p className="text-[#6E6A63]">{error}</p>
        </div>
      </div>
    );
  }

  // ── Confirmation screen ─────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6" dir={dir}>
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#1C1B18] mb-2">{t('تم تأكيد حجزك! 🎉', 'Booking Confirmed! 🎉')}</h2>
            <p className="text-[#6E6A63]">{t('سيتواصل معك الصالون لتأكيد الموعد.', 'The salon will contact you to confirm your appointment.')}</p>
          </div>

          {/* Booking reference badge */}
          {confirmedBookingId && (
            <div className="bg-[#14332B] text-white rounded-xl px-4 py-3 text-center">
              <p className="text-[11px] text-emerald-300 mb-0.5">{t('رقم الحجز', 'Booking Reference')}</p>
              <p className="text-xl font-black tracking-widest" dir="ltr">BK-{String(confirmedBookingId).padStart(5, '0')}</p>
            </div>
          )}

          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 text-right rtl:text-right ltr:text-left space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#6E6A63]">{t('الصالون', 'Salon')}</span>
              <span className="font-semibold text-[#1C1B18]">{isAr ? salon?.nameAr : salon?.nameEn}</span>
            </div>
            {selectedBranch && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#6E6A63]">{t('الفرع', 'Branch')}</span>
                <span className="font-semibold text-[#1C1B18]">{isAr ? selectedBranch.nameAr : selectedBranch.nameEn}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#6E6A63]">{t('الخدمة', 'Service')}</span>
              <span className="font-semibold text-[#1C1B18]">{isAr ? selectedService?.nameAr : selectedService?.nameEn}</span>
            </div>
            {selectedStaff && selectedStaff !== 'any' && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#6E6A63]">{t('الموظفة', 'Staff')}</span>
                <span className="font-semibold text-[#1C1B18]">{(selectedStaff as StaffMember).name}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#6E6A63]">{t('التاريخ', 'Date')}</span>
              <span className="font-semibold text-[#1C1B18]">{selectedDate ? (isAr ? formatDateAr(selectedDate) : formatDateEn(selectedDate)) : ''}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#6E6A63]">{t('الوقت', 'Time')}</span>
              <span className="font-semibold text-[#1C1B18]">{selectedTime}</span>
            </div>
            <div className="w-full h-px bg-[#F5F4F1]" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#6E6A63]">{t('الاسم', 'Name')}</span>
              <span className="font-semibold text-[#1C1B18]">{clientName}</span>
            </div>
            {clientPhone && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#6E6A63]">{t('الجوال', 'Phone')}</span>
                <span className="font-semibold text-[#1C1B18]" dir="ltr">{clientPhone}</span>
              </div>
            )}
            {clientEmail && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#6E6A63]">{t('الإيميل', 'Email')}</span>
                <span className="font-semibold text-[#1C1B18]" dir="ltr">{clientEmail}</span>
              </div>
            )}
            <div className="w-full h-px bg-[#F5F4F1]" />
            <div className="flex justify-between">
              <span className="font-semibold text-[#1C1B18]">{t('الإجمالي', 'Total')}</span>
              <span className="text-lg font-bold text-[#FF5A5F]">{selectedService?.price} {t('ريال', 'SAR')}</span>
            </div>
          </div>

          <button
            onClick={resetAll}
            className="w-full py-3 bg-[#1C1B18] text-white rounded-xl font-semibold hover:bg-[#FF5A5F] transition-colors"
          >
            {t('حجز موعد آخر', 'Book Another Appointment')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]" dir={dir}>
      {/* Header */}
      <header className="bg-white border-b border-[#E9E7E2] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#1C1B18]">{isAr ? salon?.nameAr : salon?.nameEn}</span>
            </div>
            {salon?.city && <p className="text-xs text-[#6E6A63]">{salon.city}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
              className="text-xs font-semibold text-[#6E6A63] border border-[#E9E7E2] rounded-lg px-3 py-1.5 hover:bg-[#F5F4F1] transition-colors"
            >
              {isAr ? 'EN' : 'عربي'}
            </button>
            <div className="text-xs font-bold text-[#FF5A5F] tracking-widest">CONFIRMED</div>
          </div>
        </div>
        {/* Progress steps */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-1">
            {activeSteps.map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1 ${i <= currentStepIdx ? 'text-[#FF5A5F]' : 'text-[#C9C7C2]'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                    i < currentStepIdx  ? 'bg-[#FF5A5F] border-[#FF5A5F] text-white' :
                    i === currentStepIdx ? 'bg-white border-[#FF5A5F] text-[#FF5A5F]' :
                                          'bg-white border-[#E9E7E2] text-[#C9C7C2]'
                  }`}>
                    {i < currentStepIdx ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className="hidden sm:inline text-xs font-medium">{stepLabels[s]}</span>
                </div>
                {i < activeSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded-full ${i < currentStepIdx ? 'bg-[#FF5A5F]' : 'bg-[#E9E7E2]'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-32">

        {/* ── Step: Service ────────────────────────────────────────────── */}
        {step === 'service' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#1C1B18]">{t('اختاري الخدمة', 'Choose a Service')}</h2>
            {Array.from(new Set(services.map(s => isAr ? (s.categoryAr || '') : (s.categoryEn || '')))).map(cat => (
              <div key={cat}>
                {cat && <h3 className="text-sm font-semibold text-[#6E6A63] mb-2 mt-4">{cat}</h3>}
                <div className="space-y-2">
                  {services.filter(s => (isAr ? (s.categoryAr || '') : (s.categoryEn || '')) === cat).map(service => (
                    <button
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`w-full text-start p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-4 ${
                        selectedService?.id === service.id
                          ? 'border-[#FF5A5F] bg-[#FFF5F5]'
                          : 'border-[#E9E7E2] bg-white hover:border-[#FF5A5F]/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selectedService?.id === service.id ? 'bg-[#FF5A5F] text-white' : 'bg-[#F5F4F1] text-[#6E6A63]'
                        }`}>
                          <Scissors className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#1C1B18]">{isAr ? service.nameAr : service.nameEn}</p>
                          <p className="text-xs text-[#6E6A63] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {service.duration} {t('دقيقة', 'min')}
                          </p>
                        </div>
                      </div>
                      <div className="text-start shrink-0">
                        <p className="font-bold text-[#FF5A5F]">{service.price}</p>
                        <p className="text-xs text-[#6E6A63]">{t('ريال', 'SAR')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Step: Branch ─────────────────────────────────────────────── */}
        {step === 'branch' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#1C1B18]">{t('اختاري الفرع', 'Choose a Branch')}</h2>
            <p className="text-sm text-[#6E6A63]">{t('اختاري الفرع الأقرب إليكِ.', 'Choose the branch most convenient for you.')}</p>
            <div className="space-y-2">
              {branches.map(branch => (
                <button
                  key={branch.id}
                  onClick={() => setSelectedBranch(branch)}
                  className={`w-full text-start p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    selectedBranch?.id === branch.id
                      ? 'border-[#FF5A5F] bg-[#FFF5F5]'
                      : 'border-[#E9E7E2] bg-white hover:border-[#FF5A5F]/40'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    selectedBranch?.id === branch.id ? 'bg-[#FF5A5F] text-white' : 'bg-[#F5F4F1] text-[#6E6A63]'
                  }`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1C1B18]">{isAr ? branch.nameAr : branch.nameEn}</p>
                    {(isAr ? branch.cityAr : branch.cityEn) && (
                      <p className="text-xs text-[#6E6A63] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {isAr ? branch.cityAr : branch.cityEn}
                        {(isAr ? branch.addressAr : branch.addressEn) && ` — ${isAr ? branch.addressAr : branch.addressEn}`}
                      </p>
                    )}
                  </div>
                  {selectedBranch?.id === branch.id && (
                    <div className="ms-auto shrink-0">
                      <Check className="w-5 h-5 text-[#FF5A5F]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: Staff ───────────────────────────────────────────────── */}
        {step === 'staff' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#1C1B18]">{t('اختاري الموظفة', 'Choose a Staff Member')}</h2>
            <p className="text-sm text-[#6E6A63]">{t('يمكنك اختيار موظفة بعينها أو ترك الاختيار لنا.', 'You can choose a specific staff member or let us assign one.')}</p>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedStaff('any')}
                className={`w-full text-start p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                  selectedStaff === 'any'
                    ? 'border-[#FF5A5F] bg-[#FFF5F5]'
                    : 'border-[#E9E7E2] bg-white hover:border-[#FF5A5F]/40'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedStaff === 'any' ? 'bg-[#FF5A5F] text-white' : 'bg-[#F5F4F1] text-[#6E6A63]'}`}>
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-[#1C1B18]">{t('أي موظفة متاحة', 'Any Available Staff')}</p>
                  <p className="text-xs text-[#6E6A63]">{t('سنختار أفضل موظفة متاحة', 'We\'ll assign the best available')}</p>
                </div>
              </button>
              {staffList.map(member => (
                <button
                  key={member.id}
                  onClick={() => setSelectedStaff(member)}
                  className={`w-full text-start p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    selectedStaff !== 'any' && (selectedStaff as StaffMember)?.id === member.id
                      ? 'border-[#FF5A5F] bg-[#FFF5F5]'
                      : 'border-[#E9E7E2] bg-white hover:border-[#FF5A5F]/40'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    selectedStaff !== 'any' && (selectedStaff as StaffMember)?.id === member.id
                      ? 'bg-[#FF5A5F] text-white'
                      : 'bg-[#F5F4F1] text-[#6E6A63]'
                  }`}>
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1C1B18]">{member.name}</p>
                    {member.role && <p className="text-xs text-[#6E6A63]">{member.role}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: Date & Time ─────────────────────────────────────────── */}
        {step === 'datetime' && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-[#1C1B18]">{t('اختاري الموعد', 'Choose Date & Time')}</h2>
            <div>
              <p className="text-sm font-semibold text-[#6E6A63] mb-2">{t('التاريخ', 'Date')}</p>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {getAvailableDates().map(d => {
                  const isSelected = selectedDate ? toISODate(d) === toISODate(selectedDate) : false;
                  const isToday = toISODate(d) === toISODate(new Date());
                  return (
                    <button
                      key={toISODate(d)}
                      onClick={() => { setSelectedDate(d); setSelectedTime(''); }}
                      className={`shrink-0 w-14 py-2.5 rounded-xl border-2 transition-all flex flex-col items-center ${
                        isSelected ? 'border-[#FF5A5F] bg-[#FF5A5F] text-white' : 'border-[#E9E7E2] bg-white hover:border-[#FF5A5F]/40 text-[#1C1B18]'
                      }`}
                    >
                      <span className="text-xs font-medium">{isAr ? d.toLocaleDateString('ar-SA',{weekday:'short'}) : d.toLocaleDateString('en-US',{weekday:'short'})}</span>
                      <span className="text-lg font-bold leading-tight">{d.getDate()}</span>
                      {isToday && <span className="text-[10px] opacity-70">{t('اليوم','Today')}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            {selectedDate && (
              <div>
                <p className="text-sm font-semibold text-[#6E6A63] mb-2">{t('الوقت', 'Time')}</p>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-[#6E6A63] text-sm py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('جارٍ تحميل المواعيد...', 'Loading available slots...')}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {ALL_SLOTS.map(slot => {
                      const isOccupied = occupiedSlots.includes(slot);
                      const isSelected = selectedTime === slot;
                      return (
                        <button
                          key={slot}
                          disabled={isOccupied}
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                            isOccupied ? 'border-[#E9E7E2] bg-[#F5F4F1] text-[#C9C7C2] cursor-not-allowed line-through' :
                            isSelected  ? 'border-[#FF5A5F] bg-[#FF5A5F] text-white' :
                                          'border-[#E9E7E2] bg-white hover:border-[#FF5A5F]/40 text-[#1C1B18]'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step: Customer Info ───────────────────────────────────────── */}
        {step === 'info' && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-[#1C1B18]">{t('بياناتك الشخصية', 'Your Details')}</h2>
            <p className="text-sm text-[#6E6A63]">{t('لا تحتاجين لإنشاء حساب. فقط أدخلي بياناتك الأساسية.', 'No account needed. Just your basic info.')}</p>
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-[#1C1B18] mb-1.5">
                  {t('الاسم الكامل', 'Full Name')} <span className="text-[#FF5A5F]">*</span>
                </label>
                <div className="relative">
                  <User className={`absolute top-3.5 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-[#6E6A63]`} />
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder={t('مثال: سارة المطيري', 'e.g. Sarah Al-Mutairi')}
                    className={`w-full ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-[#E9E7E2] rounded-xl bg-white text-[#1C1B18] focus:outline-none focus:border-[#FF5A5F] focus:ring-1 focus:ring-[#FF5A5F]`}
                  />
                </div>
              </div>
              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-[#1C1B18] mb-1.5">
                  {t('رقم الجوال', 'Phone Number')}
                </label>
                <div className="relative">
                  <Phone className={`absolute top-3.5 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-[#6E6A63]`} />
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    placeholder={t('05XXXXXXXX', '05XXXXXXXX')}
                    className={`w-full ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-[#E9E7E2] rounded-xl bg-white text-[#1C1B18] focus:outline-none focus:border-[#FF5A5F] focus:ring-1 focus:ring-[#FF5A5F]`}
                    dir="ltr"
                  />
                </div>
              </div>
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-[#1C1B18] mb-1.5">
                  {t('البريد الإلكتروني', 'Email Address')}
                </label>
                <div className="relative">
                  <Mail className={`absolute top-3.5 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-[#6E6A63]`} />
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    placeholder={t('example@email.com', 'example@email.com')}
                    className={`w-full ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-[#E9E7E2] rounded-xl bg-white text-[#1C1B18] focus:outline-none focus:border-[#FF5A5F] focus:ring-1 focus:ring-[#FF5A5F]`}
                    dir="ltr"
                  />
                </div>
              </div>
              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-[#1C1B18] mb-1.5">
                  {t('ملاحظات (اختياري)', 'Notes (optional)')}
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t('أي تفاصيل تودين إضافتها...', 'Any special requests...')}
                  rows={3}
                  className="w-full px-4 py-3 border border-[#E9E7E2] rounded-xl bg-white text-[#1C1B18] focus:outline-none focus:border-[#FF5A5F] focus:ring-1 focus:ring-[#FF5A5F] resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Confirm ─────────────────────────────────────────────── */}
        {step === 'confirm' && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-[#1C1B18]">{t('تأكيد الحجز', 'Confirm Booking')}</h2>
            {confirmError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{confirmError}</span>
              </div>
            )}
            <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#6E6A63]">{t('الصالون', 'Salon')}</span>
                <span className="font-semibold text-[#1C1B18]">{isAr ? salon?.nameAr : salon?.nameEn}</span>
              </div>
              {selectedBranch && (
                <>
                  <div className="w-full h-px bg-[#F5F4F1]" />
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6E6A63]">{t('الفرع', 'Branch')}</span>
                    <span className="font-semibold text-[#1C1B18]">{isAr ? selectedBranch.nameAr : selectedBranch.nameEn}</span>
                  </div>
                </>
              )}
              <div className="w-full h-px bg-[#F5F4F1]" />
              <div className="flex justify-between text-sm">
                <span className="text-[#6E6A63]">{t('الخدمة', 'Service')}</span>
                <span className="font-semibold text-[#1C1B18]">{isAr ? selectedService?.nameAr : selectedService?.nameEn}</span>
              </div>
              {selectedStaff && selectedStaff !== 'any' && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#6E6A63]">{t('الموظفة', 'Staff')}</span>
                  <span className="font-semibold text-[#1C1B18]">{(selectedStaff as StaffMember).name}</span>
                </div>
              )}
              <div className="w-full h-px bg-[#F5F4F1]" />
              <div className="flex justify-between text-sm">
                <span className="text-[#6E6A63]">{t('التاريخ', 'Date')}</span>
                <span className="font-semibold text-[#1C1B18]">{selectedDate ? (isAr ? formatDateAr(selectedDate) : formatDateEn(selectedDate)) : ''}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6E6A63]">{t('الوقت', 'Time')}</span>
                <span className="font-semibold text-[#1C1B18]">{selectedTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6E6A63]">{t('المدة', 'Duration')}</span>
                <span className="font-semibold text-[#1C1B18]">{selectedService?.duration} {t('دقيقة', 'min')}</span>
              </div>
              <div className="w-full h-px bg-[#F5F4F1]" />
              <div className="flex justify-between text-sm">
                <span className="text-[#6E6A63]">{t('الاسم', 'Name')}</span>
                <span className="font-semibold text-[#1C1B18]">{clientName}</span>
              </div>
              {clientPhone && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#6E6A63]">{t('الجوال', 'Phone')}</span>
                  <span className="font-semibold text-[#1C1B18]" dir="ltr">{clientPhone}</span>
                </div>
              )}
              {clientEmail && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#6E6A63]">{t('الإيميل', 'Email')}</span>
                  <span className="font-semibold text-[#1C1B18]" dir="ltr">{clientEmail}</span>
                </div>
              )}
              <div className="w-full h-px bg-[#F5F4F1]" />
              <div className="flex justify-between">
                <span className="font-semibold text-[#1C1B18]">{t('الإجمالي', 'Total')}</span>
                <span className="text-lg font-bold text-[#FF5A5F]">{selectedService?.price} {t('ريال', 'SAR')}</span>
              </div>
            </div>
            <p className="text-xs text-[#6E6A63] text-center">{t('الدفع يتم في الصالون عند الحضور', 'Payment is collected at the salon on arrival')}</p>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 bg-[#FF5A5F] text-white rounded-xl font-bold text-base hover:bg-[#E84E53] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              {submitting ? t('جارٍ الحجز...', 'Booking...') : t('تأكيد الحجز', 'Confirm Booking')}
            </button>
          </div>
        )}
      </main>

      {/* Bottom nav bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[#E9E7E2] p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          {currentStepIdx > 0 && (
            <button
              onClick={goBack}
              className="flex-1 py-3 border border-[#E9E7E2] rounded-xl font-semibold text-[#1C1B18] flex items-center justify-center gap-2 hover:bg-[#F5F4F1] transition-colors"
            >
              {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {t('السابق', 'Back')}
            </button>
          )}
          {step !== 'confirm' && (
            <button
              onClick={goNext}
              disabled={!canGoNext()}
              className="flex-1 py-3 bg-[#FF5A5F] text-white rounded-xl font-bold disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-[#E84E53] transition-colors"
            >
              {t('التالي', 'Next')}
              {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
