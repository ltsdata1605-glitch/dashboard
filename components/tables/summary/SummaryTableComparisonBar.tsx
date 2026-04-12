import React from 'react';
import { Icon } from '../../common/Icon';
import { formatQuantity, formatCurrency } from '../../../utils/dataUtils';

type ComparisonMode = 'day_adjacent' | 'day_same_period' | 'week_adjacent' | 'week_same_period' | 'month_adjacent' | 'custom_range' | 'month_same_period_year' | 'monthly_trend' | 'quarter_adjacent' | 'quarter_same_period_year' | 'ytd_same_period_year';

interface SummaryTableComparisonBarProps {
    compMode: string;
    setCompMode: (mode: ComparisonMode) => void;
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    selectedMonth: string;
    setSelectedMonth: (month: string) => void;
    weeksInSelectedMonth: any[];
    selectedWeeks: string[];
    handleWeekPillClick: (id: string) => void;
    trendData: any;
    trendSelectedMonths: string[];
    setTrendSelectedMonths: React.Dispatch<React.SetStateAction<string[]>>;
    customRangeA: { start: string; end: string };
    setCustomRangeA: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
    customRangeB: { start: string; end: string };
    setCustomRangeB: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
    compTree: any;
    grandTotal: any;
    dateDisplay: { current: string; prev: string };
    compareUpToCurrentDay: boolean;
    setCompareUpToCurrentDay: (val: boolean) => void;
}

