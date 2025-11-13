import React, { useState, useMemo } from 'react';
import { Button } from '../components/ui/Button';
import { Plus, Search, Building2, User, Filter, Phone, MapPin } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Loader } from '../components/ui/Loader';
import { Customer } from '../types';

type ContactType = 'customer' | 'supplier';

export default function Customers() {
  const { customers, settings, loading } = useData();
  const [tab, setTab] = useState<ContactType>('customer');
  const currency = settings?.currency || 'د.ج';
  const [search, setSearch] = useState('');
  const [filterDebt, setFilterDebt] = useState(false);
  
  const filtered: Customer[] = useMemo(() => {
    if (!customers) return [];
    return customers.filter(c => {
        const matchesType = c.type === tab;
        const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search));
        const matchesDebt = !filterDebt || c.debt > 0;
        return matchesType && matchesSearch && matchesDebt;
    });
  }, [customers, tab, search, filterDebt]);

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
          <div><h1 className="text-3xl font-bold text-gray-900">دليل جهات الاتصال</h1><p className="text-gray-500">إدارة العملاء والموردين</p></div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
               <div className="flex bg-gray-200/80 p-1 rounded-xl shrink-0"><button onClick={() => setTab('customer')} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${tab === 'customer' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}><User size={18}/> العملاء</button><button onClick={() => setTab('supplier')} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${tab === 'supplier' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}><Building2 size={18}/> الموردين</button></div>
              <div className="relative flex-1 md:w-56"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="بحث..." className="w-full pr-10 pl-4 py-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={search} onChange={e => setSearch(e.target.value)} /></div>
              <Button onClick={() => setFilterDebt(!filterDebt)} variant={filterDebt ? 'primary' : 'secondary'} className={`shrink-0 gap-2 ${filterDebt ? '' : 'bg-white'}`}><Filter size={18}/> {filterDebt ? 'عليهم ديون' : 'فلتر الديون'}</Button>
              <Button className="gap-2 shrink-0 shadow-lg"><Plus size={20} /> {tab==='customer'?'عميل جديد':'مورد جديد'}</Button>
          </div>
      </div>

      {loading.customers ? <div className="flex-1"><Loader /></div> : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 overflow-y-auto flex-1 pb-6">
            {filtered.map(c => (
                <div key={c.id} className="bg-white p-5 rounded-2xl shadow-sm border flex flex-col gap-3 transition-all hover:border-primary/50 hover:shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center shrink-0"><User size={24} /></div>
                        <div>
                            <h3 className="font-bold text-gray-800">{c.name}</h3>
                            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1 num-l"><Phone size={14} /> {c.phone || 'غير متوفر'}</p>
                        </div>
                    </div>
                    {c.address && <p className="text-sm text-gray-500 flex items-center gap-1.5"><MapPin size={14} /> {c.address}</p>}
                    <div className="mt-auto pt-3 border-t flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-400">الدين الحالي</span>
                        <span className={`font-bold num-l ${c.debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{c.debt.toLocaleString()} {currency}</span>
                    </div>
                </div>
            ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-300">
            <p>لا توجد بيانات لعرضها.</p>
        </div>
      )}
    </div>
  );
}
