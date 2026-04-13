


export type AppState = 'upload' | 'loading' | 'processing' | 'dashboard';


export interface Status {
    message: string;
    type: 'info' | 'success' | 'error';
    progress: number;
}

export type DataRow = { [key: string]: any };

export interface ProductConfig {
    groups: { [key: string]: Set<string> };
    subgroups: { [key: string]: { [key: string]: string[] } };
    childToParentMap: { [key: string]: string };
    childToSubgroupMap: { [key: string]: string };
}

export interface StoredSalesData {
    data: DataRow[];
    filename: string;
    savedAt: Date;
    fileLastModified?: number;
}


export interface KpiData {
    doanhThuQD: number;
    totalRevenue: number;
    soLuongThuHo: number;
    hieuQuaQD: number;
    traGopPercent: number;
    traGopValue: number;
    traGopCount: number;
    doanhThuThucChoXuat: number;
    doanhThuQDChoXuat: number;
    runRateRevenue: number;
    crossSellRate: number; // AOV/UPT: Phụ kiện / ICT
}

export interface TrendData {
    daily: { [key: string]: { revenue: number, revenueQD: number, date: Date } };
    shifts: { [key: string]: { revenue: number, revenueQD: number } };
}

export interface IndustryData {
    name: string;
    revenue: number;
    quantity: number;
}

export interface Employee {
    name: string;
    department: string;
    doanhThuThuc: number;
    doanhThuQD: number;
    doanhThuTraCham: number;

    hieuQuaValue: number;
    slTiepCan: number;
    aov: number;
    slThuHo: number;
    slTraCham: number;
    totalOrders: number;
    traChamPercent: number;
    
    // For Performance Table v2
    slCE_ICT: number;
    slICT: number;
    slCE_main: number;
    slTraCham_CE_ICT: number;
    traChamPercent_CE_ICT: number; // Tỷ lệ trả chậm theo SỐ LƯỢỢNG
    doanhThu_CE_ICT: number;
    doanhThuTraCham_CE_ICT: number;
    dtTraChamPercent_CE_ICT: number; // Tỷ lệ trả chậm theo DOANH THU

    // For Weakness points
    weakPointsRevenue: number;
    weakPointsExploitation: number;
}


export interface ExploitationData {
    name: string;
    department: string;
    doanhThuThuc: number;
    doanhThuQD: number;
    hieuQuaQD: number;

    // SP Chính (new)
    slICT: number;
    doanhThuICT: number;
    slCE_main: number;
    doanhThuCE_main: number;
    slGiaDung_main: number;

    // Bảo Hiểm
    slBaoHiem: number;
    doanhThuBaoHiem: number;
    percentBaoHiem: number;

    // Bán Kèm (Sim, Đồng hồ)
    slSim: number;
    doanhThuSim: number;
    slDongHo: number;
    doanhThuDongHo: number;

    // Phụ Kiện
    doanhThuPhuKien: number;
    slPhuKien: number; // New: Tổng số lượng phụ kiện
    slCamera: number;
    slLoa: number;
    slPinSDP: number;
    slTaiNgheBLT: number;

    // Gia dụng
    doanhThuGiaDung: number;
    slGiaDung: number; // New: Tổng số lượng gia dụng (khác với main nếu cần, hoặc alias)
    slMayLocNuoc: number;
    slNoiCom: number;
    slNoiChien: number;
    slQuatDien: number;
}


export interface EmployeeData {
    fullSellerArray: Employee[];
    averages: {
        doanhThuThuc: number;
        doanhThuQD: number;
        hieuQuaValue: number;
    };
    maxValues: {
        doanhThuThuc: number;
        doanhThuQD: number;
    };
    byIndustry: { [employee: string]: { [industry: string]: number } };
    dailyTrend: { [employee: string]: { [date: string]: number } };
    exploitationData: ExploitationData[];
}

export interface SummaryTableNode {
    totalQuantity: number;
    totalRevenue: number;
    totalTraGop: number;
    totalRevenueQD: number;
    children: { [key: string]: SummaryTableNode };
}

export interface GrandTotal {
    totalQuantity: number;
    totalRevenue: number;
    totalRevenueQD: number;
    totalTraGop: number;
    aov: number;
    traGopPercent: number;
}

export interface MetricValues {
    quantity: number;
    revenue: number;
    revenueQD: number;
}

export interface WarehouseSummaryRow {
    khoName: string;
    doanhThuThuc: number;
    doanhThuQD: number;
    target: number; // Added
    percentHT: number; // Added
    hieuQuaQD: number;
    slTiepCan: number;
    slThuHo: number;
    traChamPercent: number;
    doanhThuTraCham: number;
    metrics: {
        byIndustry: Record<string, MetricValues>;
        byGroup: Record<string, MetricValues>;
        byManufacturer: Record<string, MetricValues>;
        byIndustryAndManufacturer: Record<string, Record<string, MetricValues>>;
        byGroupAndManufacturer: Record<string, Record<string, MetricValues>>;
    };
}

