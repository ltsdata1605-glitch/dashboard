import React, { useMemo, useState } from 'react';
import {
    History,
    X,
    Trash2,
    Cloud,
    HardDrive,
    CalendarDays,
    FileSpreadsheet,
    Download,
    Copy,
    Check,
    Search,
    CheckCircle2,
    PanelRightClose,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SavedTaxRecord } from '../types/tax.types';
import { formatVnd } from '../services/taxCalculatorService';
import { groupRecordsByMonth } from '../services/taxHistoryGrouping';
import {
    exportTaxRefundToExcel,
    copyTaxRefundToClipboardForGoogleSheets,
} from '../services/taxExportExcelService';

interface TaxHistorySidebarProps {
    records: SavedTaxRecord[];
    selectedRecordId?: number | string | null;
    onSelectRecord: (record: SavedTaxRecord) => void;
    onDeleteRecord: (id: number) => void;
    onClearAll: () => void;
    onClose: () => void;
}

export const TaxHistorySidebar: React.FC<TaxHistorySidebarProps> = ({
    records,
    selectedRecordId,
    onSelectRecord,
    onDeleteRecord,
    onClearAll,
    onClose,
}) => {
    const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [isCopied, setIsCopied] = useState(false);

    // Lọc theo từ khóa tìm kiếm tên nhân viên
    const filteredRecords = useMemo(() => {
        if (!searchKeyword.trim()) return records;
        const kw = searchKeyword.trim().toLowerCase();
        return records.filter(r => (r.name || '').toLowerCase().includes(kw));
    }, [records, searchKeyword]);

    // Gom theo tháng lương (tháng mới nhất lên đầu)
    const monthGroups = useMemo(() => groupRecordsByMonth(filteredRecords), [filteredRecords]);
    const displayedGroups = useMemo(() => {
        if (selectedMonthFilter === 'all') return monthGroups;
        return monthGroups.filter(g => g.key === selectedMonthFilter);
    }, [monthGroups, selectedMonthFilter]);

    // Danh sách bản ghi đang hiển thị theo bộ lọc
    const activeRecords = useMemo(() => {
        if (selectedMonthFilter === 'all') return filteredRecords;
        const currentGroup = monthGroups.find(g => g.key === selectedMonthFilter);
        return currentGroup ? currentGroup.records : filteredRecords;
    }, [filteredRecords, monthGroups, selectedMonthFilter]);

    const activeMonthLabel = useMemo(() => {
        if (selectedMonthFilter === 'all') return 'Tất cả';
        const currentGroup = monthGroups.find(g => g.key === selectedMonthFilter);
        return currentGroup ? currentGroup.label : selectedMonthFilter;
    }, [monthGroups, selectedMonthFilter]);

    // Xuất Excel
    const handleExportExcel = (recordsToExport: SavedTaxRecord[], label: string) => {
        try {
            if (!recordsToExport || recordsToExport.length === 0) {
                toast.error('Không có dữ liệu để xuất file');
                return;
            }
            exportTaxRefundToExcel(recordsToExport, { monthLabel: label });
            toast.success(`Đã xuất file Excel (${recordsToExport.length} nhân viên)`);
        } catch (err) {
            console.error('Lỗi xuất file Excel:', err);
            toast.error('Không thể tạo file Excel');
        }
    };

    // Copy Google Sheets
    const handleCopyGoogleSheets = async (recordsToExport: SavedTaxRecord[], label: string) => {
        try {
            if (!recordsToExport || recordsToExport.length === 0) {
                toast.error('Không có dữ liệu để sao chép');
                return;
            }
            await copyTaxRefundToClipboardForGoogleSheets(recordsToExport, { monthLabel: label });
            setIsCopied(true);
            toast.success('Đã copy bảng dữ liệu! Hãy mở Google Sheets và bấm Ctrl + V để dán.');
            setTimeout(() => setIsCopied(false), 2500);
        } catch (err) {
            console.error('Lỗi copy bảng Google Sheets:', err);
            toast.error('Không thể sao chép bảng vào Clipboard');
        }
    };

    return (
        <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/80 overflow-hidden flex flex-col max-h-[calc(100vh-100px)] xl:max-h-[920px]">
            {/* Header Sidebar */}
            <div className="p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-800/80">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <History size={15} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white truncate">
                                Lịch Sử Tính Thuế
                            </h3>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500 text-white shrink-0">
                                {records.length}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                            Click dòng để khôi phục ngay
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => handleExportExcel(activeRecords, activeMonthLabel)}
                        title="Xuất file Excel danh sách hoàn thuế"
                        className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                    >
                        <FileSpreadsheet size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        title="Thu gọn danh sách lịch sử"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                    >
                        <PanelRightClose size={16} />
                    </button>
                </div>
            </div>

            {/* Ô tìm kiếm nhanh tên nhân viên */}
            <div className="px-3 pt-2.5 pb-1.5 border-b border-slate-100 dark:border-slate-700/60">
                <div className="relative flex items-center">
                    <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="Tìm theo tên nhân viên..."
                        className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    {searchKeyword && (
                        <button
                            type="button"
                            onClick={() => setSearchKeyword('')}
                            className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Bộ lọc tháng (Pill tabs) */}
            {monthGroups.length > 1 && (
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-700/60 flex items-center gap-1 overflow-x-auto no-scrollbar">
                    <button
                        type="button"
                        onClick={() => setSelectedMonthFilter('all')}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                            selectedMonthFilter === 'all'
                                ? 'bg-sky-500 text-white shadow-2xs'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        Tất cả ({filteredRecords.length})
                    </button>
                    {monthGroups.map(group => (
                        <button
                            key={group.key}
                            type="button"
                            onClick={() => setSelectedMonthFilter(group.key)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
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

            {/* Danh sách bản ghi */}
            <div className="overflow-y-auto p-2.5 sm:p-3 space-y-2 flex-1 divide-y divide-transparent">
                {records.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs px-2">
                        <History size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">Chưa có bản ghi nào</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Sau khi tính thuế, kết quả sẽ tự động lưu vào đây để khôi phục nhanh.
                        </p>
                    </div>
                ) : displayedGroups.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                        <p>Không tìm thấy nhân viên phù hợp.</p>
                    </div>
                ) : (
                    displayedGroups.map(group => (
                        <div key={group.key} className="space-y-1.5">
                            {/* Dải phân cách tháng */}
                            <div className="sticky top-0 z-10 -mx-2.5 sm:-mx-3 px-2.5 sm:px-3 py-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xs border-y border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1 text-[10px]">
                                <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                    <CalendarDays size={11} className="text-sky-500" />
                                    {group.label} ({group.records.length})
                                </span>
                                <span className="text-slate-500 dark:text-slate-400">
                                    Thuế: <strong className="text-emerald-600 dark:text-emerald-400">{formatVnd(group.totalTax)}</strong>
                                </span>
                            </div>

                            {/* Từng dòng nhân viên - CLICK ĐỂ KHÔI PHỤC NGAY */}
                            {group.records.map(rec => {
                                const isSelected = selectedRecordId === (rec.id || rec.createdAt);
                                return (
                                    <div
                                        key={rec.id || rec.createdAt}
                                        onClick={() => onSelectRecord(rec)}
                                        className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                                            isSelected
                                                ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-1 ring-sky-500/30 shadow-xs'
                                                : 'border-slate-200/80 dark:border-slate-700/70 bg-slate-50/40 dark:bg-slate-900/40 hover:border-sky-300 dark:hover:border-sky-700 hover:bg-sky-50/30 dark:hover:bg-slate-800/70 shadow-2xs'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className={`font-bold text-xs truncate ${isSelected ? 'text-sky-700 dark:text-sky-300' : 'text-slate-800 dark:text-slate-100'}`}>
                                                        {rec.name}
                                                    </span>

                                                    {isSelected && (
                                                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-sky-500 text-white">
                                                            <CheckCircle2 size={9} />
                                                            <span>Đang xem</span>
                                                        </span>
                                                    )}

                                                    {rec.monthYear && (
                                                        <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                            {rec.monthYear.includes('/') ? `T${rec.monthYear}` : rec.monthYear}
                                                        </span>
                                                    )}

                                                    {rec.syncedToCloud ? (
                                                        <span title="Đã đồng bộ Cloud" className="text-emerald-500">
                                                            <Cloud size={11} />
                                                        </span>
                                                    ) : (
                                                        <span title="Lưu máy" className="text-slate-400">
                                                            <HardDrive size={11} />
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Tóm tắt tiền */}
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 font-mono">
                                                    <span>Thu nhập: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{formatVnd(rec.totalIncome)}</strong></span>
                                                    {rec.proxyAmount > 0 && (
                                                        <span>Nhận: <strong className="text-amber-600 dark:text-amber-400">{formatVnd(rec.proxyAmount)}</strong></span>
                                                    )}
                                                    <span>Thuế: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatVnd(rec.taxOnProxyAmount)}</strong></span>
                                                    {rec.netRefundToFriend !== undefined && rec.netRefundToFriend > 0 && (
                                                        <span>Quỹ: <strong className="text-sky-600 dark:text-sky-400">{formatVnd(rec.netRefundToFriend)}</strong></span>
                                                    )}
                                                </div>

                                                {/* Chi tiết khoản nhận thay */}
                                                {rec.proxyItemsDetail && (
                                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 italic" title={rec.proxyItemsDetail}>
                                                        <span className="font-semibold text-slate-600 dark:text-slate-300 not-italic">Khoán: </span>
                                                        {rec.proxyItemsDetail}
                                                    </div>
                                                )}

                                                <div className="text-[9px] text-slate-400 mt-1">
                                                    {new Date(rec.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                                                    {new Date(rec.createdAt).toLocaleDateString('vi-VN')}
                                                </div>
                                            </div>

                                            {/* Nút xóa bản ghi */}
                                            {rec.id !== undefined && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteRecord(rec.id!);
                                                    }}
                                                    title="Xóa bản ghi này"
                                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>

            {/* Footer Sidebar */}
            {records.length > 0 && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-1.5">
                    <button
                        type="button"
                        onClick={onClearAll}
                        className="text-[10px] text-rose-500 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                        <Trash2 size={11} />
                        <span>Xóa tất cả</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => handleCopyGoogleSheets(activeRecords, activeMonthLabel)}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                            title="Sao chép bảng cho Google Sheets"
                        >
                            {isCopied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                            <span>{isCopied ? 'Đã copy!' : 'Copy Sheets'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleExportExcel(activeRecords, activeMonthLabel)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="Xuất file Excel (.xlsx)"
                        >
                            <Download size={11} />
                            <span>Xuất Excel</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
