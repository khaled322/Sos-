
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Button } from '../components/ui/Button';
import { Search, ArrowUpRight, ArrowDownLeft, User, Building2, AlertTriangle, Calendar, FileText, X, Check, Loader2, Filter, CalendarClock } from 'lucide-react';
import { Customer, Supplier } from '../types';

// --- Safe Helper Functions (CRITICAL for preventing crashes) ---
const safeDate = (date: any): Date | undefined => {
    if (!date) return undefined;
    const d = new Date(date);
    return isNaN(d.getTime()) ? undefined : d;
};

const isOverdue = (dateStr?: any) => {
    const date = safeDate(dateStr);
    if (!date) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date <= today;
};

const formatDate = (dateStr?: any) => {
    const date = safeDate(dateStr);
    return date ? date.toLocaleDateString('en-GB') : 'غير محدد';
};

const safeIsoDate = (dateStr?: any): string => {
    const date = safeDate(dateStr);
    return date ? date.toISOString().split('T')[0] : '';
};

// --- Main Component ---
export default function DebtsPage() {
    const settings = useLiveQuery(() => db.settings.toArray())?.[0];
    const currency = settings?.currency || 'د.ج';
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');

    // Use toArray() then filter in JS. This is slower but 100% safe even if DB indexing fails.
    // It's a radical failsafe.
    const allCustomers = useLiveQuery(() => db.customers.toArray()) || [];
    const allSuppliers = useLiveQuery(() => db.suppliers.toArray()) || [];

    const customersWithDebt = useMemo(() => allCustomers.filter(c => (c.debt || 0) > 0), [allCustomers]);
    const suppliersWithDebt = useMemo(() => allSuppliers.filter(s => (s.debtToSupplier || 0) > 0), [allSuppliers]);

    // Calculate totals safely
    const totals = useMemo(() => ({
        customers: customersWithDebt.reduce((sum, c) => sum + (c.debt || 0), 0),
        suppliers: suppliersWithDebt.reduce((sum, s) => sum + (s.debtToSupplier || 0), 0)
    }), [customersWithDebt, suppliersWithDebt]);

    // Filter data for search
    const filteredCustomers = useMemo(() => customersWithDebt.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)), [customersWithDebt, search]);
    const filteredSuppliers = useMemo(() => suppliersWithDebt.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search)), [suppliersWithDebt, search]);

    // Modal States
    const [settleModal, setSettleModal] = useState<{ isOpen: boolean, type: 'customer' | 'supplier', contact: Customer | Supplier | null }>({ isOpen: false, type: 'customer', contact: null });
    const [extendModal, setExtendModal] = useState<{ isOpen: boolean, type: 'customer' | 'supplier', contact: Customer | Supplier | null }>({ isOpen: false, type: 'customer', contact: null });

    return (
        <div className="h-full flex flex-col bg-gray-100 overflow-hidden">
            {/* Header Section */}
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

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-3 md:gap-6">
                        <div className="bg-emerald-50 rounded-2xl p-4 md:p-5 border border-emerald-100 flex flex-col">
                            <div className="flex items-center gap-2 text-emerald-800 font-bold mb-2">
                                <div className="p-2 bg-emerald-100 rounded-lg"><ArrowDownLeft size={20} /></div>
                                <span>لنا (عند العملاء)</span>
                            </div>
                            <div className="text-2xl md:text-4xl font-black text-emerald-700 num-l mt-auto">
                                {totals.customers.toLocaleString()} <span className="text-sm md:text-lg font-medium text-emerald-600/70">{currency}</span>
                            </div>
                            <div className="text-xs md:text-sm text-emerald-600 mt-1">{customersWithDebt.length} عميل مدين</div>
                        </div>
                        <div className="bg-rose-50 rounded-2xl p-4 md:p-5 border border-rose-100 flex flex-col">
                            <div className="flex items-center gap-2 text-rose-800 font-bold mb-2">
                                <div className="p-2 bg-rose-100 rounded-lg"><ArrowUpRight size={20} /></div>
                                <span>علينا (للموردين)</span>
                            </div>
                            <div className="text-2xl md:text-4xl font-black text-rose-700 num-l mt-auto">
                                {totals.suppliers.toLocaleString()} <span className="text-sm md:text-lg font-medium text-rose-600/70">{currency}</span>
                            </div>
                            <div className="text-xs md:text-sm text-rose-600 mt-1">{suppliersWithDebt.length} مورد دائن</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Tabs */}
            <div className="flex md:hidden bg-white border-b shrink-0 sticky top-0 z-20">
                <button onClick={() => setActiveTab('customers')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'customers' ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-gray-500'}`}>
                    <User size={18} /> ديون العملاء ({customersWithDebt.length})
                </button>
                <button onClick={() => setActiveTab('suppliers')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'suppliers' ? 'border-rose-500 text-rose-700 bg-rose-50/50' : 'border-transparent text-gray-500'}`}>
                    <Building2 size={18} /> ديون الموردين ({suppliersWithDebt.length})
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-7xl mx-auto h-full">
                    <div className="flex flex-col md:flex-row gap-6 h-full">
                        {/* Customers Column */}
                        <div className={`flex-1 flex flex-col bg-white rounded-3xl shadow-sm border overflow-hidden ${activeTab === 'customers' ? 'flex' : 'hidden md:flex'}`}>
                            <div className="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
                                <h2 className="font-bold flex items-center gap-2 text-gray-800"><User className="text-emerald-600" /> قائمة العملاء المدينين</h2>
                                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full num-l">{filteredCustomers.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50">
                                {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                                    <DebtCard
                                        key={c.id}
                                        contact={c}
                                        type="customer"
                                        currency={currency}
                                        onSettle={() => setSettleModal({ isOpen: true, type: 'customer', contact: c })}
                                        onExtend={() => setExtendModal({ isOpen: true, type: 'customer', contact: c })}
                                    />
                                )) : <EmptyState message="لا توجد ديون عملاء مطابقة" />}
                            </div>
                        </div>

                        {/* Suppliers Column */}
                        <div className={`flex-1 flex flex-col bg-white rounded-3xl shadow-sm border overflow-hidden ${activeTab === 'suppliers' ? 'flex' : 'hidden md:flex'}`}>
                            <div className="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
                                <h2 className="font-bold flex items-center gap-2 text-gray-800"><Building2 className="text-rose-600" /> قائمة الموردين الدائنين</h2>
                                <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-full num-l">{filteredSuppliers.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50">
                                {filteredSuppliers.length > 0 ? filteredSuppliers.map(s => (
                                    <DebtCard
                                        key={s.id}
                                        contact={s}
                                        type="supplier"
                                        currency={currency}
                                        onSettle={() => setSettleModal({ isOpen: true, type: 'supplier', contact: s })}
                                        onExtend={() => setExtendModal({ isOpen: true, type: 'supplier', contact: s })}
                                    />
                                )) : <EmptyState message="لا توجد ديون موردين مطابقة" />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {settleModal.isOpen && settleModal.contact && (
                <SettleDebtModal
                    isOpen={settleModal.isOpen}
                    onClose={() => setSettleModal({ ...settleModal, isOpen: false })}
                    contact={settleModal.contact}
                    type={settleModal.type}
                    currency={currency}
                />
            )}
            {extendModal.isOpen && extendModal.contact && (
                <ExtendDueDateModal
                    isOpen={extendModal.isOpen}
                    onClose={() => setExtendModal({ ...extendModal, isOpen: false })}
                    contact={extendModal.contact}
                    type={extendModal.type}
                />
            )}
        </div>
    );
}

// --- Components ---
interface DebtCardProps { contact: any; type: 'customer' | 'supplier'; currency: string; onSettle: () => void; onExtend: () => void; }
const DebtCard: React.FC<DebtCardProps> = ({ contact, type, currency, onSettle, onExtend }) => {
    const isCust = type === 'customer';
    const debt = isCust ? (contact.debt || 0) : (contact.debtToSupplier || 0);
    const overdue = isOverdue(contact.nextPaymentDate);

    return (
        <div className={`p-4 rounded-2xl border-2 transition-all group shadow-sm ${overdue ? 'bg-red-50 border-red-200' : 'bg-white border-transparent hover:border-gray-200'}`}>
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{contact.name}</h3>
                    {contact.phone && <div className="text-sm text-gray-500 num-l flex items-center gap-1 mt-0.5 opacity-70"><User size={12} /> {contact.phone}</div>}
                </div>
                <div className={`text-2xl font-black num-l shrink-0 ${isCust ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {debt.toLocaleString()} <span className="text-xs font-bold text-gray-400">{currency}</span>
                </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-dashed border-gray-100">
                <div className={`text-sm font-medium flex items-center gap-1.5 ${overdue ? 'text-red-700 bg-red-100/50 px-2 py-1 rounded-lg' : 'text-gray-400'}`}>
                    {overdue ? <AlertTriangle size={14} /> : <CalendarClock size={14} />}
                    {overdue ? 'متأخر! موعد السداد:' : 'موعد السداد:'} <span className="num-l font-bold">{formatDate(contact.nextPaymentDate)}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="secondary" size="sm" onClick={onExtend} className="!px-3 bg-white hover:bg-gray-50" title="تمديد الأجل"><Calendar size={16} /></Button>
                    <Button size="sm" onClick={onSettle} className={`font-bold shadow-sm ${isCust ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}>
                        {isCust ? 'استلام' : 'دفع'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
    <div className="h-full flex flex-col items-center justify-center text-gray-300 py-12">
        <Filter size={48} className="mb-4 opacity-20" />
        <p className="font-medium">{message}</p>
    </div>
);

// --- Settle Debt Modal ---
function SettleDebtModal({ isOpen, onClose, contact, type, currency }: { isOpen: boolean, onClose: () => void, contact: any, type: 'customer' | 'supplier', currency: string }) {
    const isCust = type === 'customer';
    const currentDebt = isCust ? (contact.debt || 0) : (contact.debtToSupplier || 0);
    const [amount, setAmount] = useState<string>(currentDebt.toString());
    const [nextDate, setNextDate] = useState<string>(safeIsoDate(contact.nextPaymentDate));
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const payAmount = parseFloat(amount) || 0;
    const remaining = Math.max(0, currentDebt - payAmount);

    const handleConfirm = async () => {
        if (payAmount <= 0) { setError('يرجى إدخال مبلغ أكبر من 0'); return; }
        if (payAmount > currentDebt) { setError('المبلغ المدخل أكبر من الدين الحالي'); return; }
        setLoading(true); setError('');

        try {
            await (db as any).transaction('rw', [db.customers, db.suppliers, db.financial_records], async () => {
                const freshContact = isCust ? await db.customers.get(contact.id) : await db.suppliers.get(contact.id);
                if (!freshContact) throw new Error('جهة الاتصال لم تعد موجودة');
                
                const freshDebt = isCust ? (freshContact.debt || 0) : (freshContact.debtToSupplier || 0);
                 if (payAmount > freshDebt) throw new Error('قيمة الدين تغيرت، يرجى إعادة المحاولة');

                const newDebt = Math.max(0, freshDebt - payAmount);
                const nextPayment = (newDebt > 0 && nextDate) ? new Date(nextDate) : (newDebt === 0 ? undefined : freshContact.nextPaymentDate);
                const desc = note ? `${isCust ? 'قبض دين' : 'دفع لمورد'}: ${freshContact.name} - ${note}` : `${isCust ? 'قبض دين' : 'دفع لمورد'}: ${freshContact.name}`;

                if (isCust) {
                    await db.customers.update(contact.id, { debt: newDebt, nextPaymentDate: nextPayment });
                    await db.financial_records.add({ type: 'debt_in', date: new Date(), amount: payAmount, description: desc, note: note || undefined, customerId: contact.id });
                } else {
                    await db.suppliers.update(contact.id, { debtToSupplier: newDebt, nextPaymentDate: nextPayment });
                    await db.financial_records.add({ type: 'debt_out', date: new Date(), amount: payAmount, description: desc, note: note || undefined, supplierId: contact.id });
                }
            });
            onClose();
        } catch (e: any) {
            // SAFELY handle errors to avoid [object Object]
            let errorMsg = 'حدث خطأ غير متوقع';
            if (typeof e === 'string') errorMsg = e;
            else if (e instanceof Error) errorMsg = e.message;
            console.error("Settlement error:", e);
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className={`p-5 text-white flex justify-between items-center ${isCust ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    <h3 className="text-xl font-bold flex items-center gap-2">{isCust ? <ArrowDownLeft /> : <ArrowUpRight />}{isCust ? 'استلام دفعة' : 'تسديد دفعة'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-5">
                    <div className="text-center">
                        <h4 className="text-gray-500 font-medium mb-1">{contact.name}</h4>
                        <div className="text-3xl font-black num-l">{currentDebt.toLocaleString()} <span className="text-sm text-gray-400 font-normal">{currency}</span></div>
                    </div>
                    {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold flex items-center gap-2"><AlertTriangle size={16} className="shrink-0"/>{error}</div>}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">المبلغ</label>
                        <div className="relative"><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={`w-full p-4 text-2xl font-black text-center border-2 rounded-2xl outline-none num-l focus:ring-4 ${isCust ? 'focus:border-emerald-500 focus:ring-emerald-500/20' : 'focus:border-rose-500 focus:ring-rose-500/20'}`} autoFocus min={0} max={currentDebt} /><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{currency}</span></div>
                    </div>
                    {remaining > 0 && <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100"><div className="flex justify-between items-center mb-3"><span className="text-amber-800 font-bold flex items-center gap-1"><AlertTriangle size={16}/> المتبقي:</span><span className="text-xl font-black text-amber-700 num-l">{remaining.toLocaleString()} <span className="text-xs">{currency}</span></span></div><label className="block text-xs font-bold text-amber-700 mb-1">موعد سداد المتبقي (اختياري)</label><input type="date" className="w-full p-2.5 bg-white border border-amber-200 rounded-xl num-l outline-none" value={nextDate} onChange={e => setNextDate(e.target.value)} /></div>}
                    <div><label className="flex items-center gap-1 text-sm font-bold text-gray-600 mb-1.5"><FileText size={16}/> ملاحظة</label><input type="text" className="w-full p-3 border rounded-xl outline-none focus:border-primary" value={note} onChange={e => setNote(e.target.value)} /></div>
                    <Button onClick={handleConfirm} disabled={loading || payAmount <= 0 || payAmount > currentDebt} className={`w-full h-12 text-lg font-bold shadow-lg ${isCust ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>{loading ? <Loader2 className="animate-spin"/> : <><Check className="mr-2"/> تأكيد</>}</Button>
                </div>
            </div>
        </div>
    );
}

function ExtendDueDateModal({ isOpen, onClose, contact, type }: { isOpen: boolean, onClose: () => void, contact: any, type: 'customer' | 'supplier' }) {
    const [date, setDate] = useState(safeIsoDate(contact.nextPaymentDate));
    const [loading, setLoading] = useState(false);
    const handleSave = async () => {
        setLoading(true);
        try {
            const table = type === 'customer' ? db.customers : db.suppliers;
            await table.update(contact.id, { nextPaymentDate: date ? new Date(date) : undefined });
            onClose();
        } catch (e) { alert('فشل الحفظ'); } finally { setLoading(false); }
    };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-6"><div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><CalendarClock size={32}/></div><h3 className="text-xl font-bold">تغيير موعد السداد</h3><p className="text-gray-500 mt-1">{contact.name}</p></div>
                <div className="mb-6"><label className="block text-sm font-bold text-gray-700 mb-2">الموعد الجديد</label><input type="date" className="w-full p-4 border-2 border-blue-100 rounded-2xl text-lg font-bold text-center num-l focus:border-blue-500 outline-none" value={date} onChange={e => setDate(e.target.value)} /></div>
                <div className="flex gap-3"><Button variant="secondary" className="flex-1 h-12" onClick={onClose} disabled={loading}>إلغاء</Button><Button className="flex-1 h-12 bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : 'حفظ'}</Button></div>
            </div>
        </div>
    );
}
