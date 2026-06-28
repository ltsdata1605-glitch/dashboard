
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
    DATE_CREATED: ['Ngày tạo', 'Ngày Tạo'],
    HINH_THUC_XUAT: ['Hình thức xuất'],
    TINH_TRANG_NHAP_TRA: ['Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính'],
    TRANG_THAI_THU_TIEN: ['Trạng thái thu tiền'],
    TRANG_THAI_HUY: ['Trạng thái hủy'],
    MA_NGANH_HANG: ['Ngành Hàng', 'Ngành hàng'],
    MA_NHOM_HANG: ['Nhóm Hàng', 'Nhóm hàng'],
    MANUFACTURER: ['Nhà sản xuất', 'Hãng'],
    PRODUCT_CODE: ['Mã sản phẩm'],
    KHO_TAO: ['Kho tạo', 'Kho Tạo'],
    TRANG_THAI_GIAO_HANG: ['Trạng thái giao hàng', 'Trạng thái giao']
};

export const HINH_THUC_XUAT_THU_HO = new Set(['Xuất dịch vụ thu hộ cước Payoo', 'Xuất dịch vụ thu hộ qua Epay', 'Xuất dịch vụ thu hộ qua SmartNet', 'Xuất dịch vụ thu hộ qua tổng công ty Viettel', 'Xuất dịch vụ thu hộ nạp tiền vào ví', 'Xuất dịch vụ thu hộ cước Bảo Kim']);
export const HINH_THUC_XUAT_TIEN_MAT = new Set(['Xuất bán hàng Online tại siêu thị', 'Xuất bán hàng online tiết kiệm', 'Xuất bán hàng tại siêu thị', 'Xuất bán hàng tại siêu thị (TCĐM)', 'Xuất bán Online giá rẻ', 'Xuất bán pre-order tại siêu thị', 'Xuất bán ưu đãi cho nhân viên', 'Xuất dịch vụ thu hộ bảo hiểm', 'Xuất đổi bảo hành sản phẩm IMEI', 'Xuất đổi bảo hành tại siêu thị']);
export const HINH_THUC_XUAT_TRA_GOP = new Set(['Xuất bán hàng trả góp Online', 'Xuất bán hàng trả góp Online giá rẻ', 'Xuất bán hàng trả góp online tiết kiệm', 'Xuất bán hàng trả góp tại siêu thị', 'Xuất bán hàng trả góp tại siêu thị (TCĐM)', 'Xuất bán trả góp ưu đãi cho nhân viên', 'Xuất đổi bảo hành sản phẩm trả góp có IMEI', 'Xuất bán trả góp cho NV phục vụ công việc']);

// --- DATA STATUS COLORS (Dùng chung toàn dự án) ---
// Tiêu chí tốt / tăng → Xanh lá pastel
// Tiêu chí xấu / giảm / cảnh báo → Đỏ pastel
export const DATA_STATUS_COLORS = {
    positive: {
        bg: '#d1fae5',           // emerald-100
        text: '#047857',         // emerald-700
        tailwind: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    },
    negative: {
        bg: '#ffe4e6',           // rose-100
        text: '#be123c',         // rose-700
        tailwind: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
    },
} as const;

// --- WAREHOUSE REPORT CONFIGURATION ---

export const WAREHOUSE_METRIC_TYPE_MAP: Record<WarehouseMetricType, string> = {
    quantity: 'Số Lượng',
    revenue: 'Doanh Thu Thực',
    revenueQD: 'Doanh Thu QĐ'
};

