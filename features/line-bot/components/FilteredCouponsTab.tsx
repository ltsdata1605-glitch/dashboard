import React, { useState, useEffect, useMemo } from 'react';
import {
    Filter,
    RefreshCw,
    Trash2,
    CheckCircle2,
    Clock,
    Search,
    Copy,
    Check,
    Ticket,
    UserCheck,
    AlertCircle,
    Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
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
        <div className="space-y-4">
            {/* Top Header & Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl">
                        <Ticket size={20} />
                    </div>
                    <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Tổng Mã Đã Lọc</span>
                        <span className="text-xl font-black text-slate-900 dark:text-white">{stats.total}</span>
                    </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Đã Sử Dụng</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.used}</span>
                            <span className="text-xs text-slate-400 font-mono">
                                ({stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0}%)
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                        <Clock size={20} />
                    </div>
                    <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Chưa Sử Dụng</span>
                        <span className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.unused}</span>
                    </div>
                </div>
            </div>

            {/* Filter & Action Toolbar */}
            <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo mã, tên nhân viên, loại PMH, người dùng..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                </div>

                {/* Filter Pills & Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs">
                        <button
                            onClick={() => setStatusFilter('ALL')}
                            className={`px-3 py-1 rounded-lg font-bold transition-all ${
                                statusFilter === 'ALL'
                                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            Tất cả ({stats.total})
                        </button>
                        <button
                            onClick={() => setStatusFilter('UNUSED')}
                            className={`px-3 py-1 rounded-lg font-bold transition-all ${
                                statusFilter === 'UNUSED'
                                    ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            Chưa dùng ({stats.unused})
                        </button>
                        <button
                            onClick={() => setStatusFilter('USED')}
                            className={`px-3 py-1 rounded-lg font-bold transition-all ${
                                statusFilter === 'USED'
                                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            Đã dùng ({stats.used})
                        </button>
                    </div>

                    <Button
                        variant="secondary"
                        onClick={loadData}
                        disabled={isLoading}
                        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                        title="Làm mới danh sách"
                    >
                        <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                    </Button>

                    {coupons.length > 0 && (
                        <Button
                            variant="secondary"
                            onClick={handleClearAll}
                            disabled={isDeleting}
                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                            title="Xóa toàn bộ lịch sử lọc"
                        >
                            <Trash2 size={15} />
                        </Button>
                    )}
                </div>
            </div>

            {/* List / Table */}
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                        <RefreshCw size={24} className="animate-spin text-emerald-500" />
                        <span className="text-xs">Đang tải danh sách coupon lọc được...</span>
                    </div>
                ) : filteredList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                        <AlertCircle size={32} className="text-slate-300 dark:text-slate-600" />
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                            {searchQuery ? 'Không tìm thấy coupon nào khớp từ khóa' : 'Chưa có coupon nào được lọc'}
                        </span>
                        <span className="text-xs max-w-sm text-slate-500 dark:text-slate-400">
                            Khi ai đó dán danh sách mã PMH vào nhóm LINE, Bot sẽ tự động lọc theo tên đã cấu hình và lưu tại đây để bạn theo dõi ai đã dùng mã.
                        </span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="p-3.5 pl-4 whitespace-nowrap">Thẻ</th>
                                    <th className="p-3.5 whitespace-nowrap">Mã Coupon</th>
                                    <th className="p-3.5 whitespace-nowrap">Loại PMH</th>
                                    <th className="p-3.5 whitespace-nowrap">Người được cấp</th>
                                    <th className="p-3.5 whitespace-nowrap">Trạng thái</th>
                                    <th className="p-3.5 whitespace-nowrap">Người sử dụng</th>
                                    <th className="p-3.5 whitespace-nowrap">Sử dụng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                {filteredList.map((item) => {
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
                                        <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750 transition-colors">
                                            <td className="p-3.5 pl-4 whitespace-nowrap">
                                                <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono">
                                                    PMH {item.cardIndex || 1}
                                                </span>
                                            </td>
                                            <td className="p-3.5 whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(item.code)}
                                                    title={`Bấm để copy mã: ${item.code}`}
                                                    className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                                                        copiedCode === item.code
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20'
                                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 dark:hover:bg-slate-700'
                                                    }`}
                                                >
                                                    {copiedCode === item.code ? (
                                                        <>
                                                            <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                                                            <span>Đã copy</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={12} className="text-slate-400" />
                                                            <span>Copy</span>
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="p-3.5">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                                                    {item.productName || item.categoryLabel || 'PMH'}
                                                </span>
                                                {item.orderId && (
                                                    <span className="text-[10px] text-slate-400 font-mono">MĐH: {item.orderId}</span>
                                                )}
                                            </td>
                                            <td className="p-3.5 font-medium text-sky-600 dark:text-sky-400 whitespace-nowrap">
                                                {item.recipient ? item.recipient.replace(/^@+/, '') : '-'}
                                            </td>
                                            <td className="p-3.5 whitespace-nowrap">
                                                {isUsed ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                                        <CheckCircle2 size={11} /> ĐÃ SỬ DỤNG
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                                                        <Clock size={11} /> CHƯA DÙNG
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3.5 whitespace-nowrap">
                                                {isUsed && item.usedBy ? (
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                                        👤 {item.usedBy}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">Chưa có</span>
                                                )}
                                            </td>
                                            <td className="p-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                                {timeStr}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
