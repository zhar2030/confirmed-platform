import { Booking, Service, Product, Client, Staff, Invoice, Promotion, GiftCard, Branch } from './types';

export const initialBranches: Branch[] = [
  {
    id: 'br-riyadh',
    nameAr: 'فرع الرياض - التخصصي',
    nameEn: 'Riyadh Branch - Al Takhassusi',
    addressAr: 'طريق التخصصي، حي العليا',
    addressEn: 'Al Takhassusi Rd, Al Olaya',
    cityAr: 'الرياض',
    cityEn: 'Riyadh'
  },
  {
    id: 'br-jeddah',
    nameAr: 'فرع جدة - الروضة',
    nameEn: 'Jeddah Branch - Al Rawdah',
    addressAr: 'شارع الأمير سعود الفيصل، حي الروضة',
    addressEn: 'Prince Saud Al Faisal St, Al Rawdah',
    cityAr: 'جدة',
    cityEn: 'Jeddah'
  },
  {
    id: 'br-khobar',
    nameAr: 'فرع الخبر - الحزام',
    nameEn: 'Khobar Branch - Al Hizam',
    addressAr: 'طريق الأمير فيصل بن فهد، حي الحزام الأخضر',
    addressEn: 'Prince Faisal bin Fahd Rd, Al Hizam Al Akhdar',
    cityAr: 'الخبر',
    cityEn: 'Khobar'
  }
];

export const initialServices: Service[] = [
  { id: 's1', name: 'قص وسشوار', price: 120, duration: 45, category: 'شعر' },
  { id: 's2', name: 'صبغة كاملة', price: 350, duration: 120, category: 'شعر' },
  { id: 's3', name: 'علاج بروتين شعر', price: 600, duration: 180, category: 'شعر' },
  { id: 's4', name: 'جلسة سبا 90 دقيقة', price: 280, duration: 90, category: 'سبا' },
  { id: 's5', name: 'عناية بالأظافر (مانيكير)', price: 90, duration: 40, category: 'أظافر' },
  { id: 's6', name: 'تنظيف بشرة عميق', price: 220, duration: 60, category: 'بشرة' },
  { id: 's7', name: 'مكياج سهرة كامل', price: 300, duration: 60, category: 'مكياج' }
];

export const initialProducts: Product[] = [
  // br-riyadh
  { id: 'p1', name: 'شامبو علاجي 500مل', price: 85, stock: 14, minStock: 5, category: 'عناية بالشعر', branchId: 'br-riyadh' },
  { id: 'p2', name: 'ماسك ترطيب عميق', price: 60, stock: 3, minStock: 5, category: 'عناية بالشعر', branchId: 'br-riyadh' },
  { id: 'p3', name: 'زيت أرغان عضوي', price: 110, stock: 9, minStock: 4, category: 'عناية بالشعر', branchId: 'br-riyadh' },
  { id: 'p4', name: 'مثبت مكياج احترافي', price: 75, stock: 2, minStock: 4, category: 'مكياج', branchId: 'br-riyadh' },
  { id: 'p5', name: 'كريم واقي حراري للشعر', price: 95, stock: 11, minStock: 5, category: 'عناية بالشعر', branchId: 'br-riyadh' },

  // br-jeddah
  { id: 'pj1', name: 'سيروم للشعر التالف', price: 130, stock: 15, minStock: 6, category: 'عناية بالشعر', branchId: 'br-jeddah' },
  { id: 'pj2', name: 'مقشر البشرة بالقهوة', price: 80, stock: 1, minStock: 3, category: 'بشرة', branchId: 'br-jeddah' },
  { id: 'pj3', name: 'بلسم الكيراتين العضوي', price: 115, stock: 20, minStock: 5, category: 'عناية بالشعر', branchId: 'br-jeddah' },

  // br-khobar
  { id: 'pk1', name: 'مرطب الشفاه المخملي', price: 45, stock: 25, minStock: 10, category: 'مكياج', branchId: 'br-khobar' },
  { id: 'pk2', name: 'كريم اليدين المكثف', price: 50, stock: 2, minStock: 5, category: 'أظافر', branchId: 'br-khobar' },
  { id: 'pk3', name: 'حمام كريم جوز الهند', price: 90, stock: 12, minStock: 4, category: 'عناية بالشعر', branchId: 'br-khobar' }
];

