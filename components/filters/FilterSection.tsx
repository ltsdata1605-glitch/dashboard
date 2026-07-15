import React, { useState, useEffect } from 'react';
import type { VisibilityState } from '../../types';
import { toLocalISOString } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { useDashboardContext } from '../../contexts/DashboardContext';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import GtdhTargetModal from '../modals/GtdhTargetModal';
import EmployeeManagerModal from '../modals/EmployeeManagerModal';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../shared/ui/Button';

const ModernSwitch: React.FC<{ label: string; icon: string; isActive: boolean; onToggle: () => void; color: string; }> = ({ label, icon, isActive, onToggle, color }) => {
    const getColorClasses = (colorStr: string, active: boolean) => {
        if (!active) {
            return {
                bg: 'bg-slate-50 dark:bg-slate-900/40',
                iconBg: 'bg-slate-100 dark:bg-slate-800',
                iconColor: 'text-slate-400 dark:text-slate-500',
                textColor: 'text-slate-500 dark:text-slate-400',
                switchBg: 'bg-slate-200 dark:bg-slate-700'
            };
        }
        switch (colorStr) {
            case 'sky': return {
                bg: 'bg-sky-50 dark:bg-sky-900/20', iconBg: 'bg-sky-100 dark:bg-sky-900/40',
                iconColor: 'text-sky-600 dark:text-sky-400', textColor: 'text-sky-700 dark:text-sky-300', switchBg: 'bg-sky-600'
            };
            case 'emerald': return {
                bg: 'bg-emerald-50 dark:bg-emerald-900/20', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
                iconColor: 'text-emerald-600 dark:text-emerald-400', textColor: 'text-emerald-700 dark:text-emerald-300', switchBg: 'bg-emerald-600'
            };
            case 'rose': return {
                bg: 'bg-rose-50 dark:bg-rose-900/20', iconBg: 'bg-rose-100 dark:bg-rose-900/40',
                iconColor: 'text-rose-600 dark:text-rose-400', textColor: 'text-rose-700 dark:text-rose-300', switchBg: 'bg-rose-600'
            };
            case 'amber': return {
                bg: 'bg-amber-50 dark:bg-amber-900/20', iconBg: 'bg-amber-100 dark:bg-amber-900/40',
                iconColor: 'text-amber-600 dark:text-amber-400', textColor: 'text-amber-700 dark:text-amber-300', switchBg: 'bg-amber-600'
            };
            default: return {
                 bg: 'bg-indigo-50 dark:bg-indigo-900/20', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
                 iconColor: 'text-indigo-600 dark:text-indigo-400', textColor: 'text-indigo-700 dark:text-indigo-300', switchBg: 'bg-indigo-600'
            };
        }
    };
    
    const classes = getColorClasses(color, isActive);

    return (
        <label
            htmlFor={`switch-${label}`}
            className={`flex items-center cursor-pointer justify-between w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl ${classes.bg} transition-all duration-200 hover:brightness-95`}
        >
            <div className="flex items-center gap-1.5 sm:gap-2">
                <div className={`p-0.5 sm:p-1 rounded-md sm:rounded-lg transition-colors ${classes.iconBg}`}>
                    <Icon name={icon} size={3} className={`transition-colors sm:hidden ${classes.iconColor}`}/>
                    <Icon name={icon} size={3.5} className={`transition-colors hidden sm:block ${classes.iconColor}`}/>
                </div>
                <span className={`font-bold text-xs sm:text-sm transition-colors ${classes.textColor}`}>{label}</span>
            </div>
            <div className="relative">
                <input id={`switch-${label}`} type="checkbox" className="sr-only" checked={isActive} onChange={onToggle} />
                <div className={`block w-8 h-[18px] sm:w-9 sm:h-5 rounded-full transition-colors ${classes.switchBg}`}></div>
                <div className={`dot absolute left-[3px] top-[3px] bg-white w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full transition-transform duration-200 ease-in-out ${isActive ? 'translate-x-[14px] sm:translate-x-[16px]' : ''}`}></div>
            </div>
        </label>
    );
};

