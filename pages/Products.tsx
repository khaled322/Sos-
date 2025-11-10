
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Product, StockMovement } from '../types';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Plus, Search, Edit, Trash2, Image as ImageIcon, X, Minus, Layers, AlertOctagon, History, Calendar } from 'lucide-react';

export default function Products() {
  const products = useLiveQuery(() => db.products.orderBy('name').toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.toArray())?.[0];
  const currency = settings?.currency || 'د.ج';
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [lossModal, setLossModal] = useState<{ isOpen: boolean, product: Product | null }>({ isOpen: false, product: null });
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [isCatModal, setIsCatModal] = useState(false);

  const filtered = products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
      const matchDate = !dateFilter || (p.createdAt && new Date(p.createdAt).toISOString().startsWith(dateFilter));
      return matchSearch && matchDate;
  });

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault(); if (!formData.name) return;
      try {
          if (editingProduct?.id) await db.products.update(editingProduct.id, formData as any);
          else { const nid = await db.products.add({ ...formData, createdAt: new Date() } as Product); if (formData.stock && formData.stock > 0) await db.stock_movements.add({ productId: nid, type: 'initial', quantity: formData.stock, date: new Date() }); }
          setIsModalOpen(false);
      } catch (e) { alert('خطأ'); }
  };

  const handleCategoryDelete = async (catName: string, catId: number) => {
      if (!confirm(`حذف التصنيف "${catName}"؟ ستبقى المنتجات التابعة له.`)) return;
      await (db as any).transaction('rw', db.products, db.categories, async () => {
          await db.products.where('category').equals(catName).modify({ category: 'عام' });
          await db.categories.delete(catId);
      });
  };

  const handleStock = async (p: Product, newStock: number) => {
      if (!p.id || newStock === p.stock) return; const diff = newStock - p.stock;
      await (db as any).transaction('rw', [db.products, db.stock_movements], async () => { await db.products.update(p.id!, { stock: newStock }); await db.stock_movements.add({ productId: p.id!, type: diff > 0 ? 'restock' : 'edit', quantity: diff, date: new Date() }); });
  };

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50">
      <div className="flex flex-col xl:flex-row justify-between items-start gap-4 mb-6">
          <div><h1 className="text-3xl font-bold">إدارة المخزون</h1><p className="text-gray-500">المنتجات والتصنيفات</p></div>
          <div className="flex flex-wrap gap-3 w-full xl:w-auto">
              <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border shadow-sm"><Calendar size={18} className="text-gray-400"/><input type="date" className="bg-transparent outline-none text-sm num-l" value={dateFilter} onChange={e=>setDateFilter(e.target.value)}/>{dateFilter && <button onClick={()=>setDateFilter('')}><X size={14} className="text-gray-400 hover:text-red-500"/></button>}</div>
              <div className="relative flex-1 md:w-64"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="بحث..." className="w-full pr-10 pl-4 py-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={search} onChange={e => setSearch(e.target.value)} /></div>
              <Button variant="secondary" onClick={() => setIsCatModal(true)} className="gap-2 bg-white"><Layers size={20} /> التصنيفات</Button>
              <Button onClick={() => { setEditingProduct(null); setFormData({ category: categories[0]?.name || 'عام' }); setIsModalOpen(true); }} className="gap-2 shadow-lg"><Plus size={20} /> منتج جديد</Button>
          </div>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden flex-1 flex flex-col"><div className="overflow-x-auto flex-1"><table className="w-full text-right"><thead className="bg-gray-50 border-b sticky top-0 z-10"><tr><th className="p-4 text-xs uppercase text-gray-500">المنتج</th><th className="p-4 text-xs uppercase text-gray-500">تاريخ الإضافة</th><th className="p-4 text-xs uppercase text-gray-500">سعر البيع</th><th className="p-4 text-xs uppercase text-gray-500 text-center w-48">المخزون</th><th className="p-4"></th></tr></thead><tbody className="divide-y divide-gray-100">{filtered.map(p => (<tr key={p.id} className="hover:bg-gray-50 transition-colors"><td className="p-4 flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-gray-100 border flex items-center justify-center overflow-hidden shrink-0">{p.imageBase64 ? <img src={p.imageBase64} className="w-full h-full object-cover"/> : <ImageIcon size={20} className="text-gray-300 opacity-70"/>}</div><div><div className="font-bold text-gray-900">{p.name}</div><div className="text-xs text-gray-500 inline-block bg-gray-100 px-2 py-0.5 rounded mt-1">{p.category}</div></div></td><td className="p-4 text-sm text-gray-500 num-l">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '-'}</td><td className="p-4 font-black num-l text-base">{p.price.toLocaleString()} <span className="text-xs font-normal text-gray-500">{currency}</span></td><td className="p-4"><div className={`flex items-center justify-center gap-1 border rounded-xl p-1 transition-colors ${p.stock <= 5 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}><button onClick={() => handleStock(p, p.stock - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-lg"><Minus size={16}/></button><input type="number" className="w-12 text-center bg-transparent font-bold outline-none num-l" value={p.stock} onChange={(e) => handleStock(p, parseInt(e.target.value)||0)} /><button onClick={() => handleStock(p, p.stock + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-lg"><Plus size={16}/></button></div></td><td className="p-4 flex justify-end gap-1"><Button variant="secondary" size="sm" onClick={() => setHistoryId(p.id!)} className="!p-2 hover:border-blue-300 hover:text-blue-600"><History size={18}/></Button><Button variant="secondary" size="sm" onClick={() => setLossModal({ isOpen: true, product: p })} className="!p-2 text-orange-600 border-orange-100 hover:bg-orange-50 hover:border-orange-300"><AlertOctagon size={18}/></Button><Button variant="secondary" size="sm" onClick={() => { setEditingProduct(p); setFormData({...p}); setIsModalOpen(true); }} className="!p-2 hover:border-primary/50 hover:text-primary"><Edit size={18}/></Button><Button variant="danger" size="sm" onClick={() => setDeleteId(p.id!)} className="!p-2 bg-white text-red-500 border-red-100 hover:bg-red-500 hover:text-white hover:border-red-500"><Trash2 size={18}/></Button></td></tr>))}</tbody></table></div></div>
      
      {isModalOpen && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95" onClick={e => e.stopPropagation()}><div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white z-10"><h2 className="text-xl font-bold">{editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}</h2><button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button></div><form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex justify-center"><label className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-300 hover:border-primary rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors group">{formData.imageBase64 ? <img src={formData.imageBase64} className="w-full h-full object-cover" /> : <><ImageIcon className="text-gray-300 group-hover:text-primary transition-colors" size={32} /><span className="text-xs text-gray-400 mt-2">صورة المنتج</span></>}<input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setFormData(p => ({ ...p, imageBase64: r.result as string })); r.readAsDataURL(f); } }} /></label></div>
          <input required type="text" placeholder="اسم المنتج *" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" value={formData.name||''} onChange={e => setFormData({...formData, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-4"><select className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-primary/20 outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select><input type="text" placeholder="الباركود" className="w-full p-3 border rounded-xl num-l focus:ring-2 focus:ring-primary/20 outline-none" value={formData.barcode||''} onChange={e => setFormData({...formData, barcode: e.target.value})} /></div>
          <div className="grid grid-cols-3 gap-4"><div><label className="text-xs font-bold text-gray-500 mb-1 block">سعر البيع *</label><input required type="number" className="w-full p-3 border rounded-xl num-l font-bold text-lg focus:ring-2 focus:ring-primary/20 outline-none" value={formData.price||''} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)||0})} /></div><div><label className="text-xs font-bold text-gray-500 mb-1 block">التكلفة</label><input type="number" className="w-full p-3 border rounded-xl num-l focus:ring-2 focus:ring-primary/20 outline-none" value={formData.cost||''} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)||0})} /></div><div><label className="text-xs font-bold text-gray-500 mb-1 block">المخزون الأولي</label><input type="number" className="w-full p-3 border rounded-xl num-l focus:ring-2 focus:ring-primary/20 outline-none" value={formData.stock||''} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)||0})} disabled={!!editingProduct} /></div></div>
          <textarea placeholder="وصف قصير (اختياري)" className="w-full p-3 border rounded-xl h-20 resize-none focus:ring-2 focus:ring-primary/20 outline-none" value={formData.description||''} onChange={e => setFormData({...formData, description: e.target.value})} />
          <Button type="submit" size="lg" className="w-full shadow-lg">حفظ المنتج</Button>
      </form></div></div>}

      {historyId && <ProductHistoryModal productId={historyId} onClose={() => setHistoryId(null)} />}
      {lossModal.isOpen && lossModal.product && <ReportLossModal product={lossModal.product} onClose={() => setLossModal({isOpen: false, product: null})} />}
      
      {isCatModal && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsCatModal(false)}><div className="bg-white rounded-3xl w-full max-w-sm p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl">إدارة التصنيفات</h3><button onClick={()=>setIsCatModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button></div>
          <form onSubmit={async (e)=>{e.preventDefault(); const i = (document.getElementById('newCat') as HTMLInputElement); if(i.value){await db.categories.add({name:i.value}); i.value='';}}} className="flex gap-2 mb-4"><input id="newCat" type="text" placeholder="اسم تصنيف جديد..." className="flex-1 p-3 border rounded-xl outline-none focus:border-primary"/><Button type="submit" className="shrink-0"><Plus/></Button></form>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">{categories.map(c => (<div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border group hover:border-gray-300"><span className="font-medium">{c.name}</span>{c.name!=='عام' && <button onClick={() => handleCategoryDelete(c.name, c.id!)} className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>}</div>))}</div>
      </div></div>}
      
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { if(deleteId) await db.products.delete(deleteId); }} title="حذف المنتج؟" message="هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع." />
    </div>
  );
}

