import React from 'react';
import { Icon } from '../../common/Icon';
import type { ExploitationData } from '../../../types';

export type SortConfig = {
    key: keyof ExploitationData | 'name' | 'percentBaoHiem' | 'percentSimKT' | 'percentDongHoKT' | 'percentPhuKienKT' | 'percentGiaDungKT' | 'belowAverageCount' | 'slSPChinh_Tong';
    direction: 'asc' | 'desc';
};

export const detailQuickFilters: { key: string; label: string }[] = [
    { key: 'doanhThu', label: 'Doanh Thu' },
    { key: 'spChinh', label: 'SP Chính' },
    { key: 'baoHiem', label: 'Bảo Hiểm' },
    { key: 'sim', label: 'SIM' },
    { key: 'dongHo', label: 'Đồng Hồ' },
    { key: 'phuKien', label: 'Phụ Kiện' },
    { key: 'giaDung', label: 'Gia Dụng' },
];

export const groupToSortKeyMap: Record<string, SortConfig['key']> = {
    baoHiem: 'percentBaoHiem',
    sim: 'percentSimKT',
    dongHo: 'percentDongHoKT',
    phuKien: 'percentPhuKienKT',
    giaDung: 'percentGiaDungKT',
};

// Data structure for detail view headers
export const detailHeaderGroups: Record<string, { label: string; colSpan: number; bg: string; text: string; subHeaders: { label: string; key: SortConfig['key'] }[] }> = {
    doanhThu: { label: 'DOANH THU', colSpan: 3, bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-700 dark:text-sky-300', subHeaders: [
        { label: 'DT Thực', key: 'doanhThuThuc' },
        { label: 'DTQĐ', key: 'doanhThuQD' },
        { label: 'HQQĐ', key: 'hieuQuaQD' as any }
    ]},
    spChinh: { label: 'SP CHÍNH', colSpan: 4, bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', subHeaders: [
        { label: 'ICT', key: 'slICT' },
        { label: 'CE', key: 'slCE_main' },
        { label: 'ĐGD', key: 'slGiaDung_main' },
        { label: 'Tổng', key: 'slSPChinh_Tong' }
    ]},
    baoHiem: { label: 'BẢO HIỂM', colSpan: 3, bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-300', subHeaders: [
        { label: 'SL', key: 'slBaoHiem' },
        { label: 'D.Thu', key: 'doanhThuBaoHiem' },
        { label: '%', key: 'percentBaoHiem' }
    ]},
    sim: { label: 'SIM', colSpan: 3, bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', subHeaders: [
        { label: 'SL', key: 'slSim' },
        { label: 'D.Thu', key: 'doanhThuSim' },
        { label: '%', key: 'percentSimKT' }
    ]},
    dongHo: { label: 'ĐỒNG HỒ', colSpan: 3, bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', subHeaders: [
        { label: 'SL', key: 'slDongHo' },
        { label: 'D.Thu', key: 'doanhThuDongHo' },
        { label: '%', key: 'percentDongHoKT' }
    ]},
    phuKien: { label: 'PHỤ KIỆN', colSpan: 6, bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', subHeaders: [
        { label: 'SL Cam', key: 'slCamera' },
        { label: 'SL Loa', key: 'slLoa' },
        { label: 'SL Pin', key: 'slPinSDP' },
        { label: 'SL TNghe', key: 'slTaiNgheBLT' },
        { label: 'D.Thu', key: 'doanhThuPhuKien' },
        { label: '%', key: 'percentPhuKienKT' }
    ]},
    giaDung: { label: 'GIA DỤNG', colSpan: 6, bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-700 dark:text-cyan-300', subHeaders: [
        { label: 'SL MLN', key: 'slMayLocNuoc' },
        { label: 'SL NCơm', key: 'slNoiCom' },
        { label: 'SL NChiên', key: 'slNoiChien' },
        { label: 'SL Quạt', key: 'slQuatDien' },
        { label: 'D.Thu', key: 'doanhThuGiaDung' },
        { label: '%', key: 'percentGiaDungKT' }
    ]}
};

export const HeaderCell: React.FC<{
    label: string | React.ReactNode;
    sortKey: SortConfig['key'];
    className?: string;
    onSort: (key: SortConfig['key']) => void;
    sortConfig: SortConfig;
    colorConfig?: { bg: string; text: string };
}> = ({ label, sortKey, onSort, sortConfig, className, colorConfig }) => {
    const isActive = sortConfig.key === sortKey;
    const bgClass = colorConfig ? colorConfig.bg : (isActive ? 'bg-indigo-50/80 dark:bg-indigo-900/20' : 'bg-transparent');
    const textClass = colorConfig ? colorConfig.text : (isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-[#46505e] dark:text-slate-300');
    
    return (
        <th
            onClick={() => onSort(sortKey)}
            className={`px-3 py-2 text-[11px] font-bold cursor-pointer select-none text-center uppercase tracking-wider border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 ${bgClass} ${textClass} hover:opacity-80 transition-opacity ${className || ''} h-px relative group/th`}
        >
            <div className="flex items-center justify-center gap-1">
                {label}
                {isActive && <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />}
            </div>
        </th>
    );
};

export const getHeatmapClass = (value: number, threshold: number) => {
    if (value === 0) return 'text-slate-300 dark:text-slate-600';
    if (value < threshold) return 'text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg border border-rose-100 dark:border-rose-800/50';
    return 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800/50';
};
