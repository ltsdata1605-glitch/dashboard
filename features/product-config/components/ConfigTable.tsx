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
    field: 'parentGroup' | 'subgroup' | 'multiplier';
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
        <input
            ref={ref}
            type={type}
            step={type === 'number' ? '0.01' : undefined}
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onSave(val)}
            className={`w-full bg-white border border-sky-400 rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-sky-400 ${className || ''}`}
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
    const [newItem, setNewItem] = useState({ code: '', parentGroup: '', subgroup: '', multiplier: '1' });
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
            if (trimmed) onUpdateItem(code, { [field]: trimmed });
        }
        setEditing(null);
    }, [onUpdateItem]);

    const handleAddSubmit = useCallback(() => {
        if (!onAddItem) return;
        const code = newItem.code.trim();
        const parentGroup = newItem.parentGroup.trim();
        const subgroup = newItem.subgroup.trim();
        const multiplier = parseFloat(newItem.multiplier);
        if (!code || !parentGroup || !subgroup || isNaN(multiplier) || multiplier <= 0) return;
        if (items.some(it => it.code === code)) return;
        onAddItem({ code, parentGroup, subgroup, multiplier });
        setNewItem({ code: '', parentGroup: '', subgroup: '', multiplier: '1' });
        setShowAddForm(false);
    }, [onAddItem, newItem, items]);

    const renderCell = (item: CategoryTableItem, field: 'parentGroup' | 'subgroup' | 'multiplier') => {
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

        if (!isEditable) return <>{displayValue}</>;

        return (
            <span
                className="cursor-pointer hover:bg-sky-50 hover:text-sky-700 rounded px-1 -mx-1 transition-colors"
                onClick={() => setEditing({
                    code: item.code,
                    field,
                    value: field === 'multiplier' ? String(item.multiplier ?? 1) : (item[field] || ''),
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
            <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
                    <Input
                        leftIcon="search"
                        placeholder="Tìm mã nhóm, nhóm cha, nhóm con..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="h-8.5 text-xs rounded-control w-full"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                    {isEditable && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="h-8.5 gap-1.5 text-xs font-semibold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                            <AppIcon name={showAddForm ? 'close' : 'add'} size="sm" />
                            <span>{showAddForm ? 'Đóng' : 'Thêm mới'}</span>
                        </Button>
                    )}
                    <div className="w-48">
                        <Select
                            value={selectedParent}
                            onChange={e => { setSelectedParent(e.target.value); setPage(1); }}
                            className="h-8.5 text-xs rounded-control"
                        >
                            <option value="all">Tất cả nhóm cha ({parentGroups.length})</option>
                            {parentGroups.map(p => <option key={p} value={p}>{p}</option>)}
                        </Select>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1.5 rounded-control border border-slate-200 whitespace-nowrap">
                        {filtered.length.toLocaleString('vi-VN')} mục
                    </span>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && isEditable && (
                <div className="p-3 bg-emerald-50/60 border-b border-emerald-200 flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[100px]">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Mã nhóm hàng</label>
                        <input
                            type="text"
                            placeholder="VD: 4479"
                            value={newItem.code}
                            onChange={e => setNewItem(prev => ({ ...prev, code: e.target.value }))}
                            className="w-full h-8 px-2 text-xs border border-slate-300 rounded-control focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none font-mono font-bold"
                        />
                    </div>
                    <div className="flex-1 min-w-[120px]">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Nhóm cha</label>
                        <input
                            type="text"
                            placeholder="VD: CE"
                            value={newItem.parentGroup}
                            onChange={e => setNewItem(prev => ({ ...prev, parentGroup: e.target.value }))}
                            list="parent-groups-list"
                            className="w-full h-8 px-2 text-xs border border-slate-300 rounded-control focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
                        />
                        <datalist id="parent-groups-list">
                            {parentGroups.map(p => <option key={p} value={p} />)}
                        </datalist>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Nhóm con</label>
                        <input
                            type="text"
                            placeholder="VD: Máy lạnh"
                            value={newItem.subgroup}
                            onChange={e => setNewItem(prev => ({ ...prev, subgroup: e.target.value }))}
                            className="w-full h-8 px-2 text-xs border border-slate-300 rounded-control focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
                        />
                    </div>
                    <div className="w-24">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Hệ số</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={newItem.multiplier}
                            onChange={e => setNewItem(prev => ({ ...prev, multiplier: e.target.value }))}
                            className="w-full h-8 px-2 text-xs border border-slate-300 rounded-control focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none text-right tabular-nums font-bold"
                        />
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAddSubmit}
                        disabled={!newItem.code.trim() || !newItem.parentGroup.trim() || !newItem.subgroup.trim()}
                        className="h-8 gap-1 text-xs font-bold"
                    >
                        <AppIcon name="add" size="sm" />
                        Thêm
                    </Button>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                            <th className="py-2.5 px-3 w-14 text-center">STT</th>
                            <th className="py-2.5 px-3 min-w-[130px]">Mã Nhóm Hàng</th>
                            <th className="py-2.5 px-3 min-w-[160px]">Nhóm Cha</th>
                            <th className="py-2.5 px-3 min-w-[180px]">Nhóm Con</th>
                            <th className="py-2.5 px-3 w-32 text-right">Hệ Số Quy Đổi</th>
                            {isEditable && <th className="py-2.5 px-3 w-12"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={isEditable ? 6 : 5} className="py-10 text-center text-slate-400 font-medium">
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
                                        <td className="py-2 px-3 text-center text-slate-400 tabular-nums font-mono text-[11px]">
                                            {rowNum}
                                        </td>
                                        <td className="py-2 px-3 font-mono font-bold text-sky-700">
                                            {item.code}
                                        </td>
                                        <td className="py-2 px-3 font-bold text-slate-700">
                                            {renderCell(item, 'parentGroup')}
                                        </td>
                                        <td className="py-2 px-3 text-slate-600">
                                            {renderCell(item, 'subgroup')}
                                        </td>
                                        <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-800">
                                            {renderCell(item, 'multiplier')}
                                        </td>
                                        {isEditable && (
                                            <td className="py-2 px-1 text-center">
                                                <button
                                                    onClick={() => onDeleteItem?.(item.code)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500"
                                                    title="Xoá"
                                                >
                                                    <AppIcon name="close" size="xs" />
                                                </button>
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
