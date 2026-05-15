import React from 'react';
import { MainTab, SubTab, shortenSupermarketName } from '../../utils/dashboardHelpers';
import { CameraIcon, SpinnerIcon } from '../Icons';
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

const TABS: { tab: SubTab; label: string }[] = [
    { tab: 'revenue', label: 'Doanh thu' },
    { tab: 'competition', label: 'Thi đua' },
];

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    title, activeMainTab, setActiveMainTab,
    activeSubTab, setActiveSubTab,
    supermarkets, activeSupermarket, setActiveSupermarket,
    onBatchExport, isBatchExporting
}) => {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-4 mt-2 sm:mt-4 max-w-full overflow-hidden">
            {/* Top Row: Title & Selectors */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-start px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-700 gap-4">
                <div className="flex flex-col items-start leading-none">
                    <span className="js-report-title text-2xl sm:text-3xl font-black uppercase text-slate-800 dark:text-white mt-1 tracking-tight">
                        {title}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 mt-2 font-bold">
                        Realtime & Luỹ kế tháng
                    </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    {/* Supermarket Dropdown */}
                    <div className="relative flex items-center border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 hover:border-sky-300 transition-colors h-9">
                        <Icon name="home" size={4} className="ml-3 text-sky-600 dark:text-sky-400" />
                        <select 
                            value={activeSupermarket}
                            onChange={(e) => setActiveSupermarket(e.target.value)}
                            className="appearance-none bg-transparent outline-none pl-2 pr-8 text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer h-full"
                        >
                            <option value="Tổng">CỤM</option>
                            {supermarkets.map(sm => (
                                <option key={sm} value={sm}>{shortenSupermarketName(sm)}</option>
                            ))}
                        </select>
                        <Icon name="chevron-down" size={4} className="text-slate-400 absolute right-3 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Bottom Row: Tabs & Toggles */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between px-4 sm:px-6 pt-3 pb-0">
                <div className="flex flex-col w-full sm:w-auto overflow-hidden">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 shrink-0">
                        Tiêu chí đánh giá hiệu quả
                    </div>
                    <div className="flex gap-6 overflow-x-auto scrollbar-hide">
                        {TABS.map(({ tab, label }) => {
                            const isActive = activeSubTab === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveSubTab(tab)}
                                    className={`pb-3 text-[12px] font-bold uppercase transition-all whitespace-nowrap border-b-2 shrink-0 ${
                                        isActive 
                                            ? 'border-sky-500 text-sky-600 dark:text-sky-400' 
                                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto py-3 sm:py-0 sm:pb-2 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 mt-2 sm:mt-0 shrink-0">
                    {/* View Toggle */}
                    <button
                        onClick={() => setActiveMainTab(activeMainTab === 'realtime' ? 'cumulative' : 'realtime')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-[11px] font-bold"
                    >
                        <Icon name="clock" size={3.5} className="text-slate-400" />
                        {activeMainTab === 'realtime' ? 'ĐANG XEM: REALTIME' : 'ĐANG XEM: LUỸ KẾ'}
                    </button>

                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                    {/* Export */}
                    <button
                        onClick={onBatchExport}
                        disabled={isBatchExporting}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50 ml-auto sm:ml-0"
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
