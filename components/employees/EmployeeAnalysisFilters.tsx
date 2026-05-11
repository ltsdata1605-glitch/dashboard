import React, { useState, useRef } from 'react';
import { Icon } from '../common/Icon';
interface EmployeeAnalysisFiltersProps {
    hideZeroRevenue: boolean;
    setHideZeroRevenue: (val: boolean) => void;
}

const EmployeeAnalysisFilters: React.FC<EmployeeAnalysisFiltersProps> = ({
    hideZeroRevenue,
    setHideZeroRevenue,
}) => {
    const [toast, setToast] = useState<string | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout>>();

    const handleToggle = () => {
        const newVal = !hideZeroRevenue;
        setHideZeroRevenue(newVal);
        const msg = newVal ? 'Đã ẩn nhân viên No Sale' : 'Đang hiện tất cả nhân viên';
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast(msg);
        toastTimer.current = setTimeout(() => setToast(null), 2000);
    };

    return (
        <div className="relative flex items-center gap-2 hide-on-export">
            <button
                type="button"
                onClick={handleToggle}
                className={`p-1 sm:p-1.5 rounded-lg transition-all ${
                    hideZeroRevenue
                    ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={hideZeroRevenue ? 'Đang ẩn nhân viên No Sale — Nhấn để hiện' : 'Đang hiện tất cả — Nhấn để ẩn No Sale'}
            >
                <Icon name={hideZeroRevenue ? 'user-round-x' : 'user-round-check'} size={4} />
            </button>
            {toast && (
                <div className="absolute top-full right-0 mt-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 text-white text-[10px] sm:text-xs font-semibold shadow-lg whitespace-nowrap">
                        {toast}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeAnalysisFilters;
