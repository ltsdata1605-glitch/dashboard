import React, { useState } from 'react';
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
    onCopyCoupon?: (id: string) => void;
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
    onRefresh,
    onCopyCoupon
}) => {
    const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
    const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState<boolean>(false);
    const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(5); // Mặc định hiển thị đúng 5 dòng
    const todayVN = getVietnamTodayString();

    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const handleCopyCode = (couponId: string, code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast.success(`Đã copy mã: ${code}`);
        onCopyCoupon?.(couponId);
        setTimeout(() => {
            setCopiedCode(null);
        }, 2000);
    };

    const formatDateTime = (isoString?: string) => {
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

    // ---- Mảnh hiển thị dùng CHUNG cho bảng (≥ md) và thẻ mobile — tránh 2 bản chép (mobile 2026-09-21) ----
    const renderCopyButton = (c: Coupon, compact = false) => (
        <>
        <button
            type="button"
            onClick={() => handleCopyCode(c.id, c.code)}
            title={`Bấm để copy mã: ${c.code}`}
            className={`inline-flex items-center justify-center gap-1.5 ${compact ? 'h-9 px-3 font-mono tracking-wide' : 'px-3 py-1'} rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                copiedCode === c.code
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 dark:hover:bg-slate-700'
            }`}
        >
            {copiedCode === c.code ? (
                <>
                    <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Đã copy</span>
                </>
            ) : (
                <>
                    <Copy size={12} className="text-slate-400" />
                    <span>{compact ? c.code : 'Copy'}</span>
                </>
            )}
        </button>
        </>
    );
    const renderProduct = (c: Coupon) => (
        <>
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
        </>
    );
    const renderType = (c: Coupon) => (
        <>
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
            {c.type}
        </span>
        </>
    );
    const renderExpiry = (c: Coupon) => (
        <>
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
        </>
    );
    const renderStatus = (c: Coupon) => (
        <>
        {c.status === 'UNUSED' || !c.status ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={10} />
                Chưa dùng
            </span>
        ) : c.status === 'SENT' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400">
                <Clock size={10} />
                Đã phát
            </span>
        ) : (
            <div className="leading-tight">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400" title={c.revokeReason || 'Đã thu hồi về kho'}>
                    <RotateCcw size={10} />
                    Đã thu hồi
                </span>
                {c.revokeReason && (
                    <span className="text-[9px] text-amber-600 dark:text-amber-400/80 block mt-0.5 truncate max-w-[110px]" title={c.revokeReason}>
                        {c.revokeReason}
                    </span>
                )}
            </div>
        )}
        </>
    );
    const renderRecipient = (c: Coupon) => (
        <>
        {c.recipient ? (
            <div className="leading-tight">
                <span className="font-semibold text-slate-800 dark:text-white text-xs">{c.recipient}</span>
                {c.recipientId && <span className="text-slate-400 block font-mono text-[9px] truncate max-w-[90px]" title={c.recipientId}>ID: {c.recipientId}</span>}
            </div>
        ) : (
            <span className="text-slate-300 dark:text-slate-600">—</span>
        )}
        </>
    );
    const renderCopiedAt = (c: Coupon) => (
        <>
        {c.copiedAt ? (
            <span
                className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60"
                title={`Đã copy mã lúc: ${formatDateTime(c.copiedAt)}`}
            >
                <Clock size={10} className="text-emerald-500" />
                {formatDateTime(c.copiedAt)}
            </span>
        ) : (
            <span className="text-slate-300 dark:text-slate-600">—</span>
        )}
        </>
    );
    const renderActions = (c: Coupon, compact = false) => (
        <>
        <div className="flex items-center justify-end gap-1">
            {c.status === 'SENT' && (
                <Button
                    variant="ghost"
                        size={compact ? 'icon' : 'md'}
                    onClick={() => onRevokeCoupon(c.id)}
                    className={`${compact ? '' : 'p-1'} text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition-colors`}
                    title="Thu hồi về kho"
                >
                    <RotateCcw size={compact ? 16 : 13} />
                </Button>
            )}
            <Button
                variant="ghost"
                        size={compact ? 'icon' : 'md'}
                onClick={() => handleCopyCode(c.id, c.code)}
                className={`${compact ? '' : 'p-1'} text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors`}
                title={`Copy mã: ${c.code}`}
            >
                {copiedCode === c.code ? <Check size={compact ? 16 : 13} className="text-emerald-600" /> : <Copy size={compact ? 16 : 13} />}
            </Button>
            <Button
                variant="ghost"
                        size={compact ? 'icon' : 'md'}
                onClick={() => onDeleteCoupon(c.id)}
                className={`${compact ? '' : 'p-1'} text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors`}
                title="Xoá mã này"
            >
                <Trash2 size={compact ? 16 : 13} />
            </Button>
        </div>
        </>
    );

    return (
        <div className="space-y-5">
            {/* KPI Cards - Bấm trực tiếp để chuyển bộ lọc trạng thái */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        statusFilter === 'ALL'
                            ? 'bg-slate-50 dark:bg-slate-800/90 border-slate-400 dark:border-slate-500 ring-2 ring-slate-400/40 shadow-sm'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] sm:text-xs font-semibold leading-tight text-slate-500 dark:text-slate-400">Tổng Mã Trong Kho</span>
                        <div className="p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 rounded-xl shrink-0">
                            <Ticket size={16} />
                        </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-1 sm:mt-2 tabular-nums">{stockSummary.total}</p>
                </button>

                <button
                    type="button"
                    onClick={() => setStatusFilter('UNUSED')}
                    className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        statusFilter === 'UNUSED'
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] sm:text-xs font-semibold leading-tight text-emerald-600 dark:text-emerald-400">Chưa Dùng (Khả dụng)</span>
                        <div className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 sm:mt-2 tabular-nums">{stockSummary.unused}</p>
                </button>

                <button
                    type="button"
                    onClick={() => setStatusFilter('SENT')}
                    className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        statusFilter === 'SENT'
                            ? 'bg-sky-50/50 dark:bg-sky-950/30 border-sky-500 ring-2 ring-sky-500/40 shadow-sm'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-sky-300 dark:hover:border-sky-700 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] sm:text-xs font-semibold leading-tight text-sky-600 dark:text-sky-400">Đã Phát Thành Công</span>
                        <div className="p-1.5 sm:p-2 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl shrink-0">
                            <Clock size={16} />
                        </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 sm:mt-2 tabular-nums">{stockSummary.sent}</p>
                </button>

                <button
                    type="button"
                    onClick={() => setStatusFilter('REVOKED')}
                    className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        statusFilter === 'REVOKED'
                            ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/40 shadow-sm'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-amber-300 dark:hover:border-amber-700 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] sm:text-xs font-semibold leading-tight text-amber-600 dark:text-amber-400">Đã Thu Hồi Về Kho</span>
                        <div className="p-1.5 sm:p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                            <RotateCcw size={16} />
                        </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 sm:mt-2 tabular-nums">{stockSummary.revoked}</p>
                </button>
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

            {/* Controls bar: Tự động co giãn theo màn hình, đồng bộ chiều cao h-9 */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-wrap xl:flex-nowrap items-center justify-between gap-2.5">
                {/* Nhóm bộ lọc & tìm kiếm bên trái */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
                    <div className="relative w-full sm:w-[210px] shrink-0">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Tìm mã, MĐH, người nhận..."
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

                    {/* Quick Segmented Tabs Lọc Trạng Thái Nhanh */}
                    <div className="hidden sm:inline-flex p-0.5 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('ALL')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                statusFilter === 'ALL'
                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            Tất cả ({stockSummary.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('UNUSED')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                statusFilter === 'UNUSED'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Chưa dùng ({stockSummary.unused})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('SENT')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                statusFilter === 'SENT'
                                    ? 'bg-sky-600 text-white shadow-xs'
                                    : 'text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                            Đã phát ({stockSummary.sent})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('REVOKED')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                statusFilter === 'REVOKED'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            Thu hồi ({stockSummary.revoked})
                        </button>
                    </div>

                    {/* Mobile dropdown selector */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="sm:hidden h-9 px-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer"
                    >
                        <option value="ALL">Tất cả ({stockSummary.total})</option>
                        <option value="UNUSED">Chưa dùng ({stockSummary.unused})</option>
                        <option value="SENT">Đã phát ({stockSummary.sent})</option>
                        <option value="REVOKED">Đã thu hồi ({stockSummary.revoked})</option>
                    </select>

                    {availableTypes.length > 0 && (
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="h-9 px-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 dark:text-slate-200 shrink-0 max-w-[125px] truncate cursor-pointer"
                        >
                            <option value="ALL">Tất cả loại</option>
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

                {/* Nhóm các nút thao tác bên phải */}
                <div className="flex items-center gap-2 shrink-0 flex-nowrap">
                    <Button
                        variant="ghost"
                        onClick={() => setIsConfirmDeleteAllOpen(true)}
                        disabled={coupons.length === 0 || isDeletingAll}
                        className="h-9 w-9 p-0 flex items-center justify-center text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-900/60 rounded-xl transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
                        title={`Xoá tất cả (${coupons.length}) mã trong kho`}
                    >
                        <Trash2 size={15} className={isDeletingAll ? 'animate-spin' : ''} />
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={onExportExcel}
                        className="h-9 w-9 p-0 flex items-center justify-center text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl transition-colors shrink-0 cursor-pointer"
                        title="Xuất danh sách ra file Excel"
                    >
                        <Download size={15} />
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

            {/* Unified Coupons Table - Bảng Quản Lý Mã & Lịch Sử Hợp Nhất */}
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
                {/* MOBILE (< md): danh sách thẻ — bảng 9 cột tràn ngang không dùng được trên điện thoại */}
                <div className="md:hidden">
                    {filteredCoupons.length === 0 ? (
                        <div className="py-10 px-4 text-center text-slate-400 text-xs">
                            <p className="font-semibold text-slate-600 dark:text-slate-400">
                                {isLoading ? 'Đang tải dữ liệu...' : 'Không tìm thấy mã coupon nào phù hợp với bộ lọc.'}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                                {searchQuery ? 'Hãy thử tìm kiếm bằng từ khoá khác hoặc đặt lại bộ lọc.' : 'Hãy nạp mã coupon mới để sử dụng.'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/70" data-testid="coupon-cards">
                            {displayedCoupons.map((c, idx) => (
                                <div key={c.id} className={`px-3 py-2.5 space-y-1.5 ${c.status === 'REVOKED' ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 shrink-0 text-center text-[11px] font-mono text-slate-400">{startIndex + idx + 1}</span>
                                        {renderCopyButton(c, true)}
                                        <div className="ml-auto flex items-center gap-0.5 shrink-0">{renderActions(c, true)}</div>
                                    </div>
                                    <div className="pl-7 [&>div]:max-w-none [&_span]:text-[13px] [&_.font-mono]:text-[11px] [&_.truncate]:whitespace-normal [&_.truncate]:line-clamp-2">{renderProduct(c)}</div>
                                    <div className="pl-7 flex flex-wrap items-center gap-1.5">
                                        {renderType(c)}
                                        {renderStatus(c)}
                                        {renderExpiry(c)}
                                    </div>
                                    {(c.recipient || c.copiedAt) && (
                                        <div className="pl-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                                            {c.recipient && <span className="text-slate-600 dark:text-slate-300">👤 <b className="text-slate-800 dark:text-white">{c.recipient}</b></span>}
                                            {c.copiedAt && <span>{renderCopiedAt(c)}</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-700/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-2.5 pl-3.5 pr-2 w-8 text-center">#</th>
                                <th className="py-2.5 px-2.5 text-center whitespace-nowrap w-24">Mã Coupon</th>
                                <th className="py-2.5 px-2.5 min-w-[200px]">Sản Phẩm</th>
                                <th className="py-2.5 px-2.5">Loại PMH</th>
                                <th className="py-2.5 px-2.5">Hạn Dùng</th>
                                <th className="py-2.5 px-2.5">Trạng Thái</th>
                                <th className="py-2.5 px-2.5">Người Nhận</th>
                                <th className="py-2.5 px-2.5">Thời Gian Copy</th>
                                <th className="py-2.5 pr-3.5 pl-2 text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium">
                            {filteredCoupons.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                                        <p className="font-semibold text-slate-600 dark:text-slate-400">
                                            {isLoading ? 'Đang tải dữ liệu...' : 'Không tìm thấy mã coupon nào phù hợp với bộ lọc.'}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            {searchQuery ? 'Hãy thử tìm kiếm bằng từ khoá khác hoặc đặt lại bộ lọc.' : 'Hãy nạp mã coupon mới để sử dụng.'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                displayedCoupons.map((c, idx) => (
                                    <tr
                                        key={c.id}
                                        className={`transition-colors ${
                                            c.status === 'REVOKED'
                                                ? 'bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40 dark:hover:bg-amber-950/20'
                                                : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <td className="py-2 pl-3.5 pr-2 text-center text-slate-400 font-mono text-[10px] w-8">
                                            {startIndex + idx + 1}
                                        </td>
                                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                                            {renderCopyButton(c)}
                                        </td>
                                        <td className="py-2 px-2.5">
                                            {renderProduct(c)}
                                        </td>
                                        <td className="py-2 px-2.5 whitespace-nowrap">
                                            {renderType(c)}
                                        </td>
                                        <td className="py-2 px-2.5 whitespace-nowrap">
                                            {renderExpiry(c)}
                                        </td>
                                        <td className="py-2 px-2.5 whitespace-nowrap">
                                            {renderStatus(c)}
                                        </td>
                                        <td className="py-2 px-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {renderRecipient(c)}
                                        </td>
                                        <td className="py-2 px-2.5 text-[10px] font-mono whitespace-nowrap">
                                            {renderCopiedAt(c)}
                                        </td>
                                        <td className="py-2 pr-3.5 pl-2 text-right whitespace-nowrap">
                                            {renderActions(c)}
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
