import React, { useState } from 'react';
import {
    Clock,
    Plus,
    Play,
    Edit2,
    Trash2,
    CheckCircle2,
    Calendar,
    Users,
    RefreshCw
} from 'lucide-react';
import { Button } from '../../../components/shared/ui/Button';
import { BotSchedule, LineGroup } from '../types/lineBot.types';
import { ScheduleEditModal } from './ScheduleEditModal';

interface ScheduleManagerTabProps {
    schedules: BotSchedule[];
    groups: LineGroup[];
    isLoading: boolean;
    isTriggering: string | null;
    onSaveSchedule: (sched: Partial<BotSchedule>) => Promise<string | null>;
    onDeleteSchedule: (id: string) => Promise<void>;
    onToggleActive: (schedule: BotSchedule) => Promise<void>;
    onTriggerNow: (schedule: BotSchedule) => Promise<void>;
    onRefresh: () => void;
    onAddManualGroup?: (groupId: string, groupName?: string) => Promise<boolean>;
}

const DAYS_NAME = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export const ScheduleManagerTab: React.FC<ScheduleManagerTabProps> = ({
    schedules,
    groups,
    isLoading,
    isTriggering,
    onSaveSchedule,
    onDeleteSchedule,
    onToggleActive,
    onTriggerNow,
    onRefresh,
    onAddManualGroup
}) => {
    const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
    const [selectedSchedule, setSelectedSchedule] = useState<Partial<BotSchedule> | null>(null);

    const handleCreateNew = () => {
        setSelectedSchedule(null);
        setEditModalOpen(true);
    };

    const handleEdit = (sched: BotSchedule) => {
        setSelectedSchedule(sched);
        setEditModalOpen(true);
    };

    return (
        <div className="space-y-4">
            {/* Top Bar */}
            <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">Danh Sách Lịch Hẹn Thông Báo</h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            <Users size={12} /> {groups.length} nhóm
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">Tự động phát thông báo tới các nhóm chat theo giờ định sẵn.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={onRefresh} className="p-1.5 text-slate-500 rounded-xl" title="Làm mới danh sách và nhóm">
                        <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleCreateNew}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
                    >
                        <Plus size={15} />
                        <span>Thêm Lịch Mới</span>
                    </Button>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schedules.length === 0 ? (
                    <div className="col-span-full p-12 text-center bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                        <Clock size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Chưa có lịch hẹn thông báo nào</p>
                        <p className="text-xs text-slate-400 mt-1">Bấm "Thêm Lịch Mới" để tạo lịch gửi thông báo tự động.</p>
                    </div>
                ) : (
                    schedules.map(sched => {
                        const isThisTriggering = isTriggering === sched.id;
                        
                        const getRepeatLabel = () => {
                            if (sched.repeatType === 'ONCE') {
                                return `Một lần duy nhất (${sched.specificDate || 'Hôm nay'})`;
                            }
                            if (sched.repeatType === 'DAILY' || (!sched.repeatType && sched.daysOfWeek?.length === 7)) {
                                return 'Hàng ngày (Mỗi ngày)';
                            }
                            if (sched.repeatType === 'WEEKDAYS' || (!sched.repeatType && sched.daysOfWeek?.length === 5 && [1, 2, 3, 4, 5].every(d => sched.daysOfWeek.includes(d)))) {
                                return 'Thứ 2 đến Thứ 6';
                            }
                            const dayString = (sched.daysOfWeek || []).sort().map(d => DAYS_NAME[d]).join(', ');
                            return dayString ? `Tùy chọn: ${dayString}` : 'Hàng ngày';
                        };

                        return (
                            <div
                                key={sched.id}
                                className={`p-4 rounded-2xl bg-white dark:bg-slate-800/80 border transition-all shadow-sm space-y-3 ${
                                    sched.active ? 'border-slate-200/80 dark:border-slate-700/80' : 'border-slate-200/40 opacity-60'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">{sched.name}</h4>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono">
                                                {sched.time}
                                            </span>
                                            {sched.repeatType === 'ONCE' && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                                                    1 Lần
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                            <Calendar size={12} />
                                            <span>{getRepeatLabel()}</span>
                                            <span className="mx-1">•</span>
                                            <Users size={12} />
                                            <span>{sched.targetType === 'ALL_GROUPS' ? 'Tất cả nhóm' : `${sched.targetGroupIds?.length || 0} nhóm`}</span>
                                        </p>
                                    </div>

                                    {/* Toggle Active */}
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={sched.active}
                                            onChange={() => onToggleActive(sched)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>

                                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap line-clamp-3">
                                    {sched.messageTemplate}
                                </div>

                                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                                    <span>Lần chạy gần nhất: {sched.lastRunAt ? new Date(sched.lastRunAt).toLocaleString('vi-VN') : 'Chưa chạy'}</span>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            onClick={() => onTriggerNow(sched)}
                                            disabled={isThisTriggering}
                                            className="px-2 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg flex items-center gap-1"
                                            title="Kích hoạt gửi ngay bây giờ"
                                        >
                                            <Play size={12} className={isThisTriggering ? 'animate-spin' : ''} />
                                            <span>{isThisTriggering ? 'Đang gửi...' : 'Gửi ngay'}</span>
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            onClick={() => handleEdit(sched)}
                                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                                            title="Chỉnh sửa"
                                        >
                                            <Edit2 size={14} />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            onClick={() => onDeleteSchedule(sched.id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                                            title="Xoá"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <ScheduleEditModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                schedule={selectedSchedule}
                groups={groups}
                onSave={onSaveSchedule}
                onAddManualGroup={onAddManualGroup}
            />
        </div>
    );
};
