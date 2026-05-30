import React, { useState } from 'react';
import { 
    Printer, Settings, CheckCircle2, Upload, Plus, Trash2, 
    RotateCcw, Download, FileSpreadsheet, Package 
} from 'lucide-react';
import { StickerPage, BatchItem, PrintHistoryEntry, SavedStickerList } from './types';
import { StickerManualQueue } from './StickerManualQueue';

interface StickerPrintControlsProps {
    manualPages: StickerPage[];
    batchItems: BatchItem[];
    showBarcode: boolean;
    setShowBarcode: (show: boolean) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    printHistory: PrintHistoryEntry[];
    showHistory: boolean;
    setShowHistory: (show: boolean) => void;
    handlePrint: () => void;
    addCurrentPage: () => void;
    handleExcelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleTemplateUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    downloadTemplate: () => void;
    handleReset: () => void;
    toggleAllSelection: (select: boolean) => void;
    toggleItemSelection: (id: string) => void;
    clearBatchItems: () => void;
    restoreHistory: (entry: PrintHistoryEntry) => void;
    deleteHistory: (id: string) => void;
    discountDisplayMode: 'percent' | 'amount';
    setDiscountDisplayMode: (mode: 'percent' | 'amount') => void;
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
    activeSubTab: 'data' | 'queue' | 'history';
    setActiveSubTab: (tab: 'data' | 'queue' | 'history') => void;
    priceSource: 'sale' | 'service';
    setPriceSource: (source: 'sale' | 'service') => void;
    handleErpPriceUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'purifier' | 'appliance') => void;
}

