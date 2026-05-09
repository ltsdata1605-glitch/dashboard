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
    dateDisplay?: { current: string; prev: string };
}

export const SummaryTableHeader: React.FC<SummaryTableHeaderProps> = ({
    displayTitle, displayDescription, filterState, tableMode, setTableMode,
    isCrossSellingMode, userRole, setIsBuilderOpen, isComparisonMode, compMode,
    handleExport, isExporting, activeFilterKey, setActiveFilterKey, visibleColumns,
    setVisibleColumns, columnsPopupRef, isFullScreen, setIsFullScreen, dateDisplay
}) => {
    return (
        <header className="px-3 sm:px-6 py-2 sm:py-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex flex-row justify-between items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#0584c7]/10 text-[#0584c7] flex items-center justify-center shadow-sm shrink-0">
                            <Icon name="table" size={4} className="sm:hidden" />
                            <Icon name="table" size={5} className="hidden sm:block" />
                        </div>
                        <div className="min-w-0">
                            {/* Mobile: fixed title + comparison subtitle */}
                            <h1 className="sm:hidden text-xs font-bold tracking-tight text-slate-800 dark:text-white uppercase truncate">
                                {isComparisonMode ? 'SO SÁNH MỐC THỜI GIAN' : 'CHI TIẾT NGÀNH HÀNG'}
                            </h1>
                            {isComparisonMode && (
                                <p className="sm:hidden text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider truncate leading-none mt-0.5">
                                    {({
                                        day_adjacent: 'Ngày (Liền kề)',
                                        day_same_period: 'Ngày (CK tháng trước)',
                                        week_adjacent: 'Tuần (Liền kề)',
                                        week_same_period: 'Tuần (CK tháng trước)',
                                        month_adjacent: 'Tháng (Liền kề)',
                                        month_same_period_year: 'Tháng (Cùng kỳ năm trước)',
                                        monthly_trend: 'Tháng (Nhiều tháng Pivot)',
                                        quarter_adjacent: 'Quý (Liền kề)',
                                        quarter_same_period_year: 'Quý (Cùng kỳ năm trước)',
                                        ytd_same_period_year: 'Lũy kế (YTD)',
                                        custom_range: 'Tùy chỉnh',
                                    } as Record<string, string>)[compMode] || compMode}
                                    {dateDisplay && <span className="text-slate-500 dark:text-slate-400"> · {dateDisplay.current}</span>}
                                </p>
                            )}
                            {/* Desktop: original dynamic title */}
                            <h1 className="hidden sm:block text-xl font-bold tracking-tight text-slate-800 dark:text-white uppercase">
                                {displayTitle}
                            </h1>
                            <p className="hidden sm:block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                                {displayDescription}
                            </p>
                            <p className="hidden sm:block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                {(filterState.kho.length > 0 && !filterState.kho.includes('all')) ? `KHO: ${filterState.kho.join(', ')} | ` : ''} 
                                {(filterState.xuat !== 'all') ? `TRẠNG THÁI XUẤT: ${filterState.xuat} | ` : ''}
                                {filterState.dateRange !== 'all' ? `TỪ ${filterState.startDate.split('T')[0].split('-').reverse().join('/')} ĐẾN ${filterState.endDate.split('T')[0].split('-').reverse().join('/')}` : 'TẤT CẢ THỜI GIAN'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center hide-on-export">
                            <button 
                                onClick={() => setTableMode('standard')}
                                className={`p-1.5 lg:p-2 rounded-md transition-colors ${
                                    tableMode === 'standard' 
                                    ? 'text-indigo-600 dark:text-indigo-400' 
                                    : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title="Tiêu chuẩn"
                            >
                                <Icon name="table" size={4} className="lg:hidden" />
                                <Icon name="table" size={5} className="hidden lg:block" />
                            </button>
                            <button 
                                onClick={() => setTableMode('comparison')}
                                className={`p-1.5 lg:p-2 rounded-md transition-colors ${
                                    tableMode === 'comparison' 
                                    ? 'text-indigo-600 dark:text-indigo-400' 
                                    : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title="So sánh"
                            >
                                <Icon name="columns-2" size={4} className="lg:hidden" />
                                <Icon name="columns-2" size={5} className="hidden lg:block" />
                            </button>
                        </div>
                        
                        <div className="relative z-[100] hide-on-export shrink-0" ref={columnsPopupRef}>
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
                                        <button
                                            onClick={() => setActiveFilterKey(prev => prev === 'columns' ? null : 'columns')}
                                            className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                            title="Tùy chọn hiển thị cột"
                                        >
                                            <Icon name="settings-2" size={4.5}/>
                                        </button>
                                        <button onClick={handleExport} disabled={isExporting} title="Xuất Ảnh" className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                            {isExporting ? <Icon name="loader-2" size={4.5} className="animate-spin" /> : <Icon name="camera" size={4.5} />}
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
