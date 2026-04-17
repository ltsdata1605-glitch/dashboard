import React, { useState, useEffect } from 'react';
import type { VisibilityState } from '../../types';
import { toLocalISOString } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { useDashboardContext } from '../../contexts/DashboardContext';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import GtdhTargetModal from '../modals/GtdhTargetModal';

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
            case 'violet': return {
                bg: 'bg-violet-50 dark:bg-violet-900/20', iconBg: 'bg-violet-100 dark:bg-violet-900/40',
                iconColor: 'text-violet-600 dark:text-violet-400', textColor: 'text-violet-700 dark:text-violet-300', switchBg: 'bg-violet-600'
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
            className={`flex items-center cursor-pointer justify-between w-full px-3 py-2 rounded-xl ${classes.bg} transition-all duration-200 hover:brightness-95`}
        >
            <div className="flex items-center gap-2">
                <div className={`p-1 rounded-lg transition-colors ${classes.iconBg}`}>
                    <Icon name={icon} size={3.5} className={`transition-colors ${classes.iconColor}`}/>
                </div>
                <span className={`font-bold text-[11px] transition-colors ${classes.textColor}`}>{label}</span>
            </div>
            <div className="relative">
                <input id={`switch-${label}`} type="checkbox" className="sr-only" checked={isActive} onChange={onToggle} />
                <div className={`block w-9 h-5 rounded-full transition-colors ${classes.switchBg}`}></div>
                <div className={`dot absolute left-[3px] top-[3px] bg-white w-3.5 h-3.5 rounded-full transition-transform duration-200 ease-in-out ${isActive ? 'translate-x-[16px]' : ''}`}></div>
            </div>
        </label>
    );
};

