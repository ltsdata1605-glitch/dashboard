import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../../../components/shared/ui/Modal';
import { Button } from '../../../../../components/shared/ui/Button';
import { ConfirmDialog } from '../../../../../components/shared/ui/ConfirmDialog';
import {
    getCurrentRangeDefault,
    getMonthRange,
    listRecentMonths,
    getYearMonthPlan,
    estimateRunTime,
    isSameMonthDDMMYYYY,
    parseDDMMYYYY,
    toYYYYMM,
} from '../../../utils/bonusDateRange';

type PickerTab = 'current' | 'month' | 'year' | 'range';

export interface AutoBonusRangePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeCount: number;
    /** Chạy 1 job đơn (tab Hiện tại/Tháng/Khoảng thời gian). `label` dùng để cập nhật
     * tiêu đề báo cáo (VD "THÁNG 6/2026") — xem AutoBonusPanel. */
    onRunSingle: (range: { fromDate: string; toDate: string; label: string }) => void;
    /** Chạy trọn 1 năm — lặp tuần tự nhiều job (tab Năm). */
    onRunYear: (year: number, label: string) => void;
}

/** "06/07/2026" -> "6/7" — khớp định dạng getYesterdayDateString() đang dùng làm tiêu đề mặc định. */
function toShortDDMM(ddmmyyyy: string): string {
    const d = parseDDMMYYYY(ddmmyyyy);
    return d ? `${d.getDate()}/${d.getMonth() + 1}` : ddmmyyyy;
}

const TABS: { id: PickerTab; label: string }[] = [
    { id: 'current', label: 'Hiện tại' },
    { id: 'month', label: 'Tháng' },
    { id: 'year', label: 'Năm' },
    { id: 'range', label: 'Khoảng thời gian' },
];

function toApiInputValue(ddmmyyyy: string): string {
    const m = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return '';
    return `${m[3]}-${m[2]}-${m[1]}`;
}

function fromApiInputValue(yyyymmdd: string): string {
    const m = yyyymmdd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    return `${m[3]}/${m[2]}/${m[1]}`;
}

const tabButtonClass = (active: boolean) => `bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
    active
        ? 'bg-sky-600 dark:bg-sky-700 text-white'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
}`;

