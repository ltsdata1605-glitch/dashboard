import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../shared/ui/Button';
import { Modal } from '../shared/ui/Modal';
import { Icon } from '../common/Icon';
import {
    YCX_MIN_USERSCRIPT_VERSION, YCX_REPORT_URL, YCX_STEPS, YCX_USERSCRIPT_URL,
    compareVersions, detectYcxUserscript, fetchLatestYcxUserscriptVersion,
    listenYcxJob, newYcxJobId, startYcxJob, ycxBufferToFile,
    type YcxStep,
} from '../../services/ycxAutoSyncService';

/**
 * KHUNG "AUTO SYNC YCX" của Phân tích (2026-10-01) — anh em với khung AUTO SYNC của Report BI: nổi bên phải
 * (desktop), tự thu gọn thành cột icon ở màn < 1536px để không che bảng (nội dung Phân tích rộng ~930px căn giữa — từ 1536px
 * trở lên lề phải đủ chỗ cho khung 224px, đo bằng ảnh chụp test). Bấm "Tự động YCX Realtime" → mở báo cáo 77
 * trên report.mwgroup.vn, userscript tự xuất excel, chờ file, tải về rồi nạp như "File YCX" → "Tệp Realtime".
 * Chi tiết luồng: services/ycxAutoSyncService.ts.
 */

type Phase = 'idle' | 'running' | 'error' | 'done';
type ScriptState = { checked: boolean; installed: boolean; version?: string };

interface Props {
    isActive?: boolean;
    /** Nạp file vừa tải vào Phân tích như Tệp Realtime */
    onFile: (file: File) => Promise<void> | void;
}

const stepIndex = (s: YcxStep | null) => (s ? YCX_STEPS.findIndex((x) => x.id === s) : -1);

