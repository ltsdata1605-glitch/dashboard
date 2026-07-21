import React from 'react';
import { Modal } from '../shared/ui/Modal';
import { Icon } from '../common/Icon';
import { Button } from '../shared/ui/Button';

interface UploadTypeSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (isHistorical: boolean) => void;
    fileCount: number;
}

const UploadTypeSelectionModal: React.FC<UploadTypeSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    fileCount
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            hideHeader
            maxWidth="sm"
        >
            <div className="-m-5 p-4">
                <div className="flex flex-col items-center text-center mb-4">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
                        <Icon name="file-up" size={4.5} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                        Tải lên {fileCount} tệp doanh số
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Vui lòng lựa chọn chế độ phân tích cho tệp vừa tải lên
                    </p>
                </div>

                <div className="space-y-2">
                    <Button
                        variant="unstyled" size="none"
                        onClick={() => onSelect(false)}
                        className="justify-start w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-emerald-500/30 dark:border-slate-800 dark:hover:border-emerald-500/30 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/10 transition-all flex items-start gap-2.5 group"
                    >
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100/50 dark:border-emerald-500/20 group-hover:scale-105 transition-transform">
                            <Icon name="zap" size={3.5} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-white transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                Tệp Realtime (Xem nhanh)
                            </h4>
                            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Phân tích nhanh tức thời, hữu ích để xem nhanh số liệu. Không lưu vào cơ sở dữ liệu lịch sử.
                            </p>
                        </div>
                    </Button>

                    <Button
                        variant="unstyled" size="none"
                        onClick={() => onSelect(true)}
                        className="justify-start w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-indigo-500/30 dark:border-slate-800 dark:hover:border-indigo-500/30 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-all flex items-start gap-2.5 group"
                    >
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-500/20 group-hover:scale-105 transition-transform">
                            <Icon name="database" size={3.5} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-white transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                Lũy kế / Quá khứ
                            </h4>
                            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Đặt tên gợi nhớ và lưu trữ dài hạn vào kho dữ liệu để tự động gộp báo cáo lũy kế.
                            </p>
                        </div>
                    </Button>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                        variant="unstyled" size="none"
                        onClick={onClose}
                        className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold rounded-xl text-xs transition-all"
                    >
                        Hủy bỏ
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default UploadTypeSelectionModal;
