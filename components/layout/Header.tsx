
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../common/Icon';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '../shared/ui/Modal';
import EmployeeManagerModal from '../modals/EmployeeManagerModal';
import { Button } from '../shared/ui/Button';

import FontSelector from './FontSelector';
import NotificationDropdown from './NotificationDropdown';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { useSync } from '../../contexts/SyncContext';
import { useActiveTab } from '../../contexts/LayoutContext';

interface HeaderProps {
    onNewFile: () => void;
    onLoadShiftFile: () => void;
    onClearDepartments: () => void;
    isClearingDepartments: boolean;
    hasDepartmentData: boolean;
    showNewFileButton: boolean;
    fileInfo: { filename: string; savedAt: string } | null;
    onToggleFilters?: () => void;
    onSelectHistoryFile?: (files: File[]) => void;
    onOpenHistory?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onNewFile, 
    onLoadShiftFile, 
    onClearDepartments, 
    isClearingDepartments, 
    hasDepartmentData, 
    showNewFileButton, 
    fileInfo, 
    onToggleFilters,
    onSelectHistoryFile,
    onOpenHistory
}) => {
    const { user, isDemoMode, userRole } = useAuth();
    const context = useDashboardContext();
    const [deptClearSuccess, setDeptClearSuccess] = useState(false);
    const [showInstructionModal, setShowInstructionModal] = useState(false);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const { syncState, lastError } = useSync();
    const { activeTab } = useActiveTab();

    // Prevent hydration warnings
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);



    const handleExternalLinkClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowInstructionModal(true);
    };

    const proceedToExternalLink = () => {
        setShowInstructionModal(false);
        window.open("https://office.thegioididong.com/quan-ly-phan-ca", "_blank");
    };

    const handleDeptClear = () => {
        onClearDepartments();
        setDeptClearSuccess(true);
        setTimeout(() => setDeptClearSuccess(false), 3000);
    };

    if (activeTab !== 'analysis') return null;
    
    return (
        <>
            {syncState === 'error' && (
                <div 
                    className="w-full bg-rose-500 text-white text-xs font-bold py-1.5 px-4 flex items-center justify-between overflow-hidden relative mb-2 rounded-lg shadow-sm"
                >
                    <div className="flex-1 overflow-hidden relative h-5 flex items-center">
                        <div className="absolute whitespace-nowrap animate-marquee will-change-transform">
                            ⚠️ Đồng bộ dữ liệu thất bại: {lastError || "Lỗi lưu trữ đám mây. Dữ liệu tạm thời được lưu trên máy."}
                        </div>
                    </div>
                </div>
            )}
            {/* Portal timestamp into mobile top bar subtitle */}
            {mounted && fileInfo && document.getElementById('mobile-topbar-subtitle') && createPortal(
                <>📅 Cập nhật: {fileInfo.savedAt}</>,
                document.getElementById('mobile-topbar-subtitle')!
            )}
            {/* Note: Mobile actions are now rendered directly via FilterBar portal, so we bypass mobile-topbar-actions here. */}

        {/* Desktop: Full inline toolbar ported to Global Header */}
        {mounted && document.getElementById('global-header-actions') && createPortal(
            <div className="hidden lg:flex flex-wrap items-center gap-4 w-auto bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm">
                {/* Shift Management Group */}
                {(userRole === 'admin' || userRole === 'manager') && (
                <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <Button
                        variant="unstyled" size="none"
                        onClick={onLoadShiftFile}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-50/50 hover:bg-sky-100 dark:bg-sky-900/20 dark:hover:bg-sky-900/40 text-sky-600 dark:text-sky-400 font-semibold text-sm transition-colors"
                        title="Tải lên báo cáo Phân ca"
                    >
                        <Icon name="users-round" size={4} />
                        <span>Nhân Viên</span>
                    </Button>
                    
                    {hasDepartmentData && (
                        <div className="flex items-center border-l border-slate-100 dark:border-slate-700">
                            <Button
                                variant="unstyled" size="none"
                                onClick={() => setShowEmployeeModal(true)}
                                className="p-2 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                                title="Quản lý danh sách nhân viên"
                            >
                                <Icon name="settings" size={4} />
                            </Button>
                        </div>
                    )}
                    
                    <div className="flex items-center border-l border-slate-100 dark:border-slate-700">
                        <a 
                            href="#" 
                            onClick={handleExternalLinkClick}
                            className="p-2 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                            title="Mở trang quản lý phân ca"
                        >
                            <Icon name="link" size={4} />
                        </a>
                        
                        <AnimatePresence mode="wait">
                            {hasDepartmentData && (
                                <motion.button
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 'auto', opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    onClick={handleDeptClear}
                                    disabled={isClearingDepartments}
                                    className={`p-2 transition-colors border-l border-slate-100 dark:border-slate-700 ${deptClearSuccess ? 'text-emerald-500' : 'text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-400 dark:hover:bg-rose-900/20'}`}
                                    title="Xóa dữ liệu phân ca"
                                >
                                    <Icon name={deptClearSuccess ? 'check' : (isClearingDepartments ? 'loader-2' : 'trash-2')} size={4} className={isClearingDepartments ? 'animate-spin' : ''} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                )}

                {/* Data Import Group */}
                <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    {(userRole === 'admin' || userRole === 'manager') && (
                        <>
                            <Button
                                variant="unstyled" size="none"
                                onClick={onNewFile}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-semibold text-sm transition-colors"
                                title="Tải lên báo cáo YCX mới (Realtime hoặc Lũy kế)"
                            >
                                <Icon name="upload" size={4} />
                                <span>File YCX</span>
                            </Button>
                            {onOpenHistory && (
                                <Button
                                    variant="unstyled" size="none"
                                    onClick={onOpenHistory}
                                    id="btn-desktop-history"
                                    title="Quản lý tệp đã lưu (Lũy kế)"
                                    className="flex items-center justify-center p-2 text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-l border-slate-100 dark:border-slate-700 transition-colors"
                                >
                                    <Icon name="database" size={4} />
                                </Button>
                            )}
                        </>
                    )}
                    <a 
                        href="https://report.mwgroup.vn/home/dashboard/77"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 border-l border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                        title="Tải dữ liệu báo cáo"
                    >
                        <Icon name="link" size={4} />
                    </a>

                    <div className="border-l border-slate-100 dark:border-slate-700">
                        <FontSelector />
                    </div>
                </div>
                
                {/* Settings Group - Standalone pill like Notification */}
                {onToggleFilters && (
                    <div className="flex items-center rounded-full bg-sky-500 hover:bg-sky-600 text-white shadow-sm transition-all active:scale-95">
                        <Button
                            variant="unstyled" size="none"
                            onClick={onToggleFilters}
                            title="Bộ lọc nâng cao / Tuỳ chỉnh"
                            className="flex items-center justify-center p-2 text-white rounded-full"
                        >
                            <Icon name="settings" size={4} />
                        </Button>
                    </div>
                )}

                {/* Notification Group */}
                <div className="flex items-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative z-[150]">
                    <NotificationDropdown buttonClassName="relative flex items-center justify-center p-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors rounded-full" />
                </div>
            </div>,
            document.getElementById('global-header-actions')!
        )}

            {/* Instruction Modal */}
            <Modal
                isOpen={showInstructionModal}
                onClose={() => setShowInstructionModal(false)}
                title="Hướng Dẫn Nhập DS Nhân Viên"
                subTitle="Thao tác trên Hệ thống BCNB"
                titleColorClass="text-sky-600 dark:text-sky-400"
                maxWidth="md"
                footer={
                    <div className="flex justify-end gap-2 sm:gap-3">
                        <Button variant="unstyled" size="none" onClick={() => setShowInstructionModal(false)} className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors font-semibold">
                            Hủy
                        </Button>
                        <Button variant="unstyled" size="none" onClick={proceedToExternalLink} className="px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm bg-sky-600 text-white hover:bg-sky-700 rounded-lg shadow-sm transition-colors font-semibold">
                            Đã Hiểu & Tiếp Tục
                        </Button>
                    </div>
                }
            >
                <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 sm:space-y-4">
                    <p><strong>Bước 1:</strong> Nếu chưa đăng nhập BCNB thì hãy đăng nhập hệ thống.</p>
                    <p><strong>Bước 2:</strong> Click vào "Đã Hiểu & Tiếp Tục" &gt; Chọn siêu thị &gt; Xem &gt; Tùy chọn "Xuất excel".</p>
                    <p><em>(Nếu cụm có nhiều siêu thị, hãy lặp lại việc xuất cho từng siêu thị)</em></p>
                    <p><strong>Bước 3:</strong> Quay lại Dashboard &gt; Click "DS Nhân Viên" &gt; Tải lên tất cả file excel bạn vừa tải về.</p>
                </div>
            </Modal>

            {/* Employee Manager Modal */}
            <EmployeeManagerModal 
                isOpen={showEmployeeModal} 
                onClose={() => setShowEmployeeModal(false)} 
            />

        </>
    );
};

export default Header;
