
import React, { useState, useMemo } from 'react';
import { Button } from '../components/ui/Button';
import { Plus, Search, Layers, Calendar, X, Image as ImageIcon } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Loader } from '../components/ui/Loader';

export default function Products() {
  const { products, settings, loading } = useData();
  const currency = settings?.currency || 'د.ج';
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
        const matchesDate = !dateFilter || new Date(p.createdAt).toISOString().slice(0, 10) === dateFilter;
        const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
        return matchesDate && matchesSearch;
    });
  }, [products, search, dateFilter]);

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50">
      <div className="flex flex-col xl:flex-row justify-between items-start gap-4 mb-6">
          <div><h1 className="text-3xl font-bold">إدارة المخزون</h1><p className="text-gray-500">المنتجات والتصنيفات</p></div>
          <div className="flex flex-wrap gap-3 w-full xl:w-auto">
              <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border shadow-sm"><Calendar size={18} className="text-gray-400"/><input type="date" className="bg-transparent outline-none text-sm num-l" value={dateFilter} onChange={e=>setDateFilter(e.target.value)}/>{dateFilter && <button onClick={()=>setDateFilter('')}><X size={14} className="text-gray-400 hover:text-red-500"/></button>}</div>
              <div className="relative flex-1 md:w-64"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="بحث..." className="w-full pr-10 pl-4 py-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={search} onChange={e => setSearch(e.target.value)} /></div>
              <Button variant="secondary" className="gap-2 bg-white"><Layers size={20} /> التصنيفات</Button>
              <Button className="gap-2 shadow-lg"><Plus size={20} /> منتج جديد</Button>
          </div>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right">
                <thead className="bg-gray-50 border-b sticky top-0 z-10">
                    <tr>
                        <th className="p-4 text-xs uppercase text-gray-500">المنتج</th>
                        <th className="p-4 text-xs uppercase text-gray-500">تاريخ الإضافة</th>
                        <th className="p-4 text-xs uppercase text-gray-500">سعر البيع</th>
                        <th className="p-4 text-xs uppercase text-gray-500 text-center w-48">المخزون</th>
                        <th className="p-4"></th>
                    </tr>
                </thead>
                <tbody>
                    {loading.products ? (
                        <tr><td colSpan={5} className="h-96"><Loader /></td></tr>
                    ) : filtered.length > 0 ? (
                        filtered.map(p => (
                            <tr key={p.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-medium flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                        {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover rounded-lg" /> : <ImageIcon className="text-gray-400" />}
                                    </div>
                                    {p.name}
                                </td>
                                <td className="p-4 text-gray-600 num-l">{new Date(p.createdAt).toLocaleDateString('ar-DZ')}</td>
                                <td className="p-4 text-gray-800 font-bold num-l">{p.price.toLocaleString()} <span className="text-xs text-gray-400">{currency}</span></td>
                                <td className="p-4 text-center num-l">
                                    <span className={`px-3 py-1 rounded-full font-medium text-sm ${p.stock > 10 ? 'bg-emerald-100 text-emerald-800' : p.stock > 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>{p.stock}</span>
                                </td>
                                <td className="p-4"><Button size="sm" variant="ghost">تعديل</Button></td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="text-center py-20 text-gray-400">
                                لا توجد منتجات لعرضها.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
      </div>
    </div>
  );
}
