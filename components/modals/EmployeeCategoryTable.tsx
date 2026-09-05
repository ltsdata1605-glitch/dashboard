import React, { useEffect, useMemo, useState } from 'react';
import type { DataRow, MetricValues, ProductConfig, WarehouseColumnConfig } from '../../types';
import { CATEGORY_TABLE_CLASS, DEFAULT_WAREHOUSE_COLUMNS, WAREHOUSE_COLUMN_CONFIG_VERSION, WAREHOUSE_HEADER_COLORS } from '../../constants';
import { calculateWarehouseSummary } from '../../services/summaryService';
import { getSetting, getWarehouseColumnConfig } from '../../services/dbService';
import { Icon } from '../common/Icon';

/** 3 nhóm cột của bảng "Chi Tiết Theo Kho" được đưa vào modal phân tích nhân viên. */
const CATEGORY_MAIN_HEADERS = ['SL PHỤ KIỆN', 'SL DỊCH VỤ', 'SL GIA DỤNG'];

/** Lấy đúng các cột 3 nhóm này ĐANG BẬT ở bảng "Chi Tiết Theo Kho": ẩn cột nào bên đó thì bảng
 *  nhân viên ẩn theo, và giữ nguyên thứ tự người dùng đã sắp. Định nghĩa cột (categoryType/
 *  categoryName/metricType/productCodes/mainHeader/subHeader) luôn lấy lại từ
 *  DEFAULT_WAREHOUSE_COLUMNS như migrateColumns() của WarehouseSummary làm, để cấu hình cũ lưu
 *  thiếu field không làm sai số liệu. Điều kiện `isVisible === true` và cách sắp xếp theo `order`
 *  khớp NGUYÊN VĂN visibleColumns của bảng Kho — dùng `!== false` sẽ hiện nhầm cột mà bảng Kho ẩn
 *  khi cấu hình lưu không có field isVisible. Cột custom bị bỏ qua vì chúng cần bộ lọc riêng của
 *  useWarehouseLogic, không tính được từ metrics theo nhóm. */
const pickCategoryColumns = (columns: WarehouseColumnConfig[]): WarehouseColumnConfig[] => {
    const defaultsById = new Map(DEFAULT_WAREHOUSE_COLUMNS.map(col => [col.id, col]));
    return columns
        .map(col => {
            const defaultCol = defaultsById.get(col.id);
            if (!defaultCol) return col;
            return {
                ...col,
                mainHeader: defaultCol.mainHeader,
                subHeader: defaultCol.subHeader,
                categoryName: defaultCol.categoryName,
                categoryType: defaultCol.categoryType,
                metricType: defaultCol.metricType,
                metric: defaultCol.metric,
                productCodes: defaultCol.productCodes,
            };
        })
        .filter(col => !col.isCustom && col.isVisible === true && CATEGORY_MAIN_HEADERS.includes(col.mainHeader || ''))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
};

/** Đọc cấu hình cột người dùng đã lưu cho bảng Kho để modal hiển thị ĐÚNG các cột họ đang bật ở
 *  đó. Kiểm tra cả `warehouseColumnConfigVersion` như WarehouseSummary: version lệch nghĩa là bảng
 *  Kho sắp reset về mặc định, modal phải reset theo chứ không bám cấu hình cũ. Trong lúc chờ
 *  IndexedDB (và khi đọc lỗi) dùng cấu hình mặc định. */
export const useCategoryColumns = (): WarehouseColumnConfig[] => {
    const [columns, setColumns] = useState<WarehouseColumnConfig[]>(() => pickCategoryColumns(DEFAULT_WAREHOUSE_COLUMNS));

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            getSetting<string>('warehouseColumnConfigVersion'),
            getWarehouseColumnConfig(),
        ])
            .then(([version, saved]) => {
                if (cancelled) return;
                const isUsable = version === WAREHOUSE_COLUMN_CONFIG_VERSION && !!saved && saved.length > 0;
                setColumns(pickCategoryColumns(isUsable ? saved! : DEFAULT_WAREHOUSE_COLUMNS));
            })
            .catch(() => { /* giữ cấu hình mặc định */ });
        return () => { cancelled = true; };
    }, []);

    return columns;
};

type CategoryMetrics = {
    byIndustry: Record<string, MetricValues>;
    byGroup: Record<string, MetricValues>;
    byProduct: Record<string, MetricValues>;
};

const createEmptyMetrics = (): CategoryMetrics => ({ byIndustry: {}, byGroup: {}, byProduct: {} });

const mergeBucket = (target: Record<string, MetricValues>, source?: Record<string, MetricValues>) => {
    if (!source) return;
    Object.entries(source).forEach(([key, value]) => {
        if (!target[key]) target[key] = { quantity: 0, revenue: 0, revenueQD: 0 };
        target[key].quantity += value.quantity;
        target[key].revenue += value.revenue;
        target[key].revenueQD += value.revenueQD;
    });
};

/** Cùng cách đọc số liệu với getColumnValue() của useWarehouseLogic (doanh thu quy về đơn vị
 *  triệu, categoryName nhiều nhóm ngăn bởi dấu phẩy thì cộng dồn), rút gọn cho 3 nhóm cột này —
 *  chúng không có cột theo nhà sản xuất hay cột calculated. */
