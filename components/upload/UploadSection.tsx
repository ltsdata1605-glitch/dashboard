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
        <div className="flex flex-col">
            {isSettingsOpen ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-4 text-left">
                    <div className="mb-4">
                        <label htmlFor="config-url" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Nguồn cấu hình (Google Sheets CSV)
                        </label>
                        <input
                            type="text"
                            id="config-url"
                            value={configUrl}
                            onChange={(e) => onConfigUrlChange(e.target.value)}
                            className="w-full p-2.5 text-[13px] font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="https://docs.google.com/..."
                        />
                    </div>
                    {onDeduplicationChange && (
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <label htmlFor="dedupe-toggle" className="text-[13px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                    Xử lý trùng lặp thông minh
                                </label>
                                <p className="text-[11px] text-slate-500 mt-0.5">Tự động phát hiện và gộp các dòng dữ liệu giống nhau.</p>
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
                    <div className="text-right">
                        <button onClick={() => setIsSettingsOpen(false)} className="text-[12px] font-bold text-blue-600 dark:text-blue-400 hover:underline">Hoàn tất</button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100/50 dark:border-blue-500/20">
                        <Icon name="database" size={4.5} />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-white text-[13px]">Nhập dữ liệu</h3>
                        <p className="text-[11px] font-medium text-slate-500">Hỗ trợ Excel (.xlsx, .xls)</p>
                    </div>
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-1.5 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors"
                        title="Cài đặt cấu hình"
                    >
                        <Icon name="share-2" size={4.5} />
                    </button>
                </div>
            )}

            {!isSettingsOpen && (
                <>
                    <label
                        htmlFor="file-upload"
                        className={`relative group/dropzone flex flex-col items-center justify-center w-full min-h-[120px] border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 overflow-hidden
                            ${isDragging 
                                ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-500 scale-[1.01] shadow-inner' 
                                : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 hover:border-blue-400/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-800/50 pointer-events-none"></div>
                        <div className="flex flex-col items-center justify-center p-4 relative z-10">
                            <div className={`w-10 h-10 mb-3 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover/dropzone:scale-110 transition-transform duration-300 group-hover/dropzone:shadow-blue-100 dark:group-hover/dropzone:shadow-none group-hover/dropzone:border-blue-200 dark:group-hover/dropzone:border-blue-500/30 text-slate-400 dark:text-slate-500 group-hover/dropzone:text-blue-500 dark:group-hover/dropzone:text-blue-400`}>
                                <Icon name="upload" size={5} />
                            </div>
                            <p className="mb-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">
                                <span className="text-blue-600 dark:text-blue-400 font-semibold">Chọn file</span> hoặc thả các file Excel vào đây
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium">Xử lý an toàn • Không tải lên máy chủ</p>
                        </div>
                        <input
                            id="file-upload"
                            type="file"
                            className="hidden"
                            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                            multiple
                            onClick={(e) => (e.currentTarget.value = '')}
                            onChange={handleFileChange}
                        />
                    </label>
                    <p className="mt-3 text-[12px] font-medium text-slate-500 text-center">Chưa có file nào được chọn.</p>
                </>
            )}
        </div>
    );
};

export default UploadSection;
