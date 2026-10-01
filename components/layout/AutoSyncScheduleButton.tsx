import React, { useEffect, useState } from 'react';
import { Button } from '../shared/ui/Button';
import { Modal } from '../shared/ui/Modal';
import { Input } from '../shared/ui/Input';
import { Icon } from '../common/Icon';
import {
    SCHEDULE_LABELS, SCHEDULE_WINDOW_MIN, getSchedule, loadSchedules, nextScheduleTime, normalizeTime,
    onSchedulesChanged, setSchedule, type ScheduleEntry, type ScheduleKey,
} from '../../services/autoSyncSchedule';

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

    const keTiep = nextScheduleTime(entry);
    const luu = (e: ScheduleEntry) => { void setSchedule(scheduleKey, e); };
    const them = () => {
        const t = normalizeTime(nhap);
        if (!t) return;
        luu({ enabled: true, times: [...entry.times, t] });
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
                <Icon name="clock" size={3} />
                {keTiep && !compact && <span>{keTiep}</span>}
            </Button>
            <Modal isOpen={open} onClose={() => setOpen(false)} title="Hẹn giờ tự chạy" subTitle={ten} maxWidth="sm">
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
                                <Button variant="ghost" size="sm" aria-label={`Xoá ${t}`} onClick={() => luu({ ...entry, times: entry.times.filter((x) => x !== t) })}>
                                    <Icon name="x" size={3.5} />
                                </Button>
                            </li>
                        ))}
                    </ul>
                    <div className="flex items-center gap-2">
                        <Input type="time" value={nhap} onChange={(e) => setNhap(e.target.value)} aria-label="Giờ chạy" className="w-32" data-testid={`sched-input-${scheduleKey}`} />
                        <Button variant="primary" size="sm" onClick={them} disabled={!normalizeTime(nhap)}>
                            <Icon name="plus" size={3.5} /> Thêm giờ
                        </Button>
                    </div>
                    <p className="text-[12px] text-slate-500">
                        Chạy trong trình duyệt: máy phải bật, Chrome đang mở tab dashboard.pro.vn, đã đăng nhập MWG và có
                        Tampermonkey. Lỡ giờ quá {SCHEDULE_WINDOW_MIN} phút (máy tắt / ngủ) thì bỏ qua khung đó. Nên đặt các nút
                        lệch nhau ít nhất 5 phút.
                    </p>
                </div>
            </Modal>
        </>
    );
}

export default AutoSyncScheduleButton;
