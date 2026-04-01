
import React, { useState, useEffect } from 'react';
import { Icon } from '../common/Icon';
import { motion, AnimatePresence } from 'motion/react';
import ModalWrapper from '../modals/ModalWrapper';
import EmployeeManagerModal from '../modals/EmployeeManagerModal';
import DriveHistoryModal from '../modals/DriveHistoryModal';
import FontSelector from './FontSelector';
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
    onClearData: () => void;
    fileInfo: { filename: string; savedAt: string } | null;
    onToggleFilters?: () => void;
    onSelectHistoryFile?: (file: File) => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onNewFile, 
    onLoadShiftFile, 
    onClearDepartments, 
    isClearingDepartments, 
    hasDepartmentData, 
    showNewFileButton, 
    onClearData, 
    fileInfo, 
    onToggleFilters,
    onSelectHistoryFile 
}) => {
    const { user, isDemoMode, userRole } = useAuth();
    const context = useDashboardContext();
    const { syncState } = useCloudSync(
        context.productConfig,
        context.departmentMap,
        context.warehouseTargets,
        context.gtdhTargets,
        context.crossSellingConfig
    );
    const [deptClearSuccess, setDeptClearSuccess] = useState(false);
    const [dataClearSuccess, setDataClearSuccess] = useState(false);
    const [showInstructionModal, setShowInstructionModal] = useState(false);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [showDriveHistory, setShowDriveHistory] = useState(false);

    // Prevent hydration warnings
    const [mounted, setMounted] = useState(false);

    const handleExternalLinkClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowInstructionModal(true);
    };

    const proceedToExternalLink = () => {
        setShowInstructionModal(false);
        window.open("https://office.thegioididong.com/quan-ly-phan-ca", "_blank");
    };

    useEffect(() => {
        if (fileInfo) {
            setDataClearSuccess(false);
        }
    }, [fileInfo]);

    const handleDeptClear = () => {
        onClearDepartments();
        setDeptClearSuccess(true);
        setTimeout(() => setDeptClearSuccess(false), 3000);
    };

    const handleDataClear = () => {
        setDataClearSuccess(true);
        setTimeout(() => {
            onClearData();
        }, 1500);
    };
    
    return (
        <>
            <header className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-5 pb-5 border-b border-slate-200/60 dark:border-slate-800/60">
            {/* Title Section with Editorial Style */}
            <div className="flex flex-col gap-1">
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

            {showNewFileButton && (
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800/50 backdrop-blur-sm">
                    {/* Shift Management Group */}
                    {(userRole === 'admin' || userRole === 'manager') && (
                    <div className="flex items-center shadow-sm rounded-xl overflow-hidden border border-blue-100 dark:border-blue-900/30">
                        <button 
                            onClick={onLoadShiftFile}
                            className="flex items-center gap-2.5 px-5 py-2.5 bg-blue-50/80 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all active:scale-95"
                            title="Tải lên file phân ca của cụm"
                        >
                            <Icon name="users-round" size={4} />
                            <span>Nhân Viên</span>
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
                                    className="flex items-center gap-2.5 px-5 py-2.5 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all active:scale-95"
                                    title="Tải lên báo cáo YCX mới từ máy tính"
                                >
                                    <Icon name="file-up" size={4} />
                                    <span>YCX</span>
                                </button>
                                
                                <button 
                                    onClick={() => setShowDriveHistory(true)}
                                    className="flex items-center p-2.5 bg-emerald-50/30 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-l border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors tooltip"
                                    title="Lịch sử dữ liệu (Mây)"
                                >
                                    <Icon name="cloud-cog" size={4} />
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
                        
                        <AnimatePresence mode="wait">
                            <motion.div
                                className={`flex items-center justify-center p-2.5 bg-emerald-50/30 dark:bg-emerald-900/10 border-l border-emerald-100 dark:border-emerald-900/30 transition-colors 
                                    ${syncState === 'synced' ? 'text-emerald-500' 
                                    : syncState === 'error' ? 'text-rose-500'
                                    : 'text-emerald-600 dark:text-emerald-400'} 
                                    ${(!user || isDemoMode) ? 'opacity-50' : ''}`}
                                title={!user ? "Chưa đăng nhập" : (isDemoMode ? "Chế độ Offline" : (syncState === 'syncing' ? "Đang lưu lên Cloud..." : (syncState === 'error' ? "Lỗi lưu Cloud" : "Đã đồng bộ Cloud")))}
                            >
                                <Icon 
                                    name={syncState === 'synced' ? 'cloud-snow' : (syncState === 'syncing' ? 'loader-2' : (syncState === 'error' ? 'cloud-off' : 'cloud-check'))} 
                                    size={4} 
                                    className={syncState === 'syncing' ? 'animate-spin text-indigo-500' : ''} 
                                />
                            </motion.div>
                        </AnimatePresence>

                        {userRole !== 'employee' && (
                            <AnimatePresence mode="wait">
                                <motion.button
                                    onClick={handleDataClear}
                                    className={`p-2.5 bg-emerald-50/30 dark:bg-emerald-900/10 border-l border-emerald-100 dark:border-emerald-900/30 transition-colors ${dataClearSuccess ? 'text-emerald-600' : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'}`}
                                    title="Xóa toàn bộ dữ liệu"
                                >
                                    <Icon name={dataClearSuccess ? 'check' : 'trash-2'} size={4} />
                                </motion.button>
                            </AnimatePresence>
                        )}
                    </div>
                </div>
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
                    onSelectFile={onSelectHistoryFile}
                />
            )}
        </>
    );
};

export default Header;
