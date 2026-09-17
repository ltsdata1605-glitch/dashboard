import React from 'react';
import { Search, Filter, X, Camera, RotateCcw, Loader2 } from 'lucide-react';
import { LeaderboardFilterState } from '../types';
import { Button } from '../../../components/shared/ui/Button';

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
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm mb-4">
            {/* NHÓM 1: BỘ LỌC KÊNH & TÌM KIẾM */}
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* LỌC KÊNH */}
                <div className="relative shrink-0 flex items-center">
                    <div className="absolute left-3 pointer-events-none text-slate-400">
                        <Filter className="w-3.5 h-3.5" />
                    </div>
                    <select
                        value={filters.channel}
                        onChange={(e) => onFilterChange({ channel: e.target.value })}
                        aria-label="Chọn kênh siêu thị"
                        className="w-full sm:w-auto pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer"
                    >
                        <option value="ALL">Tất cả kênh ({channels.length})</option>
                        {channels.map((ch) => (
                            <option key={ch} value={ch}>
                                Kênh {ch}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Ô NHẬP TÌM TÊN HOẶC MÃ KHO */}
                <div className="relative flex-1 min-w-[200px]">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Search className="w-4 h-4" />
                    </div>
                    <input
                        type="text"
                        placeholder="Tìm theo mã kho hoặc tên siêu thị..."
                        value={filters.searchQuery}
                        onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                    />
                    {filters.searchQuery && (
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={() => onFilterChange({ searchQuery: '' })}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                            title="Xoá từ khoá tìm kiếm"
                        >
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    )}
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
                            className="p-2 text-slate-500 hover:text-rose-500 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 rounded-xl transition-colors border border-slate-200/80 dark:border-slate-700"
                            title="Đặt lại bộ lọc"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                    )}

                    {/* BỘ CHỌN SỐ LƯỢNG XUẤT TOP 25 / TOP 50 */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-[11px] font-bold">
                        <button
                            type="button"
                            onClick={() => onExportLimitChange(25)}
                            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                                exportLimit === 25
                                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Chọn xuất Top 25 siêu thị"
                        >
                            25
                        </button>
                        <button
                            type="button"
                            onClick={() => onExportLimitChange(50)}
                            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                                exportLimit === 50
                                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Chọn xuất Top 50 siêu thị"
                        >
                            50
                        </button>
                    </div>

                    {/* NÚT XUẤT ẢNH */}
                    <Button
                        variant="unstyled"
                        size="none"
                        onClick={onExportImage}
                        disabled={isExporting}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                        title={`Xuất ảnh Top ${exportLimit} siêu thị`}
                    >
                        {isExporting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Camera className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Xuất ảnh ({exportLimit})</span>
                        <span className="sm:hidden">Ảnh</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};
