import React, { useMemo } from 'react';
import type { ProcessedProgram } from '../CompetitionView';
import { calculateOverallCompetitionKpiStats, type CompetitionKpiFilter } from '../../../services/competitionSortAndCalc';
import { getBonusForProgram, formatBonusShort, type BonusCell } from '../../../services/checkThuongBonus';
import { KpiCard } from '../../../../../components/shared/ui/KpiCard';

interface CompetitionKpiCardsProps {
    programs: ProcessedProgram[];
    headers: string[];
    visibleColumns: string[];
    isRealtime: boolean;
    /** Có dữ liệu Check Thưởng -> thêm thẻ thứ 5 "Tổng thưởng" (5 thẻ cùng 1 hàng). */
    bonusByGroup?: Map<string, BonusCell> | null;
    activeFilter?: CompetitionKpiFilter;
    onSelectFilter?: (filter: CompetitionKpiFilter) => void;
}

const UNITS = [
    {
        key: 'bonus',
        label: 'Tổng thưởng',
        labelNgan: 'Thưởng',
        icon: 'wallet',
        iconColor: 'sky' as const,
        tone: 'text-sky-700 dark:text-sky-400',
    },
    {
        key: 'over',
        label: 'NHÓM >100%',
        labelNgan: '>100%',
        icon: 'award',
        iconColor: 'emerald' as const,
        tone: 'text-emerald-700 dark:text-emerald-400',
    },
    {
        key: 'under',
        label: 'NHÓM <100%',
        labelNgan: '<100%',
        icon: 'trending-down',
        iconColor: 'rose' as const,
        tone: 'text-rose-700 dark:text-rose-400',
    },
    {
        key: 'zero',
        label: 'NHÓM 0%',
        labelNgan: '0%',
        icon: 'alert-triangle',
        iconColor: 'slate' as const,
        tone: 'text-slate-700 dark:text-slate-300',
    },
] as const;

