import React from 'react';

interface ControlsProps {
  monthYear: string;
  setMonthYear: (value: string) => void;
  startDay: number;
  setStartDay: (value: number) => void;
  duration: number;
  setDuration: (value: number) => void;
  onGenerate: () => void;
  departments: string[];
  departmentFilter: string;
  setDepartmentFilter: (value: string) => void;
  supermarkets: string[];
  currentSupermarket: string;
  setSupermarket: (value: string) => void;
  onboardingStep: number;
  hasStaff: boolean;
  hasPatternsForCurrentDept: boolean;
  onDateControlClick: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  monthYear,
  setMonthYear,
  startDay,
  setStartDay,
  duration,
  setDuration,
  onGenerate,
  departments,
  departmentFilter,
  setDepartmentFilter,
  supermarkets,
  currentSupermarket,
  setSupermarket,
  onboardingStep,
  hasStaff,
  hasPatternsForCurrentDept,
  onDateControlClick
}) => {
  const isDisabled = !hasStaff;
  const isGenerateDisabled = !hasStaff || !hasPatternsForCurrentDept;

  const controlHighlightClass = (step: number) => 
    onboardingStep === step ? 'ring-2 ring-rose-500 animate-pulse z-10 relative' : '';
  const tooltip = (step: number, title: string, content: string) => onboardingStep === step && (
    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-52 bg-rose-600 text-white text-[10px] py-2 px-3 shadow-xl z-50 text-center font-medium">
        <div className="font-bold mb-0.5">{title}</div>
        {content}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1 w-2.5 h-2.5 bg-rose-600 rotate-45"></div>
    </div>
  );

  return (
    <div className={`flex flex-wrap items-end gap-4 ${isDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Date group — compact horizontal row */}
      <div 
        className={`flex items-end gap-3 relative ${controlHighlightClass(3)}`}
        onClick={onDateControlClick}
      >
          {tooltip(3, 'Bước 3: Thời gian', 'Chọn Tháng/Năm, ngày bắt đầu và số ngày.')}
          
          <div className="flex flex-col">
            <label htmlFor="cfgMonth" className="text-[9px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
              Tháng / Năm
            </label>
            <input 
              type="month" 
              id="cfgMonth" 
              className="config-input h-9 w-44 text-sm" 
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              disabled={isDisabled}
            />
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="cfgStartDay" className="text-[9px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
              Bắt đầu
            </label>
            <input 
              type="number" 
              id="cfgStartDay" 
              className="config-input h-9 w-16 text-sm text-center" 
              value={startDay}
              onChange={(e) => setStartDay(parseInt(e.target.value))}
              min="1" 
              max="31"
              disabled={isDisabled}
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="cfgDuration" className="text-[9px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
              Số ngày
            </label>
            <input 
              type="number" 
              id="cfgDuration" 
              className="config-input h-9 w-16 text-sm text-center" 
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              min="1" 
              max="31"
              disabled={isDisabled}
            />
          </div>
      </div>

      {/* Vertical separator */}
      <div className="w-px h-9 bg-slate-200 self-end"></div>

      {/* Store & Department selectors */}
      <div className="flex items-end gap-3">
        <div className="flex flex-col">
          <label htmlFor="cfgSupermarket" className="text-[9px] font-bold text-indigo-500 mb-1 uppercase tracking-wider">
            Siêu thị
          </label>
          <select 
              id="cfgSupermarket"
              className="config-input h-9 w-44 text-sm font-semibold text-indigo-700 bg-indigo-50/50 border-indigo-200 focus:border-indigo-400"
              value={currentSupermarket}
              onChange={(e) => setSupermarket(e.target.value)}
              disabled={supermarkets.length <= 1 && isDisabled}
          >
              {supermarkets.length === 0 && <option value="">(Chưa có)</option>}
              {supermarkets.map(sm => (
                  <option key={sm} value={sm}>
                      {sm}
                  </option>
              ))}
          </select>
        </div>
        
        <div className="flex flex-col">
            <label htmlFor="cfgDepartment" className="text-[9px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
              Bộ phận
            </label>
            <select 
                id="cfgDepartment"
                className="config-input h-9 w-48 text-sm"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                disabled={isDisabled}
            >
                {departments.length === 0 && <option>...</option>}
                {departments.map(dep => (
                    <option key={dep} value={dep}>
                        {dep}
                    </option>
                ))}
            </select>
        </div>
      </div>

      {/* Generate button */}
      <div className="relative ml-auto">
        {tooltip(6, 'Bước 6: Hoàn tất!', 'Bấm vào đây để tạo lịch tự động!')}
        <button 
          onClick={onGenerate} 
          className={`h-9 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed ${controlHighlightClass(6)}`}
          disabled={isGenerateDisabled}
          title={isGenerateDisabled ? "Vui lòng nhập danh sách nhân viên và tạo Ca Xoay trước." : "Tạo lịch làm việc mới"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" />
          </svg>
          Tạo Lịch
        </button>
      </div>
    </div>
  );
};

const MemoizedControls = React.memo(Controls);
MemoizedControls.displayName = 'Controls';
export default MemoizedControls;