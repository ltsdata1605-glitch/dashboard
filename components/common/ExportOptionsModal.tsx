import React, { useEffect, useState } from 'react';
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
            maxWidth="md"
            noRounded
        >
            <div className="-m-5 relative overflow-hidden flex flex-col items-center">
                {/* Glowing Accent Top */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 opacity-80" />

                {/* Handle bar (mobile) */}
                <div className="flex justify-center pt-4 pb-2 sm:hidden w-full">
                    <div className="w-12 h-1.5 rounded-full bg-slate-300/80 dark:bg-slate-600/80" />
                </div>

                {/* Header */}
                <div className="px-4 pt-4 pb-2 text-center sm:text-left flex flex-col items-center sm:items-start relative z-10 w-full">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/50 dark:to-blue-900/50 flex items-center justify-center mb-2 shadow-sm">
                        <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Xuất Ảnh Báo Cáo</h3>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 truncate w-full text-center sm:text-left">{filename}</p>
                </div>

                {/* Options */}
                <div className="px-4 pb-4 pt-1 space-y-2 relative z-10 w-full flex-1">
                    {/* Download option */}
                    <Button
                        variant="ghost"
                        onClick={onDownload}
                        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:scale-[0.98] transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <p className="font-extrabold text-slate-800 dark:text-white text-[13px]">Tải về thiết bị</p>
                                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Lưu ảnh chất lượng cao</p>
                            </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-slate-200/50 dark:bg-slate-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 flex items-center justify-center transition-colors">
                            <svg className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </Button>

                    {/* Share option */}
                    {canShare && (
                        <Button
                            variant="ghost"
                            onClick={onShare}
                            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-[0.98] transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <p className="font-extrabold text-slate-800 dark:text-white text-[13px]">Chia sẻ trực tiếp</p>
                                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Gửi qua Zalo, Telegram...</p>
                                </div>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-slate-200/50 dark:bg-slate-700 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 flex items-center justify-center transition-colors">
                                <svg className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Button>
                    )}

                    {/* Cancel button */}
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit w-full mt-1 py-2.5 rounded-xl text-[12px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all"
                    >
                        Quay lại
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ExportOptionsModal;
