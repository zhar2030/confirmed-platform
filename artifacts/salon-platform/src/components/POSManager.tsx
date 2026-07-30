import React, { useState } from 'react';
import { Service, Product, Invoice, InvoiceItem, Branch } from '../types';
import { ShoppingCart, Plus, Minus, CreditCard, DollarSign, Send, Trash2, Printer, Search, RefreshCw, Sparkles, FileDown, X } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface POSManagerProps {
  services: Service[];
  products: Product[];
  invoices: Invoice[];
  onAddInvoice: (invoice: Invoice) => void;
  onUpdateProductStock: (productId: string, newStock: number) => void;
  currentBranch?: Branch;
}

const QRCodeSVG = () => (
  <svg width="80" height="80" viewBox="0 0 100 100" className="mx-auto select-none">
    <rect x="0" y="0" width="100" height="100" fill="none" stroke="#E2E8F0" strokeWidth="2" rx="4" />
    <rect x="6" y="6" width="24" height="24" fill="#000" rx="2" />
    <rect x="10" y="10" width="16" height="16" fill="#FFF" rx="1" />
    <rect x="14" y="14" width="8" height="8" fill="#000" rx="0.5" />
    <rect x="70" y="6" width="24" height="24" fill="#000" rx="2" />
    <rect x="74" y="10" width="16" height="16" fill="#FFF" rx="1" />
    <rect x="78" y="14" width="8" height="8" fill="#000" rx="0.5" />
    <rect x="6" y="70" width="24" height="24" fill="#000" rx="2" />
    <rect x="10" y="74" width="16" height="16" fill="#FFF" rx="1" />
    <rect x="14" y="78" width="8" height="8" fill="#000" rx="0.5" />
    <rect x="74" y="74" width="10" height="10" fill="#000" rx="1" />
    <rect x="77" y="77" width="4" height="4" fill="#FFF" />
    <rect x="36" y="6" width="6" height="6" fill="#000" />
    <rect x="44" y="6" width="12" height="4" fill="#000" />
    <rect x="60" y="8" width="4" height="8" fill="#000" />
    <rect x="36" y="16" width="10" height="6" fill="#000" />
    <rect x="50" y="14" width="4" height="10" fill="#000" />
    <rect x="58" y="18" width="8" height="4" fill="#000" />
    <rect x="36" y="26" width="14" height="4" fill="#000" />
    <rect x="54" y="24" width="12" height="6" fill="#000" />
    <rect x="6" y="36" width="6" height="12" fill="#000" />
    <rect x="16" y="36" width="12" height="4" fill="#000" />
    <rect x="14" y="44" width="6" height="8" fill="#000" />
    <rect x="36" y="36" width="8" height="8" fill="#000" />
    <rect x="48" y="36" width="16" height="4" fill="#000" />
    <rect x="68" y="36" width="6" height="12" fill="#000" />
    <rect x="78" y="36" width="16" height="4" fill="#000" />
    <rect x="36" y="48" width="22" height="6" fill="#000" />
    <rect x="62" y="50" width="10" height="10" fill="#000" />
    <rect x="76" y="44" width="18" height="6" fill="#000" />
    <rect x="6" y="56" width="16" height="4" fill="#000" />
    <rect x="26" y="54" width="6" height="10" fill="#000" />
    <rect x="36" y="58" width="8" height="12" fill="#000" />
    <rect x="48" y="58" width="20" height="4" fill="#000" />
    <rect x="72" y="54" width="4" height="14" fill="#000" />
    <rect x="80" y="54" width="14" height="6" fill="#000" />
    <rect x="14" y="64" width="8" height="4" fill="#000" />
    <rect x="48" y="66" width="12" height="8" fill="#000" />
    <rect x="64" y="72" width="6" height="12" fill="#000" />
    <rect x="88" y="64" width="6" height="12" fill="#000" />
    <rect x="36" y="74" width="6" height="14" fill="#000" />
    <rect x="46" y="78" width="14" height="4" fill="#000" />
    <rect x="78" y="88" width="16" height="6" fill="#000" />
    <rect x="14" y="88" width="18" height="6" fill="#000" />
    <rect x="48" y="88" width="10" height="6" fill="#000" />
    <rect x="62" y="88" width="10" height="6" fill="#000" />
  </svg>
);

