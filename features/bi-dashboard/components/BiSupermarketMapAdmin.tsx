
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Card from './Card';
import { TrashIcon, PencilIcon } from './Icons';
import { Button } from '../../../components/shared/ui/Button';
import { Input } from '../../../components/shared/ui/Input';
import { DataTable, type DataTableColumn } from '../../../components/shared/ui/DataTable';
import { EmptyState } from '../../../components/shared/ui/EmptyState';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import { fetchSupermarketMap, saveSupermarketMap, type SupermarketToKhoMap } from '../services/biSupermarketMapService';

/**
 * Màn quản trị bảng map "tên siêu thị trong báo cáo Report BI" → "Mã Kho" — chỉ admin thấy
 * (gate isAdmin ở component cha DataUpdater.tsx). implementation_plan.md mục "Đợt 4".
 * biDataService.ts dùng bảng này để biết dán dữ liệu chia sẻ vào biData/{maKho} nào — thiếu
 * mục nào trong bảng này thì siêu thị đó bị BỎ QUA khi dán (cảnh báo qua skippedNames).
 */
const BiSupermarketMapAdmin: React.FC = () => {
    const [map, setMap] = useState<SupermarketToKhoMap>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newName, setNewName] = useState('');
    const [newKho, setNewKho] = useState('');
    const [editingName, setEditingName] = useState<string | null>(null);
    const [editingKho, setEditingKho] = useState('');
    const [deletingName, setDeletingName] = useState<string | null>(null);

    useEffect(() => {
        fetchSupermarketMap()
            .then(setMap)
            .catch(err => { console.error('[BiSupermarketMapAdmin] Lỗi tải bảng map:', err); toast.error('Không tải được bảng map siêu thị.'); })
            .finally(() => setIsLoading(false));
    }, []);

    const persist = async (nextMap: SupermarketToKhoMap) => {
        setIsSaving(true);
        try {
            await saveSupermarketMap(nextMap);
            setMap(nextMap);
            toast.success('Đã lưu bảng map siêu thị.');
        } catch (err) {
            console.error('[BiSupermarketMapAdmin] Lỗi lưu bảng map:', err);
            toast.error('Lỗi khi lưu — chỉ admin mới có quyền ghi.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAdd = () => {
        const name = newName.trim();
        const kho = newKho.trim();
        if (!name || !kho) { toast.error('Nhập đủ tên siêu thị và Mã Kho.'); return; }
        if (map[name]) { toast.error('Tên siêu thị này đã có trong bảng map.'); return; }
        persist({ ...map, [name]: kho });
        setNewName('');
        setNewKho('');
    };

    const handleSaveEdit = (originalName: string) => {
        const kho = editingKho.trim();
        if (!kho) { toast.error('Mã Kho không được để trống.'); return; }
        persist({ ...map, [originalName]: kho });
        setEditingName(null);
    };

    const handleDelete = () => {
        if (!deletingName) return;
        const nextMap = { ...map };
        delete nextMap[deletingName];
        persist(nextMap);
        setDeletingName(null);
    };

    const rows = Object.entries(map).map(([name, maKho]) => ({ name, maKho }));

    const columns: DataTableColumn<{ name: string; maKho: string }>[] = [
        {
            id: 'name',
            header: 'Tên siêu thị (đúng nguyên văn trong báo cáo BI)',
            minWidth: '280px',
            cell: (row) => <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{row.name}</span>,
        },
        {
            id: 'maKho',
            header: 'Mã Kho',
            width: '160px',
            cell: (row) => editingName === row.name ? (
                <Input
                    value={editingKho}
                    onChange={(e) => setEditingKho(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(row.name); }}
                    autoFocus
                    className="text-xs font-bold"
                />
            ) : (
                <span className="text-[11px] font-black tabular-nums text-sky-700 dark:text-sky-400">{row.maKho}</span>
            ),
        },
        {
            id: 'action',
            header: '',
            width: '90px',
            align: 'center',
            cell: (row) => (
                <div className="flex items-center justify-center gap-1">
                    {editingName === row.name ? (
                        <Button variant="unstyled" size="none" onClick={() => handleSaveEdit(row.name)} className="px-2 py-1 text-[10px] font-bold text-sky-600 hover:bg-sky-50 rounded-md" disabled={isSaving}>Lưu</Button>
                    ) : (
                        <Button variant="unstyled" size="none" onClick={() => { setEditingName(row.name); setEditingKho(row.maKho); }} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-md" title="Sửa Mã Kho">
                            <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button variant="unstyled" size="none" onClick={() => setDeletingName(row.name)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md" title="Xoá">
                        <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <Card title="Bảng map Siêu thị → Mã Kho (Admin)" icon="settings-2">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 -mt-1">
                Chỉ admin cấu hình. Dùng để dán dữ liệu Luỹ kế đúng Kho khi chia sẻ cho nhân viên cùng siêu thị — tên phải khớp nguyên văn cột đầu tiên trong báo cáo BI (vd: "ĐM_HCM - 123 Nguyễn Trãi").
            </p>

            <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Tên siêu thị (đúng nguyên văn báo cáo BI)" className="text-xs" />
                <Input value={newKho} onChange={(e) => setNewKho(e.target.value)} placeholder="Mã Kho" className="text-xs sm:w-40" />
                <Button variant="primary" size="sm" onClick={handleAdd} disabled={isSaving} className="shrink-0">Thêm</Button>
            </div>

            {isLoading ? (
                <div className="text-[11px] text-slate-400 py-4 text-center">Đang tải...</div>
            ) : rows.length === 0 ? (
                <EmptyState title="Chưa có siêu thị nào trong bảng map" description="Thêm siêu thị đầu tiên ở form phía trên." />
            ) : (
                <DataTable columns={columns} data={rows} rowKey={(row) => row.name} compact stickyHeader={false} columnDividers />
            )}

            <ConfirmDialog
                isOpen={!!deletingName}
                onClose={() => setDeletingName(null)}
                onConfirm={handleDelete}
                title="Xoá khỏi bảng map?"
                message={`Xoá "${deletingName}" khỏi bảng map. Lần dán tiếp theo, dữ liệu siêu thị này sẽ KHÔNG được chia sẻ cho tới khi thêm lại.`}
                confirmText="Xoá"
                variant="danger"
            />
        </Card>
    );
};

export default BiSupermarketMapAdmin;