export type WarehouseMetricType = 'quantity' | 'revenue' | 'revenueQD';
export type WarehouseCategoryType = 'industry' | 'group' | 'manufacturer';
export type WarehouseCoreMetric = 'doanhThuThuc' | 'doanhThuQD' | 'hieuQuaQD' | 'slTiepCan' | 'slThuHo' | 'traChamPercent' | 'target' | 'percentHT';

export interface WarehouseColumnConfig {
  id: string;
  order: number;
  isVisible: boolean;
  isCustom: boolean;

  // for core metrics or direct properties
  metric?: WarehouseCoreMetric;

  // New flexible column system (from Employee Analysis 'ColumnConfig')
  type?: 'data' | 'calculated' | 'target';
  
  // For 'data' type
  filters?: {
      selectedIndustries: string[];
      selectedSubgroups: string[];
      selectedManufacturers: string[];
      productCodes: string[];
      priceType?: 'original' | 'discounted';
      priceCondition?: 'greater' | 'less' | 'equal' | 'between';
      priceValue1?: number;
      priceValue2?: number;
  };

  // For 'calculated' type
  operation?: '+' | '-' | '*' | '/';
  operand1_columnId?: string;
  operand2_columnId?: string;
  displayAs?: 'number' | 'percentage';

  // For 'target' type
  targetValue?: number;

  conditionalFormatting?: {
      condition: '>' | '<' | '=' | 'between' | '>avg' | '<avg';
      value1: number;
      value2?: number;
      color: string;
  }[];

  // Old simple category-based metrics (kept for backward compatibility)
  categoryType?: WarehouseCategoryType;
  categoryName?: string;
  metricType?: WarehouseMetricType;
  manufacturerName?: string; 
  productCodes?: string[];

  // display
  mainHeader: string;
  subHeader: string;
  headerColor?: string;
}

export interface ProcessedData {
    kpis: KpiData;
    trendData: TrendData;
    industryData: IndustryData[];
    employeeData: EmployeeData;
    summaryTable: {
        data: { [key: string]: SummaryTableNode };
        grandTotal: GrandTotal;
        uniqueParentGroups: string[];
        uniqueChildGroups: string[];
        uniqueManufacturers: string[];
        uniqueCreators: string[];
        uniqueProducts: string[];
    };
    unshippedOrders: DataRow[];
    filteredValidSalesData: DataRow[];
    lastUpdated: string;
    reportSubTitle: string;
    warehouseSummary: WarehouseSummaryRow[] | null;
}

export interface FilterState {
    kho: string[];
    xuat: string;
    trangThai: string[];
    nguoiTao: string[];
    department: string[];
    parent: string[];
    startDate: string;
    endDate: string;
    dateRange: string;
    selectedMonths: string[];
    industryGrid: {
        selectedGroups: string[];
        selectedSubgroups: string[];
    };
    summaryTable: {
        child: string[];
        manufacturer: string[];
        creator: string[];
        product: string[];
        drilldownOrder: string[];
        sort: {
            column: string;
            direction: 'asc' | 'desc';
        };
        visibleColumns?: string[];
    };
}


export interface VisibilityState {
    trendChart: boolean;
    industryGrid: boolean;
    employeeAnalysis: boolean;
    summaryTable: boolean;
}

export interface AnalysisRecord {
    timestamp: number;
    type: 'topSeller';
    analysis: string;
    dataUsed: Employee[];
}

export interface ColumnConfig {
    id: string;
    mainHeader: string;
    columnName: string;
    type: 'data' | 'calculated' | 'target';
    targetValue?: number;

    // For 'data' type
    metricType?: 'quantity' | 'revenue' | 'revenueQD';
    filters?: {
        selectedIndustries: string[];
        selectedSubgroups: string[];
        selectedManufacturers: string[];
        productCodes: string[];
        priceType?: 'original' | 'discounted';
        priceCondition?: 'greater' | 'less' | 'equal' | 'between';
        priceValue1?: number;
        priceValue2?: number;
    };

    // For 'calculated' type
    operation?: '+' | '-' | '*' | '/';
    operand1_columnId?: string;
    operand2_columnId?: string;
    displayAs?: 'number' | 'percentage';
    
    conditionalFormatting?: {
        condition: '>' | '<' | '=' | 'between' | '>avg' | '<avg';
        value1: number;
        value2?: number;
        color: string;
    }[];
    headerColor?: string;
}

export interface IndustryColumnConfig extends ColumnConfig {
    order: number;
    isVisible: boolean;
    isCustom: boolean;
    subHeader: string;
}


export interface ContestTableConfig {
    id: string;
    tableName: string;
    columns: ColumnConfig[];
    defaultSortColumnId?: string;
}

