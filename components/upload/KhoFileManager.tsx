import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../common/Icon';
import { FileHistoryManager } from './FileHistoryManager';
import { ConfirmDialog } from '../shared/ui/ConfirmDialog';
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
            <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                <Icon name="share-2" size={3.5} className="text-indigo-500" />
                Dữ liệu Kho dùng chung ({maKho})
            </h4>
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
        </div>
    );
};

export default KhoFileManager;
