/** Harness cho coupon-bang-iphone.spec.ts — dựng CouponManagerTab THẬT với dữ liệu mẫu (mã coupon đọc từ Firestore theo tài khoản,
 *  Chế độ Dùng thử không có mã nào nên không thấy được bảng có dữ liệu). */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CouponManagerTab } from '../../../features/line-bot/components/CouponManagerTab';
import type { Coupon, CouponStatus } from '../../../features/line-bot/types/lineBot.types';

const now = new Date().toISOString();
const MAU: Coupon[] = Array.from({ length: 7 }, (_, i) => ({
    id: `c${i}`,
    code: `PMH${(483920 + i * 7919).toString(36).toUpperCase()}`,
    type: i % 3 === 0 ? 'Giờ Vàng Giá Sốc' : 'Event Cuối Tuần',
    productName: ['Tủ lạnh Panasonic NR-DZ601VGKV', 'Máy giặt LG Inverter 10 kg', 'Tivi Samsung 55 inch QLED'][i % 3],
    status: (['UNUSED', 'SENT', 'REVOKED'] as CouponStatus[])[i % 3],
    recipient: i % 3 === 1 ? 'Nguyễn Văn An' : undefined,
    createdAt: now,
    updatedAt: now,
    expiryDate: '2026-12-31',
    copiedAt: i % 3 === 1 ? now : undefined,
} as Coupon));

function Harness() {
    const [q, setQ] = useState('');
    const [st, setSt] = useState<'ALL' | CouponStatus>('ALL');
    const [ty, setTy] = useState('ALL');
    const w = window as unknown as { __bam?: string[] };
    const ghi = (s: string) => { (w.__bam ||= []).push(s); };
    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'auto', zIndex: 2_000_000, background: '#f8fafc', padding: 12 }}>
            <CouponManagerTab
                coupons={MAU} filteredCoupons={MAU} isLoading={false}
                searchQuery={q} setSearchQuery={setQ} statusFilter={st} setStatusFilter={setSt} typeFilter={ty} setTypeFilter={setTy}
                availableTypes={['Giờ Vàng Giá Sốc', 'Event Cuối Tuần']}
                stockSummary={{ total: 7, unused: 3, sent: 2, revoked: 2, breakdown: [] }}
                onImportCoupons={async () => ({ added: 0, skipped: 0 })}
                onRevokeCoupon={async (id) => ghi(`thu-hoi:${id}`)}
                onDeleteCoupon={async (id) => ghi(`xoa:${id}`)}
                onDeleteAllCoupons={async () => 0}
                onExportExcel={() => ghi('excel')}
                onRefresh={() => ghi('lam-moi')}
            />
        </div>
    );
}

export function mountHarness() {
    const el = document.createElement('div');
    el.id = 'coupon-table-harness';
    document.body.appendChild(el);
    createRoot(el).render(<Harness />);
}
