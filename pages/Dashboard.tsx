
import React, { useMemo, useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, TrendingUp, Wallet, AlertOctagon, Calendar, Filter, ArrowUpRight, ArrowDownLeft, ShoppingCart } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Loader } from '../components/ui/Loader';

function MetricCard({ title, value, currency, icon: Icon, color, bg, isCurrency = true }: any) { return (<div className="bg-white p-6 rounded-3xl shadow-sm border flex flex-col transition-transform hover:scale-[1.02]"><div className="flex items-center gap-3 text-gray-600 mb-4 font-bold"><div className={`p-3 rounded-2xl ${bg} ${color}`}><Icon size={20} /></div>{title}</div><div className={`text-4xl font-black num-l ${color}`}>{value.toLocaleString()}{isCurrency && <span className="text-base font-medium text-gray-400 ml-2">{currency}</span>}</div></div>); }
function MiniStatCard({ title, value, icon: Icon, color, bg, currency, className='' }: any) { return (<div className={`${bg} p-5 rounded-3xl border border-transparent transition-colors hover:border-${color.split('-')[1]}-200 ${className}`}><div className={`${color} text-sm font-bold mb-2 flex items-center gap-2 opacity-80`}><Icon size={16}/> {title}</div><div className={`text-2xl font-black ${color} num-l tracking-tight`}>{value.toLocaleString()} <span className="text-xs font-normal opacity-70">{currency}</span></div></div>); }

export default function Dashboard() {
  const { invoices, customers, settings, loading } = useData();
  const currency = settings?.currency || 'د.ج';
  const [dateRange, setDateRange] = useState<'today' | 'month'>('month');
  
  const { stats, chartData, topProducts, debts } = useMemo(() => {
    if (!invoices || !customers) return { stats: { totalSales: 0, netProfit: 0, totalExpenses: 0, totalLosses: 0, totalReturns: 0, ordersCount: 0, avgOrder: 0 }, chartData: [], topProducts: [], debts: { c: 0, s: 0 } };

    const now = new Date();
    const filteredInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.createdAt);
        if (dateRange === 'today') return invDate.toDateString() === now.toDateString();
        if (dateRange === 'month') return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
        return true;
    });

    const salesInvoices = filteredInvoices.filter(i => i.type === 'sale');
    const totalSales = salesInvoices.reduce((acc, i) => acc + i.amount, 0);
    const netProfit = salesInvoices.reduce((acc, i) => acc + (i.netProfit || 0), 0);
    const ordersCount = salesInvoices.length;
    const avgOrder = ordersCount > 0 ? totalSales / ordersCount : 0;
    const totalExpenses = filteredInvoices.filter(i => i.type === 'expense').reduce((acc, i) => acc + i.amount, 0);

    const cDebts = customers.filter(c => c.type === 'customer').reduce((acc, c) => acc + c.debt, 0);
    const sDebts = customers.filter(c => c.type === 'supplier').reduce((acc, c) => acc + c.debt, 0);

    return {
        stats: { totalSales, netProfit, totalExpenses, totalLosses: 0, totalReturns: 0, ordersCount, avgOrder },
        chartData: [], // Chart data logic requires more complex aggregation
        topProducts: [], // Top products logic requires sales data linked to products
        debts: { c: cDebts, s: sDebts }
    };
  }, [invoices, customers, dateRange]);

  if (loading.invoices || loading.customers) {
      return <div className="p-6 h-full"><Loader /></div>;
  }

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      <header className="mb-8 flex flex-col xl:flex-row justify-between gap-4 items-start xl:items-center">
        <div><h1 className="text-3xl font-bold text-gray-900">لوحة التحكم</h1><p className="text-gray-500 mt-1">نظرة عامة على أداء المتجر</p></div>
        <div className="flex flex-wrap gap-3">
             <div className="bg-white p-1 rounded-xl border shadow-sm flex flex-wrap gap-1">
                {(['today', 'month'] as const).map(r => (<button key={r} onClick={() => setDateRange(r)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${dateRange === r ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>{r === 'today' ? 'اليوم' : 'شهر'}</button>))}
             </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MetricCard title="صافي المبيعات" value={stats.totalSales} currency={currency} icon={DollarSign} color="text-primary" bg="bg-primary/10" />
        <MetricCard title="صافي الأرباح" value={stats.netProfit} currency={currency} icon={Wallet} color={stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'} bg={stats.netProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'} />
        <MetricCard title="عدد الطلبات" value={stats.ordersCount} icon={ShoppingCart} color="text-blue-600" bg="bg-blue-100" isCurrency={false} />
        <MetricCard title="متوسط السلة" value={stats.avgOrder} currency={currency} icon={TrendingUp} color="text-violet-600" bg="bg-violet-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border flex flex-col h-[420px]">
              <div className="flex justify-between mb-6"><h3 className="font-bold text-lg">المبيعات والأرباح</h3><div className="flex gap-6 text-sm font-medium"><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary"></div> مبيعات</span><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> ربح صافي</span></div></div>
              <div className="flex-1" dir="ltr">
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <p>لا توجد بيانات كافية لعرض الرسم البياني.</p>
                </div>
              </div>
          </div>
          <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                   <MiniStatCard title="المصاريف" value={stats.totalExpenses} icon={ArrowUpRight} color="text-rose-700" bg="bg-rose-50" currency={currency} />
                   <MiniStatCard title="خسائر/تلف" value={stats.totalLosses} icon={AlertOctagon} color="text-orange-700" bg="bg-orange-50" currency={currency} />
                   <MiniStatCard title="ديون لنا" value={debts.c} icon={ArrowDownLeft} color="text-emerald-700" bg="bg-emerald-50" currency={currency} />
                   <MiniStatCard title="ديون علينا" value={debts.s} icon={ArrowUpRight} color="text-red-700" bg="bg-red-50" currency={currency} />
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border flex-1">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-amber-500"/> الأكثر مبيعاً</h3>
                  <div className="space-y-3">
                      <div className="text-center text-gray-400 py-8">لا توجد بيانات مبيعات كافية</div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}
