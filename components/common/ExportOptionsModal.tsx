import React, { useEffect, useState } from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { Modal } from '../shared/ui/Modal';
import { Button } from '../shared/ui/Button';

interface ExportOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDownload: () => void;
    onShare: () => void;
    canShare: boolean;
    filename: string;
}

const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({ isOpen, onClose, onDownload, onShare, canShare, filename }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            position="bottom"
            hideHeader
            ariaLabel="Xuất ảnh báo cáo"
            maxWidth="md"
            noRounded
        >
            <div className="-m-5 relative overflow-hidden flex flex-col items-center">
                {/* Glowing Accent Top */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-400 via-sky-500 to-sky-600 opacity-80" />

                {/* Handle bar (mobile) */}
                <div className="flex justify-center pt-4 pb-2 sm:hidden w-full">
                    <div className="w-12 h-1.5 rounded-full bg-slate-300/80 dark:bg-slate-600/80" />
                </div>

                {/* Header */}
                <div className="px-4 pt-4 pb-2 text-center sm:text-left flex flex-col items-center sm:items-start relative z-10 w-full">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-900/50 dark:to-sky-900/50 flex items-center justify-center mb-2 shadow-sm">
                        <AppIcon name="exportImage" size="lg" className="text-sky-700" />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Xuất Ảnh Báo Cáo</h3>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 truncate w-full text-center sm:text-left">{filename}</p>
                </div>

                {/* Options */}
                <div className="px-4 pb-4 pt-1 space-y-2 relative z-10 w-full flex-1">
                    {/* Download option */}
                    <Button
                        variant="unstyled" size="none"
                        onClick={onDownload}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-sky-50 dark:hover:bg-sky-900/20 active:scale-[0.98] transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <AppIcon name="download" size="lg" />
                            </div>
                            <div className="text-left">
                                <p className="font-extrabold text-slate-800 dark:text-white text-[13px]">Tải về thiết bị</p>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Lưu ảnh chất lượng cao</p>
                            </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-slate-200/50 dark:bg-slate-700 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/40 flex items-center justify-center transition-colors">
                            <AppIcon name="chevronRight" size="xs" className="text-slate-400 group-hover:text-sky-700" />
                        </div>
                    </Button>

                    {/* Share option */}
                    {canShare && (
                        <Button
                            variant="unstyled" size="none"
                            onClick={onShare}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-[0.98] transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <AppIcon name="share" size="lg" />
                                </div>
                                <div className="text-left">
                                    <p className="font-extrabold text-slate-800 dark:text-white text-[13px]">Chia sẻ trực tiếp</p>
                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Gửi qua LINE, Zalo...</p>
                                </div>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-slate-200/50 dark:bg-slate-700 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 flex items-center justify-center transition-colors">
                                <AppIcon name="chevronRight" size="xs" className="text-slate-400 group-hover:text-emerald-700" />
                            </div>
                        </Button>
                    )}

                    {/* Cancel button */}
                    <Button
                        variant="unstyled" size="none"
                        onClick={onClose}
                        className="w-full mt-1 py-2.5 rounded-xl text-[12px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all"
                    >
                        Quay lại
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ExportOptionsModal;
