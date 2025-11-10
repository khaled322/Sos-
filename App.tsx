import React, { PropsWithChildren, useEffect, useState, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Store, ShoppingCart, Users, Settings, ReceiptText, WalletCards, Monitor, Bell, RefreshCw, AlertTriangle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import SettingsPage from './pages/Settings';
import Debts from './pages/Debts';
import NotificationsPage from './pages/Notifications';
import { pullFromCloud } from './sheets';
import { setupSyncHooks, detachSyncHooks } from './sync';

interface NavItemProps { icon: React.ElementType, label: string, to: string, active: boolean }
const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, to, active }) => (
  <Link to={to} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${active ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-primary'}`}>
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    <span className="font-medium text-sm hidden md:inline-block">{label}</span>
  </Link>
);

const THEMES: Record<string, { primary: string, dark: string }> = {
    indigo: { primary: '79 70 229', dark: '67 56 202' },
    emerald: { primary: '16 185 129', dark: '5 150 105' },
    rose: { primary: '225 29 72', dark: '190 18 60' },
    amber: { primary: '217 119 6', dark: '180 83 9' },
    violet: { primary: '124 58 237', dark: '109 40 217' },
    sky: { primary: '14 165 233', dark: '3 105 161' },
};

// Hook to generate notifications periodically
const useNotificationGenerator = () => {
    useEffect(() => {
        const check = async () => {
            try {
                // Stock Checks
                const lowStock = await db.products.where('stock').belowOrEqual(5).toArray();
                for (const p of lowStock) {
                     const exists = await db.notifications.where({ type: 'stock', referenceId: p.id }).first();
                     if (!exists || exists.read) {
                         // Notify again if 24h passed since last read notification for this product
                         if (!exists || (exists.read && new Date().getTime() - new Date(exists.date).getTime() > 86400000)) {
                             await db.notifications.add({ type: 'stock', title: 'تنبيه مخزون', message: `المنتج "${p.name}" شارف على النفاذ (${p.stock})`, date: new Date(), read: false, link: `/products?search=${encodeURIComponent(p.name)}`, referenceId: p.id });
                         }
                     }
                }

                // Debt Checks
                const today = new Date(); today.setHours(0,0,0,0);
                const customers = await db.customers.filter(c => c.debt > 0 && !!c.nextPaymentDate).toArray();
                for (const c of customers) {
                    if (!c.nextPaymentDate) continue;
                    const due = new Date(c.nextPaymentDate); due.setHours(0,0,0,0);
                    const diff = Math.floor((today.getTime() - due.getTime()) / (86400000));
                    
                    let msg = '';
                    if (diff === -1) msg = `موعد سداد العميل "${c.name}" غداً.`;
                    else if (diff === 0) msg = `اليوم موعد سداد العميل "${c.name}".`;
                    else if (diff > 0 && (diff === 1 || diff % 7 === 0)) msg = `تأخر العميل "${c.name}" ${diff} يوم عن السداد!`;

                    if (msg) {
                         const recent = await db.notifications.where({ type: 'debt_customer', referenceId: c.id }).filter(n => new Date(n.date).toDateString() === new Date().toDateString()).first();
                         if (!recent) await db.notifications.add({ type: 'debt_customer', title: 'استحقاق دين', message: msg, date: new Date(), read: false, link: `/debts`, referenceId: c.id });
                    }
                }
            } catch (e) { console.error("Notification check failed:", e); }
        };
        
        check(); // Run immediately
        const i = setInterval(check, 5000); // Run every 5 seconds for near-instant alerts
        return () => clearInterval(i);
    }, []);
};

const Layout = ({ children }: PropsWithChildren<{}>) => {
  const location = useLocation(); const path = location.pathname;
  const settings = useLiveQuery(() => db.settings.toArray())?.[0];
  const unreadCount = useLiveQuery(() => db.notifications.where('read').equals(0).count()) || 0;
  useNotificationGenerator();

  useEffect(() => {
      const t = settings?.themeColor && THEMES[settings.themeColor] ? THEMES[settings.themeColor] : THEMES['indigo'];
      document.documentElement.style.setProperty('--color-primary', t.primary);
      document.documentElement.style.setProperty('--color-primary-dark', t.dark);
  }, [settings?.themeColor]);

  return (
    <div className="flex flex-col h-full w-full bg-gray-100">
      <header className="bg-white shadow-sm z-10 flex-shrink-0 relative print:hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-between h-16 gap-2 md:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <Link to="/" className="w-10 h-10 bg-primary hover:bg-primary-dark transition-colors rounded-xl flex items-center justify-center shrink-0 shadow-sm active:scale-95"><Store className="text-white" size={20} /></Link>
                <Link to="/notifications" className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${path === '/notifications' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 hover:text-primary'}`}>
                    <Bell size={20} />
                    {unreadCount > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>}
                </Link>
                <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>
                <h1 className="text-lg font-bold text-gray-800 hidden sm:block truncate max-w-[150px] lg:max-w-xs">{settings?.storeName || 'OmniPOS'}</h1>
            </div>
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide mask-inline-fade flex-1 justify-end pl-1">
              <NavItem icon={Monitor} label="نقطة البيع" to="/pos" active={path === '/pos'} />
              <NavItem icon={ShoppingCart} label="المنتجات" to="/products" active={path === '/products'} />
              <NavItem icon={ReceiptText} label="السجل المالي" to="/invoices" active={path === '/invoices'} />
              <NavItem icon={Users} label="العملاء" to="/customers" active={path === '/customers'} />
              <NavItem icon={WalletCards} label="الديون" to="/debts" active={path === '/debts'} />
              <NavItem icon={Settings} label="الإعدادات" to="/settings" active={path === '/settings'} />
            </nav>
        </div>
      </header>
      <main className="flex-1 overflow-hidden relative">{children}</main>
    </div>
  );
};

export default function App() {
  const settings = useLiveQuery(() => db.settings.toArray())?.[0];
  const [isInitialSyncing, setIsInitialSyncing] = useState(false);
  const [initialPullAttempted, setInitialPullAttempted] = useState(false);
  
  // We need a way to react to storage changes, so we use a dummy state that we can update.
  const [storageVersion, setStorageVersion] = useState(0);
  
  const cloudConfigured = useMemo(() => {
    // This memo depends on storageVersion to re-evaluate when localStorage changes.
    void storageVersion; // a trick to make it a dependency
    return !!localStorage.getItem('cloudflare_api_url') && !!localStorage.getItem('cloudflare_api_token');
  }, [storageVersion]);

  // Listen to manual storage changes to update cloudConfigured status
  useEffect(() => {
    const update = () => setStorageVersion(v => v + 1);
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);

  // Effect to manage sync hooks
  useEffect(() => {
    if (cloudConfigured && settings?.liveSyncEnabled) {
      console.log("Setting up live cloud sync hooks.");
      setupSyncHooks();
    } else {
      console.log("Detaching live cloud sync hooks.");
      detachSyncHooks();
    }
    return () => detachSyncHooks();
  }, [cloudConfigured, settings?.liveSyncEnabled]);
  
  // Effect for initial data pull
  useEffect(() => {
    const performCloudPull = async () => {
        setIsInitialSyncing(true);
        try {
            await pullFromCloud();
            console.log("Initial cloud sync completed successfully.");
        } catch (e) {
            console.error("Initial cloud sync failed", e);
            alert('فشل المزامنة الأولية مع الخادم. قد تكون البيانات المحلية غير محدثة.');
        } finally {
            setIsInitialSyncing(false);
        }
    };
    
    if (!initialPullAttempted && settings?.liveSyncEnabled && cloudConfigured) {
      setInitialPullAttempted(true); // Attempt only once per session
      console.log("Performing initial sync from Cloudflare D1...");
      performCloudPull();
    }
  }, [initialPullAttempted, settings?.liveSyncEnabled, cloudConfigured]);


  return (
    <>
      {isInitialSyncing && (
        <div className="fixed inset-0 bg-white/80 z-[200] flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in">
          <RefreshCw size={48} className="text-primary animate-spin mb-4" />
          <h2 className="text-xl font-bold text-gray-800">جاري المزامنة...</h2>
          <p className="text-gray-500">يتم سحب أحدث البيانات من الخادم السحابي.</p>
        </div>
      )}
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route 
              path="/settings" 
              element={<SettingsPage />} 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </>
  );
}