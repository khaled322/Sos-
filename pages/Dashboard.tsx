
import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, TrendingUp, Wallet, AlertOctagon, Calendar, Filter, ArrowUpRight, Undo2, Plus, ArrowDownLeft, Building2, User } from 'lucide-react';
import { Button } from '../components/ui/Button';

type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

function MetricCard({ title, value, currency, icon: Icon, color, bg, isCurrency = true }: any) { return (<div className="bg-white p-6 rounded-3xl shadow-sm border flex flex-col transition-transform hover:scale-[1.02]"><div className="flex items-center gap-3 text-gray-600 mb-4 font-bold"><div className={`p-3 rounded-2xl ${bg} ${color}`}><Icon size={20} /></div>{title}</div><div className={`text-4xl font-black num-l ${color}`}>{value.toLocaleString()}{isCurrency && <span className="text-base font-medium text-gray-400 ml-2">{currency}</span>}</div></div>); }
function MiniStatCard({ title, value, icon: Icon, color, bg, currency, className='' }: any) { return (<div className={`${bg} p-5 rounded-3xl border border-transparent transition-colors hover:border-${color.split('-')[1]}-200 ${className}`}><div className={`${color} text-sm font-bold mb-2 flex items-center gap-2 opacity-80`}><Icon size={16}/> {title}</div><div className={`text-2xl font-black ${color} num-l tracking-tight`}>{value.toLocaleString()} <span className="text-xs font-normal opacity-70">{currency}</span></div></div>); }

function ExpenseModal({ onClose, currency }: any) {
    const [fd, setFd] = useState({ amount: '', description: '', note: '' });
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); const amt = parseFloat(fd.amount); if (!amt) return; await db.financial_records.add({ type: 'expense', date: new Date(), amount: amt, description: fd.description || 'مصروف عام', note: fd.note }); onClose(); };
    return (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-3xl w-full max-w-sm p-6 animate-in zoom-in-95" onClick={e=>e.stopPropagation()}>
        <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-rose-700"><ArrowUpRight/> تسجيل مصروف جديد</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-sm font-bold text-gray-700 mb-1 block">المبلغ *</label><div className="relative"><input required type="number" className="w-full p-3 pl-12 border rounded-xl num-l font-black text-lg focus:ring-2 focus:ring-rose-500/20 outline-none" value={fd.amount} onChange={e=>setFd({...fd,amount:e.target.value})} autoFocus /><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{currency}</span></div></div>
            <input required type="text" placeholder="عنوان المصروف (مثال: فاتورة كهرباء)" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-rose-500/20 outline-none" value={fd.description} onChange={e=>setFd({...fd,description:e.target.value})}/>
            <textarea placeholder="ملاحظات إضافية (اختياري)" className="w-full p-3 border rounded-xl resize-none h-24 focus:ring-2 focus:ring-rose-500/20 outline-none" value={fd.note} onChange={e=>setFd({...fd,note:e.target.value})}/>
            <div className="flex gap-3 pt-2"><Button type="button" variant="secondary" className="flex-1 h-12" onClick={onClose}>إلغاء</Button><Button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-700 h-12 text-lg shadow-lg shadow-rose-600/20">تأكيد</Button></div>
        </form>
    </div></div>);
}