interface FilterSectionProps {
    options: { kho: string[]; trangThai: string[]; nguoiTao: string[]; department: string[] };
    visibility: VisibilityState;
    onVisibilityChange: (component: keyof VisibilityState, isVisible: boolean) => void;
    onClose: () => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({ options, visibility, onVisibilityChange, onClose }) => {
    const { 
        filterState: globalFilters, 
        handleFilterChange: applyGlobalFilters, 
        originalData: allData,
        productConfig,
        gtdhTargets,
        updateGtdhTarget
    } = useDashboardContext();
    
    const [localFilters, setLocalFilters] = useState(globalFilters);

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
            dateRange: range
        });
    };

    const handleDateChange = (type: 'startDate' | 'endDate', value: string) => {
        updateLocalFilter({ [type]: value, dateRange: '' });
    };
    
    const handleDropdownChange = (type: string, selected: string[]) => {
        updateLocalFilter({ [type]: selected });
    }

    const [isGtdhModalOpen, setGtdhModalOpen] = useState(false);

    const visibilityOptions = [
        { key: 'trendChart', label: 'Xu hướng doanh thu', icon: 'area-chart', color: 'violet' },
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-indigo-600 rounded-full" />
                    <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">Bộ Lọc Phân Tích</h2>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={handleResetFilters}
                        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title="Đặt lại bộ lọc"
                    >
                        <Icon name="rotate-ccw" size={5} />
                    </button>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                    >
                        <Icon name="x" size={6} />
                    </button>
                </div>
            </div>

            {/* Slide Menu Body */}
            <div className="flex-grow overflow-y-auto custom-scrollbar pb-20">
                <div className="p-3 space-y-3">
                    <div className="space-y-1.5 px-1">
                        <div className="flex items-center gap-2">
                            <div className="p-1 min-w-[24px] min-h-[24px] flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 rounded-md text-indigo-600 dark:text-indigo-400 shadow-sm">
                                <Icon name="warehouse" size={3.5} />
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

                    {/* Trạng Thái Xuất */}
                    <div className="space-y-1.5 px-1">
                        <div className="flex items-center gap-2">
                            <div className="p-1 min-w-[24px] min-h-[24px] flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 rounded-md text-emerald-600 dark:text-emerald-400 shadow-sm">
                                <Icon name="truck" size={3.5} />
                            </div>
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Trạng Thái Xuất</label>
                        </div>
                        <MultiSelectDropdown 
                            label="Trạng Thái Xuất" 
                            options={['Đã', 'Chưa']} 
                            selected={localFilters.xuat === 'all' ? [] : [localFilters.xuat === 'Đã' ? 'Đã' : 'Chưa']} 
                            onChange={(sel) => updateLocalFilter({ xuat: sel.length > 0 ? sel[sel.length - 1] : 'all' })} 
                            variant="compact"
                        />
                    </div>

                    {/* Dropdowns */}
                    {options.department.length > 0 && (
                        <div className="space-y-1.5 px-1">
                            <div className="flex items-center gap-2">
                                <div className="p-1 min-w-[24px] min-h-[24px] flex items-center justify-center bg-sky-50 dark:bg-sky-900/30 rounded-md text-sky-600 dark:text-sky-400 shadow-sm">
                                    <Icon name="users" size={3.5} />
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
                    <div className="space-y-1.5 px-1">
                        <div className="flex items-center gap-2">
                            <div className="p-1 min-w-[24px] min-h-[24px] flex items-center justify-center bg-amber-50 dark:bg-amber-900/30 rounded-md text-amber-600 dark:text-amber-400 shadow-sm">
                                <Icon name="user" size={3.5} />
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
                    <div className="space-y-1.5 px-1">
                        <div className="flex items-center gap-2">
                            <div className="p-1 min-w-[24px] min-h-[24px] flex items-center justify-center bg-rose-50 dark:bg-rose-900/30 rounded-md text-rose-600 dark:text-rose-400 shadow-sm">
                                <Icon name="file-text" size={3.5} />
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

                    {/* Date Selection */}
                    <div className="space-y-3 pt-1 px-1">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Khoảng Thời Gian Nhanh</label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { range: 'today', label: 'Hôm nay' }, { range: 'yesterday', label: 'Hôm qua' },
                                    { range: 'week', label: 'Tuần này' }, { range: 'month', label: 'Tháng này' },
                                    { range: 'all', label: 'Tất cả' }
                                ].map(({ range, label }) => (
                                    <button 
                                        key={range} 
                                        onClick={() => handleDateRangeClick(range)} 
                                        className={`py-1 text-[10px] font-bold rounded-md transition-all border ${localFilters.dateRange === range ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm dark:shadow-none' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Từ ngày</label>
                                <input 
                                    type="date" 
                                    value={localFilters.startDate} 
                                    onChange={e => handleDateChange('startDate', e.target.value)} 
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[12px] font-bold px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none shadow-sm" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đến ngày</label>
                                <input 
                                    type="date" 
                                    value={localFilters.endDate} 
                                    onChange={e => handleDateChange('endDate', e.target.value)} 
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[12px] font-bold px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none shadow-sm" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section Visibility */}
                    <div className="space-y-2 pt-2 px-1">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Hiển Thị Các Khu Vực</label>
                        <div className="space-y-1.5">
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
                    <div className="space-y-2.5 pt-3 mt-1 border-t border-slate-200 dark:border-slate-800 pb-6 px-1">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cấu Hình GTĐH Mục Tiêu</label>
                        <button
                            onClick={() => setGtdhModalOpen(true)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 transition-colors">
                                    <Icon name="settings-2" size={4} />
                                </div>
                                <div className="flex flex-col items-start leading-tight">
                                    <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">Quản lý GTĐH Target</span>
                                    <span className="text-[9px] whitespace-nowrap font-medium text-slate-500 dark:text-slate-400 mt-[1px]">Thêm/Sửa/Xóa Mục Tiêu AOV</span>
                                </div>
                            </div>
                            <Icon name="chevron-right" size={4} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
                        </button>
                    </div>
                </div>
            </div>

            <GtdhTargetModal 
                isOpen={isGtdhModalOpen} 
                onClose={() => setGtdhModalOpen(false)} 
            />
        </div>
    );
};

export default FilterSection;
