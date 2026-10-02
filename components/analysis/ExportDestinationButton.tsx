import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '../shared/ui/Button';
import { Modal } from '../shared/ui/Modal';
import { Icon } from '../common/Icon';
import { useAuth } from '../../contexts/AuthContext';
import {
    getExportDestination, loadExportDestinations, onExportDestinationsChanged, setExportDestination,
    type ExportDestination, type LineGroupTarget,
} from '../../services/analysisExportDestinations';
import { listLineGroups, resolveLineBot, type LineGroupRef } from '../../services/lineReportDelivery';

/**
 * Nút nhỏ cạnh nút xuất ảnh: chọn ảnh của nút đó "Tải về máy" hay "Gửi vào 1 hoặc nhiều nhóm LINE" (2026-10-02).
 * Đặt "Gửi nhóm LINE" thì: bấm nút xuất ảnh → gửi tất cả nhóm đã chọn; và sau mỗi lượt Auto Sync YCX Realtime → tự xuất & gửi.
 */
export function ExportDestinationButton({ reportKey, className = '' }: { reportKey: string; className?: string }) {
    const { user, departmentId } = useAuth();
    const [dest, setDest] = useState<ExportDestination>(() => getExportDestination(reportKey));
    const [open, setOpen] = useState(false);
    const [groups, setGroups] = useState<LineGroupRef[] | null>(null);
    const [selectedGroups, setSelectedGroups] = useState<LineGroupTarget[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [botName, setBotName] = useState('');
    const [loi, setLoi] = useState('');
    const [dangLuu, setDangLuu] = useState(false);

    useEffect(() => {
        void loadExportDestinations().then(() => setDest(getExportDestination(reportKey)));
        return onExportDestinationsChanged(() => setDest(getExportDestination(reportKey)));
    }, [reportKey]);

    // Đồng bộ danh sách nhóm đang chọn mỗi khi mở modal
    useEffect(() => {
        if (open) {
            const current = getExportDestination(reportKey);
            setDest(current);
            if (current.kind === 'line') {
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
            if (selectedGroups.length > 0) {
                await setExportDestination(reportKey, { kind: 'line', groups: selectedGroups });
            } else {
                await setExportDestination(reportKey, { kind: 'download' });
            }
            setOpen(false);
        } finally {
            setDangLuu(false);
        }
    };

    const toggleGroup = (g: LineGroupRef) => {
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
        if (dest.kind !== 'line') return [];
        return dest.groups && dest.groups.length > 0
            ? dest.groups
            : (dest.groupId ? [{ groupId: dest.groupId, groupName: dest.groupName || 'Nhóm LINE' }] : []);
    }, [dest]);

    const laLine = activeGroups.length > 0;
    const groupCount = activeGroups.length;
    const tieuDe = laLine
        ? (groupCount === 1
            ? `Ảnh "${reportKey}": gửi nhóm LINE ${activeGroups[0].groupName} — bấm để đổi`
            : `Ảnh "${reportKey}": gửi ${groupCount} nhóm LINE (${activeGroups.map(g => g.groupName).join(', ')}) — bấm để đổi`)
        : `Ảnh "${reportKey}": tải về máy — bấm để đặt gửi nhóm LINE`;

    return (
        <>
            <Button
                variant="unstyled" size="none" onClick={() => setOpen(true)} title={tieuDe} aria-label={`Đích xuất ảnh ${reportKey}`}
                data-testid={`export-dest-${reportKey}`}
                className={`relative hide-on-export flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded transition-colors ${laLine ? 'text-[#06C755] hover:bg-emerald-50 dark:hover:bg-emerald-950/40' : 'text-slate-400 hover:text-[#06C755] hover:bg-slate-100 dark:hover:bg-slate-800'} ${className}`}
            >
                <Icon name="line" size={4} />
                {laLine && (
                    groupCount > 1 ? (
                        <span className="absolute -top-1 -right-1 bg-[#06C755] text-white text-[9px] font-black px-1 min-w-[15px] h-[15px] rounded-full flex items-center justify-center shadow-sm">
                            {groupCount}
                        </span>
                    ) : (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#06C755]" aria-hidden />
                    )
                )}
            </Button>
            <Modal isOpen={open} onClose={() => setOpen(false)} title="Đích xuất ảnh" subTitle={reportKey} maxWidth="md">
                <div className="space-y-3 text-[13px] text-slate-700 dark:text-slate-200" data-testid="export-dest-modal">
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
                                <Icon name="download" size={4} />
                            </div>
                            <div>
                                <div className="text-[13px] font-bold">Tải về máy</div>
                                <div className="text-[11px] opacity-75 font-normal">Lưu file ảnh trực tiếp vào thiết bị của bạn</div>
                            </div>
                        </div>
                        {selectedGroups.length === 0 && (
                            <Icon name="check" size={4.5} className="text-sky-600 dark:text-sky-400 font-black" />
                        )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Icon name="line" size={4} className="text-[#06C755]" />
                                <span className="text-[12px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Gửi vào nhóm LINE{botName ? ` (bot ${botName})` : ''}
                                </span>
                                <span className="text-[11px] text-slate-400 font-normal">
                                    (Chọn 1 hoặc nhiều nhóm)
                                </span>
                            </div>
                            {groups && groups.length > 0 && (
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
                                <Icon name="loader-2" size={4.5} className="animate-spin inline-block mr-1.5" />
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
                            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
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
                                                        {isSelected && <Icon name="check" size={3} className="stroke-[3]" />}
                                                    </div>
                                                    <Icon name="line" size={4} className={isSelected ? 'text-[#06C755]' : 'text-slate-400'} />
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
                            {selectedGroups.length > 0 ? (
                                <span className="text-[#06C755] font-bold inline-flex items-center gap-1">
                                    <Icon name="line" size={3.5} />
                                    <span>Đã chọn {selectedGroups.length} nhóm LINE</span>
                                </span>
                            ) : (
                                <span>Đang chọn: <b>Tải về máy</b></span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setOpen(false)}
                                disabled={dangLuu}
                            >
                                Hủy
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleSave}
                                disabled={dangLuu}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                                {dangLuu ? 'Đang lưu...' : `Lưu (${selectedGroups.length > 0 ? `${selectedGroups.length} nhóm` : 'Tải về'})`}
                            </Button>
                        </div>
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                        Đặt nhóm LINE thì bấm nút xuất ảnh sẽ gửi vào tất cả các nhóm đã chọn thay vì tải về, và sau mỗi lượt
                        <b> Auto Sync YCX Realtime</b> ảnh này được tự xuất & gửi.
                    </p>
                </div>
            </Modal>
        </>
    );
}

export default ExportDestinationButton;
