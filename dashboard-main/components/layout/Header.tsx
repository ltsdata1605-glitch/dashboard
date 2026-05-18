
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../common/Icon';
import { motion, AnimatePresence } from 'motion/react';
import ModalWrapper from '../modals/ModalWrapper';
import EmployeeManagerModal from '../modals/EmployeeManagerModal';
import DriveHistoryModal from '../modals/DriveHistoryModal';
import FontSelector from './FontSelector';
import NotificationDropdown from './NotificationDropdown';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { useCloudSync } from '../../hooks/useCloudSync';
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
    onSelectHistoryFile 
}) => {
    const { user, isDemoMode, userRole } = useAuth();
    const context = useDashboardContext();
    const [deptClearSuccess, setDeptClearSuccess] = useState(false);
    const [showInstructionModal, setShowInstructionModal] = useState(false);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [showDriveHistory, setShowDriveHistory] = useState(false);
    const { syncState, lastError } = useCloudSync();
    const { activeTab } = useActiveTab();

    // Prevent hydration warnings
    const [mounted, setMounted] = useState(false);
    const hasPromptedDrive = useRef(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (user && context.appState === 'upload' && !hasPromptedDrive.current && (userRole === 'admin' || userRole === 'manager')) {
            hasPromptedDrive.current = true;
            
            const token = sessionStorage.getItem('googleOAuthToken');
            if (token) {
                // Fetch list silently, only show auto-prompt if there are files
                import('../../services/googleDriveService').then(({ listDriveFiles }) => {
                    listDriveFiles(token).then(files => {
                        if (files && files.length > 0) {
                            setTimeout(() => {
                                 setShowDriveHistory(true);
                            }, 800);
                        }
                    }).catch(error => {
                        console.warn('Silent check drive files failed:', error);
                    });
                });
            }
            // If no token, we just skip the auto-prompt.
        }
    }, [user, context.appState, userRole]);

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
                    className="w-full bg-red-500 text-white text-xs font-bold py-1.5 px-4 flex items-center justify-between cursor-pointer overflow-hidden relative mb-2 rounded-lg shadow-sm"
                    onClick={() => setShowDriveHistory(true)}
                >
                    <div className="flex-1 overflow-hidden whitespace-nowrap">
                        <div className="inline-block animate-marquee pl-[100%]">
                            ⚠️ Đồng bộ dữ liệu thất bại: {lastError || "Lỗi lưu trữ đám mây. Dữ liệu tạm thời được lưu trên máy."} - Vui lòng click để mở Lịch Sử trên Mây.
                        </div>
                    </div>
                </div>
            )}
            {/* Portal timestamp into mobile top bar subtitle */}
            {mounted && fileInfo && document.getElementById('mobile-topbar-subtitle') && createPortal(
                <>📅 Cập nhật: {fileInfo.savedAt}</>,
                document.getElementById('mobile-topbar-subtitle')!
            )}

            {/* Portal action buttons into mobile top bar */}
            {mounted && fileInfo && (userRole === 'admin' || userRole === 'manager') && document.getElementById('mobile-topbar-actions') && createPortal(
                <>
                    <button
                        onClick={onLoadShiftFile}
                        className="flex items-center justify-center w-8 h-8 text-blue-600 dark:text-blue-400 rounded-lg transition-all active:scale-95"
                        title="Tải DS Nhân viên"
                    >
                        <Icon name="users-round" size={4.5} />
                    </button>
                    <a
                        href="#"
                        onClick={handleExternalLinkClick}
                        className="flex items-center justify-center w-8 h-8 text-slate-400 dark:text-slate-500 rounded-lg transition-all active:scale-95"
                        title="Mở trang quản lý phân ca"
                    >
                        <Icon name="calendar-clock" size={4.5} />
                    </a>
                    <button
                        onClick={() => setShowDriveHistory(true)}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all active:scale-95 ${syncState === 'error' ? 'text-red-500 animate-pulse' : 'text-slate-400 dark:text-slate-500'}`}
                        title="Lịch sử đám mây"
                    >
                        <Icon name={syncState === 'error' ? 'bell-ring' : 'cloud-cog'} size={4.5} />
                    </button>
                </>,
                document.getElementById('mobile-topbar-actions')!
            )}

        {/* Desktop: Full inline toolbar ported to Global Header */}
        {mounted && document.getElementById('global-header-actions') && createPortal(
            <div className="hidden lg:flex flex-wrap items-center gap-4 w-auto bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm">
                {/* Shift Management Group */}
                {(userRole === 'admin' || userRole === 'manager') && (
                <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
                    <button 
                        onClick={onLoadShiftFile}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold text-sm transition-colors"
                        title="Tải lên báo cáo Phân ca"
                    >
                        <Icon name="users-round" size={4} />
                        <span>Nhân Viên</span>
                    </button>
                    
                    {hasDepartmentData && (
                        <div className="flex items-center border-l border-slate-100 dark:border-slate-700">
                            <button 
                                onClick={() => setShowEmployeeModal(true)}
                                className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                                title="Quản lý danh sách nhân viên"
                            >
                                <Icon name="settings" size={4} />
                            </button>
                        </div>
                    )}
                    
                    <div className="flex items-center border-l border-slate-100 dark:border-slate-700">
                        <a 
                            href="#" 
                            onClick={handleExternalLinkClick}
                            className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
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
                <div className="flex items-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
                    {(userRole === 'admin' || userRole === 'manager') && (
                        <>
                            <button 
                                onClick={onNewFile}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-semibold text-sm transition-colors rounded-l-full"
                                title="Tải lên báo cáo YCX mới"
                            >
                                <Icon name="file-up" size={4} />
                                <span>UpFile YCX</span>
                            </button>
                            
                            <button 
                                onClick={() => setShowDriveHistory(true)}
                                className={`flex items-center p-2 border-l border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors tooltip ${syncState === 'error' ? 'text-red-500 animate-pulse' : 'text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400'}`}
                                title="Lịch sử dữ liệu (Mây)"
                            >
                                <Icon name={syncState === 'error' ? 'bell-ring' : 'cloud-cog'} size={4} className={syncState === 'error' ? "animate-bounce" : ""} />
                                {syncState === 'error' && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping"></span>
                                )}
                            </button>
                        </>
                    )}
                    <a 
                        href="https://report.mwgroup.vn/home/dashboard/77"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center p-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 border-l border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${(userRole !== 'admin' && userRole !== 'manager') ? 'rounded-l-full' : ''}`}
                        title="Tải dữ liệu báo cáo"
                    >
                        <Icon name="link" size={4} />
                    </a>

                    <div className="border-l border-slate-100 dark:border-slate-700">
                        <FontSelector />
                    </div>
                    
                    <div className="border-l border-slate-100 dark:border-slate-700 flex items-center rounded-r-full">
                        <NotificationDropdown buttonClassName="relative flex items-center justify-center p-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors rounded-r-full" />
                    </div>
                </div>
            </div>,
            document.getElementById('global-header-actions')!
        )}

            {/* Instruction Modal */}
            <ModalWrapper
                isOpen={showInstructionModal}
                onClose={() => setShowInstructionModal(false)}
                title="Hướng Dẫn Nhập DS Nhân Viên"
                subTitle="Thao tác trên Hệ thống BCNB"
                titleColorClass="text-blue-600 dark:text-blue-400"
                maxWidthClass="max-w-md"
            >
                <div className="p-3 sm:p-6">
                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 sm:space-y-4">
                        <p><strong>Bước 1:</strong> Nếu chưa đăng nhập BCNB thì hãy đăng nhập hệ thống.</p>
                        <p><strong>Bước 2:</strong> Click vào "Đã Hiểu & Tiếp Tục" &gt; Chọn siêu thị &gt; Xem &gt; Tùy chọn "Xuất excel".</p>
                        <p><em>(Nếu cụm có nhiều siêu thị, hãy lặp lại việc xuất cho từng siêu thị)</em></p>
                        <p><strong>Bước 3:</strong> Quay lại Dashboard &gt; Click "DS Nhân Viên" &gt; Tải lên tất cả file excel bạn vừa tải về.</p>
                    </div>
                    <div className="mt-4 sm:mt-8 flex justify-end gap-2 sm:gap-3">
                        <button onClick={() => setShowInstructionModal(false)} className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors font-semibold">
                            Hủy
                        </button>
                        <button onClick={proceedToExternalLink} className="px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm transition-colors font-semibold">
                            Đã Hiểu & Tiếp Tục
                        </button>
                    </div>
                </div>
            </ModalWrapper>

            {/* Employee Manager Modal */}
            <EmployeeManagerModal 
                isOpen={showEmployeeModal} 
                onClose={() => setShowEmployeeModal(false)} 
            />

            {/* Drive History Modal */}
            {onSelectHistoryFile && (
                <DriveHistoryModal
                    isOpen={showDriveHistory}
                    onClose={() => setShowDriveHistory(false)}
                    onSelectFile={(files) => onSelectHistoryFile && onSelectHistoryFile(files)}
                />
            )}
        </>
    );
};

export default Header;
