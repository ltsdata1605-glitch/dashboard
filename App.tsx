
import React, { Suspense, lazy } from 'react';
import { LayoutProvider, useLayout } from './contexts/LayoutContext';
import Sidebar from './components/layout/Sidebar';

const DashboardView = lazy(() => import('./components/views/DashboardView'));
const CheckThuongView = lazy(() => import('./components/views/CheckThuongView'));
const ExternalToolView = lazy(() => import('./components/views/ExternalToolView'));

function AppContent() {
    const { activeTab } = useLayout();

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-500 overflow-hidden font-sans">
            <Sidebar />
            
            <div className="flex-grow flex flex-col min-w-0 h-screen overflow-hidden relative">
                
                <main className="flex-grow overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="w-full h-full relative">
                        <Suspense fallback={
                            <div className="flex items-center justify-center h-full">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-sm font-medium text-slate-500 animate-pulse">Đang tải dữ liệu...</p>
                                </div>
                            </div>
                        }>
                            {/* Persistent Views to avoid re-loading data */}
                            <div className={activeTab === 'analysis' ? 'block h-full' : 'hidden'}>
                                <DashboardView />
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
                            {!['analysis', 'check-thuong', 'tools-coupon', 'tools-tax', 'tools-sticker', 'tools-audit'].includes(activeTab) && (
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
        <LayoutProvider>
            <AppContent />
        </LayoutProvider>
    );
}
