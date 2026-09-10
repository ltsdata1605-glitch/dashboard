import React, { useMemo } from 'react';
import type { ProcessedProgram } from '../CompetitionView';
import { calculateOverallCompetitionKpiStats } from '../../../services/competitionSortAndCalc';

interface CompetitionKpiCardsProps {
    programs: ProcessedProgram[];
    headers: string[];
    visibleColumns: string[];
    isRealtime: boolean;
}

/**
 * Dải chỉ số Thi đua — chuẩn "Bảng điều khiển ca trực" (2026-09-10).
 *
 * Bản cũ là 4 THẺ bo góc, mỗi thẻ có dải gradient trên đỉnh, biểu tượng trong ô vuông bo góc, viền
 * riêng và đổ bóng. Bốn khối trang trí cạnh nhau, mỗi khối chỉ để nói MỘT con số.
 *
 * Chuẩn mới: một dải phẳng, các ô ngăn nhau bằng kẻ mảnh. Bo góc và đổ bóng nói "tôi ở tầng khác"
 * — dải chỉ số nằm ngay trong luồng đọc chứ không nổi lên trên, nên không được nói vậy. Biểu tượng
 * bỏ hẳn: nhãn chữ đã nói rõ hơn biểu tượng mà không tranh chỗ với con số.
 */
const UNITS = [
    { key: 'over',  label: '% Nhóm đạt ≥100%',  tone: 'text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-600' },
    { key: 'under', label: '% Nhóm chưa đạt',   tone: 'text-rose-700 dark:text-rose-400',       bar: 'bg-rose-600' },
    { key: 'near',  label: '80% < nhóm < 100%', tone: 'text-amber-700 dark:text-amber-400',     bar: 'bg-amber-600' },
    { key: 'zero',  label: 'Nhóm kết quả 0%',   tone: 'text-slate-700 dark:text-slate-300',     bar: 'bg-slate-400' },
] as const;

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

    /** Số lớn, dòng phụ, và % dùng để vẽ vạch tiến độ của từng ô. */
    const valueOf = (key: typeof UNITS[number]['key']) => {
        switch (key) {
            case 'over':
                return { big: `${Math.round(stats.pctOver100)}%`, sub: `Đạt ${stats.countOver100}/${stats.total} nhóm`, pct: stats.pctOver100 };
            case 'under':
                return { big: `${Math.round(stats.pctUnder100)}%`, sub: `Chưa đạt ${stats.countUnder100}/${stats.total} nhóm`, pct: stats.pctUnder100 };
            case 'near':
                return { big: `${stats.countNear100}`, sub: `${Math.round(stats.pctNear100)}% tổng nhóm`, pct: stats.pctNear100 };
            default:
                return { big: `${stats.countZero}`, sub: `${Math.round(stats.pctZero)}% tổng nhóm`, pct: stats.pctZero };
        }
    };

    return (
        <div
            className="competition-kpi-container mx-1.5 sm:mx-2 lg:mx-6 mb-3 sm:mb-4 grid grid-cols-2 lg:grid-cols-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            title={`Tính theo ${modeLabel}`}
        >
            {UNITS.map((u, i) => {
                const v = valueOf(u.key);
                return (
                    <div
                        key={u.key}
                        /* Kẻ mảnh ngăn ô. KHÔNG viền riêng từng ô, không bo góc, không đổ bóng.
                           Màn hẹp xếp 2×2 nên 2 ô đầu cần viền dưới; desktop 1×4 thì bỏ viền đó. */
                        className={[
                            'px-3 py-2.5 border-slate-100 dark:border-slate-800',
                            i % 2 === 0 ? 'border-r' : 'lg:border-r',
                            i === 3 ? 'lg:border-r-0' : '',
                            i < 2 ? 'border-b lg:border-b-0' : '',
                        ].filter(Boolean).join(' ')}
                    >
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                            {u.label}
                        </div>
                        <div className={`mt-0.5 text-2xl font-bold tabular-nums leading-tight ${u.tone}`}>
                            {v.big}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {v.sub}
                        </div>
                        {/* Vạch tiến độ 3px, KHÔNG bo tròn — cùng ngôn ngữ với vạch trạng thái ở bảng. */}
                        <div className="mt-1.5 h-[3px] w-full bg-slate-100 dark:bg-slate-800">
                            <div
                                className={`h-full ${u.bar}`}
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
