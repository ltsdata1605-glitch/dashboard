import React, { useEffect, useState } from 'react';
import { Button } from '../shared/ui/Button';
import { Modal } from '../shared/ui/Modal';
import { Input } from '../shared/ui/Input';
import { AppIcon } from '../shared/ui/icon';
import {
    SCHEDULE_LABELS, SCHEDULE_WINDOW_MIN, getSchedule, loadSchedules, nextScheduleLabel, normalizeTime,
    onScheduleLog, onSchedulesChanged, readScheduleLog, setSchedule, type ScheduleEntry, type ScheduleKey, type ScheduleLogEntry,
} from '../../services/autoSyncSchedule';

const NHAN_LOG: Record<ScheduleLogEntry['status'], { chu: string; vien: string }> = {
    started: { chu: 'Đã bắt đầu', vien: 'border-sky-500' },
    done: { chu: 'Xong', vien: 'border-emerald-500' },
    missed: { chu: 'Bỏ lỡ', vien: 'border-amber-500' },
    error: { chu: 'Lỗi', vien: 'border-rose-500' },
};

/** Nhật ký các lượt hẹn giờ gần nhất của nút (đã chạy / bỏ lỡ / lỗi) — để biết vì sao một khung giờ không chạy */
function ScheduleLog({ scheduleKey }: { scheduleKey: ScheduleKey }) {
    const [log, setLog] = useState<ScheduleLogEntry[]>(() => readScheduleLog());
    useEffect(() => onScheduleLog(() => setLog(readScheduleLog())), []);
    const cua = log.filter((x) => x.key === scheduleKey).slice(-6).reverse();
    if (cua.length === 0) return <p className="text-[12px] text-slate-500">Chưa có lượt hẹn giờ nào.</p>;
    const p2 = (n: number) => String(n).padStart(2, '0');
    return (
        <ul className="space-y-1" data-testid={`sched-log-${scheduleKey}`}>
            {cua.map((x) => {
                const d = new Date(x.at);
                return (
                    <li key={`${x.at}-${x.status}`} className={`border-l-[3px] ${NHAN_LOG[x.status].vien} bg-slate-50 px-2 py-1 text-[12px] text-slate-700`}>
                        <span className="font-bold tabular-nums">{x.time}</span>
                        <span className="text-slate-500"> · {p2(d.getDate())}/{p2(d.getMonth() + 1)} {p2(d.getHours())}:{p2(d.getMinutes())}</span>
                        <span className="font-semibold"> — {NHAN_LOG[x.status].chu}</span>
                        {x.note && <span className="text-slate-500">: {x.note}</span>}
                    </li>
                );
            })}
        </ul>
    );
}

/**
 * Nút đồng hồ nằm ngay trên nút Auto Sync (góc phải) — đặt các khung giờ tự chạy cho riêng nút đó (2026-10-01).
 * Bấm mở hộp: thêm/xoá giờ, bật/tắt. Có hẹn giờ thì nút hiện giờ chạy kế tiếp.
 */
