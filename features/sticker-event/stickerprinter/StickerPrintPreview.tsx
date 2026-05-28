import React, { useEffect, useRef, useCallback } from 'react';
import BarcodeCanvas from '../../../components/views/BarcodeCanvas';
import { BatchItem } from './types';

interface StickerPrintPreviewProps {
    batchItems: BatchItem[];
    stickerType: 'gia_soc' | 'gio_vang';
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
    activeField: string;
    setActiveField: (field: any) => void;
    
    setHeaderTextContent: (val: string) => void;
    setSubHeaderTextContent: (val: string) => void;
    setFooterTextContent: (val: string) => void;
    setBarcodeImei: (val: string) => void;
    setPreviewName: (val: string) => void;
}

/**
 * Hook to manage a contentEditable div without cursor-jumping.
 * Uses a ref to track if this is the first render. On subsequent
 * external value changes, only updates the DOM when the element
 * is NOT focused (user is not typing).
 */
function useContentEditable(
    externalValue: string,
    onChange?: (text: string) => void,
) {
    const ref = useRef<HTMLDivElement>(null);
    const isInitialized = useRef(false);

    // After first render, mark as initialized and set text
    useEffect(() => {
        if (ref.current && !isInitialized.current) {
            isInitialized.current = true;
            // Set initial text from prop (in case it differs from JSX children)
            if (ref.current.innerText !== externalValue) {
                ref.current.innerText = externalValue;
            }
        }
    });

    // Sync from external state → DOM, but ONLY when element is NOT focused
    useEffect(() => {
        if (!isInitialized.current) return;
        if (ref.current && document.activeElement !== ref.current) {
            if (ref.current.innerText !== externalValue) {
                ref.current.innerText = externalValue;
            }
        }
    }, [externalValue]);

    const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
        onChange?.(e.currentTarget.innerText);
    }, [onChange]);

    return { ref, handleInput };
}

