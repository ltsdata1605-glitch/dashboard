import React, { useState, useEffect, useMemo } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';

import { toast } from '../../../components/shared/ui/toast';
import { Button } from '../../../components/shared/ui/Button';
import { FilteredCouponRecord } from '../types/lineBot.types';
import { lineBotFirestoreService } from '../services/lineBotFirestoreService';

interface FilteredCouponsTabProps {
    userId: string;
}

export const FilteredCouponsTab: React.FC<FilteredCouponsTabProps> = ({ userId }) => {
    const [coupons, setCoupons] = useState<FilteredCouponRecord[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNUSED' | 'USED'>('ALL');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    const loadData = async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const data = await lineBotFirestoreService.getFilteredCoupons(userId);
            setCoupons(data);
        } catch (error) {
            console.error('Lỗi tải coupon lọc được:', error);
            toast.error('Không thể tải danh sách coupon lọc');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [userId]);

    const handleCopy = async (code: string) => {
        try {
            // Thử dùng Clipboard API (modern)
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(code);
            } else {
                // Fallback cho browser cũ hoặc context không hỗ trợ Clipboard API
                const textarea = document.createElement('textarea');
                textarea.value = code;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textarea);
                if (!success) throw new Error('execCommand copy failed');
            }
            setCopiedCode(code);
            toast.success(`Đã sao chép mã: ${code}`);
            setTimeout(() => setCopiedCode(null), 2000);
        } catch (error) {
            console.error('Lỗi copy:', error);
            toast.error(`Không thể copy mã. Vui lòng copy thủ công: ${code}`);
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử coupon lọc được không?')) return;
        setIsDeleting(true);
        try {
            await lineBotFirestoreService.deleteFilteredCoupons(userId);
            setCoupons([]);
            toast.success('Đã dọn dẹp danh sách coupon lọc được');
        } catch {
            toast.error('Lỗi khi xóa danh sách');
        } finally {
            setIsDeleting(false);
        }
    };

    // Thống kê
    const stats = useMemo(() => {
        const total = coupons.length;
        const used = coupons.filter(c => c.status === 'USED').length;
        const unused = coupons.filter(c => c.status === 'UNUSED' || !c.status).length;
        return { total, used, unused };
    }, [coupons]);

    // Lọc theo search & status
    const filteredList = useMemo(() => {
        return coupons.filter(item => {
            if (statusFilter === 'USED' && item.status !== 'USED') return false;
            if (statusFilter === 'UNUSED' && item.status === 'USED') return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchCode = item.code.toLowerCase().includes(q);
                const matchName = (item.recipient || '').toLowerCase().includes(q);
                const matchProd = (item.productName || '').toLowerCase().includes(q);
                const matchUser = (item.usedBy || '').toLowerCase().includes(q);
                return matchCode || matchName || matchProd || matchUser;
            }
            return true;
        });
    }, [coupons, statusFilter, searchQuery]);

    return (
        <div className="space-y-2.5 sm:space-y-3.5">
            {/* Top Stats - 3 Thẻ trên 1 hàng siêu gọn gàng */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                <div className="p-2 sm:p-2.5 bg-white dark:bg-slate-800/90 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 block font-semibold truncate">Tổng Mã Lọc</span>
                        <span className="text-base sm:text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{stats.total}</span>
                    </div>
                    <div className="p-1 sm:p-1.5 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-lg shrink-0">
                        <AppIcon name="coupon" size="sm" />
                    </div>
                </div>

                <div className="p-2 sm:p-2.5 bg-white dark:bg-slate-800/90 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 block font-semibold truncate">Đã Sử Dụng</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">{stats.used}</span>
                            <span className="text-[11px] text-slate-400 font-mono">
                                ({stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0}%)
                            </span>
                        </div>
                    </div>
                    <div className="p-1 sm:p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                        <AppIcon name="success" size="sm" />
                    </div>
                </div>

                <div className="p-2 sm:p-2.5 bg-white dark:bg-slate-800/90 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] sm:text-xs text-amber-600 dark:text-amber-400 block font-semibold truncate">Chưa Sử Dụng</span>
                        <span className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">{stats.unused}</span>
                    </div>
                    <div className="p-1 sm:p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
                        <AppIcon name="clock" size="sm" />
                    </div>
                </div>
            </div>

            {/* Filter & Action Toolbar */}
            <div className="p-2 sm:p-2.5 bg-white dark:bg-slate-800/90 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-wrap lg:flex-nowrap items-center justify-between gap-2">
                {/* Search Bar */}
                <div className="relative w-full sm:w-[220px] lg:w-[260px] shrink-0">
                    <AppIcon name="search" size="sm" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Tìm mã, NV, loại PMH, người dùng..."
                        className="w-full h-8 pl-7.5 pr-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm sm:text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
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

                {/* Filter Pills & Actions */}
                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap ml-auto lg:ml-0 min-w-0 max-w-full">
                    <div className="flex items-center gap-0.5 overflow-x-auto p-0.5 bg-slate-100/90 dark:bg-slate-900/80 rounded-lg border border-slate-200/70 dark:border-slate-700/70 min-w-0 max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
                        <button
                            onClick={() => setStatusFilter('ALL')}
                            className={`min-h-11 sm:min-h-0 px-2 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                                statusFilter === 'ALL'
                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            Tất cả ({stats.total})
                        </button>
                        <button
                            onClick={() => setStatusFilter('UNUSED')}
                            className={`min-h-11 sm:min-h-0 px-2 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                                statusFilter === 'UNUSED'
                                    ? 'bg-amber-600 text-white shadow-2xs font-bold'
                                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }`}
                        >
                            Chưa dùng ({stats.unused})
                        </button>
                        <button
                            onClick={() => setStatusFilter('USED')}
                            className={`min-h-11 sm:min-h-0 px-2 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                                statusFilter === 'USED'
                                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                        >
                            Đã dùng ({stats.used})
                        </button>
                    </div>

                    <Button
                        variant="secondary"
                        size="none"
                        onClick={loadData}
                        disabled={isLoading}
                        className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 h-8 w-8 p-0 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
                        title="Làm mới danh sách"
                    >
                        <AppIcon name="refresh" size="sm" className={isLoading ? 'animate-spin' : ''} />
                    </Button>

                    {coupons.length > 0 && (
                        <Button
                            variant="secondary"
                            size="none"
                            onClick={handleClearAll}
                            disabled={isDeleting}
                            className="h-8 w-8 p-0 flex items-center justify-center text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg border border-rose-200/80 active:scale-95 transition-all"
                            title="Xóa toàn bộ lịch sử lọc"
                        >
                            <AppIcon name="delete" size="sm" />
                        </Button>
                    )}
                </div>
            </div>

            {/* List / Table */}
            <div className="bg-white dark:bg-slate-800/90 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                        <AppIcon name="refresh" size="lg" spin className="text-sky-500" />
                        <span className="text-xs">Đang tải danh sách coupon lọc được...</span>
                    </div>
                ) : filteredList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                        <AppIcon name="alert" size="state" className="text-slate-300" />
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                            {searchQuery ? 'Không tìm thấy coupon nào khớp từ khóa' : 'Chưa có coupon nào được lọc'}
                        </span>
                        <span className="text-xs max-w-sm text-slate-500 dark:text-slate-400">
                            Khi ai đó dán danh sách mã PMH vào nhóm LINE, Bot sẽ tự động lọc theo tên đã cấu hình và lưu tại đây.
                        </span>
                    </div>
                ) : (
                    <>
                        {/* MOBILE VIEW (< md): High-Density Compact Cards cho iPhone */}
                        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/70">
                            {filteredList.map((item, idx) => {
                                const isUsed = item.status === 'USED';
                                const timeStr = item.usedAt ? (() => {
                                    try {
                                        return new Date(item.usedAt).toLocaleString('vi-VN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            day: '2-digit',
                                            month: '2-digit',
                                            timeZone: 'Asia/Ho_Chi_Minh'
                                        });
                                    } catch {
                                        return item.usedAt;
                                    }
                                })() : '-';

                                return (
                                    <div key={item.id} className="px-2.5 py-2 space-y-1 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center justify-between gap-1.5">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                    PMH {item.cardIndex || idx + 1}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(item.code)}
                                                    title={`Copy mã: ${item.code}`}
                                                    className={`h-6.5 px-2 font-mono text-[11px] font-bold rounded-md border transition-all inline-flex items-center gap-1 active:scale-95 cursor-pointer ${
                                                        copiedCode === item.code
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border-emerald-300 ring-1 ring-emerald-500/30'
                                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-sky-50 hover:text-sky-600'
                                                    }`}
                                                >
                                                    {copiedCode === item.code ? <AppIcon name="check" size="xs" className="text-emerald-600" /> : <AppIcon name="copy" size="xs" className="text-slate-400" />}
                                                    <span>{copiedCode === item.code ? 'Đã copy' : item.code}</span>
                                                </button>
                                            </div>
                                            {isUsed ? (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200">
                                                    <AppIcon name="success" size="xs" /> ĐÃ DÙNG
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200">
                                                    <AppIcon name="clock" size="xs" /> CHƯA DÙNG
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-baseline justify-between gap-2 text-xs">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.productName || item.categoryLabel || 'PMH'}>
                                                {item.productName || item.categoryLabel || 'PMH'}
                                            </span>
                                            {item.recipient && (
                                                <span className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold shrink-0">
                                                    {item.recipient.replace(/^@+/, '')}
                                                </span>
                                            )}
                                        </div>

                                        {(isUsed || item.orderId) && (
                                            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                                                <span>{item.orderId ? `MĐH: ${item.orderId}` : ''}</span>
                                                {isUsed && (
                                                    <span className="inline-flex items-center gap-1"><AppIcon name="user" size="xs" />{item.usedBy || 'Ai đó'} • {timeStr}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* DESKTOP VIEW (≥ md): Bảng chuẩn Report BI cho Laptop */}
                        <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-270px)] min-h-[300px] [scrollbar-width:thin]">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/90 dark:border-slate-700/90 uppercase tracking-wider text-[11px] shadow-2xs">
                                    <tr>
                                        <th className="py-2 pl-3 pr-2 w-16 text-center border-r border-slate-200/70 dark:border-slate-700/70">Thẻ</th>
                                        <th className="py-2 px-2 w-32 text-center whitespace-nowrap border-r border-slate-200/70 dark:border-slate-700/70">Mã Coupon</th>
                                        <th className="py-2 px-2.5 min-w-[180px] border-r border-slate-200/70 dark:border-slate-700/70">Loại PMH</th>
                                        <th className="py-2 px-2 w-32 whitespace-nowrap border-r border-slate-200/70 dark:border-slate-700/70">Người được cấp</th>
                                        <th className="py-2 px-2 w-28 text-center whitespace-nowrap border-r border-slate-200/70 dark:border-slate-700/70">Trạng thái</th>
                                        <th className="py-2 px-2 w-32 whitespace-nowrap border-r border-slate-200/70 dark:border-slate-700/70">Người sử dụng</th>
                                        <th className="py-2 pr-3 pl-2 w-36 text-center whitespace-nowrap">Thời gian dùng</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium">
                                    {filteredList.map((item, idx) => {
                                        const isUsed = item.status === 'USED';
                                        const timeStr = item.usedAt ? (() => {
                                            try {
                                                return new Date(item.usedAt).toLocaleString('vi-VN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    timeZone: 'Asia/Ho_Chi_Minh'
                                                });
                                            } catch {
                                                return item.usedAt;
                                            }
                                        })() : '-';

                                        return (
                                            <tr key={item.id} className="odd:bg-white even:bg-slate-50/40 dark:odd:bg-slate-800/90 dark:even:bg-slate-800/50 hover:bg-sky-50/70 dark:hover:bg-sky-950/30 transition-colors border-b border-slate-100 dark:border-slate-800/70">
                                                <td className="py-1.5 pl-3 pr-2 text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60">
                                                    <span className="inline-block whitespace-nowrap px-1.5 py-0.5 rounded font-bold text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono">
                                                        PMH {item.cardIndex || idx + 1}
                                                    </span>
                                                </td>
                                                <td className="py-1.5 px-2 text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(item.code)}
                                                        title={`Bấm để copy mã: ${item.code}`}
                                                        className={`inline-flex items-center justify-center gap-1.5 h-6.5 px-2.5 rounded-md text-xs font-semibold font-mono border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                                                            copiedCode === item.code
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 ring-1 ring-emerald-500/30'
                                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-sky-50 hover:text-sky-600'
                                                        }`}
                                                    >
                                                        {copiedCode === item.code ? (
                                                            <>
                                                                <AppIcon name="check" size="xs" className="text-emerald-600" />
                                                                <span>Đã copy</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AppIcon name="copy" size="xs" className="text-slate-400" />
                                                                <span className="tracking-wide">{item.code}</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="py-1.5 px-2.5 border-r border-slate-100 dark:border-slate-800/60">
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[240px] lg:max-w-[340px]">
                                                        {item.productName || item.categoryLabel || 'PMH'}
                                                    </span>
                                                    {item.orderId && (
                                                        <span className="text-[11px] text-slate-400 font-mono">MĐH: {item.orderId}</span>
                                                    )}
                                                </td>
                                                <td className="py-1.5 px-2 font-medium text-sky-600 dark:text-sky-400 whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60">
                                                    {item.recipient ? item.recipient.replace(/^@+/, '') : '-'}
                                                </td>
                                                <td className="py-1.5 px-2 text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60">
                                                    {isUsed ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200">
                                                            <AppIcon name="success" size="xs" /> ĐÃ SỬ DỤNG
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200">
                                                            <AppIcon name="clock" size="xs" /> CHƯA DÙNG
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-1.5 px-2 whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60">
                                                    {isUsed && item.usedBy ? (
                                                        <span className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                                                            <AppIcon name="user" size="xs" />{item.usedBy}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-[11px]">Chưa có</span>
                                                    )}
                                                </td>
                                                <td className="py-1.5 pr-3 pl-2 text-center text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                                    {timeStr}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
