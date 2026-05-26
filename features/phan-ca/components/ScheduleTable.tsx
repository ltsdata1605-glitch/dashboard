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
    { bg: '#f1f5f9', text: '#1e293b', border: '#e2e8f0' }, // Slate-800
    { bg: '#eff6ff', text: '#1e3a8a', border: '#dbeafe' }, // Blue-900
    { bg: '#f0fdf4', text: '#14532d', border: '#dcfce7' }, // Green-900
    { bg: '#fffbeb', text: '#78350f', border: '#fef3c7' }, // Amber-900
    { bg: '#faf5ff', text: '#581c87', border: '#f3e8ff' }, // Purple-900
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
            <tr key={staff.id} className={`${isRowHighlighted ? 'row-export-highlight' : ''} group ${isIndividualExport ? 'h-24' : ''} border-b border-slate-200 even:bg-slate-50/50 hover:bg-slate-100/50 transition-colors`}>
                {!isIndividualExport && (
                    <>
                        <td className="sticky-col text-center border-r border-slate-200 text-xs font-bold bg-white text-slate-400" style={{ left: 0, width: '40px', minWidth: '40px' }}>
                            {index + 1}
                        </td>
                        <td className="sticky-col text-left px-4 border-r border-slate-200 text-sm font-semibold bg-white" style={{ left: '40px' }}>
                            <div className="flex justify-between items-center">
                                <span style={{ color: staff.gender === 'Nu' ? '#db2777' : '#2563eb' }}>
                                    {formatDisplayName(staff.name)}
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
                            <div className="flex flex-col items-center justify-center min-h-[48px] pointer-events-none">
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
        headers.push(<th key={day} colSpan={len} style={{ backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }} className="border-b border-r text-sm py-2 font-black uppercase tracking-widest">Tuần {weekNum}</th>);
        day += len;
    }
    return headers;
  }, [duration, year, month, startDay, dayToWeekMap]);

  return (
    <div className={`overflow-x-auto custom-scroll rounded-none bg-white border border-slate-200 shadow-xl ${isIndividualExport ? 'flex justify-center' : ''}`} onMouseLeave={() => onDayHover(null)}>
      <table id="scheduleTable" ref={tableRef} className="w-full border-collapse">
        <thead className="bg-slate-50">
          <tr>
            {!isIndividualExport && (
                <>
                    <th rowSpan={2} className="sticky-col px-1 text-center border-r border-slate-300 bg-slate-50 z-40 text-sm font-black uppercase tracking-wider text-slate-800" style={{ left: 0, width: '40px', minWidth: '40px' }}>STT</th>
                    <th rowSpan={2} className="sticky-col px-5 text-left border-r border-slate-300 bg-slate-50 z-40 text-sm font-black uppercase tracking-wider text-slate-800" style={{ left: '40px', minWidth: '220px' }}>Họ và Tên</th>
                </>
            )}
            <th colSpan={3} className="border-r-2 border-slate-300 py-2.5 bg-indigo-50/50 text-indigo-900 font-black text-sm uppercase tracking-widest">Giờ Công</th>
            <th colSpan={3} className="border-r-2 border-slate-300 py-2.5 bg-purple-50/50 text-purple-900 font-black text-sm uppercase tracking-widest">Số Ngày SBH</th>
            <th colSpan={2} className="border-r-2 border-slate-300 py-2.5 bg-slate-100 font-black text-sm uppercase tracking-widest text-slate-800">Số Lần</th>
            {weekHeaders}
          </tr>
          <tr className="text-sm font-black uppercase tracking-tighter">
            <th className="px-1 border-r border-slate-200 bg-indigo-50/20 text-indigo-800">SBH</th>
            <th className="px-1 border-r border-slate-200 bg-indigo-50/20 text-indigo-800">TV</th>
            <th className="px-1 border-r-2 border-slate-300 bg-indigo-50/20 text-indigo-900">TỔNG</th>
            <th className="px-1 border-r border-slate-200 bg-purple-50/20 text-purple-800">GH</th>
            <th className="px-1 border-r border-slate-200 bg-purple-50/20 text-purple-800">KH</th>
            <th className="px-1 border-r-2 border-slate-300 bg-purple-50/20 text-purple-900">TN</th>
            <th className="px-1 border-r border-slate-200 text-slate-700">ĐỔI</th>
            <th className="px-1 border-r-2 border-slate-300 text-slate-700">OFF</th>
            {Array.from({ length: duration }).map((_, i) => {
                const date = new Date(year, month - 1, startDay + i);
                const isSun = date.getDay() === 0;
                return (
                    <th key={i} className={`px-1 min-w-[50px] border-r border-slate-200 ${isSun ? 'bg-rose-50 text-rose-800' : 'bg-white text-slate-800'}`}>
                        <div className="font-black text-sm">{date.getDate()}</div>
                        <div className="opacity-90 text-sm tracking-widest">{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()]}</div>
                    </th>
                );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
            {renderBody()}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleTable;