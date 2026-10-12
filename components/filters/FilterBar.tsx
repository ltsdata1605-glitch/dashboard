import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveTab } from '../../contexts/LayoutContext';
import { usePageActions } from '../shared/ui/PageActions';

interface FilterBarProps {
    onToggleAdvanced: () => void;
    onNewFile?: () => void;
    onOpenHistory?: () => void;
    hasSalesData?: boolean;
    onClearSalesData?: () => void;
    salesClearTitle?: string;
}

/** Trang báo cáo 77 (YCX) của MWG — nơi tải file dữ liệu về để nạp vào Phân tích. */
const BCNB_URL = 'https://report.mwgroup.vn/home/dashboard/77';

/**
 * Nút của Phân tích trên THANH TRÊN iPhone (GĐ4, KE_HOACH_GIAO_DIEN_APPLE.md mục 3.2): khai báo cho khung app bằng
 * `usePageActions` thay vì portal 5 nút 32px vào `#mobile-topbar-actions` (đè chuông, đẩy trang tràn ngang ở iPhone SE — lỗi #1).
 * Khung app xếp: [Tải YCX lên] [Bộ lọc] [⋯ Mở báo cáo BCNB · Quản lý tệp đã lưu · — Xoá dữ liệu YCX]. Laptop giữ cụm nút nhóm
 * của Header.tsx (scope 'mobile'). Bộ lọc thời gian/kho nằm ở thanh lọc trong trang (FilterSection).
 *
 * Nhân viên chỉ xem dữ liệu thừa kế từ quản lý (implementation_plan.md mục 37) — không tự tải file / quản lý tệp; Header.tsx
 * (laptop) chặn đúng các vai trò này nên ở đây cũng vậy.
 */
const FilterBar: React.FC<FilterBarProps> = ({
    onToggleAdvanced,
    onNewFile,
    onOpenHistory,
    hasSalesData,
    onClearSalesData,
    salesClearTitle
}) => {
    const { userRole } = useAuth();
    const canManageFiles = userRole === 'admin' || userRole === 'manager';
    const { activeTab } = useActiveTab();

    usePageActions(activeTab === 'analysis' ? {
        scope: 'mobile',
        title: 'Phân tích',
        primary: onNewFile && canManageFiles
            ? { id: 'tai-ycx', label: 'Tải YCX lên', icon: 'upload', onClick: onNewFile }
            : undefined,
        quick: [{ id: 'bo-loc', label: 'Bộ lọc nâng cao', icon: 'viewOptions', onSelect: onToggleAdvanced }],
        items: [
            {
                id: 'bcnb', label: 'Mở báo cáo BCNB', description: 'Tải file YCX từ report.mwgroup.vn', icon: 'externalLink',
                onSelect: () => { window.open(BCNB_URL, '_blank', 'noopener,noreferrer'); },
            },
            ...(onOpenHistory && canManageFiles
                ? [{ id: 'lich-su', label: 'Quản lý tệp đã lưu', icon: 'database' as const, onSelect: onOpenHistory }]
                : []),
            ...(hasSalesData && onClearSalesData
                ? [{ id: 'xoa-ycx', label: salesClearTitle || 'Xoá dữ liệu YCX', icon: 'delete' as const, destructive: true, onSelect: onClearSalesData }]
                : []),
        ],
    } : null);

    return null;
};

export default FilterBar;
