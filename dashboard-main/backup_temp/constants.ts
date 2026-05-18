
import type { WarehouseColumnConfig, WarehouseMetricType } from './types';

export const COL = {
    ID: ['Mã Đơn Hàng', 'Mã đơn hàng'],
    PRODUCT: ['Tên Sản Phẩm', 'Tên sản phẩm'],
    CUSTOMER_NAME: ['Tên Khách Hàng', 'Tên khách hàng'],
    QUANTITY: ['Số Lượng', 'Số lượng'],
    PRICE: ['Giá bán_1'],
    ORIGINAL_PRICE: ['Giá bán'],
    KHO: ['Mã kho tạo'],
    TRANG_THAI: ['Trạng thái hồ sơ'],
    NGUOI_TAO: ['Người tạo'],
    XUAT: ['Trạng thái xuất'],
    DATE_CREATED: ['Ngày tạo'],
    HINH_THUC_XUAT: ['Hình thức xuất'],
    TINH_TRANG_NHAP_TRA: ['Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính'],
    TRANG_THAI_THU_TIEN: ['Trạng thái thu tiền'],
    TRANG_THAI_HUY: ['Trạng thái hủy'],
    MA_NGANH_HANG: ['Ngành Hàng', 'Ngành hàng'],
    MA_NHOM_HANG: ['Nhóm Hàng', 'Nhóm hàng'],
    MANUFACTURER: ['Nhà sản xuất', 'Hãng']
};

export const HINH_THUC_XUAT_THU_HO = new Set(['Xuất dịch vụ thu hộ cước Payoo', 'Xuất dịch vụ thu hộ qua Epay', 'Xuất dịch vụ thu hộ qua SmartNet', 'Xuất dịch vụ thu hộ qua tổng công ty Viettel', 'Xuất dịch vụ thu hộ nạp tiền vào ví', 'Xuất dịch vụ thu hộ cước Bảo Kim']);
export const HINH_THUC_XUAT_TIEN_MAT = new Set(['Xuất bán hàng Online tại siêu thị', 'Xuất bán hàng online tiết kiệm', 'Xuất bán hàng tại siêu thị', 'Xuất bán hàng tại siêu thị (TCĐM)', 'Xuất bán Online giá rẻ', 'Xuất bán pre-order tại siêu thị', 'Xuất bán ưu đãi cho nhân viên', 'Xuất dịch vụ thu hộ bảo hiểm', 'Xuất đổi bảo hành sản phẩm IMEI', 'Xuất đổi bảo hành tại siêu thị']);
export const HINH_THUC_XUAT_TRA_GOP = new Set(['Xuất bán hàng trả góp Online', 'Xuất bán hàng trả góp Online giá rẻ', 'Xuất bán hàng trả góp online tiết kiệm', 'Xuất bán hàng trả góp tại siêu thị', 'Xuất bán hàng trả góp tại siêu thị (TCĐM)', 'Xuất bán trả góp ưu đãi cho nhân viên', 'Xuất đổi bảo hành sản phẩm trả góp có IMEI', 'Xuất bán trả góp cho NV phục vụ công việc']);

// --- WAREHOUSE REPORT CONFIGURATION ---

export const WAREHOUSE_METRIC_TYPE_MAP: Record<WarehouseMetricType, string> = {
    quantity: 'Số Lượng',
    revenue: 'Doanh Thu Thực',
    revenueQD: 'Doanh Thu QĐ'
};

