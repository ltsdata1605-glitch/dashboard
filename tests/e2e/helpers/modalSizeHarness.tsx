/**
 * Harness chụp ảnh trước/sau A13 (kích thước Modal) — dựng TỪNG modal THẬT dùng cỡ `2xl`/`4xl` cũ
 * với props tối thiểu. Modal cần context của app (đăng nhập, dữ liệu…) sẽ lỗi → ErrorBoundary ghi
 * lại tên và bỏ qua (được liệt kê riêng trong báo cáo).
 */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';

export const MODALS: Record<string, () => Promise<Record<string, unknown>>> = {
    'DrillDownModal': () => import('../../../components/shared/DrillDownModal'),
    'PerformanceModal': () => import('../../../components/modals/PerformanceModal'),
    'UnconfiguredGroupsModal': () => import('../../../components/modals/UnconfiguredGroupsModal'),
    'ChangelogModal': () => import('../../../components/modals/ChangelogModal'),
    'EmployeeManagerModal': () => import('../../../components/modals/EmployeeManagerModal'),
    'FileHistoryModal': () => import('../../../components/modals/FileHistoryModal'),
    'CustomExploitationTabModal': () => import('../../../components/employees/modals/CustomExploitationTabModal'),
    'ColumnConfigModal': () => import('../../../components/employees/modals/ColumnConfigModal'),
    'HeadToHeadConfigModal': () => import('../../../components/employees/head-to-head/HeadToHeadConfigModal'),
    'WarehouseSettingsModal': () => import('../../../components/summary/WarehouseSettingsModal'),
    'KpiCardConfigModal': () => import('../../../components/kpis/modals/KpiCardConfigModal'),
    'phan-ca/GoogleSheetExportModal': () => import('../../../features/phan-ca/components/GoogleSheetExportModal'),
    'phan-ca/HelpModal': () => import('../../../features/phan-ca/components/HelpModal'),
    'phan-ca/AiSuggestPatternModal': () => import('../../../features/phan-ca/components/AiSuggestPatternModal'),
    'phan-ca/EditPatternModal': () => import('../../../features/phan-ca/components/EditPatternModal'),
    'phan-ca/SuggestionModal': () => import('../../../features/phan-ca/components/SuggestionModal'),
    'phan-ca/BusyReportModal': () => import('../../../features/phan-ca/components/BusyReportModal'),
    'phan-ca/ConflictListModal': () => import('../../../features/phan-ca/components/ConflictListModal'),
    'phan-ca/ImportStaffModal': () => import('../../../features/phan-ca/components/ImportStaffModal'),
    'sticker/SuperAdminModal': () => import('../../../features/sticker-event/SuperAdminModal'),
    'sticker/UserManagementModal': () => import('../../../features/sticker-event/UserManagementModal'),
    'sticker/PdfPreviewModal': () => import('../../../features/sticker-event/PdfPreviewModal'),
    'sticker/FilterModal': () => import('../../../features/sticker-event/FilterModal'),
    'sticker/UserGuideModal': () => import('../../../features/sticker-event/UserGuideModal'),
    'sticker/LayoutSelectionModal': () => import('../../../features/sticker-event/LayoutSelectionModal'),
    'sticker/SavedListsModal': () => import('../../../features/sticker-event/SavedListsModal'),
    'bi/AutoClickGuideModal': () => import('../../../features/bi-dashboard/components/AutoClickGuideModal'),
    'bi/BonusDataModal': () => import('../../../features/bi-dashboard/components/nhanvien/bonus/BonusDataModal'),
};

class Boundary extends React.Component<{ children: React.ReactNode; onError: (m: string) => void }, { err: boolean }> {
    state = { err: false };
    static getDerivedStateFromError() { return { err: true }; }
    componentDidCatch(e: Error) { this.props.onError(e.message); }
    render() { return this.state.err ? null : this.props.children; }
}

const noop = () => {};
// Props tối thiểu thường gặp — đủ cho modal chỉ hiển thị; thiếu thì Boundary bắt lỗi.
const PROPS: Record<string, unknown> = {
    isOpen: true, show: true, open: true, onClose: noop, onConfirm: noop, onSave: noop, onSelect: noop, onApply: noop,
    title: 'Tiêu đề mẫu', data: [], items: [], rows: [], employees: [], staff: [], lists: [], users: [], files: [],
    groups: [], conflicts: [], suggestions: [], patterns: [], columns: [], config: {}, settings: {}, filters: {},
};

