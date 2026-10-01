import React, { useEffect, useState } from 'react';
import { Button } from '../shared/ui/Button';
import { Modal } from '../shared/ui/Modal';
import { Icon } from '../common/Icon';
import { useAuth } from '../../contexts/AuthContext';
import {
    getExportDestination, loadExportDestinations, onExportDestinationsChanged, setExportDestination,
    type ExportDestination,
} from '../../services/analysisExportDestinations';
import { listLineGroups, resolveLineBot, type LineGroupRef } from '../../services/lineReportDelivery';

/**
 * Nút nhỏ cạnh nút xuất ảnh: chọn ảnh của nút đó "Tải về máy" hay "Gửi vào nhóm LINE X" (2026-10-01).
 * Đặt "Gửi nhóm LINE" thì: bấm nút xuất ảnh → gửi LINE; và sau mỗi lượt Auto Sync YCX Realtime → tự xuất & gửi.
 */
export function ExportDestinationButton({ reportKey, className = '' }: { reportKey: string; className?: string }) {
    const { user, departmentId } = useAuth();
    const [dest, setDest] = useState<ExportDestination>(() => getExportDestination(reportKey));
    const [open, setOpen] = useState(false);
    const [groups, setGroups] = useState<LineGroupRef[] | null>(null);
    const [botName, setBotName] = useState('');
    const [loi, setLoi] = useState('');
    const [dangLuu, setDangLuu] = useState(false);

    useEffect(() => {
        void loadExportDestinations().then(() => setDest(getExportDestination(reportKey)));
        return onExportDestinationsChanged(() => setDest(getExportDestination(reportKey)));
    }, [reportKey]);

    useEffect(() => {
        if (!open || groups) return;
        let huy = false;
        (async () => {
            try {
                const bot = await resolveLineBot(user?.uid || '', departmentId);
                if (huy) return;
                if (!bot) { setLoi('Tài khoản chưa có Bot LINE — vào mục Bot LINE để kết nối bot, rồi thêm bot vào nhóm cần nhận ảnh.'); setGroups([]); return; }
                setBotName(bot.botName);
                const g = await listLineGroups(bot.botId);
                if (!huy) setGroups(g);
            } catch (e) {
                if (!huy) { setLoi(e instanceof Error ? e.message : String(e)); setGroups([]); }
            }
        })();
        return () => { huy = true; };
    }, [open, groups, user?.uid, departmentId]);

    const chon = async (d: ExportDestination) => {
        setDangLuu(true);
        try { await setExportDestination(reportKey, d); setOpen(false); } finally { setDangLuu(false); }
    };

    const laLine = dest.kind === 'line';
    const tieuDe = laLine ? `Ảnh "${reportKey}": gửi nhóm LINE ${dest.groupName} — bấm để đổi` : `Ảnh "${reportKey}": tải về máy — bấm để đặt gửi nhóm LINE`;

    return (
        <>
            <Button
                variant="unstyled" size="none" onClick={() => setOpen(true)} title={tieuDe} aria-label={`Đích xuất ảnh ${reportKey}`}
                data-testid={`export-dest-${reportKey}`}
                className={`relative hide-on-export flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded transition-colors ${laLine ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'} ${className}`}
            >
                <Icon name="message-circle" size={4} />
                {laLine && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500" aria-hidden />}
            </Button>
            <Modal isOpen={open} onClose={() => setOpen(false)} title="Đích xuất ảnh" subTitle={reportKey} maxWidth="sm">
                <div className="space-y-2 text-[13px] text-slate-700" data-testid="export-dest-modal">
                    <Button
                        variant="unstyled" size="none" disabled={dangLuu} onClick={() => chon({ kind: 'download' })}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded border ${!laLine ? 'border-sky-500 bg-sky-50 text-sky-800 font-semibold' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                        <Icon name="download" size={4} /> Tải về máy
                    </Button>
                    <p className="pt-1 text-[12px] font-semibold uppercase tracking-wider text-slate-500">
                        Gửi vào nhóm LINE{botName ? ` (bot ${botName})` : ''}
                    </p>
                    {groups === null && <p className="text-slate-500">Đang tải danh sách nhóm…</p>}
                    {loi && <p className="border-l-[3px] border-amber-500 bg-amber-50 px-3 py-2 text-amber-800">{loi}</p>}
                    {groups && groups.length === 0 && !loi && (
                        <p className="border-l-[3px] border-amber-500 bg-amber-50 px-3 py-2 text-amber-800">
                            Bot chưa ở nhóm nào. Thêm bot vào nhóm LINE rồi nhắn 1 tin bất kỳ trong nhóm để bot ghi nhận nhóm.
                        </p>
                    )}
                    {groups?.map((g) => {
                        const dangChon = laLine && dest.groupId === g.groupId;
                        return (
                            <Button
                                key={g.groupId} variant="unstyled" size="none" disabled={dangLuu}
                                onClick={() => chon({ kind: 'line', groupId: g.groupId, groupName: g.groupName })}
                                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded border ${dangChon ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold' : 'border-slate-200 hover:bg-slate-50'}`}
                            >
                                <Icon name="message-circle" size={4} /> {g.groupName}
                            </Button>
                        );
                    })}
                    <p className="pt-1 text-[12px] text-slate-500">
                        Đặt "Gửi nhóm LINE" thì bấm nút xuất ảnh sẽ gửi vào nhóm thay vì tải về, và sau mỗi lượt
                        <b> Auto Sync YCX Realtime</b> ảnh này được tự xuất & gửi.
                    </p>
                </div>
            </Modal>
        </>
    );
}

export default ExportDestinationButton;