export const SummaryTableComparisonBar: React.FC<SummaryTableComparisonBarProps> = ({
    compMode, setCompMode, selectedDate, setSelectedDate, selectedMonth, setSelectedMonth,
    weeksInSelectedMonth, selectedWeeks, handleWeekPillClick, trendData, trendSelectedMonths,
    setTrendSelectedMonths, customRangeA, setCustomRangeA, customRangeB, setCustomRangeB,
    compTree, grandTotal, dateDisplay,
    compareUpToCurrentDay, setCompareUpToCurrentDay
}) => {
    return (
        <div className="animate-fade-in-down px-3 sm:px-5 py-2 sm:py-3 border-b border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-col w-full lg:w-auto">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 hide-on-export">
                    <select 
                        value={compMode} 
                        onChange={(e) => setCompMode(e.target.value as ComparisonMode)} 
                        className="text-xs font-bold text-indigo-700 bg-slate-50 border border-slate-200 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-indigo-400 dark:border-slate-700 py-1.5 pl-3 pr-8 cursor-pointer hover:bg-white transition-colors"
                    >
                        <option value="day_adjacent">Ngày (Liền kề)</option>
                        <option value="day_same_period">Ngày (CK tháng trước)</option>
                        <option value="week_adjacent">Tuần (Liền kề trong tháng)</option>
                        <option value="week_same_period">Tuần (CK tháng trước)</option>
                        <option value="month_adjacent">Tháng (Liền kề)</option>
                        <option value="month_same_period_year">Tháng (Cùng kỳ năm trước)</option>
                        <option value="monthly_trend">Tháng (Nhiều tháng Pivot)</option>
                        <option value="quarter_adjacent">Quý (Liền kề)</option>
                        <option value="quarter_same_period_year">Quý (Cùng kỳ năm trước)</option>
                        <option value="ytd_same_period_year">Lũy kế (YTD) - Cùng kỳ</option>
                        <option value="custom_range">Khoảng thời gian (Tùy chỉnh)</option>
                    </select>
                    
                    {(compMode.startsWith('day') || compMode === 'ytd_same_period_year') && (
                        <div className="flex items-center gap-1">
                            {compMode === 'ytd_same_period_year' && <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400">Đến ngày:</span>}
                            <input 
                                type="date" 
                                value={selectedDate} 
                                onChange={e => setSelectedDate(e.target.value)} 
                                className="text-xs border-slate-300 rounded shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:border-slate-600 py-1 px-2" 
                            />
                        </div>
                    )}

                    {(compMode.startsWith('week') || compMode.startsWith('month')) && (
                        <input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={e => setSelectedMonth(e.target.value)} 
                            className="text-xs border-slate-300 rounded shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:border-slate-600 py-1 px-2" 
                        />
                    )}

                    {compMode.startsWith('quarter') && (
                        <div className="flex items-center gap-1.5">
                            <select 
                                value={Math.floor((Number(selectedMonth.split('-')[1]) - 1) / 3) + 1}
                                onChange={e => {
                                    const q = Number(e.target.value);
                                    const m = (q - 1) * 3 + 1;
                                    const y = selectedMonth.split('-')[0];
                                    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
                                }}
                                className="text-xs font-semibold text-slate-700 border-slate-300 rounded shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 py-1 px-1.5"
                            >
                                <option value={1}>Quý 1</option>
                                <option value={2}>Quý 2</option>
                                <option value={3}>Quý 3</option>
                                <option value={4}>Quý 4</option>
                            </select>
                            <input 
                                type="number" 
                                value={selectedMonth.split('-')[0]} 
                                onChange={e => {
                                    const m = selectedMonth.split('-')[1] || '01';
                                    setSelectedMonth(`${e.target.value}-${m}`);
                                }} 
                                className="text-xs font-semibold border-slate-300 w-16 rounded shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:border-slate-600 py-1 px-1.5" 
                            />
                        </div>
                    )}

                    {compMode.startsWith('week') && weeksInSelectedMonth.length > 0 && (
                        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                            {weeksInSelectedMonth.map(w => {
                                const isSelected = selectedWeeks.includes(w.id);
                                return (
                                    <button
                                        key={w.id}
                                        onClick={() => handleWeekPillClick(w.id)}
                                        className={`whitespace-nowrap px-3 py-1 text-[10px] sm:text-xs font-semibold rounded-full border transition-colors ${
                                            isSelected 
                                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm' 
                                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                                        }`}
                                        title={w.label}
                                    >
                                        {w.shortLabel}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    
                    {['week_same_period', 'month_adjacent', 'month_same_period_year', 'quarter_same_period_year', 'ytd_same_period_year'].includes(compMode) && (
                        <div className="flex items-center gap-2 px-2 ml-2 border-l border-slate-300 dark:border-slate-600">
                            <input 
                                type="checkbox" 
                                id="compareUpToCurrentDay" 
                                checked={compareUpToCurrentDay}
                                onChange={(e) => setCompareUpToCurrentDay(e.target.checked)}
                                className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                            />
                            <label htmlFor="compareUpToCurrentDay" className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-800 transition-colors">
                                Chỉ so sánh ngang tiến độ (đến ngày báo cáo mới nhất)
                            </label>
                        </div>
                    )}

                    {compMode === 'monthly_trend' && trendData && (
                        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                            {trendData.months.map((m: any) => {
                                const isSelected = trendSelectedMonths.includes(m.id);
                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => setTrendSelectedMonths(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                                        className={`whitespace-nowrap px-3 py-1 text-[10px] sm:text-xs font-semibold rounded-full border transition-colors ${
                                            isSelected 
                                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm' 
                                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                                        }`}
                                        title={m.label}
                                    >
                                        {`T${parseInt(m.id.split('-')[1], 10)}`}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {compMode === 'custom_range' && (
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">Kỳ A:</span>
                                <input type="date" value={customRangeA.start} onChange={e => setCustomRangeA(p => ({ ...p, start: e.target.value }))} className="text-xs border-none bg-transparent focus:ring-0 p-0 w-24 focus:outline-none" />
                                <span className="text-slate-400 text-xs">-</span>
                                <input type="date" value={customRangeA.end} onChange={e => setCustomRangeA(p => ({ ...p, end: e.target.value }))} className="text-xs border-none bg-transparent focus:ring-0 p-0 w-24 focus:outline-none" />
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Kỳ B:</span>
                                <input type="date" value={customRangeB.start} onChange={e => setCustomRangeB(p => ({ ...p, start: e.target.value }))} className="text-xs border-none bg-transparent focus:ring-0 p-0 w-24 focus:outline-none" />
                                <span className="text-slate-400 text-xs">-</span>
                                <input type="date" value={customRangeB.end} onChange={e => setCustomRangeB(p => ({ ...p, end: e.target.value }))} className="text-xs border-none bg-transparent focus:ring-0 p-0 w-24 focus:outline-none" />
                            </div>
                        </div>
                    )}
                </div>
                <div className="hidden sm:flex text-[11px] text-slate-500 dark:text-slate-400 italic mt-1.5 items-start gap-1.5 max-w-xl line-clamp-2 leading-relaxed bg-slate-50/50 dark:bg-slate-800/30 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    <Icon name="info" size={3.5} className="mt-0.5 shrink-0 text-indigo-400 dark:text-indigo-500"/>
                    <span>
                        {compMode === 'day_adjacent' ? "So sánh trực tiếp kết quả của ngày được chọn so với ngày hôm trước (VD: Thứ Ba so với Thứ Hai). Giúp theo dõi tốc độ biến động hàng ngày." :
                        compMode === 'day_same_period' ? "So sánh ngày được chọn với ngày cùng số của tháng trước (VD: 15/03 vs 15/02). Dùng để loại bỏ biến động nhất thời khi đầu/cuối tháng." :
                        compMode === 'week_adjacent' ? "So sánh một tuần với tuần liền kề trước đó trong cùng 1 tháng. Theo dõi nhịp chạy số giữa các tuần trong kỳ lương." :
                        compMode === 'week_same_period' ? "So sánh tuần thứ N của tháng này với tuần thứ N tương ứng của tháng trước. Cho cái nhìn đối chiếu cùng giai đoạn tuần." :
                        compMode === 'month_adjacent' ? "Đối chiếu toàn bộ doanh số của 1 tháng so với tháng liền kề ngay trước nó." :
                        compMode === 'month_same_period_year' ? "So sánh tháng này năm nay với CHÍNH THÁNG NÀY CỦA NĂM NGOÁI. Đây là tiêu chí vàng (YoY) để loại bỏ tính chu kỳ mùa vụ." :
                        compMode === 'quarter_adjacent' ? "Gom dữ liệu 3 tháng của Quý được chọn đo với Quý liền kề. Thích hợp đánh giá chiến dịch trung hạn." :
                        compMode === 'quarter_same_period_year' ? "So sánh số liệu cả Quý năm nay với năng lực của chính Quý đó năm ngoái." :
                        compMode === 'ytd_same_period_year' ? "Lũy kế từ ngày 01/01 đến thời điểm được chọn, so sánh với cùng khoảng thời gian năm trước. Xem xét tiến độ KPI năm." :
                        "So sánh tùy chọn tự do giữa 2 khoảng thời gian bất kỳ mà bạn muốn."}
                    </span>
                </div>
            </div>

            {compTree && (
                <div className="flex flex-col md:flex-row items-center gap-3 sm:gap-6 relative z-10 w-full xl:w-auto mt-2 sm:mt-4 xl:mt-0 pt-2 sm:pt-4 xl:pt-0 border-t xl:border-t-0 border-teal-200/50 dark:border-teal-700/50">
                    <div className="flex gap-6 w-full md:w-auto">
                        {(() => {
                            const currentQty = grandTotal?.totalQuantity || 0;
                            const prevQty = compTree.prev?.grandTotal?.totalQuantity || 0;
                            const maxQty = Math.max(currentQty, prevQty) || 1;
                            const curPct = (currentQty / maxQty) * 100;
                            const prevPct = (prevQty / maxQty) * 100;
                            const deltaQty = currentQty - prevQty;
                            const isUpQty = deltaQty >= 0;
                            const growthQty = prevQty > 0 ? (deltaQty / prevQty) * 100 : (currentQty > 0 ? 100 : 0);
                            
                            return (
                                <div className="flex flex-col justify-end gap-1 w-[130px]">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">SỐ LƯỢNG</span>
                                        <span className={`text-[10px] font-bold ${isUpQty ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {isUpQty ? '+' : ''}{formatQuantity(deltaQty)} ({isUpQty ? '+' : ''}{growthQty.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 tooltip-trigger" title={`Hiện tại: ${formatQuantity(currentQty)}`}>
                                        <div className="flex-1 h-1.5 bg-slate-200/50 dark:bg-slate-700/50 rounded-r-full overflow-hidden">
                                            <div className="h-full bg-teal-500 rounded-r-full transition-all duration-700" style={{ width: `${curPct}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 tooltip-trigger" title={`So sánh: ${formatQuantity(prevQty)}`}>
                                        <div className="flex-1 h-1.5 bg-slate-200/50 dark:bg-slate-700/50 rounded-r-full overflow-hidden">
                                            <div className="h-full bg-slate-400 dark:bg-slate-500 rounded-r-full transition-all duration-700" style={{ width: `${prevPct}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                        
                        {(() => {
                            const currentRev = grandTotal?.totalRevenue || 0;
                            const prevRev = compTree.prev?.grandTotal?.totalRevenue || 0;
                            const maxRev = Math.max(currentRev, prevRev) || 1;
                            const curPct = (currentRev / maxRev) * 100;
                            const prevPct = (prevRev / maxRev) * 100;
                            const deltaRev = currentRev - prevRev;
                            const isUpRev = deltaRev >= 0;
                            const growthRev = prevRev > 0 ? (deltaRev / prevRev) * 100 : (currentRev > 0 ? 100 : 0);
                            
                            return (
                                <div className="flex flex-col justify-end gap-1 w-[140px]">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">DOANH THU</span>
                                        <span className={`text-[10px] font-bold pl-2 ${isUpRev ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {isUpRev ? '+' : ''}{formatCurrency(deltaRev, 0)} ({isUpRev ? '+' : ''}{growthRev.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 tooltip-trigger" title={`Hiện tại: ${formatCurrency(currentRev)}`}>
                                        <div className="flex-1 h-1.5 bg-slate-200/50 dark:bg-slate-700/50 rounded-r-full overflow-hidden">
                                            <div className="h-full bg-teal-500 rounded-r-full transition-all duration-700" style={{ width: `${curPct}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 tooltip-trigger" title={`So sánh: ${formatCurrency(prevRev)}`}>
                                        <div className="flex-1 h-1.5 bg-slate-200/50 dark:bg-slate-700/50 rounded-r-full overflow-hidden">
                                            <div className="h-full bg-slate-400 dark:bg-slate-500 rounded-r-full transition-all duration-700" style={{ width: `${prevPct}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="hidden md:block w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded border border-teal-200/50 dark:border-teal-700/50 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                            <span className="text-[11px] font-bold text-teal-800 dark:text-teal-200 whitespace-nowrap">HT: {dateDisplay?.current || ''}</span>
                        </div>
                        <Icon name="arrow-right" size={3.5} className="text-slate-400" />
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded border border-slate-200/70 dark:border-slate-700/50 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">SS: {dateDisplay?.prev || ''}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
