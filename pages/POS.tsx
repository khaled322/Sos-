import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, User, Banknote, Loader2, ShoppingCart as CartIcon, X, Printer, CheckCircle2, PauseCircle, PlayCircle, Image as ImageIcon, MapPin, Phone, Coins, Download, TicketPercent, AlertCircle, ScanLine } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useData } from '../context/DataContext';
import { Loader } from '../components/ui/Loader';
import { Product, ActiveCart, CartItem } from '../types';

export default function POS() {
  const { products, customers, categories, settings, loading } = useData();
  const currency = settings?.currency || 'د.ج';

  const [carts, setCarts] = useState<ActiveCart[]>([{ id: '1', label: 'طلبية 1', items: [], customerId: null, redeemPoints: false }]);
  const [activeCartId, setActiveCartId] = useState<string>('1');
  
  const currentCart = useMemo(() => carts.find(c => c.id === activeCartId) || carts[0], [carts, activeCartId]);
  const cartItems = currentCart?.items || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'الكل' || p.categoryId === categories?.find(c => c.name === selectedCategory)?.id;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, categories, selectedCategory, searchQuery]);

  const cartFinancials = { subtotal: 0, total: 0, totalCost: 0, discount: 0, pointsRedeemed: 0 };
  const selectedCustomer = null;

  const handleCheckout = async (method: 'cash' | 'debt') => {
      alert("وظيفة الدفع معطلة حالياً.");
  };

  const ProductGridItem: React.FC<{ product: Product }> = ({ product }) => (
    <div className="bg-white rounded-2xl shadow-sm border flex flex-col cursor-pointer transition-transform hover:scale-105 hover:shadow-lg active:scale-95 active:shadow-md" onClick={() => {}}>
        {settings?.posShowImages && product.image ? (
            <div className="aspect-square w-full bg-cover bg-center rounded-t-2xl bg-gray-100" style={{backgroundImage: `url(${product.image})`}} />
        ) : settings?.posShowImages ? (
            <div className="aspect-square w-full flex items-center justify-center bg-gray-50 text-gray-300 rounded-t-2xl"><ImageIcon size={40} /></div>
        ) : null}
        <div className="p-3 flex flex-col flex-1">
            <p className="font-bold text-gray-800 leading-tight flex-1">{product.name}</p>
            {settings?.posShowStock && <span className="text-xs text-gray-400 mt-1">المخزون: <span className="num-l font-medium">{product.stock}</span></span>}
            <p className="text-lg font-black text-primary num-l mt-2 text-left">{product.price.toLocaleString()} <span className="text-xs font-medium text-gray-500">{currency}</span></p>
        </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-100">
        <div className="md:hidden flex shrink-0 bg-white border-b no-print"><button className={`flex-1 py-3 flex justify-center gap-2 ${mobileTab==='products'?'text-primary border-b-2 border-primary':'text-gray-500'}`} onClick={()=>setMobileTab('products')}><Search size={18}/> المنتجات</button><button className={`flex-1 py-3 flex justify-center gap-2 ${mobileTab==='cart'?'text-primary border-b-2 border-primary':'text-gray-500'}`} onClick={()=>setMobileTab('cart')}><CartIcon size={18}/> السلة <span className="num-l">({cartItems.length})</span></button></div>
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className={`flex-1 flex-col overflow-hidden ${mobileTab==='products'?'flex':'hidden md:flex'}`}>
                <div className="bg-white p-4 shadow-sm z-10 flex flex-col gap-3 shrink-0"><div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/><input type="text" placeholder="بحث عن منتج (اسم أو باركود)..." autoFocus className="w-full pr-10 pl-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/></div><div className="flex gap-2 overflow-x-auto scrollbar-hide"><button onClick={()=>setSelectedCategory('الكل')} className={`px-4 py-2 rounded-xl whitespace-nowrap font-medium transition-colors ${selectedCategory==='الكل'?'bg-primary text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>الكل</button>{categories?.map(c=>(<button key={c.id} onClick={()=>setSelectedCategory(c.name)} className={`px-4 py-2 rounded-xl whitespace-nowrap font-medium transition-colors ${selectedCategory===c.name?'bg-primary text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{c.name}</button>))}</div></div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
                  {loading.products ? <Loader /> : filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                      {filteredProducts.map(p => <ProductGridItem key={p.id} product={p} />)}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                      <CartIcon size={64} className="mb-4 opacity-50"/>
                      <p className="text-lg font-medium">لا توجد منتجات تطابق البحث</p>
                    </div>
                  )}
                </div>
            </div>
            <div className={`w-full md:w-[440px] bg-white shadow-2xl z-20 flex flex-col h-full border-r ${mobileTab==='cart'?'flex':'hidden md:flex'}`}>
                <div className="flex bg-gray-100 p-2 gap-2 overflow-x-auto scrollbar-hide shrink-0">{carts.map(c=>(<div key={c.id} onClick={()=>setActiveCartId(c.id)} className={`flex items-center pl-1 pr-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap group transition-all ${activeCartId===c.id?'bg-white shadow-sm text-primary font-bold ring-1 ring-black/5':'text-gray-500 hover:bg-gray-200'}`}>{activeCartId===c.id?<PlayCircle size={16} className="ml-1"/>:<PauseCircle size={16} className="ml-1 opacity-50"/>}{c.label}</div>))}</div>
                 <div className="p-3 border-b flex justify-between items-center bg-gray-50 shrink-0">
                     <div className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-200 rounded-xl flex-1 transition-colors"><div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-300 text-gray-500`}><User size={20}/></div><div className="flex-1 min-w-0"><p className="font-bold text-gray-800 truncate">زبون عام</p></div></div>
                 </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50">
                  <div className="h-full flex flex-col items-center justify-center text-gray-300"><CartIcon size={64} className="mb-4 opacity-50"/><p className="text-lg font-medium">السلة فارغة</p><p className="text-sm">أضف منتجات لبدء البيع</p></div>
                </div>
                <div className="p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0 z-10 sticky bottom-0 space-y-3">
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-end"><span className="text-gray-800 font-bold text-lg">الإجمالي النهائي</span><span className="text-4xl font-black text-primary num-l tracking-tight">{cartFinancials.total.toLocaleString()} <span className="text-sm text-gray-500 font-medium">{currency}</span></span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3"><Button variant="primary" size="lg" className="bg-emerald-600 hover:bg-emerald-700 h-14 text-lg shadow-emerald-600/20" onClick={()=>handleCheckout('cash')} disabled={cartItems.length === 0}><Banknote className="mr-2"/> دفع نقدي</Button><Button variant="secondary" size="lg" className="border-2 border-amber-400/50 text-amber-800 hover:bg-amber-50 h-14 font-bold text-lg" onClick={()=>handleCheckout('debt')} disabled={cartItems.length === 0}>تسجيل دين</Button></div>
                </div>
            </div>
        </div>
    </div>
  );
}
