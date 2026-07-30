import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ar' | 'en';

interface LanguageContextType {
  lang: Language;
  toggleLanguage: () => void;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
  isAr: boolean;
  isEn: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const dictionary: Record<Language, Record<string, string>> = {
  ar: {
    // Common & Global
    brandName: 'CONFIRMED',
    brandSub: 'نظام إدارة حجوزات الخدمات',
    brandDesc: 'منظومة سحابية سعودية متكاملة لإدارة حجوزات الخدمات وصالونات ومراكز التجميل والسبا - الكاشير، الفواتير الإلكترونية، والمخزون المطور',
    byAhmed: 'CONFIRMED SYSTEM',
    logout: 'تسجيل الخروج للموقع',
    currentUser: 'المستخدم: مديرة النظام',
    currentBranch: 'فرع الرياض - التخصصي',
    currency: 'ر.س',
    currencyFull: 'ريال سعودي',
    vatLabel: 'شامل ضريبة القيمة المضافة ١٥٪',
    save: 'حفظ',
    cancel: 'إلغاء',
    add: 'إضافة',
    delete: 'حذف',
    search: 'بحث...',
    status: 'الحالة',
    actions: 'الإجراءات',
    close: 'إغلاق',
    edit: 'تعديل',
    today: 'اليوم',
    all: 'الكل',
    pending: 'قيد الانتظار',
    confirmed: 'مؤكد',
    attended: 'تم الحضور',
    cancelled: 'ملغي',
    active: 'نشط',
    inactive: 'غير نشط',
    used: 'مستخدم',
    expired: 'منتهي الصلاحية',
    none: 'لا يوجد',

    // Navigation / Tabs
    dash: 'لوحة التحكم',
    book: 'الحجوزات والتقويم',
    pos: 'نقاط البيع والفواتير',
    inv: 'المخزون والمنتجات',
    crm: 'سجل العملاء (CRM)',
    staff: 'طاقم العمل',
    mkt: 'التسويق والعروض',
    gift: 'بطاقات الإهداء والعضويات',
    rep: 'التقارير والمكاسب',
    set: 'إعدادات الفرع',
    roadmap: 'خارطة طريق المنتج (AI)',

    // Landing Page
    features: 'المميزات',
    howItWorks: 'كيف يعمل',
    pricing: 'الأسعار',
    faq: 'الأسئلة الشائعة',
    contactUs: 'اتصلي بنا',
    loginToSystem: 'تسجيل الدخول للنظام',
    startFree: 'ابدئي مجاناً',
    heroTag: 'مصمم خصيصًا لفهم سلوك عملاء الصالونات والسبا',
    heroTitle1: 'صالونك يشتغل بنظام..',
    heroTitle2: 'وأنتِ تركّزين على الإبداع',
    heroDesc: 'يحلل Confirmed بيانات عملائك ويحوّلها إلى قرارات واضحة تساعدك على زيادة الاحتفاظ واستعادة العملاء المنقطعين واكتشاف الإيرادات غير المستغلة وتحسين استغلال الطاقة التشغيلية',
    quickDemo: 'تجربة النظام السريعة',
    noCardRequired: 'لا يتطلب بطاقة ائتمانية * تجربة مجانية ١٤ يوم',
    trustedBy: 'شريك النجاح لأكثر من 450+ صالون ومركز تجميل بالمملكة',
    featuresTitle: 'كل ما تحتاجينه لإدارة صالونك باحترافية وسهولة',
    featuresSub: 'نظام متكامل يغنيكِ عن الدفاتر وبرامج الكاشير التقليدية المعقدة',
    howTitle: '٣ خطوات بسيطة وتنطلقين نحو النجاح والنمو',
    howSub: 'نقل صالونك إلى CONFIRMED يستغرق دقائق معدودة بدون أي تعقيد تقني',
    pricingTitle: 'خطط أسعار واضحة ومرنة تناسب حجم أعمالكِ',
    pricingSub: 'ابدئي بالخطة الأساسية وقومي بالترقية مع نمو صالونك وزيادة عميلاتك',
    faqTitle: 'الأسئلة الأكثر شيوعاً واستفسارات العميلات',
    faqSub: 'إليكِ إجابات لأبرز الأسئلة حول نظام CONFIRMED لإدارة الصالونات والسبا',
    contactTitle: 'تواصل مباشر مع فريق CONFIRMED لخدمة العملاء',
    contactSub: 'هل لديك استفسار محدد أو ترغبين في حجز جلسة استشارة مخصصة لعرض النظام؟',

    // Login Form Modal
    loginTitle: 'دخول لوحة التحكم للنظام',
    loginSub: 'الرجاء إدخال بيانات الدخول لإدارة صالونك',
    usernameLabel: 'اسم المستخدم أو البريد الإلكتروني',
    passwordLabel: 'كلمة المرور',
    demoTip: '💡 للدخول المباشر والتجربة، اضغطي على زر "تسجيل الدخول للنظام" مباشرة.',

    // Dashboard Overview
    todayBookings: 'حجوزات اليوم',
    todaySales: 'مبيعات اليوم',
    registeredClients: 'العميلات المسجلات',
    stockAlerts: 'تنبيهات المخزون',
    bookingConfirmedCount: 'مؤكدة',
    basedOnInvoices: 'من واقع فواتير اليوم',
    registeredInBranch: 'عميلات مسجلات بالفرع',
    stockNormal: 'حالة المخزون ممتازة',
    stockWarning: 'منتجات تحتاج إعادة طلب',
    salesLast7Days: 'مبيعات آخر 7 أيام',
    dailyDetails: 'المبيعات اليومية',
    todaySchedule: 'جدول مواعيد اليوم المباشر',
    allBookings: 'جميع الحجوزات',
    clientName: 'العميلة',
    timeLabel: 'الوقت',
    serviceLabel: 'الخدمة',
    staffLabel: 'الموظفة',
    recentInvoices: 'آخر الفواتير الإلكترونية الصادرة',
    posLabel: 'نقطة البيع',
    invoiceId: 'رقم الفاتورة',
    totalLabel: 'الإجمالي',
    paymentMethod: 'طريقة الدفع',

    // Bookings Manager
    bookingsTitle: 'إدارة المواعيد والتقويم',
    addNewBooking: 'حجز موعد جديد',
    selectClient: 'اختر العميلة',
    selectService: 'اختر الخدمة',
    selectStaff: 'اختر الموظفة',
    selectDate: 'اختر التاريخ',
    selectTime: 'اختر الوقت',
    notes: 'ملاحظات إضافية',
    allBookingsTable: 'جدول المواعيد الشامل',
    searchClient: 'البحث باسم العميلة...',
    phoneLabel: 'رقم الجوال',
    priceLabel: 'السعر',
    durationLabel: 'المدة',

    // POS Manager
    posTitle: 'شاشة الكاشير ونقاط البيع السريعة',
    addItemsToInvoice: 'إضافة الخدمات والمنتجات للفاتورة',
    searchServicesProducts: 'البحث في الخدمات أو المنتجات...',
    invoiceSummary: 'تفاصيل الفاتورة الإلكترونية الحالية',
    walkInClient: 'عميلة عابرة (افتراضي)',
    discountPromo: 'كود خصم أو ترويج',
    apply: 'تطبيق',
    subtotal: 'المجموع الفرعي',
    taxVat: 'ضريبة القيمة المضافة (15%)',
    totalPayable: 'المبلغ الإجمالي المستحق',
    paymentMethodSelect: 'طريقة السداد المعتمدة',
    cash: 'نقدي',
    card: 'بطاقة مدى / فيزا',
    link: 'رابط دفع إلكتروني',
    printInvoice: 'إصدار الفاتورة وحفظها',
    paymentDone: 'تم الدفع بنجاح وإصدار الفاتورة الإلكترونية المعتمدة!',
    invoiceList: 'سجل الفواتير الصادرة بالفرع',

    // Inventory Manager
    inventoryTitle: 'مراقبة المخزون وإدارة المنتجات',
    addNewProduct: 'إضافة منتج جديد للمستودع',
    productName: 'اسم المنتج',
    categoryLabel: 'القسم / الفئة',
    stockLevel: 'الكمية المتوفرة حالياً',
    minStockLevel: 'الحد الأدنى للتنبيه',
    currentInventory: 'قائمة منتجات التجزئة والاستخدام',
    lowStockLabel: 'مخزون منخفض',
    inStockLabel: 'متوفر',
    updateStock: 'تحديث الكمية',

    // CRM Manager
    crmTitle: 'سجل بيانات العميلات ونقاط الولاء',
    addNewClient: 'تسجيل عميلة جديدة بالفرع',
    clientPhone: 'رقم الجوال',
    visitsCount: 'عدد الزيارات السابقة',
    notesAboutClient: 'ملاحظات وتفضيلات العميلة',
    activeClients: 'قائمة عيِّنات العميلات المسجلات',
    loyaltyPoints: 'نقاط الولاء والزيارات',
    addNotes: 'تحديث تفضيلات العميلة',

    // Staff Manager
    staffTitle: 'طاقم العمل والجدولة والعمولات',
    addNewStaff: 'تسجيل موظفة جديدة',
    staffName: 'اسم الموظفة',
    staffRole: 'المسمى الوظيفي / الاختصاص',
    bookingsTodayLabel: 'حجوزات مسندة اليوم',
    staffList: 'طاقم العمل والنشاط الحالي بالفرع',

    // Marketing Manager
    marketingTitle: 'حملات التسويق الأكواد والخصومات',
    addNewPromo: 'إنشاء كود خصم جديد',
    promoCode: 'رمز الكوبون (الرمز)',
    promoTitle: 'عنوان العرض / الحملة',
    promoDesc: 'شروط العرض وتفاصيله',
    discountValue: 'نسبة الخصم (%)',
    promotionsList: 'العروض الترويجية النشطة',
    toggleStatus: 'تغيير حالة الكود',

    // Gift Cards Manager
    giftCardsTitle: 'بطاقات الإهداء الرقمية والعضويات والمحافظ',
    addNewGiftCard: 'شحن بطاقة إهداء جديدة لعميلة',
    giftCardCode: 'رقم كود البطاقة الإلكتروني',
    giftCardValue: 'رصيد البطاقة (ر.س)',
    giftCardsList: 'سجل أرصدة بطاقات الإهداء الصادرة والنشطة',

    // Reports Manager
    reportsTitle: 'التقارير المالية والتحليلات البيانية والعمولات',
    revenueBreakdown: 'تحليل الإيرادات والإنتاجية الإجمالية',
    totalEarnings: 'إجمالي الدخل المحقق',
    vatCollected: 'الضرائب المستقطعة المستحقة',
    avgTicket: 'متوسط قيمة سلة المشتريات للعميلة',
    topServices: 'أكثر الخدمات طلباً ورواجاً بالفرع',
    topStaff: 'الموظفات الأكثر إنتاجية وعمولة',

    // Settings Manager
    settingsTitle: 'إعدادات الفرع والمنظومة العامة',
    branchInfo: 'معلومات وموقع الفرع الفرعي الرئيسي',
    branchName: 'اسم الفرع المسجل',
    taxNumber: 'الرقم الضريبي الموحد',
    workHours: 'أوقات العمل الرسمية بالصالون',
    openHour: 'ساعة فتح الصالون',
    closeHour: 'ساعة الإغلاق المسائية',
    settingsSaved: 'تم حفظ كافة الإعدادات والخيارات بنجاح!'
  },
  en: {
    // Common & Global
    brandName: 'CONFIRMED',
    brandSub: 'Services Booking & Management',
    brandDesc: 'Integrated Saudi cloud system to manage services, salons, and beauty spas - Bookings, POS, E-invoices, and Inventory',
    byAhmed: 'CONFIRMED SYSTEM',
    logout: 'Logout to Landing',
    currentUser: 'User: System Admin',
    currentBranch: 'Riyadh Branch - Al Takhassusi',
    currency: 'SAR',
    currencyFull: 'Saudi Riyal',
    vatLabel: 'Includes 15% VAT',
    save: 'Save',
    cancel: 'Cancel',
    add: 'Add',
    delete: 'Delete',
    search: 'Search...',
    status: 'Status',
    actions: 'Actions',
    close: 'Close',
    edit: 'Edit',
    today: 'Today',
    all: 'All',
    pending: 'Pending',
    confirmed: 'Confirmed',
    attended: 'Attended',
    cancelled: 'Cancelled',
    active: 'Active',
    inactive: 'Inactive',
    used: 'Used',
    expired: 'Expired',
    none: 'None',

    // Navigation / Tabs
    dash: 'Dashboard',
    book: 'Bookings & Calendar',
    pos: 'POS & Invoicing',
    inv: 'Inventory & Products',
    crm: 'Client Database (CRM)',
    staff: 'Team',
    mkt: 'Marketing & Offers',
    gift: 'Gift Cards & Memberships',
    rep: 'Reports & Earnings',
    set: 'Branch Settings',
    roadmap: 'Product Roadmap (AI)',

    // Landing Page
    features: 'Features',
    howItWorks: 'How It Works',
    pricing: 'Pricing',
    faq: 'FAQ',
    contactUs: 'Contact Us',
    loginToSystem: 'Login to System',
    startFree: 'Start Free',
    heroTag: 'Designed specially for salons and spas in Saudi Arabia 🇸🇦',
    heroTitle1: 'Your Salon on Autopilot..',
    heroTitle2: 'While You Focus on Creativity',
    heroDesc: 'CONFIRMED cloud system manages bookings, cash register, certified e-invoices, and your clients data in one place—to reduce no-shows and increase sales by over 30%.',
    quickDemo: 'Quick Demo Entry',
    noCardRequired: 'No credit card required * 14-day free trial',
    trustedBy: 'Success partner for over 450+ beauty salons and spas in the Kingdom',
    featuresTitle: 'Everything you need to run your salon professionally and easily',
    featuresSub: 'An integrated system that replaces notebooks and complicated legacy POS software',
    howTitle: '3 Simple steps to start growing your business',
    howSub: 'Moving your salon to CONFIRMED takes only minutes without any technical complexity',
    pricingTitle: 'Clear and flexible plans for your business size',
    pricingSub: 'Start with the basic plan and upgrade as your salon and clients database grow',
    faqTitle: 'Frequently asked questions',
    faqSub: 'Here are the answers to the most common questions about CONFIRMED Salon & Spa system',
    contactTitle: 'Direct support from CONFIRMED team',
    contactSub: 'Do you have a specific inquiry or want a customized consultation session to showcase the system?',

    // Login Form Modal
    loginTitle: 'System Admin Login',
    loginSub: 'Please enter credentials to manage your salon',
    usernameLabel: 'Username or Email',
    passwordLabel: 'Password',
    demoTip: '💡 For instant demo, click "Login to System" directly.',

    // Dashboard Overview
    todayBookings: "Today's Bookings",
    todaySales: "Today's Sales",
    registeredClients: 'Registered Clients',
    stockAlerts: 'Inventory Alerts',
    bookingConfirmedCount: 'Confirmed',
    basedOnInvoices: "From today's e-invoices",
    registeredInBranch: 'Clients registered at branch',
    stockNormal: 'Inventory level is perfect',
    stockWarning: 'Products need reordering',
    salesLast7Days: 'Sales Last 7 Days',
    dailyDetails: 'Daily Sales Details',
    todaySchedule: "Today's Schedule & Appointments",
    allBookings: 'All Bookings',
    clientName: 'Client Name',
    timeLabel: 'Time',
    serviceLabel: 'Service',
    staffLabel: 'Staff / Stylist',
    recentInvoices: 'Recent Electronic Invoices',
    posLabel: 'Point of Sale',
    invoiceId: 'Invoice ID',
    totalLabel: 'Total',
    paymentMethod: 'Payment Method',

    // Bookings Manager
    bookingsTitle: 'Appointments & Calendar Management',
    addNewBooking: 'Book New Appointment',
    selectClient: 'Select Client',
    selectService: 'Select Service',
    selectStaff: 'Select Staff',
    selectDate: 'Select Date',
    selectTime: 'Select Time',
    notes: 'Additional Notes',
    allBookingsTable: 'Full Bookings Schedule',
    searchClient: 'Search client name...',
    phoneLabel: 'Phone Number',
    priceLabel: 'Price',
    durationLabel: 'Duration',

    // POS Manager
    posTitle: 'Cashier & POS Screen',
    addItemsToInvoice: 'Add Services & Products to Invoice',
    searchServicesProducts: 'Search services or products...',
    invoiceSummary: 'Current Electronic Invoice',
    walkInClient: 'Walk-In Client (Default)',
    discountPromo: 'Discount / Promo Code',
    apply: 'Apply',
    subtotal: 'Subtotal',
    taxVat: 'VAT (15%)',
    totalPayable: 'Total Payable Amount',
    paymentMethodSelect: 'Payment Method',
    cash: 'Cash',
    card: 'Mada / Credit Card',
    link: 'Online Payment Link',
    printInvoice: 'Issue & Save Invoice',
    paymentDone: 'Payment successful! Certified electronic invoice generated.',
    invoiceList: 'Issued Invoices Registry',

    // Inventory Manager
    inventoryTitle: 'Inventory Control & Products',
    addNewProduct: 'Add New Product to Warehouse',
    productName: 'Product Name',
    categoryLabel: 'Category',
    stockLevel: 'Current Stock Qty',
    minStockLevel: 'Minimum Stock Warning Alert',
    currentInventory: 'Retail & Professional Stock List',
    lowStockLabel: 'Low Stock',
    inStockLabel: 'In Stock',
    updateStock: 'Update Stock',

    // CRM Manager
    crmTitle: 'Clients Database & Loyalty',
    addNewClient: 'Register New Client',
    clientPhone: 'Phone Number',
    visitsCount: 'Previous Visits',
    notesAboutClient: 'Client Notes & Preferences',
    activeClients: 'Registered Clients Directory',
    loyaltyPoints: 'Visits & Loyalty Points',
    addNotes: 'Update client preferences',

    // Staff Manager
    staffTitle: 'Staff, Schedules & Commissions',
    addNewStaff: 'Register New Stylist / Staff',
    staffName: 'Staff Name',
    staffRole: 'Job Role / Specialization',
    bookingsTodayLabel: 'Assigned Today',
    staffList: 'Staff Members & Daily Activity',

    // Marketing Manager
    marketingTitle: 'Marketing Campaigns & Discount Codes',
    addNewPromo: 'Create New Promo Code',
    promoCode: 'Coupon Code (Unique)',
    promoTitle: 'Promo Title / Campaign',
    promoDesc: 'Promo details and validity',
    discountValue: 'Discount Percentage (%)',
    promotionsList: 'Active Promotional Codes',
    toggleStatus: 'Toggle Coupon Status',

    // Gift Cards Manager
    giftCardsTitle: 'Digital Gift Cards & Memberships',
    addNewGiftCard: 'Issue New Gift Card to Client',
    giftCardCode: 'Gift Card Code (Electronic)',
    giftCardValue: 'Card Balance (SAR)',
    giftCardsList: 'Issued & Active Gift Cards Registry',

    // Reports Manager
    reportsTitle: 'Financial Reports & Analytics',
    revenueBreakdown: 'Revenue & Overall Salon Performance',
    totalEarnings: 'Total Net Revenue',
    vatCollected: 'VAT Tax Collected',
    avgTicket: 'Average Client Ticket',
    topServices: 'Best Selling Services',
    topStaff: 'Highest Commission Earners',

    // Settings Manager
    settingsTitle: 'Branch Settings & General Setup',
    branchInfo: 'Branch Information & Physical Location',
    branchName: 'Registered Branch Name',
    taxNumber: 'Unified Tax ID (VAT)',
    workHours: 'Official Working Hours',
    openHour: 'Branch Opening Time',
    closeHour: 'Branch Closing Time',
    settingsSaved: 'All branch settings have been successfully updated!'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('confirmed_lang');
    return (saved === 'ar' || saved === 'en') ? saved : 'ar';
  });

  useEffect(() => {
    localStorage.setItem('confirmed_lang', lang);
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    
    // Change body classes to match styling rules
    if (lang === 'en') {
      document.body.classList.remove('font-sans');
      document.body.style.fontFamily = '"Inter", system-ui, sans-serif';
    } else {
      document.body.style.fontFamily = '';
      document.body.classList.add('font-sans');
    }
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prev => prev === 'ar' ? 'en' : 'ar');
  };

  const t = (key: string): string => {
    return dictionary[lang][key] || dictionary['ar'][key] || key;
  };

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const isAr = lang === 'ar';
  const isEn = lang === 'en';

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, setLang, t, dir, isAr, isEn }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