interface FilterSectionProps {
    options: { kho: string[]; trangThai: string[]; nguoiTao: string[]; department: string[] };
    visibility: VisibilityState;
    onVisibilityChange: (component: keyof VisibilityState, isVisible: boolean) => void;
    onClose: () => void;
    onLoadShiftFile?: () => void;
    hasDepartmentData?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({ 
    options, 
    visibility, 
    onVisibilityChange, 
    onClose,
    onLoadShiftFile,
    hasDepartmentData
}) => {
    const { userRole } = useAuth();
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const { 
        filterState: globalFilters, 
        handleFilterChange: applyGlobalFilters, 
        originalData: allData,
        productConfig,
        gtdhTargets,
        updateGtdhTarget
    } = useDashboardContext();
    
    const [localFilters, setLocalFilters] = useState(globalFilters);

    const availableMonths = React.useMemo(() => {
        const months = new Set<string>();
        if (allData && allData.length > 0) {
            allData.forEach((row) => {
                const date = row.parsedDate;
                if (!date || isNaN(date.getTime())) return;
                const monthNum = date.getMonth() + 1;
                const yearNum = date.getFullYear();
                const mStr = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
                months.add(mStr);
            });
        }
        return Array.from(months)
            .sort((a, b) => b.localeCompare(a))
            .map(mStr => {
                const [year, month] = mStr.split('-');
                return `Tháng ${month}/${year}`;
            });
    }, [allData]);

    useEffect(() => {
        setLocalFilters(globalFilters);
    }, [globalFilters]);

    const updateLocalFilter = (newVals: Partial<typeof globalFilters>) => {
        const nextFilters = { ...localFilters, ...newVals };
        setLocalFilters(nextFilters);
        applyGlobalFilters(nextFilters);
    };

    const handleResetFilters = () => {
         const allTrangThai = [...new Set(allData.map(r => r['Trạng thái hồ sơ']).filter(Boolean))]; 
         const allNguoiTao = [...new Set(allData.map(r => r['Người tạo']).filter(Boolean))];
         updateLocalFilter({
            kho: [],
            xuat: 'all',
            trangThai: allTrangThai,
            nguoiTao: allNguoiTao,
            department: options.department || [],
            startDate: '',
            endDate: '',
            dateRange: 'all',
            selectedMonths: []
        });
    };

    const handleDateRangeClick = (range: string) => {
        let start: Date | null = null, end: Date | null = null;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (range) {
            case 'today': start = today; end = today; break;
            case 'yesterday': start = new Date(today); start.setDate(today.getDate() - 1); end = start; break;
            case 'week': {
                start = new Date(today);
                const day = start.getDay();
                start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                break;
            }
            case 'month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'all': start = null; end = null; break;
        }
        updateLocalFilter({
            startDate: start ? toLocalISOString(start) : '',
            endDate: end ? toLocalISOString(end) : '',
            dateRange: range,
            // Xoá lựa chọn "Tháng" cũ (nếu có, chọn từ FilterBar) — isDateMatch() ưu tiên
            // selectedMonths hơn startDate/endDate, không xoá sẽ khiến khoảng ngày mới chọn
            // ở đây bị bộ lọc Tháng cũ âm thầm ghi đè.
            selectedMonths: []
        });
    };

    const handleDateChange = (type: 'startDate' | 'endDate', value: string) => {
        updateLocalFilter({ [type]: value, dateRange: '', selectedMonths: [] });
    };
    
    const handleDropdownChange = (type: string, selected: string[]) => {
        updateLocalFilter({ [type]: selected });
    }

    const [isGtdhModalOpen, setGtdhModalOpen] = useState(false);

    const visibilityOptions = [
        { key: 'trendChart', label: 'Xu hướng doanh thu', icon: 'area-chart', color: 'sky' },
        { key: 'industryGrid', label: 'Tỷ trọng ngành hàng', icon: 'layout-grid', color: 'emerald' },
        { key: 'employeeAnalysis', label: 'Phân tích nhân viên', icon: 'users-round', color: 'rose' },
        { key: 'summaryTable', label: 'Chi tiết ngành hàng', icon: 'table', color: 'amber' },
    ];

    const handleSubmit = () => {
        applyGlobalFilters(localFilters);
        onClose();
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950">
            {/* Slide Menu Header */}
            <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <h2 className="text-xs sm:text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">TUỲ CHỈNH</h2>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1">
                    <Button
                        variant="unstyled" size="none"
                        onClick={onClose}
                        className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                    >
                        <Icon name="x" size={5} className="sm:hidden" />
                        <Icon name="x" size={6} className="hidden sm:block" />
                    </Button>
                </div>
            </div>

            {/* Slide Menu Body */}
            <div className="flex-grow overflow-y-auto custom-scrollbar pb-20">
                <div className="p-2 sm:p-3 space-y-3 sm:space-y-4">
                    {/* Quản lý Nhân sự & Phân ca */}
                    {(userRole === 'admin' || userRole === 'manager') && (
                        <div className="space-y-2.5 pb-3 px-1 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                                <div className="w-1 sm:w-1.5 h-4 sm:h-5 bg-sky-600 rounded-full" />
                                <h2 className="text-xs sm:text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">NHÂN VIÊN</h2>
                            </div>
                            
                            <div className="flex items-stretch gap-2">
                                {/* Quản lý danh sách nhân viên */}
                                <Button
                                    variant="unstyled" size="none"
                                    disabled={!hasDepartmentData}
                                    onClick={() => hasDepartmentData && setShowEmployeeModal(true)}
                                    className={`flex-grow flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl transition-all text-left ${
                                        hasDepartmentData 
                                            ? 'hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-sm cursor-pointer group' 
                                            : 'opacity-50 cursor-not-allowed'
                                    }`}
                                >
                                    <div className={`p-1 sm:p-1.5 rounded-md sm:rounded-lg transition-colors ${
                                        hasDepartmentData 
                                            ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60' 
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                    }`}>
                                        <Icon name="settings" size={3.5} className="sm:hidden" />
                                        <Icon name="settings" size={4} className="hidden sm:block" />
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[11px] sm:text-[13px] font-bold text-slate-800 dark:text-slate-200">Quản lý</span>
                                        <span className="text-[8px] sm:text-[9px] font-medium text-slate-500 dark:text-slate-400">
                                            {hasDepartmentData ? 'Xem chi tiết ca kíp' : 'Chưa có dữ liệu ca'}
                                        </span>
                                    </div>
                                </Button>

                                {/* Nhập file (icon) */}
                                <Button
                                    variant="unstyled" size="none"
                                    onClick={onLoadShiftFile}
                                    className="w-9 sm:w-10 shrink-0 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-sm text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors"
                                    title="Nhập file Excel Phân ca"
                                >
                                    <Icon name="upload-cloud" size={3.5} className="sm:hidden" />
                                    <Icon name="upload-cloud" size={4} className="hidden sm:block" />
                                </Button>

                                {/* Lấy danh sách (icon liên kết) */}
                                <a
                                    href="https://office.thegioididong.com/quan-ly-phan-ca"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-9 sm:w-10 shrink-0 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-sm text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors"
                                    title="Lấy danh sách phân ca từ ERP TGDĐ"
                                >
                                    <Icon name="link" size={3.5} className="sm:hidden" />
                                    <Icon name="link" size={4} className="hidden sm:block" />
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Tiêu đề nhóm Bộ lọc phân tích */}
                    <div className="flex items-center justify-between px-1 pt-1 mt-1">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                             <div className="w-1 sm:w-1.5 h-4 sm:h-5 bg-sky-600 rounded-full" />
                             <h2 className="text-xs sm:text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">BỘ LỌC</h2>
                         </div>
                        <Button
                            variant="unstyled" size="none"
                            onClick={handleResetFilters}
                            className="p-1 sm:p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                            title="Đặt lại bộ lọc"
                        >
                            <Icon name="rotate-ccw" size={4} className="sm:hidden" />
                            <Icon name="rotate-ccw" size={5} className="hidden sm:block" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        {/* 1. Kho Tạo */}
                        <div className="space-y-1 sm:space-y-1.5">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="p-0.5 sm:p-1 min-w-[20px] min-h-[20px] sm:min-w-[24px] sm:min-h-[24px] flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 rounded-md text-indigo-600 dark:text-indigo-400 shadow-sm">
                                    <Icon name="warehouse" size={3} className="sm:hidden" />
                                    <Icon name="warehouse" size={3.5} className="hidden sm:block" />
                                </div>
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Kho Tạo</label>
                            </div>
                            <MultiSelectDropdown 
                                label="Kho Tạo" 
                                options={options.kho} 
                                selected={localFilters.kho} 
                                onChange={(sel) => updateLocalFilter({ kho: sel })} 
                                variant="compact"
                            />
                        </div>

                        {/* 2. Tháng */}
                        <div className="space-y-1 sm:space-y-1.5">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="p-0.5 sm:p-1 min-w-[20px] min-h-[20px] sm:min-w-[24px] sm:min-h-[24px] flex items-center justify-center bg-sky-50 dark:bg-sky-900/30 rounded-md text-sky-600 dark:text-sky-400 shadow-sm">
                                    <Icon name="calendar" size={3} className="sm:hidden" />
                                    <Icon name="calendar" size={3.5} className="hidden sm:block" />
                                </div>
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tháng</label>
                            </div>
                            <MultiSelectDropdown 
                                label="Tháng" 
                                options={availableMonths} 
                                selected={localFilters.selectedMonths || []} 
                                onChange={(sel) => {
                                    updateLocalFilter({ 
                                        selectedMonths: sel, 
                                        dateRange: sel.length > 0 ? '' : 'all',
                                        startDate: '',
                                        endDate: '',
                                    });
                                }} 
                                variant="compact"
                            />
                        </div>

                        {/* 3. Người Tạo */}
                        <div className="space-y-1 sm:space-y-1.5">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="p-0.5 sm:p-1 min-w-[20px] min-h-[20px] sm:min-w-[24px] sm:min-h-[24px] flex items-center justify-center bg-amber-50 dark:bg-amber-900/30 rounded-md text-amber-600 dark:text-amber-400 shadow-sm">
                                    <Icon name="user" size={3} className="sm:hidden" />
                                    <Icon name="user" size={3.5} className="hidden sm:block" />
                                </div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Người Tạo</label>
                            </div>
                            <MultiSelectDropdown 
                                label="Người Tạo" 
                                options={options.nguoiTao} 
                                selected={localFilters.nguoiTao} 
                                onChange={(sel) => updateLocalFilter({ nguoiTao: sel })} 
                                variant="compact"
                            />
                        </div>

                        {/* 4. Trạng thái hồ sơ */}
                        <div className="space-y-1 sm:space-y-1.5">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="p-0.5 sm:p-1 min-w-[20px] min-h-[20px] sm:min-w-[24px] sm:min-h-[24px] flex items-center justify-center bg-rose-50 dark:bg-rose-900/30 rounded-md text-rose-600 dark:text-rose-400 shadow-sm">
                                    <Icon name="file-text" size={3} className="sm:hidden" />
                                    <Icon name="file-text" size={3.5} className="hidden sm:block" />
                                </div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Trạng thái hồ sơ</label>
                            </div>
                            <MultiSelectDropdown 
                                label="Trạng thái hồ sơ" 
                                options={options.trangThai} 
                                selected={localFilters.trangThai} 
                                onChange={(sel) => updateLocalFilter({ trangThai: sel })} 
                                variant="compact"
                            />
                        </div>

                        {/* 5. T.Thái Xuất - full width trong grid */}
                        <div className="space-y-1 sm:space-y-1.5 col-span-2">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="p-0.5 sm:p-1 min-w-[20px] min-h-[20px] sm:min-w-[24px] sm:min-h-[24px] flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 rounded-md text-emerald-600 dark:text-emerald-400 shadow-sm">
                                    <Icon name="truck" size={3} className="sm:hidden" />
                                    <Icon name="truck" size={3.5} className="hidden sm:block" />
                                </div>
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">T.Thái Xuất</label>
                            </div>
                            <MultiSelectDropdown 
                                label="T.Thái Xuất" 
                                options={['Đã', 'Chưa']} 
                                selected={localFilters.xuat === 'all' ? ['Đã', 'Chưa'] : [localFilters.xuat]} 
                                onChange={(sel) => {
                                    if (sel.length === 0 || sel.length === 2) {
                                        updateLocalFilter({ xuat: 'all' });
                                    } else {
                                        updateLocalFilter({ xuat: sel[0] as 'Đã' | 'Chưa' });
                                    }
                                }} 
                                variant="compact"
                            />
                        </div>
                    </div>

                    {/* Bộ phận - full width */}
                    {options.department.length > 0 && (
                        <div className="space-y-1.5 px-1">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="p-0.5 sm:p-1 min-w-[20px] min-h-[20px] sm:min-w-[24px] sm:min-h-[24px] flex items-center justify-center bg-sky-50 dark:bg-sky-900/30 rounded-md text-sky-600 dark:text-sky-400 shadow-sm">
                                    <Icon name="users" size={3} className="sm:hidden" />
                                    <Icon name="users" size={3.5} className="hidden sm:block" />
                                </div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Bộ phận</label>
                            </div>
                            <MultiSelectDropdown 
                                label="Bộ phận" 
                                options={options.department} 
                                selected={localFilters.department} 
                                onChange={(sel) => updateLocalFilter({ department: sel })} 
                                variant="compact"
                            />
                        </div>
                    )}

                    {/* Date Selection */}
                    <div className="space-y-2 sm:space-y-3 pt-1 px-1">
                        <div className="space-y-1 sm:space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Khoảng Thời Gian Nhanh</label>
                            <div className="grid grid-cols-5 gap-1">
                                {[
                                    { range: 'today', label: 'H.Nay' }, { range: 'yesterday', label: 'H.Qua' },
                                    { range: 'week', label: 'Tuần này' }, { range: 'month', label: 'Tháng này' },
                                    { range: 'all', label: 'All' }
                                ].map(({ range, label }) => (
                                    <Button
                                        variant="unstyled" size="none"
                                        key={range}
                                        onClick={() => handleDateRangeClick(range)}
                                        className={`h-9 text-[9px] xs:text-[10px] sm:text-xs font-semibold rounded-md transition-all border flex items-center justify-center text-center px-0.5 ${localFilters.dateRange === range ? 'bg-sky-600 border-sky-600 text-white shadow-sm dark:shadow-none' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-sky-300'}`}
                                    >
                                        {label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Từ ngày</label>
                                <input 
                                    type="date" 
                                    value={localFilters.startDate} 
                                    onChange={e => handleDateChange('startDate', e.target.value)} 
                                    className="w-full h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs sm:text-sm font-medium px-2.5 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors outline-none shadow-none" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Đến ngày</label>
                                <input 
                                    type="date" 
                                    value={localFilters.endDate} 
                                    onChange={e => handleDateChange('endDate', e.target.value)} 
                                    className="w-full h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs sm:text-sm font-medium px-2.5 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors outline-none shadow-none" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section Visibility */}
                    <div className="space-y-1.5 sm:space-y-2 pt-1.5 sm:pt-2 px-1">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Hiển Thị Các Khu Vực</label>
                        <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                            {visibilityOptions.map(opt => (
                                <ModernSwitch
                                    key={opt.key}
                                    label={opt.label}
                                    icon={opt.icon}
                                    isActive={visibility[opt.key as keyof VisibilityState]}
                                    onToggle={() => onVisibilityChange(opt.key as keyof VisibilityState, !visibility[opt.key as keyof VisibilityState])}
                                    color={opt.color}
                                />
                            ))}
                        </div>
                    </div>



                    {/* GTĐH Settings */}
                    <div className="space-y-2.5 pt-3 mt-1 border-t border-slate-200 dark:border-slate-800 pb-4 sm:pb-6 px-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <div className="w-1 sm:w-1.5 h-4 sm:h-5 bg-sky-600 rounded-full" />
                            <h2 className="text-xs sm:text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">CẤU HÌNH</h2>
                        </div>
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => setGtdhModalOpen(true)}
                            className="w-full flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-center gap-2 sm:gap-2.5">
                                <div className="p-1 sm:p-1.5 bg-sky-50 dark:bg-sky-900/40 rounded-md sm:rounded-lg text-sky-600 dark:text-sky-400 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/60 transition-colors">
                                    <Icon name="settings-2" size={3.5} className="sm:hidden" />
                                    <Icon name="settings-2" size={4} className="hidden sm:block" />
                                </div>
                                <div className="flex flex-col items-start leading-tight">
                                    <span className="text-[11px] sm:text-[13px] font-bold text-slate-800 dark:text-slate-200">Mục tiêu GTĐH</span>
                                    <span className="text-[8px] sm:text-[9px] whitespace-nowrap font-medium text-slate-500 dark:text-slate-400 mt-[1px]">Thêm/Sửa/Xóa Mục Tiêu AOV</span>
                                </div>
                            </div>
                            <Icon name="chevron-right" size={3.5} className="text-slate-300 dark:text-slate-600 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors sm:hidden" />
                            <Icon name="chevron-right" size={4} className="text-slate-300 dark:text-slate-600 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors hidden sm:block" />
                        </Button>
                    </div>
                </div>
            </div>

            <GtdhTargetModal 
                isOpen={isGtdhModalOpen} 
                onClose={() => setGtdhModalOpen(false)} 
            />

            <EmployeeManagerModal
                isOpen={showEmployeeModal}
                onClose={() => setShowEmployeeModal(false)}
            />
        </div>
    );
};

export default FilterSection;
