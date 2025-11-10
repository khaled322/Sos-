import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Product, CartItem, Invoice, StoreSettings, Customer } from '../types';
import { Search, Plus, Minus, Trash2, User, Banknote, Loader2, ShoppingCart as CartIcon, X, Printer, CheckCircle2, PauseCircle, PlayCircle, Image as ImageIcon, MapPin, Phone, Coins, Download, TicketPercent, AlertCircle, ScanLine } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { toPng } from 'html-to-image';

interface ActiveCart { id: string; label: string; items: CartItem[]; customerId: number | null; redeemPoints: boolean; }

const STORAGE_KEY = 'omnipos_active_carts';

export default function POS() {
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.toArray())?.[0];
  const currency = settings?.currency || 'د.ج';

  const [carts, setCarts] = useState<ActiveCart[]>(() => {
      try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) : [{ id: '1', label: 'طلبية 1', items: [], customerId: null, redeemPoints: false }]; } catch { return [{ id: '1', label: 'طلبية 1', items: [], customerId: null, redeemPoints: false }]; }
  });
  const [activeCartId, setActiveCartId] = useState<string>(() => carts[0]?.id || '1');
  
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(carts)); }, [carts]);

  const currentCart = useMemo(() => carts.find(c => c.id === activeCartId) || carts[0], [carts, activeCartId]);
  const cartItems = currentCart?.items || [];
  const selectedCustomer = useMemo(() => customers.find(c => c.id === currentCart?.customerId), [customers, currentCart]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('cart');
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [cartToDelete, setCartToDelete] = useState<string | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const filteredProducts = useMemo(() => products.filter(p => (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode?.includes(searchQuery)) && (selectedCategory === 'الكل' || p.category === selectedCategory)), [products, searchQuery, selectedCategory]);
  
  const cartFinancials = useMemo(() => {
      const subtotal = cartItems.reduce((s, i) => s + (i.price * i.quantity), 0);
      const totalCost = cartItems.reduce((s, i) => s + (i.cost * i.quantity), 0);
      let discount = 0; let pointsRedeemed = 0;
      if (currentCart.redeemPoints && selectedCustomer && settings?.loyaltyEnabled && selectedCustomer.points >= (settings.minPointsToRedeem || 0)) {
           const maxDiscount = selectedCustomer.points * (settings.pointValue || 1);
           discount = Math.min(subtotal, maxDiscount);
           pointsRedeemed = Math.ceil(discount / (settings.pointValue || 1));
      }
      return { subtotal, total: Math.max(0, subtotal - discount), totalCost, discount, pointsRedeemed };
  }, [cartItems, currentCart.redeemPoints, selectedCustomer, settings]);

  const updateCurrentCart = (updates: Partial<ActiveCart>) => setCarts(prev => prev.map(c => c.id === activeCartId ? { ...c, ...updates } : c));
  
  const addToCart = (p: Product) => {
      if (p.stock <= 0) return;
      const currentQty = cartItems.find(i => i.productId === p.id)?.quantity || 0;
      if (p.stock <= currentQty) { alert('الكمية المتوفرة في المخزون نفذت!'); return; }
      const newItems = [...cartItems]; const idx = newItems.findIndex(i => i.productId === p.id);
      if (idx >= 0) newItems[idx] = { ...newItems[idx], quantity: newItems[idx].quantity + 1 };
      else newItems.push({ productId: p.id!, productName: p.name, price: p.price, cost: p.cost, quantity: 1, stockNow: p.stock });
      updateCurrentCart({ items: newItems });
  };

  const updateQuantity = (pid: number, qty: number) => {
      if (qty < 1) return;
      const p = products.find(pr => pr.id === pid);
      if (!p || qty > p.stock) { alert('الكمية المطلوبة غير متوفرة!'); return; }
      updateCurrentCart({ items: cartItems.map(i => i.productId === pid ? { ...i, quantity: qty } : i) });
  };

  const createNewCart = () => {
      const nid = Date.now().toString();
      const nextLabelNum = carts.reduce((max, c) => { const match = c.label.match(/طلبية (\d+)/); return match ? Math.max(max, parseInt(match[1])) : max; }, 0) + 1;
      setCarts(prev => [...prev, { id: nid, label: `طلبية ${nextLabelNum}`, items: [], customerId: null, redeemPoints: false }]);
      setActiveCartId(nid);
  };

  const confirmRemoveCart = (id: string) => {
      if (carts.length <= 1) updateCurrentCart({ items: [], customerId: null, redeemPoints: false });
      else {
          if (id === activeCartId) { const idx = carts.findIndex(c => c.id === id); setActiveCartId(carts[idx > 0 ? idx - 1 : idx + 1]?.id || carts[0].id); }
          setCarts(prev => prev.filter(c => c.id !== id));
      }
      setCartToDelete(null);
  };

  const handleCheckout = async (method: 'cash' | 'debt') => {
      if (cartItems.length === 0) return;
      if (method === 'debt' && !currentCart.customerId) { setIsCustomerModalOpen(true); return; }
      setIsCheckingOut(true); const now = new Date();
      const { total, totalCost, discount, pointsRedeemed } = cartFinancials;
      
      // Generate unique invoice barcode
      const invBarcode = `INV${Date.now().toString().slice(-8)}${Math.floor(Math.random()*100)}`;

      const invData: Invoice = {
          date: now, total, totalCost, items: [...cartItems], status: 'paid', paymentMethod: method,
          customerId: currentCart.customerId || undefined, customerName: selectedCustomer?.name || undefined,
          discountAmount: discount, pointsRedeemed: pointsRedeemed, barcode: invBarcode
      };

      try {
          await (db as any).transaction('rw', [db.products, db.invoices, db.customers, db.financial_records, db.stock_movements], async () => {
              for (const item of cartItems) {
                  const p = await db.products.get(item.productId);
                  if (p) { await db.products.update(item.productId, { stock: p.stock - item.quantity }); await db.stock_movements.add({ productId: item.productId, type: 'sale', quantity: -item.quantity, date: now }); }
              }
              
              if (currentCart.customerId) {
                  const c = await db.customers.get(currentCart.customerId);
                  if (c) {
                      let newDebt = c.debt; let newPoints = c.points;
                      if (method === 'debt') newDebt += total;
                      if (pointsRedeemed > 0) newPoints = Math.max(0, newPoints - pointsRedeemed);
                      if (settings?.loyaltyEnabled && method !== 'debt') {
                          const earned = Math.floor(total / (settings.spendPerPoint || 100));
                          if (earned > 0) { newPoints += earned; invData.pointsEarned = earned; }
                      }
                      await db.customers.update(c.id!, { debt: newDebt, points: newPoints });
                  }
              }

              const invId = await db.invoices.add(invData); invData.id = invId;
              await db.financial_records.add({ type: 'sale', date: now, amount: total, relatedCost: totalCost, description: `مبيعات فاتورة #${invId}`, invoiceId: invId, customerId: currentCart.customerId || undefined });
          });
          setLastInvoice(invData);
          if (carts.length > 1) confirmRemoveCart(activeCartId); else updateCurrentCart({ items: [], customerId: null, redeemPoints: false });
      } catch (e) { console.error(e); alert('حدث خطأ أثناء حفظ العملية!'); } finally { setIsCheckingOut(false); }
  };

  const canRedeem = selectedCustomer && settings?.loyaltyEnabled && selectedCustomer.points >= (settings.minPointsToRedeem || 0);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-100">
        <div className="md:hidden flex shrink-0 bg-white border-b no-print"><button className={`flex-1 py-3 flex justify-center gap-2 ${mobileTab==='products'?'text-primary border-b-2 border-primary':'text-gray-500'}`} onClick={()=>setMobileTab('products')}><Search size={18}/> المنتجات</button><button className={`flex-1 py-3 flex justify-center gap-2 ${mobileTab==='cart'?'text-primary border-b-2 border-primary':'text-gray-500'}`} onClick={()=>setMobileTab('cart')}><CartIcon size={18}/> السلة <span className="num-l">({cartItems.reduce((a,b)=>a+b.quantity,0)})</span></button></div>
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className={`flex-1 flex-col overflow-hidden ${mobileTab==='products'?'flex':'hidden md:flex'}`}>
                <div className="bg-white p-4 shadow-sm z-10 flex flex-col gap-3 shrink-0"><div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/><input type="text" placeholder="بحث عن منتج (اسم أو باركود)..." autoFocus className="w-full pr-10 pl-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/></div><div className="flex gap-2 overflow-x-auto scrollbar-hide"><button onClick={()=>setSelectedCategory('الكل')} className={`px-4 py-2 rounded-xl whitespace-nowrap font-medium transition-colors ${selectedCategory==='الكل'?'bg-primary text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>الكل</button>{categories.map(c=>(<button key={c.id} onClick={()=>setSelectedCategory(c.name)} className={`px-4 py-2 rounded-xl whitespace-nowrap font-medium transition-colors ${selectedCategory===c.name?'bg-primary text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{c.name}</button>))}</div></div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-100"><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">{filteredProducts.map(p=>(<div key={p.id} onClick={()=>p.stock>0 && addToCart(p)} className={`bg-white p-3 rounded-2xl shadow-sm border-2 transition-all flex flex-col relative ${p.stock<=0?'opacity-60 grayscale border-gray-100 cursor-not-allowed':'border-transparent hover:border-primary/30 cursor-pointer active:scale-95'}`}>{settings?.posShowImages && (<div className="w-full h-28 mb-3 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">{p.imageBase64?<img src={p.imageBase64} className="w-full h-full object-cover"/>:<ImageIcon size={28} className="text-gray-300 opacity-50"/>}</div>)}<h3 className="font-bold text-gray-800 line-clamp-2 text-sm flex-1 mb-2 leading-tight">{p.name}</h3><div className="flex justify-between items-end mt-auto"><div>{settings?.posShowStock && <p className={`text-xs num-l font-medium mb-0.5 ${p.stock<=5?'text-orange-500': 'text-gray-400'}`}>{p.stock} متوفر</p>}<p className="text-primary font-black text-lg num-l">{p.price} <span className="text-[10px] font-normal">{currency}</span></p></div><div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${p.stock>0?'bg-primary text-white':'bg-gray-200 text-gray-400'}`}>{p.stock>0?<Plus size={18} strokeWidth={3}/>:<X size={18}/>}</div></div>{p.stock<=0 && <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-2xl"><span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full -rotate-12 shadow-sm">نفذت الكمية</span></div>}</div>))}</div></div>
            </div>
            <div className={`w-full md:w-[440px] bg-white shadow-2xl z-20 flex flex-col h-full border-r ${mobileTab==='cart'?'flex':'hidden md:flex'}`}>
                <div className="flex bg-gray-100 p-2 gap-2 overflow-x-auto scrollbar-hide shrink-0">{carts.map(c=>(<div key={c.id} onClick={()=>setActiveCartId(c.id)} className={`flex items-center pl-1 pr-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap group transition-all ${activeCartId===c.id?'bg-white shadow-sm text-primary font-bold ring-1 ring-black/5':'text-gray-500 hover:bg-gray-200'}`}>{activeCartId===c.id?<PlayCircle size={16} className="ml-1"/>:<PauseCircle size={16} className="ml-1 opacity-50"/>}{c.label}{c.items?.length>0 && <span className="mr-1 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full num-l">{c.items.reduce((a,b)=>a+b.quantity,0)}</span>}<div onClick={(e)=>{e.stopPropagation(); if(c.items?.length) setCartToDelete(c.id); else confirmRemoveCart(c.id);}} className="mr-2 p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 transition-colors"><X size={14}/></div></div>))}<button onClick={createNewCart} className="p-2 bg-white hover:bg-primary hover:text-white text-gray-500 rounded-lg shadow-sm transition-colors"><Plus size={18}/></button></div>
                 <div className="p-3 border-b flex justify-between items-center bg-gray-50 shrink-0">
                     <div className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-200 rounded-xl flex-1 transition-colors" onClick={()=>setIsCustomerModalOpen(true)}><div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedCustomer?'bg-primary text-white':'bg-gray-300 text-gray-500'}`}><User size={20}/></div><div className="flex-1 min-w-0"><p className="font-bold text-gray-800 truncate">{selectedCustomer?selectedCustomer.name:'زبون عام'}</p>{selectedCustomer && settings?.loyaltyEnabled && <p className="text-xs text-amber-600 flex items-center gap-1 font-medium num-l"><Coins size={12}/> {selectedCustomer.points} نقطة</p>}</div></div>
                     <div className="flex items-center gap-1">
                        <button onClick={()=>setShowReturnModal(true)} className="text-gray-500 hover:text-primary p-2 hover:bg-gray-200 rounded-xl transition-colors" title="مسح وصل للاسترجاع"><ScanLine size={20}/></button>
                        {selectedCustomer && <button onClick={()=>updateCurrentCart({customerId:null,redeemPoints:false})} className="text-gray-400 hover:text-red-500 p-2 hover:bg-gray-200 rounded-xl transition-colors"><X size={18}/></button>}
                     </div>
                 </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50">{cartItems.map(i=>(<div key={i.productId} className="flex items-center gap-3 p-3 bg-white rounded-2xl border shadow-sm"><div className="flex-1 min-w-0"><h4 className="font-bold truncate text-gray-900">{i.productName}</h4><div className="text-primary font-medium text-sm num-l mt-1">{i.price} x {i.quantity} = <span className="font-black">{(i.price*i.quantity).toLocaleString()}</span></div></div><div className="flex items-center bg-gray-100 rounded-xl p-1 shrink-0"><button onClick={()=>updateQuantity(i.productId,i.quantity-1)} className="w-9 h-9 flex items-center justify-center hover:bg-white rounded-lg transition-colors"><Minus size={16}/></button><input type="number" className="w-10 text-center bg-transparent font-bold outline-none num-l" value={i.quantity} onChange={e=>updateQuantity(i.productId,parseInt(e.target.value)||1)}/><button onClick={()=>updateQuantity(i.productId,i.quantity+1)} className="w-9 h-9 flex items-center justify-center hover:bg-white rounded-lg transition-colors"><Plus size={16}/></button></div><button onClick={()=>updateCurrentCart({items:cartItems.filter(x=>x.productId!==i.productId)})} className="w-9 h-9 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18}/></button></div>))}{cartItems.length===0 && (<div className="h-full flex flex-col items-center justify-center text-gray-300"><CartIcon size={64} className="mb-4 opacity-50"/><p className="text-lg font-medium">السلة فارغة</p><p className="text-sm">أضف منتجات لبدء البيع</p></div>)}</div>
                <div className="p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0 z-10 sticky bottom-0 space-y-3">
                    {canRedeem && cartFinancials.subtotal > 0 && (
                        <div className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${currentCart.redeemPoints ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-dashed'}`} onClick={()=>updateCurrentCart({redeemPoints:!currentCart.redeemPoints})}>
                            <div className="flex items-center gap-2 text-amber-700"><TicketPercent size={20}/><span className="font-bold">خصم نقاط الولاء</span></div>
                            {currentCart.redeemPoints ? <span className="font-bold text-red-600 num-l">-{cartFinancials.discount.toLocaleString()} {currency}</span> : <span className="text-xs text-gray-500">اضغط للتفعيل</span>}
                        </div>
                    )}
                    <div className="flex flex-col gap-1">
                        {cartFinancials.discount > 0 && <div className="flex justify-between text-sm text-gray-500 px-1"><span>المجموع الفرعي</span><span className="num-l">{cartFinancials.subtotal.toLocaleString()}</span></div>}
                        <div className="flex justify-between items-end"><span className="text-gray-800 font-bold text-lg">الإجمالي النهائي</span><span className="text-4xl font-black text-primary num-l tracking-tight">{cartFinancials.total.toLocaleString()} <span className="text-sm text-gray-500 font-medium">{currency}</span></span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3"><Button variant="primary" size="lg" className="bg-emerald-600 hover:bg-emerald-700 h-14 text-lg shadow-emerald-600/20" onClick={()=>handleCheckout('cash')} disabled={cartItems.length===0||isCheckingOut}>{isCheckingOut?<Loader2 className="animate-spin"/>:<><Banknote className="mr-2"/> دفع نقدي</>}</Button><Button variant="secondary" size="lg" className="border-2 border-amber-400/50 text-amber-800 hover:bg-amber-50 h-14 font-bold text-lg" onClick={()=>handleCheckout('debt')} disabled={cartItems.length===0||isCheckingOut}>تسجيل دين</Button></div>
                </div>
            </div>
        </div>
        {isCustomerModalOpen && <CustomerSelectionModal isOpen={isCustomerModalOpen} onClose={()=>setIsCustomerModalOpen(false)} customers={customers} onSelect={(c)=>{updateCurrentCart({customerId:c?.id||null,label:c?c.name.split(' ')[0]:currentCart.label,redeemPoints:false});setIsCustomerModalOpen(false)}} currency={currency}/>}
        {lastInvoice && <ReceiptModal invoice={lastInvoice} onClose={()=>setLastInvoice(null)} settings={settings} />}
        {showReturnModal && <QuickReturnModal onClose={()=>setShowReturnModal(false)} />}
        <ConfirmModal isOpen={!!cartToDelete} onClose={()=>setCartToDelete(null)} onConfirm={()=>cartToDelete && confirmRemoveCart(cartToDelete)} title="حذف الطلبية؟" message="هل أنت متأكد من حذف هذه الطلبية ومحتوياتها؟ لا يمكن التراجع." />
    </div>
  );
}

