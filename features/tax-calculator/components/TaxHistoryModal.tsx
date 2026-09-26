import React, { useMemo, useState } from 'react';
import {
    X,
    History,
    Trash2,
    RotateCcw,
    Cloud,
    HardDrive,
    CalendarDays,
    FileSpreadsheet,
    Download,
    Copy,
    Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import { SavedTaxRecord } from '../types/tax.types';
import { formatVnd } from '../services/taxCalculatorService';
import { groupRecordsByMonth, TaxHistoryMonthGroup } from '../services/taxHistoryGrouping';
import {
    exportTaxRefundToExcel,
    copyTaxRefundToClipboardForGoogleSheets,
} from '../services/taxExportExcelService';

interface TaxHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    records: SavedTaxRecord[];
    onLoadRecord: (record: SavedTaxRecord) => void;
    onDeleteRecord: (id: number) => void;
    onUpdateMonth?: (record: SavedTaxRecord, newMonthYear: string) => void;
    onUpdateGroupMonth?: (records: SavedTaxRecord[], newMonthYear: string) => void;
    onClearAll: () => void;
}

const generateMonthOptions = (currentMonthYear?: string): string[] => {
    const list: string[] = [];
    const currentYear = new Date().getFullYear();
    const years = [currentYear + 1, currentYear, currentYear - 1];
    for (const y of years) {
        for (let m = 12; m >= 1; m--) {
            const mm = m < 10 ? `0${m}` : `${m}`;
            list.push(`${mm}/${y}`);
        }
    }
    if (currentMonthYear && !list.includes(currentMonthYear)) {
        list.unshift(currentMonthYear);
    }
    return list;
};

