import React, { useState, useMemo } from 'react';
import { Search, Filter, Receipt, X, Calendar } from 'lucide-react';

export default function FinancialHistory() {
  const currency = 'د.ج';
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  
  const filtered: any[] = [];

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50">
      <div className="flex flex-col xl:flex-row justify-between items-start mb-6 gap-4">
          <div><h1 className="text-3xl font-bold">سجل العمليات المالية</h1><p className="text-gray-500">كافة الحركات من مبيعات ومصاريف وديون</p></div>
          <div className="flex flex-wrap gap-3 w-full xl:w-auto">
              <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border shadow-sm"><Calendar size={18} className="text-gray-400"/><input type="date" className="bg-transparent outline-none text-sm num-l" value={dateFilter} onChange={e=>setDateFilter(e.target.value)}/>{dateFilter && <button onClick={()=>setDateFilter('')}><X size={14} className="text-gray-400 hover:text-red-500"/></button>}</div>
              <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border shadow-sm"><Filter size={18} className="text-gray-400" /><select className="bg-transparent outline-none text-sm font-medium" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}><option value="all">كافة العمليات</option></select></div>
              <div className="relative flex-1 md:w-64"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="بحث برقم الوصل، الوصف..." className="w-full pr-10 pl-4 py-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden flex-1 flex flex-col"><div className="overflow-y-auto flex-1"><table className="w-full text-right">
          <thead className="bg-gray-50 border-b sticky top-0 z-10"><tr><th className="p-4 text-xs text-gray-500 uppercase">رقم</th><th className="p-4 text-xs text-gray-500 uppercase">النوع</th><th className="p-4 text-xs text-gray-500 uppercase">التفاصيل</th><th className="p-4 text-xs text-gray-500 uppercase">التاريخ والوقت</th><th className="p-4 text-xs text-gray-500 uppercase">المبلغ</th><th className="p-4"></th></tr></thead>
          <tbody>
            <tr>
                <td colSpan={6} className="text-center py-20 text-gray-400">
                    لا توجد عمليات لعرضها.
                </td>
            </tr>
          </tbody>
      </table></div></div>
    </div>
  );
}