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
        <div className="space-y-2.5 sm:space-y-3.5">
            {/* Top Bar */}
            <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800/90 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-row items-center justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <h3 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm truncate">Lịch Hẹn Thông Báo</h3>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200/80 shrink-0">
                            <Users size={11} /> {groups.length} nhóm
                        </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500 truncate hidden sm:block">Tự động phát thông báo tới các nhóm chat theo giờ định sẵn.</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                        variant="ghost"
                        size="none"
                        onClick={onRefresh}
                        className="h-8 w-8 p-0 flex items-center justify-center text-slate-500 hover:text-sky-600 rounded-lg border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
                        title="Làm mới danh sách và nhóm"
                    >
                        <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleCreateNew}
                        className="h-8 px-3 flex items-center gap-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    >
                        <Plus size={14} />
                        <span>Thêm Lịch</span>
                    </Button>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                {schedules.length === 0 ? (
                    <div className="col-span-full p-8 text-center bg-white dark:bg-slate-800/90 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                        <Clock size={28} className="mx-auto text-slate-300 mb-1.5" />
                        <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">Chưa có lịch hẹn thông báo nào</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Bấm "Thêm Lịch" để tạo lịch gửi thông báo tự động.</p>
                    </div>
                ) : (
                    schedules.map(sched => {
                        const isThisTriggering = isTriggering === sched.id;
                        
                        const getRepeatLabel = () => {
                            if (sched.repeatType === 'ONCE') {
                                return `1 lần (${sched.specificDate || 'Hôm nay'})`;
                            }
                            if (sched.repeatType === 'DAILY' || (!sched.repeatType && sched.daysOfWeek?.length === 7)) {
                                return 'Hàng ngày';
                            }
                            if (sched.repeatType === 'WEEKDAYS' || (!sched.repeatType && sched.daysOfWeek?.length === 5 && [1, 2, 3, 4, 5].every(d => sched.daysOfWeek.includes(d)))) {
                                return 'T2 - T6';
                            }
                            const dayString = (sched.daysOfWeek || []).sort().map(d => DAYS_NAME[d]).join(', ');
                            return dayString ? dayString : 'Hàng ngày';
                        };

                        return (
                            <div
                                key={sched.id}
                                className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800/90 border transition-all shadow-2xs space-y-2 ${
                                    sched.active ? 'border-slate-200/80 dark:border-slate-700/80' : 'border-slate-200/40 opacity-60'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{sched.name}</h4>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 font-mono">
                                                {sched.time}
                                            </span>
                                            {sched.repeatType === 'ONCE' && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200">
                                                    1 Lần
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                            <Calendar size={11} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{getRepeatLabel()}</span>
                                            <span className="text-slate-300 dark:text-slate-600">•</span>
                                            <Users size={11} className="text-slate-400 shrink-0" />
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
                                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-sky-600"></div>
                                    </label>
                                </div>

                                <div className="p-2 bg-slate-50 dark:bg-slate-900/40 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap line-clamp-2">
                                    {sched.messageTemplate}
                                </div>

                                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                                    <span className="truncate">Gần nhất: {sched.lastRunAt ? new Date(sched.lastRunAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Chưa chạy'}</span>

                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="none"
                                            onClick={() => onTriggerNow(sched)}
                                            disabled={isThisTriggering}
                                            className="h-6.5 px-2 text-[11px] font-semibold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-md flex items-center gap-1 active:scale-95 transition-all"
                                            title="Kích hoạt gửi ngay bây giờ"
                                        >
                                            <Play size={11} className={isThisTriggering ? 'animate-spin' : ''} />
                                            <span>{isThisTriggering ? 'Gửi...' : 'Gửi ngay'}</span>
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="none"
                                            onClick={() => handleEdit(sched)}
                                            className="h-6.5 w-6.5 p-0 flex items-center justify-center text-slate-400 hover:text-sky-600 rounded-md active:scale-95 transition-all"
                                            title="Chỉnh sửa"
                                        >
                                            <Edit2 size={12} />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="none"
                                            onClick={() => onDeleteSchedule(sched.id)}
                                            className="h-6.5 w-6.5 p-0 flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-md active:scale-95 transition-all"
                                            title="Xoá"
                                        >
                                            <Trash2 size={12} />
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
