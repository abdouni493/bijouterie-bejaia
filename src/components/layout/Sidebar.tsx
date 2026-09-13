
import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  LayoutDashboard, Package, Truck, ShoppingCart, Calculator,
  FileText, Warehouse, Wrench, Users, BarChart, Settings,
  LogOut, ChevronLeft, ChevronRight, Gem, CreditCard, Receipt,
  Repeat, Flame, PiggyBank, Globe, ShoppingBag, UserPlus, X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../i18n/translations';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onMobileClose?: () => void;
}

const SectionLabel: React.FC<{ label: string; collapsed: boolean; delay?: number; theme?: string }> = ({ label, collapsed, delay = 0, theme = 'dark' }) => {
  const shouldReduce = useReducedMotion();
  const lineColor = theme === 'dark' ? 'rgba(192,200,212,0.10)' : 'rgba(201,168,76,0.25)';
  const textColor = theme === 'dark' ? 'rgba(192,200,212,0.30)' : 'rgba(201,168,76,0.70)';
  if (collapsed) return <div className="h-px mx-3 my-2" style={{ background: 'var(--border)' }} />;
  return (
    <motion.div
      className="px-4 pt-4 pb-1.5 relative flex items-center gap-3"
      initial={shouldReduce ? false : { opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <div className="flex-1 h-px" style={{ background: lineColor }} />
      <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.16em', color: textColor, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: lineColor }} />
    </motion.div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, onMobileClose }) => {
  const { user, language, setUser, settings, theme, can } = useApp();
  const t = translations[language];
  const isAdmin = user?.role === 'admin';
  const shouldReduce = useReducedMotion();

  // A tab is listed only when the signed-in user holds its `<module>.view`
  // permission. An administrator holds every one, so they see the full menu;
  // an employee sees exactly the screens ticked for them on the Employés page.
  const sections = [
    {
      label: 'GESTION',
      items: [
        { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
        { id: 'pos', label: t.pos, icon: Calculator },
        { id: 'inventory', label: t.inventory, icon: Package },
        { id: 'replacements', label: t.replacements, icon: Repeat },
        { id: 'clients', label: t.clients, icon: UserPlus },
      ],
    },
    {
      label: 'FINANCES',
      items: [
        { id: 'suppliers', label: t.suppliers, icon: Truck },
        { id: 'purchases', label: t.purchases, icon: ShoppingCart },
        { id: 'cassiePurchases', label: t.cassiePurchases || 'Cassie', icon: Flame },
        { id: 'sellingInvoices', label: t.sellingInvoices, icon: FileText },
      ],
    },
    {
      label: 'OPÉRATIONS',
      items: [
        { id: 'workshops', label: t.workshops, icon: Warehouse },
        { id: 'deliveries', label: t.deliveries, icon: Truck },
        { id: 'commands', label: t.commands, icon: Wrench },
        { id: 'workers', label: t.workers, icon: Users },
        // The payslip screen is for employees; an admin has the Employés screen.
        { id: 'myPayroll', label: language === 'ar' ? 'مستحقاتي' : 'Mes Paiements', icon: CreditCard, show: !isAdmin },
      ],
    },
    {
      label: 'ANALYSE',
      items: [
        { id: 'storeExpenses', label: t.storeExpenses, icon: Receipt },
        { id: 'storeCash', label: language === 'ar' ? 'خزينة المتجر' : 'Trésorerie', icon: PiggyBank },
        { id: 'debts', label: t.debts, icon: CreditCard },
        { id: 'reports', label: t.reports, icon: BarChart },
      ],
    },
    {
      label: 'SITE WEB',
      items: [
        { id: 'websiteManagement', label: language === 'ar' ? 'إدارة الموقع' : 'Gestion Site Web', icon: Globe },
        { id: 'websiteOrders', label: language === 'ar' ? 'طلبات الموقع' : 'Commandes Site', icon: ShoppingBag },
      ],
    },
    {
      label: 'CONFIG',
      items: [
        { id: 'catalogue', label: language === 'ar' ? 'الكتالوج' : 'Catalogue', icon: Gem },
        { id: 'settings', label: t.settings, icon: Settings },
      ],
    },
  ].map(section => ({
    ...section,
    items: section.items.map(item => ({
      ...item,
      show: (item as any).show !== false && can(`${item.id}.view`),
    })),
  }));

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={shouldReduce ? { duration: 0 } : { duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      style={{
        background: theme === 'dark'
          ? 'linear-gradient(180deg, #080B10 0%, #0D1117 40%, #111822 100%)'
          : 'linear-gradient(180deg, #FAF7F2 0%, #FBF9F6 40%, #FDF9F4 100%)',
        borderRight: theme === 'dark'
          ? '1px solid rgba(192,200,212,0.08)'
          : '1px solid rgba(201,168,76,0.25)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: theme === 'dark' ? '4px 0 32px rgba(0,0,0,0.5)' : '4px 0 24px rgba(0,0,0,0.08)',
      }}
      className="h-full flex flex-col z-50"
    >
      {/* Left edge silver shimmer strip */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: 'linear-gradient(180deg, transparent 0%, rgba(192,200,212,0.3) 30%, rgba(192,200,212,0.15) 70%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Brand */}
      <motion.div
        initial={shouldReduce ? false : { opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className={`flex items-center gap-3 ${isCollapsed ? 'p-4 justify-center' : 'px-5 py-5'}`}
      >
        <div style={{
          width: 44, height: 44, minWidth: 44,
          background: theme === 'dark' ? 'rgba(192,200,212,0.08)' : 'rgba(201,168,76,0.12)',
          border: theme === 'dark' ? '1px solid rgba(192,200,212,0.15)' : '1px solid rgba(201,168,76,0.30)',
          borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
        }}>
          {settings?.logo
            ? <img src={settings.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Gem size={20} style={{ color: theme === 'dark' ? '#C0C8D4' : '#C9A84C' }} />}
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div style={{ fontSize: 15, fontWeight: 800, color: theme === 'dark' ? '#F0F4F8' : '#8B6F47', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {settings?.storeName || 'Bijouterie'}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#C9A84C', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                {settings?.slogan || t.slogan}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Mobile close button */}
      {onMobileClose && (
        <motion.button
          onClick={onMobileClose}
          whileTap={{ scale: 0.9 }}
          style={{
            position: 'absolute', top: 16,
            [language === 'ar' ? 'left' : 'right']: 16,
            width: 36, height: 36, borderRadius: '50%',
            background: theme === 'dark' ? 'rgba(192,200,212,0.08)' : 'rgba(201,168,76,0.10)',
            border: theme === 'dark' ? '1px solid rgba(192,200,212,0.15)' : '1px solid rgba(201,168,76,0.25)',
            color: theme === 'dark' ? 'rgba(192,200,212,0.6)' : 'rgba(201,168,76,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10,
          }}
        >
          <X size={16} />
        </motion.button>
      )}

      {/* Separator */}
      <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />

      {/* Toggle button */}
      <motion.button
        onClick={() => setIsCollapsed(!isCollapsed)}
        animate={shouldReduce ? {} : { rotate: isCollapsed ? 180 : 0 }}
        transition={{ duration: 0.3 }}
        className="hidden md:flex absolute -right-3.5 top-[76px] items-center justify-center z-20"
        style={{
          width: 28, height: 28,
          background: theme === 'dark' ? '#0D1117' : '#FBF9F6',
          border: theme === 'dark' ? '1px solid rgba(192,200,212,0.2)' : '1px solid rgba(201,168,76,0.30)',
          borderRadius: '50%',
          color: theme === 'dark' ? 'rgba(192,200,212,0.5)' : 'rgba(201,168,76,0.7)',
          cursor: 'pointer',
        }}
        whileHover={shouldReduce ? {} : { borderColor: '#C0C8D4', color: '#C0C8D4', scale: 1.1 }}
        whileTap={shouldReduce ? {} : { scale: 0.9 }}
      >
        {language === 'ar'
          ? <ChevronLeft size={14} />
          : <ChevronRight size={14} />}
      </motion.button>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto no-scrollbar" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {sections.map((section, sIdx) => {
          const visibleItems = section.items.filter(item => item.show);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label}>
              <SectionLabel label={section.label} collapsed={isCollapsed} delay={sIdx * 0.05} theme={theme} />
              {visibleItems.map((item, iIdx) => {
                const isActive = activeTab === item.id;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    whileHover={shouldReduce ? {} : { x: isCollapsed ? 0 : 3 }}
                    whileTap={shouldReduce ? {} : { scale: 0.97 }}
                    initial={shouldReduce ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: sIdx * 0.04 + iIdx * 0.03, duration: 0.3 }}
                    className={`sidebar-item${isActive ? ' active' : ''}`}
                    title={isCollapsed ? item.label : ''}
                    style={isCollapsed
                      ? { justifyContent: 'center', padding: '11px 0' }
                      : { minHeight: onMobileClose ? 48 : undefined }
                    }
                  >
                    <item.icon
                      size={18}
                      className="sidebar-icon shrink-0"
                      style={{
                        color: isActive
                          ? (theme === 'dark' ? '#C0C8D4' : '#C9A84C')
                          : (theme === 'dark' ? 'rgba(192,200,212,0.40)' : 'rgba(201,168,76,0.60)'),
                        transition: 'color 0.2s',
                      }}
                    />
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          style={{ fontSize: 13.5 }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
        <motion.button
          onClick={() => setUser(null)}
          whileHover={shouldReduce ? {} : { backgroundColor: 'rgba(255,95,114,0.1)', x: isCollapsed ? 0 : 3 }}
          whileTap={shouldReduce ? {} : { scale: 0.97 }}
          className={`sidebar-item ${isCollapsed ? 'justify-center' : ''}`}
          style={{ color: theme === 'dark' ? 'rgba(192,200,212,0.4)' : 'rgba(201,168,76,0.6)' }}
          title={isCollapsed ? t.logout : ''}
        >
          <LogOut size={18} className="shrink-0" style={{ transition: 'color 0.2s' }} />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {t.logout}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
