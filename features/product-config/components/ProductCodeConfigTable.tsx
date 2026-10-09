import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Input } from '../../../components/shared/ui/Input';
import { Select } from '../../../components/shared/ui/Select';
import { Button } from '../../../components/shared/ui/Button';
import type { ProductCodeTableItem } from '../types';

interface ProductCodeConfigTableProps {
    items: ProductCodeTableItem[];
    isEditable?: boolean;
    onAddItem?: (item: ProductCodeTableItem) => void;
    onUpdateItem?: (maSanPham: string, updates: Partial<ProductCodeTableItem>) => void;
    onDeleteItem?: (maSanPham: string) => void;
}

interface EditingState {
    maSanPham: string;
    field: 'tenSanPham' | 'heSo' | 'loai' | 'nhom';
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

    useEffect(() => {
        ref.current?.focus();
        ref.current?.select();
    }, []);

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

export const ProductCodeConfigTable: React.FC<ProductCodeConfigTableProps> = ({
    items,
    isEditable,
    onAddItem,
    onUpdateItem,
    onDeleteItem,
}) => {
    const [search, setSearch] = useState('');
    const [selectedNhom, setSelectedNhom] = useState('all');
    const [selectedSheet, setSelectedSheet] = useState('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [isAdding, setIsAdding] = useState(false);
    const [editing, setEditing] = useState<EditingState | null>(null);

    // Form thêm mới
    const [newMaSP, setNewMaSP] = useState('');
    const [newTenSP, setNewTenSP] = useState('');
    const [newHeSo, setNewHeSo] = useState('1');
    const [newLoai, setNewLoai] = useState('');
    const [newNhom, setNewNhom] = useState('');

    // Danh sách các Nhóm và Sheet duy nhất
    const uniqueNhoms = useMemo(() => {
        const set = new Set<string>();
        items.forEach(it => {
            if (it.nhom && it.nhom.trim()) set.add(it.nhom.trim());
        });
        return Array.from(set).sort();
    }, [items]);

    const uniqueSheets = useMemo(() => {
        const set = new Set<string>();
        items.forEach(it => {
            if (it.sheetSource && it.sheetSource.trim()) set.add(it.sheetSource.trim());
        });
        return Array.from(set).sort();
    }, [items]);

    // Lọc theo search + nhóm + sheet
    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter(it => {
            if (selectedNhom !== 'all' && (it.nhom || '').trim() !== selectedNhom) return false;
            if (selectedSheet !== 'all' && (it.sheetSource || '').trim() !== selectedSheet) return false;
            if (!q) return true;
            return (
                it.maSanPham.toLowerCase().includes(q) ||
                it.tenSanPham.toLowerCase().includes(q) ||
                (it.loai || '').toLowerCase().includes(q) ||
                (it.nhom || '').toLowerCase().includes(q)
            );
        });
    }, [items, search, selectedNhom, selectedSheet]);

