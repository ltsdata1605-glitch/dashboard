import React, { useMemo, useRef, useState } from 'react';
import type { Employee, DataRow, ProductConfig } from '../../types';
import { Modal } from '../shared/ui/Modal';
import { Icon } from '../common/Icon';
import { getRowValue, formatCurrency, calculateRowMetrics, formatQuantity, getHinhThucThanhToan, cleanAndNormalize } from '../../utils/dataUtils';
import { COL, HINH_THUC_XUAT_TIEN_MAT, HINH_THUC_XUAT_TRA_GOP, HINH_THUC_XUAT_THU_HO } from '../../constants';
import { DashboardContext } from '../../contexts/DashboardContext';
import { showExportOverlay, hideExportOverlay } from '../../services/uiService';
import { Button } from '../shared/ui/Button';
import type { ExportImageOptions } from '../../hooks/useExportLogic';



interface PerformanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeName: string;
    onExport: (element: HTMLElement, filename: string, options?: ExportImageOptions) => Promise<void>;
    isBatchExporting?: boolean;
    fullSellerArray?: Employee[];
    validSalesData?: DataRow[];
    productConfig?: ProductConfig;
}

const KpiCard: React.FC<{ icon: string, label: string, value: string, color: string, children?: React.ReactNode }> = ({ icon, label, value, color, children }) => {
    return (
        <div className={`flex-1 p-1 sm:p-2 bg-white dark:bg-slate-800 rounded sm:rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-l-2 border-${color}-500 flex flex-col justify-center gap-0.5`}>
            {/* Color mapping for JIT compiler */}
            {/* border-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 */}
            {/* border-emerald-500 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 */}
            {/* border-rose-500 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 */}
            {/* border-amber-500 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 */}
            {/* border-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 */}
            {/* border-sky-500 bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 */}
            <div className="flex items-center sm:gap-1.5 justify-center sm:justify-start">
                <div className={`hidden sm:flex w-7 h-7 rounded bg-${color}-100 dark:bg-${color}-900/50 items-center justify-center text-${color}-600 dark:text-${color}-400 flex-shrink-0`}>
                    <Icon name={icon} size={3.5} />
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="text-[6.5px] min-[360px]:text-[7px] min-[390px]:text-[7.5px] sm:text-[9px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-tighter truncate w-full" title={label}>{label}</p>
                    <p className={`text-[10px] min-[360px]:text-[10.5px] min-[390px]:text-[11px] sm:text-xs font-black text-${color}-600 dark:text-${color}-400 leading-tight truncate w-full`}>{value}</p>
                </div>
            </div>
            {children && <div className="mt-0.5 text-[6.5px] min-[360px]:text-[7px] min-[390px]:text-[7.5px] sm:text-[9px] leading-tight border-t border-slate-100/50 dark:border-slate-800/20 pt-0.5 w-full">{children}</div>}
        </div>
    );
};

