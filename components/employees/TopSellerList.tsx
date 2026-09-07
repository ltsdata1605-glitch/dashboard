
import React, { useState, forwardRef, useMemo, useEffect } from 'react';
import type { Employee } from '../../types';
import { abbreviateName, formatCurrency, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { saveTopSellerAnalysis } from '../../services/dbService';
import { RankBadge } from './performance/PerformanceTableUtils';
import { Button } from '../shared/ui/Button';
import { onActivateKey } from '../shared/ui';

interface TopSellerListProps {
    fullSellerArray: Employee[];
    onEmployeeClick: (employeeName: string) => void;
    onBatchExport: (employees: Employee[]) => void;
    onExport?: () => void;
    isExporting?: boolean;
}

const getTraChamPercentClass = (percentage: number) => {
    if (isNaN(percentage)) return 'text-slate-600 dark:text-slate-300';
    if (percentage >= 45) return 'text-emerald-500 font-bold';
    if (percentage >= 35) return 'text-amber-500 font-bold';
    return 'text-rose-500 font-bold';
};


const TopSellerList = React.memo(forwardRef<HTMLDivElement, TopSellerListProps>(({ fullSellerArray, onEmployeeClick, onBatchExport, onExport, isExporting }, ref) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const sortedSellers = useMemo(() => {
        return [...fullSellerArray]
            .filter(s => s && s.doanhThuThuc > 0)
            .sort((a, b) => (b.doanhThuQD || 0) - (a.doanhThuQD || 0));
    }, [fullSellerArray]);

    // Calculate Top 20% and Bottom 20% or show all based on isExpanded
    const displayedSellers = useMemo(() => {
        if (isExpanded) return sortedSellers;
        
        // Changed to 20%
        const count20Percent = Math.ceil(sortedSellers.length * 0.2);
        
        // If list is small, show all anyway to avoid duplication/confusion
        if (sortedSellers.length <= count20Percent * 2) return sortedSellers;

        const top20 = sortedSellers.slice(0, count20Percent);
        const bot20 = sortedSellers.slice(-count20Percent);
        
        return [...top20, ...bot20];
    }, [sortedSellers, isExpanded]);

    const groupedSellers = useMemo(() => {
        return displayedSellers.reduce((acc, seller) => {
            const dept = seller.department || 'Không Phân Ca';
            if (!acc[dept]) {
                acc[dept] = [];
            }
            acc[dept].push(seller);
            return acc;
        }, {} as { [key: string]: Employee[] });
    }, [displayedSellers]);

    const sellerRanks = useMemo(() => {
        const ranks = new Map<string, number>();
        for (let i = 0, len = sortedSellers.length; i < len; i++) {
            ranks.set(sortedSellers[i].name, i);
        }
        return ranks;
    }, [sortedSellers]);

    const sortedDepartments = useMemo(() => Object.keys(groupedSellers).sort(), [groupedSellers]);
    


    const handleBatchExportClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onBatchExport(sortedSellers);
    };

    return (
        <div ref={ref}>
            <div className="flex flex-row justify-between items-center gap-2 mb-3 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="min-w-0">
                        <h3 className="text-sm lg:text-lg font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wide truncate leading-tight">Top Nhân Viên</h3>
                        <p className="text-[10px] lg:text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate leading-none mt-0.5">{isExpanded ? 'All' : 'Top/Bot 20%'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 lg:gap-1.5 hide-on-export shrink-0">
                    <div className="inline-flex gap-0.5 sm:gap-1">
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => setIsExpanded(false)}
                            className={`flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-lg transition-colors ${!isExpanded ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 font-bold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            title="Top/Bot 20%"
                        >
                            <Icon name="percent" size={4} className="lg:hidden" />
                            <Icon name="percent" size={4.5} className="hidden lg:block" />
                        </Button>
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => setIsExpanded(true)}
                            className={`flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-lg transition-colors ${isExpanded ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 font-bold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            title="Tất cả"
                        >
                            <Icon name="layout-list" size={4} className="lg:hidden" />
                            <Icon name="layout-list" size={4.5} className="hidden lg:block" />
                        </Button>
                    </div>
                    <div className="h-4 lg:h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 lg:mx-1"></div>
                    <Button 
                        variant="unstyled" size="none"
                        onClick={handleBatchExportClick}
                        className="flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Xuất hàng loạt báo cáo chi tiết"
                    >
                        <Icon name="images" size={4} className="lg:hidden" />
                        <Icon name="images" size={4.5} className="hidden lg:block" />
                    </Button>
                    {onExport && (
                        <Button
                            variant="unstyled" size="none"
                            onClick={onExport}
                            disabled={isExporting}
                            className="flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                            title="Xuất Ảnh"
                        >
                            {isExporting ? <Icon name="loader-2" size={4} className="animate-spin lg:hidden" /> : <Icon name="camera" size={4} className="lg:hidden" />}
                            {isExporting ? <Icon name="loader-2" size={4.5} className="animate-spin hidden lg:block" /> : <Icon name="camera" size={4.5} className="hidden lg:block" />}
                        </Button>
                    )}
                </div>
            </div>
            <div className="space-y-2 sm:space-y-4">
                {sortedDepartments.length === 0 ? (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-8">Không có dữ liệu nhân viên cho bộ phận đã chọn.</p>
                ) : (
                    sortedDepartments.map(dept => {
                        const showHeader = sortedDepartments.length > 1 || dept !== 'Không Phân Ca';
                        return (
                            <div key={dept}>
                                {showHeader && (
                                    <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50/80 dark:bg-slate-800/50 px-2 sm:px-3 py-1 sm:py-1.5 mb-1 sm:mb-2">
                                        <span className="w-1 sm:w-1.5 h-3 sm:h-4 rounded-full flex-shrink-0" style={{background: '#3b82f6'}} />
                                        <span className="text-[9px] sm:text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest leading-none">
                                            {dept} <span className="opacity-60 ml-1 sm:ml-2 font-medium bg-slate-200/50 dark:bg-slate-700 px-1.5 sm:px-2 py-0.5 rounded-full">{groupedSellers[dept].length} NS</span>
                                        </span>
                                    </div>
                                )}
                                <div className="space-y-1 sm:space-y-2">
                                    {groupedSellers[dept].map((seller) => {
                                        const rankIndex = sellerRanks.get(seller.name) ?? -1;
                                        let rankDisplay = <div className="w-5 sm:w-8 text-center"><RankBadge rank={rankIndex} /></div>;

                                        const hieuQuaClass = Number(seller.hieuQuaValue || 0) < 35 ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold';
                                        const traChamClass = getTraChamPercentClass(Number(seller.traChamPercent || 0));

                                        return (
                                            <div key={seller.name} role="button" tabIndex={0} onClick={() => onEmployeeClick(seller.name)} onKeyDown={onActivateKey(() => onEmployeeClick(seller.name))} className="p-1.5 sm:p-2 border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg transition-shadow hover:shadow-md cursor-pointer">
                                                    <div className="flex items-center gap-1 sm:gap-1.5">
                                                    {rankDisplay}
                                                    <div className="flex-grow min-w-0">
                                                        <p className="font-bold text-slate-800 dark:text-slate-100 text-[11px] sm:text-sm truncate">{abbreviateName(seller.name)}</p>
                                                        <div className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-1.5 sm:gap-x-3 gap-y-0 sm:gap-y-0.5 mt-0 sm:mt-1">
                                                            <span><strong className="text-slate-600 dark:text-slate-300">Thực:</strong> {formatCurrency(seller.doanhThuThuc, 0)}</span>
                                                            <span className="inline-flex items-center"><strong className="text-slate-600 dark:text-slate-300">HQQĐ:</strong><span className={`ml-0.5 ${hieuQuaClass}`}>{Number(seller.hieuQuaValue || 0).toFixed(0)}%</span></span>
                                                            <span><strong className="text-slate-600 dark:text-slate-300">T.Cận:</strong> {formatQuantity(seller.slTiepCan)}</span>
                                                            <span><strong className="text-slate-600 dark:text-slate-300">T.Chậm:</strong> <span className={traChamClass}>{Number(seller.traChamPercent || 0).toFixed(0)}%</span></span>
                                                            <span><strong className="text-slate-600 dark:text-slate-300">T.Hộ:</strong> {formatQuantity(seller.slThuHo)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="text-[8px] sm:text-xs text-slate-500 dark:text-slate-400">DTQĐ</p>
                                                        <p className="font-bold text-sm sm:text-lg text-indigo-600 dark:text-indigo-400">{formatCurrency(seller.doanhThuQD, 0)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
}));

export default TopSellerList;
