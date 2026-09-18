import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { CheckThuongStoreSummary, LeaderboardSortField, SortDirection } from '../types';
import { CHECK_THUONG_COLS, parseNumber } from '../services/checkThuongCalc';
import { Button } from '../../../components/shared/ui/Button';

interface CheckThuongTopTableProps {
    stores: CheckThuongStoreSummary[];
    sortField: LeaderboardSortField;
    sortOrder: SortDirection;
    pageSize?: number;
    onPageSizeChange?: (size: number) => void;
    onSort: (field: LeaderboardSortField) => void;
    onSelectStore: (storeCode: string) => void;
}

export const CheckThuongTopTable: React.FC<CheckThuongTopTableProps> = ({
    stores,
    sortField,
    sortOrder,
    pageSize: externalPageSize,
    onPageSizeChange,
    onSort,
    onSelectStore
}) => {
    const [page, setPage] = useState(1);
    const [internalPageSize, setInternalPageSize] = useState(50);
    const pageSize = externalPageSize !== undefined ? externalPageSize : internalPageSize;

    const handlePageSizeChange = (newSize: number) => {
        if (onPageSizeChange) {
            onPageSizeChange(newSize);
        } else {
            setInternalPageSize(newSize);
        }
        setPage(1);
    };

    const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());

    const toggleExpand = (storeKey: string) => {
        setExpandedStores(prev => {
            const next = new Set(prev);
            if (next.has(storeKey)) {
                next.delete(storeKey);
            } else {
                next.add(storeKey);
            }
            return next;
        });
    };

    const totalPages = Math.ceil(stores.length / pageSize) || 1;
    const paginatedStores = useMemo(() => {
        const start = (page - 1) * pageSize;
        return stores.slice(start, start + pageSize);
    }, [stores, page, pageSize]);

    const formatMillion = (val: number): string => {
        if (!val || isNaN(val)) return '0 Tr';
        const inMillion = Math.round(val / 1000000);
        return `${inMillion.toLocaleString('vi-VN')} Tr`;
    };

    const formatCategoryBonus = (val: number): string => {
        if (!val || isNaN(val)) return '0 Tr';
        const m = val / 1000000;
        if (m < 1) {
            return `${m.toFixed(1).replace('.', ',')} Tr`;
        }
        return `${Math.round(m).toLocaleString('vi-VN')} Tr`;
    };

    const renderRankBadge = (rank: number) => {
        const color = 
            rank === 1 ? 'text-amber-600 dark:text-amber-400 font-black' :
            rank === 2 ? 'text-slate-700 dark:text-slate-300 font-extrabold' :
            rank === 3 ? 'text-amber-700 dark:text-amber-500 font-extrabold' :
            'text-slate-500 dark:text-slate-400 font-bold';
        return (
            <span className={`text-xs ${color}`}>
                #{rank}
            </span>
        );
    };

    const getChannelBadgeInfo = (channel: string) => {
        const ch = (channel || '').toUpperCase().trim();
        if (ch.includes('TGD') || ch.includes('TGDD') || ch.includes('TZ')) {
            return {
                className: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700',
                style: { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' }
            };
        }
        if (ch.includes('DML')) {
            return {
                className: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-700',
                style: { backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#7dd3fc' }
            };
        }
        if (ch.includes('DMM')) {
            return {
                // indigo — khớp với kênh DMM ở CheckThuongChannelTopGrid.tsx (cùng một kênh thì
                // phải cùng màu ở mọi bảng). Đổi cả mã hex vì `style` đè lên class.
                className: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-700',
                style: { backgroundColor: '#e0e7ff', color: '#4338ca', borderColor: '#a5b4fc' }
            };
        }
        if (ch.includes('DMS') || ch.includes('DMX')) {
            return {
                className: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700',
                style: { backgroundColor: '#d1fae5', color: '#047857', borderColor: '#6ee7b7' }
            };
        }
        return {
            className: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
            style: { backgroundColor: '#f1f5f9', color: '#334155', borderColor: '#cbd5e1' }
        };
    };

    const renderSortTh = (
        field: LeaderboardSortField,
        label: string,
        widthStyle: string,
        align: 'center' | 'left' | 'right' = 'center',
        extraClass: string = ''
    ) => {
        const isActive = sortField === field;
        const alignClasses =
            align === 'left' ? 'justify-start text-left' :
            align === 'right' ? 'justify-end text-right' :
            'justify-center text-center';

        const directionLabel = isActive
            ? (sortOrder === 'asc' ? 'Tăng dần (bấm để đổi sang Giảm dần)' : 'Giảm dần (bấm để đổi sang Tăng dần)')
            : 'Bấm để sắp xếp theo ' + label;

        return (
            <th
                onClick={() => onSort(field)}
                title={directionLabel}
                className={`py-2 px-2 sm:px-3 border-r border-slate-200 dark:border-slate-700/80 cursor-pointer transition-colors select-none group/th ${widthStyle} ${extraClass} ${
                    isActive
                        ? 'bg-sky-100/70 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-black'
                        : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-sky-600 dark:hover:text-sky-400'
                }`}
            >
                <div className={`flex items-center gap-1.5 ${alignClasses}`}>
                    <span>{label}</span>
                    <span className="inline-flex items-center shrink-0">
                        {isActive ? (
                            sortOrder === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 stroke-[2.5]" />
                            ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 stroke-[2.5]" />
                            )
                        ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/th:opacity-60 transition-opacity text-slate-400" />
                        )}
                    </span>
                </div>
            </th>
        );
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/80 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold select-none">
                            {renderSortTh('rank', 'Hạng', 'w-16 sm:w-20', 'center')}
                            {renderSortTh('channel', 'Kênh', 'w-20', 'center')}
                            {renderSortTh('code', 'Kho', 'w-20', 'center')}
                            {renderSortTh('name', 'Tên Siêu Thị', 'min-w-[190px]', 'left')}
                            {renderSortTh('achievedCount', 'Đạt 100%', 'w-28', 'center')}
                            {renderSortTh('percent', '%Đạt', 'w-24', 'center')}
                            {renderSortTh('bonus', 'Thưởng', 'min-w-[110px]', 'center')}
                            <th className="py-2 px-2 sm:px-3 text-center w-20">
                                Chi tiết
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {paginatedStores.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500">
                                    Không tìm thấy siêu thị nào phù hợp với bộ lọc.
                                </td>
                            </tr>
                        ) : (
                            paginatedStores.map((store) => {
                                const isExpanded = expandedStores.has(store.rawStore);
                                const awardedList = isExpanded
                                    ? store.rows
                                        .map((r) => {
                                            const category = String(r[CHECK_THUONG_COLS.NGANH_HANG] || '').trim();
                                            const bonus = parseNumber(r[CHECK_THUONG_COLS.TONG_THUONG]);
                                            const percentRaw = r[CHECK_THUONG_COLS.PERCENT_DU_KIEN];
                                            let percentVal = 0;
                                            if (typeof percentRaw === 'number') {
                                                percentVal = Math.round(percentRaw * 100);
                                            } else {
                                                const parsed = parseNumber(percentRaw);
                                                percentVal = String(percentRaw).includes('%') ? Math.round(parsed) : Math.round(parsed * 100);
                                            }
                                            return { category, bonus, percent: percentVal };
                                        })
                                        .filter((item) => item.bonus > 0)
                                        .sort((a, b) => b.bonus - a.bonus)
                                    : [];

                                return (
                                    <React.Fragment key={store.rawStore}>
                                        <tr
                                            className={`group transition-colors ${
                                                isExpanded
                                                    ? 'bg-sky-50/70 dark:bg-sky-950/30'
                                                    : 'hover:bg-sky-50/40 dark:hover:bg-sky-950/20'
                                            }`}
                                        >
                                            {/* CỘT 1: HẠNG */}
                                            <td className="py-1 px-2 sm:px-3 text-center border-r border-slate-200/90 dark:border-slate-700/70">
                                                {renderRankBadge(store.rank)}
                                            </td>

                                            {/* CỘT 2: KÊNH */}
                                            <td className="py-1 px-2 sm:px-3 text-center border-r border-slate-200/90 dark:border-slate-700/70">
                                                {(() => {
                                                    const b = getChannelBadgeInfo(store.channel);
                                                    return (
                                                        <span 
                                                            style={b.style}
                                                            className={`inline-block px-2 py-0.5 text-[10px] font-black uppercase rounded-md border shadow-2xs ${b.className}`}
                                                        >
                                                            {store.channel}
                                                        </span>
                                                    );
                                                })()}
                                            </td>

                                            {/* CỘT 3: MÃ KHO */}
                                            <td className="py-1 px-2 sm:px-3 text-center border-r border-slate-200/90 dark:border-slate-700/70">
                                                <button
                                                    type="button"
                                                    onClick={() => onSelectStore(store.storeCode)}
                                                    className="font-bold text-sky-600 dark:text-sky-400 hover:underline text-center cursor-pointer text-xs"
                                                    title={`Tra cứu siêu thị mã ${store.storeCode}`}
                                                >
                                                    {store.storeCode}
                                                </button>
                                            </td>

                                            {/* CỘT 4: TÊN SIÊU THỊ (BẤM VÀO SẼ XỔ NGÀNH HÀNG ĐẠT THƯỞNG) */}
                                            <td className="py-1 px-2.5 sm:px-3 border-r border-slate-200/90 dark:border-slate-700/70">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpand(store.rawStore)}
                                                    className="flex items-center gap-1.5 text-left group/btn focus:outline-hidden cursor-pointer"
                                                    title="Bấm để xem danh sách ngành hàng đạt thưởng bên dưới"
                                                >
                                                    <span className="font-bold text-slate-800 dark:text-slate-100 group-hover/btn:text-sky-600 dark:group-hover/btn:text-sky-400 truncate max-w-xs sm:max-w-sm transition-colors text-xs">
                                                        {store.storeName}
                                                    </span>
                                                    <span
                                                        className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-slate-400 group-hover/btn:text-sky-600 transition-transform duration-200 shrink-0 ${
                                                            isExpanded ? 'rotate-180 text-sky-600 bg-sky-100 dark:bg-sky-950' : ''
                                                        }`}
                                                    >
                                                        <ChevronDown className="w-3 h-3" />
                                                    </span>
                                                </button>
                                            </td>

                                            {/* CỘT 5: SỐ NGÀNH HÀNG ĐẠT 100% */}
                                            <td className="py-1 px-2 sm:px-3 text-center font-semibold whitespace-nowrap text-xs border-r border-slate-200/90 dark:border-slate-700/70">
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{store.achievedCount}</span>
                                                <span className="text-slate-400"> / {store.totalCategories}</span>
                                            </td>

                                            {/* CỘT 6: TỈ LỆ ĐẠT 100% */}
                                            <td className="py-1 px-2 sm:px-3 text-center border-r border-slate-200/90 dark:border-slate-700/70">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <span className={`font-black text-xs ${
                                                        store.achievedPercent >= 70 ? 'text-emerald-600 dark:text-emerald-400' :
                                                        store.achievedPercent >= 50 ? 'text-sky-600 dark:text-sky-400' :
                                                        'text-amber-600 dark:text-amber-400'
                                                    }`}>
                                                        {store.achievedPercent}%
                                                    </span>
                                                    <div className="w-10 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                store.achievedPercent >= 70 ? 'bg-emerald-500' :
                                                                store.achievedPercent >= 50 ? 'bg-sky-500' :
                                                                'bg-amber-500'
                                                            }`}
                                                            style={{ width: `${Math.min(100, store.achievedPercent)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* CỘT 7: THƯỞNG */}
                                            <td className="py-1 px-2.5 sm:px-3 text-right border-r border-slate-200/90 dark:border-slate-700/70" title={`${store.totalBonus.toLocaleString('vi-VN')} đ`}>
                                                <span className="font-black text-xs text-emerald-600 dark:text-emerald-400 tracking-tight">
                                                    {formatMillion(store.totalBonus)}
                                                </span>
                                            </td>

                                            {/* CỘT 8: NÚT CHI TIẾT */}
                                            <td className="py-1 px-2 sm:px-3 text-center">
                                                <Button
                                                    variant="unstyled"
                                                    size="none"
                                                    onClick={() => onSelectStore(store.storeCode)}
                                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-slate-100 hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-sky-950/60 text-slate-700 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400 rounded-md text-[11px] font-bold border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
                                                    title={`Xem chi tiết kho ${store.storeCode}`}
                                                >
                                                    <span>Xem</span>
                                                    <ChevronRight className="w-3 h-3" />
                                                </Button>
                                            </td>
                                        </tr>

                                        {/* HÀNG XỔ CHI TIẾT CÁC NGÀNH HÀNG ĐẠT THƯỞNG */}
                                        {isExpanded && (
                                            <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-700">
                                                <td colSpan={8} className="p-3 sm:p-4">
                                                    <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 shadow-xs">
                                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                                    Ngành hàng đạt thưởng: <span className="text-emerald-600 dark:text-emerald-400">{awardedList.length}</span> / {store.totalCategories} ngành
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                                    Tổng thưởng: <strong className="text-emerald-600 dark:text-emerald-400 font-black">{formatMillion(store.totalBonus)}</strong>
                                                                </span>
                                                                <Button
                                                                    variant="unstyled"
                                                                    size="none"
                                                                    onClick={() => onSelectStore(store.storeCode)}
                                                                    className="text-[11px] font-bold text-sky-600 hover:text-sky-500 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                                                >
                                                                    Xem chi tiết <ChevronRight className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {awardedList.length === 0 ? (
                                                            <p className="text-xs text-slate-400 italic py-2 text-center">
                                                                Siêu thị này hiện chưa có ngành hàng nào phát sinh tiền thưởng.
                                                            </p>
                                                        ) : (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                {awardedList.map((item, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="flex items-center justify-between p-2 rounded-none bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 text-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-1.5 min-w-0 mr-2">
                                                                            <span className="w-4 h-4 rounded-none bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-black flex items-center justify-center shrink-0">
                                                                                {idx + 1}
                                                                            </span>
                                                                            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate" title={item.category}>
                                                                                {item.category}
                                                                            </span>
                                                                            <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                                                                ({item.percent}%)
                                                                            </span>
                                                                        </div>
                                                                        <span
                                                                            className="font-black text-emerald-600 dark:text-emerald-400 shrink-0"
                                                                            title={`${item.bonus.toLocaleString('vi-VN')} đ`}
                                                                        >
                                                                            {formatCategoryBonus(item.bonus)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* THANH PHÂN TRANG */}
            {stores.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <span>Số dòng mỗi trang:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                            aria-label="Chọn số dòng mỗi trang"
                            className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={1000}>Tất cả</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-2.5 py-1 rounded-none border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200/60 dark:hover:bg-slate-700 text-xs font-bold"
                        >
                            Trang trước
                        </Button>
                        <span className="px-2 font-bold text-slate-700 dark:text-slate-200">
                            {page} / {totalPages}
                        </span>
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-2.5 py-1 rounded-none border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200/60 dark:hover:bg-slate-700 text-xs font-bold"
                        >
                            Trang sau
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