function ProductHistoryModal({ productId, onClose }: { productId: number, onClose: () => void }) {
    const product = useLiveQuery(() => db.products.get(productId));
    const movements = useLiveQuery(() => db.stock_movements.where('productId').equals(productId).reverse().toArray()) || [];
    const TYPES: Record<StockMovement['type'], { l: string, c: string }> = { 'sale': { l: 'مبيع', c: 'text-red-600' }, 'restock': { l: 'تزويد', c: 'text-emerald-600' }, 'loss': { l: 'تلف', c: 'text-orange-600' }, 'return': { l: 'استرجاع', c: 'text-blue-600' }, 'edit': { l: 'تعديل يدوي', c: 'text-gray-600' }, 'initial': { l: 'رصيد افتتاحي', c: 'text-gray-800' } };
    return (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}><div className="bg-white rounded-3xl w-full max-w-md h-[70vh] flex flex-col animate-in zoom-in-95" onClick={e => e.stopPropagation()}><div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-3xl"><div><h3 className="font-bold text-lg">سجل حركات المخزون</h3><p className="text-sm text-gray-500">{product?.name}</p></div><button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">{movements.map(m => { const t = TYPES[m.type]; return (<div key={m.id} className="flex justify-between items-center p-3 bg-white rounded-xl border shadow-sm"><div><div className={`font-bold text-sm ${t.c}`}>{t.l}</div><div className="text-xs text-gray-400 num-l mt-1">{new Date(m.date).toLocaleDateString('en-GB')} {new Date(m.date).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false})}</div></div><div className={`font-black text-xl num-l ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</div></div>); })}</div></div></div>
    );
}

function ReportLossModal({ product, onClose }: { product: Product, onClose: () => void }) {
    const [qty, setQty] = useState(1); const [note, setNote] = useState('');
    return (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95" onClick={e => e.stopPropagation()}><h3 className="font-bold text-xl flex items-center gap-2 text-orange-600 mb-6"><AlertOctagon/> تسجيل تلف/خسارة</h3>
        <div className="text-center mb-4"><div className="font-bold text-gray-800">{product.name}</div><div className="text-sm text-gray-500">المتوفر حالياً: <span className="num-l">{product.stock}</span></div></div>
        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center"><label className="block text-xs font-bold text-orange-700 mb-2">الكمية التالفة</label><div className="flex items-center justify-center gap-3"><button onClick={()=>setQty(Math.max(1,qty-1))} className="w-10 h-10 bg-white border rounded-xl flex items-center justify-center shadow-sm active:scale-95"><Minus/></button><input type="number" min="1" max={product.stock} className="w-16 bg-transparent font-black text-2xl text-center outline-none num-l" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} /><button onClick={()=>setQty(Math.min(product.stock,qty+1))} className="w-10 h-10 bg-white border rounded-xl flex items-center justify-center shadow-sm active:scale-95"><Plus/></button></div></div>
        <input type="text" placeholder="سبب التلف (اختياري)" className="w-full p-3 border rounded-xl" value={note} onChange={e=>setNote(e.target.value)}/>
        <div className="flex gap-3 pt-4"><Button variant="secondary" className="flex-1" onClick={onClose}>إلغاء</Button><Button className="flex-1 bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20" onClick={async () => { if (!product.id || qty <= 0) return; await (db as any).transaction('rw', [db.products, db.financial_records, db.stock_movements], async () => { await db.products.update(product.id!, { stock: product.stock - qty }); await db.stock_movements.add({ productId: product.id!, type: 'loss', quantity: -qty, date: new Date() }); await db.financial_records.add({ type: 'loss', amount: 0, relatedCost: product.cost * qty, date: new Date(), description: `تلف: ${product.name} (x${qty})${note ? ' - ' + note : ''}`, productId: product.id }); }); onClose(); }}>تأكيد</Button></div></div></div>);
}
