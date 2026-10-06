import React, { useRef, useMemo, useState } from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { Modal } from '../shared/ui/Modal';
import { FileHistoryManager } from '../upload/FileHistoryManager';
import { KhoFileManager } from '../upload/KhoFileManager';
import { ConfirmDialog } from '../shared/ui/ConfirmDialog';
import type { UploadedFileRegistryItem } from '../../types';
import { Button } from '../shared/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

interface FileHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    registry: UploadedFileRegistryItem[];
    onToggleActive: (id: string) => Promise<void> | void;
    onDelete: (id: string) => Promise<void> | void;
    onDeleteAll?: () => Promise<void> | void;
    onProcessFile: (files: File[], isCloudSync?: boolean, isHistorical?: boolean) => void;
    onViewReport?: () => void;
}

const FileHistoryModal: React.FC<FileHistoryModalProps> = ({
    isOpen,
    onClose,
    registry,
    onToggleActive,
    onDelete,
    onDeleteAll,
    onProcessFile,
    onViewReport
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    // Nhân viên chỉ xem dữ liệu thừa kế từ quản lý Kho (implementation_plan.md mục 37) —
    // chặn thêm ở đây (phòng thủ sâu) dù lối vào modal này (FilterBar.tsx) đã ẩn với nhân
    // viên rồi, phòng trường hợp có lối vào khác sau này.
    const { userRole, departmentId } = useAuth();
    const canManageFiles = userRole === 'admin' || userRole === 'manager';
    // Chỉ manager mới có mã Kho cụ thể để quản lý dữ liệu dùng chung (admin dùng
    // departmentId đặc biệt "ALL (Super Admin)", không map tới Kho thật nào — xem
    // implementation_plan.md mục 37 Bước 5).
    const managedKhos = useMemo(() => {
        if (userRole !== 'manager') return [];
        return (departmentId || '').split(',').map(k => k.trim()).filter(Boolean);
    }, [userRole, departmentId]);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onProcessFile(Array.from(e.target.files), false, true);
            onClose();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            hideHeader
            ariaLabel="Danh sách YCX luỹ kế"
            maxWidth="lg"
        >
            <div className="-m-5">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-400 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                        <AppIcon name="database" size="md" />
                    </div>
                    <div>
                        <h2 className="text-sm sm:text-base font-semibold tracking-tight text-slate-800 dark:text-white uppercase">Danh sách ycx luỹ kế</h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Tải lên, gộp và đối chiếu các tệp Excel doanh số lũy kế cũ (ví dụ: tháng trước, năm trước)</p>
                    </div>
                </div>
                <Button variant="unstyled" size="none" onClick={onClose} className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors shrink-0">
                    <AppIcon name="close" size="md" />
                </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-lg">
                    <AppIcon name="warning" size="md" className="mt-0.5" />
                    <p className="text-[11px] font-semibold leading-relaxed">
                        Lưu ý: chỉ nên tải lên dữ liệu theo từng <span className="underline">Quý</span> (3 tháng/lần), không dồn quá nhiều tháng vào 1 tệp. Tệp quá lớn (nhiều dữ liệu dồn 1 lúc) hệ thống sẽ không xử lý được.
                    </p>
                </div>

                {registry.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 dark:text-slate-500">
                        <div className="w-10 h-10 mb-2 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600">
                            <AppIcon name="database" size="lg" />
                        </div>
                        <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400">Chưa có dữ liệu lịch sử nào được tải lên</p>
                        <p className="text-[11px] mt-0.5">Vui lòng tải lên tệp Excel doanh số cũ để tạo báo cáo tích lũy gộp dài hạn.</p>
                    </div>
                ) : (
                    <div>
                        {onDeleteAll && canManageFiles && (
                            <div className="flex justify-end mb-1">
                                <Button
                                    variant="unstyled" size="none"
                                    onClick={() => setIsConfirmDeleteAllOpen(true)}
                                    className="text-[11px] text-rose-500 hover:text-rose-700 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                                    title="Xoá sạch toàn bộ tệp luỹ kế đã lưu"
                                >
                                    <AppIcon name="delete" size="xs" />
                                    <span>Xoá tất cả ({registry.length} tệp)</span>
                                </Button>
                            </div>
                        )}
                        <FileHistoryManager
                            registry={registry}
                            onToggleActive={onToggleActive}
                            onDelete={onDelete}
                            compact={true}
                        />
                    </div>
                )}

                {managedKhos.map(maKho => (
                    <KhoFileManager key={maKho} maKho={maKho} />
                ))}

                <ConfirmDialog
                    isOpen={isConfirmDeleteAllOpen}
                    onClose={() => setIsConfirmDeleteAllOpen(false)}
                    onConfirm={async () => {
                        if (!onDeleteAll) return;
                        setIsDeletingAll(true);
                        try {
                            await onDeleteAll();
                            onClose();
                        } finally {
                            setIsDeletingAll(false);
                            setIsConfirmDeleteAllOpen(false);
                        }
                    }}
                    title="Xoá tất cả tệp luỹ kế?"
                    message={`Toàn bộ ${registry.length} tệp Excel luỹ kế sẽ bị xoá khỏi bộ nhớ thiết bị và Cloud. Bạn sẽ cần nạp lại nếu muốn xem tiếp.`}
                    confirmText="Xoá tất cả"
                    variant="danger"
                    isLoading={isDeletingAll}
                />

                <div className="pt-1 flex justify-between items-center gap-3 flex-wrap">
                    {canManageFiles ? (
                        <>
                            <Button
                                variant="unstyled" size="none"
                                onClick={handleImportClick}
                                id="btn-modal-import-files"
                                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-semibold rounded-md shadow-none transition-all flex items-center gap-1.5"
                            >
                                <AppIcon name="upload" size="sm" />
                                <span>Tải YCX luỹ kế</span>
                            </Button>

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                multiple
                                onClick={(e) => (e.currentTarget.value = '')}
                                onChange={handleFileChange}
                            />
                        </>
                    ) : <span />}

                    <Button
                        variant="unstyled" size="none"
                        onClick={() => {
                            if (onViewReport) onViewReport();
                            onClose();
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-md text-xs transition-all shadow-none active:scale-95"
                    >
                        Xem Báo Cáo
                    </Button>
                </div>
            </div>
            </div>
        </Modal>
    );
};

export default FileHistoryModal;
