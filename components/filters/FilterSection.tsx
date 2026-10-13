import React, { useState, useEffect } from 'react';
import { resolveIconName } from '../shared/ui/icon/legacyIconNames';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import type { VisibilityState } from '../../types';
import { toLocalISOString, getRowValue } from '../../utils/dataUtils';
import { COL } from '../../constants';
import { useDashboardContext } from '../../contexts/DashboardContext';
import StringMultiSelect from '../shared/ui/StringMultiSelect';
import GtdhTargetModal from '../modals/GtdhTargetModal';
import EmployeeManagerModal from '../modals/EmployeeManagerModal';
import { useAuth } from '../../contexts/AuthContext';
import { useSync } from '../../contexts/SyncContext';
import { Button } from '../shared/ui/Button';
import { Switch } from '../shared/ui/Switch';
import { Tabs } from '../shared/ui/Tabs';
import { ListGroup, ListRow, type ListIconTone } from '../shared/ui/ListGroup';
import { toast } from '../shared/ui/toast';

/** Tiêu đề nhóm + khung trắng bo kiểu "inset grouped" của iOS (nhóm có ô nhập/dropdown — không phải hàng danh sách). */
const NhomTuyChinh: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <section>
        <h3 className="px-4 pb-1.5 text-[13px] leading-[18px] text-slate-500">{title}</h3>
        <div className={`rounded-popup bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-3 ${className ?? ''}`}>{children}</div>
    </section>
);

/** Nhãn ô lọc: chữ thường 13px xám (bỏ IN HOA + ô icon màu mỗi ô một màu). */
const NhanO: React.FC<{ children: React.ReactNode; htmlFor?: string }> = ({ children, htmlFor }) => (
    <label htmlFor={htmlFor} className="block mb-1 text-[13px] lg:text-xs leading-[18px] text-slate-500 dark:text-slate-400">{children}</label>
);

/** Ngày dạng YYYY-MM-DD → dd/mm/yyyy (toast). */
const ngayVN = (iso: string) => iso.split('-').reverse().join('/');

