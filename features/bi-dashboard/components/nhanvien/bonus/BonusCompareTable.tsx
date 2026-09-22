import React, { useMemo, useState } from 'react';
import { Employee, BonusMetrics } from '../../../types/nhanVienTypes';
import { EmptyState } from '../../../../../components/shared/ui/EmptyState';
import { MedalBadge } from '../../shared/Badges';
import AvatarDisplay from '../shared/AvatarDisplay';
import { getBonusForEmployee } from '../../../utils/bonusParser';
import { formatShortRange } from '../../../utils/bonusDateRange';
import type { BonusComparePeriodView } from '../../../hooks/useBonusCompareData';

interface BonusCompareTableProps {
    employees: Employee[];
    current: BonusComparePeriodView | null;
    previous: BonusComparePeriodView | null;
    loading: boolean;
    supermarketName: string;
    highlightedEmployees: Set<string>;
    onEmployeeClick: (emp: Employee) => void;
    f: Intl.NumberFormat;
}

type SortField = 'name' | 'prevErp' | 'prevTnong' | 'prevTong' | 'curErp' | 'curTnong' | 'curTong' | 'dErp' | 'dTnong' | 'dTong' | 'dPct';

interface CompareRow {
    emp: Employee;
    prev: BonusMetrics | null;
    cur: BonusMetrics | null;
    /** Chỉ có khi CẢ 2 kỳ đều có dữ liệu — thiếu 1 kỳ thì không có gì để so. */
    dErp: number | null;
    dTnong: number | null;
    dTong: number | null;
    dPct: number | null;
}

/** Nghìn đồng, làm tròn lên — cùng quy ước với bảng Tổng hợp (BonusDesktopRow). */
const fmtK = (f: Intl.NumberFormat, v: number) => f.format(Math.ceil(v / 1000));
/** Δ có dấu: "+1.234" / "−567" / "0". Dấu trừ dùng U+2212 để canh cột đẹp. */
const fmtDeltaK = (f: Intl.NumberFormat, v: number) => {
    const k = Math.round(v / 1000);
    if (k === 0) return '0';
    return (k > 0 ? '+' : '−') + f.format(Math.abs(k));
};
const fmtPct = (v: number) => {
    if (!Number.isFinite(v)) return '—';
    const r = Math.round(v);
    return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + '%';
};
const deltaColor = (v: number | null) => v == null
    ? 'text-slate-400 dark:text-slate-500 font-normal'
    : v > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold'
        : v < 0 ? 'text-rose-600 dark:text-rose-400 font-bold'
            : 'text-slate-600 dark:text-slate-400 font-bold';
/** Vạch 3px mép trái: xanh tăng / đỏ giảm / xám chưa đủ 2 kỳ. */
const stripeColor = (v: number | null) => v == null ? '#cbd5e1' : v >= 0 ? '#059669' : '#dc2626';

/**
 * Bảng "So sánh cùng kỳ tháng": mỗi nhân viên 1 dòng, 3 nhóm cột KỲ TRƯỚC · KỲ NÀY · TĂNG/GIẢM
 * (ERP / T.Nóng / Tổng, thêm % cho Tổng). Số liệu đọc từ kho bonus-compare-* do lựa chọn
 * "So sánh cùng kỳ" của chế độ Tự động đổ vào — hai kỳ cùng số ngày (01→21/8 vs 01→21/9).
 * Sort mặc định Δ Tổng giảm dần: ai tiến bộ nhất lên đầu, ai tụt nhất xuống cuối.
 */
