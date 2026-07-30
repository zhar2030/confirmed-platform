import React, { useState } from 'react';
import { Staff } from '../types';
import { Plus, Award, ShieldCheck, Lock, Unlock, Copy, Check, Send, ShieldAlert, Users, DollarSign, TrendingUp, Percent, Edit2, Save } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface StaffManagerProps {
  staffList: Staff[];
  onAddStaff: (staff: Staff) => void;
  onUpdateStaff?: (staff: Staff) => void;
}

export default function StaffManager({ 
  staffList, 
  onAddStaff, 
  onUpdateStaff 
}: StaffManagerProps) {
  const { t, isAr } = useLanguage();
  const [activeTab, setActiveTab] = useState<'team' | 'commissions'>('team');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Commission management state (rate per staff, stored locally)
  const [commissionRates, setCommissionRates] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('confirmed_commission_rates') || '{}'); } catch { return {}; }
  });
  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(10);

  const getCommissionRate = (staffId: string) => commissionRates[staffId] ?? 10;

  const saveCommissionRate = (staffId: string, rate: number) => {
    const updated = { ...commissionRates, [staffId]: rate };
    setCommissionRates(updated);
    localStorage.setItem('confirmed_commission_rates', JSON.stringify(updated));
    setEditingCommission(null);
  };
  
  // Simulated Email Dispatch state for staff onboarding
  const [sentEmailLog, setSentEmailLog] = useState<{
    staffName: string;
    email: string;
    phone: string;
    username: string;
    token: string;
    link: string;
  } | null>(null);

  // Form State
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState(isAr ? 'خبيرة شعر' : 'Hair Stylist');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffUsername, setStaffUsername] = useState('');

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName) return;

    const emailVal = staffEmail || `${staffUsername || 'user'}@confirmed.sa`;
    const phoneVal = staffPhone || '0550000000';
    const usernameVal = staffUsername || staffName.toLowerCase().replace(/\s+/g, '.');
    const secureToken = 'token_' + Math.random().toString(36).substring(2, 8);

    const newStaff: Staff = {
      id: 'e-' + Math.random().toString(36).substring(2, 11),
      name: staffName,
      role: staffRole,
      bookingsToday: 0,
      email: emailVal,
      phone: phoneVal,
      isActive: true,
      username: usernameVal,
      secureLinkToken: secureToken
    };

    onAddStaff(newStaff);
    
    // Reset Form
    setStaffName('');
    setStaffRole(isAr ? 'خبيرة شعر' : 'Hair Stylist');
    setStaffEmail('');
    setStaffPhone('');
    setStaffUsername('');
    setShowAddModal(false);
  };

  const getStaffName = (id: string, defaultName: string) => {
    if (isAr) return defaultName;
    switch(id) {
      case 'e1': return 'Amal';
      case 'e2': return 'Dalal';
      case 'e3': return 'Shahad';
      case 'e4': return 'Jawahir';
      default: return defaultName;
    }
  };

  const getStaffRole = (id: string, defaultRole: string) => {
    if (isAr) return defaultRole;
    switch(id) {
      case 'e1': return 'Hair Expert';
      case 'e2': return 'Spa Specialist';
      case 'e3': return 'Nails Care Technician';
      case 'e4': return 'Professional Makeup Artist';
      default: {
        if (defaultRole === 'خبيرة شعر') return 'Hair Stylist';
        if (defaultRole === 'خبيرة صبغات') return 'Hair Treatment Expert';
        if (defaultRole === 'خبيرة مكياج') return 'Makeup Artist';
        if (defaultRole === 'فنية أظافر') return 'Nail Tech';
        if (defaultRole === 'أخصائية بشرة وسبا') return 'Spa & Facialist';
        if (defaultRole === 'موظفة استقبال') return 'Receptionist';
        return defaultRole;
      }
    }
  };

  const handleToggleActive = (s: Staff) => {
    if (onUpdateStaff) {
      onUpdateStaff({
        ...s,
        isActive: s.isActive === undefined ? false : !s.isActive
      });
    }
  };

  const handleSendOnboardingLink = (s: Staff) => {
    const email = s.email || `${s.username || s.id}@confirmed.sa`;
    const phone = s.phone || '0550000000';
    const username = s.username || s.id;
    const token = s.secureLinkToken || 'token_demo_' + Math.random().toString(36).substring(2, 8);
    const link = `https://confirmed.sa/login?token=${token}`;

    setSentEmailLog({
      staffName: getStaffName(s.id, s.name),
      email,
      phone,
      username,
      token,
      link
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ===== SECURITY INFORMATION BANNER ===== */}
      <div className="bg-[#14332B] text-white p-6 rounded-3xl border border-[#14332B] shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF5A5F]/10 rounded-full blur-2xl" />
        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4 animate-pulse" />
            <span>{isAr ? 'بروتوكول أمان الطاقم نشط' : 'Staff Security Protocol Active'}</span>
          </div>
          <h2 className="font-serif text-xl md:text-2xl font-bold text-white">
            {isAr ? 'إدارة حماية وصلاحيات خبيرات التجميل' : 'Staff Security & Permissions Hub'}
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isAr 
              ? 'تتيح لكِ هذه اللوحة توظيف خبيرات التجميل وتعديل صلاحيات وصولهن لصالونكِ فورياً. يمكنكِ أيضاً إرسال رابط تسجيل دخول آمن ومشفّر بنظام التوثيق الثنائي (2FA) عبر البريد الإلكتروني والجوال لضمان حماية بيانات الحجوزات والعملاء.'
              : 'This console allows you to onboard salon experts and configure their dashboard access permissions instantly. Send secure, single-use login URLs backed by mandatory two-factor authentication (2FA) to protect client and salon records.'}
          </p>
        </div>
        <div className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl p-4 text-xs font-mono shrink-0">
          <span className="block text-slate-300">🛡️ Cipher: AES-256 + bcrypt</span>
          <span className="block text-slate-300">📱 Verification: SMS / Email OTP</span>
          <span className="block text-slate-300">👥 Roles: Multi-tier Permissions</span>
        </div>
      </div>

      {/* ===== TAB NAVIGATION ===== */}
      <div className="flex border-b border-[#E9E7E2] gap-1 select-none bg-white rounded-t-2xl px-2">
        <button
          onClick={() => setActiveTab('team')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'team' ? 'border-[#FF5A5F] text-[#FF5A5F]' : 'border-transparent text-[#6E6A63] hover:text-[#1C1B18]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isAr ? 'إدارة الطاقم' : 'Team Management'}</span>
        </button>
        <button
          onClick={() => setActiveTab('commissions')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'commissions' ? 'border-[#FF5A5F] text-[#FF5A5F]' : 'border-transparent text-[#6E6A63] hover:text-[#1C1B18]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>{isAr ? 'إدارة العمولات' : 'Commission Management'}</span>
        </button>
      </div>

      {/* ===== TAB: TEAM MANAGEMENT ===== */}
      {activeTab === 'team' && (
      <div className="space-y-6">
        {/* ===== HEADER BAR ===== */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-[#E9E7E2]">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#14332B]">{isAr ? 'قائمة خبيرات التجميل ومستويات الوصول' : 'Salon Expert Directory & Access Levels'}</h3>
            <p className="text-xs text-[#6E6A63] mt-1">
              {isAr 
                ? `طاقم العمل المسجل لفرع الصالون الرئيسي (${staffList.length} خبيرات وموظفات)` 
                : `Registered workforce for main salon branch (${staffList.length} staff members)`}
            </p>
          </div>

          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-[#FF5A5F]/20 flex items-center gap-2 transition-all self-stretch sm:self-auto justify-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'توظيف خبيرة جديدة' : 'Add New Staff'}</span>
          </button>
        </div>

        {/* ===== STAFF CARDS GRID ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {staffList.map((s) => {
            const initial = s.name.charAt(0);
            const email = s.email || `${s.username || s.id}@confirmed.sa`;
            const phone = s.phone || '0550000000';
            const username = s.username || s.id;
            const isActive = s.isActive !== false; // default true

            return (
              <div key={s.id} className={`bg-white border transition-all rounded-2xl p-6 space-y-4 relative overflow-hidden flex flex-col justify-between ${
                isActive ? 'border-[#E9E7E2] hover:shadow-lg' : 'border-slate-300 bg-slate-50 opacity-80 shadow-inner'
              }`}>
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${isActive ? 'bg-[#FF5A5F]' : 'bg-slate-400'}`} />
                
                <div className="space-y-4">
                  {/* Avatar & Status Toggle */}
                  <div className="flex justify-between items-start">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-serif font-bold text-xl shadow-inner ${
                      isActive ? 'bg-[#FFF0F0] text-[#FF5A5F]' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {initial}
                    </div>

                    {/* Account Status Switch */}
                    <button 
                      onClick={() => handleToggleActive(s)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                        isActive 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                          : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                      }`}
                      title={isAr ? 'تغيير حالة النشاط للحساب' : 'Toggle status'}
                    >
                      {isActive ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>{isActive ? (isAr ? 'حساب مفعّل' : 'Active') : (isAr ? 'حساب معطل' : 'Suspended')}</span>
                    </button>
                  </div>

                  {/* Name & Role */}
                  <div>
                    <h4 className="font-bold text-[#1C1B18] text-base">{getStaffName(s.id, s.name)}</h4>
                    <p className="text-xs text-[#6E6A63] mt-1 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-[#FF5A5F]" /> {getStaffRole(s.id, s.role)}
                    </p>
                  </div>

                  {/* Secure Credentials Data */}
                  <div className="bg-slate-50/80 p-3 rounded-xl space-y-1.5 border border-slate-200/50 text-xs text-[#6E6A63] font-mono">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">EMAIL:</span>
                      <span className="text-slate-700 font-medium truncate max-w-[130px]" title={email}>{email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">PHONE:</span>
                      <span className="text-slate-700 font-medium">{phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">USER:</span>
                      <span className="text-[#FF5A5F] font-bold">{username}</span>
                    </div>
                  </div>
                </div>

                {/* Action and Links area */}
                <div className="pt-4 border-t border-[#F6F6F4] space-y-2.5">
                  {isActive ? (
                    <>
                      <button
                        onClick={() => handleSendOnboardingLink(s)}
                        className="w-full py-2 bg-[#14332B] hover:bg-[#1C473C] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إرسال رابط الدخول الآمن' : 'Send Dashboard Link'}</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          readOnly
                          value={`https://confirmed.sa/login?token=${s.secureLinkToken || 'token'}`}
                          className="flex-1 text-[10px] font-mono bg-slate-100 p-1.5 rounded-lg border border-slate-200/60 focus:outline-none text-slate-500 truncate"
                        />
                        <button
                          onClick={() => copyToClipboard(`https://confirmed.sa/login?token=${s.secureLinkToken || 'token'}`, s.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer shrink-0"
                          title={isAr ? 'نسخ رابط الدخول' : 'Copy link'}
                        >
                          {copiedId === s.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-3 px-2 bg-red-50/80 rounded-xl border border-red-200/50 flex items-center gap-2 text-red-700 text-xs">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{isAr ? 'تم تعليق حساب هذه الخبيرة مؤقتاً لأسباب أمنية.' : 'This account is suspended and blocked from dashboard access.'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* ===== TAB: COMMISSION MANAGEMENT ===== */}
      {activeTab === 'commissions' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-[#14332B] text-white p-6 rounded-2xl relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-40 h-40 bg-[#FFAE34]/10 rounded-full blur-3xl" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="bg-[#FFAE34] text-[#14332B] px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase mb-2 inline-block">
                  {isAr ? 'نسب العمولات' : 'COMMISSION RATES'}
                </span>
                <h2 className="text-xl font-serif font-black text-white">{isAr ? 'إدارة العمولات' : 'Commission Management'}</h2>
                <p className="text-slate-300 text-xs mt-1">
                  {isAr ? 'تحديد نسبة عمولة لكل عضو في الطاقم بناءً على إيرادات خدماتها' : 'Set a commission rate per team member based on their service revenue.'}
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-center">
                  <span className="text-xl font-black font-mono block">{staffList.length}</span>
                  <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wide">{isAr ? 'عضو طاقم' : 'Team Members'}</span>
                </div>
                <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-center">
                  <span className="text-xl font-black font-mono block">
                    {staffList.length > 0
                      ? Math.round(staffList.reduce((s, m) => s + getCommissionRate(m.id), 0) / staffList.length)
                      : 0}%
                  </span>
                  <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wide">{isAr ? 'متوسط العمولة' : 'Avg. Rate'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Commission Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {staffList.map((s) => {
              const rate    = getCommissionRate(s.id);
              const isActive = s.isActive !== false;
              const isEditing = editingCommission === s.id;
              // Simulated monthly revenue per staff (based on bookingsToday as proxy)
              const simMonthlyRevenue = (s.bookingsToday || 0) * 420 + 3200;
              const commissionAmount  = Math.round(simMonthlyRevenue * (rate / 100));

              return (
                <div key={s.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${isActive ? 'border-[#E9E7E2]' : 'border-slate-200 opacity-70'}`}>
                  {/* Card top strip */}
                  <div className="bg-gradient-to-r from-[#14332B] to-[#1a4a3a] px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center font-serif font-black text-lg border border-white/20">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{s.name}</p>
                        <p className="text-slate-300 text-[10px] flex items-center gap-1">
                          <Award className="w-3 h-3" /> {s.role}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-400/20 text-emerald-200' : 'bg-slate-400/20 text-slate-300'}`}>
                      {isActive ? (isAr ? 'نشطة' : 'Active') : (isAr ? 'معطلة' : 'Suspended')}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-4">
                    {/* Rate editor */}
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold mb-0.5">{isAr ? 'نسبة العمولة' : 'Commission Rate'}</p>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={60}
                              value={editValue}
                              onChange={e => setEditValue(Number(e.target.value))}
                              className="w-20 text-sm font-mono font-black border border-[#FF5A5F] rounded-lg px-2 py-1 focus:outline-none text-[#FF5A5F]"
                              autoFocus
                            />
                            <span className="text-sm font-black text-slate-500">%</span>
                          </div>
                        ) : (
                          <p className="text-3xl font-black font-mono text-[#FF5A5F]">{rate}%</p>
                        )}
                      </div>
                      <div>
                        {isEditing ? (
                          <button
                            onClick={() => saveCommissionRate(s.id, editValue)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-[#14332B] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#1a4a3a] transition-all"
                          >
                            <Save className="w-3.5 h-3.5" />
                            {isAr ? 'حفظ' : 'Save'}
                          </button>
                        ) : (
                          <button
                            onClick={() => { setEditingCommission(s.id); setEditValue(rate); }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-[#F6F6F4] hover:bg-[#E9E7E2] text-slate-600 text-xs font-bold rounded-xl cursor-pointer transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            {isAr ? 'تعديل' : 'Edit'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Rate visual bar */}
                    <div>
                      <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#FF5A5F] to-[#FFAE34]"
                          style={{ width: `${Math.min(rate * 1.67, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[9px] text-slate-300">0%</span>
                        <span className="text-[9px] text-slate-300">60%</span>
                      </div>
                    </div>

                    {/* Monthly estimate */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-[#F8FAFC] rounded-xl p-2.5 border border-slate-100">
                        <p className="text-xs font-black font-mono text-slate-800">{simMonthlyRevenue.toLocaleString()}</p>
                        <p className="text-[9px] text-slate-400">{isAr ? 'إيراد شهري تقديري (ر.س)' : 'Est. Monthly Revenue'}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-100">
                        <p className="text-xs font-black font-mono text-emerald-700">{commissionAmount.toLocaleString()}</p>
                        <p className="text-[9px] text-emerald-500">{isAr ? 'عمولة متوقعة (ر.س)' : 'Est. Commission'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary table */}
          <div className="bg-white rounded-2xl border border-[#E9E7E2] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-[#E9E7E2] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#FF5A5F]" />
              <h3 className="font-serif text-sm font-bold text-slate-900">{isAr ? 'ملخص العمولات الشهرية' : 'Monthly Commissions Summary'}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#6E6A63] border-b border-[#E9E7E2]">
                    <th className="p-4 text-start font-bold">{isAr ? 'الموظفة' : 'Staff Member'}</th>
                    <th className="p-4 text-center font-bold">{isAr ? 'المسمى الوظيفي' : 'Role'}</th>
                    <th className="p-4 text-center font-bold">{isAr ? 'نسبة العمولة' : 'Rate'}</th>
                    <th className="p-4 text-center font-bold">{isAr ? 'الإيراد التقديري' : 'Est. Revenue'}</th>
                    <th className="p-4 text-center font-bold">{isAr ? 'العمولة المتوقعة' : 'Est. Commission'}</th>
                    <th className="p-4 text-center font-bold">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((s, i) => {
                    const rate             = getCommissionRate(s.id);
                    const simRevenue       = (s.bookingsToday || 0) * 420 + 3200;
                    const commissionAmt    = Math.round(simRevenue * (rate / 100));
                    const isActive         = s.isActive !== false;
                    return (
                      <tr key={s.id} className={`border-b border-[#F1F5F9] hover:bg-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF9]'}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#14332B] text-white flex items-center justify-center font-serif font-bold text-sm shrink-0">
                              {s.name.charAt(0)}
                            </div>
                            <p className="font-bold text-slate-800">{s.name}</p>
                          </div>
                        </td>
                        <td className="p-4 text-center text-slate-500">{s.role}</td>
                        <td className="p-4 text-center">
                          <span className="font-black font-mono text-[#FF5A5F] bg-[#FF5A5F]/8 px-2 py-0.5 rounded-full">{rate}%</span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-700">{simRevenue.toLocaleString()} {isAr ? 'ر.س' : 'SAR'}</td>
                        <td className="p-4 text-center font-mono font-bold text-emerald-700">{commissionAmt.toLocaleString()} {isAr ? 'ر.س' : 'SAR'}</td>
                        <td className="p-4 text-center">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                            {isActive ? (isAr ? 'نشطة' : 'Active') : (isAr ? 'معطلة' : 'Suspended')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total row */}
                  <tr className="bg-[#14332B] text-white">
                    <td className="p-4 font-black" colSpan={3}>{isAr ? 'الإجمالي الشهري المتوقع' : 'Monthly Total (Est.)'}</td>
                    <td className="p-4 text-center font-black font-mono">
                      {staffList.reduce((acc, s) => acc + ((s.bookingsToday || 0) * 420 + 3200), 0).toLocaleString()} {isAr ? 'ر.س' : 'SAR'}
                    </td>
                    <td className="p-4 text-center font-black font-mono text-[#FFAE34]">
                      {staffList.reduce((acc, s) => {
                        const r = getCommissionRate(s.id);
                        const rev = (s.bookingsToday || 0) * 420 + 3200;
                        return acc + Math.round(rev * (r / 100));
                      }, 0).toLocaleString()} {isAr ? 'ر.س' : 'SAR'}
                    </td>
                    <td className="p-4" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== EMAIL DISPATCH PREVIEW WINDOW (SIMULATED EMAIL CLIENT) ===== */}
      {sentEmailLog && (
        <div className="fixed inset-0 bg-[#1C1B18]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#1C1B18] text-white rounded-3xl border border-slate-800 w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col">
            {/* Window header representing a secure mail client */}
            <div className="bg-[#2C2A24] px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs font-mono text-slate-400 ml-2">CONFIRMED Mail Dispatcher [Secured]</span>
              </div>
              <button 
                onClick={() => setSentEmailLog(null)}
                className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded-lg cursor-pointer"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>

            {/* Email Headers */}
            <div className="p-6 bg-[#171613] border-b border-slate-800 space-y-2 text-sm text-slate-300 font-mono">
              <div>
                <span className="text-slate-500">{isAr ? 'من: ' : 'From: '}</span>
                <span className="text-emerald-400 font-bold">marktning@onfirmedmarketing.com (CONFIRMED Authentication Engine)</span>
              </div>
              <div>
                <span className="text-slate-500">{isAr ? 'إلى: ' : 'To: '}</span>
                <span className="text-[#FF5A5F] font-bold">{sentEmailLog.staffName} &lt;{sentEmailLog.email}&gt;</span>
              </div>
              <div>
                <span className="text-slate-500">{isAr ? 'الحدث: ' : 'Trigger: '}</span>
                <span className="text-slate-400">{isAr ? 'توليد تلقائي لرابط تسجيل دخول آمن لخبيرات التجميل' : 'Automatic secure staff expert link dispatch'}</span>
              </div>
              <div>
                <span className="text-slate-500">{isAr ? 'الموضوع: ' : 'Subject: '}</span>
                <span className="text-white font-bold">🔐 {isAr ? 'تفعيل حساب الخبيرة ورابط الدخول المشفر لصالونك' : 'Activate Your CONFIRMED Salon Expert Dashboard'}</span>
              </div>
            </div>

            {/* Email Content Box */}
            <div className="p-8 bg-white text-slate-800 space-y-6 overflow-y-auto max-h-[350px]">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 rounded-full bg-[#FF5A5F]" />
                  <span className="font-sans text-sm font-bold tracking-widest text-[#1C1B18]">CONFIRMED SYSTEM</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg">SECURE MAIL</span>
              </div>

              <div className="space-y-3">
                <p className="font-serif font-bold text-lg text-slate-900">
                  {isAr ? `مرحباً خبيرة التجميل ${sentEmailLog.staffName}،` : `Hello ${sentEmailLog.staffName},`}
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {isAr 
                    ? 'تم إعداد وتفعيل حسابك كخبيرة تجميل معتمدة في الصالون بنجاح. لأسباب تتعلق بالخصوصية والحماية العالية، تم قفل حسابك ببروتوكول تشفير كلمات المرور وتأمين الدخول برابط وصول مشفر لمرة واحدة.'
                    : 'Your expert stylist profile on the CONFIRMED salon portal has been fully activated. For enhanced system and client security, your account utilizes end-to-end client-side hashing and single-use cryptographic entry URL protocols.'}
                </p>
              </div>

              {/* Onboarding Credentials Card */}
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-5 space-y-3 text-xs font-mono">
                <h5 className="font-sans font-bold text-slate-800 text-xs border-b border-slate-200 pb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#FF5A5F]" />
                  <span>{isAr ? 'بيانات الاعتماد الآمنة للوحة التحكم' : 'Your Secure Dashboard Credentials'}</span>
                </h5>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">{isAr ? 'اسم المستخدم:' : 'Username:'}</span>
                  <span className="text-[#FF5A5F] font-bold">{sentEmailLog.username}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">{isAr ? 'البريد الإلكتروني:' : 'Email Address:'}</span>
                  <span className="text-slate-700 font-bold">{sentEmailLog.email}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">{isAr ? 'كلمة المرور المؤقتة:' : 'One-Time Password:'}</span>
                  <span className="text-slate-700 font-bold">password123</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal pt-2">
                  * {isAr ? 'ملاحظة: سيطلب منك النظام وضع كلمة مرور جديدة وتوثيقها فور الدخول عبر كود التحقق لجوالك.' : 'Note: You will be prompted to verify via a 2-factor OTP code (SMS + email) and update your password securely on first login.'}
                </p>
              </div>

              {/* Direct Access Action Button */}
              <div className="text-center py-4 space-y-3">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setSentEmailLog(null);
                    alert(isAr 
                      ? 'محاكاة الدخول الآمن: لقد قمنا بنسخ رابط تسجيل الدخول الآمن للخبيرة وتجهيزه. يمكنك الدخول للمنصة عبر تسجيل الدخول في الصفحة الرئيسية واستخدام الـ OTP المفعّل!'
                      : 'Secure URL Simulation: Direct link token is active. Please use the main portal login and experience the brute-force/2FA verification!');
                  }}
                  className="inline-block bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-sans font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-[#FF5A5F]/20 hover:shadow-[#FF5A5F]/30 transition-all"
                >
                  {isAr ? 'تسجيل دخول مباشر للداشبورد الآمن 🔐' : 'Login Securely to Dashboard 🔐'}
                </a>
                <p className="text-[10px] font-mono text-slate-400 break-all bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {sentEmailLog.link}
                </p>
              </div>

              {/* Security Footnote */}
              <div className="border-t border-slate-100 pt-4 flex gap-2 items-start text-[11px] text-slate-400 leading-normal">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p>
                  {isAr 
                    ? 'رابط الوصول هذا مشفر وخاص بك فقط وصالح للاستعمال لمرة واحدة. لا تقم بمشاركة هذا الرابط مع أي شخص أبداً. طاقم دعم CONFIRMED لن يطلب منك كلمة المرور أو كود التحقق مطلقاً.'
                    : 'This cryptographically signed URL is highly confidential and single-use. CONFIRMED support or administrators will never ask for your password or OTP code.'}
                </p>
              </div>
            </div>

            {/* Bottom Actions of Mailer */}
            <div className="bg-[#1C1B18] px-6 py-4 flex items-center justify-between border-t border-slate-800">
              <span className="text-xs text-slate-400 font-mono">⚡ Sent instantly via SMTP/TLS</span>
              <button
                onClick={() => setSentEmailLog(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                {isAr ? 'إغلاق المعاينة' : 'Close Dispatch Log'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD STAFF MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#1C1B18]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E9E7E2] w-full max-w-sm p-6 shadow-2xl relative animate-scaleIn">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 left-4 p-2 rounded-full hover:bg-[#F6F6F4] text-[#6E6A63] cursor-pointer"
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>

            <h3 className="font-serif text-xl font-bold text-[#14332B] mb-5">{isAr ? 'توظيف خبيرة تجميل جديدة' : 'Add New Salon Expert'}</h3>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'اسم الموظفة بالكامل *' : 'Staff Full Name *'}</label>
                <input 
                  type="text" 
                  required
                  value={staffName}
                  onChange={(e) => {
                    setStaffName(e.target.value);
                    if (!staffUsername) {
                      setStaffUsername(e.target.value.toLowerCase().replace(/\s+/g, '.'));
                    }
                  }}
                  placeholder={isAr ? "مثال: شهد الدوسري" : "e.g. Shahad Al-Dossari"}
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'اسم المستخدم الآمن *' : 'Secure Username *'}</label>
                  <input 
                    type="text" 
                    required
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    placeholder="shahad.nail"
                    className="w-full text-xs font-mono px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1C1B18] mb-1.5">{isAr ? 'جوال التوثيق (2FA) *' : 'MFA Mobile *'}</label>
                  <input 
                    type="text" 
                    required
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    placeholder="0551234567"
                    className="w-full text-xs font-mono px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1C18] mb-1.5">{isAr ? 'البريد الإلكتروني للخبيرة *' : 'Provider Email *'}</label>
                <input 
                  type="email" 
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="marktning@onfirmedmarketing.com"
                  className="w-full text-xs font-mono px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'الدور والمسمى الوظيفي *' : 'Job Role *'}</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18] bg-white"
                >
                  <option value="خبيرة شعر">{isAr ? 'خبيرة شعر وأخصائية تسريح' : 'Hair Expert & Stylist'}</option>
                  <option value="خبيرة صبغات">{isAr ? 'أخصائية صبغات وعلاجات شعر' : 'Colorist & Hair Treatments'}</option>
                  <option value="خبيرة مكياج">{isAr ? 'خبيرة وميك آب آرتيست' : 'Professional Makeup Artist'}</option>
                  <option value="فنية أظافر">{isAr ? 'فنية عناية بالأظافر واليدين' : 'Nail Care Technician'}</option>
                  <option value="أخصائية بشرة وسبا">{isAr ? 'أخصائية بشرة وجلسات مساج' : 'Esthetician & Spa Therapist'}</option>
                  <option value="موظفة استقبال">{isAr ? 'موظفة استقبال وكاشير' : 'Receptionist & Cashier'}</option>
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50 flex gap-2 items-start text-[10px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>{isAr ? 'بتوظيف الخبيرة، سيتم إنشاء مفتاح وصول فريد تلقائياً وتفعيل الحساب مباشرة.' : 'Hiring creates a secure access token and registers them in the MFA provider network.'}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#FF5A5F]/20 transition-all cursor-pointer"
                >
                  {isAr ? 'توظيف وتسجيل الموظفة' : 'Save & Register Staff'}
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
