import React from 'react';
import { Icon } from '../../common/Icon';
import { HEADER_CONFIG } from './SummaryTableUtils';

interface SummaryTableHeaderProps {
    displayTitle: string;
    displayDescription: string;
    filterState: any;
    tableMode: string;
    setTableMode: (mode: any) => void;
    isCrossSellingMode: boolean;
    userRole: string;
    setIsBuilderOpen: (open: boolean) => void;
    isComparisonMode: boolean;
    compMode: string;
    handleExport: () => void;
    isExporting: boolean;
    activeFilterKey: string | null;
    setActiveFilterKey: React.Dispatch<React.SetStateAction<string | null>>;
    visibleColumns: string[];
    setVisibleColumns: React.Dispatch<React.SetStateAction<string[]>>;
    columnsPopupRef: React.RefObject<HTMLDivElement>;
    isFullScreen?: boolean;
    setIsFullScreen?: (val: boolean) => void;
}

export const SummaryTableHeader: React.FC<SummaryTableHeaderProps> = ({
    displayTitle, displayDescription, filterState, tableMode, setTableMode,
    isCrossSellingMode, userRole, setIsBuilderOpen, isComparisonMode, compMode,
    handleExport, isExporting, activeFilterKey, setActiveFilterKey, visibleColumns,
    setVisibleColumns, columnsPopupRef, isFullScreen, setIsFullScreen
}) => {
    return (
        <header className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#0584c7]/10 text-[#0584c7] flex items-center justify-center shadow-sm">
                            <Icon name="table" size={6} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white uppercase">
                                {displayTitle}
                            </h1>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                                {displayDescription}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                {(filterState.kho.length > 0 && !filterState.kho.includes('all')) ? `KHO: ${filterState.kho.join(', ')} | ` : ''} 
                                {(filterState.xuat !== 'all') ? `TRẠNG THÁI XUẤT: ${filterState.xuat} | ` : ''}
                                {filterState.dateRange !== 'all' ? `TỪ ${filterState.startDate.split('T')[0].split('-').reverse().join('/')} ĐẾN ${filterState.endDate.split('T')[0].split('-').reverse().join('/')}` : 'TẤT CẢ THỜI GIAN'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                        <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hide-on-export">
                            <button 
                                onClick={() => setTableMode('standard')}
                                className={`py-1.5 px-3 sm:px-4 text-xs font-bold rounded-lg transition-all ${
                                    tableMode === 'standard' 
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                                }`}
                            >
                                Tiêu chuẩn
                            </button>
                            <button 
                                onClick={() => setTableMode('comparison')}
                                className={`py-1.5 px-3 sm:px-4 text-xs font-bold rounded-lg transition-all ${
                                    tableMode === 'comparison' 
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                                }`}
                            >
                                So sánh
                            </button>
                            <button 
                                onClick={() => setTableMode('cross_selling')}
                                className={`py-1.5 px-3 sm:px-4 text-xs font-bold rounded-lg transition-all ${
                                    tableMode === 'cross_selling' 
                                    ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                                }`}
                            >
                                Bán kèm
                            </button>
                            {isCrossSellingMode && userRole !== 'employee' && (
                                <button
                                    onClick={() => setIsBuilderOpen(true)}
                                    className="p-1.5 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm ml-2 hide-on-export shrink-0 flex items-center gap-1"
                                >
                                    <Icon name="sliders-horizontal" size={3.5} /> Cấu Hình Bảng
                                </button>
                            )}
                        </div>
                        
                        <div className="relative z-[100] hide-on-export" ref={columnsPopupRef}>
                            {isCrossSellingMode ? (
                                <button 
                                    onClick={handleExport} 
                                    disabled={isExporting} 
                                    title="Xuất Ảnh" 
                                    className="p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    {isExporting ? <Icon name="loader-2" size={5} className="animate-spin" /> : <Icon name="camera" size={5} />}
                                </button>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        {setIsFullScreen && (
                                            <button
                                                onClick={() => setIsFullScreen(!isFullScreen)}
                                                className={`p-2 rounded-md transition-colors ${isFullScreen ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                                title={isFullScreen ? "Thu nhỏ bảng" : "Phóng to toàn màn hình"}
                                            >
                                                <Icon name={isFullScreen ? "minimize" : "maximize"} size={5}/>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setActiveFilterKey(prev => prev === 'columns' ? null : 'columns')}
                                            className="p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                            title="Tùy chọn hiển thị cột"
                                        >
                                            <Icon name="settings-2" size={5}/>
                                        </button>
                                    </div>

                                    {activeFilterKey === 'columns' && (
                                        <div className="absolute right-0 sm:left-0 sm:right-auto md:right-0 md:left-auto mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-3 border border-slate-100 dark:border-slate-700 z-[200]">
                                            <div className="flex justify-between items-center mb-3 px-2 pt-1 border-b border-slate-50 pb-2 dark:border-slate-700/50">
                                                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Tùy chọn hiển thị cột</h4>
                                                <button onClick={() => setActiveFilterKey(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md transition-colors"><Icon name="x" size={4}/></button>
                                            </div>
                                            <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                                                {HEADER_CONFIG.filter((col: any) => {
                                                    const isPivotMode = isComparisonMode && compMode === 'monthly_trend';
                                                    const PIVOT_EXCLUDED_COLS = ['slPercent', 'dtThucPercent', 'avgQuantity', 'avgRevenue'];
                                                    if (isPivotMode && PIVOT_EXCLUDED_COLS.includes(col.key)) return false;
                                                    return true;
                                                }).map((col: any) => (
                                                    <div key={col.key} onClick={() => setVisibleColumns((prev: string[]) => prev.includes(col.key) ? prev.filter(k => k !== col.key) : [...prev, col.key])} className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 select-none">
                                                            <div className={`p-1.5 rounded-lg ${col.colorClass}`}>
                                                                <Icon name={col.icon || 'columns'} size={3.5} />
                                                            </div>
                                                            {col.label}
                                                        </span>
                                                        <div className="relative inline-flex items-center pointer-events-none">
                                                            <input 
                                                                type="checkbox" 
                                                                className="sr-only peer" 
                                                                checked={visibleColumns.includes(col.key)} 
                                                                readOnly
                                                            />
                                                            <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-500"></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
