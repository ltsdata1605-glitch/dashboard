
import React from 'react';
import { Criterion, shortenName, parseNumber, roundUp, getCompetitionColumnLabel } from '../../../utils/dashboardHelpers';
import { ProgressBar } from '../DashboardWidgets';
import { renderHeaderText } from '../SafeHeaderText';
import { useIndexedDBState } from '../../../hooks/useIndexedDBState';
import { calculateGroupAchievementStats } from '../../../services/competitionSortAndCalc';
import type { ProcessedProgram } from '../CompetitionView';

interface CompetitionListViewProps {
    groupedAndSortedPrograms: Record<string, ProcessedProgram[]>;
    /** Toàn bộ cột của dữ liệu — dùng để tra chỉ số ô trong `program.data`. */
    headers: string[];
    /** Các cột đang bật, THEO ĐÚNG THỨ TỰ người dùng bật ở Bộ lọc bảng Thi đua (gồm cả 'Còn Lại'). */
    visibleColumns: string[];
    isRealtime: boolean;
    handleSort: (col: number | 'conLai' | 'htdkVT' | -1) => void;
    groupingMode?: 'default' | 'configured';
}

export interface GroupTheme {
    square: string;
    bgRow: string;
    label: string;
    value: string;
    badge: string;
    border: string;
}

export const CRITERIA_GROUP_THEMES: GroupTheme[] = [
    {
        // 0: Sky (Dịch vụ)
        square: 'bg-sky-500 shadow-xs',
        bgRow: 'bg-sky-50/85 dark:bg-sky-950/35',
        label: 'text-sky-700/90 dark:text-sky-400',
        value: 'text-sky-950 dark:text-sky-100',
        badge: 'bg-white/90 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 border-sky-300/80 dark:border-sky-700',
        border: 'border-t border-b border-sky-200/80 dark:border-sky-800/60 border-l-[3px] border-l-sky-400 dark:border-l-sky-500',
    },
    {
        // 1: Emerald (Doanh thu / Bán hàng)
        square: 'bg-emerald-500 shadow-xs',
        bgRow: 'bg-emerald-50/85 dark:bg-emerald-950/35',
        label: 'text-emerald-700/90 dark:text-emerald-400',
        value: 'text-emerald-950 dark:text-emerald-100',
        badge: 'bg-white/90 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300/80 dark:border-emerald-700',
        border: 'border-t border-b border-emerald-200/80 dark:border-emerald-800/60 border-l-[3px] border-l-emerald-400 dark:border-l-emerald-500',
    },
    {
        // 2: Amber (Quy đổi / Thi đua hãng)
        square: 'bg-amber-500 shadow-xs',
        bgRow: 'bg-amber-50/85 dark:bg-amber-950/35',
        label: 'text-amber-700/90 dark:text-amber-400',
        value: 'text-amber-950 dark:text-amber-100',
        badge: 'bg-white/90 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300/80 dark:border-amber-700',
        border: 'border-t border-b border-amber-200/80 dark:border-amber-800/60 border-l-[3px] border-l-amber-400 dark:border-l-amber-500',
    },
    {
        // 3: Purple (Gia dụng / CE & GD / CE)
        square: 'bg-purple-500 shadow-xs',
        bgRow: 'bg-purple-50/85 dark:bg-purple-950/35',
        label: 'text-purple-700/90 dark:text-purple-400',
        value: 'text-purple-950 dark:text-purple-100',
        badge: 'bg-white/90 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border-purple-300/80 dark:border-purple-700',
        border: 'border-t border-b border-purple-200/80 dark:border-purple-800/60 border-l-[3px] border-l-purple-400 dark:border-l-purple-500',
    },
    {
        // 4: Rose (Điện tử / Điện lạnh / SLLK)
        square: 'bg-rose-500 shadow-xs',
        bgRow: 'bg-rose-50/85 dark:bg-rose-950/35',
        label: 'text-rose-700/90 dark:text-rose-400',
        value: 'text-rose-950 dark:text-rose-100',
        badge: 'bg-white/90 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-300/80 dark:border-rose-700',
        border: 'border-t border-b border-rose-200/80 dark:border-rose-800/60 border-l-[3px] border-l-rose-400 dark:border-l-rose-500',
    },
    {
        // 5: Teal (Viễn thông / Phụ kiện / IT / ICT)
        square: 'bg-teal-500 shadow-xs',
        bgRow: 'bg-teal-50/85 dark:bg-teal-950/35',
        label: 'text-teal-700/90 dark:text-teal-400',
        value: 'text-teal-950 dark:text-teal-100',
        badge: 'bg-white/90 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 border-teal-300/80 dark:border-teal-700',
        border: 'border-t border-b border-teal-200/80 dark:border-teal-800/60 border-l-[3px] border-l-teal-400 dark:border-l-teal-500',
    },
    {
        // 6: Indigo (Khác)
        square: 'bg-indigo-500 shadow-xs',
        bgRow: 'bg-indigo-50/85 dark:bg-indigo-950/35',
        label: 'text-indigo-700/90 dark:text-indigo-400',
        value: 'text-indigo-950 dark:text-indigo-100',
        badge: 'bg-white/90 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border-indigo-300/80 dark:border-indigo-700',
        border: 'border-t border-b border-indigo-200/80 dark:border-indigo-800/60 border-l-[3px] border-l-indigo-400 dark:border-l-indigo-500',
    },
];

