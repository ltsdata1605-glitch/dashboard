import React, { forwardRef } from 'react';
import { formatCurrency, abbreviateName, formatQuantityWithFraction, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import type { ExploitationData } from '../../types';
import { detailQuickFilters, detailHeaderGroups, HeaderCell, getHeatmapClass, SortConfig } from './industry/IndustryTableUtils';
import { useIndustryAnalysisLogic } from './industry/useIndustryAnalysisLogic';
import { DEPT_COLORS, RankBadge } from './performance/PerformanceTableUtils';
import { DATA_STATUS_COLORS } from '../../constants';


interface IndustryAnalysisTabProps {
    data: ExploitationData[];
    onExport?: () => void;
    isExporting?: boolean;
    onBatchExport: (data: ExploitationData[]) => void;
    baseFilteredData?: any[];
    productConfig?: any;
    customExploitationTabs?: any[];
    onManageCustomTabs?: () => void;
    onEditCustomTab?: (tabId: string) => void;
    onDeleteCustomTab?: (tabId: string) => void;
}
const IndustryAnalysisTab = React.memo(forwardRef<HTMLDivElement, IndustryAnalysisTabProps>(({ data, onExport, isExporting, onBatchExport, baseFilteredData, productConfig, customExploitationTabs, onManageCustomTabs, onEditCustomTab, onDeleteCustomTab }, ref) => {
    const {
        viewMode,
        setViewMode,
        visibleGroups,
        handleToggleGroup,
        sortConfig,
        handleSort,
        processedData,
        groupTotals,
        grandTotal,
        dynamicQuickFilters,
        dynamicHeaderGroups
    } = useIndustryAnalysisLogic(data, baseFilteredData, productConfig, customExploitationTabs);
    
    const showDeptHeaders = Object.keys(processedData).length > 1 || (Object.keys(processedData).length === 1 && Object.keys(processedData)[0] !== 'Không Phân Ca');
    
    const formatPct = (value: number) => value > 0 ? `${value.toFixed(0)}%` : '-';
    const formatNum = (value: number) => value > 0 ? formatQuantityWithFraction(value) : '-';
    const formatC = (value: number) => value > 0 ? formatCurrency(value) : '-';
    const boldBlueText = 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg';
    const warningText = 'text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-lg';
    
    // ----------------------------

    const renderDetailModeCells = (rowData: any, employeesInGroup?: any[]) => (
        <>
            {Array.from(visibleGroups).map(key => {
                if (key === 'doanhThu') {
                    let styleDT: React.CSSProperties = {};
                    let styleQD: React.CSSProperties = {};
                    let styleHQ: React.CSSProperties = {};
                    
                    if (employeesInGroup && employeesInGroup.length > 0) {
                        const getStyle = (field: string, val: number) => {
                            const validValues = employeesInGroup.map(emp => emp[field] || 0);
                            const average = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
                            const sortedVals = [...new Set(validValues)].sort((a, b) => b - a);
                            const rank = sortedVals.indexOf(val) + 1;
                            
                            if (val > 0 && rank <= 3) return { backgroundColor: DATA_STATUS_COLORS.positive.bg, color: DATA_STATUS_COLORS.positive.text, fontWeight: 'bold' };
                            if (val < average) return { backgroundColor: DATA_STATUS_COLORS.negative.bg, color: DATA_STATUS_COLORS.negative.text, fontWeight: 'bold' };
                            return {};
                        };
                        styleDT = getStyle('doanhThuThuc', rowData.doanhThuThuc || 0);
                        styleQD = getStyle('doanhThuQD', rowData.doanhThuQD || 0);
                        styleHQ = getStyle('hieuQuaQD', rowData.hieuQuaQD || 0);
                    }

                    const subHeaders = dynamicHeaderGroups[key]?.subHeaders || [];
                    const showDT = subHeaders.some((sh: any) => sh.key === 'doanhThuThuc');
                    const showQD = subHeaders.some((sh: any) => sh.key === 'doanhThuQD');
                    const showHQ = subHeaders.some((sh: any) => sh.key === 'hieuQuaQD');

                    return (
                        <React.Fragment key={key}>
                            {showDT && (
                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">
                                    <div className={`inline-block px-1 sm:px-1.5 py-0.5 ${Object.keys(styleDT).length > 0 ? 'rounded-md' : ''}`} style={styleDT}>
                                        {formatC(rowData.doanhThuThuc)}
                                    </div>
                                </td>
                            )}
                            {showQD && (
                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">
                                    <div className={`inline-block px-1 sm:px-1.5 py-0.5 ${Object.keys(styleQD).length > 0 ? 'rounded-md' : ''}`} style={styleQD}>
                                        {formatC(rowData.doanhThuQD)}
                                    </div>
                                </td>
                            )}
                            {showHQ && (
                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black border-b border-r border-slate-200 dark:border-slate-700">
                                    {Object.keys(styleHQ).length > 0 ? (
                                        <div className="inline-block px-1 sm:px-1.5 py-0.5 rounded-md" style={styleHQ}>
                                            {formatPct(rowData.hieuQuaQD)}
                                        </div>
                                    ) : (
                                        <span className="text-indigo-600 dark:text-indigo-400">{formatPct(rowData.hieuQuaQD)}</span>
                                    )}
                                </td>
                            )}
                        </React.Fragment>
                    );
                }
                if (key === 'spChinh') {
                    let styleICT: React.CSSProperties = {};
                    let styleCE: React.CSSProperties = {};
                    let styleGD: React.CSSProperties = {};
                    let styleTong: React.CSSProperties = {};
                    
                    if (employeesInGroup && employeesInGroup.length > 0) {
                        const getStyle = (field: string, val: number) => {
                            const validValues = employeesInGroup.map(emp => emp[field] || 0);
                            const average = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
                            const sortedVals = [...new Set(validValues)].sort((a, b) => b - a);
                            const rank = sortedVals.indexOf(val) + 1;
                            
                            if (val > 0 && rank <= 3) return { backgroundColor: DATA_STATUS_COLORS.positive.bg, color: DATA_STATUS_COLORS.positive.text, fontWeight: 'bold' };
                            if (val < average) return { backgroundColor: DATA_STATUS_COLORS.negative.bg, color: DATA_STATUS_COLORS.negative.text, fontWeight: 'bold' };
                            return {};
                        };
                        styleICT = getStyle('slICT', rowData.slICT || 0);
                        styleCE = getStyle('slCE_main', rowData.slCE_main || 0);
                        styleGD = getStyle('slGiaDung_main', rowData.slGiaDung_main || 0);
                        styleTong = getStyle('slSPChinh_Tong', rowData.slSPChinh_Tong || 0);
                    }

                    const subHeaders = dynamicHeaderGroups[key]?.subHeaders || [];
                    const showICT = subHeaders.some((sh: any) => sh.key === 'slICT');
                    const showCE = subHeaders.some((sh: any) => sh.key === 'slCE_main');
                    const showGD = subHeaders.some((sh: any) => sh.key === 'slGiaDung_main');
                    const showTong = subHeaders.some((sh: any) => sh.key === 'slSPChinh_Tong');

                    return (
                        <React.Fragment key={key}>
                            {showICT && (
                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-400 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">
                                    <div className={`inline-block px-1 sm:px-1.5 py-0.5 ${Object.keys(styleICT).length > 0 ? 'rounded-md' : ''}`} style={styleICT}>
                                        {formatNum(rowData.slICT)}
                                    </div>
                                </td>
                            )}
                            {showCE && (
                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-400 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">
                                    <div className={`inline-block px-1 sm:px-1.5 py-0.5 ${Object.keys(styleCE).length > 0 ? 'rounded-md' : ''}`} style={styleCE}>
                                        {formatNum(rowData.slCE_main)}
                                    </div>
                                </td>
                            )}
                            {showGD && (
                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-400 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">
                                    <div className={`inline-block px-1 sm:px-1.5 py-0.5 ${Object.keys(styleGD).length > 0 ? 'rounded-md' : ''}`} style={styleGD}>
                                        {formatNum(rowData.slGiaDung_main)}
                                    </div>
                                </td>
                            )}
                            {showTong && (
                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/50 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">
                                    <div className={`inline-block px-1 sm:px-1.5 py-0.5 ${Object.keys(styleTong).length > 0 ? 'rounded-md' : ''}`} style={styleTong}>
                                        {formatNum(rowData.slSPChinh_Tong)}
                                    </div>
                                </td>
                            )}
                        </React.Fragment>
                    );
                }

                const tab = (customExploitationTabs || []).find(t => t.id === key);
                if (tab) {
                    const cols = (tab.columns || []).filter(c => !c.hidden);
                    
                    if (cols.length === 0) {
                        return <td key={tab.id} className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-slate-400 border-b border-r border-slate-200 dark:border-slate-700">-</td>;
                    }

                    return (
                        <React.Fragment key={tab.id}>
                            {cols.map(col => {
                                const val = rowData[`val_${tab.id}_${col.id}`] || 0;
                                let badgeStyle: React.CSSProperties = {};
                                
                                if (employeesInGroup && employeesInGroup.length > 0) {
                                    const average = employeesInGroup.reduce((sum, emp) => sum + (emp[`val_${tab.id}_${col.id}`] || 0), 0) / employeesInGroup.length;
                                    const sortedVals = [...new Set(employeesInGroup.map(emp => emp[`val_${tab.id}_${col.id}`] || 0))].sort((a, b) => b - a);
                                    const rank = sortedVals.indexOf(val) + 1;
                                    
                                    if (val > 0 && rank <= 3) {
                                        badgeStyle = { backgroundColor: DATA_STATUS_COLORS.positive.bg, color: DATA_STATUS_COLORS.positive.text, fontWeight: 'bold' };
                                    } else if (val < average) {
                                        badgeStyle = { backgroundColor: DATA_STATUS_COLORS.negative.bg, color: DATA_STATUS_COLORS.negative.text, fontWeight: 'bold' };
                                    }
                                }

                                const hasStyle = Object.keys(badgeStyle).length > 0;

                                if (col.type === 'quantity') {
                                    return (
                                        <td key={col.id} className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-400 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">
                                            <div className={`inline-block px-1 sm:px-1.5 py-0.5 ${hasStyle ? 'rounded-md' : ''}`} style={badgeStyle}>
                                                {formatNum(val)}
                                            </div>
                                        </td>
                                    );
                                }
                                if (col.type === 'revenue') {
                                    return (
                                        <td key={col.id} className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">
                                            <div className={`inline-block px-1 sm:px-1.5 py-0.5 ${hasStyle ? 'rounded-md' : ''}`} style={badgeStyle}>
                                                {formatC(val)}
                                            </div>
                                        </td>
                                    );
                                }
                                return (
                                    <td key={col.id} className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold border-b border-r border-slate-200 dark:border-slate-700">
                                        {hasStyle ? (
                                            <div className="inline-block px-1 sm:px-1.5 py-0.5 rounded-md" style={badgeStyle}>
                                                {formatPct(val)}
                                            </div>
                                        ) : (
                                            <span className={getHeatmapClass(val, 30)}>{formatPct(val)}</span>
                                        )}
                                    </td>
                                );
                            })}
                        </React.Fragment>
                    );
                }
                return null;
            })}
        </>
    );

    const efficiencyKtHeaders = [
        { label: '# Yếu', key: 'belowAverageCount' }, { label: '%BH', key: 'percentBaoHiem' }, { label: '%SIM', key: 'percentSimKT' },
        { label: '%PK', key: 'percentPhuKienKT' }, { label: '%ĐHồ', key: 'percentDongHoKT' }, { label: '%GD', key: 'percentGiaDungKT' }
    ];

    const efficiencyDtHeaders = [
        { label: 'SIM', key: 'doanhThuSim' }, { label: 'ĐHồ', key: 'doanhThuDongHo' }, { label: 'DT BH', key: 'doanhThuBaoHiem' },
        { label: 'DT PK', key: 'doanhThuPhuKien' }, { label: 'DT GD', key: 'doanhThuGiaDung' }
    ];

    const efficiencyQuantityHeaders = [
        { label: 'SL SIM', key: 'slSim' }, { label: 'SL ĐH', key: 'slDongHo' }, { label: 'SL BH', key: 'slBaoHiem' },
        { label: 'SL PK', key: 'slPhuKien' }, { label: 'SL GD', key: 'slGiaDung' }
    ];

    return (
        <div ref={ref} className="overflow-hidden flex flex-col h-full bg-transparent">
            {/* Header */}
            <div className="flex justify-between items-center mb-3 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className={`w-6 h-6 sm:w-10 sm:h-10 rounded-md sm:rounded-xl flex items-center justify-center shrink-0 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400`}>
                        <Icon name="gantt-chart-square" size={3.5} className="sm:hidden" />
                        <Icon name="gantt-chart-square" size={5} className="hidden sm:block" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[11px] sm:text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight truncate leading-tight">Phân Tích Khai Thác</h3>
                        <p className="text-[8px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate leading-none mt-0.5">Chi tiết sản phẩm & hiệu quả bán kèm</p>
                    </div>
                </div>
                <div className="px-0 sm:px-6 py-0 sm:py-2 sm:border-b sm:border-slate-100 dark:sm:border-slate-800 bg-transparent hide-on-export overflow-x-auto">
                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="inline-flex gap-0.5 sm:gap-1 shrink-0">
                            <button onClick={() => setViewMode('detail')} className={`p-1 sm:py-1.5 sm:px-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1 sm:gap-1.5 ${viewMode === 'detail' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`} title="Chi tiết">
                                <Icon name="list" size={3.5} />
                                <span className="hidden sm:inline">Chi tiết</span>
                            </button>
                            <button onClick={() => setViewMode('efficiency')} className={`p-1 sm:py-1.5 sm:px-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1 sm:gap-1.5 ${viewMode === 'efficiency' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`} title="Hiệu quả %">
                                <Icon name="percent" size={3.5} />
                                <span className="hidden sm:inline">Hiệu quả %</span>
                            </button>
                        </div>
                        <div className="h-4 sm:h-6 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 sm:mx-1 shrink-0"></div>
                         <button onClick={() => onBatchExport(data)} title="Xuất hàng loạt báo cáo chi tiết" className="p-1.5 sm:p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg sm:rounded-xl transition-all shrink-0">
                            <Icon name="images" size={3.5} className="sm:hidden" />
                            <Icon name="images" size={5} className="hidden sm:block" />
                        </button>
                        {onExport && (
                            <button onClick={(e) => { e.stopPropagation(); onExport?.(); }} disabled={isExporting} title="Xuất Ảnh Tab" className="p-1.5 sm:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg sm:rounded-xl transition-all shrink-0">
                                {isExporting ? <Icon name="loader-2" size={3.5} className="animate-spin sm:hidden" /> : <Icon name="camera" size={3.5} className="sm:hidden" />}
                                {isExporting ? <Icon name="loader-2" size={5} className="animate-spin hidden sm:block" /> : <Icon name="camera" size={5} className="hidden sm:block" />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            {viewMode === 'detail' && (
                <div className="mt-1 sm:mt-2 mb-2 overflow-x-auto no-scrollbar hide-on-export">
                    <div className="flex gap-0 border-b border-slate-200 dark:border-slate-700/60 w-max sm:w-auto">
                        {dynamicQuickFilters.map(f => {
                            const isActive = visibleGroups.has(f.key);
                            return (
                            <button 
                                key={f.key} 
                                onClick={() => handleToggleGroup(f.key)}
                                className={`relative px-2.5 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-[11px] uppercase tracking-wider font-bold whitespace-nowrap transition-colors ${
                                    isActive
                                    ? 'text-slate-800 dark:text-white'
                                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                                }`}
                            >
                                {f.label}
                                {isActive && (
                                    <span className="absolute bottom-0 left-1 right-1 h-[2.5px] bg-sky-400 dark:bg-sky-400 rounded-full" />
                                )}
                            </button>
                        )})}
                        {onManageCustomTabs && (
                             <button 
                                 onClick={onManageCustomTabs}
                                 title="Tạo thẻ mới"
                                 className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-[11px] uppercase tracking-wider font-bold whitespace-nowrap transition-colors text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1 shrink-0"
                             >
                                 <Icon name="plus" size={3.5} />
                                 <span className="hidden sm:inline">Thêm thẻ</span>
                             </button>
                        )}
                    </div>
                </div>
            )}


            <div className="overflow-x-auto custom-scrollbar flex-grow p-0 border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse">
                     <thead className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600">
                        {viewMode === 'detail' ? (
                            <>
                                <tr>
                                    <th colSpan={2} rowSpan={2} onClick={() => handleSort('name')} className="px-2 sm:px-4 py-1 sm:py-2 text-center text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer select-none min-w-[100px] sm:min-w-[140px] align-middle sticky left-0 z-40 h-px hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                        <div className="flex items-center justify-center gap-1">
                                            NHÂN VIÊN
                                            {sortConfig.key === 'name' && (
                                                <span className="hide-on-export"><Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} /></span>
                                            )}
                                        </div>
                                    </th>
                                    {Array.from(visibleGroups).map((key, gIdx) => {
                                        const f = dynamicQuickFilters.find(filter => filter.key === key);
                                        if (!f) return null;
                                        return (
                                        <th key={f.key} colSpan={dynamicHeaderGroups[f.key]?.colSpan || 1} className={`px-1 sm:px-2 py-1 sm:py-2 text-center text-[9px] sm:text-[11px] font-bold uppercase tracking-wider border-b border-r border-slate-200 dark:border-slate-700 h-px ${dynamicHeaderGroups[f.key]?.bg || ''} ${dynamicHeaderGroups[f.key]?.text || ''} relative group/th`}>
                                            <div className="flex items-center justify-center gap-1">
                                                {dynamicHeaderGroups[f.key]?.label || f.label}
                                            </div>
                                            <div className="absolute top-0 right-0 z-10 flex items-center opacity-0 group-hover/th:opacity-100 transition-opacity hide-on-export">
                                                {onEditCustomTab && <button onClick={(e) => { e.stopPropagation(); onEditCustomTab(f.key); }} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white shadow-sm border border-slate-200 hover:z-20"><Icon name="edit-3" size={3}/></button>}
                                                {f.isCustom && onDeleteCustomTab && <button onClick={(e) => { e.stopPropagation(); onDeleteCustomTab(f.key); }} className="p-1.5 text-slate-400 hover:text-rose-600 bg-white shadow-sm border border-slate-200 border-l-0 hover:z-20"><Icon name="trash-2" size={3}/></button>}
                                            </div>
                                        </th>
                                    )})}
                                </tr>
                                <tr>
                                    {Array.from(visibleGroups).flatMap((key, gIdx) => {
                                        const f = dynamicQuickFilters.find(filter => filter.key === key);
                                        if (!f) return [];
                                        return (dynamicHeaderGroups[f.key]?.subHeaders || []).map((subHeader: any, sIdx: number) => (
                                            <HeaderCell 
                                                key={subHeader.key} 
                                                label={subHeader.label} 
                                                sortKey={subHeader.key} 
                                                onSort={handleSort} 
                                                sortConfig={sortConfig}
                                                colorConfig={{ bg: dynamicHeaderGroups[f.key].bg, text: dynamicHeaderGroups[f.key].text }}
                                            />
                                        ));
                                    })}
                                </tr>
                            </>
                        ) : (
                            <>
                                 <tr>
                                    <th colSpan={2} rowSpan={2} onClick={() => handleSort('name')} className="px-2 sm:px-4 py-1 sm:py-2 text-center text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer select-none min-w-[100px] sm:min-w-[140px] align-middle sticky left-0 z-40 h-px hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                        <div className="flex items-center justify-center gap-1">
                                            NHÂN VIÊN
                                            {sortConfig.key === 'name' && (
                                                <span className="hide-on-export"><Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} /></span>
                                            )}
                                        </div>
                                    </th>
                                    <th colSpan={4} className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[9px] sm:text-[11px] font-bold uppercase tracking-wider border-b border-r border-slate-200 dark:border-slate-700 h-px bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
                                        SỐ LƯỢNG SẢN PHẨM CHÍNH
                                    </th>
                                    {viewMode === 'efficiency' ? (
                                        <th colSpan={6} className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[9px] sm:text-[11px] font-bold uppercase tracking-wider border-b border-r border-slate-200 dark:border-slate-700 h-px bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300">HIỆU QUẢ KHAI THÁC BÁN KÈM</th>
                                    ) : viewMode === 'efficiency_dt_sl' ? (
                                        <th colSpan={5} className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[9px] sm:text-[11px] font-bold uppercase tracking-wider border-b border-r border-slate-200 dark:border-slate-700 h-px bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">HIỆU QUẢ DOANH THU</th>
                                    ) : (
                                        <th colSpan={5} className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[9px] sm:text-[11px] font-bold uppercase tracking-wider border-b border-r border-slate-200 dark:border-slate-700 h-px bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300">HIỆU QUẢ SỐ LƯỢNG</th>
                                    )}
                                </tr>
                                <tr>
                                    <HeaderCell label="ICT" sortKey="slICT" onSort={handleSort} sortConfig={sortConfig} colorConfig={{bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300'}} />
                                    <HeaderCell label="CE" sortKey="slCE_main" onSort={handleSort} sortConfig={sortConfig} colorConfig={{bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300'}} />
                                    <HeaderCell label="ĐGD" sortKey="slGiaDung_main" onSort={handleSort} sortConfig={sortConfig} colorConfig={{bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300'}} />
                                    <HeaderCell label="Tổng" sortKey="slSPChinh_Tong" onSort={handleSort} sortConfig={sortConfig} colorConfig={{bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300'}} />
                                    {(viewMode === 'efficiency' ? efficiencyKtHeaders : viewMode === 'efficiency_dt_sl' ? efficiencyDtHeaders : efficiencyQuantityHeaders).map((h, i) => {
                                        const bg = viewMode === 'efficiency' ? 'bg-rose-50 dark:bg-rose-900/20' : viewMode === 'efficiency_dt_sl' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-cyan-50 dark:bg-cyan-900/20';
                                        const text = viewMode === 'efficiency' ? 'text-rose-700 dark:text-rose-300' : viewMode === 'efficiency_dt_sl' ? 'text-amber-700 dark:text-amber-300' : 'text-cyan-700 dark:text-cyan-300';
                                        return <HeaderCell key={h.key} label={h.label} sortKey={h.key as SortConfig['key']} onSort={handleSort} sortConfig={sortConfig} colorConfig={{bg, text}} />;
                                    })}
                                </tr>
                            </>
                        )}
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {Object.entries(processedData).map(([dept, employees], deptIdx) => {
                            const pastelColors = [
                                'bg-blue-50/50 dark:bg-blue-900/20',
                                'bg-emerald-50/50 dark:bg-emerald-900/20',
                                'bg-purple-50/50 dark:bg-purple-900/20',
                                'bg-amber-50/50 dark:bg-amber-900/20',
                                'bg-rose-50/50 dark:bg-rose-900/20',
                                'bg-sky-50/50 dark:bg-sky-900/20',
                                'bg-indigo-50/50 dark:bg-indigo-900/20',
                                'bg-teal-50/50 dark:bg-teal-900/20'
                            ];
                            const deptColor = pastelColors[deptIdx % pastelColors.length];

                            return (
                            <React.Fragment key={dept}>
                                {showDeptHeaders && (
                                    <tr>
                                        <td colSpan={100} className={`px-2 sm:px-3 py-1 sm:py-1.5 ${DEPT_COLORS[deptIdx % DEPT_COLORS.length].strip} border-y border-slate-200 dark:border-slate-700 sticky left-0 z-10`}>
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <span className={`w-1 sm:w-2 h-3 sm:h-4 rounded-full ${DEPT_COLORS[deptIdx % DEPT_COLORS.length].badge} flex-shrink-0`} />
                                                <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${DEPT_COLORS[deptIdx % DEPT_COLORS.length].text}`}>{dept} — {(employees as any[]).length} người</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                 {(employees as (ExploitationData & { slSPChinh_Tong: number, belowAverageCount: number })[]).map((employee, index) => {
                                    const rankIndex = (processedData[dept] as any[]).findIndex(e => e.name === employee.name);
                                    const rankDisplay = <RankBadge rank={rankIndex} />;

                                    return (
                                        <tr key={employee.name} className={`group border-b border-slate-200 dark:border-slate-700 transition-colors duration-100 hover:bg-slate-100 dark:hover:bg-slate-800 ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                            <td className="px-2 py-1 text-center border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-inherit z-20">
                                                {rankDisplay}
                                            </td>
                                            <td className="px-1.5 sm:px-3 py-1 text-left sticky left-8 bg-inherit z-20 border-r border-slate-200 dark:border-slate-700">
                                                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                                    <span className="text-[11px] sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate max-w-[100px] sm:max-w-[140px]">{abbreviateName(employee.name)}</span>
                                                </div>
                                            </td>
                                            {viewMode === 'detail' ? renderDetailModeCells(employee, employees as any[]) : viewMode === 'efficiency' ? (
                                                <>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slICT)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slCE_main)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slGiaDung_main)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum((employee as any).slSPChinh_Tong)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-rose-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{((employee as any).belowAverageCount) > 0 ? (employee as any).belowAverageCount : '-'}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                        <span className={getHeatmapClass(employee.percentBaoHiem, 40)}>{formatPct(employee.percentBaoHiem)}</span>
                                                    </td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                        <span className={getHeatmapClass((employee as any).percentSimKT, 30)}>{formatPct((employee as any).percentSimKT)}</span>
                                                    </td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                        <span className={getHeatmapClass((employee as any).percentPhuKienKT, 10)}>{formatPct((employee as any).percentPhuKienKT)}</span>
                                                    </td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                        <span className={getHeatmapClass((employee as any).percentDongHoKT, 20)}>{formatPct((employee as any).percentDongHoKT)}</span>
                                                    </td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                        <span className={getHeatmapClass((employee as any).percentGiaDungKT, 30)}>{formatPct((employee as any).percentGiaDungKT)}</span>
                                                    </td>
                                                </>
                                            ) : viewMode === 'efficiency_dt_sl' ? (
                                                 <>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slICT)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slCE_main)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slGiaDung_main)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum((employee as any).slSPChinh_Tong)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(employee.doanhThuSim)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(employee.doanhThuDongHo)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(employee.doanhThuBaoHiem)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(employee.doanhThuPhuKien)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(employee.doanhThuGiaDung)}</td>
                                                </>
                                            ) : ( // efficiency_quantity
                                                <>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slICT)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slCE_main)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slGiaDung_main)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum((employee as any).slSPChinh_Tong)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slSim)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slDongHo)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slBaoHiem)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slPhuKien)}</td>
                                                    <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slGiaDung)}</td>
                                                </>
                                            )}
                                        </tr>
                                    )
                                })}
                                {Object.keys(processedData).length > 1 && groupTotals[dept] && (
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 font-bold">
                                        <td colSpan={2} className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-left text-[10px] sm:text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest sticky left-0 bg-slate-50 dark:bg-slate-800 z-20 border-b border-r border-slate-200 dark:border-slate-700">Tổng Nhóm</td>
                                         {viewMode === 'detail' ? renderDetailModeCells(groupTotals[dept]) : viewMode === 'efficiency' ? (
                                            <>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slICT)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slCE_main)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slGiaDung_main)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-800 dark:text-white tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slSPChinh_Tong)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center border-b border-r border-slate-200 dark:border-slate-700"></td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                    <span className={getHeatmapClass(groupTotals[dept].percentBaoHiem, 40)}>{formatPct(groupTotals[dept].percentBaoHiem)}</span>
                                                </td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                    <span className={getHeatmapClass(groupTotals[dept].percentSimKT, 30)}>{formatPct(groupTotals[dept].percentSimKT)}</span>
                                                </td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                    <span className={getHeatmapClass(groupTotals[dept].percentPhuKienKT, 10)}>{formatPct(groupTotals[dept].percentPhuKienKT)}</span>
                                                </td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] border-b border-slate-100 dark:border-slate-800 border-r border-slate-50">
                                                    <span className={getHeatmapClass(groupTotals[dept].percentDongHoKT, 20)}>{formatPct(groupTotals[dept].percentDongHoKT)}</span>
                                                </td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] border-b border-slate-100 dark:border-slate-800 border-r border-slate-50">
                                                    <span className={getHeatmapClass(groupTotals[dept].percentGiaDungKT, 30)}>{formatPct(groupTotals[dept].percentGiaDungKT)}</span>
                                                </td>
                                            </>
                                        ) : viewMode === 'efficiency_dt_sl' ? (
                                            <>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slICT)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slCE_main)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slGiaDung_main)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-800 dark:text-white tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slSPChinh_Tong)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(groupTotals[dept].doanhThuSim)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(groupTotals[dept].doanhThuDongHo)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(groupTotals[dept].doanhThuBaoHiem)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(groupTotals[dept].doanhThuPhuKien)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(groupTotals[dept].doanhThuGiaDung)}</td>
                                            </>
                                        ) : ( // efficiency_quantity
                                            <>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slICT)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slCE_main)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slGiaDung_main)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-800 dark:text-white tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slSPChinh_Tong)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slSim)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slDongHo)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slBaoHiem)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slPhuKien)}</td>
                                                <td className="px-1.5 sm:px-3 py-1 sm:py-2 text-center text-[11px] sm:text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slGiaDung)}</td>
                                            </>
                                        )}
                                    </tr>
                                )}
                            </React.Fragment>
                        );})}
                    </tbody>
                    <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold text-[11px] sm:text-[13px] border-t border-slate-200 dark:border-slate-700">
                         <tr>
                            <td colSpan={2} className="px-2 sm:px-4 py-1 sm:py-1.5 text-center text-[10px] sm:text-[12px] font-extrabold text-teal-700 dark:text-teal-300 uppercase tracking-widest sticky left-0 bg-slate-100 dark:bg-slate-800 z-30 border-r border-slate-200 dark:border-slate-700">∑ Tổng</td>
                            {viewMode === 'detail' ? renderDetailModeCells(grandTotal) : viewMode === 'efficiency' ? (
                                <>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slICT)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slCE_main)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slGiaDung_main)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slSPChinh_Tong)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center border-r border-slate-200 dark:border-slate-700"></td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] border-r border-slate-200 dark:border-slate-700">
                                        <span className={getHeatmapClass(grandTotal.percentBaoHiem, 40)}>{formatPct(grandTotal.percentBaoHiem)}</span>
                                    </td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] border-r border-slate-200 dark:border-slate-700">
                                        <span className={getHeatmapClass(grandTotal.percentSimKT, 30)}>{formatPct(grandTotal.percentSimKT)}</span>
                                    </td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] border-r border-slate-200 dark:border-slate-700">
                                        <span className={getHeatmapClass(grandTotal.percentPhuKienKT, 10)}>{formatPct(grandTotal.percentPhuKienKT)}</span>
                                    </td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] border-r border-slate-200 dark:border-slate-700">
                                        <span className={getHeatmapClass(grandTotal.percentDongHoKT, 20)}>{formatPct(grandTotal.percentDongHoKT)}</span>
                                    </td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] border-r border-slate-200 dark:border-slate-700">
                                        <span className={getHeatmapClass(grandTotal.percentGiaDungKT, 30)}>{formatPct(grandTotal.percentGiaDungKT)}</span>
                                    </td>
                                </>
                            ) : viewMode === 'efficiency_dt_sl' ? (
                                <>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slICT)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slCE_main)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slGiaDung_main)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slSPChinh_Tong)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatC(grandTotal.doanhThuSim)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatC(grandTotal.doanhThuDongHo)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatC(grandTotal.doanhThuBaoHiem)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatC(grandTotal.doanhThuPhuKien)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatC(grandTotal.doanhThuGiaDung)}</td>
                                </>
                            ) : ( // efficiency_quantity
                                <>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slICT)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slCE_main)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slGiaDung_main)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slSPChinh_Tong)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slSim)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slDongHo)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slBaoHiem)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slPhuKien)}</td>
                                    <td className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slGiaDung)}</td>
                                </>
                            )}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}));

export default IndustryAnalysisTab;