    // Phân trang
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    const pagedItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredItems.slice(start, start + pageSize);
    }, [filteredItems, page, pageSize]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setPage(1);
    };

    const handleNhomChange = (val: string) => {
        setSelectedNhom(val);
        setPage(1);
    };

    const handleSheetChange = (val: string) => {
        setSelectedSheet(val);
        setPage(1);
    };

    const handleSaveAdd = () => {
        const ma = newMaSP.trim();
        const ten = newTenSP.trim();
        const hs = parseFloat(newHeSo.replace(',', '.')) || 1;
        if (!ma) return;
        onAddItem?.({
            maSanPham: ma,
            tenSanPham: ten,
            heSo: hs,
            loai: newLoai.trim() || undefined,
            nhom: newNhom.trim() || undefined,
        });
        setNewMaSP('');
        setNewTenSP('');
        setNewHeSo('1');
        setNewLoai('');
        setNewNhom('');
        setIsAdding(false);
    };

    const handleInlineSave = useCallback(
        (val: string) => {
            if (!editing) return;
            const { maSanPham, field } = editing;
            if (field === 'heSo') {
                const num = parseFloat(val.replace(',', '.')) || 1;
                onUpdateItem?.(maSanPham, { heSo: num });
            } else {
                onUpdateItem?.(maSanPham, { [field]: val.trim() || undefined });
            }
            setEditing(null);
        },
        [editing, onUpdateItem]
    );

    return (
        <div className="bg-white border border-slate-200 rounded-card p-3.5 shadow-sm space-y-3">
            {/* Header toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Input
                            placeholder="Tìm mã sản phẩm, tên sản phẩm, loại, nhóm..."
                            value={search}
                            onChange={e => handleSearchChange(e.target.value)}
                            className="h-8.5 text-xs pl-8 pr-2"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <AppIcon name="search" size="xs" />
                        </span>
                    </div>

                    {uniqueNhoms.length > 0 && (
                        <Select
                            value={selectedNhom}
                            onChange={e => handleNhomChange(e.target.value)}
                            className="h-8.5 text-xs w-36"
                        >
                            <option value="all">Tất cả nhóm ({uniqueNhoms.length})</option>
                            {uniqueNhoms.map(n => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </Select>
                    )}

                    {uniqueSheets.length > 1 && (
                        <Select
                            value={selectedSheet}
                            onChange={e => handleSheetChange(e.target.value)}
                            className="h-8.5 text-xs w-36"
                        >
                            <option value="all">Tất cả nguồn sheet</option>
                            {uniqueSheets.map(s => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </Select>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {filteredItems.length} sản phẩm
                    </span>

                    {isEditable && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setIsAdding(true)}
                            className="h-8.5 gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <AppIcon name="add" size="xs" />
                            <span>Thêm mã SP</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Modal/Form thêm mới */}
            {isAdding && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                            <AppIcon name="add" size="xs" /> Thêm mới Mã Sản Phẩm
                        </span>
                        <button
                            onClick={() => setIsAdding(false)}
                            className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                        <div>
                            <label className="text-[10px] font-semibold text-slate-500">Mã sản phẩm *</label>
                            <Input
                                placeholder="VD: 1997139000289"
                                value={newMaSP}
                                onChange={e => setNewMaSP(e.target.value)}
                                className="h-8 text-xs font-mono"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-[10px] font-semibold text-slate-500">Tên sản phẩm *</label>
                            <Input
                                placeholder="VD: BHMR 1 năm Apple Watch"
                                value={newTenSP}
                                onChange={e => setNewTenSP(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-slate-500">Loại</label>
                            <Input
                                placeholder="VD: Apple Watch"
                                value={newLoai}
                                onChange={e => setNewLoai(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-slate-500">Nhóm</label>
                            <Input
                                placeholder="VD: ICT"
                                value={newNhom}
                                onChange={e => setNewNhom(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-semibold text-slate-500">Hệ số quy đổi:</label>
                            <input
                                type="number"
                                step="0.01"
                                value={newHeSo}
                                onChange={e => setNewHeSo(e.target.value)}
                                className="w-20 h-7 text-xs px-2 border border-slate-300 rounded outline-none font-semibold text-slate-700"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setIsAdding(false)}
                                className="h-7 text-xs"
                            >
                                Hủy
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleSaveAdd}
                                className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                Lưu mã SP
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bảng dữ liệu chuẩn 5 cột khớp 100% Hình 1 */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider">
                            <th className="px-3 py-2.5 w-12 text-center border-r border-slate-700">STT</th>
                            <th className="px-3 py-2.5 min-w-[150px] border-r border-slate-700">MÃ SẢN PHẨM</th>
                            <th className="px-3 py-2.5 min-w-[280px] border-r border-slate-700">TÊN SẢN PHẨM</th>
                            <th className="px-3 py-2.5 w-24 text-center border-r border-slate-700">HỆ SỐ</th>
                            <th className="px-3 py-2.5 min-w-[130px] border-r border-slate-700">LOẠI</th>
                            <th className="px-3 py-2.5 min-w-[100px] border-r border-slate-700">NHÓM</th>
                            {isEditable && <th className="px-3 py-2.5 w-20 text-center">Thao tác</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                        {pagedItems.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={isEditable ? 7 : 6}
                                    className="px-4 py-8 text-center text-slate-400 italic"
                                >
                                    Không có dữ liệu mã sản phẩm phù hợp.
                                </td>
                            </tr>
                        ) : (
                            pagedItems.map((item, idx) => {
                                const stt = (page - 1) * pageSize + idx + 1;
                                const isEditingHeSo =
                                    editing?.maSanPham === item.maSanPham && editing.field === 'heSo';
                                const isEditingTen =
                                    editing?.maSanPham === item.maSanPham && editing.field === 'tenSanPham';
                                const isEditingLoai =
                                    editing?.maSanPham === item.maSanPham && editing.field === 'loai';
                                const isEditingNhom =
                                    editing?.maSanPham === item.maSanPham && editing.field === 'nhom';

                                return (
                                    <tr
                                        key={`${item.maSanPham}-${idx}`}
                                        className="hover:bg-sky-50/50 transition-colors"
                                    >
                                        <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">
                                            {stt}
                                        </td>
                                        <td className="px-3 py-2 font-mono font-semibold text-sky-700 select-all">
                                            {item.maSanPham}
                                        </td>
                                        <td
                                            className="px-3 py-2 text-slate-800"
                                            onDoubleClick={() =>
                                                isEditable &&
                                                setEditing({
                                                    maSanPham: item.maSanPham,
                                                    field: 'tenSanPham',
                                                    value: item.tenSanPham,
                                                })
                                            }
                                        >
                                            {isEditingTen ? (
                                                <InlineInput
                                                    value={editing.value}
                                                    onSave={handleInlineSave}
                                                    onCancel={() => setEditing(null)}
                                                />
                                            ) : (
                                                <span title={isEditable ? 'Nhấp đúp để sửa tên' : undefined}>
                                                    {item.tenSanPham || '—'}
                                                </span>
                                            )}
                                        </td>
                                        <td
                                            className="px-3 py-2 text-center font-bold font-mono text-slate-700 cursor-pointer"
                                            onDoubleClick={() =>
                                                isEditable &&
                                                setEditing({
                                                    maSanPham: item.maSanPham,
                                                    field: 'heSo',
                                                    value: String(item.heSo),
                                                })
                                            }
                                        >
                                            {isEditingHeSo ? (
                                                <InlineInput
                                                    type="number"
                                                    value={editing.value}
                                                    onSave={handleInlineSave}
                                                    onCancel={() => setEditing(null)}
                                                    className="w-16 mx-auto text-center"
                                                />
                                            ) : (
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                                        item.heSo > 1
                                                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}
                                                    title={isEditable ? 'Nhấp đúp để sửa hệ số' : undefined}
                                                >
                                                    {item.heSo.toLocaleString('vi-VN')}
                                                </span>
                                            )}
                                        </td>
                                        <td
                                            className="px-3 py-2 text-slate-600"
                                            onDoubleClick={() =>
                                                isEditable &&
                                                setEditing({
                                                    maSanPham: item.maSanPham,
                                                    field: 'loai',
                                                    value: item.loai || '',
                                                })
                                            }
                                        >
                                            {isEditingLoai ? (
                                                <InlineInput
                                                    value={editing.value}
                                                    onSave={handleInlineSave}
                                                    onCancel={() => setEditing(null)}
                                                />
                                            ) : item.loai ? (
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[11px] bg-sky-50 text-sky-800 border border-sky-200">
                                                    {item.loai}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td
                                            className="px-3 py-2 font-medium text-slate-700"
                                            onDoubleClick={() =>
                                                isEditable &&
                                                setEditing({
                                                    maSanPham: item.maSanPham,
                                                    field: 'nhom',
                                                    value: item.nhom || '',
                                                })
                                            }
                                        >
                                            {isEditingNhom ? (
                                                <InlineInput
                                                    value={editing.value}
                                                    onSave={handleInlineSave}
                                                    onCancel={() => setEditing(null)}
                                                />
                                            ) : item.nhom ? (
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                                    {item.nhom}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        {isEditable && (
                                            <td className="px-3 py-2 text-center">
                                                <button
                                                    onClick={() => {
                                                        if (
                                                            window.confirm(
                                                                `Bạn có chắc chắn muốn xoá mã SP ${item.maSanPham}?`
                                                            )
                                                        ) {
                                                            onDeleteItem?.(item.maSanPham);
                                                        }
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                                                    title="Xoá mã sản phẩm"
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

            {/* Phân trang */}
            {filteredItems.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <span>Hiển thị mỗi trang:</span>
                        <select
                            value={pageSize}
                            onChange={e => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                            className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 outline-none"
                        >
                            <option value={25}>25 mục</option>
                            <option value={50}>50 mục</option>
                            <option value={100}>100 mục</option>
                        </select>
                        <span className="text-slate-400">|</span>
                        <span>
                            Trang <strong>{page}</strong> / <strong>{totalPages}</strong> (
                            {filteredItems.length} mục)
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="h-7 text-xs px-2"
                        >
                            <AppIcon name="chevronLeft" size="xs" />
                            <span>Trước</span>
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="h-7 text-xs px-2"
                        >
                            <span>Sau</span>
                            <AppIcon name="chevronRight" size="xs" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
