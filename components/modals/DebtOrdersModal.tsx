import React, { useRef, useState, useMemo, useEffect } from 'react';
import { flushSync } from 'react-dom';
import type { DataRow } from '../../types';
import { Modal } from '../shared/ui/Modal';
import { Icon } from '../common/Icon';
import { getRowValue, formatCurrency, calculateRowMetrics, formatQuantity, parseNumber, getErrorMessage } from '../../utils/dataUtils';
import { COL } from '../../constants';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { showExportOverlay, updateExportOverlay, hideExportOverlay } from '../../services/uiService';
import { Button } from '../shared/ui/Button';
import type { ExportImageOptions } from '../../hooks/useExportLogic';

interface DebtOrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (element: HTMLElement, filename: string, options?: ExportImageOptions) => Promise<void>;
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
// border-sky-500 bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 bg-sky-500
// border-sky-500 bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 bg-sky-500
// border-sky-500 bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 bg-sky-500
// border-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 bg-indigo-500
// border-amber-500 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 bg-amber-500
// border-rose-500 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 bg-rose-500
// border-emerald-500 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500
// border-emerald-500 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500
// border-emerald-500 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500
// border-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 bg-indigo-500
// border-rose-500 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 bg-rose-500
// border-slate-500 bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 bg-slate-500

