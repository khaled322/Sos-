import React, { PropsWithChildren, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Store, ShoppingCart, Users, Settings, ReceiptText, WalletCards, Monitor, Bell } from 'lucide-react';
import { DataProvider, useData } from './context/DataContext';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import SettingsPage from './pages/Settings';
import Debts from './pages/Debts';
import NotificationsPage from './pages/Notifications';
import { Loader } from './components/ui/Loader';

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

const Layout = ({ children }: PropsWithChildren<{}>) => {
  const location = useLocation();
  const path = location.pathname;
  const { settings, loading } = useData();

  useEffect(() => {
    if (settings?.themeColor) {
      const t = THEMES[settings.themeColor] || THEMES['indigo'];
      document.documentElement.style.setProperty('--color-primary', t.primary);
      document.documentElement.style.setProperty('--color-primary-dark', t.dark);
    }
  }, [settings?.themeColor]);

  if (loading.settings && !settings) {
    return <div className="h-full w-full flex items-center justify-center"><Loader text="جاري تحميل الإعدادات..." /></div>;
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-100">
      <header className="bg-white shadow-sm z-10 flex-shrink-0 relative print:hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-between h-16 gap-2 md:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <Link to="/" className="w-10 h-10 bg-primary hover:bg-primary-dark transition-colors rounded-xl flex items-center justify-center shrink-0 shadow-sm active:scale-95"><Store className="text-white" size={20} /></Link>
                 <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>
                <h1 className="text-lg font-bold text-gray-800 hidden sm:block truncate max-w-[150px] lg:max-w-xs">{settings?.storeName || 'OmniPOS'}</h1>
            </div>
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide mask-inline-fade flex-1 justify-center px-2">
              <NavItem icon={Monitor} label="نقطة البيع" to="/pos" active={path === '/pos'} />
              <NavItem icon={ShoppingCart} label="المنتجات" to="/products" active={path === '/products'} />
              <NavItem icon={ReceiptText} label="السجل المالي" to="/invoices" active={path === '/invoices'} />
              <NavItem icon={Users} label="العملاء" to="/customers" active={path === '/customers'} />
              <NavItem icon={WalletCards} label="الديون" to="/debts" active={path === '/debts'} />
              <NavItem icon={Settings} label="الإعدادات" to="/settings" active={path === '/settings'} />
            </nav>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <Link to="/notifications" className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${path === '/notifications' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 hover:text-primary'}`}>
                    <Bell size={20} />
                </Link>
            </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden relative">{children}</main>
    </div>
  );
};

const AppRoutes = () => (
  <Layout>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/pos" element={<POS />} />
      <Route path="/products" element={<Products />} />
      <Route path="/customers" element={<Customers />} />
      <Route path="/invoices" element={<Invoices />} />
      <Route path="/debts" element={<Debts />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Layout>
);

export default function App() {
  return (
    <HashRouter>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </HashRouter>
  );
}
