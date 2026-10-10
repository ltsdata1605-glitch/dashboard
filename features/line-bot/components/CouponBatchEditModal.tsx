import React, { useState, useMemo } from 'react';
import { Modal } from '../../../components/shared/ui/Modal';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Button } from '../../../components/shared/ui/Button';
import toast from 'react-hot-toast';
import { Coupon, CouponStatus } from '../types/lineBot.types';
import { getVietnamTodayString } from '../services/couponParser';

export interface ImportBatchData {
    id: string;
    importedAt: string;
    rawDate: string;
    total: number;
    unused: number;
    sent: number;
    revoked: number;
    types: string[];
    productSummary: string;
    sampleCodes: string[];
    expiryDate?: string;
    couponIds: string[];
    coupons: Coupon[];
}

interface CouponBatchEditModalProps {
    isOpen: boolean;
    batch: ImportBatchData | null;
    onClose: () => void;
    onSaveBatch: (
        couponIds: string[],
        updates: Partial<Pick<Coupon, 'productName' | 'syntax' | 'type' | 'expiryDate' | 'status'>>
    ) => Promise<number>;
    onSaveDetailed?: (
        items: Array<{ id: string; changes: Partial<Pick<Coupon, 'code' | 'productName' | 'syntax' | 'type' | 'expiryDate' | 'status'>> }>
    ) => Promise<number>;
}

const COMMON_TYPES = ['Event', 'Giờ Vàng Giá Sốc', 'VIVO', 'HONOR', 'SAMSUNG', 'APPLE', 'OPPO', 'XIAOMI'];

