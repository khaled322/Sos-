import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Customer, Supplier, Invoice, FinancialTransaction, StoreSettings } from '../types';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Plus, Search, Edit, Phone, MapPin, DollarSign, X, Award, Printer, Download, ToggleLeft, ToggleRight, Loader2, Eye, Building2, User, Filter, Calendar, ArrowDownLeft, ArrowUpRight, Coins, Receipt, CheckCircle2 } from 'lucide-react';
import { toPng } from 'html-to-image';

type ContactType = 'customer' | 'supplier';

export default function Customers() {
  const [tab, setTab] = useState<ContactType>('customer');
  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray()) || [];
  const suppliers = useLiveQuery(() => db.suppliers.orderBy('name').toArray()) || [];
  const settings = useLiveQuery(() => db.settings.toArray())?.[0];
  const currency = settings?.currency || 'د.ج';
  const [search, setSearch] = useState('');
  const [filterDebt, setFilterDebt] = useState(false);
  
  const [modal, setModal] = useState<{ open: boolean, type: ContactType, edit: any | null }>({ open: false, type: 'customer', edit: null });
  const [viewId, setViewId] = useState<{ type: ContactType, id: number } | null>(null);
  const [historyId, setHistoryId] = useState<{ type: ContactType, id: number } | null>(null);

  const filtered = useMemo(() => {
      let data: any[] = tab === 'customer' ? customers : suppliers;
      if (search) data = data.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));
      if (filterDebt) data = data.filter(c => (tab === 'customer' ? c.debt : c.debtToSupplier) > 0);
      return data;
  }, [tab, customers, suppliers, search, filterDebt]);

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
          <div><h1 className="text-3xl font-bold text-gray-900">دليل جهات الاتصال</h1><p className="text-gray-500">إدارة العملاء والموردين</p></div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
               <div className="flex bg-gray-200/80 p-1 rounded-xl shrink-0"><button onClick={() => setTab('customer')} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${tab === 'customer' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}><User size={18}/> العملاء</button><button onClick={() => setTab('supplier')} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${tab === 'supplier' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}><Building2 size={18}/> الموردين</button></div>
              <div className="relative flex-1 md:w-56"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="بحث..." className="w-full pr-10 pl-4 py-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={search} onChange={e => setSearch(e.target.value)} /></div>
              <Button onClick={() => setFilterDebt(!filterDebt)} variant={filterDebt ? 'primary' : 'secondary'} className={`shrink-0 gap-2 ${filterDebt ? '' : 'bg-white'}`}><Filter size={18}/> {filterDebt ? 'عليهم ديون' : 'فلتر الديون'}</Button>
              <Button onClick={() => setModal({ open: true, type: tab, edit: null })} className="gap-2 shrink-0 shadow-lg"><Plus size={20} /> {tab==='customer'?'عميل جديد':'مورد جديد'}</Button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 overflow-y-auto content-start flex-1">
          {filtered.map(c => {
              const isCust = tab === 'customer'; const debt = isCust ? c.debt : c.debtToSupplier;
              return (
                <div key={c.id} className="bg-white p-5 rounded-2xl shadow-sm border hover:shadow-md transition-shadow flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ${isCust ? 'bg-primary/10 text-primary' : 'bg-orange-100 text-orange-700'}`}>{c.name[0]}</div>
                            <div><h3 className="font-bold text-gray-900 line-clamp-1">{c.name}</h3>{c.phone ? <div className="flex items-center gap-1 text-sm text-gray-500 num-l"><Phone size={12} /> {c.phone}</div> : <div className="text-xs text-gray-400">بدون هاتف</div>}</div>
                        </div>
                        {isCust && c.points > 0 && <div className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 num-l"><Award size={14}/> {c.points}</div>}
                    </div>
                    <div className="flex gap-1 mt-auto pt-4 border-t">
                        {isCust && <Button variant="ghost" size="sm" onClick={() => setViewId({type:'customer',id:c.id})} className="flex-1 bg-gray-50 hover:bg-primary/10 hover:text-primary" title="بطاقة الولاء"><Award size={18} /></Button>}
                        <Button variant="ghost" size="sm" onClick={() => setHistoryId({type:tab,id:c.id})} className="flex-1 bg-gray-50 hover:bg-blue-50 hover:text-blue-600" title="سجل المعاملات"><Eye size={18} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setModal({open:true,type:tab,edit:c})} className="flex-1 bg-gray-50 hover:bg-gray-100" title="تعديل"><Edit size={18} /></Button>
                    </div>
                    {debt > 0 && <div className={`mt-3 pt-3 border-t border-dashed flex justify-between items-center ${isCust?'text-red-600':'text-orange-600'}`}><span className="text-xs font-bold">{isCust?'عليه (دين)':'له (مستحقات)'}</span><span className="font-black num-l text-lg">{debt.toLocaleString()} <span className="text-xs font-normal text-gray-500">{currency}</span></span></div>}
                </div>
              );
          })}
      </div>

      {modal.open && <ContactModal type={modal.type} edit={modal.edit} onClose={() => setModal({ open: false, type: 'customer', edit: null })} />}
      {viewId && viewId.type === 'customer' && <LoyaltyCardModal customerId={viewId.id} onClose={() => setViewId(null)} currency={currency} settings={settings} />}
      {historyId && <HistoryModal type={historyId.type} id={historyId.id} onClose={() => setHistoryId(null)} currency={currency} settings={settings} />}
    </div>
  );
}

