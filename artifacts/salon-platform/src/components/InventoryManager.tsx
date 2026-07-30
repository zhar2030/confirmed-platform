import React, { useState } from 'react';
import { Product } from '../types';
import { ShoppingBag, Plus, Minus, Search, Layers, RefreshCw, AlertTriangle, FileSpreadsheet, ArrowLeftRight } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface InventoryManagerProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateStock: (productId: string, newStock: number) => void;
  onUpdateMinStock: (productId: string, newMinStock: number) => void;
}

export default function InventoryManager({ products, onAddProduct, onUpdateStock, onUpdateMinStock }: InventoryManagerProps) {
  const { t, isAr } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState(0);
  const [productStock, setProductStock] = useState(10);
  const [productMinStock, setProductMinStock] = useState(4);
  const [productCategory, setProductCategory] = useState(isAr ? 'عناية بالشعر' : 'Hair Care');

  // Math Metrics
  const totalProductsCount = products.length;
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

  // Filtering
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(products.map(p => p.category)));

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || productPrice <= 0) return;

    const newProduct: Product = {
      id: 'p-' + Math.random().toString(36).substr(2, 9),
      name: productName,
      price: productPrice,
      stock: productStock,
      minStock: productMinStock,
      category: productCategory
    };

    onAddProduct(newProduct);
    
    // Reset Form
    setProductName('');
    setProductPrice(0);
    setProductStock(10);
    setProductMinStock(4);
    setShowAddModal(false);
  };

  const handleIncrementStock = (productId: string, currentStock: number) => {
    onUpdateStock(productId, currentStock + 1);
  };

  const handleDecrementStock = (productId: string, currentStock: number) => {
    if (currentStock <= 0) return;
    onUpdateStock(productId, currentStock - 1);
  };

  const handleIncrementMinStock = (productId: string, currentMinStock: number) => {
    onUpdateMinStock(productId, currentMinStock + 1);
  };

  const handleDecrementMinStock = (productId: string, currentMinStock: number) => {
    if (currentMinStock <= 0) return;
    onUpdateMinStock(productId, currentMinStock - 1);
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

  const getCategoryName = (cat: string) => {
    if (isAr) return cat;
    switch(cat) {
      case 'عناية بالشعر': return 'Hair Care';
      case 'مكياج': return 'Makeup';
      case 'أظافر': return 'Nail Care';
      case 'سبا ومساج': return 'Spa & Massage';
      case 'عام': return 'General';
      default: return cat;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ===== OVERVIEW CARDS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-[#6E6A63] uppercase">{isAr ? 'إجمالي المواد والمنتجات' : 'Total Items & Products'}</p>
          <h4 className="text-3xl font-serif font-bold text-[#14332B] mt-2">{totalProductsCount}</h4>
          <p className="text-xs text-[#6E6A63] mt-2">{isAr ? 'منتجات تجميل وتجزئة بالصالون' : 'Retail and professional salon products'}</p>
        </div>

        <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-[#6E6A63] uppercase">{isAr ? 'مواد منخفضة المخزون' : 'Low Stock Products'}</p>
          <h4 className="text-3xl font-serif font-bold text-[#14332B] mt-2 text-amber-600">{lowStockCount}</h4>
          <p className="text-xs text-[#6E6A63] mt-2">{isAr ? 'تتطلب إعادة التوريد بأقرب وقت' : 'Requires urgent replenishment'}</p>
        </div>

        <div className="bg-white border border-[#E9E7E2] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-[#6E6A63] uppercase">{isAr ? 'قيمة المخزون الإجمالية' : 'Total Inventory Value'}</p>
          <h4 className="text-3xl font-serif font-bold text-[#14332B] mt-2">
            {totalStockValue.toLocaleString()} <span className="text-xs font-sans">{t('currency')}</span>
          </h4>
          <p className="text-xs text-[#6E6A63] mt-2">{isAr ? 'إجمالي تقييم البضاعة والمنتجات' : 'Estimated evaluation of in-stock assets'}</p>
        </div>
      </div>

      {/* ===== SEARCH & ADD BAR ===== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-[#E9E7E2]">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial min-w-[220px]">
            <Search className="absolute right-3 top-3 w-4 h-4 text-[#6E6A63] rtl:left-auto rtl:right-3 ltr:right-auto ltr:left-3" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? "ابحثي بالاسم..." : "Search by product name..."}
              className="w-full text-sm py-2 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] rtl:pl-4 rtl:pr-10 ltr:pr-4 ltr:pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#FF5A5F]" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm border border-[#E9E7E2] rounded-xl px-3 py-2 bg-[#F6F6F4] focus:outline-none text-[#1C1B18]"
            >
              <option value="all">{isAr ? 'كل الفئات' : 'All Categories'}</option>
              {categories.map((cat, i) => (
                <option key={i} value={cat}>{getCategoryName(cat)}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-[#FF5A5F]/20 flex items-center gap-2 transition-all self-stretch sm:self-auto justify-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addNewProduct')}</span>
        </button>
      </div>

      {/* ===== PRODUCTS TABLE ===== */}
      <div className="bg-white border border-[#E9E7E2] rounded-2xl p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E9E7E2] text-xs text-[#6E6A63] font-bold">
                <th className="pb-3 text-start">{isAr ? 'المنتج' : 'Product'}</th>
                <th className="pb-3 text-start">{isAr ? 'الفئة' : 'Category'}</th>
                <th className="pb-3 text-start">{isAr ? 'السعر التقديري' : 'Retail Price'}</th>
                <th className="pb-3 text-center">{isAr ? 'المخزون الحالي' : 'Stock Level'}</th>
                <th className="pb-3 text-start">{isAr ? 'الحد الأدنى للمخزون' : 'Minimum Alert'}</th>
                <th className="pb-3 text-start">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F6F6F4]">
              {filteredProducts.map((p) => {
                const isLow = p.stock <= p.minStock;
                return (
                  <tr key={p.id} className={`transition-colors hover:bg-[#F6F6F4]/50 text-[#1C1B18] ${isLow ? 'bg-red-50/10' : ''}`}>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <ShoppingBag className={`w-4 h-4 shrink-0 transition-colors ${isLow ? 'text-red-500 animate-pulse' : 'text-[#FF5A5F]'}`} />
                        <span className={`font-bold transition-colors ${isLow ? 'text-red-700' : ''}`}>
                          {getProductName(p.id, p.name)}
                        </span>
                        {isLow && (
                          <span className="flex items-center gap-1 bg-red-100 text-red-600 text-[9px] font-bold px-2 py-0.5 rounded-lg border border-red-200 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-red-500 stroke-[3px]" />
                            <span>{isAr ? 'مخزون منخفض!' : 'Low Stock!'}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 text-[#6E6A63]">{getCategoryName(p.category)}</td>
                    <td className="py-3.5 font-bold font-mono text-[#14332B]">{p.price} {t('currency')}</td>
                    <td className="py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleDecrementStock(p.id, p.stock)}
                          className="p-1 rounded bg-[#F6F6F4] hover:bg-[#E9E7E2] text-[#6E6A63] transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className={`font-bold font-mono w-8 text-center transition-colors ${isLow ? 'text-red-600 text-lg' : ''}`}>{p.stock}</span>
                        <button 
                          onClick={() => handleIncrementStock(p.id, p.stock)}
                          className="p-1 rounded bg-[#F6F6F4] hover:bg-[#E9E7E2] text-[#6E6A63] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleDecrementMinStock(p.id, p.minStock)}
                          className="p-1 rounded bg-[#F6F6F4] hover:bg-[#E9E7E2] text-[#6E6A63] transition-colors cursor-pointer"
                          title={isAr ? 'تقليل حد الأمان' : 'Decrease alert limit'}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold text-[#14332B] w-6 text-center">{p.minStock}</span>
                        <button 
                          onClick={() => handleIncrementMinStock(p.id, p.minStock)}
                          className="p-1 rounded bg-[#F6F6F4] hover:bg-[#E9E7E2] text-[#6E6A63] transition-colors cursor-pointer"
                          title={isAr ? 'زيادة حد الأمان' : 'Increase alert limit'}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] text-slate-400">{isAr ? 'وحدات' : 'units'}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span 
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          isLow 
                            ? 'bg-red-50 text-red-700 border border-red-100 animate-pulse' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}
                      >
                        {isLow ? t('lowStockLabel') : t('inStockLabel')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== ADD PRODUCT MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#1C1B18]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E9E7E2] w-full max-w-md p-6 shadow-2xl relative animate-scaleIn">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 left-4 p-2 rounded-full hover:bg-[#F6F6F4] text-[#6E6A63] cursor-pointer"
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>

            <h3 className="font-serif text-xl font-bold text-[#14332B] mb-5">{t('addNewProduct')}</h3>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'اسم المنتج بالكامل *' : 'Product Full Name *'}</label>
                <input 
                  type="text" 
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={isAr ? "مثال: شامبو كيراتين معزز للمعان" : "e.g. Keratin Shine Boosting Shampoo"}
                  className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'سعر البيع *' : 'Retail Price *'}</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={productPrice || ''}
                    onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)}
                    placeholder="95"
                    className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'الفئة والمجموعة *' : 'Category *'}</label>
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F] text-[#1C1B18] bg-white"
                  >
                    <option value="عناية بالشعر">{isAr ? 'عناية بالشعر' : 'Hair Care'}</option>
                    <option value="مكياج">{isAr ? 'مكياج' : 'Makeup'}</option>
                    <option value="أظافر">{isAr ? 'أظافر' : 'Nail Care'}</option>
                    <option value="سبا ومساج">{isAr ? 'سبا ومساج' : 'Spa & Massage'}</option>
                    <option value="عام">{isAr ? 'مواد عامة' : 'General'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'الكمية الابتدائية *' : 'Initial Quantity *'}</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={productStock}
                    onChange={(e) => setProductStock(parseInt(e.target.value) || 0)}
                    placeholder="15"
                    className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1B18] mb-2">{isAr ? 'حد الأمان للمخزون *' : 'Alert Limit Qty *'}</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={productMinStock}
                    onChange={(e) => setProductMinStock(parseInt(e.target.value) || 0)}
                    placeholder="4"
                    className="w-full text-sm px-4 py-2.5 border border-[#E9E7E2] rounded-xl focus:outline-none focus:border-[#FF5A5F]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-[#FF5A5F] hover:bg-[#E04B50] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#FF5A5F]/20 transition-all cursor-pointer"
                >
                  {isAr ? 'حفظ وتسجيل المنتج' : 'Save & Add Product'}
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
