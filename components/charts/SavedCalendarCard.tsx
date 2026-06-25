import React, { useMemo, useRef, useState } from 'react';
import RevenueCalendar from './RevenueCalendar';
import { Icon } from '../common/Icon';
import { isKhoMatch } from '../../services/filterService';
import { getRowValue, getHeSoQuyDoi, getExportFilenamePrefix, getHinhThucThanhToan, getParentGroup } from '../../utils/dataUtils';
import { HINH_THUC_XUAT_THU_HO, COL } from '../../constants';
import { exportElementAsImage } from '../../services/uiService';

interface SavedCalendarCardProps {
    filter: {
        id: string;
        parentGroup: string[];
        childGroup: string[];
        kho: string[];
        month: string;
        metric: string;
    };
    baseFilteredData: any[];
    productConfig: any;
    onRemove: (id: string) => void;
    badgeLabel?: string;
}

const SavedCalendarCard: React.FC<SavedCalendarCardProps> = React.memo(({ filter, baseFilteredData, productConfig, onRemove, badgeLabel }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (cardRef.current) {
            setIsExporting(true);
            const prefix = getExportFilenamePrefix(filter.kho);
            await exportElementAsImage(cardRef.current, `${prefix}-Lich-doanh-thu.png`, { elementsToHide: ['.hide-on-export'] });
            setIsExporting(false);
        }
    };

    const parentGroupFilter = Array.isArray(filter.parentGroup) ? filter.parentGroup : (filter.parentGroup ? [filter.parentGroup as unknown as string] : []);
    const childGroupFilter = Array.isArray(filter.childGroup) ? filter.childGroup : (filter.childGroup ? [filter.childGroup as unknown as string] : []);
    const khoFilter = Array.isArray(filter.kho) ? filter.kho : (filter.kho ? [filter.kho as unknown as string] : []);

    const calendarData = useMemo(() => {
        if (!baseFilteredData || !productConfig || !filter.month) return [];
        
        const [selYear, selMonth] = filter.month.split('-');
        const targetYear = parseInt(selYear);
        const targetMonth = parseInt(selMonth) - 1; 

        const dailySums: { [key: string]: { value: number; rawDate: Date; totalRev: number; traGopRev: number } } = {};

        baseFilteredData.forEach(row => {
            const rowDate = row.parsedDate;
            if (!rowDate || isNaN(rowDate.getTime())) return;
            if (rowDate.getFullYear() !== targetYear || rowDate.getMonth() !== targetMonth) return;

            const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG) || '';
            const parentGroup = getParentGroup(maNhomHang, productConfig) || 'Khác';
            if (parentGroup === 'Không tính doanh thu') return;
            const childGroup = productConfig.childToSubgroupMap[maNhomHang] || 'Khác';

            if (parentGroupFilter.length > 0 && !parentGroupFilter.includes(parentGroup)) return;
            if (childGroupFilter.length > 0 && !childGroupFilter.includes(childGroup)) return;
            if (khoFilter.length > 0 && !isKhoMatch(row, khoFilter)) return;

            const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT) || '';
            const isRevenue = productConfig && productConfig.revenueEligibleHTX && productConfig.revenueEligibleHTX.size > 0
                ? productConfig.revenueEligibleHTX.has(hinhThucXuat.trim().toLowerCase().normalize('NFC'))
                : !HINH_THUC_XUAT_THU_HO.has(hinhThucXuat);
            if (!isRevenue) return;

            const price = Number(getRowValue(row, COL.PRICE)) || 0;
            const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
            const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG) || '';
            const productName = getRowValue(row, COL.PRODUCT) || '';

            const productCode = String(getRowValue(row, COL.PRODUCT_CODE) || '').trim();
            const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName, productCode);
            
            let valueToAdd = 0;
            let totalRevenue = 0;
            let traGopRevenue = 0;

            if (filter.metric === 'revenue' || filter.metric === 'traChamPercent') {
                totalRevenue = price;
                const isTraGop = getHinhThucThanhToan(row, productConfig) === 'tra_gop';
                if (isTraGop) {
                    traGopRevenue = price;
                }
                valueToAdd = filter.metric === 'revenue' ? totalRevenue : 0;
            } else if (filter.metric === 'revenueQD') {
                valueToAdd = price * heso;
            } else if (filter.metric === 'quantity') {
                const isVieon = childGroup === 'Vieon' || parentGroup === 'Vieon' || (productName || '').toString().includes('VieON');
                const qtyMultiplier = productConfig?.quantityMultiplierMap?.[productCode];
                valueToAdd = isVieon ? (quantity * heso) : (qtyMultiplier !== undefined ? (quantity * qtyMultiplier) : quantity);
            }

            if (valueToAdd > 0 || totalRevenue > 0) {
                const dateStr = `${rowDate.getFullYear()}-${String(rowDate.getMonth() + 1).padStart(2, '0')}-${String(rowDate.getDate()).padStart(2, '0')}`;
                if (!dailySums[dateStr]) dailySums[dateStr] = { value: 0, rawDate: rowDate, totalRev: 0, traGopRev: 0 };
                dailySums[dateStr].value += valueToAdd;
                dailySums[dateStr].totalRev += totalRevenue;
                dailySums[dateStr].traGopRev += traGopRevenue;
            }
        });

        if (filter.metric === 'traChamPercent') {
            Object.keys(dailySums).forEach(dateStr => {
                const { totalRev, traGopRev } = dailySums[dateStr];
                dailySums[dateStr].value = totalRev > 0 ? (traGopRev / totalRev) * 100 : 0;
            });
        }

        return Object.entries(dailySums).map(([dateStr, data]) => ({
            date: dateStr,
            value: data.value,
            rawDate: data.rawDate
        }));
    }, [filter.month, filter.metric, parentGroupFilter, childGroupFilter, khoFilter, baseFilteredData, productConfig]);

    // Title logic: metric-based default titles for the 3 default calendars
    const metricName = filter.metric === 'quantity' ? 'Số lượng' : (filter.metric === 'revenueQD' ? 'Doanh thu QĐ' : filter.metric === 'traChamPercent' ? 'Tỉ trọng Trả chậm' : 'Doanh thu');
    
    let title: string;
    if (parentGroupFilter.length > 0 || childGroupFilter.length > 0) {
        title = parentGroupFilter.length > 0 && childGroupFilter.length > 0
            ? `${parentGroupFilter.join(', ')} - ${childGroupFilter.join(', ')}`
            : childGroupFilter.length > 0
                ? childGroupFilter.join(', ')
                : parentGroupFilter.join(', ');
    } else {
        // Default titles based on metric
        if (filter.metric === 'revenue') title = 'DOANH THU THỰC';
        else if (filter.metric === 'revenueQD') title = 'DOANH THU QUY ĐỔI';
        else if (filter.metric === 'traChamPercent') title = 'TỈ TRỌNG TRẢ CHẬM';
        else title = 'TỔNG CỪA HÀNG';
    }
    const khoLabel = (khoFilter.length > 0 && !khoFilter.includes('all') ? `KHO: ${khoFilter.join(', ')} • ` : '') + (filter.metric === 'quantity' ? 'Số lượng' : (filter.metric === 'revenueQD' ? 'Doanh thu QĐ' : filter.metric === 'traChamPercent' ? 'Tỉ lệ trả chậm' : 'Doanh thu'));
    const monthDate = filter.month ? new Date(`${filter.month}-01T00:00:00`) : new Date();

    return (
        <div ref={cardRef} className="relative border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm bg-slate-50 dark:bg-[#121212] flex flex-col animate-fade-in group w-full pb-2 calendar-export-target">
            <div className="flex-1 w-full relative z-10 px-1 pb-1 pt-1">
                <RevenueCalendar 
                    data={calendarData} 
                    monthDate={monthDate} 
                    metricName={metricName}
                    title={title}
                    subtitle={khoLabel}
                    compact={true}
                    actionButtons={
                        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={handleExport} 
                                disabled={isExporting}
                                className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm"
                                title="Xuất ảnh"
                            >
                                {isExporting ? <Icon name="loader-2" size={3.5} className="animate-spin" /> : <Icon name="camera" size={3.5} />}
                            </button>
                            <button 
                                onClick={() => onRemove(filter.id)} 
                                className="p-1.5 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700/50 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-sm"
                                title="Xóa bảng lịch"
                            >
                                <Icon name="trash-2" size={3.5} />
                            </button>
                        </div>
                    }
                />
            </div>
        </div>
    );
});

SavedCalendarCard.displayName = 'SavedCalendarCard';
export default SavedCalendarCard;
