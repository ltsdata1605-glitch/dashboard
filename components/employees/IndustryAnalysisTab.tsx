import React, { forwardRef } from 'react';
import { formatCurrency, abbreviateName, formatQuantityWithFraction, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import type { ExploitationData } from '../../types';
import { detailQuickFilters, detailHeaderGroups, HeaderCell, getHeatmapClass, SortConfig } from './industry/IndustryTableUtils';
import { useIndustryAnalysisLogic } from './industry/useIndustryAnalysisLogic';


interface IndustryAnalysisTabProps {
    data: ExploitationData[];
    onExport?: () => void;
    isExporting?: boolean;
    onBatchExport: (data: ExploitationData[]) => void;
}
const IndustryAnalysisTab = React.memo(forwardRef<HTMLDivElement, IndustryAnalysisTabProps>(({ data, onExport, isExporting, onBatchExport }, ref) => {
    const {
        viewMode,
        setViewMode,
        visibleGroups,
        handleToggleGroup,
        sortConfig,
        handleSort,
        processedData,
        groupTotals,
        grandTotal
    } = useIndustryAnalysisLogic(data);
    
    const showDeptHeaders = Object.keys(processedData).length > 1 || (Object.keys(processedData).length === 1 && Object.keys(processedData)[0] !== 'Không Phân Ca');
    
    const formatPct = (value: number) => value > 0 ? `${value.toFixed(0)}%` : '-';
    const formatNum = (value: number) => value > 0 ? formatQuantityWithFraction(value) : '-';
    const formatC = (value: number) => value > 0 ? formatCurrency(value) : '-';
    const boldBlueText = 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg';
    const warningText = 'text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-lg';
    


    const renderDetailModeCells = (rowData: any) => (
        <>
            {visibleGroups.has('doanhThu') && <>
                <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(rowData.doanhThuThuc)}</td>
                <td className="px-3 py-2 text-center text-[13px] font-bold text-slate-800 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(rowData.doanhThuQD)}</td>
                <td className="px-3 py-2 text-center text-[13px] font-black text-indigo-600 dark:text-indigo-400 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatPct(rowData.hieuQuaQD)}</td>
            </>}
            {visibleGroups.has('spChinh') && <>
                <td className="px-3 py-2 text-center text-[13px] text-slate-600 dark:text-slate-400 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(rowData.slICT)}</td>
                <td className="px-3 py-2 text-center text-[13px] text-slate-600 dark:text-slate-400 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(rowData.slCE_main)}</td>
                <td className="px-3 py-2 text-center text-[13px] text-slate-600 dark:text-slate-400 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(rowData.slGiaDung_main)}</td>
                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/50 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(rowData.slSPChinh_Tong)}</td>
            </>}
            {visibleGroups.has('baoHiem') && <>
                <td className="px-3 py-2 text-center text-[13px] text-slate-600 dark:text-slate-400 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(rowData.slBaoHiem)}</td>
                <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(rowData.doanhThuBaoHiem)}</td>
                <td className="px-3 py-2 text-center text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                    <span className={getHeatmapClass(rowData.percentBaoHiem, 40)}>{formatPct(rowData.percentBaoHiem)}</span>
                </td>
            </>}
            {visibleGroups.has('sim') && <>
                <td className="px-3 py-2 text-center text-[13px] text-slate-600 dark:text-slate-400 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(rowData.slSim)}</td>
                <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(rowData.doanhThuSim)}</td>
                <td className="px-3 py-2 text-center text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                    <span className={getHeatmapClass(rowData.percentSimKT, 30)}>{formatPct(rowData.percentSimKT)}</span>
                </td>
            </>}
            {visibleGroups.has('dongHo') && <>
                <td className="px-3 py-2 text-center text-[13px] text-slate-600 dark:text-slate-400 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(rowData.slDongHo)}</td>
                <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(rowData.doanhThuDongHo)}</td>
                <td className="px-3 py-2 text-center text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                    <span className={getHeatmapClass(rowData.percentDongHoKT, 20)}>{formatPct(rowData.percentDongHoKT)}</span>
                </td>
            </>}
            {visibleGroups.has('phuKien') && <>
                <td className="px-3 py-2 text-center text-[13px] text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(rowData.slCamera)}</td>
                <td className="px-3 py-2 text-center text-[13px] text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(rowData.slLoa)}</td>
                <td className="px-3 py-2 text-center text-[13px] text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(rowData.slPinSDP)}</td>
                <td className="px-3 py-2 text-center text-[13px] text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(rowData.slTaiNgheBLT)}</td>
                <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(rowData.doanhThuPhuKien)}</td>
                <td className="px-3 py-2 text-center text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                    <span className={getHeatmapClass(rowData.percentPhuKienKT, 10)}>{formatPct(rowData.percentPhuKienKT)}</span>
                </td>
            </>}
            {visibleGroups.has('giaDung') && <>
                <td className="px-3 py-2 text-center text-[13px] text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(rowData.slMayLocNuoc)}</td>
                <td className="px-3 py-2 text-center text-[13px] text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(rowData.slNoiCom)}</td>
                <td className="px-3 py-2 text-center text-[13px] text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(rowData.slNoiChien)}</td>
                <td className="px-3 py-2 text-center text-[13px] text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(rowData.slQuatDien)}</td>
                <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(rowData.doanhThuGiaDung)}</td>
                <td className="px-3 py-2 text-center text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                    <span className={getHeatmapClass(rowData.percentGiaDungKT, 30)}>{formatPct(rowData.percentGiaDungKT)}</span>
                </td>
            </>}
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
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400`}>
                        <Icon name="gantt-chart-square" size={6} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Phân Tích Khai Thác</h3>
                        <p className="text-xs font-medium text-slate-400">Chi tiết sản phẩm & hiệu quả bán kèm</p>
                    </div>
                </div>
                <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 hide-on-export overflow-x-auto rounded-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            <button onClick={() => setViewMode('detail')} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${viewMode === 'detail' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Chi tiết</button>
                            <button onClick={() => setViewMode('efficiency')} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${viewMode === 'efficiency' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Hiệu quả %</button>
                            <button onClick={() => setViewMode('efficiency_dt_sl')} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${viewMode === 'efficiency_dt_sl' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Doanh thu</button>
                            <button onClick={() => setViewMode('efficiency_quantity')} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${viewMode === 'efficiency_quantity' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Số lượng</button>
                        </div>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
                         <button onClick={() => onBatchExport(data)} title="Xuất hàng loạt báo cáo chi tiết" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                            <Icon name="switch-camera" size={5} />
                        </button>
                        {onExport && (
                            <button onClick={(e) => { e.stopPropagation(); onExport?.(); }} disabled={isExporting} title="Xuất Ảnh Tab" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                {isExporting ? <Icon name="loader-2" size={5} className="animate-spin" /> : <Icon name="camera" size={5} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            {viewMode === 'detail' && (
                <div className="pb-2 hide-on-export overflow-x-auto">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-2">Hiển thị:</span>
                        {detailQuickFilters.map(f => (
                            <button 
                                key={f.key} 
                                onClick={() => handleToggleGroup(f.key)}
                                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all border ${
                                    visibleGroups.has(f.key)
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 border-indigo-200 dark:border-indigo-800 shadow-sm'
                                    : 'bg-transparent text-slate-500 border-transparent hover:bg-white hover:shadow-sm'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}


            <div className="overflow-x-auto custom-scrollbar flex-grow p-0 border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse">
                     <thead className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600">
                        {viewMode === 'detail' ? (
                            <>
                                <tr>
                                    <th rowSpan={2} onClick={() => handleSort('name')} className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer select-none min-w-[140px] align-middle sticky left-0 z-40 h-px hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                        <div className="flex items-center justify-center gap-1">
                                            NHÂN VIÊN
                                            {sortConfig.key === 'name' && (
                                                <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />
                                            )}
                                        </div>
                                    </th>
                                    {detailQuickFilters.filter(f => visibleGroups.has(f.key)).map((f, gIdx) => (
                                        <th key={f.key} colSpan={detailHeaderGroups[f.key].colSpan} className={`px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider border-b border-r border-slate-200 dark:border-slate-700 h-px ${detailHeaderGroups[f.key].bg} ${detailHeaderGroups[f.key].text}`}>
                                            {detailHeaderGroups[f.key].label}
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    {detailQuickFilters.filter(f => visibleGroups.has(f.key)).flatMap((f, gIdx) => {
                                        return detailHeaderGroups[f.key].subHeaders.map((subHeader, sIdx) => (
                                            <HeaderCell 
                                                key={subHeader.key} 
                                                label={subHeader.label} 
                                                sortKey={subHeader.key} 
                                                onSort={handleSort} 
                                                sortConfig={sortConfig}
                                                colorConfig={{ bg: detailHeaderGroups[f.key].bg, text: detailHeaderGroups[f.key].text }}
                                            />
                                        ));
                                    })}
                                </tr>
                            </>
                        ) : (
                            <>
                                 <tr>
                                    <th rowSpan={2} onClick={() => handleSort('name')} className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer select-none min-w-[140px] align-middle sticky left-0 z-40 h-px hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                        <div className="flex items-center justify-center gap-1">
                                            NHÂN VIÊN
                                            {sortConfig.key === 'name' && (
                                                <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />
                                            )}
                                        </div>
                                    </th>
                                    <th colSpan={4} className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider border-b border-r border-slate-200 dark:border-slate-700 h-px bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
                                        SỐ LƯỢNG SẢN PHẨM CHÍNH
                                    </th>
                                    {viewMode === 'efficiency' ? (
                                        <th colSpan={6} className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider border-b border-r border-slate-200 dark:border-slate-700 h-px bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300">HIỆU QUẢ KHAI THÁC BÁN KÈM</th>
                                    ) : viewMode === 'efficiency_dt_sl' ? (
                                        <th colSpan={5} className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider border-b border-r border-slate-200 dark:border-slate-700 h-px bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">HIỆU QUẢ DOANH THU</th>
                                    ) : (
                                        <th colSpan={5} className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider border-b border-r border-slate-200 dark:border-slate-700 h-px bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300">HIỆU QUẢ SỐ LƯỢNG</th>
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
                                        <td colSpan={100} className="px-3 py-1.5 border-y border-slate-200 dark:border-slate-700 sticky left-0 z-10">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-3.5 rounded-full flex-shrink-0" style={{background: ['#10b981','#3b82f6','#a855f7','#f59e0b','#f43f5e','#0ea5e9','#14b8a6','#f97316'][deptIdx % 8]}} />
                                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{dept} — {(employees as any[]).length} người</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                 {(employees as (ExploitationData & { slSPChinh_Tong: number, belowAverageCount: number })[]).map((employee, index) => {
                                    const rankIndex = (processedData[dept] as any[]).findIndex(e => e.name === employee.name);
                                    let rankDisplay = rankIndex < 3 
                                        ? <span className="text-lg w-6 text-center inline-block">{['🥇', '🥈', '🥉'][rankIndex]}</span> 
                                        : <span className="text-[13px] w-6 text-center inline-block text-slate-500 font-bold">#{rankIndex + 1}</span>;

                                    return (
                                        <tr key={employee.name} className={`group transition-colors hover:bg-teal-50/50 dark:hover:bg-slate-800 ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'}`}>
                                            <td className="px-3 py-2 text-left sticky left-0 bg-inherit z-20 group-hover:brightness-95 transition-all border-b border-r border-slate-200 dark:border-slate-700">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col items-center justify-center min-w-[32px]">
                                                        {rankDisplay}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary-600 transition-colors truncate max-w-[140px]">{abbreviateName(employee.name)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            {viewMode === 'detail' ? renderDetailModeCells(employee) : viewMode === 'efficiency' ? (
                                                <>
                                                    <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slICT)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slCE_main)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slGiaDung_main)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum((employee as any).slSPChinh_Tong)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] font-black text-rose-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{((employee as any).belowAverageCount) > 0 ? (employee as any).belowAverageCount : '-'}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                        <span className={getHeatmapClass(employee.percentBaoHiem, 40)}>{formatPct(employee.percentBaoHiem)}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                        <span className={getHeatmapClass((employee as any).percentSimKT, 30)}>{formatPct((employee as any).percentSimKT)}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                        <span className={getHeatmapClass((employee as any).percentPhuKienKT, 10)}>{formatPct((employee as any).percentPhuKienKT)}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                        <span className={getHeatmapClass((employee as any).percentDongHoKT, 20)}>{formatPct((employee as any).percentDongHoKT)}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                        <span className={getHeatmapClass((employee as any).percentGiaDungKT, 30)}>{formatPct((employee as any).percentGiaDungKT)}</span>
                                                    </td>
                                                </>
                                            ) : viewMode === 'efficiency_dt_sl' ? (
                                                 <>
                                                    <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slICT)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slCE_main)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slGiaDung_main)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum((employee as any).slSPChinh_Tong)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(employee.doanhThuSim)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(employee.doanhThuDongHo)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(employee.doanhThuBaoHiem)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(employee.doanhThuPhuKien)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(employee.doanhThuGiaDung)}</td>
                                                </>
                                            ) : ( // efficiency_quantity
                                                <>
                                                    <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slICT)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slCE_main)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slGiaDung_main)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum((employee as any).slSPChinh_Tong)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slSim)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slDongHo)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slBaoHiem)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slPhuKien)}</td>
                                                    <td className="px-3 py-2 text-center text-[13px] font-medium text-slate-600 dark:text-slate-300 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(employee.slGiaDung)}</td>
                                                </>
                                            )}
                                        </tr>
                                    )
                                })}
                                {Object.keys(processedData).length > 1 && groupTotals[dept] && (
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 font-bold">
                                        <td className="px-3 py-2 text-left text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest sticky left-0 bg-slate-50 dark:bg-slate-800 z-20 border-b border-slate-200 dark:border-slate-700">Tổng Nhóm</td>
                                         {viewMode === 'detail' ? renderDetailModeCells(groupTotals[dept]) : viewMode === 'efficiency' ? (
                                            <>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slICT)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slCE_main)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slGiaDung_main)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-800 dark:text-white tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slSPChinh_Tong)}</td>
                                                <td className="px-3 py-2 text-center border-b border-r border-slate-200 dark:border-slate-700"></td>
                                                <td className="px-3 py-2 text-center text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                    <span className={getHeatmapClass(groupTotals[dept].percentBaoHiem, 40)}>{formatPct(groupTotals[dept].percentBaoHiem)}</span>
                                                </td>
                                                <td className="px-3 py-2 text-center text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                    <span className={getHeatmapClass(groupTotals[dept].percentSimKT, 30)}>{formatPct(groupTotals[dept].percentSimKT)}</span>
                                                </td>
                                                <td className="px-3 py-2 text-center text-[13px] border-b border-r border-slate-200 dark:border-slate-700">
                                                    <span className={getHeatmapClass(groupTotals[dept].percentPhuKienKT, 10)}>{formatPct(groupTotals[dept].percentPhuKienKT)}</span>
                                                </td>
                                                <td className="px-3 py-2 text-center text-[13px] border-b border-slate-100 dark:border-slate-800 border-r border-slate-50">
                                                    <span className={getHeatmapClass(groupTotals[dept].percentDongHoKT, 20)}>{formatPct(groupTotals[dept].percentDongHoKT)}</span>
                                                </td>
                                                <td className="px-3 py-2 text-center text-[13px] border-b border-slate-100 dark:border-slate-800 border-r border-slate-50">
                                                    <span className={getHeatmapClass(groupTotals[dept].percentGiaDungKT, 30)}>{formatPct(groupTotals[dept].percentGiaDungKT)}</span>
                                                </td>
                                            </>
                                        ) : viewMode === 'efficiency_dt_sl' ? (
                                            <>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slICT)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slCE_main)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slGiaDung_main)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-800 dark:text-white tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slSPChinh_Tong)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(groupTotals[dept].doanhThuSim)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(groupTotals[dept].doanhThuDongHo)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(groupTotals[dept].doanhThuBaoHiem)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(groupTotals[dept].doanhThuPhuKien)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatC(groupTotals[dept].doanhThuGiaDung)}</td>
                                            </>
                                        ) : ( // efficiency_quantity
                                            <>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slICT)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slCE_main)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slGiaDung_main)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-800 dark:text-white tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slSPChinh_Tong)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slSim)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slDongHo)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slBaoHiem)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slPhuKien)}</td>
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums border-b border-r border-slate-200 dark:border-slate-700">{formatNum(groupTotals[dept].slGiaDung)}</td>
                                            </>
                                        )}
                                    </tr>
                                )}
                            </React.Fragment>
                        );})}
                    </tbody>
                    <tfoot className="bg-teal-100 dark:bg-teal-900/40 border-t border-slate-200 dark:border-slate-700">
                         <tr>
                            <td className="px-4 py-2.5 text-center text-[12px] font-extrabold text-teal-700 dark:text-teal-300 uppercase tracking-widest sticky left-0 bg-teal-100 dark:bg-teal-900 z-30 border-r border-slate-200 dark:border-slate-700">∑ TỔNG CỘNG</td>
                            {viewMode === 'detail' ? renderDetailModeCells(grandTotal) : viewMode === 'efficiency' ? (
                                <>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slICT)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slCE_main)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slGiaDung_main)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slSPChinh_Tong)}</td>
                                    <td className="px-3 py-2.5 text-center border-r border-slate-200 dark:border-slate-700"></td>
                                    <td className="px-3 py-2.5 text-center text-[13px] border-r border-slate-200 dark:border-slate-700">
                                        <span className={getHeatmapClass(grandTotal.percentBaoHiem, 40)}>{formatPct(grandTotal.percentBaoHiem)}</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-center text-[13px] border-r border-slate-200 dark:border-slate-700">
                                        <span className={getHeatmapClass(grandTotal.percentSimKT, 30)}>{formatPct(grandTotal.percentSimKT)}</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-center text-[13px] border-r border-slate-200 dark:border-slate-700">
                                        <span className={getHeatmapClass(grandTotal.percentPhuKienKT, 10)}>{formatPct(grandTotal.percentPhuKienKT)}</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-center text-[13px] border-r border-slate-200 dark:border-slate-700">
                                        <span className={getHeatmapClass(grandTotal.percentDongHoKT, 20)}>{formatPct(grandTotal.percentDongHoKT)}</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-center text-[13px] border-r border-slate-200 dark:border-slate-700">
                                        <span className={getHeatmapClass(grandTotal.percentGiaDungKT, 30)}>{formatPct(grandTotal.percentGiaDungKT)}</span>
                                    </td>
                                </>
                            ) : viewMode === 'efficiency_dt_sl' ? (
                                <>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slICT)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slCE_main)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slGiaDung_main)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slSPChinh_Tong)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatC(grandTotal.doanhThuSim)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatC(grandTotal.doanhThuDongHo)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatC(grandTotal.doanhThuBaoHiem)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatC(grandTotal.doanhThuPhuKien)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatC(grandTotal.doanhThuGiaDung)}</td>
                                </>
                            ) : ( // efficiency_quantity
                                <>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slICT)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slCE_main)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slGiaDung_main)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slSPChinh_Tong)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slSim)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slDongHo)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slBaoHiem)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slPhuKien)}</td>
                                    <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatNum(grandTotal.slGiaDung)}</td>
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
