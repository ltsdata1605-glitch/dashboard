import React, { useMemo } from 'react';
import { StaffMember, ScheduleConfig, ScheduleTargets } from '../types';
import { 
    calculateTotalHours, calculateSpecialHours, calculateNormalHours,
    calculateGhHours, calculateKhoHours, calculateTnHours
} from '../utils/scheduleUtils';
import { ScheduleRow } from './ScheduleRow';

interface ScheduleTableProps {
  staffList: StaffMember[];
  config: ScheduleConfig;
  targets: ScheduleTargets;
  tableRef: React.RefObject<HTMLTableElement>;
  onDeleteEmployee: (id: string) => void;
  onEditShift: (employeeId: string, dayIndex: number) => void;
  onDayClick?: (day: number) => void;
  weekRange?: { start: number; end: number } | null;
  highlightId?: string | null;
  onSwapShift: (employeeId1: string, employeeId2: string, dayIndex: number) => void;
  includeTnInSbh?: boolean;
}

const ScheduleTable: React.FC<ScheduleTableProps> = ({ 
    staffList, config, targets, tableRef, 
    onDeleteEmployee, onEditShift, onDayClick,
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
      // `dragover` fires liên tục (nhiều lần/giây) kể cả khi con trỏ đứng yên trên cùng 1 ô.
      // Chỉ gọi setDragTarget khi ô đích thực sự đổi — tránh tạo object mới mỗi lần fire
      // khiến React không thể bailout re-render (so sánh Object.is luôn "khác" với literal mới).
      if (dragSource && dragSource.dayIndex === dayIndex && dragSource.employeeId !== employeeId) {
           e.dataTransfer.dropEffect = 'move';
           setDragTarget(prev => (prev && prev.employeeId === employeeId && prev.dayIndex === dayIndex) ? prev : { employeeId, dayIndex });
      } else {
           e.dataTransfer.dropEffect = 'none';
           setDragTarget(prev => prev === null ? prev : null);
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
    { bg: '#f0fdfa', text: '#0f766e', border: '#ccfbf1' }, // Teal
    { bg: '#f0f9ff', text: '#0369a1', border: '#e0f2fe' }, // Sky
    { bg: '#fdf4ff', text: '#a21caf', border: '#fae8ff' }, // Fuchsia
    { bg: '#fefce8', text: '#a16207', border: '#fef08a' }, // Yellow
    { bg: '#ecfdf5', text: '#047857', border: '#d1fae5' }, // Emerald
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

  const renderBody = () => {
    const rows: React.ReactNode[] = [];
    let lastDepartment: string | null = null;

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

        rows.push(
            <ScheduleRow
                key={staff.id}
                staff={staff}
                index={index}
                config={config}
                targets={targets}
                isIndividualExport={isIndividualExport}
                onDeleteEmployee={onDeleteEmployee}
                onEditShift={onEditShift}
                weekRange={weekRange}
                highlightId={highlightId}
                dragSource={dragSource}
                dragTarget={dragTarget}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDrop={handleDrop}
                handleDragEnd={handleDragEnd}
                includeTnInSbh={includeTnInSbh}
            />
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
                <td colSpan={2} className="sticky-col text-right px-4 py-3 border-r border-slate-400 text-xs uppercase tracking-widest text-slate-500 bg-slate-100">
                    GIỜ CÔNG TRUNG BÌNH
                </td>
                <td className="col-total border-r border-slate-300 text-sm text-indigo-700">
                    {Math.round(avgSpecial)}
                    {targets.targetSpecialHours && (
                        <div className="text-[10px] font-bold opacity-50">Target: {Math.round(targets.targetSpecialHours)}</div>
                    )}
                </td>
                <td className="col-total border-r border-slate-300 text-sm text-slate-500">{Math.round(avgNormal)}</td>
                <td className="col-total col-total-final border-r-2 border-slate-400 text-sm text-slate-900">{Math.round(avgTotal)}</td>
                
                <td className="col-stat border-r border-slate-300 text-sm text-indigo-700" title="TB Giờ GH">{Math.round(avgGh)}h</td>
                <td className="col-stat border-r border-slate-300 text-sm text-indigo-700" title="TB Giờ KH">{Math.round(avgKho)}h</td>
                <td className="col-stat border-r-2 border-slate-400 text-sm text-indigo-700" title="TB Giờ TN">{Math.round(avgTn)}h</td>
                
                <td colSpan={2} className="border-r-2 border-slate-400 bg-slate-50"></td>
                <td colSpan={weekRange ? (weekRange.end - weekRange.start + 1) : duration} className="bg-slate-50 border-t-2 border-slate-400"></td>
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
        const weekNum = dayToWeekMap[day] || 1;
        const theme = weekThemes[(weekNum - 1) % weekThemes.length];
        
        if (!weekRange || (day === weekRange.start)) {
            const headerLen = weekRange ? (weekRange.end - weekRange.start + 1) : len;
            headers.push(<th key={day} colSpan={headerLen} style={{ backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }} className="border-b-2 border-r-2 border-slate-400 text-base py-3 font-black uppercase tracking-widest shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)]">Tuần {weekNum}</th>);
        }
        
        day += len;
    }
    return headers;
  }, [duration, year, month, startDay, dayToWeekMap, weekRange]);

  return (
    <div className={`overflow-x-auto custom-scroll rounded-none ${isIndividualExport ? 'flex justify-center' : ''}`}>
      <table id="scheduleTable" ref={tableRef} className="w-full border-collapse tabular-nums">
        <thead className="bg-slate-50">
          <tr>
            {!isIndividualExport && (
                <>
                    <th rowSpan={2} className="sticky-col px-1 text-center border-r-2 border-slate-400 z-40 text-base font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border-b-[3px] !border-b-slate-400 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)]" style={{ left: 0, width: '40px', minWidth: '40px' }}>STT</th>
                    <th rowSpan={2} className="sticky-col px-5 text-left border-r-2 border-slate-400 z-40 text-base font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border-b-[3px] !border-b-slate-400 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)]" style={{ left: '40px' }}>Họ và Tên</th>
                </>
            )}
            <th colSpan={3} className="border-r-2 border-slate-400 py-3 bg-sky-50 text-sky-700 font-black text-base uppercase tracking-widest border-b-2 !border-b-slate-400">Giờ Công</th>
            <th colSpan={3} className="border-r-2 border-slate-400 py-3 bg-emerald-50 text-emerald-700 font-black text-base uppercase tracking-widest border-b-2 !border-b-slate-400">Số Ngày SBH</th>
            <th colSpan={2} className="border-r-2 border-slate-400 py-3 bg-amber-50 text-amber-700 font-black text-base uppercase tracking-widest border-b-2 !border-b-slate-400">Số Lần</th>
            {weekHeaders}
          </tr>
          <tr className="text-[15px] font-black uppercase tracking-tighter">
            <th className="px-1 border-r border-slate-300 bg-sky-50 text-sky-700 border-b-[3px] !border-b-sky-400">SBH</th>
            <th className="px-1 border-r border-slate-300 bg-sky-50 text-sky-700 border-b-[3px] !border-b-sky-400">TV</th>
            <th className="px-1 border-r-2 border-slate-400 bg-sky-50 text-sky-800 border-b-[3px] !border-b-sky-400">TỔNG</th>
            <th className="px-1 border-r border-slate-300 bg-emerald-50 text-emerald-700 border-b-[3px] !border-b-emerald-400">GH</th>
            <th className="px-1 border-r border-slate-300 bg-emerald-50 text-emerald-700 border-b-[3px] !border-b-emerald-400">KH</th>
            <th className="px-1 border-r-2 border-slate-400 bg-emerald-50 text-emerald-800 border-b-[3px] !border-b-emerald-400">TN</th>
            <th className="px-1 border-r border-slate-300 bg-amber-50 text-amber-700 border-b-[3px] !border-b-amber-400">ĐỔI</th>
            <th className="px-1 border-r-2 border-slate-400 bg-amber-50 text-amber-700 border-b-[3px] !border-b-amber-400">OFF</th>
            {Array.from({ length: duration }).map((_, i) => {
                const dayIndex = i + 1;
                if (weekRange && (dayIndex < weekRange.start || dayIndex > weekRange.end)) return null;
                const date = new Date(year, month - 1, startDay + i);
                const isWeekendDay = date.getDay() === 0 || date.getDay() === 6;
                
                // Get the theme for this specific day based on the week it belongs to
                const day = startDay + i;
                const weekNum = dayToWeekMap[day] || 1;
                const theme = weekThemes[(weekNum - 1) % weekThemes.length];
                
                return (
                    <th key={i} 
                        className={`px-1 min-w-[50px] border-r border-slate-300 border-b-[3px] !border-b-slate-400 ${isWeekendDay ? 'bg-rose-50 text-rose-700' : ''} cursor-pointer hover:opacity-80`} 
                        style={!isWeekendDay ? { backgroundColor: theme.bg, color: theme.text } : {}}
                        onClick={() => onDayClick?.(i + 1)}
                        title="Click để xem thống kê ngày này"
                    >
                        <div className="text-[10px] font-medium opacity-80 leading-none mb-1">{["CN", "T2", "T3", "T4", "T5", "T6", "T7"][date.getDay()]}</div>
                        <div className="text-lg leading-none">{String(date.getDate()).padStart(2, '0')}</div>
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

const MemoizedScheduleTable = React.memo(ScheduleTable);
MemoizedScheduleTable.displayName = 'ScheduleTable';
export default MemoizedScheduleTable;