import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { TransactionType, Invoice, StoreSettings } from '../types';
import { Search, Filter, ArrowDownLeft, ArrowUpRight, AlertOctagon, Receipt, Undo2, X, Calendar, Eye, Printer, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { toPng } from 'html-to-image';

const CFG: Record<TransactionType, { l: string, i: React.ElementType, c: string, b: string }> = { 'sale': { l: 'مبيعات', i: Receipt, c: 'text-emerald-600', b: 'bg-emerald-100' }, 'expense': { l: 'مصروف', i: ArrowUpRight, c: 'text-rose-600', b: 'bg-rose-100' }, 'loss': { l: 'تلف', i: AlertOctagon, c: 'text-orange-600', b: 'bg-orange-100' }, 'debt_in': { l: 'قبض دين', i: ArrowDownLeft, c: 'text-blue-600', b: 'bg-blue-100' }, 'debt_out': { l: 'دفع مورد', i: ArrowUpRight, c: 'text-purple-600', b: 'bg-purple-100' }, 'return': { l: 'مرتجع', i: Undo2, c: 'text-gray-600', b: 'bg-gray-100' } };

export default function FinancialHistory() {
  const records = useLiveQuery(() => db.financial_records.orderBy('date').reverse().toArray()) || [];
  const settings = useLiveQuery(() => db.settings.toArray())?.[0];
  const currency = settings?.currency || 'د.ج';
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('');
  
  const [retId, setRetId] = useState<number | null>(null);
  const [viewInvId, setViewInvId] = useState<number | null>(null);

  const filtered = useMemo(() => {
      let data = records;
      if (typeFilter !== 'all') data = data.filter(r => r.type === typeFilter);
      if (search) data = data.filter(r => r.description.toLowerCase().includes(search.toLowerCase()) || r.id?.toString().includes(search) || (r.invoiceId && r.invoiceId.toString().includes(search)));
      if (dateFilter) data = data.filter(r => new Date(r.date).toISOString().startsWith(dateFilter));
      return data;
  }, [records, search, typeFilter, dateFilter]);

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50">
      <div className="flex flex-col xl:flex-row justify-between items-start mb-6 gap-4">
          <div><h1 className="text-3xl font-bold">سجل العمليات المالية</h1><p className="text-gray-500">كافة الحركات من مبيعات ومصاريف وديون</p></div>
          <div className="flex flex-wrap gap-3 w-full xl:w-auto">
              <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border shadow-sm"><Calendar size={18} className="text-gray-400"/><input type="date" className="bg-transparent outline-none text-sm num-l" value={dateFilter} onChange={e=>setDateFilter(e.target.value)}/>{dateFilter && <button onClick={()=>setDateFilter('')}><X size={14} className="text-gray-400 hover:text-red-500"/></button>}</div>
              <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border shadow-sm"><Filter size={18} className="text-gray-400" /><select className="bg-transparent outline-none text-sm font-medium" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}><option value="all">كافة العمليات</option><option value="sale">مبيعات</option><option value="expense">مصاريف</option><option value="debt_in">قبض من عملاء</option><option value="debt_out">دفع لموردين</option><option value="loss">خسائر وتلف</option><option value="return">مرتجعات</option></select></div>
              <div className="relative flex-1 md:w-64"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="بحث برقم الوصل، الوصف..." className="w-full pr-10 pl-4 py-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden flex-1 flex flex-col"><div className="overflow-y-auto flex-1"><table className="w-full text-right">
          <thead className="bg-gray-50 border-b sticky top-0 z-10"><tr><th className="p-4 text-xs text-gray-500 uppercase">رقم</th><th className="p-4 text-xs text-gray-500 uppercase">النوع</th><th className="p-4 text-xs text-gray-500 uppercase">التفاصيل</th><th className="p-4 text-xs text-gray-500 uppercase">التاريخ والوقت</th><th className="p-4 text-xs text-gray-500 uppercase">المبلغ</th><th className="p-4"></th></tr></thead>
          <tbody className="divide-y divide-gray-100">{filtered.map(r => { const c = CFG[r.type] || CFG.sale; const neg = ['expense', 'loss', 'debt_out', 'return'].includes(r.type); return (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-500 num-l font-mono text-sm">#{r.id}</td>
                  <td className="p-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${c.b} ${c.c}`}><c.i size={14} /> {c.l}</span></td>
                  <td className="p-4"><div className="font-medium text-gray-900">{r.description}</div>{r.note && <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Filter size={10}/> {r.note}</div>}</td>
                  <td className="p-4 text-gray-500 num-l text-sm"><div>{new Date(r.date).toLocaleDateString('en-GB')}</div><div className="text-xs opacity-70">{new Date(r.date).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false})}</div></td>
                  <td className={`p-4 font-black num-l text-base ${neg ? 'text-red-600' : 'text-emerald-600'}`}>{neg ? '-' : '+'}{(r.type === 'loss' ? (r.relatedCost || 0) : r.amount).toLocaleString()} <span className="text-xs text-gray-500 font-normal">{currency}</span></td>
                  <td className="p-4 flex justify-end gap-2">
                      {r.invoiceId && <Button variant="secondary" size="sm" onClick={() => setViewInvId(r.invoiceId!)} className="!p-2 bg-white hover:border-primary/50 text-gray-600 hover:text-primary" title="عرض الوصل"><Receipt size={16}/></Button>}
                      {r.type === 'sale' && r.invoiceId && <Button size="sm" variant="secondary" onClick={() => setRetId(r.invoiceId!)} className="text-xs px-3 py-1.5 h-auto bg-white hover:border-red-300 text-gray-600 hover:text-red-600"><Undo2 size={14} className="ml-1"/> استرجاع</Button>}
                  </td>
              </tr>
          ); })}</tbody>
      </table>{filtered.length === 0 && <div className="text-center py-20 text-gray-400">لا توجد عمليات مطابقة للبحث</div>}</div></div>
      
      {retId && <ReturnModal invoiceId={retId} onClose={() => setRetId(null)} />}
      {viewInvId && <InvoiceViewer id={viewInvId} onClose={() => setViewInvId(null)} settings={settings} />}
    </div>
  );
}

