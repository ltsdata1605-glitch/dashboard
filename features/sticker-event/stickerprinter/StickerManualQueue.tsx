import React, { useState } from 'react';
import { Save, Trash2, X, Image as ImageIcon, ChevronUp, ChevronDown, RotateCcw, Percent, Coins, Barcode, SearchX, Inbox } from 'lucide-react';
import { StickerPage, SavedStickerList } from './types';
import { Button, Input, EmptyState } from '../../../components/shared/ui';

const cleanDisplayLabel = (label: string) => {
    if (!label) return '';
    // Strip leading parenthesized or bracketed number (e.g. "(1114171000181) ")
    let cleaned = label.replace(/^[\(\[]\d+[\)\]]\s*/, '');
    // Strip trailing parenthesized or bracketed number (e.g. " (1114171000181)")
    cleaned = cleaned.replace(/\s*[\(\[]\d+[\)\]]$/, '');
    return cleaned.trim();
};

const resolvePagePrices = (page: StickerPage, priceSource: 'sale' | 'service') => {
    let newPrice = page.newPrice;
    let percent = page.percent;

    if (priceSource === 'service' && page.servicePrice) {
        newPrice = page.servicePrice;
        if (page.oldPrice && page.servicePrice) {
            const oldVal = Number(page.oldPrice.replace(/\D/g, ''));
            let newVal = Number(page.servicePrice.replace(/\D/g, ''));
            if (oldVal > 0 && newVal > 0) {
                if (newVal * 1000 <= oldVal * 1.5 && newVal < oldVal) {
                    newVal = newVal * 1000;
                }
                const ratio = Math.round((newVal / oldVal - 1) * 100);
                percent = ratio < 0 ? `${ratio}%` : '';
            }
        }
    } else if (page.salePrice) {
        newPrice = page.salePrice;
        if (page.oldPrice && page.salePrice) {
            const oldVal = Number(page.oldPrice.replace(/\D/g, ''));
            let newVal = Number(page.salePrice.replace(/\D/g, ''));
            if (oldVal > 0 && newVal > 0) {
                if (newVal * 1000 <= oldVal * 1.5 && newVal < oldVal) {
                    newVal = newVal * 1000;
                }
                const ratio = Math.round((newVal / oldVal - 1) * 100);
                percent = ratio < 0 ? `${ratio}%` : '';
            }
        }
    }
    return { newPrice, percent };
};

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
    discountDisplayMode: 'percent' | 'amount';
    setDiscountDisplayMode: (mode: 'percent' | 'amount') => void;
    showBarcode: boolean;
    setShowBarcode: (show: boolean) => void;
    priceSource: 'sale' | 'service';
    setPriceSource: (source: 'sale' | 'service') => void;
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
    discountDisplayMode,
    setDiscountDisplayMode,
    showBarcode,
    setShowBarcode,
    priceSource,
    setPriceSource,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showOnboarding, setShowOnboarding] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('hasSeenStickerDiscountTooltip') !== 'true';
    });

    const dismissOnboarding = () => {
        localStorage.setItem('hasSeenStickerDiscountTooltip', 'true');
        setShowOnboarding(false);
    };

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
            {showOnboarding && (
                <style>{`
                    @keyframes toggle-pulse {
                        0%, 100% {
                            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
                            border-color: rgba(99, 102, 241, 1);
                        }
                        50% {
                            box-shadow: 0 0 0 6px rgba(99, 102, 241, 0);
                            border-color: rgba(99, 102, 241, 0.4);
                        }
                    }
                    .discount-toggle-glow {
                        animation: toggle-pulse 1.8s infinite ease-in-out;
                        border: 1.5px solid #6366f1 !important;
                        box-sizing: border-box;
                    }
                `}</style>
            )}

            {/* Config Panel for Empty Queue (Only visible when empty) */}
            {manualPages.length === 0 && (
                <div className="flex items-center justify-between shrink-0 py-1 bg-slate-50 dark:bg-slate-900/20 px-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Cấu hình in nhãn:
                    </span>
                    <div className="flex items-center gap-1.5">
                        {/* Discount Display Mode Toggle */}
                        <div className="relative flex items-center">
                            <Button 
                                onClick={() => {
                                    setDiscountDisplayMode(discountDisplayMode === 'percent' ? 'amount' : 'percent');
                                    if (showOnboarding) dismissOnboarding();
                                }} 
                                size="icon"
                                variant="secondary"
                                className={`h-8 w-8 transition-all ${
                                    showOnboarding 
                                        ? 'discount-toggle-glow text-indigo-600 border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20' 
                                        : discountDisplayMode === 'amount'
                                            ? '!bg-amber-50 dark:!bg-amber-950/20 !text-amber-600 dark:!text-amber-400 !border-amber-200 dark:!border-amber-900/30'
                                            : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                                }`}
                                title={discountDisplayMode === 'percent' ? "Hiển thị: % Giảm (Click đổi sang Số tiền)" : "Hiển thị: Số tiền (Click đổi sang % Giảm)"}
                            >
                                {discountDisplayMode === 'percent' ? <Percent size={14} /> : <Coins size={14} />}
                            </Button>
                            
                            {showOnboarding && (
                                <div className="absolute right-0 top-9 z-50 w-56 bg-indigo-600 text-white text-[11px] p-2.5 rounded-lg shadow-xl flex flex-col gap-1.5 border border-indigo-500 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="font-bold flex items-center justify-between">
                                        <span>💡 Kiểu giảm giá mới!</span>
                                        <Button variant="ghost" onClick={dismissOnboarding} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0.5 text-indigo-200 hover:text-white"><X size={12} /></Button>
                                    </div>
                                    <p className="leading-relaxed text-slate-100">Click vào đây để chuyển đổi hiển thị giữa <strong>% Giảm</strong> hoặc <strong>Số tiền</strong> trên sticker!</p>
                                    <Button variant="ghost" onClick={dismissOnboarding} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 self-end bg-white text-indigo-600 font-bold px-2 py-0.5 rounded text-[10px] hover:bg-indigo-50 transition-colors shadow-sm">Đã hiểu</Button>
                                    <div className="absolute top-0 right-3 -mt-1.5 w-3 h-3 bg-indigo-600 rotate-45 border-l border-t border-indigo-500" />
                                </div>
                            )}
                        </div>

                        {/* Barcode Toggle Button */}
                        <Button 
                            onClick={() => setShowBarcode(!showBarcode)} 
                            size="icon"
                            variant="secondary"
                            className={`h-8 w-8 transition-colors ${
                                showBarcode 
                                    ? '!bg-indigo-50 dark:!bg-indigo-950/50 !text-indigo-600 dark:!text-indigo-400 font-bold !border-indigo-200 dark:!border-indigo-800' 
                                    : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                            }`}
                            title={showBarcode ? "Mã Vạch: Đang bật (Click để tắt)" : "Mã Vạch: Đang tắt (Click để bật)"}
                        >
                            <Barcode size={14} />
                        </Button>
                    </div>
                </div>
            )}

            {/* Manual Pages Queue */}
            {manualPages.length > 0 && (
                <div className="p-0 space-y-3 flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between shrink-0">
                        {/* Checkbox and Quantity on the left */}
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                            <input 
                                type="checkbox"
                                checked={allChecked}
                                onChange={(e) => toggleAllPagesSelection(e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0"
                                title="Chọn tất cả / Bỏ chọn tất cả"
                            />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Số lượng: {manualPages.length}</span>
                        </h4>

                        {/* Config and Action Controls on the right */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {/* % Giảm filter input */}
                            <Input 
                                type="text"
                                placeholder="% Giảm"
                                value={discountThreshold}
                                onChange={(e) => handleDiscountThresholdChange(e.target.value)}
                                className="!w-12 !h-7 text-center px-1 text-[10px] rounded-lg font-bold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                                title="Nhập % giảm tối thiểu"
                                fullWidth={false}
                            />

                            {/* Discount Display Mode Toggle */}
                            <div className="relative flex items-center">
                                <Button 
                                    onClick={() => {
                                        setDiscountDisplayMode(discountDisplayMode === 'percent' ? 'amount' : 'percent');
                                        if (showOnboarding) dismissOnboarding();
                                    }} 
                                    size="icon"
                                    variant="secondary"
                                    className={`h-7 w-7 transition-all ${
                                        showOnboarding 
                                            ? 'discount-toggle-glow text-indigo-600 border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20' 
                                            : discountDisplayMode === 'amount'
                                                ? '!bg-amber-50 dark:!bg-amber-950/20 !text-amber-600 dark:!text-amber-400 !border-amber-200 dark:!border-amber-900/30'
                                                : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                                    }`}
                                    title={discountDisplayMode === 'percent' ? "Hiển thị: % Giảm (Click đổi sang Số tiền)" : "Hiển thị: Số tiền (Click đổi sang % Giảm)"}
                                >
                                    {discountDisplayMode === 'percent' ? <Percent size={13} /> : <Coins size={13} />}
                                </Button>
                                
                                {showOnboarding && (
                                    <div className="absolute right-0 top-8 z-50 w-56 bg-indigo-600 text-white text-[11px] p-2.5 rounded-lg shadow-xl flex flex-col gap-1.5 border border-indigo-500 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="font-bold flex items-center justify-between">
                                            <span>💡 Kiểu giảm giá mới!</span>
                                            <Button variant="ghost" onClick={dismissOnboarding} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0.5 text-indigo-200 hover:text-white"><X size={12} /></Button>
                                        </div>
                                        <p className="leading-relaxed text-slate-100">Click vào đây để chuyển đổi hiển thị giữa <strong>% Giảm</strong> hoặc <strong>Số tiền</strong> trên sticker!</p>
                                        <Button variant="ghost" onClick={dismissOnboarding} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 self-end bg-white text-indigo-600 font-bold px-2 py-0.5 rounded text-[10px] hover:bg-indigo-50 transition-colors shadow-sm">Đã hiểu</Button>
                                        <div className="absolute top-0 right-3 -mt-1.5 w-3 h-3 bg-indigo-600 rotate-45 border-l border-t border-indigo-500" />
                                    </div>
                                )}
                            </div>

                            {/* Barcode Toggle Button */}
                            <Button 
                                onClick={() => setShowBarcode(!showBarcode)} 
                                size="icon"
                                variant="secondary"
                                className={`h-7 w-7 transition-colors ${
                                    showBarcode 
                                        ? '!bg-indigo-50 dark:!bg-indigo-950/50 !text-indigo-600 dark:!text-indigo-400 font-bold !border-indigo-200 dark:!border-indigo-800' 
                                        : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                                }`}
                                title={showBarcode ? "Mã Vạch: Đang bật (Click để tắt)" : "Mã Vạch: Đang tắt (Click để bật)"}
                            >
                                <Barcode size={13} />
                            </Button>

                            {/* Divider line */}
                            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />

                            {/* Save list button */}
                            <Button 
                                onClick={saveCurrentList} 
                                size="icon"
                                variant="secondary"
                                className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors" 
                                title="Lưu danh sách"
                            >
                                <Save size={13} />
                            </Button>

                            {/* Clear list button */}
                            <Button 
                                onClick={clearManualPages} 
                                size="icon"
                                variant="secondary"
                                className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors" 
                                title="Xóa tất cả"
                            >
                                <Trash2 size={13} />
                            </Button>
                        </div>
                    </div>

                    {/* Price toggle (Segmented control) for ERP prices */}
                    {manualPages.some(p => p.servicePrice || p.salePrice) && (
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 w-full shrink-0 mb-1">
                            <Button
                                variant="ghost"
                                onClick={() => setPriceSource('sale')}
                                className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${
                                    priceSource === 'sale'
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                            >
                                Giá giảm
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setPriceSource('service')}
                                className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${
                                    priceSource === 'service'
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                            >
                                Giá Dịch vụ
                            </Button>
                        </div>
                    )}

                    {/* Search Input (Full width on Row 2) */}
                    <div className="relative shrink-0 mb-1">
                        <Input
                            type="text"
                            placeholder="Tìm theo tên hoặc mã sản phẩm..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 placeholder-slate-400 text-slate-750 dark:text-slate-350"
                            fullWidth={true}
                            rightIcon={searchQuery ? "x" : undefined}
                            onRightIconClick={searchQuery ? () => setSearchQuery('') : undefined}
                        />
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
                                            {cleanDisplayLabel(page.label)}
                                        </p>
                                        <div className="flex gap-2 mt-0.5 text-[10px]">
                                            {(() => {
                                                const { newPrice, percent } = resolvePagePrices(page, priceSource);
                                                return (
                                                    <>
                                                        <span className="text-rose-600 font-bold">{newPrice}</span>
                                                        {page.oldPrice && <span className="line-through text-slate-400">{page.oldPrice}</span>}
                                                        {percent && <span className="text-emerald-600 font-bold">{percent}</span>}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    onClick={(e) => { e.stopPropagation(); removeManualPage(page.id); }}
                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto text-slate-400 hover:text-rose-500 transition-colors shrink-0 p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                >
                                    <X size={14} />
                                </Button>
                            </div>
                        ))}
                        {filteredPages.length === 0 && (
                            <EmptyState icon={<SearchX size={16} />} title="Không tìm thấy sticker phù hợp" compact />
                        )}
                    </div>
                </div>
            )}

            {/* Saved Lists */}
            {savedLists.length > 0 && manualPages.length === 0 && (
                <div className="p-0 space-y-3 flex-1 flex flex-col overflow-hidden">
                    <Button
                        variant="ghost"
                        onClick={() => setShowSavedLists(!showSavedLists)}
                        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-full p-0 text-inherit flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors shrink-0"
                    >
                        <span className="flex items-center gap-2">
                            <ImageIcon size={16} className="text-emerald-500" />
                            Danh sách đã lưu ({savedLists.length})
                        </span>
                        {showSavedLists ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </Button>
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
                                        <Button
                                            variant="ghost"
                                            onClick={() => loadSavedList(list)}
                                            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 transition-colors text-[10px] font-bold"
                                            title="Tải danh sách"
                                        >
                                            <RotateCcw size={13} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => deleteSavedList(list.id)}
                                            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-lg hover:bg-rose-200 transition-colors"
                                            title="Xóa"
                                        >
                                            <Trash2 size={13} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {manualPages.length === 0 && savedLists.length === 0 && (
                <EmptyState
                    icon={<Inbox size={20} />}
                    title="Danh sách in trống"
                    description="Thêm sticker vào hàng đợi để in hàng loạt."
                    compact
                />
            )}
        </div>
    );
};
