import React, { useEffect, useMemo, useState } from 'react';
import { Button, cn } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { LineIcon } from './LineIcon';
import {
    type LineGroup, getLineTransport, isLineSendBusy, runWithLineDelivery, subscribeLineSend,
} from './lineDelivery';
import './ExportProgressHost';

/**
 * NÚT "GỬI NHÓM LINE" — một nút duy nhất cho mọi nơi có xuất ảnh (2026-10-02).
 *
 * Đặt cạnh nút xuất ảnh có sẵn, truyền đúng hàm xuất của nút đó:
 *   <LineSendButton areaKey="bi:thi-dua" title="Thi Đua" run={() => handleExportPNG(...)} />
 * Nút xuất hàng loạt cũng vậy — mọi ảnh vòng lặp xuất ra đều được gửi (từng ảnh một), có tiến trình + thử lại.
 *
 * Bấm nút → hộp chọn nhóm (tích sẵn nhóm đã gửi lần trước ở khu vực này) → "Gửi". Luôn hỏi trước khi gửi: tin LINE
 * gửi nhóm tính hạn mức theo số thành viên, bấm nhầm là tốn thật.
 */

export interface LineSendChoice {
    id: string;
    label: string;
    sublabel?: string;
    run: () => Promise<unknown> | unknown;
}

export interface LineSendButtonProps {
    /** Khoá nhớ nhóm đã chọn, vd "bi:thi-dua" — mỗi khu vực một khoá */
    areaKey: string;
    /** Tên báo cáo hiện trên hộp thoại + bảng tiến trình */
    title: string;
    /** Hàm xuất ảnh có sẵn của màn hình */
    run?: () => Promise<unknown> | unknown;
    /** Nút xuất có nhiều lựa chọn (vd "Ảnh tổng" / "Theo từng bộ phận") — người dùng chọn 1 trong hộp thoại */
    choices?: LineSendChoice[];
    /** Gợi ý số ảnh của lượt hàng loạt, vd "theo từng nhân viên (12 ảnh)" */
    batchHint?: string;
    disabled?: boolean;
    className?: string;
}

const ALSO_DOWNLOAD_KEY = 'ycx_line_send_also_download';
const readAlsoDownload = () => { try { return localStorage.getItem(ALSO_DOWNLOAD_KEY) === '1'; } catch { return false; } };
const writeAlsoDownload = (v: boolean) => { try { localStorage.setItem(ALSO_DOWNLOAD_KEY, v ? '1' : '0'); } catch { /* Private Mode */ } };

/** Lượt gửi đang chạy ở bất kỳ đâu — mọi nút gửi cùng khoá để tránh gửi trùng. */
function useLineBusy(): boolean {
    const [busy, setBusy] = useState(isLineSendBusy());
    useEffect(() => subscribeLineSend(() => setBusy(isLineSendBusy())), []);
    return busy;
}

