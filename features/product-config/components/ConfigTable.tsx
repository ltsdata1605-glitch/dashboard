import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Input } from '../../../components/shared/ui/Input';
import { Select } from '../../../components/shared/ui/Select';
import { Button } from '../../../components/shared/ui/Button';
import type { CategoryTableItem } from '../types';

interface ConfigTableProps {
    items: CategoryTableItem[];
    isEditable?: boolean;
    parentGroups?: string[];
    onAddItem?: (item: CategoryTableItem) => void;
    onUpdateItem?: (code: string, updates: Partial<CategoryTableItem>) => void;
    onDeleteItem?: (code: string) => void;
}

interface EditingState {
    code: string;
    field: 'industry' | 'parentGroup' | 'subgroup' | 'multiplier';
    value: string;
}

const InlineInput: React.FC<{
    value: string;
    onSave: (val: string) => void;
    onCancel: () => void;
    type?: 'text' | 'number';
    className?: string;
}> = ({ value, onSave, onCancel, type = 'text', className }) => {
    const ref = useRef<HTMLInputElement>(null);
    const [val, setVal] = useState(value);

    useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onSave(val);
        if (e.key === 'Escape') onCancel();
    };

    return (
        <Input
            ref={ref}
            type={type}
            step={type === 'number' ? '0.01' : undefined}
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onSave(val)}
            className={`h-7 px-1.5 py-0 text-xs border-sky-400 ${className || ''}`}
        />
    );
};