function ContactModal({ type, edit, onClose }: any) {
    const isCust = type === 'customer';
    const [fd, setFd] = useState(edit || (isCust ? { name: '', phone: '', address: '', notes: '', barcode: 'C'+Date.now() } : { name: '', phone: '', address: '', note: '' }));
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const table = isCust ? db.customers : db.suppliers;
        if (edit?.id) await table.update(edit.id, fd);
        else await table.add({ ...fd, createdAt: new Date() } as any);
        onClose();
    };
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}><div className="bg-white rounded-2xl w-full max-w-md animate-in zoom-in-95" onClick={e=>e.stopPropagation()}><div className="p-5 border-b flex justify-between items-center"><h2 className="text-xl font-bold">{edit ? 'تعديل' : 'إضافة'} {isCust ? 'عميل' : 'مورد'}</h2><button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button></div><form onSubmit={handleSubmit} className="p-6 space-y-4">
            <input required type="text" placeholder="اسم الكامل *" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" value={fd.name||''} onChange={e => setFd({...fd, name: e.target.value})} autoFocus />
            <input type="tel" placeholder="رقم الهاتف" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none num-l" value={fd.phone||''} onChange={e => setFd({...fd, phone: e.target.value})} />
            <input type="text" placeholder="العنوان" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" value={fd.address||''} onChange={e => setFd({...fd, address: e.target.value})} />
            <textarea placeholder="ملاحظات إضافية..." className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-24 resize-none" value={(isCust ? fd.notes : fd.note)||''} onChange={e => setFd({...fd, [isCust?'notes':'note']: e.target.value})} />
            <Button type="submit" size="lg" className="w-full">حفظ</Button>
        </form></div></div>
    );
}

