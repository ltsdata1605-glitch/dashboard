
import React from 'react';
import { Criterion, shortenName, parseNumber, roundUp } from '../../../utils/dashboardHelpers';
import { ProgressBar } from '../DashboardWidgets';
import { useIndexedDBState } from '../../../hooks/useIndexedDBState';

interface CompetitionListViewProps {
    groupedAndSortedPrograms: Partial<Record<Criterion, any[]>>;
    headers: string[];
    hiddenColumns: string[];
    isRealtime: boolean;
    handleSort: (col: any) => void;
}

const CRITERIA_THEMES = {
  'DTLK': { 
    main: 'bg-sky-600', 
    light: 'bg-sky-50 dark:bg-sky-900/20', 
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-100 dark:border-sky-800'
  },
  'DTQĐ': { 
    main: 'bg-emerald-600', 
    light: 'bg-emerald-50 dark:bg-emerald-900/20', 
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-100 dark:border-emerald-800'
  },
  'SLLK': { 
    main: 'bg-rose-600', 
    light: 'bg-rose-50 dark:bg-rose-900/20', 
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-100 dark:border-rose-800'
  }
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

    const isMobile = window.innerWidth < 768;

    return (
        <div className="overflow-x-auto rounded-none border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900">
            {isMobile ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(['DTLK', 'DTQĐ', 'SLLK'] as const).map(criterion => {
                        const programs = groupedAndSortedPrograms[criterion];
                        if (!programs || programs.length === 0) return null;
                        const theme = CRITERIA_THEMES[criterion as keyof typeof CRITERIA_THEMES] || { main: 'bg-slate-600', light: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100' };

                        return (
                            <div key={criterion}>
                                <div className={`${theme.main} text-white px-4 py-2 text-[11px] font-black uppercase tracking-widest flex items-center gap-2`}>
                                    <span className="bg-white/20 px-1.5 py-0.5 rounded text-[8px]">TIÊU CHÍ</span>
                                    {criterion}
                                </div>
                                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {programs.map((program: any, index: number) => {
                                        const conLai = program.conLai;
                                        const htValue = parseNumber(program.data[headers.indexOf(isRealtime ? '%HT' : '%HTDK')]);
                                        
                                        return (
                                            <div key={program.name} className="p-4 flex flex-col gap-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">#{ (index + 1).toString().padStart(2, '0') }</span>
                                                        <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{shortenName(program.name, nameOverrides)}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${htValue >= 100 ? 'bg-emerald-50 text-emerald-600' : (htValue >= 85 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600')}`}>
                                                            {roundUp(htValue)}% HT
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    {headers.map((header, hIdx) => {
                                                        if (hiddenColumns.includes(header) || header === 'Còn Lại' || header.includes('%')) return null;
                                                        const cell = program.data[hIdx];
                                                        const val = parseNumber(cell);
                                                        return (
                                                            <div key={header} className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1" dangerouslySetInnerHTML={{ __html: getFormattedHeader(header).replace(/<br\/>/g, ' ') }}></p>
                                                                <p className="text-xs font-black tabular-nums text-slate-700 dark:text-slate-200">
                                                                    {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.ceil(val))}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                    {!hiddenColumns.includes('Còn Lại') && (
                                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">CÒN LẠI</p>
                                                            <p className={`text-xs font-black tabular-nums ${conLai >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                {conLai !== null ? new Intl.NumberFormat('vi-VN').format(Math.ceil(conLai)) : '-'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-1">
                                                    <ProgressBar value={htValue} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <table className="min-w-full text-[14px] border-collapse">
                    <thead>
                        <tr className="bg-sky-50 dark:bg-slate-800 text-sky-900 dark:text-sky-100 font-bold uppercase tracking-tight border-b-2 border-sky-200 dark:border-slate-700 shadow-sm">
                            <th className="px-4 py-4 text-center border-r border-sky-100 dark:border-slate-700/50 w-12 text-[11px]">#</th>
                            <th className="px-4 py-4 text-left cursor-pointer hover:bg-sky-100/50 dark:hover:bg-slate-700 transition-colors border-r border-sky-100 dark:border-slate-700/50 min-w-[220px] text-[11px]" onClick={() => handleSort(-1)}>
                                NHÓM THI ĐUA
                            </th>
                            {headers.map((header, index) => {
                                if (hiddenColumns.includes(header) || header === 'Còn Lại') return null;
                                return (
                                    <th 
                                        key={index} 
                                        onClick={() => handleSort(index)}
                                        className="px-2 py-4 text-center whitespace-nowrap cursor-pointer hover:bg-sky-100/50 dark:hover:bg-slate-700 transition-colors border-r border-sky-100 dark:border-slate-700/50 last:border-r-0 text-[11px] align-middle"
                                        dangerouslySetInnerHTML={{ __html: getFormattedHeader(header) }}
                                    />
                                )
                            })}
                                
                            { !hiddenColumns.includes('Còn Lại') && (
                                    <th 
                                    onClick={() => handleSort('conLai')}
                                    className="px-4 py-4 text-center whitespace-nowrap cursor-pointer hover:bg-sky-100/50 dark:hover:bg-slate-700 transition-colors text-[11px] align-middle"
                                    dangerouslySetInnerHTML={{ __html: getFormattedHeader('Còn Lại') }}
                                />
                            )}
                        </tr>
                    </thead>
                    {(Object.keys(groupedAndSortedPrograms)).map(criterion => {
                        const programs = groupedAndSortedPrograms[criterion as Criterion];
                        if (!programs || programs.length === 0) return null;
                        const theme = CRITERIA_THEMES[criterion as keyof typeof CRITERIA_THEMES] || { main: 'bg-slate-600', light: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100' };
            
                        return (
                            <tbody key={criterion} className="divide-y divide-slate-100 dark:divide-slate-800">
                                <tr className={`${theme.main} text-white`}>
                                    <th colSpan={100} className="px-4 py-2.5 text-left text-[12px] font-semibold uppercase tracking-widest">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] backdrop-blur-sm">TIÊU CHÍ</span>
                                            {criterion}
                                        </div>
                                    </th>
                                </tr>
                                {programs.map((program: any, index: number) => {
                                    const conLai = program.conLai;
                                    const numericHeadersToRound = new Set(['Realtime', 'Realtime (QĐ)', 'Target', 'Target V.Trội', 'L.Kế', 'L.Kế (QĐ)', 'Còn Lại', 'SLLK', 'Số lượng']);
                                    const percentHeadersToRound = new Set(['%HT', '%HTDK', '%HT V.Trội', '%HTDK V.Trội']);

                                    return (
                                        <tr key={program.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group">
                                            <td className="px-4 py-3.5 text-center text-slate-400 font-medium border-r border-slate-100 dark:border-slate-800 tabular-nums">{(index + 1).toString().padStart(2, '0')}</td>
                                            <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap border-r border-slate-100 dark:border-slate-800 uppercase tracking-tight">
                                                <div className="flex items-center gap-2">
                                                  {shortenName(program.name, nameOverrides)}
                                                </div>
                                            </td>
                                            {program.data.map((cell: any, cIdx: number) => {
                                                const header = headers[cIdx];
                                                if (hiddenColumns.includes(header) || header === 'Còn Lại') return null;

                                                const isNumericToRound = numericHeadersToRound.has(header);
                                                const isPercentToRound = percentHeadersToRound.has(header);
                                                
                                                let cellDisplayValue: string | number | React.ReactNode = cell;
                                                
                                                if (isNumericToRound) {
                                                    const rawNum = parseNumber(cellDisplayValue);
                                                    if (header === 'Target V.Trội' || header === 'Target(QĐ) V.Trội') {
                                                        cellDisplayValue = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(rawNum);
                                                    } else {
                                                        cellDisplayValue = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.ceil(rawNum));
                                                    }
                                                } else if (isPercentToRound) {
                                                    cellDisplayValue = `${roundUp(parseNumber(cellDisplayValue))}%`;
                                                }

                                                const cellContent = () => {
                                                    const headerKey = headers[cIdx];
                                                    const isProgressBarColumn = headerKey === (isRealtime ? '%HT' : '%HTDK') || headerKey === '%HT V.Trội' || headerKey === '%HTDK V.Trội';
                                                    
                                                    if (isProgressBarColumn) {
                                                        const htValue = parseNumber(cell);
                                                        let colorClass = 'text-red-600 dark:text-red-400';
                                                        if (htValue >= 100) colorClass = 'text-green-600 dark:text-green-400';
                                                        else if (htValue >= 85) colorClass = 'text-yellow-600 dark:text-yellow-400';

                                                        return (
                                                            <div className="flex items-center justify-center gap-3 tabular-nums">
                                                                <span className={`font-semibold w-10 text-right ${colorClass}`}>{`${roundUp(htValue)}%`}</span>
                                                                <div className="w-10 hidden sm:block"> <ProgressBar value={htValue} /> </div>
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    const isActualCol = header.startsWith('L.Kế') || header.startsWith('Realtime');
                                                    if (isActualCol) return <span className="font-semibold text-slate-900 dark:text-white">{cellDisplayValue}</span>;

                                                    return <span className="text-slate-600 dark:text-slate-400 font-medium">{cellDisplayValue}</span>;
                                                };

                                                return (
                                                    <td key={cIdx} className="px-2 py-3.5 text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800 last:border-r-0 tabular-nums">
                                                        {cellContent()}
                                                    </td>
                                                )
                                            })}
                                            
                                            { !hiddenColumns.includes('Còn Lại') && (
                                                <td className={`px-4 py-3.5 text-center font-semibold whitespace-nowrap border-slate-100 dark:border-slate-800 tabular-nums ${conLai === null ? '' : (conLai >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}`}>
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
            )}
        </div>
    );
};

export default CompetitionListView;
