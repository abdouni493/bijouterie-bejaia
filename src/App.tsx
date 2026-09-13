
import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu as MenuIcon, Lock, X as CloseIcon, AlertTriangle } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { translations } from './i18n/translations';
import { pageVariants, pageTransition } from './animations/config';
import Login from './components/auth/Login';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/dashboard/Dashboard';
import Inventory from './components/catalog/Inventory';
import Suppliers from './components/purchasing/Suppliers';
import Purchases from './components/purchasing/Purchases';
import CassiePurchases from './components/purchasing/CassiePurchases';
import POS from './components/sales/POS';
import SellingInvoices from './components/sales/SellingInvoices';
import Workshops from './components/workshop/Workshops';
import Deliveries from './components/workshop/Deliveries';
import Commands from './components/workshop/Commands';
import Workers from './components/staff/Workers';
import MyPayroll from './components/staff/MyPayroll';
import StoreExpenses from './components/finance/StoreExpenses';
import Reports from './components/dashboard/Reports';
import Settings from './components/settings/Settings';
import Catalogue from './components/catalog/Catalogue';
import Debts from './components/finance/Debts';
import Replacements from './components/sales/Replacements';
import Clients from './components/sales/Clients';
import StoreCash from './components/finance/StoreCash';
import WebsiteManagement from './components/webshop/WebsiteManagement';
import WebsiteOrders from './components/webshop/WebsiteOrders';
import WebsitePublic from './components/storefront/WebsitePublic';

/** Tabs in sidebar order — used to pick a landing screen for a worker. */
const TAB_ORDER = [
  'dashboard', 'pos', 'inventory', 'replacements', 'clients',
  'suppliers', 'purchases', 'cassiePurchases', 'sellingInvoices',
  'workshops', 'deliveries', 'commands', 'workers', 'myPayroll',
  'storeExpenses', 'storeCash', 'debts', 'reports',
  'websiteManagement', 'websiteOrders', 'catalogue', 'settings',
];

const isPublicSite = (): boolean =>
  window.location.pathname.startsWith('/shop') ||
  window.location.pathname.startsWith('/website') ||
  window.location.search.includes('view=shop');


/** Shown when a worker lands on a tab that is not theirs. */
const NoAccess: React.FC<{ language: string }> = ({ language }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: '80px 24px', textAlign: 'center',
  }}>
    <div style={{
      width: 56, height: 56, borderRadius: '50%',
      background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Lock size={24} style={{ color: '#C9A84C' }} />
    </div>
    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
      {language === 'ar' ? 'لا تملك صلاحية الوصول' : 'Accès non autorisé'}
    </h2>
    <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0, maxWidth: 380, lineHeight: 1.7 }}>
      {language === 'ar'
        ? 'هذه الواجهة غير مفعّلة لحسابك. اطلب من المدير منحك الصلاحية.'
        : "Cette interface n'est pas activée pour votre compte. Demandez à l'administrateur de vous accorder la permission."}
    </p>
  </div>
);

const MainLayout: React.FC = () => {
  const { user, language, isLoading, theme, can, isAuthReady, syncError, clearSyncError } = useApp();

  // ── All hooks before any early return ──────────────────────
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('activeTab');
    return saved || 'dashboard';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('isSidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // The remembered tab may no longer be granted (permissions changed, or a
  // different user signed in on this browser). Land on the first one that is.
  useEffect(() => {
    if (!user || !isAuthReady) return;
    if (can(`${activeTab}.view`)) return;
    const firstAllowed = TAB_ORDER.find(tab => can(`${tab}.view`));
    if (firstAllowed) setActiveTab(firstAllowed);
  }, [user, isAuthReady, activeTab, can]);

  useEffect(() => {
    localStorage.setItem('isSidebarCollapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);
  // ────────────────────────────────────────────────────────────

  const isRTL = language === 'ar';

  if (isLoading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--deep-bg)', color: 'var(--gold-primary)',
        gap: '16px', fontFamily: 'inherit',
      }}>
        <div style={{
          width: 40, height: 40, border: '3px solid rgba(201,168,76,0.2)',
          borderTopColor: '#C9A84C', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: '13px', letterSpacing: '0.1em', opacity: 0.7 }}>Chargement…</span>
      </div>
    );
  }

  if (isPublicSite()) return <WebsitePublic />;
  if (!user) return <Login />;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  };

  const renderContent = () => {
    // The sidebar already hides forbidden tabs, but a stale `activeTab` in
    // localStorage could still point at one — so check the permission here too.
    if (!can(`${activeTab}.view`)) return <NoAccess language={language} />;

    switch (activeTab) {
      case 'clients':          return <Clients />;
      case 'dashboard':        return <Dashboard />;
      case 'replacements':     return <Replacements />;
      case 'inventory':        return <Inventory />;
      case 'suppliers':        return <Suppliers />;
      case 'purchases':        return <Purchases />;
      case 'cassiePurchases':  return <CassiePurchases />;
      case 'pos':              return <POS />;
      case 'sellingInvoices':  return <SellingInvoices />;
      case 'workshops':        return <Workshops />;
      case 'deliveries':       return <Deliveries />;
      case 'commands':         return <Commands />;
      case 'workers':          return <Workers />;
      case 'myPayroll':        return <MyPayroll />;
      case 'storeExpenses':    return <StoreExpenses />;
      case 'storeCash':        return <StoreCash />;
      case 'debts':            return <Debts />;
      case 'reports':          return <Reports />;
      case 'settings':         return <Settings />;
      case 'catalogue':        return <Catalogue />;
      case 'websiteManagement':return <WebsiteManagement />;
      case 'websiteOrders':    return <WebsiteOrders />;
      default:                 return <Dashboard />;
    }
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: isRTL ? 'row-reverse' : 'row',
        overflow: 'hidden',
        background: 'var(--deep-bg)',
      }}
    >
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(6px)',
            }}
            className="md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar — pinned in flex flow on desktop, fixed overlay on mobile */}
      <div
        style={{ flexShrink: 0, height: '100%', zIndex: 50, position: 'relative' }}
        className="hidden md:block"
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
      </div>

      {/* Mobile sidebar (fixed slide-in) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          [isRTL ? 'right' : 'left']: 0,
          zIndex: 50,
          width: 'min(280px, 88vw)',
          transform: isMobileMenuOpen
            ? 'translateX(0)'
            : isRTL ? 'translateX(100%)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
        className="md:hidden"
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          isCollapsed={false}
          setIsCollapsed={() => {}}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
      </div>

      {/* Main content — independent scroll */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Header
          activeTab={activeTab}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        <main
          ref={mainRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'var(--deep-bg)',
            padding: 'clamp(16px, 3vw, 32px)',
          }}
        >
          <div style={{ maxWidth: 1600, margin: '0 auto' }}>
            {/* A failed write must never be silent — the shop would think it saved. */}
            <AnimatePresence>
              {syncError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.28)',
                    borderRadius: 12, padding: '12px 14px', marginBottom: 20,
                  }}
                >
                  <AlertTriangle size={17} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ flex: 1, fontSize: 13, color: '#ef4444', margin: 0, fontWeight: 500, lineHeight: 1.6 }}>
                    {syncError}
                  </p>
                  <button
                    onClick={clearSyncError}
                    style={{
                      background: 'none', border: 'none', color: '#ef4444',
                      cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0,
                    }}
                    aria-label="Fermer"
                  >
                    <CloseIcon size={15} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

    </div>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <MainLayout />
  </AppProvider>
);

export default App;