function CustomerSelectionModal({ isOpen, onClose, customers, onSelect, currency }: any) {
    const [q, setQ] = useState('');
    const filtered = useMemo(() => customers.filter((c: Customer) => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone?.includes(q)), [customers, q]);
    if(!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}><div className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95" onClick={e=>e.stopPropagation()}><div className="p-4 border-b flex justify-between items-center shrink-0"><h3 className="font-bold text-lg">اختيار عميل</h3><button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button></div>
        <div className="p-3 bg-gray-50 border-b"><div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/><input type="text" placeholder="بحث باسم العميل أو الهاتف..." className="w-full pr-9 pl-4 py-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={q} onChange={e=>setQ(e.target.value)} autoFocus/></div></div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1"><button className="w-full p-3 flex items-center gap-3 hover:bg-gray-100 rounded-2xl transition-colors" onClick={()=>onSelect(null)}><div className="w-12 h-12 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center shrink-0"><User size={24}/></div><div className="font-bold text-lg text-gray-700">زبون عام</div></button>{filtered.map((c: Customer)=>(<button key={c.id} className="w-full p-3 flex items-center gap-3 hover:bg-primary/5 rounded-2xl transition-colors text-right group" onClick={()=>onSelect(c)}><div className="w-12 h-12 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white rounded-full flex items-center justify-center font-bold text-xl shrink-0 transition-colors">{c.name[0]}</div><div className="flex-1 min-w-0"><div className="font-bold truncate">{c.name}</div><div className="flex gap-3 text-sm mt-0.5">{c.phone && <span className="text-gray-500 num-l flex items-center gap-1"><Phone size={12}/> {c.phone}</span>}{c.debt>0 && <span className="text-red-600 font-medium num-l">{c.debt} {currency} دين</span>}</div></div></button>))}</div></div></div>
    );
}

