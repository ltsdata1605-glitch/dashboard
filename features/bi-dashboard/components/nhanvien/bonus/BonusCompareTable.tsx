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
    viewMode?: 'group' | 'list';
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
 * Bảng "So sánh cùng kỳ tháng": mỗi nhân viên 1 dòng; MỖI NHÓM CỘT LÀ 1 TIÊU CHÍ (ERP · T.Nóng ·
 * Tổng), cột phụ H.Tại (kỳ này) | CK (cùng kỳ tháng trước) | +/- (chênh lệch), riêng Tổng thêm %.
 * Hỗ trợ xem theo Bộ phận (group) hoặc Danh sách (list).
 */
export const BonusCompareTable: React.FC<BonusCompareTableProps> = ({
    employees, current, previous, loading, supermarketName, highlightedEmployees, onEmployeeClick, f,
    viewMode = 'group',
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
            // +/- tổng chỉ tính trên nhân viên có ĐỦ 2 kỳ — cộng cả người thiếu 1 kỳ sẽ bịa ra tăng/giảm.
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

    // ⚠️ MỌI HOOK PHẢI NẰM TRÊN CÁC LỆNH `return` SỚM Ở DƯỚI.
    // Trước đây 3 useMemo này nằm SAU `if (loading) return ...` và `if (!current || !previous)
    // return ...`, nên lần render đầu (đang tải) React chạy ít hook hơn lần render sau — đúng lỗi
    // "Rendered more hooks than during the previous render", component ném lỗi và màn So sánh cùng
    // kỳ sập. eslint đã báo `react-hooks/rules-of-hooks` (3 error).
    const rowsByDept = useMemo(() => {
        if (viewMode === 'list') return { 'Tất cả': sortedRows };
        const acc: Record<string, CompareRow[]> = {};
        sortedRows.forEach(r => {
            const dept = r.emp.department || 'Khác';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(r);
        });
        return acc;
    }, [sortedRows, viewMode]);

    const deptNames = useMemo(() => Object.keys(rowsByDept).sort((a, b) => a.localeCompare(b)), [rowsByDept]);

    const globalRankMap = useMemo(() => {
        const map = new Map<string, number>();
        sortedRows.forEach((r, idx) => {
            map.set(r.emp.originalName, idx + 1);
        });
        return map;
    }, [sortedRows]);

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
    const curTitle = `Hiện tại: ${current.fromDate} → ${current.toDate}`;
    const prevTitle = `Cùng kỳ tháng trước: ${previous.fromDate} → ${previous.toDate}`;

    // Mỗi nhóm 1 tông màu — trùng tông cột ERP (sky) / T.Nóng (amber) / Tổng (emerald) của bảng Tổng hợp.
    const GROUP_STYLE = {
        erp: { head: 'text-sky-700 dark:text-sky-400 bg-sky-50/60 dark:bg-sky-950/40', sub: 'text-sky-700/80 dark:text-sky-400/80 bg-sky-50/40 dark:bg-sky-950/20', cur: 'text-sky-800 dark:text-sky-200' },
        tnong: { head: 'text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/40', sub: 'text-amber-700/80 dark:text-amber-400/80 bg-amber-50/40 dark:bg-amber-950/20', cur: 'text-amber-800 dark:text-amber-200' },
        tong: { head: 'text-emerald-900 dark:text-emerald-100 bg-emerald-100/90 dark:bg-emerald-950/70', sub: 'text-emerald-800/80 dark:text-emerald-200/80 bg-emerald-50/60 dark:bg-emerald-950/30', cur: 'text-emerald-900 dark:text-emerald-100 bg-emerald-50/60 dark:bg-emerald-950/30' },
    } as const;

    const groupTh = 'px-2 h-7 text-center text-[11px] font-bold uppercase tracking-wider border-l-2 border-l-slate-300 dark:border-l-slate-600 border-r border-b border-slate-200 dark:border-slate-700';
    const th = (extra = '') => `px-1.5 h-7 text-center text-[11px] font-bold uppercase tracking-wider border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors select-none ${extra}`;
    const sortMark = (field: SortField) => sortField === field ? (sortDir === 'desc' ? ' ▼' : ' ▲') : '';
    const td = 'px-1.5 py-[3px] text-[13px] text-center tabular-nums border-r border-slate-100 dark:border-slate-700/50';
    const tdFoot = 'px-1.5 py-1 text-[13px] text-center tabular-nums font-black border-r border-slate-200 dark:border-slate-700';

    /** 3 cột phụ của 1 tiêu chí: H.Tại | CK | +/- (nhóm Tổng nối thêm % ở caller). */
    const criterionCells = (cur: number | null, prev: number | null, delta: number | null, curClass: string) => {
        const curBase = cur == null ? 'text-slate-400 dark:text-slate-500 font-normal' : `font-black ${curClass}`;
        const prevBase = prev == null ? 'text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-600 dark:text-slate-400 font-bold';
        return (
            <>
                <td className={`${td} border-l-2 border-l-slate-300 dark:border-l-slate-600 ${curBase}`}>{cur == null ? '-' : fmtK(f, cur)}</td>
                <td className={`${td} ${prevBase}`}>{prev == null ? '-' : fmtK(f, prev)}</td>
                <td className={`${td} ${deltaColor(delta)}`}>{delta == null ? '—' : fmtDeltaK(f, delta)}</td>
            </>
        );
    };
    const subHeaders = (key: SortField, group: 'erp' | 'tnong' | 'tong', prevKey: SortField, deltaKey: SortField) => (
        <>
            <th className={th(`border-l-2 border-l-slate-300 dark:border-l-slate-600 ${GROUP_STYLE[group].sub}`)} title={curTitle} onClick={() => handleSort(key)}>H.Tại{sortMark(key)}</th>
            <th className={th('text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60')} title={prevTitle} onClick={() => handleSort(prevKey)}>CK{sortMark(prevKey)}</th>
            <th className={th('text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60')} title="Chênh lệch H.Tại − CK" onClick={() => handleSort(deltaKey)}>+/-{sortMark(deltaKey)}</th>
        </>
    );


    const renderCompareRow = (r: CompareRow, rank: number) => {
        const keyName = r.emp.originalName || r.emp.name;
        const isHighlighted = highlightedEmployees.has(keyName);
        return (
            <tr
                key={r.emp.originalName}
                style={{ borderLeft: `3px solid ${stripeColor(r.dTong)}` }}
                className={`cursor-pointer transition-colors ${isHighlighted ? 'bg-sky-50/50 dark:bg-sky-900/10 ring-1 ring-inset ring-sky-200 dark:ring-sky-800/50' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'}`}
                onClick={() => onEmployeeClick(r.emp)}
            >
                <td className="px-2 py-[3px] border-r border-slate-100 dark:border-slate-700/50 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 whitespace-nowrap">
                        <MedalBadge rank={rank} />
                        <AvatarDisplay employeeName={r.emp.originalName} supermarketName={supermarketName} onClick={() => onEmployeeClick(r.emp)} />
                        <span className={`text-[12px] sm:text-[13px] font-bold whitespace-nowrap ${r.dTong == null ? 'text-slate-400 dark:text-slate-500' : 'text-sky-700 dark:text-sky-400 hover:underline'}`}>{r.emp.name}</span>
                    </div>
                </td>
                {criterionCells(r.cur?.erp ?? null, r.prev?.erp ?? null, r.dErp, GROUP_STYLE.erp.cur)}
                {criterionCells(r.cur?.tNong ?? null, r.prev?.tNong ?? null, r.dTnong, GROUP_STYLE.tnong.cur)}
                {criterionCells(r.cur?.tong ?? null, r.prev?.tong ?? null, r.dTong, GROUP_STYLE.tong.cur)}
                <td className={`${td} border-r-0 ${deltaColor(r.dPct)}`}>{r.dPct == null ? '—' : fmtPct(r.dPct)}</td>
            </tr>
        );
    };

    return (
        <div>
            <table className="w-full border-collapse compact-export-table" data-testid="bonus-compare-table">
                <thead className="sticky top-0 z-10">
                    <tr>
                        <th rowSpan={2} className="px-2 h-7 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-l-[3px] border-l-slate-300 dark:border-l-slate-600 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 align-middle select-none" onClick={() => handleSort('name')}>Nhân viên{sortMark('name')}</th>
                        <th colSpan={3} className={`${groupTh} ${GROUP_STYLE.erp.head}`}>ERP</th>
                        <th colSpan={3} className={`${groupTh} ${GROUP_STYLE.tnong.head}`}>T.Nóng</th>
                        <th colSpan={4} className={`${groupTh} ${GROUP_STYLE.tong.head} border-b-emerald-300 dark:border-b-emerald-800`}>Tổng</th>
                    </tr>
                    <tr>
                        {subHeaders('curErp', 'erp', 'prevErp', 'dErp')}
                        {subHeaders('curTnong', 'tnong', 'prevTnong', 'dTnong')}
                        {subHeaders('curTong', 'tong', 'prevTong', 'dTong')}
                        <th className={th(`${GROUP_STYLE.tong.sub} border-r-0`)} title="% chênh lệch Tổng so với cùng kỳ" onClick={() => handleSort('dPct')}>%{sortMark('dPct')}</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-700/60">
                    {viewMode === 'list' ? (
                        sortedRows.map((r, idx) => renderCompareRow(r, idx + 1))
                    ) : (
                        deptNames.map(deptName => {
                            const deptRows = rowsByDept[deptName];
                            const deptBothRows = deptRows.filter(r => r.prev && r.cur);
                            const deptCurTong = deptBothRows.reduce((s, r) => s + (r.cur!.tong || 0), 0);
                            const deptPrevTong = deptBothRows.reduce((s, r) => s + (r.prev!.tong || 0), 0);
                            const deptDTong = deptCurTong - deptPrevTong;
                            const deptDPct = deptPrevTong > 0 ? (deptDTong / deptPrevTong) * 100 : (deptCurTong > 0 ? Infinity : 0);

                            return (
                                <React.Fragment key={deptName}>
                                    <tr className="bg-slate-100/90 dark:bg-slate-800/70 font-black text-slate-700 dark:text-slate-300">
                                        <td colSpan={11} className="px-2 py-1.5 text-left text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                                            {deptName} <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">({deptRows.length} nhân viên)</span>
                                        </td>
                                    </tr>
                                    {deptRows.map(r => renderCompareRow(r, globalRankMap.get(r.emp.originalName) || 1))}
                                    {deptNames.length > 1 && (
                                        <tr className="bg-emerald-50/60 dark:bg-emerald-900/20 font-extrabold text-emerald-800 dark:text-emerald-300 border-t border-b border-emerald-200 dark:border-emerald-800">
                                            <td className="px-2 py-1 text-[12px] uppercase tracking-wider text-center border-r border-slate-200 dark:border-slate-700">Tổng {deptName}</td>
                                            <td className={`${tdFoot} border-l-2 border-l-slate-300 dark:border-l-slate-600 text-sky-700 dark:text-sky-400`}>{fmtK(f, deptRows.reduce((s, r) => s + (r.cur?.erp || 0), 0))}</td>
                                            <td className={tdFoot}>{fmtK(f, deptRows.reduce((s, r) => s + (r.prev?.erp || 0), 0))}</td>
                                            <td className={`${tdFoot} ${deltaColor(deptBothRows.reduce((s, r) => s + (r.dErp || 0), 0))}`}>{deptBothRows.length > 0 ? fmtDeltaK(f, deptBothRows.reduce((s, r) => s + (r.dErp || 0), 0)) : '—'}</td>
                                            <td className={`${tdFoot} border-l-2 border-l-slate-300 dark:border-l-slate-600 text-amber-600 dark:text-amber-400`}>{fmtK(f, deptRows.reduce((s, r) => s + (r.cur?.tNong || 0), 0))}</td>
                                            <td className={tdFoot}>{fmtK(f, deptRows.reduce((s, r) => s + (r.prev?.tNong || 0), 0))}</td>
                                            <td className={`${tdFoot} ${deltaColor(deptBothRows.reduce((s, r) => s + (r.dTnong || 0), 0))}`}>{deptBothRows.length > 0 ? fmtDeltaK(f, deptBothRows.reduce((s, r) => s + (r.dTnong || 0), 0)) : '—'}</td>
                                            <td className={`${tdFoot} border-l-2 border-l-slate-300 dark:border-l-slate-600 bg-emerald-100/90 dark:bg-emerald-900/50`}>{fmtK(f, deptCurTong)}</td>
                                            <td className={tdFoot}>{fmtK(f, deptPrevTong)}</td>
                                            <td className={`${tdFoot} text-[13.5px] ${deltaColor(deptDTong)}`}>{deptBothRows.length > 0 ? fmtDeltaK(f, deptDTong) : '—'}</td>
                                            <td className={`${tdFoot} border-r-0 ${deltaColor(deptDPct)}`}>{deptBothRows.length > 0 ? fmtPct(deptDPct) : '—'}</td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })
                    )}
                </tbody>
                <tfoot>
                    <tr style={{ borderLeft: `3px solid ${stripeColor(totals.bothCount > 0 ? totals.dTong : null)}` }} className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 font-extrabold border-t-2 border-emerald-200 dark:border-emerald-800">
                        <td className="px-2 py-1 text-[13px] uppercase tracking-wider text-center border-r border-slate-200 dark:border-slate-700">Tổng cộng</td>
                        <td className={`${tdFoot} border-l-2 border-l-slate-300 dark:border-l-slate-600 text-sky-700 dark:text-sky-400`}>{fmtK(f, totals.curErp)}</td>
                        <td className={tdFoot}>{fmtK(f, totals.prevErp)}</td>
                        <td className={`${tdFoot} ${deltaColor(totals.dErp)}`}>{totals.bothCount > 0 ? fmtDeltaK(f, totals.dErp) : '—'}</td>
                        <td className={`${tdFoot} border-l-2 border-l-slate-300 dark:border-l-slate-600 text-amber-600 dark:text-amber-400`}>{fmtK(f, totals.curTnong)}</td>
                        <td className={tdFoot}>{fmtK(f, totals.prevTnong)}</td>
                        <td className={`${tdFoot} ${deltaColor(totals.dTnong)}`}>{totals.bothCount > 0 ? fmtDeltaK(f, totals.dTnong) : '—'}</td>
                        <td className={`${tdFoot} border-l-2 border-l-slate-300 dark:border-l-slate-600 bg-emerald-100/90 dark:bg-emerald-900/50`}>{fmtK(f, totals.curTong)}</td>
                        <td className={tdFoot}>{fmtK(f, totals.prevTong)}</td>
                        <td className={`${tdFoot} text-[13.5px] ${deltaColor(totals.dTong)}`}>{totals.bothCount > 0 ? fmtDeltaK(f, totals.dTong) : '—'}</td>
                        <td className={`${tdFoot} border-r-0 ${deltaColor(totals.dPct)}`}>{totals.bothCount > 0 ? fmtPct(totals.dPct) : '—'}</td>
                    </tr>
                </tfoot>
            </table>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 px-1">
                * H.Tại = {curLabel} · CK (cùng kỳ tháng trước) = {prevLabel} · +/- = H.Tại − CK. Đơn vị: nghìn đồng.
                Vạch mép trái: xanh = Tổng tăng, đỏ = giảm, xám = thiếu 1 kỳ (không so được).
                Dòng TỔNG CỘNG phần +/- chỉ tính trên {totals.bothCount} nhân viên có đủ 2 kỳ.
            </p>
        </div>
    );
};

export default BonusCompareTable;
