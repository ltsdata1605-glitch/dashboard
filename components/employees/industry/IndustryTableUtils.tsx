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
];

export const groupToSortKeyMap: Record<string, SortConfig['key']> = {
    baoHiem: 'percentBaoHiem', // Giữ lại cho tương thích sort cũ (hoặc xoá nếu ko cần thiết)
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
