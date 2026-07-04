
import React from 'react';
import { Criterion, shortenName, parseNumber, roundUp } from '../../../utils/dashboardHelpers';
import { useIndexedDBState } from '../../../hooks/useIndexedDBState';

interface CompetitionGridViewProps {
    groupedAndSortedPrograms: Partial<Record<Criterion, any[]>>;
    headers: string[];
    hiddenColumns: string[];
    isRealtime: boolean;
}

const CRITERIA_CARD_THEMES = {
  'DTLK': { 
    border: 'border-sky-100 dark:border-sky-900', 
    header: 'bg-sky-600', 
    progress: 'bg-sky-500', 
    text: 'text-sky-700 dark:text-sky-400' 
  },
  'DTQĐ': { 
    border: 'border-teal-100 dark:border-teal-900', 
    header: 'bg-teal-600', 
    progress: 'bg-teal-500', 
    text: 'text-teal-700 dark:text-teal-400' 
  },
  'SLLK': { 
    border: 'border-rose-100 dark:border-rose-900', 
    header: 'bg-rose-600', 
    progress: 'bg-rose-500', 
    text: 'text-rose-700 dark:text-rose-300' 
  }
};

const CompetitionGridView: React.FC<CompetitionGridViewProps> = ({ groupedAndSortedPrograms, headers, hiddenColumns: _hiddenColumns, isRealtime }) => {
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    
    const getColumnKey = (possibleKeys: string[]) => headers.find(h => possibleKeys.includes(h));

    const targetKey = getColumnKey(['Target', 'Target Ngày', 'Target V.Trội']);
    const actualKey = getColumnKey(['L.Kế', 'L.Kế (QĐ)', 'Realtime', 'Realtime (QĐ)']);
    const percentKey = isRealtime 
        ? getColumnKey(['%HT V.Trội', '%HT']) 
        : getColumnKey(['%HTDK V.Trội', '%HTDK', '%HT']);
    
    const targetIndex = targetKey ? headers.indexOf(targetKey) : -1;
    const actualIndex = actualKey ? headers.indexOf(actualKey) : -1;
    const percentIndex = percentKey ? headers.indexOf(percentKey) : -1;

    const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(Math.ceil(num));

    return (
        <div className="space-y-12">
            {(['SLLK', 'DTLK', 'DTQĐ'] as const).map(criterion => {
                const programs = groupedAndSortedPrograms[criterion];
                if (!programs || programs.length === 0) return null;
                const theme = CRITERIA_CARD_THEMES[criterion];
    
                return (
                    <div key={criterion} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className={`text-xl font-medium ${theme.text} border-b-2 border-slate-200 dark:border-slate-800 pb-3 mb-6 flex items-center gap-3 uppercase tracking-widest`}>
                            <span className={`${theme.header} w-2 h-6 rounded-full`}></span>
                            TIÊU CHÍ: {criterion}
                        </h3>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            {programs.map((program) => {
                                const conLai = program.conLai ?? 0;
                                const target = targetIndex !== -1 ? parseNumber(program.data[targetIndex]) : 0;
                                const actual = actualIndex !== -1 ? parseNumber(program.data[actualIndex]) : 0;
                                const percent = percentIndex !== -1 ? parseNumber(program.data[percentIndex]) : 0;

                                let progressColorClass = theme.progress;
                                if (percent >= 100) progressColorClass = 'bg-green-500';
                                else if (percent < 85) progressColorClass = 'bg-yellow-500';
                                if (percent < 50) progressColorClass = 'bg-red-500';

                                const remainingColor = conLai >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                const percentColor = percent >= 100 ? 'text-green-600 dark:text-green-400' : (percent < 85 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400');

                                return (
                                <div key={program.name} className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group">
                                    <div className={`px-2 py-1.5 ${theme.header} border-b border-white/10`}>
                                        <h4 className="font-bold text-[10px] sm:text-xs text-white uppercase leading-tight truncate" title={program.name}>
                                            {shortenName(program.name, nameOverrides)}
                                        </h4>
                                    </div>
                                    
                                    <div className="p-2 sm:p-3 flex-1 flex flex-col justify-between">
                                        <div className="mb-2 sm:mb-3">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Tiến độ</span>
                                                <span className={`text-lg sm:text-xl font-bold ${percentColor} tabular-nums leading-none`}>{roundUp(percent)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 sm:h-2 overflow-hidden shadow-inner p-0.5">
                                                <div 
                                                    className={`h-full rounded-full ${progressColorClass} transition-all duration-1000 ease-out`} 
                                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-0.5 text-center border-t border-slate-100 dark:border-slate-700 pt-1.5 sm:pt-2">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase font-semibold mb-0.5 truncate">M.TIÊU</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300 text-[10px] sm:text-xs truncate tabular-nums">{formatNumber(target)}</span>
                                            </div>
                                            <div className="flex flex-col min-w-0 border-l border-r border-slate-100 dark:border-slate-700">
                                                <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase font-semibold mb-0.5 truncate">T.HIỆN</span>
                                                <span className="font-bold text-primary-600 dark:text-primary-400 text-[10px] sm:text-xs truncate tabular-nums">{formatNumber(actual)}</span>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase font-semibold mb-0.5 truncate">C.LẠI</span>
                                                <span className={`font-bold text-[10px] sm:text-xs truncate tabular-nums ${remainingColor}`}>{formatNumber(conLai)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                )
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CompetitionGridView;
