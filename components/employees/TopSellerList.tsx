
import React, { useState, forwardRef, useMemo, useEffect } from 'react';
import type { Employee } from '../../types';
import { abbreviateName, formatCurrency, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { saveTopSellerAnalysis } from '../../services/dbService';
import { RankBadge } from './performance/PerformanceTableUtils';

interface TopSellerListProps {
    fullSellerArray: Employee[];
    onEmployeeClick: (employeeName: string) => void;
    onBatchExport: (employees: Employee[]) => void;
    onExport?: () => void;
    isExporting?: boolean;
}

const getTraChamPercentClass = (percentage: number) => {
    if (isNaN(percentage)) return 'text-slate-600 dark:text-slate-300';
    if (percentage >= 45) return 'text-green-500 font-bold';
    if (percentage >= 35) return 'text-amber-500 font-bold';
    return 'text-red-500 font-bold';
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

    const sortedDepartments = useMemo(() => Object.keys(groupedSellers).sort(), [groupedSellers]);
    


    const handleBatchExportClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onBatchExport(sortedSellers);
    };

    return (
        <div ref={ref}>
            <div className="flex flex-row justify-between items-center gap-2 mb-3 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center bg-amber-100 text-amber-600 shrink-0">
                        <Icon name="trophy" size={3.5} className="sm:hidden" />
                        <Icon name="trophy" size={5} className="hidden sm:block" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xs sm:text-lg font-black text-slate-800 dark:text-white leading-tight truncate">Top Nhân Viên</h3>
                        <p className="text-[8px] sm:text-xs font-medium text-slate-400 leading-tight">{isExpanded ? 'All' : 'Top/Bot 20%'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-0.5 lg:gap-2 hide-on-export shrink-0">
                    <div className="flex items-center gap-0.5 lg:gap-2">
                        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700">
                            <button onClick={() => setIsExpanded(false)} className={`py-1 lg:py-1 px-1.5 lg:px-2.5 text-[9px] lg:text-[10px] font-bold rounded-l-lg transition-all uppercase tracking-wider ${!isExpanded ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}>Top/Bot 20%</button>
                            <button onClick={() => setIsExpanded(true)} className={`py-1 lg:py-1 px-1.5 lg:px-2.5 text-[9px] lg:text-[10px] font-bold rounded-r-lg border-l border-slate-200 dark:border-slate-600 transition-all uppercase tracking-wider ${isExpanded ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}>All</button>
                        </div>
                        <div className="hidden lg:block h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
                        <button 
                            onClick={handleBatchExportClick}
                            className="p-1.5 lg:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Xuất hàng loạt báo cáo chi tiết"
                        >
                            <Icon name="switch-camera" size={4} className="lg:hidden" />
                            <Icon name="switch-camera" size={5} className="hidden lg:block" />
                        </button>
                        {onExport && (
                            <button onClick={onExport} disabled={isExporting} title="Xuất Ảnh" className="p-1.5 lg:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                {isExporting ? <Icon name="loader-2" size={4} className="animate-spin" /> : <><Icon name="camera" size={4} className="lg:hidden" /><Icon name="camera" size={5} className="hidden lg:block" /></>}
                            </button>
                        )}
                    </div>
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
                                        const rankIndex = sortedSellers.findIndex(s => s.name === seller.name);
                                        let rankDisplay = <div className="w-5 sm:w-8 text-center"><RankBadge rank={rankIndex} /></div>;

                                        const hieuQuaClass = Number(seller.hieuQuaValue || 0) < 35 ? 'text-red-500 font-bold' : 'text-green-500 font-bold';
                                        const traChamClass = getTraChamPercentClass(Number(seller.traChamPercent || 0));

                                        return (
                                            <div key={seller.name} onClick={() => onEmployeeClick(seller.name)} className="p-1.5 sm:p-2 border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg transition-shadow hover:shadow-md cursor-pointer">
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
