import React from 'react';

interface BaseDataSectionProps {
    configUrl: string;
}

export const BaseDataSection: React.FC<BaseDataSectionProps> = ({
    configUrl,
}) => {
    return (
        <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mb-2 sm:mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Cấu Hình Kết Xuất Base Data</h3>

            <div className="space-y-4">
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
