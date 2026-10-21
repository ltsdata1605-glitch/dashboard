import React from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Button } from '../../../components/shared/ui/Button';
import { Tabs } from '../../../components/shared/ui/Tabs';
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
    children?: React.ReactNode;
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
    onExportAll,
    children
}) => {
    return (
        <div className="space-y-3 sm:space-y-4">
            {/* 6 Mini Stat Cards in a responsive grid: 3 cột trên mobile, 6 cột trên desktop */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2 check-thuong-kpi-grid">
                {groups.map(group => {
                    const styling = STAT_COLORS[group.key] || STAT_COLORS.achieved;
                    const isSelected = activeFilter === group.key;

                    return (
                        <Button
                            variant="unstyled"
                            size="none"
                            key={group.key}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => onSelectFilter(activeFilter === group.key ? 'all' : group.key)}
                            style={{
                                borderLeftColor: styling.border,
                                backgroundColor: isSelected ? styling.glow : undefined
                            }}
                            className={`p-2 sm:p-3 rounded-control sm:rounded-popup border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 border-l-[3px] sm:border-l-4 text-left transition-all hover:shadow-md cursor-pointer relative overflow-hidden group flex flex-col justify-between min-h-[56px] sm:min-h-[72px] ${
                                isSelected ? 'ring-2 ring-sky-500 shadow-sm' : ''
                            }`}
                        >
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate mb-0.5 sm:mb-1">
                                {group.shortTitle || group.title}
                            </p>
                            <div className="flex items-baseline justify-between mt-auto">
                                <span className="text-[17px] sm:text-[25px] font-black text-slate-800 dark:text-slate-100 tabular-nums leading-none">
                                    {group.data.length}
                                </span>
                                <span className={`text-[11px] font-bold ${styling.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                    {group.data.length > 0 && totalCount > 0 ? `${Math.round((group.data.length / totalCount) * 100)}%` : ''}
                                </span>
                            </div>
                        </Button>
                    );
                })}
            </div>

            {/* Injected Analysis Card directly under KPI cards */}
            {children}

            {/* Filter Pills + Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 hide-on-export no-print">
                {/* Lọc theo nhóm — chip dùng chung (GĐ10); bấm lại nhóm đang chọn là bỏ lọc như trước */}
                <Tabs
                    variant="chips"
                    size="sm"
                    className="py-1"
                    activeId={activeFilter}
                    onChange={(id) => onSelectFilter(id !== 'all' && id === activeFilter ? 'all' : id)}
                    items={[
                        { id: 'all', label: `Tất cả (${totalCount})` },
                        ...groups.map(group => ({ id: group.key, label: group.shortTitle, badge: group.data.length })),
                    ]}
                />

                {/* View Mode & Export Tools */}
                <div className="flex items-center gap-1.5 shrink-0 no-print hide-on-export">
                    <Button
                        variant="tinted"
                        size="none"
                        type="button"
                        onClick={onToggleViewMode}
                        title={viewMode === 'list' ? 'Chuyển sang dạng Lưới thẻ' : 'Chuyển sang dạng Danh sách bảng'}
                        className="ycx-hit h-8 px-2.5 rounded-control text-xs gap-1.5"
                    >
                        <AppIcon name={viewMode === 'list' ? 'table' : 'filter'} size="xs" />
                        <span className="hidden sm:inline">{viewMode === 'list' ? 'Dạng bảng' : 'Dạng thẻ'}</span>
                    </Button>

                    {/* Nút công cụ chuẩn 4.1b (DESIGN_SYSTEM): nhìn thấy 32/36px, icon 18px, xám khi nghỉ, vùng chạm 44 (ycx-hit) */}
                    {onExportFiltered && (
                        <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={onExportFiltered}
                            title="Xuất ảnh danh sách đang lọc"
                            aria-label="Xuất ảnh danh sách đang lọc"
                            className="lg:w-9 lg:h-9 text-slate-400 hover:text-slate-700"
                        >
                            <AppIcon name="exportImage" size="md" />
                        </Button>
                    )}

                    {onExportAll && (
                        <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={onExportAll}
                            title="Xuất ảnh toàn bộ danh sách"
                            aria-label="Xuất ảnh toàn bộ danh sách"
                            className="lg:w-9 lg:h-9 text-slate-400 hover:text-slate-700"
                        >
                            <AppIcon name="download" size="md" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