export const CompetitionKpiCards: React.FC<CompetitionKpiCardsProps> = ({
    programs,
    headers,
    visibleColumns,
    isRealtime,
    bonusByGroup = null,
    activeFilter = 'all',
    onSelectFilter,
}) => {
    const stats = useMemo(
        () => calculateOverallCompetitionKpiStats(programs, headers, visibleColumns, isRealtime),
        [programs, headers, visibleColumns, isRealtime]
    );

    // Thẻ Tổng thưởng: cộng thưởng THẬT của các nhóm đang hiện trong bảng (khớp Check Thưởng);
    // dòng phụ = số nhóm đã có thưởng + tổng dự kiến (nhóm chưa đạt nhưng có quỹ).
    const bonusStats = useMemo(() => {
        if (!bonusByGroup || bonusByGroup.size === 0) return null;
        let actual = 0, projected = 0, countActual = 0, countMatched = 0;
        programs.forEach(p => {
            const b = getBonusForProgram(bonusByGroup, p.name);
            if (!b) return;
            countMatched++;
            if (b.kind === 'actual') { actual += b.amount; countActual++; }
            else if (b.kind === 'projected') projected += b.amount;
        });
        return { actual, projected, countActual, countMatched };
    }, [bonusByGroup, programs]);

    if (stats.total === 0) return null;

    const units = bonusStats ? UNITS : UNITS.filter(u => u.key !== 'bonus');
    const hasBonusCard = !!bonusStats;
    const modeLabel = stats.isSuperMode ? 'Target Vượt trội' : 'Target Cơ bản';

    /** Số lớn, dòng phụ, và % dùng để vẽ vạch tiến độ của từng ô. */
    const valueOf = (key: typeof UNITS[number]['key']) => {
        switch (key) {
            case 'over':
                return { big: `${Math.round(stats.pctOver100)}%`, sub: `Đạt ${stats.countOver100}/${stats.total} nhóm`, subNgan: `${stats.countOver100}/${stats.total} nhóm`, isGood: true };
            case 'under':
                return { big: `${Math.round(stats.pctUnder100)}%`, sub: `Chưa đạt ${stats.countUnder100}/${stats.total} nhóm`, subNgan: `${stats.countUnder100}/${stats.total} nhóm`, isGood: false };
            case 'bonus': {
                const b = bonusStats!;
                const sub = b.projected > 0
                    ? `${b.countActual}/${b.countMatched} · D.kiến +${formatBonusShort(b.projected)}`
                    : `${b.countActual}/${b.countMatched} có thưởng`;
                return { big: formatBonusShort(b.actual), sub, subNgan: `${b.countActual}/${b.countMatched} nhóm`, isGood: true };
            }
            default:
                return { big: `${stats.countZero}`, sub: `${Math.round(stats.pctZero)}% tổng nhóm`, subNgan: `${Math.round(stats.pctZero)}% nhóm`, isGood: stats.countZero === 0 };
        }
    };

    const gridColsClass = units.length === 3
        ? 'grid-cols-3'
        : 'grid-cols-4';

    return (
        <div
            className={`competition-kpi-container w-full grid ${gridColsClass} gap-2 sm:gap-3 lg:gap-4 mb-2 sm:mb-3`}
            title={`Tính theo ${modeLabel}`}
        >
            {units.map((u) => {
                const v = valueOf(u.key);
                let isActive = false;
                let onClickHandler: (() => void) | undefined;
                let cardTooltip: string | undefined;

                if (onSelectFilter) {
                    if (u.key === 'bonus') {
                        isActive = activeFilter === 'all';
                        onClickHandler = () => onSelectFilter('all');
                        cardTooltip = 'Bấm để hiển thị tất cả nhóm thi đua (không lọc)';
                    } else if (u.key === 'over') {
                        isActive = activeFilter === 'over';
                        onClickHandler = () => onSelectFilter(activeFilter === 'over' ? 'all' : 'over');
                        cardTooltip = activeFilter === 'over'
                            ? 'Bấm để bỏ lọc (hiện tất cả nhóm)'
                            : `Bấm để lọc ${stats.countOver100} nhóm đạt >= 100%`;
                    } else if (u.key === 'under') {
                        isActive = activeFilter === 'under';
                        onClickHandler = () => onSelectFilter(activeFilter === 'under' ? 'all' : 'under');
                        cardTooltip = activeFilter === 'under'
                            ? 'Bấm để bỏ lọc (hiện tất cả nhóm)'
                            : `Bấm để lọc ${stats.countUnder100} nhóm chưa đạt < 100%`;
                    } else if (u.key === 'zero') {
                        isActive = activeFilter === 'zero';
                        onClickHandler = () => onSelectFilter(activeFilter === 'zero' ? 'all' : 'zero');
                        cardTooltip = activeFilter === 'zero'
                            ? 'Bấm để bỏ lọc (hiện tất cả nhóm)'
                            : `Bấm để lọc ${stats.countZero} nhóm đạt 0%`;
                    }
                }

                // Nếu không có thẻ Tổng thưởng (chỉ có 3 thẻ), thì khi activeFilter === 'all' không highlight thẻ nào
                if (!hasBonusCard && u.key !== 'bonus' && activeFilter === 'all') {
                    isActive = false;
                }

                return (
                    <KpiCard
                        key={u.key}
                        icon={u.icon}
                        iconColor={u.iconColor}
                        title={u.label}
                        isGood={v.isGood}
                        isActive={isActive}
                        onClick={onClickHandler}
                        cardTitle={cardTooltip}
                        trendLabel="Tiến độ"
                        trendValue={
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate" title={v.sub}>
                                <span className="sm:hidden">{v.subNgan}</span>
                                <span className="hidden sm:inline">{v.sub}</span>
                            </span>
                        }
                    >
                        <div className="flex items-baseline justify-center gap-1 w-full overflow-hidden">
                            <span className={`text-[20px] xs:text-[22px] sm:text-[28px] md:text-[32px] lg:text-[36px] font-black leading-tight tracking-tight tabular-nums truncate ${u.tone}`} title={v.big}>
                                {v.big}
                            </span>
                        </div>
                    </KpiCard>
                );
            })}
        </div>
    );
};

export default CompetitionKpiCards;
