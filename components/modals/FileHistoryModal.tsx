import React, { useRef } from 'react';
import { Icon } from '../common/Icon';
import ModalWrapper from './ModalWrapper';
import { FileHistoryManager } from '../upload/FileHistoryManager';
import type { UploadedFileRegistryItem } from '../../types';

interface FileHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    registry: UploadedFileRegistryItem[];
    onToggleActive: (id: string) => Promise<void> | void;
    onDelete: (id: string) => Promise<void> | void;
    onProcessFile: (files: File[], isCloudSync?: boolean, isHistorical?: boolean) => void;
    onViewReport?: () => void;
}

const FileHistoryModal: React.FC<FileHistoryModalProps> = ({
    isOpen,
    onClose,
    registry,
    onToggleActive,
    onDelete,
    onProcessFile,
    onViewReport
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        <ModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            hideHeader={true}
            maxWidthClass="max-w-2xl"
        >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100/50 dark:border-indigo-500/20">
                        <Icon name="database" size={5} />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-800 dark:text-white uppercase">Kho Dữ Liệu Quá Khứ (Lũy kế dài hạn)</h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Tải lên, gộp và đối chiếu các tệp Excel doanh số lũy kế cũ (ví dụ: tháng trước, năm trước)</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <Icon name="x" size={4} />
                </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-slate-900 space-y-4">
                {registry.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 dark:text-slate-500">
                        <div className="w-12 h-12 mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600">
                            <Icon name="database" size={6} />
                        </div>
                        <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400">Chưa có dữ liệu lịch sử nào được tải lên</p>
                        <p className="text-[11px] mt-0.5">Vui lòng tải lên tệp Excel doanh số cũ để tạo báo cáo tích lũy gộp dài hạn.</p>
                    </div>
                ) : (
                    <FileHistoryManager
                        registry={registry}
                        onToggleActive={onToggleActive}
                        onDelete={onDelete}
                        compact={true}
                    />
                )}

                <div className="pt-2 flex justify-between items-center gap-3 flex-wrap">
                    <button
                        onClick={handleImportClick}
                        id="btn-modal-import-files"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-300/30 dark:shadow-none transition-all flex items-center gap-1.5"
                    >
                        <Icon name="file-up" size={3.5} />
                        <span>Tải Lên File Dữ Liệu Cũ...</span>
                    </button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                        multiple
                        onClick={(e) => (e.currentTarget.value = '')}
                        onChange={handleFileChange}
                    />
                    
                    <button
                        onClick={() => {
                            if (onViewReport) onViewReport();
                            onClose();
                        }}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-300/30 dark:shadow-none active:scale-95"
                    >
                        Xem Báo Cáo
                    </button>
                </div>
            </div>
        </ModalWrapper>
    );
};

export default FileHistoryModal;
