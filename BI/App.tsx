
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import DataUpdater from './components/DataUpdater';
import NhanVien from './components/NhanVien';
import Settings from './components/Settings';
import { ChartPieIcon, UploadIcon, DocumentReportIcon, UsersIcon, CogIcon, ChevronUpIcon, SpinnerIcon } from './components/Icons';
import { useSampleDataInitializer } from './hooks/useSampleDataInitializer';
import ThemeToggle from './components/ThemeToggle';
import { useIndexedDBState } from './hooks/useIndexedDBState';
import { Switch } from './components/dashboard/DashboardWidgets';

interface NavLinkProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  isExpanded?: boolean;
}

const SidebarNavLink: React.FC<NavLinkProps> = ({ isActive, onClick, icon, children, isExpanded }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full text-sm font-bold rounded-2xl transition-all duration-300 py-3.5 group relative ${
      isExpanded ? 'px-4' : 'justify-center px-0'
    } ${
      isActive
        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
    }`}
  >
    <div className={`flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'w-full ml-3 opacity-100' : 'w-0 opacity-0'}`}>
      <span className="whitespace-nowrap tracking-tight">{children}</span>
    </div>
    {!isExpanded && isActive && (
      <div className="absolute right-0 w-1.5 h-6 bg-primary-400 rounded-l-full"></div>
    )}
  </button>
);

const MobileNavLink: React.FC<NavLinkProps> = ({ isActive, onClick, icon, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center flex-1 flex-col gap-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
      isActive
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-slate-400 dark:text-slate-600'
    }`}
  >
    <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary-5 dark:bg-primary-900/30 scale-110' : 'bg-transparent'}`}>
      {icon}
    </div>
    <span>{children}</span>
  </button>
);

