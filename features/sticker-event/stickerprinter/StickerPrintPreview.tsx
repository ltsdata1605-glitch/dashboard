import React, { useEffect, useRef, useCallback } from 'react';
import BarcodeCanvas from '../../../components/views/BarcodeCanvas';
import { BatchItem, TicketDrawData } from './types';
import { Bold, Italic, Underline } from 'lucide-react';

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
    setActiveField: (field: any) => void;
    
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
}

interface DrawTicketBlockProps {
    ticket: TicketDrawData;
    firstTicket?: TicketDrawData;
    onChange: (updates: Partial<TicketDrawData>) => void;
    index: number;
    drawContentTopLeftSize?: number;
    drawContentTopRightSize?: number;
    drawContentBottomLeftSize?: number;
    drawContentBottomRightSize?: number;
    drawTitleSize?: number;
    drawCodeSize?: number;
    drawFooterSize?: number;
    activeField?: string;
    setActiveField?: (field: any) => void;
}

const DrawTicketBlock: React.FC<DrawTicketBlockProps> = ({ 
    ticket, 
    firstTicket, 
    onChange, 
    index, 
    drawContentTopLeftSize,
    drawContentTopRightSize,
    drawContentBottomLeftSize,
    drawContentBottomRightSize,
    drawTitleSize,
    drawCodeSize,
    drawFooterSize,
    activeField,
    setActiveField
}) => {
    const handleTitleChange = useCallback((text: string) => {
        onChange({ title: text });
    }, [onChange]);

    const handleCodeChange = useCallback((text: string) => {
        onChange({ code: text });
    }, [onChange]);

    const handleFooterChange = useCallback((text: string) => {
        onChange({ footer: text });
    }, [onChange]);

    const handleContentTopChange = useCallback((text: string) => {
        onChange({ contentTop: text });
    }, [onChange]);

    const handleContentBottomChange = useCallback((text: string) => {
        onChange({ contentBottom: text });
    }, [onChange]);

    const handleContentTopRightChange = useCallback((text: string) => {
        onChange({ contentTopRight: text });
    }, [onChange]);

    const handleContentBottomRightChange = useCallback((text: string) => {
        onChange({ contentBottomRight: text });
    }, [onChange]);

    const titleEditable = useContentEditable(ticket.title, handleTitleChange, true);
    const codeEditable = useContentEditable(ticket.code, handleCodeChange, true);
    const footerEditable = useContentEditable(ticket.footer, handleFooterChange, true);
    const contentTopEditable = useContentEditable(ticket.contentTop || '', handleContentTopChange, true);
    const contentTopRightEditable = useContentEditable(ticket.contentTopRight || '', handleContentTopRightChange, true);
    const contentBottomEditable = useContentEditable(ticket.contentBottom || '', handleContentBottomChange, true);
    const contentBottomRightEditable = useContentEditable(ticket.contentBottomRight || '', handleContentBottomRightChange, true);

    const isFirst = index === 0;
    const activeFirstTicket = firstTicket || ticket;

    return (
        <div className="draw-ticket-block" data-index={index}>
            {/* Title Left */}
            {isFirst ? (
                <div 
                    ref={titleEditable.ref}
                    onInput={titleEditable.handleInput}
                    onClick={() => setActiveField?.('drawTitle')}
                    contentEditable 
                    suppressContentEditableWarning
                    className={`input-title-left animate-pulse-once ${activeField === 'drawTitle' ? 'active-field' : ''}`}
                    style={{ fontSize: `${drawTitleSize || 3.6}cqw` }}
                    data-placeholder="Nhập tiêu đề..."
                />
            ) : (
                <div 
                    className="display-title-left"
                    style={{ fontSize: `${drawTitleSize || 3.6}cqw` }}
                    dangerouslySetInnerHTML={{ __html: activeFirstTicket.title }}
                />
            )}
            {/* Title Right (Syncs automatically) */}
            <div 
                className="display-title-right" 
                style={{ fontSize: `${drawTitleSize || 3.6}cqw` }}
                dangerouslySetInnerHTML={{ __html: activeFirstTicket.title }} 
            />

            {/* Content Top Left */}
            {isFirst ? (
                <div 
                    ref={contentTopEditable.ref}
                    onInput={contentTopEditable.handleInput}
                    onClick={() => setActiveField?.('drawContentTopLeft')}
                    contentEditable 
                    suppressContentEditableWarning
                    className={`input-content-top-left ${activeField === 'drawContentTopLeft' ? 'active-field' : ''}`}
                    style={{ fontSize: `${drawContentTopLeftSize || 3.5}cqw` }}
                    data-placeholder="Nhập thông tin 1 (Họ tên, SĐT...)"
                />
            ) : (
                <div 
                    className="display-content-top-left"
                    style={{ fontSize: `${drawContentTopLeftSize || 3.5}cqw` }}
                    dangerouslySetInnerHTML={{ __html: activeFirstTicket.contentTop || '' }}
                />
            )}
            {/* Content Top Right */}
            {isFirst ? (
                <div 
                    ref={contentTopRightEditable.ref}
                    onInput={contentTopRightEditable.handleInput}
                    onClick={() => setActiveField?.('drawContentTopRight')}
                    contentEditable 
                    suppressContentEditableWarning
                    className={`input-content-top-right ${activeField === 'drawContentTopRight' ? 'active-field' : ''}`}
                    style={{ fontSize: `${drawContentTopRightSize || 3.5}cqw` }}
                    data-placeholder="Nhập thông tin 3 (Tự gõ...)"
                />
            ) : (
                <div 
                    className="display-content-top-right"
                    style={{ fontSize: `${drawContentTopRightSize || 3.5}cqw` }}
                    dangerouslySetInnerHTML={{ __html: activeFirstTicket.contentTopRight || '' }}
                />
            )}

            {/* Code Left */}
            <div 
                ref={codeEditable.ref}
                onInput={codeEditable.handleInput}
                onClick={() => setActiveField?.('drawCode')}
                contentEditable 
                suppressContentEditableWarning
                className={`input-code-left ${activeField === 'drawCode' ? 'active-field' : ''}`}
                style={{ fontSize: `${drawCodeSize || 3.8}cqw` }}
                data-placeholder="Số"
            />
            {/* Code Right (Syncs automatically) */}
            <div 
                className="display-code-right"
                style={{ fontSize: `${drawCodeSize || 3.8}cqw` }}
            >
                {ticket.code}
            </div>

            {/* Content Bottom Left */}
            {isFirst ? (
                <div 
                    ref={contentBottomEditable.ref}
                    onInput={contentBottomEditable.handleInput}
                    onClick={() => setActiveField?.('drawContentBottomLeft')}
                    contentEditable 
                    suppressContentEditableWarning
                    className={`input-content-bottom-left ${activeField === 'drawContentBottomLeft' ? 'active-field' : ''}`}
                    style={{ fontSize: `${drawContentBottomLeftSize || 2.2}cqw` }}
                    data-placeholder="Nhập thông tin 2 (Địa chỉ...)"
                />
            ) : (
                <div 
                    className="display-content-bottom-left"
                    style={{ fontSize: `${drawContentBottomLeftSize || 2.2}cqw` }}
                    dangerouslySetInnerHTML={{ __html: activeFirstTicket.contentBottom || '' }}
                />
            )}
            {/* Content Bottom Right */}
            {isFirst ? (
                <div 
                    ref={contentBottomRightEditable.ref}
                    onInput={contentBottomRightEditable.handleInput}
                    onClick={() => setActiveField?.('drawContentBottomRight')}
                    contentEditable 
                    suppressContentEditableWarning
                    className={`input-content-bottom-right ${activeField === 'drawContentBottomRight' ? 'active-field' : ''}`}
                    style={{ fontSize: `${drawContentBottomRightSize || 2.2}cqw` }}
                    data-placeholder="Nhập thông tin 4 (Tự gõ...)"
                />
            ) : (
                <div 
                    className="display-content-bottom-right"
                    style={{ fontSize: `${drawContentBottomRightSize || 2.2}cqw` }}
                    dangerouslySetInnerHTML={{ __html: activeFirstTicket.contentBottomRight || '' }}
                />
            )}

            {/* Footer Left */}
            {isFirst ? (
                <div 
                    ref={footerEditable.ref}
                    onInput={footerEditable.handleInput}
                    onClick={() => setActiveField?.('drawFooter')}
                    contentEditable 
                    suppressContentEditableWarning
                    className={`input-footer-left ${activeField === 'drawFooter' ? 'active-field' : ''}`}
                    style={{ fontSize: `${drawFooterSize || 3.8}cqw` }}
                    data-placeholder="Nhập tên siêu thị..."
                />
            ) : (
                <div 
                    className="display-footer-left"
                    style={{ fontSize: `${drawFooterSize || 3.8}cqw` }}
                    dangerouslySetInnerHTML={{ __html: activeFirstTicket.footer }}
                />
            )}
        </div>
    );
};