export default function YcxAutoSyncDock({ isActive = true, onFile }: Props) {
    const [manHep, setManHep] = useState(() => window.innerWidth < 1536);
    const [moTam, setMoTam] = useState(false);
    const thuGon = manHep && !moTam;

    const [script, setScript] = useState<ScriptState>({ checked: false, installed: false });
    const [latest, setLatest] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [phase, setPhase] = useState<Phase>('idle');
    const [step, setStep] = useState<YcxStep | null>(null);
    const [message, setMessage] = useState('');
    const [log, setLog] = useState<{ at: number; text: string }[]>([]);
    const jobRef = useRef<string | null>(null);
    const stopRef = useRef<(() => void) | null>(null);
    const onFileRef = useRef(onFile);
    onFileRef.current = onFile;

    useEffect(() => {
        const onResize = () => setManHep(window.innerWidth < 1536);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Dò userscript TRƯỚC khi bấm: window.open phải chạy ngay trong cú bấm, không kịp chờ ping 1 giây
    const kiemTra = useCallback(async () => {
        const r = await detectYcxUserscript(1200);
        setScript({ checked: true, ...r });
        return r;
    }, []);
    useEffect(() => {
        if (!isActive) return;
        const t = setTimeout(kiemTra, 800);
        const onFocus = () => { void kiemTra(); };
        window.addEventListener('focus', onFocus);
        return () => { clearTimeout(t); window.removeEventListener('focus', onFocus); };
    }, [isActive, kiemTra]);
    useEffect(() => { if (open && !latest) void fetchLatestYcxUserscriptVersion().then(setLatest); }, [open, latest]);
    useEffect(() => () => stopRef.current?.(), []);

    const ghi = (text: string) => setLog((l) => [...l.slice(-30), { at: Date.now(), text }]);

    const scriptDu = script.installed && compareVersions(script.version || '0', YCX_MIN_USERSCRIPT_VERSION) >= 0;

    const batDau = () => {
        setOpen(true);
        if (!scriptDu) { setPhase('idle'); void kiemTra(); return; }
        stopRef.current?.();
        const jobId = newYcxJobId();
        jobRef.current = jobId;
        setPhase('running');
        setStep('open');
        setMessage('Đang mở report.mwgroup.vn…');
        setLog([]);
        ghi('Bắt đầu lượt Tự động YCX Realtime');
        stopRef.current = listenYcxJob(jobId, (m) => {
            if (jobRef.current !== jobId) return;
            if (m.type === 'progress') {
                setStep(m.step);
                setMessage(m.message);
                ghi(m.message);
            } else if (m.type === 'error') {
                if (m.step) setStep(m.step);
                setPhase('error');
                setMessage(m.message);
                ghi(`Lỗi: ${m.message}`);
            } else if (m.type === 'file') {
                setStep('load');
                setMessage(`Đã tải "${m.fileName}" (${(m.buffer.byteLength / 1048576).toFixed(1)} MB) — đang nạp vào Phân tích…`);
                ghi(`Đã nhận file ${m.fileName}`);
                stopRef.current?.();
                stopRef.current = null;
                const file = ycxBufferToFile(m.buffer, m.fileName);
                // Đóng khung tiến trình để hộp đặt tên / xung đột của Phân tích (nếu có) hiện lên trên
                setPhase('done');
                setOpen(false);
                // Phân tích tự báo "Đã tải lên và xử lý thành công" — ở đây chỉ báo khi lỗi
                Promise.resolve(onFileRef.current(file))
                    .catch((err) => toast.error(`Nạp file YCX lỗi: ${err instanceof Error ? err.message : String(err)}`));
            }
        });
        if (!startYcxJob(jobId)) {
            setPhase('error');
            setMessage('Trình duyệt chặn mở tab mới — cho phép cửa sổ bật lên (pop-up) cho dashboard.pro.vn rồi bấm lại.');
        }
    };

    const huy = () => {
        stopRef.current?.();
        stopRef.current = null;
        jobRef.current = null;
        setPhase('idle');
        setStep(null);
        setOpen(false);
    };

    const dongModal = () => {
        // Đang chạy thì chỉ ẩn khung — lượt vẫn tiếp tục, xong sẽ tự nạp
        setOpen(false);
        if (phase !== 'running') { setPhase('idle'); setStep(null); }
    };

    if (!isActive) return null;

    const dangChay = phase === 'running';
    const cur = stepIndex(step);

    return (
        <>
            <aside
                aria-label="Tự động YCX cho Phân tích"
                data-testid="ycx-auto-dock"
                className={`hidden lg:flex flex-col fixed right-4 xl:right-7 top-32 z-40 no-print hide-on-export select-none rounded-md bg-white/95 border border-slate-200 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)] transition-all duration-200 ${thuGon ? 'p-1.5 gap-2 items-center' : 'w-[224px] p-3 gap-2.5'}`}
            >
                {thuGon ? (
                    <>
                        <Button variant="ghost" size="icon" onClick={() => setMoTam(true)} title="Mở rộng khung Auto Sync YCX" aria-label="Mở rộng khung Auto Sync YCX">
                            <Icon name="chevron-left" size={4} />
                        </Button>
                        <Button
                            variant="unstyled" size="none" onClick={batDau}
                            title="Tự động YCX Realtime" aria-label="Tự động YCX Realtime"
                            className={`p-2.5 rounded bg-sky-600 hover:bg-sky-700 text-white ${dangChay ? 'ring-2 ring-sky-300 animate-pulse' : ''}`}
                        >
                            <Icon name="zap" size={4} />
                        </Button>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between px-0.5 pb-2 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${dangChay ? 'bg-amber-500 animate-pulse' : scriptDu ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden />
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Auto Sync YCX</span>
                            </div>
                            {manHep && (
                                <Button variant="ghost" size="none" className="p-1 rounded" onClick={() => setMoTam(false)} title="Thu gọn" aria-label="Thu gọn khung Auto Sync YCX">
                                    <Icon name="chevron-right" size={3.5} />
                                </Button>
                            )}
                        </div>
                        <Button
                            variant="unstyled" size="none" onClick={batDau}
                            title="Tự động xuất & nạp file YCX Realtime từ report.mwgroup.vn (báo cáo 77)"
                            aria-label="Tự động YCX Realtime"
                            className="group flex items-center gap-3 px-3 py-2.5 rounded bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-left whitespace-nowrap transition-colors"
                        >
                            <span className="w-8 h-8 rounded bg-white/15 flex items-center justify-center shrink-0">
                                <Icon name={dangChay ? 'refresh-cw' : 'zap'} size={4} className={dangChay ? 'animate-spin' : ''} />
                            </span>
                            <span className="flex flex-col">
                                <span className="text-[13px] font-bold leading-tight">YCX Realtime</span>
                                <span className="text-[11px] font-semibold text-sky-100 leading-none mt-1">
                                    {dangChay ? 'Đang chạy… bấm để xem' : 'Tự động đổ & cập nhật'}
                                </span>
                            </span>
                        </Button>
                        <Button
                            variant="unstyled" size="none" onClick={() => { setOpen(true); void kiemTra(); }}
                            className="flex items-center justify-center gap-1.5 pt-1.5 border-t border-slate-200 text-[11px] font-semibold text-slate-400 hover:text-sky-600 w-full"
                        >
                            <Icon name="info" size={3} />
                            <span>Tampermonkey • {script.checked ? (script.installed ? `bản ${script.version || '?'}` : 'chưa cài') : 'đang dò…'}</span>
                        </Button>
                    </>
                )}
            </aside>

            <Modal
                isOpen={open}
                onClose={dongModal}
                title="Tự động YCX Realtime"
                subTitle="report.mwgroup.vn · báo cáo 77 · Chi tiết yêu cầu xuất"
                maxWidth="md"
                footer={
                    <div className="flex w-full items-center justify-end gap-2">
                        {dangChay && <Button variant="secondary" size="sm" onClick={huy}>Huỷ lượt này</Button>}
                        {phase === 'error' && <Button variant="primary" size="sm" onClick={batDau}>Chạy lại</Button>}
                        {phase === 'idle' && scriptDu && <Button variant="primary" size="sm" onClick={batDau}>Bắt đầu</Button>}
                        <Button variant="secondary" size="sm" onClick={dongModal}>{dangChay ? 'Ẩn (vẫn chạy)' : 'Đóng'}</Button>
                    </div>
                }
            >
                <div className="space-y-3 text-[13px] text-slate-700" data-testid="ycx-auto-modal">
                    {!scriptDu ? (
                        <div className="border-l-[3px] border-amber-500 bg-amber-50 px-3 py-2 space-y-2" data-testid="ycx-auto-need-script">
                            <p className="font-semibold text-amber-800">
                                {script.installed
                                    ? `Tampermonkey đang chạy bản ${script.version || '?'} — cần bản ${YCX_MIN_USERSCRIPT_VERSION} trở lên để tự động trên report.mwgroup.vn.`
                                    : 'Chưa thấy userscript "MWG - Tự động lấy điểm thưởng" trên trang này.'}
                            </p>
                            <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                                <li>Bấm <b>Cài / cập nhật userscript</b> → Tampermonkey hiện trang cài → bấm Cài đặt / Cập nhật{latest ? ` (bản mới nhất ${latest})` : ''}.</li>
                                <li>Lần đầu tải file, Tampermonkey có thể hỏi quyền truy cập tên miền — chọn <b>Luôn cho phép</b>.</li>
                                <li>Tải lại trang Dashboard rồi bấm lại <b>Tự động YCX Realtime</b>.</li>
                            </ol>
                            <div className="flex gap-2">
                                <Button variant="primary" size="sm" onClick={() => window.open(YCX_USERSCRIPT_URL, '_blank')}>Cài / cập nhật userscript</Button>
                                <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Tải lại trang</Button>
                            </div>
                        </div>
                    ) : phase === 'idle' ? (
                        <div className="space-y-2">
                            <p>Dashboard sẽ mở <b>{YCX_REPORT_URL.replace('https://', '')}</b> ở tab mới và tự làm thay anh/chị:</p>
                            <ol className="list-decimal pl-5 space-y-1">
                                {YCX_STEPS.map((s) => <li key={s.id}>{s.label}</li>)}
                            </ol>
                            <p className="text-[12px] text-slate-500">Cần đăng nhập sẵn report.mwgroup.vn. Ngày để mặc định (hôm nay).</p>
                        </div>
                    ) : (
                        <>
                            <ol className="space-y-1.5" data-testid="ycx-auto-steps">
                                {YCX_STEPS.map((s, i) => {
                                    const xong = phase === 'done' || i < cur;
                                    const dang = i === cur && phase === 'running';
                                    const loi = i === cur && phase === 'error';
                                    return (
                                        <li key={s.id} className={`flex items-center gap-2 border-l-[3px] pl-2 ${loi ? 'border-rose-500 text-rose-700' : xong ? 'border-emerald-500 text-slate-700' : dang ? 'border-sky-500 text-sky-800 font-semibold' : 'border-slate-200 text-slate-400'}`}>
                                            <span className="w-4 shrink-0 text-center" aria-hidden>
                                                {loi ? '!' : xong ? '✓' : dang ? <span className="inline-block h-3 w-3 rounded-full border-2 border-sky-200 border-t-sky-600 animate-spin align-middle" /> : '·'}
                                            </span>
                                            <span>{s.label}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                            <p className={`px-3 py-2 border-l-[3px] ${phase === 'error' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-sky-500 bg-sky-50 text-sky-800'}`} data-testid="ycx-auto-message">
                                {message}
                            </p>
                            {phase === 'error' && (
                                <p className="text-[12px] text-slate-500">
                                    Có thể làm tay: mở <a className="text-sky-700 underline" href={YCX_REPORT_URL} target="_blank" rel="noreferrer">báo cáo 77</a> → Xuất excel →
                                    Lịch sử xuất excel → Tải file excel → bấm <b>File YCX</b> → <b>Tệp Realtime</b>.
                                </p>
                            )}
                            {log.length > 1 && (
                                <details className="text-[12px] text-slate-500">
                                    <summary className="cursor-pointer">Nhật ký ({log.length})</summary>
                                    <ul className="mt-1 max-h-32 overflow-auto tabular-nums">
                                        {log.map((l, i) => <li key={i}>{new Date(l.at).toLocaleTimeString('vi-VN')} — {l.text}</li>)}
                                    </ul>
                                </details>
                            )}
                        </>
                    )}
                </div>
            </Modal>
        </>
    );
}
