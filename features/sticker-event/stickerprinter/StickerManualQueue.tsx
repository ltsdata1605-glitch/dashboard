import React from 'react';
import { Clock, CheckCircle2, Trash2, X, Image as ImageIcon, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { StickerPage, SavedStickerList } from './types';

interface StickerManualQueueProps {
    manualPages: StickerPage[];
    savedLists: SavedStickerList[];
    showSavedLists: boolean;
    setShowSavedLists: (show: boolean) => void;
    saveCurrentList: () => void;
    clearManualPages: () => void;
    loadPageToEditor: (page: StickerPage) => void;
    removeManualPage: (id: string) => void;
    loadSavedList: (list: SavedStickerList) => void;
    deleteSavedList: (id: string) => void;
}

export const StickerManualQueue: React.FC<StickerManualQueueProps> = ({
    manualPages,
    savedLists,
    showSavedLists,
    setShowSavedLists,
    saveCurrentList,
    clearManualPages,
    loadPageToEditor,
    removeManualPage,
    loadSavedList,
    deleteSavedList,
}) => {
    return (
        <div className="w-full max-w-[550px] no-print space-y-4">
            {/* Manual Pages Queue */}
            {manualPages.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                            <Clock size={16} className="text-indigo-500" />
                            Hàng đợi in ({manualPages.length} trang)
                        </h4>
                        <div className="flex items-center gap-2">
                            <button onClick={saveCurrentList} className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold uppercase flex items-center gap-1" title="Lưu danh sách này">
                                <CheckCircle2 size={12} /> Lưu DS
                            </button>
                            <button onClick={clearManualPages} className="text-[11px] text-red-500 hover:text-red-600 font-bold uppercase flex items-center gap-1">
                                <Trash2 size={12} /> Xóa tất cả
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {manualPages.map((page, idx) => (
                            <div 
                                key={page.id} 
                                className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors group"
                                onClick={() => loadPageToEditor(page)}
                                title="Click để load lại và chỉnh sửa"
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 w-6 h-6 flex items-center justify-center rounded-full shrink-0">{idx + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-slate-700 dark:text-slate-300 truncate font-medium">{page.label}</p>
                                        <div className="flex gap-2 mt-0.5 text-[10px]">
                                            <span className="text-red-600 font-bold">{page.newPrice}</span>
                                            <span className="line-through text-slate-400">{page.oldPrice}</span>
                                            {page.percent && <span className="text-green-600 font-bold">{page.percent}</span>}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); removeManualPage(page.id); }} 
                                    className="text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Saved Lists */}
            {savedLists.length > 0 && manualPages.length === 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4">
                    <button 
                        onClick={() => setShowSavedLists(!showSavedLists)}
                        className="w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <ImageIcon size={16} className="text-emerald-500" />
                            Danh sách đã lưu ({savedLists.length})
                        </span>
                        {showSavedLists ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showSavedLists && (
                        <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
                            {savedLists.map(list => (
                                <div key={list.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{list.name}</p>
                                        <div className="flex gap-2 mt-0.5 text-[10px] text-slate-400">
                                            <span>{new Date(list.timestamp).toLocaleDateString('vi-VN')}</span>
                                            <span>•</span>
                                            <span>{list.pages.length} trang</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0 ml-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => loadSavedList(list)}
                                            className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 transition-colors text-[10px] font-bold"
                                            title="Tải danh sách"
                                        >
                                            <RotateCcw size={13} />
                                        </button>
                                        <button 
                                            onClick={() => deleteSavedList(list.id)}
                                            className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-lg hover:bg-red-200 transition-colors"
                                            title="Xóa"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
