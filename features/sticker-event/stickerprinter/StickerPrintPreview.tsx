import React, { useEffect, useRef, useCallback } from 'react';
import BarcodeCanvas from '../../../components/views/BarcodeCanvas';
import { BatchItem } from './types';

interface StickerPrintPreviewProps {
    batchItems: BatchItem[];
    stickerType: 'gia_soc' | 'gio_vang';
    showBarcode: boolean;
    headerTextContent: string;
    subHeaderTextContent: string;
    footerTextContent: string;
    barcodeImei: string;
    bgImage: string;
    headerTextSize: number;
    previewName: string;
    
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

export const StickerPrintPreview: React.FC<StickerPrintPreviewProps> = ({
    batchItems,
    stickerType,
    showBarcode,
    headerTextContent,
    subHeaderTextContent,
    footerTextContent,
    barcodeImei,
    bgImage,
    headerTextSize,
    previewName,
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
            const ratio = Math.round((newVal / oldVal - 1) * 100);
            if (ratio < 0) {
                pctEl.innerText = `${ratio}%`;
            }
        }
    };

    return (
        <div className="bg-white p-0 shadow-xl border border-slate-200 shrink-0 w-full max-w-[275px] mx-auto overflow-hidden no-print-bg">
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
                    top: 5.5%;
                    height: 8.5%;
                    color: white;
                    font-family: 'UTM Avo', sans-serif;
                    text-transform: uppercase;
                    display: ${bgImage === '/frame/X24.png' ? 'none' : 'flex'};
                    align-items: center;
                    justify-content: center;
                }

                .sticker-container .extra1 {
                    font-size: 36.9cqw;
                    font-weight: 900 !important;
                    top: 30.9%;
                    height: 25.8%;
                    font-family: 'UTM Avo', sans-serif !important;
                }

                .sticker-container .name {
                    font-size: 3.6cqw;
                    font-weight: bold !important;
                    top: 60.8%;
                    height: 4.6%;
                    font-family: 'Alata Regular', sans-serif !important;
                }

                .sticker-container .old {
                    font-size: 14.2cqw;
                    font-weight: bold !important;
                    top: 66.6%;
                    height: 9.8%;
                    font-family: 'UTM Avo', sans-serif !important;
                }

                .sticker-container .extra2 {
                    font-size: 26.5cqw;
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
                    font-size: 3.2cqw;
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
                    top: 44.5%;
                    height: 8%;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    text-transform: uppercase;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .sticker-container[data-type="gio_vang"] .sub-header {
                    font-size: 13cqw;
                    font-weight: 400;
                    top: 52.5%;
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
                    font-size: 4cqw;
                    font-weight: bold !important;
                    top: 65.8%;
                    height: 4.5%;
                    color: black;
                    font-family: 'Alata Regular', sans-serif !important;
                }
                .sticker-container[data-type="gio_vang"] .old {
                    font-size: 11cqw;
                    font-weight: 400 !important;
                    top: 73%;
                    height: 9%;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    text-decoration: line-through;
                    text-decoration-thickness: 3px;
                }
                .sticker-container[data-type="gio_vang"] .extra2 {
                    font-size: 24cqw;
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
                            <div className="header-text" contentEditable suppressContentEditableWarning>{headerTextContent}</div>
                            {stickerType === 'gio_vang' && (
                                <div className="sub-header" contentEditable suppressContentEditableWarning>{subHeaderTextContent}</div>
                            )}
                            <div className="extra1" contentEditable suppressContentEditableWarning>{item.percent}</div>
                            <div className="old" onInput={handlePriceInput} contentEditable suppressContentEditableWarning>{item.oldPrice}</div>
                            <div className="name" contentEditable suppressContentEditableWarning>{item.name}</div>
                            {stickerType === 'gio_vang' ? (
                                <div className="extra2 flex items-baseline justify-center">
                                    <span onInput={handlePriceInput} contentEditable suppressContentEditableWarning>{item.newPrice}</span>
                                    <span className="small-zeros" contentEditable={false}>.000</span>
                                </div>
                            ) : (
                                <div className="extra2" onInput={handlePriceInput} contentEditable suppressContentEditableWarning>{item.newPrice}</div>
                            )}
                            <div className="footer-text" contentEditable suppressContentEditableWarning>{footerTextContent}</div>
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
                        <div className="header-text" ref={headerEditable.ref} onInput={headerEditable.handleInput} contentEditable suppressContentEditableWarning>{headerTextContent}</div>
                        {stickerType === 'gio_vang' && (
                            <div className="sub-header" ref={subHeaderEditable.ref} onInput={subHeaderEditable.handleInput} contentEditable suppressContentEditableWarning>{subHeaderTextContent}</div>
                        )}
                        <div className="extra1" ref={percentRef} contentEditable suppressContentEditableWarning>-36%</div>
                        <div className="old" ref={oldPriceRef} onInput={handlePriceInput} contentEditable suppressContentEditableWarning>5.490.000</div>
                        <div className="name" ref={nameEditable.ref} onInput={nameEditable.handleInput} contentEditable suppressContentEditableWarning>{previewName}</div>
                        {stickerType === 'gio_vang' ? (
                            <div className="extra2 flex items-baseline justify-center">
                                <span ref={newPriceRef} onInput={handlePriceInput} contentEditable suppressContentEditableWarning>10.990</span>
                                <span className="small-zeros" contentEditable={false}>.000</span>
                            </div>
                        ) : (
                            <div className="extra2" ref={newPriceRef} onInput={handlePriceInput} contentEditable suppressContentEditableWarning>3.490</div>
                        )}
                        <div className="footer-text" ref={footerEditable.ref} onInput={footerEditable.handleInput} contentEditable suppressContentEditableWarning>{footerTextContent}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