export const initialClients: Client[] = [
  { id: 'c1', name: 'سارة المطيري', phone: '0551112222', visits: 12, notes: 'حساسية من مادة الأمونيا في الصبغات', loyaltyPoints: 125, totalSpend: 2350, manualClassification: 'Regular', manualRating: 4 },
  { id: 'c2', name: 'نوف العتيبي', phone: '0553334444', visits: 8, notes: 'تفضل أمل دائماً لقص وسشوار الشعر', loyaltyPoints: 80, totalSpend: 1120, manualClassification: 'Regular', manualRating: 4 },
  { id: 'c3', name: 'حصة الكثيري', phone: '0555556666', visits: 15, notes: 'تحب المشروبات الساخنة بدون سكر', loyaltyPoints: 195, totalSpend: 4200, manualClassification: 'VIP', manualRating: 5 },
  { id: 'c4', name: 'لمى السبيعي', phone: '0557778888', visits: 5, notes: 'آخر صبغة شعر استخدمت درجة لون 6.35', loyaltyPoints: 50, totalSpend: 780, manualClassification: 'New', manualRating: 3 },
  { id: 'c5', name: 'ريما القحطاني', phone: '0559990000', visits: 22, notes: 'عضوة في باقة السبا الشهرية', loyaltyPoints: 340, totalSpend: 6850, manualClassification: 'VIP', manualRating: 5 }
];

export const initialStaff: Staff[] = [
  { id: 'e1', name: 'أمل', role: 'خبيرة شعر', bookingsToday: 3, email: 'marktning@onfirmedmarketing.com', phone: '0551112222', isActive: true, username: 'amal.hair', secureLinkToken: 'token_amal_8a92f0' },
  { id: 'e2', name: 'دلال', role: 'خبيرة بشرة وسبا', bookingsToday: 2, email: 'marktning@onfirmedmarketing.com', phone: '0552223333', isActive: true, username: 'dalal.spa', secureLinkToken: 'token_dalal_4b77c1' },
  { id: 'e3', name: 'شهد', role: 'فنية أظافر', bookingsToday: 4, email: 'marktning@onfirmedmarketing.com', phone: '0553334444', isActive: true, username: 'shahad.nail', secureLinkToken: 'token_shahad_9c21e3' },
  { id: 'e4', name: 'جواهر', role: 'خبيرة مكياج', bookingsToday: 1, email: 'marktning@onfirmedmarketing.com', phone: '0554445555', isActive: false, username: 'jawahir.mua', secureLinkToken: 'token_jawahir_5e88d0' }
];

export const initialBookings: Booking[] = [
  // br-riyadh
  {
    id: 'b1',
    time: '10:00',
    clientName: 'سارة المطيري',
    clientPhone: '0551112222',
    serviceId: 's1',
    staffId: 'e1',
    duration: 45,
    price: 120,
    status: 'confirmed',
    date: '2026-07-18',
    notes: 'تفضل سشوار مموج',
    branchId: 'br-riyadh'
  },
  {
    id: 'b2',
    time: '11:30',
    clientName: 'نوف العتيبي',
    clientPhone: '0553334444',
    serviceId: 's5',
    staffId: 'e3',
    duration: 40,
    price: 90,
    status: 'confirmed',
    date: '2026-07-18',
    notes: 'عناية كاملة مع طلاء شفاف',
    branchId: 'br-riyadh'
  },
  {
    id: 'b3',
    time: '13:00',
    clientName: 'حصة الكثيري',
    clientPhone: '0555556666',
    serviceId: 's4',
    staffId: 'e2',
    duration: 90,
    price: 280,
    status: 'attended',
    date: '2026-07-18',
    notes: 'استرخاء عميق',
    branchId: 'br-riyadh'
  },
  {
    id: 'b4',
    time: '15:30',
    clientName: 'لمى السبيعي',
    clientPhone: '0557778888',
    serviceId: 's2',
    staffId: 'e1',
    duration: 120,
    price: 350,
    status: 'confirmed',
    date: '2026-07-18',
    branchId: 'br-riyadh'
  },
  {
    id: 'b5',
    time: '16:45',
    clientName: 'ريما القحطاني',
    clientPhone: '0559990000',
    serviceId: 's6',
    staffId: 'e2',
    duration: 60,
    price: 220,
    status: 'confirmed',
    date: '2026-07-18',
    branchId: 'br-riyadh'
  },
  {
    id: 'b6',
    time: '18:00',
    clientName: 'نوف العتيبي',
    clientPhone: '0553334444',
    serviceId: 's7',
    staffId: 'e4',
    duration: 60,
    price: 300,
    status: 'confirmed',
    date: '2026-07-18',
    branchId: 'br-riyadh'
  },

  // br-jeddah
  {
    id: 'bj-b1',
    time: '11:00',
    clientName: 'ليلى الحربي',
    clientPhone: '0561234567',
    serviceId: 's2',
    staffId: 'e1',
    duration: 120,
    price: 350,
    status: 'confirmed',
    date: '2026-07-18',
    branchId: 'br-jeddah'
  },
  {
    id: 'bj-b2',
    time: '14:00',
    clientName: 'رنا الغامدي',
    clientPhone: '0567654321',
    serviceId: 's4',
    staffId: 'e2',
    duration: 90,
    price: 280,
    status: 'confirmed',
    date: '2026-07-18',
    branchId: 'br-jeddah'
  },

  // br-khobar
  {
    id: 'bk-b1',
    time: '15:00',
    clientName: 'مريم الدوسري',
    clientPhone: '0543219876',
    serviceId: 's6',
    staffId: 'e2',
    duration: 60,
    price: 220,
    status: 'confirmed',
    date: '2026-07-18',
    branchId: 'br-khobar'
  }
];

