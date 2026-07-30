export interface Booking {
  id: string;
  time: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceName?: string;   // stored directly on WhatsApp / online bookings
  staffId: string;
  duration: number; // in minutes
  price: number;
  status: 'pending' | 'confirmed' | 'attended' | 'cancelled' | 'no_show';
  date: string; // YYYY-MM-DD
  notes?: string;
  branchId?: string;
  source?: 'manual' | 'whatsapp' | 'online' | string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // minutes
  category: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  minStock: number;
  category: string;
  branchId?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  visits: number;
  notes?: string;
  loyaltyPoints?: number;
  totalSpend?: number;
  manualClassification?: 'VIP' | 'Regular' | 'New' | 'Inactive' | 'Star';
  manualRating?: number;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  bookingsToday: number;
  email?: string;
  phone?: string;
  isActive?: boolean;
  username?: string;
  secureLinkToken?: string;
}

export interface InvoiceItem {
  type: 'service' | 'product';
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  clientName: string;
  date: string;
  time: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number; // 15%
  total: number;
  paymentMethod: 'cash' | 'card' | 'link';
  taxNumber?: string;
  showLogo?: boolean;
  branchId?: string;
}

export interface Branch {
  id: string;
  nameAr: string;
  nameEn: string;
  addressAr: string;
  addressEn: string;
  cityAr: string;
  cityEn: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discount: number;
  status: 'active' | 'inactive';
  code: string;
}

export interface GiftCard {
  id: string;
  code: string;
  value: number;
  status: 'active' | 'used' | 'expired';
}

export interface ProviderRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  storeName: string;
  activity: string;
  status: 'pending' | 'approved';
  requestedAt: string;
  selectedPackage?: string;
  billingCycle?: string;
  amountPaid?: string;
  paymentMethod?: string;
  paymentStatus?: string;
}

export interface SubscriptionPackage {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  priceMonthly: number;
  priceYearly: number; // monthly rate when billed yearly
  featuresAr: string[];
  featuresEn: string[];
  isPopular?: boolean;
  isEnterpriseContact?: boolean;
}


