import React, { useMemo } from 'react';
import { MainTab, SubTab, shortenSupermarketName } from '../../utils/dashboardHelpers';
import { CameraIcon, SpinnerIcon, BuildingStorefrontIcon, ImagesIcon } from '../Icons';
import { Info, Zap, TrendingUp } from 'lucide-react';
import TimeProgressBar from '../nhanvien/shared/TimeProgressBar';
import { Button } from '../../../../components/shared/ui/Button';
import { Tabs } from '../../../../components/shared/ui/Tabs';
import { MultiSelectDropdown } from '../../../../components/shared/ui/MultiSelectDropdown';
import { MOBILE_GUTTER, TOUCH_TARGET } from '../../utils/mobileUi';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { getMonthProgress, extractDateFromData } from '../../services/metricService';

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
            <div className={`relative z-50 mb-4 flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-2 pb-2 border-b border-slate-200 dark:border-slate-800 w-full hide-on-export ${MOBILE_GUTTER}`}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <h2 className="text-lg lg:text-2xl font-normal text-slate-700 dark:text-slate-200 uppercase tracking-wide leading-normal py-0.5">
                        {title}
                    </h2>
                </div>
                <div className="flex flex-none justify-end hide-on-export shrink-0 ml-auto">
                    {/* Nhóm 2 bộ lọc trong 1 pill viền chung — đúng chuẩn hình số 2 (Tab Nhân viên).
                        BUG FIX: KHÔNG overflow-hidden — panel của MultiSelectDropdown (supermarket
                        selector bên dưới) định vị absolute, xổ ra NGOÀI khung pill; overflow-hidden
                        sẽ cắt mất panel dù dropdown vẫn "mở" trong state (không bấm chọn được gì) —
                        xem giải thích đầy đủ ở NhanVien.tsx, nơi bug này được user báo cáo trước. */}
                    <div className="flex flex-row items-center w-auto rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => setActiveMainTab(activeMainTab === 'realtime' ? 'cumulative' : 'realtime')}
                            className="min-h-11 sm:min-h-0 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-l-full border-r border-slate-200 dark:border-slate-700 text-[11px] sm:text-sm font-bold text-sky-700 dark:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors select-none cursor-pointer whitespace-nowrap shrink-0"
                            title="Bấm để chuyển đổi giữa Realtime và Luỹ kế"
                        >
                            <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-500 flex-shrink-0 animate-pulse" />
                            <span className="whitespace-nowrap">{activeMainTab === 'realtime' ? 'Realtime' : 'Luỹ kế'}</span>
                        </Button>
                        <MultiSelectDropdown
                            triggerClassName="rounded-r-full whitespace-nowrap"
                            icon={<BuildingStorefrontIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-500 flex-shrink-0" />}
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
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 relative rounded-none shadow-sm">
                {/* Sub-tabs row */}
                <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800/60 hide-on-export flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                    <Tabs
                        items={SUB_TABS.map(({ tab, label }) => ({ id: tab, label }))}
                        activeId={activeSubTab}
                        onChange={(id) => setActiveSubTab(id as SubTab)}
                        variant="underline"
                    />

                    {/* 2 nút Tự động Realtime & Tự động Luỹ kế nhỏ gọn: chỉ hiển thị trên màn hình < lg (trên laptop đã có floating dock nổi bên phải) */}
                    {onStartAutoSync && (
                        <div className="flex lg:hidden items-center gap-1.5 shrink-0 ml-auto pb-0.5">
                            {/* Nút Tự động Realtime */}
                            <Button
                                variant="unstyled"
                                size="none"
                                onClick={() => onStartAutoSync('realtime')}
                                title="Tự động thu thập dữ liệu Realtime từ MWG qua Tampermonkey"
                                className="min-h-7 sm:min-h-0 h-6.5 sm:h-7 flex items-center gap-1 px-2.5 py-1 text-[11px] sm:text-[11.5px] font-semibold rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer border border-amber-600/30 whitespace-nowrap"
                            >
                                <Zap className="h-3 w-3 text-amber-100 fill-amber-200 shrink-0" />
                                <span>Tự động Realtime</span>
                            </Button>

                            {/* Nút Tự động Luỹ kế */}
                            <Button
                                variant="unstyled"
                                size="none"
                                onClick={() => onStartAutoSync('luyke')}
                                title="Tự động thu thập dữ liệu Luỹ kế từ MWG qua Tampermonkey"
                                className="min-h-7 sm:min-h-0 h-6.5 sm:h-7 flex items-center gap-1 px-2.5 py-1 text-[11px] sm:text-[11.5px] font-semibold rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer border border-emerald-600/30 whitespace-nowrap"
                            >
                                <TrendingUp className="h-3 w-3 text-emerald-100 shrink-0" />
                                <span>Tự động Luỹ kế</span>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Content Title + Inline Actions + Quote + TimeProgressBar */}
                <div className="px-3 sm:px-5 py-2.5 sm:py-4">
                    {/* flex-wrap: trên iPhone cụm 5–6 nút icon (mỗi nút 44px) không còn chỗ chung hàng
                        với tiêu đề → tự xuống hàng riêng, dạt phải, thay vì ép tiêu đề gãy vụn. */}
                    <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                        <div className="min-w-0">
                            <h2 className="js-report-title text-base sm:text-2xl font-normal uppercase text-slate-800 dark:text-white leading-normal py-0.5">
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
                                variant="ghost" size="icon" className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 h-7.5 w-7.5 sm:h-8 sm:w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full shrink-0"
                                title="Xuất tất cả ảnh"
                            >
                                {isBatchExporting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <ImagesIcon className="h-4 w-4" />}
                            </Button>

                            {/* Single export */}
                            {onExport && (
                                <Button
                                    onClick={onExport}
                                    disabled={isExporting}
                                    variant="ghost" size="icon" className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 h-7.5 w-7.5 sm:h-8 sm:w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full shrink-0"
                                    title="Xuất ảnh"
                                >
                                    {isExporting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <CameraIcon className="h-5 w-5" />}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Dòng quote trên mobile. Trước ép 1 dòng ở cỡ 8.5px; lên sàn 11px thì 1 dòng không
                        chứa nổi → bị cắt "…NỖ L…". Cho xuống dòng để đọc trọn câu. */}
                    <p
                        className="sm:hidden text-[11px] uppercase text-slate-400 dark:text-slate-500 mt-1 font-normal leading-snug tracking-tight"
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