interface FilterSectionProps {
    options: { kho: string[]; trangThai: string[]; nguoiTao: string[]; department: string[] };
    visibility: VisibilityState;
    onVisibilityChange: (component: keyof VisibilityState, isVisible: boolean) => void;
    onClose: () => void;
    onLoadShiftFile?: () => void;
    hasDepartmentData?: boolean;
    onClearDepartments?: () => void;
    isClearingDepartments?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({ 
    options, 
    visibility, 
    onVisibilityChange, 
    onClose,
    onLoadShiftFile,
    hasDepartmentData,
    onClearDepartments,
    isClearingDepartments
}) => {
    const { userRole } = useAuth();
    const { forceSync } = useSync();
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [deptClearSuccess, setDeptClearSuccess] = useState(false);

    const handleDeptClear = () => {
        if (onClearDepartments) {
            onClearDepartments();
            setDeptClearSuccess(true);
            setTimeout(() => setDeptClearSuccess(false), 3000);
        }
    };
    const {
        filterState: globalFilters,
        handleFilterChange: applyGlobalFilters,
        originalData: allData,
        availableMonths,
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
         const allTrangThai = [...new Set(allData.map(r => getRowValue(r, COL.TRANG_THAI)).filter(Boolean))];
         const allNguoiTao = [...new Set(allData.map(r => getRowValue(r, COL.NGUOI_TAO)).filter(Boolean))];
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

    // Lỗi #8 (video v1:064–079): từng cho chọn "Từ 17/10 → Đến 16/10" rồi cả trang trống trơn không một lời giải thích.
    // Nay ô ngày có min/max (bộ chọn iOS tự chặn), và nếu vẫn chọn ngược (gõ tay, đổi đầu kia) thì kéo đầu kia theo — như lịch iOS
    // dời giờ kết thúc khi dời giờ bắt đầu — và báo rõ bằng toast.
    const handleDateChange = (type: 'startDate' | 'endDate', value: string) => {
        const next: Partial<typeof globalFilters> = { [type]: value, dateRange: '', selectedMonths: [] };
        const start = type === 'startDate' ? value : localFilters.startDate;
        const end = type === 'endDate' ? value : localFilters.endDate;
        if (start && end && start > end) {
            if (type === 'startDate') next.endDate = value; else next.startDate = value;
            toast.info(type === 'startDate'
                ? `"Đến ngày" được dời theo thành ${ngayVN(value)} — khoảng ngày không thể kết thúc trước khi bắt đầu.`
                : `"Từ ngày" được dời theo thành ${ngayVN(value)} — khoảng ngày không thể bắt đầu sau khi kết thúc.`,
                { id: 'khoang-ngay-dao' });
        }
        updateLocalFilter(next);
    };
    
    const handleDropdownChange = (type: string, selected: string[]) => {
        updateLocalFilter({ [type]: selected });
    }

    const [isGtdhModalOpen, setGtdhModalOpen] = useState(false);

    const visibilityOptions: { key: keyof VisibilityState; label: string; icon: string; tone: ListIconTone }[] = [
        { key: 'trendChart', label: 'Xu hướng doanh thu', icon: 'area-chart', tone: 'sky' },
        { key: 'industryGrid', label: 'Tỷ trọng ngành hàng', icon: 'layout-grid', tone: 'emerald' },
        { key: 'employeeAnalysis', label: 'Phân tích nhân viên', icon: 'users-round', tone: 'rose' },
        { key: 'summaryTable', label: 'Bảng chi tiết', icon: 'table', tone: 'amber' },
    ];

    const handleSubmit = () => {
        applyGlobalFilters(localFilters);
        onClose();
    };

    const laQuanLy = userRole === 'admin' || userRole === 'manager';

    return (
        // GĐ5 (KE_HOACH_GIAO_DIEN_APPLE.md lỗi #8, #16): bảng Tuỳ chỉnh kiểu Cài đặt iOS — nền xám nhóm, tiêu đề viết thường, nhóm
        // trắng bo góc; công tắc dùng chung (một màu, trước mỗi cái một màu); khoảng nhanh là segmented control; ô ngày 16px trên
        // điện thoại (Safari không tự phóng to) và có ràng buộc Từ ≤ Đến.
        <div className="flex flex-col h-full w-full min-w-0 overflow-x-hidden bg-slate-100 dark:bg-slate-950">
            {/* Đầu bảng */}
            <div className="flex items-center justify-between gap-2 pl-4 pr-1.5 min-h-[52px] border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
                <h2 className="type-headline font-semibold text-slate-900 dark:text-white">Tuỳ chỉnh</h2>
                <div className="flex items-center">
                    <Button
                        variant="unstyled" size="none"
                        onClick={handleResetFilters}
                        title="Đặt lại bộ lọc"
                        className="min-h-11 lg:min-h-9 px-2.5 text-[15px] lg:text-sm text-sky-600 active:opacity-60 hover:text-sky-700"
                    >
                        Đặt lại
                    </Button>
                    <Button
                        variant="unstyled" size="none"
                        onClick={onClose}
                        aria-label="Đóng"
                        className="min-h-11 min-w-11 lg:min-h-9 lg:min-w-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 active:bg-slate-200/70"
                    >
                        <AppIcon name="close" size="md" />
                    </Button>
                </div>
            </div>

            {/* Thân */}
            <div className="flex-grow min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain custom-scrollbar pb-20">
                <div className="p-4 space-y-6 [&>*]:min-w-0">

                    {/* Nhân viên & phân ca (quản lý) */}
                    {laQuanLy && (
                        <ListGroup title="Nhân viên & phân ca">
                            <ListRow
                                icon="settings" iconTone="emerald"
                                label="Quản lý ca kíp"
                                description={hasDepartmentData ? 'Xem chi tiết ca kíp' : 'Chưa có dữ liệu ca'}
                                disabled={!hasDepartmentData}
                                onClick={() => hasDepartmentData && setShowEmployeeModal(true)}
                            />
                            <ListRow icon="cloudUpload" iconTone="sky" label="Nhập file Excel phân ca" onClick={() => onLoadShiftFile?.()} />
                            <ListRow
                                icon="externalLink" iconTone="slate"
                                label="Lấy danh sách phân ca"
                                description="Mở ERP TGDĐ (office.thegioididong.com)"
                                onClick={() => { window.open('https://office.thegioididong.com/quan-ly-phan-ca', '_blank', 'noopener,noreferrer'); }}
                            />
                            <ListRow
                                icon={deptClearSuccess ? 'check' : 'delete'}
                                destructive={!deptClearSuccess}
                                label={deptClearSuccess ? 'Đã xoá dữ liệu phân ca' : 'Xoá dữ liệu phân ca'}
                                disabled={!hasDepartmentData || isClearingDepartments}
                                onClick={handleDeptClear}
                                chevron={false}
                            />
                        </ListGroup>
                    )}

                    {/* Bộ lọc */}
                    <NhomTuyChinh title="Bộ lọc" className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
                        <div>
                            <NhanO>Kho tạo</NhanO>
                            <StringMultiSelect
                                label="Kho Tạo"
                                options={options.kho}
                                selected={localFilters.kho}
                                onChange={(sel) => updateLocalFilter({ kho: sel })}
                                variant="compact"
                            />
                        </div>
                        <div>
                            <NhanO>Tháng</NhanO>
                            <StringMultiSelect
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
                        <div>
                            <NhanO>Người tạo</NhanO>
                            <StringMultiSelect
                                label="Người Tạo"
                                options={options.nguoiTao}
                                selected={localFilters.nguoiTao}
                                onChange={(sel) => updateLocalFilter({ nguoiTao: sel })}
                                variant="compact"
                            />
                        </div>
                        <div>
                            <NhanO>Trạng thái hồ sơ</NhanO>
                            <StringMultiSelect
                                label="Trạng thái hồ sơ"
                                options={options.trangThai}
                                selected={localFilters.trangThai}
                                onChange={(sel) => updateLocalFilter({ trangThai: sel })}
                                variant="compact"
                            />
                        </div>
                        <div className="col-span-2">
                            <NhanO>Trạng thái xuất</NhanO>
                            <StringMultiSelect
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
                        {options.department.length > 0 && (
                            <div className="col-span-2">
                                <NhanO>Bộ phận</NhanO>
                                <StringMultiSelect
                                    label="Bộ phận"
                                    options={options.department}
                                    selected={localFilters.department}
                                    onChange={(sel) => updateLocalFilter({ department: sel })}
                                    variant="compact"
                                />
                            </div>
                        )}
                    </NhomTuyChinh>

                    {/* Khoảng thời gian */}
                    <NhomTuyChinh title="Khoảng thời gian" className="space-y-3">
                        <Tabs
                            variant="segment"
                            fullWidth
                            className="[&>button]:px-2"
                            activeId={localFilters.dateRange || ''}
                            onChange={handleDateRangeClick}
                            items={[
                                { id: 'today', label: 'Hôm nay' },
                                { id: 'yesterday', label: 'Hôm qua' },
                                { id: 'week', label: 'Tuần' },
                                { id: 'month', label: 'Tháng' },
                                { id: 'all', label: 'Tất cả' },
                            ]}
                        />
                        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
                            <div>
                                <NhanO htmlFor="loc-tu-ngay">Từ ngày</NhanO>
                                <input
                                    id="loc-tu-ngay"
                                    type="date"
                                    value={localFilters.startDate}
                                    max={localFilters.endDate || undefined}
                                    onChange={e => handleDateChange('startDate', e.target.value)}
                                    className="w-full min-w-0 max-w-full appearance-none h-11 lg:h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-control text-base lg:text-sm px-2.5 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors outline-none"
                                />
                            </div>
                            <div>
                                <NhanO htmlFor="loc-den-ngay">Đến ngày</NhanO>
                                <input
                                    id="loc-den-ngay"
                                    type="date"
                                    value={localFilters.endDate}
                                    min={localFilters.startDate || undefined}
                                    onChange={e => handleDateChange('endDate', e.target.value)}
                                    className="w-full min-w-0 max-w-full appearance-none h-11 lg:h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-control text-base lg:text-sm px-2.5 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors outline-none"
                                />
                            </div>
                        </div>
                    </NhomTuyChinh>

                    {/* Hiển thị các khu vực */}
                    <ListGroup title="Hiển thị các khu vực">
                        {visibilityOptions.map(opt => {
                            const bat = !!visibility[opt.key];
                            return (
                                <ListRow
                                    key={opt.key}
                                    icon={resolveIconName(opt.icon) ?? 'help'}
                                    iconTone={opt.tone}
                                    label={opt.label}
                                    trailing={<Switch checked={bat} onChange={(v) => onVisibilityChange(opt.key, v)} label={opt.label} />}
                                />
                            );
                        })}
                    </ListGroup>

                    {/* Cấu hình */}
                    <ListGroup title="Cấu hình">
                        <ListRow
                            icon="target" iconTone="sky"
                            label="Mục tiêu GTĐH"
                            description="Thêm, sửa, xoá mục tiêu AOV"
                            onClick={() => setGtdhModalOpen(true)}
                        />
                    </ListGroup>
                </div>
            </div>

            <GtdhTargetModal
                isOpen={isGtdhModalOpen}
                onClose={() => {
                    setGtdhModalOpen(false);
                    forceSync().catch(console.error);
                }}
            />

            <EmployeeManagerModal
                isOpen={showEmployeeModal}
                onClose={() => {
                    setShowEmployeeModal(false);
                    forceSync().catch(console.error);
                }}
            />
        </div>
    );
};

export default FilterSection;
