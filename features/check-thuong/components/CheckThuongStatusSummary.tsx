import React from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { CheckThuongGroupDef, CheckThuongViewMode } from '../types';

interface CheckThuongStatusSummaryProps {
    groups: CheckThuongGroupDef[];
    totalCount: number;
    activeFilter: string; // 'all' or group key
    onSelectFilter: (filter: string) => void;
    viewMode: CheckThuongViewMode;
    onToggleViewMode: () => void;
    onExportFiltered?: () => void;
    onExportAll?: () => void;
}

const STAT_COLORS: Record<string, { border: string; glow: string; text: string; bg: string }> = {
    achieved: { border: '#10b981', glow: 'rgba(16, 185, 129, 0.15)', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500' },
    nearly: { border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.15)', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500' },
    achieved100: { border: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.15)', text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500' },
    notAchieved100: { border: '#f43f5e', glow: 'rgba(244, 63, 94, 0.15)', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500' },
    noFund: { border: '#64748b', glow: 'rgba(100, 116, 139, 0.15)', text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-400' },
    noSale: { border: '#475569', glow: 'rgba(71, 85, 105, 0.15)', text: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-500' }
};

export const CheckThuongStatusSummary: React.FC<CheckThuongStatusSummaryProps> = ({
    groups,
    totalCount,
    activeFilter,
    onSelectFilter,
    viewMode,
    onToggleViewMode,
    onExportFiltered,
    onExportAll
}) => {
    return (
        <div className="space-y-3">
            {/* 6 Mini Stat Cards in a responsive grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {groups.map(group => {
                    const styling = STAT_COLORS[group.key] || STAT_COLORS.achieved;
                    const isSelected = activeFilter === group.key;

                    return (
                        <button
                            key={group.key}
                            type="button"
                            onClick={() => onSelectFilter(activeFilter === group.key ? 'all' : group.key)}
                            style={{
                                borderLeftColor: styling.border,
                                backgroundColor: isSelected ? styling.glow : undefined
                            }}
                            className={`p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 border-l-4 text-left transition-all hover:shadow-md cursor-pointer relative overflow-hidden group flex flex-col justify-between min-h-[72px] ${
                                isSelected ? 'ring-2 ring-sky-500 shadow-sm' : ''
                            }`}
                        >
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate mb-1">
                                {group.shortTitle || group.title}
                            </p>
                            <div className="flex items-baseline justify-between mt-auto">
                                <span className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tabular-nums leading-none">
                                    {group.data.length}
                                </span>
                                <span className={`text-[11px] font-bold ${styling.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                    {group.data.length > 0 && totalCount > 0 ? `${Math.round((group.data.length / totalCount) * 100)}%` : ''}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Filter Pills + Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {/* Pill filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar text-xs">
                    <button
                        type="button"
                        onClick={() => onSelectFilter('all')}
                        className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap ${
                            activeFilter === 'all'
                                ? 'bg-sky-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        Tất cả ({totalCount})
                    </button>

                    {groups.map(group => {
                        const isSelected = activeFilter === group.key;
                        return (
                            <button
                                key={group.key}
                                type="button"
                                onClick={() => onSelectFilter(isSelected ? 'all' : group.key)}
                                className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                                    isSelected
                                        ? 'bg-sky-600 text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span>{group.shortTitle}</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${isSelected ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                    {group.data.length}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* View Mode & Export Tools */}
                <div className="flex items-center gap-1.5 shrink-0 no-print">
                    <button
                        type="button"
                        onClick={onToggleViewMode}
                        title={viewMode === 'list' ? 'Chuyển sang dạng Lưới thẻ' : 'Chuyển sang dạng Danh sách bảng'}
                        className="h-8 px-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                        <AppIcon name={viewMode === 'list' ? 'table' : 'filter'} size="xs" />
                        <span className="hidden sm:inline">{viewMode === 'list' ? 'Dạng bảng' : 'Dạng thẻ'}</span>
                    </button>

                    {onExportFiltered && (
                        <button
                            type="button"
                            onClick={onExportFiltered}
                            title="Xuất ảnh danh sách đang lọc"
                            className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 transition-all flex items-center justify-center cursor-pointer"
                        >
                            <AppIcon name="image" size="xs" />
                        </button>
                    )}

                    {onExportAll && (
                        <button
                            type="button"
                            onClick={onExportAll}
                            title="Xuất ảnh toàn bộ danh sách"
                            className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 transition-all flex items-center justify-center cursor-pointer"
                        >
                            <AppIcon name="download" size="xs" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