export function AutoSyncScheduleButton({ scheduleKey, tone = 'light', compact = false }: { scheduleKey: ScheduleKey; tone?: 'light' | 'dark'; compact?: boolean }) {
    const [entry, setEntry] = useState<ScheduleEntry>(() => getSchedule(scheduleKey));
    const [open, setOpen] = useState(false);
    const [nhap, setNhap] = useState('');
    const [, tick] = useState(0);

    useEffect(() => {
        void loadSchedules().then(() => setEntry(getSchedule(scheduleKey)));
        return onSchedulesChanged(() => setEntry(getSchedule(scheduleKey)));
    }, [scheduleKey]);
    // Cập nhật "giờ kế tiếp" mỗi phút
    useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 60_000); return () => clearInterval(t); }, []);

    const keTiep = nextScheduleLabel(entry);
    const luu = (e: ScheduleEntry) => { void setSchedule(scheduleKey, e); };
    const them = () => {
        const t = normalizeTime(nhap);
        if (!t) return;
        luu({ ...entry, enabled: true, times: [...entry.times, t] });
        setNhap('');
    };

    const ten = SCHEDULE_LABELS[scheduleKey];
    const mau = tone === 'dark'
        ? (keTiep ? 'bg-white/90 text-slate-800' : 'bg-black/20 text-white/90 hover:bg-black/30')
        : (keTiep ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-400 hover:bg-slate-100');

    return (
        <>
            <Button
                variant="unstyled" size="none"
                onClick={(e) => { e.stopPropagation(); setOpen(true); }}
                title={keTiep ? `Hẹn giờ ${ten}: ${entry.times.join(', ')} — bấm để sửa` : `Hẹn giờ tự chạy ${ten}`}
                aria-label={`Hẹn giờ ${ten}`}
                data-testid={`sched-${scheduleKey}`}
                className={`flex items-center justify-center gap-0.5 rounded ${compact ? 'h-5 min-w-5 px-0.5' : 'h-7 min-w-7 px-1'} text-[11px] font-bold tabular-nums leading-none transition-colors ${mau}`}
            >
                <AppIcon name="clock" size="xs" />
                {keTiep && !compact && <span>{keTiep}</span>}
            </Button>
            <Modal isOpen={open} onClose={() => setOpen(false)} title="Hẹn giờ tự chạy" subTitle={ten} maxWidth="md">
                <div className="space-y-3 text-[13px] text-slate-700" data-testid={`sched-modal-${scheduleKey}`}>
                    <div className="flex items-center justify-between">
                        <span className="font-semibold">Tự chạy theo khung giờ</span>
                        <Button
                            variant="unstyled" size="none"
                            className={`h-8 px-3 rounded text-[12px] font-bold border ${entry.enabled ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-600'} disabled:opacity-50`}
                            disabled={entry.times.length === 0}
                            onClick={() => luu({ ...entry, enabled: !entry.enabled })}
                            data-testid={`sched-toggle-${scheduleKey}`}
                        >
                            {entry.enabled ? 'Đang bật' : 'Đang tắt'}
                        </Button>
                    </div>
                    <ul className="space-y-1" data-testid={`sched-times-${scheduleKey}`}>
                        {entry.times.length === 0 && <li className="text-slate-500">Chưa có khung giờ nào.</li>}
                        {entry.times.map((t) => (
                            <li key={t} className="flex items-center justify-between border-l-[3px] border-sky-500 bg-slate-50 px-3 py-1">
                                <span className="font-bold tabular-nums">{t}</span>
                                <Button variant="ghost" size="icon" icon="close" aria-label={`Xoá ${t}`} onClick={() => luu({ ...entry, times: entry.times.filter((x) => x !== t) })} />
                            </li>
                        ))}
                    </ul>
                    <div className="flex items-center gap-2">
                        <Input type="time" value={nhap} onChange={(e) => setNhap(e.target.value)} aria-label="Giờ chạy" className="w-32" data-testid={`sched-input-${scheduleKey}`} />
                        <Button variant="primary" size="sm" icon="add" onClick={them} disabled={!normalizeTime(nhap)}>
                            Thêm giờ
                        </Button>
                    </div>

                    <div className="border-t border-slate-200 pt-3">
                        <p className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-slate-500">Lượt gần đây</p>
                        <ScheduleLog scheduleKey={scheduleKey} />
                    </div>
                    <p className="text-[12px] text-slate-500">
                        Chạy trong trình duyệt: máy phải bật, Chrome đang mở tab dashboard.pro.vn, đã đăng nhập MWG và có
                        Tampermonkey. Lỡ giờ quá {SCHEDULE_WINDOW_MIN} phút (máy ngủ / tab bị ngủ) thì bỏ qua khung đó và ghi
                        "Bỏ lỡ" ở trên. Để tab không bị ngủ: Chrome → Cài đặt → <b>Hiệu suất</b> → "Luôn giữ các trang web này
                        hoạt động" → thêm <b>dashboard.pro.vn</b>; Mac → tắt ngủ máy khi cắm sạc. Nên đặt các nút lệch nhau ít nhất 5 phút.
                    </p>
                </div>
            </Modal>
        </>
    );
}

export default AutoSyncScheduleButton;
