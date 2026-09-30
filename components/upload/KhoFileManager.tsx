import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../common/Icon';
import { FileHistoryManager } from './FileHistoryManager';
import { ConfirmDialog } from '../shared/ui/ConfirmDialog';
import { Button } from '../shared/ui/Button';
import type { UploadedFileRegistryItem } from '../../types';
import type { KhoSalesFileMeta } from '../../services/khoDataService';

interface KhoFileManagerProps {
    maKho: string;
}

// Chuyển KhoSalesFileMeta (dữ liệu Kho dùng chung) sang đúng shape UploadedFileRegistryItem
// để tái dùng NGUYÊN component FileHistoryManager (đồng nhất giao diện với danh sách file
// cục bộ, không phải dựng lại từ đầu) — xem implementation_plan.md mục 37 (Bước 5).
function toRegistryItem(f: KhoSalesFileMeta): UploadedFileRegistryItem {
    return {
        id: f.fileId,
        filename: `${f.filename} — ${f.uploadedByName}${f.isRealtime ? ' (Realtime)' : ''}`,
        rowCount: f.totalRows,
        savedAt: f.uploadedAt,
        fileLastModified: f.fileLastModified,
        isActive: f.isActive,
        maxDate: f.maxDate,
    };
}

export const KhoFileManager: React.FC<KhoFileManagerProps> = ({ maKho }) => {
    const [files, setFiles] = useState<KhoSalesFileMeta[] | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const refresh = useCallback(async () => {
        const { getKhoAllFilesMeta } = await import('../../services/khoDataService');
        const list = await getKhoAllFilesMeta(maKho);
        setFiles(list.sort((a, b) => b.uploadedAt - a.uploadedAt));
    }, [maKho]);

    useEffect(() => {
        setFiles(null);
        refresh().catch(err => {
            console.error(`[KhoFileManager] Không tải được danh sách file Kho ${maKho}:`, err);
            setFiles([]);
        });
    }, [maKho, refresh]);

    const handleToggleActive = async (fileId: string) => {
        const file = files?.find(f => f.fileId === fileId);
        if (!file) return;
        const { setKhoSalesFileActive } = await import('../../services/khoDataService');
        setFiles(prev => prev?.map(f => f.fileId === fileId ? { ...f, isActive: !f.isActive } : f) ?? null);
        try {
            await setKhoSalesFileActive(maKho, fileId, !file.isActive);
        } catch (err) {
            console.error('[KhoFileManager] Lỗi bật/tắt file:', err);
            refresh().catch(console.error);
        }
    };

    const [isConfirmPurgeOpen, setIsConfirmPurgeOpen] = useState(false);
    const [isPurging, setIsPurging] = useState(false);

    const handleConfirmDelete = async () => {
        if (!pendingDeleteId) return;
        setIsDeleting(true);
        try {
            const { deleteKhoSalesFile } = await import('../../services/khoDataService');
            await deleteKhoSalesFile(maKho, pendingDeleteId);
            setFiles(prev => prev?.filter(f => f.fileId !== pendingDeleteId) ?? null);
        } catch (err) {
            console.error('[KhoFileManager] Lỗi xoá file:', err);
        } finally {
            setIsDeleting(false);
            setPendingDeleteId(null);
        }
    };

    const handleConfirmPurgeAll = async () => {
        setIsPurging(true);
        try {
            const { purgeKhoSalesFiles } = await import('../../services/khoDataService');
            await purgeKhoSalesFiles(maKho);
            setFiles([]);
        } catch (err) {
            console.error('[KhoFileManager] Lỗi xoá tất cả file Kho:', err);
        } finally {
            setIsPurging(false);
            setIsConfirmPurgeOpen(false);
        }
    };

    if (files === null) {
        return (
            <div className="flex items-center justify-center py-4 text-slate-400 dark:text-slate-500">
                <Icon name="loader-2" size={4} className="animate-spin" />
            </div>
        );
    }

    if (files.length === 0) return null;

    return (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Icon name="share-2" size={3.5} className="text-sky-500" />
                    Dữ liệu Kho dùng chung ({maKho})
                </h4>
                <Button
                    variant="unstyled" size="none"
                    onClick={() => setIsConfirmPurgeOpen(true)}
                    className="text-[11px] text-rose-500 hover:text-rose-700 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    title={`Xoá sạch tất cả ${files.length} file dùng chung của Kho ${maKho}`}
                >
                    <Icon name="trash-2" size={3} />
                    <span>Xoá tất cả ({files.length} file)</span>
                </Button>
            </div>
            <FileHistoryManager
                registry={files.map(toRegistryItem)}
                onToggleActive={handleToggleActive}
                onDelete={(id) => setPendingDeleteId(id)}
                compact
            />
            <ConfirmDialog
                isOpen={!!pendingDeleteId}
                onClose={() => setPendingDeleteId(null)}
                onConfirm={handleConfirmDelete}
                title="Xoá file khỏi Kho dùng chung?"
                message="File sẽ bị xoá khỏi dữ liệu dùng chung của Kho này — mọi nhân viên/quản lý khác cùng Kho sẽ không còn thấy dữ liệu từ file này nữa. Hành động này không thể hoàn tác."
                confirmText="Xoá"
                variant="danger"
                isLoading={isDeleting}
            />
            <ConfirmDialog
                isOpen={isConfirmPurgeOpen}
                onClose={() => setIsConfirmPurgeOpen(false)}
                onConfirm={handleConfirmPurgeAll}
                title={`Xoá sạch tất cả file của Kho ${maKho}?`}
                message={`Toàn bộ ${files.length} file doanh số dùng chung của Kho ${maKho} sẽ bị xoá vĩnh viễn khỏi Cloud và thiết bị. Mọi người dùng cùng Kho sẽ không còn thấy dữ liệu này nữa.`}
                confirmText="Xoá tất cả"
                variant="danger"
                isLoading={isPurging}
            />
        </div>
    );
};

export default KhoFileManager;
