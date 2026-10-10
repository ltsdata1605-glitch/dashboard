import React, { useState } from 'react';
import { Modal } from '../shared/ui/Modal';
import { Button } from '../shared/ui/Button';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { formatYcxLuyKeTitle, formatYcxMonthTitle } from '../../services/ycxAutoSyncService';

interface YcxLuyKePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (month?: string) => void;
}

export const YcxLuyKePickerModal: React.FC<YcxLuyKePickerModalProps> = ({
    isOpen,
    onClose,
    onStart
}) => {
    const [choice, setChoice] = useState<'luyke' | 'month'>('luyke');
    const now = new Date();
    const defaultMonthVal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [selectedMonth, setSelectedMonth] = useState(defaultMonthVal);

    const luyKeTitle = formatYcxLuyKeTitle();
    const monthTitle = formatYcxMonthTitle(selectedMonth);

    const handleStart = () => {
        onClose();
        if (choice === 'luyke') {
            onStart();
        } else {
            onStart(selectedMonth);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            hideHeader
            ariaLabel="Tự động YCX Luỹ kế"
            maxWidth="sm"
        >
            <div className="-m-5 p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-100/50 dark:border-emerald-900/30 shrink-0">
                        <AppIcon name="dateRange" size="lg" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                            Tự động YCX Luỹ kế
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Tên sẽ được tạo và lưu tự động vào kho dữ liệu Phân tích
                        </p>
                    </div>
                </div>

                {/* Selection Options */}
                <div className="space-y-2.5">
                    {/* Option 1: Luỹ kế từ ngày 1 đến hôm qua */}
                    <div
                        onClick={() => setChoice('luyke')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            choice === 'luyke'
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-500/60 shadow-xs'
                                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-start gap-2.5">
                            <input
                                type="radio"
                                checked={choice === 'luyke'}
                                onChange={() => setChoice('luyke')}
                                className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                                    <span>Lũy kế tháng hiện tại</span>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">01 → Hôm qua</span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Lấy số liệu từ ngày 01 đến ngày hôm qua
                                </p>
                                <div className="mt-1.5 px-2 py-1 rounded bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 truncate">
                                    🏷️ Tên tự động: <span className="font-bold">{luyKeTitle}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Option 2: Chọn tháng */}
                    <div
                        onClick={() => setChoice('month')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            choice === 'month'
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-500/60 shadow-xs'
                                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-start gap-2.5">
                            <input
                                type="radio"
                                checked={choice === 'month'}
                                onChange={() => setChoice('month')}
                                className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                                    <span>Chọn tháng</span>
                                    <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold uppercase">Trọn tháng</span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Lấy số liệu trọn vẹn của một tháng bất kỳ
                                </p>
                                {choice === 'month' && (
                                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="month"
                                            value={selectedMonth}
                                            max={defaultMonthVal}
                                            onChange={(e) => setSelectedMonth(e.target.value)}
                                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                    </div>
                                )}
                                <div className="mt-1.5 px-2 py-1 rounded bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 truncate">
                                    🏷️ Tên tự động: <span className="font-bold">{monthTitle}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onClose}
                        className="rounded-lg"
                    >
                        Huỷ bỏ
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleStart}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5"
                    >
                        <AppIcon name="sparkles" size="xs" />
                        <span>Bắt đầu — {choice === 'luyke' ? 'Luỹ kế' : monthTitle}</span>
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default YcxLuyKePickerModal;
