import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell, LabelList } from 'recharts';
import { formatCurrency, formatQuantity, getHeSoQuyDoi, getRowValue, getExportFilenamePrefix } from '../../utils/dataUtils';
import { HINH_THUC_XUAT_THU_HO, COL } from '../../constants';
import { Icon } from '../common/Icon';
import { SectionHeader } from '../common/SectionHeader';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { isKhoMatch } from '../../services/filterService';
import { useTrendChartLogic, RechartsTrendData } from '../../hooks/useTrendChartLogic';
import RevenueCalendar from './RevenueCalendar';
import SavedCalendarCard from './SavedCalendarCard';
import { saveCustomCalendars, getCustomCalendars } from '../../services/dbService';
import MultiSelectDropdown from '../common/MultiSelectDropdown';

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
    const { x, y, width, value, textColor, positionOffset = 8, metric } = props;
    if (!value) return null;
    
    // For AreaChart, width is undefined.
    const cx = width !== undefined ? x + width / 2 : x;
    const cy = y - positionOffset;
    
    return (
      <text x={cx} y={cy} fill={textColor} textAnchor="middle" fontSize={10} fontWeight="bold">
        {metric === 'quantity' ? formatQuantity(value) : formatCurrency(value)}
      </text>
    );
};

const TrendChart: React.FC = React.memo(() => {
  const { processedData, handleExport, isExporting, filterState, baseFilteredData, calendarSourceData, originalData, productConfig, uniqueFilterOptions } = useDashboardContext();
  const trendData = processedData?.trendData;

  const chartCardRef = useRef<HTMLDivElement>(null);
  const [trendState, setTrendState] = useState({ view: 'shift', metric: 'thuc' });
  const [displayMode, setDisplayMode] = useState<'chart' | 'calendar'>('chart');
  
  // Local Filter States for Calendar
  const [calendarFilters, setCalendarFilters] = useState({
      parentGroup: [] as string[],
      childGroup: [] as string[],
      month: '',
      metric: 'revenue' // 'revenue' | 'revenueQD' | 'quantity' | 'traChamPercent'
  });

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [savedCalendars, setSavedCalendars] = useState<any[]>([]);
  const [activeCalendarTab, setActiveCalendarTab] = useState<string>('1-thuc');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 2500);
  };

  useEffect(() => {
      getCustomCalendars().then(cals => {
          if (cals && cals.length > 0) {
              setSavedCalendars(cals);
          } else {
              // Mặc định sinh 3 bảng lịch - month sẽ được điền sau khi availableMonths sẵn sàng
              const defaultCals = [
                  { id: '1-thuc', parentGroup: [], childGroup: [], month: '', metric: 'revenue' },
                  { id: '2-qd', parentGroup: [], childGroup: [], month: '', metric: 'revenueQD' },
                  { id: '3-tracham', parentGroup: [], childGroup: [], month: '', metric: 'traChamPercent' }
              ];
              setSavedCalendars(defaultCals);
              saveCustomCalendars(defaultCals);
          }
      });
  }, []);

  const handleAddCalendar = () => {
      const newCal = {
          id: Date.now().toString() + Math.random().toString().substring(2,6),
          ...calendarFilters
      };
      const newList = [newCal, ...savedCalendars];
      setSavedCalendars(newList);
      saveCustomCalendars(newList);
      setActiveCalendarTab(newCal.id);
      showToast('Đã lưu bảng lịch thành công!');
  };

  const handleRemoveCalendar = (id: string) => {
      const newList = savedCalendars.filter(c => c.id !== id);
      setSavedCalendars(newList);
      saveCustomCalendars(newList);
      // If the removed tab was active, switch to the first remaining tab
      if (activeCalendarTab === id && newList.length > 0) {
          setActiveCalendarTab(newList[0].id);
      }
  };
  
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

  // Set initial month for calendar if empty AND update default calendar months
  useEffect(() => {
      if (availableMonths.length > 0) {
          const latestMonth = availableMonths[0];
          if (!calendarFilters.month) {
              setCalendarFilters(prev => ({ ...prev, month: latestMonth }));
          }
          // Update default calendars that have no month set yet
          setSavedCalendars(prev => {
              const needsUpdate = prev.some(c => !c.month);
              if (!needsUpdate) return prev;
              const updated = prev.map(c => c.month ? c : { ...c, month: latestMonth });
              saveCustomCalendars(updated);
              return updated;
          });
      }
  }, [availableMonths]);

  // Extract unique parent and child groups exactly like SummaryTable does
  const { uniqueParentGroups, uniqueChildGroups } = useMemo(() => {
      const parents = new Set<string>();
      const children = new Set<string>();
      
      if (baseFilteredData && productConfig) {
          baseFilteredData.forEach((row: any) => {
              const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG) || '';
              const parentVal = productConfig.childToParentMap[maNhomHang] || 'Không xác định';
              const childVal = productConfig.childToSubgroupMap[maNhomHang] || 'Không xác định';
              
              const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT) || '';
              if (HINH_THUC_XUAT_THU_HO?.has(hinhThucXuat)) return;

              parents.add(parentVal);
              
              if (calendarFilters.parentGroup.length === 0 || calendarFilters.parentGroup.includes(parentVal)) {
                  children.add(childVal);
              }
          });
      }
      return {
          uniqueParentGroups: Array.from(parents).sort(),
          uniqueChildGroups: Array.from(children).sort()
      };
  }, [baseFilteredData, productConfig, calendarFilters.parentGroup]);

  const calendarData = useMemo(() => {
      if (displayMode !== 'calendar' || !baseFilteredData || !productConfig || !calendarFilters.month) return [];
      
      const [selYear, selMonth] = calendarFilters.month.split('-');
      const targetYear = parseInt(selYear);
      const targetMonth = parseInt(selMonth) - 1; 

      const dailySums: { [key: string]: { value: number, rawDate: Date, totalRev: number, traGopRev: number } } = {};

      baseFilteredData.forEach((row: any) => {
          const rowDate = row.parsedDate;
          if (!rowDate || isNaN(rowDate.getTime())) return;
          if (rowDate.getFullYear() !== targetYear || rowDate.getMonth() !== targetMonth) return;

          const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG) || '';
          const parentGroup = productConfig.childToParentMap[maNhomHang] || 'Không xác định';
          const childGroup = productConfig.childToSubgroupMap[maNhomHang] || 'Không xác định';

          // Apply local filters using centralized predicate
          if (calendarFilters.parentGroup.length > 0 && !calendarFilters.parentGroup.includes(parentGroup)) return;
          if (calendarFilters.childGroup.length > 0 && !calendarFilters.childGroup.includes(childGroup)) return;

          // Exclude "Thu Hộ" from revenue calculations
          const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT) || '';
          if (HINH_THUC_XUAT_THU_HO?.has(hinhThucXuat) && calendarFilters.metric !== 'quantity') return;

          const price = Number(getRowValue(row, COL.PRICE)) || 0;
          const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
          const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG) || '';
          const productName = getRowValue(row, COL.PRODUCT) || '';

          const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName);
          
          let valueToAdd = 0;
          let totalRevenue = 0;
          let traGopRevenue = 0;

          if (calendarFilters.metric === 'revenue' || calendarFilters.metric === 'traChamPercent') {
              totalRevenue = price;
              // Ensure HINH_THUC_XUAT_TRA_GOP is imported and used, or we just check the output string.
              // Assuming getHinhThucThanhToan or similar logic exists, let's just use string match for robustness 
              // since HINH_THUC_XUAT_TRA_GOP might not be explicitly pulled in the import currently.
              if ((hinhThucXuat || '').toLowerCase().includes('trả góp')) {
                  traGopRevenue = price;
              }
              valueToAdd = calendarFilters.metric === 'revenue' ? totalRevenue : 0;
          } else if (calendarFilters.metric === 'revenueQD') {
              valueToAdd = price * heso;
          } else if (calendarFilters.metric === 'quantity') {
              const isVieon = childGroup === 'Vieon' || parentGroup === 'Vieon' || (productName || '').toString().includes('VieON');
              valueToAdd = isVieon ? (quantity * heso) : quantity;
          }

          if (valueToAdd > 0 || totalRevenue > 0) {
              const dateStr = `${rowDate.getFullYear()}-${String(rowDate.getMonth() + 1).padStart(2, '0')}-${String(rowDate.getDate()).padStart(2, '0')}`;
              if (!dailySums[dateStr]) dailySums[dateStr] = { value: 0, rawDate: rowDate, totalRev: 0, traGopRev: 0 };
              dailySums[dateStr].value += valueToAdd;
              dailySums[dateStr].totalRev += totalRevenue;
              dailySums[dateStr].traGopRev += traGopRevenue;
          }
      });

      if (calendarFilters.metric === 'traChamPercent') {
          Object.keys(dailySums).forEach(dateStr => {
              const { totalRev, traGopRev } = dailySums[dateStr];
              dailySums[dateStr].value = totalRev > 0 ? (traGopRev / totalRev) * 100 : 0;
          });
      }

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
  
  // Draft calendar ref for its own export
  const draftCalendarRef = useRef<HTMLDivElement>(null);

  const handleExportDraft = async () => {
      if (draftCalendarRef.current) {
          const prefix = getExportFilenamePrefix(filterState.kho);
          const monthLabel = calendarFilters.month ? calendarFilters.month.split('-').reverse().join('-') : 'lich';
          await handleExport(draftCalendarRef.current, `${prefix}-Lich-doanh-thu-nhap-${monthLabel}.png`, { captureAsDisplayed: true, elementsToHide: ['.hide-on-export'] });
      }
  };

  const handleExportClick = async () => {
      const prefix = getExportFilenamePrefix(filterState.kho);
      if (displayMode === 'calendar') {
          const targets = document.querySelectorAll('.calendar-export-target');
          if (targets.length > 0) {
              for (let i = 0; i < targets.length; i++) {
                  await handleExport(targets[i] as HTMLElement, `${prefix}-Lich-doanh-thu-tab-${i}.png`, { captureAsDisplayed: true, elementsToHide: ['.hide-on-export'] });
                  await new Promise(r => setTimeout(r, 1000)); // Delay between downloads
              }
          }
      } else {
          handleExport(chartCardRef.current, `${prefix}-Xu-huong-doanh-thu.png`, { captureAsDisplayed: true });
      }
  };
  
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
                        isAnimationActive={false}
                    >
                        <LabelList dataKey="value" content={(props: any) => <CustomLabel {...props} textColor={textColor} positionOffset={12} metric={trendState.metric} />} />
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
                    isAnimationActive={false}
                >
                    <LabelList dataKey="value" content={(props: any) => <CustomLabel {...props} textColor={textColor} positionOffset={8} metric={trendState.metric} />} />
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
      className="bg-white dark:bg-[#1c1c1e] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-white/5 rounded-xl lg:rounded-2xl mb-3 lg:mb-8 transition-all duration-300 relative z-0"
    >
      <SectionHeader 
        title={(
            <div className="flex flex-col">
                <div className="flex items-center gap-3">
                    <span className="text-slate-800 dark:text-slate-100 uppercase">XU HƯỚNG DOANH THU</span>
                    {totalValue > 0 && displayMode !== 'calendar' && (
                        <div className="text-slate-500 dark:text-slate-400 font-extrabold text-sm border-l border-slate-200 dark:border-slate-700/50 pl-3">
                            TỔNG: <span className="text-indigo-600 dark:text-indigo-400 ml-1">{formatCurrency(totalValue)}</span>
                        </div>
                    )}
                </div>
                <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                    {(Array.isArray(filterState.kho) ? filterState.kho : (filterState.kho ? [filterState.kho as unknown as string] : [])).length > 0 && !(Array.isArray(filterState.kho) ? filterState.kho : (filterState.kho ? [filterState.kho as unknown as string] : [])).includes('all') ? `KHO: ${(Array.isArray(filterState.kho) ? filterState.kho : (filterState.kho ? [filterState.kho as unknown as string] : [])).join(', ')} | ` : ''} 
                    {(filterState.xuat !== 'all') ? `TRẠNG THÁI XUẤT: ${filterState.xuat} | ` : ''}
                    {filterState.dateRange !== 'all' ? `TỪ ${filterState.startDate.split('T')[0].split('-').reverse().join('/')} ĐẾN ${filterState.endDate.split('T')[0].split('-').reverse().join('/')}` : 'TẤT CẢ THỜI GIAN'}
                </span>
            </div>
        ) as any}
        icon="trending-up"
      >
        <div className="flex flex-wrap items-center gap-2 hide-on-export w-full md:w-auto">
          {displayMode === 'calendar' ? (
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/30 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/50 w-full md:w-auto pb-1 relative z-[200]">
                  {/* Cụm 1: Thời gian & Kho */}
                  <div className="flex flex-none items-center gap-1 pr-1.5 sm:pr-2 border-r border-slate-200 dark:border-slate-700">
                      <select
                          className="text-[10px] sm:text-[11px] font-black bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm transition-all uppercase tracking-wider min-h-[32px]"
                          value={calendarFilters.month}
                          onChange={(e) => setCalendarFilters(prev => ({ ...prev, month: e.target.value }))}
                      >
                          {availableMonths.map(m => <option key={m} value={m}>{m.split('-')[1]}/{m.split('-')[0]}</option>)}
                      </select>
                  </div>

                  {/* Cụm 2: Phân nhóm */}
                  <div className="flex flex-none items-center gap-1 px-1.5 sm:px-2 border-r border-slate-200 dark:border-slate-700">
                      <div className="w-auto">
                          <MultiSelectDropdown
                              label="Ngành"
                              options={uniqueParentGroups}
                              selected={calendarFilters.parentGroup}
                              onChange={(val) => setCalendarFilters(prev => ({ ...prev, parentGroup: val, childGroup: [] }))}
                              variant="compact"
                          />
                      </div>
                      <div className="w-auto">
                          <MultiSelectDropdown
                              label="Nhóm"
                              options={uniqueChildGroups}
                              selected={calendarFilters.childGroup}
                              onChange={(val) => setCalendarFilters(prev => ({ ...prev, childGroup: val }))}
                              variant="compact"
                          />
                      </div>
                  </div>

                  {/* Cụm 3: Chỉ số & Hành động */}
                  <div className="flex flex-none items-center gap-1 pl-1.5 sm:pl-2">
                       <select
                          className="text-[10px] sm:text-[11px] font-black text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-700 border border-rose-100 dark:border-rose-900/30 rounded-xl px-1.5 sm:px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer shadow-sm transition-all uppercase tracking-wider min-h-[32px]"
                          style={{ width: calendarFilters.metric === 'quantity' ? '92px' : calendarFilters.metric === 'revenueQD' ? '122px' : calendarFilters.metric === 'traChamPercent' ? '96px' : '104px' }}
                          value={calendarFilters.metric}
                          onChange={(e) => setCalendarFilters(prev => ({ ...prev, metric: e.target.value }))}
                      >
                          <option value="revenue">Doanh thu</option>
                          <option value="revenueQD">Doanh thu QĐ</option>
                          <option value="quantity">Số lượng</option>
                          <option value="traChamPercent">Trả Chậm</option>
                      </select>

                      <button 
                          onClick={handleAddCalendar}
                          className="w-auto px-2.5 min-h-[32px] flex-shrink-0 flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-90"
                          title="Lưu cấu hình này"
                      >
                          <Icon name="plus" size={4} />
                      </button>
                  </div>
              </div>
          ) : (
              <>
                  <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setTrendState(prev => ({ ...prev, metric: 'thuc' }))}
                      className={`py-1.5 px-3 sm:px-4 text-[10px] md:text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${
                        trendState.metric === 'thuc' 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                      }`}
                    >
                      DT THỰC
                    </button>
                    <button
                      onClick={() => setTrendState(prev => ({ ...prev, metric: 'qd' }))}
                      className={`py-1.5 px-3 sm:px-4 text-[10px] md:text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${
                        trendState.metric === 'qd' 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                      }`}
                    >
                      DTQĐ
                    </button>
                  </div>

                  <div className="inline-flex rounded-lg shadow-sm p-0.5 lg:p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 ml-1">
                    {(['shift', 'daily', 'weekly', 'monthly'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setTrendState(prev => ({ ...prev, view: v }))}
                        className={`py-1.5 px-2 lg:px-3 text-[10px] lg:text-xs font-bold rounded-lg transition-all duration-200 uppercase tracking-wider ${
                          trendState.view === v 
                          ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-300/20' 
                          : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
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
                className={`flex items-center justify-center py-1.5 px-2.5 rounded-lg transition-all ${
                    displayMode === 'chart'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                        : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
                title="Dạng Biểu đồ"
            >
                <Icon name="bar-chart-2" size={4} />
            </button>
            <button
                onClick={() => setDisplayMode('calendar')}
                className={`flex items-center justify-center py-1.5 px-2.5 rounded-lg transition-all ${
                    displayMode === 'calendar'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                        : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
                title="Dạng Bảng Lịch"
            >
                <Icon name="calendar" size={4} />
            </button>
          </div>

          <button 
            onClick={handleExportClick}
            disabled={isExporting}
            className={`p-2 ml-1 rounded-md transition-colors ${
              isExporting 
              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
              : 'text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
            }`}
            title={displayMode === 'calendar' ? "Xuất ảnh hàng loạt toàn bộ Bảng Lịch" : "Xuất ảnh"}
          >
            {isExporting ? <Icon name="loader-2" size={5} className="animate-spin" /> : <Icon name={displayMode === 'calendar' ? 'images' : 'camera'} size={5} />}
          </button>
        </div>
      </SectionHeader>

      <div className={`p-3 lg:p-5 md:p-6 ${displayMode === 'calendar' ? 'pb-3 lg:pb-5' : 'pb-1 lg:pb-2'}`}>
        <div className={`w-full ${displayMode === 'calendar' ? '' : 'h-[220px] lg:h-[320px]'}`}>
           {displayMode === 'calendar' ? (
                <div className="flex flex-col gap-4">
                    {/* Toast notification */}
                    {toastMsg && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 text-sm font-bold shadow-lg animate-fade-in flex items-center gap-2 pointer-events-none">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
                            {toastMsg}
                        </div>
                    )}

                    {/* 2-Column Grid: Draft (left) | Saved Calendar (right) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* LEFT: Draft Calendar */}
                        <div ref={draftCalendarRef} className="border border-slate-200 dark:border-slate-800 overflow-hidden relative z-10 w-full pb-2 bg-slate-50 dark:bg-[#121212] pt-6 calendar-export-target">
                            <div className="absolute top-2 left-3 z-20 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-500 text-[10px] uppercase font-bold rounded shadow-sm border border-amber-200 dark:border-amber-700/50 block hide-on-export">Nháp</div>
                            <div className="absolute top-2 right-3 z-20 flex items-center gap-1 hide-on-export">
                                <button
                                    onClick={handleAddCalendar}
                                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
                                    title="Lưu bảng nháp thành tab mới"
                                >
                                    <Icon name="plus" size={3.5} />
                                </button>
                                <button
                                    onClick={handleExportDraft}
                                    disabled={isExporting}
                                    className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm"
                                    title="Xuất ảnh bảng Nháp"
                                >
                                    <Icon name="camera" size={3.5} />
                                </button>
                            </div>
                            <RevenueCalendar 
                                data={calendarData} 
                                monthDate={new Date(`${calendarFilters.month || new Date().toISOString().substring(0,7)}-01T00:00:00`)} 
                                metricName={calendarFilters.metric === 'quantity' ? 'Số lượng' : (calendarFilters.metric === 'revenueQD' ? 'Doanh thu QĐ' : calendarFilters.metric === 'traChamPercent' ? 'Tỉ trọng Trả chậm' : 'Doanh thu')}
                                title={(Array.isArray(calendarFilters.parentGroup) && calendarFilters.parentGroup.length > 0) || (Array.isArray(calendarFilters.childGroup) && calendarFilters.childGroup.length > 0)
                                    ? ((Array.isArray(calendarFilters.parentGroup) && calendarFilters.parentGroup.length > 0) && (Array.isArray(calendarFilters.childGroup) && calendarFilters.childGroup.length > 0)
                                        ? `${calendarFilters.parentGroup.join(', ')} - ${calendarFilters.childGroup.join(', ')}`
                                        : (Array.isArray(calendarFilters.childGroup) && calendarFilters.childGroup.length > 0)
                                            ? calendarFilters.childGroup.join(', ')
                                            : calendarFilters.parentGroup.join(', '))
                                    : (
                                        calendarFilters.metric === 'revenue' ? `TỔNG DOANH THU THỰC THÁNG ${calendarFilters.month ? calendarFilters.month.split('-')[1] + '/' + calendarFilters.month.split('-')[0] : ''}`
                                        : calendarFilters.metric === 'revenueQD' ? 'DOANH THU QUY ĐỔI'
                                        : calendarFilters.metric === 'traChamPercent' ? 'TỈ TRỌNG TRẢ CHẬM'
                                        : 'TỔNG DOANH THU'
                                    )}
                                subtitle={
                                    (Array.isArray(filterState.kho) && filterState.kho.length > 0 && !filterState.kho.includes('all') ? `KHO: ${filterState.kho.join(', ')} • ` : (!Array.isArray(filterState.kho) && filterState.kho && filterState.kho !== 'all' ? `KHO: ${filterState.kho} • ` : '')) +
                                    (calendarFilters.metric === 'quantity' ? 'Số lượng' : (calendarFilters.metric === 'revenueQD' ? 'Doanh thu QĐ' : calendarFilters.metric === 'traChamPercent' ? 'Tỉ lệ trả chậm' : 'Doanh thu'))
                                }
                                isDraft={true}
                                compact={true}
                            />
                        </div>

                        {/* RIGHT: Tabs + Active Saved Calendar */}
                        {savedCalendars.length > 0 && (
                            <div className="flex flex-col">
                                {/* Tab Bar */}
                                <div className="flex items-center gap-0.5 border-b-2 border-slate-200 dark:border-slate-700 overflow-x-auto">
                                    {savedCalendars.map(cal => {
                                        const isActive = activeCalendarTab === cal.id;
                                        let tabLabel = '';
                                        const pg = Array.isArray(cal.parentGroup) ? cal.parentGroup : [];
                                        const cg = Array.isArray(cal.childGroup) ? cal.childGroup : [];
                                        if (pg.length > 0 || cg.length > 0) {
                                            tabLabel = pg.length > 0 && cg.length > 0
                                                ? `${pg.join(', ')} - ${cg.join(', ')}`
                                                : cg.length > 0 ? cg.join(', ') : pg.join(', ');
                                        } else {
                                            if (cal.metric === 'revenue') tabLabel = 'DOANH THU';
                                            else if (cal.metric === 'revenueQD') tabLabel = 'DOANH THU QĐ';
                                            else if (cal.metric === 'traChamPercent') tabLabel = 'TRẢ CHẬM';
                                            else if (cal.metric === 'quantity') tabLabel = 'SỐ LƯỢNG';
                                            else tabLabel = 'LỊCH';
                                        }
                                        return (
                                            <button
                                                key={cal.id}
                                                onClick={() => setActiveCalendarTab(cal.id)}
                                                className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 border-b-2 -mb-[2px] ${
                                                    isActive
                                                        ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                                                        : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                            >
                                                {tabLabel}
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={handleAddCalendar}
                                        className="px-2 py-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 border-b-2 border-transparent -mb-[2px] transition-colors"
                                        title="Thêm bảng lịch mới từ bộ lọc hiện tại"
                                    >
                                        <Icon name="plus" size={3.5} />
                                    </button>
                                </div>

                                {/* Active Tab Calendar */}
                                <div className="mt-3 flex-1">
                                    {savedCalendars.map(cal => {
                                        if (cal.id !== activeCalendarTab) return null;
                                        const effectiveFilter = { ...cal, month: calendarFilters.month };
                                        return (
                                            <SavedCalendarCard 
                                                key={cal.id} 
                                                filter={effectiveFilter} 
                                                baseFilteredData={baseFilteredData || []} 
                                                productConfig={productConfig} 
                                                onRemove={handleRemoveCalendar} 
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : renderChart()}
        </div>
      </div>
    </div>
  );
});

TrendChart.displayName = 'TrendChart';

export default TrendChart;
