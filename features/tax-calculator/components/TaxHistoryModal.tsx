import React, { useMemo } from 'react';
import { X, History, Trash2, RotateCcw, Cloud, HardDrive, CalendarDays } from 'lucide-react';
import { Button } from '../../../components/shared/ui/Button';
import { SavedTaxRecord } from '../types/tax.types';
import { formatVnd } from '../services/taxCalculatorService';
import { groupRecordsByMonth } from '../services/taxHistoryGrouping';

interface TaxHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    records: SavedTaxRecord[];
    onLoadRecord: (record: SavedTaxRecord) => void;
    onDeleteRecord: (id: number) => void;
    onClearAll: () => void;
}

export const TaxHistoryModal: React.FC<TaxHistoryModalProps> = ({
    isOpen,
    onClose,
    records,
    onLoadRecord,
    onDeleteRecord,
    onClearAll
}) => {
    // Gom theo tháng lương để rà soát nhanh (tháng mới nhất lên đầu)
    const monthGroups = useMemo(() => groupRecordsByMonth(records), [records]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                            <History size={16} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                                Lịch Sử Tính Thuế ({records.length})
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                Lưu trữ trên thiết bị (IndexedDB) & tự động đồng bộ Firebase Cloud
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="none" onClick={onClose} className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={16} />
                    </Button>
                </div>

                {/* Body list */}
                <div className="overflow-y-auto p-3 sm:p-4 space-y-2">
                    {records.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">
                            <History size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                            <p className="font-semibold text-slate-600 dark:text-slate-400">Chưa có bản ghi tính thuế nào được lưu.</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Sau khi tính toán, bấm nút "Lưu Kết Quả" để lưu lại tra cứu sau.</p>
                        </div>
                    ) : (
                        monthGroups.map(group => (
                            <div key={group.key} className="space-y-2">
                                {/* Dải tháng: dính trên để cuộn dài vẫn biết đang ở tháng nào */}
                                <div className="sticky top-0 z-10 -mx-3 sm:-mx-4 px-3 sm:px-4 py-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xs border-y border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                        <CalendarDays size={12} className="text-sky-500" />
                                        {group.label}
                                        <span className="text-slate-400 font-semibold normal-case tracking-normal">
                                            ({group.records.length} bản ghi)
                                        </span>
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Thuế:{' '}
                                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                                            {formatVnd(group.totalTax)}
                                        </strong>
                                    </span>
                                </div>

                                {group.records.map(rec => (
                            <div
                                key={rec.id || rec.createdAt}
                                className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-sky-50/40 dark:hover:bg-sky-950/20 transition-all flex items-center justify-between gap-3 shadow-2xs"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-xs text-slate-800 dark:text-white truncate">
                                            {rec.name}
                                        </span>
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                                            {rec.taxLawVersion === '2026_law' ? 'Luật 2026' : 'Biểu thuế cũ'}
                                        </span>
                                        {rec.syncedToCloud ? (
                                            <span title="Đã đồng bộ Cloud" className="text-emerald-500">
                                                <Cloud size={12} />
                                            </span>
                                        ) : (
                                            <span title="Lưu trên máy" className="text-slate-400">
                                                <HardDrive size={12} />
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 font-mono">
                                        <span>Thu nhập: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{formatVnd(rec.totalIncome)}</strong></span>
                                        {rec.proxyAmount > 0 ? (
                                            <span>Nhận thay: <strong className="text-amber-600 dark:text-amber-400 font-semibold">{formatVnd(rec.proxyAmount)}</strong></span>
                                        ) : null}
                                        <span>Thuế: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatVnd(rec.taxOnProxyAmount)}</strong></span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1">
                                        {new Date(rec.createdAt).toLocaleString('vi-VN')}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => onLoadRecord(rec)}
                                        title="Nạp lại vào biểu mẫu"
                                        className="p-1.5 rounded-lg text-sky-600 hover:text-sky-700 hover:bg-sky-100 dark:hover:bg-sky-950/60 transition-colors cursor-pointer text-xs flex items-center gap-1 font-medium"
                                    >
                                        <RotateCcw size={14} />
                                        <span>Tải lại</span>
                                    </button>
                                    {rec.id !== undefined && (
                                        <button
                                            type="button"
                                            onClick={() => onDeleteRecord(rec.id!)}
                                            title="Xóa bản ghi này"
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700">
                    {records.length > 0 ? (
                        <button
                            type="button"
                            onClick={onClearAll}
                            className="text-xs text-rose-500 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                            <Trash2 size={13} />
                            <span>Xóa toàn bộ</span>
                        </button>
                    ) : (
                        <div />
                    )}

                    <Button variant="secondary" size="sm" onClick={onClose}>
                        Đóng
                    </Button>
                </div>
            </div>
        </div>
    );
};
