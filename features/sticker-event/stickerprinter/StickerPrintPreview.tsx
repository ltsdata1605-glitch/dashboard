import React, { useRef, useCallback, useMemo } from 'react';
import { SectionCard } from '../../../components/shared/ui/SectionCard';
import { Button } from '../../../components/shared/ui/Button';
import BarcodeCanvas from '../../../components/views/BarcodeCanvas';
import { BatchItem, TicketDrawData } from './types';
import { DrawTicketBlock } from './DrawTicketBlock';
import { useContentEditable } from './useContentEditable';
import { renderAmountDiscount, renderPercentDiscount } from './discountHelpers';
import { getStickerPreviewStyles } from './stickerPreviewStyles';
import { normalizeStickerPriceUnit, formatDiscountAmount } from '../utils/format';
import { FloatingFormatToolbar } from './FloatingFormatToolbar';

interface StickerPrintPreviewProps {
    batchItems: BatchItem[];
    stickerType: 'gia_soc' | 'gio_vang' | 'draw';
    showBarcode: boolean;
    discountDisplayMode: 'percent' | 'amount';
    headerTextContent: string;
    subHeaderTextContent: string;
    footerTextContent: string;
    barcodeImei: string;
    bgImage: string;
    headerTextSize: number;
    subHeaderTextSize: number;
    percentTextSize: number;
    oldPriceTextSize: number;
    nameTextSize: number;
    newPriceTextSize: number;
    footerTextSize: number;
    previewName: string;
    previewOldPrice: string;
    previewNewPrice: string;
    activeField: string;
    setActiveField: (field: string) => void;
    
    setHeaderTextContent: (val: string) => void;
    setSubHeaderTextContent: (val: string) => void;
    setFooterTextContent: (val: string) => void;
    setBarcodeImei: (val: string) => void;
    setPreviewName: (val: string) => void;
    setPreviewOldPrice: (val: string) => void;
    setPreviewNewPrice: (val: string) => void;
    updateBatchItem?: (id: string, updates: Partial<BatchItem>) => void;
    drawTickets?: TicketDrawData[];
    setDrawTickets?: React.Dispatch<React.SetStateAction<TicketDrawData[]>>;
    drawContentTopLeftSize?: number;
    drawContentTopRightSize?: number;
    drawContentBottomLeftSize?: number;
    drawContentBottomRightSize?: number;
    drawTitleSize?: number;
    drawCodeSize?: number;
    drawFooterSize?: number;
    drawAutoIncrement?: boolean;
}

