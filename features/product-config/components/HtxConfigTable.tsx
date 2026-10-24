import React, { useState, useMemo, useCallback } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Input } from '../../../components/shared/ui/Input';
import { Select } from '../../../components/shared/ui/Select';
import { Button } from '../../../components/shared/ui/Button';
import { Switch } from '../../../components/shared/ui/Switch';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import { Modal } from '../../../components/shared/ui/Modal';
import type { IconName } from '../../../components/shared/ui/icon/iconRegistry';
import type { HtxTableItem, HtxClassificationType } from '../types';

interface HtxConfigTableProps {
    items: HtxTableItem[];
    isEditable?: boolean;
    onAddItem?: (item: HtxTableItem) => void;
    onUpdateItem?: (oldName: string, updates: Partial<HtxTableItem>) => void;
    onToggleRevenue?: (name: string, isRevenueEligible: boolean) => void;
    onDeleteItem?: (name: string) => void;
}

const CLASSIFICATION_CONFIG: Record<
    HtxClassificationType,
    { label: string; bg: string; text: string; border: string; icon: IconName }
> = {
    tien_mat: {
        label: 'Tiền mặt',
        bg: 'bg-sky-50 dark:bg-sky-950/50',
        text: 'text-sky-700 dark:text-sky-300',
        border: 'border-sky-200 dark:border-sky-800',
        icon: 'wallet',
    },
    tra_gop: {
        label: 'Trả góp',
        bg: 'bg-emerald-50 dark:bg-emerald-950/50',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        icon: 'calendar',
    },
    thu_ho: {
        label: 'Thu hộ',
        bg: 'bg-amber-50 dark:bg-amber-950/50',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        icon: 'refresh',
    },
    khac: {
        label: 'Khác',
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-700',
        icon: 'info',
    },
};

