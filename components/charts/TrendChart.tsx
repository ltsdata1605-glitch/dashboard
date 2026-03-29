import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell, LabelList } from 'recharts';
import { formatCurrency, getHeSoQuyDoi } from '../../utils/dataUtils';
import { HINH_THUC_XUAT_THU_HO } from '../../constants';
import { Icon } from '../common/Icon';
import { SectionHeader } from '../common/SectionHeader';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { useTrendChartLogic, RechartsTrendData } from '../../hooks/useTrendChartLogic';
import RevenueCalendar from './RevenueCalendar';

const CustomTooltip = ({ active, payload, metricName }: any) => {
    if (!active || !payload?.length) return null;
    const data: RechartsTrendData = payload[0].payload;
    const { label, value, changePercent, isDecrease } = data;
    
    let changeHtml = null;
    if (changePercent !== undefined && !isNaN(changePercent)) {
        const changeClass = isDecrease ? 'text-red-500' : 'text-green-500';
        const changeIcon = isDecrease ? '▼' : '▲';
        changeHtml = (
            <div className="mt-1">
                So với kỳ trước: <span className={`font-bold ${changeClass}`}>{changeIcon} {Math.abs(changePercent).toFixed(1)}%</span>
            </div>
        );
    }

    return (
        <div className="p-3 shadow-xl rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-sm font-sans z-50 min-w-[180px]">
            <div className="font-extrabold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-700 pb-1.5 text-xs">{label}</div>
            <div className="text-slate-600 dark:text-slate-300 flex justify-between gap-3 text-xs mb-1">
                <span>{metricName}:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{value.toLocaleString('vi-VN')}</span>
            </div>
            {changeHtml && <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/50 pt-1.5 mt-1.5">{changeHtml}</div>}
        </div>
    );
};

const CustomLabel = (props: any) => {
    const { x, y, width, value, textColor, positionOffset = 8 } = props;
    if (!value) return null;
    
    // For AreaChart, width is undefined.
    const cx = width !== undefined ? x + width / 2 : x;
    const cy = y - positionOffset;
    
    return (
      <text x={cx} y={cy} fill={textColor} textAnchor="middle" fontSize={10} fontWeight="bold">
        {formatCurrency(value)}
      </text>
    );
};

const TrendChart: React.FC = React.memo(() => {
  const { processedData, handleExport, isExporting, filterState, baseFilteredData, productConfig } = useDashboardContext();
  const trendData = processedData?.trendData;

  const chartCardRef = useRef<HTMLDivElement>(null);
  const [trendState, setTrendState] = useState({ view: 'daily', metric: 'thuc' });
  const [displayMode, setDisplayMode] = useState<'chart' | 'calendar'>('chart');
  
  // Local Filter States for Calendar
  const [calendarFilters, setCalendarFilters] = useState({
      parentGroup: 'all',
      childGroup: 'all',
      month: '',
      metric: 'revenue' // 'revenue' | 'revenueQD' | 'quantity'
  });

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  
  // Handle sync between display modes
  useEffect(() => {
    if (displayMode === 'calendar' && trendState.view !== 'daily') {
        setTrendState(prev => ({ ...prev, view: 'daily' }));
    }
  }, [displayMode, trendState.view]);

  // Extract unique months for Calendar Filter
  const availableMonths = useMemo(() => {
      if (!baseFilteredData) return [];
      const months = new Set<string>();
      baseFilteredData.forEach(row => {
          if (row.parsedDate && !isNaN(row.parsedDate.getTime())) {
              const y = row.parsedDate.getFullYear();
              const m = String(row.parsedDate.getMonth() + 1).padStart(2, '0');
              months.add(`${y}-${m}`); 
          }
      });
      return Array.from(months).sort().reverse();
  }, [baseFilteredData]);

  // Set initial month for calendar if empty
  useEffect(() => {
      if (availableMonths.length > 0 && !calendarFilters.month) {
          setCalendarFilters(prev => ({ ...prev, month: availableMonths[0] }));
      }
  }, [availableMonths, calendarFilters.month]);

  // Compute Data explicitly for Calendar (allowing Local Filtering without affecting Global Dashboard)
  const calendarData = useMemo(() => {
      if (displayMode !== 'calendar' || !baseFilteredData || !productConfig || !calendarFilters.month) return [];
      
      const [selYear, selMonth] = calendarFilters.month.split('-');
      const targetYear = parseInt(selYear);
      const targetMonth = parseInt(selMonth) - 1; 

      const dailySums: { [key: string]: { value: number, rawDate: Date } } = {};

      baseFilteredData.forEach(row => {
          const rowDate = row.parsedDate;
          if (!rowDate || isNaN(rowDate.getTime())) return;
          if (rowDate.getFullYear() !== targetYear || rowDate.getMonth() !== targetMonth) return;

          const maNhomHang = row['Mã Nhóm Hàng'];
          const parentGroup = productConfig.childToParentMap[maNhomHang] || 'Khác';
          const childGroup = productConfig.childToSubgroupMap[maNhomHang] || 'Khác';

          // Apply local filters
          if (calendarFilters.parentGroup !== 'all' && parentGroup !== calendarFilters.parentGroup) return;
          if (calendarFilters.childGroup !== 'all' && childGroup !== calendarFilters.childGroup) return;

          // Exclude "Thu Hộ" from revenue calculations
          const hinhThucXuat = row['Hình thức xuất'] || '';
          if (HINH_THUC_XUAT_THU_HO?.has(hinhThucXuat) && calendarFilters.metric !== 'quantity') return;

          const price = Number(row['Giá bán_1']) || 0;
          const quantity = Number(row['Số lượng']) || 0;
          const maNganhHang = row['Mã Ngành Hàng'];
          const productName = row['Tên vật tư'];

          const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName);
          
          let valueToAdd = 0;
          if (calendarFilters.metric === 'revenue') {
              valueToAdd = price;
          } else if (calendarFilters.metric === 'revenueQD') {
              valueToAdd = price * heso;
          } else if (calendarFilters.metric === 'quantity') {
              const isVieon = childGroup === 'Vieon' || parentGroup === 'Vieon' || (productName || '').toString().includes('VieON');
              valueToAdd = isVieon ? (quantity * heso) : quantity;
          }

          if (valueToAdd > 0) {
              const dateStr = `${rowDate.getFullYear()}-${String(rowDate.getMonth() + 1).padStart(2, '0')}-${String(rowDate.getDate()).padStart(2, '0')}`;
              if (!dailySums[dateStr]) dailySums[dateStr] = { value: 0, rawDate: rowDate };
              dailySums[dateStr].value += valueToAdd;
          }
      });

      return Object.values(dailySums).sort((a,b) => a.rawDate.getTime() - b.rawDate.getTime());
  }, [displayMode, baseFilteredData, productConfig, calendarFilters]);
  
  useEffect(() => {
      const observer = new MutationObserver(() => {
          setIsDark(document.documentElement.classList.contains('dark'));
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
  }, []);

  const { totalValue, chartData, hasData, metricName } = useTrendChartLogic({
      trendData,
      view: trendState.view,
      metric: trendState.metric
  });
  
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9';
  const dailyBaseColor = isDark ? '#818cf8' : '#4f46e5';

  const renderChart = () => {
    if (!hasData || chartData.length === 0) {
        return <div className="flex items-center justify-center h-full"><p className="text-center text-slate-500 dark:text-slate-400 text-sm font-semibold tracking-wide">Không có dữ liệu xu hướng.</p></div>;
    }

    if (trendState.view === 'daily') {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={dailyBaseColor} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={dailyBaseColor} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} minTickGap={15} />
                    <YAxis tickFormatter={(val) => formatCurrency(val)} tick={{ fill: textColor, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} width={60} />
                    <RechartsTooltip content={<CustomTooltip metricName={metricName} />} cursor={{ stroke: gridColor, strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke={dailyBaseColor} 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        dot={{ fill: isDark ? '#1e293b' : '#ffffff', stroke: dailyBaseColor, strokeWidth: 2, r: 4 }} 
                        activeDot={{ r: 6, stroke: isDark ? '#ffffff' : dailyBaseColor, strokeWidth: 2, fill: dailyBaseColor }} 
                    >
                        <LabelList dataKey="value" content={(props: any) => <CustomLabel {...props} textColor={textColor} positionOffset={12} />} />
                    </Area>
                </AreaChart>
            </ResponsiveContainer>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 30, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tickFormatter={(val) => formatCurrency(val)} tick={{ fill: textColor, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} width={60} />
                <RechartsTooltip content={<CustomTooltip metricName={metricName} />} cursor={{ fill: 'transparent' }} />
                <Bar 
                    dataKey="value" 
                    radius={[4, 4, 0, 0]} 
                >
                    <LabelList dataKey="value" content={(props: any) => <CustomLabel {...props} textColor={textColor} positionOffset={8} />} />
                    {chartData.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={
                                entry.fill 
                                    ? entry.fill 
                                    : entry.isDecrease 
                                        ? (isDark ? '#F56565' : '#FC8181') 
                                        : (isDark ? '#48BB78' : '#68D391')
                            } 
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
  };

  return (
    <div 
      ref={chartCardRef}
      className="bg-white dark:bg-[#1c1c1e] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-white/5 rounded-2xl mb-8 transition-all duration-300 relative z-0"
    >
      <SectionHeader 
        title={(
            <div className="flex items-center gap-3">
                <span className="text-slate-800 dark:text-slate-100 uppercase">XU HƯỚNG DOANH THU</span>
                {totalValue > 0 && (
                    <div className="text-slate-500 dark:text-slate-400 font-extrabold text-sm border-l border-slate-200 dark:border-slate-700/50 pl-3">
                        TỔNG: <span className="text-indigo-600 dark:text-indigo-400 ml-1">{formatCurrency(totalValue)}</span>
                    </div>
                )}
            </div>
        ) as any}
        icon="trending-up"
      >
        <div className="flex flex-wrap items-center gap-2 hide-on-export">
          {displayMode === 'calendar' ? (
              <div className="flex items-center gap-1.5">
                  <select
                      className="text-[11px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                      value={calendarFilters.month}
                      onChange={(e) => setCalendarFilters(prev => ({ ...prev, month: e.target.value }))}
                  >
                      {availableMonths.map(m => <option key={m} value={m}>Tháng {m.split('-')[1]}/{m.split('-')[0]}</option>)}
                  </select>

                  <select
                      className="text-[11px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[110px] cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 truncate"
                      value={calendarFilters.parentGroup}
                      onChange={(e) => setCalendarFilters(prev => ({ ...prev, parentGroup: e.target.value, childGroup: 'all' }))}
                  >
                      <option value="all">Tất cả Ngành</option>
                      {productConfig && Object.keys(productConfig.groups).sort().map(g => <option key={g} value={g}>{g}</option>)}
                  </select>

                  <select
                      className="text-[11px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[110px] cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 truncate"
                      value={calendarFilters.childGroup}
                      onChange={(e) => setCalendarFilters(prev => ({ ...prev, childGroup: e.target.value }))}
                  >
                      <option value="all">Tất cả Nhóm</option>
                      {productConfig && calendarFilters.parentGroup !== 'all' 
                          ? Array.from(productConfig.groups[calendarFilters.parentGroup] || []).sort().map(c => <option key={c} value={c}>{c}</option>)
                          : productConfig ? Object.keys(productConfig.childToParentMap).sort().map(c => <option key={c} value={c}>{c}</option>) : null
                      }
                  </select>

                  <select
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                      value={calendarFilters.metric}
                      onChange={(e) => setCalendarFilters(prev => ({ ...prev, metric: e.target.value }))}
                  >
                      <option value="revenue">Doanh thu</option>
                      <option value="revenueQD">Doanh thu QĐ</option>
                      <option value="quantity">Số lượng</option>
                  </select>
              </div>
          ) : (
              <>
                  <div className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/5">
                    <button
                      onClick={() => setTrendState(prev => ({ ...prev, metric: 'thuc' }))}
                      className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold uppercase transition-all ${
                        trendState.metric === 'thuc' 
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none border border-slate-200/60 dark:border-white/10' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-transparent'
                      }`}
                    >
                      Thực tế
                    </button>
                    <button
                      onClick={() => setTrendState(prev => ({ ...prev, metric: 'qd' }))}
                      className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold uppercase transition-all ${
                        trendState.metric === 'qd' 
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none border border-slate-200/60 dark:border-white/10' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-transparent'
                      }`}
                    >
                      Quy đổi
                    </button>
                  </div>

                  <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 ml-1">
                    {(['shift', 'daily', 'weekly', 'monthly'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setTrendState(prev => ({ ...prev, view: v }))}
                        className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${
                          trendState.view === v 
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                          : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}
                      >
                        {v === 'shift' ? 'Ca' : v === 'daily' ? 'Ngày' : v === 'weekly' ? 'Tuần' : 'Tháng'}
                      </button>
                    ))}
                  </div>
              </>
          )}

          <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 ml-1 hide-on-export">
            <button
                onClick={() => setDisplayMode('chart')}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                    displayMode === 'chart'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
                title="Dạng Biểu đồ"
            >
                <Icon name="bar-chart-2" size={4.5} />
            </button>
            <button
                onClick={() => setDisplayMode('calendar')}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                    displayMode === 'calendar'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
                title="Dạng Bảng Lịch"
            >
                <Icon name="calendar" size={4.5} />
            </button>
          </div>

          <button 
            onClick={() => handleExport(chartCardRef.current, 'xu-huong-doanh-thu', { captureAsDisplayed: true })}
            disabled={isExporting}
            className={`w-9 h-9 ml-1 rounded-xl flex items-center justify-center transition-colors border ${
              isExporting 
              ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:border-slate-700 opacity-70 cursor-not-allowed'
              : 'bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 hover:text-indigo-600 dark:hover:bg-slate-700 dark:hover:text-indigo-400 shadow-sm'
            }`}
            title="Xuất ảnh biểu đồ"
          >
            {isExporting ? <Icon name="loader-2" size={4.5} className="animate-spin" /> : <Icon name="download" size={4.5} />}
          </button>
        </div>
      </SectionHeader>

      <div className={`p-5 md:p-6 ${displayMode === 'calendar' ? 'pb-5' : 'pb-2'}`}>
        <div className={`w-full ${displayMode === 'calendar' ? '' : 'h-[320px]'}`}>
           {displayMode === 'calendar' ? (
                <RevenueCalendar 
                    data={calendarData} 
                    monthDate={new Date(`${calendarFilters.month || new Date().toISOString().substring(0,7)}-01`)} 
                    metricName={calendarFilters.metric === 'quantity' ? 'Số lượng' : (calendarFilters.metric === 'revenueQD' ? 'Doanh thu QĐ' : 'Doanh thu')}
                    title={calendarFilters.parentGroup !== 'all' ? (calendarFilters.childGroup !== 'all' ? `${calendarFilters.parentGroup} - ${calendarFilters.childGroup}` : calendarFilters.parentGroup) : 'TỔNG CÔNG TY'}
                />
            ) : renderChart()}
        </div>
      </div>
    </div>
  );
});

TrendChart.displayName = 'TrendChart';

export default TrendChart;
