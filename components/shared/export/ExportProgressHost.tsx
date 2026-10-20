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

    const isAlert = Boolean(failed.length || s.cancelRequested);
    const mauThanh = xong 
        ? (isAlert ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500') 
        : 'bg-gradient-to-r from-sky-400 to-sky-600';

    return (
        <Overlay
            kind="fullscreen"
            role="dialog"
            aria-modal="true"
            aria-label={s.title}
            data-testid="export-progress"
            // id cũ của lớp phủ DOM (gốc / Phân Ca / Sticker) — giữ để test & CSS cũ còn bám được
            id="export-overlay"
            className="z-[999990] flex items-center justify-center bg-slate-950/25 dark:bg-black/40 backdrop-blur-[3px] p-4 transition-all duration-300"
        >
            <div className="relative w-full max-w-[340px] sm:max-w-[360px] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.14),0_6px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-4.5 animate-in fade-in zoom-in-95 duration-200">
                {/* Nút đóng nhanh (Quick Close ✕) */}
                <button
                    type="button"
                    onClick={closeExportPanel}
                    className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    aria-label="Tắt"
                    title="Tắt"
                >
                    <AppIcon name="close" size="sm" />
                </button>

                {/* Header: Icon + Tiêu đề + Trạng thái */}
                <div className="flex items-center gap-3 pr-6">
                    {xong ? (
                        <span 
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-2xs border ${
                                isAlert 
                                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200/70 dark:border-amber-800/60' 
                                    : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-800/60'
                            }`} 
                            aria-hidden
                        >
                            <AppIcon name={isAlert ? 'alert' : 'check'} size="md" />
                        </span>
                    ) : (
                        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 shadow-2xs" aria-hidden>
                            <span className="h-5 w-5 rounded-full border-2 border-sky-200 dark:border-sky-800 border-t-sky-600 dark:border-t-sky-400 animate-spin" />
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate leading-snug">{s.title}</p>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5" data-testid="export-progress-stage">{s.stage}</p>
                    </div>
                </div>

                {/* Thanh tiến trình Progress Bar chuẩn Apple */}
                <div className="mt-3.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/80 p-0.5">
                        {batch || xong ? (
                            <div className={`h-full rounded-full ${mauThanh} transition-all duration-300 ease-out`} style={{ width: `${pct}%` }} />
                        ) : (
                            <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-sky-300 via-sky-500 to-sky-600 animate-[ycxExportIndet_1.2s_ease-in-out_infinite]" />
                        )}
                    </div>
                    {batch && (
                        <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                            <span className="truncate pr-2" id="export-msg">{xong ? '' : s.current}</span>
                            <span className="shrink-0" data-testid="export-progress-count">
                                {s.done}/{s.total}{conLai > 0 ? ` · còn ~${fmtGiay(conLai)}` : ''}
                            </span>
                        </div>
                    )}
                </div>

                {/* Danh sách mục lỗi (nếu có) */}
                {xong && failed.length > 0 && (
                    <div className="mt-2.5 max-h-24 overflow-y-auto rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 p-2 text-[11px] text-rose-700 dark:text-rose-300 space-y-0.5" data-testid="export-progress-failed">
                        {failed.map((f, i) => (
                            <div key={i} className="truncate font-medium">
                                • {f.label}{f.error ? ` — ${f.error}` : ''}
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer Buttons chuẩn Apple Capsule */}
                {((!xong && s.cancellable) || xong) && (
                    <div className="mt-3 pt-2.5 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800/60">
                        {!xong && s.cancellable && (
                            <Button 
                                size="none" 
                                variant="unstyled" 
                                onClick={requestCancelExport} 
                                disabled={s.cancelRequested}
                                className="px-3.5 py-1 text-xs font-semibold rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                            >
                                {s.cancelRequested ? 'Đang huỷ…' : 'Huỷ'}
                            </Button>
                        )}
                        {xong && (
                            <Button 
                                size="none" 
                                variant="unstyled" 
                                onClick={closeExportPanel}
                                className="px-4 py-1 text-xs font-semibold rounded-full bg-sky-600 hover:bg-sky-700 text-white active:scale-95 shadow-2xs transition-all cursor-pointer"
                            >
                                Đóng
                            </Button>
                        )}
                    </div>
                )}
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
