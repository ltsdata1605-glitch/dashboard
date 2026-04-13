
import React, { useState, useEffect, useRef } from 'react';
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

    // Prevent hydration warnings
    const [mounted, setMounted] = useState(false);
    const hasPromptedDrive = useRef(false);

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
            <header className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 lg:gap-6 mb-3 lg:mb-5 pb-3 lg:pb-5 border-b border-slate-200/60 dark:border-slate-800/60">
            {/* Title Section — Hidden on mobile (top bar shows app name) */}
            <div className="hidden lg:flex flex-col gap-1">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-1.5 bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)]" />
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                        Báo Cáo <span className="text-indigo-600 dark:text-indigo-400">YCX</span>
                    </h1>
                </div>
                
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 pl-5 mt-1">
                    <Icon name="calendar-days" size={3.5} className="opacity-60" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
                        {fileInfo ? (
                            <>Cập nhật: <span className="text-slate-700 dark:text-slate-300 font-extrabold">{fileInfo.savedAt}</span></>
                        ) : (
                            "Dữ liệu thời gian thực"
                        )}
                    </span>
                </div>
            </div>
            {/* Mobile: Compact file info line */}
            {fileInfo && (
                <div className="lg:hidden flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <Icon name="calendar-days" size={3} className="opacity-60" />
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                        Cập nhật: <span className="text-slate-600 dark:text-slate-300 font-extrabold">{fileInfo.savedAt}</span>
                    </span>
                </div>
            )}

            {showNewFileButton && (
                <>
                    {/* Desktop: Full inline toolbar */}
                    <div className="hidden lg:flex flex-wrap items-center gap-3 w-auto bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800/50 backdrop-blur-sm">
                        {/* Shift Management Group */}
                        {(userRole === 'admin' || userRole === 'manager') && (
                        <div className="flex items-center shadow-sm rounded-xl overflow-hidden border border-blue-100 dark:border-blue-900/30">
                            <button 
                                onClick={onLoadShiftFile}
                                className="flex items-center gap-2.5 px-3.5 py-2.5 bg-blue-50/80 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all active:scale-95"
                                title="Tải lên báo cáo Phân ca"
                            >
                                <Icon name="users-round" size={5} />
                                <span>DS Nhân Viên</span>
                            </button>
                            
                            {hasDepartmentData && (
                                <div className="flex items-center bg-blue-50/30 dark:bg-blue-900/10 border-l border-blue-100 dark:border-blue-900/30">
                                    <button 
                                        onClick={() => setShowEmployeeModal(true)}
                                        className="p-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border-r border-blue-100 dark:border-blue-900/30"
                                        title="Quản lý danh sách nhân viên"
                                    >
                                        <Icon name="settings" size={4} />
                                    </button>
                                </div>
                            )}
                            
                            <div className="flex items-center bg-blue-50/30 dark:bg-blue-900/10 border-l border-blue-100 dark:border-blue-900/30">
                                <a 
                                    href="#" 
                                    onClick={handleExternalLinkClick}
                                    className="p-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border-r border-blue-100 dark:border-blue-900/30"
                                    title="Mở trang quản lý phân ca"
                                >
                                    <Icon name="external-link" size={4} />
                                </a>
                                
                                <AnimatePresence mode="wait">
                                    {hasDepartmentData && (
                                        <motion.button
                                            initial={{ width: 0, opacity: 0 }}
                                            animate={{ width: 'auto', opacity: 1 }}
                                            exit={{ width: 0, opacity: 0 }}
                                            onClick={handleDeptClear}
                                            disabled={isClearingDepartments}
                                            className={`p-2.5 transition-colors ${deptClearSuccess ? 'text-emerald-500' : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'}`}
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
                        <div className="flex items-center shadow-sm rounded-xl overflow-hidden border border-emerald-100 dark:border-emerald-900/30">
                            {(userRole === 'admin' || userRole === 'manager') && (
                                <>
                                    <button 
                                        onClick={onNewFile}
                                        className="flex items-center gap-2.5 px-3.5 py-2.5 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all active:scale-95"
                                        title="Tải lên báo cáo YCX mới"
                                    >
                                        <Icon name="file-up" size={5} />
                                        <span>Tải YCX Lên</span>
                                    </button>
                                    
                                    <button 
                                        onClick={() => setShowDriveHistory(true)}
                                        className={`flex items-center p-2.5 bg-emerald-50/30 dark:bg-emerald-900/10 border-l border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors tooltip ${syncState === 'error' ? 'text-red-500 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'}`}
                                        title="Lịch sử dữ liệu (Mây)"
                                    >
                                        <Icon name={syncState === 'error' ? 'bell-ring' : 'cloud-cog'} size={4} className={syncState === 'error' ? "animate-bounce" : ""} />
                                        {syncState === 'error' && (
                                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping"></span>
                                        )}
                                    </button>
                                </>
                            )}
                            <a 
                                href="https://report.mwgroup.vn/home/dashboard/77"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center p-2.5 bg-emerald-50/30 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-l border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                                title="Tải dữ liệu báo cáo"
                            >
                                <Icon name="external-link" size={4} />
                            </a>

                            <FontSelector />
                        </div>
                    </div>

                    {/* Mobile: Premium compact action chips */}
                    <div className="lg:hidden flex items-center gap-1.5 w-full overflow-x-auto no-scrollbar py-0.5">
                        {(userRole === 'admin' || userRole === 'manager') && (
                            <>
                                <button onClick={onNewFile} className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-emerald-50/50 dark:from-emerald-900/20 dark:to-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200/70 dark:border-emerald-800 text-xs font-bold flex-1 active:scale-95 shadow-sm touch-feedback">
                                    <Icon name="file-up" size={4} />
                                    <span>Tải YCX Lên</span>
                                </button>
                                <button onClick={onLoadShiftFile} className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200/70 dark:border-blue-800 text-xs font-bold flex-1 active:scale-95 shadow-sm touch-feedback">
                                    <Icon name="users-round" size={4} />
                                    <span>DS Nhân Viên</span>
                                </button>
                                <button onClick={() => setShowDriveHistory(true)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-bold shrink-0 active:scale-95 shadow-sm touch-feedback ${syncState === 'error' ? 'bg-red-50 text-red-600 border-red-200/70 animate-pulse' : 'bg-slate-50/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/70 dark:border-slate-700'}`}>
                                    <Icon name={syncState === 'error' ? 'bell-ring' : 'cloud-cog'} size={3.5} />
                                </button>
                            </>
                        )}
                        <a href="https://report.mwgroup.vn/home/dashboard/77" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-slate-50/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl border border-slate-200/70 dark:border-slate-700 text-[10px] font-bold shrink-0 shadow-sm touch-feedback">
                            <Icon name="external-link" size={3.5} />
                            <span>BCNB</span>
                        </a>
                    </div>
                </>
            )}
        </header>

            {/* Instruction Modal */}
            <ModalWrapper
                isOpen={showInstructionModal}
                onClose={() => setShowInstructionModal(false)}
                title="Hướng Dẫn Nhập DS Nhân Viên"
                subTitle="Thao tác trên Hệ thống BCNB"
                titleColorClass="text-blue-600 dark:text-blue-400"
                maxWidthClass="max-w-md"
            >
                <div className="p-6">
                    <div className="text-sm text-slate-600 dark:text-slate-300 space-y-4">
                        <p><strong>Bước 1:</strong> Nếu chưa đăng nhập BCNB thì hãy đăng nhập hệ thống.</p>
                        <p><strong>Bước 2:</strong> Click vào "Đã Hiểu & Tiếp Tục" &gt; Chọn siêu thị &gt; Xem &gt; Tùy chọn "Xuất excel".</p>
                        <p><em>(Nếu cụm có nhiều siêu thị, hãy lặp lại việc xuất cho từng siêu thị)</em></p>
                        <p><strong>Bước 3:</strong> Quay lại Dashboard &gt; Click "DS Nhân Viên" &gt; Tải lên tất cả file excel bạn vừa tải về.</p>
                    </div>
                    <div className="mt-8 flex justify-end gap-3">
                        <button onClick={() => setShowInstructionModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors font-semibold">
                            Hủy
                        </button>
                        <button onClick={proceedToExternalLink} className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm transition-colors font-semibold">
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
