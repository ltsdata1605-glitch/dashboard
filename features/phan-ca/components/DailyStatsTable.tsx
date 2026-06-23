import React from 'react';
import { StaffMember, ScheduleConfig, DailyRequirements, UnresolvedConflict } from '../types';

interface DailyStatsTableProps {
  staffList: StaffMember[];
  config: ScheduleConfig;
  requirements: DailyRequirements;
  setRequirements: (reqs: DailyRequirements) => void;
  selectedDay: number;
  setSelectedDay: (day: number) => void;
  departmentFilter: string;
  unresolvedConflicts: UnresolvedConflict[];
  onShowUnresolvedConflicts: () => void;
}

const DailyStatsTable: React.FC<DailyStatsTableProps> = ({ staffList, config, requirements, setRequirements, selectedDay, setSelectedDay, departmentFilter, unresolvedConflicts, onShowUnresolvedConflicts }) => {
    const { duration, year, month, startDay } = config;

    const timeSlots = ['1', '2', '3', '4', '5', '6'];
    const canEditRequirements = departmentFilter === 'all' || departmentFilter === 'BP All In One - ĐMX' || departmentFilter === 'BP All In One';

    const dayHeaders = [];
    for (let d = 1; d <= duration; d++) {
        const date = new Date(year, month - 1, startDay + d - 1);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dowLabel = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dayOfWeek];
        dayHeaders.push({ d, date: date.getDate(), dowLabel, isWeekend });
    }

    const scheduledCountsMatrix = timeSlots.map(slot => {
        const row = [];
        for (let d = 1; d <= duration; d++) {
            const count = staffList.filter(staff => {
                const daySchedule = staff.schedule[d];
                return daySchedule && daySchedule.shift && daySchedule.shift.includes(slot);
            }).length;
            row.push(count);
        }
        return row;
    });
    
    const handleRequirementChange = (slot: string, value: string) => {
        const newValue = parseInt(value, 10) || 0;
        if (newValue >= 0) {
            setRequirements({ ...requirements, [slot]: newValue });
        }
    };

    return (
        <div className="mt-4 mb-2 bg-white rounded-none border-t border-x border-slate-200 overflow-hidden shadow-sm relative">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Thống Kê Nhân Sự Theo Ca</h3>
                {unresolvedConflicts.length > 0 && (
                    <button 
                        onClick={onShowUnresolvedConflicts}
                        className="flex items-center gap-2 bg-rose-100 text-rose-700 font-bold py-1 px-3 rounded-none border border-rose-200 text-xs hover:bg-rose-200 transition-colors shadow-sm"
                        title="Hiển thị danh sách các ca cần tìm người thay thế"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{unresolvedConflicts.length} ca cần xử lý</span>
                    </button>
                )}
            </div>
            
            <div className="overflow-x-auto custom-scroll pb-2">
                <table className="w-full text-left border-collapse min-w-max">
                    <thead>
                        <tr>
                            <th className="sticky left-0 bg-slate-50 z-20 border-r border-b border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 uppercase w-24 text-center">Ca Làm Việc</th>
                            {canEditRequirements && (
                                <th className="sticky left-[96px] bg-slate-50 z-20 border-r border-b border-slate-200 px-2 py-2 text-xs font-bold text-slate-500 uppercase w-20 text-center">Yêu Cầu</th>
                            )}
                            {dayHeaders.map((dh, idx) => {
                                const isSelected = dh.d === selectedDay;
                                return (
                                    <th 
                                        key={idx} 
                                        onClick={() => setSelectedDay(dh.d)}
                                        className={`px-1 py-1.5 text-center border-b border-r border-slate-200 min-w-[48px] cursor-pointer transition-colors ${
                                            isSelected ? 'bg-indigo-100 border-b-2 border-b-indigo-500' :
                                            dh.isWeekend ? 'bg-rose-50 hover:bg-rose-100 text-rose-600' : 'bg-slate-50 hover:bg-slate-100 text-slate-500'
                                        }`}
                                    >
                                        <div className="text-xs font-bold opacity-70 mb-px leading-none">{dh.dowLabel}</div>
                                        <div className="text-sm font-black leading-none">{dh.date}</div>
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.map((slot, rowIndex) => {
                            const required = requirements[slot] || 0;
                            return (
                                <tr key={slot} className="hover:bg-slate-50/50">
                                    <td className="sticky left-0 bg-white z-10 border-r border-b border-slate-200 px-2 py-2 text-sm font-black text-slate-700 text-center">
                                        CA {slot}
                                    </td>
                                    {canEditRequirements && (
                                        <td className="sticky left-[96px] bg-white z-10 border-r border-b border-slate-200 px-1 py-2 text-center">
                                            <input
                                                id={`req-input-${slot}`}
                                                type="number"
                                                value={requirements[slot] || ''}
                                                onChange={(e) => handleRequirementChange(slot, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const nextSlot = String(parseInt(slot) + 1);
                                                        const nextInput = document.getElementById(`req-input-${nextSlot}`);
                                                        if (nextInput) {
                                                            (nextInput as HTMLInputElement).focus();
                                                            (nextInput as HTMLInputElement).select();
                                                        }
                                                    }
                                                }}
                                                className="w-full text-center font-bold bg-slate-50 border border-slate-200 p-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-none"
                                                min="0"
                                            />
                                        </td>
                                    )}
                                    {scheduledCountsMatrix[rowIndex].map((count, dIdx) => {
                                        const d = dIdx + 1;
                                        const isSelected = d === selectedDay;
                                        let textColor = "text-slate-600 font-semibold";
                                        let bgClass = "bg-white";
                                        
                                        if (canEditRequirements && required > 0) {
                                            if (count < required) { 
                                                textColor = "text-rose-600 font-black"; 
                                                bgClass = "bg-rose-50/40"; 
                                            } else if (count > required) { 
                                                textColor = "text-amber-600 font-black"; 
                                                bgClass = "bg-amber-50/40"; 
                                            } else { 
                                                textColor = "text-emerald-600 font-bold"; 
                                            }
                                        }

                                        if (isSelected) {
                                            bgClass = "bg-indigo-50/70";
                                        }

                                        return (
                                            <td 
                                                key={dIdx} 
                                                onClick={() => setSelectedDay(d)}
                                                className={`px-1 py-2 text-center border-b border-r border-slate-200 text-sm cursor-pointer transition-colors ${textColor} ${bgClass}`}
                                            >
                                                {count}
                                            </td>
                                        );
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const MemoizedDailyStatsTable = React.memo(DailyStatsTable);
MemoizedDailyStatsTable.displayName = 'DailyStatsTable';
export default MemoizedDailyStatsTable;