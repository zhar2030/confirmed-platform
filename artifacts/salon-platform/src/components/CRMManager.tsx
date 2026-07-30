import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { 
  Users, Search, Plus, Phone, MessageSquare, Edit3, UserCheck, Heart, User, 
  Award, Trophy, Gift, Sparkles, PlusCircle, MinusCircle, CheckSquare, 
  Star, Coins, ArrowUpRight, TrendingUp, Filter 
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface CRMManagerProps {
  clients: Client[];
  onAddClient: (client: Client) => void;
  onUpdateClientNotes: (clientId: string, newNotes: string) => void;
  onIncrementVisits: (clientId: string) => void;
  onUpdateClientPoints: (clientId: string, newPoints: number) => void;
  onUpdateClient?: (client: Client) => void;
  onOpenClientProfile?: (clientId: string) => void;
}

export default function CRMManager({ 
  clients, 
  onAddClient, 
  onUpdateClientNotes, 
  onIncrementVisits, 
  onUpdateClientPoints,
  onUpdateClient,
  onOpenClientProfile
}: CRMManagerProps) {
  const { t, isAr } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<'All' | 'VIP' | 'Star' | 'Regular' | 'New' | 'Inactive'>('All');

  // Interactive Edit State for Selected Client classification and rating
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [selectedClassification, setSelectedClassification] = useState<'VIP' | 'Regular' | 'New' | 'Inactive' | 'Star'>('New');
  const [selectedSpend, setSelectedSpend] = useState<number>(0);

  // Form State for creating a new client
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [clientLoyaltyPoints, setClientLoyaltyPoints] = useState(10); // Default welcome points
  const [initialSpend, setInitialSpend] = useState<number>(0);
  const [initialClassification, setInitialClassification] = useState<'VIP' | 'Regular' | 'New' | 'Inactive' | 'Star'>('New');
  const [initialRating, setInitialRating] = useState<number>(5);

  const activeClient = selectedClient ? (clients.find(c => c.id === selectedClient.id) || selectedClient) : null;

  // Sync selected details when active client is changed or updated
  useEffect(() => {
    if (activeClient) {
      setEditingNotes(activeClient.notes || '');
      setSelectedRating(activeClient.manualRating || 5);
      setSelectedClassification(activeClient.manualClassification || 'New');
      setSelectedSpend(activeClient.totalSpend || 0);
    }
  }, [activeClient?.id]);

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
    
    // Check manual classification filter
    const currentClassification = c.manualClassification || 'New';
    const matchesClassification = classificationFilter === 'All' || currentClassification === classificationFilter;
    
    return matchesSearch && matchesClassification;
  });

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone) return;

    const newClient: Client = {
      id: 'c-' + Math.random().toString(36).substr(2, 9),
      name: clientName,
      phone: clientPhone,
      visits: 1,
      notes: clientNotes,
      loyaltyPoints: Number(clientLoyaltyPoints) || 0,
      totalSpend: Number(initialSpend) || 0,
      manualClassification: initialClassification,
      manualRating: initialRating
    };

    onAddClient(newClient);
    
    // Reset Form
    setClientName('');
    setClientPhone('');
    setClientNotes('');
    setClientLoyaltyPoints(10);
    setInitialSpend(0);
    setInitialClassification('New');
    setInitialRating(5);
    setShowAddModal(false);
  };

  const handleUpdateNotesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;
    onUpdateClientNotes(activeClient.id, editingNotes);
    alert(isAr ? 'تم حفظ وتعديل ملاحظات العميلة بنجاح ✓' : 'Client notes updated successfully ✓');
  };

  const handleSaveClassificationAndRating = () => {
    if (!activeClient || !onUpdateClient) return;
    
    const updated: Client = {
      ...activeClient,
      manualRating: selectedRating,
      manualClassification: selectedClassification,
      totalSpend: selectedSpend
    };
    
    onUpdateClient(updated);
    alert(isAr ? 'تم تعديل وحفظ تقييم وتصنيف العميلة بنجاح ✓' : 'Customer classification and rating saved successfully ✓');
  };

  const selectClientForView = (client: Client) => {
    setSelectedClient(client);
  };

  const getClientName = (name: string) => {
    if (isAr) return name;
    switch(name) {
      case 'سارة المطيري': return 'Sarah Al-Mutairi';
      case 'نوف العتيبي': return 'Nouf Al-Otaibi';
      case 'حصة الكثيري': return 'Hessa Al-Katheeri';
      case 'لمى السبيعي': return 'Lama Al-Subaie';
      case 'ريما القحطاني': return 'Rema Al-Qahtani';
      default: return name;
    }
  };

  const getLoyaltyTier = (visits: number) => {
    if (visits >= 15) return isAr ? 'عميلة كبرى VIP' : 'VIP Client';
    if (visits >= 8) return isAr ? 'عميلة نشطة' : 'Active Client';
    return isAr ? 'عميلة جديدة' : 'New Client';
  };

  // Automated System Recommendation logic based on visit history and total spending volume
  const getSystemRecommendation = (visits: number, spend: number) => {
    if (visits >= 15 || spend >= 4000) {
      return {
        key: 'VIP' as const,
        nameAr: 'نخبة كبار الشخصيات VIP',
        nameEn: 'Elite VIP',
        reasonAr: `عدد الزيارات (${visits}) وحجم الإنفاق مرتفع جدًا (${spend} ر.س).`,
        reasonEn: `High visit frequency (${visits}) and high spending size (${spend} SAR).`,
        color: 'text-rose-600 bg-rose-50 border-rose-200'
      };
    }
    if (visits >= 8 || spend >= 2000) {
      return {
        key: 'Star' as const,
        nameAr: 'عميلة ذهبية مميزة',
        nameEn: 'Golden Star Client',
        reasonAr: `تفاعل وتردد منتظم (${visits} زيارات) بحجم إنفاق جيد (${spend} ر.س).`,
        reasonEn: `Regular retention (${visits} visits) with robust spending (${spend} SAR).`,
        color: 'text-purple-600 bg-purple-50 border-purple-200'
      };
    }
    if (visits >= 4 || spend >= 1000) {
      return {
        key: 'Regular' as const,
        nameAr: 'عميلة منتظمة مكررة',
        nameEn: 'Regular Frequent Client',
        reasonAr: `تردد دوري مستقر (${visits} زيارات) ومعدل إنفاق متزايد (${spend} ر.س).`,
        reasonEn: `Periodic attendance (${visits} visits) with positive spending trajectory (${spend} SAR).`,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
      };
    }
    return {
      key: 'New' as const,
      nameAr: 'عميلة جديدة واعدة',
      nameEn: 'New Explorer',
      reasonAr: `في طور البداية والاستكشاف الأولي لمستوى الخدمات بالصالون (${visits} زيارة).`,
      reasonEn: `Initial salon testing and exploration phase (${visits} visit).`,
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    };
  };

  const getBadgeStyle = (tier: string) => {
    switch(tier) {
      case 'VIP': 
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Star': 
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Regular': 
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'New': 
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Inactive': 
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default: 
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTierLabel = (tier: string) => {
    if (isAr) {
      switch(tier) {
        case 'VIP': return 'VIP كبرى';
        case 'Star': return 'متميزة النجمية';
        case 'Regular': return 'عميلة منتظمة';
        case 'New': return 'عميلة جديدة';
        case 'Inactive': return 'غير نشطة';
        default: return tier;
      }
    } else {
      switch(tier) {
        case 'VIP': return 'VIP Class';
        case 'Star': return 'Star Client';
        case 'Regular': return 'Regular Client';
        case 'New': return 'New Client';
        case 'Inactive': return 'Inactive';
        default: return tier;
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ===== HEADER METRICS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-[#6E6A63] uppercase">{isAr ? 'إجمالي العميلات المسجلات' : 'Total Registered Clients'}</p>
          <h4 className="text-3xl font-serif font-bold text-[#14332B] mt-2">{clients.length}</h4>
          <p className="text-xs text-[#6E6A63] mt-2">{isAr ? 'قاعدة العميلات النشطات بالفرع' : 'Active salon clients database'}</p>
        </div>

        <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-[#6E6A63] uppercase">{isAr ? 'إجمالي نقاط الولاء الموزعة' : 'Total Loyalty Points Issued'}</p>
          <h4 className="text-3xl font-serif font-bold text-[#FF5A5F] mt-2 flex items-center gap-1.5">
            <Trophy className="w-6 h-6 text-amber-500 shrink-0 animate-bounce" />
            <span>{clients.reduce((acc, c) => acc + (c.loyaltyPoints || 0), 0)}</span>
          </h4>
          <p className="text-xs text-[#6E6A63] mt-2">{isAr ? 'متوسط النقاط الموزعة والمستحقة' : 'Average loyalty points issued to clients'}</p>
        </div>

        <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-[#6E6A63] uppercase">{isAr ? 'إجمالي المشتريات والإنفاق التراكمي' : 'Total Cumulative CRM Spend'}</p>
          <h4 className="text-3xl font-serif font-bold text-[#14332B] mt-2 text-emerald-600 font-mono">
            {clients.reduce((acc, c) => acc + (c.totalSpend || 0), 0).toLocaleString()} <span className="text-xs">{isAr ? 'ر.س' : 'SAR'}</span>
          </h4>
          <p className="text-xs text-[#6E6A63] mt-2">{isAr ? 'حجم المبيعات المسجلة بروفايل العميلات' : 'Recorded spend volume in profiles'}</p>
        </div>
      </div>

      {/* ===== ACTION BAR & FILTER BUTTONS ===== */}
      <div className="flex flex-col gap-4 bg-white p-5 rounded-2xl border border-[#E9E7E2]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute right-3 top-3 w-4 h-4 text-[#6E6A63] rtl:left-auto rtl:right-3 ltr:right-auto ltr:left-3" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? "ابحثي عن عميلة بالاسم أو برقم الجوال..." : "Search client by name or phone..."}
              className="w-full text-sm py-2 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] rtl:pl-4 rtl:pr-10 ltr:pr-4 ltr:pl-10"
            />
          </div>

          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-[#FF5A5F]/20 flex items-center gap-2 transition-all self-stretch sm:self-auto justify-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addNewClient')}</span>
          </button>
        </div>

        {/* Classification Filter Tabs */}
        <div className="border-t border-[#F6F6F4] pt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#6E6A63] flex items-center gap-1.5 me-2">
            <Filter className="w-3.5 h-3.5 text-[#FF5A5F]" />
            <span>{isAr ? 'تصنيف الصالون:' : 'Salon Class:'}</span>
          </span>
          {(['All', 'VIP', 'Star', 'Regular', 'New', 'Inactive'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setClassificationFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                classificationFilter === tab
                  ? 'bg-[#14332B] border-[#14332B] text-white shadow-xs'
                  : 'bg-white border-[#E9E7E2] text-[#6E6A63] hover:text-[#1C1B18] hover:border-gray-400'
              }`}
            >
              {tab === 'All' ? (isAr ? 'الكل' : 'All') : getTierLabel(tab)}
              <span className="ms-1.5 text-[10px] opacity-75 font-mono">
                ({tab === 'All' 
                  ? clients.length 
                  : clients.filter(c => (c.manualClassification || 'New') === tab).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== CRM LAYOUT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Client List */}
        <div className={`${selectedClient ? 'lg:col-span-6' : 'lg:col-span-12'} bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm`}>
          <h3 className="font-serif text-base font-bold text-[#14332B] mb-5">{isAr ? 'سجل العميلات والتقييم' : 'Client Profile Registry & Ratings'}</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#E9E7E2] text-xs text-[#6E6A63] font-bold">
                  <th className="pb-3 text-start">{t('clientName')}</th>
                  <th className="pb-3 text-start">{isAr ? 'التصنيف' : 'Classification'}</th>
                  <th className="pb-3 text-center">{isAr ? 'الزيارات والإنفاق' : 'Visits & Spend'}</th>
                  <th className="pb-3 text-center">{isAr ? 'التقييم' : 'Rating'}</th>
                  <th className="pb-3 text-center">{isAr ? 'نقاط الولاء' : 'Loyalty Points'}</th>
                  <th className="pb-3 text-end">{isAr ? 'التحكم' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F6F6F4]">
                {filteredClients.map((c) => {
                  const initial = c.name.charAt(0);
                  const currentClass = c.manualClassification || 'New';
                  const currentRating = c.manualRating || 5;
                  return (
                    <tr key={c.id} className={`hover:bg-[#F6F6F4]/50 text-[#1C1B18] transition-colors ${activeClient?.id === c.id ? 'bg-[#FF5A5F]/5' : ''}`}>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#FF5A5F]/10 text-[#FF5A5F] flex items-center justify-center font-bold font-serif text-sm">
                            {initial}
                          </div>
                          <div>
                            {onOpenClientProfile ? (
                              <button
                                onClick={() => onOpenClientProfile(c.id)}
                                className="font-bold block text-[#14332B] hover:text-[#FF5A5F] hover:underline underline-offset-2 transition-colors cursor-pointer text-start"
                              >
                                {getClientName(c.name)}
                              </button>
                            ) : (
                              <span className="font-bold block">{getClientName(c.name)}</span>
                            )}
                            <span className="text-[10px] font-mono text-[#6E6A63] block">{c.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeStyle(currentClass)}`}>
                          {getTierLabel(currentClass)}
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        <div className="text-xs font-bold text-[#14332B] font-mono">
                          {c.visits} {isAr ? 'زيارات' : 'visits'}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-bold font-mono">
                          {(c.totalSpend || 0).toLocaleString()} {isAr ? 'ر.س' : 'SAR'}
                        </div>
                      </td>
                      <td className="py-3.5 text-center">
                        <div className="flex items-center justify-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < currentRating ? 'fill-amber-500 text-amber-500' : 'text-gray-200'}`} 
                            />
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 text-center">
                        <div className="inline-flex items-center gap-1 bg-[#FFF0F0] text-[#FF5A5F] py-1 px-2.5 rounded-full text-xs font-bold font-mono">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>{c.loyaltyPoints || 0}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-end">
                        <button 
                          onClick={() => selectClientForView(c)}
                          className="text-xs font-bold text-[#FF5A5F] hover:underline cursor-pointer"
                        >
                          {isAr ? 'عرض وتصنيف' : 'Classify & View'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#6E6A63] font-bold">
                      {isAr ? 'لا توجد عميلات يطابقن معايير البحث أو التصفية.' : 'No clients found matching the search or filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Client Details, Rating, and Override Classification Panel */}
        {activeClient && (
          <div className="lg:col-span-6 bg-[#FFF0F0]/30 border border-[#FF5A5F]/10 rounded-2xl p-6 shadow-sm space-y-6 animate-scaleIn">
            <div className="flex justify-between items-center pb-3 border-b border-[#E9E7E2]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#FF5A5F] text-white flex items-center justify-center font-serif text-lg font-bold">
                  {activeClient.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-serif text-base font-bold text-[#14332B]">{getClientName(activeClient.name)}</h4>
                  <p className="text-xs text-[#6E6A63] font-mono">{activeClient.phone}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedClient(null)}
                className="text-xs font-bold text-[#6E6A63] hover:text-[#1C1B18] cursor-pointer"
              >
                {isAr ? 'إغلاق التفاصيل ×' : 'Close Details ×'}
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white p-3 rounded-xl border border-[#E9E7E2] shadow-2xs">
                <p className="text-[10px] font-bold text-[#6E6A63]">{isAr ? 'إجمالي الزيارات' : 'Total Visits'}</p>
                <p className="text-xl font-bold font-mono mt-1 text-[#14332B]">{activeClient.visits}</p>
                <button 
                  onClick={() => onIncrementVisits(activeClient.id)}
                  className="text-[9px] font-bold text-[#FF5A5F] hover:underline mt-1 block w-full text-center cursor-pointer"
                >
                  {isAr ? 'زيارة جديدة +١' : 'Record Visit +1'}
                </button>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E9E7E2] shadow-2xs">
                <p className="text-[10px] font-bold text-[#6E6A63]">{isAr ? 'حجم الإنفاق' : 'Spend Volume'}</p>
                <p className="text-xl font-bold font-mono mt-1 text-emerald-600">{(activeClient.totalSpend || 0).toLocaleString()}</p>
                <span className="text-[9px] text-[#6E6A63] font-sans font-bold block mt-1">{isAr ? 'ر.س كحجم مشتريات' : 'SAR Cumulative'}</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E9E7E2] shadow-2xs flex flex-col justify-center items-center">
                <p className="text-[10px] font-bold text-[#6E6A63]">{isAr ? 'تصنيف الصالون' : 'Salon Class'}</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border mt-2 ${getBadgeStyle(activeClient.manualClassification || 'New')}`}>
                  {getTierLabel(activeClient.manualClassification || 'New')}
                </span>
              </div>
            </div>

            {/* ===== SYSTEM RECOMMENDED CLASSIFICATION ACCORDING TO VISIT HISTORY & SPEND VOLUME ===== */}
            {(() => {
              const rec = getSystemRecommendation(activeClient.visits, activeClient.totalSpend || 0);
              return (
                <div className="bg-white p-4 rounded-xl border border-[#E9E7E2] space-y-2.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-[#6E6A63] uppercase tracking-wider block flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{isAr ? 'التصنيف التلقائي المقترح من النظام (سلوكي + مالي):' : 'System Behavior & Spend Analytics:'}</span>
                  </span>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${rec.color}`}>
                      {isAr ? rec.nameAr : rec.nameEn}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedClassification(rec.key)}
                      className="text-[10px] font-bold text-[#FF5A5F] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>{isAr ? 'اعتماد التوصية وتطبيقها' : 'Apply Suggestion'}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-[#6E6A63] leading-relaxed font-sans">
                    💡 {isAr ? rec.reasonAr : rec.reasonEn} {isAr ? 'بناءً على سلوكها الفعلي.' : 'calculated from customer lifecycle.'}
                  </p>
                </div>
              );
            })()}

            {/* ===== SALON MANUAL RATING & CLASSIFICATION OVERRIDE CONTROLS ===== */}
            <div className="bg-white p-4 rounded-xl border border-[#E9E7E2] space-y-4 shadow-2xs">
              <span className="text-[10px] font-bold text-[#14332B] uppercase tracking-wider block border-b border-[#F6F6F4] pb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#FF5A5F]" />
                <span>{isAr ? 'التقييم والتصنيف المعتمد للعميلة' : 'Approve Client Rating & Class Override'}</span>
              </span>

              {/* 1. Star Rating Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#6E6A63]">
                  {isAr ? 'تقييم الصالون للعميلة (1 - 5 نجوم):' : 'Salon Customer Rating (1 - 5 Stars):'}
                </label>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const ratingValue = i + 1;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedRating(ratingValue)}
                        className="text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                        title={`${ratingValue} ${isAr ? 'نجوم' : 'Stars'}`}
                      >
                        <Star 
                          className={`w-6 h-6 ${ratingValue <= selectedRating ? 'fill-amber-500 text-amber-500' : 'text-gray-200'}`} 
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-bold text-[#6E6A63] ms-2">
                    {selectedRating} / 5 {isAr ? 'نجوم' : 'Stars'}
                  </span>
                </div>
              </div>

              {/* 2. Manual Classification Override Buttons */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#6E6A63]">
                  {isAr ? 'تعديل وتعيين تصنيف الصالون للعميلة:' : 'Select Salon Customer Classification:'}
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['VIP', 'Star', 'Regular', 'New', 'Inactive'] as const).map((tier) => {
                    const isActive = selectedClassification === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSelectedClassification(tier)}
                        className={`py-2 px-1 rounded-xl text-[10px] font-bold text-center border transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-[#14332B] border-[#14332B] text-white shadow-xs scale-[1.03]' 
                            : 'bg-white border-[#E9E7E2] text-[#6E6A63] hover:text-[#1C1B18] hover:border-gray-300'
                        }`}
                      >
                        {getTierLabel(tier)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Spending Cumulative Tracker Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#6E6A63]">
                  {isAr ? 'إجمالي الإنفاق التراكمي للعميلة بالصالون (ر.س):' : 'Total Cumulative Spending Volume (SAR):'}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="number"
                      min="0"
                      value={selectedSpend}
                      onChange={(e) => setSelectedSpend(Number(e.target.value) || 0)}
                      className="w-full text-sm px-4 py-2 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] font-mono text-[#14332B] font-bold"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-[#6E6A63] font-bold rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto select-none">
                      {isAr ? 'ر.س' : 'SAR'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSpend(prev => prev + 100)}
                    className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl border border-emerald-200 transition-all cursor-pointer"
                  >
                    +100
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSpend(prev => prev + 500)}
                    className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl border border-emerald-200 transition-all cursor-pointer"
                  >
                    +500
                  </button>
                </div>
              </div>

              {/* Save rating & classification override */}
              <button
                type="button"
                onClick={handleSaveClassificationAndRating}
                className="w-full py-2.5 bg-gradient-to-r from-[#FF5A5F] to-[#E04B50] hover:scale-[1.01] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#FF5A5F]/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Coins className="w-4 h-4 shrink-0" />
                <span>{isAr ? 'حفظ وتأكيد تصنيف وتقييم العميلة' : 'Save & Confirm Rating & Classification'}</span>
              </button>
            </div>

            {/* ===== LOYALTY PROGRESS PANEL ===== */}
            <div className="bg-white p-4 rounded-xl border border-[#E9E7E2] space-y-4 shadow-2xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-[#14332B]">{isAr ? 'نقاط برنامج الولاء للعميلة' : 'Loyalty Program Points'}</span>
                </div>
                <span className="text-base font-bold text-[#FF5A5F] font-mono">
                  {activeClient.loyaltyPoints || 0}
                  <span className="text-[10px] text-[#6E6A63] font-sans font-normal ms-1">{isAr ? 'نقطة' : 'pts'}</span>
                </span>
              </div>

              {/* Progress Bar towards 200 point milestone */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-[#6E6A63] font-bold">
                  <span>{isAr ? 'المستوى القادم: جائزة الـ 200 نقطة' : 'Next Level: 200 pts reward'}</span>
                  <span className="font-mono">{Math.min(100, Math.round(((activeClient.loyaltyPoints || 0) / 200) * 100))}%</span>
                </div>
                <div className="w-full bg-[#F6F6F4] rounded-full h-2 overflow-hidden border border-[#E9E7E2]/50">
                  <div 
                    className="bg-gradient-to-r from-amber-400 via-amber-500 to-[#FF5A5F] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round(((activeClient.loyaltyPoints || 0) / 200) * 100))}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#6E6A63] leading-relaxed">
                  { (activeClient.loyaltyPoints || 0) >= 200 
                    ? (isAr ? '🎉 مبروك! وصلت للحد المطلوب، استبدلي الجائزة الآن!' : '🎉 Congratulations! Milestone reached, claim your reward!')
                    : (isAr ? `يتبقى لها ${200 - (activeClient.loyaltyPoints || 0)} نقطة على قسيمة الـ 50 ريال المجانية` : `Only ${200 - (activeClient.loyaltyPoints || 0)} pts left for a free 50 SAR voucher`)
                  }
                </p>
              </div>

              {/* Claim Button */}
              { (activeClient.loyaltyPoints || 0) >= 200 && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateClientPoints(activeClient.id, (activeClient.loyaltyPoints || 0) - 200);
                    alert(isAr ? 'تم استبدال ٢٠٠ نقطة بنجاح! تم إصدار قسيمة خصم بقيمة ٥٠ ريال للعميلة.' : '200 points redeemed successfully! Issued a 50 SAR discount voucher.');
                  }}
                  className="w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer animate-pulse"
                >
                  <Sparkles className="w-4 h-4 text-white shrink-0" />
                  <span>{isAr ? 'استرداد مكافأة الـ 200 نقطة (قسيمة 50 ريال)' : 'Claim 200 Points Reward (50 SAR Voucher)'}</span>
                </button>
              )}

              {/* Quick Adjustment Controls for Admin */}
              <div className="pt-2.5 border-t border-[#F6F6F4] space-y-2">
                <span className="text-[10px] font-bold text-[#6E6A63] uppercase tracking-wider block">{isAr ? 'التحكم الإداري بالنقاط:' : 'Administrative Controls:'}</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdateClientPoints(activeClient.id, (activeClient.loyaltyPoints || 0) + 10)}
                    className="flex-1 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-100 flex items-center justify-center gap-0.5 transition-all cursor-pointer"
                    title={isAr ? 'إضافة 10 نقاط' : 'Add 10 points'}
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>+10</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateClientPoints(activeClient.id, (activeClient.loyaltyPoints || 0) + 50)}
                    className="flex-1 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-100 flex items-center justify-center gap-0.5 transition-all cursor-pointer"
                    title={isAr ? 'إضافة 50 نقطة' : 'Add 50 points'}
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>+50</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateClientPoints(activeClient.id, Math.max(0, (activeClient.loyaltyPoints || 0) - 20))}
                    className="flex-1 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-100 flex items-center justify-center gap-0.5 transition-all cursor-pointer"
                    title={isAr ? 'خصم 20 نقطة' : 'Deduct 20 points'}
                  >
                    <MinusCircle className="w-3 h-3" />
                    <span>-20</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Note Preferences */}
            <form onSubmit={handleUpdateNotesSubmit} className="space-y-3">
              <label className="block text-xs font-bold text-[#1C1B18] flex items-center gap-1">
                <Edit3 className="w-3.5 h-3.5 text-[#FF5A5F]" />
                <span>{isAr ? 'ملاحظات الحساسية والتفضيلات التجميلية للعميلة' : 'Allergy Warnings & Beauty Preferences'}</span>
              </label>
              <textarea 
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder={isAr ? "حساسية، صبغات معينة تفضلها، مشروب مفضل..." : "Allergy details, favorite colors, skin notes, beverage preferences..."}
                rows={3}
                className="w-full text-sm p-3.5 bg-white border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
              />
              <button 
                type="submit"
                className="w-full py-2.5 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                {isAr ? 'حفظ وتعديل الملاحظات' : 'Update Preferences'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ===== ADD CLIENT MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#1C1B18]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E9E7E2] w-full max-w-md p-6 shadow-2xl relative animate-scaleIn">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 left-4 p-2 rounded-full hover:bg-[#F6F6F4] text-[#6E6A63] cursor-pointer"
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>

            <h3 className="font-serif text-xl font-bold text-[#14332B] mb-5">{isAr ? 'إضافة عميلة جديدة للصالون' : 'Add New Client Profile'}</h3>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'اسم العميلة بالكامل *' : 'Client Full Name *'}</label>
                <input 
                  type="text" 
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={isAr ? "مثال: منى القحطاني" : "e.g. Mona Al-Otaibi"}
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'رقم جوال التواصل *' : 'Contact Mobile Number *'}</label>
                <input 
                  type="tel" 
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>

              {/* Initial rating, classification, spend */}
              <div className="grid grid-cols-2 gap-3 bg-[#FFF0F0]/50 p-3 rounded-2xl border border-[#FF5A5F]/10">
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-[#FF5A5F] uppercase block mb-1.5">{isAr ? 'التقييم والتصنيف الابتدائي:' : 'Initial Classification & Rating:'}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#6E6A63] mb-1">{isAr ? 'التصنيف الابتدائي:' : 'Initial Class:'}</label>
                  <select
                    value={initialClassification}
                    onChange={(e) => setInitialClassification(e.target.value as any)}
                    className="w-full text-xs p-2 bg-white border border-[#E9E7E2] rounded-lg focus:outline-none"
                  >
                    <option value="New">{isAr ? 'جديدة' : 'New'}</option>
                    <option value="Regular">{isAr ? 'منتظمة' : 'Regular'}</option>
                    <option value="Star">{isAr ? 'مميزة النجمية' : 'Star'}</option>
                    <option value="VIP">{isAr ? 'VIP' : 'VIP'}</option>
                    <option value="Inactive">{isAr ? 'غير نشطة' : 'Inactive'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#6E6A63] mb-1">{isAr ? 'التقييم بالنجوم:' : 'Star Rating:'}</label>
                  <select
                    value={initialRating}
                    onChange={(e) => setInitialRating(Number(e.target.value))}
                    className="w-full text-xs p-2 bg-white border border-[#E9E7E2] rounded-lg focus:outline-none"
                  >
                    <option value="5">5 {isAr ? 'نجوم' : 'Stars'}</option>
                    <option value="4">4 {isAr ? 'نجوم' : 'Stars'}</option>
                    <option value="3">3 {isAr ? 'نجوم' : 'Stars'}</option>
                    <option value="2">2 {isAr ? 'نجوم' : 'Stars'}</option>
                    <option value="1">1 {isAr ? 'نجمة واحدة' : '1 Star'}</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-[#6E6A63] mb-1">{isAr ? 'الإنفاق الابتدائي للعميلة (ر.س):' : 'Initial Total Spend (SAR):'}</label>
                  <input 
                    type="number"
                    min="0"
                    value={initialSpend}
                    onChange={(e) => setInitialSpend(Number(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 border border-[#E9E7E2] rounded-lg focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'ملاحظات تجميلية وحساسية' : 'Allergies & Skin Type Preferences'}</label>
                <textarea 
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder={isAr ? "تفضيلات الصبغات، نوع البشرة، أية حساسية أو تعليمات مسبقة..." : "Preferences for dye, skin types, allergies or pre-treatment guidelines..."}
                  rows={2}
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'نقاط الولاء الترحيبية الابتدائية *' : 'Initial Welcome Loyalty Points *'}</label>
                <input 
                  type="number" 
                  min="0"
                  required
                  value={clientLoyaltyPoints}
                  onChange={(e) => setClientLoyaltyPoints(Number(e.target.value) || 0)}
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] font-mono"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#FF5A5F]/20 transition-all cursor-pointer"
                >
                  {isAr ? 'تسجيل العميلة بقاعدة البيانات' : 'Register Client Profile'}
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
