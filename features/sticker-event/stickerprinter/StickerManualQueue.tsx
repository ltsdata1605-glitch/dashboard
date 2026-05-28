import React, { useState } from 'react';
import { Clock, Save, Trash2, X, Image as ImageIcon, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
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
    togglePageSelection: (id: string) => void;
    toggleAllPagesSelection: (select: boolean) => void;
    discountThreshold: string;
    handleDiscountThresholdChange: (val: string) => void;
    activeQueuePageId: string | null;
    setActiveQueuePageId: (id: string | null) => void;
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
    togglePageSelection,
    toggleAllPagesSelection,
    discountThreshold,
    handleDiscountThresholdChange,
    activeQueuePageId,
    setActiveQueuePageId,
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredPages = manualPages.filter(page => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        const nameMatch = page.label.toLowerCase().includes(q);
        const codeMatch = page.code ? page.code.toLowerCase().includes(q) : false;
        return nameMatch || codeMatch;
    });

    const allChecked = manualPages.length > 0 && manualPages.every(p => p.selected !== false);

    return (
        <div className="w-full h-full flex flex-col no-print space-y-3 overflow-hidden">
            {/* Manual Pages Queue */}
            {manualPages.length > 0 && (
                <div className="p-0 space-y-3 flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between shrink-0">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                            <input 
                                type="checkbox"
                                checked={allChecked}
                                onChange={(e) => toggleAllPagesSelection(e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0"
                                title="Chọn tất cả / Bỏ chọn tất cả"
                            />
                            <Clock size={16} className="text-indigo-500 shrink-0" />
                            <span>Số lượng: {manualPages.length}</span>
                        </h4>
                        <div className="flex items-center gap-1.5">
                            <input 
                                type="text"
                                placeholder="% Giảm"
                                value={discountThreshold}
                                onChange={(e) => handleDiscountThresholdChange(e.target.value)}
                                className="w-14 text-center px-1.5 py-1 text-[11px] border border-slate-300 dark:border-slate-700 rounded-md font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                                title="Nhập % giảm tối thiểu (ví dụ: 20%)"
                            />
                            <button onClick={saveCurrentList} className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors" title="Lưu danh sách">
                                <Save size={16} />
                            </button>
                            <button onClick={clearManualPages} className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors" title="Xóa tất cả">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Search Input Filter */}
                    <div className="mb-3 relative">
                        <input
                            type="text"
                            placeholder="Tìm theo tên hoặc mã sản phẩm..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                        {filteredPages.map((page, idx) => (
                            <div 
                                key={page.id} 
                                tabIndex={0}
                                data-queue-index={idx}
                                className={`flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group outline-none ${
                                    page.id === activeQueuePageId 
                                        ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20' 
                                        : 'border-slate-100 dark:border-slate-700'
                                } ${page.selected === false ? 'opacity-50' : ''}`}
                                onClick={() => {
                                    setActiveQueuePageId(page.id);
                                    loadPageToEditor(page);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        const nextIdx = idx + 1;
                                        if (nextIdx < filteredPages.length) {
                                            const nextPage = filteredPages[nextIdx];
                                            setActiveQueuePageId(nextPage.id);
                                            loadPageToEditor(nextPage);
                                            setTimeout(() => {
                                                const nextEl = document.querySelector(`[data-queue-index="${nextIdx}"]`) as HTMLElement;
                                                nextEl?.focus();
                                            }, 10);
                                        }
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        const prevIdx = idx - 1;
                                        if (prevIdx >= 0) {
                                            const prevPage = filteredPages[prevIdx];
                                            setActiveQueuePageId(prevPage.id);
                                            loadPageToEditor(prevPage);
                                            setTimeout(() => {
                                                const prevEl = document.querySelector(`[data-queue-index="${prevIdx}"]`) as HTMLElement;
                                                prevEl?.focus();
                                            }, 10);
                                        }
                                    }
                                }}
                                title="Click hoặc dùng mũi tên Lên/Xuống để chỉnh sửa"
                            >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <input 
                                        type="checkbox"
                                        checked={page.selected !== false}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            togglePageSelection(page.id);
                                        }}
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0"
                                    />
                                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 w-6 h-6 flex items-center justify-center rounded-full shrink-0">{idx + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-slate-700 dark:text-slate-300 truncate font-medium">
                                            {page.code ? `[${page.code}] ` : ''}{page.label}
                                        </p>
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
                        {filteredPages.length === 0 && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">Không tìm thấy sticker nào phù hợp</p>
                        )}
                    </div>
                </div>
            )}

            {/* Saved Lists */}
            {savedLists.length > 0 && manualPages.length === 0 && (
                <div className="p-0 space-y-3 flex-1 flex flex-col overflow-hidden">
                    <button 
                        onClick={() => setShowSavedLists(!showSavedLists)}
                        className="w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors shrink-0"
                    >
                        <span className="flex items-center gap-2">
                            <ImageIcon size={16} className="text-emerald-500" />
                            Danh sách đã lưu ({savedLists.length})
                        </span>
                        {showSavedLists ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showSavedLists && (
                        <div className="mt-3 space-y-2 flex-1 overflow-y-auto pr-1">
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
            {manualPages.length === 0 && savedLists.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-12">D.Sách in trống</p>
            )}
        </div>
    );
};
