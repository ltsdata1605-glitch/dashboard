import React, { useState, useMemo } from 'react';
import {
    Ticket,
    Plus,
    Download,
    Search,
    RotateCcw,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    Clock,
    RefreshCw,
    Calendar,
    History,
    Copy,
    Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import { Coupon, CouponStatus, StockSummaryItem, ParsedImportItem } from '../types/lineBot.types';
import { CouponImportModal } from './CouponImportModal';
import { formatDisplayDate, getVietnamTodayString } from '../services/couponParser';

interface CouponManagerTabProps {
    coupons: Coupon[];
    filteredCoupons: Coupon[];
    isLoading: boolean;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    statusFilter: 'ALL' | CouponStatus;
    setStatusFilter: (s: 'ALL' | CouponStatus) => void;
    typeFilter: string;
    setTypeFilter: (t: string) => void;
    availableTypes: string[];
    stockSummary: {
        total: number;
        unused: number;
        sent: number;
        revoked: number;
        breakdown: StockSummaryItem[];
    };
    onImportCoupons: (items: ParsedImportItem[]) => Promise<{ added: number; skipped: number }>;
    onRevokeCoupon: (id: string, reason?: string) => Promise<void>;
    onDeleteCoupon: (id: string) => Promise<void>;
    onDeleteCouponsBatch?: (couponIds: string[]) => Promise<number>;
    onDeleteAllCoupons: () => Promise<number>;
    onExportExcel: () => void;
    onRefresh: () => void;
}

export const CouponManagerTab: React.FC<CouponManagerTabProps> = ({
    coupons,
    filteredCoupons,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    availableTypes,
    stockSummary,
    onImportCoupons,
    onRevokeCoupon,
    onDeleteCoupon,
    onDeleteCouponsBatch,
    onDeleteAllCoupons,
    onExportExcel,
    onRefresh
}) => {
    const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
    const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState<boolean>(false);
    const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(5); // Mặc định hiển thị đúng 5 dòng
    const todayVN = getVietnamTodayString();

    // State & Handlers cho Lịch Sử Phát Mã PMH
    const [historySearch, setHistorySearch] = useState<string>('');
    const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'SENT' | 'REVOKED'>('ALL');
    const [historyPage, setHistoryPage] = useState<number>(1);
    const [historyPageSize, setHistoryPageSize] = useState<number>(5);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast.success(`Đã copy mã: ${code}`);
        setTimeout(() => {
            setCopiedCode(null);
        }, 2000);
    };

    const formatHistoryTime = (isoString?: string) => {
        if (!isoString) return '—';
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return isoString;
            const pad = (n: number) => String(n).padStart(2, '0');
            const day = pad(d.getDate());
            const month = pad(d.getMonth() + 1);
            const year = d.getFullYear();
            const hours = pad(d.getHours());
            const minutes = pad(d.getMinutes());
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch {
            return isoString;
        }
    };

    // Danh sách các coupon đã phát hoặc đã thu hồi
    const sentHistoryCoupons = useMemo(() => {
        return coupons
            .filter(c => c.status === 'SENT' || c.status === 'REVOKED' || Boolean(c.orderId) || Boolean(c.recipient))
            .sort((a, b) => {
                const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                return timeB - timeA;
            });
    }, [coupons]);

    // Tự động quay về trang 1 khi lọc hoặc tìm kiếm lịch sử
    React.useEffect(() => {
        setHistoryPage(1);
    }, [historySearch, historyStatusFilter]);

    // Lọc danh sách lịch sử phát mã
    const filteredHistory = useMemo(() => {
        const raw = historySearch.trim().toLowerCase();
        return sentHistoryCoupons.filter(c => {
            if (historyStatusFilter !== 'ALL' && c.status !== historyStatusFilter) return false;
            if (!raw) return true;
            const searchFields = [
                c.code,
                c.orderId || '',
                c.warehouse || '',
                c.recipient || '',
                c.recipientId || '',
                c.productName || '',
                c.type || '',
                c.syntax || '',
                c.revokeReason || ''
            ].map(s => s.toLowerCase());
            return searchFields.some(f => f.includes(raw));
        });
    }, [sentHistoryCoupons, historySearch, historyStatusFilter]);

    const historyTotalItems = filteredHistory.length;
    const historyTotalPages = Math.max(1, Math.ceil(historyTotalItems / historyPageSize));
    const historySafePage = Math.min(historyPage, historyTotalPages);
    const historyStartIndex = (historySafePage - 1) * historyPageSize;
    const historyEndIndex = Math.min(historyStartIndex + historyPageSize, historyTotalItems);
    const displayedHistory = filteredHistory.slice(historyStartIndex, historyEndIndex);

    const handleExportHistoryExcel = async () => {
        if (filteredHistory.length === 0) {
            toast.error('Không có dữ liệu lịch sử để xuất!');
            return;
        }
        try {
            const XLSX = await import('xlsx');
            const data = filteredHistory.map((c, idx) => ({
                'STT': idx + 1,
                'Thời Gian Phát': formatHistoryTime(c.updatedAt || c.createdAt),
                'Mã Coupon': c.code,
                'Tên Sản Phẩm': c.productName || '',
                'Loại PMH': c.type,
                'Cú Pháp': c.syntax || '',
                'Mã Đơn Hàng': c.orderId || '',
                'Mã Kho': c.warehouse || '',
                'Người Nhận': c.recipient || '',
                'LINE User ID': c.recipientId || '',
                'Trạng Thái': c.status === 'SENT' ? 'Đã phát' : (c.status === 'REVOKED' ? 'Đã thu hồi' : 'Chưa dùng'),
                'Lý Do Thu Hồi': c.revokeReason || '',
                'Thời Gian Thu Hồi': c.revokedAt ? formatHistoryTime(c.revokedAt) : ''
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Lịch Sử Phát PMH');
            XLSX.writeFile(wb, `Lich_Su_Phat_PMH_${new Date().toISOString().slice(0, 10)}.xlsx`);
            toast.success('Đã xuất file Excel lịch sử phát mã!');
        } catch (err: any) {
            toast.error('Lỗi khi xuất Excel: ' + (err.message || 'Thất bại'));
        }
    };

    // Xử lý xoá toàn bộ kho mã
    const handleConfirmDeleteAll = async () => {
        setIsDeletingAll(true);
        try {
            const count = await onDeleteAllCoupons();
            toast.success(`Đã xoá sạch ${count} mã coupon trong kho!`);
            setIsConfirmDeleteAllOpen(false);
            setCurrentPage(1);
        } catch (error: any) {
            console.error('Lỗi khi xoá tất cả mã:', error);
            toast.error('Lỗi khi xoá tất cả mã: ' + (error.message || 'Thất bại'));
        } finally {
            setIsDeletingAll(false);
        }
    };

    // Tự động quay về trang 1 khi lọc hoặc tìm kiếm
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, typeFilter]);

    const totalItems = filteredCoupons.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const displayedCoupons = filteredCoupons.slice(startIndex, endIndex);

    const isLowStock = stockSummary.unused < 30 && stockSummary.total > 0;

    return (
        <div className="space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng Mã Trong Kho</span>
                        <div className="p-2 bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 rounded-xl">
                            <Ticket size={16} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-slate-800 dark:text-white mt-2">{stockSummary.total}</p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Chưa Dùng (Khả dụng)</span>
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{stockSummary.unused}</p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">Đã Phát Thành Công</span>
                        <div className="p-2 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl">
                            <Clock size={16} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">{stockSummary.sent}</p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Đã Thu Hồi Về Kho</span>
                        <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                            <RotateCcw size={16} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{stockSummary.revoked}</p>
                </div>
            </div>

            {/* Low stock warning banner */}
            {isLowStock && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center gap-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                    <div className="text-xs text-amber-800 dark:text-amber-300">
                        <span className="font-bold">Cảnh báo tồn kho thấp: </span>
                        Hiện tại chỉ còn <strong className="underline">{stockSummary.unused}</strong> mã chưa sử dụng trong kho. Hãy nạp thêm mã để đảm bảo Bot phát mã liên tục.
                    </div>
                </div>
            )}

            {/* Breakdown by Type Pills */}
            {stockSummary.breakdown.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-xs font-semibold text-slate-400 shrink-0">Tồn kho theo loại:</span>
                    {stockSummary.breakdown.map(b => (
                        <div key={b.type} className="px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 shrink-0 shadow-xs">
                            <span className="font-bold text-slate-900 dark:text-white">{b.type}: </span>
                            <span className="text-emerald-600 font-semibold">{b.unused} còn</span>
                            <span className="text-slate-400"> / {b.total}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Controls bar: Toàn bộ nằm trên 1 dòng duy nhất, các nút và input có cùng size h-9 */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-between gap-2.5 overflow-x-auto flex-nowrap">
                {/* Nhóm bộ lọc & tìm kiếm bên trái */}
                <div className="flex items-center gap-2 flex-1 min-w-0 flex-nowrap">
                    <div className="relative flex-1 min-w-[140px] max-w-[280px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Tìm theo mã, MĐH, kho, người nhận..."
                            className="w-full h-9 pl-8.5 pr-7 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="h-9 px-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="UNUSED">Chưa dùng (Khả dụng)</option>
                        <option value="SENT">Đã phát</option>
                        <option value="REVOKED">Đã thu hồi</option>
                    </select>

                    {availableTypes.length > 0 && (
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="h-9 px-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 dark:text-slate-200 shrink-0 max-w-[150px] truncate cursor-pointer"
                        >
                            <option value="ALL">Tất cả loại PMH</option>
                            {availableTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    )}

                    <Button
                        variant="ghost"
                        onClick={onRefresh}
                        className="h-9 w-9 p-0 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl shrink-0 transition-colors"
                        title="Làm mới"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    </Button>
                </div>

                {/* Nhóm các nút thao tác bên phải - Đồng bộ kích thước h-9 px-3.5 */}
                <div className="flex items-center gap-2 shrink-0 flex-nowrap">
                    <Button
                        variant="ghost"
                        onClick={() => setIsConfirmDeleteAllOpen(true)}
                        disabled={coupons.length === 0 || isDeletingAll}
                        className="h-9 px-3.5 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-900/60 rounded-xl transition-colors disabled:opacity-40 whitespace-nowrap"
                        title="Xoá tất cả mã coupon hiện có trong kho"
                    >
                        <Trash2 size={14} className={isDeletingAll ? 'animate-spin' : ''} />
                        <span>Xoá tất cả ({coupons.length})</span>
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={onExportExcel}
                        className="h-9 px-3.5 flex items-center gap-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors whitespace-nowrap"
                    >
                        <Download size={14} />
                        <span>Xuất Excel</span>
                    </Button>

                    <Button
                        variant="primary"
                        onClick={() => setIsImportModalOpen(true)}
                        className="h-9 px-3.5 flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors whitespace-nowrap"
                    >
                        <Plus size={15} />
                        <span>Nạp mã mới</span>
                    </Button>
                </div>
            </div>

            {/* Coupons Table */}
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-700/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-2 pl-3.5 pr-2 w-8 text-center">#</th>
                                <th className="py-2 px-2.5">Mã Coupon</th>
                                <th className="py-2 px-2.5 min-w-[200px]">Sản Phẩm & Cú Pháp</th>
                                <th className="py-2 px-2.5">Loại PMH</th>
                                <th className="py-2 px-2.5">Hạn Dùng</th>
                                <th className="py-2 px-2.5">Trạng Thái</th>
                                <th className="py-2 px-2.5">MĐH / Kho</th>
                                <th className="py-2 px-2.5">Người Nhận</th>
                                <th className="py-2 px-2.5">Cập Nhật</th>
                                <th className="py-2 pr-3.5 pl-2 text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium">
                            {filteredCoupons.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                                        {isLoading ? 'Đang tải dữ liệu...' : 'Không tìm thấy mã coupon nào trong kho.'}
                                    </td>
                                </tr>
                            ) : (
                                displayedCoupons.map((c, idx) => (
                                    <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="py-1.5 pl-3.5 pr-2 text-center text-slate-400 font-mono text-[10px] w-8">
                                            {startIndex + idx + 1}
                                        </td>
                                        <td className="py-1.5 px-2.5 font-mono font-bold text-xs text-slate-900 dark:text-white select-all whitespace-nowrap">
                                            {c.code}
                                        </td>
                                        <td className="py-1.5 px-2.5">
                                            {c.productName ? (
                                                <div className="max-w-[220px] leading-tight">
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate text-xs" title={c.productName}>
                                                        {c.productName}
                                                    </span>
                                                    {c.syntax && (
                                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono block truncate mt-0.5" title={c.syntax}>
                                                            {c.syntax}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : c.syntax ? (
                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono block truncate max-w-[220px]" title={c.syntax}>
                                                    {c.syntax}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-600">—</span>
                                            )}
                                        </td>
                                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                                                {c.type}
                                            </span>
                                        </td>
                                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                                            {c.expiryDate ? (
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                                                        c.expiryDate === todayVN
                                                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
                                                            : c.expiryDate < todayVN
                                                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                                            : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
                                                    }`}
                                                    title={
                                                        c.expiryDate === todayVN
                                                            ? 'Hôm nay hết hạn (tự xoá khi sang ngày mới)'
                                                            : `Hạn dùng đến hết ngày ${formatDisplayDate(c.expiryDate)}`
                                                    }
                                                >
                                                    <Calendar size={11} className={c.expiryDate === todayVN ? 'text-amber-600' : 'text-slate-400'} />
                                                    <span>{formatDisplayDate(c.expiryDate)}</span>
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 text-[10px]">Vô thời hạn</span>
                                            )}
                                        </td>
                                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                                            {c.status === 'UNUSED' || !c.status ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                                                    Chưa dùng
                                                </span>
                                            ) : c.status === 'SENT' ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400">
                                                    Đã phát
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                                                    Thu hồi
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
                                            {c.orderId ? (
                                                <div className="leading-tight">
                                                    <span className="font-bold text-slate-800 dark:text-white text-xs">{c.orderId}</span>
                                                    {c.warehouse && <span className="text-slate-400 block text-[9px]">Kho: {c.warehouse}</span>}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-600">—</span>
                                            )}
                                        </td>
                                        <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {c.recipient ? (
                                                <div className="leading-tight">
                                                    <span className="font-semibold text-slate-800 dark:text-white text-xs">{c.recipient}</span>
                                                    {c.recipientId && <span className="text-slate-400 block font-mono text-[9px] truncate max-w-[90px]">{c.recipientId}</span>}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-600">—</span>
                                            )}
                                        </td>
                                        <td className="py-1.5 px-2.5 text-slate-400 text-[10px] font-mono whitespace-nowrap">
                                            {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                        <td className="py-1.5 pr-3.5 pl-2 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                {c.status === 'SENT' && (
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => onRevokeCoupon(c.id)}
                                                        className="p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded"
                                                        title="Thu hồi về kho"
                                                    >
                                                        <RotateCcw size={13} />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => onDeleteCoupon(c.id)}
                                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
                                                    title="Xoá mã này"
                                                >
                                                    <Trash2 size={13} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Thanh phân trang Pagination Bar - Mặc định 5 dòng */}
                {filteredCoupons.length > 0 && (
                    <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <span>
                                Hiển thị <strong className="text-slate-800 dark:text-white font-bold">{startIndex + 1} - {endIndex}</strong> trong <strong className="text-slate-800 dark:text-white font-bold">{totalItems}</strong> mã
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px]">Xem:</span>
                                <select
                                    value={pageSize}
                                    onChange={e => {
                                        setPageSize(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="py-1 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                >
                                    <option value={5}>5 dòng</option>
                                    <option value={10}>10 dòng</option>
                                    <option value={20}>20 dòng</option>
                                    <option value={50}>50 dòng</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="ghost"
                                onClick={() => setCurrentPage(1)}
                                disabled={safePage <= 1}
                                className="px-2 py-1 text-xs rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                                title="Về trang đầu"
                            >
                                &laquo;
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={safePage <= 1}
                                className="px-2.5 py-1 text-xs rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                            >
                                Trước
                            </Button>
                            <span className="px-3 py-1 font-bold text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs font-mono">
                                {safePage} / {totalPages}
                            </span>
                            <Button
                                variant="ghost"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={safePage >= totalPages}
                                className="px-2.5 py-1 text-xs rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                            >
                                Sau
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={safePage >= totalPages}
                                className="px-2 py-1 text-xs rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                                title="Đến trang cuối"
                            >
                                &raquo;
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* PHÂN HỆ: LỊCH SỬ PHÁT MÃ PMH (BÊN DƯỚI KHO MÃ) */}
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
                {/* Header & Thanh công cụ Lịch Sử Phát Mã */}
                <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                            <History size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Lịch Sử Phát Mã PMH</h3>
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                                    {sentHistoryCoupons.length} lượt phát
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Ghi nhận chi tiết các mã PMH đã được Bot LINE hoặc Quản lý cấp cho nhân viên & đơn hàng
                            </p>
                        </div>
                    </div>

                    {/* Thanh tìm kiếm & lọc trên 1 dòng */}
                    <div className="w-full md:w-auto flex items-center gap-2 overflow-x-auto flex-nowrap pb-1 md:pb-0">
                        <div className="relative min-w-[200px] flex-1 md:w-64 shrink-0">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={historySearch}
                                onChange={e => setHistorySearch(e.target.value)}
                                placeholder="Tìm mã, MĐH, người nhận, kho..."
                                className="w-full h-9 pl-8.5 pr-7 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                            />
                            {historySearch && (
                                <button
                                    onClick={() => setHistorySearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <select
                            value={historyStatusFilter}
                            onChange={e => setHistoryStatusFilter(e.target.value as any)}
                            className="h-9 px-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer"
                        >
                            <option value="ALL">Tất cả trạng thái ({sentHistoryCoupons.length})</option>
                            <option value="SENT">Đã phát ({sentHistoryCoupons.filter(c => c.status === 'SENT').length})</option>
                            <option value="REVOKED">Đã thu hồi ({sentHistoryCoupons.filter(c => c.status === 'REVOKED').length})</option>
                        </select>

                        <Button
                            variant="ghost"
                            onClick={handleExportHistoryExcel}
                            disabled={sentHistoryCoupons.length === 0}
                            className="h-9 px-3.5 flex items-center gap-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors whitespace-nowrap shrink-0 disabled:opacity-40"
                            title="Xuất lịch sử phát mã ra Excel"
                        >
                            <Download size={14} />
                            <span>Xuất Excel</span>
                        </Button>
                    </div>
                </div>

                {/* Bảng dữ liệu Lịch Sử Phát Mã */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                                <th className="py-2.5 pl-3.5 pr-2 w-10 text-center">#</th>
                                <th className="py-2.5 px-2.5 whitespace-nowrap">Thời Gian Phát</th>
                                <th className="py-2.5 px-2.5 whitespace-nowrap">Mã Coupon</th>
                                <th className="py-2.5 px-2.5 min-w-[200px]">Sản Phẩm & Cú Pháp</th>
                                <th className="py-2.5 px-2.5 whitespace-nowrap">Loại PMH</th>
                                <th className="py-2.5 px-2.5 whitespace-nowrap">MĐH Áp Dụng</th>
                                <th className="py-2.5 px-2.5 whitespace-nowrap">Kho</th>
                                <th className="py-2.5 px-2.5 whitespace-nowrap">Người Nhận</th>
                                <th className="py-2.5 px-2.5 whitespace-nowrap text-center">Trạng Thái</th>
                                <th className="py-2.5 pr-3.5 pl-2 whitespace-nowrap text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {displayedHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-10 text-center text-slate-400">
                                        <History size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                                        <p className="font-semibold text-slate-600 dark:text-slate-400 text-xs">
                                            {sentHistoryCoupons.length === 0
                                                ? 'Chưa có lịch sử phát mã nào trong kho'
                                                : 'Không tìm thấy kết quả phù hợp với từ khoá tìm kiếm'}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {sentHistoryCoupons.length === 0
                                                ? 'Khi Bot LINE hoặc Quản lý cấp phát mã cho nhân viên, thông tin sẽ tự động hiển thị tại đây.'
                                                : 'Vui lòng thử tìm với từ khoá khác hoặc chọn lại bộ lọc.'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                displayedHistory.map((c, idx) => {
                                    const rowNum = historyStartIndex + idx + 1;
                                    return (
                                        <tr
                                            key={c.id}
                                            className="hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors group"
                                        >
                                            <td className="py-2 pl-3.5 pr-2 font-mono text-[11px] text-slate-400 text-center">
                                                {rowNum}
                                            </td>
                                            <td className="py-2 px-2.5 text-slate-600 dark:text-slate-300 font-mono text-[11px] whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={12} className="text-slate-400 shrink-0" />
                                                    <span>{formatHistoryTime(c.updatedAt || c.createdAt)}</span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-2.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono font-bold text-slate-900 dark:text-white tracking-wide select-all text-xs bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-600/80">
                                                        {c.code}
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopyCode(c.code)}
                                                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                                                        title="Copy mã coupon"
                                                    >
                                                        {copiedCode === c.code ? (
                                                            <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                                                        ) : (
                                                            <Copy size={12} />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-2 px-2.5">
                                                <div className="leading-tight">
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1 text-xs" title={c.productName}>
                                                        {c.productName || '—'}
                                                    </span>
                                                    {c.syntax && (
                                                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                                            {c.syntax}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-2 px-2.5 whitespace-nowrap">
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                    {c.type}
                                                </span>
                                            </td>
                                            <td className="py-2 px-2.5 text-slate-800 dark:text-slate-200 font-mono font-bold whitespace-nowrap text-xs">
                                                {c.orderId ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                                                        {c.orderId}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-600">—</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-2.5 text-slate-600 dark:text-slate-300 font-mono text-xs whitespace-nowrap">
                                                {c.warehouse ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 font-semibold">
                                                        Kho {c.warehouse}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-600">—</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-2.5 text-slate-700 dark:text-slate-200 whitespace-nowrap text-xs">
                                                {c.recipient ? (
                                                    <div className="leading-tight">
                                                        <span className="font-semibold text-slate-800 dark:text-white">{c.recipient}</span>
                                                        {c.recipientId && (
                                                            <span className="text-slate-400 block font-mono text-[9px] truncate max-w-[110px]" title={c.recipientId}>
                                                                {c.recipientId}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-600">—</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-2.5 whitespace-nowrap text-center">
                                                {c.status === 'SENT' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                                                        <Clock size={10} /> Đã phát
                                                    </span>
                                                ) : c.status === 'REVOKED' ? (
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                                                            <RotateCcw size={10} /> Đã thu hồi
                                                        </span>
                                                        {c.revokeReason && (
                                                            <span className="text-[9px] text-amber-600/80 dark:text-amber-400/80 truncate max-w-[100px] mt-0.5" title={c.revokeReason}>
                                                                {c.revokeReason}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-600">—</span>
                                                )}
                                            </td>
                                            <td className="py-2 pr-3.5 pl-2 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => handleCopyCode(c.code)}
                                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                                                        title="Copy mã coupon"
                                                    >
                                                        <Copy size={13} />
                                                    </Button>
                                                    {c.status === 'SENT' && (
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => onRevokeCoupon(c.id)}
                                                            className="p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition-colors"
                                                            title="Thu hồi mã về kho (Khả dụng lại)"
                                                        >
                                                            <RotateCcw size={13} />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => onDeleteCoupon(c.id)}
                                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                                                        title="Xoá vĩnh viễn"
                                                    >
                                                        <Trash2 size={13} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Phân trang Pagination Bar cho Lịch Sử Phát Mã */}
                {filteredHistory.length > 0 && (
                    <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <span>
                                Hiển thị <strong className="text-slate-800 dark:text-white font-bold">{historyStartIndex + 1} - {historyEndIndex}</strong> trong <strong className="text-slate-800 dark:text-white font-bold">{historyTotalItems}</strong> lượt phát
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px]">Xem:</span>
                                <select
                                    value={historyPageSize}
                                    onChange={e => {
                                        setHistoryPageSize(Number(e.target.value));
                                        setHistoryPage(1);
                                    }}
                                    className="py-1 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                >
                                    <option value={5}>5 dòng</option>
                                    <option value={10}>10 dòng</option>
                                    <option value={20}>20 dòng</option>
                                    <option value={50}>50 dòng</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="ghost"
                                onClick={() => setHistoryPage(1)}
                                disabled={historySafePage <= 1}
                                className="px-2 py-1 text-xs rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                                title="Về trang đầu"
                            >
                                &laquo;
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                                disabled={historySafePage <= 1}
                                className="px-2.5 py-1 text-xs rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                            >
                                Trước
                            </Button>
                            <span className="px-3 py-1 font-bold text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs font-mono">
                                {historySafePage} / {historyTotalPages}
                            </span>
                            <Button
                                variant="ghost"
                                onClick={() => setHistoryPage(prev => Math.min(historyTotalPages, prev + 1))}
                                disabled={historySafePage >= historyTotalPages}
                                className="px-2.5 py-1 text-xs rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                            >
                                Sau
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setHistoryPage(historyTotalPages)}
                                disabled={historySafePage >= historyTotalPages}
                                className="px-2 py-1 text-xs rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                                title="Đến trang cuối"
                            >
                                &raquo;
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal xác nhận xoá toàn bộ kho mã */}
            {isConfirmDeleteAllOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3.5 text-rose-600 dark:text-rose-400">
                            <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-2xl shrink-0">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Xác Nhận Xoá Tất Cả Mã
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Kho hiện có: <strong className="text-rose-600 dark:text-rose-400 font-bold">{coupons.length} mã coupon</strong>
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-rose-50/50 dark:bg-rose-950/20 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
                            Hành động này sẽ <strong>xoá vĩnh viễn toàn bộ {coupons.length} mã coupon</strong> trong kho của bạn khỏi cơ sở dữ liệu. Sau khi xoá sẽ không thể khôi phục lại. Bạn có chắc chắn muốn thực hiện?
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                variant="ghost"
                                onClick={() => setIsConfirmDeleteAllOpen(false)}
                                disabled={isDeletingAll}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl"
                            >
                                Huỷ bỏ
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleConfirmDeleteAll}
                                disabled={isDeletingAll}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm disabled:opacity-50"
                            >
                                {isDeletingAll ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                <span>{isDeletingAll ? 'Đang xoá...' : 'Đồng ý xoá tất cả'}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isImportModalOpen && (
                <CouponImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={onImportCoupons}
                    existingTypes={availableTypes}
                    coupons={coupons}
                    onDeleteBatch={onDeleteCouponsBatch}
                />
            )}
        </div>
    );
};
