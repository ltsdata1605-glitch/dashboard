/**
 * Harness cho gd10-xac-nhan-va-bang.spec.ts (GĐ10 bước 1, 2026-10-15) — dựng component THẬT với dữ liệu mẫu, không cần đăng nhập:
 *  - `coupon-loc`: Bot LINE "Coupon đã lọc" (FilteredCouponsTab) — dữ liệu thật đọc Firestore theo tài khoản nên thay 2 hàm của
 *    service bằng dữ liệu mẫu (không gọi mạng, không xoá gì thật);
 *  - `ma-sp`: bảng Cấu hình mã sản phẩm có quyền sửa;
 *  - `hoi-3`: ConfirmDialog 3 lựa chọn (`extraAction`).
 * Mọi hành động ghi vào `window.__bam` để spec đối chiếu. Xoá trắng <body> (như industryTileHarness) để hộp thoại portal ra body
 * không bị lớp nào của app che.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FilteredCouponsTab } from '../../../features/line-bot/components/FilteredCouponsTab';
import { lineBotFirestoreService } from '../../../features/line-bot/services/lineBotFirestoreService';
import type { FilteredCouponRecord } from '../../../features/line-bot/types/lineBot.types';
import { ProductCodeConfigTable } from '../../../features/product-config/components/ProductCodeConfigTable';
import type { ProductCodeTableItem } from '../../../features/product-config/types';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';

const w = window as unknown as { __bam?: string[] };
const ghi = (s: string) => { (w.__bam ||= []).push(s); };

const bayGio = new Date().toISOString();
const COUPON: FilteredCouponRecord[] = Array.from({ length: 9 }, (_, i) => ({
    id: `f${i}`,
    code: `PMH${(73120 + i * 4099).toString(36).toUpperCase()}`,
    productName: ['Tủ lạnh Panasonic Inverter 410 lít NR-DZ601VGKV', 'Máy giặt LG Inverter 10 kg FV1410S4P', 'Tivi Samsung QLED 55 inch'][i % 3],
    recipient: ['@Nguyễn Văn An', '@Trần Thị Bình', '@Lê Văn Cường'][i % 3],
    orderId: i % 2 ? `MDH${1000 + i}` : undefined,
    cardIndex: (i % 4) + 1,
    status: i % 3 === 0 ? 'USED' : 'UNUSED',
    filteredAt: bayGio,
    usedBy: i % 3 === 0 ? 'Phạm Minh Đức' : undefined,
    usedAt: i % 3 === 0 ? bayGio : undefined,
}));

const SAN_PHAM: ProductCodeTableItem[] = [
    { maSanPham: '1234567', tenSanPham: 'Tủ lạnh Panasonic Inverter 410 lít', heSo: 1.2, loai: 'Tủ lạnh', nhom: 'Điện lạnh' },
    { maSanPham: '7654321', tenSanPham: 'Máy giặt LG Inverter 10 kg', heSo: 1, loai: 'Máy giặt', nhom: 'Điện lạnh' },
    { maSanPham: '5550001', tenSanPham: 'Nồi cơm điện Sharp 1.8 lít', heSo: 0.5, loai: 'Nồi cơm', nhom: 'Gia dụng' },
];

function BangMaSanPham() {
    const [items, setItems] = useState(SAN_PHAM);
    return (
        <ProductCodeConfigTable
            items={items}
            isEditable
            onDeleteItem={(ma) => { ghi(`xoa-ma:${ma}`); setItems((ds) => ds.filter((x) => x.maSanPham !== ma)); }}
        />
    );
}

function Hoi3LuaChon() {
    const [mo, setMo] = useState(true);
    return (
        <ConfirmDialog
            isOpen={mo}
            onClose={() => { ghi('huy'); setMo(false); }}
            variant="danger"
            title="Xoá dữ liệu YCX"
            message={'• Chỉ Realtime: xoá dữ liệu đang xem, các tệp lũy kế giữ nguyên.\n• Toàn bộ: xoá mọi tệp báo cáo tích lũy trên máy này và bản trên cloud — không hoàn tác được.'}
            extraAction={{ text: 'Chỉ xoá dữ liệu Realtime', variant: 'destructive', onClick: () => { ghi('chi-realtime'); setMo(false); } }}
            confirmText="Xoá toàn bộ dữ liệu tích lũy"
            onConfirm={() => { ghi('toan-bo'); setMo(false); }}
        />
    );
}

export function mount(loai: 'coupon-loc' | 'ma-sp' | 'hoi-3') {
    w.__bam = [];
    document.body.innerHTML = '<div id="harness" style="padding:12px;background:#f8fafc;min-height:100vh"></div>';
    if (loai === 'coupon-loc') {
        lineBotFirestoreService.getFilteredCoupons = async () => COUPON.map((c) => ({ ...c }));
        lineBotFirestoreService.deleteFilteredCoupons = async (uid: string) => { ghi(`xoa-het:${uid}`); };
    }
    createRoot(document.getElementById('harness')!).render(
        loai === 'coupon-loc' ? <FilteredCouponsTab userId="uid-mau" /> : loai === 'ma-sp' ? <BangMaSanPham /> : <Hoi3LuaChon />,
    );
}
