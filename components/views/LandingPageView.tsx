import React from 'react';
import UploadSection from '../upload/UploadSection';
import { FileHistoryManager } from '../upload/FileHistoryManager';
import { Icon } from '../common/Icon';
import type { UploadedFileRegistryItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface LandingPageViewProps {
    onProcessFile: (files: File[]) => void;
    configUrl: string;
    onConfigUrlChange: (url: string) => void;
    registry?: UploadedFileRegistryItem[];
    onToggleActive?: (id: string) => Promise<void> | void;
    onDelete?: (id: string) => Promise<void> | void;
    onViewReport?: () => void;
}

const LandingPageView: React.FC<LandingPageViewProps> = ({
    onProcessFile,
    configUrl,
    onConfigUrlChange,
    registry = [],
    onToggleActive = () => {},
    onDelete = () => {},
    onViewReport = () => {}
}) => {
    // Nhân viên chỉ xem dữ liệu thừa kế từ quản lý Kho (implementation_plan.md mục 37) —
    // không còn tự tải file/quản lý lịch sử tệp riêng nữa.
    const { userRole } = useAuth();
    const canManageFiles = userRole === 'admin' || userRole === 'manager';

    return (
        <div className="relative min-h-[calc(100vh-120px)] flex flex-col justify-center items-center overflow-hidden font-sans bg-[#F8FAFC] dark:bg-[#0B0F19] selection:bg-indigo-500/20 selection:text-indigo-600 pb-8">
            
            {/* Ambient Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

            {/* Animated Glow Orbs */}
            <div className="absolute top-[10%] left-[20%] w-[200px] h-[200px] bg-indigo-500/30 dark:bg-indigo-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-60 animate-pulse pointer-events-none"></div>
            <div className="absolute top-[10%] right-[20%] w-[200px] h-[200px] bg-rose-500/30 dark:bg-rose-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-60 animate-pulse [animation-delay:2s] pointer-events-none"></div>
            <div className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[250px] h-[250px] bg-sky-500/30 dark:bg-sky-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-60 animate-pulse [animation-delay:4s] pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-[1000px] px-6 flex flex-col items-center text-center mt-4">
                
                {/* Hero Typography */}
                <div className="mb-4">
                    <h1 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-3 drop-shadow-sm">
                        Dữ liệu phức tạp.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-rose-600 to-sky-600 dark:from-indigo-400 dark:via-rose-400 dark:to-sky-400">Phân tích siêu tốc.</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-medium leading-relaxed tracking-tight">
                        Chuyển đổi tức thì hàng chục ngàn dòng Excel thành báo cáo quản trị toàn diện.<br className="hidden sm:block"/>
                        Xử lý cục bộ trực tiếp trên trình duyệt, không lưu trữ dữ liệu.
                    </p>
                </div>

                {/* Main Action Area - Glass Card */}
                <div className="w-full max-w-2xl">
                    <div className="relative group">
                        {/* Glow effect behind */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/40 via-rose-500/40 to-sky-500/40 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                        
                        <div className="relative bg-white/70 dark:bg-[#111827]/70 backdrop-blur-3xl rounded-[24px] p-1.5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)] ring-1 ring-white dark:ring-white/10">
                            <div className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl rounded-[20px] overflow-hidden border border-slate-100 dark:border-white/5 p-5">
                                {canManageFiles ? (
                                    <>
                                        <UploadSection
                                            onProcessFile={onProcessFile}
                                            configUrl={configUrl}
                                            onConfigUrlChange={onConfigUrlChange}
                                        />
                                        {registry.length > 0 && (
                                            <FileHistoryManager
                                                registry={registry}
                                                onToggleActive={onToggleActive}
                                                onDelete={onDelete}
                                                onViewReport={onViewReport}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center text-center py-10 px-4">
                                        <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
                                            <Icon name="clock" size={6} />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Đang chờ dữ liệu từ Quản lý Kho</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                                            Dữ liệu doanh số của Kho sẽ tự động hiển thị ngay khi Quản lý cập nhật. Bạn không cần tự tải tệp lên.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer / Trust Indicators */}
                <div className="mt-6 flex items-center justify-center gap-6 text-center">
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <Icon name="shield-check" size={3.5} />
                        <span className="text-[10px] font-semibold text-slate-500">Local Processing</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <Icon name="zap" size={3.5} />
                        <span className="text-[10px] font-semibold text-slate-500">Instant Speed</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <Icon name="sparkles" size={3.5} />
                        <span className="text-[10px] font-semibold text-slate-500">Smart UI</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LandingPageView;