export function LineSendButton({ areaKey, title, run, choices, batchHint, disabled, className }: LineSendButtonProps) {
    const busy = useLineBusy();
    const [open, setOpen] = useState(false);
    const [groups, setGroups] = useState<LineGroup[] | null>(null);
    const [botName, setBotName] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const [choiceId, setChoiceId] = useState<string>(choices?.[0]?.id || '');
    const [alsoDownload, setAlsoDownload] = useState(readAlsoDownload);
    const [loi, setLoi] = useState('');
    const [tim, setTim] = useState('');

    // Mở hộp thoại: tải nhóm + nhóm đã chọn lần trước
    useEffect(() => {
        if (!open) return;
        let huy = false;
        setLoi(''); setTim(''); setGroups(null);
        const t = getLineTransport();
        if (!t) { setLoi('Đăng nhập để gửi ảnh vào nhóm LINE.'); setGroups([]); return; }
        (async () => {
            try {
                const [info, nho] = await Promise.all([t.loadGroups(), t.getRememberedGroups(areaKey).catch(() => [] as LineGroup[])]);
                if (huy) return;
                setBotName(info.botName);
                setGroups(info.groups);
                const coSan = new Set(info.groups.map((g) => g.groupId));
                setSelected(nho.map((g) => g.groupId).filter((id) => coSan.has(id)));
            } catch (e) {
                if (!huy) { setLoi(e instanceof Error ? e.message : String(e)); setGroups([]); }
            }
        })();
        return () => { huy = true; };
    }, [open, areaKey]);

    const loc = useMemo(() => {
        if (!groups) return [];
        const q = tim.trim().toLowerCase();
        return q ? groups.filter((g) => g.groupName.toLowerCase().includes(q)) : groups;
    }, [groups, tim]);

    const choice = choices?.find((c) => c.id === choiceId) || choices?.[0];
    const runFn = choice?.run || run;
    const daChon = (groups || []).filter((g) => selected.includes(g.groupId));

    const gui = async () => {
        if (!runFn || daChon.length === 0) return;
        const t = getLineTransport();
        if (!t) return;
        writeAlsoDownload(alsoDownload);
        void t.rememberGroups(areaKey, daChon).catch(() => { /* nhớ nhóm lỗi không chặn việc gửi */ });
        setOpen(false);
        // Đợi hộp thoại đóng hẳn rồi mới chụp — không để lớp phủ lọt vào ảnh
        await new Promise((r) => setTimeout(r, 120));
        try {
            await runWithLineDelivery({ title: choice ? `${title} · ${choice.label}` : title, groups: daChon, alsoDownload }, runFn);
        } catch (e) {
            // Lỗi trước khi chạy (đang có lượt khác…) — mở lại hộp thoại để người dùng đọc
            setLoi(e instanceof Error ? e.message : String(e));
            setOpen(true);
        }
    };

    const tieuDeNut = busy ? 'Đang gửi nhóm LINE…' : `Gửi nhóm LINE — ${title}`;

    return (
        <>
            <Button
                variant="unstyled"
                size="none"
                onClick={() => setOpen(true)}
                disabled={disabled || busy}
                title={tieuDeNut}
                aria-label={tieuDeNut}
                data-testid={`line-send-${areaKey}`}
                className={cn(
                    // hide-on-export / no-print / export-button-component: các bộ lọc ẩn nút khi chụp ở mọi khu vực
                    'line-send-button hide-on-export no-print export-button-component relative inline-flex h-8 w-8 min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 shrink-0 items-center justify-center rounded text-[#06C755] transition-colors hover:bg-emerald-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
            >
                {busy ? <span className="h-4 w-4 rounded-full border-2 border-emerald-100 border-t-[#06C755] animate-spin" aria-hidden /> : <LineIcon className="h-4 w-4" />}
            </Button>
            <Modal
                isOpen={open}
                onClose={() => setOpen(false)}
                title="Gửi nhóm LINE"
                subTitle={title}
                maxWidth="sm"
                position="bottom"
                footer={
                    <div className="flex w-full items-center justify-end gap-2">
                        <Button variant="secondary" size="sm" className="min-h-10 sm:min-h-0" onClick={() => setOpen(false)}>Huỷ</Button>
                        <Button
                            variant="primary" size="sm" data-testid="line-send-confirm"
                            className="min-h-10 sm:min-h-0 bg-emerald-600 hover:bg-emerald-700"
                            disabled={!runFn || daChon.length === 0 || busy}
                            onClick={gui}
                        >
                            <LineIcon className="h-3.5 w-3.5" />
                            {daChon.length > 1 ? `Gửi ${daChon.length} nhóm` : 'Gửi nhóm LINE'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-3 text-[13px] text-slate-700" data-testid="line-send-dialog">
                    {choices && choices.length > 1 && (
                        <fieldset className="space-y-1">
                            <legend className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Ảnh cần gửi</legend>
                            {choices.map((c) => (
                                <label key={c.id} className={cn('flex cursor-pointer items-start gap-2 rounded border px-2.5 py-2', c.id === choice?.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50')}>
                                    <input type="radio" name={`line-choice-${areaKey}`} className="mt-0.5 accent-emerald-600" checked={c.id === choice?.id} onChange={() => setChoiceId(c.id)} />
                                    <span className="min-w-0">
                                        <span className="block font-semibold">{c.label}</span>
                                        {c.sublabel && <span className="block text-[11px] text-slate-500">{c.sublabel}</span>}
                                    </span>
                                </label>
                            ))}
                        </fieldset>
                    )}

                    <div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Nhóm nhận ảnh{botName ? ` · bot ${botName}` : ''}
                            </span>
                            {groups && groups.length > 1 && (
                                <span className="flex items-center gap-2 text-[12px]">
                                    <Button variant="unstyled" size="none" className="text-sky-600 hover:underline" onClick={() => setSelected(groups.map((g) => g.groupId))}>Chọn tất cả</Button>
                                    <Button variant="unstyled" size="none" className="text-slate-500 hover:underline" onClick={() => setSelected([])}>Bỏ chọn</Button>
                                </span>
                            )}
                        </div>
                        {groups && groups.length > 6 && (
                            <input
                                type="search" value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm tên nhóm…"
                                className="mb-1.5 w-full rounded border border-slate-200 px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        )}
                        {groups === null && <p className="py-4 text-center text-[12px] text-slate-400">Đang tải danh sách nhóm LINE…</p>}
                        {loi && <p className="border-l-[3px] border-amber-500 bg-amber-50 px-3 py-2 text-[12px] text-amber-800" data-testid="line-send-error">{loi}</p>}
                        {groups && groups.length === 0 && !loi && (
                            <p className="border-l-[3px] border-amber-500 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                                Bot chưa ở nhóm nào. Thêm bot vào nhóm LINE rồi nhắn 1 tin bất kỳ trong nhóm để bot ghi nhận nhóm.
                            </p>
                        )}
                        {groups && groups.length > 0 && (
                            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                                {loc.map((g) => {
                                    const on = selected.includes(g.groupId);
                                    return (
                                        <label key={g.groupId} className={cn('flex min-h-10 cursor-pointer items-center gap-2.5 rounded border px-2.5 py-1.5 sm:min-h-0', on ? 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-900' : 'border-slate-200 hover:bg-slate-50')}>
                                            <input
                                                type="checkbox" className="h-4 w-4 accent-emerald-600" checked={on}
                                                onChange={() => setSelected((prev) => (on ? prev.filter((id) => id !== g.groupId) : [...prev, g.groupId]))}
                                            />
                                            <LineIcon className={cn('h-4 w-4 shrink-0', on ? 'text-[#06C755]' : 'text-slate-400')} />
                                            <span className="truncate">{g.groupName}</span>
                                        </label>
                                    );
                                })}
                                {loc.length === 0 && <p className="py-3 text-center text-[12px] text-slate-400">Không tìm thấy nhóm phù hợp</p>}
                            </div>
                        )}
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-600">
                        <input type="checkbox" className="h-4 w-4 accent-sky-600" checked={alsoDownload} onChange={(e) => setAlsoDownload(e.target.checked)} />
                        Đồng thời tải ảnh về máy
                    </label>
                    <p className="text-[11px] text-slate-500">
                        Mỗi ảnh gửi thành 1 tin riêng (kèm 1 dòng chú thích){batchHint ? ` · ${batchHint}` : ''}. Tin gửi nhóm tính vào hạn mức tin nhắn của bot.
                    </p>
                </div>
            </Modal>
        </>
    );
}

export default LineSendButton;
