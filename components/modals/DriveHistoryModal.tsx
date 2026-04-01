import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '../common/Icon';
import toast from 'react-hot-toast';
import { listDriveFiles, downloadFileFromDrive, DriveFile } from '../../services/googleDriveService';

interface DriveHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectFile: (file: File) => void;
}

const DriveHistoryModal: React.FC<DriveHistoryModalProps> = ({ isOpen, onClose, onSelectFile }) => {
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchFiles();
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

    const handleDownload = async (file: DriveFile) => {
        setIsDownloading(file.id);
        const loadingToast = toast.loading('Đang kéo dữ liệu từ mây xuống...');
        try {
            const token = sessionStorage.getItem('googleOAuthToken');
            if (!token) throw new Error('Mất kết nối Google');
            
            const blob = await downloadFileFromDrive(file.id, token);
            // Convert Blob to File object to feed into the worker naturally
            const newFile = new File([blob], file.name.replace('YCX_', ''), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            toast.success('Đã nạp file thành công!', { id: loadingToast });
            onSelectFile(newFile);
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Lỗi khi lấy dữ liệu', { id: loadingToast });
        } finally {
            setIsDownloading(null);
        }
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
                                <p className="text-xs text-slate-500 font-medium">Chọn báo cáo cũ để xử lý nhanh</p>
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
                                <p className="text-sm mt-1">Upload một file YCX để hệ thống tự sao lưu nhé.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {files.map(file => (
                                    <motion.button
                                        key={file.id}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleDownload(file)}
                                        disabled={isDownloading !== null}
                                        className="w-full text-left flex items-start gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all group"
                                    >
                                        <div className="mt-1 p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                            <Icon name="file-spreadsheet" size={5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                                {file.name}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                                                <span className="flex items-center gap-1"><Icon name="clock" size={3.5} /> {new Date(file.createdTime).toLocaleString('vi-VN')}</span>
                                                {file.size && <span className="flex items-center gap-1"><Icon name="hard-drive" size={3.5} /> {(parseInt(file.size) / (1024 * 1024)).toFixed(2)} MB</span>}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-center h-full pl-2">
                                            {isDownloading === file.id ? (
                                                <Icon name="loader-2" size={5} className="text-indigo-600 animate-spin" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    <Icon name="cloud-download" size={4} />
                                                </div>
                                            )}
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DriveHistoryModal;