export const BonusCompareTable: React.FC<BonusCompareTableProps> = ({
    employees, current, previous, loading, supermarketName, highlightedEmployees, onEmployeeClick, f,
}) => {
    const [sortField, setSortField] = useState<SortField>('dTong');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const rows = useMemo<CompareRow[]>(() => employees.map(emp => {
        const prev = previous ? getBonusForEmployee(previous.data, emp.originalName, emp.name) : null;
        const cur = current ? getBonusForEmployee(current.data, emp.originalName, emp.name) : null;
        const both = !!prev && !!cur;
        const dTong = both ? cur.tong - prev.tong : null;
        return {
            emp, prev, cur,
            dErp: both ? cur.erp - prev.erp : null,
            dTnong: both ? cur.tNong - prev.tNong : null,
            dTong,
            dPct: both && dTong != null ? (prev.tong > 0 ? (dTong / prev.tong) * 100 : (cur.tong > 0 ? Infinity : 0)) : null,
        };
    }), [employees, current, previous]);

    const sortedRows = useMemo(() => {
        const value = (r: CompareRow): number | null => {
            switch (sortField) {
                case 'prevErp': return r.prev?.erp ?? null;
                case 'prevTnong': return r.prev?.tNong ?? null;
                case 'prevTong': return r.prev?.tong ?? null;
                case 'curErp': return r.cur?.erp ?? null;
                case 'curTnong': return r.cur?.tNong ?? null;
                case 'curTong': return r.cur?.tong ?? null;
                case 'dErp': return r.dErp;
                case 'dTnong': return r.dTnong;
                case 'dTong': return r.dTong;
                case 'dPct': return r.dPct;
                default: return null;
            }
        };
        const arr = [...rows];
        arr.sort((a, b) => {
            if (sortField === 'name') {
                return sortDir === 'asc' ? a.emp.name.localeCompare(b.emp.name) : b.emp.name.localeCompare(a.emp.name);
            }
            const vA = value(a), vB = value(b);
            // Dòng thiếu dữ liệu luôn nằm cuối, bất kể chiều sort.
            if (vA == null && vB == null) return 0;
            if (vA == null) return 1;
            if (vB == null) return -1;
            return sortDir === 'asc' ? vA - vB : vB - vA;
        });
        return arr;
    }, [rows, sortField, sortDir]);

    const totals = useMemo(() => {
        const sum = (pick: (r: CompareRow) => number | undefined) => rows.reduce((s, r) => s + (pick(r) || 0), 0);
        const bothRows = rows.filter(r => r.prev && r.cur);
        const prevTong = bothRows.reduce((s, r) => s + (r.prev!.tong || 0), 0);
        const curTong = bothRows.reduce((s, r) => s + (r.cur!.tong || 0), 0);
        return {
            prevErp: sum(r => r.prev?.erp), prevTnong: sum(r => r.prev?.tNong), prevTong: sum(r => r.prev?.tong),
            curErp: sum(r => r.cur?.erp), curTnong: sum(r => r.cur?.tNong), curTong: sum(r => r.cur?.tong),
            // Δ tổng chỉ tính trên nhân viên có ĐỦ 2 kỳ — cộng cả người thiếu 1 kỳ sẽ bịa ra tăng/giảm.
            dErp: bothRows.reduce((s, r) => s + (r.dErp || 0), 0),
            dTnong: bothRows.reduce((s, r) => s + (r.dTnong || 0), 0),
            dTong: curTong - prevTong,
            dPct: prevTong > 0 ? ((curTong - prevTong) / prevTong) * 100 : (curTong > 0 ? Infinity : 0),
            bothCount: bothRows.length,
        };
    }, [rows]);

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortField(field); setSortDir(field === 'name' ? 'asc' : 'desc'); }
    };

    if (loading) {
        return (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800">
                Đang tải dữ liệu so sánh...
            </div>
        );
    }

    if (!current || !previous) {
        return (
            <EmptyState
                title={!current && !previous ? 'Chưa có dữ liệu so sánh cùng kỳ' : 'Lượt so sánh chưa trọn vẹn — thiếu 1 kỳ'}
                description='Vào "⚡ Tự động" > So sánh cùng kỳ để đổ dữ liệu 2 kỳ.'
            />
        );
    }

    const prevLabel = formatShortRange(previous);
    const curLabel = formatShortRange(current);

    const groupTh = 'px-2 h-7 text-center text-[11px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 border-l-2 border-l-slate-300 dark:border-l-slate-600 border-r border-b border-slate-200 dark:border-slate-700';
    const th = (extra = '') => `px-1.5 h-7 text-center text-[11px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-800/60 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors select-none ${extra}`;
    const sortMark = (field: SortField) => sortField === field ? (sortDir === 'desc' ? ' ▼' : ' ▲') : '';
    const td = 'px-1.5 py-[3px] text-[13px] text-center tabular-nums border-r border-slate-100 dark:border-slate-700/50';
    const tdFoot = 'px-1.5 py-1 text-[13px] text-center tabular-nums font-black border-r border-slate-200 dark:border-slate-700';

    const periodCells = (m: BonusMetrics | null, emphasis: boolean) => {
        const has = !!m;
        const base = has ? 'text-slate-700 dark:text-slate-300 font-bold' : 'text-slate-400 dark:text-slate-500 font-normal';
        return (
            <>
                <td className={`${td} border-l-2 border-l-slate-300 dark:border-l-slate-600 ${base}`}>{has ? fmtK(f, m.erp) : '-'}</td>
                <td className={`${td} ${base}`}>{has ? fmtK(f, m.tNong) : '-'}</td>
                <td className={`${td} ${base} ${emphasis && has ? 'bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 font-black' : ''}`}>{has ? fmtK(f, m.tong) : '-'}</td>
            </>
        );
    };

    return (
        <div>
            <table className="w-full border-collapse compact-export-table" data-testid="bonus-compare-table">
                <thead className="sticky top-0 z-10">
                    <tr>
                        <th rowSpan={2} className="px-2 h-7 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-l-[3px] border-l-slate-300 dark:border-l-slate-600 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 align-middle select-none" onClick={() => handleSort('name')}>Nhân viên{sortMark('name')}</th>
                        <th colSpan={3} className={`${groupTh} text-slate-600 dark:text-slate-300`}>Kỳ trước <span className="normal-case tracking-normal text-slate-500 dark:text-slate-400">{prevLabel}</span></th>
                        <th colSpan={3} className={`${groupTh} text-sky-700 dark:text-sky-400`}>Kỳ này <span className="normal-case tracking-normal text-sky-600/80 dark:text-sky-400/80">{curLabel}</span></th>
                        <th colSpan={4} className={`${groupTh} text-emerald-800 dark:text-emerald-200 bg-emerald-100/80 dark:bg-emerald-950/60 border-b-emerald-300 dark:border-b-emerald-800`}>Tăng / giảm</th>
                    </tr>
                    <tr>
                        <th className={th('border-l-2 border-l-slate-300 dark:border-l-slate-600 text-slate-500 dark:text-slate-400')} onClick={() => handleSort('prevErp')}>ERP{sortMark('prevErp')}</th>
                        <th className={th('text-slate-500 dark:text-slate-400')} onClick={() => handleSort('prevTnong')}>T.Nóng{sortMark('prevTnong')}</th>
                        <th className={th('text-slate-600 dark:text-slate-300')} onClick={() => handleSort('prevTong')}>Tổng{sortMark('prevTong')}</th>
                        <th className={th('border-l-2 border-l-slate-300 dark:border-l-slate-600 text-sky-700 dark:text-sky-400 bg-sky-50/60 dark:bg-sky-950/40')} onClick={() => handleSort('curErp')}>ERP{sortMark('curErp')}</th>
                        <th className={th('text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/40')} onClick={() => handleSort('curTnong')}>T.Nóng{sortMark('curTnong')}</th>
                        <th className={th('text-emerald-900 dark:text-emerald-100 bg-emerald-100/90 dark:bg-emerald-950/70')} onClick={() => handleSort('curTong')}>Tổng{sortMark('curTong')}</th>
                        <th className={th('border-l-2 border-l-slate-300 dark:border-l-slate-600 text-slate-600 dark:text-slate-300')} onClick={() => handleSort('dErp')}>ERP{sortMark('dErp')}</th>
                        <th className={th('text-slate-600 dark:text-slate-300')} onClick={() => handleSort('dTnong')}>T.Nóng{sortMark('dTnong')}</th>
                        <th className={th('text-emerald-900 dark:text-emerald-100 bg-emerald-100/90 dark:bg-emerald-950/70')} onClick={() => handleSort('dTong')}>Tổng{sortMark('dTong')}</th>
                        <th className={th('text-emerald-900 dark:text-emerald-100 bg-emerald-100/90 dark:bg-emerald-950/70 border-r-0')} onClick={() => handleSort('dPct')}>%{sortMark('dPct')}</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-700/60">
                    {sortedRows.map((r, idx) => {
                        const keyName = r.emp.originalName || r.emp.name;
                        const isHighlighted = highlightedEmployees.has(keyName);
                        return (
                            <tr
                                key={r.emp.originalName}
                                style={{ borderLeft: `3px solid ${stripeColor(r.dTong)}` }}
                                className={`cursor-pointer transition-colors ${isHighlighted ? 'bg-sky-50/50 dark:bg-sky-900/10 ring-1 ring-inset ring-sky-200 dark:ring-sky-800/50' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'}`}
                                onClick={() => onEmployeeClick(r.emp)}
                            >
                                <td className="px-2 py-[3px] border-r border-slate-100 dark:border-slate-700/50">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <MedalBadge rank={idx + 1} />
                                        <AvatarDisplay employeeName={r.emp.originalName} supermarketName={supermarketName} onClick={() => onEmployeeClick(r.emp)} />
                                        <span className={`text-[13px] font-bold truncate ${r.dTong == null ? 'text-slate-400 dark:text-slate-500' : 'text-sky-700 dark:text-sky-400 hover:underline'}`}>{r.emp.name}</span>
                                    </div>
                                </td>
                                {periodCells(r.prev, false)}
                                {periodCells(r.cur, true)}
                                <td className={`${td} border-l-2 border-l-slate-300 dark:border-l-slate-600 ${deltaColor(r.dErp)}`}>{r.dErp == null ? '—' : fmtDeltaK(f, r.dErp)}</td>
                                <td className={`${td} ${deltaColor(r.dTnong)}`}>{r.dTnong == null ? '—' : fmtDeltaK(f, r.dTnong)}</td>
                                <td className={`${td} text-[13.5px] ${deltaColor(r.dTong)}`}>{r.dTong == null ? '—' : fmtDeltaK(f, r.dTong)}</td>
                                <td className={`${td} border-r-0 ${deltaColor(r.dPct)}`}>{r.dPct == null ? '—' : fmtPct(r.dPct)}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr style={{ borderLeft: `3px solid ${stripeColor(totals.bothCount > 0 ? totals.dTong : null)}` }} className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 font-extrabold border-t-2 border-emerald-200 dark:border-emerald-800">
                        <td className="px-2 py-1 text-[13px] uppercase tracking-wider text-center border-r border-slate-200 dark:border-slate-700">Tổng cộng</td>
                        <td className={`${tdFoot} border-l-2 border-l-slate-300 dark:border-l-slate-600`}>{fmtK(f, totals.prevErp)}</td>
                        <td className={tdFoot}>{fmtK(f, totals.prevTnong)}</td>
                        <td className={tdFoot}>{fmtK(f, totals.prevTong)}</td>
                        <td className={`${tdFoot} border-l-2 border-l-slate-300 dark:border-l-slate-600 text-sky-700 dark:text-sky-400`}>{fmtK(f, totals.curErp)}</td>
                        <td className={`${tdFoot} text-amber-600 dark:text-amber-400`}>{fmtK(f, totals.curTnong)}</td>
                        <td className={`${tdFoot} bg-emerald-100/90 dark:bg-emerald-900/50`}>{fmtK(f, totals.curTong)}</td>
                        <td className={`${tdFoot} border-l-2 border-l-slate-300 dark:border-l-slate-600 ${deltaColor(totals.dErp)}`}>{totals.bothCount > 0 ? fmtDeltaK(f, totals.dErp) : '—'}</td>
                        <td className={`${tdFoot} ${deltaColor(totals.dTnong)}`}>{totals.bothCount > 0 ? fmtDeltaK(f, totals.dTnong) : '—'}</td>
                        <td className={`${tdFoot} text-[13.5px] ${deltaColor(totals.dTong)}`}>{totals.bothCount > 0 ? fmtDeltaK(f, totals.dTong) : '—'}</td>
                        <td className={`${tdFoot} border-r-0 ${deltaColor(totals.dPct)}`}>{totals.bothCount > 0 ? fmtPct(totals.dPct) : '—'}</td>
                    </tr>
                </tfoot>
            </table>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 px-1">
                * Đơn vị: nghìn đồng. Vạch mép trái: xanh = kỳ này cao hơn, đỏ = thấp hơn, xám = thiếu 1 kỳ (không so được).
                Dòng TỔNG CỘNG phần Tăng/giảm chỉ tính trên {totals.bothCount} nhân viên có đủ 2 kỳ.
            </p>
        </div>
    );
};

export default BonusCompareTable;
