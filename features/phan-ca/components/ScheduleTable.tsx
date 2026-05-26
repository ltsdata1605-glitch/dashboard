import React, { useMemo } from 'react';
import { StaffMember, ScheduleConfig, ScheduleTargets } from '../types';
import { 
    calculateTotalHours, calculateSpecialHours, calculateNormalHours,
    recalculateStatsForWeek, calculateTotalHoursForWeek, calculateSpecialHoursForWeek, calculateNormalHoursForWeek,
    calculateGhHours, calculateKhoHours, calculateTnHours
} from '../utils/scheduleUtils';
import { abbreviateVietnameseName } from '../utils/stringUtils';

interface ScheduleTableProps {
  staffList: StaffMember[];
  config: ScheduleConfig;
  targets: ScheduleTargets;
  tableRef: React.RefObject<HTMLTableElement>;
  onDeleteEmployee: (id: string) => void;
  onEditShift: (employeeId: string, dayIndex: number) => void;
  onDayHover: (day: number | null) => void;
  hoveredDay: number | null;
  weekRange?: { start: number; end: number } | null;
  highlightId?: string | null;
  onSwapShift: (employeeId1: string, employeeId2: string, dayIndex: number) => void;
  includeTnInSbh?: boolean;
}

const StatCell: React.FC<{ value: number; target: number; className?: string }> = ({ value, target, className = '' }) => {
    // Safety check for target. Targets might be NaN or 0 during initialization.
    const safeTarget = isNaN(target) ? 0 : target;
    const isOk = safeTarget === 0 || Math.abs(value - safeTarget) <= 2;
    const displayValue = value === 0 ? '-' : value;
    
    return (
        <td className={`col-stat ${isOk ? '' : 'stat-warn'} ${className} text-sm font-bold`}>
            {displayValue}
        </td>
    );
};

