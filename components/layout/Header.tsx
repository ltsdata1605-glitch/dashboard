
import React, { useState, useEffect } from 'react';
import { Icon } from '../common/Icon';
import { motion, AnimatePresence } from 'motion/react';

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
    onToggleFilters 
}) => {
    const [deptClearSuccess, setDeptClearSuccess] = useState(false);
    const [dataClearSuccess, setDataClearSuccess] = useState(false);

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
                    {/* Filter Action - Refined with Pastel Color */}
                    <button 
                        onClick={onToggleFilters}
                        className="group flex items-center gap-2.5 px-5 py-2.5 bg-indigo-50/80 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all active:scale-95 shadow-sm"
                    >
                        <Icon name="filter" size={4} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                        <span>Bộ lọc</span>
                    </button>

                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1" />

                    {/* Shift Management Group - Professional Split Button with Pastel Color */}
                    <div className="flex items-center shadow-sm rounded-xl overflow-hidden border border-blue-100 dark:border-blue-900/30">
                        <button 
                            onClick={onLoadShiftFile}
                            className="flex items-center gap-2.5 px-5 py-2.5 bg-blue-50/80 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all active:scale-95"
                            title="Tải lên file phân ca của cụm"
                        >
                            <Icon name="users-round" size={4} />
                            <span>Phân ca</span>
                        </button>
                        
                        <div className="flex items-center bg-blue-50/30 dark:bg-blue-900/10 border-l border-blue-100 dark:border-blue-900/30">
                            <a 
                                href="https://office.thegioididong.com/quan-ly-phan-ca" 
                                target="_blank" 
                                rel="noopener noreferrer"
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

                    {/* Data Import Group - Professional Split Button with Pastel Color */}
                    <div className="flex items-center shadow-sm rounded-xl overflow-hidden border border-emerald-100 dark:border-emerald-900/30">
                        <button 
                            onClick={onNewFile}
                            className="flex items-center gap-2.5 px-5 py-2.5 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all active:scale-95"
                        >
                            <Icon name="file-up" size={4} />
                            <span>Nhập YCX</span>
                        </button>
                        
                        <AnimatePresence mode="wait">
                            <motion.button
                                onClick={handleDataClear}
                                className={`p-2.5 bg-emerald-50/30 dark:bg-emerald-900/10 border-l border-emerald-100 dark:border-emerald-900/30 transition-colors ${dataClearSuccess ? 'text-emerald-600' : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'}`}
                                title="Xóa toàn bộ dữ liệu"
                            >
                                <Icon name={dataClearSuccess ? 'check' : 'trash-2'} size={4} />
                            </motion.button>
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
