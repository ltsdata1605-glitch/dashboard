// Trang thử cho tests/e2e/mau-nganh-modal.spec.ts — dựng ĐÚNG 2 modal thật "chưa xuất" / "chưa thu" với 12 ngành.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { DashboardContext } from '../../../contexts/DashboardContext';
import UnshippedOrdersModal from '../../../components/modals/UnshippedOrdersModal';
import UncollectedOrdersModal from '../../../components/modals/UncollectedOrdersModal';

export const NGANH = ['Smartphone', 'Laptop', 'Tablet', 'Phụ kiện', 'Gia dụng', 'Wearable', 'CE', 'Bảo hiểm', 'Sim', 'Máy lọc nước', 'Vieon', 'Khác'];

// Doanh thu giảm dần theo thứ tự → modal xếp đúng thứ tự trên; mỗi ngành 1 đơn, mã nhóm hàng G<i> → ngành thứ i.
const rows = NGANH.map((_, i) => ({
    'Mã đơn hàng': `SO${i}`, 'Tên Sản Phẩm': `Sản phẩm ${i}`, 'Mã sản phẩm': `SP${i}`, 'Số Lượng': 1,
    'Giá bán_1': (20 - i) * 1_000_000, 'Giá bán': (20 - i) * 1_000_000, 'Nhóm Hàng': `G${i}`, 'Người tạo': '101 - Nguyễn Văn A',
}));
const productConfig = {
    groups: {}, subgroups: {}, childToSubgroupMap: {}, quantityMultiplierMap: {}, vasMultiplierMap: {}, vasNameMultiplierMap: {},
    childToParentMap: Object.fromEntries(NGANH.map((n, i) => [`G${i}`, n])),
};

export function mount(loai: 'chua-xuat' | 'chua-thu') {
    document.body.innerHTML = '<div id="harness"></div>';
    const value = { processedData: { unshippedOrders: rows, uncollectedOrders: rows }, productConfig } as never;
    createRoot(document.getElementById('harness')!).render(
        <DashboardContext.Provider value={value}>
            {loai === 'chua-xuat'
                ? <UnshippedOrdersModal isOpen onClose={() => {}} onExport={async () => {}} />
                : <UncollectedOrdersModal isOpen onClose={() => {}} onExport={async () => {}} onExportSheet={() => {}} />}
        </DashboardContext.Provider>,
    );
}
