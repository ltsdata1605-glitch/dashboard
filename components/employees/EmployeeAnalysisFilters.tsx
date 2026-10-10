import React from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { toast } from '../shared/ui/toast';
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
                    ? 'text-sky-700 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400 font-bold'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={hideZeroRevenue ? 'Đang ẩn nhân viên No Sale — Nhấn để hiện' : 'Đang hiện tất cả — Nhấn để ẩn No Sale'}
            >
                <AppIcon name={hideZeroRevenue ? 'userReject' : 'userCheck'} size="md" />
            </Button>
        </div>
    );
};

export default EmployeeAnalysisFilters;