export const initialInvoices: Invoice[] = [
  // br-riyadh
  {
    id: 'INV-1046',
    clientName: 'حصة الكثيري',
    date: '2026-07-18',
    time: '14:35',
    items: [
      { type: 'service', id: 's4', name: 'جلسة سبا 90 دقيقة', quantity: 1, price: 280 },
      { type: 'product', id: 'p3', name: 'زيت أرغان عضوي', quantity: 1, price: 110 }
    ],
    subtotal: 390,
    tax: 58.5,
    total: 448.5,
    paymentMethod: 'card',
    branchId: 'br-riyadh'
  },
  {
    id: 'INV-1045',
    clientName: 'لمى السبيعي',
    date: '2026-07-18',
    time: '12:10',
    items: [
      { type: 'service', id: 's2', name: 'صبغة كاملة', quantity: 1, price: 350 },
      { type: 'product', id: 'p3', name: 'زيت أرغان عضوي', quantity: 1, price: 110 },
      { type: 'service', id: 's7', name: 'مكياج سهرة كامل', quantity: 1, price: 140 }
    ],
    subtotal: 600,
    tax: 90,
    total: 690,
    paymentMethod: 'card',
    branchId: 'br-riyadh'
  },
  {
    id: 'INV-1044',
    clientName: 'ريما القحطاني',
    date: '2026-07-17',
    time: '17:50',
    items: [
      { type: 'service', id: 's6', name: 'تنظيف بشرة عميق', quantity: 1, price: 220 }
    ],
    subtotal: 220,
    tax: 33,
    total: 253,
    paymentMethod: 'cash',
    branchId: 'br-riyadh'
  },
  {
    id: 'INV-1043',
    clientName: 'سارة المطيري',
    date: '2026-07-17',
    time: '11:15',
    items: [
      { type: 'service', id: 's1', name: 'قص وسشوار', quantity: 1, price: 120 }
    ],
    subtotal: 120,
    tax: 18,
    total: 138,
    paymentMethod: 'link',
    branchId: 'br-riyadh'
  },

  // br-jeddah
  {
    id: 'INV-J01',
    clientName: 'ليلى الحربي',
    date: '2026-07-18',
    time: '13:00',
    items: [
      { type: 'service', id: 's2', name: 'صبغة كاملة', quantity: 1, price: 350 }
    ],
    subtotal: 350,
    tax: 52.5,
    total: 402.5,
    paymentMethod: 'card',
    branchId: 'br-jeddah'
  },

  // br-khobar
  {
    id: 'INV-K01',
    clientName: 'مريم الدوسري',
    date: '2026-07-18',
    time: '16:00',
    items: [
      { type: 'service', id: 's6', name: 'تنظيف بشرة عميق', quantity: 1, price: 220 }
    ],
    subtotal: 220,
    tax: 33,
    total: 253,
    paymentMethod: 'cash',
    branchId: 'br-khobar'
  }
];

export const initialPromotions: Promotion[] = [
  {
    id: 'pr1',
    title: 'خصم 30% على جلسات السبا',
    description: 'خصم خاص أيام الاثنين من الساعة 4:00 عصراً وحتى 7:00 مساءً',
    discount: 30,
    status: 'active',
    code: 'SPA30'
  },
  {
    id: 'pr2',
    title: 'عرض العناية بالأظافر (اشتري واحصلي على الثانية بنصف السعر)',
    description: 'يسري حتى نهاية شهر يوليو على خدمات المانيكير والباديكير',
    discount: 25,
    status: 'active',
    code: 'NAIL50'
  }
];

export const initialGiftCards: GiftCard[] = [
  { id: 'gc1', code: 'GC-2201', value: 300, status: 'active' },
  { id: 'gc2', code: 'GC-2198', value: 150, status: 'used' },
  { id: 'gc3', code: 'GC-2190', value: 500, status: 'active' }
];
