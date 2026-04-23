import React, { Suspense, lazy } from 'react';
import { LayoutProvider, useLayout, useActiveTab } from './contexts/LayoutContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Sidebar from './components/layout/Sidebar';
import MobileBottomNav from './components/layout/MobileBottomNav';
import { getGlobalFont } from './services/dbService';

const DashboardView = lazy(() => import('./components/views/DashboardView'));
const CheckThuongView = lazy(() => import('./components/views/CheckThuongView'));
const ExternalToolView = lazy(() => import('./components/views/ExternalToolView'));
const UserManagementView = lazy(() => import('./components/views/UserManagementView'));
const SettingsView = lazy(() => import('./components/views/SettingsView'));
const AboutView = lazy(() => import('./components/views/AboutView'));

// BI Module Wrapper
const BiWrapper = lazy(() => import('./bi-module/components/BiWrapper'));

import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginView from './components/views/LoginView';
import PendingApprovalView from './components/views/PendingApprovalView';
import { Toaster } from 'react-hot-toast';
import NotificationDropdown from './components/layout/NotificationDropdown';
import PendingApprovalBanner from './components/layout/PendingApprovalBanner';

/**
 * TabContent — Isolated component that handles tab switching.
 * Only this component re-renders when activeTab changes,
 * keeping the top bar / bottom nav responsive.
 */
const TabContent = React.memo(() => {
    const { activeTab } = useActiveTab();

    const memoDashboardView = React.useMemo(() => <DashboardView />, []);
    const memoUserManagementView = React.useMemo(() => <UserManagementView />, []);
    const memoSettingsView = React.useMemo(() => <SettingsView />, []);
    const memoPendingApprovalView = React.useMemo(() => <PendingApprovalView />, []);
    const memoAboutView = React.useMemo(() => <AboutView />, []);
    const memoCheckThuongView = React.useMemo(() => <CheckThuongView />, []);
    const memoBiWrapper = React.useMemo(() => <BiWrapper />, []);

    return (
        <>
            {/* Persistent Views to avoid re-loading data */}
            <div className={activeTab === 'analysis' ? 'block' : 'hidden'}>
                {memoDashboardView}
            </div>

            <div className={activeTab === 'approval' ? 'block w-full' : 'hidden'}>
                {memoUserManagementView}
            </div>

            <div className={activeTab === 'settings' ? 'block w-full' : 'hidden'}>
                {memoSettingsView}
            </div>

            <div className={activeTab === 'pending-approval' ? 'block w-full' : 'hidden'}>
                {memoPendingApprovalView}
            </div>

            <div className={activeTab === 'help' ? 'block w-full' : 'hidden'}>
                {memoAboutView}
            </div>
            
            <div className={activeTab === 'check-thuong' ? 'block' : 'hidden'}>
                {memoCheckThuongView}
            </div>

            {activeTab === 'tools-coupon' && (
                <div className="block">
                    <ExternalToolView url="https://chuy-n-i-coupon-487587635482.us-west1.run.app" title="Chuyển đổi Coupon" />
                </div>
            )}

            {activeTab === 'tools-tax' && (
                <div className="block">
                    <ExternalToolView url="https://tinhthue-netify-487587635482.us-west1.run.app" title="Tính thuế nhận thưởng" />
                </div>
            )}

            {activeTab === 'tools-sticker' && (
                <div className="block">
                    <ExternalToolView url="https://stickerevent-final-487587635482.us-west1.run.app" title="Sticker Event" />
                </div>
            )}

            {activeTab === 'tools-audit' && (
                <div className="block">
                    <ExternalToolView url="https://kiemquy-final-487587635482.us-west1.run.app" title="Kiểm quỹ" />
                </div>
            )}

            <div className={activeTab === 'employees' ? 'block w-full' : 'hidden'}>
                {memoBiWrapper}
            </div>

            {/* Fallback for other tabs */}
            {!['analysis', 'approval', 'settings', 'help', 'pending-approval', 'check-thuong', 'tools-coupon', 'tools-tax', 'tools-sticker', 'tools-audit', 'employees'].includes(activeTab) && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
                    <p className="text-lg font-medium">Tính năng đang được phát triển</p>
                    <p className="text-sm">Vui lòng quay lại sau</p>
                </div>
            )}
        </>
    );
});
TabContent.displayName = 'TabContent';

function AppContent() {
    const { isDarkMode, toggleDarkMode } = useLayout();
    const { user, userRole, isDemoMode, isLoading } = useAuth();

    // Smart greeting based on time of day
    const greeting = React.useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Chào buổi sáng \u2600\uFE0F';
        if (hour < 18) return 'Chào buổi chiều \ud83c\udf05';
        return 'Chào buổi tối \ud83c\udf19';
    }, []);

    React.useEffect(() => {
        getGlobalFont().then(font => {
            if (font && font !== 'Inter') {
                document.body.style.fontFamily = `'${font}', sans-serif`;
            } else {
                document.body.style.fontFamily = ''; // Reset to default
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

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-500 lg:pl-[80px]">
            <Sidebar />
            <MobileBottomNav />
            <div className="flex-grow flex flex-col min-w-0 w-full relative">

                {/* Mobile Top Bar - Hidden in Desktop View */}
                <div className="lg:hidden sticky top-0 z-[100] bg-white dark:bg-slate-900 border-b border-transparent topbar-gradient-border flex items-center justify-between px-3 py-2 shadow-sm pt-[env(safe-area-inset-top,6px)]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md shadow-indigo-300/30 dark:shadow-indigo-900/30">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-white text-sm tracking-tight leading-none">Báo Cáo YCX</span>
                            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">{greeting}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <NotificationDropdown />
                    </div>
                </div>

                <main className="flex-grow flex flex-col bg-slate-50/50 dark:bg-slate-950/20 relative">
                    {/* Thêm Banner thông báo Đơn chờ duyệt */}
                    <PendingApprovalBanner />

                    {/* Desktop Notification Center */}
                    <div className="hidden lg:block absolute top-[19px] right-6 z-[200]">
                        <NotificationDropdown />
                    </div>
                    
                    <div className="w-full relative">
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
                    <Toaster position="bottom-right" />
                </ErrorBoundary>
            </LayoutProvider>
        </AuthProvider>
    );
}