export const TaxHistoryModal: React.FC<TaxHistoryModalProps> = ({
    isOpen,
    onClose,
    records,
    onLoadRecord,
    onDeleteRecord,
    onUpdateMonth,
    onUpdateGroupMonth,
    onClearAll,
}) => {
    const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
    const [isCopied, setIsCopied] = useState(false);

    // Gom theo tháng lương để rà soát nhanh (tháng mới nhất lên đầu)
    const monthGroups = useMemo(() => groupRecordsByMonth(records), [records]);
    const displayedGroups = useMemo(() => {
        if (selectedMonthFilter === 'all') return monthGroups;
        return monthGroups.filter(g => g.key === selectedMonthFilter);
    }, [monthGroups, selectedMonthFilter]);

    // Danh sách bản ghi theo bộ lọc đang chọn để xuất
    const activeRecords = useMemo(() => {
        if (selectedMonthFilter === 'all') return records;
        const currentGroup = monthGroups.find(g => g.key === selectedMonthFilter);
        return currentGroup ? currentGroup.records : records;
    }, [records, monthGroups, selectedMonthFilter]);

    const activeMonthLabel = useMemo(() => {
        if (selectedMonthFilter === 'all') return 'Tất cả';
        const currentGroup = monthGroups.find(g => g.key === selectedMonthFilter);
        return currentGroup ? currentGroup.label : selectedMonthFilter;
    }, [monthGroups, selectedMonthFilter]);

    // Xử lý xuất file Excel
    const handleExportExcel = (recordsToExport: SavedTaxRecord[], label: string) => {
        try {
            if (!recordsToExport || recordsToExport.length === 0) {
                toast.error('Không có dữ liệu để xuất file');
                return;
            }
            exportTaxRefundToExcel(recordsToExport, { monthLabel: label });
            toast.success(`Đã xuất file Excel hoàn thuế (${recordsToExport.length} nhân viên)`);
        } catch (err) {
            console.error('Lỗi xuất file Excel:', err);
            toast.error('Không thể tạo file Excel');
        }
    };

    // Xử lý sao chép bảng cho Google Sheets
    const handleCopyGoogleSheets = async (recordsToExport: SavedTaxRecord[], label: string) => {
        try {
            if (!recordsToExport || recordsToExport.length === 0) {
                toast.error('Không có dữ liệu để sao chép');
                return;
            }
            await copyTaxRefundToClipboardForGoogleSheets(recordsToExport, { monthLabel: label });
            setIsCopied(true);
            toast.success('Đã copy bảng dữ liệu! Mở Google Sheets và bấm Ctrl + V để dán');
            setTimeout(() => setIsCopied(false), 2500);
        } catch (err) {
            console.error('Lỗi copy bảng Google Sheets:', err);
            toast.error('Không thể sao chép bảng vào Clipboard');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                            <History size={16} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                                Lịch Sử Tính Thuế & Hoàn Thuế ({records.length})
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

                {/* Month filter tabs */}
                {monthGroups.length > 1 && (
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        <button
                            type="button"
                            onClick={() => setSelectedMonthFilter('all')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                                selectedMonthFilter === 'all'
                                    ? 'bg-sky-500 text-white shadow-2xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            Tất cả ({records.length})
                        </button>
                        {monthGroups.map(group => (
                            <button
                                key={group.key}
                                type="button"
                                onClick={() => setSelectedMonthFilter(group.key)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                                    selectedMonthFilter === group.key
                                        ? 'bg-sky-500 text-white shadow-2xs'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                {group.label} ({group.records.length})
                            </button>
                        ))}
                    </div>
                )}

                {/* Thanh công cụ Xuất Excel & Google Sheets cho thủ quỹ */}
                {records.length > 0 && (
                    <div className="px-3.5 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-b border-emerald-100 dark:border-emerald-800/60 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-900 dark:text-emerald-200 font-semibold">
                            <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">Thủ quỹ hoàn thuế:</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => handleExportExcel(activeRecords, activeMonthLabel)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                                title="Tải file Excel (.xlsx) danh sách hoàn thuế"
                            >
                                <Download size={13} />
                                <span>Xuất Excel ({activeMonthLabel})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCopyGoogleSheets(activeRecords, activeMonthLabel)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-700 shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                                title="Sao chép bảng TSV để dán trực tiếp (Ctrl+V) vào Google Sheets"
                            >
                                {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                <span>{isCopied ? 'Đã sao chép!' : 'Copy cho Google Sheets'}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Body list */}
                <div className="overflow-y-auto p-3 sm:p-4 space-y-2 flex-1">
                    {records.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">
                            <History size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                            <p className="font-semibold text-slate-600 dark:text-slate-400">Chưa có bản ghi tính thuế nào được lưu.</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Sau khi tính toán, bấm nút "Lưu Kết Quả" để lưu lại tra cứu sau.</p>
                        </div>
                    ) : (
                        displayedGroups.map(group => (
                            <div key={group.key} className="space-y-2">
                                {/* Dải tháng: dính trên để cuộn dài vẫn biết đang ở tháng nào */}
                                <div className="sticky top-0 z-10 -mx-3 sm:-mx-4 px-3 sm:px-4 py-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xs border-y border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                            <CalendarDays size={12} className="text-sky-500" />
                                            {group.label}
                                            <span className="text-slate-400 font-semibold normal-case tracking-normal">
                                                ({group.records.length} bản ghi)
                                            </span>
                                        </span>
                                        {onUpdateGroupMonth && (
                                            <select
                                                value={group.key}
                                                onChange={(e) => {
                                                    if (e.target.value !== group.key) {
                                                        onUpdateGroupMonth(group.records, e.target.value);
                                                    }
                                                }}
                                                title="Đổi tháng cho toàn bộ bản ghi trong nhóm này"
                                                className="text-[9px] font-semibold px-1 py-0.5 rounded bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:border-sky-400 cursor-pointer focus:outline-none"
                                            >
                                                <option value={group.key} disabled>
                                                    Đổi tháng cả nhóm...
                                                </option>
                                                {generateMonthOptions(group.key).map((m) => (
                                                    <option key={m} value={m}>
                                                        Sang Tháng {m}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                            Thuế:{' '}
                                            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                {formatVnd(group.totalTax)}
                                            </strong>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleExportExcel(group.records, group.label)}
                                            title={`Xuất riêng danh sách ${group.label} ra file Excel`}
                                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                            <FileSpreadsheet size={11} />
                                            <span>Xuất Excel</span>
                                        </button>
                                    </div>
                                </div>

                                {group.records.map(rec => (
                                    <div
                                        key={rec.id || rec.createdAt}
                                        className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-sky-50/40 dark:hover:bg-sky-950/20 transition-all flex items-center justify-between gap-3 shadow-2xs"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-bold text-xs text-slate-800 dark:text-white truncate">
                                                    {rec.name}
                                                </span>
                                                {onUpdateMonth ? (
                                                    <select
                                                        value={rec.monthYear || ''}
                                                        onChange={(e) => {
                                                            onUpdateMonth(rec, e.target.value);
                                                        }}
                                                        title="Bấm để đổi tháng của bản ghi này"
                                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:border-emerald-500 focus:outline-none cursor-pointer shadow-2xs"
                                                    >
                                                        {generateMonthOptions(rec.monthYear).map((m) => (
                                                            <option key={m} value={m}>
                                                                Tháng {m}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : rec.monthYear ? (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                        {rec.monthYear.includes('/') ? `Tháng ${rec.monthYear}` : rec.monthYear}
                                                    </span>
                                                ) : null}
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
                                                {rec.netRefundToFriend !== undefined && rec.netRefundToFriend > 0 ? (
                                                    <span>Chuyển quỹ: <strong className="text-sky-600 dark:text-sky-400 font-bold">{formatVnd(rec.netRefundToFriend)}</strong></span>
                                                ) : null}
                                            </div>
                                            {rec.proxyItemsDetail && (
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 italic" title={rec.proxyItemsDetail}>
                                                    <span className="font-semibold text-slate-600 dark:text-slate-300 not-italic">Khoản nhận: </span>
                                                    {rec.proxyItemsDetail}
                                                </div>
                                            )}
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

                    <div className="flex items-center gap-2">
                        {records.length > 0 && (
                            <button
                                type="button"
                                onClick={() => handleExportExcel(activeRecords, activeMonthLabel)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <FileSpreadsheet size={13} />
                                <span>Xuất Excel</span>
                            </button>
                        )}
                        <Button variant="secondary" size="sm" onClick={onClose}>
                            Đóng
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
