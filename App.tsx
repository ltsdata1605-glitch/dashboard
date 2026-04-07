import React, { Suspense, lazy } from 'react';
import { LayoutProvider, useLayout } from './contexts/LayoutContext';
import Sidebar from './components/layout/Sidebar';
import { Menu, Moon, Sun } from 'lucide-react';
import { getGlobalFont } from './services/dbService';

const DashboardView = lazy(() => import('./components/views/DashboardView'));
const CheckThuongView = lazy(() => import('./components/views/CheckThuongView'));
const ExternalToolView = lazy(() => import('./components/views/ExternalToolView'));
const UserManagementView = lazy(() => import('./components/views/UserManagementView'));
const SettingsView = lazy(() => import('./components/views/SettingsView'));
const AboutView = lazy(() => import('./components/views/AboutView'));

import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginView from './components/views/LoginView';
import PendingApprovalView from './components/views/PendingApprovalView';
import { Toaster } from 'react-hot-toast';
import NotificationDropdown from './components/layout/NotificationDropdown';

function AppContent() {
    const { activeTab, setIsMobileSidebarOpen, isDarkMode, toggleDarkMode } = useLayout();
    const { user, userRole, isDemoMode, isLoading } = useAuth();

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
    if (user && userRole === 'pending' && !isDemoMode) {
        return <PendingApprovalView />;
    }

    return (
        <div className="flex min-h-[100dvh] bg-slate-50 dark:bg-slate-900 transition-colors duration-500 lg:pl-[80px]">
            <Sidebar />
            
            <div className="flex-grow flex flex-col min-w-0 h-[100dvh] relative overflow-hidden">

                {/* Mobile Top Bar - Hidden in Desktop View */}
                <div className="lg:hidden sticky top-0 z-[100] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 py-3 sm:py-4 shadow-sm pt-[env(safe-area-inset-top,12px)]">
                    <button
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="p-3 -ml-2 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
                        aria-label="Open Menu"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-white text-base tracking-tight">Phân Tích Yêu Cầu Xuất</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                    </div>
                    <div className="flex items-center gap-1">
                        <NotificationDropdown />
                        <button
                            onClick={toggleDarkMode}
                            className="p-3 -mr-2 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
                            aria-label="Toggle Dark Mode"
                        >
                            {isDarkMode ? <Sun size={22} className="text-amber-500" /> : <Moon size={22} />}
                        </button>
                    </div>
                </div>

                <main className="flex-grow overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20 relative">
                    {/* Desktop Notification Center */}
                    <div className="hidden lg:block absolute top-[19px] right-6 z-[200]">
                        <NotificationDropdown />
                    </div>
                    
                    <div className="w-full h-full relative">
                        <Suspense fallback={
                            <div className="flex items-center justify-center h-full">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-sm font-medium text-slate-500 animate-pulse">Đang tải biểu mẫu phân tích...</p>
                                </div>
                            </div>
                        }>
                            {/* Persistent Views to avoid re-loading data */}
                            <div className={activeTab === 'analysis' ? 'block h-full' : 'hidden'}>
                                <DashboardView />
                            </div>

                            <div className={activeTab === 'approval' ? 'block w-full h-full' : 'hidden'}>
                                <UserManagementView />
                            </div>

                            <div className={activeTab === 'settings' ? 'block w-full h-full' : 'hidden'}>
                                <SettingsView />
                            </div>

                            <div className={activeTab === 'pending-approval' ? 'block w-full h-full' : 'hidden'}>
                                <PendingApprovalView />
                            </div>

                            <div className={activeTab === 'help' ? 'block w-full h-full' : 'hidden'}>
                                <AboutView />
                            </div>
                            
                            <div className={activeTab === 'check-thuong' ? 'block h-full' : 'hidden'}>
                                <CheckThuongView />
                            </div>

                            <div className={activeTab === 'tools-coupon' ? 'block h-full' : 'hidden'}>
                                <ExternalToolView url="https://chuy-n-i-coupon-487587635482.us-west1.run.app" title="Chuyển đổi Coupon" />
                            </div>

                            <div className={activeTab === 'tools-tax' ? 'block h-full' : 'hidden'}>
                                <ExternalToolView url="https://tinhthue-netify-487587635482.us-west1.run.app" title="Tính thuế nhận thưởng" />
                            </div>

                            <div className={activeTab === 'tools-sticker' ? 'block h-full' : 'hidden'}>
                                <ExternalToolView url="https://stickerevent-final-487587635482.us-west1.run.app" title="Sticker Event" />
                            </div>

                            <div className={activeTab === 'tools-audit' ? 'block h-full' : 'hidden'}>
                                <ExternalToolView url="https://kiemquy-final-487587635482.us-west1.run.app" title="Kiểm quỹ" />
                            </div>

                            {/* Fallback for other tabs */}
                            {!['analysis', 'approval', 'settings', 'help', 'pending-approval', 'check-thuong', 'tools-coupon', 'tools-tax', 'tools-sticker', 'tools-audit'].includes(activeTab) && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <p className="text-lg font-medium">Tính năng đang được phát triển</p>
                                    <p className="text-sm">Vui lòng quay lại sau</p>
                                </div>
                            )}
                        </Suspense>
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
                <AppContent />
                <Toaster position="bottom-right" />
            </LayoutProvider>
        </AuthProvider>
    );
}
