import React from 'react';
import type { UploadedFileRegistryItem } from '../../types';
import { Icon } from '../common/Icon';

interface FileHistoryManagerProps {
    registry: UploadedFileRegistryItem[];
    onToggleActive: (id: string) => Promise<void> | void;
    onDelete: (id: string) => Promise<void> | void;
    onViewReport?: () => void;
    compact?: boolean;
}

export const FileHistoryManager: React.FC<FileHistoryManagerProps> = ({
    registry,
    onToggleActive,
    onDelete,
    onViewReport,
    compact = false
}) => {
    const activeCount = registry.filter(f => f.isActive).length;
    const totalRows = registry.reduce((sum, f) => sum + (f.isActive ? f.rowCount : 0), 0);

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    if (registry.length === 0) {
        return null;
    }

    return (
        <div className={`flex flex-col text-left ${compact ? 'p-0' : 'mt-6 pt-6 border-t border-slate-200 dark:border-slate-800'}`}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Icon name="database" size={4} className="text-indigo-500" />
                        <span>Kho Dữ Liệu Tích Lũy ({registry.length})</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Chọn các tệp tin để gộp số liệu. Dữ liệu được lưu trữ trực tiếp trên trình duyệt của bạn.
                    </p>
                </div>
                {!compact && onViewReport && activeCount > 0 && (
                    <button
                        onClick={onViewReport}
                        id="btn-view-historical-report"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-300/30 dark:shadow-none transition-all flex items-center gap-1.5"
                    >
                        <Icon name="play" size={3.5} />
                        <span>Xem Báo Cáo Gộp</span>
                    </button>
                )}
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-inner">
                <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 scrollbar-thin">
                    {registry.map((file) => (
                        <div 
                            key={file.id} 
                            className={`flex items-center justify-between p-3 transition-colors ${
                                file.isActive 
                                    ? 'bg-blue-50/20 dark:bg-blue-950/15' 
                                    : 'hover:bg-slate-100/30 dark:hover:bg-slate-800/20'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* Customized Checkbox */}
                                <label className="relative flex items-center justify-center cursor-pointer shrink-0">
                                    <input 
                                        type="checkbox"
                                        id={`check-file-${file.id}`}
                                        checked={file.isActive}
                                        onChange={() => onToggleActive(file.id)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-5 h-5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center after:content-[''] after:w-2.5 after:h-1.5 after:border-white after:border-b-2 after:border-l-2 after:-rotate-45 after:translate-y-[-1px] after:opacity-0 peer-checked:after:opacity-100"></div>
                                </label>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span 
                                            className={`text-[13px] font-semibold truncate max-w-[280px] sm:max-w-md ${
                                                file.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                                            } ${file.isMissingLocalData ? 'text-rose-500/70 dark:text-rose-400/60 line-through' : ''}`} 
                                            title={file.filename + (file.isMissingLocalData ? ' (Thiếu dữ liệu gốc trên thiết bị này)' : '')}
                                        >
                                            {file.filename}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50/50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/30 shrink-0">
                                            {file.rowCount.toLocaleString('vi-VN')} dòng
                                        </span>
                                        {file.isMissingLocalData && (
                                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-100/30 shrink-0 flex items-center gap-1" title="Tệp tin chỉ tồn tại trên đám mây, thiếu dữ liệu chi tiết trên thiết bị này. Vui lòng nạp lại tệp!">
                                                <Icon name="alert-triangle" size={2.5} className="text-rose-500 animate-pulse" />
                                                Thiếu dữ liệu - Hãy nạp lại
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                        <span className="flex items-center gap-1">
                                            <Icon name="clock" size={3} />
                                            {formatDate(file.savedAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => onDelete(file.id)}
                                id={`btn-delete-file-${file.id}`}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all ml-4 shrink-0"
                                title="Xóa tệp này"
                            >
                                <Icon name="trash-2" size={4} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Footer summary bar */}
                <div className="bg-slate-100/40 dark:bg-slate-900/80 px-3.5 py-2 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                        <Icon name="file-check" size={3.5} className="text-emerald-500" />
                        Đang gộp: <strong className="text-slate-700 dark:text-slate-300 font-extrabold">{activeCount}</strong> tệp
                    </span>
                    <span>
                        Tổng số: <strong className="text-slate-700 dark:text-slate-300 font-extrabold">{totalRows.toLocaleString('vi-VN')}</strong> dòng dữ liệu
                    </span>
                </div>
            </div>
        </div>
    );
};