const PerformanceModal: React.FC<PerformanceModalProps> = ({ 
    isOpen, 
    onClose, 
    employeeName, 
    onExport, 
    isBatchExporting = false,
    fullSellerArray: fullSellerArrayFromProps,
    validSalesData: validSalesDataFromProps,
    productConfig: productConfigFromProps
}) => {
    const context = React.useContext(DashboardContext);

    const fullSellerArray = fullSellerArrayFromProps ?? context?.employeeAnalysisData?.fullSellerArray ?? [];
    const validSalesData = validSalesDataFromProps ?? context?.processedData?.filteredValidSalesData ?? [];
    const productConfig = productConfigFromProps ?? context?.productConfig;

    const modalBodyRef = React.useRef<HTMLDivElement>(null);

    const [isExporting, setIsExporting] = useState(false);

    const [isAllCustomersExpanded, setIsAllCustomersExpanded] = useState(false);
    const customerDetailsContainerRef = useRef<HTMLDivElement>(null);

    const employeeData = useMemo(() => {
        return fullSellerArray.find(emp => emp.name === employeeName);
    }, [fullSellerArray, employeeName]);

    const employeeSalesData = useMemo(() => {
        return validSalesData.filter(row => {
            const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT) || '';
            const isRevenueEligible = productConfig && productConfig.revenueEligibleHTX && productConfig.revenueEligibleHTX.size > 0
                ? productConfig.revenueEligibleHTX.has(cleanAndNormalize(hinhThucXuat))
                : (HINH_THUC_XUAT_TIEN_MAT.has(hinhThucXuat) || HINH_THUC_XUAT_TRA_GOP.has(hinhThucXuat));
            return getRowValue(row, COL.NGUOI_TAO) === employeeName 
                && isRevenueEligible 
                && (Number(getRowValue(row, COL.PRICE)) || 0) > 0;
        });
    }, [validSalesData, employeeName, productConfig]);

    const attachOrdersMetrics = useMemo(() => {
        const revenueEligibleRows = employeeSalesData.filter(row => (Number(getRowValue(row, COL.PRICE)) || 0) > 0);
        const orderCounts: { [id: string]: number } = {};
        
        revenueEligibleRows.forEach(row => {
            const id = getRowValue(row, COL.ID);
            if (id) {
                orderCounts[id] = (orderCounts[id] || 0) + 1;
            }
        });

        const uniqueOrderIds = Object.keys(orderCounts);
        const totalOrders = uniqueOrderIds.length;
        const attachedOrders = Object.values(orderCounts).filter(count => count >= 2).length;
        const percent = totalOrders > 0 ? (attachedOrders / totalOrders) * 100 : 0;

        return { 
            count: attachedOrders, 
            total: totalOrders, 
            percent 
        };
    }, [employeeSalesData]);

    const { topProducts, industryBreakdown, customerBreakdown } = useMemo(() => {
        if (!productConfig) return { topProducts: [], industryBreakdown: {}, customerBreakdown: [] };

        const productSummary = employeeSalesData.reduce((acc, row) => {
            const productName = getRowValue(row, COL.PRODUCT) || 'N/A';
            const price = Number(getRowValue(row, COL.PRICE)) || 0;
            const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
            if (!acc[productName]) acc[productName] = { revenue: 0, quantity: 0 };
            acc[productName].revenue += price;
            acc[productName].quantity += quantity;
            return acc;
        }, {} as { [key: string]: { revenue: number, quantity: number } });

        const topProducts = Object.entries(productSummary)
            .map(([name, data]: [string, { revenue: number, quantity: number }]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const industryBreakdown = employeeSalesData.reduce((acc, row) => {
            const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
            const parentGroup = productConfig.childToParentMap[maNhomHang] || 'Khác';
            const price = Number(getRowValue(row, COL.PRICE)) || 0;
            if (!acc[parentGroup]) acc[parentGroup] = 0;
            acc[parentGroup] += price;
            return acc;
        }, {} as { [key: string]: number });

        const groupedByCustomer = employeeSalesData.reduce((acc, order) => {
            const customer = getRowValue(order, COL.CUSTOMER_NAME) || 'Khách lẻ';
            if (!acc[customer]) acc[customer] = [];
            acc[customer].push(order);
            return acc;
        }, {} as { [key: string]: DataRow[] });

        const customerBreakdown = Object.entries(groupedByCustomer).map(([customerName, orders]: [string, DataRow[]]) => {
            const { totalRevenue, totalRevenueQD } = orders.reduce((acc, o) => {
                const { revenue, revenueQD } = calculateRowMetrics(o, productConfig);
                acc.totalRevenue += revenue;
                acc.totalRevenueQD += revenueQD;
                return acc;
            }, { totalRevenue: 0, totalRevenueQD: 0 });

            const hieuQuaQD = totalRevenue !== 0 ? ((totalRevenueQD - totalRevenue) / Math.abs(totalRevenue)) * 100 : 0;
            // any: giá trị ô Excel thô (Date | number serial | string) từ nhiều tên cột khả dĩ
            let scheduledDateRaw: any = undefined;
            for (const order of orders) {
                const raw = getRowValue(order, ['Thời gian hẹn giao', 'Thoi gian hen giao', 'TG Hẹn Giao', '__EMPTY_24', 'Column25']) || (() => {
                    const keys = Object.keys(order).filter(k => k !== 'parsedDate' && k !== 'rowIndex');
                    return keys.length > 24 ? order[keys[24]] : undefined;
                })();
                if (raw !== undefined && raw !== null && raw !== '') {
                    scheduledDateRaw = raw;
                    break;
                }
            }
            
            let formattedScheduledDate = 'N/A';
            if (scheduledDateRaw) {
                if (scheduledDateRaw instanceof Date && !isNaN(scheduledDateRaw.getTime())) {
                    formattedScheduledDate = scheduledDateRaw.toLocaleDateString('vi-VN', {day: 'numeric', month: 'numeric'}).replace(/\./g, '/');
                } else if (typeof scheduledDateRaw === 'number') {
                    const dt = new Date((scheduledDateRaw - 25569) * 86400 * 1000);
                    formattedScheduledDate = !isNaN(dt.getTime()) ? dt.toLocaleDateString('vi-VN', {day: 'numeric', month: 'numeric'}).replace(/\./g, '/') : String(scheduledDateRaw);
                } else {
                    const strDate = String(scheduledDateRaw);
                    if (strDate.includes('T')) {
                       const dt = new Date(strDate);
                       if (!isNaN(dt.getTime())) formattedScheduledDate = dt.toLocaleDateString('vi-VN', {day: 'numeric', month: 'numeric'}).replace(/\./g, '/');
                       else formattedScheduledDate = strDate;
                    } else {
                       formattedScheduledDate = strDate.substring(0, 5);
                    }
                }
            }

            const orderGroups: { [id: string]: DataRow[] } = {};
            orders.filter(o => (Number(getRowValue(o, COL.PRICE)) || 0) > 0).forEach(o => {
                const id = getRowValue(o, COL.ID) || 'no-id';
                if (!orderGroups[id]) orderGroups[id] = [];
                orderGroups[id].push(o);
            });

            const sortedOrderGroups = Object.entries(orderGroups).map(([id, groupLines]) => ({
                id,
                lines: groupLines,
                isAttached: id !== 'no-id' && groupLines.length >= 2,
                status: getRowValue(groupLines[0], COL.XUAT)
            })).sort((a, b) => b.lines.reduce((s, l) => s + (Number(getRowValue(l, COL.PRICE)) || 0), 0) - a.lines.reduce((s, l) => s + (Number(getRowValue(l, COL.PRICE)) || 0), 0));

            // Get the created date from the first order
            let createdDateKey = '';
            let createdDateFormatted = '';
            const firstOrderDateRaw = getRowValue(orders[0], COL.DATE_CREATED);
            if (firstOrderDateRaw) {
                const d = firstOrderDateRaw instanceof Date ? firstOrderDateRaw : new Date(firstOrderDateRaw as string);
                if (!isNaN(d.getTime())) {
                    createdDateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    createdDateFormatted = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                }
            }

            return { 
                name: customerName, 
                orderGroups: sortedOrderGroups,
                totalRevenue,
                totalRevenueQD,
                hieuQuaQD,
                scheduledDate: formattedScheduledDate,
                createdDateKey,
                createdDateFormatted
            };
        }).sort((a, b) => b.totalRevenue - a.totalRevenue);
        
        return { topProducts, industryBreakdown, customerBreakdown };

    }, [employeeSalesData, productConfig]);



    const handleExport = async () => {
        const elementToExport = modalBodyRef.current;
        if (elementToExport) {
            setIsExporting(true);
            showExportOverlay(`Đang xuất: ${employeeName}`);
            await onExport(elementToExport, `phan-tich-hieu-qua-${employeeName}.png`, { forceOpenDetails: true, forcedWidth: 640 });
            setIsExporting(false);
            hideExportOverlay();
        }
    };

    const toggleAllCustomers = () => {
        const nextState = !isAllCustomersExpanded;
        if (customerDetailsContainerRef.current) {
            const detailsElements = customerDetailsContainerRef.current.querySelectorAll('details');
            detailsElements.forEach(detail => {
                detail.open = nextState;
            });
        }
        setIsAllCustomersExpanded(nextState);
    };
    
    const controls = (
        <div className="flex items-center gap-1 sm:gap-2 hide-on-export">
            <Button onClick={toggleAllCustomers} variant="secondary" size="icon" title={isAllCustomersExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'} className="w-8 h-8 sm:w-[42px] sm:h-[42px]">
                <Icon name={isAllCustomersExpanded ? "chevrons-up-down" : "chevrons-down-up"} size={4} />
            </Button>
            <Button onClick={handleExport} disabled={isExporting} isLoading={isExporting} variant="secondary" size="icon" title="Xuất Ảnh Phân Tích" className="w-8 h-8 sm:w-[42px] sm:h-[42px]">
                 {!isExporting && <Icon name="camera" size={4} />}
            </Button>
        </div>
    );
    
    const modalContent = !employeeData ? (
        <p>Không tìm thấy dữ liệu cho nhân viên này.</p>
    ) : (
        <div className="space-y-3 sm:space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-5 gap-1 sm:gap-2.5">
                <KpiCard icon="dollar-sign" label="Tổng DTQĐ" value={formatCurrency(employeeData.doanhThuQD)} color="indigo">
                    <div className="flex flex-col min-[370px]:flex-row justify-between items-center w-full gap-0.5 text-slate-500 dark:text-slate-400">
                        <span className="shrink-0">Thực:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{formatCurrency(employeeData.doanhThuThuc)}</span>
                    </div>
                </KpiCard>
                <KpiCard icon="trending-up" label="Hiệu Quả QĐ" value={`${employeeData.hieuQuaValue.toFixed(0)}%`} color={employeeData.hieuQuaValue >= 40 ? 'emerald' : 'rose'} />
                <KpiCard icon="clock" label="% T.Chậm" value={`${employeeData.traChamPercent.toFixed(0)}%`} color="amber">
                    <div className="flex flex-col gap-0.5 text-slate-500 dark:text-slate-400 w-full text-center">
                        <div className="truncate">CE+ICT: <span className="font-extrabold text-amber-700 dark:text-amber-400">{employeeData.traChamPercent_CE_ICT.toFixed(0)}%</span></div>
                        <div className="truncate">Tổng: <span className="font-bold text-slate-700 dark:text-slate-200">{formatQuantity(employeeData.slTraCham_CE_ICT)}/{formatQuantity(employeeData.slCE_ICT)}</span></div>
                    </div>
                </KpiCard>
                <KpiCard icon="shopping-bag" label="ĐH B.Kèm" value={formatQuantity(attachOrdersMetrics.count)} color="cyan">
                    <div className="flex flex-col gap-0.5 text-slate-500 dark:text-slate-400 w-full text-center">
                        <div className="truncate">%BK: <span className="font-extrabold text-sky-700 dark:text-sky-400">{attachOrdersMetrics.percent.toFixed(0)}%</span></div>
                        <div className="truncate">Tổng: <span className="font-bold text-slate-700 dark:text-slate-200">{attachOrdersMetrics.total} ĐH</span></div>
                    </div>
                </KpiCard>
                <KpiCard icon="users" label="Tiếp Cận" value={formatQuantity(employeeData.slTiepCan)} color="purple">
                     <div className="flex flex-col min-[370px]:flex-row justify-between items-center w-full gap-0.5 text-slate-500 dark:text-slate-400">
                        <span className="shrink-0">Thu Hộ:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{formatQuantity(employeeData.slThuHo)}</span>
                    </div>
                </KpiCard>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                {/* Top Products */}
                <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow p-3 sm:p-4 flex flex-col">
                    <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mb-2 sm:mb-3 flex items-center gap-2"><Icon name="award" size={4} className="text-amber-500 sm:hidden"/><Icon name="award" size={5} className="text-amber-500 hidden sm:block"/> Top 5 Sản Phẩm Bán Chạy</h4>
                    <ul className="space-y-1 flex-1">
                        {topProducts.map((p, i) => (
                            <li key={i} className="flex justify-between items-center py-0.5 sm:py-1 px-1.5 sm:px-2 rounded bg-slate-50 dark:bg-slate-700/50">
                                <div className="truncate pr-3">
                                    <p className="font-bold text-[10px] sm:text-xs text-slate-700 dark:text-slate-200 truncate" title={p.name}>{p.name}</p>
                                    <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">{formatQuantity(p.quantity)} SP</p>
                                </div>
                                <span className="font-black text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{formatCurrency(p.revenue)}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow p-3 sm:p-4 flex flex-col">
                    <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mb-2 sm:mb-3 flex items-center gap-2"><Icon name="pie-chart" size={4} className="text-sky-500 sm:hidden"/><Icon name="pie-chart" size={5} className="text-sky-500 hidden sm:block"/> Tỷ Trọng Doanh Thu Ngành Hàng</h4>
                    <div className="flex-1">
                    {(() => {
                        const totalIndustryRevenue = Object.values(industryBreakdown).reduce((s, v) => s + v, 0);
                        const sortedIndustries = Object.entries(industryBreakdown)
                            .filter(([name]) => name !== 'Khác' && name !== 'Không xác định')
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 5);
                        
                        const barColors = [
                            'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 
                            'bg-sky-500', 'bg-indigo-500', 'bg-amber-500', 'bg-emerald-500',
                            'bg-rose-500', 'bg-sky-500', 'bg-emerald-500', 'bg-rose-500'
                        ];
                        const dotColors = [
                            'bg-indigo-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400',
                            'bg-sky-400', 'bg-indigo-400', 'bg-amber-400', 'bg-emerald-400',
                            'bg-rose-400', 'bg-sky-400', 'bg-emerald-400', 'bg-rose-400'
                        ];

                        if (sortedIndustries.length === 0) {
                            return <p className="text-center text-slate-500 dark:text-slate-400 py-4">Không có dữ liệu ngành hàng.</p>;
                        }

                        return (
                            <ul className="space-y-1 mt-0.5">
                                {sortedIndustries.map(([name, revenue], i) => {
                                    const percent = totalIndustryRevenue > 0 ? (revenue / totalIndustryRevenue) * 100 : 0;
                                    return (
                                        <li key={name}>
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[i % dotColors.length]}`}></span>
                                                    {name}
                                                </span>
                                                <span className="text-[10px] sm:text-xs font-black text-slate-700 dark:text-slate-200 whitespace-nowrap ml-3">{formatCurrency(revenue)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${barColors[i % barColors.length]} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                                                </div>
                                                <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 w-8 text-right">{percent.toFixed(0)}%</span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        );
                    })()}
                    </div>
                </div>
            </div>

             {/* Customer Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow p-3 sm:p-4">
                 <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mb-2 sm:mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Icon name="contact" size={4} className="text-sky-500 sm:hidden"/><Icon name="contact" size={5} className="text-sky-500 hidden sm:block"/> Chi Tiết Theo Khách Hàng
                    </span>
                 </h4>
                 <div ref={customerDetailsContainerRef} className={`space-y-0 pr-1 sm:pr-2 mt-2 sm:mt-4 ${(isBatchExporting || isExporting) ? '' : 'max-h-[500px] overflow-y-auto'}`}>
                    {(() => {
                        // Sort customers by createdDateKey (newest first), then by revenue
                        const sorted = [...customerBreakdown].sort((a, b) => {
                            if (a.createdDateKey !== b.createdDateKey) return b.createdDateKey.localeCompare(a.createdDateKey);
                            return b.totalRevenue - a.totalRevenue;
                        });
                        let lastDateKey = '';
                        return sorted.map(customer => {
                            const showDateHeader = customer.createdDateKey && customer.createdDateKey !== lastDateKey;
                            lastDateKey = customer.createdDateKey || lastDateKey;
                            return (
                                <React.Fragment key={customer.name}>
                                    {showDateHeader && (
                                        <div className="flex items-center gap-2 mt-3 mb-1 px-1">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-md">
                                                <Icon name="calendar" size={3} />
                                                <span>Ngày tạo: {customer.createdDateFormatted}</span>
                                            </div>
                                            <div className="flex-1 h-px bg-indigo-200 dark:bg-indigo-800"></div>
                                        </div>
                                    )}
                        <details className="bg-white dark:bg-slate-900 overflow-hidden" open={customerBreakdown.length === 1 || isBatchExporting || isExporting || isAllCustomersExpanded}>
                             <summary className="py-1.5 px-2 sm:px-3 cursor-pointer flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5 list-none bg-sky-50/80 hover:bg-sky-100/80 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 transition-colors rounded-r-lg mb-1.5 mt-2 shadow-sm border-l-4 border-sky-400">
                                <div className="flex items-center justify-between w-full sm:w-auto">
                                    <p className="font-extrabold text-[11px] sm:text-sm text-sky-950 dark:text-sky-100 pl-1 whitespace-nowrap">{customer.name.toUpperCase()}</p>
                                    <div className="accordion-icon text-slate-400 transition-transform duration-300 hide-on-export ml-2 sm:hidden">
                                        <Icon name="chevron-down" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-x-2 sm:gap-x-3 gap-y-0.5 sm:gap-y-1 flex-wrap justify-start sm:justify-end text-[9px] sm:text-[11px] font-semibold w-full sm:w-auto">
                                    <span className="text-slate-600 dark:text-slate-300">Hẹn giao: <span className="font-bold text-slate-800 dark:text-slate-100">{customer.scheduledDate}</span></span>
                                    <span className="text-slate-600 dark:text-slate-300">DT Thực: <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(customer.totalRevenue)}</span></span>
                                    <span className="text-slate-600 dark:text-slate-300">DTQĐ: <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(customer.totalRevenueQD)}</span></span>
                                    <span className="text-slate-600 dark:text-slate-300">HQQĐ: <span className={`font-bold ${customer.hieuQuaQD < 40 ? 'text-rose-500' : 'text-emerald-500'}`}>{customer.hieuQuaQD.toFixed(0)}%</span></span>
                                    <div className="accordion-icon text-slate-400 transition-transform duration-300 hide-on-export ml-2 hidden sm:block">
                                        <Icon name="chevron-down" />
                                    </div>
                                </div>
                             </summary>
                              <div className="pb-3 px-1 sm:px-2 overflow-x-hidden">
                                 <div className="ml-1 pl-1 sm:ml-4 sm:pl-4 border-l-2 border-slate-100 dark:border-slate-800">
                                     <table className="w-full text-[10px] sm:text-sm table-fixed compact-export-table border-collapse">
                                         <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[9px] sm:text-[11px] border-b border-t border-slate-100 dark:border-slate-800">
                                             <tr>
                                                 <th className="py-1 px-1 text-left font-semibold w-[90px] min-[360px]:w-[100px] min-[390px]:w-[110px] sm:w-[135px]">Mã ĐH</th>
                                                 <th className="py-1 px-1 text-left font-semibold">Sản phẩm</th>
                                                 <th className="py-1 px-1 text-center font-semibold w-[22px] min-[360px]:w-[25px] sm:w-[30px]">SL</th>
                                                 <th className="py-1 px-1 text-right font-semibold w-[50px] min-[360px]:w-[55px] sm:w-[75px] whitespace-nowrap">Doanh Thu</th>
                                                 <th className="py-1 px-1 text-center font-semibold w-[32px] min-[360px]:w-[35px] sm:w-[65px]">Trạng Thái</th>
                                             </tr>
                                         </thead>
                                         <tbody>
                                             {customer.orderGroups.map((group) => {
                                                return group.lines.map((order, lineIndex) => {
                                                    const orderId = group.id === 'no-id' ? '-' : group.id;
                                                    const isUnshipped = group.status === 'Chưa xuất';
                                                    const price = Number(getRowValue(order, COL.PRICE)) || 0;
                                                    const isInstallment = getHinhThucThanhToan(order, productConfig) === 'tra_gop';
                                                    
                                                    return (
                                                        <tr key={`${group.id}-${lineIndex}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            {lineIndex === 0 && (
                                                            <td rowSpan={group.lines.length} className="py-1 px-1 text-left text-[9.5px] sm:text-xs text-slate-500 dark:text-slate-400 align-middle border-b border-dashed border-slate-300 dark:border-slate-700 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors w-[90px] min-[360px]:w-[100px] min-[390px]:w-[110px] sm:w-[135px]"
                                                                onClick={() => {
                                                                    if (orderId && orderId !== '-') {
                                                                        navigator.clipboard.writeText(orderId).then(() => {
                                                                            const toast = document.createElement('div');
                                                                            toast.textContent = `\u2713 \u0110\u00e3 sao ch\u00e9p: ${orderId}`;
                                                                            toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,.15);opacity:0;transition:opacity .2s';
                                                                            document.body.appendChild(toast);
                                                                            requestAnimationFrame(() => { toast.style.opacity = '1'; });
                                                                            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 200); }, 1500);
                                                                        });
                                                                    }
                                                                }}
                                                                title={orderId !== '-' ? 'Nh\u1ea5n \u0111\u1ec3 sao ch\u00e9p' : ''}
                                                            >
                                                                    <div className="flex flex-col items-start justify-center gap-0.5">
                                                                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-[10px] sm:text-xs whitespace-nowrap">{orderId}</span>
                                                                        {group.isAttached && (
                                                                            <span className="inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100 shadow-sm leading-none ring-1 ring-emerald-300/30">
                                                                                Bán kèm
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            )}
                                                            <td className="py-1 px-1 text-left text-[10px] sm:text-xs border-b border-dashed border-slate-300 dark:border-slate-700">
                                                                <div className="flex items-center gap-1.5 min-w-0 w-full">
                                                                    <span className="truncate text-slate-700 dark:text-slate-300" title={getRowValue(order, COL.PRODUCT) as string}>
                                                                        {getRowValue(order, COL.PRODUCT)}
                                                                    </span>
                                                                    {isInstallment && (
                                                                        <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-black uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex-shrink-0 whitespace-nowrap leading-none">
                                                                            Trả góp
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-1 px-1 text-center text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 border-b border-dashed border-slate-300 dark:border-slate-700">{formatQuantity(getRowValue(order, COL.QUANTITY) as number)}</td>
                                                            <td className="py-1 px-1 text-right font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap border-b border-dashed border-slate-300 dark:border-slate-700 text-[10px] sm:text-xs">{formatCurrency(price)}</td>
                                                            {lineIndex === 0 && (
                                                                <td rowSpan={group.lines.length} className="py-1 px-1 text-center text-[10px] sm:text-xs align-middle border-b border-dashed border-slate-300 dark:border-slate-700 w-[32px] min-[360px]:w-[35px] sm:w-[65px]">
                                                                    {isUnshipped ? (
                                                                        <div className="flex items-center justify-center text-rose-500 animate-pulse" title="Chưa xuất">
                                                                            <Icon name="x-circle" size={4} />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center justify-center text-emerald-500" title="Đã xuất">
                                                                            <Icon name="check-circle" size={4} />
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                });
                                             })}
                                         </tbody>
                                     </table>
                                 </div>
                              </div>
                        </details>
                                </React.Fragment>
                            );
                        });
                    })()}
                 </div>
            </div>
        </div>
    );
    
    if (isBatchExporting) {
        return (
            <div className="modal-content bg-slate-50 dark:bg-slate-900 w-[640px] flex flex-col border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Phân Tích Hiệu Quả Cá Nhân</p>
                        <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{employeeName}</h3>
                    </div>
                </div>
                <div className="p-6 bg-slate-100 dark:bg-slate-950">
                   {modalContent}
                </div>
            </div>
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={employeeName}
            subTitle="Phân Tích Hiệu Quả Cá Nhân"
            titleColorClass="text-indigo-600 dark:text-indigo-400"
            controls={controls}
            maxWidth="4xl"
        >
            <div className="-m-5 p-3 sm:p-6 bg-slate-100 dark:bg-slate-950" ref={modalBodyRef}>
                {modalContent}
            </div>
        </Modal>
    );
};

export default PerformanceModal;