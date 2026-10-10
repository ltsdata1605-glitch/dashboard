import React, { useState } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';

import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import { Coupon, CouponStatus, StockSummaryItem, ParsedImportItem } from '../types/lineBot.types';
import { CouponImportModal } from './CouponImportModal';
import { formatDisplayDate, getVietnamTodayString, getCouponCategoryMeta } from '../services/couponParser';

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
    onRestoreRevokedCoupons?: () => Promise<number>;
    onReclassifyCoupons?: () => Promise<number>;
    onDeleteCoupon: (id: string) => Promise<void>;
    onDeleteCouponsBatch?: (couponIds: string[]) => Promise<number>;
    onUpdateCouponsBatch?: (
        couponIds: string[],
        updates: Partial<Pick<Coupon, 'productName' | 'syntax' | 'type' | 'expiryDate' | 'status'>>
    ) => Promise<number>;
    onUpdateCouponsDetailed?: (
        items: Array<{ id: string; changes: Partial<Pick<Coupon, 'code' | 'productName' | 'syntax' | 'type' | 'expiryDate' | 'status'>> }>
    ) => Promise<number>;
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
    onRestoreRevokedCoupons,
    onReclassifyCoupons,
    onDeleteCoupon,
    onDeleteCouponsBatch,
    onUpdateCouponsBatch,
    onUpdateCouponsDetailed,
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
    // Hộp xác nhận xoá toàn bộ (tự dựng — audit A34): hành vi modal chuẩn; không đóng khi đang xoá.

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
            className={`inline-flex items-center justify-center gap-1.5 ${compact ? 'h-6 px-2 font-mono text-[11px]' : 'h-6.5 px-2.5 font-mono text-xs'} font-semibold rounded-md border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                copiedCode === c.code
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-300 dark:hover:bg-slate-700'
            }`}
        >
            {copiedCode === c.code ? (
                <>
                    <AppIcon name="check" size="xs" className="text-emerald-600" />
                    <span>Đã copy</span>
                </>
            ) : (
                <>
                    <AppIcon name="copy" size="xs" className="text-slate-400" />
                    <span className="tracking-wide">{c.code}</span>
                </>
            )}
        </button>
        </>
    );
    const renderProduct = (c: Coupon) => (
        <>
        {c.productName ? (
            <div className="max-w-[220px] lg:max-w-[360px] leading-tight">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate text-xs" title={c.productName}>
                    {c.productName}
                </span>
                {c.syntax && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono block truncate mt-0.5" title={c.syntax}>
                        {c.syntax}
                    </span>
                )}
            </div>
        ) : c.syntax ? (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono block truncate max-w-[220px] lg:max-w-[360px]" title={c.syntax}>
                {c.syntax}
            </span>
        ) : (
            <span className="text-slate-300 dark:text-slate-600">—</span>
        )}
        </>
    );
    const renderType = (c: Coupon) => {
        const meta = getCouponCategoryMeta(c);
        let badgeColor = 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300';
        if (meta.id === 'VIVO') {
            badgeColor = 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700';
        } else if (meta.id === 'EVENT') {
            badgeColor = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
        } else if (meta.id === 'GVGS') {
            badgeColor = 'bg-emerald-200 text-emerald-800 border border-emerald-400';
        } else if (meta.id === 'HONOR') {
            badgeColor = 'bg-sky-200 text-sky-800 border border-sky-400';
        } else if (meta.id === 'SAMSUNG') {
            badgeColor = 'bg-rose-100 text-rose-700 border border-rose-300';
        } else if (meta.id === 'APPLE') {
            badgeColor = 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600';
        } else if (meta.id === 'OPPO') {
            badgeColor = 'bg-amber-200 text-amber-800 border border-amber-400';
        } else if (meta.id === 'XIAOMI') {
            badgeColor = 'bg-amber-100 text-amber-700 border border-amber-300';
        }

        const displayType = (c.type && c.type !== 'Event' && c.type !== 'PMH') ? c.type : meta.name;

        return (
            <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${badgeColor}`}
                title={`Nhóm: ${meta.title} (Cú pháp xin: ${meta.prefix}1, ${meta.prefix}2...)`}
            >
                {displayType}
            </span>
        );
    };
    const renderExpiry = (c: Coupon) => (
        <>
        {c.expiryDate ? (
            <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
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
                <AppIcon name="calendar" size="xs" className={c.expiryDate === todayVN ? 'text-amber-600' : 'text-slate-400'} />
                <span>{formatDisplayDate(c.expiryDate)}</span>
            </span>
        ) : (
            <span className="text-slate-400 dark:text-slate-500 text-[11px]">Vô thời hạn</span>
        )}
        </>
    );
    const renderStatus = (c: Coupon) => (
        <>
        {c.status === 'UNUSED' || !c.status ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <AppIcon name="success" size="xs" />
                Chưa dùng
            </span>
        ) : c.status === 'SENT' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400">
                <AppIcon name="clock" size="xs" />
                Đã phát
            </span>
        ) : (
            <div className="leading-tight">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400" title={c.revokeReason || 'Đã thu hồi về kho'}>
                    <AppIcon name="reset" size="xs" />
                    Đã thu hồi
                </span>
                {c.revokeReason && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400/80 block mt-0.5 truncate max-w-[110px]" title={c.revokeReason}>
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
                {c.recipientId && <span className="text-slate-400 block font-mono text-[11px] truncate max-w-[90px]" title={c.recipientId}>ID: {c.recipientId}</span>}
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
                <AppIcon name="clock" size="xs" className="text-emerald-500" />
                {formatDateTime(c.copiedAt)}
            </span>
        ) : (
            <span className="text-slate-300 dark:text-slate-600">—</span>
        )}
        </>
    );
    const renderActions = (c: Coupon, compact = false) => (
        <>
        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
            {(c.status === 'SENT' || c.status === 'REVOKED') && (
                <Button
                    variant="ghost"
                    size="none"
                    onClick={() => onRevokeCoupon(c.id, c.status === 'REVOKED' ? 'Khôi phục về Chưa dùng' : 'Quản lý thu hồi về kho')}
                    className={`${compact ? 'h-7 w-7' : 'h-7 w-7 p-0'} flex items-center justify-center text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-md transition-all active:scale-95 cursor-pointer`}
                    title={c.status === 'REVOKED' ? 'Khôi phục về Chưa dùng (Khả dụng)' : 'Thu hồi về kho'}
                >
                    <AppIcon name={c.status === 'REVOKED' ? 'check' : 'reset'} size="sm" />
                </Button>
            )}
            <Button
                variant="ghost"
                size="none"
                onClick={() => handleCopyCode(c.id, c.code)}
                className={`${compact ? 'h-7 w-7' : 'h-7 w-7 p-0'} flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-700 rounded-md transition-all active:scale-95 cursor-pointer`}
                title={`Copy mã: ${c.code}`}
            >
                {copiedCode === c.code ? <AppIcon name="check" size="sm" className="text-emerald-600" /> : <AppIcon name="copy" size="sm" />}
            </Button>
            <Button
                variant="ghost"
                size="none"
                onClick={() => onDeleteCoupon(c.id)}
                className={`${compact ? 'h-7 w-7' : 'h-7 w-7 p-0'} flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-all active:scale-95 cursor-pointer`}
                title="Xoá mã này"
            >
                <AppIcon name="delete" size="sm" />
            </Button>
        </div>
        </>
    );

    return (
        <div className="space-y-2.5 sm:space-y-3.5">
            {/* KPI Cards - Bấm trực tiếp để chuyển bộ lọc trạng thái (Micro KPI chuẩn Report BI) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2.5">
                <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`p-2 sm:p-2.5 lg:p-3 rounded-xl sm:rounded-2xl border border-t-[3px] border-t-slate-400 dark:border-t-slate-500 text-left transition-all cursor-pointer active:scale-[0.98] ${
                        statusFilter === 'ALL'
                            ? 'bg-slate-100/90 dark:bg-slate-800 border-sky-500/80 ring-1 ring-sky-500/30 shadow-2xs'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] sm:text-xs font-semibold leading-tight text-slate-500 dark:text-slate-400 truncate pr-1">Tổng Mã Trong Kho</span>
                        <div className="p-1 sm:p-1.5 bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 rounded-lg shrink-0">
                            <AppIcon name="coupon" size="sm" />
                        </div>
                    </div>
                    <div className="flex items-baseline justify-between gap-1 mt-0.5 sm:mt-1">
                        <p className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{stockSummary.total}</p>
                        <span className="hidden lg:inline-block text-[11px] text-slate-400 font-semibold truncate">Kho toàn bộ PMH</span>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setStatusFilter('UNUSED')}
                    className={`p-2 sm:p-2.5 lg:p-3 rounded-xl sm:rounded-2xl border border-t-[3px] border-t-emerald-500 text-left transition-all cursor-pointer active:scale-[0.98] ${
                        statusFilter === 'UNUSED'
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/30 shadow-2xs'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-2xs'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] sm:text-xs font-semibold leading-tight text-emerald-600 dark:text-emerald-400 truncate pr-1">Chưa Dùng (Khả dụng)</span>
                        <div className="p-1 sm:p-1.5 bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                            <AppIcon name="success" size="sm" />
                        </div>
                    </div>
                    <div className="flex items-baseline justify-between gap-1 mt-0.5 sm:mt-1">
                        <p className="text-base sm:text-xl lg:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">{stockSummary.unused}</p>
                        <span className="hidden lg:inline-block text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-bold">
                            {stockSummary.total ? `${Math.round((stockSummary.unused / stockSummary.total) * 100)}% tổng kho` : '0%'}
                        </span>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setStatusFilter('SENT')}
                    className={`p-2 sm:p-2.5 lg:p-3 rounded-xl sm:rounded-2xl border border-t-[3px] border-t-sky-500 text-left transition-all cursor-pointer active:scale-[0.98] ${
                        statusFilter === 'SENT'
                            ? 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-500 ring-1 ring-sky-500/30 shadow-2xs'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-sky-300 dark:hover:border-sky-700 shadow-2xs'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] sm:text-xs font-semibold leading-tight text-sky-600 dark:text-sky-400 truncate pr-1">Đã Phát Thành Công</span>
                        <div className="p-1 sm:p-1.5 bg-sky-100/80 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-lg shrink-0">
                            <AppIcon name="clock" size="sm" />
                        </div>
                    </div>
                    <div className="flex items-baseline justify-between gap-1 mt-0.5 sm:mt-1">
                        <p className="text-base sm:text-xl lg:text-2xl font-black text-sky-600 dark:text-sky-400 tabular-nums tracking-tight">{stockSummary.sent}</p>
                        <span className="hidden lg:inline-block text-[11px] text-sky-600/80 dark:text-sky-400/80 font-bold">
                            {stockSummary.total ? `${Math.round((stockSummary.sent / stockSummary.total) * 100)}% đã cấp` : '0%'}
                        </span>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setStatusFilter('REVOKED')}
                    className={`p-2 sm:p-2.5 lg:p-3 rounded-xl sm:rounded-2xl border border-t-[3px] border-t-amber-500 text-left transition-all cursor-pointer active:scale-[0.98] ${
                        statusFilter === 'REVOKED'
                            ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/30 shadow-2xs'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-amber-300 dark:hover:border-amber-700 shadow-2xs'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] sm:text-xs font-semibold leading-tight text-amber-600 dark:text-amber-400 truncate pr-1">Đã Thu Hồi Về Kho</span>
                        <div className="p-1 sm:p-1.5 bg-amber-100/80 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
                            <AppIcon name="reset" size="sm" />
                        </div>
                    </div>
                    <div className="flex items-baseline justify-between gap-1 mt-0.5 sm:mt-1">
                        <p className="text-base sm:text-xl lg:text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">{stockSummary.revoked}</p>
                        <span className="hidden lg:inline-block text-[11px] text-amber-600/80 dark:text-amber-400/80 font-bold">
                            {stockSummary.total ? `${Math.round((stockSummary.revoked / stockSummary.total) * 100)}% hoàn kho` : '0%'}
                        </span>
                    </div>
                </button>
            </div>

            {/* Low stock warning banner */}
            {isLowStock && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl flex items-center gap-2.5 shadow-2xs">
                    <AppIcon name="warning" size="md" className="text-amber-600 shrink-0" />
                    <div className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300">
                        <span className="font-bold">Cảnh báo tồn kho thấp: </span>
                        Hiện tại chỉ còn <strong className="underline font-bold">{stockSummary.unused}</strong> mã chưa sử dụng. Hãy nạp thêm mã để đảm bảo phát liên tục.
                    </div>
                </div>
            )}

            {/* Revoked coupons restore banner */}
            {stockSummary.revoked > 0 && (
                <div className="p-2.5 bg-sky-50 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2">
                        <AppIcon name="info" size="md" className="text-sky-600 shrink-0" />
                        <div className="text-[11px] sm:text-xs text-sky-800 dark:text-sky-300">
                            Có <strong className="font-bold">{stockSummary.revoked}</strong> mã đang ở trạng thái &ldquo;Đã thu hồi&rdquo;. Bấm nút bên cạnh để đưa tất cả về trạng thái &ldquo;Chưa dùng&rdquo; (khả dụng) cho nhân viên tiếp tục nhận mã.
                        </div>
                    </div>
                    {onRestoreRevokedCoupons && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={onRestoreRevokedCoupons}
                            className="shrink-0 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-2xs cursor-pointer flex items-center justify-center gap-1 self-end sm:self-auto"
                        >
                            <AppIcon name="reset" size="xs" />
                            Khôi phục về Chưa dùng
                        </Button>
                    )}
                </div>
            )}

            {/* Breakdown by Type Pills */}
            {stockSummary.breakdown.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
                    <span className="text-[11px] font-semibold text-slate-400 shrink-0">Tồn theo loại:</span>
                    {stockSummary.breakdown.map(b => (
                        <div key={b.type} className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded-md border border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 shrink-0 shadow-2xs">
                            <span className="font-bold text-slate-900 dark:text-white">{b.type}: </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{b.unused} còn</span>
                            <span className="text-slate-400"> / {b.total}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Controls bar: Tự động co giãn theo màn hình, phong cách Report BI */}
            <div className="p-2 sm:p-2.5 bg-white dark:bg-slate-800/90 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-wrap lg:flex-nowrap items-center justify-between gap-2">
                {/* Nhóm bộ lọc & tìm kiếm bên trái */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap min-w-0 w-full lg:w-auto">
                    <div className="relative w-full sm:w-[180px] lg:w-[260px] xl:w-[300px] shrink-0">
                        <AppIcon name="search" size="sm" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Tìm mã, MĐH, người nhận, SP..."
                            className="w-full h-8 pl-7.5 pr-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm sm:text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                aria-label="Xoá tìm kiếm"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-0.5 after:absolute after:-inset-3.5 after:content-[''] sm:after:hidden"
                            >
                                <AppIcon name="close" size="sm" />
                            </button>
                        )}
                    </div>

                    {/* Quick Segmented Tabs Lọc Trạng Thái Nhanh (Vuốt ngang mượt mà trên iPhone, không dùng select xấu) */}
                    <div className="flex items-center gap-0.5 overflow-x-auto p-0.5 bg-slate-100/90 dark:bg-slate-900/80 rounded-lg border border-slate-200/70 dark:border-slate-700/70 min-w-0 max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('ALL')}
                            className={`min-h-11 sm:min-h-0 px-2 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                                statusFilter === 'ALL'
                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            Tất cả ({stockSummary.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('UNUSED')}
                            className={`min-h-11 sm:min-h-0 px-2 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1 active:scale-95 cursor-pointer ${
                                statusFilter === 'UNUSED'
                                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Chưa dùng ({stockSummary.unused})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('SENT')}
                            className={`min-h-11 sm:min-h-0 px-2 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1 active:scale-95 cursor-pointer ${
                                statusFilter === 'SENT'
                                    ? 'bg-sky-600 text-white shadow-2xs font-bold'
                                    : 'text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                            Đã phát ({stockSummary.sent})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('REVOKED')}
                            className={`min-h-11 sm:min-h-0 px-2 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1 active:scale-95 cursor-pointer ${
                                statusFilter === 'REVOKED'
                                    ? 'bg-amber-600 text-white shadow-2xs font-bold'
                                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            Thu hồi ({stockSummary.revoked})
                        </button>
                    </div>

                    {availableTypes.length > 0 && (
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="h-8 px-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0 max-w-[110px] truncate cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500"
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
                        className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 h-8 w-8 p-0 flex items-center justify-center text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg shrink-0 transition-colors active:scale-95"
                        title="Làm mới"
                    >
                        <AppIcon name="refresh" size="sm" className={isLoading ? 'animate-spin' : ''} />
                    </Button>
                </div>

                {/* Nhóm các nút thao tác bên phải */}
                <div className="flex items-center gap-1.5 shrink-0 flex-nowrap ml-auto lg:ml-0">
                    <Button
                        variant="ghost"
                        onClick={() => setIsConfirmDeleteAllOpen(true)}
                        disabled={coupons.length === 0 || isDeletingAll}
                        className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 h-8 w-8 p-0 flex items-center justify-center text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-900/60 rounded-lg transition-colors disabled:opacity-40 shrink-0 cursor-pointer active:scale-95"
                        title={`Xoá tất cả (${coupons.length}) mã trong kho`}
                    >
                        <AppIcon name="delete" size="sm" className={isDeletingAll ? 'animate-spin' : ''} />
                    </Button>

                    {onReclassifyCoupons && (
                        <Button
                            variant="ghost"
                            onClick={onReclassifyCoupons}
                            className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 h-8 w-8 p-0 flex items-center justify-center text-sky-600 dark:text-sky-400 bg-sky-50/80 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200/80 dark:border-sky-800/60 rounded-lg transition-colors shrink-0 cursor-pointer active:scale-95"
                            title="Tự động phân loại tách biệt thương hiệu chuẩn (VIVO, HONOR, SAMSUNG, EVENT...)"
                        >
                            <AppIcon name="reset" size="sm" />
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        onClick={onExportExcel}
                        className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 h-8 w-8 p-0 flex items-center justify-center text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors shrink-0 cursor-pointer active:scale-95"
                        title="Xuất danh sách ra file Excel"
                    >
                        <AppIcon name="download" size="sm" />
                    </Button>

                    <Button
                        variant="primary"
                        onClick={() => setIsImportModalOpen(true)}
                        className="h-8 px-3 flex items-center gap-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-2xs transition-colors whitespace-nowrap active:scale-95 cursor-pointer"
                    >
                        <AppIcon name="add" size="md" />
                        <span>Nạp mã mới</span>
                    </Button>
                </div>
            </div>

            {/* Unified Coupons Table - Bảng Quản Lý Mã & Lịch Sử Hợp Nhất (Chuẩn Report BI) */}
            <div className="bg-white dark:bg-slate-800/90 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs overflow-hidden">
                {/* MOBILE (< md): High-Density Compact Cards — Siêu gọn, chứa được 6-8 mã trên iPhone */}
                <div className="md:hidden">
                    {filteredCoupons.length === 0 ? (
                        <div className="py-8 px-4 text-center text-slate-400 text-xs">
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
                                <div key={c.id} className={`px-2.5 py-2 space-y-1 transition-colors ${c.status === 'REVOKED' ? 'bg-amber-50/20 dark:bg-amber-950/10' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/50'}`}>
                                    <div className="flex items-center justify-between gap-1.5">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="w-4.5 shrink-0 text-center text-[11px] font-mono text-slate-400 font-bold">{startIndex + idx + 1}</span>
                                            {renderCopyButton(c, true)}
                                            <div className="flex items-center gap-1 shrink-0">
                                                {renderType(c)}
                                                {renderStatus(c)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            {renderActions(c, true)}
                                        </div>
                                    </div>
                                    <div className="pl-6">
                                        {renderProduct(c)}
                                    </div>
                                    {(c.expiryDate || c.recipient || c.copiedAt) && (
                                        <div className="pl-6 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                            {c.expiryDate && <span>{renderExpiry(c)}</span>}
                                            {c.recipient && <span className="inline-flex items-center gap-1 min-w-0 max-w-[140px]"><AppIcon name="user" size="xs" className="shrink-0" /><b className="truncate text-slate-700 dark:text-slate-300">{c.recipient}</b></span>}
                                            {c.copiedAt && <span>{renderCopiedAt(c)}</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* DESKTOP TABLE (≥ md): Bảng chuẩn Report BI sắc nét cho Laptop */}
                <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-270px)] min-h-[300px] [scrollbar-width:thin]">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200/90 dark:border-slate-700/90 shadow-2xs">
                            <tr className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                                <th className="py-2 pl-3 pr-2 w-10 text-center border-r border-slate-200/70 dark:border-slate-700/70">#</th>
                                <th className="py-2 px-2 text-center whitespace-nowrap w-32 border-r border-slate-200/70 dark:border-slate-700/70">Mã Coupon</th>
                                <th className="py-2 px-2.5 min-w-[200px] border-r border-slate-200/70 dark:border-slate-700/70">Sản Phẩm</th>
                                <th className="py-2 px-2 text-center whitespace-nowrap w-24 border-r border-slate-200/70 dark:border-slate-700/70">Loại PMH</th>
                                <th className="py-2 px-2 text-center whitespace-nowrap w-28 border-r border-slate-200/70 dark:border-slate-700/70">Hạn Dùng</th>
                                <th className="py-2 px-2 text-center whitespace-nowrap w-28 border-r border-slate-200/70 dark:border-slate-700/70">Trạng Thái</th>
                                <th className="py-2 px-2 text-left whitespace-nowrap w-36 border-r border-slate-200/70 dark:border-slate-700/70">Người Nhận</th>
                                <th className="py-2 px-2 text-center whitespace-nowrap w-36 border-r border-slate-200/70 dark:border-slate-700/70">Thời Gian Copy</th>
                                <th className="py-2 pr-3 pl-2 text-right whitespace-nowrap w-24">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium">
                            {filteredCoupons.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
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
                                        className={`transition-colors border-b border-slate-100 dark:border-slate-800/70 ${
                                            c.status === 'REVOKED'
                                                ? 'bg-amber-50/25 dark:bg-amber-950/15 hover:bg-amber-50/50 dark:hover:bg-amber-950/30'
                                                : 'odd:bg-white even:bg-slate-50/40 dark:odd:bg-slate-800/90 dark:even:bg-slate-800/50 hover:bg-sky-50/70 dark:hover:bg-sky-950/30'
                                        }`}
                                    >
                                        <td className="py-1.5 pl-3 pr-2 text-center text-slate-400 font-mono text-[11px] w-10 font-bold bg-slate-50/30 dark:bg-slate-800/30 border-r border-slate-100 dark:border-slate-800/60">
                                            {startIndex + idx + 1}
                                        </td>
                                        <td className="py-1.5 px-2 text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60">
                                            {renderCopyButton(c)}
                                        </td>
                                        <td className="py-1.5 px-2.5 border-r border-slate-100 dark:border-slate-800/60">
                                            {renderProduct(c)}
                                        </td>
                                        <td className="py-1.5 px-2 text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60">
                                            {renderType(c)}
                                        </td>
                                        <td className="py-1.5 px-2 text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60">
                                            {renderExpiry(c)}
                                        </td>
                                        <td className="py-1.5 px-2 text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60">
                                            {renderStatus(c)}
                                        </td>
                                        <td className="py-1.5 px-2 text-left text-slate-600 dark:text-slate-300 whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60">
                                            {renderRecipient(c)}
                                        </td>
                                        <td className="py-1.5 px-2 text-center text-[11px] font-mono whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60">
                                            {renderCopiedAt(c)}
                                        </td>
                                        <td className="py-1.5 pr-3 pl-2 text-right whitespace-nowrap">
                                            {renderActions(c)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Thanh phân trang Pagination Bar - Tinh gọn, chuẩn Report BI */}
                {filteredCoupons.length > 0 && (
                    <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                            <span>
                                <strong className="text-slate-800 dark:text-white font-bold">{startIndex + 1}-{endIndex}</strong> / <strong className="text-slate-800 dark:text-white font-bold">{totalItems}</strong> mã
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            <div className="flex items-center gap-1">
                                <span>Xem:</span>
                                <select
                                    value={pageSize}
                                    onChange={e => {
                                        setPageSize(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="py-0.5 px-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                                >
                                    <option value={5}>5 dòng</option>
                                    <option value={10}>10 dòng</option>
                                    <option value={20}>20 dòng</option>
                                    <option value={50}>50 dòng</option>
                                    <option value={100}>100 dòng</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                onClick={() => setCurrentPage(1)}
                                disabled={safePage <= 1}
                                className="h-7 w-7 p-0 text-xs rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 flex items-center justify-center"
                                title="Về trang đầu"
                            >
                                &laquo;
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={safePage <= 1}
                                className="h-7 px-2 text-[11px] rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                            >
                                Trước
                            </Button>
                            <span className="h-7 px-2 flex items-center justify-center font-bold text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xs font-mono">
                                {safePage}/{totalPages}
                            </span>
                            <Button
                                variant="ghost"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={safePage >= totalPages}
                                className="h-7 px-2 text-[11px] rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                            >
                                Sau
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={safePage >= totalPages}
                                className="h-7 w-7 p-0 text-xs rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 flex items-center justify-center"
                                title="Đến trang cuối"
                            >
                                &raquo;
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Xác nhận xoá toàn bộ kho mã — ConfirmDialog dùng chung; không đóng được khi đang xoá dở */}
            <ConfirmDialog
                isOpen={isConfirmDeleteAllOpen}
                onClose={() => { if (!isDeletingAll) setIsConfirmDeleteAllOpen(false); }}
                onConfirm={handleConfirmDeleteAll}
                isLoading={isDeletingAll}
                variant="danger"
                title="Xác Nhận Xoá Tất Cả Mã"
                confirmText="Đồng ý xoá tất cả"
                cancelText="Huỷ bỏ"
                message={
                    <div className="space-y-2 text-left text-xs">
                        <p className="text-slate-500">Kho hiện có: <strong className="text-rose-600 font-bold">{coupons.length} mã coupon</strong></p>
                        <p className="text-slate-600 leading-relaxed bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                            Hành động này sẽ <strong>xoá vĩnh viễn toàn bộ {coupons.length} mã coupon</strong> trong kho của bạn khỏi cơ sở dữ liệu. Sau khi xoá sẽ không thể khôi phục lại. Bạn có chắc chắn muốn thực hiện?
                        </p>
                    </div>
                }
            />

            {isImportModalOpen && (
                <CouponImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={onImportCoupons}
                    existingTypes={availableTypes}
                    coupons={coupons}
                    onDeleteBatch={onDeleteCouponsBatch}
                    onUpdateBatch={onUpdateCouponsBatch}
                    onUpdateDetailed={onUpdateCouponsDetailed}
                />
            )}
        </div>
    );
};