/**
 * Hook to manage a contentEditable div without cursor-jumping.
 * Synchronizes external state with DOM while handling element mounting / changing.
 */
function useContentEditable<T extends HTMLElement = HTMLDivElement>(
    externalValue: string,
    onChange?: (text: string) => void,
    useHTML: boolean = false,
) {
    const ref = useRef<T>(null);
    const lastElementRef = useRef<T | null>(null);

    // Sync from external state -> DOM on mount or when DOM element changes
    useEffect(() => {
        if (ref.current && ref.current !== lastElementRef.current) {
            lastElementRef.current = ref.current;
            const currentVal = useHTML ? ref.current.innerHTML : ref.current.innerText;
            if (currentVal !== externalValue) {
                if (useHTML) {
                    ref.current.innerHTML = externalValue;
                } else {
                    ref.current.innerText = externalValue;
                }
            }
        }
    });

    // Sync from external state → DOM, but ONLY when element is NOT focused
    useEffect(() => {
        if (ref.current && document.activeElement !== ref.current) {
            const currentVal = useHTML ? ref.current.innerHTML : ref.current.innerText;
            if (currentVal !== externalValue) {
                if (useHTML) {
                    ref.current.innerHTML = externalValue;
                } else {
                    ref.current.innerText = externalValue;
                }
            }
        }
    }, [externalValue, useHTML]);

    const handleInput = useCallback((e: React.FormEvent<T>) => {
        onChange?.(useHTML ? e.currentTarget.innerHTML : e.currentTarget.innerText);
    }, [onChange, useHTML]);

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
        num = Number(trVal.toFixed(1)).toString();
        unit = 'triệu';
    }
    
    return (
        <span className="discount-amount font-bold">
            <span className="discount-label">-</span>
            <span className="discount-num">{num}</span>
            <span className={`discount-unit ${unit === 'triệu' ? 'unit-trieu' : 'unit-k'}`}>{unit}</span>
        </span>
    );
};