const DebtOrdersModal: React.FC<DebtOrdersModalProps> = ({ isOpen, onClose, onExport }) => {
    const { processedData, productConfig } = useDashboardContext();

    // Đơn hàng đủ điều kiện tính doanh thu, ĐÃ XUẤT, còn "Còn nợ" > 0
    // — đã lọc sẵn ở services/filterService.ts (processedData.debtOrders). Lọc thêm ở đây:
    // chỉ giữ đơn có ngày hẹn giao (TG Hẹn Giao/Thời gian hẹn giao) đã qua so với hôm nay —
    // khớp đúng điều kiện banner (và cùng logic "quá hạn" đã dùng cho unshippedOrders).
    const salesData = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return (processedData?.debtOrders ?? []).filter(row => {
            let scheduledDateRaw = row['Thời gian hẹn giao'] || row['TG Hẹn Giao'] || row['Thời Gian Hẹn Giao'];
            if (!scheduledDateRaw) return false;
            let scheduledDate: Date | null = null;
            if (scheduledDateRaw instanceof Date) {
                scheduledDate = scheduledDateRaw;
            } else {
                const str = String(scheduledDateRaw).trim();
                if (str.includes('/')) {
                    const parts = str.split(/[ /:-]/);
                    if (parts.length >= 3) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1;
                        const year = parseInt(parts[2], 10);
                        if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
                            scheduledDate = new Date(year, month, day);
                        }
                    }
                }
                if (!scheduledDate || isNaN(scheduledDate.getTime())) {
                    scheduledDate = new Date(str);
                }
            }

            if (scheduledDate && !isNaN(scheduledDate.getTime())) {
                const schedTime = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate()).getTime();
                return todayStart > schedTime;
            }
            return false;
        });
    }, [processedData?.debtOrders]);

    const modalBodyRef = React.useRef<HTMLDivElement>(null);
    const creatorRefs = useRef<{ [key: string]: HTMLDetailsElement | null }>({});
    const [isExporting, setIsExporting] = useState(false);
    const [isAllExpanded, setIsAllExpanded] = useState(false);
    // PERF FIX: bảng đơn hàng của từng customer chỉ render khi thực sự cần (user tự mở, "Mở tất
    // cả", hoặc trước khi xuất ảnh) — tránh mount hàng nghìn <tr> vào DOM ngay khi mở modal. Chỉ
    // THÊM, không bao giờ gỡ khỏi Set sau khi đã render — tránh phức tạp/giật khi đóng lại.
    const [renderedCustomerIds, setRenderedCustomerIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        creatorRefs.current = {};
        setRenderedCustomerIds(new Set());
    }, [salesData]);

    // Đồng bộ (flushSync) toàn bộ id customer cần thiết vào renderedCustomerIds TRƯỚC KHI trả về
    // — dùng cho các thao tác đọc DOM native ngay sau đó (mở toàn bộ <details>, hoặc clone DOM để
    // xuất ảnh qua forceOpenDetails).
    const renderCustomersSync = (ids: string[]) => {
        flushSync(() => {
            setRenderedCustomerIds(prev => {
                let changed = false;
                const next = new Set(prev);
                for (const id of ids) {
                    if (!next.has(id)) { next.add(id); changed = true; }
                }
                return changed ? next : prev;
            });
        });
    };

    // Id customer đầy đủ (customer.name không đảm bảo duy nhất giữa các creator khác nhau).
    const getAllCustomerIds = () => creatorData.flatMap(creator => creator.customers.map(c => `${creator.name}::${c.name}`));
    const getCreatorCustomerIds = (creatorName: string) => {
        const creator = creatorData.find(c => c.name === creatorName);
        return creator ? creator.customers.map(c => `${creatorName}::${c.name}`) : [];
    };

    const handleExportAll = async () => {
        const elementToExport = modalBodyRef.current;
        if (elementToExport) {
            setIsExporting(true);
            showExportOverlay('Đang xuất ảnh toàn bộ...');
            renderCustomersSync(getAllCustomerIds());
            await onExport(elementToExport, `don-hang-con-no-all.png`, { forceOpenDetails: true, forcedWidth: 960 });
            setIsExporting(false);
            hideExportOverlay();
        }
    };

    const handleBatchExport = async () => {
        if (!modalBodyRef.current) return;
        setIsExporting(true);
        renderCustomersSync(getAllCustomerIds());
        const total = creatorData.length;
        showExportOverlay('Đang xuất ảnh hàng loạt...', `0/${total}`);
        for (let i = 0; i < creatorData.length; i++) {
            const creator = creatorData[i];
            updateExportOverlay(`Đang xuất: ${creator.name}`, `${i + 1}/${total}`);
            const creatorElement = creatorRefs.current[creator.name];
            if (creatorElement) {
                const filename = `con-no-${creator.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
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
            renderCustomersSync(getCreatorCustomerIds(creatorName));
            const filename = `con-no-${creatorName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
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
        if (nextState) {
            renderCustomersSync(getAllCustomerIds());
        }
        if (modalBodyRef.current) {
            const allDetails = modalBodyRef.current.querySelectorAll('details');
            allDetails.forEach(detail => (detail.open = nextState));
        }
        setIsAllExpanded(nextState);
    };

    const handleExportExcel = async () => {
        const XLSX = await import('xlsx');

        const exportData = salesData.map(order => {
            const { revenue: price, revenueQD } = calculateRowMetrics(order, productConfig);
            const conNo = parseNumber(getRowValue(order, COL.CON_NO));

            return {
                'Kho Xuất': getRowValue(order, COL.KHO),
                'Người Tạo': getRowValue(order, ['NguoiTao', 'Người tạo', 'NV Tạo']),
                'Tên Khách Hàng': getRowValue(order, ['TenKhachHang', 'Khách hàng', 'Tên khách hàng']) || 'Khách lẻ',
                'Mã Đơn Hàng': getRowValue(order, COL.ID),
                'Tên Sản Phẩm': getRowValue(order, COL.PRODUCT),
                'Số Lượng': Number(getRowValue(order, COL.QUANTITY)) || 0,
                'Doanh Thu Thực': price,
                'Doanh Thu QĐ': revenueQD,
                'Còn Nợ': conNo,
                'Trạng Thái Xuất': getRowValue(order, ['TrangThaiXuat', 'Trạng thái xuất']) || ''
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);

        const wscols = [
            {wch: 15}, {wch: 25}, {wch: 25}, {wch: 15}, {wch: 40},
            {wch: 10}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "DonHangConNo");
        XLSX.writeFile(wb, "DanhSachDonHangConNo.xlsx");
    };

    const { industryDataForDisplay, totalDebtAmount, creatorData } = useMemo(() => {
        if (!productConfig) return { industryDataForDisplay: [], totalDebtAmount: 0, creatorData: [] };

        let totalDebtAmount = 0;
        salesData.forEach(order => {
            totalDebtAmount += parseNumber(getRowValue(order, COL.CON_NO));
        });

        const industrySummary = salesData.reduce((acc, order) => {
            const conNo = parseNumber(getRowValue(order, COL.CON_NO));
            const quantity = Number(getRowValue(order, COL.QUANTITY)) || 0;
            const maNhomHang = getRowValue(order, COL.MA_NHOM_HANG);
            const parentGroup = productConfig.childToParentMap[maNhomHang] || 'Khác';
            if (!acc[parentGroup]) acc[parentGroup] = { revenue: 0, quantity: 0 };
            acc[parentGroup].revenue += conNo;
            acc[parentGroup].quantity += quantity;
            return acc;
        }, {} as { [key: string]: { revenue: number; quantity: number } });

        const industryDataForDisplay = Object.entries(industrySummary)
            .map(([name, data]) => ({ name, ...(data as { revenue: number, quantity: number }) }))
            .sort((a, b) => b.revenue - a.revenue);

        const groupedByCreator = salesData.reduce((acc, order) => {
            const creator = getRowValue(order, COL.NGUOI_TAO) || 'Không xác định';
            if (!acc[creator]) acc[creator] = [];
            acc[creator].push(order);
            return acc;
        }, {} as { [key: string]: DataRow[] });

        const creatorData = Object.entries(groupedByCreator).map(([creatorName, creatorOrders]: [string, DataRow[]]) => {
            let totalCreatorDebt = 0;
            creatorOrders.forEach(o => {
                totalCreatorDebt += parseNumber(getRowValue(o, COL.CON_NO));
            });

            const groupedByCustomer = creatorOrders.reduce((acc, order) => {
                const customer = getRowValue(order, COL.CUSTOMER_NAME) || 'Khách lẻ';
                if (!acc[customer]) acc[customer] = [];
                acc[customer].push(order);
                return acc;
            }, {} as { [key: string]: DataRow[] });

            const customerData = Object.entries(groupedByCustomer).map(([customerName, customerOrders]: [string, DataRow[]]) => {
                let totalCustomerDebt = 0;
                customerOrders.forEach(o => {
                    totalCustomerDebt += parseNumber(getRowValue(o, COL.CON_NO));
                });

                return { name: customerName, orders: customerOrders, totalDebt: totalCustomerDebt };
            });

            return {
                name: creatorName,
                customers: customerData.sort((a, b) => b.totalDebt - a.totalDebt),
                totalDebt: totalCreatorDebt,
            };
        }).sort((a, b) => b.totalDebt - a.totalDebt);

        return { industryDataForDisplay, totalDebtAmount, creatorData };
    }, [salesData, productConfig]);

    const handleCopyDebtEmployees = () => {
        if (creatorData.length === 0) return;

        const employeeIds = creatorData.map(creator => {
            const match = creator.name.match(/^(\d+)/);
            return match ? `@${match[1]}` : `@${creator.name}`;
        });

        let totalOrders = 0;
        creatorData.forEach(creator => {
            creator.customers.forEach(customer => {
                totalOrders += customer.orders.length;
            });
        });

        const text = `Danh sách nhân viên có đơn CHƯA HOÀN TẤT CÔNG NỢ:\nSố lượng nhân viên: ${employeeIds.length}\nSố lượng đơn hàng: ${totalOrders}\n\n${employeeIds.join('\n')}`;

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
            toastEl.textContent = '🔑 Đang xác thực Google...';
            sessionStorage.removeItem('googleOAuthToken');
            const { loginWithGoogleForceConsent } = await import('../../services/firebase');
            await loginWithGoogleForceConsent();
            let token = sessionStorage.getItem('googleOAuthToken');
            if (!token) throw new Error('Không thể lấy token xác thực.');

            toastEl.textContent = '📊 Đang tạo Google Sheet...';
            const { exportToGoogleSheet } = await import('../../services/googleSheetsService');

            const headers = ['Kho Xuất', 'Người Tạo', 'Tên Khách Hàng', 'Mã Đơn Hàng', 'Tên Sản Phẩm', 'Số Lượng', 'Doanh Thu Thực', 'Còn Nợ', 'Trạng Thái Xuất', 'Giải Trình'];
            const rows = salesData.map(order => {
                const price = Number(getRowValue(order, COL.PRICE)) || 0;
                const conNo = parseNumber(getRowValue(order, COL.CON_NO));

                return [
                    getRowValue(order, COL.KHO) || '',
                    getRowValue(order, ['NguoiTao', 'Người tạo', 'NV Tạo']) || '',
                    getRowValue(order, ['TenKhachHang', 'Khách hàng', 'Tên khách hàng']) || 'Khách lẻ',
                    getRowValue(order, COL.ID) || '',
                    getRowValue(order, COL.PRODUCT) || '',
                    Number(getRowValue(order, COL.QUANTITY)) || 0,
                    price,
                    conNo,
                    getRowValue(order, ['TrangThaiXuat', 'Trạng thái xuất']) || '',
                    '' // Cột Giải Trình để trống cho NV nhập
                ] as (string | number)[];
            });

            const extractName = (val: string | number) => {
                const s = String(val);
                const parts = s.split('-');
                return parts.length > 1 ? parts.slice(1).join('-').trim() : s.trim();
            };
            rows.sort((a, b) => {
                const nameA = extractName(a[1]);
                const nameB = extractName(b[1]);
                return nameA.localeCompare(nameB, 'vi');
            });

            const now = new Date();
            const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

            toastEl.textContent = `📊 Đang ghi ${rows.length} đơn hàng...`;

            try {
                const url = await exportToGoogleSheet(token, {
                    title: `Đơn Hàng Chưa Hoàn Tất Công Nợ - ${dateStr} ${timeStr}`,
                    headers,
                    rows,
                    sheetName: 'DonHangConNo'
                });

                const employeeTags = creatorData.map(creator => {
                    const match = creator.name.match(/^(\d+)/);
                    return match ? `@${match[1]}` : `@${creator.name}`;
                });

                const clipboardMessage = `Các bạn hoàn tất xử lý và thu công nợ đơn CHƯA HOÀN TẤT CÔNG NỢ:

Hoàn tất thu công nợ và xoá tên:
${employeeTags.join('\n')}

Link: ${url}`;

                await navigator.clipboard.writeText(clipboardMessage);

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
            } catch (apiErr: unknown) {
                if (getErrorMessage(apiErr) === 'AUTH_EXPIRED' && retryCount < 1) {
                    toastEl.textContent = '🔄 Token hết hạn, đang xác thực lại...';
                    return attemptExport(retryCount + 1);
                }
                throw apiErr;
            }
        };

        try {
            await attemptExport();
        } catch (err: unknown) {
            console.error('Google Sheets export error:', err);
            const errMsg = getErrorMessage(err).toLowerCase();
            if (errMsg.includes('popup') || errMsg.includes('cancel')) {
                toastEl.textContent = '❌ Đăng nhập bị huỷ.';
            } else if (errMsg.includes('network') || errMsg.includes('failed to fetch')) {
                toastEl.textContent = '🌐 Không có kết nối mạng.';
            } else if (errMsg === 'auth_expired') {
                toastEl.textContent = '🔑 Phiên đăng nhập hết hạn. Vui lòng thử lại.';
            } else {
                toastEl.textContent = `⚠️ Lỗi: ${getErrorMessage(err) || 'Không xác định'}`;
            }
            toastEl.style.background = '#dc2626';
            setTimeout(() => { toastEl.style.opacity = '0'; setTimeout(() => toastEl.remove(), 200); }, 3000);
        } finally {
            setIsExporting(false);
        }
    };

    const controls = (
        <div className="flex items-center gap-1 lg:gap-2 hide-on-export">
            <Button onClick={handleCopyDebtEmployees} variant="ghost" size="icon" title="Copy danh sách NV có đơn còn nợ" className="border border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 shadow-sm">
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
            <Button onClick={handleExportExcel} disabled={isExporting} variant="outline" title="Xuất File Excel" leftIcon={<Icon name="file-spreadsheet" size={4} />} className="border border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-sm font-bold text-xs lg:text-sm">
                 Excel
            </Button>
            <Button onClick={handleExportGoogleSheet} disabled={isExporting} variant="outline" title="Xuất lên Google Sheet" leftIcon={<Icon name="sheet" size={4} />} className="border border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 hover:bg-sky-100 dark:hover:bg-sky-900/50 shadow-sm font-bold text-xs lg:text-sm">
                 Sheet
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Còn Nợ: ${formatCurrency(totalDebtAmount)}`}
            subTitle="Đơn Hàng Chưa Hoàn Tất Công Nợ"
            titleColorClass="text-rose-600 dark:text-rose-400"
            controls={controls}
            maxWidth="xl"
            noRounded
        >
            <div className="-m-5 p-4 sm:p-8 bg-white dark:bg-slate-900" ref={modalBodyRef}>
                {creatorData.length > 0 ? (
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow p-3 sm:p-5">
                            <h4 className="font-black text-base sm:text-2xl text-sky-800 dark:text-sky-400 mb-3 sm:mb-5 text-center tracking-tight">TỶ TRỌNG CÔNG NỢ THEO NGÀNH HÀNG</h4>
                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                {industryDataForDisplay.map(item => {
                                    const percentage = totalDebtAmount > 0 ? (item.revenue / totalDebtAmount * 100) : 0;
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
                                <summary className="py-2 sm:py-2.5 px-2 sm:px-3 cursor-pointer flex justify-between items-center list-none bg-sky-50/80 hover:bg-sky-100/80 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 transition-colors rounded-r-lg mb-1.5 mt-2 shadow-sm border-l-4 border-sky-400">
                                        <p className="font-bold text-sm sm:text-[17px] text-sky-950 dark:text-sky-100 pl-1">{creator.name}</p>
                                        <div className="flex items-center gap-x-2 sm:gap-x-4 gap-y-0.5 sm:gap-y-1 flex-wrap justify-end text-[10px] sm:text-sm font-semibold">
                                            <span className="text-slate-600 dark:text-slate-300">Còn Nợ: <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(creator.totalDebt)}</span></span>
                                            <Button onClick={(e) => handleExportCreator(e, creator.name)} title={`Xuất ảnh của ${creator.name}`} variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hide-on-export ml-2">
                                                <Icon name="camera" size={4} />
                                            </Button>
                                            <div className="accordion-icon text-slate-400 transition-transform duration-300 hide-on-export ml-2">
                                                <Icon name="chevron-down" />
                                            </div>
                                        </div>
                                    </summary>
                                    {creator.customers.map(customer => {
                                        const customerId = `${creator.name}::${customer.name}`;
                                        const isRendered = renderedCustomerIds.has(customerId);
                                        return (
                                        <details
                                            key={customer.name}
                                            className="bg-white dark:bg-slate-900 ml-2 pl-2 sm:ml-4 sm:pl-4 border-l-2 border-slate-100 dark:border-slate-800 border-b border-dashed border-slate-300 dark:border-slate-700 pb-2 mb-2 last:border-b-0"
                                            onToggle={(e) => {
                                                if (e.currentTarget.open) {
                                                    setRenderedCustomerIds(prev => prev.has(customerId) ? prev : new Set(prev).add(customerId));
                                                }
                                            }}
                                        >
                                            <summary className="py-2 cursor-pointer flex justify-between items-center list-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors pr-2">
                                                <p className="font-semibold text-slate-700 dark:text-slate-300">{customer.name.toUpperCase()}</p>
                                                <div className="flex items-center gap-x-3 gap-y-1 flex-wrap justify-end text-xs font-semibold">
                                                    <span className="text-slate-600 dark:text-slate-300">Còn Nợ: <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(customer.totalDebt)}</span></span>
                                                    <div className="accordion-icon text-slate-400 transition-transform duration-300 hide-on-export ml-2">
                                                        <Icon name="chevron-down" />
                                                    </div>
                                                </div>
                                            </summary>
                                            {isRendered && (
                                            <div className="mt-1 pb-3 overflow-auto custom-scrollbar">
                                                <table className="min-w-[650px] md:w-full text-sm table-fixed compact-export-table border-collapse">
                                                    <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[11px] border-b border-t border-slate-100 dark:border-slate-800">
                                                        <tr>
                                                            <th className="py-2.5 px-2 text-left font-semibold w-[18%]">Mã ĐH</th>
                                                            <th className="py-2.5 px-2 text-left font-semibold w-[10%] whitespace-nowrap">Ngày tạo</th>
                                                            <th className="py-2.5 px-2 text-left font-semibold w-[24%]">Sản phẩm</th>
                                                            <th className="py-2.5 px-2 text-center font-semibold w-[6%]">SL</th>
                                                            <th className="py-2.5 px-2 text-center font-semibold w-[12%] whitespace-nowrap">Trạng Thái Xuất</th>
                                                            <th className="py-2.5 px-2 text-right font-semibold w-[15%] whitespace-nowrap">Doanh Thu</th>
                                                            <th className="py-2.5 px-2 text-right font-semibold w-[15%] whitespace-nowrap">Còn Nợ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                        {customer.orders.map((order, index) => {
                                                            const price = Number(getRowValue(order, COL.PRICE)) || 0;
                                                            const conNo = parseNumber(getRowValue(order, COL.CON_NO));
                                                            const orderId = getRowValue(order, COL.ID) as string;
                                                            const trangThaiXuat = getRowValue(order, COL.XUAT) as string;

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
                                                                    <td className="py-2.5 px-2 text-center text-xs whitespace-nowrap border-b border-slate-200 dark:border-slate-700/50">
                                                                        <span className={`px-1.5 py-0.5 rounded-full font-bold ${trangThaiXuat === 'Chưa xuất' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                                                            {trangThaiXuat || 'N/A'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-2.5 px-2 text-right font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap border-b border-slate-200 dark:border-slate-700/50">{formatCurrency(price)}</td>
                                                                    <td className="py-2.5 px-2 text-right font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap border-b border-slate-200 dark:border-slate-700/50">{formatCurrency(conNo)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            )}
                                        </details>
                                        );
                                    })}
                                </details>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-12">Không có đơn hàng nào còn nợ trong khoảng thời gian đã chọn.</p>
                )}
            </div>
        </Modal>
    );
};

export default DebtOrdersModal;
