/**
 * Hook quản lý kho mã Coupon PMH
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../contexts/AuthContext';
import { lineBotFirestoreService } from '../services/lineBotFirestoreService';
import { Coupon, CouponStatus, StockSummaryItem, ParsedImportItem } from '../types/lineBot.types';

function removeVietnameseTones(str: string): string {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .trim();
}

export function useCouponManager() {
    const { user } = useAuth();
    const userId = user?.uid || '';

    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | CouponStatus>('ALL');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');

    const loadCoupons = useCallback(async () => {
        if (!userId) {
            setCoupons([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await lineBotFirestoreService.getCoupons(userId);
            setCoupons(data);
        } catch (error) {
            console.error('Lỗi tải danh sách coupon:', error);
            toast.error('Không thể tải danh sách mã coupon');
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadCoupons();
    }, [loadCoupons]);

    // Danh sách các loại PMH có trong kho
    const availableTypes = useMemo(() => {
        const set = new Set<string>();
        coupons.forEach(c => {
            if (c.type) set.add(c.type.trim());
        });
        return Array.from(set).sort();
    }, [coupons]);

    // Thống kê tồn kho tổng và theo từng loại
    const stockSummary = useMemo(() => {
        let totalUnused = 0;
        let totalSent = 0;
        let totalRevoked = 0;
        const byType = new Map<string, StockSummaryItem>();

        coupons.forEach(c => {
            const t = c.type?.trim() || 'PMH';
            if (!byType.has(t)) {
                byType.set(t, { type: t, total: 0, unused: 0, sent: 0, revoked: 0 });
            }
            const item = byType.get(t)!;
            item.total++;

            if (c.status === 'UNUSED' || !c.status) {
                totalUnused++;
                item.unused++;
            } else if (c.status === 'SENT') {
                totalSent++;
                item.sent++;
            } else if (c.status === 'REVOKED') {
                totalRevoked++;
                item.revoked++;
            }
        });

        return {
            total: coupons.length,
            unused: totalUnused,
            sent: totalSent,
            revoked: totalRevoked,
            breakdown: Array.from(byType.values())
        };
    }, [coupons]);

    // Danh sách sau khi lọc
    const filteredCoupons = useMemo(() => {
        const rawQuery = searchQuery.trim();
        const queryLower = rawQuery.toLowerCase();
        const queryNoTone = removeVietnameseTones(rawQuery);
        const queryWords = queryNoTone.split(/\s+/).filter(Boolean);

        return coupons.filter(c => {
            if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
            if (typeFilter !== 'ALL' && c.type?.trim() !== typeFilter) return false;

            if (rawQuery) {
                const fields = [
                    c.code,
                    c.orderId || '',
                    c.warehouse || '',
                    c.recipient || '',
                    c.productName || '',
                    c.syntax || ''
                ];

                // 1. So khớp trực tiếp (có dấu / chính xác chuỗi con)
                const directMatch = fields.some(f => f.toLowerCase().includes(queryLower));
                if (directMatch) return true;

                // 2. So khớp không dấu theo từng từ khoá độc lập
                const fieldsNoTone = fields.map(f => removeVietnameseTones(f)).join(' ');
                const allWordsMatch = queryWords.every(word => fieldsNoTone.includes(word));
                if (!allWordsMatch) return false;
            }

            return true;
        });
    }, [coupons, searchQuery, statusFilter, typeFilter]);

    // Nạp mã hàng loạt
    const importCoupons = useCallback(async (items: ParsedImportItem[]) => {
        if (!userId) return { added: 0, skipped: 0 };
        const res = await lineBotFirestoreService.addCouponsBatch(userId, items);
        await loadCoupons();
        return res;
    }, [userId, loadCoupons]);

    // Thu hồi mã về kho
    const revokeCoupon = useCallback(async (couponId: string, reason?: string) => {
        if (!userId) return;
        await lineBotFirestoreService.revokeCoupon(userId, couponId, reason);
        toast.success('Đã thu hồi mã về kho!');
        await loadCoupons();
    }, [userId, loadCoupons]);

    // Xóa mã
    const deleteCoupon = useCallback(async (couponId: string) => {
        if (!userId) return;
        await lineBotFirestoreService.deleteCoupon(userId, couponId);
        toast.success('Đã xoá mã khỏi kho');
        await loadCoupons();
    }, [userId, loadCoupons]);

    // Xóa tất cả mã trong kho
    const deleteAllCoupons = useCallback(async () => {
        if (!userId) return 0;
        const count = await lineBotFirestoreService.deleteAllCoupons(userId);
        await loadCoupons();
        return count;
    }, [userId, loadCoupons]);

    // Xuất kho ra file Excel
    const exportToExcel = useCallback(() => {
        if (coupons.length === 0) {
            toast.error('Kho chưa có mã nào để xuất!');
            return;
        }

        const data = coupons.map((c, idx) => ({
            'STT': idx + 1,
            'Mã Coupon': c.code,
            'Tên Sản Phẩm': c.productName || '',
            'Cú Pháp PMH': c.syntax || '',
            'Loại PMH': c.type,
            'Trạng Thái': c.status === 'UNUSED' ? 'Chưa dùng' : (c.status === 'SENT' ? 'Đã phát' : 'Thu hồi'),
            'Mã Đơn Hàng': c.orderId || '',
            'Mã Kho': c.warehouse || '',
            'Người Nhận': c.recipient || '',
            'LINE ID': c.recipientId || '',
            'Thời Gian Cập Nhật': c.updatedAt ? new Date(c.updatedAt).toLocaleString('vi-VN') : ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Kho Coupon PMH');
        XLSX.writeFile(wb, `Kho_Coupon_PMH_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success('Đã tải xuống file Excel kho coupon!');
    }, [coupons]);

    return {
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
        loadCoupons,
        importCoupons,
        revokeCoupon,
        deleteCoupon,
        deleteAllCoupons,
        exportToExcel
    };
}
