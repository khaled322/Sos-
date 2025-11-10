
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Bell, CalendarClock, CheckCircle2, PackageX } from 'lucide-react';

export const NotificationsPopover = () => {
    const [isOpen, setIsOpen] = useState(false);

    // Robust queries with error handling to prevent "Uncaught [object Object]"
    const lowStockProducts = useLiveQuery(() => db.products.where('stock').belowOrEqual(5).toArray(), [], []);

    const overdueCustomers = useLiveQuery(async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            // Use toArray first then filter in JS to avoid complex async IndexedDB queries that might fail
            const allCustomers = await db.customers.toArray();
            return allCustomers.filter(c => {
                if (c.debt <= 0 || !c.nextPaymentDate) return false;
                const d = new Date(c.nextPaymentDate);
                d.setHours(0,0,0,0);
                return !isNaN(d.getTime()) && d <= today;
            });
        } catch (e) {
            console.error("Error fetching overdue customers:", e);
            return [];
        }
    }, [], []);

    const overdueSuppliers = useLiveQuery(async () => {
        try {
             const today = new Date();
             today.setHours(0, 0, 0, 0);
             const allSuppliers = await db.suppliers.toArray();
             return allSuppliers.filter(s => {
                 if (s.debtToSupplier <= 0 || !s.nextPaymentDate) return false;
                 const d = new Date(s.nextPaymentDate);
                 d.setHours(0,0,0,0);
                 return !isNaN(d.getTime()) && d <= today;
             });
        } catch (e) {
            console.error("Error fetching overdue suppliers:", e);
            return [];
        }
    }, [], []);

    const notifications = useMemo(() => {
        const list = [];
        (lowStockProducts || []).forEach(p => {
            list.push({
                id: `stock-${p.id}`,
                type: 'stock',
                title: 'تنبيه مخزون',
                message: `المنتج "${p.name}" شارف على النفاذ (المتبقي: ${p.stock})`,
                icon: PackageX,
                color: 'text-orange-500 bg-orange-50'
            });
        });
        (overdueCustomers || []).forEach(c => {
             list.push({
                id: `debt-cust-${c.id}`,
                type: 'debt',
                title: 'استحقاق دين عميل',
                message: `حان موعد سداد العميل "${c.name}" لمبلغ ${c.debt}`,
                icon: CalendarClock,
                color: 'text-red-500 bg-red-50'
            });
        });
        (overdueSuppliers || []).forEach(s => {
            list.push({
               id: `debt-supp-${s.id}`,
               type: 'debt',
               title: 'استحقاق دفع لمورد',
               message: `حان موعد الدفع للمورد "${s.name}" بمبلغ ${s.debtToSupplier}`,
               icon: CalendarClock,
               color: 'text-red-500 bg-red-50'
           });
       });
        return list;
    }, [lowStockProducts, overdueCustomers, overdueSuppliers]);

    const unreadCount = notifications.length;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-xl transition-all ${isOpen ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 hover:text-primary'}`}
                title="الإشعارات"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-[1.5px] border-white num-l pointer-events-none">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    {/* Adjusted positioning for being on the right side now (RTL start) */}
                    <div className="absolute right-0 sm:right-auto sm:left-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in slide-in-from-top-2 origin-top-right sm:origin-top-left">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-gray-800">الإشعارات</h3>
                            {unreadCount > 0 && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full num-l font-medium">{unreadCount} جديد</span>}
                        </div>
                        <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                            {notifications.length > 0 ? (
                                <div className="divide-y divide-gray-50">
                                    {notifications.map(notif => (
                                        <div key={notif.id} className="p-4 hover:bg-gray-50 flex gap-3 transition-colors">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.color}`}>
                                                <notif.icon size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-gray-900">{notif.title}</h4>
                                                <p className="text-sm text-gray-500 mt-0.5 leading-snug num-l">{notif.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                                    <CheckCircle2 size={40} className="mb-3 opacity-20" />
                                    <p className="text-sm font-medium">لا توجد إشعارات جديدة</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
