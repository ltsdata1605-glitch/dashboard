import React, { useMemo } from 'react';
import { MainTab, SubTab, shortenSupermarketName } from '../../utils/dashboardHelpers';
import { CameraIcon, SpinnerIcon, BuildingStorefrontIcon, ImagesIcon, ClockIcon } from '../Icons';
import { Icon } from '../../../../components/common/Icon';
import TimeProgressBar from '../nhanvien/shared/TimeProgressBar';
import { Button } from '../../../../components/shared/ui/Button';
import { Tabs } from '../../../../components/shared/ui/Tabs';
import { MultiSelectDropdown } from '../../../../components/shared/ui/MultiSelectDropdown';

interface DashboardHeaderProps {
    title: string;
    activeMainTab: MainTab;
    setActiveMainTab: (tab: MainTab) => void;
    activeSubTab: SubTab;
    setActiveSubTab: (tab: SubTab) => void;
    supermarkets: string[];
    activeSupermarket: string;
    setActiveSupermarket: (sm: string) => void;
    onBatchExport: () => void;
    isBatchExporting: boolean;
    /** Single-table export callback */
    onExport?: () => void;
    isExporting?: boolean;
    /** Slot for tab-specific controls (e.g. column settings dropdown) */
    toolbarSlot?: React.ReactNode;
    /** Content to render inside the header container (e.g. merged table) */
    children?: React.ReactNode;
}

const SUB_TABS: { tab: SubTab; label: string }[] = [
    { tab: 'revenue', label: 'Doanh thu' },
    { tab: 'competition', label: 'Thi đua' },
];

const QUOTES: Record<SubTab, string> = {
    revenue: 'Doanh thu không tự đến — doanh thu là kết quả của sự nỗ lực mỗi ngày.',
    competition: 'Thi đua là động lực, hiệu quả là mục tiêu — vượt qua giới hạn, khẳng định bản thân.',
};

