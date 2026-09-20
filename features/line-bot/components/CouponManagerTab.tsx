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
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import { Coupon, CouponStatus, StockSummaryItem, ParsedImportItem } from '../types/lineBot.types';
import { CouponImportModal } from './CouponImportModal';

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
    onDeleteAllCoupons,
    onExportExcel,
    onRefresh
}) => {
    const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
    const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState<boolean>(false);
    const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(5); // Mặc định hiển thị đúng 5 dòng

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

            {/* Controls bar */}
            <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-1">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Tìm theo mã, MĐH, kho, người nhận..."
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="py-1.5 px-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="UNUSED">Chưa dùng (Khả dụng)</option>
                        <option value="SENT">Đã phát mã</option>
                        <option value="REVOKED">Đã thu hồi</option>
                    </select>

                    {availableTypes.length > 0 && (
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="py-1.5 px-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                            <option value="ALL">Tất cả loại PMH</option>
                            {availableTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    )}

                    <Button variant="ghost" onClick={onRefresh} className="p-1.5 text-slate-500 hover:text-slate-700 rounded-xl" title="Làm mới">
                        <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                    </Button>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <Button
                        variant="ghost"
                        onClick={() => setIsConfirmDeleteAllOpen(true)}
                        disabled={coupons.length === 0 || isDeletingAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-900/60 rounded-xl transition-colors disabled:opacity-40"
                        title="Xoá tất cả mã coupon hiện có trong kho"
                    >
                        <Trash2 size={14} className={isDeletingAll ? 'animate-spin' : ''} />
                        <span>Xoá tất cả ({coupons.length})</span>
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={onExportExcel}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200"
                    >
                        <Download size={14} />
                        <span>Xuất Excel</span>
                    </Button>

                    <Button
                        variant="primary"
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
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
                                    <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
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
                />
            )}
        </div>
    );
};
