import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

export const TEST_EMPLOYEE = '195025 - Nguyễn Thị Mỹ Linh';
const TEST_KHO = '99999';

const today = new Date();
const d = (day: Date) => `${String(day.getDate()).padStart(2, '0')}/${String(day.getMonth() + 1).padStart(2, '0')}/${day.getFullYear()} 09:30`;

type Row = {
    order: string; product: string; customer: string; qty: number; price: number;
    industry: string; group: string; code: string;
};

/**
 * `Nhóm Hàng` phải là MÃ nhóm hàng theo cấu hình thật (productConfig.childToParentMap dùng mã số
 * làm khoá — tên tiếng Việt sẽ rơi vào "nhóm hàng mới chưa cấu hình" và bị bỏ qua hết).
 * Các mã dưới đây đọc trực tiếp từ cấu hình app tải về: 1491=Smartphone(ICT), 4219=Camera(Phụ kiện),
 * 12=Pin SDP(Phụ kiện), 1031=Loa(Phụ kiện), 4171=Máy lọc nước(Gia dụng), 4156=Nồi cơm(Gia dụng).
 */
const ROWS: Row[] = [
    { order: 'SO001', product: 'Điện thoại iPhone 17 Pro Max 256GB', customer: 'LÂM THỊ CẨM YẾN', qty: 1, price: 31_000_000, industry: 'ICT', group: '1491', code: 'SP001' },
    { order: 'SO001', product: 'Pin sạc dự phòng Polymer 20000mAh Type C PD QC 3.0 22.5W Xmobile CarryOn Y112 Xám kèm Cáp Lightning và Type C', customer: 'LÂM THỊ CẨM YẾN', qty: 1, price: 602_000, industry: 'Phụ kiện', group: '12', code: 'SP002' },
    { order: 'SO002', product: 'Camera EZVIZ C6N', customer: 'TRƯƠNG NHƯ QUỲNH', qty: 2, price: 1_500_000, industry: 'Phụ kiện', group: '4219', code: 'SP003' },
    { order: 'SO003', product: 'Máy lọc nước RO Toshiba TWP-W2396SVN', customer: 'TRẦN THỊ THÚY AN', qty: 1, price: 7_000_000, industry: 'Gia dụng', group: '4171', code: 'SP004' },
    { order: 'SO004', product: 'Nồi cơm điện Sharp KS-223TJV', customer: 'LÊ THỊ Ý', qty: 1, price: 708_000, industry: 'Gia dụng', group: '4156', code: 'SP005' },
    { order: 'SO005', product: 'Loa Bluetooth Alpha Works Sonik 120 Đen', customer: 'TRẦN NAM LÀO', qty: 1, price: 3_000_000, industry: 'Phụ kiện', group: '1031', code: 'SP006' },
];

/** Tạo file Excel dữ liệu bán hàng tối thiểu cho module Phân Tích, trả về đường dẫn file tạm. */
export function createSalesXlsx(): string {
    const rows = ROWS.map(r => ({
        'Mã Đơn Hàng': r.order,
        'Tên Sản Phẩm': r.product,
        'Tên Khách Hàng': r.customer,
        'Số Lượng': r.qty,
        'Giá bán_1': r.price,
        'Giá bán': r.price,
        'Mã kho tạo': TEST_KHO,
        'Kho tạo': `Kho ${TEST_KHO}`,
        'Người tạo': TEST_EMPLOYEE,
        'Trạng thái xuất': 'Đã xuất',
        'Ngày tạo': d(today),
        'Thời gian hẹn giao': d(today),
        'Hình thức xuất': 'Xuất bán hàng tại siêu thị',
        'Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính': 'Chưa trả',
        'Trạng thái thu tiền': 'Đã thu',
        'Trạng thái hủy': 'Chưa hủy',
        // Bộ lọc mặc định của app là trangThai = ['1 - Mới'] (hooks/useFilterState.ts) — để giá trị
        // khác thì toàn bộ dòng bị lọc ra và mọi KPI về 0.
        'Trạng thái hồ sơ': '1 - Mới',
        'Ngành Hàng': r.industry,
        'Nhóm Hàng': r.group,
        'Nhà sản xuất': 'Khác',
        'Mã sản phẩm': r.code,
    }));

    const dir = mkdtempSync(join(tmpdir(), 'ycx-e2e-'));
    const file = join(dir, 'sales.xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Data');
    XLSX.writeFile(wb, file);
    if (!existsSync(file)) throw new Error('Không tạo được file Excel test');
    return file;
}