export const WAREHOUSE_HEADER_COLORS: Record<string, { border: string; sub: string; text: string; }> = {
    'KHO': { border: 'border-rose-200 dark:border-rose-800', sub: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' },
    'Doanh Thu': { border: 'border-sky-200 dark:border-sky-800', sub: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300' },
    'SP CHÍNH': { border: 'border-emerald-200 dark:border-emerald-800', sub: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
    'MÙA VỤ': { border: 'border-orange-200 dark:border-orange-800', sub: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
    'TRAFFIC': { border: 'border-slate-200 dark:border-slate-800', sub: 'bg-slate-50 dark:bg-slate-900/30', text: 'text-slate-600 dark:text-slate-400' },
    'SL PHỤ KIỆN': { border: 'border-purple-200 dark:border-purple-800', sub: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
    'DỊCH VỤ': { border: 'border-fuchsia-200 dark:border-fuchsia-800', sub: 'bg-fuchsia-50 dark:bg-fuchsia-900/30', text: 'text-fuchsia-700 dark:text-fuchsia-300' },
    'SL GIA DỤNG': { border: 'border-amber-200 dark:border-amber-800', sub: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
    'DEFAULT': { border: 'border-slate-200 dark:border-slate-700', sub: 'bg-slate-50 dark:bg-slate-900/20', text: 'text-slate-500 dark:text-slate-400' },
};

export const DEFAULT_WAREHOUSE_COLUMNS: WarehouseColumnConfig[] = [
    // --- DOANH THU ---
    { id: 'dt_thuc', order: 1, isVisible: false, isCustom: false, metric: 'doanhThuThuc', mainHeader: 'Doanh Thu', subHeader: 'DT' },
    { id: 'dt_qd', order: 2, isVisible: true, isCustom: false, metric: 'doanhThuQD', mainHeader: 'Doanh Thu', subHeader: 'DTQĐ' },
    { id: 'target_dt', order: 3, isVisible: true, isCustom: false, metric: 'target', mainHeader: 'Doanh Thu', subHeader: 'TAR' },
    { id: 'percent_ht', order: 4, isVisible: false, isCustom: false, metric: 'percentHT', mainHeader: 'Doanh Thu', subHeader: '%HT' },
    { id: 'hqqd', order: 5, isVisible: true, isCustom: false, metric: 'hieuQuaQD', mainHeader: 'Doanh Thu', subHeader: '%QĐ' },
    { id: 'traffic_tracham', order: 6, isVisible: true, isCustom: false, metric: 'traChamPercent', mainHeader: 'Doanh Thu', subHeader: '%TC' },
    // --- SP CHÍNH (NhomCha) ---
    { id: 'spc_ce', order: 7, isVisible: true, isCustom: false, categoryType: 'industry', categoryName: 'CE', metricType: 'quantity', mainHeader: 'SP CHÍNH', subHeader: 'CE' },
    { id: 'spc_ict', order: 8, isVisible: true, isCustom: false, categoryType: 'industry', categoryName: 'ICT', metricType: 'quantity', mainHeader: 'SP CHÍNH', subHeader: 'ICT' },
    // --- MÙA VỤ (NhomCon) ---
    { id: 'mv_mlanh', order: 9, isVisible: true, isCustom: false, categoryType: 'group', categoryName: 'Máy lạnh', metricType: 'quantity', mainHeader: 'MÙA VỤ', subHeader: 'M.Lạnh' },
    { id: 'mv_tivi', order: 10, isVisible: true, isCustom: false, categoryType: 'group', categoryName: 'Tivi', metricType: 'quantity', mainHeader: 'MÙA VỤ', subHeader: 'TIVI' },
    { id: 'mv_mgiat', order: 11, isVisible: false, isCustom: false, categoryType: 'group', categoryName: 'Máy giặt', metricType: 'quantity', mainHeader: 'MÙA VỤ', subHeader: 'M.Giặt' },
    { id: 'mv_mnn', order: 12, isVisible: false, isCustom: false, categoryType: 'group', categoryName: 'Máy nước nóng', metricType: 'quantity', mainHeader: 'MÙA VỤ', subHeader: 'MNN' },
    { id: 'mv_tl', order: 13, isVisible: false, isCustom: false, categoryType: 'group', categoryName: 'Tủ lạnh', metricType: 'quantity', mainHeader: 'MÙA VỤ', subHeader: 'T.Lạnh' },
    { id: 'mv_td', order: 14, isVisible: false, isCustom: false, categoryType: 'group', categoryName: 'Tủ đông', metricType: 'quantity', mainHeader: 'MÙA VỤ', subHeader: 'T.Đông' },
    { id: 'mv_tmat', order: 15, isVisible: false, isCustom: false, categoryType: 'group', categoryName: 'Tủ mát', metricType: 'quantity', mainHeader: 'MÙA VỤ', subHeader: 'T.Mát' },
    { id: 'mv_msay', order: 16, isVisible: false, isCustom: false, categoryType: 'group', categoryName: 'Máy sấy', metricType: 'quantity', mainHeader: 'MÙA VỤ', subHeader: 'M.Sấy' },
    { id: 'mv_loakeo', order: 17, isVisible: false, isCustom: false, categoryType: 'group', categoryName: 'Loa Karaoke', metricType: 'quantity', mainHeader: 'MÙA VỤ', subHeader: 'Loa Kéo' },
    { id: 'mv_smp', order: 18, isVisible: true, isCustom: false, categoryType: 'group', categoryName: 'Smartphone', metricType: 'quantity', mainHeader: 'MÙA VỤ', subHeader: 'SMP' },
    { id: 'mv_lap', order: 19, isVisible: true, isCustom: false, categoryType: 'group', categoryName: 'Laptop', metricType: 'quantity', mainHeader: 'MÙA VỤ', subHeader: 'LAP' },
    { id: 'mv_tab', order: 20, isVisible: false, isCustom: false, categoryType: 'group', categoryName: 'Tablet', metricType: 'quantity', mainHeader: 'MÙA VỤ', subHeader: 'TAB' },
    // --- TRAFFIC ---
    { id: 'traffic_th', order: 21, isVisible: false, isCustom: false, metric: 'slThuHo', mainHeader: 'TRAFFIC', subHeader: 'T.HỘ' },
    { id: 'traffic_tc', order: 22, isVisible: false, isCustom: false, metric: 'slTiepCan', mainHeader: 'TRAFFIC', subHeader: 'T.CẬN' },
    // --- SL PHỤ KIỆN ---
    { id: 'pk_cam', order: 23, isVisible: true, isCustom: false, categoryType: 'group', categoryName: 'Camera', metricType: 'quantity', mainHeader: 'SL PHỤ KIỆN', subHeader: 'CAM' },
    { id: 'pk_sdp', order: 24, isVisible: true, isCustom: false, categoryType: 'group', categoryName: 'Pin SDP', metricType: 'quantity', mainHeader: 'SL PHỤ KIỆN', subHeader: 'SDP' },
    { id: 'pk_tnghe', order: 25, isVisible: false, isCustom: false, categoryType: 'group', categoryName: 'Tai nghe BLT', metricType: 'quantity', mainHeader: 'SL PHỤ KIỆN', subHeader: 'TN BLT' },
    { id: 'pk_loa', order: 26, isVisible: true, isCustom: false, categoryType: 'group', categoryName: 'Loa', metricType: 'quantity', mainHeader: 'SL PHỤ KIỆN', subHeader: 'Loa' },
    { id: 'pk_dh', order: 27, isVisible: true, isCustom: false, categoryType: 'industry', categoryName: 'Đồng hồ', metricType: 'quantity', mainHeader: 'SL PHỤ KIỆN', subHeader: 'Đ.HỒ' },
    { id: 'pk_den', order: 28, isVisible: true, isCustom: false, categoryType: 'group', categoryName: 'Đèn NLMT', metricType: 'quantity', mainHeader: 'SL PHỤ KIỆN', subHeader: 'Đèn' },
    // --- DỊCH VỤ ---
    { id: 'pk_sim', order: 29, isVisible: true, isCustom: false, categoryType: 'industry', categoryName: 'Sim', metricType: 'quantity', mainHeader: 'DỊCH VỤ', subHeader: 'SIM' },
    { id: 'pk_vieon', order: 30, isVisible: true, isCustom: false, categoryType: 'group', categoryName: 'Vieon', metricType: 'quantity', mainHeader: 'DỊCH VỤ', subHeader: 'VIEON' },
    // --- SL GIA DỤNG (NhomCon) ---
    { id: 'gd_mln', order: 31, isVisible: true, isCustom: false, categoryType: 'group', categoryName: 'Máy lọc nước', metricType: 'quantity', mainHeader: 'SL GIA DỤNG', subHeader: 'MLN' },
    { id: 'gd_qdh', order: 32, isVisible: true, isCustom: false, categoryType: 'group', categoryName: 'Quạt điều hòa', metricType: 'quantity', mainHeader: 'SL GIA DỤNG', subHeader: 'QĐH' },
    { id: 'gd_qdien', order: 33, isVisible: true, isCustom: false, categoryType: 'group', categoryName: 'Quạt điện', metricType: 'quantity', mainHeader: 'SL GIA DỤNG', subHeader: 'Q.Điện' },
    { id: 'gd_ncom', order: 34, isVisible: true, isCustom: false, categoryType: 'group', categoryName: 'Nồi cơm', metricType: 'quantity', mainHeader: 'SL GIA DỤNG', subHeader: 'N.Cơm' },
    { id: 'gd_nchien', order: 35, isVisible: false, isCustom: false, categoryType: 'group', categoryName: 'Nồi chiên', metricType: 'quantity', mainHeader: 'SL GIA DỤNG', subHeader: 'N.Chiên' },
];

export const DEFAULT_INDUSTRY_COLUMNS: any[] = [
    { id: 'dt_thuc', order: 1, isVisible: true, isCustom: false, type: 'data', filters: { selectedIndustries: [], selectedSubgroups: [], selectedManufacturers: [], productCodes: [], metricType: 'revenue' }, mainHeader: 'Doanh Thu', subHeader: 'DT Thực' },
    { id: 'dt_qd', order: 2, isVisible: true, isCustom: false, type: 'data', filters: { selectedIndustries: [], selectedSubgroups: [], selectedManufacturers: [], productCodes: [], metricType: 'revenueQD' }, mainHeader: 'Doanh Thu', subHeader: 'DTQĐ' },
    // SP Chính
    { id: 'spc_ict', order: 3, isVisible: true, isCustom: false, type: 'data', filters: { selectedIndustries: ['ICT'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [], metricType: 'quantity' }, mainHeader: 'SP CHÍNH', subHeader: 'SL ICT' },
    { id: 'spc_ce', order: 4, isVisible: true, isCustom: false, type: 'data', filters: { selectedIndustries: ['CE'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [], metricType: 'quantity' }, mainHeader: 'SP CHÍNH', subHeader: 'SL CE' },
    { id: 'spc_dgd', order: 5, isVisible: true, isCustom: false, type: 'data', filters: { selectedIndustries: ['Gia dụng'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [], metricType: 'quantity' }, mainHeader: 'SP CHÍNH', subHeader: 'SL ĐGD' },
    // SIM
    { id: 'sim_sl', order: 6, isVisible: true, isCustom: false, type: 'data', filters: { selectedIndustries: ['Sim'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [], metricType: 'quantity' }, mainHeader: 'SIM', subHeader: 'S.Lượng' },
    { id: 'sim_dt', order: 7, isVisible: true, isCustom: false, type: 'data', filters: { selectedIndustries: ['Sim'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [], metricType: 'revenue' }, mainHeader: 'SIM', subHeader: 'D.Thu' },
    // Đồng hồ
    { id: 'dh_sl', order: 8, isVisible: true, isCustom: false, type: 'data', filters: { selectedIndustries: ['Đồng hồ', 'Wearable'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [], metricType: 'quantity' }, mainHeader: 'ĐỒNG HỒ', subHeader: 'S.Lượng' },
    { id: 'dh_dt', order: 9, isVisible: true, isCustom: false, type: 'data', filters: { selectedIndustries: ['Đồng hồ', 'Wearable'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [], metricType: 'revenue' }, mainHeader: 'ĐỒNG HỒ', subHeader: 'D.Thu' },
    // Phụ Kiện
    { id: 'pk_sl', order: 10, isVisible: true, isCustom: false, type: 'data', filters: { selectedIndustries: ['Phụ kiện'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [], metricType: 'quantity' }, mainHeader: 'PHỤ KIỆN', subHeader: 'S.Lượng' },
    { id: 'pk_dt', order: 11, isVisible: true, isCustom: false, type: 'data', filters: { selectedIndustries: ['Phụ kiện'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [], metricType: 'revenue' }, mainHeader: 'PHỤ KIỆN', subHeader: 'D.Thu' },
    // Gia dụng
    { id: 'gd_sl', order: 12, isVisible: true, isCustom: false, type: 'data', filters: { selectedIndustries: ['Gia dụng'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [], metricType: 'quantity' }, mainHeader: 'GIA DỤNG', subHeader: 'S.Lượng' },
    { id: 'gd_dt', order: 13, isVisible: true, isCustom: false, type: 'data', filters: { selectedIndustries: ['Gia dụng'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [], metricType: 'revenue' }, mainHeader: 'GIA DỤNG', subHeader: 'D.Thu' },
    // Bảo hiểm
    { id: 'bh_sl', order: 14, isVisible: true, isCustom: false, type: 'data', filters: { selectedIndustries: ['Bảo hiểm'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [], metricType: 'quantity' }, mainHeader: 'BẢO HIỂM', subHeader: 'S.Lượng' },
    { id: 'bh_dt', order: 15, isVisible: true, isCustom: false, type: 'data', filters: { selectedIndustries: ['Bảo hiểm'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [], metricType: 'revenue' }, mainHeader: 'BẢO HIỂM', subHeader: 'D.Thu' }
];

export const DEFAULT_KPI_CARDS: import('./types').KpiCardConfig[] = [
    {
        id: 'kpi-dtthuc',
        order: 1,
        isVisible: true,
        title: 'DT Thực',
        icon: 'dollar-sign',
        iconColor: 'emerald',
        type: 'metric',
        metric: 'totalRevenue',
        format: 'currency',
        hasTarget: false,
        targetType: 'none',
    },
    {
        id: 'kpi-dtqd',
        order: 2,
        isVisible: true,
        title: 'DTQĐ',
        icon: 'trending-up',
        iconColor: 'blue',
        type: 'metric',
        metric: 'doanhThuQD',
        format: 'currency',
        hasTarget: true,
        targetType: 'global',
        targetRef: 'hieuQua',
    },
    {
        id: 'kpi-hieuqua',
        order: 3,
        isVisible: true,
        title: 'HQQĐ',
        icon: 'activity',
        iconColor: 'purple',
        type: 'metric',
        metric: 'hieuQuaQD',
        format: 'percentage',
        hasTarget: true,
        targetType: 'global',
        targetRef: 'hieuQua',
    },
    {
        id: 'kpi-tragop',
        order: 4,
        isVisible: true,
        title: 'Trả Chậm',
        icon: 'credit-card',
        iconColor: 'amber',
        type: 'metric',
        metric: 'traGopPercent',
        format: 'percentage',
        hasTarget: true,
        targetType: 'global',
        targetRef: 'traGop',
    },
    {
        id: 'kpi-dtchuaxuat',
        order: 5,
        isVisible: true,
        title: 'Chưa Xuất',
        icon: 'package-x',
        iconColor: 'rose',
        type: 'metric',
        metric: 'doanhThuThucChoXuat',
        format: 'currency',
        hasTarget: false,
        targetType: 'none',
    }
];

export const DEFAULT_QUANTITY_MULTIPLIER_MAP: Record<string, number> = {
    '1640571000003': 1.0,
    '1640571000004': 2.0,
    '1640571000015': 4.0,
    '1640571000006': 1.0,
    '1640571000007': 2.0,
    '1640571000019': 4.0,
    '1640571000005': 8.0,
    '1640611000003': 1.0,
    '1640611000005': 2.0,
    '1640611000021': 2.0,
    '1640611000023': 2.0,
    '1640611000024': 2.0,
    '1640571000039': 2.0,
    '1640571000043': 4.0,
    '1640611000022': 1.0,
    '1640611000017': 5.0,
    '1640611000014': 1.5,
    '1640611000025': 1.0,
    '1640611000016': 5.0,
    '1640611000015': 4.0,
    '1640611000018': 5.0,
    '1640611000019': 7.0,
    '1640611000026': 4.0,
    '1640611000027': 7.0,
    '1640611000028': 1.5,
    '1640571000075': 1.0,
    '1640571000076': 1.0,
    '1640571000077': 2.0,
    '1640571000078': 4.0,
    '1640571000462': 1.0,
    '1640571000463': 1.0,
    '1640571000464': 2.0,
    '1640571000465': 4.0,
    '1640571000048': 1.0,
    '1640571000049': 3.0,
    '1640571000050': 7.0,
    '1640571000051': 10.0,
    '1640571000052': 13.0,
    '1640571000466': 1.0,
    '1640571000467': 2.0,
    '1640571000468': 4.0,
    '1640571000469': 8.0,
    '1640571000470': 16.0,
    '1640571000471': 1.0,
    '1640571000472': 2.0,
    '1640571000473': 4.0,
    '1640571000474': 8.0,
    '1640571000475': 16.0,
    '1640571000025': 1.0,
    '1640571000490': 1.0,
    '1640571000491': 1.0,
    '1640571000492': 3.0
};

export const PRODUCT_NAME_COEFFICIENTS = [
    { pattern: 'VieON VIP_01 tháng', value: 1.0 },
    { pattern: 'VieON VIP_03 tháng', value: 2.0 },
    { pattern: 'VieON VIP_06 tháng', value: 4.0 },
    { pattern: 'VieON VIP HBO Go_01 tháng', value: 1.0 },
    { pattern: 'VieON VIP HBO Go_03 tháng', value: 2.0 },
    { pattern: 'VieON HBO Go_06 tháng', value: 4.0 },
    { pattern: 'VieON VIP_12 tháng', value: 8.0 },
    { pattern: 'ESET NOD32 Antivirus - Windows', value: 1.0 },
    { pattern: 'ESET Internet Security - Windows 1PC/Năm', value: 2.0 },
    { pattern: 'ESET Internet Security - Windows 3 thiết bị/Năm', value: 2.0 },
    { pattern: 'Phần mềm ESET HOME SECURITY ESSENTIAL  1 thiết bị/1 Năm', value: 2.0 },
    { pattern: 'Phần mềm ESET HOME SECURITY ESSENTIAL  3 thiết bị/1 Năm', value: 2.0 },
    { pattern: 'BẢN ĐỒ DẪN ĐƯỜNG VIETMAP LIVE PRO (1 năm)', value: 2.0 },
    { pattern: 'BẢN ĐỒ DẪN ĐƯỜNG VIETMAP LIVE PRO (2 năm)', value: 4.0 },
    { pattern: 'Kaspersky Plus 3 tháng - 1 thiết bị', value: 1.0 },
    { pattern: 'Kaspersky Plus 1 thiết bị/năm', value: 5.0 },
    { pattern: 'Kaspersky standard 1 thiết bị/năm', value: 1.5 },
    { pattern: 'Kaspersky standard  3 tháng - 1 thiết bị', value: 1.0 },
    { pattern: 'Kaspersky Standard 5 thiết bị/năm', value: 5.0 },
    { pattern: 'Kaspersky Standard 3 thiết bị/năm', value: 4.0 },
    { pattern: 'Kaspersky Plus 3 thiết bị/năm', value: 5.0 },
    { pattern: 'Kaspersky Plus 5 thiết bị/năm', value: 7.0 },
    { pattern: 'Phần mềm Kaspersky standard 1 thiết bị/ 2 năm', value: 4.0 },
    { pattern: 'Phần mềm Kaspersky Plus 1 thiết bị/ 02 năm', value: 7.0 },
    { pattern: 'Phần mềm Kaspersky Plus 1 thiết bị/ 06 tháng', value: 1.5 },
    { pattern: 'GalaxyPlay Cao cấp_01 tháng', value: 1.0 },
    { pattern: 'GalaxyPlay Siêu việt_01 tháng', value: 1.0 },
    { pattern: 'GalaxyPlay Siêu việt_03 tháng', value: 2.0 },
    { pattern: 'GalaxyPlay Siêu việt_06 tháng', value: 4.0 },
    { pattern: 'GalaxyPlay Cao cấp_1 tháng', value: 1.0 },
    { pattern: 'GalaxyPlay Siêu việt_1 tháng', value: 1.0 },
    { pattern: 'GalaxyPlay Siêu việt_3 tháng', value: 2.0 },
    { pattern: 'GalaxyPlay Siêu việt_6 tháng', value: 4.0 },
    { pattern: 'Mã kích hoạt sử dụng phần mềm ứng dụng Umbalena_ 1 tháng', value: 1.0 },
    { pattern: 'Mã kích hoạt sử dụng phần mềm ứng dụng Umbalena_ 3 tháng', value: 3.0 },
    { pattern: 'Mã kích hoạt sử dụng phần mềm ứng dụng Umbalena_ 6 tháng', value: 7.0 },
    { pattern: 'Mã kích hoạt sử dụng phần mềm ứng dụng Umbalena_ 9 tháng', value: 10.0 },
    { pattern: 'Mã kích hoạt sử dụng phần mềm ứng dụng Umbalena_ 12 tháng', value: 13.0 },
    { pattern: 'Phần mềm Elsa 1 tháng - Luyện phát âm tiếng anh', value: 1.0 },
    { pattern: 'Phần mềm Elsa 3 tháng - Luyện phát âm tiếng anh', value: 2.0 },
    { pattern: 'Phần mềm Elsa 6 tháng - Luyện phát âm tiếng anh', value: 4.0 },
    { pattern: 'Phần mềm Elsa 12 tháng - Luyện phát âm tiếng anh', value: 8.0 },
    { pattern: 'Phần mềm Elsa_Gói không giới hạn - Luyện phát âm tiếng anh', value: 16.0 },
    { pattern: 'Phần mềm Elsa Nâng cao_1 tháng - Luyện phát âm tiếng anh', value: 1.0 },
    { pattern: 'Phần mềm Elsa Nâng cao_3 tháng - Luyện phát âm tiếng anh', value: 2.0 },
    { pattern: 'Phần mềm Elsa Nâng cao_6 tháng - Luyện phát âm tiếng anh', value: 4.0 },
    { pattern: 'Phần mềm Elsa Nâng cao_12 tháng - Luyện phát âm tiếng anh', value: 8.0 },
    { pattern: 'Phần mềm Elsa Nâng cao_Gói không giới hạn - Luyện phát âm tiếng anh', value: 16.0 },
    { pattern: 'TV360 Standard 01 tháng', value: 1.0 },
    { pattern: 'TV360 VIP 01 tháng', value: 1.0 },
    { pattern: 'Phần mềm iCallme Premium - Gói 01 tháng', value: 1.0 },
    { pattern: 'Phần mềm iCallme Premium - Gói 12 tháng', value: 3.0 }
];

