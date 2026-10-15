import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { toast } from '../shared/ui/toast';
import { startExportJob } from '../shared/export';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell, LabelList } from 'recharts';
import { formatCurrency, formatQuantity, calculateRowMetrics, getRowValue, getExportFilenamePrefix, getHinhThucThanhToan, getParentGroup, cleanAndNormalize, getSubgroup, normalizedThuHoSet, getRowPrice } from '../../utils/dataUtils';
import type { DataRow, TrendData, FilterState, ProductConfig, SavedCalendar } from '../../types';
import type { ExportImageOptions } from '../../hooks/useExportLogic';
import { COL } from '../../constants';
import { SectionHeader } from '../shared/ui/SectionHeader';
import { moTaBoLoc } from '../../utils/moTaBoLoc';
import { SectionCard } from '../shared/ui/SectionCard';
import { EmptyState } from '../shared/ui/EmptyState';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { isKhoMatch } from '../../services/filterService';
import { useTrendChartLogic, RechartsTrendData } from '../../hooks/useTrendChartLogic';
import { CHART_ANIMATION_ENABLED } from '../../utils/chartConfig';
import RevenueCalendar, { choAmLichSanSang } from './RevenueCalendar';
import SavedCalendarCard from './SavedCalendarCard';
import { saveCustomCalendars, getCustomCalendars } from '../../services/dbService';
import StringMultiSelect from '../shared/ui/StringMultiSelect';
import { Select } from '../shared/ui/Select';
import { Button } from '../shared/ui/Button';
import { Tabs } from '../shared/ui/Tabs';
import { ActionMenu } from '../shared/ui/ActionMenu';

