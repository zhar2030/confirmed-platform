import React, { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import { 
  Plus, Trash2, Search, Filter, Calendar, DollarSign, Receipt, FileText, 
  TrendingDown, CheckCircle, AlertCircle, RefreshCw, Layers, CreditCard, User, Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: 'supplies' | 'utilities' | 'marketing' | 'maintenance' | 'salaries' | 'petty_cash';
  date: string; // YYYY-MM-DD
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  staffId?: string;
  staffName?: string;
  notes?: string;
  branchId?: string;
}

const INITIAL_EXPENSES: Expense[] = [
  { id: 'exp-1', title: 'شراء صبغات ومواد تجميل فرع العليا', amount: 1450, category: 'supplies', date: '2026-07-18', paymentMethod: 'card', staffName: 'أمل', branchId: 'br-riyadh', notes: 'صبغات لوريال درجات رمادي وذهبي' },
  { id: 'exp-2', title: 'فاتورة الكهرباء لشهر يوليو', amount: 2850, category: 'utilities', date: '2026-07-15', paymentMethod: 'bank_transfer', branchId: 'br-riyadh', notes: 'الشركة السعودية للكهرباء - العداد الرئيسي' },
  { id: 'exp-3', title: 'أعمال صيانة مكيف الصالون الرئيسي', amount: 450, category: 'maintenance', date: '2026-07-18', paymentMethod: 'cash', staffName: 'مستقبل الصالون', branchId: 'br-riyadh' },
  { id: 'exp-4', title: 'أدوات ضيافة قهوة وشاي وتمر للعميلات', amount: 280, category: 'petty_cash', date: '2026-07-17', paymentMethod: 'cash', staffName: 'سارة', branchId: 'br-riyadh' },
  { id: 'exp-5', title: 'حملة إعلانية ممولة سناب شات', amount: 1200, category: 'marketing', date: '2026-07-10', paymentMethod: 'card', branchId: 'br-riyadh' }
];

export default function ExpensesManager({ currentBranchId = 'br-riyadh' }: { currentBranchId?: string }) {
  const { lang, isAr, dir } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('confirmed_salon_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  // Modal & form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'supplies' | 'utilities' | 'marketing' | 'maintenance' | 'salaries' | 'petty_cash'>('supplies');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('card');
  const [staffName, setStaffName] = useState('');
  const [notes, setNotes] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  // Sync state with localStorage
  useEffect(() => {
    localStorage.setItem('confirmed_salon_expenses', JSON.stringify(expenses));
  }, [expenses]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    const newExpense: Expense = {
      id: 'exp-' + Math.random().toString(36).substring(2, 9),
      title,
      amount: parseFloat(amount),
      category,
      date,
      paymentMethod,
      staffName: staffName || undefined,
      notes: notes || undefined,
      branchId: currentBranchId
    };

    setExpenses(prev => [newExpense, ...prev]);
    setShowAddModal(false);
    
    // Reset form
    setTitle('');
    setAmount('');
    setCategory('supplies');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('card');
    setStaffName('');
    setNotes('');
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm(isAr ? 'هل أنت متأكد من رغبتك في حذف هذا المصروف؟' : 'Are you sure you want to delete this expense record?')) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  // Helper translations for categories
  const translateCategory = (cat: string) => {
    switch(cat) {
      case 'supplies': return isAr ? 'مستلزمات ومواد تجميل' : 'Salon Supplies';
      case 'utilities': return isAr ? 'فواتير وتشغيل (كهرباء/ماء)' : 'Utilities & Operating';
      case 'marketing': return isAr ? 'تسويق وإعلانات' : 'Marketing';
      case 'maintenance': return isAr ? 'صيانة وإصلاحات' : 'Maintenance';
      case 'salaries': return isAr ? 'أجور ورواتب الموظفين' : 'Staff Salaries';
      case 'petty_cash': return isAr ? 'نثريات وضيافة العميلات' : 'Petty Cash & Hospitality';
      default: return cat;
    }
  };

  const translateMethod = (method: string) => {
    switch(method) {
      case 'cash': return isAr ? 'نقدي (كاش)' : 'Cash';
      case 'card': return isAr ? 'بطاقة مدى / ائتمان' : 'Card / Mada';
      case 'bank_transfer': return isAr ? 'تحويل بنكي سحابي' : 'Bank Transfer';
      default: return method;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'supplies': return 'bg-emerald-500';
      case 'utilities': return 'bg-blue-500';
      case 'marketing': return 'bg-purple-500';
      case 'maintenance': return 'bg-amber-500';
      case 'salaries': return 'bg-indigo-500';
      case 'petty_cash': return 'bg-rose-400';
      default: return 'bg-slate-400';
    }
  };

  // Filtered expenses list
  const branchExpenses = expenses.filter(e => (e.branchId || 'br-riyadh') === currentBranchId);
  const filteredExpenses = branchExpenses.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
    
    // Date filter: extract YYYY-MM
    const expenseMonth = e.date.substring(0, 7);
    const matchesMonth = filterMonth === 'all' || expenseMonth === filterMonth;

    return matchesSearch && matchesCategory && matchesMonth;
  });

  // Math totals
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  const dailyTotal = branchExpenses
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  const monthlyTotal = branchExpenses
    .filter(e => e.date.substring(0, 7) === currentMonthStr)
    .reduce((sum, e) => sum + e.amount, 0);

  // Category wise aggregates for monthly
  const categoryBudgets: Record<string, number> = {
    supplies: 0,
    utilities: 0,
    marketing: 0,
    maintenance: 0,
    salaries: 0,
    petty_cash: 0
  };

  branchExpenses
    .filter(e => e.date.substring(0, 7) === currentMonthStr)
    .forEach(e => {
      categoryBudgets[e.category] = (categoryBudgets[e.category] || 0) + e.amount;
    });

  // Get list of unique months for dropdown filter
  const uniqueMonths = Array.from(new Set(branchExpenses.map(e => e.date.substring(0, 7)))).sort().reverse();

  return (
    <div className="space-y-6" dir={dir}>
      
      {/* Upper overview header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E9E7E2] shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-serif text-lg font-bold text-slate-900">{isAr ? 'إدارة المصاريف اليومية للصالون' : 'Daily Salon Expenses & Outlays'}</h2>
          <p className="text-xs text-[#6E6A63] mt-1">{isAr ? 'تسجيل وتصنيف النفقات التشغيلية والمشتريات وتتبع إجمالي الهدر المالي يومياً وشهرياً.' : 'Log operational expenses, supplies, utilities, and track total expenditure trends.'}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#FF5A5F] hover:bg-[#ff4248] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'تسجيل مصروف جديد' : 'Record New Expense'}</span>
        </button>
      </div>

      {/* KPI totals row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Daily Total */}
        <div className="bg-white p-5 rounded-2xl border border-[#E9E7E2] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[#6E6A63] font-medium block">{isAr ? 'إجمالي مصروفات اليوم' : 'Daily Expenses (Today)'}</span>
            <span className="text-2xl font-black text-slate-900 block font-mono">{dailyTotal.toLocaleString()} ر.س</span>
            <span className="text-[10px] text-slate-500 block">{isAr ? `تاريخ اليوم: ${todayStr}` : `Date: ${todayStr}`}</span>
          </div>
          <div className="p-3 bg-red-50 text-[#FF5A5F] rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Monthly Total */}
        <div className="bg-white p-5 rounded-2xl border border-[#E9E7E2] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[#6E6A63] font-medium block">{isAr ? 'إجمالي مصروفات الشهر الحالي' : 'Monthly Expenses (July)'}</span>
            <span className="text-2xl font-black text-[#FF5A5F] block font-mono">{monthlyTotal.toLocaleString()} ر.س</span>
            <span className="text-[10px] text-emerald-600 font-bold block">📊 {isAr ? 'ضمن الميزانية التشغيلية' : 'Within target operational limit'}</span>
          </div>
          <div className="p-3 bg-[#14332B]/5 text-[#14332B] rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* Category overview breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-[#E9E7E2] shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{isAr ? 'التصنيف الأعلى إنفاقاً للشهر' : 'Highest Outlay Category'}</h4>
          {monthlyTotal > 0 ? (
            <div className="space-y-1">
              {Object.entries(categoryBudgets)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 1)
                .map(([cat, val]) => (
                  <div key={cat} className="space-y-1">
                    <span className="text-sm font-bold text-slate-900 block">{translateCategory(cat)}</span>
                    <span className="text-lg font-black text-slate-700 block font-mono">{val.toLocaleString()} ر.س <span className="text-[10px] text-slate-400 font-normal">({Math.round((val / monthlyTotal) * 100)}%)</span></span>
                  </div>
                ))}
            </div>
          ) : (
            <span className="text-xs text-slate-400 block">{isAr ? 'لا توجد مصروفات مسجلة هذا الشهر' : 'No expenses logged yet.'}</span>
          )}
        </div>

      </div>

      {/* Main filters and list table */}
      <div className="bg-white rounded-2xl border border-[#E9E7E2] shadow-xs overflow-hidden">
        
        {/* Table Filters Header */}
        <div className="p-5 border-b border-[#E9E7E2] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="font-serif text-sm font-bold text-slate-800">{isAr ? 'دفتر قيود المصروفات التفصيلي' : 'Expenditures Ledger Book'}</h3>
          
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            
            {/* Search bar */}
            <div className="relative flex-1 md:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute top-2.5 right-3" />
              <input
                type="text"
                placeholder={isAr ? 'بحث في المصاريف...' : 'Search expense ledger...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full md:w-44 py-2 text-xs bg-[#F6F6F4] rounded-xl border border-[#E9E7E2] focus:outline-none focus:border-[#FF5A5F] ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
              />
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="p-2 bg-[#F6F6F4] border border-[#E9E7E2] text-xs font-bold rounded-xl focus:outline-none"
            >
              <option value="all">{isAr ? 'جميع التصنيفات' : 'All Categories'}</option>
              <option value="supplies">{isAr ? 'مستلزمات صالون' : 'Supplies'}</option>
              <option value="utilities">{isAr ? 'فواتير وتشغيل' : 'Utilities'}</option>
              <option value="marketing">{isAr ? 'تسويق وإعلانات' : 'Marketing'}</option>
              <option value="maintenance">{isAr ? 'صيانة وإصلاحات' : 'Maintenance'}</option>
              <option value="salaries">{isAr ? 'أجور ورواتب' : 'Salaries'}</option>
              <option value="petty_cash">{isAr ? 'ضيافة ونثريات' : 'Petty Cash'}</option>
            </select>

            {/* Month Filter */}
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="p-2 bg-[#F6F6F4] border border-[#E9E7E2] text-xs font-bold rounded-xl focus:outline-none"
            >
              <option value="all">{isAr ? 'جميع الأشهر' : 'All Months'}</option>
              {uniqueMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

          </div>
        </div>

        {/* Expenses List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] text-[#6E6A63] border-b border-[#E9E7E2]">
                <th className={`p-4 text-start font-bold ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'بند المصروف' : 'Expense Title'}</th>
                <th className={`p-4 text-start font-bold ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'التصنيف' : 'Category'}</th>
                <th className={`p-4 text-start font-bold ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'القيمة' : 'Amount'}</th>
                <th className={`p-4 text-start font-bold ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'طريقة الدفع' : 'Payment Method'}</th>
                <th className={`p-4 text-start font-bold ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'التاريخ' : 'Date'}</th>
                <th className={`p-4 text-start font-bold ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'المسؤول' : 'Authorized By'}</th>
                <th className={`p-4 text-start font-bold ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'ملاحظات' : 'Notes'}</th>
                <th className="p-4 font-bold text-center">{isAr ? 'خيارات' : 'Options'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="border-b border-[#F1F5F9] hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-800">{exp.title}</td>
                  <td className="p-4">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${getCategoryColor(exp.category)}`} />
                      {translateCategory(exp.category)}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-red-600">
                    -{exp.amount.toLocaleString()} ر.س
                  </td>
                  <td className="p-4 text-[#6E6A63] font-medium">
                    {translateMethod(exp.paymentMethod)}
                  </td>
                  <td className="p-4 font-mono font-bold text-[#6E6A63]">{exp.date}</td>
                  <td className="p-4 text-slate-700 font-medium">
                    {exp.staffName || (isAr ? 'الإدارة العامة' : 'Central Admin')}
                  </td>
                  <td className="p-4 text-slate-500 max-w-[180px] truncate" title={exp.notes}>
                    {exp.notes || '—'}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1.5 text-[#6E6A63] hover:text-[#FF5A5F] transition-colors cursor-pointer rounded-lg hover:bg-red-50 inline-block"
                      title={isAr ? 'حذف القيد' : 'Delete record'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    {isAr ? 'لا توجد قيود مصروفات مطابقة للبحث أو الفلاتر' : 'No expenses match search criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-[#E9E7E2] p-6 max-w-md w-full space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
              <h3 className="font-serif text-sm font-bold text-slate-900">{isAr ? 'تسجيل قيد مصروفات جديد' : 'Log Daily Expense Entry'}</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              
              {/* Title */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#6E6A63] font-bold block">{isAr ? 'بند المصروف / اسم المشتريات *' : 'Expense Title *'}</label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: شراء صبغات لوريال' : 'e.g. Salon styling products'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F6F4] border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>

              {/* Amount & Date row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#6E6A63] font-bold block">{isAr ? 'القيمة بالريال (SAR) *' : 'Amount (SAR) *'}</label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.05"
                    placeholder="120"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F6F4] border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#6E6A63] font-bold block">{isAr ? 'التاريخ *' : 'Date *'}</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F6F4] border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] font-mono"
                  />
                </div>
              </div>

              {/* Category & Payment Method row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#6E6A63] font-bold block">{isAr ? 'تصنيف المصروف *' : 'Category *'}</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F6F4] border border-[#E9E7E2] rounded-xl focus:outline-none font-bold"
                  >
                    <option value="supplies">{isAr ? 'مستلزمات ومواد تجميل' : 'Supplies'}</option>
                    <option value="utilities">{isAr ? 'فواتير وتشغيل' : 'Utilities'}</option>
                    <option value="marketing">{isAr ? 'تسويق وإعلانات' : 'Marketing'}</option>
                    <option value="maintenance">{isAr ? 'صيانة وإصلاحات' : 'Maintenance'}</option>
                    <option value="salaries">{isAr ? 'أجور ورواتب' : 'Salaries'}</option>
                    <option value="petty_cash">{isAr ? 'ضيافة ونثريات' : 'Petty Cash'}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#6E6A63] font-bold block">{isAr ? 'طريقة الدفع *' : 'Payment Method *'}</label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F6F4] border border-[#E9E7E2] rounded-xl focus:outline-none font-bold"
                  >
                    <option value="cash">{isAr ? 'نقدي (كاش)' : 'Cash'}</option>
                    <option value="card">{isAr ? 'بطاقة ائتمان/مدى' : 'Card'}</option>
                    <option value="bank_transfer">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                  </select>
                </div>
              </div>

              {/* Responsible Staff */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#6E6A63] font-bold block">{isAr ? 'الموظف المسؤول / المخول' : 'Responsible Specialist'}</label>
                <input
                  type="text"
                  placeholder={isAr ? 'اسم الموظف أو خبيرة التجميل' : 'Staff member name'}
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F6F4] border border-[#E9E7E2] rounded-xl focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#6E6A63] font-bold block">{isAr ? 'ملاحظات وتفاصيل إضافية' : 'Notes & Details'}</label>
                <textarea
                  placeholder={isAr ? 'أي تفاصيل، أرقام فواتير أو مستلزمات...' : 'Invoice details...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-[#F6F6F4] border border-[#E9E7E2] rounded-xl focus:outline-none"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FF5A5F] text-white font-bold rounded-xl hover:bg-[#ff4248] transition-colors"
                >
                  {isAr ? 'تسجيل القيد وحفظه' : 'Record Expense'}
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
