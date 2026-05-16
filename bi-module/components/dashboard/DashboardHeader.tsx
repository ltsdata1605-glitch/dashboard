import React from 'react';
import { MainTab, SubTab, shortenSupermarketName } from '../../utils/dashboardHelpers';
import { CameraIcon, SpinnerIcon, BuildingStorefrontIcon, ChevronDownIcon } from '../Icons';
import { Icon } from '../../../components/common/Icon';

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
}

const SUB_TABS: { tab: SubTab; label: string }[] = [
    { tab: 'revenue', label: 'Doanh thu' },
    { tab: 'competition', label: 'Thi đua' },
];

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    title, activeMainTab, setActiveMainTab,
    activeSubTab, setActiveSubTab,
    supermarkets: rawSupermarkets, activeSupermarket, setActiveSupermarket,
    onBatchExport, isBatchExporting
}) => {
    // Defensive guard: IndexedDB on iOS/Safari can sometimes return null/undefined
    const supermarkets = Array.isArray(rawSupermarkets) ? rawSupermarkets : [];

    return (
        <div className="space-y-0">
            {/* Row 1: Title + Supermarket Selector — matches NhanVien style */}
            <div className="relative z-20 mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-3 pb-1 border-b border-slate-200 dark:border-slate-800 w-full">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white uppercase">
                        {title}
                    </h1>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 pb-2">
                        Realtime & Luỹ kế tháng
                    </p>
                </div>
                <div className="flex flex-1 sm:flex-none flex-row gap-2 sm:gap-3 w-full sm:w-auto justify-end">
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

            {/* Row 2: Sub Tabs + View Toggle + Export — inside a bordered container like NhanVien */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-700 px-4 sm:px-5 pt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tiêu chí đánh giá hiệu quả</p>
                    <div className="flex items-end justify-between -mb-px">
                        <nav className="flex items-center gap-0 overflow-x-auto hide-scrollbar w-full sm:w-auto">
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

                        {/* Right side: View toggle + Export */}
                        <div className="hidden sm:flex items-center gap-3 pb-2 shrink-0">
                            <button
                                onClick={() => setActiveMainTab(activeMainTab === 'realtime' ? 'cumulative' : 'realtime')}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-[11px] font-bold whitespace-nowrap"
                            >
                                <Icon name="clock" size={3.5} className="text-slate-400" />
                                {activeMainTab === 'realtime' ? 'Cùng kỳ' : 'Cùng kỳ'}
                            </button>

                            <button
                                onClick={onBatchExport}
                                disabled={isBatchExporting}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                                title="Xuất tất cả ảnh"
                            >
                                {isBatchExporting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <CameraIcon className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile-only: View toggle + Export (below tabs) */}
                <div className="flex sm:hidden items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => setActiveMainTab(activeMainTab === 'realtime' ? 'cumulative' : 'realtime')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold"
                    >
                        <Icon name="clock" size={3.5} className="text-slate-400" />
                        {activeMainTab === 'realtime' ? 'ĐANG XEM: REALTIME' : 'ĐANG XEM: LUỸ KẾ'}
                    </button>

                    <button
                        onClick={onBatchExport}
                        disabled={isBatchExporting}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                        title="Xuất tất cả ảnh"
                    >
                        {isBatchExporting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <CameraIcon className="h-4 w-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DashboardHeader;
