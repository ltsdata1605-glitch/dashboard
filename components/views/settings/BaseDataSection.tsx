import React from 'react';
import { Icon } from '../../common/Icon';

interface BaseDataSectionProps {
    isDeduplicationEnabled: boolean;
    onToggleDedup: () => void;
    configUrl: string;
}

export const BaseDataSection: React.FC<BaseDataSectionProps> = ({
    isDeduplicationEnabled,
    onToggleDedup,
    configUrl,
}) => {
    return (
        <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mb-2 sm:mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Cấu Hình Kết Xuất Base Data</h3>
            
            <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-5 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-lg">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-base">Gộp Đơn Cùng Chứng Từ (Deduplication)</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">Các MÃ CHỨNG TỪ giống nhau sẽ bị gộp thành 1 dòng (tổng hợp doanh thu) để tránh làm trùng lặp khi xoay Pivot theo Đơn.</p>
                    </div>
                    <button 
                        onClick={onToggleDedup}
                        className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${isDeduplicationEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isDeduplicationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-5 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <h4 className="font-bold text-slate-800 dark:text-white text-base mb-2">Google Sheet File CSV</h4>
                    <input 
                        type="text" 
                        readOnly 
                        value={configUrl || 'Chưa thiết lập URL cấu hình YCX nào...'} 
                        className="w-full bg-slate-200/50 dark:bg-slate-800 px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs outline-none rounded-md"
                    />
                    <p className="text-xs text-slate-400 mt-2">Dữ liệu Cấu trúc Danh mục (Product Config) được nạp trực tiếp qua Google Sheet Public.</p>
                </div>
            </div>
        </div>
    );
};
