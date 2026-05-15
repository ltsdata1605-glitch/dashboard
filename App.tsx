import React, { Suspense, lazy } from 'react';
import { LayoutProvider, useLayout, useActiveTab } from './contexts/LayoutContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Sidebar from './components/layout/Sidebar';
import MobileBottomNav from './components/layout/MobileBottomNav';
import { getGlobalFont } from './services/dbService';
import { 
    BarChart3, 
    LayoutDashboard, 
    Users, 
    Printer,
    Calendar,
    Ticket,
    Calculator,
    ClipboardCheck,
    Settings,
    HelpCircle,
    Shield,
    FileText,
    Wrench
} from 'lucide-react';

const DashboardView = lazy(() => import('./components/views/DashboardView'));
const CheckThuongView = lazy(() => import('./components/views/CheckThuongView'));
const ExternalToolView = lazy(() => import('./components/views/ExternalToolView'));
const UserManagementView = lazy(() => import('./components/views/UserManagementView'));
const SettingsView = lazy(() => import('./components/views/SettingsView'));
const AboutView = lazy(() => import('./components/views/AboutView'));
const StickerPrinterView = lazy(() => import('./components/views/StickerPrinterView'));
const PhanCaView = lazy(() => import('./components/views/phanca/PhanCaView'));
const BaoCaoKhaiThacView = lazy(() => import('./components/views/reports/BaoCaoKhaiThacView'));
const KiemQuyView = lazy(() => import('./components/views/KiemQuyView'));


// BI Module Wrapper
const BiWrapper = lazy(() => import('./bi-module/components/BiWrapper'));

import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginView from './components/views/LoginView';
import PendingApprovalView from './components/views/PendingApprovalView';
import StaffListView from './components/views/StaffListView';
import ReportLinkView from './components/views/ReportLinkView';
import StaffScheduleView from './components/views/StaffScheduleView';
import CouponConverterView from './components/views/CouponConverterView';
import { Toaster } from 'react-hot-toast';
import NotificationDropdown from './components/layout/NotificationDropdown';
import PendingApprovalBanner from './components/layout/PendingApprovalBanner';

/**
 * TabContent — Isolated component that handles tab switching.
 * Uses lazy-mount pattern: views only mount when first visited,
 * then stay alive via hidden/block CSS. This prevents mounting
 * heavy views (with IDB reads, Firebase listeners, etc.) that
 * the user may never open → saves CPU + battery.
 */
const TabContent = React.memo(() => {
    const { activeTab } = useActiveTab();
    const [mountedTabs, setMountedTabs] = React.useState<Set<string>>(() => new Set([activeTab]));

    // Mount tab on first visit
    React.useEffect(() => {
        setMountedTabs(prev => {
            if (prev.has(activeTab)) return prev;
            const next = new Set(prev);
            next.add(activeTab);
            return next;
        });
    }, [activeTab]);

    // Persistent views — only mount when first visited, keep alive after
    const persistentViews = React.useMemo(() => [
        { id: 'analysis', component: <DashboardView /> },
        { id: 'approval', className: 'w-full', component: <UserManagementView /> },
        { id: 'settings', className: 'w-full', component: <SettingsView /> },
        { id: 'pending-approval', className: 'w-full', component: <PendingApprovalView /> },
        { id: 'help', className: 'w-full', component: <AboutView /> },
        { id: 'check-thuong', component: <CheckThuongView /> },
        { id: 'employees', className: 'w-full', component: <BiWrapper /> },
        { id: 'tools-print-sticker', className: 'w-full h-full', component: <StickerPrinterView /> },
        { id: 'tools-phanca', className: 'w-full h-full bg-slate-50', component: <PhanCaView /> },
        { id: 'reports', className: 'w-full h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative flex flex-col', component: <BaoCaoKhaiThacView /> },
        { id: 'tools-audit', className: 'w-full h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative flex flex-col', component: <KiemQuyView /> },
    ], []);

    return (
        <>
            {persistentViews.map(view => (
                mountedTabs.has(view.id) ? (
                    <div 
                        key={view.id} 
                        className={`${view.className || ''} ${activeTab === view.id ? 'block relative w-full h-full' : 'absolute left-[-9999px] top-0 opacity-0 pointer-events-none w-full h-full overflow-hidden'}`}
                    >
                        {view.component}
                    </div>
                ) : null
            ))}

            {activeTab === 'tools-coupon' && (
                <CouponConverterView />
            )}

            {activeTab === 'tools-tax' && (
                <div className="block">
                    <ExternalToolView url="https://tinhthue-netify-487587635482.us-west1.run.app" title="Tính thuế nhận thưởng" />
                </div>
            )}

            {/* Render External Tool view when applicable */}
            {!['analysis', 'approval', 'settings', 'help', 'pending-approval', 'check-thuong', 'tools-coupon', 'tools-tax', 'tools-audit', 'employees', 'tools-print-sticker', 'tools-phanca', 'reports'].includes(activeTab) && (
                <div style={{ display: !['analysis', 'approval', 'settings', 'help', 'pending-approval', 'check-thuong', 'tools-coupon', 'employees', 'tools-print-sticker', 'tools-phanca', 'reports'].includes(activeTab) ? 'block' : 'none' }} className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
                    <p className="text-lg font-medium">Tính năng đang được phát triển</p>
                    <p className="text-sm">Vui lòng quay lại sau</p>
                </div>
            )}
        </>
    );
});
TabContent.displayName = 'TabContent';

