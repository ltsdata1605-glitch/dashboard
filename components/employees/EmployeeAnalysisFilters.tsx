import React from 'react';
import { Icon } from '../common/Icon';
import toast from 'react-hot-toast';

interface EmployeeAnalysisFiltersProps {
    hideZeroRevenue: boolean;
    setHideZeroRevenue: (val: boolean) => void;
}

const EmployeeAnalysisFilters: React.FC<EmployeeAnalysisFiltersProps> = ({
    hideZeroRevenue,
    setHideZeroRevenue,
}) => {
    const handleToggle = () => {
        const newVal = !hideZeroRevenue;
        setHideZeroRevenue(newVal);
        const msg = newVal ? 'Đã ẩn nhân viên No Sale' : 'Đang hiện tất cả nhân viên';
        toast.success(msg, { duration: 2000 });
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
        </div>
    );
};

export default EmployeeAnalysisFilters;