function LoyaltyCardModal({ customerId, onClose, currency, settings }: any) {
    const customer = useLiveQuery(() => db.customers.get(customerId));
    const [isBw, setIsBw] = useState(false); const cardRef = useRef<HTMLDivElement>(null); const [dl, setDl] = useState(false);
    if (!customer) return null;
    const handleDownload = async () => { if (cardRef.current && !dl) { setDl(true); try { const u = await toPng(cardRef.current, { quality: 1, pixelRatio: 3 }); const a = document.createElement('a'); a.download = `LoyaltyCard-${customer.name}.png`; a.href = u; a.click(); } catch (e) { alert('فشل التحميل'); } finally { setDl(false); } } };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95" onClick={e=>e.stopPropagation()}>
                <div className="p-4 bg-primary text-white flex justify-between items-center shrink-0"><h2 className="text-lg font-bold flex items-center gap-2"><Award/> بطاقة الولاء</h2><button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full"><X size={20}/></button></div>
                <div className="p-8 bg-gray-50 flex flex-col items-center">
                    <div className="flex justify-center mb-6 no-print"><button onClick={() => setIsBw(!isBw)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${isBw ? 'bg-gray-200 text-gray-700' : 'bg-primary text-white shadow-md'}`}>{isBw ? <ToggleLeft size={18}/> : <ToggleRight size={18}/>}{isBw ? 'وضع أبيض وأسود (طباعة اقتصادية)' : 'الوضع الملون'}</button></div>
                    <div className="p-4 bg-white rounded-3xl shadow-sm border mb-6 no-print overflow-hidden">
                    <div ref={cardRef} className={`printable loyalty-card relative w-[400px] h-[240px] rounded-[2rem] overflow-hidden flex flex-col transition-all ${isBw?'bg-white text-black border-2 border-black':'text-white shadow-2xl'}`} style={!isBw?{background:'linear-gradient(135deg, rgb(var(--color-primary)) 0%, rgb(var(--color-primary-dark)) 100%)'}:{}}>
                        {!isBw && <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-20 blur-2xl pointer-events-none"></div>}
                        <div className="relative h-full p-7 flex flex-col justify-between z-10">
                            <div className="flex justify-between items-start">
                                <div><div className={`text-[10px] uppercase tracking-[0.2em] font-bold mb-1 ${isBw?'opacity-60':'text-white/70'}`}>LOYALTY MEMBER</div><h3 className="font-black text-2xl tracking-tight">{settings?.storeName || 'OmniPOS'}</h3></div>
                                <Award size={40} className={isBw?'opacity-80 text-black':'text-amber-300 drop-shadow-lg'}/>
                            </div>
                            <div className="flex-1 flex flex-col justify-center pl-1 mt-2">
                                <div className="text-2xl font-black mb-1 tracking-tight truncate">{customer.name}</div>
                                {customer.phone && <div className={`flex items-center gap-2 text-sm font-medium num-l ${isBw?'opacity-70':'text-white/80'}`}><Phone size={14}/> {customer.phone}</div>}
                            </div>
                            <div className="flex justify-end items-end">
                                {customer.barcode && <div className={`p-2.5 rounded-xl flex flex-col items-center ${isBw?'bg-transparent':'bg-white'}`}>
                                    <svg className="h-8 w-32" jsbarcode-format="code128" jsbarcode-value={customer.barcode} jsbarcode-displayvalue="false" jsbarcode-height="40" jsbarcode-width="2" jsbarcode-background={isBw?"transparent":"#ffffff"} jsbarcode-linecolor="#000000"></svg>
                                </div>}
                            </div>
                        </div>
                    </div>
                    </div>
                    <div className="flex gap-4 no-print w-full max-w-md">
                        <Button onClick={handleDownload} disabled={dl} className="flex-1 gap-2 shadow-lg" size="lg">{dl ? <Loader2 className="animate-spin"/> : <Download/>} تحميل البطاقة</Button>
                        <Button variant="secondary" onClick={() => window.print()} className="flex-1 gap-2" size="lg"><Printer/> طباعة</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HistoryModal({ type, id, onClose, currency, settings }: any) {
    const isCust = type === 'customer';
    const invoices = useLiveQuery(() => isCust ? db.invoices.where('customerId').equals(id).reverse().sortBy('date') : Promise.resolve([]), [id, isCust]) || [];
    const transactions = useLiveQuery(() => db.financial_records.where(isCust ? 'customerId' : 'supplierId').equals(id).reverse().sortBy('date'), [id, isCust]) || [];
    const contact = useLiveQuery(() => (isCust ? db.customers : db.suppliers).get(id), [id, isCust]);
    const [viewInv, setViewInv] = useState<Invoice | null>(null);

    if (!contact) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95" onClick={e=>e.stopPropagation()}>
                <div className="p-5 bg-gray-900 text-white flex justify-between items-center shrink-0">
                    <div><h2 className="text-xl font-bold">{contact.name}</h2><p className="text-gray-400 text-sm">سجل المعاملات</p></div>
                    <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full"><X size={24}/></button>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-gray-50">
                    <div className="w-full md:w-1/3 border-l bg-white p-5 overflow-y-auto">
                         <div className={`p-5 rounded-2xl mb-4 text-center ${isCust?((contact as Customer).debt>0?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'):((contact as Supplier).debtToSupplier>0?'bg-orange-50 text-orange-700':'bg-emerald-50 text-emerald-700')}`}>
                             <div className="text-sm font-bold mb-1">{isCust?'الرصيد الحالي (عليه)':'الرصيد الحالي (له)'}</div>
                             <div className="text-4xl font-black num-l">{(isCust?(contact as Customer).debt:(contact as Supplier).debtToSupplier).toLocaleString()} <span className="text-sm font-normal">{currency}</span></div>
                         </div>
                         {isCust && <div className="p-4 rounded-2xl bg-amber-50 text-amber-800 text-center border border-amber-100 mb-4"><div className="text-sm font-bold mb-1"><Award size={16} className="inline"/> نقاط الولاء</div><div className="text-3xl font-black num-l">{(contact as Customer).points}</div></div>}
                         <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Calendar size={18}/> آخر المعاملات المالية</h4>
                         <div className="space-y-2 text-sm">
                             {transactions.slice(0, 10).map(t => (
                                 <div key={t.id} className="flex justify-between p-3 bg-gray-50 rounded-xl border">
                                     <div><div className="font-medium">{t.description}</div><div className="text-xs text-gray-500 num-l">{new Date(t.date).toLocaleDateString('en-GB')}</div></div>
                                     <div className={`font-bold num-l ${['sale','debt_in'].includes(t.type)?'text-emerald-600':'text-red-600'}`}>{t.amount.toLocaleString()}</div>
                                 </div>
                             ))}
                         </div>
                    </div>
                    <div className="flex-1 p-5 overflow-y-auto">
                        {isCust ? (
                            <>
                            <h3 className="font-bold text-lg mb-4">فواتير المبيعات ({invoices.length})</h3>
                            <div className="space-y-3">
                                {invoices.map(inv => (
                                    <div key={inv.id} className="bg-white p-4 rounded-2xl border shadow-sm hover:border-primary/30 transition-colors flex justify-between items-center">
                                        <div className="flex gap-4 items-center">
                                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex flex-col items-center justify-center text-xs font-bold text-gray-500 num-l leading-tight"><span>{new Date(inv.date).getDate()}</span><span className="text-[10px] uppercase">{new Date(inv.date).toLocaleString('en-US',{month:'short'})}</span></div>
                                            <div>
                                                <div className="font-bold text-gray-800">فاتورة #{inv.id}</div>
                                                <div className="text-sm text-gray-500 flex items-center gap-2">{inv.items.length} منتجات <span className="w-1 h-1 bg-gray-300 rounded-full"></span> {inv.paymentMethod==='cash'?'نقد':inv.paymentMethod==='debt'?'آجل':'بطاقة'}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="font-black text-lg num-l">{inv.total.toLocaleString()} <span className="text-xs font-normal text-gray-500">{currency}</span></div>
                                                {inv.paymentMethod === 'debt' && <div className="text-xs text-red-600 font-bold">غير مدفوع</div>}
                                            </div>
                                            <Button variant="secondary" size="sm" onClick={()=>setViewInv(inv)} className="!p-2.5 bg-gray-50 hover:bg-primary/10 hover:text-primary hover:border-primary/30"><Eye size={18}/></Button>
                                        </div>
                                    </div>
                                ))}
                                {invoices.length === 0 && <div className="text-center py-10 text-gray-400">لا توجد فواتير سابقة</div>}
                            </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 flex-col"><Building2 size={48} className="mb-4 opacity-30"/><p>سجل فواتير المشتريات من الموردين قريباً...</p></div>
                        )}
                    </div>
                </div>
            </div>
            {viewInv && <UnifiedReceiptModal invoice={viewInv} onClose={()=>setViewInv(null)} settings={settings} />}
        </div>
    );
}

function UnifiedReceiptModal({ invoice, onClose, settings }: { invoice: Invoice, onClose: () => void, settings: StoreSettings | undefined }) {
    const ref = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const handleDownload = async () => {
        if (ref.current) {
            setLoading(true);
            try {
                const url = await toPng(ref.current, { quality: 0.95, backgroundColor: '#ffffff' });
                const a = document.createElement('a'); a.download = `Receipt-${invoice.barcode || invoice.id}.png`; a.href = url; a.click();
            } catch { alert('فشل تحميل صورة الوصل.'); } finally { setLoading(false); }
        }
    };
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-gray-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 my-8" onClick={e=>e.stopPropagation()}>
                <div className="flex-1 overflow-y-auto relative bg-gray-100 p-4">
                    <div ref={ref} className="bg-white text-black p-6 mx-auto w-full max-w-[320px] shadow-sm text-sm font-mono leading-snug printable-receipt" dir="rtl" style={{ colorScheme: 'only light' }}>
                         <div className="text-center mb-4 pb-4 border-b-2 border-black border-dashed">
                             <h2 className="text-2xl font-black mb-2 uppercase tracking-wide">{settings?.storeName || 'STORE NAME'}</h2>
                             {settings?.storeAddress && <div className="text-xs mb-1">{settings.storeAddress}</div>}
                             {settings?.storePhone && <div className="text-xs num-l font-bold">{settings.storePhone}</div>}
                         </div>
                         <div className="flex justify-between text-xs mb-1"><span>التاريخ:</span><span className="num-l">{new Date(invoice.date).toLocaleDateString('en-GB')}</span></div>
                         <div className="flex justify-between text-xs mb-1"><span>رقم الوصل:</span><span className="num-l font-bold">#{invoice.id}</span></div>
                         <div className="flex justify-between text-xs mb-4 pb-2 border-b-2 border-black border-dashed"><span>العميل:</span><span className="font-bold truncate max-w-[150px]">{invoice.customerName || 'زبون عام'}</span></div>
                         <table className="w-full mb-4 text-xs"><thead><tr className="border-b border-black"><th className="text-right py-1">الصنف</th><th className="text-center w-8">العدد</th><th className="text-left w-16">الإجمالي</th></tr></thead><tbody className="divide-y divide-black/10">{invoice.items.map((item, i) => (<tr key={i}><td className="py-1.5 pr-1 font-medium leading-tight">{item.productName}</td><td className="text-center py-1.5 align-top num-l font-bold">{item.quantity}</td><td className="text-left py-1.5 align-top num-l font-bold">{(item.price * item.quantity).toLocaleString()}</td></tr>))}</tbody></table>
                         <div className="border-t-2 border-black border-dashed pt-2 space-y-1 text-xs">
                             {invoice.discountAmount ? <><div className="flex justify-between"><span>المجموع الفرعي:</span><span className="num-l">{(invoice.total + invoice.discountAmount).toLocaleString()}</span></div><div className="flex justify-between font-bold"><span>خصم ولاء:</span><span className="num-l">-{invoice.discountAmount.toLocaleString()}</span></div></> : null}
                             <div className="flex justify-between text-xl font-black py-2 border-y-2 border-black border-dashed my-2"><span>الإجمالي:</span><span className="num-l">{invoice.total.toLocaleString()} <span className="text-xs font-normal">{settings?.currency}</span></span></div>
                         </div>
                         <div className="mt-4 flex justify-center"><svg className="barcode h-10 w-full max-w-[180px]" jsbarcode-format="code128" jsbarcode-value={invoice.barcode || invoice.id?.toString()} jsbarcode-displayvalue="false" jsbarcode-height="40" jsbarcode-width="2"></svg></div>
                    </div>
                </div>
                <div className="p-4 border-t bg-white flex gap-3 shrink-0 no-print"><Button variant="primary" size="lg" className="flex-1 gap-2 shadow-lg" onClick={() => window.print()}><Printer /> طباعة</Button><Button variant="secondary" size="lg" className="flex-1 gap-2" onClick={handleDownload} disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : <Download/>} صورة</Button><Button variant="ghost" size="lg" onClick={onClose}><X/></Button></div>
            </div>
        </div>
    );
}
