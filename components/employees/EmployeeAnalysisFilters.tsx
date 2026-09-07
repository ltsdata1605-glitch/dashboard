import React from 'react';
import { Icon } from '../common/Icon';
import toast from 'react-hot-toast';
import { Button } from '../shared/ui/Button';

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
        <div className="relative flex items-center hide-on-export">
            <Button
                type="button"
                variant="unstyled" size="none"
                onClick={handleToggle}
                className={`flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-lg transition-colors ${
                    hideZeroRevenue
                    ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={hideZeroRevenue ? 'Đang ẩn nhân viên No Sale — Nhấn để hiện' : 'Đang hiện tất cả — Nhấn để ẩn No Sale'}
            >
                <Icon name={hideZeroRevenue ? 'user-round-x' : 'user-round-check'} size={4} className="lg:hidden" />
                <Icon name={hideZeroRevenue ? 'user-round-x' : 'user-round-check'} size={4.5} className="hidden lg:block" />
            </Button>
        </div>
    );
};

export default EmployeeAnalysisFilters;
