import React, { useMemo } from 'react';
import { AppIcon } from '../../../../components/shared/ui/icon/AppIcon';
import { MainTab, SubTab, shortenSupermarketName } from '../../utils/dashboardHelpers';
import TimeProgressBar from '../nhanvien/shared/TimeProgressBar';
import { Button } from '../../../../components/shared/ui/Button';
import { Tabs } from '../../../../components/shared/ui/Tabs';
import { MultiSelectDropdown } from '../../../../components/shared/ui/MultiSelectDropdown';
import { MOBILE_GUTTER } from '../../utils/mobileUi';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { getMonthProgress, extractDateFromData } from '../../services/metricService';

import { AreaAutoExportButton } from '../../../../components/shared/export/AreaAutoExportButton';

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
    /** ID khu vực để cấu hình tự xuất Bot LINE (bcrt / bclk) */
    autoExportAreaId?: string;
    autoExportAreaName?: string;
    onTestAutoExport?: () => Promise<Blob | null>;
    /** Slot for tab-specific controls (e.g. column settings dropdown) */
    toolbarSlot?: React.ReactNode;
    /** Callback kích hoạt tự động thu thập từ Tampermonkey */
    onStartAutoSync?: (mode: 'realtime' | 'luyke') => void;
    /** Content to render inside the header container (e.g. merged table) */
    children?: React.ReactNode;
}

const SUB_TABS: { tab: SubTab; label: string }[] = [
    { tab: 'revenue', label: 'Doanh thu' },
    { tab: 'competition', label: 'Thi đua' },
];