export const StickerPrintPreview: React.FC<StickerPrintPreviewProps> = ({
    batchItems,
    stickerType,
    showBarcode,
    discountDisplayMode,
    headerTextContent,
    subHeaderTextContent,
    footerTextContent,
    barcodeImei,
    bgImage,
    headerTextSize,
    subHeaderTextSize,
    percentTextSize,
    oldPriceTextSize,
    nameTextSize,
    newPriceTextSize,
    footerTextSize,
    previewName,
    previewOldPrice,
    previewNewPrice,
    activeField,
    setActiveField,
    setHeaderTextContent,
    setSubHeaderTextContent,
    setFooterTextContent,
    setBarcodeImei,
    setPreviewName,
    setPreviewOldPrice,
    setPreviewNewPrice,
    updateBatchItem,
    drawTickets = [],
    setDrawTickets,
    drawContentTopLeftSize,
    drawContentTopRightSize,
    drawContentBottomLeftSize,
    drawContentBottomRightSize,
    drawTitleSize,
    drawCodeSize,
    drawFooterSize,
    drawAutoIncrement,
}) => {
    const [activeDrawPage, setActiveDrawPage] = React.useState(0);
    const totalDrawPages = Math.ceil((drawTickets || []).length / 4);

    React.useEffect(() => {
        if (activeDrawPage >= totalDrawPages) {
            setActiveDrawPage(0);
        }
    }, [drawTickets?.length, totalDrawPages, activeDrawPage]);

    const percentRef = useRef<HTMLDivElement>(null);

    // Cache 1 callback ổn định cho mỗi vé (theo totalIndex) thay vì tạo closure mới mỗi render —
    // kết hợp với DrawTicketBlock đã bọc React.memo, gõ chữ ở 1 vé không còn re-render toàn bộ
    // các vé còn lại trong lô in.
    const drawTicketOnChangeCacheRef = useRef<Map<number, (updates: Partial<TicketDrawData>) => void>>(new Map());
    const getDrawTicketOnChange = useCallback((idx: number) => {
        const cache = drawTicketOnChangeCacheRef.current;
        let fn = cache.get(idx);
        if (!fn) {
            fn = (updates: Partial<TicketDrawData>) => {
                setDrawTickets?.(prev => prev.map((t, i) => i === idx ? { ...t, ...updates } : t));
            };
            cache.set(idx, fn);
        }
        return fn;
    }, [setDrawTickets]);

    // --- contentEditable hooks for each editable field (preview mode only) ---
    const oldPriceEditable = useContentEditable(previewOldPrice, setPreviewOldPrice);
    const newPriceEditable = useContentEditable<HTMLElement>(previewNewPrice, setPreviewNewPrice);

    const onOldPriceInput = (e: React.FormEvent<HTMLDivElement>) => {
        handlePriceInput(e);
        oldPriceEditable.handleInput(e);
    };

    const onNewPriceInput = (e: React.FormEvent<HTMLElement>) => {
        handlePriceInput(e);
        newPriceEditable.handleInput(e);
    };

    const handleNameChange = useCallback((text: string) => {
        setPreviewName(text);
    }, [setPreviewName]);

    const nameEditable = useContentEditable(previewName, handleNameChange);
    const headerEditable = useContentEditable(headerTextContent, setHeaderTextContent);
    const subHeaderEditable = useContentEditable(subHeaderTextContent, setSubHeaderTextContent);
    const footerEditable = useContentEditable(footerTextContent, setFooterTextContent);

    const handlePriceInput = (e: React.FormEvent<HTMLElement>) => {
        const el = e.currentTarget;
        const rawText = el.innerText;
        
        if (/[a-zA-Z]/.test(rawText)) return;
        
        const numericStr = rawText.replace(/\D/g, '');
        if (!numericStr) return;
        
        let val = parseInt(numericStr, 10);
        const isNewPrice = el.classList.contains('extra2');
        
        // Auto truncate to thousands for new price if the typed value is >= 100,000
        if (isNewPrice && val >= 100000) {
            val = Math.floor(val / 1000);
        }
        
        const formattedText = val.toLocaleString('vi-VN');
        
        if (rawText !== formattedText) {
            el.innerText = formattedText;
            const range = document.createRange();
            const sel = window.getSelection();
            if (sel) {
                range.selectNodeContents(el);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }

        const container = el.closest('.sticker-container');
        if (container) {
            autoCalcPercentForContainer(container);
        }
    };

    const autoCalcPercentForContainer = (container: Element) => {
        const oldEl = container.querySelector('.old') as HTMLElement;
        const newEl = container.querySelector('.extra2') as HTMLElement;
        const pctEl = container.querySelector('.extra1') as HTMLElement;
        if (!oldEl || !newEl || !pctEl) return;

        const oldVal = Number(oldEl.innerText.replace(/\D/g, ''));
        let newVal = Number(newEl.innerText.replace(/\D/g, ''));

        if (oldVal > 0 && newVal > 0) {
            newVal = normalizeStickerPriceUnit(oldVal, newVal);
            if (discountDisplayMode === 'amount') {
                const result = formatDiscountAmount(oldVal, newVal);
                if (result) {
                    const unitClass = result.unit === 'triệu' ? 'unit-trieu' : 'unit-k';
                    pctEl.innerHTML = `<span class="discount-amount font-bold"><span class="discount-label">-</span><span class="discount-num">${result.num}</span><span class="discount-unit ${unitClass}">${result.unit}</span></span>`;
                } else {
                    pctEl.innerText = '';
                }
            } else {
                const ratio = Math.round((newVal / oldVal - 1) * 100);
                if (ratio < 0) {
                    pctEl.innerText = `${ratio}%`;
                } else {
                    pctEl.innerText = '';
                }
            }
        }
    };



    return (
        <SectionCard className="p-0 shrink-0 w-full max-w-sm mx-auto overflow-hidden rounded-none lg:rounded-none no-print-bg">
            <style>
                {useMemo(() => getStickerPreviewStyles({
                    stickerType, bgImage, headerTextSize, subHeaderTextSize, percentTextSize,
                    oldPriceTextSize, nameTextSize, newPriceTextSize, footerTextSize,
                }), [stickerType, bgImage, headerTextSize, percentTextSize, nameTextSize, oldPriceTextSize, newPriceTextSize, footerTextSize, subHeaderTextSize])}
            </style>
            <div id="print-section" className="w-full">
                {stickerType === 'draw' ? (
                    (() => {
                        const pages: TicketDrawData[][] = [];
                        for (let i = 0; i < drawTickets.length; i += 4) {
                            pages.push(drawTickets.slice(i, i + 4));
                        }
                        return pages.map((pageTickets, pageIndex) => (
                            <div 
                                key={pageIndex} 
                                className={`sticker-container draw-page ${pageIndex === activeDrawPage ? 'active-preview-page' : ''}`}
                                data-type="draw" 
                                style={{ 
                                    backgroundImage: `url(${bgImage})`,
                                    pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'auto',
                                    marginBottom: pageIndex < pages.length - 1 ? '20px' : '0'
                                }}
                            >
                                {pageTickets.map((ticket, index) => {
                                    const totalIndex = pageIndex * 4 + index;
                                    return (
                                        <DrawTicketBlock 
                                            key={ticket.id || totalIndex} 
                                            index={index} 
                                            ticket={ticket} 
                                            firstTicket={drawTickets[0]}
                                            isAutoIncrement={drawAutoIncrement}
                                            drawContentTopLeftSize={drawContentTopLeftSize}
                                            drawContentTopRightSize={drawContentTopRightSize}
                                            drawContentBottomLeftSize={drawContentBottomLeftSize}
                                            drawContentBottomRightSize={drawContentBottomRightSize}
                                            drawTitleSize={drawTitleSize}
                                            drawCodeSize={drawCodeSize}
                                            drawFooterSize={drawFooterSize}
                                            activeField={activeField}
                                            setActiveField={setActiveField}
                                            totalIndex={totalIndex}
                                            onChange={getDrawTicketOnChange(totalIndex)}
                                        />
                                    );
                                })}
                            </div>
                        ));
                    })()
                ) : batchItems.length > 0 ? (
                    <>
                        {batchItems.filter(it => it.selected).slice(0, 20).map((item, index, arr) => (
                            <div key={item.id} className="sticker-container" data-type={stickerType} style={{ pageBreakAfter: index < arr.length - 1 ? 'always' : 'auto', backgroundImage: `url(${bgImage})` }}>
                                {showBarcode && item.imei && (
                                <div className="barcode">
                                    <BarcodeCanvas value={item.imei} />
                                </div>
                            )}
                            <div className={`header-text ${activeField === 'header' ? 'active-field' : ''}`} style={stickerType === 'gia_soc' ? { color: 'white', backgroundColor: 'transparent' } : { color: 'black', backgroundColor: 'transparent' }} contentEditable suppressContentEditableWarning onClick={() => setActiveField('header')} onBlur={(e) => setHeaderTextContent(e.currentTarget.innerText)}>{headerTextContent}</div>
                            {stickerType === 'gio_vang' && (
                                <div className={`sub-header ${activeField === 'subHeader' ? 'active-field' : ''}`} contentEditable suppressContentEditableWarning onClick={() => setActiveField('subHeader')} onBlur={(e) => setSubHeaderTextContent(e.currentTarget.innerText)}>{subHeaderTextContent}</div>
                            )}
                            <div key={discountDisplayMode} className={`extra1 ${activeField === 'percent' ? 'active-field' : ''}`} contentEditable suppressContentEditableWarning onClick={() => setActiveField('percent')} onBlur={(e) => updateBatchItem?.(item.id, { percent: e.currentTarget.innerText })}>
                                {discountDisplayMode === 'amount'
                                    ? renderAmountDiscount(item.oldPrice, item.newPrice) || item.percent
                                    : item.percent}
                            </div>
                            <div 
                                className={`old ${activeField === 'oldPrice' ? 'active-field' : ''}`} 
                                onInput={handlePriceInput} 
                                contentEditable 
                                suppressContentEditableWarning 
                                onClick={() => setActiveField('oldPrice')}
                                onBlur={(e) => {
                                    const val = e.currentTarget.innerText;
                                    const newPercent = renderPercentDiscount(val, item.newPrice) || '';
                                    updateBatchItem?.(item.id, { oldPrice: val, percent: newPercent });
                                }}
                            >
                                {item.oldPrice}
                            </div>
                            <div className={`name ${activeField === 'name' ? 'active-field' : ''}`} contentEditable suppressContentEditableWarning onClick={() => setActiveField('name')} onBlur={(e) => updateBatchItem?.(item.id, { name: e.currentTarget.innerText })}>{item.name}</div>
                            <div 
                                className={`extra2 ${activeField === 'newPrice' ? 'active-field' : ''}`} 
                                onInput={handlePriceInput} 
                                contentEditable 
                                suppressContentEditableWarning 
                                onClick={() => setActiveField('newPrice')}
                                onBlur={(e) => {
                                    const val = e.currentTarget.innerText;
                                    const newPercent = renderPercentDiscount(item.oldPrice, val) || '';
                                    updateBatchItem?.(item.id, { newPrice: val, percent: newPercent });
                                }}
                            >
                                {item.newPrice}
                            </div>
                            <div className={`footer-text ${activeField === 'footer' ? 'active-field' : ''}`} contentEditable suppressContentEditableWarning onClick={() => setActiveField('footer')} onBlur={(e) => setFooterTextContent(e.currentTarget.innerText)}>{footerTextContent}</div>
                        </div>
                        ))}
                        {batchItems.filter(it => it.selected).length > 20 && (
                            <div className="w-full py-4 text-center text-sm font-medium text-slate-500 bg-white/50 rounded-lg border border-slate-200 mt-4 shadow-sm">
                                <span className="text-indigo-600 font-bold">Chế độ xem trước:</span> Đang hiển thị 20 sticker đầu tiên (trong tổng số {batchItems.filter(it => it.selected).length} sticker).<br/>
                                <i>Tất cả sticker sẽ được in đầy đủ khi bấm nút IN.</i>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="sticker-container" data-type={stickerType} style={{ backgroundImage: `url(${bgImage})` }}>
                        {showBarcode && barcodeImei && (
                            <div className="barcode">
                                <BarcodeCanvas value={barcodeImei} />
                            </div>
                        )}
                        {/* Render without React children to prevent React reconciliation from resetting the caret during typing */}
                        <div className={`header-text ${activeField === 'header' ? 'active-field' : ''}`} style={stickerType === 'gia_soc' ? { color: 'white', backgroundColor: 'transparent' } : { color: 'black', backgroundColor: 'transparent' }} ref={headerEditable.ref} onInput={headerEditable.handleInput} contentEditable suppressContentEditableWarning onClick={() => setActiveField('header')} />
                        {stickerType === 'gio_vang' && (
                            <div className={`sub-header ${activeField === 'subHeader' ? 'active-field' : ''}`} ref={subHeaderEditable.ref} onInput={subHeaderEditable.handleInput} contentEditable suppressContentEditableWarning onClick={() => setActiveField('subHeader')} />
                        )}
                        <div key={discountDisplayMode} className={`extra1 ${activeField === 'percent' ? 'active-field' : ''}`} ref={percentRef} contentEditable suppressContentEditableWarning onClick={() => setActiveField('percent')}>
                            {discountDisplayMode === 'amount'
                                ? renderAmountDiscount(previewOldPrice, previewNewPrice)
                                : renderPercentDiscount(previewOldPrice, previewNewPrice)}
                        </div>
                        <div className={`old ${activeField === 'oldPrice' ? 'active-field' : ''}`} ref={oldPriceEditable.ref} onInput={onOldPriceInput} contentEditable suppressContentEditableWarning onClick={() => setActiveField('oldPrice')} />
                        <div className={`name ${activeField === 'name' ? 'active-field' : ''}`} ref={nameEditable.ref} onInput={nameEditable.handleInput} contentEditable suppressContentEditableWarning onClick={() => setActiveField('name')} />
                        <div className={`extra2 ${activeField === 'newPrice' ? 'active-field' : ''}`} ref={newPriceEditable.ref as React.RefObject<HTMLDivElement>} onInput={onNewPriceInput} contentEditable suppressContentEditableWarning onClick={() => setActiveField('newPrice')} />
                        <div className={`footer-text ${activeField === 'footer' ? 'active-field' : ''}`} ref={footerEditable.ref} onInput={footerEditable.handleInput} contentEditable suppressContentEditableWarning onClick={() => setActiveField('footer')} />
                    </div>
                )}
                <FloatingFormatToolbar />
            </div>
            {stickerType === 'draw' && totalDrawPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4 p-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/40 no-print">
                    <span className="text-[10px] lg:text-[11px] font-bold text-slate-500 mr-1.5 uppercase">
                        Trang xem trước:
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            onClick={() => setActiveDrawPage(p => Math.max(0, p - 1))}
                            disabled={activeDrawPage === 0}
                            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50"
                        >
                            &lt;
                        </Button>
                        {Array.from({ length: totalDrawPages }).map((_, idx) => {
                            if (totalDrawPages > 5) {
                                if (idx !== 0 && idx !== totalDrawPages - 1 && Math.abs(idx - activeDrawPage) > 1) {
                                    if (idx === 1 && activeDrawPage > 2) {
                                        return <span key={idx} className="text-[10px] text-slate-400">...</span>;
                                    }
                                    if (idx === totalDrawPages - 2 && activeDrawPage < totalDrawPages - 3) {
                                        return <span key={idx} className="text-[10px] text-slate-400">...</span>;
                                    }
                                    return null;
                                }
                            }
                            return (
                                <Button
                                    variant="ghost"
                                    key={idx}
                                    onClick={() => setActiveDrawPage(idx)}
                                    className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                        activeDrawPage === idx
                                            ? 'bg-rose-600 text-white shadow-sm font-black'
                                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    {idx + 1}
                                </Button>
                            );
                        })}
                        <Button
                            variant="ghost"
                            onClick={() => setActiveDrawPage(p => Math.min(totalDrawPages - 1, p + 1))}
                            disabled={activeDrawPage === totalDrawPages - 1}
                            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50"
                        >
                            &gt;
                        </Button>
                    </div>
                </div>
            )}
        </SectionCard>
    );
};

