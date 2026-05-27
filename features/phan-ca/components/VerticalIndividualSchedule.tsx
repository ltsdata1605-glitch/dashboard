import React from 'react';
import { StaffMember, ScheduleConfig, ScheduleTargets } from '../types';
import { calculateSpecialHours, calculateNormalHours, calculateTotalHours } from '../utils/scheduleUtils';

interface VerticalIndividualScheduleProps {
  staff: StaffMember;
  config: ScheduleConfig;
  targets: ScheduleTargets;
  includeTnInSbh: boolean;
}

const VerticalIndividualSchedule: React.FC<VerticalIndividualScheduleProps> = ({ staff, config, targets, includeTnInSbh }) => {
  const { year, month, startDay, duration } = config;

  const specialHours = calculateSpecialHours(staff, includeTnInSbh);
  const normalHours = calculateNormalHours(staff);
  const totalHours = calculateTotalHours(staff);
  const stats = staff.stats;

  return (
    <div className="w-full mx-auto space-y-12 pb-12 pt-8">
      <div className="mb-8">
         <h2 className="text-3xl font-black text-slate-900 uppercase tracking-widest text-center mb-4">LỊCH LÀM VIỆC - THÁNG {month}</h2>
         <h3 className="text-xl font-bold text-slate-700 uppercase tracking-wider text-left pl-2">{staff.name}</h3>
      </div>
      
      <table className="w-full border-collapse bg-white border border-slate-200 shadow-sm">
        <thead>
          <tr>
            <th colSpan={3} className="border-r-2 border-slate-400 py-3 bg-sky-50 text-sky-700 font-black text-[13px] uppercase tracking-widest border-b-2 !border-b-slate-400">Giờ Công</th>
            <th colSpan={3} className="border-r-2 border-slate-400 py-3 bg-fuchsia-50 text-fuchsia-700 font-black text-[13px] uppercase tracking-widest border-b-2 !border-b-slate-400">Số Ngày SBH</th>
            <th colSpan={2} className="border-r-2 border-slate-400 py-3 bg-orange-50 text-orange-700 font-black text-[13px] uppercase tracking-widest border-b-2 !border-b-slate-400">Số Lần</th>
          </tr>
          <tr className="text-[11px] font-black uppercase tracking-wider">
            <th className="py-2 px-3 border-r border-slate-300 bg-sky-50 text-sky-700 border-b-[3px] !border-b-slate-400">SBH</th>
            <th className="py-2 px-3 border-r border-slate-300 bg-sky-50 text-sky-700 border-b-[3px] !border-b-slate-400">TV</th>
            <th className="py-2 px-3 border-r-2 border-slate-400 bg-sky-50 text-sky-800 border-b-[3px] !border-b-slate-400">TỔNG</th>
            <th className="py-2 px-3 border-r border-slate-300 bg-fuchsia-50 text-fuchsia-700 border-b-[3px] !border-b-slate-400">GH</th>
            <th className="py-2 px-3 border-r border-slate-300 bg-fuchsia-50 text-fuchsia-700 border-b-[3px] !border-b-slate-400">KH</th>
            <th className="py-2 px-3 border-r-2 border-slate-400 bg-fuchsia-50 text-fuchsia-800 border-b-[3px] !border-b-slate-400">TN</th>
            <th className="py-2 px-3 border-r border-slate-300 bg-orange-50 text-orange-700 border-b-[3px] !border-b-slate-400">ĐỔI</th>
            <th className="py-2 px-3 border-r-2 border-slate-400 bg-orange-50 text-orange-700 border-b-[3px] !border-b-slate-400">OFF</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          <tr>
            <td className="py-3 px-2 border-r border-slate-300 text-center">
              <span className={`text-[13px] font-bold ${targets.targetSpecialHours && Math.abs(specialHours - targets.targetSpecialHours) > 0.1 ? 'text-rose-600 bg-rose-50' : 'text-slate-700'}`}>
                {Math.round(specialHours)}
              </span>
            </td>
            <td className="py-3 px-2 border-r border-slate-300 text-center">
              <span className="text-[13px] font-bold text-slate-500">{Math.round(normalHours)}</span>
            </td>
            <td className="py-3 px-2 border-r-2 border-slate-400 text-center">
              <span className="text-[14px] font-black text-slate-900">{Math.round(totalHours)}</span>
            </td>
            
            <td className="py-3 px-2 border-r border-slate-300 text-center">
              <span className={`text-[13px] font-bold ${staff.gender === 'Nam' && targets.gh && stats.gh < targets.gh ? 'text-rose-600 bg-rose-50' : 'text-slate-700'}`}>{stats.gh}</span>
            </td>
            <td className="py-3 px-2 border-r border-slate-300 text-center">
              <span className={`text-[13px] font-bold ${targets.kho && stats.kho < targets.kho ? 'text-rose-600 bg-rose-50' : 'text-slate-700'}`}>{stats.kho}</span>
            </td>
            <td className="py-3 px-2 border-r-2 border-slate-400 text-center">
              <span className={`text-[13px] font-bold ${targets.tn && stats.tn < targets.tn ? 'text-rose-600 bg-rose-50' : 'text-slate-700'}`}>{stats.tn}</span>
            </td>
            
            <td className="py-3 px-2 border-r border-slate-300 text-center">
              <span className={`text-[13px] font-bold ${stats.swapCount > 8 ? 'text-rose-600 bg-rose-50' : 'text-slate-600'}`}>{stats.swapCount || '-'}</span>
            </td>
            <td className="py-3 px-2 border-r-2 border-slate-400 text-center">
              <span className={`text-[13px] font-bold ${stats.offDays > 4 ? 'text-rose-600 bg-rose-50' : 'text-slate-600'}`}>{stats.offDays || '-'}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="pt-2">
        <table className="w-full border-collapse text-left bg-white border border-slate-200 shadow-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="py-3 px-4 border-b-2 border-r border-slate-300 text-[11px] font-bold text-slate-500 uppercase text-center whitespace-nowrap tracking-wider">Ngày</th>
            <th className="py-3 px-4 border-b-2 border-r border-slate-300 text-[11px] font-bold text-slate-500 uppercase text-center whitespace-nowrap tracking-wider">Thứ</th>
            <th className="py-3 px-6 border-b-2 border-r border-slate-300 text-[11px] font-bold text-slate-500 uppercase text-center whitespace-nowrap tracking-wider">Ca Làm Việc</th>
            <th className="py-3 px-6 border-b-2 border-r-2 border-slate-400 text-[11px] font-bold text-slate-500 uppercase text-center whitespace-nowrap tracking-wider">Vai Trò</th>
            <th className="py-3 px-6 border-b-2 border-slate-300 text-[11px] font-bold text-slate-500 uppercase text-center whitespace-nowrap tracking-wider">Ghi Chú</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {staff.schedule.slice(1).map((info, i) => {
            if (!info) return null;
            
            const dayIndex = i + 1;
            if (dayIndex > duration) return null;
            
            const date = new Date(year, month - 1, startDay + dayIndex - 1);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isSun = date.getDay() === 0;
            
            const dowStr = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
            
            let rolePill = <span className="text-slate-400 font-medium">-</span>;
            let rowClass = isWeekend ? 'bg-slate-50/50' : 'bg-white';
            
            if (info.role === "OFF") {
               rowClass = 'bg-rose-50/30 text-rose-800';
            }

            if (info.role.includes("(GH)")) {
                rolePill = <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200">GIAO HÀNG</span>;
            } else if (info.role.includes("(Kho)")) {
                rolePill = <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200">KHO</span>;
            } else if (info.role.includes("(TN)")) {
                rolePill = <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[11px] border border-purple-200">THU NGÂN</span>;
            }
            
            return (
              <tr key={dayIndex} className={`${rowClass} hover:bg-slate-50 transition-colors border-b border-slate-300`}>
                <td className={`py-3 px-4 border-r border-slate-300 text-center whitespace-nowrap`}>
                  <span className={`text-[11px] font-black ${isSun ? 'text-rose-600' : 'text-slate-800'}`}>
                    {date.getDate().toString().padStart(2, '0')}/{month.toString().padStart(2, '0')}
                  </span>
                </td>
                <td className={`py-3 px-4 border-r border-slate-300 text-center whitespace-nowrap`}>
                  <span className={`text-[11px] font-bold ${isSun ? 'text-rose-500' : 'text-slate-500'}`}>
                    {dowStr}
                  </span>
                </td>
                <td className="py-3 px-6 border-r border-slate-300 text-center whitespace-nowrap">
                   <span className={`text-[14px] font-black tracking-wide ${info.role === "OFF" ? "text-rose-600" : "text-slate-900"}`}>
                      {info.role === "OFF" ? "OFF" : info.shift}
                   </span>
                </td>
                <td className="py-3 px-6 border-r-2 border-slate-400 text-center whitespace-nowrap">
                   {rolePill}
                </td>
                <td className="py-3 px-6 text-center whitespace-nowrap">
                   {info.isManual && <span className="text-[11px] font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Đã đổi ca</span>}
                   {!info.isManual && <span className="text-slate-300 text-[13px]">-</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default VerticalIndividualSchedule;
