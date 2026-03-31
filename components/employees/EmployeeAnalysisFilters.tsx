import React, { useState } from 'react';
import { Icon } from '../common/Icon';
interface EmployeeAnalysisFiltersProps {
    hideZeroRevenue: boolean;
    setHideZeroRevenue: (val: boolean) => void;
}

const EmployeeAnalysisFilters: React.FC<EmployeeAnalysisFiltersProps> = ({
    hideZeroRevenue,
    setHideZeroRevenue,
}) => {
    return (
        <div className="flex items-center gap-2 pb-2 hide-on-export">
            {/* No sale Checkbox */}
            <div 
                className="flex items-center px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                onClick={() => setHideZeroRevenue(!hideZeroRevenue)}
            >
                <input 
                    type="checkbox" 
                    checked={hideZeroRevenue} 
                    onChange={() => {}} // Handled by div click
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <span className="ml-2 text-[12px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">No sale</span>
            </div>
        </div>
    );
};

export default EmployeeAnalysisFilters;
