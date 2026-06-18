import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Icon } from '../common/Icon';

interface FileNamingModalProps {
    isOpen: boolean;
    onConfirm: (name: string) => void;
}

export const FileNamingModal: React.FC<FileNamingModalProps> = ({
    isOpen,
    onConfirm,
}) => {
    const [inputValue, setInputValue] = useState('');

    // Reset input value when modal opens
    useEffect(() => {
        if (isOpen) {
            setInputValue('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = inputValue.trim();
        if (trimmed) {
            onConfirm(trimmed);
        }
    };

    const suggestions = [
        "YCX 1.1.2025 - 30.6.2025",
        "YCX Tháng 5.2026"
    ];

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[99999] p-4 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-md rounded-2xl border border-slate-200/60 dark:border-slate-800 flex flex-col p-6 space-y-5 animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100/50 dark:border-amber-900/20 shrink-0">
                        <Icon name="tag" size={5} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <span className="bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded text-[10px] font-black text-amber-700 dark:text-amber-300">BẮT BUỘC</span>
                            Đặt tên hiển thị
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Đặt tên hiển thị gợi nhớ cho tệp dữ liệu vừa tải lên.</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleConfirm} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                            Tên hiển thị
                        </label>
                        <input
                            type="text"
                            autoFocus
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Nhập tên hiển thị..."
                            className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-semibold"
                        />
                    </div>

                    {/* Suggestions */}
                    <div className="space-y-2">
                        <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Gợi ý định dạng nhanh (Click để chọn)
                        </span>
                        <div className="flex flex-col gap-2">
                            {suggestions.map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setInputValue(suggestion)}
                                    className="w-full text-left px-3 py-2.5 bg-slate-50 hover:bg-amber-50/50 dark:bg-slate-800/40 dark:hover:bg-amber-950/20 border border-slate-200/60 dark:border-slate-800/60 hover:border-amber-300 dark:hover:border-amber-800/60 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-all flex items-center justify-between group"
                                >
                                    <span>{suggestion}</span>
                                    <span className="text-[10px] text-slate-400 group-hover:text-amber-500 transition-colors uppercase font-bold shrink-0">Áp dụng</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Footer / OK Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={!inputValue.trim()}
                            className="w-full h-11 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-white font-bold uppercase tracking-widest text-xs rounded-xl shadow-md shadow-amber-500/10 active:scale-[0.98] transition-all disabled:pointer-events-none flex items-center justify-center gap-1.5"
                        >
                            <Icon name="check" size={4} />
                            Xác nhận đặt tên
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default FileNamingModal;
