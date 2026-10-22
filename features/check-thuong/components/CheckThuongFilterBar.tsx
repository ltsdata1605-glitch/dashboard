import React from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { LeaderboardFilterState } from '../types';
import { Button } from '../../../components/shared/ui/Button';
import { Select } from '../../../components/shared/ui/Select';
import { Input } from '../../../components/shared/ui/Input';
import { Tabs } from '../../../components/shared/ui/Tabs';

interface CheckThuongFilterBarProps {
    filters: LeaderboardFilterState;
    channels: string[];
    totalCount: number;
    filteredCount: number;
    exportLimit: number;
    isExporting?: boolean;
    onExportLimitChange: (limit: number) => void;
    onFilterChange: (updates: Partial<LeaderboardFilterState>) => void;
    onReset: () => void;
    onExportImage: () => void;
}

export const CheckThuongFilterBar: React.FC<CheckThuongFilterBarProps> = ({
    filters,
    channels,
    totalCount,
    filteredCount,
    exportLimit,
    isExporting = false,
    onExportLimitChange,
    onFilterChange,
    onReset,
    onExportImage
}) => {
    return (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-none border border-slate-200/80 dark:border-slate-800 shadow-sm mb-4">
            {/* NHÓM 1: BỘ LỌC KÊNH & TÌM KIẾM */}
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* LỌC KÊNH — Select dùng chung (GĐ10); khối Top thưởng giữ góc vuông của thiết kế gốc */}
                <div className="shrink-0">
                    <Select
                        leftIcon="filter"
                        value={filters.channel}
                        onChange={(e) => onFilterChange({ channel: e.target.value })}
                        aria-label="Chọn kênh siêu thị"
                        className="sm:w-auto rounded-none bg-slate-50 border-slate-200 text-xs font-bold text-slate-800"
                    >
                        <option value="ALL">Tất cả kênh ({channels.length})</option>
                        {channels.map((ch) => (
                            <option key={ch} value={ch}>
                                Kênh {ch}
                            </option>
                        ))}
                    </Select>
                </div>

                {/* Ô NHẬP TÌM TÊN HOẶC MÃ KHO */}
                <div className="flex-1 min-w-[200px]">
                    <Input
                        type="text"
                        leftIcon="search"
                        rightIcon={filters.searchQuery ? 'close' : undefined}
                        onRightIconClick={() => onFilterChange({ searchQuery: '' })}
                        rightIconLabel="Xoá từ khoá tìm kiếm"
                        placeholder="Tìm theo mã kho hoặc tên siêu thị..."
                        value={filters.searchQuery}
                        onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
                        className="rounded-none bg-slate-50 border-slate-200 text-xs font-semibold text-slate-800"
                    />
                </div>
            </div>

            {/* NHÓM 2: THỐNG KÊ KẾT QUẢ & NÚT HÀNH ĐỘNG */}
            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                    Hiển thị <strong className="text-slate-800 dark:text-slate-200 font-bold">{filteredCount}</strong>
                    {filteredCount !== totalCount && ` / ${totalCount}`} siêu thị
                </div>

                <div className="flex items-center gap-1.5">
                    {(filters.channel !== 'ALL' || filters.searchQuery) && (
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={onReset}
                            className="p-2 text-slate-500 hover:text-rose-500 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 rounded-control transition-colors border border-slate-200/80 dark:border-slate-700"
                            title="Đặt lại bộ lọc"
                        >
                            <AppIcon name="reset" size="sm" />
                        </Button>
                    )}

                    {/* SỐ SIÊU THỊ ĐƯA VÀO ẢNH XUẤT — segmented dùng chung (vùng chạm 44 trên điện thoại) */}
                    <div title="Số siêu thị đưa vào ảnh xuất (Top 25 / Top 50)">
                        <Tabs
                            variant="segment"
                            size="sm"
                            activeId={String(exportLimit)}
                            onChange={(id) => onExportLimitChange(Number(id))}
                            items={[{ id: '25', label: '25' }, { id: '50', label: '50' }]}
                        />
                    </div>

                    {/* NÚT XUẤT ẢNH */}
                    <Button
                        variant="unstyled"
                        size="none"
                        onClick={onExportImage}
                        disabled={isExporting}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold text-xs rounded-control shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                        title={`Xuất ảnh Top ${exportLimit} siêu thị`}
                    >
                        {isExporting ? (
                            <AppIcon name="loading" size="sm" spin />
                        ) : (
                            <AppIcon name="exportImage" size="sm" />
                        )}
                        <span className="hidden sm:inline">Xuất ảnh ({exportLimit})</span>
                        <span className="sm:hidden">Ảnh</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};
