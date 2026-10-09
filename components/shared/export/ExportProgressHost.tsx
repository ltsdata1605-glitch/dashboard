import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../ui/Button';
import { AppIcon } from '../ui/icon/AppIcon';
import { Overlay } from '../ui/Overlay';
import {
    type ExportJobState, getExportState, subscribeExportState, registerExportHostMount,
    requestCancelExport, closeExportPanel,
} from './exportProgress';

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
        <Overlay
            kind="fullscreen"
            role="dialog"
            aria-modal="true"
            aria-label={s.title}
            data-testid="export-progress"
            // id cũ của lớp phủ DOM (gốc / Phân Ca / Sticker) — giữ để test & CSS cũ còn bám được
            id="export-overlay"
            className="z-[999990] flex items-center justify-center bg-slate-900/40 p-4"
        >
            <div className="w-full max-w-sm rounded-md bg-white shadow-xl border border-slate-200">
                <div className="flex items-center gap-3 px-4 pt-4">
                    {xong ? (
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${failed.length || s.cancelRequested ? 'bg-amber-500' : 'bg-emerald-600'}`} aria-hidden>
                            <AppIcon name={failed.length || s.cancelRequested ? 'alert' : 'check'} size="sm" />
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
        </Overlay>
    );
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
    createRoot(el).render(<ExportProgressHost />);
}

registerExportHostMount(ensureExportHostMounted);