export const ConfigTable: React.FC<ConfigTableProps> = ({
    items, isEditable, parentGroups: externalParentGroups,
    onAddItem, onUpdateItem, onDeleteItem,
}) => {
    const [search, setSearch] = useState('');
    const [selectedParent, setSelectedParent] = useState('all');
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<EditingState | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newItem, setNewItem] = useState({ code: '', industry: '', parentGroup: '', subgroup: '', multiplier: '1' });
    const pageSize = 50;

    const parentGroups = useMemo(() => {
        if (externalParentGroups?.length) return externalParentGroups;
        const set = new Set<string>();
        items.forEach(it => { if (it.parentGroup) set.add(it.parentGroup); });
        return Array.from(set).sort();
    }, [items, externalParentGroups]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return items.filter(it => {
            if (selectedParent !== 'all' && it.parentGroup !== selectedParent) return false;
            if (!query) return true;
            return (
                it.code.toLowerCase().includes(query) ||
                (it.industry || '').toLowerCase().includes(query) ||
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

    const handleSaveEdit = useCallback((code: string, field: string, rawValue: string) => {
        if (!onUpdateItem) return;
        if (field === 'multiplier') {
            const num = parseFloat(rawValue);
            if (!isNaN(num) && num > 0) onUpdateItem(code, { multiplier: num });
        } else {
            const trimmed = rawValue.trim();
            if (trimmed) onUpdateItem(code, { [field]: trimmed } as Partial<CategoryTableItem>);
        }
        setEditing(null);
    }, [onUpdateItem]);

    const handleAddSubmit = useCallback(() => {
        if (!onAddItem) return;
        const code = newItem.code.trim();
        const industry = newItem.industry.trim();
        const parentGroup = newItem.parentGroup.trim();
        const subgroup = newItem.subgroup.trim();
        const multiplier = parseFloat(newItem.multiplier);
        if (!code || !parentGroup || !subgroup || isNaN(multiplier) || multiplier <= 0) return;
        if (items.some(it => it.code === code)) return;
        onAddItem({ code, industry: industry || undefined, parentGroup, subgroup, multiplier });
        setNewItem({ code: '', industry: '', parentGroup: '', subgroup: '', multiplier: '1' });
        setShowAddForm(false);
    }, [onAddItem, newItem, items]);

    const hasIndustry = items.some(it => it.industry);

    const renderCell = (item: CategoryTableItem, field: 'industry' | 'parentGroup' | 'subgroup' | 'multiplier') => {
        const isEditing = editing?.code === item.code && editing?.field === field;

        if (isEditing) {
            return (
                <InlineInput
                    value={editing.value}
                    type={field === 'multiplier' ? 'number' : 'text'}
                    onSave={val => handleSaveEdit(item.code, field, val)}
                    onCancel={() => setEditing(null)}
                    className={field === 'multiplier' ? 'text-right tabular-nums' : ''}
                />
            );
        }

        const displayValue = field === 'multiplier'
            ? (item.multiplier !== undefined ? item.multiplier.toLocaleString('vi-VN') : '1')
            : (item[field] || '—');

        const editValue = field === 'multiplier'
            ? String(item.multiplier ?? 1)
            : (item[field] || '');

        if (!isEditable) return <>{displayValue}</>;

        return (
            <span
                className="cursor-pointer hover:bg-sky-50 hover:text-sky-700 rounded px-1 -mx-1 transition-colors"
                onClick={() => setEditing({
                    code: item.code,
                    field,
                    value: editValue,
                })}
                title="Bấm để sửa"
            >
                {displayValue}
            </span>
        );
    };

    return (
        <div className="bg-white border border-slate-200 rounded-card overflow-hidden shadow-sm">
            {/* Filter Bar */}
            <div className="p-3 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row gap-2 sm:gap-2.5 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
                    <Input
                        dense
                        leftIcon="search"
                        placeholder="Tìm mã nhóm, nhóm cha, nhóm con..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="h-8 text-xs rounded-control w-full"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                    {isEditable && (
                        <Button
                            variant="secondary"
                            size="none"
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="ycx-hit h-8 px-2.5 sm:px-3 gap-1.5 text-xs font-semibold rounded-control border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                        >
                            <AppIcon name={showAddForm ? 'close' : 'add'} size="sm" />
                            <span>{showAddForm ? 'Đóng' : 'Thêm mới'}</span>
                        </Button>
                    )}
                    <div className="flex-1 sm:w-48 min-w-0">
                        <Select
                            dense
                            value={selectedParent}
                            onChange={e => { setSelectedParent(e.target.value); setPage(1); }}
                            className="h-8 text-xs rounded-control pl-2 pr-7 truncate"
                        >
                            <option value="all">Tất cả nhóm cha ({parentGroups.length})</option>
                            {parentGroups.map(p => <option key={p} value={p}>{p}</option>)}
                        </Select>
                    </div>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && isEditable && (
                <div className="p-3 bg-emerald-50/60 border-b border-emerald-200 flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[100px]">
                        <label htmlFor="cfg-ma-nhom" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Mã nhóm hàng</label>
                        <Input
                            dense
                            id="cfg-ma-nhom"
                            type="text"
                            placeholder="VD: 4479"
                            value={newItem.code}
                            onChange={e => setNewItem(prev => ({ ...prev, code: e.target.value }))}
                            className="h-8 px-2 text-xs font-mono font-bold"
                        />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label htmlFor="cfg-nganh-hang" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Ngành hàng</label>
                        <Input
                            dense
                            id="cfg-nganh-hang"
                            type="text"
                            placeholder="VD: 164 - VAS hoặc CE"
                            value={newItem.industry}
                            onChange={e => setNewItem(prev => ({ ...prev, industry: e.target.value }))}
                            className="h-8 px-2 text-xs"
                        />
                    </div>
                    <div className="flex-1 min-w-[120px]">
                        <label htmlFor="cfg-nhom-cha" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Nhóm cha</label>
                        <Input
                            dense
                            id="cfg-nhom-cha"
                            type="text"
                            placeholder="VD: CE"
                            value={newItem.parentGroup}
                            onChange={e => setNewItem(prev => ({ ...prev, parentGroup: e.target.value }))}
                            list="parent-groups-list"
                            className="h-8 px-2 text-xs"
                        />
                        <datalist id="parent-groups-list">
                            {parentGroups.map(p => <option key={p} value={p} />)}
                        </datalist>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                        <label htmlFor="cfg-nhom-con" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Nhóm con</label>
                        <Input
                            dense
                            id="cfg-nhom-con"
                            type="text"
                            placeholder="VD: Máy lạnh"
                            value={newItem.subgroup}
                            onChange={e => setNewItem(prev => ({ ...prev, subgroup: e.target.value }))}
                            className="h-8 px-2 text-xs"
                        />
                    </div>
                    <div className="w-24">
                        <label htmlFor="cfg-he-so" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Hệ số</label>
                        <Input
                            dense
                            id="cfg-he-so"
                            type="number"
                            step="0.01"
                            min="0"
                            value={newItem.multiplier}
                            onChange={e => setNewItem(prev => ({ ...prev, multiplier: e.target.value }))}
                            className="h-8 px-2 text-xs text-right tabular-nums font-bold"
                        />
                    </div>
                    <Button
                        variant="primary"
                        size="none"
                        onClick={handleAddSubmit}
                        disabled={!newItem.code.trim() || !newItem.parentGroup.trim() || !newItem.subgroup.trim()}
                        className="ycx-hit h-8 px-3 gap-1 text-xs font-bold rounded-control bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <AppIcon name="save" size="xs" />
                    </Button>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full table-fixed sm:table-auto text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                        {/* Header trên Desktop (sm trở lên) */}
                        <tr className="hidden sm:table-row">
                            <th className="py-2.5 px-3 w-12 text-center">STT</th>
                            <th className="py-2.5 px-3 min-w-[160px]">Ngành Hàng</th>
                            <th className="py-2.5 px-3 min-w-[180px]">Nhóm Hàng</th>
                            <th className="py-2.5 px-3 min-w-[120px]">Nhóm Cha</th>
                            <th className="py-2.5 px-3 min-w-[140px]">Nhóm Con</th>
                            <th className="py-2.5 px-3 w-28 text-right">Hệ Số Quy Đổi</th>
                            {isEditable && <th className="py-2.5 px-3 w-10 text-center"></th>}
                        </tr>
                        {/* Header trên Mobile (< sm) - Vừa khít màn hình */}
                        <tr className="sm:hidden">
                            <th className="py-2 px-1 w-8 text-center text-[11px]">STT</th>
                            <th className="py-2 px-1.5 text-[11px]">Ngành / Nhóm Hàng</th>
                            <th className="py-2 px-1.5 w-24 text-[11px]">Nhóm Cha / Con</th>
                            <th className="py-2 px-1.5 w-14 text-right text-[11px]">Hệ Số</th>
                            {isEditable && <th className="py-2 px-1 w-7 text-center"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={isEditable ? 7 : 6} className="py-10 text-center text-slate-400 font-medium">
                                    Không tìm thấy ngành hàng nào khớp với tìm kiếm
                                </td>
                            </tr>
                        ) : (
                            paginated.map((item, idx) => {
                                const rowNum = (page - 1) * pageSize + idx + 1;
                                return (
                                    <tr
                                        key={item.code}
                                        className="hover:bg-sky-50/50 transition-colors group"
                                    >
                                        {/* Cột STT chung */}
                                        <td className="py-2 px-1.5 sm:px-3 text-center text-slate-400 tabular-nums font-mono text-[11px] align-middle">
                                            {rowNum}
                                        </td>

                                        {/* Mobile: Cột Ngành / Nhóm Hàng gộp (sm:hidden) */}
                                        <td className="py-2 px-2 sm:hidden align-middle">
                                            <div className="font-mono font-bold text-sky-700 text-xs leading-snug break-words">
                                                {item.code}
                                            </div>
                                            <div className="text-slate-500 text-[11px] font-medium leading-snug mt-0.5 break-words">
                                                {renderCell(item, 'industry')}
                                            </div>
                                        </td>

                                        {/* Mobile: Cột Nhóm Cha / Con gộp (sm:hidden) */}
                                        <td className="py-2 px-2 sm:hidden align-middle">
                                            <div className="font-semibold text-slate-700 text-xs leading-snug break-words">
                                                {renderCell(item, 'parentGroup')}
                                            </div>
                                            <div className="text-slate-500 text-[11px] leading-snug mt-0.5 break-words">
                                                {renderCell(item, 'subgroup')}
                                            </div>
                                        </td>

                                        {/* Desktop: Cột Ngành Hàng riêng (hidden sm:table-cell) */}
                                        <td className="hidden sm:table-cell py-2 px-3 text-slate-700 text-[11px] font-medium align-middle">
                                            {renderCell(item, 'industry')}
                                        </td>

                                        {/* Desktop: Cột Nhóm Hàng riêng (hidden sm:table-cell) */}
                                        <td className="hidden sm:table-cell py-2 px-3 font-mono font-bold text-sky-700 align-middle">
                                            {item.code}
                                        </td>

                                        {/* Desktop: Cột Nhóm Cha riêng (hidden sm:table-cell) */}
                                        <td className="hidden sm:table-cell py-2 px-3 font-bold text-slate-700 align-middle">
                                            {renderCell(item, 'parentGroup')}
                                        </td>

                                        {/* Desktop: Cột Nhóm Con riêng (hidden sm:table-cell) */}
                                        <td className="hidden sm:table-cell py-2 px-3 text-slate-600 align-middle">
                                            {renderCell(item, 'subgroup')}
                                        </td>

                                        {/* Cột Hệ Số (hiển thị cả Mobile và Desktop) */}
                                        <td className="py-2 px-2 sm:px-3 text-right tabular-nums font-bold text-slate-800 text-xs align-middle">
                                            {renderCell(item, 'multiplier')}
                                        </td>

                                        {/* Cột Xoá */}
                                        {isEditable && (
                                            <td className="py-2 px-1 text-center align-middle">
                                                <Button
                                                    variant="unstyled"
                                                    size="none"
                                                    type="button"
                                                    onClick={() => onDeleteItem?.(item.code)}
                                                    className="ycx-hit opacity-60 sm:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500 cursor-pointer"
                                                    title="Xoá"
                                                    aria-label={`Xoá nhóm hàng ${item.code}`}
                                                >
                                                    <AppIcon name="close" size="xs" />
                                                </Button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-3 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
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
