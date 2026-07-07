import React, { useMemo, useState } from 'react';
import { Employee, BonusMetrics } from '../../../types/nhanVienTypes';
import AvatarDisplay from '../shared/AvatarDisplay';

/** Rút gọn theo đơn vị triệu, 1 chữ số thập phân, kèm hậu tố "Tr". */
function formatMillionShort(value: number): string {
    if (!value || Number.isNaN(value)) return '-';
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')} Tr`;
}

interface MonthlyBonusTableProps {
    employees: Employee[];
    months: { yyyymm: string; label: string }[];
    dataByMonth: Record<string, Record<string, BonusMetrics>>;
    loading: boolean;
    supermarketName: string;
}

type MonthRank = 'top' | 'bot' | 'mid';

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    const base = 'w-7 text-center text-[13px] font-black tabular-nums flex-shrink-0';
    if (rank === 1) return <span className={`${base} text-amber-500 dark:text-amber-400`} title="TOP 1">#1</span>;
    if (rank === 2) return <span className={`${base} text-slate-400 dark:text-slate-500`} title="TOP 2">#2</span>;
    if (rank === 3) return <span className={`${base} text-amber-700 dark:text-amber-500`} title="TOP 3">#3</span>;
    return <span className={`${base} text-slate-400 dark:text-slate-500`}>#{rank}</span>;
};

const MONTH_VALUE_COLOR: Record<MonthRank, string> = {
    top: 'text-emerald-600 dark:text-emerald-400',
    bot: 'text-rose-600 dark:text-rose-400',
    mid: 'text-slate-600 dark:text-slate-400',
};
const rankColorClass = (rank: MonthRank | undefined) => rank ? MONTH_VALUE_COLOR[rank] : 'text-slate-600 dark:text-slate-400';

/** TOP 3 giá trị cao nhất -> 'top', BOT 30% thấp nhất -> 'bot' (ưu tiên 'top' nếu trùng
 * do danh sách quá ngắn), còn lại không gắn hạng (coi như 'mid' khi hiển thị). */
function computeRankMap(entries: { originalName: string; value: number }[]): Map<string, MonthRank> {
    const sorted = [...entries].sort((a, b) => b.value - a.value);
    const map = new Map<string, MonthRank>();
    const topCount = Math.min(3, sorted.length);
    for (let i = 0; i < topCount; i++) map.set(sorted[i].originalName, 'top');
    const botCount = Math.ceil(sorted.length * 0.3);
    for (let i = Math.max(topCount, sorted.length - botCount); i < sorted.length; i++) {
        map.set(sorted[i].originalName, 'bot');
    }
    return map;
}

/** Bảng luỹ kế "Xem theo tháng" — mỗi cột là 1 tháng (cũ nhất trước, tăng dần), kèm cột
 * Trung bình + Tổng cộng, đọc từ kho bonus-monthly-* do lựa chọn Tháng/Năm của chế độ
 * Tự động đổ vào. Số được rút gọn theo đơn vị triệu (formatMillionShort). Cột Nhân viên có
 * hạng #1/#2/#3 + avatar giống chế độ xem Doanh thu; mỗi cột tháng tô màu theo hạng
 * TƯƠNG ĐỐI trong chính tháng đó: TOP 3 xanh (emerald), BOT 30% đỏ (rose), còn lại xám.
 */
