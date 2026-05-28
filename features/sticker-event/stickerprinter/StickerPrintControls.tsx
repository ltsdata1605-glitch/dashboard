import React from 'react';
import { 
    Printer, Settings, CheckCircle2, Upload, Plus, Trash2, 
    RotateCcw, ChevronDown, ChevronUp, Download, FileSpreadsheet, Package 
} from 'lucide-react';
import { StickerPage, BatchItem, PrintHistoryEntry } from './types';

interface StickerPrintControlsProps {
    manualPages: StickerPage[];
    batchItems: BatchItem[];
    showBarcode: boolean;
    setShowBarcode: (show: boolean) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    inventoryCodes: Set<string> | null;
    printHistory: PrintHistoryEntry[];
    showHistory: boolean;
    setShowHistory: (show: boolean) => void;
    handlePrint: () => void;
    addCurrentPage: () => void;
    handleExcelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleTemplateUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleInventoryUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    downloadTemplate: () => void;
    clearInventory: () => void;
    handleReset: () => void;
    toggleAllSelection: (select: boolean) => void;
    toggleItemSelection: (id: string) => void;
    clearBatchItems: () => void;
    restoreHistory: (entry: PrintHistoryEntry) => void;
    deleteHistory: (id: string) => void;
}

export const StickerPrintControls: React.FC<StickerPrintControlsProps> = ({
    manualPages,
    batchItems,
    showBarcode,
    setShowBarcode,
    searchTerm,
    setSearchTerm,
    inventoryCodes,
    printHistory,
    showHistory,
    setShowHistory,
    handlePrint,
    addCurrentPage,
    handleExcelUpload,
    handleTemplateUpload,
    handleInventoryUpload,
    downloadTemplate,
    clearInventory,
    handleReset,
    toggleAllSelection,
    toggleItemSelection,
    clearBatchItems,
    restoreHistory,
    deleteHistory,
}) => {
    const selectedCount = batchItems.filter(i => i.selected).length;
    const filteredItems = batchItems.filter(it => it.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 no-print">
            <div className="flex gap-2 mb-4">
                <button 
                    onClick={handlePrint}
                    className="flex-1 bg-[#fbbc04] hover:bg-[#f0b400] text-black font-black text-lg py-3.5 rounded-xl flex items-center justify-center gap-2.5 transition-transform active:scale-95 shadow-lg shadow-yellow-500/30"
                >
                    <Printer size={24} />
                    BẤM ĐỂ IN ({batchItems.length > 0 ? selectedCount + manualPages.length : (manualPages.length > 0 ? manualPages.length : 1)})
                </button>
                <button 
                    onClick={addCurrentPage}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-lg shadow-indigo-500/30"
                    title="Thêm trang hiện tại vào hàng đợi in"
                >
                    <Plus size={20} />
                    Thêm
                </button>
            </div>

            <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                    HƯỚNG DẪN IN
                </h3>
                
                <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                    <p className="font-medium">
                        1. Sử Dụng Trình Duyệt GOOGLE CHROME Để In.
                    </p>
                    
                    <p className="font-medium">
                        2. Khi In Điều Chỉnh Các Thông Số Như Sau:
                    </p>
                    
                    <ul className="space-y-3 pl-2">
                        <li className="flex items-start gap-2">
                            <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>Chọn <strong>Cài Đặt Khác (More settings)</strong>.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>Chọn Khổ Giấy Cần In (Khuyên dùng <strong>A4</strong>).</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>Chọn Lề (Margins): <strong>Không Có (None)</strong>.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>Tích Chọn: <strong>Hiển Thị Đồ Họa Nền (Background graphics)</strong>.</span>
                        </li>
                    </ul>
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                    <div className="flex gap-3">
                        <Settings className="text-blue-500 shrink-0" size={20} />
                        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                            Lưu ý: Bạn có thể click trực tiếp vào phần nội dung (giá, tên, % giảm, nhãn tiêu đề) ở khung bên trái để sửa thông tin trước khi in.
                        </p>
                    </div>
                </div>

                <div className="mt-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                    <div className="flex gap-3">
                        <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                            <strong>% giảm tự động:</strong> Chỉ cần nhập <strong>Giá cũ</strong> và <strong>Giá mới</strong>, phần trăm giảm sẽ được tính tự động. Không cần nhập thủ công.
                        </p>
                    </div>
                </div>

                <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex gap-2">
                        <label className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-sm text-sm">
                            <Upload size={18} />
                            File giá ĐSD - TBBM
                            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} className="hidden" />
                        </label>
                        <button 
                            onClick={handleReset}
                            className="px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-colors shadow-sm text-sm"
                        >
                            Reset
                        </button>
                    </div>

                    <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                        <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                            <FileSpreadsheet size={14} />
                            Nhập từ File Mẫu
                        </p>
                        <div className="flex gap-2">
                            <button 
                                onClick={downloadTemplate}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer transition-colors shadow-sm"
                            >
                                <Download size={14} />
                                Tải File Mẫu
                            </button>
                            <label className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 rounded-lg font-bold text-xs cursor-pointer transition-colors shadow-sm">
                                <Upload size={14} />
                                Nhập File Mẫu
                                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleTemplateUpload} className="hidden" />
                            </label>
                        </div>
                    </div>

                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/50">
                        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                            <Package size={14} />
                            Lọc tồn kho trưng bày
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <a 
                                href="https://report.mwgroup.vn/home/dashboard/17" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs cursor-pointer transition-colors shadow-sm"
                            >
                                <Package size={14} />
                                Đỗ tồn Trưng bày
                            </a>
                            <label className="flex items-center justify-center gap-1.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs cursor-pointer transition-colors shadow-sm">
                                <Upload size={14} />
                                {inventoryCodes ? `Đổi file (${inventoryCodes.size} mã)` : 'Nhập File Tồn'}
                                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleInventoryUpload} className="hidden" />
                            </label>
                        </div>
                        {inventoryCodes && (
                            <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[10px] font-bold">
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                        ✓ {batchItems.filter(i => i.selected).length} có tồn
                                    </span>
                                    <span className="text-slate-400">|</span>
                                    <span className="text-red-500 dark:text-red-400">
                                        ✗ {batchItems.filter(i => !i.selected).length} không tồn
                                    </span>
                                </div>
                                <button 
                                    onClick={clearInventory}
                                    className="text-[10px] font-bold text-amber-600 hover:text-amber-800 dark:text-amber-400 uppercase"
                                >
                                    Xoá lọc
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center justify-between">
                            <label htmlFor="toggle-barcode" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                Hiển thị Mã Vạch (Barcode)
                            </label>
                            <input 
                                type="checkbox" 
                                id="toggle-barcode" 
                                checked={showBarcode} 
                                onChange={(e) => setShowBarcode(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Mã vạch sẽ chỉ hiển thị khi tên sản phẩm có chứa từ khoá <strong className="text-indigo-600 dark:text-indigo-400">IMEI:</strong> hoặc <strong className="text-indigo-600 dark:text-indigo-400">Code:</strong> liền trước mã số.
                        </p>
                    </div>
                    
                    {batchItems.length > 0 && (
                        <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                                    Danh sách in ({selectedCount}/{batchItems.length})
                                </h4>
                                <div className="flex gap-3">
                                    <button onClick={() => toggleAllSelection(true)} className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold uppercase">Chọn hết</button>
                                    <button onClick={() => toggleAllSelection(false)} className="text-[11px] text-slate-500 hover:text-slate-600 font-bold uppercase">Bỏ chọn</button>
                                    <button onClick={clearBatchItems} className="text-[11px] text-red-500 hover:text-red-600 font-bold uppercase">Xóa</button>
                                </div>
                            </div>
                            <input 
                                type="text" 
                                placeholder="Tìm tên sản phẩm hoặc IMEI..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 mb-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 -mr-2">
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
                </div>

                {/* Print History */}
                <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                    <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <RotateCcw size={16} />
                            Lịch sử in ({printHistory.length})
                        </span>
                        {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showHistory && (
                        <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
                            {printHistory.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4">Chưa có lịch sử in</p>
                            ) : (
                                printHistory.map(entry => (
                                    <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{entry.label}</p>
                                            <div className="flex gap-2 mt-1 text-[10px] text-slate-400">
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
        </div>
    );
};