const CustomTooltip = ({ active, payload, metricName }: { active?: boolean; payload?: { payload: RechartsTrendData }[]; metricName: string }) => {
    if (!active || !payload?.length) return null;
    const data: RechartsTrendData = payload[0].payload;
    const { label, value, changePercent, isDecrease } = data;
    
    let changeHtml = null;
    if (changePercent !== undefined && !isNaN(changePercent)) {
        const changeClass = isDecrease ? 'text-rose-500' : 'text-emerald-500';
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
                <span className="font-bold text-sky-700 dark:text-sky-400">{value.toLocaleString('vi-VN')}</span>
            </div>
            {changeHtml && <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/50 pt-1.5 mt-1.5">{changeHtml}</div>}
        </div>
    );
};

interface TrendChartInnerProps {
  trendData: TrendData | undefined;
  handleExport: (element: HTMLElement | null, filename: string, options?: ExportImageOptions) => Promise<Blob | null | void>;
  isExporting: boolean;
  filterState: FilterState;
  baseFilteredData: DataRow[];
  productConfig: ProductConfig | null;
}

const TrendChartInner: React.FC<TrendChartInnerProps> = React.memo(({
  trendData,
  handleExport,
  isExporting,
  filterState,
  baseFilteredData,
  productConfig
}) => {
  const chartCardRef = useRef<HTMLDivElement>(null);
  const [trendState, setTrendState] = useState<{ view: 'shift' | 'daily' | 'weekly' | 'monthly'; metric: string; _filterOpen?: boolean }>({ view: 'shift', metric: 'thuc', _filterOpen: false });
  const [displayMode, setDisplayMode] = useState<'chart' | 'calendar'>('chart');
  
  // Local Filter States for Calendar
  const [calendarFilters, setCalendarFilters] = useState({
      parentGroup: [] as string[],
      childGroup: [] as string[],
      month: '',
      metric: 'revenue' // 'revenue' | 'revenueQD' | 'quantity' | 'traChamPercent'
  });

  const [savedCalendars, setSavedCalendars] = useState<SavedCalendar[]>([]);
  const [activeCalendarTab, setActiveCalendarTab] = useState<string>('1-thuc');
  // Thông báo nhỏ của Lịch (lưu/xoá lịch tuỳ chỉnh) — dùng toast chung (trước tự vẽ khung xanh lá cố định ở đáy).
  const showToast = (msg: string) => { toast.success(msg); };

  useEffect(() => {
      getCustomCalendars().then(cals => {
          if (cals && cals.length > 0) {
              setSavedCalendars(cals);
              setActiveCalendarTab(cals[0].id);
          } else {
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
      if (activeCalendarTab === id && newList.length > 0) {
          setActiveCalendarTab(newList[0].id);
      }
  };
  
  useEffect(() => {
    if (displayMode === 'calendar' && trendState.view !== 'daily') {
        setTrendState(prev => ({ ...prev, view: 'daily' }));
    }
  }, [displayMode, trendState.view]);

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

  useEffect(() => {
      if (availableMonths.length > 0) {
          const latestMonth = availableMonths[0];
          if (!calendarFilters.month) {
              setCalendarFilters(prev => ({ ...prev, month: latestMonth }));
          }
          setSavedCalendars(prev => {
              const needsUpdate = prev.some(c => !c.month);
              if (!needsUpdate) return prev;
              const updated = prev.map(c => c.month ? c : { ...c, month: latestMonth });
              saveCustomCalendars(updated);
              return updated;
          });
      }
  }, [availableMonths]);

  const { uniqueParentGroups, uniqueChildGroups } = useMemo(() => {
      if (displayMode !== 'calendar') return { uniqueParentGroups: [], uniqueChildGroups: [] };

      const parents = new Set<string>();
      const children = new Set<string>();

      if (baseFilteredData && productConfig) {
          baseFilteredData.forEach((row) => {
              const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG) || '';
              const parentVal = getParentGroup(maNhomHang, productConfig) || 'Không xác định';
              if (parentVal === 'Không tính doanh thu') return;
              const childVal = getSubgroup(maNhomHang, productConfig) || 'Không xác định';
              const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT) || '';
              const isRevenue = productConfig && productConfig.revenueEligibleHTX && productConfig.revenueEligibleHTX.size > 0
                  ? productConfig.revenueEligibleHTX.has(cleanAndNormalize(hinhThucXuat))
                  : !normalizedThuHoSet.has(cleanAndNormalize(hinhThucXuat));
              if (!isRevenue) return;

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
  }, [displayMode, baseFilteredData, productConfig, calendarFilters.parentGroup]);

  const calendarData = useMemo(() => {
      if (displayMode !== 'calendar' || !baseFilteredData || !productConfig || !calendarFilters.month) return [];
      
      const [selYear, selMonth] = calendarFilters.month.split('-');
      const targetYear = parseInt(selYear);
      const targetMonth = parseInt(selMonth) - 1; 

      const dailySums: { [key: string]: { value: number, rawDate: Date, totalRev: number, traGopRev: number } } = {};

      baseFilteredData.forEach((row) => {
          const rowDate = row.parsedDate;
          if (!rowDate || isNaN(rowDate.getTime())) return;
          if (rowDate.getFullYear() !== targetYear || rowDate.getMonth() !== targetMonth) return;

          // Chỉ tính đơn ĐÃ THU TIỀN — đồng nhất với pipeline chuẩn processDataForPeriod
          const thuTien = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_THU_TIEN));
          if (thuTien !== 'đã thu') return;

          const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG) || '';
          const parentGroup = getParentGroup(maNhomHang, productConfig) || 'Không xác định';
          if (parentGroup === 'Không tính doanh thu') return;
          const childGroup = getSubgroup(maNhomHang, productConfig) || 'Không xác định';

          if (calendarFilters.parentGroup.length > 0 && !calendarFilters.parentGroup.includes(parentGroup)) return;
          if (calendarFilters.childGroup.length > 0 && !calendarFilters.childGroup.includes(childGroup)) return;

          const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT) || '';
          const isRevenue = productConfig && productConfig.revenueEligibleHTX && productConfig.revenueEligibleHTX.size > 0
              ? productConfig.revenueEligibleHTX.has(cleanAndNormalize(hinhThucXuat))
              : !normalizedThuHoSet.has(cleanAndNormalize(hinhThucXuat));
          if (!isRevenue) return;

          const price = getRowPrice(row);

          let valueToAdd = 0;
          let totalRevenue = 0;
          let traGopRevenue = 0;

          if (calendarFilters.metric === 'revenue' || calendarFilters.metric === 'traChamPercent') {
              totalRevenue = price;
              const isTraGop = getHinhThucThanhToan(row, productConfig) === 'tra_gop';
              if (isTraGop) {
                  traGopRevenue = price;
              }
              valueToAdd = calendarFilters.metric === 'revenue' ? totalRevenue : 0;
          } else if (calendarFilters.metric === 'revenueQD') {
              valueToAdd = calculateRowMetrics(row, productConfig).revenueQD;
          } else if (calendarFilters.metric === 'quantity') {
              valueToAdd = calculateRowMetrics(row, productConfig).weightedQuantity;
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
  
  // (Đã gỡ observer theo dõi '.dark' — Dark Mode tắt toàn dự án, chart luôn dùng màu Sáng)

  const { totalValue, chartData, hasData, metricName } = useTrendChartLogic({
      trendData,
      view: trendState.view,
      metric: trendState.metric
  });
  
  const draftCalendarRef = useRef<HTMLDivElement>(null);

  /** Ảnh lịch phải có ngày âm: thư viện âm lịch nạp riêng (RevenueCalendar) → chờ nó + 2 khung hình cho lịch vẽ lại. */
  const choLichDuNgayAm = async () => {
      try { await choAmLichSanSang(); } catch { return; }
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  };

  const handleExportDraft = async () => {
      await choLichDuNgayAm();
      if (draftCalendarRef.current) {
          const prefix = getExportFilenamePrefix(filterState.kho);
          const monthLabel = calendarFilters.month ? calendarFilters.month.split('-').reverse().join('-') : 'lich';
          await handleExport(draftCalendarRef.current, `${prefix} - Lịch Doanh Thu Nhập Tháng ${monthLabel}.png`, { captureAsDisplayed: true, elementsToHide: ['.hide-on-export'] });
      }
  };

  const handleExportClick = async () => {
      const prefix = getExportFilenamePrefix(filterState.kho);
      if (displayMode === 'calendar') {
          await choLichDuNgayAm();
          const targets = document.querySelectorAll('.calendar-export-target');
          if (targets.length > 0) {
              const job = targets.length > 1 ? startExportJob({ title: 'Xuất ảnh lịch doanh thu', total: targets.length }) : null;
              for (let i = 0; i < targets.length; i++) {
                  if (job?.cancelled) break;
                  job?.item(i, `Lịch ${i + 1}`);
                  const blob = await handleExport(targets[i] as HTMLElement, `${prefix} - Lịch Doanh Thu (${i + 1}).png`, { captureAsDisplayed: true, elementsToHide: ['.hide-on-export'] });
                  job?.result(`Lịch ${i + 1}`, blob === null ? 'failed' : 'ok');
                  await new Promise(r => setTimeout(r, 1000));
              }
              job?.finish();
          }
      } else {
          handleExport(chartCardRef.current, `${prefix} - Xu Hướng Doanh Thu.png`, { captureAsDisplayed: true });
      }
  };
  // Tự xuất & gửi LINE sau Auto Sync YCX Realtime (khi nút đặt đích "nhóm LINE") — chỉ ở dạng biểu đồ
  
  const textColor = '#64748b';
  const gridColor = '#f1f5f9';
  const dailyBaseColor = '#4f46e5';

  const renderChart = () => {
    if (!hasData || chartData.length === 0) {
        return <div className="flex items-center justify-center h-full"><EmptyState icon={<AppIcon name="trendUp" size="lg" />} title="Không có dữ liệu xu hướng" compact /></div>;
    }

    if (trendState.view === 'daily') {
        return (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
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
                        dot={{ fill: '#ffffff', stroke: dailyBaseColor, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: dailyBaseColor, strokeWidth: 2, fill: dailyBaseColor }}
                        isAnimationActive={CHART_ANIMATION_ENABLED && !isExporting}
                    >
                        <LabelList 
                            dataKey="value" 
                            position="top" 
                            offset={12}
                            fill={textColor} 
                            fontSize={11} 
                            fontWeight="bold"
                            formatter={(val: unknown) => trendState.metric === 'quantity' ? formatQuantity(val as number) : formatCurrency(val as number)}
                        />
                    </Area>
                </AreaChart>
            </ResponsiveContainer>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
            <BarChart data={chartData} margin={{ top: 30, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tickFormatter={(val) => formatCurrency(val)} tick={{ fill: textColor, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} width={60} />
                <RechartsTooltip content={<CustomTooltip metricName={metricName} />} cursor={{ fill: 'transparent' }} />
                <Bar 
                    dataKey="value" 
                    radius={[4, 4, 0, 0]} 
                    isAnimationActive={CHART_ANIMATION_ENABLED && !isExporting}
                >
                    <LabelList 
                        dataKey="value" 
                        position="top" 
                        offset={8}
                        fill={textColor} 
                        fontSize={11} 
                        fontWeight="bold"
                        formatter={(val: unknown) => trendState.metric === 'quantity' ? formatQuantity(val as number) : formatCurrency(val as number)}
                    />
                    {chartData.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={
                                entry.fill
                                    ? entry.fill
                                    // rose-400 / emerald-400 — khớp palette semantic đã duyệt (trước đây dùng hex
                                    // ngoài palette #FC8181/#68D391, thực ra là red.400/green.400 của Chakra UI).
                                    : entry.isDecrease
                                        ? '#fb7185'
                                        : '#34d399'
                            }
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
  };

  // Kho đang lọc (bộ lọc có thể là mảng hoặc chuỗi cũ) — dùng cho dòng phụ tiêu đề.
  const khoDangLoc: string[] = Array.isArray(filterState.kho) ? filterState.kho : (filterState.kho ? [filterState.kho as unknown as string] : []);
  const NHAN_KY: Record<typeof trendState.view, string> = { shift: 'Ca', daily: 'Ngày', weekly: 'Tuần', monthly: 'Tháng' };

  return (
    <SectionCard
      ref={chartCardRef}
      className="mb-3 lg:mb-8 relative z-0 lg:rounded-none"
    >
      {/* GĐ5 (lỗi #13, #28): tiêu đề viết như câu (bỏ IN HOA ép), dòng phụ 12px (trước 8px — dưới sàn 11px); bộ lọc của chế độ Lịch
          xuống hàng riêng trong thân thẻ (4 ô 70px chen trên tiêu đề từng đẩy nút xuất ảnh rớt dòng ở iPhone). */}
      <SectionHeader
        title="XU HƯỚNG DOANH THU"
        titleClassName="type-headline font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide truncate leading-tight"
        subtitle={(
            <span className="flex items-center gap-x-1.5 gap-y-1 flex-wrap">
                {displayMode !== 'calendar' && (
                    <>
                        <span className="inline-flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-slate-800/90 hide-on-export" role="group" aria-label="Chỉ số biểu đồ">
                            {([['thuc', 'DT thực', 'Xem biểu đồ theo doanh thu thực'], ['qd', 'DTQĐ', 'Xem biểu đồ theo doanh thu quy đổi']] as const).map(([v, nhan, goiY]) => (
                                <Button
                                    key={v}
                                    variant="unstyled" size="none"
                                    onClick={() => setTrendState(prev => ({ ...prev, metric: v }))}
                                    aria-pressed={trendState.metric === v}
                                    title={goiY}
                                    className={`ycx-hit px-2 py-0.5 rounded-full text-[11px] leading-4 transition-colors ${
                                        trendState.metric === v
                                            ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs font-semibold'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 font-medium'
                                    }`}
                                >
                                    {nhan}
                                </Button>
                            ))}
                        </span>
                        {totalValue > 0 && (
                            <span>Tổng <span className="text-slate-800 dark:text-slate-200 font-semibold tabular-nums">{formatCurrency(totalValue)}</span></span>
                        )}
                        <span aria-hidden="true" className="text-slate-300">·</span>
                    </>
                )}
                <span className="truncate">{moTaBoLoc({ ...filterState, kho: khoDangLoc })}</span>
            </span>
        )}
      >
        <div className="flex flex-wrap items-center gap-2 hide-on-export">
          {displayMode !== 'calendar' && (
              <>
                  {/* Chu kỳ biểu đồ — iPhone: nút có chữ mở action sheet; laptop: segmented control. */}
                  <div className="lg:hidden">
                      <ActionMenu
                          label="Chọn chu kỳ biểu đồ"
                          title="Chu kỳ biểu đồ"
                          items={(['shift', 'daily', 'weekly', 'monthly'] as const).map(v => ({
                              id: v,
                              label: `Theo ${NHAN_KY[v].toLowerCase()}`,
                              icon: trendState.view === v ? 'check' as const : 'clock' as const,
                              onSelect: () => setTrendState(prev => ({ ...prev, view: v, _filterOpen: false })),
                          }))}
                          renderTrigger={(props) => (
                              <Button
                                  {...props}
                                  variant="unstyled" size="none"
                                  title="Chọn khoảng thời gian"
                                  className="ycx-hit h-8 px-2.5 rounded-full bg-slate-100 text-slate-700 text-[13px] font-medium flex items-center gap-1 active:bg-slate-200"
                              >
                                  <AppIcon name="clock" size="sm" className="text-slate-500" />
                                  {NHAN_KY[trendState.view]}
                                  <AppIcon name="chevronDown" size="xs" className="text-slate-400" />
                              </Button>
                          )}
                      />
                  </div>
                  <div className="hidden lg:block">
                      <Tabs
                          variant="segment"
                          size="sm"
                          activeId={trendState.view}
                          onChange={(id) => setTrendState(prev => ({ ...prev, view: id as typeof prev.view }))}
                          items={(['shift', 'daily', 'weekly', 'monthly'] as const).map(v => ({ id: v, label: NHAN_KY[v] }))}
                      />
                  </div>
              </>
          )}

          <Button
              variant="unstyled" size="none"
              onClick={() => setDisplayMode(prev => prev === 'chart' ? 'calendar' : 'chart')}
              className={`ycx-hit flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-lg transition-colors ${
                  displayMode === 'calendar'
                      ? 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 font-bold'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={displayMode === 'chart' ? 'Chuyển sang dạng Bảng Lịch' : 'Chuyển sang dạng Biểu đồ'}
          >
              <AppIcon name={displayMode === 'chart' ? 'calendar' : 'chartBar'} size="md" />
          </Button>

          <Button
            variant="unstyled" size="none"
            onClick={handleExportClick}
            disabled={isExporting}
            className={`ycx-hit flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-lg transition-colors ${
              isExporting
              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={displayMode === 'calendar' ? "Xuất ảnh hàng loạt toàn bộ Bảng Lịch" : "Xuất ảnh"}
          >
            {isExporting ? <AppIcon name="loading" size="md" spin className="lg:hidden" /> : <AppIcon name={displayMode === 'calendar' ? 'exportBatch' : 'exportImage'} size="md" className="lg:hidden" />}
            {isExporting ? <AppIcon name="loading" size="md" spin className="hidden lg:block" /> : <AppIcon name={displayMode === 'calendar' ? 'exportBatch' : 'exportImage'} size="md" className="hidden lg:block" />}
          </Button>
        </div>
      </SectionHeader>

      <div className={`p-3 lg:p-5 md:p-6 ${displayMode === 'calendar' ? 'pb-3 lg:pb-5' : 'pb-1 lg:pb-2'}`}>
        <div className={`w-full ${displayMode === 'calendar' ? '' : 'h-[220px] lg:h-[320px]'}`}>
           {displayMode === 'calendar' ? (
                <div className="flex flex-col gap-4">
                    {/* Bộ lọc lịch (lỗi #28): hàng riêng, 2 cột trên iPhone, ô cao 44px trên màn cảm ứng; laptop xếp một hàng. */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 hide-on-export [&>*]:min-w-0 pointer-coarse:[&_button]:min-h-11">
                        <Select
                            aria-label="Tháng"
                            fullWidth={false}
                            className="w-full sm:w-[110px] text-[15px] sm:text-xs font-semibold text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700"
                            value={calendarFilters.month}
                            onChange={(e) => setCalendarFilters(prev => ({ ...prev, month: e.target.value }))}
                        >
                            {availableMonths.map(m => <option key={m} value={m}>Tháng {m.split('-')[1]}/{m.split('-')[0]}</option>)}
                        </Select>
                        <Select
                            aria-label="Chỉ số"
                            fullWidth={false}
                            className="w-full sm:w-[130px] text-[15px] sm:text-xs font-semibold text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700"
                            value={calendarFilters.metric}
                            onChange={(e) => setCalendarFilters(prev => ({ ...prev, metric: e.target.value }))}
                        >
                            <option value="revenue">Doanh thu</option>
                            <option value="revenueQD">DT quy đổi</option>
                            <option value="quantity">Số lượng</option>
                            <option value="traChamPercent">Trả chậm</option>
                        </Select>
                        <div className="sm:w-[140px]">
                            <StringMultiSelect
                                label="Ngành"
                                options={uniqueParentGroups}
                                selected={calendarFilters.parentGroup}
                                onChange={(val) => setCalendarFilters(prev => ({ ...prev, parentGroup: val, childGroup: [] }))}
                                variant="compact"
                            />
                        </div>
                        <div className="sm:w-[140px]">
                            <StringMultiSelect
                                label="Nhóm"
                                options={uniqueChildGroups}
                                selected={calendarFilters.childGroup}
                                onChange={(val) => setCalendarFilters(prev => ({ ...prev, childGroup: val }))}
                                variant="compact"
                            />
                        </div>
                    </div>
                    {savedCalendars.length > 0 && (
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar hide-on-export">
                            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 sm:p-1 rounded-lg sm:rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 shrink-0">
                                {savedCalendars.map((cal) => {
                                    const pg = Array.isArray(cal.parentGroup) ? cal.parentGroup : [];
                                    const cg = Array.isArray(cal.childGroup) ? cal.childGroup : [];
                                    let tabLabel = '';
                                    if (pg.length > 0 || cg.length > 0) {
                                        tabLabel = pg.length > 0 && cg.length > 0
                                            ? `${pg.join(', ')} - ${cg.join(', ')}`
                                            : cg.length > 0 ? cg.join(', ') : pg.join(', ');
                                    } else {
                                        if (cal.metric === 'revenue') tabLabel = 'DOANH THU';
                                        else if (cal.metric === 'revenueQD') tabLabel = 'DT QĐ';
                                        else if (cal.metric === 'traChamPercent') tabLabel = 'TRẢ CHẬM';
                                        else if (cal.metric === 'quantity') tabLabel = 'SỐ LƯỢNG';
                                        else tabLabel = 'LỊCH';
                                    }
                                    const isActive = activeCalendarTab === cal.id;
                                    return (
                                        <Button
                                            variant="unstyled" size="none"
                                            key={cal.id}
                                            onClick={() => setActiveCalendarTab(cal.id)}
                                            className={`px-2 sm:px-3.5 py-1 sm:py-1.5 text-[11px] sm:text-[11px] uppercase tracking-wider font-bold whitespace-nowrap rounded-md sm:rounded-lg transition-all ${
                                                isActive
                                                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-400 shadow-sm border border-sky-200 dark:border-sky-700'
                                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 border border-transparent'
                                            }`}
                                            title={tabLabel}
                                        >
                                            {tabLabel}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div ref={draftCalendarRef} className="border border-slate-200 dark:border-slate-800 overflow-hidden relative z-10 w-full pb-2 bg-slate-50 dark:bg-[#121212] calendar-export-target">
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
                                        calendarFilters.metric === 'revenue' ? `DOANH THU THỰC ${calendarFilters.month ? calendarFilters.month.split('-')[1] + '/' + calendarFilters.month.split('-')[0] : ''}`
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
                                actionButtons={
                                    <>
                                        <Button
                                            variant="unstyled" size="none"
                                            onClick={handleAddCalendar}
                                            className="ycx-hit w-8 h-8 shrink-0 flex items-center justify-center rounded-control bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-colors"
                                            title="Lưu bảng nháp thành bảng mới"
                                            aria-label="Lưu bảng nháp thành bảng mới"
                                        >
                                            <AppIcon name="add" size="md" />
                                        </Button>
                                        <Button
                                            variant="unstyled" size="none"
                                            onClick={handleExportDraft}
                                            disabled={isExporting}
                                            className="ycx-hit w-8 h-8 shrink-0 flex items-center justify-center rounded-control bg-white border border-slate-200 text-slate-500 hover:text-sky-700 transition-colors shadow-sm"
                                            title="Xuất ảnh"
                                            aria-label="Xuất ảnh bảng nháp"
                                        >
                                            <AppIcon name="exportImage" size="md" />
                                        </Button>
                                    </>
                                }
                            />
                        </div>

                        {savedCalendars.filter(cal => cal.id === activeCalendarTab).map(cal => {
                            const pg = Array.isArray(cal.parentGroup) ? cal.parentGroup : [];
                            const cg = Array.isArray(cal.childGroup) ? cal.childGroup : [];
                            let badgeLabel = '';
                            if (pg.length > 0 || cg.length > 0) {
                                badgeLabel = pg.length > 0 && cg.length > 0
                                    ? `${pg.join(', ')} - ${cg.join(', ')}`
                                    : cg.length > 0 ? cg.join(', ') : pg.join(', ');
                            } else {
                                if (cal.metric === 'revenue') badgeLabel = 'DOANH THU';
                                else if (cal.metric === 'revenueQD') badgeLabel = 'DT QUY ĐỔI';
                                else if (cal.metric === 'traChamPercent') badgeLabel = 'TRẢ CHẬM';
                                else if (cal.metric === 'quantity') badgeLabel = 'SỐ LƯỢNG';
                                else badgeLabel = 'LỊCH';
                            }
                            const effectiveFilter = { ...cal, month: calendarFilters.month };
                            return (
                                <SavedCalendarCard 
                                    key={cal.id} 
                                    filter={effectiveFilter} 
                                    baseFilteredData={baseFilteredData || []} 
                                    productConfig={productConfig} 
                                    onRemove={handleRemoveCalendar}
                                    badgeLabel={badgeLabel}
                                />
                            );
                        })}
                    </div>
                </div>
            ) : renderChart()}
        </div>
      </div>
    </SectionCard>
  );
});
TrendChartInner.displayName = 'TrendChartInner';

const TrendChart: React.FC = React.memo(() => {
  const { processedData, handleExport, isExporting, filterState, baseFilteredData, productConfig } = useDashboardContext();
  return (
    <TrendChartInner
      trendData={processedData?.trendData}
      handleExport={handleExport}
      isExporting={isExporting}
      filterState={filterState}
      baseFilteredData={baseFilteredData}
      productConfig={productConfig}
    />
  );
});

TrendChart.displayName = 'TrendChart';

export default React.memo(TrendChart);