export const MonthlyBonusTable: React.FC<MonthlyBonusTableProps> = ({ employees, months, dataByMonth, loading, supermarketName }) => {
    const [sortField, setSortField] = useState<string>('total');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    // Cũ nhất -> mới nhất, trái sang phải (months truyền vào đang mới nhất trước).
    const orderedMonths = useMemo(() => [...months].reverse(), [months]);

    const getMonthValue = (originalName: string, yyyymm: string): number | null => {
        const metrics = dataByMonth[yyyymm]?.[originalName];
        return metrics ? metrics.tong : null;
    };
    const getMonthsWithData = (originalName: string) => orderedMonths.filter(m => getMonthValue(originalName, m.yyyymm) !== null);
    const getTotal = (originalName: string): number => getMonthsWithData(originalName).reduce((sum, m) => sum + (getMonthValue(originalName, m.yyyymm) || 0), 0);
    const getAverage = (originalName: string): number => {
        const withData = getMonthsWithData(originalName);
        return withData.length > 0 ? getTotal(originalName) / withData.length : 0;
    };
    const monthHasData = (yyyymm: string): boolean => Object.keys(dataByMonth[yyyymm] || {}).length > 0;
    const anyMonthHasData = orderedMonths.some(m => monthHasData(m.yyyymm));

    // TOP 3 xanh, BOT 30% đỏ (ưu tiên TOP nếu ít NV trùng lặp), tính riêng cho từng tháng
    // VÀ riêng cho Trung bình/Tổng cộng — dựa trên toàn bộ danh sách nhân viên đang hiển
    // thị, không phụ thuộc cột đang sort.
    const monthRankMaps = useMemo(() => {
        const maps: Record<string, Map<string, MonthRank>> = {};
        orderedMonths.forEach(m => {
            const entries = employees
                .map(e => ({ originalName: e.originalName, value: getMonthValue(e.originalName, m.yyyymm) }))
                .filter((e): e is { originalName: string; value: number } => e.value !== null);
            maps[m.yyyymm] = computeRankMap(entries);
        });
        return maps;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employees, dataByMonth, orderedMonths]);

    // Chỉ xếp hạng những NV có ít nhất 1 tháng dữ liệu — NV chưa có dữ liệu nào không nên
    // bị tính là "BOT 30%" (không phải kém, chỉ là chưa có gì để so sánh).
    const averageRankMap = useMemo(() => computeRankMap(
        employees.filter(e => getMonthsWithData(e.originalName).length > 0)
            .map(e => ({ originalName: e.originalName, value: getAverage(e.originalName) })),
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, dataByMonth, orderedMonths]);

    const totalRankMap = useMemo(() => computeRankMap(
        employees.filter(e => getMonthsWithData(e.originalName).length > 0)
            .map(e => ({ originalName: e.originalName, value: getTotal(e.originalName) })),
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, dataByMonth, orderedMonths]);

    const handleSort = (field: string) => {
        if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortField(field); setSortDir('desc'); }
    };

    const sortedEmployees = useMemo(() => {
        const arr = [...employees];
        arr.sort((a, b) => {
            let vA: number, vB: number;
            if (sortField === 'total') { vA = getTotal(a.originalName); vB = getTotal(b.originalName); }
            else if (sortField === 'average') { vA = getAverage(a.originalName); vB = getAverage(b.originalName); }
            else { vA = getMonthValue(a.originalName, sortField) || 0; vB = getMonthValue(b.originalName, sortField) || 0; }
            return sortDir === 'asc' ? vA - vB : vB - vA;
        });
        return arr;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employees, sortField, sortDir, dataByMonth, orderedMonths]);

    if (loading) {
        return (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                Đang tải dữ liệu theo tháng...
            </div>
        );
    }

    if (!anyMonthHasData) {
        return (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                Chưa có dữ liệu tháng nào. Vào &quot;⚡ Tự động&quot; &gt; Năm hoặc Tháng để đổ dữ liệu.
            </div>
        );
    }

    const thBase = 'px-2 py-1.5 text-center text-[12px] font-black uppercase tracking-wider bg-slate-50 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors';
    const tdBase = 'px-2 py-1 text-center text-[13px] tabular-nums border-r border-slate-100 dark:border-slate-800';

    return (
        <div>
            <table className="w-full border-collapse compact-export-table">
                <thead className="sticky top-0 z-10">
                    <tr>
                        <th className="px-2 py-1.5 text-left text-[12px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700">Nhân viên</th>
                        {orderedMonths.map(m => (
                            <th key={m.yyyymm} onClick={() => handleSort(m.yyyymm)} className={`${thBase} text-sky-700 dark:text-sky-400`}>
                                T{m.label.split('/')[0]} {sortField === m.yyyymm ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                        ))}
                        <th onClick={() => handleSort('average')} className={`${thBase} text-emerald-700 dark:text-emerald-400`}>
                            T.Bình {sortField === 'average' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th onClick={() => handleSort('total')} className={`${thBase} text-sky-700 dark:text-sky-400 border-r-0`}>
                            Tổng {sortField === 'total' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sortedEmployees.map((emp, idx) => (
                        <tr key={emp.originalName} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-2 py-1 border-r border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 min-w-0">
                                    <RankBadge rank={idx + 1} />
                                    <AvatarDisplay employeeName={emp.originalName} supermarketName={supermarketName} />
                                    <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">{emp.name}</span>
                                </div>
                            </td>
                            {orderedMonths.map(m => {
                                const val = getMonthValue(emp.originalName, m.yyyymm);
                                const rank = monthRankMaps[m.yyyymm]?.get(emp.originalName);
                                return (
                                    <td key={m.yyyymm} className={`${tdBase} font-bold ${rankColorClass(rank)}`}>
                                        {val === null ? <span className="font-normal text-slate-300 dark:text-slate-700">—</span> : formatMillionShort(val)}
                                    </td>
                                );
                            })}
                            <td className={`${tdBase} font-black ${rankColorClass(averageRankMap.get(emp.originalName))}`}>
                                {formatMillionShort(getAverage(emp.originalName))}
                            </td>
                            <td className={`px-2 py-1 text-center text-[13px] tabular-nums font-black ${rankColorClass(totalRankMap.get(emp.originalName))}`}>
                                {formatMillionShort(getTotal(emp.originalName))}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-black">
                        <td className="px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">TỔNG BỘ PHẬN</td>
                        {orderedMonths.map(m => {
                            const sum = employees.reduce((s, e) => s + (getMonthValue(e.originalName, m.yyyymm) || 0), 0);
                            return (
                                <td key={m.yyyymm} className="px-2 py-1.5 text-center text-xs tabular-nums text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">
                                    {formatMillionShort(sum)}
                                </td>
                            );
                        })}
                        <td className="px-2 py-1.5 text-center text-xs tabular-nums text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700">
                            {(() => {
                                const activeMonths = orderedMonths.filter(m => monthHasData(m.yyyymm)).length;
                                const deptTotal = employees.reduce((s, e) => s + getTotal(e.originalName), 0);
                                return formatMillionShort(activeMonths > 0 ? deptTotal / activeMonths : 0);
                            })()}
                        </td>
                        <td className="px-2 py-1.5 text-center text-xs tabular-nums text-sky-700 dark:text-sky-400">
                            {formatMillionShort(employees.reduce((s, e) => s + getTotal(e.originalName), 0))}
                        </td>
                    </tr>
                </tfoot>
            </table>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 px-1">
                * Ô &quot;—&quot;: tháng chưa có dữ liệu. Mỗi cột (tháng/T.Bình/Tổng) tự so hạng riêng: TOP 3 tô xanh, BOT 30% tô đỏ. Đơn vị: triệu đồng.
            </p>
        </div>
    );
};

export default MonthlyBonusTable;