function ReceiptModal({ invoice, onClose, settings }: { invoice: Invoice, onClose: () => void, settings: StoreSettings | undefined }) {
    const ref = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        if (ref.current) {
            setLoading(true);
            try {
                const url = await toPng(ref.current, { quality: 0.95, backgroundColor: '#ffffff' });
                const a = document.createElement('a');
                a.download = `Receipt-${invoice.barcode || invoice.id}.png`;
                a.href = url;
                a.click();
            } catch (e) {
                console.error("Receipt download error:", e);
                alert('فشل تحميل صورة الوصل.');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-gray-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 my-8">
                <div className="p-4 bg-emerald-600 text-white flex justify-between items-center shrink-0 no-print"><span className="font-bold flex items-center gap-2 text-lg"><CheckCircle2/> اكتملت العملية بنجاح</span><button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full"><X/></button></div>
                
                <div className="flex-1 overflow-y-auto relative bg-gray-100 p-4">
                    <div ref={ref} className="bg-white text-black p-6 mx-auto w-full max-w-[320px] shadow-sm text-sm font-mono leading-snug printable-receipt" dir="rtl" style={{ colorScheme: 'only light' }}>
                         <div className="text-center mb-4 pb-4 border-b-2 border-black border-dashed">
                             <h2 className="text-2xl font-black mb-2 uppercase tracking-wide">{settings?.storeName || 'STORE NAME'}</h2>
                             {settings?.storeAddress && <div className="text-xs mb-1">{settings.storeAddress}</div>}
                             {settings?.storePhone && <div className="text-xs num-l font-bold">{settings.storePhone}</div>}
                         </div>
                         
                         <div className="flex justify-between text-xs mb-1"><span>التاريخ:</span><span className="num-l">{new Date(invoice.date).toLocaleDateString('en-GB')}</span></div>
                         <div className="flex justify-between text-xs mb-1"><span>الوقت:</span><span className="num-l">{new Date(invoice.date).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span></div>
                         <div className="flex justify-between text-xs mb-1"><span>رقم الوصل:</span><span className="num-l font-bold">#{invoice.id}</span></div>
                         <div className="flex justify-between text-xs mb-4 pb-2 border-b-2 border-black border-dashed"><span>العميل:</span><span className="font-bold truncate max-w-[150px]">{invoice.customerName || 'زبون عام'}</span></div>

                         <table className="w-full mb-4 text-xs">
                             <thead><tr className="border-b border-black"><th className="text-right py-1">الصنف</th><th className="text-center w-8">العدد</th><th className="text-left w-16">الإجمالي</th></tr></thead>
                             <tbody className="divide-y divide-black/10">
                                 {invoice.items.map((item, i) => (
                                     <tr key={i}>
                                         <td className="py-1.5 pr-1 font-medium leading-tight">{item.productName} <div className="text-[10px] opacity-70 num-l">{item.price.toLocaleString()} / وحدة</div></td>
                                         <td className="text-center py-1.5 align-top num-l font-bold">{item.quantity}</td>
                                         <td className="text-left py-1.5 align-top num-l font-bold">{(item.price * item.quantity).toLocaleString()}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>

                         <div className="border-t-2 border-black border-dashed pt-2 space-y-1 text-xs">
                             {invoice.discountAmount ? (
                                 <>
                                    <div className="flex justify-between"><span>المجموع الفرعي:</span><span className="num-l">{(invoice.total + invoice.discountAmount).toLocaleString()}</span></div>
                                    <div className="flex justify-between font-bold"><span>خصم ولاء:</span><span className="num-l">-{invoice.discountAmount.toLocaleString()}</span></div>
                                 </>
                             ) : null}
                             <div className="flex justify-between text-xl font-black py-2 border-y-2 border-black border-dashed my-2">
                                 <span>الإجمالي:</span>
                                 <span className="num-l">{invoice.total.toLocaleString()} <span className="text-xs font-normal">{settings?.currency}</span></span>
                             </div>
                             <div className="flex justify-between"><span>طريقة الدفع:</span><span className="font-bold">{invoice.paymentMethod === 'cash' ? 'نقدي' : invoice.paymentMethod === 'card' ? 'بطاقة' : 'آجل (دين)'}</span></div>
                             {invoice.paymentMethod === 'debt' && <div className="flex justify-between font-bold"><span>المتبقي كدين:</span><span className="num-l">{invoice.total.toLocaleString()}</span></div>}
                             {invoice.pointsEarned ? <div className="flex justify-center gap-1 mt-2 pt-2 border-t border-black/20"><span>نقاط مكتسبة:</span><span className="num-l font-bold">{invoice.pointsEarned}</span></div> : null}
                         </div>

                         <div className="text-center mt-6 text-[10px] font-medium uppercase opacity-70">
                             {settings?.receiptFooter || 'Thank you for visiting!'}
                         </div>
                         <div className="mt-4 flex justify-center">
                             <svg className="barcode h-10 w-full max-w-[180px]" jsbarcode-format="code128" jsbarcode-value={invoice.barcode || invoice.id?.toString()} jsbarcode-displayvalue="false" jsbarcode-height="40" jsbarcode-width="2"></svg>
                         </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-white flex gap-3 shrink-0 no-print">
                    <Button variant="primary" size="lg" className="flex-1 gap-2 shadow-lg" onClick={() => window.print()}><Printer /> طباعة</Button>
                    <Button variant="secondary" size="lg" className="flex-1 gap-2" onClick={handleDownload} disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : <Download/>} تحميل صورة</Button>
                </div>
            </div>
        </div>
    );
}

// Placeholder for return functionality
function QuickReturnModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 animate-in zoom-in-95" onClick={e=>e.stopPropagation()}>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ScanLine/> استرجاع سريع</h3>
                <p className="text-gray-500 mb-4">امسح باركود الوصل أو أدخل رقمه للبدء بعملية الاسترجاع.</p>
                <input type="text" placeholder="رقم الوصل أو الباركود..." className="w-full p-3 border rounded-xl mb-4 num-l" autoFocus />
                <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={onClose}>إلغاء</Button>
                    <Button className="flex-1">بحث</Button>
                </div>
            </div>
        </div>
    );
}