const NV = [{ name: 'Nguyễn Văn An', department: 'Kho' }, { name: 'Trần Thị Bình', department: 'Thu ngân' }];
const ST = (id: string, name: string) => ({ id, name, gender: 'Nam', department: 'Kho', stats: { gh: 3, kho: 9, tn: 2, offDays: 4, swapCount: 1 }, schedule: [], changeHistory: [] });
const RULES = { gh: { '1': 1 }, kho: { '1': 1 }, tn: { '1': 1 }, ghGender: 'All', khoGender: 'All', tnGender: 'All' };
const LISTS = { allIndustries: ['ICT', 'Gia dụng'], allSubgroups: ['Smartphone', 'Laptop'], allManufacturers: ['Apple', 'Samsung'] };
const RIENG: Record<string, Record<string, unknown>> = {
    'UnconfiguredGroupsModal': { unconfiguredGroups: [{ nhomHang: '1491', nganhHang: 'ICT' }, { nhomHang: '4219', nganhHang: 'Phụ kiện' }], ignoredUnconfiguredGroups: [] },
    'FileHistoryModal': { registry: [{ id: 'f1', filename: 'Tháng 8/2026', rowCount: 182340, savedAt: Date.now(), isActive: true, minDate: Date.now() - 30 * 864e5, maxDate: Date.now(), uniqueDates: [] }] },
    'CustomExploitationTabModal': { ...LISTS, initialColumns: [] },
    'ColumnConfigModal': { ...LISTS, existingColumns: [] },
    'HeadToHeadConfigModal': { ...LISTS, existingTables: [] },
    'phan-ca/AiSuggestPatternModal': { departmentName: 'Kho', nams: NV, nus: NV, dailyRequirements: { '1': 2, '2': 2 }, rules: RULES },
    'phan-ca/EditPatternModal': { currentPatterns: { Kho: ['1', '2'] }, allDepartments: ['Kho', 'Thu ngân'], staffCountByDept: { Kho: 2 }, dailyRequirements: { '1': 2 }, onRequirementsUpdate: noop, shiftDefinitions: {}, onShiftDefinitionsUpdate: noop, nams: NV, nus: NV, rules: RULES },
    'phan-ca/SuggestionModal': { suggestions: [{ type: 'kho', dateString: '2026-09-30', highCountStaff: ST('a', 'Nguyễn Văn An'), lowCountStaff: ST('b', 'Trần Thị Bình') }], onAccept: noop },
    'phan-ca/BusyReportModal': { report: [{ staffId: 'a', staffName: 'Nguyễn Văn An', requests: { morning: 2, afternoon: 1, off: 3 }, resolved: { morning: 2, afternoon: 0, off: 3 }, unresolvedCount: 1 }] },
    'phan-ca/ImportStaffModal': { staffList: [{ id: 'a', name: 'Nguyễn Văn An', department: 'Kho' }, { id: 'b', name: 'Trần Thị Bình', department: 'Thu ngân' }], existingSupermarkets: ['ST 1234'] },
    'sticker/FilterModal': { inventory: [], filters: { maSieuThi: [], nganhHang: [], nhomHang: [], keyword: '' }, useInventoryQuantity: false, onFilterChange: noop, onClearFilters: noop, onUseInventoryQuantityChange: noop },
    'bi/BonusDataModal': { employee: { originalName: 'Nguyễn Văn An', name: 'Nguyễn Văn An', id: '19500' }, supermarketName: 'ST 1234' },
};

let root: Root | null = null;
export async function mountModal(name: string): Promise<string> {
    const mod = await MODALS[name]();
    const C = (mod.default || Object.values(mod).find(v => typeof v === 'function')) as React.ComponentType<Record<string, unknown>>;
    let el = document.getElementById('size-harness');
    if (!el) { el = document.createElement('div'); el.id = 'size-harness'; document.body.appendChild(el); }
    root?.unmount();
    root = createRoot(el);
    let loi = '';
    root.render(<Boundary onError={m => { loi = m; }}><C {...PROPS} {...(RIENG[name] || {})} /></Boundary>);
    await new Promise(r => setTimeout(r, 800));
    return loi;
}
