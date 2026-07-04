import React from 'react';
import ReactDOM from 'react-dom';
import { Icon } from '../common/Icon';

export interface UploadConflictInfo {
    type: 'exact_duplicate' | 'overlap_dates';
    targetType: 'historical' | 'realtime';
    conflictingFileId?: string;
    conflictingFilename: string;
    conflictingLastModified?: number;
    overlappingDates: string[];
    totalOverlappingOrdersCount?: number;
}

interface UploadConflictModalProps {
    isOpen: boolean;
    conflicts: UploadConflictInfo[];
    newFilename: string;
    newDateRangeStr: string;
    onResolve: (action: 'overwrite_deactivate' | 'merge_deduplicate' | 'merge_all' | 'cancel') => void;
}

export const UploadConflictModal: React.FC<UploadConflictModalProps> = ({
    isOpen,
    conflicts,
    newFilename,
    newDateRangeStr,
    onResolve
}) => {
    if (!isOpen || conflicts.length === 0) return null;

    const hasExactDuplicate = conflicts.some(c => c.type === 'exact_duplicate');
    const overlapConflicts = conflicts.filter(c => c.type === 'overlap_dates');

    // Format a list of overlapping dates for clean UI display
    const formatOverlappingDates = (dates: string[]) => {
        if (dates.length === 0) return '';
        // Convert YYYY-MM-DD to DD/MM
        const formatted = dates.map(d => {
            const parts = d.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}`;
            }
            return d;
        });
        
        if (formatted.length <= 6) {
            return formatted.join(', ');
        }
        return `${formatted.slice(0, 6).join(', ')} và ${formatted.length - 6} ngày khác`;
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[99999] p-4 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-lg rounded-2xl border border-slate-200/60 dark:border-slate-800 flex flex-col p-6 space-y-5 animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100/50 dark:border-amber-900/20 shrink-0">
                        <Icon name="alert-triangle" size={6} className="animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {hasExactDuplicate ? 'Phát Hiện Tệp Trùng Lặp!' : 'Trùng Lặp Lịch Sử Dữ Liệu!'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Tệp mới tải lên có thông tin trùng lắp với dữ liệu hiện có trong hệ thống.
                        </p>
                    </div>
                </div>

                {/* Details Section */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl p-4 space-y-3 text-xs">
                    <div>
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                            Tệp mới tải lên
                        </span>
                        <div className="flex items-center gap-2">
                            <Icon name="file-spreadsheet" size={3.5} className="text-slate-400" />
                            <strong className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[280px]" title={newFilename}>
                                {newFilename}
                            </strong>
                            <span className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[9px] shrink-0">
                                {newDateRangeStr}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-3">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                            Dữ liệu xung đột phát hiện được
                        </span>
                        <div className="space-y-2.5 max-h-[120px] overflow-y-auto pr-1 scrollbar-thin">
                            {conflicts.map((conflict, idx) => (
                                <div key={idx} className="flex flex-col gap-1 text-[11px] bg-white dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={conflict.conflictingFilename}>
                                            📄 {conflict.conflictingFilename}
                                        </span>
                                        <span className={`px-1 rounded text-[8px] font-extrabold uppercase shrink-0 ${
                                            conflict.targetType === 'realtime'
                                                ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400'
                                                : 'bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400'
                                        }`}>
                                            {conflict.targetType === 'realtime' ? 'Realtime' : 'Lũy kế'}
                                        </span>
                                    </div>
                                    {conflict.type === 'exact_duplicate' ? (
                                        <span className="text-rose-500 font-bold">
                                            ⚠️ File trùng lặp hoàn toàn (trùng tên hoặc ngày chỉnh sửa).
                                        </span>
                                    ) : (
                                        <div className="text-slate-500 dark:text-slate-400 flex flex-col gap-0.5">
                                            <span>
                                                • Trùng ngày: <strong className="text-amber-600 dark:text-amber-400 font-semibold">{formatOverlappingDates(conflict.overlappingDates)}</strong> ({conflict.overlappingDates.length} ngày)
                                            </span>
                                            {conflict.totalOverlappingOrdersCount !== undefined && conflict.totalOverlappingOrdersCount > 0 && (
                                                <span className="text-rose-500 font-medium">
                                                    • Phát hiện {conflict.totalOverlappingOrdersCount} đơn hàng bị trùng mã.
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Resolution Choices */}
                <div className="space-y-2">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                        Vui lòng chọn cách xử lý dữ liệu trùng
                    </span>

                    <div className="flex flex-col gap-2">
                        {/* Option 2: Merge & Deduplicate (Recommended) */}
                        <button
                            type="button"
                            onClick={() => onResolve('merge_deduplicate')}
                            className="w-full text-left p-3 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all flex items-start gap-3 active:scale-[0.99] group shadow-sm"
                        >
                            <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold">
                                1
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-indigo-700 dark:text-indigo-400 text-xs sm:text-[13px]">
                                        Tự động lọc trùng mã đơn hàng
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-emerald-500 text-white animate-pulse">
                                        KHUYÊN DÙNG
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                    Gộp chung dữ liệu, nhưng tự động loại bỏ các sản phẩm trùng mã đơn hàng. Luôn ưu tiên giữ lại dữ liệu của tệp mới hơn.
                                </p>
                            </div>
                        </button>

                        {/* Option 1: Overwrite / Deactivate old */}
                        <button
                            type="button"
                            onClick={() => onResolve('overwrite_deactivate')}
                            className="w-full text-left p-3 bg-slate-50 hover:bg-amber-50/40 dark:bg-slate-800/40 dark:hover:bg-amber-950/10 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all flex items-start gap-3 active:scale-[0.99] group"
                        >
                            <div className="w-5 h-5 rounded-full bg-slate-400 dark:bg-slate-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold group-hover:bg-amber-500 transition-colors">
                                2
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-400 text-xs sm:text-[13px]">
                                    Ghi đè & Tắt tệp cũ bị trùng
                                </span>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                    Tắt các tệp cũ có trùng lặp ngày khỏi báo cáo. Chỉ sử dụng dữ liệu mới nạp này để xem doanh thu khoảng trùng.
                                </p>
                            </div>
                        </button>

                        {/* Option 3: Merge All */}
                        <button
                            type="button"
                            onClick={() => onResolve('merge_all')}
                            className="w-full text-left p-3 bg-slate-50 hover:bg-rose-50/20 dark:bg-slate-800/40 dark:hover:bg-rose-950/5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all flex items-start gap-3 active:scale-[0.99] group"
                        >
                            <div className="w-5 h-5 rounded-full bg-slate-400 dark:bg-slate-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold group-hover:bg-rose-500 transition-colors">
                                3
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-rose-500 dark:group-hover:text-rose-400 text-xs sm:text-[13px]">
                                    Gộp đè toàn bộ (Cộng dồn số liệu)
                                </span>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                    Không loại bỏ đơn hàng nào. Số liệu của những ngày trùng nhau sẽ bị cộng dồn lên (có thể gây lệch báo cáo thực tế).
                                </p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Footer / Cancel */}
                <div className="pt-2 flex items-center justify-end">
                    <button
                        type="button"
                        onClick={() => onResolve('cancel')}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold uppercase tracking-wider text-[11px] rounded-xl active:scale-[0.97] transition-all flex items-center gap-1.5"
                    >
                        <Icon name="x" size={3.5} />
                        Hủy nạp file
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default UploadConflictModal;
