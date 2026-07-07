import React, { useMemo, useState } from 'react';
import { Employee, BonusMetrics } from '../../../types/nhanVienTypes';

interface MonthlyBonusTableProps {
    employees: Employee[];
    months: { yyyymm: string; label: string }[];
    dataByMonth: Record<string, Record<string, BonusMetrics>>;
    loading: boolean;
}

/** Bảng luỹ kế "Xem theo tháng" — mỗi cột là 1 tháng (mới nhất trước), đọc từ kho
 * bonus-monthly-* do lựa chọn Tháng/Năm của chế độ Tự động đổ vào. */
export const MonthlyBonusTable: React.FC<MonthlyBonusTableProps> = ({ employees, months, dataByMonth, loading }) => {
    const f = useMemo(() => new Intl.NumberFormat('vi-VN'), []);
    const [sortField, setSortField] = useState<string>('total');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const getMonthValue = (originalName: string, yyyymm: string): number | null => {
        const metrics = dataByMonth[yyyymm]?.[originalName];
        return metrics ? metrics.tong : null;
    };
    const getTotal = (originalName: string): number => months.reduce((sum, m) => sum + (getMonthValue(originalName, m.yyyymm) || 0), 0);
    const monthHasData = (yyyymm: string): boolean => Object.keys(dataByMonth[yyyymm] || {}).length > 0;
    const anyMonthHasData = months.some(m => monthHasData(m.yyyymm));

    const handleSort = (field: string) => {
        if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortField(field); setSortDir('desc'); }
    };

    const sortedEmployees = useMemo(() => {
        const arr = [...employees];
        arr.sort((a, b) => {
            const vA = sortField === 'total' ? getTotal(a.originalName) : (getMonthValue(a.originalName, sortField) || 0);
            const vB = sortField === 'total' ? getTotal(b.originalName) : (getMonthValue(b.originalName, sortField) || 0);
            return sortDir === 'asc' ? vA - vB : vB - vA;
        });
        return arr;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employees, sortField, sortDir, dataByMonth, months]);

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

    return (
        <div>
            <table className="w-full border-collapse compact-export-table">
                <thead className="sticky top-0 z-10">
                    <tr>
                        <th className="px-2 py-2 text-left text-[12px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700">Nhân viên</th>
                        {months.map(m => (
                            <th
                                key={m.yyyymm}
                                onClick={() => handleSort(m.yyyymm)}
                                className="px-2 py-2 text-center text-[12px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                T{m.label} {sortField === m.yyyymm ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                        ))}
                        <th
                            onClick={() => handleSort('total')}
                            className="px-2 py-2 text-center text-[12px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            Tổng cộng {sortField === 'total' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sortedEmployees.map(emp => (
                        <tr key={emp.originalName} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">{emp.name}</td>
                            {months.map(m => {
                                const val = getMonthValue(emp.originalName, m.yyyymm);
                                return (
                                    <td key={m.yyyymm} className="px-2 py-1.5 text-center text-xs tabular-nums text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                                        {val === null ? <span className="text-slate-300 dark:text-slate-700">—</span> : f.format(val)}
                                    </td>
                                );
                            })}
                            <td className="px-2 py-1.5 text-center text-xs font-bold tabular-nums text-sky-700 dark:text-sky-400">
                                {f.format(getTotal(emp.originalName))}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-black">
                        <td className="px-2 py-2 text-xs text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">TỔNG BỘ PHẬN</td>
                        {months.map(m => {
                            const sum = employees.reduce((s, e) => s + (getMonthValue(e.originalName, m.yyyymm) || 0), 0);
                            return (
                                <td key={m.yyyymm} className="px-2 py-2 text-center text-xs tabular-nums text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">
                                    {f.format(sum)}
                                </td>
                            );
                        })}
                        <td className="px-2 py-2 text-center text-xs tabular-nums text-sky-700 dark:text-sky-400">
                            {f.format(employees.reduce((s, e) => s + getTotal(e.originalName), 0))}
                        </td>
                    </tr>
                </tfoot>
            </table>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 px-1">
                * Ô &quot;—&quot;: tháng chưa có dữ liệu. Vào &quot;⚡ Tự động&quot; &gt; Năm hoặc Tháng để đổ dữ liệu.
            </p>
        </div>
    );
};

export default MonthlyBonusTable;