const QUOTES: Record<SubTab, string> = {
    revenue: 'Doanh thu không tự đến — Doanh thu là kết quả của sự nỗ lực mỗi ngày.',
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
    autoExportAreaId, autoExportAreaName, onTestAutoExport,
    toolbarSlot,
    onStartAutoSync,
    children
}) => {
    // Defensive guard: IndexedDB on iOS/Safari can sometimes return null/undefined
    const supermarkets = Array.isArray(rawSupermarkets) ? rawSupermarkets : [];

    // Nhận diện ngày tháng từ dữ liệu Luỹ kế để tính đúng tiến độ thời gian (hỗ trợ tháng đã qua và ngày mùng 1)
    const [summaryLuyKeRaw] = useIndexedDBState<string>('summary-luy-ke', '');
    const dateContext = useMemo(() => extractDateFromData(summaryLuyKeRaw) || null, [summaryLuyKeRaw]);
    const monthProgress = useMemo(() => getMonthProgress(new Date(), dateContext), [dateContext]);

    // Tiêu đề cập nhật động theo chế độ Realtime / Luỹ kế và tab Doanh thu / Thi đua.
    const contentTitle = useMemo(() => {
        const isRealtime = activeMainTab === 'realtime';
        const smLabel = !activeSupermarket || activeSupermarket === 'Tổng'
            ? 'CỤM'
            : shortenSupermarketName(activeSupermarket).toUpperCase();

        if (isRealtime) {
            return `REALTIME NGÀY ${getDateLabel(true)} - ${smLabel}`;
        }
        const dateStr = monthProgress.day && monthProgress.month ? `${monthProgress.day}/${monthProgress.month}` : getDateLabel(false);
        return `LUỸ KẾ ĐẾN NGÀY ${dateStr} - ${smLabel}`;
    }, [activeMainTab, activeSupermarket, monthProgress]);

    return (
        <div className="space-y-0">
            {/* Row 1: Title + Segment Tabs (Realtime / Luỹ kế / Báo cáo) + Supermarket Selector */}
            <div className={`relative z-50 mb-3 flex flex-row flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5 pt-1 pb-1.5 border-b border-slate-200 dark:border-slate-800 w-full hide-on-export ${MOBILE_GUTTER}`}>
                {/* iPhone: tên phân hệ đã nằm trên segmented "Siêu thị | Nhân viên | Cập nhật" (BiWrapper) → không lặp lại tiêu đề IN HOA. */}
                <div className="hidden lg:flex items-center gap-2 sm:gap-3 min-w-0">
                    <h2 className="text-[17px] lg:text-[25px] font-normal text-slate-700 dark:text-slate-200 uppercase tracking-wide leading-normal py-0.5">
                        {title}
                    </h2>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2 hide-on-export min-w-0 w-full lg:w-auto lg:ml-auto">
                    {/* Realtime / Luỹ kế: thiết kế dạng Chip Pills độc lập chuẩn iOS / Zalo (Hình 1 & 2) */}
                    <Tabs
                        variant="chips"
                        size="sm"
                        activeId={activeMainTab}
                        onChange={(id) => setActiveMainTab(id as MainTab)}
                        items={[{ id: 'realtime', label: 'Realtime' }, { id: 'cumulative', label: 'Luỹ kế' }]}
                        className="shrink-0"
                    />
                    {/* Pill chọn siêu thị: con nhộng bo tròn đồng bộ với các chip tabs */}
                    <div className="flex flex-row items-center w-auto rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 h-7 sm:h-7.5">
                        <MultiSelectDropdown
                            triggerClassName="ycx-hit rounded-full whitespace-nowrap min-h-0 h-7 sm:h-7.5 px-2.5 sm:px-3 py-0 text-xs font-semibold text-slate-700 dark:text-slate-300"
                            icon={<AppIcon name="store" size="sm" className="text-sky-500 scale-90" />}
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
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 relative rounded-2xl shadow-xs overflow-hidden">
                {/* Sub-tabs row */}
                <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800/60 hide-on-export flex items-center justify-between gap-2">
                    <Tabs
                        items={SUB_TABS.map(({ tab, label }) => ({ id: tab, label }))}
                        activeId={activeSubTab}
                        onChange={(id) => setActiveSubTab(id as SubTab)}
                        variant="underline"
                    />
                </div>

                {/* Content Title + Inline Actions + Quote + TimeProgressBar */}
                <div className="px-3 sm:px-5 py-2.5 sm:py-4">
                    {/* flex-wrap: trên iPhone cụm 5–6 nút icon (mỗi nút 44px) không còn chỗ chung hàng
                        với tiêu đề → tự xuống hàng riêng, dạt phải, thay vì ép tiêu đề gãy vụn. */}
                    <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                        <div className="min-w-0">
                            <h2 className="js-report-title text-base sm:text-[25px] font-normal uppercase text-slate-800 dark:text-white leading-normal py-0.5">
                                {contentTitle}
                            </h2>
                            <p className="hidden sm:block text-[11px] uppercase tracking-wider text-slate-400 mt-1 font-normal leading-normal whitespace-nowrap">
                                {QUOTES[activeSubTab]}
                            </p>
                        </div>

                        {/* Right: Inline Actions [Lọc] [⚙️ Cột] [Công cụ thi đua] | [🖼️] [📷] */}
                        <div className="flex items-center gap-0.5 sm:gap-1 no-print shrink-0 mt-0.5 ml-auto">
                            {/* Portal target for inline filter from SummaryTableView */}
                            <div id="summary-table-inline-actions" className="flex items-center gap-0.5" />

                            {/* Column settings / extra controls portal target (for CompetitionView & SummaryTableView) */}
                            <div id="column-settings-portal" />

                            {/* Column settings slot (injected per tab) */}
                            {toolbarSlot}

                            {/* Divider */}
                            <div className="h-3.5 sm:h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

                            {/* Batch export */}
                            <Button
                                onClick={onBatchExport}
                                disabled={isBatchExporting}
                                variant="unstyled" size="none"
                                className={`ycx-hit flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-lg preserve-rounded transition-all duration-150 active:scale-[0.94] disabled:opacity-40 shrink-0 ${
                                    isBatchExporting
                                        ? 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-700 shadow-2xs font-semibold'
                                        : 'border border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title="Xuất tất cả ảnh"
                            >
                                {isBatchExporting ? <AppIcon name="loading" size="md" spin /> : <AppIcon name="exportBatch" size="md" />}
                            </Button>

                            {/* Single export */}
                            {onExport && (
                                <Button
                                    onClick={onExport}
                                    disabled={isExporting}
                                    variant="unstyled" size="none"
                                    className={`ycx-hit flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-lg preserve-rounded transition-all duration-150 active:scale-[0.94] disabled:opacity-40 shrink-0 ${
                                        isExporting
                                            ? 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-700 shadow-2xs font-semibold'
                                            : 'border border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                    title="Xuất ảnh"
                                >
                                    {isExporting ? <AppIcon name="loading" size="md" spin /> : <AppIcon name="exportImage" size="md" />}
                                </Button>
                            )}

                            {/* Cấu hình tự xuất ảnh cho Bot LINE (bcrt / bclk) */}
                            {autoExportAreaId && (
                                <AreaAutoExportButton
                                    areaId={autoExportAreaId}
                                    areaName={autoExportAreaName}
                                    onTestExport={onTestAutoExport}
                                />
                            )}
                        </div>
                    </div>

                    {/* Dòng quote trên mobile. Trước ép 1 dòng ở cỡ 8.5px; lên sàn 11px thì 1 dòng không
                        chứa nổi → bị cắt "…NỖ L…". Cho xuống dòng để đọc trọn câu.
                        GĐ6 (lỗi #24, video v2:066): khẩu hiệu IN HOA 2 dòng → dòng phụ viết như câu, 12px, xám, tối đa 2 dòng. */}
                    <p
                        className="sm:hidden type-footnote text-slate-500 dark:text-slate-400 mt-1 font-normal line-clamp-2"
                        title={QUOTES[activeSubTab]}
                    >
                        {QUOTES[activeSubTab]}
                    </p>

                    <TimeProgressBar
                        className="mt-2 sm:mt-2.5"
                        isRealtime={activeMainTab === 'realtime'}
                        customDaysPassed={monthProgress.daysPassed}
                        customTotalDays={monthProgress.daysInMonth}
                    />
                </div>

                {/* Children content (e.g. merged SummaryTableView) */}
                {children}
            </div>
        </div>
    );
};

export default DashboardHeader;