export const CouponBatchEditModal: React.FC<CouponBatchEditModalProps> = ({
    isOpen,
    batch,
    onClose,
    onSaveBatch,
    onSaveDetailed
}) => {
    if (!batch) return null;

    // Danh sách sản phẩm riêng biệt trong đợt
    const distinctProducts = useMemo(() => {
        const set = new Set<string>();
        batch.coupons.forEach(c => {
            const name = (c.productName || '').trim();
            if (name) set.add(name);
        });
        return Array.from(set);
    }, [batch]);

    // State chỉnh sửa chung
    const [targetProduct, setTargetProduct] = useState<string>('ALL'); // 'ALL' hoặc tên sản phẩm cụ thể
    const [newProductName, setNewProductName] = useState<string>(
        distinctProducts.length === 1 ? distinctProducts[0] : ''
    );
    const [selectedType, setSelectedType] = useState<string>(batch.types[0] || 'Event');
    const [customType, setCustomType] = useState<string>('');
    const [expiryDate, setExpiryDate] = useState<string>(batch.expiryDate || '');
    const [restoreSentToUnused, setRestoreSentToUnused] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Tab xem chi tiết từng mã
    const [showDetailedCodes, setShowDetailedCodes] = useState<boolean>(false);
    const [codeSearch, setCodeSearch] = useState<string>('');
    const [individualStatusOverrides, setIndividualStatusOverrides] = useState<Record<string, CouponStatus>>({});

    const filteredCoupons = useMemo(() => {
        if (!codeSearch.trim()) return batch.coupons;
        const q = codeSearch.toLowerCase().trim();
        return batch.coupons.filter(c =>
            c.code.toLowerCase().includes(q) ||
            (c.productName || '').toLowerCase().includes(q)
        );
    }, [batch.coupons, codeSearch]);

    // Quick date helpers
    const handleSetQuickDate = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setExpiryDate(`${yyyy}-${mm}-${dd}`);
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const effectiveType = selectedType === 'CUSTOM' ? (customType.trim() || 'Event') : selectedType;

            // Xác định danh sách coupon ID cần update
            let targetCouponIds = batch.couponIds;
            if (targetProduct !== 'ALL') {
                targetCouponIds = batch.coupons
                    .filter(c => (c.productName || '').trim() === targetProduct)
                    .map(c => c.id);
            }

            // Nếu người dùng có thay đổi trạng thái lẻ từng mã
            const hasIndividualOverrides = Object.keys(individualStatusOverrides).length > 0;

            if (hasIndividualOverrides && onSaveDetailed) {
                const itemsToUpdate = batch.coupons.map(c => {
                    const changes: Partial<Coupon> = {};
                    if (newProductName.trim()) {
                        if (targetProduct === 'ALL' || (c.productName || '').trim() === targetProduct) {
                            changes.productName = newProductName.trim();
                        }
                    }
                    if (effectiveType) changes.type = effectiveType;
                    if (expiryDate) changes.expiryDate = expiryDate;
                    if (individualStatusOverrides[c.id]) {
                        changes.status = individualStatusOverrides[c.id];
                    } else if (restoreSentToUnused && c.status === 'SENT') {
                        changes.status = 'UNUSED';
                    }
                    return { id: c.id, changes };
                });

                await onSaveDetailed(itemsToUpdate);
            } else {
                // Bulk update chung cho toàn đợt
                const updates: Partial<Pick<Coupon, 'productName' | 'syntax' | 'type' | 'expiryDate' | 'status'>> = {};
                if (newProductName.trim()) updates.productName = newProductName.trim();
                if (effectiveType) updates.type = effectiveType;
                if (expiryDate) updates.expiryDate = expiryDate;
                if (restoreSentToUnused) updates.status = 'UNUSED';

                await onSaveBatch(targetCouponIds, updates);
            }

            onClose();
        } catch (err: any) {
            console.error('[CouponBatchEditModal] Lỗi lưu thay đổi đợt nạp:', err);
            toast.error('Lỗi khi lưu đợt nạp: ' + (err.message || 'Không thể cập nhật'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { if (!isSaving) onClose(); }}
            maxWidth="xl"
            ariaLabel="Chỉnh sửa đợt nạp mã"
            title={
                <span className="flex items-center gap-2 min-w-0">
                    <AppIcon name="edit" size="md" className="text-emerald-500 shrink-0" />
                    <span className="truncate">Chỉnh Sửa Thông Tin Đợt Nạp Mã</span>
                </span>
            }
            controls={
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                        Tổng {batch.total} mã ({batch.unused} khả dụng, {batch.sent} đã cấp)
                    </span>
                </div>
            }
        >
            <div className="space-y-4 text-left">
                {/* Header Info Box */}
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-800/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                            <AppIcon name="clock" size="xs" className="text-emerald-600" />
                            <span>Thời gian nạp: {new Date(batch.importedAt).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 truncate max-w-md">
                            Sản phẩm hiện tại: <strong>{batch.productSummary}</strong>
                        </div>
                    </div>
                    {batch.expiryDate && (
                        <div className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 rounded-lg font-mono text-[11px] shrink-0 self-start sm:self-auto">
                            Hạn hiện tại: {batch.expiryDate}
                        </div>
                    )}
                </div>

                {/* PHẦN 1: TÊN SẢN PHẨM / MODEL ÁP DỤNG */}
                <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <AppIcon name="sparkles" size="xs" className="text-emerald-500" />
                            <span>Tên Sản Phẩm / Model Áp Dụng Cho Mã</span>
                        </label>
                        {distinctProducts.length > 1 && (
                            <div className="flex items-center gap-1 text-[11px]">
                                <span className="text-slate-500">Áp dụng cho:</span>
                                <select
                                    value={targetProduct}
                                    onChange={e => {
                                        setTargetProduct(e.target.value);
                                        if (e.target.value !== 'ALL') {
                                            setNewProductName(e.target.value);
                                        }
                                    }}
                                    className="p-1 text-[11px] bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded"
                                >
                                    <option value="ALL">Tất cả sản phẩm trong đợt</option>
                                    {distinctProducts.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <input
                        type="text"
                        value={newProductName}
                        onChange={e => setNewProductName(e.target.value)}
                        placeholder="Nhập tên sản phẩm chuẩn (Ví dụ: Máy lọc nước RO Kangaroo KG12S2H4)..."
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />

                    {distinctProducts.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                            <span className="text-slate-400">Gợi ý từ đợt nạp:</span>
                            {distinctProducts.map(prod => (
                                <button
                                    key={prod}
                                    type="button"
                                    onClick={() => setNewProductName(prod)}
                                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-300 hover:text-emerald-600 rounded-md transition-all truncate max-w-xs"
                                    title="Click để chọn tên này"
                                >
                                    {prod}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* PHẦN 2: LOẠI PMH & HẠN DÙNG */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Loại PMH */}
                    <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            Loại PMH (Phân loại Bot LINE)
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                            {COMMON_TYPES.map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setSelectedType(t)}
                                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all text-center truncate ${
                                        selectedType === t
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        {selectedType === 'CUSTOM' && (
                            <input
                                type="text"
                                value={customType}
                                onChange={e => setCustomType(e.target.value)}
                                placeholder="Nhập tên loại mới..."
                                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                            />
                        )}
                    </div>

                    {/* Hạn sử dụng */}
                    <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            Hạn Sử Dụng (YYYY-MM-DD)
                        </label>
                        <input
                            type="date"
                            value={expiryDate}
                            onChange={e => setExpiryDate(e.target.value)}
                            className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                            <span className="text-slate-400">Chọn nhanh:</span>
                            <button
                                type="button"
                                onClick={() => setExpiryDate(getVietnamTodayString())}
                                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded"
                            >
                                Hôm nay
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSetQuickDate(7)}
                                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded"
                            >
                                +7 ngày
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSetQuickDate(14)}
                                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded"
                            >
                                +14 ngày
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSetQuickDate(30)}
                                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded"
                            >
                                +30 ngày
                            </button>
                        </div>
                    </div>
                </div>

                {/* PHẦN 3: KHÔI PHỤC MÃ ĐÃ CẤP */}
                {batch.sent > 0 && (
                    <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                            <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                <AppIcon name="history" size="xs" />
                                <span>Khôi phục {batch.sent} mã đã cấp về "Chưa dùng (Khả dụng)"</span>
                            </div>
                            <div className="text-[11px] text-amber-700/80 dark:text-amber-400">
                                Dùng khi nhân viên chưa thực sự sử dụng mã hoặc muốn đưa toàn bộ mã trong đợt về kho để phát lại.
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={restoreSentToUnused}
                            onChange={e => setRestoreSentToUnused(e.target.checked)}
                            className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                    </div>
                )}

                {/* PHẦN 4: DANH SÁCH CHI TIẾT TỪNG MÃ */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <button
                        type="button"
                        onClick={() => setShowDetailedCodes(!showDetailedCodes)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors"
                    >
                        <span className="flex items-center gap-1.5">
                            <AppIcon name="table" size="xs" />
                            <span>Xem & Sửa trạng thái từng mã trong đợt ({batch.total} mã)</span>
                        </span>
                        <AppIcon name={showDetailedCodes ? 'chevronUp' : 'chevronDown'} size="xs" />
                    </button>

                    {showDetailedCodes && (
                        <div className="p-3 space-y-2 border-t border-slate-200 dark:border-slate-700 animate-in fade-in duration-100">
                            <input
                                type="text"
                                value={codeSearch}
                                onChange={e => setCodeSearch(e.target.value)}
                                placeholder="Tìm mã code hoặc tên sản phẩm..."
                                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                            />

                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                {filteredCoupons.map((c, idx) => {
                                    const currentStatus = individualStatusOverrides[c.id] || c.status;
                                    return (
                                        <div
                                            key={c.id}
                                            className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs gap-2"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{c.code}</span>
                                                <span className="text-[11px] text-slate-500 truncate max-w-xs">{c.productName}</span>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setIndividualStatusOverrides(prev => ({
                                                        ...prev,
                                                        [c.id]: currentStatus === 'UNUSED' ? 'SENT' : 'UNUSED'
                                                    }))}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                                        currentStatus === 'UNUSED'
                                                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                                            : (currentStatus === 'SENT' ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700')
                                                    }`}
                                                    title="Chạm để chuyển đổi trạng thái Khả dụng / Đã cấp"
                                                >
                                                    {currentStatus === 'UNUSED' ? 'Chưa dùng' : (currentStatus === 'SENT' ? 'Đã phát' : 'Thu hồi')}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 text-xs font-semibold"
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                    >
                        {isSaving ? (
                            <>
                                <AppIcon name="refresh" size="xs" spin />
                                <span>Đang lưu thay đổi...</span>
                            </>
                        ) : (
                            <>
                                <AppIcon name="check" size="xs" />
                                <span>Lưu Thay Đổi Đợt Nạp</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
