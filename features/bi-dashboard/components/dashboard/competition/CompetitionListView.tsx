
import React from 'react';
import { Criterion, shortenName, parseNumber, roundUp } from '../../../utils/dashboardHelpers';
import { ProgressBar } from '../DashboardWidgets';
import { useIndexedDBState } from '../../../hooks/useIndexedDBState';
import type { ProcessedProgram } from '../CompetitionView';

interface CompetitionListViewProps {
    groupedAndSortedPrograms: Partial<Record<Criterion, ProcessedProgram[]>>;
    headers: string[];
    hiddenColumns: string[];
    isRealtime: boolean;
    handleSort: (col: number | 'conLai' | 'htdkVT' | -1) => void;
}

const CRITERIA_THEMES: Record<string, { main: string; light: string; text: string; border: string; accent: string }> = {
    'DTLK': { main: 'bg-sky-600', light: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800', accent: 'border-l-sky-500' },
    'DTQĐ': { main: 'bg-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', accent: 'border-l-emerald-500' },
    'SLLK': { main: 'bg-rose-600', light: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', accent: 'border-l-rose-500' },
};

const CompetitionListView: React.FC<CompetitionListViewProps> = ({ groupedAndSortedPrograms, headers, hiddenColumns, isRealtime, handleSort }) => {
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});

    const getFormattedHeader = (header: string) => {
        const mapping: Record<string, string> = {
            'Realtime': 'T.HIỆN',
            'Realtime (QĐ)': 'T.HIỆN<br/>QĐ',
            'Target': 'M.TIÊU',
            'Target V.Trội': 'M.TIÊU<br/>V.TRỘI',
            'L.Kế': 'L.KẾ',
            'L.Kế (QĐ)': 'L.KẾ<br/>QĐ',
            '%HT': '%HT',
            '%HT V.Trội': '%HT<br/>V.Trội',
            '%HTDK V.Trội': '%HTDK<br/>V.Trội',
            'Còn Lại': 'C.LẠI',
            'CÒN LẠI': 'C.LẠI',
            'SLLK': 'S.LƯỢNG',
            'Số lượng': 'S.LƯỢNG'
        };
        return mapping[header] || header;
    };

    // NhanVien-style header color mapping — thick bottom-border with colored backgrounds
    const getHeaderCellClass = (header: string) => {
        const h = getFormattedHeader(header).replace(/<br\/>/g, ' ');
        if (h.includes('M.TIÊU')) return 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border-b-[3px] border-b-sky-400';
        if (h.includes('T.HIỆN') || h.includes('L.KẾ') || h.includes('S.LƯỢNG')) return 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border-b-[3px] border-b-sky-400';
        if (h.includes('%HTDK')) return 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-b-[3px] border-b-rose-400';
        if (h.includes('%HT')) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-b-[3px] border-b-emerald-400';
        if (h.includes('C.LẠI')) return 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-b-[3px] border-b-amber-400';
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b-[3px] border-b-slate-400';
    };

    return (
        <div className="overflow-hidden">
            <div className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <table className="w-full border-collapse compact-export-table">
                            <thead>
                                <tr className="text-[11px] font-black uppercase tracking-wider">
                                    <th className="text-center px-2 py-2 border-r border-slate-300 dark:border-slate-600 border-b-[3px] border-b-slate-400 align-middle bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 w-10">#</th>
                                    <th 
                                        className="text-left px-2 py-2 cursor-pointer border-r border-slate-300 dark:border-slate-600 border-b-[3px] border-b-slate-400 align-middle bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" 
                                        onClick={() => handleSort(-1)}
                                    >
                                        NHÓM THI ĐUA
                                    </th>
                                    {headers.map((header, index) => {
                                        if (hiddenColumns.includes(header) || header === 'Còn Lại') return null;
                                        return (
                                            <th 
                                                key={index} 
                                                onClick={() => handleSort(index)}
                                                className={`px-2 py-2 text-center whitespace-nowrap cursor-pointer transition-colors border-r border-slate-300 dark:border-slate-600 last:border-r-0 text-[13px] align-middle ${getHeaderCellClass(header)}`}
                                                dangerouslySetInnerHTML={{ __html: getFormattedHeader(header) }}
                                            />
                                        )
                                    })}
                                        
                                    { !hiddenColumns.includes('Còn Lại') && (
                                            <th 
                                            onClick={() => handleSort('conLai')}
                                            className="px-2 py-2 text-center whitespace-nowrap cursor-pointer transition-colors text-[13px] align-middle bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-b-[3px] border-b-amber-400"
                                            dangerouslySetInnerHTML={{ __html: getFormattedHeader('Còn Lại') }}
                                        />
                                    )}
                                </tr>
                            </thead>
                            {(['SLLK', 'DTLK', 'DTQĐ'] as Criterion[]).map(criterion => {
                                const programs = groupedAndSortedPrograms[criterion];
                                if (!programs || programs.length === 0) return null;
                                const theme = CRITERIA_THEMES[criterion as keyof typeof CRITERIA_THEMES] || { main: 'bg-slate-600', light: 'bg-slate-50 dark:bg-slate-800/40', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', accent: 'border-l-slate-400' };

                                return (
                                    <tbody key={criterion}>
                                        <tr className={`${theme.light} border-t-2 ${theme.border}`}>
                                            <td colSpan={100} className={`px-2 py-1.5 text-[11px] font-extrabold uppercase tracking-wider border-l-4 ${theme.accent} ${theme.text}`}>
                                                <span className="px-2 py-0.5 rounded bg-white/70 dark:bg-black/20 mr-2 text-[9px]">TIÊU CHÍ</span>{criterion}
                                            </td>
                                        </tr>
                                        {programs.map((program, index: number) => {
                                            const conLai = program.conLai;
                                            const numericHeadersToRound = new Set(['Realtime', 'Realtime (QĐ)', 'Target', 'Target V.Trội', 'L.Kế', 'L.Kế (QĐ)', 'Còn Lại', 'SLLK', 'Số lượng']);
                                            const percentHeadersToRound = new Set(['%HT', '%HTDK', '%HT V.Trội', '%HTDK V.Trội']);

                                            return (
                                                <tr key={program.name} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-700">
                                                    <td className="px-2 py-1 text-center text-[13px] text-slate-400 border-r border-slate-100 dark:border-slate-700/50 tabular-nums">{(index + 1).toString().padStart(2, '0')}</td>
                                                    <td className="px-2 py-1 text-[13px] font-bold text-sky-600 dark:text-sky-400 border-r border-slate-100 dark:border-slate-700/50 whitespace-nowrap uppercase tracking-tight">
                                                        {shortenName(program.name, nameOverrides)}
                                                    </td>
                                                    {program.data.map((cell, cIdx: number) => {
                                                        const header = headers[cIdx];
                                                        if (hiddenColumns.includes(header) || header === 'Còn Lại') return null;

                                                        const isNumericToRound = numericHeadersToRound.has(header);
                                                        const isPercentToRound = percentHeadersToRound.has(header);
                                                        
                                                        let cellDisplayValue: string | number | React.ReactNode = cell;
                                                        
                                                        if (isNumericToRound) {
                                                            const rawNum = parseNumber(cellDisplayValue);
                                                            cellDisplayValue = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.ceil(rawNum));
                                                        } else if (isPercentToRound) {
                                                            cellDisplayValue = `${roundUp(parseNumber(cellDisplayValue))}%`;
                                                        }

                                                        const cellContent = () => {
                                                            const headerKey = headers[cIdx];
                                                            const isProgressBarColumn = headerKey === (isRealtime ? '%HT' : '%HTDK') || headerKey === '%HT V.Trội' || headerKey === '%HTDK V.Trội';
                                                            
                                                            if (isProgressBarColumn) {
                                                                const htValue = parseNumber(cell);
                                                                return (
                                                                    <div className="flex items-center gap-1 justify-center tabular-nums">
                                                                        <span className="font-bold text-center w-10 text-[13px]">{`${roundUp(htValue)}%`}</span>
                                                                        <div className="w-10 hidden sm:block"> <ProgressBar value={htValue} /> </div>
                                                                    </div>
                                                                );
                                                            }
                                                            
                                                            // Target columns
                                                            if (header === 'Target' || header === 'Target V.Trội') {
                                                                return <span className="font-bold text-slate-500 dark:text-slate-400">{cellDisplayValue}</span>;
                                                            }

                                                            // Actual columns (L.Kế, Realtime)
                                                            const isActualCol = header.startsWith('L.Kế') || header.startsWith('Realtime');
                                                            if (isActualCol) return <span className="font-bold text-slate-800 dark:text-slate-100">{cellDisplayValue}</span>;
                                                            
                                                            if (headerKey === '%HTDK' || headerKey === '%HTDK V.Trội') {
                                                                const pVal = parseNumber(cell);
                                                                const color = pVal >= 100 ? 'text-emerald-600 dark:text-emerald-400' : (pVal >= 85 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400');
                                                                return <span className={`font-black ${color}`}>{cellDisplayValue}</span>;
                                                            }

                                                            return <span className="text-slate-600 dark:text-slate-400 font-bold">{cellDisplayValue}</span>;
                                                        };

                                                        return (
                                                            <td key={cIdx} className="px-2 py-1 text-center text-[13px] font-bold whitespace-nowrap border-r border-slate-100 dark:border-slate-700/50 last:border-r-0 tabular-nums">
                                                                {cellContent()}
                                                            </td>
                                                        )
                                                    })}
                                                    
                                                    { !hiddenColumns.includes('Còn Lại') && (
                                                        <td className={`px-2 py-1 text-center text-[13px] font-bold whitespace-nowrap tabular-nums ${conLai === null ? '' : (conLai >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}`}>
                                                            {conLai !== null ? new Intl.NumberFormat('vi-VN').format(Math.ceil(conLai)) : '-'}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                );
                            })}
                        </table>
                </div>
        </div>
    );
};

export default CompetitionListView;
