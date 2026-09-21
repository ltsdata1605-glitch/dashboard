import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Check, MessageSquare, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import { BotSchedule, LineGroup, ScheduleRepeatType } from '../types/lineBot.types';

interface ScheduleEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    schedule: Partial<BotSchedule> | null;
    groups: LineGroup[];
    onSave: (sched: Partial<BotSchedule>) => Promise<string | null>;
    onAddManualGroup?: (groupId: string, groupName?: string) => Promise<boolean>;
}

const DAYS = [
    { label: 'T2', val: 1 },
    { label: 'T3', val: 2 },
    { label: 'T4', val: 3 },
    { label: 'T5', val: 4 },
    { label: 'T6', val: 5 },
    { label: 'T7', val: 6 },
    { label: 'CN', val: 0 }
];

export const ScheduleEditModal: React.FC<ScheduleEditModalProps> = ({
    isOpen,
    onClose,
    schedule,
    groups,
    onSave,
    onAddManualGroup
}) => {
    const [name, setName] = useState<string>('');
    const [time, setTime] = useState<string>('06:00');
    const [repeatType, setRepeatType] = useState<ScheduleRepeatType>('DAILY');
    const [specificDate, setSpecificDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
    const [targetType, setTargetType] = useState<'ALL_GROUPS' | 'SPECIFIC_GROUPS'>('ALL_GROUPS');
    const [targetGroupIds, setTargetGroupIds] = useState<string[]>([]);
    const [messageTemplate, setMessageTemplate] = useState<string>('');
    const [active, setActive] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [manualGroupId, setManualGroupId] = useState<string>('');
    const [manualGroupName, setManualGroupName] = useState<string>('');
    const [showManualInput, setShowManualInput] = useState<boolean>(false);

    useEffect(() => {
        if (schedule) {
            setName(schedule.name || '');
            setTime(schedule.time || '06:00');
            const schedDays = schedule.daysOfWeek || [1, 2, 3, 4, 5, 6, 0];
            setDays(schedDays);

            // Suy luận chu kỳ lặp nếu chưa có
            let initRepeat: ScheduleRepeatType = schedule.repeatType || 'DAILY';
            if (!schedule.repeatType) {
                if (schedule.specificDate) {
                    initRepeat = 'ONCE';
                } else if (schedDays.length === 5 && [1, 2, 3, 4, 5].every(d => schedDays.includes(d))) {
                    initRepeat = 'WEEKDAYS';
                } else if (schedDays.length === 7) {
                    initRepeat = 'DAILY';
                } else {
                    initRepeat = 'CUSTOM';
                }
            }
            setRepeatType(initRepeat);
            setSpecificDate(schedule.specificDate || new Date().toISOString().slice(0, 10));
            setTargetType(schedule.targetType || 'ALL_GROUPS');
            setTargetGroupIds(schedule.targetGroupIds || []);
            setMessageTemplate(schedule.messageTemplate || '📢 THÔNG BÁO TỒN KHO PMH [{date}]\nHiện tại kho còn {ton_kho} mã khả dụng.\nChúc cả nhà ngày mới bùng nổ doanh thu!');
            setActive(schedule.active ?? true);
        } else {
            setName('');
            setTime('06:00');
            setRepeatType('DAILY');
            setDays([1, 2, 3, 4, 5, 6, 0]);
            setSpecificDate(new Date().toISOString().slice(0, 10));
            setTargetType('ALL_GROUPS');
            setTargetGroupIds([]);
            setMessageTemplate('📢 THÔNG BÁO TỒN KHO PMH [{date}]\nHiện tại kho còn {ton_kho} mã khả dụng.');
            setActive(true);
        }
    }, [schedule, isOpen]);

    if (!isOpen) return null;

    const handleRepeatTypeChange = (newType: ScheduleRepeatType) => {
        setRepeatType(newType);
        if (newType === 'DAILY') {
            setDays([1, 2, 3, 4, 5, 6, 0]);
        } else if (newType === 'WEEKDAYS') {
            setDays([1, 2, 3, 4, 5]);
        } else if (newType === 'ONCE') {
            const d = new Date(specificDate || new Date());
            setDays([d.getDay()]);
        }
    };

    const toggleDay = (d: number) => {
        let nextDays: number[];
        if (days.includes(d)) {
            nextDays = days.filter(x => x !== d);
        } else {
            nextDays = [...days, d];
        }
        setDays(nextDays);
        if (repeatType !== 'CUSTOM') {
            setRepeatType('CUSTOM');
        }
    };

    const insertVariable = (varName: string) => {
        setMessageTemplate(prev => prev + varName);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Vui lòng nhập tên lịch hẹn');
            return;
        }
        if (!time.trim()) {
            toast.error('Vui lòng chọn giờ thông báo');
            return;
        }

        if (repeatType === 'ONCE') {
            if (!specificDate) {
                toast.error('Vui lòng chọn ngày phát thông báo');
                return;
            }
        } else if (days.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 ngày trong tuần');
            return;
        }

        setIsSubmitting(true);
        try {
            const finalDays = repeatType === 'ONCE'
                ? [new Date(specificDate).getDay()]
                : days;

            const payloadToSave: any = {
                ...(schedule || {}),
                name: name.trim(),
                time,
                repeatType,
                daysOfWeek: finalDays,
                targetType,
                targetGroupIds,
                messageTemplate: messageTemplate.trim(),
                active
            };
            if (repeatType === 'ONCE' && specificDate) {
                payloadToSave.specificDate = specificDate;
            } else {
                delete payloadToSave.specificDate;
            }

            const res = await onSave(payloadToSave);
            if (res) onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                        <Clock size={16} className="text-emerald-500" />
                        <span>{schedule?.id ? 'Chỉnh Sửa Lịch Hẹn' : 'Tạo Lịch Hẹn Thông Báo'}</span>
                    </h3>
                    <Button variant="ghost" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg">
                        <X size={18} />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Tên lịch hẹn <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ví dụ: Báo cáo tồn kho sáng 6h..."
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Giờ thông báo (HH:mm) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="time"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Trạng thái
                            </label>
                            <select
                                value={active ? '1' : '0'}
                                onChange={e => setActive(e.target.value === '1')}
                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                            >
                                <option value="1">Đang bật (Hoạt động)</option>
                                <option value="0">Tạm tắt</option>
                            </select>
                        </div>
                    </div>

                    {/* Chu Kỳ Lặp */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                            <Repeat size={13} className="text-purple-600 dark:text-purple-400" />
                            <span>Chu Kỳ Lặp</span>
                        </label>
                        <select
                            value={repeatType}
                            onChange={e => handleRepeatTypeChange(e.target.value as ScheduleRepeatType)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20"
                        >
                            <option value="DAILY">Hàng ngày (Mỗi ngày)</option>
                            <option value="CUSTOM">Tùy chọn thứ trong tuần (Nhiều thứ)</option>
                            <option value="WEEKDAYS">Thứ 2 đến Thứ 6 (Ngày làm việc)</option>
                            <option value="ONCE">Một lần duy nhất</option>
                        </select>
                    </div>

                    {/* Hiển thị tuỳ chọn tương ứng theo Chu Kỳ Lặp */}
                    {repeatType === 'ONCE' ? (
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                                <Calendar size={13} className="text-emerald-500" />
                                <span>Ngày phát thông báo (Một lần duy nhất) <span className="text-rose-500">*</span></span>
                            </label>
                            <input
                                type="date"
                                value={specificDate}
                                min={new Date().toISOString().slice(0, 10)}
                                onChange={e => setSpecificDate(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold font-mono"
                                required
                            />
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                💡 Lịch sẽ phát đúng vào ngày này và tự động tạm tắt sau khi hoàn thành.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Ngày phát thông báo trong tuần
                                </label>
                                {repeatType === 'DAILY' && (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                        ✓ Phát đều đặn mỗi ngày
                                    </span>
                                )}
                                {repeatType === 'WEEKDAYS' && (
                                    <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
                                        ✓ Thứ 2 đến Thứ 6
                                    </span>
                                )}
                                {repeatType === 'CUSTOM' && (
                                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                                        Tùy chọn: {days.length} ngày
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-1.5">
                                {DAYS.map(d => {
                                    const selected = days.includes(d.val);
                                    return (
                                        <button
                                            type="button"
                                            key={d.val}
                                            onClick={() => toggleDay(d.val)}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                                selected
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            {d.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Đối tượng nhận tin
                        </label>
                        <select
                            value={targetType}
                            onChange={e => setTargetType(e.target.value as any)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold mb-2"
                        >
                            <option value="ALL_GROUPS">Tất cả các nhóm (Broadcast)</option>
                            <option value="SPECIFIC_GROUPS">Chọn nhóm cụ thể</option>
                        </select>

                        {targetType === 'SPECIFIC_GROUPS' && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                {groups.length === 0 ? (
                                    <div className="space-y-2 py-1">
                                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                            💡 Bot chưa có nhóm nào được lưu. Bạn có thể:
                                        </p>
                                        <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 list-disc pl-4">
                                            <li>Mời Bot vào nhóm và gõ lệnh <strong>id</strong> trong nhóm để Bot tự nhận.</li>
                                            <li>Hoặc dán <strong>Group ID</strong> trực tiếp vào ô bên dưới:</li>
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                                        <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700 text-[11px] text-slate-400">
                                            <span>Chọn các nhóm nhận tin ({targetGroupIds.length}/{groups.length})</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (targetGroupIds.length === groups.length) {
                                                        setTargetGroupIds([]);
                                                    } else {
                                                        setTargetGroupIds(groups.map(g => g.groupId));
                                                    }
                                                }}
                                                className="text-emerald-600 hover:underline font-bold"
                                            >
                                                {targetGroupIds.length === groups.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                                            </button>
                                        </div>
                                        {groups.map(g => (
                                            <label key={g.groupId} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-lg transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={targetGroupIds.includes(g.groupId)}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setTargetGroupIds([...targetGroupIds, g.groupId]);
                                                        } else {
                                                            setTargetGroupIds(targetGroupIds.filter(id => id !== g.groupId));
                                                        }
                                                    }}
                                                    className="rounded text-emerald-600"
                                                />
                                                <span className="font-medium">{g.groupName || g.groupId}</span>
                                                {g.groupName && <span className="text-[10px] text-slate-400 font-mono">({g.groupId.slice(0, 10)}...)</span>}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* Nhập thủ công Group ID */}
                                {onAddManualGroup && (
                                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                        {!showManualInput && groups.length > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowManualInput(true)}
                                                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                                            >
                                                + Nhập thêm Group ID thủ công
                                            </button>
                                        ) : (
                                            <div className="space-y-1.5">
                                                <div className="flex gap-1.5">
                                                    <input
                                                        type="text"
                                                        placeholder="Dán Group ID (ví dụ: c...)"
                                                        value={manualGroupId}
                                                        onChange={e => setManualGroupId(e.target.value)}
                                                        className="flex-1 p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Tên nhóm (tuỳ chọn)"
                                                        value={manualGroupName}
                                                        onChange={e => setManualGroupName(e.target.value)}
                                                        className="w-32 p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            if (!manualGroupId.trim()) return;
                                                            const success = await onAddManualGroup(manualGroupId.trim(), manualGroupName.trim());
                                                            if (success) {
                                                                setTargetGroupIds(prev => [...prev, manualGroupId.trim()]);
                                                                setManualGroupId('');
                                                                setManualGroupName('');
                                                                setShowManualInput(false);
                                                            }
                                                        }}
                                                        disabled={!manualGroupId.trim()}
                                                        className="px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                                                    >
                                                        Thêm
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Nội dung thông báo
                            </label>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => insertVariable('{date}')}
                                    className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-sky-600 rounded hover:bg-slate-200"
                                >
                                    + {`{date}`}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => insertVariable('{ton_kho}')}
                                    className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-emerald-600 rounded hover:bg-slate-200"
                                >
                                    + {`{ton_kho}`}
                                </button>
                            </div>
                        </div>
                        <textarea
                            rows={4}
                            value={messageTemplate}
                            onChange={e => setMessageTemplate(e.target.value)}
                            placeholder="Nhập nội dung thông báo..."
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                            required
                        />
                    </div>

                    <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/50 -mx-5 -mb-5 mt-4">
                        <Button variant="ghost" type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-lg">
                            Huỷ
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Lưu Lịch Hẹn'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
