import React, { useMemo } from 'react';
import { MainTab, SubTab, shortenSupermarketName } from '../../utils/dashboardHelpers';
import { CameraIcon, SpinnerIcon, BuildingStorefrontIcon, ChevronDownIcon, ImagesIcon } from '../Icons';
import { Icon } from '../../../components/common/Icon';
import TimeProgressBar from '../nhanvien/shared/TimeProgressBar';
import { Button } from '../../../components/shared/ui/Button';

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

    const contentTitle = useMemo(() => {
        const isRealtime = activeMainTab === 'realtime';
        const typePart = activeSubTab === 'revenue' ? 'DOANH THU' : 'THI ĐUA';
        const modePart = isRealtime ? 'REALTIME' : 'LUỸ KẾ';
        
        return `${modePart} ${typePart} ĐẾN NGÀY ${getDateLabel(isRealtime)}`;
    }, [activeSubTab, activeMainTab, activeSupermarket]);

    return (
        <div className="space-y-0">
            {/* Row 1: Title + Supermarket Selector — matches NhanVien style */}
            <div className="relative z-20 mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-3 pb-1 border-b border-slate-200 dark:border-slate-800 w-full hide-on-export">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white uppercase">
                        {title}
                    </h1>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 pb-2">
                        Realtime & Luỹ kế tháng
                    </p>
                </div>
                <div className="flex flex-1 sm:flex-none flex-row gap-2 sm:gap-3 w-full sm:w-auto justify-end hide-on-export">
                    {/* Supermarket Selector — same style as NhanVien */}
                    <div className="relative w-full sm:w-auto min-w-0">
                        <div className="w-full h-full flex items-center justify-between gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all outline-none whitespace-nowrap">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                <BuildingStorefrontIcon className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                                <select 
                                    value={activeSupermarket}
                                    onChange={(e) => setActiveSupermarket(e.target.value)}
                                    className="appearance-none bg-transparent outline-none cursor-pointer text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 pr-6 truncate max-w-[100px] sm:max-w-[160px]"
                                >
                                    <option value="Tổng">CỤM</option>
                                    {supermarkets?.map(sm => (
                                        <option key={sm} value={sm}>{shortenSupermarketName(sm)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5">{supermarkets.length}</span>
                                <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Bordered container with Tabs + Action Bar + Title/Quote */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                {/* Sub-tabs row */}
                <div className="border-b border-slate-200 dark:border-slate-700 px-4 sm:px-5 pt-3 hide-on-export">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tiêu chí đánh giá hiệu quả</p>
                    <nav className="flex items-center gap-0 overflow-x-auto hide-scrollbar w-full sm:w-auto -mb-px">
                        {SUB_TABS.map(({ tab, label }) => {
                            const isActive = activeSubTab === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveSubTab(tab)}
                                    className={`
                                        flex-1 sm:flex-none px-5 py-2.5 text-[12px] uppercase tracking-wider transition-all duration-200 whitespace-nowrap border-b-2
                                        ${isActive
                                            ? 'font-black text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                                            : 'font-bold text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300'
                                        }
                                    `}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Action bar — matching NhanVien toolbar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-800 no-print border-b border-slate-200 dark:border-slate-700 relative z-50">
                    {/* Left: Realtime / Luỹ kế toggle */}
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
                        <button
                            onClick={() => setActiveMainTab('realtime')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold whitespace-nowrap transition-colors ${
                                activeMainTab === 'realtime'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            Realtime
                        </button>
                        <button
                            onClick={() => setActiveMainTab('cumulative')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold whitespace-nowrap transition-colors ${
                                activeMainTab === 'cumulative'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            Luỹ kế
                        </button>
                    </div>

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
                    <h2 className="js-report-title text-lg sm:text-2xl font-black uppercase text-slate-800 dark:text-white leading-tight">
                        {contentTitle}
                    </h2>
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
