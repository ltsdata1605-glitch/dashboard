import React, { useState, useEffect, useMemo } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { StickerPage, BatchItem, PrintHistoryEntry, SavedStickerList } from './types';
import { DEFAULT_HISTORY_ID, DEFAULT_DRAW_HISTORY_ENTRY } from '../hooks/useStickerPrinterData';
import { StickerManualQueue } from './StickerManualQueue';
import { Button, Input, Tabs, EmptyState, SectionCard, Switch } from '../../../components/shared/ui';
import type { TabItem } from '../../../components/shared/ui';
import { Checkbox } from '../../../components/shared/ui/Checkbox';

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
    deleteSavedList: (list: SavedStickerList) => void;
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
    stickerType: 'gia_soc' | 'gio_vang' | 'draw';
    drawStartNumber: number;
    setDrawStartNumber: (num: number) => void;
    drawTotalTickets: number;
    setDrawTotalTickets: (num: number) => void;
    drawAutoIncrement: boolean;
    setDrawAutoIncrement: (val: boolean) => void;
    bgImage: string;
    setBgImage: (img: string) => void;
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
    stickerType,
    drawStartNumber,
    setDrawStartNumber,
    drawTotalTickets,
    setDrawTotalTickets,
    drawAutoIncrement,
    setDrawAutoIncrement,
    bgImage,
    setBgImage,
}) => {
    const selectedCount = batchItems.filter(i => i.selected).length;
    const selectedManualPagesCount = manualPages.filter(p => p.selected !== false).length;
    const filteredItems = batchItems.filter(it => it.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // --- Debounce input: giữ local state cho 2 ô nhập liệu để tránh tạo mới
    // toàn bộ mảng drawTickets (có thể lên tới 1000 phần tử) mỗi phím bấm.
    // Chỉ cập nhật parent state sau khi ngừng gõ 400ms. ---
    const [localStartNumber, setLocalStartNumber] = useState(drawStartNumber);
    const [localTotalTickets, setLocalTotalTickets] = useState(drawTotalTickets);

    // Sync từ parent khi có thay đổi bên ngoài (ví dụ: restore history)
    useEffect(() => { setLocalStartNumber(drawStartNumber); }, [drawStartNumber]);
    useEffect(() => { setLocalTotalTickets(drawTotalTickets); }, [drawTotalTickets]);

    // Debounce: chỉ lan truyền giá trị mới lên parent sau 400ms ngừng gõ
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localStartNumber !== drawStartNumber) setDrawStartNumber(localStartNumber);
        }, 400);
        return () => clearTimeout(timer);
    }, [localStartNumber]);  

    useEffect(() => {
        const timer = setTimeout(() => {
            if (localTotalTickets !== drawTotalTickets) setDrawTotalTickets(localTotalTickets);
        }, 400);
        return () => clearTimeout(timer);
    }, [localTotalTickets]);  

    const filteredHistory = useMemo(() => {
        const userEntries = printHistory.filter(entry => entry.stickerType === stickerType && entry.id !== DEFAULT_HISTORY_ID);
        // Ở chế độ draw, luôn gắn entry mẫu mặc định ở trên cùng danh sách (cố định ở trên)
        if (stickerType === 'draw') {
            return [DEFAULT_DRAW_HISTORY_ENTRY, ...userEntries];
        }
        return userEntries;
    }, [printHistory, stickerType]);

    const tabItems: TabItem[] = [
        { id: 'data', label: 'Dữ liệu' },
        ...(stickerType !== 'draw' ? [{ id: 'queue', label: 'D.Sách', badge: manualPages.length }] : []),
        { id: 'history', label: 'Lịch sử', badge: filteredHistory.length },
    ];

    return (
        <SectionCard className="w-full max-w-sm lg:aspect-[197/285] min-h-[460px] p-3 lg:p-6 no-print flex flex-col overflow-hidden">
            {/* Primary Action Buttons */}
            <div className="flex gap-2 mb-3 shrink-0">
                <Button 
                    onClick={handlePrint}
                    className="flex-1 !bg-amber-400 hover:!bg-amber-500 !text-slate-950 font-bold text-sm py-2 rounded-control flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm border-transparent"
                    leftIcon={<AppIcon name="print" size="md" />}
                >
                    {/* Vàng = màu nút IN của chủ dự án (giữ); chữ viết như câu thay IN HOA (GĐ7) */}
                    Bấm để in ({stickerType === 'draw' ? Math.ceil(drawTotalTickets / 4) : (batchItems.length > 0 ? selectedCount + selectedManualPagesCount : (manualPages.length > 0 ? selectedManualPagesCount : 1))})
                </Button>
                <Button 
                    onClick={addCurrentPage}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-md shadow-sky-500/10 border-transparent"
                    title="Thêm trang hiện tại vào hàng đợi in"
                    leftIcon={<AppIcon name="add" size="md" />}
                >
                    Thêm
                </Button>
            </div>

            {/* Tab Navigation */}
            <Tabs
                items={tabItems}
                activeId={activeSubTab}
                onChange={(id) => setActiveSubTab(id as 'data' | 'queue' | 'history')}
                variant="underline"
                size="sm"
                fullWidth
                className="mb-4 shrink-0"
            />

            {/* Tab Content (Scrollable Area) */}
            <div className={`flex-1 pr-1 -mr-1 scrollbar-thin ${activeSubTab === 'queue' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto space-y-2'}`}>
                {activeSubTab === 'data' && (
                    <div className="space-y-2.5 animate-in fade-in duration-200 pb-2">
                        {stickerType === 'draw' ? (
                            /* Cấu hình phiếu rút thăm chuyên nghiệp */
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-800/30 space-y-4">
                                <div className="flex items-center justify-between border-b border-rose-200/40 dark:border-rose-800/40 pb-2">
                                    <p className="text-[11px] lg:text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                                        <AppIcon name="settings" size="sm" />
                                        Cấu hình in phiếu rút thăm
                                    </p>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon="reset"
                                        onClick={() => {
                                            setLocalStartNumber(1);
                                            setLocalTotalTickets(4000);
                                            setDrawAutoIncrement(true);
                                            restoreHistory(DEFAULT_DRAW_HISTORY_ENTRY);
                                        }}
                                        className="bg-white hover:bg-rose-100/70 text-rose-700"
                                        title="Khôi phục toàn bộ phiếu và cấu hình về mẫu mặc định"
                                    >
                                        Mặc định
                                    </Button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                            Số bắt đầu
                                        </label>
                                        <Input
                                            type="number" inputMode="decimal"
                                            min="1"
                                            value={localStartNumber}
                                            onChange={(e) => setLocalStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="text-xs font-semibold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                            Số lượng cần in
                                        </label>
                                        <Input
                                            type="number" inputMode="decimal"
                                            min="1"
                                            value={localTotalTickets}
                                            onChange={(e) => setLocalTotalTickets(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="text-xs font-semibold"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-3 min-h-11 sm:min-h-0 py-1">
                                    <span id="phieu-tu-nhay-so" className="text-[13px] font-medium text-slate-700">Tự động nhảy số liên tục</span>
                                    <Switch checked={drawAutoIncrement ?? true} onChange={setDrawAutoIncrement} aria-labelledby="phieu-tu-nhay-so" />
                                </div>

                                {/* Chọn nền in */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                        Nền in
                                    </label>
                                    <Tabs
                                        variant="segment"
                                        size="sm"
                                        fullWidth
                                        activeId={bgImage}
                                        onChange={setBgImage}
                                        items={[
                                            { id: '/frame/bg_phieu.png', label: 'ĐMX' },
                                            { id: '/frame/bg_phieutgd.png', label: 'TGĐ' },
                                        ]}
                                    />
                                </div>

                                <div className="bg-white/80 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    <span className="font-bold text-sky-600 dark:text-sky-400">Gợi ý in:</span> {localTotalTickets} phiếu rút thăm sẽ được in trên <span className="font-bold text-slate-800 dark:text-white">{Math.ceil(localTotalTickets / 4)} trang A4</span> (mỗi trang 4 phiếu). Các số thứ tự sẽ tự động điền từ <span className="font-bold text-slate-800 dark:text-white">{localStartNumber}</span> đến <span className="font-bold text-slate-800 dark:text-white">{localStartNumber + localTotalTickets - 1}</span>.
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Nhập dữ liệu — GĐ7: một kiểu nút (trước 5 nút 5 màu: xanh, xanh lá, đỏ, cam…). Nút nhấn chính duy nhất là file
                                    giá ĐSD; các nguồn khác là nút phụ xám, gom theo nhóm có tiêu đề nhỏ. */}
                                <div className="flex gap-2">
                                    <label className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 max-sm:min-h-11 pointer-coarse:min-h-11 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-control font-semibold cursor-pointer transition-colors text-xs">
                                        <AppIcon name="upload" size="md" />
                                        File giá ĐSD - TBBM
                                        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} className="hidden" />
                                    </label>
                                    <Button onClick={handleReset} variant="secondary" size="md" className="text-xs px-3" title="Xoá danh sách đã nhập, về mẫu ban đầu">
                                        Đặt lại
                                    </Button>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-[12px] font-medium text-slate-500 flex items-center gap-1.5 px-0.5">
                                        <AppIcon name="spreadsheet" size="sm" />
                                        Nhập từ file mẫu
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="secondary" size="md" icon="download" onClick={downloadTemplate} className="text-xs px-2">
                                            Tải file mẫu
                                        </Button>
                                        <label className="inline-flex items-center justify-center gap-1.5 h-9 max-sm:min-h-11 pointer-coarse:min-h-11 px-2 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-control font-semibold text-xs cursor-pointer transition-colors">
                                            <AppIcon name="upload" size="md" />
                                            Nhập file mẫu
                                            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleTemplateUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-[12px] font-medium text-slate-500 flex items-center gap-1.5 px-0.5">
                                        <AppIcon name="product" size="sm" />
                                        Nhập file in giá từ ERP
                                    </p>
                                    <div className="grid grid-cols-1 gap-2">
                                        <label className="inline-flex items-center justify-center gap-1.5 h-9 max-sm:min-h-11 pointer-coarse:min-h-11 px-3 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-control font-semibold text-xs cursor-pointer transition-colors text-center">
                                            <AppIcon name="upload" size="md" />
                                            Máy lọc nước (mẫu in 99)
                                            <input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => handleErpPriceUpload(e, 'purifier')} className="hidden" />
                                        </label>
                                        <label className="inline-flex items-center justify-center gap-1.5 h-9 max-sm:min-h-11 pointer-coarse:min-h-11 px-3 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-control font-semibold text-xs cursor-pointer transition-colors text-center">
                                            <AppIcon name="upload" size="md" />
                                            Điện tử/Lạnh (mẫu in 97)
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
                                                <Button variant="unstyled" size="none" onClick={() => toggleAllSelection(true)} className="ycx-hit text-[12px] text-sky-600 hover:text-sky-700 font-semibold">Chọn hết</Button>
                                                <Button variant="unstyled" size="none" onClick={() => toggleAllSelection(false)} className="ycx-hit text-[12px] text-slate-500 hover:text-slate-600 font-semibold">Bỏ chọn</Button>
                                                <Button variant="unstyled" size="none" onClick={clearBatchItems} className="ycx-hit text-[12px] text-rose-600 hover:text-rose-700 font-semibold">Xoá</Button>
                                            </div>
                                        </div>
                                        <Input 
                                            type="text" 
                                            placeholder="Tìm tên sản phẩm hoặc IMEI..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="mb-3 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                                        />
                                        <div className="space-y-2">
                                            {filteredItems.map(item => (
                                                <Checkbox
                                                    key={item.id}
                                                    checked={item.selected}
                                                    onChange={() => toggleItemSelection(item.id)}
                                                    className="mt-0.5"
                                                    wrapperClassName={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${item.selected ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                                                    labelClassName="flex-1 min-w-0"
                                                    label={
                                                        <>
                                                            <span className="block font-bold text-xs text-slate-800 truncate" title={item.name}>{item.name}</span>
                                                            <span className="flex gap-3 mt-1.5 text-[11px]">
                                                                <span className="font-bold text-rose-600">{item.newPrice}</span>
                                                                <span className="line-through text-slate-400">{item.oldPrice}</span>
                                                                <span className="text-emerald-600 font-bold">{item.percent}</span>
                                                            </span>
                                                        </>
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Guide Section */}
                        <div className="mt-4 border-t border-slate-100 dark:border-slate-700/60 pt-4 space-y-2.5">
                            <div className="flex items-center gap-1.5">
                                <AppIcon name="settings" size="sm" className="text-sky-500" />
                                <span className="text-[13px] font-semibold text-slate-800">Hướng dẫn in & sử dụng</span>
                            </div>
                            
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3">
                                <div className="space-y-1.5">
                                    <p className="text-[12px] font-semibold text-slate-600">Cấu hình in Chrome (Ctrl + P)</p>
                                    <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                                        <li className="flex items-center gap-1.5">
                                            <span className="w-1 h-1 rounded-full bg-sky-500 shrink-0" />
                                            <span>Khổ giấy khuyên dùng: <strong>A4</strong></span>
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <span className="w-1 h-1 rounded-full bg-sky-500 shrink-0" />
                                            <span>Lề (Margins): <strong>Không Có (None)</strong></span>
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <span className="w-1 h-1 rounded-full bg-sky-500 shrink-0" />
                                            <span>Chọn: <strong>Hiển thị đồ họa nền (Background graphics)</strong></span>
                                        </li>
                                    </ul>
                                </div>
                                
                                <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-2 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                                    {stickerType === 'draw' ? (
                                        <>
                                            <p className="flex items-start gap-1.5"><AppIcon name="quick" size="xs" className="mt-0.5 shrink-0 text-amber-600" /><span><strong>Sửa nhanh:</strong> Nhập nội dung ở phiếu số 1 (trang 1). Các phiếu còn lại tự động đồng bộ theo.</span></p>
                                            <p className="flex items-start gap-1.5"><AppIcon name="quick" size="xs" className="mt-0.5 shrink-0 text-amber-600" /><span><strong>Nhảy số:</strong> Bật chế độ "Tự động nhảy số" để hệ thống tự động tăng dần từ số bắt đầu.</span></p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="flex items-start gap-1.5"><AppIcon name="quick" size="xs" className="mt-0.5 shrink-0 text-amber-600" /><span><strong>Sửa nhanh:</strong> Click trực tiếp vào chữ trên sticker ở khung preview.</span></p>
                                            <p className="flex items-start gap-1.5"><AppIcon name="quick" size="xs" className="mt-0.5 shrink-0 text-amber-600" /><span><strong>Tính % tự động:</strong> Chỉ cần nhập Giá cũ & Giá mới.</span></p>
                                        </>
                                    )}
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
                        {filteredHistory.length === 0 ? (
                            <EmptyState icon={<AppIcon name="history" size="lg" />} title="Chưa có lịch sử in" compact />
                        ) : (
                            filteredHistory.map(entry => {
                                const isDefault = entry.id === DEFAULT_HISTORY_ID;
                                return (
                                <div 
                                    key={entry.id} 
                                    className={`flex items-center justify-between p-3 rounded-lg border group text-left ${
                                        isDefault 
                                            ? 'sticky top-0 z-10 bg-amber-50/95 dark:bg-amber-950/90 backdrop-blur-xs border-amber-300 dark:border-amber-700/60 shadow-xs' 
                                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700'
                                    }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate flex items-center gap-1.5">
                                            {isDefault && <span className="inline-flex items-center shrink-0 px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 rounded"><AppIcon name="star" size="xs" className="mr-0.5" />Mặc định</span>}
                                            {entry.label}
                                        </p>
                                        <div className="flex gap-1.5 mt-1 text-[11px] text-slate-400">
                                            {!isDefault && (
                                                <>
                                                    <span>{new Date(entry.timestamp).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span>•</span>
                                                </>
                                            )}
                                            <span>{entry.pageCount} trang</span>
                                            <span>•</span>
                                            <span>
                                                {entry.stickerType === 'gia_soc' 
                                                    ? 'Giá Sốc' 
                                                    : entry.stickerType === 'draw' 
                                                        ? 'Phiếu' 
                                                        : 'Giờ Vàng'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0 ml-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="tinted"
                                            size="icon"
                                            icon="reset"
                                            onClick={() => restoreHistory(entry)}
                                            title="Khôi phục"
                                            aria-label="Khôi phục"
                                        />
                                        {!isDefault && (
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                icon="delete"
                                                onClick={() => deleteHistory(entry.id)}
                                                title="Xóa"
                                                aria-label="Xóa"
                                            />
                                        )}
                                    </div>
                                </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </SectionCard>
    );
};