export const StickerPrintControls: React.FC<StickerPrintControlsProps> = ({
    manualPages,
    batchItems,
    showBarcode,
    setShowBarcode,
    discountDisplayMode,
    setDiscountDisplayMode,
    searchTerm,
    setSearchTerm,
    printHistory,
    showHistory,
    setShowHistory,
    handlePrint,
    addCurrentPage,
    handleExcelUpload,
    handleTemplateUpload,
    downloadTemplate,
    handleReset,
    toggleAllSelection,
    toggleItemSelection,
    clearBatchItems,
    restoreHistory,
    deleteHistory,
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
    activeSubTab,
    setActiveSubTab,
    priceSource,
    setPriceSource,
    handleErpPriceUpload,
}) => {
    const selectedCount = batchItems.filter(i => i.selected).length;
    const selectedManualPagesCount = manualPages.filter(p => p.selected !== false).length;
    const filteredItems = batchItems.filter(it => it.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="w-full max-w-sm aspect-[197/285] bg-white dark:bg-slate-800 rounded-none shadow-xl border border-slate-200 dark:border-slate-700 p-5 lg:p-6 no-print flex flex-col overflow-hidden">
            {/* Primary Action Buttons */}
            <div className="flex gap-2 mb-3 shrink-0">
                <button 
                    onClick={handlePrint}
                    className="flex-1 bg-[#fbbc04] hover:bg-[#f0b400] text-black font-black text-sm py-2 rounded-lg flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-yellow-500/10"
                >
                    <Printer size={16} />
                    BẤM ĐỂ IN ({batchItems.length > 0 ? selectedCount + selectedManualPagesCount : (manualPages.length > 0 ? selectedManualPagesCount : 1)})
                </button>
                <button 
                    onClick={addCurrentPage}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-transform active:scale-95 shadow-md shadow-indigo-500/10"
                    title="Thêm trang hiện tại vào hàng đợi in"
                >
                    <Plus size={16} />
                    Thêm
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-100 dark:border-slate-700 mb-4 shrink-0">
                <button
                    onClick={() => setActiveSubTab('data')}
                    className={`flex-1 pb-2 text-[11px] lg:text-xs font-bold text-center border-b-2 transition-all ${
                        activeSubTab === 'data'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                >
                    Dữ liệu
                </button>
                <button
                    onClick={() => setActiveSubTab('queue')}
                    className={`flex-1 pb-2 text-[11px] lg:text-xs font-bold text-center border-b-2 transition-all ${
                        activeSubTab === 'queue'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                >
                    D.Sách ({manualPages.length})
                </button>
                <button
                    onClick={() => setActiveSubTab('history')}
                    className={`flex-1 pb-2 text-[11px] lg:text-xs font-bold text-center border-b-2 transition-all ${
                        activeSubTab === 'history'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                >
                    Lịch sử ({printHistory.length})
                </button>
            </div>

            {/* Tab Content (Scrollable Area) */}
            <div className={`flex-1 pr-1 -mr-1 scrollbar-thin ${activeSubTab === 'queue' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto space-y-2'}`}>
                {activeSubTab === 'data' && (
                    <div className="space-y-2.5 animate-in fade-in duration-200 pb-2">
                        {/* File upload actions */}
                        <div className="flex gap-2 bg-slate-50 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100 dark:border-slate-700/30">
                            <label className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-sm text-[11px] lg:text-xs">
                                <Upload size={14} />
                                File giá ĐSD - TBBM
                                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} className="hidden" />
                            </label>
                            <button 
                                onClick={handleReset}
                                className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-colors shadow-sm text-[11px] lg:text-xs"
                            >
                                Reset
                            </button>
                        </div>

                        {/* Import from template */}
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                            <p className="text-[10px] lg:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                                <FileSpreadsheet size={12} />
                                Nhập từ File Mẫu
                            </p>
                            <div className="flex gap-1.5">
                                <button 
                                    onClick={downloadTemplate}
                                    className="flex-1 flex items-center justify-center gap-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm"
                                >
                                    <Download size={10} />
                                    Tải File Mẫu
                                </button>
                                <label className="flex-1 flex items-center justify-center gap-1 py-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm">
                                    <Upload size={10} />
                                    Nhập File Mẫu
                                    <input type="file" accept=".xlsx, .xls, .csv" onChange={handleTemplateUpload} className="hidden" />
                                </label>
                            </div>
                        </div>

                        {/* Import price file from ERP */}
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                            <p className="text-[10px] lg:text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                                <Package size={12} />
                                Nhập file in giá từ ERP
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                                <label className="flex items-center justify-center gap-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm text-center">
                                    <Upload size={10} />
                                    Máy Lọc Nước (Mẫu in 99)
                                    <input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => handleErpPriceUpload(e, 'purifier')} className="hidden" />
                                </label>
                                <label className="flex items-center justify-center gap-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] lg:text-[11px] cursor-pointer transition-colors shadow-sm text-center">
                                    <Upload size={10} />
                                    Điện Tử/Lạnh (Mẫu in 97)
                                    <input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => handleErpPriceUpload(e, 'appliance')} className="hidden" />
                                </label>
                            </div>
                        </div>

                        {/* Batch items list */}
                        {batchItems.length > 0 && (
                            <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-xs text-slate-800 dark:text-white">
                                        Danh sách in ({selectedCount}/{batchItems.length})
                                    </h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => toggleAllSelection(true)} className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold uppercase">Chọn hết</button>
                                        <button onClick={() => toggleAllSelection(false)} className="text-[10px] text-slate-500 hover:text-slate-600 font-bold uppercase">Bỏ chọn</button>
                                        <button onClick={clearBatchItems} className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase">Xóa</button>
                                    </div>
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Tìm tên sản phẩm hoặc IMEI..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 mb-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                                <div className="space-y-2">
                                    {filteredItems.map(item => (
                                        <label key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${item.selected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={item.selected} 
                                                onChange={() => toggleItemSelection(item.id)}
                                                className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-xs text-slate-800 dark:text-white truncate" title={item.name}>{item.name}</p>
                                                <div className="flex gap-3 mt-1.5 text-[11px]">
                                                    <span className="font-bold text-red-600">{item.newPrice}</span>
                                                    <span className="line-through text-slate-400">{item.oldPrice}</span>
                                                    <span className="text-green-600 font-bold">{item.percent}</span>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Guide Section */}
                        <div className="mt-4 border-t border-slate-100 dark:border-slate-700/60 pt-4 space-y-2.5">
                            <div className="flex items-center gap-1.5">
                                <Settings size={13} className="text-indigo-500" />
                                <span className="text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-wider">H.Dẫn in & Sử dụng</span>
                            </div>
                            
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">CẤU HÌNH IN CHROME (CTRL + P):</p>
                                    <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                                        <li className="flex items-center gap-1.5">
                                            <span className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                                            <span>Khổ giấy khuyên dùng: <strong>A4</strong></span>
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <span className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                                            <span>Lề (Margins): <strong>Không Có (None)</strong></span>
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <span className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                                            <span>Chọn: <strong>Hiển thị đồ họa nền (Background graphics)</strong></span>
                                        </li>
                                    </ul>
                                </div>
                                
                                <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-2 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                                    <p>⚡ <strong>Sửa nhanh:</strong> Click trực tiếp vào chữ trên sticker ở khung preview.</p>
                                    <p>⚡ <strong>Tính % tự động:</strong> Chỉ cần nhập Giá cũ & Giá mới.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSubTab === 'queue' && (
                    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200 pb-2">
                        <StickerManualQueue
                            manualPages={manualPages}
                            savedLists={savedLists}
                            showSavedLists={showSavedLists}
                            setShowSavedLists={setShowSavedLists}
                            saveCurrentList={saveCurrentList}
                            clearManualPages={clearManualPages}
                            loadPageToEditor={loadPageToEditor}
                            removeManualPage={removeManualPage}
                            loadSavedList={loadSavedList}
                            deleteSavedList={deleteSavedList}
                            togglePageSelection={togglePageSelection}
                            toggleAllPagesSelection={toggleAllPagesSelection}
                            discountThreshold={discountThreshold}
                            handleDiscountThresholdChange={handleDiscountThresholdChange}
                            activeQueuePageId={activeQueuePageId}
                            setActiveQueuePageId={setActiveQueuePageId}
                            discountDisplayMode={discountDisplayMode}
                            setDiscountDisplayMode={setDiscountDisplayMode}
                            showBarcode={showBarcode}
                            setShowBarcode={setShowBarcode}
                            priceSource={priceSource}
                            setPriceSource={setPriceSource}
                        />
                    </div>
                )}

                {activeSubTab === 'history' && (
                    <div className="space-y-2 animate-in fade-in duration-200 pb-2">
                        {printHistory.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-12">Chưa có lịch sử in</p>
                        ) : (
                            printHistory.map(entry => (
                                <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group text-left">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{entry.label}</p>
                                        <div className="flex gap-1.5 mt-1 text-[10px] text-slate-400">
                                            <span>{new Date(entry.timestamp).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                            <span>•</span>
                                            <span>{entry.pageCount} trang</span>
                                            <span>•</span>
                                            <span>{entry.stickerType === 'gia_soc' ? 'Giá Sốc' : 'Giờ Vàng'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0 ml-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => restoreHistory(entry)}
                                            className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                                            title="Khôi phục"
                                        >
                                            <RotateCcw size={13} />
                                        </button>
                                        <button 
                                            onClick={() => deleteHistory(entry.id)}
                                            className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                            title="Xóa"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
