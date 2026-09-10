
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

const CRITERIA_THEMES: Record<string, { main: string; light: string; text: string; border: string; accent: string }> = {
    'DTLK': { main: 'bg-sky-600', light: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800', accent: 'border-l-sky-500' },
    'DTQĐ': { main: 'bg-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', accent: 'border-l-emerald-500' },
    'SLLK': { main: 'bg-rose-600', light: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', accent: 'border-l-rose-500' },
};

const GROUP_PALETTES = [
    { main: 'bg-sky-600', light: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800', accent: 'border-l-sky-500' },
    { main: 'bg-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', accent: 'border-l-emerald-500' },
    { main: 'bg-amber-600', light: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', accent: 'border-l-amber-500' },
    { main: 'bg-rose-600', light: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', accent: 'border-l-rose-500' },
    { main: 'bg-slate-600', light: 'bg-slate-50 dark:bg-slate-800/40', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', accent: 'border-l-slate-400' },
];

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
                                <tr className="text-[11px] font-black uppercase tracking-wider">
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
                                    const theme = CRITERIA_THEMES[groupKey as keyof typeof CRITERIA_THEMES] || 
                                                  GROUP_PALETTES[groupIdx % GROUP_PALETTES.length];
                                    const stats = calculateGroupAchievementStats(programs, headers, visibleColumns, isRealtime);

                                    return (
                                        <tbody key={groupKey}>
                                            <tr className="bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                                                <td colSpan={100} className="px-2 py-[3px] text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <div className="flex items-center">
                                                            <span className="mr-2 text-[11px] text-slate-400 dark:text-slate-500">
                                                                {groupingMode === 'configured' ? 'NHÓM TIÊU CHÍ' : 'TIÊU CHÍ'}
                                                            </span>
                                                            <span>{groupKey}</span>
                                                            <span className="ml-1.5 text-[11px] font-semibold opacity-75">
                                                                ({programs.length})
                                                            </span>
                                                        </div>

                                                        {/* Chuẩn mới: CHỮ THUẦN, không huy hiệu bo góc có nền màu.
                                                            Dải nhóm là VÁCH NGĂN — nó chỉ cần nói "đây là nhóm gì, bao nhiêu
                                                            đạt". Hai viên pill màu ở đây tranh chỗ với chính dữ liệu bên dưới. */}
                                                        <span
                                                            className="font-sans normal-case tracking-normal text-[11px] text-slate-500 dark:text-slate-400 ml-1"
                                                            title={`Tính theo ${stats.isSuperMode ? 'Target Vượt trội' : 'Target Cơ bản'}`}
                                                        >
                                                            · đạt <span className="font-bold text-emerald-700 dark:text-emerald-400">{stats.over100}</span>
                                                            {' · chưa đạt '}<span className="font-bold text-rose-700 dark:text-rose-400">{stats.under100}</span>
                                                        </span>
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
