import React, { useEffect, useState, useMemo } from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import toast from 'react-hot-toast';
import { Button } from '../shared/ui/Button';
import { Modal } from '../shared/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import {
    getExportDestination, loadExportDestinations, onExportDestinationsChanged, setExportDestination,
    getReportCommand, sanitizeReportCommand, LINE_EXPORT_TEMPORARILY_DISABLED,
    type ExportDestination, type LineGroupTarget,
} from '../../services/analysisExportDestinations';
import { listLineGroups, resolveLineBot, syncReportCommandConfig, type LineGroupRef } from '../../services/lineReportDelivery';

/**
 * Nút nhỏ cạnh nút xuất ảnh: chọn ảnh của nút đó "Tải về máy" hay "Gửi vào 1 hoặc nhiều nhóm LINE" (2026-10-02),
 * đồng thời cấu hình CÚ PHÁP LỆNH LINE (ví dụ "bc") để thành viên gõ lệnh là Bot reply ảnh ngay (Miễn phí 100%).
 */
export function ExportDestinationButton({ reportKey, className = '' }: { reportKey: string; className?: string }) {
    const { user, departmentId } = useAuth();
    const [dest, setDest] = useState<ExportDestination>(() => getExportDestination(reportKey));
    const [open, setOpen] = useState(false);
    const [groups, setGroups] = useState<LineGroupRef[] | null>(null);
    const [selectedGroups, setSelectedGroups] = useState<LineGroupTarget[]>([]);
    const [commandInput, setCommandInput] = useState<string>(() => dest.command ?? getReportCommand(reportKey));
    const [searchQuery, setSearchQuery] = useState('');
    const [botName, setBotName] = useState('');
    const [loi, setLoi] = useState('');
    const [dangLuu, setDangLuu] = useState(false);
    const [dangSyncAnh, setDangSyncAnh] = useState(false);

    useEffect(() => {
        void loadExportDestinations().then(() => {
            const d = getExportDestination(reportKey);
            setDest(d);
            setCommandInput(d.command ?? getReportCommand(reportKey));
        });
        return onExportDestinationsChanged(() => {
            const d = getExportDestination(reportKey);
            setDest(d);
            setCommandInput(d.command ?? getReportCommand(reportKey));
        });
    }, [reportKey]);

    // Đồng bộ danh sách nhóm đang chọn và cú pháp lệnh mỗi khi mở modal
    useEffect(() => {
        if (open) {
            const current = getExportDestination(reportKey);
            setDest(current);
            setCommandInput(current.command ?? getReportCommand(reportKey));
            if (current.kind === 'line' && !LINE_EXPORT_TEMPORARILY_DISABLED) {
                const list = current.groups && current.groups.length > 0
                    ? current.groups
                    : (current.groupId ? [{ groupId: current.groupId, groupName: current.groupName || 'Nhóm LINE' }] : []);
                setSelectedGroups(list);
            } else {
                setSelectedGroups([]);
            }
            setSearchQuery('');
        }
    }, [open, reportKey]);

    useEffect(() => {
        if (!open || groups) return;
        let huy = false;
        (async () => {
            try {
                const bot = await resolveLineBot(user?.uid || '', departmentId);
                if (huy) return;
                if (!bot) {
                    setLoi('Tài khoản chưa có Bot LINE — vào mục Bot LINE để kết nối bot, rồi thêm bot vào nhóm cần nhận ảnh.');
                    setGroups([]);
                    return;
                }
                setBotName(bot.botName);
                const g = await listLineGroups(bot.botId);
                if (!huy) setGroups(g);
            } catch (e) {
                if (!huy) { setLoi(e instanceof Error ? e.message : String(e)); setGroups([]); }
            }
        })();
        return () => { huy = true; };
    }, [open, groups, user?.uid, departmentId]);

    const handleSave = async () => {
        setDangLuu(true);
        try {
            const cleanCmd = sanitizeReportCommand(commandInput);
            if (selectedGroups.length > 0) {
                await setExportDestination(reportKey, { kind: 'line', groups: selectedGroups, command: cleanCmd });
            } else {
                await setExportDestination(reportKey, { kind: 'download', command: cleanCmd });
            }
            if (cleanCmd) {
                const bot = await resolveLineBot(user?.uid || '', departmentId).catch(() => null);
                if (bot) {
                    void syncReportCommandConfig({
                        botId: bot.botId,
                        reportKey,
                        command: cleanCmd,
                        groupIds: selectedGroups.map(g => g.groupId),
                    });
                }
            }
            toast.success('Đã lưu cấu hình đích xuất & cú pháp lệnh LINE!');
            setOpen(false);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Lỗi khi lưu cài đặt');
        } finally {
            setDangLuu(false);
        }
    };

    const handleSyncCurrentImage = async () => {
        setDangSyncAnh(true);
        const cleanCmd = sanitizeReportCommand(commandInput || getReportCommand(reportKey));
        const tId = toast.loading(`Đang xuất & nạp ảnh mới nhất cho lệnh "${cleanCmd || 'bc'}"…`);
        try {
            const bot = await resolveLineBot(user?.uid || '', departmentId);
            if (!bot) {
                toast.error('Chưa kết nối Bot LINE — hãy cấu hình bot ở mục Bot LINE trước', { id: tId });
                return;
            }
            // 1. Lưu cấu hình đích & lệnh trước
            await setExportDestination(reportKey, {
                kind: selectedGroups.length > 0 ? 'line' : 'download',
                groups: selectedGroups,
                command: cleanCmd
            });
            await syncReportCommandConfig({
                botId: bot.botId,
                reportKey,
                command: cleanCmd,
                groupIds: selectedGroups.map(g => g.groupId),
            });

            // 2. Chạy runner xuất ảnh nếu khu vực đã đăng ký auto runner
            const G = globalThis as unknown as { __ycxExportDest?: { runners: Map<string, () => Promise<unknown>> } };
            const runner = G.__ycxExportDest?.runners?.get(reportKey);
            if (runner) {
                await runner();
                toast.success(`Đã nạp ảnh mới nhất thành công cho lệnh "${cleanCmd}"! Thành viên chỉ cần gõ "${cleanCmd}" trong nhóm LINE là nhận được ảnh ngay.`, { id: tId, duration: 6000 });
            } else {
                toast.success(`Đã lưu lệnh "${cleanCmd}". Bạn hãy bấm nút "Xuất ảnh" cạnh đây để nạp ảnh đầu tiên lên Bot nhé!`, { id: tId, duration: 6000 });
            }
        } catch (e) {
            toast.error(`Lỗi nạp ảnh: ${e instanceof Error ? e.message : String(e)}`, { id: tId });
        } finally {
            setDangSyncAnh(false);
        }
    };

    const toggleGroup = (g: LineGroupRef) => {
        if (LINE_EXPORT_TEMPORARILY_DISABLED) {
            toast('Chức năng gửi LINE đang tạm tắt theo yêu cầu. Báo cáo sẽ luôn tải về máy.', { icon: 'ℹ️' });
            return;
        }
        setSelectedGroups(prev => {
            const exists = prev.some(item => item.groupId === g.groupId);
            if (exists) {
                return prev.filter(item => item.groupId !== g.groupId);
            } else {
                return [...prev, { groupId: g.groupId, groupName: g.groupName }];
            }
        });
    };

    const handleSelectAll = (all: LineGroupRef[]) => {
        if (LINE_EXPORT_TEMPORARILY_DISABLED) {
            toast('Chức năng gửi LINE đang tạm tắt theo yêu cầu. Báo cáo sẽ luôn tải về máy.', { icon: 'ℹ️' });
            return;
        }
        setSelectedGroups(all.map(g => ({ groupId: g.groupId, groupName: g.groupName })));
    };

    const handleDeselectAll = () => {
        setSelectedGroups([]);
    };

    const filteredGroups = useMemo(() => {
        if (!groups) return [];
        if (!searchQuery.trim()) return groups;
        const q = searchQuery.toLowerCase().trim();
        return groups.filter(g => g.groupName.toLowerCase().includes(q));
    }, [groups, searchQuery]);

    const activeGroups: LineGroupTarget[] = useMemo(() => {
        if (LINE_EXPORT_TEMPORARILY_DISABLED || dest.kind !== 'line') return [];
        return dest.groups && dest.groups.length > 0
            ? dest.groups
            : (dest.groupId ? [{ groupId: dest.groupId, groupName: dest.groupName || 'Nhóm LINE' }] : []);
    }, [dest]);

    const laLine = !LINE_EXPORT_TEMPORARILY_DISABLED && activeGroups.length > 0;
    const groupCount = activeGroups.length;
    const currentCmd = dest.command || getReportCommand(reportKey);
    const cmdNotice = currentCmd ? ` • Lệnh LINE: "${currentCmd}"` : '';
    const tieuDe = laLine
        ? (groupCount === 1
            ? `Ảnh "${reportKey}": gửi nhóm LINE ${activeGroups[0].groupName}${cmdNotice} — bấm để đổi`
            : `Ảnh "${reportKey}": gửi ${groupCount} nhóm LINE (${activeGroups.map(g => g.groupName).join(', ')})${cmdNotice} — bấm để đổi`)
        : `Ảnh "${reportKey}": tải về máy${LINE_EXPORT_TEMPORARILY_DISABLED ? ' (gửi LINE tạm tắt)' : ''}${cmdNotice} — bấm để cấu hình`;

    return (
        <>
            <Button
                variant="unstyled" size="none" onClick={() => setOpen(true)} title={tieuDe} aria-label={`Đích xuất ảnh ${reportKey}`}
                data-testid={`export-dest-${reportKey}`}
                className={`relative hide-on-export flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded transition-colors ${laLine ? 'text-[#06C755] hover:bg-emerald-50 dark:hover:bg-emerald-950/40' : 'text-slate-400 hover:text-[#06C755] hover:bg-slate-100 dark:hover:bg-slate-800'} ${className}`}
            >
                <AppIcon name="lineBrand" size="md" />
                {laLine ? (
                    groupCount > 1 ? (
                        <span className="absolute -top-1 -right-1 bg-[#06C755] text-white text-[9px] font-black px-1 min-w-[15px] h-[15px] rounded-full flex items-center justify-center shadow-sm">
                            {groupCount}
                        </span>
                    ) : (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#06C755]" aria-hidden />
                    )
                ) : (
                    currentCmd ? (
                        <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[8px] font-black px-0.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center shadow-sm" title={`Lệnh: ${currentCmd}`}>
                            /
                        </span>
                    ) : null
                )}
            </Button>
            <Modal isOpen={open} onClose={() => setOpen(false)} title="Đích xuất ảnh & Cú pháp lệnh LINE" subTitle={reportKey} maxWidth="md">
                <div className="space-y-3 text-[13px] text-slate-700 dark:text-slate-200" data-testid="export-dest-modal">
                    {/* Cấu hình CÚ PHÁP LỆNH LINE (Reply tức thì) */}
                    <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1.5">
                            <label htmlFor="report-command-input" className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                                <AppIcon name="message" size="md" className="text-[#06C755]" />
                                <span>Cú pháp gõ lệnh nhận ảnh trên LINE</span>
                            </label>
                            {commandInput.trim() && (
                                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white shadow-sm">
                                    Lệnh: {sanitizeReportCommand(commandInput)}
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
                                    /
                                </span>
                                <input
                                    id="report-command-input"
                                    type="text"
                                    value={commandInput}
                                    onChange={(e) => setCommandInput(e.target.value.toLowerCase().replace(/^[./!#\s]+/, ''))}
                                    placeholder="Ví dụ: bc, cttk, dt, thidua..."
                                    className="w-full text-xs pl-6 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#06C755] font-mono font-bold text-slate-800 dark:text-slate-100"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleSyncCurrentImage}
                                disabled={dangSyncAnh || dangLuu}
                                className="shrink-0 text-xs flex items-center gap-1 border-emerald-300 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                title="Xuất và nạp ảnh mới nhất của khu vực này vào kho lệnh LINE ngay lập tức"
                            >
                                <AppIcon name={dangSyncAnh ? 'loading' : 'cloudUpload'} size="sm" className={dangSyncAnh ? "animate-spin text-emerald-600" : "text-emerald-600"} />
                                <span>{dangSyncAnh ? 'Đang nạp...' : 'Nạp ảnh ngay'}</span>
                            </Button>
                        </div>

                        <div className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-900/60 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                            <div className="flex items-start gap-1.5">
                                <span className="text-[#06C755] font-black shrink-0">✓</span>
                                <span>
                                    Chỉ cần gõ <b>"{sanitizeReportCommand(commandInput) || 'bc'}"</b> (hoặc <b>.{sanitizeReportCommand(commandInput) || 'bc'}</b>, <b>/{sanitizeReportCommand(commandInput) || 'bc'}</b>) trong nhóm LINE là Bot tự động reply ảnh báo cáo mới nhất ngay!
                                </span>
                            </div>
                            <div className="flex items-start gap-1.5">
                                <span className="text-[#06C755] font-black shrink-0">✓</span>
                                <span>
                                    Phản hồi qua tin nhắn Reply: <b>Hoàn toàn MIỄN PHÍ và KHÔNG GIỚI HẠN</b> lượt gửi theo chính sách LINE Developers (không tính vào 200 tin Push/tháng).
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tùy chọn Tải về máy */}
                    <div 
                        onClick={() => setSelectedGroups([])}
                        className={`w-full cursor-pointer flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                            selectedGroups.length === 0
                                ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 font-bold shadow-sm ring-1 ring-sky-400'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center ${selectedGroups.length === 0 ? 'bg-sky-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                <AppIcon name="download" size="md" />
                            </div>
                            <div>
                                <div className="text-[13px] font-bold">Tải về máy</div>
                                <div className="text-[11px] opacity-75 font-normal">Lưu file ảnh trực tiếp vào thiết bị của bạn khi bấm nút xuất ảnh</div>
                            </div>
                        </div>
                        {selectedGroups.length === 0 && (
                            <AppIcon name="check" size="md" className="text-sky-600 font-black" />
                        )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                        {LINE_EXPORT_TEMPORARILY_DISABLED && (
                            <div className="mb-2.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                                <AppIcon name="alert" size="md" className="text-amber-600" />
                                <span><b>Chức năng gửi LINE đang tạm tắt</b>: Tất cả báo cáo khi bấm xuất ảnh sẽ luôn được tải trực tiếp về máy.</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <AppIcon name="lineBrand" size="md" className={LINE_EXPORT_TEMPORARILY_DISABLED ? "text-slate-400" : "text-[#06C755]"} />
                                <span className="text-[12px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Tự động gửi vào nhóm LINE{botName ? ` (bot ${botName})` : ''}
                                </span>
                                {LINE_EXPORT_TEMPORARILY_DISABLED ? (
                                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                                        Đang tạm tắt
                                    </span>
                                ) : (
                                    <span className="text-[11px] text-slate-400 font-normal">
                                        (Chọn 1 hoặc nhiều nhóm)
                                    </span>
                                )}
                            </div>
                            {!LINE_EXPORT_TEMPORARILY_DISABLED && groups && groups.length > 0 && (
                                <div className="flex items-center gap-2 text-[11px]">
                                    <button 
                                        type="button"
                                        onClick={() => handleSelectAll(groups)} 
                                        className="text-sky-600 dark:text-sky-400 hover:underline font-semibold"
                                    >
                                        Chọn tất cả
                                    </button>
                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                    <button 
                                        type="button"
                                        onClick={handleDeselectAll} 
                                        className="text-slate-500 hover:underline"
                                    >
                                        Bỏ chọn
                                    </button>
                                </div>
                            )}
                        </div>

                        {groups && groups.length > 5 && (
                            <div className="mb-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm tên nhóm LINE..."
                                    className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                        )}

                        {groups === null && (
                            <div className="py-6 text-center text-slate-400 text-xs">
                                <AppIcon name="loading" size="md" spin className="inline-block mr-1.5" />
                                Đang tải danh sách nhóm LINE...
                            </div>
                        )}

                        {loi && <p className="border-l-[3px] border-amber-500 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-amber-800 dark:text-amber-300 text-xs my-2">{loi}</p>}

                        {groups && groups.length === 0 && !loi && (
                            <p className="border-l-[3px] border-amber-500 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-amber-800 dark:text-amber-300 text-xs my-2">
                                Bot chưa ở nhóm nào. Thêm bot vào nhóm LINE rồi nhắn 1 tin bất kỳ trong nhóm để bot ghi nhận nhóm.
                            </p>
                        )}

                        {groups && (
                            <div className={`max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar ${LINE_EXPORT_TEMPORARILY_DISABLED ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                                {filteredGroups.length === 0 ? (
                                    <div className="text-center py-4 text-xs text-slate-400">Không tìm thấy nhóm phù hợp</div>
                                ) : (
                                    filteredGroups.map((g) => {
                                        const isSelected = selectedGroups.some(item => item.groupId === g.groupId);
                                        return (
                                            <div
                                                key={g.groupId}
                                                onClick={() => toggleGroup(g)}
                                                className={`w-full cursor-pointer text-left flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                                                    isSelected
                                                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-400'
                                                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                                                        isSelected
                                                            ? 'bg-emerald-600 border-emerald-600 text-white'
                                                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                                    }`}>
                                                        {isSelected && <AppIcon name="check" size="xs" className="stroke-[3]" />}
                                                    </div>
                                                    <AppIcon name="lineBrand" size="md" className={isSelected ? 'text-[#06C755]' : 'text-slate-400'} />
                                                    <span className="truncate">{g.groupName}</span>
                                                </div>
                                                {isSelected && (
                                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">Đã chọn</span>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="text-[12px] text-slate-500 dark:text-slate-400">
                            {!LINE_EXPORT_TEMPORARILY_DISABLED && selectedGroups.length > 0 ? (
                                <span className="text-[#06C755] font-bold inline-flex items-center gap-1">
                                    <AppIcon name="lineBrand" size="sm" />
                                    <span>Đã chọn {selectedGroups.length} nhóm LINE</span>
                                </span>
                            ) : (
                                <span>Đang chọn: <b className="text-sky-600 dark:text-sky-400">Tải về máy</b></span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setOpen(false)}
                                disabled={dangLuu || dangSyncAnh}
                            >
                                Hủy
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleSave}
                                disabled={dangLuu || dangSyncAnh}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                                {dangLuu ? 'Đang lưu...' : 'Lưu cài đặt'}
                            </Button>
                        </div>
                    </div>

                    {LINE_EXPORT_TEMPORARILY_DISABLED ? (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                            Tính năng gửi LINE đang tạm tắt. Bấm nút xuất ảnh ở bất kỳ bảng/thẻ nào sẽ luôn tải file ảnh trực tiếp về máy.
                        </p>
                    ) : (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                            Đặt nhóm LINE thì bấm nút xuất ảnh sẽ gửi vào tất cả các nhóm đã chọn, và sau mỗi lượt
                            <b> Auto Sync YCX Luỹ kế</b> ảnh này được tự xuất & gửi.
                        </p>
                    )}
                </div>
            </Modal>
        </>
    );
}

export default ExportDestinationButton;