export const getGroupTheme = (criteria: string, index: number): GroupTheme => {
    const c = (criteria || '').toLowerCase();
    if (c.includes('dịch vụ') || c.includes('dich vu')) return CRITERIA_GROUP_THEMES[0]; // Sky
    if (c.includes('doanh thu') || c.includes('dt') || c.includes('bán hàng')) return CRITERIA_GROUP_THEMES[1]; // Emerald
    if (c.includes('quy đổi') || c.includes('quy doi') || c.includes('hãng') || c.includes('hang') || c.includes('thi đua')) return CRITERIA_GROUP_THEMES[2]; // Amber
    if (c.includes('gia dụng') || c.includes('gia dung') || c.includes('ce')) return CRITERIA_GROUP_THEMES[3]; // Purple
    if (c.includes('điện tử') || c.includes('dien tu') || c.includes('điện lạnh') || c === 'sllk') return CRITERIA_GROUP_THEMES[4]; // Rose
    if (c.includes('viễn thông') || c.includes('phụ kiện') || c.includes('it') || c.includes('ict')) return CRITERIA_GROUP_THEMES[5]; // Teal
    return CRITERIA_GROUP_THEMES[index % CRITERIA_GROUP_THEMES.length];
};

const CompetitionListView: React.FC<CompetitionListViewProps> = ({ 
    groupedAndSortedPrograms, 
    headers, 
    visibleColumns, 
    isRealtime, 
    handleSort,
    groupingMode = 'default'
}) => {
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});

    const getFormattedHeader = (header: string) => {
        const mapping: Record<string, string> = {
            'Realtime': 'THỰC<br/>HIỆN',
            'Realtime (QĐ)': 'THỰC HIỆN<br/>QĐ',
            'Target': 'TAR',
            'Target V.Trội': 'TAR<br/>V.TRỘI',
            'L.Kế': 'LUỸ<br/>KẾ',
            'L.Kế (QĐ)': 'LUỸ KẾ<br/>QĐ',
            '%HT': '%HT',
            '%HT V.Trội': '%HT<br/>V.TRỘI',
            '%DKHT V.Trội': '%DKHT<br/>V.TRỘI',
            '%HTDK V.Trội': '%DKHT<br/>V.TRỘI',
            '%DKHT': '%DKHT',
            '%HTDK': '%DKHT',
            'Còn Lại': 'C.LẠI',
            'CÒN LẠI': 'C.LẠI',
            'SLLK': 'S.LƯỢNG',
            'Số lượng': 'S.LƯỢNG'
        };
        return mapping[header] || getCompetitionColumnLabel(header);
    };

    /**
     * Đầu cột: MỘT tông xám cho tất cả.
     *
     * Bản cũ tô nền màu riêng cho từng nhóm cột (sky/emerald/rose/amber) — 5 mảng màu ở hàng tiêu
     * đề cạnh tranh sự chú ý với chính con số bên dưới. Chuẩn "Bảng điều khiển ca trực": nhãn chỉ
     * để định vị, màu dành cho DỮ LIỆU. Phân nhóm cột nay thể hiện bằng viền, không bằng nền.
     */
    const getHeaderCellClass = (_header: string) =>
        'bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700';

    return (
        <div className="overflow-hidden">
            <div className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <table className="w-full border-collapse compact-export-table">
                            <thead>
                                <tr className="text-[11px] font-black uppercase tracking-wider border-l-[3px] border-l-slate-200 dark:border-l-slate-700">
                                    <th className="text-center px-2 py-[5px] border-r border-slate-200 dark:border-slate-700 border-b border-slate-200 dark:border-slate-700 align-middle bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 w-10">#</th>
                                    <th
                                        className="text-left px-2 py-[5px] cursor-pointer border-r border-slate-200 dark:border-slate-700 border-b border-slate-200 dark:border-slate-700 align-middle bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                        onClick={() => handleSort(-1)}
                                    >
                                        NHÓM THI ĐUA
                                    </th>
                                    {visibleColumns.map(column => {
                                        // 'Còn Lại' không nằm trong program.data (tính riêng ở CompetitionView) nên sắp
                                        // xếp bằng khoá 'conLai'; các cột khác sắp theo chỉ số ô trong data.
                                        const isConLai = column === 'Còn Lại';
                                        const isProgressBarCol = column.includes('%HT') || column.includes('%DKHT');
                                        return (
                                            <th
                                                key={column}
                                                onClick={() => handleSort(isConLai ? 'conLai' : headers.indexOf(column))}
                                                className={`px-2 py-[5px] text-center whitespace-nowrap cursor-pointer transition-colors border-r border-slate-200 dark:border-slate-700 last:border-r-0 text-[13px] align-middle ${isProgressBarCol ? 'min-w-[105px] w-[105px]' : ''} ${getHeaderCellClass(column)}`}
                                            >
                                                {renderHeaderText(getFormattedHeader(column))}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            {(() => {
                                const groupKeys = groupingMode === 'configured'
                                    ? Object.keys(groupedAndSortedPrograms)
                                    : (['SLLK', 'DTLK', 'DTQĐ'] as string[]).filter(c => groupedAndSortedPrograms[c]?.length);

                                return groupKeys.map((groupKey, groupIdx) => {
                                    const programs = groupedAndSortedPrograms[groupKey];
                                    if (!programs || programs.length === 0) return null;

                                    const palette = getGroupTheme(groupKey, groupIdx);
                                    const stats = calculateGroupAchievementStats(programs, headers, visibleColumns, isRealtime);

                                    return (
                                        <tbody key={groupKey}>
                                            <tr className={`${palette.bgRow} ${palette.border}`}>
                                                <td colSpan={100} className="px-2.5 py-[3px]">
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2.5 h-2.5 rounded-xs ${palette.square} shrink-0`}></div>
                                                            <span className={`text-xs sm:text-[13px] font-bold uppercase tracking-wider ${palette.label}`}>
                                                                {groupKey}
                                                            </span>
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold border shadow-2xs ${palette.badge}`}>
                                                                {programs.length}
                                                            </span>
                                                        </div>

                                                        <div
                                                            className="font-sans normal-case tracking-normal text-xs sm:text-[12.5px] font-medium text-slate-600 dark:text-slate-300 ml-auto flex items-center gap-1.5"
                                                            title={`Tính theo ${stats.isSuperMode ? 'Target Vượt trội' : 'Target Cơ bản'}`}
                                                        >
                                                            <span className="text-slate-400 dark:text-slate-500">·</span>
                                                            <span>đạt</span>
                                                            <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{stats.over100}</span>
                                                            <span className="text-slate-400 dark:text-slate-500">·</span>
                                                            <span>chưa đạt</span>
                                                            <span className="font-bold text-rose-700 dark:text-rose-400 tabular-nums">{stats.under100}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            {programs.map((program, index: number) => {
                                            const conLai = program.conLai;
                                            const numericHeadersToRound = new Set(['Realtime', 'Realtime (QĐ)', 'THỰC HIỆN', 'Target', 'Target V.Trội', 'L.Kế', 'L.Kế (QĐ)', 'Còn Lại', 'SLLK', 'Số lượng']);
                                            const percentHeadersToRound = new Set(['%HT', '%HTDK', '%DKHT', '%HT V.Trội', '%DKHT V.Trội', '%HTDK V.Trội']);

                                            // Vạch trạng thái mép trái — thay cho thanh pill vừa bỏ. Đọc theo %DKHT của
                                            // chương trình; không có cột đó thì suy từ Còn Lại (âm = chưa đạt).
                                            const dkhtHeader = visibleColumns.find(h => h.startsWith('%DKHT') || h.startsWith('%HTDK'));
                                            const dkhtIdx = dkhtHeader ? headers.indexOf(dkhtHeader) : -1;
                                            const dkhtVal = dkhtIdx !== -1 ? parseNumber(program.data[dkhtIdx]) : (conLai !== null && conLai >= 0 ? 100 : 0);
                                            const stripeClass = dkhtVal >= 100
                                                ? 'border-l-emerald-600'
                                                : dkhtVal >= 80 ? 'border-l-amber-600' : 'border-l-rose-600';

                                            return (
                                                <tr key={program.name} className={`border-l-[3px] ${stripeClass} hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-700`}>
                                                    <td className="px-2 py-[3px] text-center text-[13px] text-slate-500 border-r border-slate-100 dark:border-slate-700/50 tabular-nums">{(index + 1).toString().padStart(2, '0')}</td>
                                                    <td className="px-2 py-[3px] text-[13px] font-semibold text-slate-800 dark:text-slate-100 border-r border-slate-100 dark:border-slate-700/50 whitespace-nowrap uppercase tracking-tight">
                                                        {shortenName(program.name, nameOverrides)}
                                                    </td>
                                                    {visibleColumns.map(header => {
                                                        if (header === 'Còn Lại') {
                                                            return (
                                                                <td key={header} className={`px-2 py-[3px] text-center text-[13px] font-bold whitespace-nowrap border-r border-slate-100 dark:border-slate-700/50 last:border-r-0 tabular-nums ${conLai === null ? '' : (conLai >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}`}>
                                                                    {conLai !== null ? new Intl.NumberFormat('vi-VN').format(Math.ceil(conLai)) : '-'}
                                                                </td>
                                                            );
                                                        }
                                                        // Một số chương trình thi đua trong cùng 1 lần dán có số cột khác nhau (VD có/không
                                                        // có cột "%HTDK V.Trội") — parseCompetitionDataBySupermarket() lưu headers dùng
                                                        // chung cho cả siêu thị nên data của 1 vài chương trình có thể thiếu ô: đọc theo
                                                        // chỉ số của cột trong headers và coi ô thiếu là trống thay vì crash/lệch cột.
                                                        const cIdx = headers.indexOf(header);
                                                        const cell = cIdx === -1 ? '' : program.data[cIdx];

                                                        const isNumericToRound = numericHeadersToRound.has(header);
                                                        const isPercentToRound = percentHeadersToRound.has(header);
                                                        const isDash = cell === '-' || cell === '—' || cell === '' || cell === null || cell === undefined;
                                                        
                                                        let cellDisplayValue: string | number | React.ReactNode = cell;
                                                        
                                                        if (isDash) {
                                                            cellDisplayValue = '-';
                                                        } else if (isNumericToRound) {
                                                            const rawNum = parseNumber(cellDisplayValue);
                                                            cellDisplayValue = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.ceil(rawNum));
                                                        } else if (isPercentToRound) {
                                                            cellDisplayValue = `${roundUp(parseNumber(cellDisplayValue))}%`;
                                                        }

                                                        const isProgressBarColumn = header === '%HT' || header === '%HT V.Trội' || header === '%DKHT' || header === '%HTDK' || header === '%DKHT V.Trội' || header === '%HTDK V.Trội';
                                                        const isDkhtCol = header === '%DKHT' || header === '%HTDK' || header === '%DKHT V.Trội' || header === '%HTDK V.Trội';

                                                        const cellContent = () => {
                                                            const headerKey = header;
                                                            if (isDash) {
                                                                return <span className="text-slate-400 dark:text-slate-500 font-bold">-</span>;
                                                            }
                                                            
                                                            if (isProgressBarColumn) {
                                                                // Chuẩn mới: SỐ THUẦN, không thanh pill.
                                                                // Thanh pill chiếm ~40px chiều ngang mỗi cột — thứ khan hiếm nhất ở bảng
                                                                // này — mà chỉ lặp lại thông tin con số đã nói. Trạng thái đạt/chưa đạt
                                                                // nay đọc ở VẠCH MÀU mép trái dòng.
                                                                const htValue = parseNumber(cell);
                                                                const color = htValue >= 100
                                                                    ? 'text-emerald-700 dark:text-emerald-400'
                                                                    : htValue >= 80
                                                                        ? 'text-amber-700 dark:text-amber-400'
                                                                        : 'text-rose-700 dark:text-rose-400';
                                                                return <span className={`font-bold tabular-nums ${color}`}>{`${roundUp(htValue)}%`}</span>;
                                                            }

                                                            // Target columns
                                                            if (header === 'Target' || header === 'Target V.Trội') {
                                                                return <span className="font-bold text-slate-500 dark:text-slate-400">{cellDisplayValue}</span>;
                                                            }

                                                            // Actual columns (L.Kế, Realtime)
                                                            const isActualCol = header.startsWith('L.Kế') || header.startsWith('Realtime');
                                                            if (isActualCol) return <span className="font-bold text-slate-800 dark:text-slate-100">{cellDisplayValue}</span>;
                                                            
                                                            if (headerKey === '%HTDK' || headerKey === '%DKHT' || headerKey === '%HTDK V.Trội') {
                                                                const pVal = parseNumber(cell);
                                                                const color = pVal >= 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400';
                                                                return <span className={`font-black ${color}`}>{cellDisplayValue}</span>;
                                                            }

                                                            return <span className="text-slate-600 dark:text-slate-400 font-bold">{cellDisplayValue}</span>;
                                                        };

                                                        return (
                                                            <td key={header} className={`px-2 py-[3px] text-center text-[13px] font-bold whitespace-nowrap border-r border-slate-100 dark:border-slate-700/50 last:border-r-0 tabular-nums ${isProgressBarColumn ? 'min-w-[105px] w-[105px]' : ''}`}>
                                                                {cellContent()}
                                                            </td>
                                                        );
                                                    })}

                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                );
                            });
                        })()}
                    </table>
                </div>
        </div>
    );
};

export default CompetitionListView;
