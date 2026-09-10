import React, { useMemo } from 'react';
import { CheckCircle2, AlertCircle, TrendingUp, XCircle } from 'lucide-react';
import type { ProcessedProgram } from '../CompetitionView';
import { calculateOverallCompetitionKpiStats } from '../../../services/competitionSortAndCalc';

interface CompetitionKpiCardsProps {
    programs: ProcessedProgram[];
    headers: string[];
    visibleColumns: string[];
    isRealtime: boolean;
}

export const CompetitionKpiCards: React.FC<CompetitionKpiCardsProps> = ({
    programs,
    headers,
    visibleColumns,
    isRealtime
}) => {
    const stats = useMemo(
        () => calculateOverallCompetitionKpiStats(programs, headers, visibleColumns, isRealtime),
        [programs, headers, visibleColumns, isRealtime]
    );

    if (stats.total === 0) return null;

    const modeLabel = stats.isSuperMode ? 'Target Vượt trội' : 'Target Cơ bản';

    return (
        <div className="competition-kpi-container grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mb-3 sm:mb-4 px-1.5 sm:px-2 lg:px-6">
            {/* THẺ 1: % số nhóm đạt 100% */}
            <div 
                className="relative bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                title={`Tỷ lệ nhóm đạt từ 100% chỉ tiêu trở lên (${modeLabel})`}
            >
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-emerald-400" />
                <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                        % Nhóm Đạt ≥100%
                    </span>
                    <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                </div>

                <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums">
                        {Math.round(stats.pctOver100)}%
                    </span>
                </div>

                <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1">
                        <span>Đạt {stats.countOver100}/{stats.total} nhóm</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, stats.pctOver100))}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* THẺ 2: % số nhóm < 100% */}
            <div 
                className="relative bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                title={`Tỷ lệ nhóm chưa đạt 100% chỉ tiêu (${modeLabel})`}
            >
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500 to-rose-400" />
                <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                        % Nhóm Chưa Đạt
                    </span>
                    <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200/60">
                        <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                </div>

                <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl sm:text-3xl font-black text-rose-700 tabular-nums">
                        {Math.round(stats.pctUnder100)}%
                    </span>
                </div>

                <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1">
                        <span>Chưa đạt {stats.countUnder100}/{stats.total} nhóm</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-rose-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, stats.pctUnder100))}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* THẺ 3: 80% < Số nhóm < 100% */}
            <div 
                className="relative bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                title={`Số nhóm đạt từ 80% đến dưới 100% (${modeLabel})`}
            >
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-amber-400" />
                <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                        80% &lt; Nhóm &lt; 100%
                    </span>
                    <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/60">
                        <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                </div>

                <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-2xl sm:text-3xl font-black text-amber-700 tabular-nums">
                        {stats.countNear100}
                    </span>
                    <span className="text-xs font-bold text-slate-400">nhóm</span>
                </div>

                <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1">
                        <span>Chiếm {Math.round(stats.pctNear100)}% tổng nhóm</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, stats.pctNear100))}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* THẺ 4: Số nhóm kết quả 0% */}
            <div 
                className="relative bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                title={`Số nhóm có kết quả 0% hoặc chưa phát sinh (${modeLabel})`}
            >
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-slate-400 to-slate-300" />
                <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                        Nhóm Kết Quả 0%
                    </span>
                    <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200/60">
                        <XCircle className="w-3.5 h-3.5" />
                    </div>
                </div>

                <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-2xl sm:text-3xl font-black text-slate-700 tabular-nums">
                        {stats.countZero}
                    </span>
                    <span className="text-xs font-bold text-slate-400">nhóm</span>
                </div>

                <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1">
                        <span>Chiếm {Math.round(stats.pctZero)}% tổng nhóm</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-slate-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, stats.pctZero))}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompetitionKpiCards;
