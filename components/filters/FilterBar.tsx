
import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../common/Icon';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import SingleSelectDropdown from '../common/SingleSelectDropdown';
import FilterChip from '../common/FilterChip';
import { Button } from '../shared/ui/Button';
import { toLocalISOString } from '../../utils/dataUtils';

interface FilterBarProps {
    onToggleAdvanced: () => void;
    onNewFile?: () => void;
    onOpenHistory?: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ onToggleAdvanced, onNewFile, onOpenHistory }) => {
    const {
        filterState,
        handleFilterChange,
        uniqueFilterOptions,
        availableWeeks,
        availableMonths
    } = useDashboardContext();
    // Nhân viên chỉ xem dữ liệu thừa kế từ quản lý (implementation_plan.md mục 37) — không
    // còn tự tải file/quản lý lịch sử tệp riêng nữa. Header.tsx (desktop) đã chặn đúng role
    // này từ trước; FilterBar.tsx (mobile + 1 bản desktop riêng trong file này) trước đây
    // CHƯA chặn — chỉ ẩn nút khi prop rỗng, không xét role, nên nhân viên trên mobile vẫn
    // thấy được nút tải file/lịch sử. Bổ sung điều kiện role cho khớp Header.tsx.
    const { userRole } = useAuth();
    const canManageFiles = userRole === 'admin' || userRole === 'manager';

    const [selectedWeek, setSelectedWeek] = useState<string>('');
    const [mounted, setMounted] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Dong bo selectedWeek khi dateRange thay doi tu ben ngoai
    useEffect(() => {
        if (filterState.dateRange !== 'week') {
            setSelectedWeek('');
        } else if (filterState.startDate && filterState.endDate) {
            if (!selectedWeek) {
                const startStr = filterState.startDate.split('T')[0];
                const found = availableWeeks.find(w => {
                    const [yStr, wStr] = w.value.split('-W');
                    const year = parseInt(yStr, 10);
                    const week = parseInt(wStr, 10);
                    const start = new Date(year, 0, 1 + (week - 1) * 7);
                    const day = start.getDay();
                    start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
                    return toLocalISOString(start).split('T')[0] === startStr;
                });
                if (found) {
                    setSelectedWeek(found.value);
                }
            }
        }
    }, [filterState.dateRange, filterState.startDate, filterState.endDate, availableWeeks, selectedWeek]);

    const handleWeekSelect = (val: string) => {
        setSelectedWeek(val);
        const [yStr, wStr] = val.split('-W');
        const year = parseInt(yStr, 10);
        const week = parseInt(wStr, 10);
        const start = new Date(year, 0, 1 + (week - 1) * 7);
        const day = start.getDay();
        start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        handleFilterChange({ 
            startDate: toLocalISOString(start), 
            endDate: toLocalISOString(end), 
            dateRange: 'week', 
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
        handleFilterChange({
            startDate: start ? toLocalISOString(start) : '',
            endDate: end ? toLocalISOString(end) : '',
            dateRange: range,
            selectedMonths: [] // Clear selected months when selecting a quick range
        });
    };

    // Calculate active chips
    const activeChips = useMemo(() => {
        const chips: { id: keyof typeof filterState; label: string; value: string | string[]; color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' }[] = [];
        
        // Kho is already displayed in its multi-select dropdown, no need for a redundant chip
        // if (filterState.kho.length > 0 && !filterState.kho.includes('all')) {
        //     chips.push({ id: 'kho', label: 'Kho', value: filterState.kho, color: 'indigo' });
        // }

        // We don't show Trạng thái chip because it's now in the main bar.
        // if (filterState.trangThai.length > 0 && filterState.trangThai.length < uniqueFilterOptions.trangThai.length) {
        //     chips.push({ id: 'trangThai', label: 'Trạng thái', value: filterState.trangThai, color: 'violet' });
        // }

        if (filterState.nguoiTao.length > 0 && filterState.nguoiTao.length < uniqueFilterOptions.nguoiTao.length) {
            chips.push({ id: 'nguoiTao', label: 'Người tạo', value: filterState.nguoiTao, color: 'rose' });
        }

        // We don't show Xuất and Department chips because they're now in the main bar.

        // We don't show Xuất chip because it's now in the main bar, but keeping for logic consistency
        // if (filterState.xuat !== 'all') {
        //     chips.push({ id: 'xuat', label: 'Xuất', value: filterState.xuat, color: 'amber' });
        // }

        return chips;
    }, [filterState, uniqueFilterOptions]);

    const handleRemoveChip = (id: string) => {
        switch (id) {
            case 'kho': handleFilterChange({ kho: [] }); break;
            case 'trangThai': handleFilterChange({ trangThai: uniqueFilterOptions.trangThai }); break;
            case 'nguoiTao': handleFilterChange({ nguoiTao: uniqueFilterOptions.nguoiTao }); break;
            case 'department': handleFilterChange({ department: uniqueFilterOptions.department }); break;
            case 'xuat': handleFilterChange({ xuat: 'all' }); break;
        }
    };

    return (
        <>
            {/* Mobile Actions Portal */}
            {mounted && document.getElementById('mobile-topbar-actions') && createPortal(
                <div className="flex items-center gap-0.5">
                    {onNewFile && canManageFiles && (
                        <Button
                            variant="unstyled" size="none"
                            onClick={onNewFile}
                            title="Tải YCX lên"
                            className="flex items-center justify-center w-8 h-8 text-emerald-600 dark:text-emerald-400 rounded-lg transition-all active:scale-95 shrink-0"
                        >
                            <Icon name="upload" size={5} />
                        </Button>
                    )}
                    {onOpenHistory && canManageFiles && (
                        <Button
                            variant="unstyled" size="none"
                            onClick={onOpenHistory}
                            id="btn-mobile-history"
                            title="Quản lý tệp đã lưu"
                            className="flex items-center justify-center w-8 h-8 text-rose-600 dark:text-rose-400 rounded-lg transition-all active:scale-95 shrink-0"
                        >
                            <Icon name="database" size={5} />
                        </Button>
                    )}
                    <a
                        href="https://report.mwgroup.vn/home/dashboard/77"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Tải dữ liệu báo cáo (BCNB)"
                        className="flex items-center justify-center w-8 h-8 text-slate-400 dark:text-slate-500 rounded-lg transition-all active:scale-95 shrink-0"
                    >
                        <Icon name="link" size={5} />
                    </a>
                    <Button
                        variant="unstyled" size="none"
                        onClick={onToggleAdvanced}
                        title="Bộ lọc nâng cao"
                        className="flex items-center justify-center w-8 h-8 text-sky-600 dark:text-sky-400 rounded-lg transition-all active:scale-95 shrink-0"
                    >
                        <Icon name="settings" size={5} />
                    </Button>
                </div>,
                document.getElementById('mobile-topbar-actions')!
            )}
        </>
    );
};

export default FilterBar;