const renderPercentDiscount = (oldPriceStr: string, newPriceStr: string) => {
    const oldVal = Number(oldPriceStr.replace(/\D/g, ''));
    let newVal = Number(newPriceStr.replace(/\D/g, ''));
    
    if (oldVal <= 0 || newVal <= 0) return null;
    
    if (newVal * 1000 <= oldVal * 1.5 && newVal < oldVal) {
        newVal = newVal * 1000;
    }
    
    const ratio = Math.round((newVal / oldVal - 1) * 100);
    if (ratio < 0) {
        return `${ratio}%`;
    }
    return '';
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
}) => {
    const percentRef = useRef<HTMLDivElement>(null);

    // Selection listener for floating text formatting toolbar
    const [toolbarPos, setToolbarPos] = React.useState<{ top: number; left: number } | null>(null);

    React.useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                setToolbarPos(null);
                return;
            }

            const range = selection.getRangeAt(0);
            
            // Check if selection is inside an editable element of this preview container
            let parent = range.commonAncestorContainer;
            if (parent.nodeType === 3) parent = parent.parentNode || parent;
            let current: Node | null = parent;
            let isInsideEditable = false;
            while (current) {
                if (current.nodeType === 1 && (current as HTMLElement).getAttribute('contenteditable') === 'true') {
                    isInsideEditable = true;
                    break;
                }
                current = current.parentNode;
            }

            if (!isInsideEditable) {
                setToolbarPos(null);
                return;
            }

            const rects = range.getClientRects();
            if (rects.length > 0) {
                const rect = rects[0];
                setToolbarPos({
                    top: rect.top + window.scrollY - 50,
                    left: rect.left + window.scrollX + rect.width / 2,
                });
            } else {
                setToolbarPos(null);
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    const applyStyleToSelection = (styleName: string, styleValue: string) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

        const range = selection.getRangeAt(0);
        let parent = range.commonAncestorContainer;
        if (parent.nodeType === 3) parent = parent.parentNode || parent;
        let current: Node | null = parent;
        let editableContainer: HTMLElement | null = null;
        while (current) {
            if (current.nodeType === 1 && (current as HTMLElement).getAttribute('contenteditable') === 'true') {
                editableContainer = current as HTMLElement;
                break;
            }
            current = current.parentNode;
        }

        if (!editableContainer) return;

        const span = document.createElement('span');
        span.style[styleName as any] = styleValue;
        
        try {
            span.appendChild(range.extractContents());
            range.insertNode(span);
            
            // Trigger React input change
            const event = new Event('input', { bubbles: true });
            editableContainer.dispatchEvent(event);
        } catch (e) {
            console.error('Error applying custom style to selection:', e);
        }
    };

    const handleFormat = (command: string) => {
        document.execCommand(command, false);
        
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        let parent = range.commonAncestorContainer;
        if (parent.nodeType === 3) parent = parent.parentNode || parent;
        let current: Node | null = parent;
        while (current) {
            if (current.nodeType === 1 && (current as HTMLElement).getAttribute('contenteditable') === 'true') {
                const event = new Event('input', { bubbles: true });
                (current as HTMLElement).dispatchEvent(event);
                break;
            }
            current = current.parentNode;
        }
    };

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

    const handlePriceInput = (e: React.FormEvent<any>) => {
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
                        num = Number((diff / 1000000).toFixed(1)).toString();
                        unit = 'triệu';
                    }
                    const unitClass = unit === 'triệu' ? 'unit-trieu' : 'unit-k';
                    pctEl.innerHTML = `<span class="discount-amount font-bold"><span class="discount-label">-</span><span class="discount-num">${num}</span><span class="discount-unit ${unitClass}">${unit}</span></span>`;
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
                .sticker-container {
                    width: 100%;
                    aspect-ratio: ${stickerType === 'draw' ? '2482 / 3512' : '197 / 285'};
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
                    font-weight: 900 !important;
                    font-family: 'UTM Avo', sans-serif !important;
                }
                
                .sticker-container .extra1 .discount-label {
                    font-size: calc(1em / 1.5);
                    position: relative;
                    top: -0.18em;
                }
                
                .sticker-container .extra1 .discount-unit.unit-k {
                    font-size: calc(1em / 1.5);
                }
                
                .sticker-container .extra1 .discount-unit.unit-trieu {
                    font-size: calc(1em / 3);
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
                    align-items: flex-end;
                    letter-spacing: -0.06em;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    line-height: 1 !important;
                }
                .sticker-container[data-type="gio_vang"] .extra2 span {
                    font-family: 'UTM Colossalis', sans-serif !important;
                    font-weight: 400 !important;
                }
                .sticker-container[data-type="gio_vang"] .extra2::after {
                    content: ".000";
                    font-size: 40%;
                    letter-spacing: normal;
                    font-weight: 400 !important;
                    align-self: flex-end;
                    margin-bottom: 0.08em;
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

                 /* Draw Ticket Styles */
                 .draw-ticket-block {
                     position: absolute;
                     width: 100%;
                     height: 25%;
                     left: 0;
                 }
                 .draw-ticket-block[data-index="0"] { top: 0%; }
                 .draw-ticket-block[data-index="1"] { top: 25%; }
                 .draw-ticket-block[data-index="2"] { top: 50%; }
                 .draw-ticket-block[data-index="3"] { top: 75%; }

                 .draw-ticket-block .input-title-left {
                      position: absolute;
                      left: 2.2%;
                      top: 2.0%;
                      width: 45.4%;
                      height: 16%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.6cqw;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      text-align: center;
                      white-space: normal;
                      line-height: 1.2;
                  }
 
                  .draw-ticket-block .display-title-right {
                      position: absolute;
                      left: 52.4%;
                      top: 2.0%;
                      width: 45.4%;
                      height: 16%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.6cqw;
                      color: #000;
                      text-align: center;
                      pointer-events: none;
                      user-select: none;
                      white-space: normal;
                      line-height: 1.2;
                  }
 
                  .draw-ticket-block .input-content-top-left {
                      position: absolute;
                      left: 2.2%;
                      top: 21.0%;
                      width: 35.0%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: flex-start;
                      align-items: flex-start;
                      text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                  }
 
                  .draw-ticket-block .input-content-top-right {
                      position: absolute;
                      left: 52.4%;
                      top: 21.0%;
                      width: 35.0%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: flex-start;
                      align-items: flex-start;
                      text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                  }
 
                  .draw-ticket-block .input-content-bottom-left {
                      position: absolute;
                      left: 2.2%;
                      top: 53.0%;
                      width: 45.4%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: flex-start;
                      align-items: flex-start;
                      text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                  }
 
                  .draw-ticket-block .input-content-bottom-right {
                      position: absolute;
                      left: 52.4%;
                      top: 53.0%;
                      width: 45.4%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: flex-start;
                      align-items: flex-start;
                      text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                  }
 
                  .draw-ticket-block .input-code-left {
                      position: absolute;
                      left: 39.4%;
                      top: 33.0%;
                      width: 6.2%;
                      height: 11%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.8cqw;
                      color: #ef4444;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      text-align: center;
                  }
 
                  .draw-ticket-block .display-code-right {
                      position: absolute;
                      left: 89.6%;
                      top: 33.0%;
                      width: 6.2%;
                      height: 11%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.8cqw;
                      color: #ef4444;
                      text-align: center;
                      pointer-events: none;
                      user-select: none;
                  }
 
                  .draw-ticket-block .input-footer-left {
                      position: absolute;
                      left: 19.3%;
                      top: 85.8%;
                      width: 28%;
                      height: 10%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.8cqw;
                      color: #ffffff;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      text-align: center;
                  }

                  .draw-ticket-block .display-title-left {
                      position: absolute;
                      left: 2.2%;
                      top: 2.0%;
                      width: 45.4%;
                      height: 16%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.6cqw;
                      color: #000;
                      text-align: center;
                      white-space: normal;
                      line-height: 1.2;
                  }

                  .draw-ticket-block .display-content-top-left {
                      position: absolute;
                      left: 2.2%;
                      top: 21.0%;
                      width: 35.0%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: flex-start;
                      align-items: flex-start;
                      text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      color: #000;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                  }

                  .draw-ticket-block .display-content-top-right {
                      position: absolute;
                      left: 52.4%;
                      top: 21.0%;
                      width: 35.0%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: flex-start;
                      align-items: flex-start;
                      text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      color: #000;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                  }

                  .draw-ticket-block .display-content-bottom-left {
                      position: absolute;
                      left: 2.2%;
                      top: 53.0%;
                      width: 45.4%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: flex-start;
                      align-items: flex-start;
                      text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                  }

                  .draw-ticket-block .display-content-bottom-right {
                      position: absolute;
                      left: 52.4%;
                      top: 53.0%;
                      width: 45.4%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: flex-start;
                      align-items: flex-start;
                      text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                  }

                  .draw-ticket-block .display-footer-left {
                      position: absolute;
                      left: 19.3%;
                      top: 85.8%;
                      width: 28%;
                      height: 10%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.8cqw;
                      color: #ffffff;
                      text-align: center;
                  }

                  .draw-ticket-block [class^="display-"],
                  .draw-ticket-block [class*=" display-"] {
                      pointer-events: none;
                      user-select: none;
                  }

                 .draw-ticket-block [contenteditable="true"]:hover,
                 .draw-ticket-block [contenteditable="true"]:focus {
                     outline: 1.5px dashed #ef4444 !important;
                     outline-offset: 1px;
                 }

                 .draw-ticket-block [contenteditable="true"]:empty::before {
                     content: attr(data-placeholder);
                     color: #94a3b8;
                     font-style: italic;
                     font-weight: normal;
                 }

                 @media print {
                     .draw-ticket-block [contenteditable="true"] {
                         outline: none !important;
                     }
                     .draw-ticket-block [contenteditable="true"]:empty::before {
                         content: "" !important;
                     }
                 }
                 `}
            </style>
            <div id="print-section" className="w-full">
                {stickerType === 'draw' ? (
                    <div className="sticker-container" data-type="draw" style={{ backgroundImage: `url(${bgImage})` }}>
                        {drawTickets.map((ticket, index) => (
                            <DrawTicketBlock 
                                key={ticket.id || index} 
                                index={index} 
                                ticket={ticket} 
                                firstTicket={drawTickets[0]}
                                drawContentTopLeftSize={drawContentTopLeftSize}
                                drawContentTopRightSize={drawContentTopRightSize}
                                drawContentBottomLeftSize={drawContentBottomLeftSize}
                                drawContentBottomRightSize={drawContentBottomRightSize}
                                drawTitleSize={drawTitleSize}
                                drawCodeSize={drawCodeSize}
                                drawFooterSize={drawFooterSize}
                                activeField={activeField}
                                setActiveField={setActiveField}
                                onChange={(updates) => {
                                    if (setDrawTickets) {
                                        setDrawTickets(prev => prev.map((t, idx) => idx === index ? { ...t, ...updates } : t));
                                    }
                                }} 
                            />
                        ))}
                    </div>
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
            {toolbarPos && (
                <div 
                    className="fixed z-[9999] -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/60 p-1.5 rounded-lg shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 print:hidden"
                    style={{ 
                        top: `${toolbarPos.top}px`, 
                        left: `${toolbarPos.left}px` 
                    }}
                    onMouseDown={(e) => {
                        // Prevent toolbar from taking focus away from selection
                        e.preventDefault();
                    }}
                >
                    {/* Font Dropdown */}
                    <select 
                        className="bg-transparent text-white text-[11px] font-semibold px-2 py-0.5 border-r border-slate-700/80 outline-none cursor-pointer text-slate-100 hover:bg-slate-800 rounded transition-colors"
                        onChange={(e) => {
                            applyStyleToSelection('fontFamily', e.target.value);
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled className="bg-slate-900 text-white">Font</option>
                        <option value="'UTM Avo', sans-serif" className="bg-slate-900 text-white">UTM Avo</option>
                        <option value="'UTM Colossalis', sans-serif" className="bg-slate-900 text-white">Colossalis</option>
                        <option value="'Alata Regular', sans-serif" className="bg-slate-900 text-white">Alata</option>
                        <option value="'Inter', sans-serif" className="bg-slate-900 text-white">Inter</option>
                    </select>

                    {/* Size Dropdown */}
                    <select 
                        className="bg-transparent text-white text-[11px] font-semibold px-1 py-0.5 border-r border-slate-700/80 outline-none cursor-pointer text-slate-100 hover:bg-slate-800 rounded transition-colors w-16"
                        onChange={(e) => {
                            applyStyleToSelection('fontSize', `${e.target.value}cqw`);
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled className="bg-slate-900 text-white">Size</option>
                        <option value="1.0" className="bg-slate-900 text-white">1.0 cqw</option>
                        <option value="1.5" className="bg-slate-900 text-white">1.5 cqw</option>
                        <option value="2.0" className="bg-slate-900 text-white">2.0 cqw</option>
                        <option value="2.5" className="bg-slate-900 text-white">2.5 cqw</option>
                        <option value="3.0" className="bg-slate-900 text-white">3.0 cqw</option>
                        <option value="3.5" className="bg-slate-900 text-white">3.5 cqw</option>
                        <option value="4.0" className="bg-slate-900 text-white">4.0 cqw</option>
                        <option value="4.5" className="bg-slate-900 text-white">4.5 cqw</option>
                        <option value="5.0" className="bg-slate-900 text-white">5.0 cqw</option>
                        <option value="6.0" className="bg-slate-900 text-white">6.0 cqw</option>
                        <option value="7.0" className="bg-slate-900 text-white">7.0 cqw</option>
                        <option value="8.0" className="bg-slate-900 text-white">8.0 cqw</option>
                        <option value="9.0" className="bg-slate-900 text-white">9.0 cqw</option>
                        <option value="10.0" className="bg-slate-900 text-white">10.0 cqw</option>
                    </select>

                    {/* Bold button */}
                    <button
                        onClick={() => handleFormat('bold')}
                        className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        title="In đậm (Bold)"
                    >
                        <Bold size={13} className="stroke-[2.5]" />
                    </button>

                    {/* Italic button */}
                    <button
                        onClick={() => handleFormat('italic')}
                        className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        title="In nghiêng (Italic)"
                    >
                        <Italic size={13} className="stroke-[2.5]" />
                    </button>

                    {/* Underline button */}
                    <button
                        onClick={() => handleFormat('underline')}
                        className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        title="Gạch chân (Underline)"
                    >
                        <Underline size={13} className="stroke-[2.5]" />
                    </button>

                    {/* Tooltip arrow */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-slate-900/95" />
                </div>
            )}
            </div>
        </div>
    );
};