export default function Dashboard() {
  const settings = useLiveQuery(() => db.settings.toArray())?.[0];
  const currency = settings?.currency || 'د.ج';
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [expModal, setExpModal] = useState(false);
  const records = useLiveQuery(() => db.financial_records.toArray()) || [];
  const invoices = useLiveQuery(() => db.invoices.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const suppliers = useLiveQuery(() => db.suppliers.toArray()) || [];

  const debts = useMemo(() => ({ c: customers.reduce((s,c)=>s+c.debt,0), s: suppliers.reduce((s,v)=>s+v.debtToSupplier,0) }), [customers, suppliers]);

  const { stats, chartData, topProducts } = useMemo(() => {
      const now = new Date(); let from = new Date(); let to = new Date();
      from.setHours(0,0,0,0); to.setHours(23,59,59,999);
      if (dateRange === 'yesterday') { from.setDate(from.getDate() - 1); to.setDate(to.getDate() - 1); }
      else if (dateRange === 'week') { from.setDate(from.getDate() - 7); }
      else if (dateRange === 'month') { from.setDate(1); }
      else if (dateRange === 'custom' && customFrom && customTo) { from = new Date(customFrom); from.setHours(0,0,0,0); to = new Date(customTo); to.setHours(23,59,59,999); }

      let totalSales = 0, totalCostOfGoods = 0, totalExpenses = 0, totalLosses = 0, totalReturns = 0;
      const dailyMap = new Map<string, { date: string, sales: number, profit: number }>();

      records.forEach(r => {
          const rDate = new Date(r.date);
          if (rDate >= from && rDate <= to) {
              const dayKey = rDate.toLocaleDateString('en-GB');
              if (!dailyMap.has(dayKey)) dailyMap.set(dayKey, { date: dayKey, sales: 0, profit: 0 });
              const day = dailyMap.get(dayKey)!;
              if (r.type === 'sale') { totalSales += r.amount; totalCostOfGoods += (r.relatedCost || 0); day.sales += r.amount; day.profit += (r.amount - (r.relatedCost || 0)); }
              else if (r.type === 'return') { totalReturns += r.amount; totalSales -= r.amount; totalCostOfGoods -= (r.relatedCost || 0); day.sales -= r.amount; day.profit -= (r.amount - (r.relatedCost || 0)); }
              else if (r.type === 'expense') { totalExpenses += r.amount; day.profit -= r.amount; }
              else if (r.type === 'loss') { totalLosses += (r.relatedCost || 0); day.profit -= (r.relatedCost || 0); }
          }
      });

      let ordersCount = 0; const productSales = new Map<string, number>();
      invoices.forEach(inv => {
          const iDate = new Date(inv.date);
          if (iDate >= from && iDate <= to && inv.status === 'paid') {
              ordersCount++; inv.items.forEach(item => productSales.set(item.productName, (productSales.get(item.productName) || 0) + item.quantity));
          }
      });

      return {
          stats: { totalSales, netProfit: (totalSales - totalCostOfGoods - totalExpenses - totalLosses), totalExpenses, totalLosses, totalReturns, ordersCount, avgOrder: ordersCount ? (totalSales / ordersCount) : 0 },
          chartData: Array.from(dailyMap.values()).sort((a,b) => new Date(a.date.split('/').reverse().join('-') as any).getTime() - new Date(b.date.split('/').reverse().join('-') as any).getTime()),
          topProducts: Array.from(productSales.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }))
      };
  }, [records, invoices, dateRange, customFrom, customTo]);

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      <header className="mb-8 flex flex-col xl:flex-row justify-between gap-4 items-start xl:items-center">
        <div><h1 className="text-3xl font-bold text-gray-900">لوحة التحكم</h1><p className="text-gray-500 mt-1">نظرة عامة على أداء المتجر</p></div>
        <div className="flex flex-wrap gap-3">
             <Button variant="secondary" onClick={()=>setExpModal(true)} className="gap-2 bg-white shadow-sm hover:border-red-300 text-rose-700"><Plus size={18}/> تسجيل مصروف</Button>
             <div className="bg-white p-1 rounded-xl border shadow-sm flex flex-wrap gap-1">
                {(['today', 'yesterday', 'week', 'month'] as const).map(r => (<button key={r} onClick={() => setDateRange(r)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${dateRange === r ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>{r === 'today' ? 'اليوم' : r === 'yesterday' ? 'أمس' : r === 'week' ? 'أسبوع' : 'شهر'}</button>))}
                <button onClick={() => setDateRange('custom')} className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition-all ${dateRange === 'custom' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}><Calendar size={16}/> مخصص</button>
             </div>
             {dateRange === 'custom' && <div className="flex items-center gap-2 bg-white p-2 rounded-xl border shadow-sm"><input type="date" className="text-sm outline-none num-l bg-transparent" value={customFrom} onChange={e => setCustomFrom(e.target.value)} /><span className="text-gray-400">-</span><input type="date" className="text-sm outline-none num-l bg-transparent" value={customTo} onChange={e => setCustomTo(e.target.value)} /></div>}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MetricCard title="صافي المبيعات" value={stats.totalSales} currency={currency} icon={DollarSign} color="text-primary" bg="bg-primary/10" />
        <MetricCard title="صافي الأرباح" value={stats.netProfit} currency={currency} icon={Wallet} color={stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'} bg={stats.netProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'} />
        <MetricCard title="عدد الطلبات" value={stats.ordersCount} icon={Filter} color="text-blue-600" bg="bg-blue-100" isCurrency={false} />
        <MetricCard title="متوسط السلة" value={stats.avgOrder} currency={currency} icon={TrendingUp} color="text-violet-600" bg="bg-violet-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border flex flex-col h-[420px]">
              <div className="flex justify-between mb-6"><h3 className="font-bold text-lg">المبيعات والأرباح</h3><div className="flex gap-6 text-sm font-medium"><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary"></div> مبيعات</span><span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> ربح صافي</span></div></div>
              <div className="flex-1" dir="ltr"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{top:10,right:0,left:-20,bottom:0}} barGap={2}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:11, fill:'#94a3b8'}} dy={10}/><YAxis axisLine={false} tickLine={false} tick={{fontSize:11, fill:'#94a3b8'}}/><Tooltip cursor={{fill:'#f8fafc'}} formatter={(val:number)=>[val.toLocaleString(),'']} contentStyle={{borderRadius:'16px',border:'none',boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)',textAlign:'right',direction:'rtl',fontFamily:'inherit'}}/><Bar dataKey="sales" fill="rgb(var(--color-primary))" radius={[6,6,0,0]} maxBarSize={40}/><Bar dataKey="profit" fill="#10b981" radius={[6,6,0,0]} maxBarSize={40}/></BarChart></ResponsiveContainer></div>
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
                      {topProducts?.length > 0 ? topProducts.map((p, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                              <div className="flex items-center gap-3">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i===0?'bg-amber-100 text-amber-700':'bg-gray-200 text-gray-600'}`}>{i+1}</span>
                                  <span className="truncate max-w-[140px] font-bold text-gray-800">{p.name}</span>
                              </div>
                              <span className="font-black num-l bg-white px-3 py-1 rounded-lg text-sm shadow-sm">{p.qty}</span>
                          </div>
                      )) : <div className="text-center text-gray-400 py-8">لا توجد بيانات</div>}
                  </div>
              </div>
          </div>
      </div>
      {expModal && <ExpenseModal onClose={()=>setExpModal(false)} currency={currency}/>}
    </div>
  );
}