function ReturnModal({ invoiceId, onClose }: { invoiceId: number, onClose: () => void }) {
    const invoice = useLiveQuery(() => db.invoices.get(invoiceId));
    const [sel, setSel] = useState<Record<number, number>>({});
    if (!invoice) return null;
    const handleRet = async () => {
        const toRet = Object.entries(sel).filter(([_, q]) => (q as number) > 0); if (toRet.length === 0) return;
        let tot = 0, cost = 0;
        await (db as any).transaction('rw', [db.products, db.invoices, db.financial_records, db.stock_movements], async () => { for (const [pidStr, q] of toRet) { const pid = parseInt(pidStr); const i = invoice.items.find(x => x.productId === pid); if (i) { const p = await db.products.get(pid); if (p) await db.products.update(pid, { stock: p.stock + (q as number) }); await db.stock_movements.add({ productId: pid, type: 'return', quantity: (q as number), date: new Date(), invoiceId }); tot += i.price * (q as number); cost += i.cost * (q as number); } } await db.financial_records.add({ type: 'return', date: new Date(), amount: tot, relatedCost: cost, description: `مرتجع جزئي لفاتورة #${invoiceId}`, invoiceId }); }); onClose();
    };
    return (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-3xl w-full max-w-md animate-in zoom-in-95" onClick={e => e.stopPropagation()}><div className="p-5 border-b flex justify-between items-center"><h3 className="font-bold text-lg">استرجاع منتجات</h3><button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button></div><div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">{invoice.items.map(i => (<div key={i.productId} className="flex justify-between p-3 bg-gray-50 rounded-2xl border"><div><div className="font-bold">{i.productName}</div><div className="text-xs text-gray-500 mt-1">الكمية الأصلية: {i.quantity}</div></div><div className="flex items-center gap-2 bg-white border rounded-xl p-1 shadow-sm"><button onClick={() => setSel(p => ({...p, [i.productId]: Math.max(0, (p[i.productId] || 0) - 1)}))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg"><ArrowDownLeft size={16}/></button><span className="w-8 text-center font-bold num-l">{sel[i.productId] || 0}</span><button onClick={() => setSel(p => ({...p, [i.productId]: Math.min(i.quantity, (p[i.productId] || 0) + 1)}))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg"><ArrowUpRight size={16}/></button></div></div>))}</div><div className="p-5 border-t flex gap-3 bg-gray-50 rounded-b-3xl"><Button variant="secondary" className="flex-1" onClick={onClose}>إلغاء</Button><Button variant="danger" className="flex-1 shadow-red-100" onClick={handleRet} disabled={!Object.values(sel).some(q => (q as number) > 0)}>تأكيد الاسترجاع</Button></div></div></div>);
}

function InvoiceViewer({ id, onClose, settings }: any) {
    const inv = useLiveQuery(() => db.invoices.get(id));
    if (!inv) return null;
    return <UnifiedReceiptModal invoice={inv} onClose={onClose} settings={settings} />;
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
                         <div className="flex justify-between text-xs mb-1"><span>الوقت:</span><span className="num-l">{new Date(invoice.date).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span></div>
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
