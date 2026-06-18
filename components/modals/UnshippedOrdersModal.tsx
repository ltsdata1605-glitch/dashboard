import React, { useRef, useState, useMemo, useEffect } from 'react';
import type { DataRow } from '../../types';
import ModalWrapper from './ModalWrapper';
import { Icon } from '../common/Icon';
import { getRowValue, formatCurrency, getHeSoQuyDoi, formatQuantity } from '../../utils/dataUtils';
import { COL } from '../../constants';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { showExportOverlay, updateExportOverlay, hideExportOverlay } from '../../services/uiService';
import { Button } from '../shared/ui/Button';

interface UnshippedOrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (element: HTMLElement, filename: string, options?: any) => Promise<void>;
    onlyOverdue?: boolean;
}

// Icons for each industry group
const industryIcons: { [key: string]: string } = {
    'Smartphone': 'smartphone', 'Laptop': 'laptop', 'Tablet': 'tablet',
    'Phụ kiện': 'headphones', 'Gia dụng': 'sofa', 'Wearable': 'watch',
    'CE': 'tv', 'Bảo hiểm': 'shield-check', 'Sim': 'smartphone-nfc',
    'Máy lọc nước': 'droplets', 'Vieon': 'film', 'IT': 'printer', 'Office & Virus': 'file-key-2',
    'Khác': 'package'
};

// Color palette for different industries
const industryColors: { [key: string]: string } = {
    'Smartphone': 'blue', 'Laptop': 'sky', 'Tablet': 'cyan',
    'Phụ kiện': 'violet', 'Gia dụng': 'orange', 'Wearable': 'rose',
    'CE': 'teal', 'Bảo hiểm': 'emerald', 'Sim': 'lime',
    'Máy lọc nước': 'indigo', 'Vieon': 'fuchsia', 'Khác': 'slate'
};

// Tailwind JIT compiler hints
// border-blue-500 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 bg-blue-500
// border-sky-500 bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 bg-sky-500
// border-cyan-500 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 bg-cyan-500
// border-violet-500 bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 bg-violet-500
// border-orange-500 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 bg-orange-500
// border-rose-500 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 bg-rose-500
// border-teal-500 bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 bg-teal-500
// border-emerald-500 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500
// border-lime-500 bg-lime-100 dark:bg-lime-900/50 text-lime-600 dark:text-lime-400 bg-lime-500
// border-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 bg-indigo-500
// border-fuchsia-500 bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500
// border-slate-500 bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 bg-slate-500