export interface CustomContestTab {
    id: string;
    name: string;
    icon: string;
    tables: ContestTableConfig[];
}

export interface HeadToHeadConditionalFormatRule {
  id: string;
  criteria: 'specific_value' | 'column_dept_avg' | 'row_avg';
  operator: '>' | '<' | '=';
  value: number;
  textColor: string;
  backgroundColor: string;
}

export interface HeadToHeadTableConfig {
    id: string;
    mainHeader?: string;
    tableName: string;
    headerColor?: string;
    type?: 'data' | 'calculated' | 'target';
    
    // For 'data' type
    metricType?: 'quantity' | 'revenue' | 'revenueQD' | 'hieuQuaQD';
    
    // Old format backward compatibility
    selectedSubgroups?: string[];
    selectedParentGroups?: string[];
    
    // New rich filters
    filters?: {
        selectedIndustries: string[];
        selectedSubgroups: string[];
        selectedManufacturers: string[];
        productCodes: string[];
        priceType?: 'original' | 'discounted';
        priceCondition?: 'greater' | 'less' | 'equal' | 'between';
        priceValue1?: number;
        priceValue2?: number;
    };
    
    // For 'calculated' type
    operation?: '+' | '-' | '*' | '/';
    operand1_tableId?: string;
    operand2_tableId?: string;
    displayAs?: 'number' | 'percentage';
    
    // For 'target' type
    targetValue?: number;

    totalCalculationMethod?: 'sum' | 'average';
    conditionalFormats?: HeadToHeadConditionalFormatRule[];
}

export type CrossSellingColumnType = 'data' | 'ratio' | 'target';

export interface CrossSellingDynamicColumn {
    id: string; // unique UUID
    name: string; // Tên hiển thị cột
    type: CrossSellingColumnType; 
    
    // Thuộc tính dùng khi type = 'data'
    subgroupsNhomCha?: string[]; // Ngành hàng
    subgroupsNhomCon?: string[]; // Nhóm hàng
    dataType?: 'quantity' | 'revenueQD'; // Lấy Số Lượng hay Doanh Thu Q.Đổi
    
    // Thuộc tính dùng khi type = 'ratio'
    numeratorColId?: string; // ID Cột bị chia (Tử số)
    denominatorColId?: string; // ID Cột chia (Mẫu số)
    compareWithTarget?: boolean; // So sánh bôi xanh/đỏ với Target Dòng?
}

export interface CrossSellingDynamicRow {
    id: string;
    name: string; // Tên dòng hiển thị
    subgroupsNhomCha?: string[]; // Điều kiện lọc Ngành hàng
    subgroupsNhomCon?: string[]; // Điều kiện lọc Nhóm hàng
    manufacturers?: string[]; // Điều kiện lọc Nhà Sản Xuất (Hãng)
    keywords?: string; // Tên/Mã Sản Phẩm, phân cách bằng dấu phẩy
    targetValue?: number; // Chỉ tiêu % của dòng
}

export interface CrossSellingDynamicSection {
    id: string;
    header: string; // Tên phân khu (Header - VD: PHỤ KIỆN)
    rows: CrossSellingDynamicRow[]; // Danh sách các dòng con
}

export interface CrossSellingConfig {
    columns: CrossSellingDynamicColumn[]; // Danh sách các Cột phân tích động
    sections: CrossSellingDynamicSection[]; // Cấu trúc Dòng nhóm theo Section
}

export type KpiMetricSource = 
  | 'doanhThuQD' 
  | 'totalRevenue' 
  | 'doanhThuThuc'
  | 'traGopPercent' 
  | 'runRateRevenue' 
  | 'crossSellRate' 
  | 'hieuQuaQD' 
  | 'doanhThuThucChoXuat';

export interface KpiCardConfig {
  id: string;
  order: number;
  isVisible: boolean;
  
  title: string;
  icon: string;
  iconColor: string; 
  format: 'currency' | 'percentage' | 'number';
  
  // -- NEW FIELDS FOR LEVEL 2 --
  type?: 'metric' | 'data' | 'calculated'; 
  
  // For 'metric' type (Core Metrics)
  metric?: KpiMetricSource;
  
  // For 'data' type (Data Custom Filtering)
  dataFilters?: {
      selectedIndustries?: string[];
      selectedSubgroups?: string[];
      selectedManufacturers?: string[];
      productCodes?: string[];
      metricType?: 'quantity' | 'revenue' | 'revenueQD';
  };

  // For 'calculated' type (e.g. Ratio, Differential)
  operation?: '+' | '-' | '*' | '/';
  operand1_cardId?: string;
  operand2_cardId?: string;
  
  // Target
  hasTarget: boolean;
  targetType: 'global' | 'custom' | 'none'; 
  targetRef?: string; 
  customTargetValue?: number;
  trendLabel?: string;
}
