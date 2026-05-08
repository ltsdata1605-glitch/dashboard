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
        <div className="flex items-center gap-2 hide-on-export">
            {/* No sale Toggle Switch */}
            <div 
                className={`flex items-center gap-2 cursor-pointer transition-all duration-300`}
                onClick={() => setHideZeroRevenue(!hideZeroRevenue)}
            >
                <div className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" checked={hideZeroRevenue} readOnly className="sr-only peer" />
                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${hideZeroRevenue ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-400'}`}>Ẩn No Sale</span>
            </div>
        </div>
    );
};

export default EmployeeAnalysisFilters;