const getCategoryColumnValue = (metrics: CategoryMetrics, column: WarehouseColumnConfig): number => {
    const metricType = column.metricType;
    if (!metricType) return 0;
    const scale = (value: number) => (metricType === 'revenue' || metricType === 'revenueQD' ? value / 1000000 : value);

    if (column.productCodes && column.productCodes.length > 0) {
        return column.productCodes.reduce((sum, code) => sum + scale(metrics.byProduct[code]?.[metricType] || 0), 0);
    }

    const bucket = column.categoryType === 'industry' ? metrics.byIndustry
        : column.categoryType === 'group' ? metrics.byGroup
        : null;
    if (!bucket || !column.categoryName) return 0;

    return column.categoryName
        .split(',')
        .map(name => name.trim())
        .reduce((sum, name) => sum + scale(bucket[name]?.[metricType] || 0), 0);
};

const formatCategoryValue = (value: number): string => {
    if (!value || isNaN(value)) return '-';
    return Math.round(value).toLocaleString('vi-VN');
};

interface EmployeeCategoryTableProps {
    /** Các dòng bán hàng hợp lệ của riêng nhân viên (chưa lọc theo giá — dịch vụ giá 0 vẫn tính SL). */
    rows: DataRow[];
    productConfig: ProductConfig | null | undefined;
    columns: WarehouseColumnConfig[];
}

const EmployeeCategoryTable: React.FC<EmployeeCategoryTableProps> = ({ rows, productConfig, columns }) => {
    // Dùng LẠI calculateWarehouseSummary() thay vì tự cộng số liệu, để bảng này khớp từng con số
    // với bảng "Chi Tiết Theo Kho" (cùng bộ lọc hợp lệ, cùng weightedQuantity từ calculateRowMetrics).
    // Hàm đó gom theo Mã Kho nên với nhân viên bán ở nhiều kho phải cộng lại các nhóm.
    const metrics = useMemo(() => {
        const merged = createEmptyMetrics();
        if (!productConfig || rows.length === 0) return merged;
        const summaryRows = calculateWarehouseSummary(rows, productConfig) || [];
        summaryRows.forEach(row => {
            mergeBucket(merged.byIndustry, row.metrics?.byIndustry);
            mergeBucket(merged.byGroup, row.metrics?.byGroup);
            mergeBucket(merged.byProduct, row.metrics?.byProduct);
        });
        return merged;
    }, [rows, productConfig]);

    // Gom các cột liên tiếp cùng mainHeader thành 1 ô tiêu đề nhóm (colSpan) như bảng Kho.
    const groupedHeaders = useMemo(() => {
        return columns.reduce<{ name: string; colSpan: number }[]>((groups, col) => {
            const last = groups[groups.length - 1];
            if (last && last.name === col.mainHeader) {
                last.colSpan += 1;
            } else {
                groups.push({ name: col.mainHeader || '', colSpan: 1 });
            }
            return groups;
        }, []);
    }, [columns]);

    if (columns.length === 0) return null;

    return (
        <div className={`${CATEGORY_TABLE_CLASS} bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow p-3 sm:p-4`}>
            <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mb-2 sm:mb-3 flex items-center gap-2">
                <Icon name="layout-grid" size={4} className="text-sky-500 sm:hidden" />
                <Icon name="layout-grid" size={5} className="text-sky-500 hidden sm:block" />
                Phụ Kiện &amp; Điện Gia Dụng
            </h4>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-max text-[11px] sm:text-xs text-center border-collapse border border-slate-200 dark:border-slate-700 whitespace-nowrap tabular-nums">
                    <thead>
                        <tr className="text-[10px] sm:text-[11px] font-bold uppercase tracking-tight">
                            {groupedHeaders.map((group, index) => {
                                const styles = WAREHOUSE_HEADER_COLORS[group.name] || WAREHOUSE_HEADER_COLORS.DEFAULT;
                                return (
                                    <th key={`${group.name}-${index}`} colSpan={group.colSpan} className={`px-1 sm:px-2 py-1 sm:py-1.5 border-b border-r border-slate-200 dark:border-slate-700 align-middle ${styles.sub} ${styles.text}`}>
                                        {group.name}
                                    </th>
                                );
                            })}
                        </tr>
                        <tr className="text-[10px] sm:text-[11px] font-bold uppercase tracking-tight">
                            {columns.map(col => {
                                const styles = WAREHOUSE_HEADER_COLORS[col.mainHeader || ''] || WAREHOUSE_HEADER_COLORS.DEFAULT;
                                return (
                                    <th key={col.id} className={`px-1 sm:px-2 py-1 sm:py-1.5 border-b border-r border-slate-200 dark:border-slate-700 align-middle ${styles.sub} ${styles.text}`}>
                                        {col.subHeader}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            {columns.map(col => {
                                const value = getCategoryColumnValue(metrics, col);
                                const isRevenue = col.metricType === 'revenue' || col.metricType === 'revenueQD';
                                return (
                                    <td key={col.id} className={`px-1 sm:px-2 py-1.5 sm:py-2 border-r border-slate-200 dark:border-slate-700 leading-tight ${value ? (isRevenue ? 'font-bold text-sky-700 dark:text-sky-400' : 'font-semibold text-slate-800 dark:text-slate-100') : 'text-slate-400 dark:text-slate-600'}`}>
                                        {formatCategoryValue(value)}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EmployeeCategoryTable;