const App: React.FC = () => {
  const [activeView, setActiveView] = useIndexedDBState<'dashboard' | 'employee' | 'updater' | 'settings'>('main-active-view', 'dashboard');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isAutoExpandEnabled, setIsAutoExpandEnabled] = useIndexedDBState<boolean>('sidebar-auto-expand', false);
  
  const isDataInitialized = useSampleDataInitializer();

  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Logic Scaling Chuẩn 800px ---
  const [scale, setScale] = useState(1);
  const REPORT_WIDTH = 800; 

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const isMobile = width < 768;
      
      if (isMobile) {
        setScale(1); // No scaling on mobile, use fluid layout
        return;
      }

      const sidebarWidth = isSidebarExpanded ? 256 : 80;
      const horizontalPadding = 48; 
      const availableWidth = width - sidebarWidth - horizontalPadding;

      if (availableWidth < REPORT_WIDTH) {
        setScale(availableWidth / REPORT_WIDTH);
      } else {
        setScale(1);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    const timer = setTimeout(handleResize, 100);
    return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer);
    };
  }, [isSidebarExpanded]);

  if (!isDataInitialized) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-950 flex items-center justify-center z-50">
        <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-5xl shadow-2xl animate-slide-up">
          <div className="w-12 h-12 border-[3px] border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-lg font-black text-slate-800 dark:text-white tracking-tighter">BI PRO TOOLS</p>
        </div>
      </div>
    );
  }

  const navigationLinks = [
    { id: 'dashboard', icon: <ChartPieIcon className="h-6 w-6" />, label: 'Tổng quan' },
    { id: 'employee', icon: <UsersIcon className="h-6 w-6" />, label: 'Nhân viên' },
    { id: 'updater', icon: <UploadIcon className="h-6 w-6" />, label: 'Cập nhật' },
    { id: 'settings', icon: <CogIcon className="h-6 w-6" />, label: 'Hệ thống' },
  ];

  return (
    <div className="fixed inset-0 bg-[#f8fafc] dark:bg-slate-950 flex overflow-hidden">
      
      {/* --- Desktop Sidebar --- */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col hidden md:flex transition-all duration-500 ease-in-out shrink-0 shadow-sm ${
          isSidebarExpanded ? 'w-64' : 'w-20'
        }`}
        onMouseEnter={() => isAutoExpandEnabled && setIsSidebarExpanded(true)}
        onMouseLeave={() => isAutoExpandEnabled && setIsSidebarExpanded(false)}
      >
        <div className="flex items-center h-24 px-6 shrink-0 overflow-hidden">
          <button 
            onClick={() => !isAutoExpandEnabled && setIsSidebarExpanded(!isSidebarExpanded)}
            className={`p-2 bg-primary-600 rounded-xl shadow-lg transition-transform active:scale-90 ${!isAutoExpandEnabled ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <DocumentReportIcon className="h-6 w-6 text-white" />
          </button>
          <div className={`ml-4 transition-all duration-300 ${isSidebarExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            <h1 className="text-lg font-black text-slate-900 dark:text-white leading-none tracking-tight">TOOLS 910</h1>
            <p className="text-[9px] font-black text-primary-500 uppercase tracking-widest mt-1 opacity-80">Enterprise</p>
          </div>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto scrollbar-hide">
          {navigationLinks.map(link => (
            <SidebarNavLink
              key={link.id}
              isActive={activeView === link.id}
              onClick={() => setActiveView(link.id as any)}
              icon={link.icon}
              isExpanded={isSidebarExpanded}
            >
              {link.label}
            </SidebarNavLink>
          ))}
        </nav>
        
        <div className="p-3 mt-auto border-t border-slate-50 dark:border-slate-800/40 space-y-3">
          <div className={`flex items-center transition-all duration-300 ${isSidebarExpanded ? 'justify-between px-3' : 'justify-center px-0'}`}>
            <div className={`overflow-hidden transition-all duration-300 ${isSidebarExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Auto Expand</span>
                  <span className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase">Hover menu</span>
               </div>
            </div>
            <div className="shrink-0 flex items-center justify-center">
               {isSidebarExpanded ? (
                 <Switch checked={isAutoExpandEnabled} onChange={() => setIsAutoExpandEnabled(!isAutoExpandEnabled)} />
               ) : (
                 <button 
                  onClick={() => {
                    setIsAutoExpandEnabled(!isAutoExpandEnabled);
                    if (!isAutoExpandEnabled) setIsSidebarExpanded(false);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${isAutoExpandEnabled ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'text-slate-400 hover:bg-slate-100'}`}
                  title={isAutoExpandEnabled ? "Tắt tự động mở rộng" : "Bật tự động mở rộng"}
                 >
                   <CogIcon className="h-4 w-4" />
                 </button>
               )}
            </div>
          </div>

          <div className={`flex items-center transition-all duration-300 ${isSidebarExpanded ? 'justify-between px-3' : 'justify-center px-0'}`}>
            <ThemeToggle />
            <div className={`overflow-hidden transition-all duration-300 ${isSidebarExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
              <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">V1.9 PRO</span>
            </div>
          </div>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className={`flex-1 flex flex-col min-w-0 h-full transition-all duration-500 ${isSidebarExpanded ? 'md:ml-64' : 'md:ml-20'}`}>
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40 border-b border-slate-200/50 dark:border-slate-800/50 px-4 h-14 flex items-center justify-between shrink-0 safe-top">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-600 rounded-lg shadow-sm shadow-primary-500/20">
              <DocumentReportIcon className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tighter uppercase">TOOLS 910</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
                onClick={() => window.location.reload()}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                title="Làm mới"
            >
                <SpinnerIcon className="h-4 w-4" />
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* Nội dung chính có cuộn riêng, chặn refresh */}
        <main className="flex-1 w-full overflow-y-auto overflow-x-hidden scroll-smooth flex flex-col items-center pb-20 md:pb-0">
          <div 
            style={{ 
              width: window.innerWidth < 768 ? '100%' : `${REPORT_WIDTH}px`,
              transform: (window.innerWidth >= 768 && scale < 1) ? `scale(${scale})` : 'none',
              transformOrigin: 'top center',
            }}
            className="py-4 md:py-10 px-3 md:px-2 space-y-6 md:space-y-8 animate-slide-up w-full max-w-full"
          >
            <div style={{ display: activeView === 'dashboard' ? 'block' : 'none' }}>
              <Dashboard onNavigateToUpdater={() => setActiveView('updater')} />
            </div>
            <div style={{ display: activeView === 'employee' ? 'block' : 'none' }}>
              <NhanVien />
            </div>
            <div style={{ display: activeView === 'updater' ? 'block' : 'none' }}>
              <DataUpdater />
            </div>
            <div style={{ display: activeView === 'settings' ? 'block' : 'none' }}>
              <Settings />
            </div>

            {showBackToTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-20 right-4 p-3 bg-primary-600 text-white rounded-full shadow-lg z-40 md:hidden active:scale-90 transition-transform"
                >
                    <ChevronUpIcon className="h-6 w-6" />
                </button>
            )}
            
            <footer className="pt-10 pb-10 text-center opacity-30">
              <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">
                BI Enterprise Dashboard System &copy; 2026
              </p>
            </footer>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-t border-slate-200/50 dark:border-slate-800/50 fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.04)] h-16 shrink-0">
          {navigationLinks.map(link => {
            const isActive = activeView === link.id;
            return (
                <MobileNavLink
                    key={link.id}
                    isActive={isActive}
                    onClick={() => setActiveView(link.id as any)}
                    icon={link.icon}
                >
                    {link.label}
                </MobileNavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default App;