const UnshippedOrdersModal: React.FC<UnshippedOrdersModalProps> = ({ isOpen, onClose, onExport, onlyOverdue }) => {
    const { processedData, productConfig } = useDashboardContext();
    
    const salesData = useMemo(() => {
        let data = (processedData?.unshippedOrders ?? []).filter(row => (Number(getRowValue(row, COL.PRICE)) || 0) > 0);
        if (onlyOverdue) {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            data = data.filter(row => {
                let scheduledDateRaw = row['Thời gian hẹn giao'] || row['TG Hẹn Giao'] || row.parsedDate;
                if (!scheduledDateRaw) return false;
                let scheduledDate = scheduledDateRaw instanceof Date ? scheduledDateRaw : new Date(scheduledDateRaw);
                if (!isNaN(scheduledDate.getTime())) {
                    const schedTime = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate()).getTime();
                    return todayStart > schedTime;
                }
                return false;
            });
        }
        return data;
    }, [processedData?.unshippedOrders, onlyOverdue]);

    const modalBodyRef = React.useRef<HTMLDivElement>(null);
    const creatorRefs = useRef<{ [key: string]: HTMLDetailsElement | null }>({});
    const [isExporting, setIsExporting] = useState(false);
    const [isAllExpanded, setIsAllExpanded] = useState(false);

    
    useEffect(() => {
        creatorRefs.current = {};
    }, [salesData]);

    const handleExportAll = async () => {
        const elementToExport = modalBodyRef.current;
        if (elementToExport) {
            setIsExporting(true);
            showExportOverlay('Đang xuất ảnh toàn bộ...');
            await onExport(elementToExport, `don-hang-cho-xuat-all.png`, { forceOpenDetails: true, forcedWidth: 960 });
            setIsExporting(false);
            hideExportOverlay();
        }
    };
    
    const handleBatchExport = async () => {
        if (!modalBodyRef.current) return;
        setIsExporting(true);
        const total = creatorData.length;
        showExportOverlay('Đang xuất ảnh hàng loạt...', `0/${total}`);
        for (let i = 0; i < creatorData.length; i++) {
            const creator = creatorData[i];
            updateExportOverlay(`Đang xuất: ${creator.name}`, `${i + 1}/${total}`);
            const creatorElement = creatorRefs.current[creator.name];
            if (creatorElement) {
                const filename = `cho-xuat-${creator.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
                await onExport(creatorElement, filename, {
                    forceOpenDetails: true,
                    forcedWidth: 960,
                });
            }
        }
        setIsExporting(false);
        hideExportOverlay();
    };

    const handleExportCreator = async (e: React.MouseEvent, creatorName: string) => {
        e.stopPropagation(); 
        const creatorElement = creatorRefs.current[creatorName];
        if (creatorElement) {
            setIsExporting(true);
            showExportOverlay(`Đang xuất: ${creatorName}`);
            const filename = `cho-xuat-${creatorName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
            await onExport(creatorElement, filename, {
                forceOpenDetails: true,
                forcedWidth: 960,
            });
            setIsExporting(false);
            hideExportOverlay();
        }
    };

    const toggleAllDetails = () => {
        const nextState = !isAllExpanded;
        if (modalBodyRef.current) {
            const allDetails = modalBodyRef.current.querySelectorAll('details');
            allDetails.forEach(detail => (detail.open = nextState));
        }
        setIsAllExpanded(nextState);
    };

    const handleExportExcel = async () => {
        const XLSX = await import('xlsx');
        const finalUnshippedOrders = salesData.filter(row =>
            (Number(getRowValue(row, COL.PRICE)) || 0) > 0
        );
        
        const exportData = finalUnshippedOrders.map(order => {
            const maNganhHang = getRowValue(order, COL.MA_NGANH_HANG);
            const maNhomHang = getRowValue(order, COL.MA_NHOM_HANG);
            const productName = getRowValue(order, COL.PRODUCT);
            const productCode = String(getRowValue(order, COL.PRODUCT_CODE) || '').trim();
            const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig || undefined, productName, productCode);
            const price = Number(getRowValue(order, COL.PRICE)) || 0;
            const revenueQD = price * heso;
            
            let scheduledDateRaw = order['Thời gian hẹn giao'] || order['TG Hẹn Giao'] || order.parsedDate;
            let formattedDate = 'N/A';
            if (scheduledDateRaw) {
                let scheduledDate = scheduledDateRaw instanceof Date ? scheduledDateRaw : new Date(scheduledDateRaw);
                if (!isNaN(scheduledDate.getTime())) {
                    formattedDate = scheduledDate.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'});
                }
            }

            return {
                'Kho Xuất': getRowValue(order, COL.KHO),
                'Người Tạo': getRowValue(order, ['NguoiTao', 'Người tạo', 'NV Tạo']),
                'Tên Khách Hàng': getRowValue(order, ['TenKhachHang', 'Khách hàng', 'Tên khách hàng']) || 'Khách lẻ',
                'Mã Đơn Hàng': getRowValue(order, COL.ID),
                'Tên Sản Phẩm': getRowValue(order, COL.PRODUCT),
                'Số Lượng': Number(getRowValue(order, COL.QUANTITY)) || 0,
                'Doanh Thu Thực': price,
                'Doanh Thu QĐ': revenueQD,
                'Thời Gian Hẹn': formattedDate,
                'Trạng Thái Xuất': getRowValue(order, ['TrangThaiXuat', 'Trạng thái xuất']) || 'Chưa xuất'
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Auto-size columns slightly
        const wscols = [
            {wch: 15}, {wch: 25}, {wch: 25}, {wch: 15}, {wch: 40}, 
            {wch: 10}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "DonHangChoXuat");
        XLSX.writeFile(wb, "DanhSachDonHangChoXuat.xlsx");
    };

    const { industryDataForDisplay, totalUnshippedRevenue, totalUnshippedRevenueQD, creatorData } = useMemo(() => {
        if (!productConfig) return { industryDataForDisplay: [], totalUnshippedRevenue: 0, totalUnshippedRevenueQD: 0, creatorData: [] };

        const finalUnshippedOrders = salesData.filter(row =>
            (Number(getRowValue(row, COL.PRICE)) || 0) > 0
        );
        
        let totalUnshippedRevenue = 0;
        let totalUnshippedRevenueQD = 0;
        finalUnshippedOrders.forEach(order => {
            const price = Number(getRowValue(order, COL.PRICE)) || 0;
            const rowRevenue = price; // Doanh thu là giá trị của cột Giá bán_1
            const maNganhHang = getRowValue(order, COL.MA_NGANH_HANG);
            const maNhomHang = getRowValue(order, COL.MA_NHOM_HANG);
            const productName = getRowValue(order, COL.PRODUCT);
            const productCode = String(getRowValue(order, COL.PRODUCT_CODE) || '').trim();
            const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName, productCode);
            totalUnshippedRevenue += rowRevenue;
            totalUnshippedRevenueQD += rowRevenue * heso;
        });

        const industrySummary = finalUnshippedOrders.reduce((acc, order) => {
            const price = Number(getRowValue(order, COL.PRICE)) || 0;
            const quantity = Number(getRowValue(order, COL.QUANTITY)) || 0;
            const rowRevenue = price; // Doanh thu là giá trị của cột Giá bán_1
            const maNhomHang = getRowValue(order, COL.MA_NHOM_HANG);
            const parentGroup = productConfig.childToParentMap[maNhomHang] || 'Khác';
            if (!acc[parentGroup]) acc[parentGroup] = { revenue: 0, quantity: 0 };
            acc[parentGroup].revenue += rowRevenue;
            acc[parentGroup].quantity += quantity;
            return acc;
        }, {} as { [key: string]: { revenue: number; quantity: number } });
        
        const industryDataForDisplay = Object.entries(industrySummary)
            .map(([name, data]) => ({ name, ...(data as { revenue: number, quantity: number }) }))
            .sort((a, b) => b.revenue - a.revenue);
        
        const groupedByCreator = finalUnshippedOrders.reduce((acc, order) => {
            const creator = getRowValue(order, COL.NGUOI_TAO) || 'Không xác định';
            if (!acc[creator]) acc[creator] = [];
            acc[creator].push(order);
            return acc;
        }, {} as { [key: string]: DataRow[] });

        const creatorData = Object.entries(groupedByCreator).map(([creatorName, creatorOrders]: [string, DataRow[]]) => {
            let totalCreatorRevenue = 0;
            let totalCreatorRevenueQD = 0;
            creatorOrders.forEach(o => {
                const price = Number(getRowValue(o, COL.PRICE)) || 0;
                const rowRevenue = price; // Doanh thu là giá trị của cột Giá bán_1
                const maNganhHang = getRowValue(o, COL.MA_NGANH_HANG);
                const maNhomHang = getRowValue(o, COL.MA_NHOM_HANG);
                const productName = getRowValue(o, COL.PRODUCT);
                const productCode = String(getRowValue(o, COL.PRODUCT_CODE) || '').trim();
                const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName, productCode);
                totalCreatorRevenue += rowRevenue;
                totalCreatorRevenueQD += rowRevenue * heso;
            });

            const hieuQuaQD = totalCreatorRevenue !== 0 ? ((totalCreatorRevenueQD - totalCreatorRevenue) / Math.abs(totalCreatorRevenue)) * 100 : 0;

            const groupedByCustomer = creatorOrders.reduce((acc, order) => {
                const customer = getRowValue(order, COL.CUSTOMER_NAME) || 'Khách lẻ';
                if (!acc[customer]) acc[customer] = [];
                acc[customer].push(order);
                return acc;
            }, {} as { [key: string]: DataRow[] });
            
            const customerData = Object.entries(groupedByCustomer).map(([customerName, customerOrders]: [string, DataRow[]]) => {
                let totalCustomerRevenue = 0;
                let totalCustomerRevenueQD = 0;
                customerOrders.forEach(o => {
                    const price = Number(getRowValue(o, COL.PRICE)) || 0;
                    const rowRevenue = price; // Doanh thu là giá trị của cột Giá bán_1
                    const maNganhHang = getRowValue(o, COL.MA_NGANH_HANG);
                    const maNhomHang = getRowValue(o, COL.MA_NHOM_HANG);
                    const productName = getRowValue(o, COL.PRODUCT);
                    const productCode = String(getRowValue(o, COL.PRODUCT_CODE) || '').trim();
                    const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName, productCode);
                    totalCustomerRevenue += rowRevenue;
                    totalCustomerRevenueQD += rowRevenue * heso;
                });

                const customerHieuQuaQD = totalCustomerRevenue !== 0 ? ((totalCustomerRevenueQD - totalCustomerRevenue) / Math.abs(totalCustomerRevenue)) * 100 : 0;
                let scheduledDateRaw: any = undefined;
                for (const order of customerOrders) {
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
                           formattedScheduledDate = strDate.substring(0, 5); // Fallback string (like 21/04)
                        }
                    }
                }
                
                return { name: customerName, orders: customerOrders, totalRevenue: totalCustomerRevenue, totalRevenueQD: totalCustomerRevenueQD, hieuQuaQD: customerHieuQuaQD, scheduledDate: formattedScheduledDate };
            });

            return { 
                name: creatorName, 
                customers: customerData.sort((a,b) => b.totalRevenue - a.totalRevenue), 
                totalRevenue: totalCreatorRevenue,
                totalRevenueQD: totalCreatorRevenueQD,
                hieuQuaQD: hieuQuaQD
            };
        }).sort((a,b) => b.totalRevenue - a.totalRevenue);

        return { industryDataForDisplay, totalUnshippedRevenue, totalUnshippedRevenueQD, creatorData };
    }, [salesData, productConfig]);

    const handleCopyOverdueEmployees = () => {
        if (creatorData.length === 0) return;

        // Extract employee IDs from creator names (e.g. "107617 - Phạm Anh Nhân" → "@107617")
        const employeeIds = creatorData.map(creator => {
            const match = creator.name.match(/^(\d+)/);
            return match ? `@${match[1]}` : `@${creator.name}`;
        });

        // Count total unique order IDs
        let totalOrders = 0;
        creatorData.forEach(creator => {
            creator.customers.forEach(customer => {
                totalOrders += customer.orders.length;
            });
        });

        const text = `Danh sách nhân viên có đơn QUÁ HẠN XUẤT:\nSố lượng nhân viên: ${employeeIds.length}\nSố lượng đơn hàng: ${totalOrders}\n\n${employeeIds.join('\n')}`;

        navigator.clipboard.writeText(text).then(() => {
            const toast = document.createElement('div');
            toast.textContent = `✓ Đã sao chép ${employeeIds.length} nhân viên, ${totalOrders} đơn hàng`;
            toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,.15);opacity:0;transition:opacity .2s';
            document.body.appendChild(toast);
            requestAnimationFrame(() => { toast.style.opacity = '1'; });
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 200); }, 2000);
        });
    };

    const handleExportGoogleSheet = async () => {
        setIsExporting(true);
        const toastEl = document.createElement('div');
        toastEl.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,.15);transition:opacity .2s';
        toastEl.textContent = '📊 Đang tạo Google Sheet...';
        document.body.appendChild(toastEl);

        const attemptExport = async (retryCount = 0): Promise<void> => {
            // Always force fresh login with consent to guarantee spreadsheets scope
            toastEl.textContent = '🔑 Đang xác thực Google...';
            sessionStorage.removeItem('googleOAuthToken');
            const { loginWithGoogleForceConsent } = await import('../../services/firebase');
            await loginWithGoogleForceConsent();
            let token = sessionStorage.getItem('googleOAuthToken');
            if (!token) throw new Error('Không thể lấy token xác thực.');

            toastEl.textContent = '📊 Đang tạo Google Sheet...';
            const { exportToGoogleSheet } = await import('../../services/googleSheetsService');

            const finalOrders = salesData.filter(row => (Number(getRowValue(row, COL.PRICE)) || 0) > 0);

            const headers = ['Kho Xuất', 'Người Tạo', 'Tên Khách Hàng', 'Mã Đơn Hàng', 'Tên Sản Phẩm', 'Số Lượng', 'Doanh Thu Thực', 'Thời Gian Hẹn', 'Trạng Thái Xuất', 'Giải Trình'];
            const rows = finalOrders.map(order => {
                const price = Number(getRowValue(order, COL.PRICE)) || 0;

                let scheduledDateRaw = order['Thời gian hẹn giao'] || order['TG Hẹn Giao'] || order.parsedDate;
                let formattedDate = 'N/A';
                if (scheduledDateRaw) {
                    let scheduledDate = scheduledDateRaw instanceof Date ? scheduledDateRaw : new Date(scheduledDateRaw);
                    if (!isNaN(scheduledDate.getTime())) {
                        formattedDate = scheduledDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    }
                }

                return [
                    getRowValue(order, COL.KHO) || '',
                    getRowValue(order, ['NguoiTao', 'Người tạo', 'NV Tạo']) || '',
                    getRowValue(order, ['TenKhachHang', 'Khách hàng', 'Tên khách hàng']) || 'Khách lẻ',
                    getRowValue(order, COL.ID) || '',
                    getRowValue(order, COL.PRODUCT) || '',
                    Number(getRowValue(order, COL.QUANTITY)) || 0,
                    price,
                    formattedDate,
                    getRowValue(order, ['TrangThaiXuat', 'Trạng thái xuất']) || 'Chưa xuất',
                    '' // Cột Giải Trình để trống cho NV nhập
                ] as (string | number)[];
            });

            const now = new Date();
            const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

            toastEl.textContent = `📊 Đang ghi ${rows.length} đơn hàng...`;

            try {
                const url = await exportToGoogleSheet(token, {
                    title: `Đơn Hàng Quá Hạn chưa xuất - ${dateStr} ${timeStr}`,
                    headers,
                    rows,
                    sheetName: 'DonHangChoXuat'
                });

                // Build formatted clipboard message with @user tags
                const employeeTags = creatorData.map(creator => {
                    const match = creator.name.match(/^(\d+)/);
                    return match ? `@${match[1]}` : `@${creator.name}`;
                });

                const clipboardMessage = `Các bạn hoàn tất xử lý và giải trình đơn QUÁ HẠN CHƯA XUẤT:

Hoàn tất xuất và giải trình xoá tên:
${employeeTags.join('\n')}

Link: ${url}`;

                await navigator.clipboard.writeText(clipboardMessage);

                // Show success toast with link button (don't auto-open)
                toastEl.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#16a34a;color:#fff;padding:14px 20px;border-radius:12px;font-size:13px;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.2);transition:opacity .2s;display:flex;flex-direction:column;gap:10px;max-width:420px;width:90vw';
                toastEl.innerHTML = '';

                const msgDiv = document.createElement('div');
                msgDiv.textContent = '✅ Đã tạo Google Sheet & sao chép tin nhắn!';
                msgDiv.style.fontWeight = '600';
                toastEl.appendChild(msgDiv);

                const btnRow = document.createElement('div');
                btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';

                const openBtn = document.createElement('a');
                openBtn.href = url;
                openBtn.target = '_blank';
                openBtn.textContent = '📄 Mở Sheet';
                openBtn.style.cssText = 'padding:6px 14px;background:#fff;color:#16a34a;border-radius:8px;font-weight:700;font-size:12px;text-decoration:none;cursor:pointer';

                const closeBtn = document.createElement('button');
                closeBtn.textContent = 'Đóng';
                closeBtn.style.cssText = 'padding:6px 14px;background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:8px;font-weight:600;font-size:12px;cursor:pointer';
                closeBtn.onclick = () => { toastEl.style.opacity = '0'; setTimeout(() => toastEl.remove(), 200); };

                btnRow.appendChild(openBtn);
                btnRow.appendChild(closeBtn);
                toastEl.appendChild(btnRow);

                setTimeout(() => { toastEl.style.opacity = '0'; setTimeout(() => toastEl.remove(), 200); }, 15000);
            } catch (apiErr: any) {
                // If AUTH_EXPIRED and haven't retried yet, re-login and try once more
                if (apiErr?.message === 'AUTH_EXPIRED' && retryCount < 1) {
                    toastEl.textContent = '🔄 Token hết hạn, đang xác thực lại...';
                    return attemptExport(retryCount + 1);
                }
                throw apiErr;
            }
        };

        try {
            await attemptExport();
        } catch (err: any) {
            console.error('Google Sheets export error:', err);
            const errMsg = (err?.message || '').toLowerCase();
            if (errMsg.includes('popup') || errMsg.includes('cancel')) {
                toastEl.textContent = '❌ Đăng nhập bị huỷ.';
            } else if (errMsg.includes('network') || errMsg.includes('failed to fetch')) {
                toastEl.textContent = '🌐 Không có kết nối mạng.';
            } else if (errMsg === 'auth_expired') {
                toastEl.textContent = '🔑 Phiên đăng nhập hết hạn. Vui lòng thử lại.';
            } else {
                toastEl.textContent = `⚠️ Lỗi: ${err?.message || 'Không xác định'}`;
            }
            toastEl.style.background = '#dc2626';
            setTimeout(() => { toastEl.style.opacity = '0'; setTimeout(() => toastEl.remove(), 200); }, 3000);
        } finally {
            setIsExporting(false);
        }
    };

    const controls = (
        <div className="flex items-center gap-1 lg:gap-2 hide-on-export">
            <Button onClick={handleCopyOverdueEmployees} variant="ghost" size="icon" title="Copy danh sách NV có đơn quá hạn xuất" className="border border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 shadow-sm">
                <Icon name="clipboard-list" size={4} />
            </Button>
            <Button onClick={toggleAllDetails} variant="secondary" size="icon" title={isAllExpanded ? 'Thu gọn tất cả' : 'Hiển thị tất cả'}>
                <Icon name="chevrons-down-up" size={4} />
            </Button>
             <Button onClick={handleBatchExport} disabled={isExporting} variant="secondary" size="icon" title="Xuất ảnh hàng loạt theo từng nhân viên">
                 <Icon name="images" size={4} />
            </Button>
            <Button onClick={handleExportAll} disabled={isExporting} variant="secondary" size="icon" title="Xuất ảnh toàn bộ danh sách">
                 <Icon name="camera" size={4} />
            </Button>
            <Button onClick={handleExportExcel} disabled={isExporting} variant="ghost" title="Xuất File Excel" leftIcon={<Icon name="file-spreadsheet" size={4} />} className="border border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 shadow-sm font-bold text-xs lg:text-sm">
                 Excel
            </Button>
            <Button onClick={handleExportGoogleSheet} disabled={isExporting} variant="ghost" title="Xuất lên Google Sheet" leftIcon={<Icon name="sheet" size={4} />} className="border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 shadow-sm font-bold text-xs lg:text-sm">
                 Sheet
            </Button>
        </div>
    );
    
    return (
        <ModalWrapper 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`DTQĐ Chờ Xuất: ${formatCurrency(totalUnshippedRevenueQD)}`}
            subTitle="Chi Tiết Đơn Hàng"
            titleColorClass="text-red-600 dark:text-red-400"
            controls={controls}
            maxWidthClass="max-w-[960px]"
            noRounded={true}
        >
            <div className="p-4 sm:p-8 overflow-y-auto bg-white dark:bg-slate-900" ref={modalBodyRef}>
                {creatorData.length > 0 ? (
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow p-3 sm:p-5">
                            <h4 className="font-black text-base sm:text-2xl text-blue-800 dark:text-blue-400 mb-3 sm:mb-5 text-center tracking-tight">TỶ TRỌNG NGÀNH HÀNG CHƯA XUẤT</h4>
                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                {industryDataForDisplay.map(item => {
                                    const percentage = totalUnshippedRevenue > 0 ? (item.revenue / totalUnshippedRevenue * 100) : 0;
                                    const color = industryColors[item.name] || 'slate';
                                    const icon = industryIcons[item.name] || 'package';

                                    return (
                                        <div
                                            key={item.name}
                                            className={`bg-slate-50 dark:bg-slate-900/50 p-2 sm:p-2.5 rounded-lg border-l-4 border-${color}-500 flex items-center gap-2.5 sm:gap-3 transition-all duration-300 ease-in-out transform hover:shadow-md hover:-translate-y-0.5`}
                                        >
                                           <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-${color}-100 dark:bg-${color}-900/50 flex flex-shrink-0 items-center justify-center text-${color}-600 dark:text-${color}-400`}>
                                                <Icon name={icon} size={4.5} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 truncate leading-tight mb-0.5" title={item.name}>{item.name}</p>
                                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                                    <p className={`font-black text-sm sm:text-base text-${color}-600 dark:text-${color}-400 leading-none`}>{formatCurrency(item.revenue)}</p>
                                                    <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 leading-none">({percentage.toFixed(1)}%)</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="mt-4">
                            {creatorData.map(creator => (
                                <details key={creator.name} ref={el => { creatorRefs.current[creator.name] = el; }} className="bg-white dark:bg-slate-900 overflow-hidden" open>
                                <summary className="py-2 sm:py-2.5 px-2 sm:px-3 cursor-pointer flex justify-between items-center list-none bg-cyan-50/80 hover:bg-cyan-100/80 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/50 transition-colors rounded-r-lg mb-1.5 mt-2 shadow-sm border-l-4 border-cyan-400">
                                        <p className="font-bold text-sm sm:text-[17px] text-cyan-950 dark:text-cyan-100 pl-1">{creator.name}</p>
                                        <div className="flex items-center gap-x-2 sm:gap-x-4 gap-y-0.5 sm:gap-y-1 flex-wrap justify-end text-[10px] sm:text-sm font-semibold">
                                            <span className="text-slate-600 dark:text-slate-300">DT Thực: <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(creator.totalRevenue)}</span></span>
                                            <span className="text-slate-600 dark:text-slate-300">DTQĐ: <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(creator.totalRevenueQD)}</span></span>
                                            <span className="text-slate-600 dark:text-slate-300">HQQĐ: <span className={`font-bold ${creator.hieuQuaQD < 40 ? 'text-red-500' : 'text-green-500'}`}>{creator.hieuQuaQD.toFixed(0)}%</span></span>
                                            <Button onClick={(e) => handleExportCreator(e, creator.name)} title={`Xuất ảnh của ${creator.name}`} variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hide-on-export ml-2">
                                                <Icon name="camera" size={4} />
                                            </Button>
                                            <div className="accordion-icon text-slate-400 transition-transform duration-300 hide-on-export ml-2">
                                                <Icon name="chevron-down" />
                                            </div>
                                        </div>
                                    </summary>
                                    {creator.customers.map(customer => (
                                        <details key={customer.name} className="bg-white dark:bg-slate-900 ml-2 pl-2 sm:ml-4 sm:pl-4 border-l-2 border-slate-100 dark:border-slate-800 border-b border-dashed border-slate-300 dark:border-slate-700 pb-2 mb-2 last:border-b-0">
                                            <summary className="py-2 cursor-pointer flex justify-between items-center list-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors pr-2">
                                                <p className="font-semibold text-slate-700 dark:text-slate-300">{customer.name.toUpperCase()}</p>
                                                <div className="flex items-center gap-x-3 gap-y-1 flex-wrap justify-end text-xs font-semibold">
                                                    <span className="text-slate-600 dark:text-slate-300">Hẹn giao: <span className="font-bold text-slate-800 dark:text-slate-100">{customer.scheduledDate}</span></span>
                                                    <span className="text-slate-600 dark:text-slate-300">DTQĐ: <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(customer.totalRevenueQD)}</span></span>
                                                    <span className="text-slate-600 dark:text-slate-300">HQQĐ: <span className={`font-bold ${customer.hieuQuaQD < 40 ? 'text-red-500' : 'text-green-500'}`}>{customer.hieuQuaQD.toFixed(0)}%</span></span>
                                                    <div className="accordion-icon text-slate-400 transition-transform duration-300 hide-on-export ml-2">
                                                        <Icon name="chevron-down" />
                                                    </div>
                                                </div>
                                            </summary>
                                            <div className="mt-1 pb-3">
                                                <table className="w-full text-sm table-fixed compact-export-table border-collapse">
                                                    <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs border-b border-t border-slate-100 dark:border-slate-800">
                                                        <tr>
                                                            <th className="py-2.5 px-2 text-left font-semibold w-[22%]">Mã ĐH</th>
                                                            <th className="py-2.5 px-2 text-left font-semibold w-[12%] whitespace-nowrap">Ngày tạo</th>
                                                            <th className="py-2.5 px-2 text-left font-semibold w-[28%] lg:w-[30%]">Sản phẩm</th>
                                                            <th className="py-2.5 px-2 text-center font-semibold w-[8%]">SL</th>
                                                            <th className="py-2.5 px-2 text-right font-semibold w-[15%] whitespace-nowrap">Doanh Thu</th>
                                                            <th className="py-2.5 px-2 text-right font-semibold w-[15%] whitespace-nowrap">DTQĐ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                        {customer.orders.map((order, index) => {
                                                            const price = Number(getRowValue(order, COL.PRICE)) || 0;
                                                            const maNganhHang = getRowValue(order, COL.MA_NGANH_HANG);
                                                            const maNhomHang = getRowValue(order, COL.MA_NHOM_HANG);
                                                            const productName = getRowValue(order, COL.PRODUCT);
                                                            const productCode = String(getRowValue(order, COL.PRODUCT_CODE) || '').trim();
                                                            const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName, productCode);
                                                            const priceQD = price * heso;
                                                            const orderId = getRowValue(order, COL.ID) as string;

                                                            return (
                                                                <tr key={orderId || index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                                                    <td
                                                                        className="py-2.5 px-2 text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50 break-all font-mono cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                                        title="Nhấn để sao chép"
                                                                        onClick={() => {
                                                                            if (orderId) {
                                                                                navigator.clipboard.writeText(orderId).then(() => {
                                                                                    const toast = document.createElement('div');
                                                                                    toast.textContent = `✓ Đã sao chép: ${orderId}`;
                                                                                    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,.15);opacity:0;transition:opacity .2s';
                                                                                    document.body.appendChild(toast);
                                                                                    requestAnimationFrame(() => { toast.style.opacity = '1'; });
                                                                                    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 200); }, 1500);
                                                                                });
                                                                            }
                                                                        }}
                                                                    >{orderId}</td>
                                                                    <td className="py-2.5 px-2 text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50 whitespace-nowrap">{(() => {
                                                                        const raw = getRowValue(order, COL.DATE_CREATED);
                                                                        if (!raw) return '';
                                                                        const d = raw instanceof Date ? raw : new Date(raw as string);
                                                                        return !isNaN(d.getTime()) ? d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : String(raw);
                                                                    })()}</td>
                                                                    <td className="py-2.5 px-2 text-left text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700/50 truncate w-full" title={getRowValue(order, COL.PRODUCT) as string}>{getRowValue(order, COL.PRODUCT)}</td>
                                                                    <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">{formatQuantity(getRowValue(order, COL.QUANTITY) as number)}</td>
                                                                    <td className="py-2.5 px-2 text-right font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap border-b border-slate-200 dark:border-slate-700/50">{formatCurrency(price)}</td>
                                                                    <td className="py-2.5 px-2 text-right font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap border-b border-slate-200 dark:border-slate-700/50">{formatCurrency(priceQD)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </details>
                                    ))}
                                </details>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-12">Không có đơn hàng nào đang chờ xuất trong khoảng thời gian đã chọn.</p>
                )}
            </div>
        </ModalWrapper>
    );
};

export default UnshippedOrdersModal;