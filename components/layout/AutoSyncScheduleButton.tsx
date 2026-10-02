import React, { useEffect, useState } from 'react';
import { Button } from '../shared/ui/Button';
import { Modal } from '../shared/ui/Modal';
import { Input } from '../shared/ui/Input';
import { Select } from '../shared/ui/Select';
import { Icon } from '../common/Icon';
import { useAuth } from '../../contexts/AuthContext';
import {
    SCHEDULE_LABELS, SCHEDULE_WINDOW_MIN, autoAreasFor, getSchedule, loadSchedules, nextScheduleTime, normalizeTime,
    onSchedulesChanged, setSchedule, type ScheduleEntry, type ScheduleKey,
} from '../../services/autoSyncSchedule';
import type { LineGroupRef } from '../../services/lineReportDelivery';

/**
 * Chọn khu vực tự xuất ảnh & gửi nhóm LINE sau khi lượt hẹn giờ đổ dữ liệu xong (2026-10-02). Mỗi khu vực một nhóm.
 * Không chọn khu vực nào → giữ cách cũ (nút xuất ảnh nào đặt đích "nhóm LINE" thì tự gửi — chỉ YCX Realtime).
 */
function AutoSendAreas({ scheduleKey, entry, luu }: { scheduleKey: ScheduleKey; entry: ScheduleEntry; luu: (e: ScheduleEntry) => void }) {
    const { user, departmentId } = useAuth();
    const areas = autoAreasFor(scheduleKey);
    const [groups, setGroups] = useState<LineGroupRef[] | null>(null);
    const [loi, setLoi] = useState('');

    useEffect(() => {
        if (areas.length === 0) return;
        let huy = false;
        (async () => {
            try {
                const { resolveLineBot, listLineGroups } = await import('../../services/lineReportDelivery');
                const bot = await resolveLineBot(user?.uid || '', departmentId);
                if (huy) return;
                if (!bot) { setLoi('Tài khoản chưa có Bot LINE — vào mục Bot LINE để kết nối bot.'); setGroups([]); return; }
                const g = await listLineGroups(bot.botId);
                if (!huy) { setGroups(g); if (g.length === 0) setLoi('Bot chưa ở nhóm LINE nào — thêm bot vào nhóm rồi nhắn 1 tin trong nhóm.'); }
            } catch (e) {
                if (!huy) { setLoi(e instanceof Error ? e.message : String(e)); setGroups([]); }
            }
        })();
        return () => { huy = true; };
    }, [areas.length, user?.uid, departmentId]);

    if (areas.length === 0) {
        return <p className="text-[12px] text-slate-500">Nút này chưa có khu vực nào tự xuất ảnh được.</p>;
    }
    const chon = entry.autoSend || [];
    const datNhom = (area: string, groupId: string) => {
        const g = groups?.find((x) => x.groupId === groupId);
        const con = chon.filter((x) => x.area !== area);
        luu({ ...entry, autoSend: g ? [...con, { area, groupId: g.groupId, groupName: g.groupName }] : con });
    };
    const options = [{ value: '', label: 'Không gửi' }, ...(groups || []).map((g) => ({ value: g.groupId, label: g.groupName }))];
    // Nhóm đã lưu nhưng bot không còn thấy (đổi bot / rời nhóm) vẫn hiện để không âm thầm mất
    chon.forEach((c) => { if (!options.some((o) => o.value === c.groupId)) options.push({ value: c.groupId, label: `${c.groupName} (không thấy)` }); });

    return (
        <div className="space-y-1.5" data-testid={`sched-autosend-${scheduleKey}`}>
            {groups === null && <p className="text-[12px] text-slate-500">Đang tải danh sách nhóm LINE…</p>}
            {loi && <p className="border-l-[3px] border-amber-500 bg-amber-50 px-3 py-1.5 text-[12px] text-amber-800">{loi}</p>}
            {areas.map((a) => {
                const cur = chon.find((x) => x.area === a.id);
                return (
                    <div key={a.id} className={`flex items-center gap-2 border-l-[3px] px-2 py-1 ${cur ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                        <span className={`min-w-0 flex-1 text-[12px] ${cur ? 'font-semibold text-emerald-800' : 'text-slate-700'}`}>{a.label}</span>
                        <div className="w-44 shrink-0">
                            <Select
                                aria-label={`Nhóm LINE cho ${a.label}`}
                                data-testid={`sched-area-${a.id}`}
                                value={cur?.groupId || ''}
                                disabled={!groups || groups.length === 0}
                                onChange={(e) => datNhom(a.id, e.target.value)}
                                options={options}
                                className="h-8 min-h-0 py-0 text-[12px]"
                            />
                        </div>
                    </div>
                );
            })}
        </div>
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

    const keTiep = nextScheduleTime(entry);
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
                <Icon name="clock" size={3} />
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
                    <div className="border-t border-slate-200 pt-3">
                        <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-slate-500">
                            <Icon name="line" size={3.5} className="text-[#06C755]" />
                            <span>Tự xuất ảnh & gửi LINE sau khi đổ dữ liệu</span>
                        </p>
                        <AutoSendAreas scheduleKey={scheduleKey} entry={entry} luu={luu} />
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
