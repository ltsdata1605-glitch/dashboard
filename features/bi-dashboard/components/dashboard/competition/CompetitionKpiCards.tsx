import React, { useMemo } from 'react';
import type { ProcessedProgram } from '../CompetitionView';
import { calculateOverallCompetitionKpiStats } from '../../../services/competitionSortAndCalc';
import { getBonusForProgram, formatBonusShort, type BonusCell } from '../../../services/checkThuongBonus';

interface CompetitionKpiCardsProps {
    programs: ProcessedProgram[];
    headers: string[];
    visibleColumns: string[];
    isRealtime: boolean;
    /** Có dữ liệu Check Thưởng -> thêm thẻ thứ 5 "Tổng thưởng" (5 thẻ cùng 1 hàng). */
    bonusByGroup?: Map<string, BonusCell> | null;
}

/**
 * Dải chỉ số Thi đua — chuẩn "Bảng điều khiển ca trực" (2026-09-10).
 *
 * (2026-09-22: bỏ ô "80% < nhóm < 100%" theo yêu cầu chủ dự án — thông tin này đã đọc được ở
 * nhãn "chưa đạt" của từng dải nhóm trong bảng; thêm ô "Tổng thưởng" đứng đầu.)
 *
 * Bản cũ là 4 THẺ bo góc, mỗi thẻ có dải gradient trên đỉnh, biểu tượng trong ô vuông bo góc, viền
 * riêng và đổ bóng. Bốn khối trang trí cạnh nhau, mỗi khối chỉ để nói MỘT con số.
 *
 * Chuẩn mới: một dải phẳng, các ô ngăn nhau bằng kẻ mảnh. Bo góc và đổ bóng nói "tôi ở tầng khác"
 * — dải chỉ số nằm ngay trong luồng đọc chứ không nổi lên trên, nên không được nói vậy. Biểu tượng
 * bỏ hẳn: nhãn chữ đã nói rõ hơn biểu tượng mà không tranh chỗ với con số.
 */
const UNITS = [
    {
        key: 'bonus',
        label: 'Tổng thưởng',
        tone: 'text-sky-700 dark:text-sky-400',
        bar: 'bg-sky-500',
        barBg: 'bg-sky-100 dark:bg-sky-950/40',
        dot: 'bg-sky-500',
    },
    {
        key: 'over',
        label: '% Nhóm đạt ≥100%',
        tone: 'text-emerald-700 dark:text-emerald-400',
        bar: 'bg-emerald-500',
        barBg: 'bg-emerald-100 dark:bg-emerald-950/40',
        dot: 'bg-emerald-500',
    },
    {
        key: 'under',
        label: '% Nhóm chưa đạt',
        tone: 'text-rose-700 dark:text-rose-400',
        bar: 'bg-rose-500',
        barBg: 'bg-rose-100 dark:bg-rose-950/40',
        dot: 'bg-rose-500',
    },
    {
        key: 'zero',
        label: 'Nhóm kết quả 0%',
        tone: 'text-slate-700 dark:text-slate-300',
        bar: 'bg-slate-400 dark:bg-slate-500',
        barBg: 'bg-slate-100 dark:bg-slate-800',
        dot: 'bg-slate-400',
    },
] as const;

export const CompetitionKpiCards: React.FC<CompetitionKpiCardsProps> = ({
    programs,
    headers,
    visibleColumns,
    isRealtime,
    bonusByGroup = null,
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
    const modeLabel = stats.isSuperMode ? 'Target Vượt trội' : 'Target Cơ bản';

    /** Số lớn, dòng phụ, và % dùng để vẽ vạch tiến độ của từng ô. */
    const valueOf = (key: typeof UNITS[number]['key']) => {
        switch (key) {
            case 'over':
                return { big: `${Math.round(stats.pctOver100)}%`, sub: `Đạt ${stats.countOver100}/${stats.total} nhóm`, pct: stats.pctOver100 };
            case 'under':
                return { big: `${Math.round(stats.pctUnder100)}%`, sub: `Chưa đạt ${stats.countUnder100}/${stats.total} nhóm`, pct: stats.pctUnder100 };
            case 'bonus': {
                const b = bonusStats!;
                const pct = b.countMatched > 0 ? (b.countActual / b.countMatched) * 100 : 0;
                const sub = b.projected > 0
                    ? `${b.countActual}/${b.countMatched} nhóm · D.kiến +${formatBonusShort(b.projected)}`
                    : `${b.countActual}/${b.countMatched} nhóm có thưởng`;
                return { big: formatBonusShort(b.actual), sub, pct };
            }
            default:
                return { big: `${stats.countZero}`, sub: `${Math.round(stats.pctZero)}% tổng nhóm`, pct: stats.pctZero };
        }
    };

    const gridColsClass = units.length === 3
        ? 'grid-cols-3'
        : 'grid-cols-4';

    return (
        <div
            className={`competition-kpi-container w-full grid ${gridColsClass} gap-1 sm:gap-2 mb-1.5 sm:mb-2`}
            title={`Tính theo ${modeLabel}`}
        >
            {units.map((u) => {
                const v = valueOf(u.key);
                return (
                    <div
                        key={u.key}
                        className="relative flex flex-col justify-between bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 px-1 sm:px-2.5 py-1.5 sm:py-2 transition-all shadow-2xs hover:shadow-xs min-w-0"
                    >
                        {/* Vạch nhận diện 2.5px trên đỉnh mỗi thẻ riêng biệt */}
                        <div className={`absolute top-0 left-0 right-0 h-[2.5px] ${u.bar}`} />

                        <div className="flex items-center justify-between gap-0.5 sm:gap-1 min-w-0">
                            <span className="text-[8.5px] xs:text-[9.5px] sm:text-[11px] font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400 truncate" title={u.label}>
                                {u.label}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.dot} shrink-0`} />
                        </div>

                        <div className={`text-[14px] xs:text-[16px] sm:text-[24px] md:text-[27px] lg:text-[30px] font-black tabular-nums leading-tight tracking-tight my-0.5 sm:my-1.5 truncate ${u.tone}`} title={v.big}>
                            {v.big}
                        </div>

                        <div className="flex items-center justify-between text-[8px] xs:text-[9px] sm:text-[10.5px] leading-tight text-slate-500 dark:text-slate-400 min-w-0">
                            <span className="truncate" title={v.sub}>{v.sub}</span>
                        </div>

                        {/* Vạch tiến độ */}
                        <div className={`mt-1 sm:mt-1.5 h-[2px] sm:h-[2.5px] w-full ${u.barBg} overflow-hidden`}>
                            <div
                                className={`h-full ${u.bar} transition-all duration-300`}
                                style={{ width: `${Math.min(100, Math.max(0, v.pct))}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CompetitionKpiCards;