export const AutoBonusRangePickerModal: React.FC<AutoBonusRangePickerModalProps> = ({
    isOpen, onClose, employeeCount, onRunSingle, onRunYear,
}) => {
    const [activeTab, setActiveTab] = useState<PickerTab>('current');
    const recentMonths = useMemo(() => listRecentMonths(12), []);
    const [selectedMonth, setSelectedMonth] = useState(recentMonths[0]?.yyyymm || '');
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [showYearConfirm, setShowYearConfirm] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setActiveTab('current');
        setSelectedMonth(recentMonths[0]?.yyyymm || '');
        setSelectedYear(null);
        const def = getCurrentRangeDefault();
        setCustomFrom(def.fromDate);
        setCustomTo(def.toDate);
        setShowYearConfirm(false);
    }, [isOpen, recentMonths]);

    const currentRange = useMemo(() => getCurrentRangeDefault(), []);
    const monthRange = useMemo(() => selectedMonth ? getMonthRange(selectedMonth) : null, [selectedMonth]);
    const yearPlan = useMemo(() => selectedYear ? getYearMonthPlan(selectedYear) : null, [selectedYear]);
    const yearEstimate = useMemo(
        () => (yearPlan ? estimateRunTime(yearPlan.length, employeeCount) : null),
        [yearPlan, employeeCount],
    );

    const rangeValidation = useMemo(() => {
        const fromDate = parseDDMMYYYY(customFrom);
        const toDate = parseDDMMYYYY(customTo);
        if (!fromDate || !toDate) return { valid: false, error: 'Chọn đủ ngày bắt đầu và ngày kết thúc.' };
        if (toDate < fromDate) return { valid: false, error: 'Ngày kết thúc phải sau ngày bắt đầu.' };
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        if (toDate > yesterday) return { valid: false, error: 'Ngày kết thúc không được vượt quá hôm qua.' };
        if (!isSameMonthDDMMYYYY(customFrom, customTo)) {
            return { valid: false, error: '2 ngày phải cùng tháng. Muốn lấy nhiều tháng, dùng lựa chọn Tháng hoặc Năm.' };
        }
        return { valid: true as const };
    }, [customFrom, customTo]);

    if (!isOpen) return null;

    const now = new Date();
    const yearOptions = [
        { year: now.getFullYear(), label: `${now.getFullYear()} — năm nay` },
        { year: now.getFullYear() - 1, label: `${now.getFullYear() - 1} — năm trước` },
    ];

    const handleRunClick = () => {
        if (activeTab === 'current') {
            onRunSingle({ ...currentRange, label: `ĐẾN NGÀY ${toShortDDMM(currentRange.toDate)}` });
            onClose();
        } else if (activeTab === 'month' && monthRange) {
            onRunSingle({ ...monthRange, label: `THÁNG ${selectedMonth ? recentMonths.find(m => m.yyyymm === selectedMonth)?.label : ''}` });
            onClose();
        } else if (activeTab === 'range' && rangeValidation.valid) {
            onRunSingle({ fromDate: customFrom, toDate: customTo, label: `${customFrom} → ${customTo}` });
            onClose();
        } else if (activeTab === 'year' && selectedYear) {
            setShowYearConfirm(true);
        }
    };

    const confirmYearRun = () => {
        if (selectedYear == null) return;
        setShowYearConfirm(false);
        onRunYear(selectedYear, `NĂM ${selectedYear} (LUỸ KẾ)`);
        onClose();
    };

    const isCurrentMonthSelected = monthRange && selectedMonth === recentMonths[0]?.yyyymm;

    const primaryLabel = activeTab === 'year'
        ? (yearPlan ? `Chạy ${yearPlan.length} tháng` : 'Chạy ngay')
        : 'Chạy ngay';
    const primaryDisabled = (activeTab === 'range' && !rangeValidation.valid)
        || (activeTab === 'year' && !selectedYear);

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Chọn thời gian đổ thưởng"
                maxWidth="md"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={onClose}>Huỷ</Button>
                        <Button variant="primary" onClick={handleRunClick} disabled={primaryDisabled}>{primaryLabel}</Button>
                    </div>
                }
            >
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {TABS.map(t => (
                        <Button
                            key={t.id}
                            variant="ghost"
                            onClick={() => setActiveTab(t.id)}
                            className={tabButtonClass(activeTab === t.id)}
                        >
                            {t.label}
                        </Button>
                    ))}
                </div>

                {activeTab === 'current' && (
                    <div className="space-y-2">
                        {currentRange.isFullPreviousMonth && (
                            <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                Hôm nay là ngày 01 — tự động lấy TRỌN THÁNG TRƯỚC
                            </p>
                        )}
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            Sẽ chạy: <span className="tabular-nums">{currentRange.fromDate} → {currentRange.toDate}</span>
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{employeeCount} nhân viên</p>
                    </div>
                )}

                {activeTab === 'month' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Chọn tháng</label>
                            <select
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                            >
                                {recentMonths.map(m => (
                                    <option key={m.yyyymm} value={m.yyyymm}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                        {monthRange && (
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Sẽ chạy: <span className="tabular-nums">{monthRange.fromDate} → {monthRange.toDate}</span>
                                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">
                                    {isCurrentMonthSelected ? '(tháng hiện tại — chưa hết tháng)' : '(đã đủ tháng)'}
                                </span>
                            </p>
                        )}
                    </div>
                )}

                {activeTab === 'year' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Chọn năm</label>
                            <div className="flex gap-2">
                                {yearOptions.map(y => (
                                    <Button
                                        key={y.year}
                                        variant="ghost"
                                        onClick={() => setSelectedYear(y.year)}
                                        className={`bg-transparent hover:bg-transparent h-auto w-auto text-inherit flex-1 px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                                            selectedYear === y.year
                                                ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        {y.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        {yearPlan && yearEstimate && (() => {
                            const lastItem = yearPlan[yearPlan.length - 1];
                            const isLastMonthPartial = lastItem.yyyymm === toYYYYMM(now.getFullYear(), now.getMonth());
                            return (
                                <>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        Sẽ chạy {yearPlan.length} tháng: T{yearPlan[0].label.split('/')[0]} → T{lastItem.label}
                                        {isLastMonthPartial && (
                                            <span className="text-xs text-slate-400 dark:text-slate-500 font-normal"> (T{lastItem.label.split('/')[0]} chỉ đến {lastItem.toDate})</span>
                                        )}
                                    </p>
                                    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5">
                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                            ⚠ Sẽ chạy {yearPlan.length} tháng × {employeeCount} nhân viên ≈ {yearEstimate.totalRequests} lượt lấy dữ liệu,
                                            mất khoảng {yearEstimate.estimatedMinutes} phút. Tiếp tục?
                                        </p>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}

                {activeTab === 'range' && (
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Ngày bắt đầu</label>
                                <input
                                    type="date"
                                    value={toApiInputValue(customFrom)}
                                    onChange={e => setCustomFrom(fromApiInputValue(e.target.value))}
                                    className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Ngày kết thúc</label>
                                <input
                                    type="date"
                                    value={toApiInputValue(customTo)}
                                    onChange={e => setCustomTo(fromApiInputValue(e.target.value))}
                                    className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                                />
                            </div>
                        </div>
                        {rangeValidation.valid ? (
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Sẽ chạy: <span className="tabular-nums">{customFrom} → {customTo}</span>
                            </p>
                        ) : (
                            <p className="text-xs font-bold text-rose-600 dark:text-rose-400">⚠ {rangeValidation.error}</p>
                        )}
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                isOpen={showYearConfirm}
                onClose={() => setShowYearConfirm(false)}
                onConfirm={confirmYearRun}
                title="Xác nhận chạy trọn năm"
                variant="warning"
                confirmText="Tiếp tục"
                message={yearPlan && yearEstimate
                    ? `Sẽ chạy ${yearPlan.length} tháng × ${employeeCount} nhân viên ≈ ${yearEstimate.totalRequests} lượt lấy dữ liệu, mất khoảng ${yearEstimate.estimatedMinutes} phút.\n\nMỗi tháng sẽ mở 1 tab MWG mới, chạy tuần tự. Bạn có thể dừng lại giữa chừng, dữ liệu các tháng đã xong vẫn được giữ.`
                    : ''}
            />
        </>
    );
};

export default AutoBonusRangePickerModal;