export default function POSManager({ services, products, invoices, onAddInvoice, onUpdateProductStock, currentBranch }: POSManagerProps) {
  const { t, isAr } = useLanguage();
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [selectedClient, setSelectedClient] = useState(isAr ? 'حصة الكثيري' : 'Hessa Al-Katheeri');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'link'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'services' | 'products'>('all');
  const [lastIssuedInvoice, setLastIssuedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceForPdf, setSelectedInvoiceForPdf] = useState<Invoice | null>(null);
  
  // Custom Invoice/Tax configuration states
  const [taxNumber, setTaxNumber] = useState('310000000000003');
  const [showLogoOnInvoice, setShowLogoOnInvoice] = useState(true);

  // Cart Handlers
  const addToCart = (type: 'service' | 'product', item: Service | Product) => {
    // Check stock if product
    if (type === 'product') {
      const prod = item as Product;
      const existingInCart = cart.find(c => c.type === 'product' && c.id === prod.id);
      const requestedQty = (existingInCart?.quantity || 0) + 1;
      if (requestedQty > prod.stock) {
        alert(isAr ? `عذراً! الكمية المطلوبة غير متوفرة في المخزون. المتوفر: ${prod.stock}` : `Sorry! The requested quantity is not available in stock. Available: ${prod.stock}`);
        return;
      }
    }

    setCart(prev => {
      const existing = prev.find(i => i.type === type && i.id === item.id);
      if (existing) {
        return prev.map(i => i.type === type && i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { type, id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQuantity = (type: 'service' | 'product', id: string, amount: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.type === type && i.id === id);
      if (!existing) return prev;
      
      const newQty = existing.quantity + amount;
      if (newQty <= 0) {
        return prev.filter(i => !(i.type === type && i.id === id));
      }

      // Stock verification for product increments
      if (type === 'product' && amount > 0) {
        const prod = products.find(p => p.id === id);
        if (prod && newQty > prod.stock) {
          alert(isAr ? `المخزون المتوفر هو ${prod.stock} فقط` : `Available stock is only ${prod.stock}`);
          return prev;
        }
      }

      return prev.map(i => i.type === type && i.id === id ? { ...i, quantity: newQty } : i);
    });
  };

  const clearCart = () => setCart([]);

  // Math Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = Math.round((subtotal * 0.15) * 100) / 100; // 15% VAT
  const total = subtotal + tax;

  const handleIssueInvoice = () => {
    if (cart.length === 0) return;

    const newInvoice: Invoice = {
      id: 'INV-' + (1000 + invoices.length + 1),
      clientName: selectedClient || (isAr ? 'عميلة عامة' : 'General Client'),
      date: '2026-07-18',
      time: '14:40',
      items: [...cart],
      subtotal,
      tax,
      total,
      paymentMethod,
      taxNumber,
      showLogo: showLogoOnInvoice
    };

    onAddInvoice(newInvoice);

    // Deduct stock for products in cart
    cart.forEach(item => {
      if (item.type === 'product') {
        const prod = products.find(p => p.id === item.id);
        if (prod) {
          onUpdateProductStock(item.id, prod.stock - item.quantity);
        }
      }
    });

    setLastIssuedInvoice(newInvoice);
    setCart([]);
  };

  // Filter products and services
  const filteredServices = services.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Translation helpers for items
  const getServiceName = (id: string, defaultName: string) => {
    if (isAr) return defaultName;
    switch(id) {
      case 's1': return 'Haircut & Blowdry';
      case 's2': return 'Full Hair Dye';
      case 's3': return 'Hair Protein Treatment';
      case 's4': return '90 Min Spa Session';
      case 's5': return 'Nail Care (Manicure)';
      case 's6': return 'Deep Facial Cleanse';
      case 's7': return 'Full Evening Makeup';
      default: return defaultName;
    }
  };

  const getServiceCategory = (id: string, defaultCat: string) => {
    if (isAr) return defaultCat;
    switch(id) {
      case 's1': case 's2': case 's3': return 'Hair';
      case 's4': return 'Spa';
      case 's5': return 'Nails';
      case 's6': return 'Facial';
      case 's7': return 'Makeup';
      default: return defaultCat;
    }
  };

  const getProductName = (id: string, defaultName: string) => {
    if (isAr) return defaultName;
    switch(id) {
      case 'p1': return 'Medicinal Shampoo 500ml';
      case 'p2': return 'Deep Moisture Hair Mask';
      case 'p3': return 'Organic Argan Oil';
      case 'p4': return 'Professional Makeup Fixer';
      case 'p5': return 'Heat Protectant Hair Cream';
      default: return defaultName;
    }
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ===== ROW 1: POS WORKSPACE ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Services & Products List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm space-y-4">
            
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-3 w-4 h-4 text-[#6E6A63] rtl:left-auto rtl:right-3 ltr:right-auto ltr:left-3" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? "ابحثي عن خدمة أو منتج..." : "Search service or product..."}
                  className="w-full text-sm py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] rtl:pl-4 rtl:pr-10 ltr:pr-4 ltr:pl-10"
                />
              </div>

              <div className="flex bg-[#F6F6F4] p-1 border border-[#E9E7E2] rounded-xl self-start sm:self-auto">
                <button 
                  onClick={() => setActiveCategory('all')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeCategory === 'all' ? 'bg-[#FF5A5F] text-white' : 'text-[#6E6A63]'}`}
                >
                  {t('all')}
                </button>
                <button 
                  onClick={() => setActiveCategory('services')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeCategory === 'services' ? 'bg-[#FF5A5F] text-white' : 'text-[#6E6A63]'}`}
                >
                  {isAr ? 'الخدمات' : 'Services'}
                </button>
                <button 
                  onClick={() => setActiveCategory('products')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeCategory === 'products' ? 'bg-[#FF5A5F] text-white' : 'text-[#6E6A63]'}`}
                >
                  {isAr ? 'المنتجات' : 'Products'}
                </button>
              </div>
            </div>

            {/* SERVICES */}
            {(activeCategory === 'all' || activeCategory === 'services') && (
              <div className="space-y-3">
                <h4 className="font-serif text-sm font-bold text-[#14332B] border-r-2 border-[#FF5A5F] rtl:pr-2 ltr:pl-2 rtl:border-l-0 ltr:border-r-0 ltr:border-l-2">
                  {isAr ? 'الخدمات التجميلية' : 'Beauty & Wellness Services'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredServices.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => addToCart('service', s)}
                      className="p-3.5 bg-white border border-[#E9E7E2] rounded-xl cursor-pointer hover:border-[#FF5A5F] hover:bg-[#FFF0F0]/10 transition-all flex justify-between items-center gap-2"
                    >
                      <div>
                        <p className="font-bold text-sm text-[#1C1B18]">{getServiceName(s.id, s.name)}</p>
                        <p className="text-[11px] text-[#6E6A63] mt-1">
                          {isAr ? `المدة: ${s.duration} دقيقة` : `Duration: ${s.duration} mins`} · {getServiceCategory(s.id, s.category)}
                        </p>
                      </div>
                      <span className="font-serif font-bold text-sm text-[#FF5A5F] shrink-0">{s.price} {t('currency')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PRODUCTS */}
            {(activeCategory === 'all' || activeCategory === 'products') && (
              <div className="space-y-3 pt-2">
                <h4 className="font-serif text-sm font-bold text-[#14332B] border-r-2 border-[#FF5A5F] rtl:pr-2 ltr:pl-2 rtl:border-l-0 ltr:border-r-0 ltr:border-l-2">
                  {isAr ? 'منتجات التجزئة والمبيعات' : 'Retail & Cosmetics Products'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredProducts.map(p => {
                    const isLow = p.stock <= p.minStock;
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => p.stock > 0 && addToCart('product', p)}
                        className={`p-3.5 bg-white border rounded-xl flex justify-between items-center transition-all gap-2 ${
                          p.stock === 0 
                            ? 'opacity-50 cursor-not-allowed border-gray-200' 
                            : 'cursor-pointer hover:border-[#FF5A5F] hover:bg-[#FFF0F0]/10 border-[#E9E7E2]'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-sm text-[#1C1B18]">{getProductName(p.id, p.name)}</p>
                          <p className="text-[11px] text-[#6E6A63] mt-1 flex items-center gap-1.5">
                            <span>{isAr ? `المخزون: ${p.stock}` : `Stock: ${p.stock}`}</span>
                            {isLow && (
                              <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.2 rounded font-bold">{t('lowStockLabel')}</span>
                            )}
                          </p>
                        </div>
                        <div className="text-left shrink-0">
                          <p className="font-serif font-bold text-sm text-[#FF5A5F]">{p.price} {t('currency')}</p>
                          {p.stock === 0 && <span className="text-[10px] text-red-500 font-bold">{isAr ? 'نفد' : 'Sold Out'}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Current Checkout Cart */}
        <div className="lg:col-span-5 bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm sticky top-24 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-base font-bold text-[#14332B] flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-[#FF5A5F]" />
              <span>{t('invoiceSummary')}</span>
            </h3>
            {cart.length > 0 && (
              <button 
                onClick={clearCart}
                className="text-xs text-red-500 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'تفريغ السلة' : 'Clear Cart'}</span>
              </button>
            )}
          </div>

          {/* Client Selection */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1C1B18]">{t('clientName')}</label>
              <input 
                type="text" 
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                placeholder={isAr ? "مثال: حصة الكثيري" : "e.g. Sarah Smith"}
                className="w-full text-sm px-3 py-2 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
              />
            </div>

            {/* Custom Invoice Settings */}
            <div className="p-4 bg-[#F6F6F4]/60 border border-[#E9E7E2] rounded-xl space-y-3">
              <p className="text-xs font-bold text-[#14332B] flex items-center gap-1.5 border-b border-[#E9E7E2] pb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#FF5A5F]" />
                <span>{isAr ? 'إعدادات الفاتورة الضريبية' : 'Tax Invoice Configurations'}</span>
              </p>
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[#6E6A63]">{isAr ? 'الرقم الضريبي للمنشأة' : 'Tax Identification Number (TIN)'}</label>
                <input 
                  type="text" 
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  placeholder="310000000000003"
                  className="w-full text-xs px-3 py-2 border border-[#E9E7E2] rounded-lg bg-white focus:outline-none focus:border-[#FF5A5F] font-mono text-[#1C1B18]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[#1C1B18] font-medium">
                <input 
                  type="checkbox" 
                  checked={showLogoOnInvoice}
                  onChange={(e) => setShowLogoOnInvoice(e.target.checked)}
                  className="accent-[#FF5A5F] h-3.5 w-3.5 rounded border-[#E9E7E2]"
                />
                <span>{isAr ? 'إدراج شعار الصالون تلقائياً' : 'Add salon logo automatically'}</span>
              </label>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="space-y-3 min-h-[140px] max-h-[220px] overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-10 text-[#6E6A63] text-sm">
                {isAr ? 'السلة فارغة. اضغطي على الخدمات أو المنتجات لإضافتها للفاتورة.' : 'Your cart is empty. Click on services or products to add.'}
              </div>
            ) : (
              cart.map(item => (
                <div key={`${item.type}-${item.id}`} className="flex justify-between items-center py-2.5 border-b border-[#F6F6F4] text-sm gap-2">
                  <div className="flex-1">
                    <p className="font-bold text-xs text-[#1C1B18]">{item.type === 'service' ? getServiceName(item.id, item.name) : getProductName(item.id, item.name)}</p>
                    <p className="text-[10px] text-[#6E6A63]">{item.type === 'service' ? (isAr ? 'خدمة' : 'Service') : (isAr ? 'منتج مبيعات' : 'Retail Product')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateQuantity(item.type, item.id, -1)}
                      className="p-1 rounded-md bg-[#F6F6F4] text-[#6E6A63] hover:bg-[#E9E7E2] cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono text-xs font-bold w-5 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.type, item.id, 1)}
                      className="p-1 rounded-md bg-[#F6F6F4] text-[#6E6A63] hover:bg-[#E9E7E2] cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#14332B] min-w-[64px] text-left">
                    {(item.price * item.quantity).toLocaleString()} {t('currency')}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Money Totals */}
          <div className="bg-[#F6F6F4] p-4 rounded-xl border border-[#E9E7E2] space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6E6A63]">{isAr ? 'المجموع قبل الضريبة' : 'Subtotal'}</span>
              <span className="font-mono font-bold text-[#1C1B18]">{subtotal.toLocaleString()} {t('currency')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6E6A63]">{t('taxVat')}</span>
              <span className="font-mono font-bold text-[#1C1B18]">{tax.toLocaleString()} {t('currency')}</span>
            </div>
            <div className="h-px bg-[#E9E7E2] my-2" />
            <div className="flex justify-between text-base font-bold text-[#14332B]">
              <span>{isAr ? 'الإجمالي النهائي' : 'Total Amount'}</span>
              <span className="font-mono text-lg text-[#FF5A5F]">{total.toLocaleString()} {t('currency')}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#1C1B18]">{t('paymentMethodSelect')}</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-2 px-1 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === 'card' 
                    ? 'border-[#FF5A5F] bg-[#FFF0F0] text-[#FF5A5F]' 
                    : 'border-[#E9E7E2] bg-white text-[#6E6A63] hover:bg-[#F6F6F4]'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>{isAr ? 'شبكة (مدى)' : 'Mada / Card'}</span>
              </button>
              
              <button 
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-1 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === 'cash' 
                    ? 'border-[#FF5A5F] bg-[#FFF0F0] text-[#FF5A5F]' 
                    : 'border-[#E9E7E2] bg-white text-[#6E6A63] hover:bg-[#F6F6F4]'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>{t('cash')}</span>
              </button>

              <button 
                type="button"
                onClick={() => setPaymentMethod('link')}
                className={`py-2 px-1 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === 'link' 
                    ? 'border-[#FF5A5F] bg-[#FFF0F0] text-[#FF5A5F]' 
                    : 'border-[#E9E7E2] bg-white text-[#6E6A63] hover:bg-[#F6F6F4]'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>{isAr ? 'رابط دفع' : 'Pay Link'}</span>
              </button>
            </div>
          </div>

          {/* Checkout Button */}
          <button 
            type="button"
            onClick={handleIssueInvoice}
            disabled={cart.length === 0}
            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
              cart.length > 0 
                ? 'bg-[#FF5A5F] text-white hover:bg-[#E04B50] shadow-[#FF5A5F]/20' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            <span>{t('printInvoice')}</span>
          </button>
        </div>

      </div>

      {/* ===== ROW 2: LAST ISSUED RECEIPT & HISTORIC LOGS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Print Receipt Preview */}
        {lastIssuedInvoice && (
          <div className="lg:col-span-4 bg-amber-50 border border-amber-200/60 rounded-2xl p-5 shadow-sm space-y-4 text-[#1C1B18] animate-scaleIn">
            <div className="flex justify-between items-center pb-2 border-b border-amber-200/40">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> {isAr ? 'تم إصدار الفاتورة الإلكترونية' : 'E-invoice Generated Successfully'}
              </span>
              <button 
                onClick={() => window.print()}
                className="text-xs font-bold bg-amber-200/60 hover:bg-amber-200 text-amber-900 p-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> {isAr ? 'طباعة' : 'Print'}
              </button>
            </div>

            <div className="space-y-1.5 text-center py-2 font-serif text-sm">
              {/* Mini logo if enabled */}
              {(lastIssuedInvoice.showLogo ?? showLogoOnInvoice) && (
                <div className="mx-auto w-7 h-7 rounded-full bg-[#14332B] flex items-center justify-center text-[#FFAE34] mb-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                    <path d="M12 2L15 8L22 9L17 14L18 21L12 17L6 21L7 14L2 9L9 8L12 2Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              <p className="font-bold text-lg text-[#14332B]">
                {currentBranch ? (isAr ? currentBranch.nameAr : currentBranch.nameEn) : t('brandName')}
              </p>
              <p className="text-[11px] text-[#6E6A63]">
                {isAr 
                  ? `${currentBranch ? currentBranch.cityAr : 'فرع الرياض'} - الرقم الضريبي: ${lastIssuedInvoice.taxNumber || taxNumber}` 
                  : `${currentBranch ? currentBranch.cityEn : 'Riyadh Branch'} - Tax ID: ${lastIssuedInvoice.taxNumber || taxNumber}`}
              </p>
              <p className="font-bold text-xs mt-2 text-amber-900">{lastIssuedInvoice.id}</p>
            </div>

            <div className="border-t border-dashed border-amber-200 text-xs py-2.5 space-y-1">
              <div className="flex justify-between">
                <span>{isAr ? 'العميلة:' : 'Client:'}</span>
                <span className="font-bold">{getClientName(lastIssuedInvoice.clientName)}</span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'التاريخ والوقت:' : 'Date & Time:'}</span>
                <span className="font-mono">{lastIssuedInvoice.date} {lastIssuedInvoice.time}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('paymentMethod')}:</span>
                <span>
                  {lastIssuedInvoice.paymentMethod === 'card' 
                    ? (isAr ? 'شبكة (مدى)' : 'Mada / Card') 
                    : lastIssuedInvoice.paymentMethod === 'cash' 
                    ? t('cash') 
                    : (isAr ? 'رابط دفع' : 'Pay Link')}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-amber-200 text-xs py-2 space-y-2">
              {lastIssuedInvoice.items.map((it, idx) => (
                <div key={idx} className="flex justify-between font-mono">
                  <span>{it.type === 'service' ? getServiceName(it.id, it.name) : getProductName(it.id, it.name)} x {it.quantity}</span>
                  <span>{(it.price * it.quantity).toLocaleString()} {t('currency')}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-amber-200 pt-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span>{isAr ? 'المجموع:' : 'Subtotal:'}</span>
                <span className="font-mono">{lastIssuedInvoice.subtotal.toLocaleString()} {t('currency')}</span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'الضريبة (١٥٪):' : 'VAT (15%):'}</span>
                <span className="font-mono">{lastIssuedInvoice.tax.toLocaleString()} {t('currency')}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-[#14332B]">
                <span>{isAr ? 'الإجمالي النهائي:' : 'Grand Total:'}</span>
                <span className="font-mono">{lastIssuedInvoice.total.toLocaleString()} {t('currency')}</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-[#6E6A63] pt-4 border-t border-dashed border-amber-200">
              {isAr 
                ? `شكراً لزيارتك لـ ${currentBranch ? currentBranch.nameAr : 'CONFIRMED'} 🤍` 
                : `Thank you for visiting ${currentBranch ? currentBranch.nameEn : 'CONFIRMED'} 🤍`}
            </div>
          </div>
        )}

        {/* Invoice Logs */}
        <div className={`${lastIssuedInvoice ? 'lg:col-span-8' : 'lg:col-span-12'} bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm`}>
          <h3 className="font-serif text-base font-bold text-[#14332B] mb-5">{isAr ? 'أحدث الفواتير المسجلة بالفرع' : 'Latest Registered Invoices'}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#E9E7E2] text-xs text-[#6E6A63] font-bold">
                  <th className="pb-3 text-start">{isAr ? 'الرقم' : 'ID'}</th>
                  <th className="pb-3 text-start">{t('clientName')}</th>
                  <th className="pb-3 text-start">{isAr ? 'التاريخ والوقت' : 'Date & Time'}</th>
                  <th className="pb-3 text-start">{isAr ? 'الإجمالي النهائي' : 'Grand Total'}</th>
                  <th className="pb-3 text-start">{t('paymentMethod')}</th>
                  <th className="pb-3 text-start">{isAr ? 'التحميل / الطباعة' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F6F6F4]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="text-[#1C1B18] hover:bg-[#F6F6F4]/50">
                    <td className="py-3.5 font-bold text-[#FF5A5F] font-mono">{inv.id}</td>
                    <td className="py-3.5 font-medium">{getClientName(inv.clientName)}</td>
                    <td className="py-3.5 text-xs text-[#6E6A63] font-mono">{inv.date} {inv.time}</td>
                    <td className="py-3.5 font-bold font-mono text-[#14332B]">{inv.total.toLocaleString()} {t('currency')}</td>
                    <td className="py-3.5">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FFF0F0] text-[#FF5A5F]">
                        {inv.paymentMethod === 'card' ? (isAr ? 'شبكة (مدى)' : 'Mada / Card') : inv.paymentMethod === 'cash' ? t('cash') : (isAr ? 'رابط دفع' : 'Pay Link')}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <button
                        onClick={() => setSelectedInvoiceForPdf(inv)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#FF5A5F]/10 text-[#FF5A5F] rounded-xl hover:bg-[#FF5A5F] hover:text-white transition-all cursor-pointer shadow-none"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>{isAr ? 'تحميل كـ PDF' : 'Download PDF'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===== INVOICE PDF PREVIEW MODAL ===== */}
      {selectedInvoiceForPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          {/* Modal Card */}
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200/80 my-8">
            
            {/* Header / Action Bar */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileDown className="w-5 h-5 text-[#FF5A5F]" />
                <h3 className="font-serif text-base font-bold text-slate-800">
                  {isAr ? 'معاينة الفاتورة الضريبية وتحميلها' : 'Tax Invoice Preview & Download'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setTimeout(() => {
                      window.print();
                    }, 50);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#FF5A5F] text-white rounded-xl hover:bg-[#E04B50] transition-all cursor-pointer shadow-md shadow-[#FF5A5F]/15"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isAr ? 'تحميل كـ PDF / طباعة' : 'Download as PDF / Print'}</span>
                </button>
                <button
                  onClick={() => setSelectedInvoiceForPdf(null)}
                  className="p-2 rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                  title={isAr ? 'إغلاق' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Preview Area */}
            <div className="p-6 max-h-[70vh] overflow-y-auto bg-slate-100/50">
              {/* Document Container */}
              <div 
                id="print-invoice-area" 
                className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200/50 max-w-2xl mx-auto text-slate-800 font-sans"
                dir="rtl"
              >
                
                {/* Print specific stylesheet */}
                <style>{`
                  @media print {
                    body * {
                      visibility: hidden !important;
                    }
                    #print-invoice-area, #print-invoice-area * {
                      visibility: visible !important;
                    }
                    #print-invoice-area {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      padding: 2.5rem !important;
                      background: white !important;
                      color: #0f172a !important;
                      box-shadow: none !important;
                      border: none !important;
                    }
                    html, body {
                      background: white !important;
                      margin: 0 !important;
                      padding: 0 !important;
                    }
                  }
                `}</style>

                {/* PDF Header Branding */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b-2 border-slate-200">
                  <div className="space-y-3 text-right flex-1">
                    {/* Salon Logo if enabled */}
                    {(selectedInvoiceForPdf.showLogo ?? showLogoOnInvoice) && (
                      <div className="flex items-center gap-2.5 bg-[#14332B]/5 px-3 py-2 rounded-xl w-fit border border-[#14332B]/10 select-none">
                        <div className="w-8 h-8 rounded-full bg-[#14332B] flex items-center justify-center text-[#FFAE34] shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                            <path d="M12 2L15 8L22 9L17 14L18 21L12 17L6 21L7 14L2 9L9 8L12 2Z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <h4 className="font-serif text-xs font-black text-[#14332B] tracking-wide uppercase leading-none">
                            {currentBranch ? (isAr ? currentBranch.nameAr : currentBranch.nameEn) : 'CONFIRMED'}
                          </h4>
                          <span className="text-[8px] text-[#6E6A63] font-sans tracking-wider block mt-0.5">
                            {isAr ? 'صالون معتمد مرخص' : 'Licensed Salon Partner'}
                          </span>
                        </div>
                      </div>
                    )}

                    <h2 className="font-serif text-2xl font-bold text-slate-900">
                      {currentBranch ? currentBranch.nameAr : 'صالون كونفيرمد التجميلي'}
                    </h2>
                    <p className="text-sm font-medium text-slate-600">
                      {currentBranch ? currentBranch.nameEn : 'CONFIRMED Beauty Salon'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">الرقم الضريبي (TIN): {selectedInvoiceForPdf.taxNumber || taxNumber}</p>
                    <p className="text-xs text-slate-500">السجل التجاري (C.R.): {currentBranch?.id === 'br-main' || currentBranch?.id === 'br-sub' ? '1010984729' : '1010729381'}</p>
                    <p className="text-xs text-slate-500">
                      العنوان: {currentBranch ? (isAr ? `${currentBranch.addressAr || ''} ${currentBranch.cityAr || ''}` : `${currentBranch.addressEn || ''} ${currentBranch.cityEn || ''}`) : 'العليا، الرياض، المملكة العربية السعودية'}
                    </p>
                  </div>
                  
                  {/* Title & Badge */}
                  <div className="text-left flex-1 md:text-left space-y-2 w-full md:w-auto">
                    <div className="inline-block bg-[#FF5A5F]/10 text-[#FF5A5F] text-xs font-bold px-3 py-1 rounded-full border border-[#FF5A5F]/20">
                      فاتورة ضريبية مبسطة / Simplified Tax Invoice
                    </div>
                    <div className="text-xs text-slate-500 font-mono text-left">
                      <p className="font-bold text-slate-800 text-sm">{selectedInvoiceForPdf.id}</p>
                      <p>{selectedInvoiceForPdf.date} {selectedInvoiceForPdf.time}</p>
                    </div>
                  </div>
                </div>

                {/* Invoice Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 py-6 border-b border-slate-200 text-xs">
                  <div className="space-y-1 text-right">
                    <p className="text-slate-500">صادرة إلى / Billed To:</p>
                    <p className="font-bold text-slate-900 text-sm">{getClientName(selectedInvoiceForPdf.clientName)}</p>
                    <p className="text-slate-500 mt-1">
                      {isAr 
                        ? `العميل: عميلة مسجلة لدى ${currentBranch ? currentBranch.nameAr : 'صالوننا'}` 
                        : `Client: Registered Customer of ${currentBranch ? currentBranch.nameEn : 'our salon'}`}
                    </p>
                  </div>
                  <div className="space-y-1 text-left" dir="ltr">
                    <p className="text-slate-500 text-right">معلومات الدفع / Payment Details:</p>
                    <p className="font-bold text-slate-900 text-right">
                      {selectedInvoiceForPdf.paymentMethod === 'card' 
                        ? (isAr ? 'شبكة (مدى)' : 'Mada / Card') 
                        : selectedInvoiceForPdf.paymentMethod === 'cash' 
                        ? t('cash') 
                        : (isAr ? 'رابط دفع' : 'Pay Link')}
                    </p>
                    <p className="text-slate-500 text-right mt-1">{isAr ? 'حالة العملية: مدفوعة بالكامل' : 'Status: Fully Paid'}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="py-6">
                  <table className="w-full text-sm text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-300 text-xs text-slate-600 font-bold">
                        <th className="py-3 px-2 text-right">البند / Service-Product</th>
                        <th className="py-3 px-2 text-center">السعر / Price</th>
                        <th className="py-3 px-2 text-center">الكمية / Qty</th>
                        <th className="py-3 px-2 text-center">الضريبة (١٥٪) / VAT</th>
                        <th className="py-3 px-2 text-left">المجموع / Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedInvoiceForPdf.items.map((it, idx) => {
                        const itemSubtotal = it.price * it.quantity;
                        const itemTax = itemSubtotal * 0.15;
                        const itemTotal = itemSubtotal + itemTax;
                        return (
                          <tr key={idx} className="text-slate-800 text-xs">
                            <td className="py-3 px-2 font-bold text-slate-900">
                              {it.type === 'service' ? getServiceName(it.id, it.name) : getProductName(it.id, it.name)}
                              <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                                {it.type === 'service' ? (isAr ? 'خدمة تجميلية' : 'Beauty Service') : (isAr ? 'منتج تجزئة' : 'Cosmetics Product')}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center font-mono">{it.price.toLocaleString()} ر.س</td>
                            <td className="py-3 px-2 text-center font-mono">{it.quantity}</td>
                            <td className="py-3 px-2 text-center font-mono">{itemTax.toLocaleString()} ر.س</td>
                            <td className="py-3 px-2 text-left font-bold font-mono">{itemTotal.toLocaleString()} ر.س</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals Breakdown & QR Stamp */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-slate-200 items-center">
                  
                  {/* Left Side: ZATCA QR Code & Official Stamp */}
                  <div className="md:col-span-6 space-y-4 text-center md:text-right">
                    <div className="flex flex-row items-center gap-4 justify-center md:justify-start">
                      {/* Interactive Simulated E-Invoice QR Code */}
                      <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        <QRCodeSVG />
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200 inline-block">
                          ✓ معتمد وموثق ضريبياً
                        </div>
                        <p className="text-[10px] text-slate-500">فاتورة إلكترونية معتمدة من هيئة الزكاة والضريبة والجمارك بالمملكة العربية السعودية.</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Price Summary Card */}
                  <div className="md:col-span-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">المجموع غير شامل الضريبة / Subtotal (Excl. VAT):</span>
                      <span className="font-mono font-bold text-slate-900">{selectedInvoiceForPdf.subtotal.toLocaleString()} ر.س</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ضريبة القيمة المضافة (١٥٪) / VAT Amount (15%):</span>
                      <span className="font-mono font-bold text-slate-900">{selectedInvoiceForPdf.tax.toLocaleString()} ر.س</span>
                    </div>
                    <div className="h-px bg-slate-200 my-1" />
                    <div className="flex justify-between text-sm font-bold text-slate-900">
                      <span>الإجمالي شامل الضريبة / Total (Incl. VAT):</span>
                      <span className="font-mono text-[#FF5A5F] text-base">{selectedInvoiceForPdf.total.toLocaleString()} ر.س</span>
                    </div>
                  </div>

                </div>

                {/* Footer Declaration */}
                <div className="text-center text-[10px] text-slate-500 pt-8 border-t border-slate-200/60 mt-8 space-y-1">
                  <p className="font-bold text-slate-800">
                    {isAr 
                      ? `نشكر لكم ثقتكم واختياركم ${currentBranch ? currentBranch.nameAr : 'صالوننا'} 🤍` 
                      : `Thank you for choosing ${currentBranch ? currentBranch.nameEn : 'our salon'} 🤍`}
                  </p>
                  <p>
                    {isAr 
                      ? 'نتطلع لخدمتكم ورؤيتكم مرة أخرى قريباً!' 
                      : 'We look forward to serving you and seeing you again soon!'}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-2">الأسعار تشمل ضريبة القيمة المضافة بنسبة ١٥٪ وطبقاً لأنظمة المملكة العربية السعودية.</p>
                </div>

              </div>
            </div>

            {/* Modal Bottom Close Row */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex justify-end gap-3">
              <button
                onClick={() => setSelectedInvoiceForPdf(null)}
                className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-200/80 rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
              >
                {isAr ? 'إغلاق المعاينة' : 'Close Preview'}
              </button>
              <button
                onClick={() => {
                  setTimeout(() => {
                    window.print();
                  }, 50);
                }}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-[#FF5A5F] text-white rounded-xl hover:bg-[#E04B50] transition-all cursor-pointer shadow-md shadow-[#FF5A5F]/15"
              >
                <Printer className="w-4 h-4" />
                <span>{isAr ? 'تحميل كـ PDF / طباعة' : 'Download as PDF / Print'}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
