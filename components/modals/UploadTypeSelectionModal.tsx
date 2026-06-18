import React from 'react';
import ModalWrapper from './ModalWrapper';
import { Icon } from '../common/Icon';

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
        <ModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            hideHeader={true}
            maxWidthClass="max-w-md"
        >
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                        <Icon name="file-up" size={6} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                        Tải lên {fileCount} tệp doanh số
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Vui lòng lựa chọn chế độ phân tích cho tệp vừa tải lên
                    </p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => onSelect(false)}
                        className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-emerald-500/30 dark:border-slate-800 dark:hover:border-emerald-500/30 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/10 transition-all flex items-start gap-3.5 group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100/50 dark:border-emerald-500/20 group-hover:scale-105 transition-transform">
                            <Icon name="zap" size={4} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-[13px] font-bold text-slate-800 dark:text-white transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                Tệp Realtime (Xem nhanh)
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Phân tích nhanh tức thời, hữu ích để xem nhanh số liệu. Không lưu vào cơ sở dữ liệu lịch sử.
                            </p>
                        </div>
                    </button>

                    <button
                        onClick={() => onSelect(true)}
                        className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-indigo-500/30 dark:border-slate-800 dark:hover:border-indigo-500/30 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-all flex items-start gap-3.5 group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-500/20 group-hover:scale-105 transition-transform">
                            <Icon name="database" size={4} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-[13px] font-bold text-slate-800 dark:text-white transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                Lũy kế / Quá khứ
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Đặt tên gợi nhớ và lưu trữ dài hạn vào kho dữ liệu để tự động gộp báo cáo lũy kế.
                            </p>
                        </div>
                    </button>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold rounded-xl text-xs transition-all"
                    >
                        Hủy bỏ
                    </button>
                </div>
            </div>
        </ModalWrapper>
    );
};

export default UploadTypeSelectionModal;
