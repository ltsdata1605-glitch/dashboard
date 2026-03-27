
import React, { useState, forwardRef, useMemo, useEffect } from 'react';
import type { Employee } from '../../types';
import { abbreviateName, formatCurrency, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { saveTopSellerAnalysis } from '../../services/dbService';

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
    
    const medals = ['🥇', '🥈', '🥉'];

    const handleBatchExportClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onBatchExport(sortedSellers);
    };

    return (
        <div ref={ref}>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-100 text-amber-600 shadow-sm">
                        <Icon name="trophy" size={6} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Top Nhân Viên</h3>
                        <p className="text-xs font-medium text-slate-400">{isExpanded ? 'Toàn bộ danh sách' : 'Top & Bot 20%'}</p>
                    </div>
                </div>
                <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 hide-on-export overflow-x-auto rounded-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            <button onClick={() => setIsExpanded(false)} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${!isExpanded ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Top & Bot 20%</button>
                            <button onClick={() => setIsExpanded(true)} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${isExpanded ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Toàn bộ</button>
                        </div>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
                        <button 
                            onClick={handleBatchExportClick}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Xuất hàng loạt báo cáo chi tiết"
                        >
                            <Icon name="switch-camera" size={5} />
                        </button>
                        {onExport && (
                            <button onClick={onExport} disabled={isExporting} title="Xuất Ảnh" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                {isExporting ? <Icon name="loader-2" size={5} className="animate-spin" /> : <Icon name="camera" size={5} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                {sortedDepartments.length === 0 ? (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-8">Không có dữ liệu nhân viên cho bộ phận đã chọn.</p>
                ) : (
                    sortedDepartments.map(dept => {
                        const showHeader = sortedDepartments.length > 1 || dept !== 'Không Phân Ca';
                        return (
                            <div key={dept}>
                                {showHeader && (
                                    <h3 className="text-md font-bold text-indigo-700 dark:text-indigo-400 mb-2 border-b-2 border-indigo-200 dark:border-indigo-800 pb-1 flex items-center gap-2">
                                        <Icon name="users-round" size={4} /> {dept}
                                    </h3>
                                )}
                                <div className="space-y-2">
                                    {groupedSellers[dept].map((seller) => {
                                        const rankIndex = sortedSellers.findIndex(s => s.name === seller.name);
                                        const medal = rankIndex < 3 ? medals[rankIndex] : null;
                                        
                                        let rankDisplay;
                                        if (medal) {
                                            rankDisplay = <div className="w-8 text-2xl font-bold text-center">{medal}</div>;
                                        } else {
                                            rankDisplay = <div className="w-8 text-sm text-slate-500 dark:text-slate-400 font-semibold text-center">#{rankIndex + 1}</div>
                                        }

                                        const hieuQuaClass = Number(seller.hieuQuaValue || 0) < 35 ? 'text-red-500 font-bold' : 'text-green-500 font-bold';
                                        const traChamClass = getTraChamPercentClass(Number(seller.traChamPercent || 0));

                                        return (
                                            <div key={seller.name} onClick={() => onEmployeeClick(seller.name)} className="p-2 border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 transition-shadow hover:shadow-md cursor-pointer">
                                                <div className="flex items-center gap-2">
                                                    {rankDisplay}
                                                    <div className="flex-grow min-w-0">
                                                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{abbreviateName(seller.name)}</p>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                                            <span><strong className="text-slate-600 dark:text-slate-300">Thực:</strong> {formatCurrency(seller.doanhThuThuc, 0)}</span>
                                                            <span className="inline-flex items-center"><strong className="text-slate-600 dark:text-slate-300">HQQĐ:</strong><span className={`ml-1 ${hieuQuaClass}`}>{Number(seller.hieuQuaValue || 0).toFixed(0)}%</span></span>
                                                            <span><strong className="text-slate-600 dark:text-slate-300">T.Cận:</strong> {formatQuantity(seller.slTiepCan)}</span>
                                                            <span><strong className="text-slate-600 dark:text-slate-300">T.Chậm:</strong> <span className={traChamClass}>{Number(seller.traChamPercent || 0).toFixed(0)}%</span></span>
                                                            <span><strong className="text-slate-600 dark:text-slate-300">T.Hộ:</strong> {formatQuantity(seller.slThuHo)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">DTQĐ</p>
                                                        <p className="font-bold text-lg text-indigo-600 dark:text-indigo-400">{formatCurrency(seller.doanhThuQD, 0)}</p>
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
