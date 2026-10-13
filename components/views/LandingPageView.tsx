import React from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { EmptyState } from '../shared/ui/EmptyState';
import UploadSection from '../upload/UploadSection';
import { FileHistoryManager } from '../upload/FileHistoryManager';
import type { UploadedFileRegistryItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface LandingPageViewProps {
    onProcessFile: (files: File[]) => void;
    configUrl: string;
    onConfigUrlChange: (url: string) => void;
    registry?: UploadedFileRegistryItem[];
    onToggleActive?: (id: string) => Promise<void> | void;
    onDelete?: (id: string) => Promise<void> | void;
    onRename?: (id: string, newFilename: string) => Promise<void> | void;
    onViewReport?: () => void;
}

const LandingPageView: React.FC<LandingPageViewProps> = ({
    onProcessFile,
    configUrl,
    onConfigUrlChange,
    registry = [],
    onToggleActive = () => {},
    onDelete = () => {},
    onRename,
    onViewReport = () => {}
}) => {
    // Nhân viên chỉ xem dữ liệu thừa kế từ quản lý Kho (implementation_plan.md mục 37) —
    // không còn tự tải file/quản lý lịch sử tệp riêng nữa.
    const { userRole } = useAuth();
    const canManageFiles = userRole === 'admin' || userRole === 'manager';

    return (
        <div className="relative min-h-[calc(100vh-120px)] flex flex-col justify-center items-center overflow-hidden font-sans bg-[#F8FAFC] dark:bg-[#0B0F19] selection:bg-sky-500/20 selection:text-sky-700 pb-8">
            
            {/* Ambient Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

            {/* A22 (2026-09-30, chủ dự án duyệt): ĐÃ BỎ 3 quầng sáng blur 100px nhấp nháy vô hạn
                (animate-pulse) và quầng sáng khi rê chuột — trang trí thuần, tốn GPU/pin trên máy siêu thị
                và iPhone. Chuẩn "Bảng điều khiển ca trực": không trang trí khối tĩnh. */}

            <div className="relative z-10 w-full max-w-[1000px] px-6 flex flex-col items-center text-center mt-4">
                
                {/* Hero Typography */}
                <div className="mb-4">
                    <h1 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-3 drop-shadow-sm">
                        Dữ liệu phức tạp.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-rose-600 to-sky-600 dark:from-sky-400 dark:via-rose-400 dark:to-sky-400">Phân tích siêu tốc.</span>
                    </h1>
                    {/* Câu cũ "…không lưu trữ dữ liệu" KHÔNG đúng: dữ liệu bán hàng có đồng bộ lên tài khoản (users/{uid}/salesData)
                        để nhân viên cùng Kho xem được — bỏ lời hứa sai, chỉ nói điều đúng. */}
                    <p className="text-[13px] sm:text-[15px] leading-5 text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                        Chuyển hàng chục nghìn dòng Excel thành báo cáo quản trị đầy đủ.<br className="hidden sm:block"/>
                        {' '}Xử lý ngay trên trình duyệt, có kết quả sau vài giây.
                    </p>
                </div>

                {/* Main Action Area - Glass Card */}
                <div className="w-full max-w-2xl">
                    <div className="relative">
                        {/* Khung tải tệp: panel phẳng — viền mảnh, bo 6px, không kính mờ/đổ bóng (A22) */}
                        <div className="relative">
                            <div className="bg-white rounded-md overflow-hidden border border-slate-200 p-5">
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
                                                onRename={onRename}
                                                onViewReport={onViewReport}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <EmptyState
                                        icon="clock"
                                        title="Đang chờ dữ liệu từ quản lý Kho"
                                        description="Doanh số của Kho tự hiện ngay khi quản lý cập nhật. Bạn không cần tự tải tệp lên."
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dòng cam kết — lỗi #25 (video v1:013): trước là tiếng Anh "Local Processing • Instant Speed • Smart UI". */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <AppIcon name="securityOk" size="sm" className="text-slate-400" />
                        <span className="text-[12px] font-medium">Xử lý trên máy</span>
                    </span>
                    <span aria-hidden="true" className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="flex items-center gap-1.5">
                        <AppIcon name="quick" size="sm" className="text-slate-400" />
                        <span className="text-[12px] font-medium">Tức thì</span>
                    </span>
                    <span aria-hidden="true" className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="flex items-center gap-1.5">
                        <AppIcon name="sparkles" size="sm" className="text-slate-400" />
                        <span className="text-[12px] font-medium">Gọn gàng</span>
                    </span>
                </div>

            </div>
        </div>
    );
};

export default LandingPageView;
