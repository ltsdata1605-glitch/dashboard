import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ExportOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDownload: () => void;
    onShare: () => void;
    canShare: boolean;
    filename: string;
}

const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({ isOpen, onClose, onDownload, onShare, canShare, filename }) => {
    const backdropRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div
            ref={backdropRef}
            className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center"
            onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
            
            {/* Modal Content — bottom sheet on mobile, centered on desktop */}
            <div className="relative w-full sm:max-w-sm mx-auto sm:mb-0 animate-slide-up">
                <div className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* Handle bar (mobile) */}
                    <div className="flex justify-center pt-3 pb-1 sm:hidden">
                        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    </div>

                    {/* Header */}
                    <div className="px-6 pt-4 pb-3">
                        <h3 className="text-lg font-black text-slate-800 dark:text-white">Xuất Ảnh Báo Cáo</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{filename}</p>
                    </div>

                    {/* Options */}
                    <div className="px-4 pb-4 space-y-2">
                        {/* Download option */}
                        <button
                            onClick={onDownload}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 border border-indigo-100 dark:border-indigo-800/50 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all group"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </div>
                            <div className="text-left flex-grow">
                                <p className="font-bold text-slate-800 dark:text-white text-sm">Tải về máy</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Lưu ảnh PNG vào thiết bị</p>
                            </div>
                            <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        {/* Share option */}
                        {canShare && (
                            <button
                                onClick={onShare}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-100 dark:border-emerald-800/50 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                </div>
                                <div className="text-left flex-grow">
                                    <p className="font-bold text-slate-800 dark:text-white text-sm">Chia sẻ qua ứng dụng</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Gửi qua LINE, Zalo, Telegram...</p>
                                </div>
                                <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Cancel button */}
                    <div className="px-4 pb-5">
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all"
                        >
                            Hủy
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ExportOptionsModal;
