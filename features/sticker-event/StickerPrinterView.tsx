import React, { Suspense, lazy } from 'react';
import toast from 'react-hot-toast';

import { StickerPage, SavedStickerList, PrintHistoryEntry } from './stickerprinter/types';
import { StickerPrintPreview } from './stickerprinter/StickerPrintPreview';
import { StickerManualQueue } from './stickerprinter/StickerManualQueue';
import { StickerPrintControls } from './stickerprinter/StickerPrintControls';
import { StickerModeToolbar } from './stickerprinter/StickerModeToolbar';
import { Button } from '../../components/shared/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useStickerPrinterData } from './hooks/useStickerPrinterData';

import ErrorBoundary from '../../components/common/ErrorBoundary';

const StickerEventApp = lazy(() => import('./StickerEventApp'));
import SaveListModal from './SaveListModal';

export default function StickerPrinterView() {
    const { user } = useAuth();
    const {
        stickerMode, setStickerMode,
        eventEverOpened, setEventEverOpened,
        stickerType, setStickerType,
        bgImage, setBgImage,
        priceSource, setPriceSource,
        drawTickets, setDrawTickets,
        drawStartNumber, setDrawStartNumber,
        drawTotalTickets, setDrawTotalTickets,
        drawAutoIncrement, setDrawAutoIncrement,
        drawContentTopLeftSize,
        drawContentTopRightSize,
        drawContentBottomLeftSize,
        drawContentBottomRightSize,
        drawTitleSize,
        drawCodeSize,
        drawFooterSize,
        activeField, setActiveField,
        headerTextSize, setHeaderTextSize,
        subHeaderTextSize,
        percentTextSize,
        oldPriceTextSize,
        nameTextSize,
        newPriceTextSize,
        footerTextSize,
        discountDisplayMode, setDiscountDisplayMode,
        discountThreshold, setDiscountThreshold,
        activeQueuePageId, setActiveQueuePageId,
        activeSubTab, setActiveSubTab,
        batchItems, setBatchItems,
        headerTextContent, setHeaderTextContent,
        subHeaderTextContent, setSubHeaderTextContent,
        footerTextContent, setFooterTextContent,
        searchTerm, setSearchTerm,
        showBarcode, setShowBarcode,
        barcodeImei, setBarcodeImei,
        manualPages, setManualPages,
        printHistory,
        showHistory, setShowHistory,
        savedLists,
        showSavedLists, setShowSavedLists,
        previewName, setPreviewName,
        previewOldPrice, setPreviewOldPrice,
        previewNewPrice, setPreviewNewPrice,
        isLoaded,
        isSaveListModalOpen, setIsSaveListModalOpen,
        activeDrawPage, setActiveDrawPage,
        totalDrawPages,
        getActiveFieldLabel,
        getDrawActiveFieldLabel,
        getActiveFontSize,
        getDrawActiveFontSize,
        setDrawActiveFontSize,
        setActiveFontSize,
        applyFontSizeToSelection,
        updateBatchItem,
        updateSubQueryParam,
        handleDiscountThresholdChange,
        handleExcelUpload,
        downloadTemplate,
        loadPageToEditor,
        handleTemplateUpload,
        handleErpPriceUpload,
        toggleItemSelection,
        toggleAllSelection,
        addCurrentPage,
        removeManualPage,
        clearManualPages,
        togglePageSelection,
        toggleAllPagesSelection,
        saveCurrentList,
        handleSaveCurrentList,
        loadSavedList,
        deleteSavedList,
        restoreHistory,
        deleteHistory,
        handleReset,
        handlePrint,
    } = useStickerPrinterData();

    return (
        <div className="print-wrapper w-full h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
            <StickerModeToolbar
                stickerMode={stickerMode}
                stickerType={stickerType}
                onSelectGiaSoc={() => {
                    setStickerMode('sticker');
                    setStickerType('gia_soc');
                    setHeaderTextContent('QUẠT ĐIỀU HOÀ');
                    setBgImage('/frame/X24_NEW.png');
                    setHeaderTextSize(8);
                    updateSubQueryParam('gia-soc');
                }}
                onSelectGioVang={() => {
                    setStickerMode('sticker');
                    setStickerType('gio_vang');
                    setHeaderTextContent('TỪ 00/00 ĐẾN 00/00');
                    setBgImage('/frame/GVO2-scaled.png');
                    setHeaderTextSize(8);
                    updateSubQueryParam('gio-vang');
                }}
                onSelectDraw={() => {
                    setStickerMode('sticker');
                    setStickerType('draw');
                    setBgImage('/frame/bg_phieu.png');
                    updateSubQueryParam('draw');
                    setActiveField('drawContentTopLeft');
                }}
                onSelectEvent={() => {
                    setStickerMode('event');
                    setEventEverOpened(true);
                    updateSubQueryParam('event');
                }}
                getActiveFieldLabel={getActiveFieldLabel}
                getDrawActiveFieldLabel={getDrawActiveFieldLabel}
                getActiveFontSize={getActiveFontSize}
                getDrawActiveFontSize={getDrawActiveFontSize}
                onDecreaseFontSize={() => {
                    if (stickerType === 'draw') {
                        const curSize = getDrawActiveFontSize();
                        const newSize = Math.max(1, curSize - 0.2);
                        setDrawActiveFontSize(newSize);
                        applyFontSizeToSelection(newSize);
                    } else {
                        setActiveFontSize(s => Math.max(1, s - 0.2));
                    }
                }}
                onIncreaseFontSize={() => {
                    if (stickerType === 'draw') {
                        const curSize = getDrawActiveFontSize();
                        const newSize = curSize + 0.2;
                        setDrawActiveFontSize(newSize);
                        applyFontSizeToSelection(newSize);
                    } else {
                        setActiveFontSize(s => s + 0.2);
                    }
                }}
            />

            {eventEverOpened && (
                <div className={`absolute inset-0 z-10 w-full h-full overflow-y-auto transition-opacity duration-200 ${stickerMode === 'event' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <ErrorBoundary name="Event - Tồn kho">
                        <Suspense fallback={
                            <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-sm text-slate-500 font-medium">Đang tải Event - Tồn kho...</p>
                                </div>
                            </div>
                        }>
                            <StickerEventApp />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            )}

            <div className={`w-full h-full overflow-y-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8 justify-center items-start ${stickerMode === 'event' ? 'invisible' : 'visible'}`}>
                <div className="flex flex-col gap-4 w-full max-w-sm shrink-0">
                    <StickerPrintPreview
                        batchItems={batchItems}
                        stickerType={stickerType}
                        showBarcode={showBarcode}
                        discountDisplayMode={discountDisplayMode}
                        headerTextContent={headerTextContent}
                        subHeaderTextContent={subHeaderTextContent}
                        footerTextContent={footerTextContent}
                        barcodeImei={barcodeImei}
                        bgImage={bgImage}
                        headerTextSize={headerTextSize}
                        subHeaderTextSize={subHeaderTextSize}
                        percentTextSize={percentTextSize}
                        oldPriceTextSize={oldPriceTextSize}
                        nameTextSize={nameTextSize}
                        newPriceTextSize={newPriceTextSize}
                        footerTextSize={footerTextSize}
                        previewName={previewName}
                        previewOldPrice={previewOldPrice}
                        previewNewPrice={previewNewPrice}
                        setPreviewOldPrice={setPreviewOldPrice}
                        setPreviewNewPrice={setPreviewNewPrice}
                        activeField={activeField}
                        setActiveField={setActiveField}
                        setHeaderTextContent={setHeaderTextContent}
                        setSubHeaderTextContent={setSubHeaderTextContent}
                        setFooterTextContent={setFooterTextContent}
                        setBarcodeImei={setBarcodeImei}
                        setPreviewName={setPreviewName}
                        drawTickets={drawTickets}
                        setDrawTickets={setDrawTickets}
                        drawAutoIncrement={drawAutoIncrement}
                        drawContentTopLeftSize={drawContentTopLeftSize}
                        drawContentTopRightSize={drawContentTopRightSize}
                        drawContentBottomLeftSize={drawContentBottomLeftSize}
                        drawContentBottomRightSize={drawContentBottomRightSize}
                        drawTitleSize={drawTitleSize}
                        drawCodeSize={drawCodeSize}
                        drawFooterSize={drawFooterSize}
                    />
                </div>
                <StickerPrintControls
                    manualPages={manualPages}
                    batchItems={batchItems}
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
                    showBarcode={showBarcode}
                    setShowBarcode={setShowBarcode}
                    discountDisplayMode={discountDisplayMode}
                    setDiscountDisplayMode={setDiscountDisplayMode}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    printHistory={printHistory}
                    showHistory={showHistory}
                    setShowHistory={setShowHistory}
                    handlePrint={handlePrint}
                    addCurrentPage={addCurrentPage}
                    handleExcelUpload={handleExcelUpload}
                    handleTemplateUpload={handleTemplateUpload}
                    downloadTemplate={downloadTemplate}
                    handleReset={handleReset}
                    toggleAllSelection={toggleAllSelection}
                    toggleItemSelection={toggleItemSelection}
                    clearBatchItems={() => setBatchItems([])}
                    restoreHistory={restoreHistory}
                    deleteHistory={deleteHistory}
                    discountThreshold={discountThreshold}
                    handleDiscountThresholdChange={handleDiscountThresholdChange}
                    activeQueuePageId={activeQueuePageId}
                    setActiveQueuePageId={setActiveQueuePageId}
                    activeSubTab={activeSubTab}
                    setActiveSubTab={setActiveSubTab}
                    priceSource={priceSource}
                    setPriceSource={setPriceSource}
                    handleErpPriceUpload={handleErpPriceUpload}
                    stickerType={stickerType}
                    drawStartNumber={drawStartNumber}
                    setDrawStartNumber={setDrawStartNumber}
                    drawTotalTickets={drawTotalTickets}
                    setDrawTotalTickets={setDrawTotalTickets}
                    drawAutoIncrement={drawAutoIncrement}
                    setDrawAutoIncrement={setDrawAutoIncrement}
                    bgImage={bgImage}
                    setBgImage={setBgImage}
                />
            </div>

            {isSaveListModalOpen && (
                <SaveListModal
                    isOpen={isSaveListModalOpen}
                    onClose={() => setIsSaveListModalOpen(false)}
                    onSave={handleSaveCurrentList}
                    defaultName={`DS ${new Date().toLocaleDateString('vi-VN')}`}
                />
            )}
        </div>
    );
}
