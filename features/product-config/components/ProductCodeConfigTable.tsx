import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Input } from '../../../components/shared/ui/Input';
import { Select } from '../../../components/shared/ui/Select';
import { Button } from '../../../components/shared/ui/Button';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import type { ProductCodeTableItem } from '../types';
import { exportProductCodeConfigToExcel } from '../services/firebaseProductConfigService';

interface ProductCodeConfigTableProps {
    items: ProductCodeTableItem[];
    isEditable?: boolean;
    onAddItem?: (item: ProductCodeTableItem) => void;
    onUpdateItem?: (maSanPham: string, updates: Partial<ProductCodeTableItem>) => void;
    onDeleteItem?: (maSanPham: string) => void;
}

interface EditingState {
    maSanPham: string;
    field: 'tenSanPham' | 'heSo' | 'heSoSoLuong' | 'heSoDoanhThu' | 'loai' | 'nhom';
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
    // Mã SP đang chờ xác nhận xoá — GĐ10 (2026-10-15): ConfirmDialog dùng chung thay `window.confirm` (CLAUDE.md mục 2). Đóng hộp
    // chỉ tắt `mo` — mã giữ nguyên trong lúc modal mờ dần (không nháy "Mã SP  sẽ bị xoá" trống).
    const [hoiXoaMa, setHoiXoaMa] = useState<{ mo: boolean; ma: string }>({ mo: false, ma: '' });

    // Form thêm mới
    const [newMaSP, setNewMaSP] = useState('');
    const [newTenSP, setNewTenSP] = useState('');
    const [newLoaiHeSo, setNewLoaiHeSo] = useState<'so_luong' | 'doanh_thu' | 'ca_hai'>('so_luong');
    const [newHeSoSL, setNewHeSoSL] = useState('1');
    const [newHeSoDT, setNewHeSoDT] = useState('1');
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
        if (!ma) return;

        let hsSL: number | undefined = undefined;
        let hsDT: number | undefined = undefined;

        if (newLoaiHeSo === 'so_luong' || newLoaiHeSo === 'ca_hai') {
            hsSL = parseFloat(newHeSoSL.replace(',', '.')) || 1;
        }
        if (newLoaiHeSo === 'doanh_thu' || newLoaiHeSo === 'ca_hai') {
            hsDT = parseFloat(newHeSoDT.replace(',', '.')) || 1;
        }

        const primaryHeSo = (newLoaiHeSo === 'doanh_thu' ? hsDT : hsSL) || 1;

        onAddItem?.({
            maSanPham: ma,
            tenSanPham: ten,
            heSo: primaryHeSo,
            heSoSoLuong: hsSL,
            heSoDoanhThu: hsDT,
            loaiHeSo: newLoaiHeSo,
            loai: newLoai.trim() || undefined,
            nhom: newNhom.trim() || undefined,
        });

