
import React, { useState, useMemo } from 'react';
import { Button } from '../components/ui/Button';
import { Search, ArrowUpRight, ArrowDownLeft, User, Building2 } from 'lucide-react';

export default function DebtsPage() {
    const currency = 'د.ج';
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');

    const totals = { customers: 0, suppliers: 0 };
    const filteredCustomers: any[] = [];
    const filteredSuppliers: any[] = [];
    
    return (
        <div className="h-full flex flex-col bg-gray-100 overflow-hidden">
            <div className="bg-white shadow-sm p-4 md:p-6 shrink-0 z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">إدارة الديون</h1>
                            <p className="text-gray-500">متابعة المستحقات والالتزامات المالية</p>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input type="text" placeholder="بحث باسم أو هاتف..." className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-6">
                        <div className="bg-emerald-50 rounded-2xl p-4 md:p-5 border border-emerald-100 flex flex-col">
                            <div className="flex items-center gap-2 text-emerald-800 font-bold mb-2">
                                <div className="p-2 bg-emerald-100 rounded-lg"><ArrowDownLeft size={20} /></div>
                                <span>لنا (عند العملاء)</span>
                            </div>
                            <div className="text-2xl md:text-4xl font-black text-emerald-700 num-l mt-auto">
                                {totals.customers.toLocaleString()} <span className="text-sm md:text-lg font-medium text-emerald-600/70">{currency}</span>
                            </div>
                        </div>
                        <div className="bg-rose-50 rounded-2xl p-4 md:p-5 border border-rose-100 flex flex-col">
                            <div className="flex items-center gap-2 text-rose-800 font-bold mb-2">
                                <div className="p-2 bg-rose-100 rounded-lg"><ArrowUpRight size={20} /></div>
                                <span>علينا (للموردين)</span>
                            </div>
                            <div className="text-2xl md:text-4xl font-black text-rose-700 num-l mt-auto">
                                {totals.suppliers.toLocaleString()} <span className="text-sm md:text-lg font-medium text-rose-600/70">{currency}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex md:hidden bg-white border-b shrink-0 sticky top-0 z-20">
                <button onClick={() => setActiveTab('customers')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'customers' ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-gray-500'}`}>
                    <User size={18} /> ديون العملاء
                </button>
                <button onClick={() => setActiveTab('suppliers')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'suppliers' ? 'border-rose-500 text-rose-700 bg-rose-50/50' : 'border-transparent text-gray-500'}`}>
                    <Building2 size={18} /> ديون الموردين
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-7xl mx-auto h-full">
                    <div className="flex flex-col md:flex-row gap-6 h-full">
                        <div className={`flex-1 flex flex-col bg-white rounded-3xl shadow-sm border overflow-hidden ${activeTab === 'customers' ? 'flex' : 'hidden md:flex'}`}>
                            <div className="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
                                <h2 className="font-bold flex items-center gap-2 text-gray-800"><User className="text-emerald-600" /> قائمة العملاء المدينين</h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50 flex items-center justify-center text-gray-300">
                                <p>لا توجد ديون لعرضها.</p>
                            </div>
                        </div>
                        <div className={`flex-1 flex flex-col bg-white rounded-3xl shadow-sm border overflow-hidden ${activeTab === 'suppliers' ? 'flex' : 'hidden md:flex'}`}>
                            <div className="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
                                <h2 className="font-bold flex items-center gap-2 text-gray-800"><Building2 className="text-rose-600" /> قائمة الموردين الدائنين</h2>
                            </div>
                             <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50 flex items-center justify-center text-gray-300">
                                <p>لا توجد ديون لعرضها.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}