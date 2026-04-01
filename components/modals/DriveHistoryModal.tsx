import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '../common/Icon';
import toast from 'react-hot-toast';
import { listDriveFiles, downloadFileFromDrive, DriveFile } from '../../services/googleDriveService';

interface DriveHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectFile: (files: File[]) => void;
}

const DriveHistoryModal: React.FC<DriveHistoryModalProps> = ({ isOpen, onClose, onSelectFile }) => {
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            fetchFiles();
            setSelectedIds(new Set());
        } else {
            setFiles([]);
        }
    }, [isOpen]);

    const fetchFiles = async () => {
        setIsLoading(true);
        try {
            const token = sessionStorage.getItem('googleOAuthToken');
            if (!token) throw new Error('Vui lòng đăng nhập Google để xem lịch sử.');
            const data = await listDriveFiles(token);
            setFiles(data);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Không thể lấy lịch sử Drive');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadSelected = async () => {
        if (selectedIds.size === 0) return;
        setIsDownloading(true);
        const loadingToast = toast.loading(`Đang tải \${selectedIds.size} file từ mây...`);
        try {
            const token = sessionStorage.getItem('googleOAuthToken');
            if (!token) throw new Error('Mất kết nối Google');
            
            const filesToDownload = files.filter(f => selectedIds.has(f.id));
            const downloadedFiles: File[] = [];

            for (const file of filesToDownload) {
                const blob = await downloadFileFromDrive(file.id, token);
                const newFile = new File([blob], file.name.replace('YCX_', ''), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                downloadedFiles.push(newFile);
            }
            
            toast.success(`Đã tải \${downloadedFiles.length} file thành công!`, { id: loadingToast });
            onSelectFile(downloadedFiles);
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Lỗi khi lấy dữ liệu', { id: loadingToast });
        } finally {
            setIsDownloading(false);
        }
    };

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl shadow-indigo-500/10 overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800"
                >
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                                <Icon name="cloud" size={5} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
                                    Lịch sử trên Mây
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">Chọn các báo cáo để xử lý nhanh</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <Icon name="x" size={5} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-white dark:bg-slate-900">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-indigo-600 dark:text-indigo-400">
                                <Icon name="loader-2" size={8} className="animate-spin mb-4" />
                                <span className="font-medium">Đang quét Google Drive...</span>
                            </div>
                        ) : files.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-full mb-4">
                                    <Icon name="folder-search" size={8} className="opacity-50" />
                                </div>
                                <p className="font-medium text-slate-500">Chưa có báo cáo nào trên Drive</p>
                                <p className="text-sm mt-1">Upload YCX để hệ thống tự sao lưu nhé.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {files.map(file => (
                                    <motion.div
                                        key={file.id}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => toggleSelection(file.id)}
                                        className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group \${selectedIds.has(file.id) ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-900/40 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10'}`}
                                    >
                                        <div className="flex items-center justify-center pt-2">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors \${selectedIds.has(file.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                                {selectedIds.has(file.id) && <Icon name="check" size={3.5} className="text-white" />}
                                            </div>
                                        </div>
                                        <div className="mt-1 p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                            <Icon name="file-spreadsheet" size={5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold transition-colors truncate \${selectedIds.has(file.id) ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                                                {file.name}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1.5 text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis \${selectedIds.has(file.id) ? 'text-indigo-600/70 dark:text-indigo-400/80' : 'text-slate-500'}">
                                                <span className="flex items-center gap-1"><Icon name="clock" size={3.5} /> {new Date(file.createdTime).toLocaleString('vi-VN')}</span>
                                                {file.size && <span className="flex items-center gap-1"><Icon name="hard-drive" size={3.5} /> {(parseInt(file.size) / (1024 * 1024)).toFixed(2)} MB</span>}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Fixed Footer */}
                    {files.length > 0 && !isLoading && (
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center rounded-b-3xl">
                            <span className="text-sm font-medium text-slate-500">
                                Đã chọn: <strong className="text-indigo-600 dark:text-indigo-400">{selectedIds.size}</strong> báo cáo
                            </span>
                            <button
                                onClick={handleDownloadSelected}
                                disabled={selectedIds.size === 0 || isDownloading}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all shadow-sm \${selectedIds.size > 0 && !isDownloading ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95' : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'}`}
                            >
                                {isDownloading ? (
                                    <><Icon name="loader-2" size={4.5} className="animate-spin" /> Đang xử lý...</>
                                ) : (
                                    <><Icon name="cloud-download" size={4.5} /> Nạp Dữ Liệu</>
                                )}
                            </button>
                        </div>
                    )}

                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DriveHistoryModal;
