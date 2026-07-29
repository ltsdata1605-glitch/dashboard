import React, { memo } from 'react';
import { StaffMember, ScheduleConfig, ScheduleTargets } from '../types';
import { 
    calculateTotalHours, calculateSpecialHours, calculateNormalHours,
    recalculateStatsForWeek, calculateTotalHoursForWeek, calculateSpecialHoursForWeek, calculateNormalHoursForWeek,
    calculateGhHours, calculateKhoHours, calculateTnHours
} from '../utils/scheduleUtils';
import { abbreviateVietnameseName } from '../utils/stringUtils';
import { Button } from '../../../components/shared/ui/Button';

interface ScheduleRowProps {
  staff: StaffMember;
  index: number;
  config: ScheduleConfig;
  targets: ScheduleTargets;
  isIndividualExport: boolean;
  onDeleteEmployee: (id: string) => void;
  onEditShift: (employeeId: string, dayIndex: number) => void;
  weekRange?: { start: number; end: number } | null;
  highlightId?: string | null;
  dragSource: { employeeId: string; dayIndex: number } | null;
  dragTarget: { employeeId: string; dayIndex: number } | null;
  handleDragStart: (e: React.DragEvent, employeeId: string, dayIndex: number) => void;
  handleDragOver: (e: React.DragEvent, employeeId: string, dayIndex: number) => void;
  handleDrop: (e: React.DragEvent, targetEmployeeId: string, targetDayIndex: number) => void;
  handleDragEnd: () => void;
  includeTnInSbh?: boolean;
}

const StatCell: React.FC<{ value: number; target: number; className?: string }> = ({ value, target, className = '' }) => {
    const safeTarget = isNaN(target) ? 0 : target;
    const isOk = safeTarget === 0 || Math.abs(value - safeTarget) <= 2;
    const displayValue = value === 0 ? '-' : value;
    
    return (
        <td className={`col-stat ${isOk ? '' : 'stat-warn'} ${className} text-sm font-bold`}>
            {displayValue}
        </td>
    );
};

const formatDisplayName = (fullName: string): string => {
    const parts = fullName.split(' - ');
    return parts.length < 2 ? fullName : `${parts[0]} - ${abbreviateVietnameseName(parts.slice(1).join(' - '))}`;
};