const ScheduleTable: React.FC<ScheduleTableProps> = ({ 
    staffList, config, targets, tableRef, 
    onDeleteEmployee, onEditShift, onDayHover, hoveredDay, 
    weekRange, highlightId, onSwapShift, includeTnInSbh = true
}) => {
  const { year, month, startDay, duration } = config;

  const [dragSource, setDragSource] = React.useState<{employeeId: string, dayIndex: number} | null>(null);
  const [dragTarget, setDragTarget] = React.useState<{employeeId: string, dayIndex: number} | null>(null);

  const handleDragStart = (e: React.DragEvent, employeeId: string, dayIndex: number) => {
      setDragSource({ employeeId, dayIndex });
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, employeeId: string, dayIndex: number) => {
      e.preventDefault();
      if (dragSource && dragSource.dayIndex === dayIndex && dragSource.employeeId !== employeeId) {
           setDragTarget({ employeeId, dayIndex });
           e.dataTransfer.dropEffect = 'move';
      } else {
           setDragTarget(null);
           e.dataTransfer.dropEffect = 'none';
      }
  };

  const handleDrop = (e: React.DragEvent, targetEmployeeId: string, targetDayIndex: number) => {
      e.preventDefault();
      if (dragSource && dragSource.dayIndex === targetDayIndex && dragSource.employeeId !== targetEmployeeId) {
          onSwapShift(dragSource.employeeId, targetEmployeeId, targetDayIndex);
      }
      setDragSource(null);
      setDragTarget(null);
  };

  const handleDragEnd = () => {
      setDragSource(null);
      setDragTarget(null);
  };

  // Cờ kiểm tra nếu đang xuất từng nhân viên (chỉ có 1 NV trong danh sách)
  const isIndividualExport = staffList.length === 1;

  const weekThemes = [
    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
  ];

  const dayToWeekMap = useMemo(() => {
    const map: { [dayIndex: number]: number } = {};
    let dayCursor = 1;
    let weekNumber = 1;
    while (dayCursor <= duration) {
        const date = new Date(year, month - 1, startDay + dayCursor - 1);
        const dayOfWeek = (date.getDay() + 6) % 7; // 0=Mon
        const daysRemainingInWeek = 7 - dayOfWeek;
        const daysInThisWeek = Math.min(daysRemainingInWeek, duration - dayCursor + 1);
        for(let i=0; i < daysInThisWeek; i++) map[dayCursor + i] = weekNumber;
        dayCursor += daysInThisWeek;
        weekNumber++;
    }
    return map;
  }, [year, month, startDay, duration]);

  const formatDisplayName = (fullName: string): string => {
    const parts = fullName.split(' - ');
    return parts.length < 2 ? fullName : `${parts[0]} - ${abbreviateVietnameseName(parts.slice(1).join(' - '))}`;
  };

  const renderBody = () => {
    const rows: React.ReactNode[] = [];
    let lastDepartment: string | null = null;
    
    // Fallback targets if they aren't provided yet
    const safeTargets = targets || { gh: 0, kho: 0, tn: 0 };

    staffList.forEach((staff, index) => {
        // Chỉ hiện tiêu đề bộ phận nếu không phải là xuất cá nhân
        if (!isIndividualExport && staff.department !== lastDepartment) {
            rows.push(
                <tr key={`dept-${staff.department}`} className="bg-slate-50">
                    <td colSpan={isIndividualExport ? 8 + duration : 10 + duration} className="p-3 text-left font-black text-slate-400 border-y border-slate-200 uppercase tracking-[0.15em] text-xs sticky left-0 z-10">
                        🏢 {staff.department}
                    </td>
                </tr>
            );
            lastDepartment = staff.department;
        }

        const isWeekly = !!weekRange;
        const specialHours = isWeekly ? calculateSpecialHoursForWeek(staff, weekRange!.start, weekRange!.end, includeTnInSbh) : calculateSpecialHours(staff, includeTnInSbh);
        const normalHours = isWeekly ? calculateNormalHoursForWeek(staff, weekRange!.start, weekRange!.end) : calculateNormalHours(staff);
        const totalHours = isWeekly ? calculateTotalHoursForWeek(staff, weekRange!.start, weekRange!.end) : calculateTotalHours(staff);
        const stats = isWeekly ? recalculateStatsForWeek(staff, weekRange!.start, weekRange!.end) : staff.stats;

        const isRowHighlighted = highlightId === staff.id;

        rows.push(
            <tr key={staff.id} className={`${isRowHighlighted ? 'row-export-highlight' : ''} group ${isIndividualExport ? 'h-24' : ''} border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors`}>
                {!isIndividualExport && (
                    <>
                        <td className="sticky-col text-center border-r border-slate-200 text-[11px] sm:text-[13px] font-extrabold bg-white group-hover:bg-slate-50 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)] text-slate-500" style={{ left: 0, width: '40px', minWidth: '40px' }}>
                            {index + 1}
                        </td>
                        <td className="sticky-col text-left px-1.5 sm:px-4 py-1.5 sm:py-3 border-r border-slate-200 bg-white group-hover:bg-slate-50 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)]" style={{ left: '40px' }}>
                            <div className="flex justify-between items-center">
                                <span className="font-extrabold text-[11px] sm:text-[13px] text-slate-900 underline decoration-dotted decoration-slate-400 underline-offset-4 cursor-pointer leading-tight">
                                    <span style={{ color: staff.gender === 'Nu' ? '#db2777' : '#2563eb' }}>{staff.id}</span>
                                    <span className="text-slate-900 mx-1">-</span>
                                    <span className="text-slate-900">{abbreviateVietnameseName(staff.name.split(' - ').slice(1).join(' - '))}</span>
                                </span>
                                <button onClick={() => onDeleteEmployee(staff.id)} className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-600 transition-all export-hidden">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </td>
                    </>
                )}
                {/* GIỜ CÔNG */}
                <td className={`col-total border-r border-slate-200 text-sm font-bold text-center ${
                    targets.targetSpecialHours && Math.abs(specialHours - targets.targetSpecialHours) > 0.1 ? 'text-rose-600 bg-rose-50' : 'text-slate-500'
                }`} title={`Mục tiêu: ${Math.round(targets.targetSpecialHours || 0)}h`}>
                    {Math.round(specialHours)}
                </td>
                <td className="col-total border-r border-slate-200 text-sm font-bold text-center text-slate-400">{Math.round(normalHours)}</td>
                <td className="col-total col-total-final border-r-2 border-slate-300 text-sm font-black text-center">{Math.round(totalHours)}</td>
                
                {/* SỐ NGÀY SBH */}
                <StatCell value={stats.gh} target={staff.gender === 'Nam' ? safeTargets.gh : 0} className="border-r border-slate-100" />
                <StatCell value={stats.kho} target={safeTargets.kho} className="border-r border-slate-100" />
                <StatCell value={stats.tn} target={safeTargets.tn} className="border-r-2 border-slate-200" />
                
                {/* SỐ LẦN */}
                <td className={`col-stat border-r border-slate-200 text-sm font-bold text-center ${stats.swapCount > 8 ? 'stat-warn' : 'text-slate-400'}`}>{stats.swapCount || '-'}</td>
                <td className={`col-stat border-r-2 border-slate-300 text-sm font-bold text-center ${stats.offDays > 4 ? 'stat-warn' : 'text-slate-400'}`}>{stats.offDays || '-'}</td>
                
                {/* LỊCH LÀM VIỆC */}
                {staff.schedule.slice(1).map((info, dIndex) => {
                    const dayIndex = dIndex + 1;
                    const dayDate = new Date(year, month - 1, startDay + dayIndex - 1);
                    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                    const weekendClass = isWeekend ? 'bg-slate-100/60' : 'bg-transparent';
                    
                    if (!info) return <td key={dayIndex} className={`editable-cell border-r border-slate-200 text-sm ${weekendClass}`} onClick={() => onEditShift(staff.id, dayIndex)}></td>;
                    
                    let className = `cell-normal ${weekendClass}`;
                    let rolePill = null;
                    
                    if (info.role.includes("(GH)")) {
                        className = "cell-gh";
                        rolePill = <div className="role-pill pill-gh">GH</div>;
                    } else if (info.role.includes("(Kho)")) {
                        className = "cell-kho";
                        rolePill = <div className="role-pill pill-kho">KH</div>;
                    } else if (info.role.includes("(TN)")) {
                        className = "cell-tn";
                        rolePill = <div className="role-pill pill-tn">TN</div>;
                    } else if (info.role === "OFF") {
                        className = "cell-off";
                    }

                    const manualClass = info.isManual ? `cell-manual cell-${info.manualChangeInfo?.type || 'direct-edit'}` : '';
                    const hoverClass = dayIndex === hoveredDay ? 'brightness-95 scale-[0.98]' : '';
                    const warningClass = info.needsManualIntervention ? 'cell-needs-intervention' : '';
                    
                    const isDragging = dragSource?.employeeId === staff.id && dragSource?.dayIndex === dayIndex;
                    const isDragOver = dragTarget?.employeeId === staff.id && dragTarget?.dayIndex === dayIndex;
                    const dragClass = isDragging ? 'opacity-50 scale-90 ring-2 ring-indigo-400 z-50' : isDragOver ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-105 z-50 shadow-lg' : '';

                    return (
                        <td key={dayIndex} className={`editable-cell ${className} ${manualClass} ${hoverClass} ${warningClass} ${dragClass} font-black transition-all duration-200`} 
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, staff.id, dayIndex)}
                            onDragOver={(e) => handleDragOver(e, staff.id, dayIndex)}
                            onDrop={(e) => handleDrop(e, staff.id, dayIndex)}
                            onDragEnd={handleDragEnd}
                            onMouseEnter={() => onDayHover(dayIndex)} onClick={() => onEditShift(staff.id, dayIndex)}>
                            <div className="flex flex-col items-center justify-center pointer-events-none">
                                <span className="leading-tight">{info.role === "OFF" ? "OFF" : info.shift}</span>
                                {rolePill}
                            </div>
                        </td>
                    );
                })}
            </tr>
        );
    });

    // SUMMARY ROW (AVERAGES)
    if (staffList.length > 0 && !isIndividualExport) {
        const totalSpecial = staffList.reduce((acc, s) => acc + calculateSpecialHours(s, includeTnInSbh), 0);
        const totalNormal = staffList.reduce((acc, s) => acc + calculateNormalHours(s), 0);
        const totalAll = staffList.reduce((acc, s) => acc + calculateTotalHours(s), 0);
        
        const totalGhHours = staffList.reduce((acc, s) => acc + calculateGhHours(s), 0);
        const totalKhoHours = staffList.reduce((acc, s) => acc + calculateKhoHours(s), 0);
        const totalTnHours = staffList.reduce((acc, s) => acc + calculateTnHours(s), 0);
        
        const count = staffList.length;
        const avgSpecial = totalSpecial / count;
        const avgNormal = totalNormal / count;
        const avgTotal = totalAll / count;
        
        const avgGh = totalGhHours / count;
        const avgKho = totalKhoHours / count;
        const avgTn = totalTnHours / count;

        rows.push(
            <tr key="summary-row" className="bg-slate-100/80 font-black border-t-2 border-slate-300">
                <td colSpan={2} className="sticky-col text-right px-4 py-3 border-r border-slate-300 text-xs uppercase tracking-widest text-slate-500 bg-slate-100">
                    GIỜ CÔNG TRUNG BÌNH
                </td>
                <td className="col-total border-r border-slate-200 text-sm text-indigo-700">
                    {Math.round(avgSpecial)}
                    {targets.targetSpecialHours && (
                        <div className="text-[10px] font-bold opacity-50">Target: {Math.round(targets.targetSpecialHours)}</div>
                    )}
                </td>
                <td className="col-total border-r border-slate-200 text-sm text-slate-500">{Math.round(avgNormal)}</td>
                <td className="col-total col-total-final border-r-2 border-slate-300 text-sm text-slate-900">{Math.round(avgTotal)}</td>
                
                <td className="col-stat border-r border-slate-200 text-sm text-purple-700" title="TB Giờ GH">{Math.round(avgGh)}h</td>
                <td className="col-stat border-r border-slate-200 text-sm text-purple-700" title="TB Giờ KH">{Math.round(avgKho)}h</td>
                <td className="col-stat border-r-2 border-slate-300 text-sm text-purple-700" title="TB Giờ TN">{Math.round(avgTn)}h</td>
                
                <td colSpan={2} className="border-r-2 border-slate-300 bg-slate-50"></td>
                <td colSpan={duration} className="bg-slate-50"></td>
            </tr>
        );
    }

    return rows;
  };

  const weekHeaders = useMemo(() => {
    const headers = [];
    let day = 1;
    while (day <= duration) {
        const date = new Date(year, month - 1, startDay + day - 1);
        const dow = (date.getDay() + 6) % 7;
        const len = Math.min(7 - dow, duration - day + 1);
        const weekNum = dayToWeekMap[day];
        const theme = weekThemes[(weekNum - 1) % weekThemes.length];
        headers.push(<th key={day} colSpan={len} className={`px-2 py-3 border-b border-r border-slate-200 text-center align-middle text-[11px] sm:text-[12px] font-bold uppercase tracking-wider ${theme.bg} ${theme.text}`}>TUẦN {weekNum}</th>);
        day += len;
    }
    return headers;
  }, [duration, year, month, startDay, dayToWeekMap]);

  return (
    <div className={`overflow-x-auto custom-scroll p-1.5 sm:p-2 lg:p-6 touch-auto -webkit-overflow-scrolling-touch relative bg-white border-t border-slate-200 ${isIndividualExport ? 'flex justify-center' : ''}`} onMouseLeave={() => onDayHover(null)}>
      <table id="scheduleTable" ref={tableRef} className="w-full min-w-max text-[11px] sm:text-[13px] text-center border-collapse border border-slate-200 whitespace-nowrap">
        <thead>
          <tr className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider">
            {!isIndividualExport && (
                <>
                    <th rowSpan={2} className="px-1.5 sm:px-4 py-1.5 sm:py-3 text-center text-[11px] sm:text-[13px] font-bold text-rose-700 bg-rose-50 border-b-[3px] !border-b-slate-300 border-r border-slate-200 select-none align-middle sticky left-0 z-20 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)]" style={{ width: '40px', minWidth: '40px' }}>STT</th>
                    <th rowSpan={2} className="px-1.5 sm:px-4 py-1.5 sm:py-3 text-center text-[11px] sm:text-[13px] font-bold text-rose-700 bg-rose-50 border-b-[3px] !border-b-slate-300 border-r border-slate-200 select-none align-middle sticky left-[40px] z-20 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)]">MÃ NV - HỌ TÊN</th>
                </>
            )}
            <th colSpan={3} className="px-2 py-2 border-b border-r border-slate-200 text-center align-middle text-[11px] sm:text-[12px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">GIỜ CÔNG</th>
            <th colSpan={3} className="px-2 py-2 border-b border-r border-slate-200 text-center align-middle text-[11px] sm:text-[12px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700">SỐ NGÀY SBH</th>
            <th colSpan={2} className="px-2 py-2 border-b border-r border-slate-200 text-center align-middle text-[11px] sm:text-[12px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700">SỐ LẦN</th>
            {weekHeaders}
          </tr>
          <tr>
            <th className="px-1 sm:px-2 py-2 border-b-[3px] !border-b-slate-300 border-r border-slate-200 uppercase tracking-wider text-[10px] sm:text-[11px] font-bold text-center align-middle bg-emerald-50 text-emerald-700">SBH</th>
            <th className="px-1 sm:px-2 py-2 border-b-[3px] !border-b-slate-300 border-r border-slate-200 uppercase tracking-wider text-[10px] sm:text-[11px] font-bold text-center align-middle bg-emerald-50 text-emerald-700">TV</th>
            <th className="px-1 sm:px-2 py-2 border-b-[3px] !border-b-slate-300 border-r border-slate-200 uppercase tracking-wider text-[10px] sm:text-[11px] font-bold text-center align-middle bg-emerald-50 text-emerald-700">TỔNG</th>
            <th className="px-1 sm:px-2 py-2 border-b-[3px] !border-b-slate-300 border-r border-slate-200 uppercase tracking-wider text-[10px] sm:text-[11px] font-bold text-center align-middle bg-sky-50 text-sky-700">GH</th>
            <th className="px-1 sm:px-2 py-2 border-b-[3px] !border-b-slate-300 border-r border-slate-200 uppercase tracking-wider text-[10px] sm:text-[11px] font-bold text-center align-middle bg-sky-50 text-sky-700">KH</th>
            <th className="px-1 sm:px-2 py-2 border-b-[3px] !border-b-slate-300 border-r border-slate-200 uppercase tracking-wider text-[10px] sm:text-[11px] font-bold text-center align-middle bg-sky-50 text-sky-700">TN</th>
            <th className="px-1 sm:px-2 py-2 border-b-[3px] !border-b-slate-300 border-r border-slate-200 uppercase tracking-wider text-[10px] sm:text-[11px] font-bold text-center align-middle bg-amber-50 text-amber-700">ĐỔI</th>
            <th className="px-1 sm:px-2 py-2 border-b-[3px] !border-b-slate-300 border-r border-slate-200 uppercase tracking-wider text-[10px] sm:text-[11px] font-bold text-center align-middle bg-amber-50 text-amber-700">OFF</th>
            {Array.from({ length: duration }).map((_, i) => {
                const date = new Date(year, month - 1, startDay + i);
                const isSun = date.getDay() === 0;
                
                const day = startDay + i;
                const weekNum = dayToWeekMap[day] || 1;
                const theme = weekThemes[(weekNum - 1) % weekThemes.length];
                
                return (
                    <th key={i} className={`px-1 sm:px-2 py-1.5 border-b-[3px] !border-b-slate-300 border-r border-slate-200 uppercase tracking-wider text-[10px] sm:text-[11px] font-bold text-center align-middle ${theme.bg} ${theme.text}`}>
                        <div className="font-extrabold text-[13px] sm:text-[14px]">{date.getDate()}</div>
                        <div className="opacity-90 tracking-widest">{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()]}</div>
                    </th>
                );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
            {renderBody()}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleTable;