import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../ui/Button';
import {
    type ExportJobState, getExportState, subscribeExportState, registerExportHostMount,
    requestCancelExport, closeExportPanel,
} from './exportProgress';
import {
    type LineSendState, getLineSendState, subscribeLineSend, registerLineSendHostMount,
    cancelLineSend, retryFailedLineSends, closeLineSendPanel,
} from './lineDelivery';
import { LineIcon } from './LineIcon';

/**
 * BẢNG TIẾN TRÌNH XUẤT ẢNH — một giao diện duy nhất cho mọi khu vực.
 * Tự gắn vào <body> lần đầu có lượt xuất (createRoot riêng), nên khu vực nào cũng có mà không phải
 * nhớ đặt component vào cây React của mình.
 *
 * Xuất lẻ: "Đang chụp ảnh… → Đang lưu ảnh…", thanh chạy vô định. Hàng loạt: thanh %, "3/12 — tên
 * mục", thời gian còn lại ước tính, nút Huỷ; xong hiện tổng kết (mục lỗi được liệt kê).
 */

const fmtGiay = (ms: number) => {
    const s = Math.max(1, Math.round(ms / 1000));
    return s < 60 ? `${s} giây` : `${Math.floor(s / 60)} phút ${s % 60} giây`;
};

function Panel({ s }: { s: ExportJobState }) {
    const batch = s.total > 1;
    const xong = s.phase === 'finished';
    const failed = s.results.filter((r) => r.status === 'failed');
    const pct = xong ? 100 : Math.round((s.done / s.total) * 100);
    const conLai = batch && s.done > 0 && !xong
        ? ((Date.now() - s.startedAt) / s.done) * (s.total - s.done)
        : 0;
    const mauThanh = xong ? (failed.length ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-sky-500';

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={s.title}
            data-testid="export-progress"
            // id cũ của lớp phủ DOM (gốc / Phân Ca / Sticker) — giữ để test & CSS cũ còn bám được
            id="export-overlay"
            className="fixed inset-0 z-[999990] flex items-center justify-center bg-slate-900/40 p-4"
        >
            <div className="w-full max-w-sm rounded-md bg-white shadow-xl border border-slate-200">
                <div className="flex items-center gap-3 px-4 pt-4">
                    {xong ? (
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold ${failed.length || s.cancelRequested ? 'bg-amber-500' : 'bg-emerald-600'}`} aria-hidden>
                            {failed.length || s.cancelRequested ? '!' : '✓'}
                        </span>
                    ) : (
                        <span className="h-8 w-8 shrink-0 rounded-full border-[3px] border-sky-100 border-t-sky-600 animate-spin" aria-hidden />
                    )}
                    <div className="min-w-0">
                        <p className="text-[14px] font-bold text-slate-800 truncate">{s.title}</p>
                        <p className="text-[12px] text-slate-500" data-testid="export-progress-stage">{s.stage}</p>
                    </div>
                </div>

                <div className="px-4 pt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        {batch || xong ? (
                            <div className={`h-full ${mauThanh} transition-all duration-300`} style={{ width: `${pct}%` }} />
                        ) : (
                            <div className="h-full w-1/3 bg-sky-500 animate-[ycxExportIndet_1.1s_ease-in-out_infinite]" />
                        )}
                    </div>
                    {batch && (
                        <div className="mt-1.5 flex items-center justify-between text-[12px] text-slate-500 tabular-nums">
                            <span className="truncate pr-2" id="export-msg">{xong ? '' : s.current}</span>
                            <span className="shrink-0" data-testid="export-progress-count">
                                {s.done}/{s.total}{conLai > 0 ? ` · còn ~${fmtGiay(conLai)}` : ''}
                            </span>
                        </div>
                    )}
                </div>

                {xong && failed.length > 0 && (
                    <ul className="mx-4 mt-3 max-h-32 overflow-auto border-l-[3px] border-rose-500 bg-rose-50 px-3 py-2 text-[12px] text-rose-700" data-testid="export-progress-failed">
                        {failed.map((f, i) => <li key={i} className="truncate">{f.label}{f.error ? ` — ${f.error}` : ''}</li>)}
                    </ul>
                )}

                <div className="flex justify-end gap-2 px-4 py-3">
                    {!xong && s.cancellable && (
                        <Button size="sm" variant="secondary" onClick={requestCancelExport} disabled={s.cancelRequested}>
                            {s.cancelRequested ? 'Đang huỷ…' : 'Huỷ'}
                        </Button>
                    )}
                    {xong && (
                        <Button size="sm" variant="primary" onClick={closeExportPanel}>Đóng</Button>
                    )}
                </div>
            </div>
            <style>{'@keyframes ycxExportIndet{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}'}</style>
        </div>
    );
}

/**
 * THẺ "GỬI NHÓM LINE" — nổi ở góc dưới (không phủ kín màn hình như bảng xuất ảnh): việc gửi có thể kéo dài,
 * người dùng vẫn xem/thao tác được, và thẻ không che bảng lỗi xuất ảnh. Trên điện thoại chừa chỗ thanh điều hướng
 * dưới + vùng an toàn iPhone; danh sách lỗi tự cuộn để thẻ không tràn màn hình.
 */
function LineCard({ s }: { s: LineSendState }) {
    const xong = s.phase === 'finished';
    const total = s.items.length;
    const daXuLy = s.items.filter((i) => i.status === 'ok' || i.status === 'failed' || i.status === 'skipped').length;
    const ok = s.items.filter((i) => i.status === 'ok').length;
    const loi = s.items.filter((i) => i.status === 'failed');
    const dangGui = s.items.findIndex((i) => i.status === 'sending');
    const coLoi = loi.length > 0 || Boolean(s.exportError) || (xong && total === 0);
    const [dangThuLai, setDangThuLai] = useState(false);

    let stage: string;
    if (xong) stage = s.summary || '';
    else if (s.cancelRequested) stage = 'Đang dừng sau ảnh hiện tại…';
    else if (dangGui >= 0) stage = `Đang gửi nhóm LINE ${dangGui + 1}/${total}${s.phase === 'exporting' ? ' · vẫn đang xuất ảnh' : ''}`;
    else if (s.phase === 'exporting') stage = total ? `Đang xuất ảnh… · đã gửi ${ok}/${total}` : 'Đang xuất ảnh…';
    else stage = 'Đang gửi nhóm LINE…';
    const pct = total ? Math.round((daXuLy / total) * 100) : 0;

    return (
        <div
            role="status"
            aria-live="polite"
            data-testid="line-send-progress"
            className="fixed z-[999991] left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+76px)] sm:left-auto sm:right-4 sm:bottom-4 sm:w-[360px] rounded-md border border-slate-200 bg-white shadow-xl"
        >
            <div className="flex items-start gap-3 px-3.5 pt-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${xong ? (coLoi ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white') : 'bg-[#06C755] text-white'}`} aria-hidden>
                    {xong ? <span className="text-sm font-bold">{coLoi ? '!' : '✓'}</span> : <LineIcon className="h-4.5 w-4.5" />}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-slate-800 truncate">Gửi nhóm LINE — {s.title}</p>
                    <p className="text-[12px] text-slate-500 truncate">{s.groupsLabel}</p>
                    <p className="text-[12px] font-semibold text-slate-700 tabular-nums" data-testid="line-send-stage">{stage}</p>
                </div>
            </div>
            {total > 0 && (
                <div className="px-3.5 pt-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full transition-all duration-300 ${xong ? (loi.length ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-[#06C755]'}`} style={{ width: `${xong ? 100 : pct}%` }} />
                    </div>
                    <div className="mt-1 text-right text-[11px] text-slate-500 tabular-nums" data-testid="line-send-count">{ok}/{total} ảnh đã gửi</div>
                </div>
            )}
            {(s.exportError || loi.length > 0) && (
                <ul className="mx-3.5 mt-2 max-h-28 overflow-auto border-l-[3px] border-rose-500 bg-rose-50 px-3 py-1.5 text-[12px] text-rose-700" data-testid="line-send-failed">
                    {s.exportError && <li className="break-words">Lỗi xuất ảnh — {s.exportError}</li>}
                    {loi.map((f) => <li key={f.id} className="break-words">Lỗi gửi LINE · {f.label}{f.error ? ` — ${f.error}` : ''}</li>)}
                </ul>
            )}
            <div className="flex justify-end gap-2 px-3.5 py-2.5">
                {!xong && (
                    <Button size="sm" variant="secondary" className="min-h-10 sm:min-h-0" onClick={() => cancelLineSend(requestCancelExport)} disabled={s.cancelRequested}>
                        {s.cancelRequested ? 'Đang dừng…' : 'Dừng gửi'}
                    </Button>
                )}
                {xong && loi.length > 0 && (
                    <Button
                        size="sm" variant="primary" className="min-h-10 sm:min-h-0" disabled={dangThuLai} data-testid="line-send-retry"
                        onClick={async () => { setDangThuLai(true); try { await retryFailedLineSends(); } finally { setDangThuLai(false); } }}
                    >
                        Thử lại {loi.length} ảnh lỗi
                    </Button>
                )}
                {xong && (
                    <Button size="sm" variant={loi.length ? 'secondary' : 'primary'} className="min-h-10 sm:min-h-0" onClick={closeLineSendPanel}>Đóng</Button>
                )}
            </div>
        </div>
    );
}

function LineSendHost() {
    const [s, setS] = useState<LineSendState | null>(getLineSendState());
    useEffect(() => subscribeLineSend(setS), []);
    return s ? <LineCard s={s} /> : null;
}

export function ExportProgressHost() {
    const [s, setS] = useState<ExportJobState | null>(getExportState());
    const [, tick] = useState(0);
    useEffect(() => subscribeExportState(setS), []);
    // Cập nhật "còn ~N giây" mỗi giây khi đang chạy hàng loạt
    useEffect(() => {
        if (!s || s.phase !== 'running' || s.total <= 1) return;
        const t = setInterval(() => tick((n) => n + 1), 1000);
        return () => clearInterval(t);
    }, [s]);
    return s ? <Panel s={s} /> : null;
}

/** Gắn bảng vào trang (1 lần). Gọi tự động khi có lượt xuất đầu tiên. */
function ensureExportHostMounted() {
    if (typeof document === 'undefined') return;
    const G = globalThis as unknown as { __ycxExportHostMounted?: boolean };
    if (G.__ycxExportHostMounted) return;
    G.__ycxExportHostMounted = true;
    const el = document.createElement('div');
    el.id = 'ycx-export-progress-root';
    // Không bao giờ lọt vào ảnh chụp
    el.className = 'hide-on-export no-print';
    document.body.appendChild(el);
    createRoot(el).render(<><ExportProgressHost /><LineSendHost /></>);
}

registerExportHostMount(ensureExportHostMounted);
registerLineSendHostMount(ensureExportHostMounted);