export const ScheduleRow = memo<ScheduleRowProps>(({
    staff, index, config, targets, isIndividualExport,
    onDeleteEmployee, onEditShift, weekRange, highlightId,
    dragSource, dragTarget, handleDragStart, handleDragOver,
    handleDrop, handleDragEnd, includeTnInSbh = true
}) => {
    const { year, month, startDay, duration } = config;
    const safeTargets = targets || { gh: 0, kho: 0, tn: 0 };
    
    const isWeekly = !!weekRange;
    const specialHours = isWeekly ? calculateSpecialHoursForWeek(staff, weekRange!.start, weekRange!.end, includeTnInSbh) : calculateSpecialHours(staff, includeTnInSbh);
    const normalHours = isWeekly ? calculateNormalHoursForWeek(staff, weekRange!.start, weekRange!.end) : calculateNormalHours(staff);
    const totalHours = isWeekly ? calculateTotalHoursForWeek(staff, weekRange!.start, weekRange!.end) : calculateTotalHours(staff);
    const stats = isWeekly ? recalculateStatsForWeek(staff, weekRange!.start, weekRange!.end) : staff.stats;

    const isRowHighlighted = highlightId === staff.id;

    return (
        <tr className={`${isRowHighlighted ? 'row-export-highlight' : ''} group ${isIndividualExport ? 'h-24' : ''} border-b border-slate-300 even:bg-slate-50/50 hover:bg-slate-100/50 transition-colors`}>
            {!isIndividualExport && (
                <>
                    <td className="sticky-col border-r border-slate-400 bg-white z-20 group-hover:bg-slate-50 transition-colors" style={{ left: 0, width: '40px', minWidth: '40px' }}>
                        <div className="flex items-center justify-center font-bold text-slate-400 text-xs">{index + 1}</div>
                    </td>
                    <td className="sticky-col border-r-2 border-slate-400 bg-white z-20 group-hover:bg-slate-50 transition-colors" style={{ left: '40px' }}>
                        <div className="flex justify-between items-center">
                            <span className={staff.gender === 'Nu' ? 'text-rose-600 dark:text-rose-400' : 'text-sky-600 dark:text-sky-400'}>
                                {formatDisplayName(staff.name)}
                            </span>
                            <Button variant="ghost" onClick={() => onDeleteEmployee(staff.id)} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-600 transition-all export-hidden">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </Button>
                        </div>
                    </td>
                </>
            )}
            {/* GIỜ CÔNG */}
            <td className={`col-total border-r border-slate-300 text-sm font-bold text-center ${
                targets.targetSpecialHours && Math.abs(specialHours - targets.targetSpecialHours) > 0.1 ? 'text-rose-600 bg-rose-50' : 'text-slate-500'
            }`} title={`Mục tiêu: ${Math.round(targets.targetSpecialHours || 0)}h`}>
                {Math.round(specialHours)}
            </td>
            <td className="col-total border-r border-slate-300 text-sm font-bold text-center text-slate-400">{Math.round(normalHours)}</td>
            <td className="col-total col-total-final border-r-2 border-slate-400 text-sm font-black text-center">{Math.round(totalHours)}</td>
            
            {/* SỐ NGÀY SBH */}
            <StatCell value={stats.gh} target={staff.gender === 'Nam' ? safeTargets.gh : 0} className="border-r border-slate-300" />
            <StatCell value={stats.kho} target={safeTargets.kho} className="border-r border-slate-300" />
            <StatCell value={stats.tn} target={safeTargets.tn} className="border-r-2 border-slate-400" />
            
            {/* SỐ LẦN */}
            <td className={`col-stat border-r border-slate-300 text-sm font-bold text-center ${stats.swapCount > 8 ? 'stat-warn' : 'text-slate-400'}`}>{stats.swapCount || '-'}</td>
            <td className={`col-stat border-r-2 border-slate-400 text-sm font-bold text-center ${stats.offDays > 4 ? 'stat-warn' : 'text-slate-400'}`}>{stats.offDays || '-'}</td>
            
            {/* LỊCH LÀM VIỆC */}
            {staff.schedule.slice(1).map((info, dIndex) => {
                const dayIndex = dIndex + 1;
                if (weekRange && (dayIndex < weekRange.start || dayIndex > weekRange.end)) return null;
                const dayDate = new Date(year, month - 1, startDay + dayIndex - 1);
                const isWeekendDay = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                const weekendClass = isWeekendDay ? 'bg-rose-50/50' : 'bg-transparent';
                
                if (!info) return <td key={dayIndex} className={`editable-cell border-r border-slate-300 text-sm ${weekendClass}`} onClick={() => onEditShift(staff.id, dayIndex)}></td>;
                
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
                const warningClass = info.needsManualIntervention ? 'cell-needs-intervention' : '';
                
                const isDragging = dragSource?.employeeId === staff.id && dragSource?.dayIndex === dayIndex;
                const isDragOver = dragTarget?.employeeId === staff.id && dragTarget?.dayIndex === dayIndex;
                const dragClass = isDragging ? 'opacity-50 scale-90 ring-2 ring-sky-400 z-50' : isDragOver ? 'bg-sky-100 ring-2 ring-sky-500 scale-105 z-50 shadow-lg' : '';

                return (
                    <td key={dayIndex} className={`editable-cell ${className} ${manualClass} ${warningClass} ${dragClass} font-black transition-all duration-200`} 
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, staff.id, dayIndex)}
                        onDragOver={(e) => handleDragOver(e, staff.id, dayIndex)}
                        onDrop={(e) => handleDrop(e, staff.id, dayIndex)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onEditShift(staff.id, dayIndex)}>
                        <div className="w-full h-full flex flex-col items-center justify-center pointer-events-none">
                            <span className="leading-tight">{info.role === "OFF" ? "OFF" : info.shift}</span>
                            {rolePill}
                        </div>
                    </td>
                );
            })}
        </tr>
    );
});

ScheduleRow.displayName = 'ScheduleRow';