const TAB_TITLES: Record<string, { main: string, highlight?: string }> = {
    'analysis': { main: 'Phân Tích' },
    'check-thuong': { main: 'Check', highlight: 'Thưởng' },
    'employees': { main: 'Report', highlight: 'BI' },
    'inventory': { main: 'Kho', highlight: 'Hàng' },
    'reports': { main: 'Báo', highlight: 'Cáo' },
    'tools': { main: 'Công', highlight: 'Cụ' },
    'tools-print-sticker': { main: 'In', highlight: 'Sticker' },
    'tools-coupon': { main: 'Đổi', highlight: 'Coupon' },
    'tools-tax': { main: 'Hoàn', highlight: 'Thuế' },
    'tools-audit': { main: 'Kiểm', highlight: 'Quỹ' },
    'tools-phanca': { main: 'Phân', highlight: 'Ca' },

    'settings': { main: 'Cài đặt', highlight: 'Hệ thống' },
    'help': { main: 'Giới', highlight: 'Thiệu' },
    'pending-approval': { main: 'Hồ Sơ', highlight: 'Quyền' },
};

function AppContent() {
    const { isDarkMode, toggleDarkMode } = useLayout();
    const { activeTab } = useActiveTab();
    const { user, userRole, isDemoMode, isLoading, departmentId } = useAuth();
    
    const titleData = TAB_TITLES[activeTab] || { main: 'Hub', highlight: '2.0' };

    const getTabIcon = () => {
        switch (activeTab) {
            case 'analysis': return <BarChart3 size={15} color="white" strokeWidth={2.5} />;
            case 'check-thuong': return <LayoutDashboard size={15} color="white" strokeWidth={2.5} />;
            case 'employees': return <Users size={15} color="white" strokeWidth={2.5} />;
            case 'reports': return <FileText size={15} color="white" strokeWidth={2.5} />;
            case 'inventory': return <FileText size={15} color="white" strokeWidth={2.5} />;
            case 'tools-print-sticker': return <Printer size={15} color="white" strokeWidth={2.5} />;
            case 'tools-phanca': return <Calendar size={15} color="white" strokeWidth={2.5} />;
            case 'tools-coupon': return <Ticket size={15} color="white" strokeWidth={2.5} />;
            case 'tools-tax': return <Calculator size={15} color="white" strokeWidth={2.5} />;
            case 'tools-audit': return <ClipboardCheck size={15} color="white" strokeWidth={2.5} />;
            case 'settings': return <Settings size={15} color="white" strokeWidth={2.5} />;
            case 'help': return <HelpCircle size={15} color="white" strokeWidth={2.5} />;
            case 'pending-approval': return <Shield size={15} color="white" strokeWidth={2.5} />;
            default:
                if (activeTab.startsWith('tools')) return <Wrench size={15} color="white" strokeWidth={2.5} />;
                return <BarChart3 size={15} color="white" strokeWidth={2.5} />;
        }
    };

    React.useEffect(() => {
        getGlobalFont().then(font => {
            if (font && font !== 'Plus Jakarta Sans') {
                document.body.style.fontFamily = `'${font}', sans-serif`;
            } else {
                document.body.style.fontFamily = ''; // Reset to default (Plus Jakarta Sans)
            }
        }).catch(error => {
            console.warn("Failed to get global font, ignoring:", error);
        });
    }, []);

    // Hiển thị màn hình Loading nếu Firebase Auth đang kiểm tra phiên làm việc
    if (isLoading) {
         return (
             <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                 <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
             </div>
         );
    }

    // Nếu chưa đăng nhập và cũng chưa bật chế độ Demo -> Bắt buộc ở màn Login
    if (!user && !isDemoMode) {
        return <LoginView />;
    }

    // Hiển thị màn hình thông tin chờ duyệt hoặc form đăng ký cho user mới
    if (user?.status === 'pending') {
        return <PendingApprovalView />;
    }

    // Bắt buộc nhập mã kho cho tất cả user đã approved (trừ admin/demo)
    if (user && !isDemoMode && userRole !== 'admin' && (!departmentId || departmentId.trim() === '')) {
        return <PendingApprovalView forceDeptUpdate />;
    }

    return (
        <div className="flex h-[100dvh] bg-slate-50 dark:bg-slate-900 transition-colors duration-500 lg:pl-[80px] overflow-hidden">
            <Sidebar />
            <MobileBottomNav />
            <div className="flex-grow flex flex-col min-w-0 w-full relative overflow-hidden">

                {/* Mobile Top Bar - Hidden in Desktop View */}
                <div className="lg:hidden sticky top-0 z-[100] bg-white dark:bg-slate-900 flex items-center justify-between px-3 py-2 shadow-sm pt-[env(safe-area-inset-top,6px)]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md shadow-indigo-300/30 dark:shadow-indigo-900/30">
                            {getTabIcon()}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-white text-sm tracking-tight leading-none">{titleData.main} {titleData.highlight}</span>
                            <span id="mobile-topbar-subtitle" className="text-[9px] font-medium text-slate-400 dark:text-slate-500 mt-0.5"></span>
                        </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <div id="mobile-topbar-actions" className="flex items-center"></div>
                        <NotificationDropdown />
                    </div>
                </div>

                <main className="flex-grow flex flex-col bg-slate-50/50 dark:bg-slate-950/20 relative overflow-hidden">
                    {/* Thêm Banner thông báo Đơn chờ duyệt */}
                    <PendingApprovalBanner />

                    {/* Global Page Header */}
                    <div className="hidden lg:block lg:sticky lg:top-0 z-40 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md px-3 sm:px-6 lg:px-8 pt-1 lg:pt-6 pb-1 lg:pb-2 lg:border-b border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center justify-end lg:justify-between gap-4 w-full flex-wrap">
                            <div className="hidden lg:flex items-center gap-4 shrink-0">
                                <div className="h-10 w-1.5 bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)]" />
                                <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                                    {titleData.main} <span className="text-indigo-600 dark:text-indigo-400">{titleData.highlight}</span>
                                </h1>
                            </div>
                            <div id="global-header-actions" className="flex items-center z-50 overflow-x-auto no-scrollbar flex-1 justify-end pb-1 lg:pb-0"></div>
                        </div>
                    </div>

                    {/* Desktop Notification Center has been moved into the Header component to prevent layout overlap */}
                    
                    <div className={`w-full relative flex-grow min-h-0 pb-20 lg:pb-0 ${['reports', 'tools-print-sticker', 'tools-audit', 'tools-phanca', 'check-thuong'].includes(activeTab) ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
                        <ErrorBoundary name="MainContent">
                            <Suspense fallback={
                                <div className="flex items-center justify-center min-h-[50vh]">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-sm font-medium text-slate-500 animate-pulse">Đang tải biểu mẫu phân tích...</p>
                                    </div>
                                </div>
                            }>
                                <TabContent />
                            </Suspense>
                        </ErrorBoundary>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <LayoutProvider>
                <ErrorBoundary name="App_Root">
                    <AppContent />
                    <Toaster position="bottom-right" containerStyle={{ zIndex: 999999 }} />
                </ErrorBoundary>
            </LayoutProvider>
        </AuthProvider>
    );
}