const getDateLabel = (isRealtime: boolean) => {
    const d = new Date();
    if (!isRealtime) {
        d.setDate(d.getDate() - 1);
    }
    return `${d.getDate()}/${d.getMonth() + 1}`;
};

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    title, activeMainTab, setActiveMainTab,
    activeSubTab, setActiveSubTab,
    supermarkets: rawSupermarkets, activeSupermarket, setActiveSupermarket,
    onBatchExport, isBatchExporting,
    onExport, isExporting,
    toolbarSlot,
    children
}) => {
    // Defensive guard: IndexedDB on iOS/Safari can sometimes return null/undefined
    const supermarkets = Array.isArray(rawSupermarkets) ? rawSupermarkets : [];

    // Chỉ hiển thị mốc ngày cập nhật — chế độ Realtime/Luỹ kế và Doanh thu/Thi đua
    // đã được thể hiện rõ qua các tab đang active phía trên, không cần nhắc lại.
    const contentTitle = useMemo(() => {
        const isRealtime = activeMainTab === 'realtime';
        return `CẬP NHẬT ĐẾN NGÀY ${getDateLabel(isRealtime)}`;
    }, [activeMainTab]);

    return (
        <div className="space-y-0">
            {/* Row 1: Title + Segment Tabs (Realtime / Luỹ kế / Báo cáo) + Supermarket Selector */}
            <div className="relative z-50 mb-4 flex flex-row items-center justify-between gap-3 pt-2 pb-2 border-b border-slate-200 dark:border-slate-800 w-full hide-on-export">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-sky-600/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <Icon name="bar-chart-3" size={4.5} className="sm:hidden" />
                        <Icon name="bar-chart-3" size={5} className="hidden sm:block" />
                    </div>
                    <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight truncate leading-tight">
                        {title}
                    </h2>
                </div>
                <div className="flex flex-none justify-end hide-on-export">
                    {/* Nhóm 2 bộ lọc trong 1 pill viền chung — đúng chuẩn hình số 2 (Tab Nhân viên) */}
                    <div className="flex flex-col sm:flex-row w-full sm:w-auto rounded-lg sm:rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-700">
                            <ClockIcon className="h-4 w-4 text-sky-500 flex-shrink-0" />
                            <Button
                                variant="ghost"
                                onClick={() => setActiveMainTab('realtime')}
                                className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-xs sm:text-sm font-bold transition-colors ${activeMainTab === 'realtime' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`}
                            >
                                Realtime
                            </Button>
                            <span className="text-slate-300 dark:text-slate-600">/</span>
                            <Button
                                variant="ghost"
                                onClick={() => setActiveMainTab('cumulative')}
                                className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-xs sm:text-sm font-bold transition-colors ${activeMainTab === 'cumulative' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`}
                            >
                                Luỹ kế
                            </Button>
                        </div>
                        <MultiSelectDropdown
                            icon={<BuildingStorefrontIcon className="h-4 w-4 text-sky-500 flex-shrink-0" />}
                            triggerLabel={activeSupermarket === 'Tổng' ? 'CỤM' : shortenSupermarketName(activeSupermarket)}
                            count={activeSupermarket === 'Tổng' ? supermarkets.length : 1}
                            allLabel="Chọn tất cả"
                            allChecked={activeSupermarket === 'Tổng'}
                            onToggleAll={() => setActiveSupermarket('Tổng')}
                            options={Array.from(new Map(supermarkets.map(sm => [shortenSupermarketName(sm), sm])).values()).map(sm => ({
                                key: sm,
                                label: shortenSupermarketName(sm),
                                checked: activeSupermarket === sm,
                            }))}
                            onToggleOption={(key) => setActiveSupermarket(key === activeSupermarket ? 'Tổng' : key)}
                        />
                    </div>
                </div>
            </div>

            {/* Row 2: Bordered container with Tabs + Action Bar + Title/Quote */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 overflow-hidden rounded-none lg:rounded-2xl shadow-sm">
                {/* Sub-tabs row */}
                <div className="px-4 sm:px-5 pt-3 hide-on-export">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tiêu chí đánh giá hiệu quả</p>
                    <Tabs
                        items={SUB_TABS.map(({ tab, label }) => ({ id: tab, label }))}
                        activeId={activeSubTab}
                        onChange={(id) => setActiveSubTab(id as SubTab)}
                        variant="underline"
                    />
                </div>

                {/* Action bar — matching NhanVien toolbar */}
                <div className="flex items-center justify-end px-4 py-2 bg-white dark:bg-slate-800 no-print border-b border-slate-200 dark:border-slate-700 relative z-10">

                    {/* Right: [⚙️ Column settings] | [🖼️ Batch export] [📷 Export] */}
                    <div className="flex items-center gap-1">
                        {/* Column settings portal target */}
                        <div id="column-settings-portal" />

                        {/* Column settings slot (injected per tab) */}
                        {toolbarSlot}

                        {/* Divider */}
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                        {/* Batch export */}
                        <Button
                            onClick={onBatchExport}
                            disabled={isBatchExporting}
                            variant="ghost" size="icon" className="h-7 w-7 text-slate-400"
                            title="Xuất tất cả ảnh"
                        >
                            {isBatchExporting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <ImagesIcon className="h-4 w-4" />}
                        </Button>

                        {/* Single export */}
                        {onExport && (
                            <Button
                                onClick={onExport}
                                disabled={isExporting}
                                variant="ghost" size="icon" className="h-7 w-7 text-slate-400"
                                title="Xuất ảnh"
                            >
                                {isExporting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <CameraIcon className="h-4 w-4" />}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Content Title + Quote + TimeProgressBar — like NhanVien's RevenueTab */}
                <div className="px-4 sm:px-5 py-3 sm:py-4">
                    <div className="flex items-start justify-between gap-2">
                        <h2 className="js-report-title text-lg sm:text-2xl font-black uppercase text-slate-800 dark:text-white leading-tight">
                            {contentTitle}
                        </h2>
                        {/* Portal target for inline filter/settings buttons from SummaryTableView */}
                        <div id="summary-table-inline-actions" className="flex items-center gap-0.5 no-print shrink-0" />
                    </div>
                    <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 mt-1 font-bold leading-snug">
                        {QUOTES[activeSubTab]}
                    </p>
                    <TimeProgressBar className="mt-2.5" />
                </div>

                {/* Children content (e.g. merged SummaryTableView) */}
                {children}
            </div>
        </div>
    );
};

export default DashboardHeader;
