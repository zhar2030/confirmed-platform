import React, { useState } from 'react';
import { Booking, Service, Staff } from '../types';
import { 
  Calendar as CalendarIcon, 
  User, 
  Plus, 
  Clock, 
  Check, 
  Phone, 
  Filter, 
  GripVertical, 
  Sparkles, 
  List, 
  CalendarDays, 
  AlertCircle,
  MessageSquare,
  MessageCircle,
  Send,
  Smartphone,
  Percent,
  Sliders,
  Flame,
  Award,
  Volume2,
  Bell,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  UserX
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface BookingsManagerProps {
  bookings: Booking[];
  services: Service[];
  staffList: Staff[];
  onAddBooking: (booking: Booking) => void;
  onUpdateStatus: (bookingId: string, status: 'pending' | 'confirmed' | 'attended' | 'cancelled' | 'no_show') => void;
  onUpdateBookingTime: (bookingId: string, time: string) => void;
}

export default function BookingsManager({ 
  bookings, 
  services, 
  staffList, 
  onAddBooking, 
  onUpdateStatus, 
  onUpdateBookingTime 
}: BookingsManagerProps) {
  const { t, isAr } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [staffFilter, setStaffFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [mobileTab, setMobileTab] = useState<'list' | 'timeline'>('timeline');

  // Interactive Occupancy Tracking State
  const [occupancyGoal, setOccupancyGoal] = useState(12); // Default target goal of 12 bookings
  const [occupancyMode, setOccupancyMode] = useState<'slots' | 'goal'>('slots'); // 'slots' = hour slots capacity, 'goal' = custom target goal
  const [showPromoSuccess, setShowPromoSuccess]   = useState(false);
  const [promoDiscount, setPromoDiscount]         = useState(20);
  const [showCampaignForm, setShowCampaignForm]   = useState(false);
  const [campaignTitle, setCampaignTitle]         = useState('');
  const [campaignAudience, setCampaignAudience]   = useState<'all' | 'vip' | 'inactive'>('all');
  const [campaignChannel, setCampaignChannel]     = useState<'whatsapp' | 'both'>('whatsapp');

  // Drag and Drop States
  const [draggedBookingId, setDraggedBookingId] = useState<string | null>(null);
  const [dragOverHour, setDragOverHour] = useState<string | null>(null);
  const [showRescheduleToast, setShowRescheduleToast] = useState(false);
  const [rescheduleDetails, setRescheduleDetails] = useState<{ name: string; oldTime: string; newTime: string } | null>(null);

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || '');
  const [selectedTime, setSelectedTime] = useState('12:00');
  const [bookingNotes, setBookingNotes] = useState('');

  // Reminder States
  const [selectedBookingForReminder, setSelectedBookingForReminder] = useState<Booking | null>(null);
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderTemplateType, setReminderTemplateType] = useState<'standard' | 'detailed' | 'vip'>('standard');
  const [reminderStatusMessage, setReminderStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const getFormattedMessage = (booking: Booking, type: 'standard' | 'detailed' | 'vip') => {
    const sName = getServiceName(booking.serviceId);
    const stName = getStaffName(booking.staffId);
    
    if (isAr) {
      switch (type) {
        case 'standard':
          return `مرحباً أ. ${booking.clientName}، نود تذكيركِ بموعد حجزكِ في صالون كونفيرمد التجميلي لخدمة (${sName}) اليوم في تمام الساعة ${booking.time}. نتطلع لزيارتكِ المتألقة! 🌸`;
        case 'detailed':
          return `أهلاً بكِ أ. ${booking.clientName} ✨\nنذكركِ بموعدكِ المؤكد في صالون كونفيرمد:\n🗓️ التاريخ: ${booking.date}\n⏰ الوقت: ${booking.time}\n💇‍♀️ الخدمة: ${sName}\n👩‍🎨 مع الخبيرة: ${stName}\n📍 موقعنا: العليا، الرياض.\nيرجى الحضور قبل الموعد بـ 10 دقائق لتجربة مثالية. مرحباً بكِ!`;
        case 'vip':
          return `أهلاً بملكتنا أ. ${booking.clientName} 👑✨\nيسعدنا جداً اقتراب موعد جلستكِ التدليلية المميزة لدينا اليوم الساعة ${booking.time}.\nسنقوم بتقديم أرقى الخدمات لكِ لتبدي في أبهى حلة. ننتظركِ بشوق! 💖`;
      }
    } else {
      switch (type) {
        case 'standard':
          return `Hello ${booking.clientName}, this is a friendly reminder of your appointment at CONFIRMED Beauty Salon for ${sName} today at ${booking.time}. We look forward to seeing you! 🌸`;
        case 'detailed':
          return `Hi ${booking.clientName} ✨\nYour booking at CONFIRMED Salon is confirmed:\n🗓️ Date: ${booking.date}\n⏰ Time: ${booking.time}\n💇‍♀️ Service: ${sName}\n👩‍🎨 Specialist: ${stName}\n📍 Location: Olaya, Riyadh.\nPlease arrive 10 minutes prior to your time. Welcome!`;
        case 'vip':
          return `Hello VIP Client ${booking.clientName} 👑✨\nWe are excited to pamper you today at ${booking.time} with our bespoke ${sName} treatment.\nGet ready for a premium wellness experience. See you soon! 💖`;
      }
    }
  };

  const handleOpenReminderModal = (booking: Booking) => {
    setSelectedBookingForReminder(booking);
    setReminderTemplateType('standard');
    setReminderStatusMessage(null);
    setReminderMessage(getFormattedMessage(booking, 'standard'));
  };

  const handleTemplateChange = (type: 'standard' | 'detailed' | 'vip') => {
    if (!selectedBookingForReminder) return;
    setReminderTemplateType(type);
    setReminderMessage(getFormattedMessage(selectedBookingForReminder, type));
  };

  const getWhatsAppLink = (phone: string, text: string) => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('05')) {
      cleanPhone = '9665' + cleanPhone.substring(2);
    } else if (cleanPhone.startsWith('5')) {
      cleanPhone = '966' + cleanPhone;
    } else if (!cleanPhone.startsWith('966') && cleanPhone.length === 9) {
      cleanPhone = '966' + cleanPhone;
    }
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  };

  const getSmsLink = (phone: string, text: string) => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('05')) {
      cleanPhone = '+9665' + cleanPhone.substring(2);
    }
    return `sms:${cleanPhone}?body=${encodeURIComponent(text)}`;
  };

  // Define hour slots (10:00 AM to 10:00 PM)
  const hours = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  // List view: ALL bookings sorted by date+time (no date filter)
  const allBookingsSorted = [...bookings]
    .filter(b => staffFilter === 'all' || b.staffId === staffFilter)
    .sort((a, b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date));

  // Timeline view: only the selected date (used for the hourly grid)
  const filteredBookings = bookings.filter(b => {
    const matchesDate = b.date === selectedDate;
    const matchesStaff = staffFilter === 'all' || b.staffId === staffFilter;
    return matchesDate && matchesStaff;
  });

  // Dynamic Occupancy Calculations
  const activeBookingsCount = filteredBookings.filter(b => b.status !== 'cancelled').length;
  const staffCountForCapacity = staffList.length || 1;
  const activeStaffCount = staffFilter === 'all' ? staffCountForCapacity : 1;
  const totalSlotsCapacity = hours.length * activeStaffCount;
  const currentCapacityTarget = occupancyMode === 'slots' ? totalSlotsCapacity : occupancyGoal;
  const occupancyRate = Math.round((activeBookingsCount / currentCapacityTarget) * 100);

  // Dynamic status-specific color and badge copy
  const getOccupancyVibe = () => {
    if (occupancyRate >= 85) {
      return {
        color: 'from-amber-500 to-rose-500',
        textColor: 'text-rose-600 bg-rose-50 border-rose-100',
        barColor: 'bg-rose-500',
        badge: isAr ? '🔥 كامل العدد اليوم!' : '🔥 Full Capacity Today!',
        text: isAr 
          ? 'إشغال استثنائي ومرتفع جداً! الصالون يعمل بكامل طاقته التشغيلية تقريباً اليوم.' 
          : 'Outstanding booking frequency! The salon is running near its maximum peak capacity.',
      };
    } else if (occupancyRate >= 50) {
      return {
        color: 'from-emerald-400 to-[#14332B]',
        textColor: 'text-emerald-700 bg-emerald-50 border-emerald-100',
        barColor: 'bg-emerald-600',
        badge: isAr ? '👍 إشغال مثالي ومتزن' : '👍 Healthy Occupancy',
        text: isAr 
          ? 'أداء رائع! وتيرة الحجوزات مستقرة وموزعة بشكل ممتاز على فترات اليوم.' 
          : 'Great rhythm! Workloads are evenly distributed across the team slots today.',
      };
    } else {
      return {
        color: 'from-amber-400 to-[#FF5A5F]',
        textColor: 'text-amber-700 bg-amber-50 border-amber-100',
        barColor: 'bg-[#FF5A5F]',
        badge: isAr ? '⚡ وتيرة هادئة' : '⚡ Easy-going Day',
        text: isAr 
          ? 'نسبة الإشغال منخفضة حالياً. جربي إطلاق حملة تسويقية سريعة بخصم مؤقت لملء الفترات المتبقية.' 
          : 'Booking frequency is quiet. Tip: Push a dynamic discount promotion to capture remaining slots.',
      };
    }
  };

  const occupancyVibe = getOccupancyVibe();

  // Find busiest hour slot
  const busiestHour = (() => {
    const counts: Record<string, number> = {};
    hours.forEach(h => {
      counts[h] = filteredBookings.filter(b => b.time === h && b.status !== 'cancelled').length;
    });
    let maxHour = '';
    let maxVal = 0;
    Object.entries(counts).forEach(([h, val]) => {
      if (val > maxVal) {
        maxVal = val;
        maxHour = h;
      }
    });
    return maxVal > 0 ? maxHour : null;
  })();

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone) return;

    const matchedService = services.find(s => s.id === selectedServiceId);
    if (!matchedService) return;

    const newBooking: Booking = {
      id: 'b-' + Math.random().toString(36).substr(2, 9),
      time: selectedTime,
      clientName,
      clientPhone,
      serviceId: selectedServiceId,
      staffId: selectedStaffId,
      duration: matchedService.duration,
      price: matchedService.price,
      status: 'confirmed',
      date: selectedDate,
      notes: bookingNotes
    };

    onAddBooking(newBooking);
    
    // Reset Form
    setClientName('');
    setClientPhone('');
    setBookingNotes('');
    setShowAddModal(false);
  };

  const getServiceName = (id: string, fallback?: string) => {
    const s = services.find(serv => serv.id === id);
    if (s) return s.name;
    if (fallback) return fallback;
    return isAr ? 'مخصصة' : 'Custom';
  };

  const getStaffName = (id: string) => {
    const s = staffList.find(staff => staff.id === id);
    if (!s) return isAr ? 'غير محدد' : 'Not assigned';
    return s.name;
  };

  // Helper to resolve which booking fits in which hour slot
  const getBookingHourSlot = (timeStr: string) => {
    const parts = timeStr.split(':');
    if (parts.length >= 1) {
      const hr = parseInt(parts[0], 10);
      return hr < 10 ? `0${hr}:00` : `${hr}:00`;
    }
    return '12:00';
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, bookingId: string) => {
    setDraggedBookingId(bookingId);
    e.dataTransfer.setData('text/plain', bookingId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedBookingId(null);
    setDragOverHour(null);
  };

  const handleDragOver = (e: React.DragEvent, hour: string) => {
    e.preventDefault();
    if (dragOverHour !== hour) {
      setDragOverHour(hour);
    }
  };

  const handleDragLeave = () => {
    setDragOverHour(null);
  };

  const handleDrop = (e: React.DragEvent, targetHour: string) => {
    e.preventDefault();
    const bId = e.dataTransfer.getData('text/plain') || draggedBookingId;
    if (bId) {
      const b = bookings.find(item => item.id === bId);
      if (b) {
        setRescheduleDetails({
          name: b.clientName,
          oldTime: b.time,
          newTime: targetHour
        });
        onUpdateBookingTime(bId, targetHour);
        setShowRescheduleToast(true);
        // Clear previous timeout and hide after 6 seconds
        setTimeout(() => setShowRescheduleToast(false), 6000);
      } else {
        onUpdateBookingTime(bId, targetHour);
      }
    }
    setDraggedBookingId(null);
    setDragOverHour(null);
  };

  // Format hour label elegantly for Riyadh branch
  const getFormattedHour = (hourStr: string) => {
    const hr = parseInt(hourStr.split(':')[0], 10);
    if (isAr) {
      if (hr === 12) return '١٢:٠٠ م (ظهراً)';
      if (hr > 12) return `${hr - 12}:٠٠ م`;
      return `${hr}:٠٠ ص`;
    } else {
      if (hr === 12) return '12:00 PM (Noon)';
      if (hr > 12) return `${hr - 12}:00 PM`;
      return `${hr}:00 AM`;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* ===== ACTIONS HEADER ===== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-[#E9E7E2]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#FF5A5F]" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm border border-[#E9E7E2] rounded-xl px-3 py-2 bg-[#F6F6F4] focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#FF5A5F]" />
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="text-sm border border-[#E9E7E2] rounded-xl px-3 py-2 bg-[#F6F6F4] focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18]"
            >
              <option value="all">{isAr ? 'كل خبيرات الصالون' : 'All Salon Staff'}</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {getStaffName(s.id)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-[#FF5A5F]/20 flex items-center gap-2 transition-all self-stretch sm:self-auto justify-center cursor-pointer border-none"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addNewBooking')}</span>
        </button>
      </div>

      {/* ===== INNOVATIVE BRAND BANNER FOR DRAG & DROP ===== */}
      <div className="bg-[#FFF0F0] border border-[#FF5A5F]/20 rounded-2xl p-4 text-xs text-[#E04B50] flex gap-3 items-start shadow-sm">
        <Sparkles className="w-5 h-5 text-[#FF5A5F] shrink-0 mt-0.5 animate-pulse" />
        <div>
          <p className="font-bold text-sm text-[#FF5A5F]">
            {isAr ? 'ميزة الجدولة السريعة بالسحب والإفلات 🚀' : 'Instant Rescheduling with Drag & Drop 🚀'}
          </p>
          <p className="text-[11px] text-[#FF5A5F] mt-1 opacity-90 leading-relaxed">
            {isAr 
              ? 'الآن يمكنك تنظيم مواعيد الصالون بسهولة فائقة! اسحبي أي موعد من قائمة الحجوزات أو من المخطط الزمني، وقومي بإفلاته في الساعة المطلوبة وسيتم تحديث وقت الحجز وتأكيده تلقائياً.' 
              : 'Keep your salon calendar in sync effortlessly! Drag any booking card and drop it onto the desired hour row in the timeline grid below to change its time instantly.'}
          </p>
        </div>
      </div>

      {/* ===== RESCHEDULE SUCCESS TOAST ===== */}
      {showRescheduleToast && rescheduleDetails && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs flex gap-3 items-start shadow-md animate-slideIn">
          <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg animate-bounce shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sm text-emerald-900">
              {isAr ? '✓ تم تعديل موعد الحجز بنجاح!' : '✓ Appointment Rescheduled Successfully!'}
            </p>
            <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
              {isAr 
                ? `تم تغيير موعد حجز العميلة (${rescheduleDetails.name}) من الساعة [${rescheduleDetails.oldTime}] إلى الساعة الجديدة [${rescheduleDetails.newTime}] وتأكيده في السحابة.` 
                : `Rescheduled (${rescheduleDetails.name}) from [${rescheduleDetails.oldTime}] to [${rescheduleDetails.newTime}]. New time slot is locked and secured.`}
            </p>
          </div>
          <button 
            type="button"
            onClick={() => setShowRescheduleToast(false)}
            className="text-emerald-500 hover:text-emerald-800 font-bold ms-auto cursor-pointer border-none bg-transparent text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* ===== DAILY OCCUPANCY STATUS BAR ===== */}
      <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#F6F6F4]">
          <div className="space-y-1">
            <h3 className="font-serif text-base font-bold text-[#14332B] flex items-center gap-2">
              <Percent className="w-4.5 h-4.5 text-[#FF5A5F]" />
              <span>{isAr ? 'مؤشر إشغال الصالون اليومي' : 'Live Salon Occupancy Index'}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${occupancyVibe.textColor}`}>
                {occupancyVibe.badge}
              </span>
            </h3>
            <p className="text-xs text-[#6E6A63] font-medium">
              {isAr ? 'تحليل لحظي لحجم الحجوزات ومعدل الضغط في الصالون لليوم المحدد' : 'Real-time booking density and workload stress index for the selected day.'}
            </p>
          </div>

          {/* Toggle Calculation Mode */}
          <div className="flex items-center gap-1 bg-[#F6F6F4] p-1 rounded-xl border border-[#E9E7E2] self-start md:self-auto">
            <button
              type="button"
              onClick={() => setOccupancyMode('slots')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                occupancyMode === 'slots'
                  ? 'bg-white text-[#14332B] shadow-xs'
                  : 'text-[#6E6A63] hover:text-[#1C1B18]'
              }`}
            >
              {isAr ? 'الفترات الزمنية' : 'Time Slots'}
            </button>
            <button
              type="button"
              onClick={() => setOccupancyMode('goal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                occupancyMode === 'goal'
                  ? 'bg-white text-[#14332B] shadow-xs'
                  : 'text-[#6E6A63] hover:text-[#1C1B18]'
              }`}
            >
              {isAr ? 'هدف اليوم' : 'Daily Goal'}
            </button>
          </div>
        </div>

        {/* Dynamic Occupancy Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#6E6A63] tracking-wider">
                {isAr ? 'نسبة الإشغال الحالية' : 'Current Occupancy Rate'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-serif font-bold text-[#14332B] font-mono leading-none">{occupancyRate}%</span>
                <span className="text-xs text-[#6E6A63]">
                  ({activeBookingsCount} {isAr ? 'من أصل' : 'out of'} {currentCapacityTarget} {isAr ? 'حجز نشط' : 'active slots'})
                </span>
              </div>
            </div>
            
            {/* Display busy hours indicator */}
            {busiestHour && (
              <div className="flex items-center gap-1.5 bg-[#FFF0F0] text-[#FF5A5F] px-3 py-1.5 rounded-xl border border-[#FF5A5F]/10 text-xs">
                <Flame className="w-4 h-4 text-amber-500 animate-bounce" />
                <span className="font-bold">
                  {isAr ? `ساعة الذروة اليوم: ${getFormattedHour(busiestHour)}` : `Peak Hour: ${getFormattedHour(busiestHour)}`}
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar Track */}
          <div className="w-full bg-[#F6F6F4] rounded-full h-3.5 overflow-hidden border border-[#E9E7E2]/50 p-0.5 relative">
            <div 
              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${occupancyVibe.color} shadow-inner`}
              style={{ width: `${Math.min(100, Math.max(3, occupancyRate))}%` }}
            />
          </div>

          <p className="text-xs text-[#6E6A63] leading-relaxed">
            {occupancyVibe.text}
          </p>
        </div>

        {/* Grid for Interactive Goal Configuration & Quick Action Promotions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Section A: Configurator based on Mode */}
          <div className="bg-[#F6F6F4]/50 border border-[#E9E7E2] rounded-xl p-4 flex flex-col justify-center space-y-2.5">
            {occupancyMode === 'slots' ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#14332B]">
                  <Sliders className="w-4 h-4 text-[#FF5A5F]" />
                  <span>{isAr ? 'سعة الخبيرات والفلترة' : 'Staff Capacity & Filtering'}</span>
                </div>
                <p className="text-[11px] text-[#6E6A63] leading-relaxed">
                  {isAr 
                    ? `يتم احتساب السعة الكلية تلقائياً بناءً على خبيرات الصالون. السعة الحالية لليوم هي ${totalSlotsCapacity} فترة حجز تابعة لـ ${activeStaffCount} خبيرة تجميل.`
                    : `Capacity is auto-adjusted based on selected staff. Current capacity is ${totalSlotsCapacity} slots for ${activeStaffCount} active specialist(s).`}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#14332B] flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-[#FF5A5F]" />
                    {isAr ? 'هدف الحجوزات اليومي' : 'Daily Booking Goal'}
                  </span>
                  <span className="text-xs font-bold font-mono bg-white border border-[#E9E7E2] px-2.5 py-0.5 rounded-lg text-[#FF5A5F]">
                    {occupancyGoal} {isAr ? 'حجوزات' : 'bookings'}
                  </span>
                </div>
                
                <input 
                  type="range"
                  min="5"
                  max="30"
                  value={occupancyGoal}
                  onChange={(e) => setOccupancyGoal(Number(e.target.value))}
                  className="w-full accent-[#FF5A5F] cursor-pointer h-1.5 bg-[#E9E7E2] rounded-lg"
                />
                
                <p className="text-[10px] text-[#6E6A63] leading-normal">
                  {isAr 
                    ? 'اسحبي المؤشر لتغيير هدف الحجوزات المأمول للصالون ومتابعة تقدم الإنجاز فورياً.'
                    : 'Drag slider to configure custom salon milestone targets and update performance indicators in real-time.'}
                </p>
              </div>
            )}
          </div>

          {/* Section B: Campaign Builder */}
          <div className={`border rounded-xl overflow-hidden transition-all ${
            showCampaignForm
              ? 'border-[#FF5A5F]/30 bg-white shadow-sm'
              : 'border-[#FF5A5F]/10 bg-[#FFF0F0]/40'
          }`}>

            {/* Collapsed header */}
            {!showCampaignForm ? (
              <div className="p-4 space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#14332B] flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-[#FF5A5F]" />
                    {isAr ? 'إطلاق حملة ترويجية ⚡' : 'Launch a Promo Campaign ⚡'}
                  </span>
                  <p className="text-[11px] text-[#6E6A63] leading-relaxed">
                    {isAr
                      ? 'حدّدي اسم الحملة، الفئة المستهدفة، نسبة الخصم، ثم أرسلي للعميلات مباشرة.'
                      : 'Set campaign name, target audience, discount %, then send to clients instantly.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCampaignForm(true)}
                  className="w-full py-2 bg-[#FF5A5F] hover:bg-[#E04B50] text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Flame className="w-3.5 h-3.5" />
                  {isAr ? 'أنشئي حملة جديدة' : 'Create Campaign'}
                </button>
              </div>
            ) : (
              /* ── Expanded campaign form ── */
              <div className="p-4 space-y-3">

                {/* Form header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#14332B] flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-[#FF5A5F]" />
                    {isAr ? 'بناء الحملة' : 'Campaign Builder'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCampaignForm(false)}
                    className="text-[#9CA3AF] hover:text-[#1C1B18] transition-colors"
                  >
                    <span className="text-base leading-none">×</span>
                  </button>
                </div>

                {/* 1 — Campaign title */}
                <div>
                  <label className="block text-[10px] font-bold text-[#6E6A63] uppercase tracking-wide mb-1">
                    {isAr ? 'اسم / عنوان الحملة *' : 'Campaign Title *'}
                  </label>
                  <input
                    value={campaignTitle}
                    onChange={e => setCampaignTitle(e.target.value)}
                    placeholder={isAr ? 'مثال: عرض نهاية الأسبوع — خصم خاص' : 'e.g. Weekend Special Offer'}
                    dir={isAr ? 'rtl' : 'ltr'}
                    className="w-full text-xs px-3 py-2 border border-[#E9E7E2] rounded-lg focus:outline-none focus:border-[#FF5A5F] bg-[#FAFAF8] placeholder:text-[#C9C7C2]"
                  />
                </div>

                {/* 2 — Target audience */}
                <div>
                  <label className="block text-[10px] font-bold text-[#6E6A63] uppercase tracking-wide mb-1.5">
                    {isAr ? 'الفئة المستهدفة' : 'Target Audience'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { val: 'all',      arLabel: 'جميع العميلات', enLabel: 'All Clients',  icon: '👥' },
                      { val: 'vip',      arLabel: 'عميلات VIP',     enLabel: 'VIP Only',     icon: '👑' },
                      { val: 'inactive', arLabel: 'غير نشطات',      enLabel: 'Inactive 30d', icon: '💤' },
                    ] as const).map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setCampaignAudience(opt.val)}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all text-center ${
                          campaignAudience === opt.val
                            ? 'bg-[#FF5A5F] text-white border-[#FF5A5F]'
                            : 'bg-white text-[#6E6A63] border-[#E9E7E2] hover:border-[#FF5A5F]'
                        }`}
                      >
                        <span className="block text-sm mb-0.5">{opt.icon}</span>
                        {isAr ? opt.arLabel : opt.enLabel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3 — Discount % */}
                <div>
                  <label className="block text-[10px] font-bold text-[#6E6A63] uppercase tracking-wide mb-1.5">
                    {isAr ? 'نسبة الخصم' : 'Discount %'}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white border border-[#E9E7E2] rounded-lg overflow-hidden">
                      <button type="button" onClick={() => setPromoDiscount(p => Math.max(5, p - 5))}
                        className="px-3 py-1.5 text-[#6E6A63] hover:bg-[#F5F4F1] text-sm font-bold transition-colors border-none bg-transparent">−</button>
                      <span className="px-3 text-sm font-black text-[#FF5A5F] font-mono min-w-[3rem] text-center">{promoDiscount}%</span>
                      <button type="button" onClick={() => setPromoDiscount(p => Math.min(60, p + 5))}
                        className="px-3 py-1.5 text-[#6E6A63] hover:bg-[#F5F4F1] text-sm font-bold transition-colors border-none bg-transparent">+</button>
                    </div>
                    {/* Preset chips */}
                    <div className="flex gap-1">
                      {[10, 20, 30, 50].map(v => (
                        <button key={v} type="button" onClick={() => setPromoDiscount(v)}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
                            promoDiscount === v ? 'bg-[#FF5A5F] text-white border-[#FF5A5F]' : 'bg-white text-[#6E6A63] border-[#E9E7E2] hover:border-[#FF5A5F]'
                          }`}>{v}%</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4 — Channel */}
                <div>
                  <label className="block text-[10px] font-bold text-[#6E6A63] uppercase tracking-wide mb-1.5">
                    {isAr ? 'قناة الإرسال' : 'Channel'}
                  </label>
                  <div className="flex gap-1.5">
                    {([
                      { val: 'whatsapp', label: '📱 واتساب' },
                      { val: 'both',     label: '📱+💬 واتساب + SMS' },
                    ] as const).map(ch => (
                      <button key={ch.val} type="button" onClick={() => setCampaignChannel(ch.val)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          campaignChannel === ch.val
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white text-[#6E6A63] border-[#E9E7E2] hover:border-emerald-400'
                        }`}>{ch.label}</button>
                    ))}
                  </div>
                </div>

                {/* 5 — Message preview */}
                {campaignTitle && (
                  <div className="bg-[#F5F4F1] rounded-lg px-3 py-2.5 space-y-1">
                    <p className="text-[10px] font-bold text-[#6E6A63] uppercase tracking-wide">
                      {isAr ? 'معاينة الرسالة' : 'Message Preview'}
                    </p>
                    <p className="text-[11px] text-[#1C1B18] leading-relaxed" dir="rtl">
                      {isAr
                        ? `🌸 عرض خاص من صالوننا!\n«${campaignTitle}»\nخصم ${promoDiscount}% على جميع خدماتنا ${
                            campaignAudience === 'vip' ? 'لعميلاتنا المميزات' :
                            campaignAudience === 'inactive' ? 'نشتاق إليكِ، عودي إلينا' : 'لفترة محدودة'
                          }.\nاحجزي الآن عبر رابط الصالون 💇‍♀️`
                        : `🌸 Special offer from our salon!\n"${campaignTitle}"\n${promoDiscount}% off ${
                            campaignAudience === 'vip' ? 'for our VIP clients' :
                            campaignAudience === 'inactive' ? "— we miss you, come back!" : 'for a limited time'
                          }.\nBook now via our salon link 💇‍♀️`}
                    </p>
                  </div>
                )}

                {/* Launch button */}
                <button
                  type="button"
                  disabled={!campaignTitle.trim()}
                  onClick={() => {
                    if (!campaignTitle.trim()) return;
                    setShowPromoSuccess(true);
                    setShowCampaignForm(false);
                    setCampaignTitle('');
                    setTimeout(() => setShowPromoSuccess(false), 8000);
                  }}
                  className="w-full py-2.5 bg-[#FF5A5F] hover:bg-[#E04B50] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isAr
                    ? `أطلقي الحملة إلى ${campaignAudience === 'all' ? 'جميع العميلات' : campaignAudience === 'vip' ? 'عميلات VIP' : 'العميلات غير النشطات'}`
                    : `Launch to ${campaignAudience === 'all' ? 'all clients' : campaignAudience === 'vip' ? 'VIP clients' : 'inactive clients'}`}
                </button>

              </div>
            )}
          </div>
        </div>

        {/* Promo blast success toast alert inside the component */}
        {showPromoSuccess && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3.5 text-xs flex gap-2.5 items-start animate-slideIn">
            <Bell className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
            <div className="space-y-1">
              <p className="font-bold">
                {isAr ? '📢 تم إطلاق الحملة الترويجية بنجاح!' : '📢 Promo Blast Sent Successfully!'}
              </p>
              <p className="opacity-90 leading-relaxed text-[11px]">
                {isAr 
                  ? `تم إرسال رسائل ترويجية بخصم بقيمة ${promoDiscount}% لجميع عميلات الصالون لحثهن على حجز الفترات الزمنية الشاغرة المتبقية لليوم.`
                  : `A limited-time ${promoDiscount}% discount promotion has been sent to our client database via SMS. Expect an influx of new bookings shortly!`}
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setShowPromoSuccess(false)}
              className="text-emerald-500 hover:text-emerald-800 text-sm font-bold ms-auto cursor-pointer border-none bg-transparent"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* ===== PEAK HOURS / COMPLETED / NO-SHOW KPIs ===== */}
      {(() => {
        const completedCount = filteredBookings.filter(b => b.status === 'attended').length;
        const noShowCount    = filteredBookings.filter(b => b.status === 'no_show').length;
        const totalForDay    = filteredBookings.length;

        // peak hours: top 3 hours by booking count
        const hourCounts: Record<string, number> = {};
        filteredBookings.filter(b => b.status !== 'cancelled').forEach(b => {
          const slot = getBookingHourSlot(b.time);
          hourCounts[slot] = (hourCounts[slot] || 0) + 1;
        });
        const sortedHours = Object.entries(hourCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* أوقات الذروة */}
            <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{isAr ? 'أوقات الذروة' : 'Peak Hours'}</p>
                  <p className="text-[10px] text-slate-400">{isAr ? 'الفترات الأكثر ازدحاماً اليوم' : 'Busiest slots today'}</p>
                </div>
              </div>
              {sortedHours.length > 0 ? (
                <div className="space-y-2">
                  {sortedHours.map(([hour, count], i) => (
                    <div key={hour} className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 ${
                        i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-amber-400' : 'bg-amber-300'
                      }`}>{i + 1}</span>
                      <span className="text-xs font-bold font-mono text-slate-700 flex-1">{getFormattedHour(hour)}</span>
                      <span className="text-[10px] font-black font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {count} {isAr ? 'حجز' : 'bookings'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-300 italic">{isAr ? 'لا توجد حجوزات بعد' : 'No bookings yet'}</p>
              )}
            </div>

            {/* الحجوزات المكتملة */}
            <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{isAr ? 'الحجوزات المكتملة' : 'Completed Bookings'}</p>
                  <p className="text-[10px] text-slate-400">{isAr ? 'حضرت العميلة فعلياً' : 'Client attended'}</p>
                </div>
              </div>
              <div className="flex items-end justify-between mt-2">
                <span className="text-4xl font-black font-mono text-emerald-600">{completedCount}</span>
                <div className="text-end">
                  <p className="text-[10px] text-slate-400">{isAr ? 'من إجمالي' : 'out of'}</p>
                  <p className="text-lg font-black font-mono text-slate-700">{totalForDay}</p>
                  <p className="text-[9px] text-slate-400">{isAr ? 'حجز اليوم' : 'today\'s bookings'}</p>
                </div>
              </div>
              <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: totalForDay > 0 ? `${Math.round((completedCount / totalForDay) * 100)}%` : '0%' }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 text-end font-mono font-bold">
                {totalForDay > 0 ? `${Math.round((completedCount / totalForDay) * 100)}%` : '—'}
              </p>
            </div>

            {/* NO SHOW */}
            <div className={`rounded-2xl p-5 shadow-sm border ${noShowCount > 0 ? 'bg-slate-50 border-slate-200' : 'bg-white border-[#E9E7E2]'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${noShowCount > 0 ? 'bg-slate-200' : 'bg-slate-50'}`}>
                  <UserX className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">NO SHOW</p>
                  <p className="text-[10px] text-slate-400">{isAr ? 'حجزت ولم تحضر' : 'Booked but did not attend'}</p>
                </div>
              </div>
              <div className="flex items-end justify-between mt-2">
                <span className={`text-4xl font-black font-mono ${noShowCount > 0 ? 'text-slate-600' : 'text-slate-300'}`}>
                  {noShowCount}
                </span>
                <div className="text-end">
                  <p className="text-[10px] text-slate-400">{isAr ? 'من إجمالي' : 'out of'}</p>
                  <p className="text-lg font-black font-mono text-slate-700">{totalForDay}</p>
                  <p className="text-[9px] text-slate-400">{isAr ? 'حجز اليوم' : 'today\'s bookings'}</p>
                </div>
              </div>
              <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full transition-all duration-700"
                  style={{ width: totalForDay > 0 ? `${Math.round((noShowCount / totalForDay) * 100)}%` : '0%' }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 text-end font-mono font-bold">
                {totalForDay > 0 ? `${Math.round((noShowCount / totalForDay) * 100)}%` : '—'}
              </p>
              {noShowCount > 0 && (
                <div className="mt-3 border-t border-slate-200 pt-3 space-y-2">
                  {filteredBookings.filter(b => b.status === 'no_show').map(b => (
                    <div key={b.id} className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                        {b.clientName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{b.clientName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{b.time} · {getServiceName(b.serviceId)}</p>
                      </div>
                      <a
                        href={getWhatsAppLink(b.clientPhone, isAr
                          ? `أهلاً ${b.clientName}، لاحظنا غيابك عن موعدك اليوم الساعة ${b.time}. نتمنى أن تكوني بخير، ونسعد بإعادة جدولة موعدك 🌸`
                          : `Hi ${b.clientName}, we noticed you missed your appointment at ${b.time}. We hope you're well — we'd love to reschedule! 🌸`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all"
                        title={isAr ? 'تواصل عبر واتساب' : 'Contact via WhatsApp'}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                  <p className="text-[9px] text-slate-400">
                    {isAr ? '⚠ راجعي سياسة الإلغاء المتأخر والتأكيد التلقائي' : '⚠ Review late-cancel & auto-confirm policy'}
                  </p>
                </div>
              )}
            </div>

          </div>
        );
      })()}

      {/* ===== MOBILE ACCESSIBILITY TABS ===== */}
      <div className="flex lg:hidden bg-white p-1 rounded-xl border border-[#E9E7E2] gap-1">
        <button
          onClick={() => setMobileTab('timeline')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
            mobileTab === 'timeline'
              ? 'bg-[#FF5A5F] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>{isAr ? 'المخطط الزمني والسحب' : 'Timeline Grid'}</span>
        </button>
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
            mobileTab === 'list'
              ? 'bg-[#FF5A5F] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <List className="w-4 h-4" />
          <span>{isAr ? 'قائمة الحجوزات اليومية' : 'Daily List'}</span>
        </button>
      </div>

      {/* ===== MAIN WORKSPACE GRID ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: THE BOOKING CARDS POOL / LIST VIEW */}
        <div className={`lg:col-span-4 bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm space-y-4 ${
          mobileTab === 'list' ? 'block' : 'hidden lg:block'
        }`}>
          <div className="flex justify-between items-center pb-2 border-b border-[#F6F6F4]">
            <h3 className="font-serif text-sm font-bold text-[#14332B] flex items-center gap-2">
              <List className="w-4 h-4 text-[#FF5A5F]" />
              <span>{isAr ? 'جميع الحجوزات' : 'All Bookings'}</span>
            </h3>
            <span className="text-[10px] bg-[#FFF0F0] text-[#FF5A5F] font-bold px-2 py-0.5 rounded-full">
              {allBookingsSorted.length}
            </span>
          </div>

          {allBookingsSorted.length === 0 ? (
            <div className="text-center py-12 text-[#6E6A63] space-y-2">
              <CalendarIcon className="w-10 h-10 text-[#FF5A5F]/20 mx-auto" />
              <p className="text-xs font-medium">{isAr ? 'لا توجد حجوزات مسجلة بعد.' : 'No bookings yet.'}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {allBookingsSorted.map((b) => {
                const isCurrentlyDragged = draggedBookingId === b.id;
                return (
                  <div 
                    key={b.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, b.id)}
                    onDragEnd={handleDragEnd}
                    className={`group p-3 rounded-xl border border-[#E9E7E2] bg-white transition-all shadow-sm select-none cursor-grab active:cursor-grabbing hover:border-[#FF5A5F] hover:shadow-md ${
                      isCurrentlyDragged ? 'opacity-40 border-dashed border-[#FF5A5F]' : ''
                    }`}
                    title={isAr ? 'اسحبي الموعد لتعديل وقته' : 'Drag to reschedule'}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-[#FF5A5F] transition-colors shrink-0" />
                        <span className="font-bold text-xs text-[#1C1B18] group-hover:text-[#FF5A5F] transition-colors">
                          {b.clientName}
                        </span>
                        {b.source === 'whatsapp' && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 shrink-0">
                            <MessageCircle className="w-2.5 h-2.5" /> واتساب
                          </span>
                        )}
                        {b.source === 'online' && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                            🌐 {isAr ? 'أونلاين' : 'Online'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FFF0F0] text-[#FF5A5F] font-mono">
                          {b.time}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">{b.date}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500 space-y-1">
                      <p>💇‍♀️ <span className="font-semibold text-slate-700">{getServiceName(b.serviceId, b.serviceName)}</span></p>
                      <p>✨ {isAr ? 'الخبيرة:' : 'Stylist:'} <span className="font-semibold text-[#FF5A5F]">{getStaffName(b.staffId)}</span></p>
                      {b.price > 0 && (
                        <p className="flex items-center gap-1">
                          <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md text-[11px]">
                            💰 {b.price.toLocaleString()} {isAr ? 'ريال' : 'SAR'}
                          </span>
                          {b.source === 'online' && (
                            <span className="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-full">
                              🌐 {isAr ? 'أونلاين' : 'Online'}
                            </span>
                          )}
                        </p>
                      )}
                      {b.notes && (
                        <p className="text-[10px] text-[#FF5A5F] bg-[#FFF0F0] px-1.5 py-0.5 rounded inline-block mt-1">
                          📝 {b.notes}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#F6F6F4] flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={b.status}
                          onChange={(e) => onUpdateStatus(b.id, e.target.value as any)}
                          className="text-[10px] border border-[#E9E7E2] rounded-lg px-2 py-1 bg-[#F6F6F4] text-[#1C1B18] focus:outline-none"
                        >
                          <option value="pending">{t('pending')}</option>
                          <option value="confirmed">{t('confirmed')}</option>
                          <option value="attended">{t('attended')}</option>
                          <option value="cancelled">{t('cancelled')}</option>
                          <option value="no_show">{isAr ? 'لم يحضر' : 'No Show'}</option>
                        </select>

                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          b.status === 'attended'  ? 'bg-emerald-50 text-emerald-700' :
                          b.status === 'confirmed' ? 'bg-rose-50 text-rose-700' :
                          b.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                          b.status === 'no_show'   ? 'bg-slate-100 text-slate-500' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {b.status === 'attended' ? t('attended') : b.status === 'confirmed' ? t('confirmed') : b.status === 'cancelled' ? t('cancelled') : b.status === 'no_show' ? (isAr ? 'لم يحضر' : 'No Show') : t('pending')}
                        </span>
                      </div>

                      <button 
                        onClick={() => handleOpenReminderModal(b)}
                        className="w-full py-1.5 rounded-lg bg-rose-50/70 hover:bg-[#FF5A5F] hover:text-white text-[#FF5A5F] border border-rose-100 flex items-center justify-center gap-1.5 transition-all text-[10px] font-bold cursor-pointer"
                        title={isAr ? 'إرسال تذكير بالموعد للعميلة' : 'Send appointment reminder'}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إرسال تذكير بالموعد' : 'Send Appointment Reminder'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: INTERACTIVE DRAG-AND-DROP TIMELINE GRID */}
        <div className={`lg:col-span-8 bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm space-y-4 ${
          mobileTab === 'timeline' ? 'block' : 'hidden lg:block'
        }`}>
          <div className="flex justify-between items-center pb-2 border-b border-[#F6F6F4]">
            <h3 className="font-serif text-sm font-bold text-[#14332B] flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#FF5A5F]" />
              <span>{isAr ? 'المخطط الزمني لليوم والساعات' : 'Daily Hours & Timeline'}</span>
            </h3>
            <span className="text-[10px] text-[#6E6A63] font-medium font-mono">
              {selectedDate}
            </span>
          </div>

          {/* Timeline Slots Container */}
          <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
            {hours.map((hour) => {
              // Find bookings that belong to this hour slot (e.g. 10:00 -> matches times like 10:00, 10:15, 10:30, etc.)
              const slotBookings = filteredBookings.filter(b => getBookingHourSlot(b.time) === hour);
              const isOver = dragOverHour === hour;

              return (
                <div 
                  key={hour}
                  onDragOver={(e) => handleDragOver(e, hour)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, hour)}
                  className={`flex items-start gap-4 p-3 rounded-2xl border transition-all duration-200 ${
                    isOver 
                      ? 'border-[#FF5A5F] bg-[#FFF0F0] scale-[1.01] shadow-md shadow-[#FF5A5F]/10 ring-2 ring-[#FF5A5F]/20' 
                      : 'border-[#E9E7E2] bg-slate-50/40 hover:bg-slate-50'
                  }`}
                >
                  {/* Hour Label */}
                  <div className="w-20 text-right shrink-0 pt-1">
                    <span className="text-xs font-mono font-bold text-slate-800 bg-slate-200/60 px-2 py-1 rounded-lg">
                      {getFormattedHour(hour)}
                    </span>
                  </div>

                  {/* Drop zone / Slot Content */}
                  <div className="flex-1 min-h-[50px] flex flex-col gap-2 justify-center">
                    {slotBookings.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {slotBookings.map((b) => (
                          <div 
                            key={b.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, b.id)}
                            onDragEnd={handleDragEnd}
                            className="bg-white border border-[#E9E7E2] rounded-xl p-3 shadow-none flex justify-between items-start gap-2 hover:border-[#FF5A5F] hover:shadow-sm cursor-grab active:cursor-grabbing group"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#FF5A5F] shrink-0" />
                                <span className="font-bold text-xs text-slate-800">{b.clientName}</span>
                                {b.source === 'whatsapp' && (
                                  <span className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                                    <MessageCircle className="w-2 h-2" /> WA
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium">
                                💇‍♀️ {getServiceName(b.serviceId, b.serviceName)}
                              </p>
                              <p className="text-[9px] text-[#FF5A5F]">
                                👩‍🎨 {isAr ? 'الخبيرة:' : 'Stylist:'} {getStaffName(b.staffId)}
                              </p>
                            </div>

                            <div className="text-right space-y-1 shrink-0 flex flex-col items-end">
                              <span className="text-[10px] font-mono font-bold block text-[#FF5A5F] bg-[#FFF0F0] px-1.5 py-0.5 rounded">
                                {b.time}
                              </span>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded block text-center w-full ${
                                b.status === 'attended'  ? 'bg-emerald-50 text-emerald-700' :
                                b.status === 'confirmed' ? 'bg-rose-50 text-rose-700' :
                                b.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                                b.status === 'no_show'   ? 'bg-slate-100 text-slate-500' :
                                'bg-amber-50 text-amber-700'
                              }`}>
                                {b.status === 'attended' ? t('attended') : b.status === 'confirmed' ? t('confirmed') : b.status === 'cancelled' ? t('cancelled') : b.status === 'no_show' ? (isAr ? 'لم يحضر' : 'No Show') : t('pending')}
                              </span>

                              <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenReminderModal(b); }}
                                className="p-1 rounded-md bg-rose-50/70 hover:bg-[#FF5A5F] hover:text-white text-[#FF5A5F] border border-rose-100 flex items-center justify-center gap-1 transition-all text-[9px] font-bold cursor-pointer w-full mt-1"
                                title={isAr ? 'إرسال تذكير' : 'Send Reminder'}
                              >
                                <MessageSquare className="w-2.5 h-2.5" />
                                <span>{isAr ? 'تذكير' : 'Remind'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`text-center py-2 rounded-xl text-[10px] font-medium border border-dashed transition-all ${
                        isOver 
                          ? 'text-[#E04B50] border-[#FF5A5F]/50 bg-[#FF5A5F]/5' 
                          : 'text-[#6E6A63]/50 border-slate-300/40'
                      }`}>
                        {isOver 
                          ? (isAr ? '✓ اسحبي الموعد هنا للإسقاط والجدولة' : '✓ Drop here to reschedule') 
                          : (isAr ? 'لا توجد حجوزات في هذه الساعة' : 'No bookings in this hour')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ===== ADD BOOKING MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#1C1B18]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E9E7E2] w-full max-w-lg p-6 shadow-2xl relative animate-scaleIn">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 left-4 p-2 rounded-full hover:bg-[#F6F6F4] text-[#6E6A63] cursor-pointer border-none bg-transparent"
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>

            <h3 className="font-serif text-xl font-bold text-[#14332B] mb-5">{t('addNewBooking')}</h3>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-2">
                  {isAr ? 'اسم العميلة الكريم *' : 'Client Name *'}
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-3 w-4 h-4 text-[#6E6A63] rtl:left-auto rtl:right-3 ltr:right-auto ltr:left-3" />
                  <input 
                    type="text" 
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder={isAr ? 'مثل: سارة المطيري' : 'e.g. Sarah Smith'}
                    className="w-full text-sm py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] rtl:pl-4 rtl:pr-10 ltr:pr-4 ltr:pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-2">
                  {isAr ? 'رقم جوال العميلة *' : 'Client Phone *'}
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 w-4 h-4 text-[#6E6A63] rtl:left-auto rtl:right-3 ltr:right-auto ltr:left-3" />
                  <input 
                    type="tel" 
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full text-sm py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] rtl:pl-4 rtl:pr-10 ltr:pr-4 ltr:pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C1B18] mb-2">
                    {isAr ? 'الخدمة المطلوبة *' : 'Required Service *'}
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18] bg-white"
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{getServiceName(s.id)} ({s.price} {t('currency')})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1B18] mb-2">
                    {isAr ? 'خبير التجميل *' : 'Beautician / Stylist *'}
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18] bg-white"
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {getStaffName(s.id)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'التاريخ *' : 'Date *'}</label>
                  <input 
                    type="date" 
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'الوقت *' : 'Time *'}</label>
                  <input 
                    type="time" 
                    required
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-2">{t('notes')}</label>
                <textarea 
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder={isAr ? 'أية ملاحظات أو تفضيلات خاصة بالعميلة...' : 'Any special customer notes or instructions...'}
                  rows={2}
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#FF5A5F]/20 transition-all cursor-pointer border-none"
                >
                  {isAr ? 'حفظ الموعد وتأكيده' : 'Save & Confirm Appointment'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 border border-[#E9E7E2] text-[#6E6A63] hover:bg-[#F6F6F4] font-bold text-sm rounded-xl transition-all cursor-pointer bg-transparent"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== SEND REMINDER MODAL ===== */}
      {selectedBookingForReminder && (
        <div className="fixed inset-0 bg-[#1C1B18]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E9E7E2] w-full max-w-lg p-6 shadow-2xl relative animate-scaleIn">
            <button 
              onClick={() => setSelectedBookingForReminder(null)}
              className="absolute top-4 left-4 p-2 rounded-full hover:bg-[#F6F6F4] text-[#6E6A63] cursor-pointer border-none bg-transparent"
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-[#FF5A5F]" />
              <h3 className="font-serif text-xl font-bold text-[#14332B]">
                {isAr ? 'إرسال تذكير بالموعد' : 'Send Appointment Reminder'}
              </h3>
            </div>

            {/* Client card summary */}
            <div className="bg-[#F6F6F4] p-3 rounded-2xl border border-[#E9E7E2] text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-[#6E6A63]">{isAr ? 'العميلة:' : 'Client:'}</span>
                <span className="font-bold text-[#1C1B18]">{selectedBookingForReminder.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6E6A63]">{isAr ? 'رقم الجوال:' : 'Phone:'}</span>
                <span className="font-bold text-[#1C1B18] font-mono">{selectedBookingForReminder.clientPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6E6A63]">{isAr ? 'الخدمة والخبيرة:' : 'Service & Stylist:'}</span>
                <span className="font-bold text-[#1C1B18]">
                  {getServiceName(selectedBookingForReminder.serviceId)} ({getStaffName(selectedBookingForReminder.staffId)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6E6A63]">{isAr ? 'الموعد:' : 'Time:'}</span>
                <span className="font-bold text-[#FF5A5F] font-mono">
                  {selectedBookingForReminder.date} @ {selectedBookingForReminder.time}
                </span>
              </div>
            </div>

            {/* Template Selector */}
            <div className="space-y-2 mb-4">
              <label className="block text-xs font-bold text-[#1C1B18]">
                {isAr ? 'اختر نموذج الرسالة:' : 'Select Message Template:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleTemplateChange('standard')}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    reminderTemplateType === 'standard'
                      ? 'bg-[#14332B] text-white border-[#14332B]'
                      : 'bg-[#F6F6F4] text-[#6E6A63] border-[#E9E7E2] hover:bg-[#E9E7E2]'
                  }`}
                >
                  {isAr ? 'تذكير ودّي' : 'Friendly'}
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateChange('detailed')}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    reminderTemplateType === 'detailed'
                      ? 'bg-[#14332B] text-white border-[#14332B]'
                      : 'bg-[#F6F6F4] text-[#6E6A63] border-[#E9E7E2] hover:bg-[#E9E7E2]'
                  }`}
                >
                  {isAr ? 'حجز تفصيلي' : 'Detailed'}
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateChange('vip')}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    reminderTemplateType === 'vip'
                      ? 'bg-[#14332B] text-white border-[#14332B]'
                      : 'bg-[#F6F6F4] text-[#6E6A63] border-[#E9E7E2] hover:bg-[#E9E7E2]'
                  }`}
                >
                  {isAr ? 'ترحيب VIP' : 'VIP Pamper'}
                </button>
              </div>
            </div>

            {/* Editable text area */}
            <div className="space-y-2 mb-4">
              <label className="block text-xs font-bold text-[#1C1B18]">
                {isAr ? 'محتوى رسالة التذكير (قابل للتعديل):' : 'Reminder Content (Editable):'}
              </label>
              <textarea
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                rows={4}
                className="w-full text-sm px-3 py-2 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] bg-white text-[#1C1B18]"
              />
            </div>

            {/* Status alerts */}
            {reminderStatusMessage && (
              <div className={`p-3 rounded-xl mb-4 text-xs font-bold flex items-center gap-2 ${
                reminderStatusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{reminderStatusMessage.text}</span>
              </div>
            )}

            {/* Delivery Action Buttons */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={getWhatsAppLink(selectedBookingForReminder.clientPhone, reminderMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setReminderStatusMessage({
                      type: 'success',
                      text: isAr ? 'تم فتح تطبيق واتساب لإرسال التذكير بنجاح! ✅' : 'WhatsApp app opened to send the reminder! ✅'
                    });
                  }}
                  className="flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer no-underline"
                >
                  <MessageCircle className="w-4 h-4 fill-white animate-bounce" />
                  <span>{isAr ? 'واتساب WhatsApp' : 'Send WhatsApp'}</span>
                </a>

                <a
                  href={getSmsLink(selectedBookingForReminder.clientPhone, reminderMessage)}
                  onClick={() => {
                    setReminderStatusMessage({
                      type: 'success',
                      text: isAr ? 'تم إعداد وإرسال رسالة SMS للعميل! 📱' : 'SMS client launched successfully! 📱'
                    });
                  }}
                  className="flex items-center justify-center gap-2 py-3 bg-[#007AFF] hover:bg-[#0069d9] text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer no-underline"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{isAr ? 'رسالة نصية SMS' : 'Send SMS'}</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReminderStatusMessage({
                    type: 'success',
                    text: isAr ? 'تم محاكاة إرسال تذكير تلقائي بنجاح! 🚀📱' : 'Simulated automated reminder sent successfully! 🚀📱'
                  });
                }}
                className="w-full py-2.5 border border-dashed border-[#14332B] hover:bg-[#14332B]/5 text-[#14332B] font-bold text-xs rounded-xl transition-all cursor-pointer bg-transparent mt-2"
              >
                {isAr ? 'محاكاة إرسال تذكير ذكي تلقائي' : 'Simulate Auto Intelligent Reminder'}
              </button>

              <button
                type="button"
                onClick={() => setSelectedBookingForReminder(null)}
                className="w-full py-2.5 text-slate-400 hover:text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer bg-transparent border-none mt-1"
              >
                {isAr ? 'إغلاق نافذة التذكير' : 'Close Reminder Panel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