const renderAmountDiscount = (oldPriceStr: string, newPriceStr: string) => {
    const oldVal = Number(oldPriceStr.replace(/\D/g, ''));
    let newVal = Number(newPriceStr.replace(/\D/g, ''));
    
    if (oldVal <= 0 || newVal <= 0) return null;
    
    if (newVal * 1000 <= oldVal * 1.5 && newVal < oldVal) {
        newVal = newVal * 1000;
    }
    
    const diff = oldVal - newVal;
    if (diff <= 0) return null;
    
    let num = '';
    let unit = '';
    if (diff < 1000000) {
        num = (diff / 1000).toString();
        unit = 'K';
    } else {
        const trVal = diff / 1000000;
        num = Number(trVal.toFixed(2)).toString();
        unit = 'triệu';
    }
    
    return (
        <span className="discount-amount font-bold">
            <span className="discount-label">GIẢM </span>
            <span className="discount-num">{num}</span>
            <span className="discount-unit">{unit}</span>
        </span>
    );
};

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
    activeField,
    setActiveField,
    setHeaderTextContent,
    setSubHeaderTextContent,
    setFooterTextContent,
    setBarcodeImei,
    setPreviewName,
}) => {
    const oldPriceRef = useRef<HTMLDivElement>(null);
    const newPriceRef = useRef<HTMLDivElement>(null);
    const percentRef = useRef<HTMLDivElement>(null);

    // --- contentEditable hooks for each editable field (preview mode only) ---
    const handleNameChange = useCallback((text: string) => {
        setPreviewName(text);
    }, [setPreviewName]);

    const nameEditable = useContentEditable(previewName, handleNameChange);
    const headerEditable = useContentEditable(headerTextContent, setHeaderTextContent);
    const subHeaderEditable = useContentEditable(subHeaderTextContent, setSubHeaderTextContent);
    const footerEditable = useContentEditable(footerTextContent, setFooterTextContent);

    const handlePriceInput = (e: React.FormEvent<any>) => {
        const el = e.currentTarget;
        const rawText = el.innerText;
        
        if (/[a-zA-Z]/.test(rawText)) return;
        
        const numericStr = rawText.replace(/\D/g, '');
        if (!numericStr) return;
        
        const formattedText = parseInt(numericStr, 10).toLocaleString('vi-VN');
        
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
            if (newVal * 1000 <= oldVal * 1.5 && newVal < oldVal) {
                newVal = newVal * 1000;
            }
            if (discountDisplayMode === 'amount') {
                const diff = oldVal - newVal;
                if (diff > 0) {
                    let num = '';
                    let unit = '';
                    if (diff < 1000000) {
                        num = (diff / 1000).toString();
                        unit = 'K';
                    } else {
                        num = Number((diff / 1000000).toFixed(2)).toString();
                        unit = 'triệu';
                    }
                    pctEl.innerHTML = `<span class="discount-amount font-bold"><span class="discount-label">GIẢM </span><span class="discount-num">${num}</span><span class="discount-unit">${unit}</span></span>`;
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
        <div className="bg-white p-0 shadow-xl border border-slate-200 shrink-0 w-full max-w-sm mx-auto overflow-hidden no-print-bg">
            <style>
                {`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    html, body {
                        width: 210mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    #print-host {
                        display: block !important;
                        width: 210mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    #print-host .sticker-container {
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-sizing: border-box !important;
                        background-size: 100% 100% !important;
                        border-radius: 0 !important;
                        overflow: hidden !important;
                        page-break-after: always;
                        page-break-inside: avoid;
                        transform: scale(0.95) !important;
                        transform-origin: center center !important;
                    }
                    #print-host .sticker-container:last-child {
                        page-break-after: auto;
                    }
                    #print-host .sticker-container * {
                        outline: none !important;
                    }
                }

                .sticker-container {
                    width: 100%;
                    aspect-ratio: 197 / 285;
                    position: relative;
                    background-color: white;
                    background-image: url('${bgImage}');
                    background-position: center;
                    background-size: 100% 100%;
                    background-repeat: no-repeat;
                    overflow: hidden;
                    container-type: inline-size;
                    font-family: 'Arial', sans-serif;
                }

                .sticker-container > div {
                    position: absolute;
                    left: 0;
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    text-align: center;
                    background: transparent;
                    white-space: nowrap;
                    cursor: text;
                    color: #000;
                    outline: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .sticker-container .header-text {
                    font-size: ${headerTextSize}cqw;
                    font-weight: 900;
                    top: 4.3%;
                    height: 8.5%;
                    color: white;
                    font-family: 'UTM Avo', sans-serif;
                    text-transform: uppercase;
                    display: ${bgImage === '/frame/X24.png' ? 'none' : 'flex'};
                    align-items: center;
                    justify-content: center;
                }

                .sticker-container .extra1 {
                    font-size: ${percentTextSize}cqw;
                    font-weight: 900 !important;
                    top: 30.9%;
                    height: 25.8%;
                    font-family: 'UTM Avo', sans-serif !important;
                }

                .sticker-container .extra1 .discount-amount {
                    display: flex;
                    align-items: baseline;
                    justify-content: center;
                }
                
                .sticker-container .extra1 .discount-label,
                .sticker-container .extra1 .discount-unit {
                    font-size: calc(1em / 1.5);
                    font-weight: 900 !important;
                    font-family: 'UTM Avo', sans-serif !important;
                }
                
                .sticker-container .extra1 .discount-num {
                    font-size: 1em;
                    font-weight: 900 !important;
                    font-family: 'UTM Avo', sans-serif !important;
                }

                .sticker-container .name {
                    font-size: ${nameTextSize}cqw;
                    font-weight: bold !important;
                    top: 60.8%;
                    height: 4.6%;
                    font-family: 'Alata Regular', sans-serif !important;
                }

                .sticker-container .old {
                    font-size: ${oldPriceTextSize}cqw;
                    font-weight: bold !important;
                    top: 66.6%;
                    height: 9.8%;
                    font-family: 'UTM Avo', sans-serif !important;
                }

                .sticker-container .extra2 {
                    font-size: ${newPriceTextSize}cqw;
                    font-weight: 400 !important;
                    top: 76.5%;
                    height: 21%;
                    right: 24%;
                    left: auto;
                    width: 68%;
                    justify-content: flex-end;
                    letter-spacing: -0.05em;
                    font-family: 'UTM Colossalis', sans-serif !important;
                }

                .sticker-container .barcode {
                    position: absolute;
                    top: 1.5%;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 70%;
                    height: 1.4%;
                    display: flex;
                    justify-content: center;
                }
                .sticker-container .barcode img,
                .sticker-container .barcode canvas {
                    height: 100%;
                    width: 100%;
                    object-fit: fill;
                }

                .sticker-container .footer-text {
                    font-size: ${footerTextSize}cqw;
                    font-weight: 900 !important;
                    font-family: 'UTM Avo', sans-serif !important;
                    top: 95.5%;
                    height: 3%;
                    left: 0;
                    width: 100%;
                    color: black;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .sticker-container[data-type="gio_vang"] .header-text {
                    font-size: ${headerTextSize}cqw;
                    font-weight: 400;
                    top: 43.5%;
                    height: 8%;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    text-transform: uppercase;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .sticker-container[data-type="gio_vang"] .sub-header {
                    font-size: ${subHeaderTextSize}cqw;
                    font-weight: 400;
                    top: 51.5%;
                    height: 10%;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    text-transform: uppercase;
                    position: absolute;
                    left: 0;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: text;
                    outline: none;
                }
                .sticker-container[data-type="gio_vang"] .name {
                    font-size: ${nameTextSize}cqw;
                    font-weight: bold !important;
                    top: 65.8%;
                    height: 4.5%;
                    color: black;
                    font-family: 'Alata Regular', sans-serif !important;
                }
                .sticker-container[data-type="gio_vang"] .old {
                    font-size: ${oldPriceTextSize}cqw;
                    font-weight: 400 !important;
                    top: 73%;
                    height: 9%;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    text-decoration: line-through;
                    text-decoration-thickness: 3px;
                }
                .sticker-container[data-type="gio_vang"] .extra2 {
                    font-size: ${newPriceTextSize}cqw;
                    font-weight: 400 !important;
                    top: 77%;
                    height: 20%;
                    right: 0;
                    left: 0;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: baseline;
                    letter-spacing: -0.06em;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                }
                .sticker-container[data-type="gio_vang"] .extra2 span {
                    font-family: 'UTM Colossalis', sans-serif !important;
                    font-weight: 400 !important;
                }
                .sticker-container[data-type="gio_vang"] .extra2 .small-zeros {
                    font-size: 40%;
                    letter-spacing: normal;
                    font-weight: 400 !important;
                }
                .sticker-container[data-type="gio_vang"] .extra1,
                .sticker-container[data-type="gio_vang"] .footer-text {
                    display: none !important;
                }
                .sticker-container .active-field {
                    outline: 1.5px dashed #6366f1;
                    outline-offset: 1px;
                }
                `}
            </style>
            <div id="print-section" className="w-full">
                {batchItems.length > 0 ? (
                    batchItems.filter(it => it.selected).map((item, index, arr) => (
                        <div key={item.id} className="sticker-container" data-type={stickerType} style={{ pageBreakAfter: index < arr.length - 1 ? 'always' : 'auto', backgroundImage: `url(${bgImage})` }}>
                            {showBarcode && item.imei && (
                                <div className="barcode">
                                    <BarcodeCanvas value={item.imei} />
                                </div>
                            )}
                            <div className={`header-text ${activeField === 'header' ? 'active-field' : ''}`} contentEditable suppressContentEditableWarning onClick={() => setActiveField('header')}>{headerTextContent}</div>
                            {stickerType === 'gio_vang' && (
                                <div className={`sub-header ${activeField === 'subHeader' ? 'active-field' : ''}`} contentEditable suppressContentEditableWarning onClick={() => setActiveField('subHeader')}>{subHeaderTextContent}</div>
                            )}
                            <div key={discountDisplayMode} className={`extra1 ${activeField === 'percent' ? 'active-field' : ''}`} contentEditable suppressContentEditableWarning onClick={() => setActiveField('percent')}>
                                {discountDisplayMode === 'amount'
                                    ? renderAmountDiscount(item.oldPrice, item.newPrice) || item.percent
                                    : item.percent}
                            </div>
                            <div className={`old ${activeField === 'oldPrice' ? 'active-field' : ''}`} onInput={handlePriceInput} contentEditable suppressContentEditableWarning onClick={() => setActiveField('oldPrice')}>{item.oldPrice}</div>
                            <div className={`name ${activeField === 'name' ? 'active-field' : ''}`} contentEditable suppressContentEditableWarning onClick={() => setActiveField('name')}>{item.name}</div>
                            {stickerType === 'gio_vang' ? (
                                <div className={`extra2 flex items-baseline justify-center ${activeField === 'newPrice' ? 'active-field' : ''}`} onClick={() => setActiveField('newPrice')}>
                                    <span onInput={handlePriceInput} contentEditable suppressContentEditableWarning>{item.newPrice}</span>
                                    <span className="small-zeros" contentEditable={false}>.000</span>
                                </div>
                            ) : (
                                <div className={`extra2 ${activeField === 'newPrice' ? 'active-field' : ''}`} onInput={handlePriceInput} contentEditable suppressContentEditableWarning onClick={() => setActiveField('newPrice')}>{item.newPrice}</div>
                            )}
                            <div className={`footer-text ${activeField === 'footer' ? 'active-field' : ''}`} contentEditable suppressContentEditableWarning onClick={() => setActiveField('footer')}>{footerTextContent}</div>
                        </div>
                    ))
                ) : (
                    <div className="sticker-container" data-type={stickerType} style={{ backgroundImage: `url(${bgImage})` }}>
                        {showBarcode && barcodeImei && (
                            <div className="barcode">
                                <BarcodeCanvas value={barcodeImei} />
                            </div>
                        )}
                        {/* Render initial text as children for immediate display; useContentEditable manages sync after mount */}
                        <div className={`header-text ${activeField === 'header' ? 'active-field' : ''}`} ref={headerEditable.ref} onInput={headerEditable.handleInput} contentEditable suppressContentEditableWarning onClick={() => setActiveField('header')}>{headerTextContent}</div>
                        {stickerType === 'gio_vang' && (
                            <div className={`sub-header ${activeField === 'subHeader' ? 'active-field' : ''}`} ref={subHeaderEditable.ref} onInput={subHeaderEditable.handleInput} contentEditable suppressContentEditableWarning onClick={() => setActiveField('subHeader')}>{subHeaderTextContent}</div>
                        )}
                        <div key={discountDisplayMode} className={`extra1 ${activeField === 'percent' ? 'active-field' : ''}`} ref={percentRef} contentEditable suppressContentEditableWarning onClick={() => setActiveField('percent')}>
                            {discountDisplayMode === 'amount'
                                ? renderAmountDiscount('5.490.000', '3.490')
                                : '-36%'}
                        </div>
                        <div className={`old ${activeField === 'oldPrice' ? 'active-field' : ''}`} ref={oldPriceRef} onInput={handlePriceInput} contentEditable suppressContentEditableWarning onClick={() => setActiveField('oldPrice')}>5.490.000</div>
                        <div className={`name ${activeField === 'name' ? 'active-field' : ''}`} ref={nameEditable.ref} onInput={nameEditable.handleInput} contentEditable suppressContentEditableWarning onClick={() => setActiveField('name')}>{previewName}</div>
                        {stickerType === 'gio_vang' ? (
                            <div className={`extra2 flex items-baseline justify-center ${activeField === 'newPrice' ? 'active-field' : ''}`} onClick={() => setActiveField('newPrice')}>
                                <span ref={newPriceRef} onInput={handlePriceInput} contentEditable suppressContentEditableWarning>10.990</span>
                                <span className="small-zeros" contentEditable={false}>.000</span>
                            </div>
                        ) : (
                            <div className={`extra2 ${activeField === 'newPrice' ? 'active-field' : ''}`} ref={newPriceRef} onInput={handlePriceInput} contentEditable suppressContentEditableWarning onClick={() => setActiveField('newPrice')}>3.490</div>
                        )}
                        <div className={`footer-text ${activeField === 'footer' ? 'active-field' : ''}`} ref={footerEditable.ref} onInput={footerEditable.handleInput} contentEditable suppressContentEditableWarning onClick={() => setActiveField('footer')}>{footerTextContent}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