        setNewMaSP('');
        setNewTenSP('');
        setNewLoaiHeSo('so_luong');
        setNewHeSoSL('1');
        setNewHeSoDT('1');
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
                onUpdateItem?.(maSanPham, { heSo: num, heSoSoLuong: num });
            } else if (field === 'heSoSoLuong') {
                const num = parseFloat(val.replace(',', '.')) || 1;
                onUpdateItem?.(maSanPham, { heSoSoLuong: num, heSo: num });
            } else if (field === 'heSoDoanhThu') {
                const num = parseFloat(val.replace(',', '.')) || 1;
                onUpdateItem?.(maSanPham, { heSoDoanhThu: num });
            } else {
                onUpdateItem?.(maSanPham, { [field]: val.trim() || undefined });
            }
            setEditing(null);
        },
        [editing, onUpdateItem]
    );

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-card overflow-hidden shadow-sm">
            {/* Filter Bar */}
            <div className="p-3 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row gap-2 sm:gap-2.5 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
                    <Input
                        dense
                        leftIcon="search"
                        placeholder="Tìm mã sản phẩm, tên sản phẩm, loại, nhóm..."
                        value={search}
                        onChange={e => handleSearchChange(e.target.value)}
                        className="h-8 text-xs rounded-control w-full"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                    {uniqueNhoms.length > 0 && (
                        <div className="flex-1 sm:w-44 min-w-0">
                            <Select
                                dense
                                value={selectedNhom}
                                onChange={e => handleNhomChange(e.target.value)}
                                className="h-8 text-xs rounded-control pl-2 pr-7 truncate"
                            >
                                <option value="all">Tất cả nhóm ({uniqueNhoms.length})</option>
                                {uniqueNhoms.map(n => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}

                    {uniqueSheets.length > 1 && (
                        <div className="flex-1 sm:w-36 min-w-0">
                            <Select
                                dense
                                value={selectedSheet}
                                onChange={e => handleSheetChange(e.target.value)}
                                className="h-8 text-xs rounded-control pl-2 pr-7 truncate"
                            >
                                <option value="all">Tất cả nguồn sheet</option>
                                {uniqueSheets.map(s => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}

                    {isEditable && (
                        <Button
                            variant="secondary"
                            size="none"
                            onClick={() => setIsAdding(!isAdding)}
                            title={isAdding ? 'Đóng form thêm mới' : 'Thêm mới mã sản phẩm'}
                            aria-label={isAdding ? 'Đóng' : 'Thêm mới'}
                            className="ycx-hit w-8 h-8 rounded-control border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-2xs"
                        >
                            <AppIcon name={isAdding ? 'close' : 'add'} size="sm" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Modal/Form thêm mới */}
            {isAdding && isEditable && (
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                            <AppIcon name="add" size="xs" /> Thêm mới Mã Sản Phẩm
                        </span>
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => setIsAdding(false)}
                            aria-label="Đóng"
                            className="text-slate-400 hover:text-slate-600 min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 flex items-center justify-center cursor-pointer"
                        >
                            <AppIcon name="close" size="sm" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                        <div>
                            <label className="text-[11px] font-semibold text-slate-500">Mã sản phẩm *</label>
                            <Input
                                placeholder="VD: 1997139000289"
                                value={newMaSP}
                                onChange={e => setNewMaSP(e.target.value)}
                                className="h-8 text-xs font-mono"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-[11px] font-semibold text-slate-500">Tên sản phẩm *</label>
                            <Input
                                placeholder="VD: BHMR 1 năm Apple Watch"
                                value={newTenSP}
                                onChange={e => setNewTenSP(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold text-slate-500">Loại</label>
                            <Input
                                placeholder="VD: Apple Watch"
                                value={newLoai}
                                onChange={e => setNewLoai(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold text-slate-500">Nhóm</label>
                            <Input
                                placeholder="VD: ICT"
                                value={newNhom}
                                onChange={e => setNewNhom(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>

                    {/* Chọn Loại hệ số & Ô nhập tương ứng */}
                    <div className="pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-slate-600">Loại hệ số:</span>
                                <div className="inline-flex items-center p-0.5 bg-slate-200/80 rounded-control text-[11px] font-semibold">
                                    <Button
                                        variant="unstyled"
                                        size="none"
                                        type="button"
                                        onClick={() => setNewLoaiHeSo('so_luong')}
                                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                            newLoaiHeSo === 'so_luong'
                                                ? 'bg-white text-sky-700 shadow-2xs font-bold'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Số lượng (SL)
                                    </Button>
                                    <Button
                                        variant="unstyled"
                                        size="none"
                                        type="button"
                                        onClick={() => setNewLoaiHeSo('doanh_thu')}
                                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                            newLoaiHeSo === 'doanh_thu'
                                                ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Doanh thu (DT)
                                    </Button>
                                    <Button
                                        variant="unstyled"
                                        size="none"
                                        type="button"
                                        onClick={() => setNewLoaiHeSo('ca_hai')}
                                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                            newLoaiHeSo === 'ca_hai'
                                                ? 'bg-white text-amber-700 shadow-2xs font-bold'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Cả hai (SL & DT)
                                    </Button>
                                </div>
                            </div>

                            {(newLoaiHeSo === 'so_luong' || newLoaiHeSo === 'ca_hai') && (
                                <div className="flex items-center gap-1.5">
                                    <label htmlFor="cfg-ma-sp-he-so-sl" className="text-[11px] font-semibold text-slate-600">Hệ số SL:</label>
                                    <Input
                                        id="cfg-ma-sp-he-so-sl"
                                        type="number"
                                        step="0.01"
                                        fullWidth={false}
                                        value={newHeSoSL}
                                        onChange={e => setNewHeSoSL(e.target.value)}
                                        className="w-16 h-7 text-xs px-2 font-semibold text-slate-700"
                                    />
                                    {newLoaiHeSo === 'so_luong' && (
                                        <span className="text-[11px] text-slate-400 italic">(bán 1 tính SL là {newHeSoSL || 1}, không nhân DT)</span>
                                    )}
                                </div>
                            )}

                            {(newLoaiHeSo === 'doanh_thu' || newLoaiHeSo === 'ca_hai') && (
                                <div className="flex items-center gap-1.5">
                                    <label htmlFor="cfg-ma-sp-he-so-dt" className="text-[11px] font-semibold text-slate-600">Hệ số DT:</label>
                                    <Input
                                        id="cfg-ma-sp-he-so-dt"
                                        type="number"
                                        step="0.01"
                                        fullWidth={false}
                                        value={newHeSoDT}
                                        onChange={e => setNewHeSoDT(e.target.value)}
                                        className="w-16 h-7 text-xs px-2 font-semibold text-slate-700"
                                    />
                                    {newLoaiHeSo === 'doanh_thu' && (
                                        <span className="text-[11px] text-slate-400 italic">(nhân {newHeSoDT || 1} vào DT tính DTQĐ)</span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
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

            {/* Bảng dữ liệu chuẩn có đầy đủ cột Hệ số SL và Hệ số DT */}
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700/80">
                        <tr>
                            <th className="py-2.5 px-3 w-12 text-center">STT</th>
                            <th className="py-2.5 px-3 min-w-[140px]">MÃ SẢN PHẨM</th>
                            <th className="py-2.5 px-3 min-w-[220px]">TÊN SẢN PHẨM</th>
                            <th 
                                className="py-2.5 px-3 w-28 text-center select-none"
                                title="Hệ số quy đổi số lượng (Weighted Quantity). Ví dụ: bán 1 gói có hệ số 2 sẽ tính số lượng là 2. Tuyệt đối không nhân vào doanh thu."
                            >
                                <div className="flex flex-col items-center justify-center leading-tight">
                                    <span>HỆ SỐ SL</span>
                                    <span className="text-[11px] font-normal text-slate-400 lowercase tracking-normal">(quy đổi)</span>
                                </div>
                            </th>
                            <th 
                                className="py-2.5 px-3 w-28 text-center select-none"
                                title="Hệ số quy đổi doanh thu (DTQĐ). Nhân trực tiếp vào doanh thu thực tế của mã sản phẩm khi tính DTQĐ."
                            >
                                <div className="flex flex-col items-center justify-center leading-tight">
                                    <span>HỆ SỐ DT</span>
                                    <span className="text-[11px] font-normal text-slate-400 lowercase tracking-normal">(nhân DT)</span>
                                </div>
                            </th>
                            <th className="py-2.5 px-3 min-w-[120px]">LOẠI</th>
                            <th className="py-2.5 px-3 min-w-[100px]">NHÓM</th>
                            {isEditable && <th className="py-2.5 px-3 w-16 text-center"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                        {pagedItems.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={isEditable ? 8 : 7}
                                    className="px-4 py-10 text-center"
                                >
                                    {items.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto py-2">
                                            <div className="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400">
                                                <AppIcon name="template" size="md" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                Chưa có cấu hình mã sản phẩm nào
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                                Bạn có thể tải file Excel mẫu để tham khảo 3 dòng ví dụ cho 3 loại hệ số: <strong>Số lượng (SL)</strong>, <strong>Doanh thu (DT)</strong> và <strong>Cả hai (SL & DT)</strong>.
                                            </p>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                type="button"
                                                onClick={() => exportProductCodeConfigToExcel([], { asTemplate: true })}
                                                className="ycx-hit mt-2 gap-1.5 shadow-2xs font-semibold text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                                            >
                                                <AppIcon name="download" size="xs" />
                                                <span>Tải file Excel mẫu (3 loại hệ số)</span>
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 italic py-4">
                                            Không có dữ liệu mã sản phẩm phù hợp với bộ lọc tìm kiếm.
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            pagedItems.map((item, idx) => {
                                const stt = (page - 1) * pageSize + idx + 1;
                                const valSL = item.heSoSoLuong !== undefined ? item.heSoSoLuong : (item.loaiHeSo === 'doanh_thu' ? undefined : item.heSo);
                                const valDT = item.heSoDoanhThu !== undefined ? item.heSoDoanhThu : (item.loaiHeSo === 'doanh_thu' ? item.heSo : undefined);

                                const isEditingHeSoSL = editing?.maSanPham === item.maSanPham && (editing.field === 'heSoSoLuong' || editing.field === 'heSo');
                                const isEditingHeSoDT = editing?.maSanPham === item.maSanPham && editing.field === 'heSoDoanhThu';
                                const isEditingTen = editing?.maSanPham === item.maSanPham && editing.field === 'tenSanPham';
                                const isEditingLoai = editing?.maSanPham === item.maSanPham && editing.field === 'loai';
                                const isEditingNhom = editing?.maSanPham === item.maSanPham && editing.field === 'nhom';

                                return (
                                    <tr
                                        key={`${item.maSanPham}-${idx}`}
                                        className="hover:bg-sky-50/50 dark:hover:bg-slate-700/40 transition-colors group"
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
                                        {/* Cột Hệ số SL */}
                                        <td
                                            className="px-3 py-2 text-center font-bold font-mono text-slate-700 cursor-pointer"
                                            onDoubleClick={() =>
                                                isEditable &&
                                                setEditing({
                                                    maSanPham: item.maSanPham,
                                                    field: 'heSoSoLuong',
                                                    value: String(valSL !== undefined ? valSL : '1'),
                                                })
                                            }
                                        >
                                            {isEditingHeSoSL ? (
                                                <InlineInput
                                                    type="number"
                                                    value={editing.value}
                                                    onSave={handleInlineSave}
                                                    onCancel={() => setEditing(null)}
                                                    className="w-16 mx-auto text-center"
                                                />
                                            ) : valSL !== undefined ? (
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                                        valSL > 1
                                                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}
                                                    title={isEditable ? 'Nhấp đúp để sửa hệ số quy đổi số lượng (bán 1 tính SL là...)' : 'Hệ số quy đổi số lượng bán (không nhân doanh thu)'}
                                                >
                                                    {valSL.toLocaleString('vi-VN')}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300" title={isEditable ? 'Nhấp đúp để thêm hệ số SL' : undefined}>—</span>
                                            )}
                                        </td>
                                        {/* Cột Hệ số DT */}
                                        <td
                                            className="px-3 py-2 text-center font-bold font-mono text-slate-700 cursor-pointer"
                                            onDoubleClick={() =>
                                                isEditable &&
                                                setEditing({
                                                    maSanPham: item.maSanPham,
                                                    field: 'heSoDoanhThu',
                                                    value: String(valDT !== undefined ? valDT : '1'),
                                                })
                                            }
                                        >
                                            {isEditingHeSoDT ? (
                                                <InlineInput
                                                    type="number"
                                                    value={editing.value}
                                                    onSave={handleInlineSave}
                                                    onCancel={() => setEditing(null)}
                                                    className="w-16 mx-auto text-center"
                                                />
                                            ) : valDT !== undefined ? (
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                                        valDT > 1
                                                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    }`}
                                                    title={isEditable ? 'Nhấp đúp để sửa hệ số doanh thu (nhân vào doanh thu tính DTQĐ)' : 'Hệ số quy đổi doanh thu (DTQĐ)'}
                                                >
                                                    {valDT.toLocaleString('vi-VN')}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300" title={isEditable ? 'Nhấp đúp để thêm hệ số DT' : undefined}>—</span>
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
                                            <td className="py-2 px-1 text-center align-middle">
                                                <Button
                                                    variant="unstyled"
                                                    size="none"
                                                    type="button"
                                                    onClick={() => setHoiXoaMa({ mo: true, ma: item.maSanPham })}
                                                    className="ycx-hit opacity-60 sm:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500 cursor-pointer"
                                                    title="Xoá mã sản phẩm"
                                                    aria-label={`Xoá mã sản phẩm ${item.maSanPham}`}
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

            {/* Phân trang */}
            {totalPages > 1 && (
                <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span>Trang {page} / {totalPages}</span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <Select
                            dense
                            fullWidth={false}
                            aria-label="Số mục mỗi trang"
                            value={pageSize}
                            onChange={e => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                            className="h-7 text-xs border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        >
                            <option value={25}>25 mục/trang</option>
                            <option value={50}>50 mục/trang</option>
                            <option value={100}>100 mục/trang</option>
                        </Select>
                    </div>

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
            <ConfirmDialog
                isOpen={hoiXoaMa.mo}
                onClose={() => setHoiXoaMa((h) => ({ ...h, mo: false }))}
                variant="danger"
                title="Xoá mã sản phẩm?"
                message={`Mã SP ${hoiXoaMa.ma} sẽ bị xoá khỏi bảng cấu hình.`}
                confirmText="Xoá"
                onConfirm={() => {
                    onDeleteItem?.(hoiXoaMa.ma);
                    setHoiXoaMa((h) => ({ ...h, mo: false }));
                }}
            />
        </div>
    );
};