export const WAREHOUSE_HEADER_COLORS: Record<string, { border: string; sub: string; text: string; }> = {
    'KHO': { border: 'border-rose-200 dark:border-rose-800', sub: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' },
    'Doanh Thu': { border: 'border-sky-200 dark:border-sky-800', sub: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300' },
    'TRAFFIC & TỶ LỆ TC/DT': { border: 'border-slate-200 dark:border-slate-800', sub: 'bg-slate-50 dark:bg-slate-900/30', text: 'text-slate-600 dark:text-slate-400' },
    'SP CHÍNH': { border: 'border-emerald-200 dark:border-emerald-800', sub: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
    'SL BÁN KÈM': { border: 'border-purple-200 dark:border-purple-800', sub: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
    'DT THỰC': { border: 'border-fuchsia-200 dark:border-fuchsia-800', sub: 'bg-fuchsia-50 dark:bg-fuchsia-900/30', text: 'text-fuchsia-700 dark:text-fuchsia-300' },
    'Phụ Kiện': { border: 'border-amber-200 dark:border-amber-800', sub: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
    'Gia Dụng': { border: 'border-orange-200 dark:border-orange-800', sub: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
    'DEFAULT': { border: 'border-slate-200 dark:border-slate-700', sub: 'bg-slate-50 dark:bg-slate-900/20', text: 'text-slate-500 dark:text-slate-400' },
};

export const DEFAULT_WAREHOUSE_COLUMNS: WarehouseColumnConfig[] = [
    { id: 'dt_thuc', order: 1, isVisible: true, isCustom: false, metric: 'doanhThuThuc', mainHeader: 'Doanh Thu', subHeader: 'D.THU' },
    { id: 'dt_qd', order: 2, isVisible: true, isCustom: false, metric: 'doanhThuQD', mainHeader: 'Doanh Thu', subHeader: 'DTQĐ' },
    { id: 'target_dt', order: 3, isVisible: true, isCustom: false, metric: 'target', mainHeader: 'Doanh Thu', subHeader: 'TARGET' },
    { id: 'percent_ht', order: 4, isVisible: true, isCustom: false, metric: 'percentHT', mainHeader: 'Doanh Thu', subHeader: '%HT' },
    { id: 'hqqd', order: 5, isVisible: true, isCustom: false, metric: 'hieuQuaQD', mainHeader: 'Doanh Thu', subHeader: 'HQQĐ' },
    { id: 'traffic_th', order: 6, isVisible: true, isCustom: false, metric: 'slThuHo', mainHeader: 'TRAFFIC & TỶ LỆ TC/DT', subHeader: 'T.HỘ' },
    { id: 'traffic_tc', order: 7, isVisible: true, isCustom: false, metric: 'slTiepCan', mainHeader: 'TRAFFIC & TỶ LỆ TC/DT', subHeader: 'T.CẬN' },
    { id: 'traffic_tracham', order: 8, isVisible: true, isCustom: false, metric: 'traChamPercent', mainHeader: 'TRAFFIC & TỶ LỆ TC/DT', subHeader: 'T.CHẬM' },
    { id: 'spc_ce', order: 9, isVisible: true, isCustom: false, categoryType: 'industry', categoryName: 'CE', metricType: 'quantity', mainHeader: 'SP CHÍNH', subHeader: 'CE' },
    { id: 'spc_ict', order: 10, isVisible: true, isCustom: false, categoryType: 'industry', categoryName: 'ICT', metricType: 'quantity', mainHeader: 'SP CHÍNH', subHeader: 'ICT' },
    { id: 'bk_sim', order: 11, isVisible: true, isCustom: false, categoryType: 'industry', categoryName: 'Sim', metricType: 'quantity', mainHeader: 'SL BÁN KÈM', subHeader: 'SIM' },
    { id: 'bk_dh', order: 12, isVisible: true, isCustom: false, categoryType: 'industry', categoryName: 'Đồng hồ', metricType: 'quantity', mainHeader: 'SL BÁN KÈM', subHeader: 'Đ.HỒ TT' },
    { id: 'bk_smw', order: 13, isVisible: true, isCustom: false, categoryType: 'industry', categoryName: 'Wearable', metricType: 'quantity', mainHeader: 'SL BÁN KÈM', subHeader: 'SMW' },
    { id: 'dthh_bh', order: 14, isVisible: true, isCustom: false, categoryType: 'industry', categoryName: 'Bảo hiểm', metricType: 'revenue', mainHeader: 'DT THỰC', subHeader: 'B.HIỂM' },
    { id: 'dthh_pk', order: 15, isVisible: true, isCustom: false, categoryType: 'industry', categoryName: 'Phụ kiện', metricType: 'revenue', mainHeader: 'DT THỰC', subHeader: 'P.KIỆN' },
    { id: 'dthh_dgd', order: 16, isVisible: true, isCustom: false, categoryType: 'industry', categoryName: 'Gia dụng', metricType: 'revenue', mainHeader: 'DT THỰC', subHeader: 'ĐGD' },
];
