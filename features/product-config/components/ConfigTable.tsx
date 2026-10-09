import React, { useState, useMemo } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Input } from '../../../components/shared/ui/Input';
import { Select } from '../../../components/shared/ui/Select';
import { Button } from '../../../components/shared/ui/Button';
import type { CategoryTableItem } from '../types';

interface ConfigTableProps {
    items: CategoryTableItem[];
}

export const ConfigTable: React.FC<ConfigTableProps> = ({ items }) => {
    const [search, setSearch] = useState('');
    const [selectedParent, setSelectedParent] = useState('all');
    const [page, setPage] = useState(1);
    const pageSize = 50;

    const parentGroups = useMemo(() => {
        const set = new Set<string>();
        items.forEach(it => {
            if (it.parentGroup) set.add(it.parentGroup);
        });
        return Array.from(set).sort();
    }, [items]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return items.filter(it => {
            if (selectedParent !== 'all' && it.parentGroup !== selectedParent) return false;
            if (!query) return true;
            return (
                it.code.toLowerCase().includes(query) ||
                it.parentGroup.toLowerCase().includes(query) ||
                it.subgroup.toLowerCase().includes(query)
            );
        });
    }, [items, search, selectedParent]);

    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page]);

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden shadow-xs">
            {/* Filter Bar */}
            <div className="p-3 bg-slate-50/70 dark:bg-slate-850/60 border-b border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
                    <Input
                        leftIcon="search"
                        placeholder="Tìm mã nhóm, nhóm cha, nhóm con..."
                        value={search}
                        onChange={e => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="h-8.5 text-xs rounded-lg w-full"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                    <div className="w-48">
                        <Select
                            value={selectedParent}
                            onChange={e => {
                                setSelectedParent(e.target.value);
                                setPage(1);
                            }}
                            className="h-8.5 text-xs rounded-lg"
                        >
                            <option value="all">Tất cả nhóm cha ({parentGroups.length})</option>
                            {parentGroups.map(p => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                        {filtered.length.toLocaleString('vi-VN')} mục
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="py-2.5 px-3 w-14 text-center">STT</th>
                            <th className="py-2.5 px-3 min-w-[130px]">Mã Nhóm Hàng</th>
                            <th className="py-2.5 px-3 min-w-[160px]">Nhóm Cha</th>
                            <th className="py-2.5 px-3 min-w-[180px]">Nhóm Con</th>
                            <th className="py-2.5 px-3 w-32 text-right">Hệ Số Quy Đổi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-10 text-center text-slate-400 dark:text-slate-500 font-medium">
                                    Không tìm thấy ngành hàng nào khớp với tìm kiếm
                                </td>
                            </tr>
                        ) : (
                            paginated.map((item, idx) => {
                                const rowNum = (page - 1) * pageSize + idx + 1;
                                return (
                                    <tr
                                        key={item.code}
                                        className="hover:bg-sky-50/50 dark:hover:bg-slate-750 transition-colors"
                                    >
                                        <td className="py-2 px-3 text-center text-slate-400 tabular-nums font-mono text-[11px]">
                                            {rowNum}
                                        </td>
                                        <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200 text-sky-700 dark:text-sky-400">
                                            {item.code}
                                        </td>
                                        <td className="py-2 px-3 font-bold text-slate-700 dark:text-slate-300">
                                            {item.parentGroup || '—'}
                                        </td>
                                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                                            {item.subgroup || '—'}
                                        </td>
                                        <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-800 dark:text-slate-200">
                                            {item.multiplier !== undefined ? item.multiplier.toLocaleString('vi-VN') : '1'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-3 bg-slate-50/50 dark:bg-slate-850/40 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                        Trang {page} / {totalPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="h-7.5 px-2.5 text-xs gap-1"
                        >
                            <AppIcon name="chevronLeft" size="sm" />
                            Trước
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="h-7.5 px-2.5 text-xs gap-1"
                        >
                            Sau
                            <AppIcon name="chevronRight" size="sm" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
