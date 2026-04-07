
import React, { useState, useCallback } from 'react';
import { Icon } from '../common/Icon';

interface UploadSectionProps {
    onProcessFile: (files: File[]) => void;
    configUrl: string;
    onConfigUrlChange: (url: string) => void;
    isDeduplicationEnabled?: boolean;
    onDeduplicationChange?: (enabled: boolean) => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onProcessFile, configUrl, onConfigUrlChange, isDeduplicationEnabled = false, onDeduplicationChange }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            onProcessFile(files);
        }
    }, [onProcessFile]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onProcessFile(Array.from(e.target.files));
        }
    }, [onProcessFile]);

    return (
        <div className="flex flex-col h-full">
            {/* Header Area inside the component */}
            <div className="px-8 pt-8 pb-4 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50/50 dark:bg-slate-800/50 backdrop-blur-md shadow-sm border border-indigo-100 dark:border-slate-700/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Icon name="database" size={6} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Nhập dữ liệu</h3>
                        <p className="text-sm text-slate-500 font-medium">Hỗ trợ Excel (.xlsx, .xls)</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className={`p-2.5 rounded-xl transition-all duration-200 ${isSettingsOpen ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800/60'} shadow-sm`}
                    title="Cài đặt cấu hình"
                >
                    <Icon name="settings-2" size={5} />
                </button>
            </div>

            {/* Download Data Callout - New Feature */}
            <div className="mx-8 mb-8 p-5 rounded-2xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/60 dark:border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm relative z-10 transition-all hover:bg-white/60 dark:hover:bg-slate-800/60">
                <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center shadow-sm">
                        <Icon name="download-cloud" size={5} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Bước 1: Tải dữ liệu báo cáo</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Trích xuất file xuất từ BCNB (Doanh thu siêu thị).</p>
                    </div>
                </div>
                <a 
                    href="https://report.mwgroup.vn/home/dashboard/77" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="shrink-0 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all focus:ring-4 focus:ring-indigo-500/20 flex items-center gap-2 group active:scale-95"
                >
                    Tải file dữ liệu <Icon name="external-link" size={4} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                </a>
            </div>

            {/* Main Upload Area */}
            <div className="px-8 pb-8 relative">
                {/* Decorative node for step 2 */}
                <div className="absolute top-[-36px] left-12 w-0.5 h-6 bg-indigo-200 dark:bg-indigo-800/50 hidden sm:block"></div>
                {isSettingsOpen ? (
                    <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-fade-in space-y-5">
                        <div>
                            <label htmlFor="config-url" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Nguồn cấu hình (Google Sheets CSV)
                            </label>
                            <input
                                type="text"
                                id="config-url"
                                value={configUrl}
                                onChange={(e) => onConfigUrlChange(e.target.value)}
                                className="w-full p-3 text-sm font-medium text-slate-900 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="https://docs.google.com/..."
                            />
                        </div>
                        {onDeduplicationChange && (
                            <div className="flex items-center justify-between">
                                <div>
                                    <label htmlFor="dedupe-toggle" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                        Xử lý trùng lặp thông minh
                                    </label>
                                    <p className="text-xs text-slate-500 mt-0.5">Tự động phát hiện và gộp các dòng dữ liệu giống nhau.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        id="dedupe-toggle"
                                        className="sr-only peer" 
                                        checked={isDeduplicationEnabled}
                                        onChange={(e) => onDeduplicationChange(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        )}
                        <div className="pt-2 text-right">
                            <button onClick={() => setIsSettingsOpen(false)} className="text-xs font-bold text-blue-600 hover:underline">Đóng cài đặt</button>
                        </div>
                    </div>
                ) : (
                    <label
                        htmlFor="file-upload"
                        className={`group relative flex flex-col items-center justify-center w-full h-[260px] rounded-[24px] cursor-pointer transition-all duration-300 overflow-hidden
                            ${isDragging 
                                ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-2 border-indigo-500 scale-[1.01] shadow-inner backdrop-blur-xl' 
                                : 'bg-white/40 dark:bg-slate-800/30 border-2 border-dashed border-indigo-200/60 dark:border-slate-700 hover:border-indigo-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md'
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input
                            id="file-upload"
                            type="file"
                            className="hidden"
                            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                            multiple
                            onClick={(e) => (e.currentTarget.value = '')}
                            onChange={handleFileChange}
                        />
                        
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

                        <div className="flex flex-col items-center justify-center relative z-10 space-y-4">
                            <div className={`p-4 rounded-2xl bg-white dark:bg-slate-700 text-slate-400 shadow-sm border border-slate-100 dark:border-slate-600 group-hover:text-indigo-600 group-hover:border-indigo-200 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:scale-110 transition-all duration-300`}>
                                <Icon name="upload-cloud" size={8} />
                            </div>
                            <div className="text-center">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight mb-1">Bước 2: Nạp báo cáo vào hệ thống</h4>
                                <p className="text-base font-medium text-slate-600 dark:text-slate-300">
                                    <span className="text-indigo-600 dark:text-indigo-400 group-hover:underline">Chọn nhiều file</span> hoặc thả các file Excel vào đây
                                </p>
                                <p className="text-xs text-slate-400 mt-1 font-medium">
                                    Xử lý an toàn • Không tải lên máy chủ
                                </p>
                            </div>
                        </div>
                    </label>
                )}
            </div>
        </div>
    );
};

export default UploadSection;
