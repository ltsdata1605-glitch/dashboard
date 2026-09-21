import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import { Input } from '../../../components/shared/ui/Input';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import type { SavedReport, CustomField } from '../types';
import { parseTr } from '../catalog';
import { buildReportText, fmtTr, installmentRate } from '../utils/reportText';
import { groupTotal } from '../utils/aggregate';
import { copyText } from '../utils/exportImage';
import { BandHeader } from './GroupSection';

interface HistoryTabProps {
    reports: SavedReport[];
    fields: CustomField[];
    onEdit: (report: SavedReport) => void;
    onDelete: (id: string) => void;
    onClearAll: () => void;
}

const fmtTime = (iso: string, fallback: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return fallback;
    return `${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

const TH: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <th className={`h-7 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border-b border-slate-200 text-left whitespace-nowrap font-[family-name:var(--console-font-label)] ${className}`}>{children}</th>
);

export const HistoryTab: React.FC<HistoryTabProps> = ({ reports, fields, onEdit, onDelete, onClearAll }) => {
    const [dateFilter, setDateFilter] = useState('');
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<SavedReport | null>(null);
    const [confirmClear, setConfirmClear] = useState(false);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return reports
            .filter(r => !dateFilter || r.date === dateFilter)
            .filter(r => !q || r.staffName.toLowerCase().includes(q) || String(parseTr(r.revenueTotal)).includes(q) || r.notes.toLowerCase().includes(q))
            .sort((a, b) => (b.savedAt || b.date).localeCompare(a.savedAt || a.date));
    }, [reports, dateFilter, search]);

    const copyReport = async (r: SavedReport) => {
        const ok = await copyText(buildReportText(r, fields));
        if (ok) toast.success('Đã copy văn bản báo cáo'); else toast.error('Không copy được, thử lại');
    };

    const totalTr = rows.reduce((s, r) => s + parseTr(r.revenueTotal), 0);

    return (
        <div className="space-y-3">
            <section className="border border-slate-200 bg-white">
                <BandHeader
                    icon="history"
                    title={<>Nhật ký đơn hàng <span className="tabular-nums">({reports.length})</span></>}
                    right={
                        <>
                            <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} aria-label="Lọc theo ngày" fullWidth={false}
                                className="h-6 rounded px-1.5 text-[12px] w-[130px]" />
                            <Input placeholder="Tìm NV, doanh thu, ghi chú…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Tìm trong nhật ký" fullWidth={false}
                                className="h-6 rounded px-2 text-[12px] w-40 hidden sm:block" />
                            {(dateFilter || search) && (
                                <Button variant="secondary" size="sm" className="h-6 px-2 rounded text-[11px]" onClick={() => { setDateFilter(''); setSearch(''); }}>Xoá lọc</Button>
                            )}
                        </>
                    }
                />
                {reports.length === 0 ? (
                    <p className="px-3 py-10 text-center text-[13px] text-slate-400">Chưa có đơn hàng nào được ghi nhận. Bấm <b>Báo cáo</b> ở tab Nhập báo cáo.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-[13px] tabular-nums border-collapse" data-testid="history-table">
                            <thead className="sticky top-0 z-10">
                                <tr>
                                    <TH className="w-6" />
                                    <TH>Thời gian</TH>
                                    <TH>Nhân viên</TH>
                                    <TH className="text-right">Doanh thu</TH>
                                    <TH className="text-right">Trả chậm</TH>
                                    <TH className="text-right">% TC</TH>
                                    <TH className="text-right">SP</TH>
                                    <TH className="text-right">GD</TH>
                                    <TH className="text-right">DV</TH>
                                    <TH className="text-right">PK</TH>
                                    <TH className="text-center">Ví / Chiến</TH>
                                    <TH className="text-right">Thao tác</TH>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map(r => {
                                    const total = parseTr(r.revenueTotal);
                                    const inst = parseTr(r.installment);
                                    const open = expanded === r.id;
                                    return (
                                        <React.Fragment key={r.id}>
                                            <tr className={`h-[26px] hover:bg-slate-50 cursor-pointer border-l-[3px] ${inst > 0 ? 'border-l-emerald-600' : 'border-l-slate-200'}`}
                                                onClick={() => setExpanded(open ? null : r.id)} data-testid="history-row">
                                                <td className="px-1 text-slate-400">{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</td>
                                                <td className="px-2 whitespace-nowrap text-slate-600">{fmtTime(r.savedAt, r.date)}</td>
                                                <td className="px-2 truncate max-w-[160px] text-slate-800">{r.staffName || '—'}</td>
                                                <td className="px-2 text-right font-semibold text-slate-900">{fmtTr(total)}</td>
                                                <td className="px-2 text-right text-sky-700">{inst > 0 ? fmtTr(inst) : '—'}</td>
                                                <td className="px-2 text-right text-slate-600">{inst > 0 ? `${installmentRate(total, inst)}%` : '—'}</td>
                                                <td className="px-2 text-right">{groupTotal(r, 'products') || '—'}</td>
                                                <td className="px-2 text-right">{groupTotal(r, 'household') || '—'}</td>
                                                <td className="px-2 text-right">{groupTotal(r, 'services') || '—'}</td>
                                                <td className="px-2 text-right">{groupTotal(r, 'accessories') || '—'}</td>
                                                <td className="px-2 text-center text-[12px]">
                                                    <span className={r.moVi ? 'text-sky-700 font-semibold' : 'text-slate-300'}>Ví</span>
                                                    <span className="text-slate-300"> · </span>
                                                    <span className={r.priceWar ? 'text-rose-700 font-semibold' : 'text-slate-300'}>Chiến</span>
                                                </td>
                                                <td className="px-2 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                    <Button variant="unstyled" size="none" onClick={() => copyReport(r)} title="Sao chép văn bản" aria-label="Sao chép" className="h-6 w-6 inline-flex items-center justify-center text-slate-400 hover:text-sky-700"><Copy size={13} /></Button>
                                                    <Button variant="unstyled" size="none" onClick={() => onEdit(r)} title="Sửa lại" aria-label="Sửa lại" className="h-6 w-6 inline-flex items-center justify-center text-slate-400 hover:text-sky-700"><Pencil size={13} /></Button>
                                                    <Button variant="unstyled" size="none" onClick={() => setPendingDelete(r)} title="Xoá" aria-label="Xoá" className="h-6 w-6 inline-flex items-center justify-center text-slate-400 hover:text-rose-600"><Trash2 size={13} /></Button>
                                                </td>
                                            </tr>
                                            {open && (
                                                <tr className="bg-slate-50/60">
                                                    <td colSpan={12} className="px-3 py-2">
                                                        <pre className="text-[13px] leading-relaxed whitespace-pre-wrap font-sans text-slate-800" data-testid="history-text">{buildReportText(r, fields)}</pre>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="h-7 bg-slate-100 border-t border-slate-200 font-semibold text-slate-800">
                                    <td colSpan={3} className="px-2 text-[11px] uppercase tracking-wider">Tổng ({rows.length} đơn)</td>
                                    <td className="px-2 text-right">{fmtTr(totalTr)}</td>
                                    <td className="px-2 text-right text-sky-700">{fmtTr(rows.reduce((s, r) => s + parseTr(r.installment), 0))}</td>
                                    <td colSpan={7} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </section>

            <section className="border border-rose-200 bg-rose-50 px-3 py-2 flex items-center justify-between gap-3">
                <div>
                    <p className="text-[12px] font-bold text-rose-700 uppercase tracking-wider">Xoá toàn bộ dữ liệu</p>
                    <p className="text-[12px] text-rose-700/80">Xoá nháp, nhật ký đơn hàng, khách hàng và mục tuỳ chỉnh trên máy này.</p>
                </div>
                <Button variant="danger" size="sm" className="rounded" onClick={() => setConfirmClear(true)}>Xoá hết</Button>
            </section>

            <ConfirmDialog
                isOpen={!!pendingDelete}
                onClose={() => setPendingDelete(null)}
                onConfirm={() => { if (pendingDelete) onDelete(pendingDelete.id); setPendingDelete(null); }}
                title="Xoá đơn hàng này?"
                message={pendingDelete ? <>Xoá đơn <b>{fmtTr(parseTr(pendingDelete.revenueTotal))} Tr</b> lúc {fmtTime(pendingDelete.savedAt, pendingDelete.date)}. Không hoàn tác được.</> : ''}
                confirmText="Xoá"
                variant="danger"
            />
            <ConfirmDialog
                isOpen={confirmClear}
                onClose={() => setConfirmClear(false)}
                onConfirm={() => { onClearAll(); setConfirmClear(false); }}
                title="Xoá toàn bộ dữ liệu?"
                message="Toàn bộ nháp, nhật ký đơn hàng, khách hàng và mục tuỳ chỉnh của Báo cáo khai thác trên máy này sẽ bị xoá. Không hoàn tác được."
                confirmText="Đồng ý xoá hết"
                variant="danger"
            />
        </div>
    );
};
