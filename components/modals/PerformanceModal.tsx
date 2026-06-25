import React, { useMemo, useRef, useState } from 'react';
import type { Employee, DataRow, ProductConfig } from '../../types';
import ModalWrapper from './ModalWrapper';
import { Icon } from '../common/Icon';
import { getRowValue, formatCurrency, getHeSoQuyDoi, formatQuantity, getHinhThucThanhToan } from '../../utils/dataUtils';
import { COL, HINH_THUC_XUAT_TIEN_MAT, HINH_THUC_XUAT_TRA_GOP, HINH_THUC_XUAT_THU_HO } from '../../constants';
import { DashboardContext } from '../../contexts/DashboardContext';
import { showExportOverlay, hideExportOverlay } from '../../services/uiService';
import { Button } from '../shared/ui/Button';




interface PerformanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeName: string;
    onExport: (element: HTMLElement, filename: string, options?: any) => Promise<void>;
    isBatchExporting?: boolean;
    fullSellerArray?: Employee[];
    validSalesData?: DataRow[];
    productConfig?: ProductConfig;
}

const KpiCard: React.FC<{ icon: string, label: string, value: string, color: string, children?: React.ReactNode }> = ({ icon, label, value, color, children }) => {
    return (
        <div className={`flex-1 p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow border-l-[3px] sm:border-l-4 border-${color}-500 flex flex-col justify-center gap-0.5 sm:gap-1`}>
            {/* Color mapping for JIT compiler */}
            {/* border-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 */}
            {/* border-green-500 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 */}
            {/* border-red-500 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 */}
            {/* border-amber-500 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 */}
            {/* border-purple-500 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 */}
            {/* border-cyan-500 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 */}
            <div className="flex items-center gap-2 sm:gap-3">
                <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-${color}-100 dark:bg-${color}-900/50 flex items-center justify-center text-${color}-600 dark:text-${color}-400 flex-shrink-0`}>
                    <Icon name={icon} size={3.5} className="sm:hidden" />
                    <Icon name={icon} size={5} className="hidden sm:block" />
                </div>
                <div>
                    <p className="text-[8px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{label}</p>
                    <p className={`text-sm sm:text-xl font-black text-${color}-600 dark:text-${color}-400 leading-none`}>{value}</p>
                </div>
            </div>
            {children && <div className="mt-0.5 sm:mt-1 text-[9px] sm:text-[10px]">{children}</div>}
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
                ? productConfig.revenueEligibleHTX.has(hinhThucXuat.trim().toLowerCase().normalize('NFC'))
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
                const price = Number(getRowValue(o, COL.PRICE)) || 0;
                const maNganhHang = getRowValue(o, COL.MA_NGANH_HANG);
                const maNhomHang = getRowValue(o, COL.MA_NHOM_HANG);
                const productName = getRowValue(o, COL.PRODUCT);
                const productCode = String(getRowValue(o, COL.PRODUCT_CODE) || '').trim();
                const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName, productCode);
                acc.totalRevenue += price;
                acc.totalRevenueQD += price * heso;
                return acc;
            }, { totalRevenue: 0, totalRevenueQD: 0 });

            const hieuQuaQD = totalRevenue !== 0 ? ((totalRevenueQD - totalRevenue) / Math.abs(totalRevenue)) * 100 : 0;
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
            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-3">
                <KpiCard icon="dollar-sign" label="Tổng DTQĐ" value={formatCurrency(employeeData.doanhThuQD)} color="indigo">
                    <div className="text-[10px] flex justify-between items-center text-slate-500 dark:text-slate-400 mt-1 border-t border-slate-100 dark:border-slate-700 pt-1">
                        <span>Thực:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(employeeData.doanhThuThuc)}</span>
                    </div>
                </KpiCard>
                <KpiCard icon="trending-up" label="Hiệu Quả QĐ" value={`${employeeData.hieuQuaValue.toFixed(0)}%`} color={employeeData.hieuQuaValue >= 40 ? 'green' : 'red'} />
                <KpiCard icon="clock" label="% T.Chậm" value={`${employeeData.traChamPercent.toFixed(0)}%`} color="amber">
                    <div className="text-[10px] flex justify-between items-center text-slate-500 dark:text-slate-400 mt-1 border-t border-slate-100 dark:border-slate-700 pt-1">
                        <span>%TG CE+ICT: <span className="font-black text-amber-700 dark:text-amber-400">{employeeData.traChamPercent_CE_ICT.toFixed(0)}%</span></span>
                        <span>Tổng: <span className="font-bold text-slate-700 dark:text-slate-200">{formatQuantity(employeeData.slTraCham_CE_ICT)}/{formatQuantity(employeeData.slCE_ICT)} đơn</span></span>
                    </div>
                </KpiCard>
                <KpiCard icon="shopping-bag" label="ĐH B.Kèm" value={formatQuantity(attachOrdersMetrics.count)} color="cyan">
                    <div className="text-[10px] flex justify-between items-center text-slate-500 dark:text-slate-400 mt-1 border-t border-slate-100 dark:border-slate-700 pt-1">
                        <span>%BK: <span className="font-black text-blue-700 dark:text-blue-400">{attachOrdersMetrics.percent.toFixed(0)}%</span></span>
                        <span>Tổng: <span className="font-bold text-slate-700 dark:text-slate-200">{attachOrdersMetrics.total} đơn</span></span>
                    </div>
                </KpiCard>
                <KpiCard icon="users" label="Tiếp Cận" value={formatQuantity(employeeData.slTiepCan)} color="purple">
                     <div className="text-[10px] flex justify-between items-center text-slate-500 dark:text-slate-400 mt-1 border-t border-slate-100 dark:border-slate-700 pt-1">
                        <span>Thu Hộ:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{formatQuantity(employeeData.slThuHo)}</span>
                    </div>
                </KpiCard>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                {/* Top Products */}
                <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow p-3 sm:p-4 flex flex-col">
                    <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mb-2 sm:mb-3 flex items-center gap-2"><Icon name="award" size={4} className="text-amber-500 sm:hidden"/><Icon name="award" size={5} className="text-amber-500 hidden sm:block"/> Top 5 Sản Phẩm Bán Chạy</h4>
                    <ul className="space-y-1 flex-1">
                        {topProducts.map((p, i) => (
                            <li key={i} className="flex justify-between items-center text-sm py-1 px-2 rounded-md bg-slate-50 dark:bg-slate-700/50">
                                <div className="truncate pr-4">
                                    <p className="font-semibold text-slate-700 dark:text-slate-200 truncate" title={p.name}>{p.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-none mt-0.5">{formatQuantity(p.quantity)} SP</p>
                                </div>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{formatCurrency(p.revenue)}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow p-3 sm:p-4 flex flex-col">
                    <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mb-2 sm:mb-3 flex items-center gap-2"><Icon name="pie-chart" size={4} className="text-teal-500 sm:hidden"/><Icon name="pie-chart" size={5} className="text-teal-500 hidden sm:block"/> Tỷ Trọng Doanh Thu Ngành Hàng</h4>
                    <div className={(isBatchExporting || isExporting) ? "flex-1" : "flex-1 overflow-y-auto"}>
                    {(() => {
                        const totalIndustryRevenue = Object.values(industryBreakdown).reduce((s, v) => s + v, 0);
                        const sortedIndustries = Object.entries(industryBreakdown)
                            .filter(([name]) => name !== 'Khác' && name !== 'Không xác định')
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 5);
                        
                        const barColors = [
                            'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 
                            'bg-cyan-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500',
                            'bg-pink-500', 'bg-sky-500', 'bg-lime-500', 'bg-fuchsia-500'
                        ];
                        const dotColors = [
                            'bg-indigo-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400',
                            'bg-cyan-400', 'bg-purple-400', 'bg-orange-400', 'bg-teal-400',
                            'bg-pink-400', 'bg-sky-400', 'bg-lime-400', 'bg-fuchsia-400'
                        ];

                        if (sortedIndustries.length === 0) {
                            return <p className="text-center text-slate-500 dark:text-slate-400 py-4">Không có dữ liệu ngành hàng.</p>;
                        }

                        return (
                            <ul className="space-y-1.5 mt-1">
                                {sortedIndustries.map(([name, revenue], i) => {
                                    const percent = totalIndustryRevenue > 0 ? (revenue / totalIndustryRevenue) * 100 : 0;
                                    return (
                                        <li key={name}>
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[i % dotColors.length]}`}></span>
                                                    {name}
                                                </span>
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap ml-3">{formatCurrency(revenue)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${barColors[i % barColors.length]} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                                                </div>
                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-10 text-right">{percent.toFixed(0)}%</span>
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
                             <summary className="py-1 sm:py-1.5 px-2 sm:px-3 cursor-pointer flex justify-between items-center list-none bg-cyan-50/80 hover:bg-cyan-100/80 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/50 transition-colors rounded-r-lg mb-1.5 mt-2 shadow-sm border-l-4 border-cyan-400">
                                <p className="font-bold text-xs sm:text-sm text-cyan-950 dark:text-cyan-100 pl-1">{customer.name.toUpperCase()}</p>
                                <div className="flex items-center gap-x-2 sm:gap-x-3 gap-y-0.5 sm:gap-y-1 flex-wrap justify-end text-[9px] sm:text-[11px] font-semibold">
                                    <span className="text-slate-600 dark:text-slate-300">Hẹn giao: <span className="font-bold text-slate-800 dark:text-slate-100">{customer.scheduledDate}</span></span>
                                    <span className="text-slate-600 dark:text-slate-300">DT Thực: <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(customer.totalRevenue)}</span></span>
                                    <span className="text-slate-600 dark:text-slate-300">DTQĐ: <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(customer.totalRevenueQD)}</span></span>
                                    <span className="text-slate-600 dark:text-slate-300">HQQĐ: <span className={`font-bold ${customer.hieuQuaQD < 40 ? 'text-red-500' : 'text-green-500'}`}>{customer.hieuQuaQD.toFixed(0)}%</span></span>
                                    <div className="accordion-icon text-slate-400 transition-transform duration-300 hide-on-export ml-2">
                                        <Icon name="chevron-down" />
                                    </div>
                                </div>
                             </summary>
                              <div className="pb-3 px-2">
                                 <div className="ml-2 pl-2 sm:ml-4 sm:pl-4 border-l-2 border-slate-100 dark:border-slate-800">
                                     <table className="w-full text-sm table-fixed compact-export-table border-collapse">
                                         <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs border-b border-t border-slate-100 dark:border-slate-800">
                                             <tr>
                                                 <th className="py-1 px-1.5 text-left font-semibold w-[135px]">Mã ĐH</th>
                                                 <th className="py-1 px-1.5 text-left font-semibold">Sản phẩm</th>
                                                 <th className="py-1 px-1.5 text-center font-semibold w-[30px]">SL</th>
                                                 <th className="py-1 px-1.5 text-right font-semibold w-[75px] whitespace-nowrap">Doanh Thu</th>
                                                 <th className="py-1 px-1.5 text-center font-semibold w-[85px]">Trạng Thái</th>
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
                                                            <td rowSpan={group.lines.length} className="py-1 px-1.5 text-left text-xs text-slate-500 dark:text-slate-400 align-middle border-b border-dashed border-slate-300 dark:border-slate-700 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
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
                                                                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300 break-all">{orderId}</span>
                                                                        {group.isAttached && (
                                                                            <span className="inline-flex w-fit items-center px-1.5 py-1 rounded text-[9px] font-black uppercase bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-100 shadow-sm leading-none ring-1 ring-green-300/30">
                                                                                Bán kèm
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            )}
                                                            <td className="py-1 px-1.5 text-left text-slate-700 dark:text-slate-300 truncate w-full border-b border-dashed border-slate-300 dark:border-slate-700">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="truncate w-full block" title={getRowValue(order, COL.PRODUCT) as string}>{getRowValue(order, COL.PRODUCT)}</span>
                                                                    {isInstallment && (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 leading-none">
                                                                            Trả góp
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-1 px-1.5 text-center text-slate-600 dark:text-slate-300 border-b border-dashed border-slate-300 dark:border-slate-700">{formatQuantity(getRowValue(order, COL.QUANTITY) as number)}</td>
                                                            <td className="py-1 px-1.5 text-right font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap border-b border-dashed border-slate-300 dark:border-slate-700">{formatCurrency(price)}</td>
                                                            {lineIndex === 0 && (
                                                                <td rowSpan={group.lines.length} className="py-1 px-1.5 text-center text-xs align-middle border-b border-dashed border-slate-300 dark:border-slate-700">
                                                                    {isUnshipped ? (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5 animate-pulse"></span>
                                                                            Chưa xuất
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                                                                            Đã xuất
                                                                        </span>
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
        <ModalWrapper 
            isOpen={isOpen} 
            onClose={onClose} 
            title={employeeName} 
            subTitle="Phân Tích Hiệu Quả Cá Nhân"
            titleColorClass="text-indigo-600 dark:text-indigo-400"
            controls={controls}
            maxWidthClass="max-w-4xl"
        >
            <div className="p-3 sm:p-6 overflow-y-auto bg-slate-100 dark:bg-slate-950" ref={modalBodyRef}>
                {modalContent}
            </div>
        </ModalWrapper>
    );
};

export default PerformanceModal;