export const HtxConfigTable: React.FC<HtxConfigTableProps> = ({
    items,
    isEditable = false,
    onAddItem,
    onUpdateItem,
    onToggleRevenue,
    onDeleteItem,
}) => {
    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState<string>('all');
    const [filterRevenue, setFilterRevenue] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<HtxTableItem | null>(null);

    // Form state (dùng chung cho thêm mới & chỉnh sửa)
    const [formName, setFormName] = useState('');
    const [formClassification, setFormClassification] = useState<HtxClassificationType>('tien_mat');
    const [formIsRevenueEligible, setFormIsRevenueEligible] = useState(true);
    const [formDescription, setFormDescription] = useState('');

    // Hộp thoại xác nhận xoá
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; name: string }>({
        open: false,
        name: '',
    });



    // Lọc danh sách
    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();
        return items.filter(it => {
            if (filterClass !== 'all' && it.classification !== filterClass) return false;
            if (filterRevenue === 'revenue' && !it.isRevenueEligible) return false;
            if (filterRevenue === 'non_revenue' && it.isRevenueEligible) return false;

            if (!query) return true;
            return (
                it.name.toLowerCase().includes(query) ||
                (it.description || '').toLowerCase().includes(query)
            );
        });
    }, [items, search, filterClass, filterRevenue]);

    // Phân trang
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    const pagedItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredItems.slice(start, start + pageSize);
    }, [filteredItems, page, pageSize]);

    // Reset về trang 1 khi lọc thay đổi
    const handleSearchChange = (val: string) => {
        setSearch(val);
        setPage(1);
    };

    const handleFilterClassChange = (val: string) => {
        setFilterClass(val);
        setPage(1);
    };

    const handleFilterRevenueChange = (val: string) => {
        setFilterRevenue(val);
        setPage(1);
    };

    // Mở / đóng form thêm mới inline
    const handleOpenAddModal = () => {
        if (isAddModalOpen) {
            setIsAddModalOpen(false);
            return;
        }
        setFormName('');
        setFormClassification('tien_mat');
        setFormIsRevenueEligible(true);
        setFormDescription('');
        setIsAddModalOpen(true);
    };

    // Mở modal chỉnh sửa
    const handleOpenEditModal = (item: HtxTableItem) => {
        setEditingItem(item);
        setFormName(item.name);
        setFormClassification(item.classification);
        setFormIsRevenueEligible(item.isRevenueEligible);
        setFormDescription(item.description || '');
    };

    // Xử lý khi đổi phân loại trong form (gợi ý tự động trạng thái tính DT)
    const handleClassificationChange = (cls: HtxClassificationType) => {
        setFormClassification(cls);
        if (cls === 'tien_mat' || cls === 'tra_gop') {
            setFormIsRevenueEligible(true);
        } else {
            setFormIsRevenueEligible(false);
        }
    };

    // Lưu form thêm mới
    const handleSaveNew = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = formName.trim();
        if (!trimmed) return;

        if (onAddItem) {
            onAddItem({
                id: trimmed,
                name: trimmed,
                classification: formClassification,
                isRevenueEligible: formIsRevenueEligible,
                description: formDescription.trim() || undefined,
            });
        }
        setIsAddModalOpen(false);
    };

    // Lưu form chỉnh sửa
    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;
        const trimmed = formName.trim();
        if (!trimmed) return;

        if (onUpdateItem) {
            onUpdateItem(editingItem.name, {
                name: trimmed,
                classification: formClassification,
                isRevenueEligible: formIsRevenueEligible,
                description: formDescription.trim() || undefined,
            });
        }
        setEditingItem(null);
    };

    // Xác nhận xoá
    const handleConfirmDelete = () => {
        if (deleteConfirm.name && onDeleteItem) {
            onDeleteItem(deleteConfirm.name);
        }
        setDeleteConfirm({ open: false, name: '' });
    };

    return (
        <div>

            {/* Khối Bảng & Công cụ Danh sách Hình thức xuất */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-card overflow-hidden shadow-sm">
                {/* Filter Bar */}
                <div className="p-3 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row gap-2 sm:gap-2.5 items-stretch sm:items-center justify-between">
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
                        <Input
                            dense
                            leftIcon="search"
                            placeholder="Tìm kiếm hình thức xuất..."
                            value={search}
                            onChange={e => handleSearchChange(e.target.value)}
                            className="h-8 text-xs rounded-control w-full"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                        <div className="flex-1 sm:w-36 min-w-0">
                            <Select
                                dense
                                value={filterClass}
                                onChange={e => handleFilterClassChange(e.target.value)}
                                className="h-8 text-xs rounded-control pl-2 pr-7 truncate"
                            >
                                <option value="all">Tất cả phân loại</option>
                                <option value="tien_mat">Tiền mặt</option>
                                <option value="tra_gop">Trả góp</option>
                                <option value="thu_ho">Thu hộ</option>
                                <option value="khac">Khác</option>
                            </Select>
                        </div>

                        <div className="flex-1 sm:w-40 min-w-0">
                            <Select
                                dense
                                value={filterRevenue}
                                onChange={e => handleFilterRevenueChange(e.target.value)}
                                className="h-8 text-xs rounded-control pl-2 pr-7 truncate"
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="revenue">Có tính doanh thu</option>
                                <option value="non_revenue">Không tính DT</option>
                            </Select>
                        </div>

                        {isEditable && (
                            <Button
                                variant="secondary"
                                size="none"
                                onClick={handleOpenAddModal}
                                title={isAddModalOpen ? 'Đóng form thêm mới' : 'Thêm mới hình thức xuất'}
                                aria-label={isAddModalOpen ? 'Đóng' : 'Thêm mới'}
                                className="ycx-hit w-8 h-8 rounded-control border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-2xs"
                            >
                                <AppIcon name={isAddModalOpen ? 'close' : 'add'} size="sm" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Form thêm mới Hình thức xuất inline */}
                {isAddModalOpen && isEditable && (
                    <form
                        onSubmit={handleSaveNew}
                        className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-800/60 space-y-3"
                    >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <AppIcon name="add" size="xs" /> Thêm mới Hình Thức Xuất
                        </span>
                        <Button
                            variant="unstyled"
                            size="none"
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            aria-label="Đóng"
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 flex items-center justify-center cursor-pointer"
                        >
                            <AppIcon name="close" size="sm" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
                                Tên hình thức xuất <span className="text-rose-500">*</span>
                            </label>
                            <Input
                                dense
                                placeholder="VD: Xuất bán lẻ tại siêu thị (khớp cột file bán hàng)"
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
                                Ghi chú / Mô tả (tùy chọn)
                            </label>
                            <Input
                                dense
                                placeholder="VD: Đơn bán tiền mặt trực tiếp"
                                value={formDescription}
                                onChange={e => setFormDescription(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>

                    {/* Phân loại & Tính doanh thu & Nút lưu */}
                    <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Phân loại:</span>
                                <div className="inline-flex items-center p-0.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-control text-[11px] font-semibold">
                                    {(['tien_mat', 'tra_gop', 'thu_ho', 'khac'] as HtxClassificationType[]).map(cls => {
                                        const cfg = CLASSIFICATION_CONFIG[cls];
                                        const isSelected = formClassification === cls;
                                        return (
                                            <Button
                                                key={cls}
                                                variant="unstyled"
                                                size="none"
                                                type="button"
                                                onClick={() => handleClassificationChange(cls)}
                                                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                                                    isSelected
                                                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                            >
                                                <AppIcon name={cfg.icon} size="xs" />
                                                <span>{cfg.label}</span>
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pl-0 sm:pl-3 sm:border-l border-slate-200 dark:border-slate-700">
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Tính doanh thu:</span>
                                <Switch
                                    checked={formIsRevenueEligible}
                                    onChange={setFormIsRevenueEligible}
                                    label="Bật/Tắt tính doanh thu"
                                />
                                <span className={`text-[11px] font-bold ${formIsRevenueEligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                    {formIsRevenueEligible ? 'Có tính DT' : 'Không tính DT'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                            <Button
                                variant="secondary"
                                size="sm"
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="h-7 text-xs"
                            >
                                Hủy
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                type="submit"
                                disabled={!formName.trim()}
                                className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                            >
                                Lưu hình thức xuất
                            </Button>
                        </div>
                    </div>
                </form>
            )}

            {/* Table */}
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700/80">
                        <tr>
                            <th className="py-2.5 px-3 w-12 text-center">STT</th>
                            <th className="py-2.5 px-3 min-w-[220px]">TÊN HÌNH THỨC XUẤT</th>
                            <th className="py-2.5 px-3 w-36 text-center">PHÂN LOẠI</th>
                            <th className="py-2.5 px-3 w-40 text-center">TÍNH DOANH THU</th>
                            {isEditable && (
                                <th className="py-2.5 px-3 w-20 text-center">THAO TÁC</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                            {pagedItems.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={isEditable ? 5 : 4}
                                        className="py-12 text-center text-slate-400 dark:text-slate-500"
                                    >
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <AppIcon name="search" size="xl" className="text-slate-300 dark:text-slate-600" />
                                            <p className="text-xs font-medium">Không tìm thấy hình thức xuất nào phù hợp</p>
                                            {(search || filterClass !== 'all' || filterRevenue !== 'all') && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSearch('');
                                                        setFilterClass('all');
                                                        setFilterRevenue('all');
                                                        setPage(1);
                                                    }}
                                                >
                                                    Đặt lại bộ lọc
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                pagedItems.map((item, idx) => {
                                    const stt = (page - 1) * pageSize + idx + 1;
                                    const classCfg = CLASSIFICATION_CONFIG[item.classification] || CLASSIFICATION_CONFIG.khac;

                                    return (
                                        <tr
                                            key={item.name}
                                            className="hover:bg-sky-50/50 dark:hover:bg-slate-700/40 transition-colors group"
                                        >
                                            {/* STT */}
                                            <td className="py-2 px-1.5 sm:px-3 text-center text-slate-400 tabular-nums font-mono text-[11px] align-middle">
                                                {stt}
                                            </td>

                                            {/* Tên hình thức xuất */}
                                            <td className="py-2 px-3 align-middle">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                                                        {item.name}
                                                    </span>
                                                    {item.description && (
                                                        <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
                                                            {item.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Phân loại */}
                                            <td className="py-2 px-3 text-center align-middle">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${classCfg.bg} ${classCfg.text} ${classCfg.border}`}
                                                >
                                                    <AppIcon name={classCfg.icon} size="xs" />
                                                    <span>{classCfg.label}</span>
                                                </span>
                                            </td>

                                            {/* Tính doanh thu (Công tắc 1-chạm + Badge) */}
                                            <td className="py-2 px-3 align-middle">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Switch
                                                        checked={item.isRevenueEligible}
                                                        disabled={!isEditable}
                                                        size="sm"
                                                        onChange={checked => {
                                                            if (onToggleRevenue) {
                                                                onToggleRevenue(item.name, checked);
                                                            }
                                                        }}
                                                        label={`Tính doanh thu cho ${item.name}`}
                                                    />
                                                    <span
                                                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md min-w-[76px] text-center ${
                                                            item.isRevenueEligible
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        {item.isRevenueEligible ? 'Tính DT' : 'Không tính'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Thao tác (Sửa / Xoá) */}
                                            {isEditable && (
                                                <td className="py-2 px-1 text-center align-middle">
                                                    <div className="inline-flex items-center gap-1">
                                                        <Button
                                                            variant="unstyled"
                                                            size="none"
                                                            type="button"
                                                            onClick={() => handleOpenEditModal(item)}
                                                            title={`Chỉnh sửa ${item.name}`}
                                                            aria-label={`Chỉnh sửa ${item.name}`}
                                                            className="ycx-hit opacity-60 sm:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded hover:bg-sky-50 text-slate-400 hover:text-sky-600 cursor-pointer"
                                                        >
                                                            <AppIcon name="edit" size="xs" />
                                                        </Button>
                                                        <Button
                                                            variant="unstyled"
                                                            size="none"
                                                            type="button"
                                                            onClick={() =>
                                                                setDeleteConfirm({
                                                                    open: true,
                                                                    name: item.name,
                                                                })
                                                            }
                                                            title={`Xoá ${item.name}`}
                                                            aria-label={`Xoá ${item.name}`}
                                                            className="ycx-hit opacity-60 sm:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500 cursor-pointer"
                                                        >
                                                            <AppIcon name="close" size="xs" />
                                                        </Button>
                                                    </div>
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
                                value={String(pageSize)}
                                onChange={e => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="h-7 text-xs border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                            >
                                <option value="25">25 mục/trang</option>
                                <option value="50">50 mục/trang</option>
                                <option value="100">100 mục/trang</option>
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
            </div>



            {/* Modal Chỉnh sửa Hình thức xuất */}
            <Modal
                isOpen={Boolean(editingItem)}
                onClose={() => setEditingItem(null)}
                title={`Chỉnh Sửa: ${editingItem?.name || ''}`}
                maxWidth="md"
            >
                <form onSubmit={handleSaveEdit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                            Tên Hình Thức Xuất <span className="text-rose-500">*</span>
                        </label>
                        <Input
                            type="text"
                            required
                            value={formName}
                            onChange={e => setFormName(e.target.value)}
                            placeholder="Tên hình thức xuất"
                            className="text-xs h-9 rounded-control"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                            Phân Loại Hình Thức
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(['tien_mat', 'tra_gop', 'thu_ho', 'khac'] as HtxClassificationType[]).map(cls => {
                                const cfg = CLASSIFICATION_CONFIG[cls];
                                const isSelected = formClassification === cls;
                                return (
                                    <Button
                                        key={cls}
                                        variant="unstyled"
                                        size="none"
                                        type="button"
                                        onClick={() => setFormClassification(cls)}
                                        className={`flex flex-col items-center justify-center p-2.5 rounded-control border text-xs font-semibold transition-all cursor-pointer ${
                                            isSelected
                                                ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-sky-500/20 shadow-xs font-bold`
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <AppIcon name={cfg.icon} size="sm" className="mb-1" />
                                        <span>{cfg.label}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-control border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                Tính Doanh Thu (Doanh số bán hàng)
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                                Bật để tính vào KPI, doanh thu quy đổi và báo cáo kinh doanh.
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${formIsRevenueEligible ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {formIsRevenueEligible ? 'Có' : 'Không'}
                            </span>
                            <Switch
                                checked={formIsRevenueEligible}
                                onChange={setFormIsRevenueEligible}
                                label="Bật/Tắt tính doanh thu"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                            Ghi Chú / Mô Tả (Tuỳ chọn)
                        </label>
                        <Input
                            type="text"
                            value={formDescription}
                            onChange={e => setFormDescription(e.target.value)}
                            placeholder="Ghi chú thêm về hình thức xuất"
                            className="text-xs h-9 rounded-control"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={() => setEditingItem(null)}
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            type="submit"
                            disabled={!formName.trim()}
                        >
                            Cập Nhật
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Hộp thoại xác nhận xoá */}
            <ConfirmDialog
                isOpen={deleteConfirm.open}
                title="Xác nhận xoá hình thức xuất"
                message={
                    <span>
                        Bạn có chắc chắn muốn xoá hình thức xuất <b>{deleteConfirm.name}</b> khỏi cấu hình? Hành động này sẽ loại bỏ hình thức xuất khỏi hệ thống sau khi lưu Cloud.
                    </span>
                }
                confirmText="Xoá hình thức"
                cancelText="Hủy"
                variant="danger"
                onConfirm={handleConfirmDelete}
                onClose={() => setDeleteConfirm({ open: false, name: '' })}
            />
        </div>
    );
};
