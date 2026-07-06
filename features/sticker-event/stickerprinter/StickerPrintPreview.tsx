import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import BarcodeCanvas from '../../../components/views/BarcodeCanvas';
import { BatchItem, TicketDrawData } from './types';
import { Bold, Italic, Underline } from 'lucide-react';
import { Button } from '../../../components/shared/ui/Button';

// Nội dung sticker do nhân viên tự nhập (rich-text qua execCommand bold/italic/underline +
// span style font-size/font-family), lưu chung trên Firestore cho cả nhân viên trong cùng
// cửa hàng — sanitize trước khi render qua dangerouslySetInnerHTML để chặn stored XSS.
const sanitizeTicketHtml = (html?: string): string =>
    DOMPurify.sanitize(html || '', {
        ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'span', 'br'],
        ALLOWED_ATTR: ['style'],
    });

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
    drawAutoIncrement?: boolean;
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
    isAutoIncrement?: boolean;
    totalIndex?: number;
}

const DrawTicketBlock: React.FC<DrawTicketBlockProps> = React.memo(({
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
    setActiveField,
    isAutoIncrement,
    totalIndex
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

    const isFirst = totalIndex !== undefined ? totalIndex === 0 : index === 0;
    const activeFirstTicket = firstTicket || ticket;

    return (
        <div className="draw-ticket-block" data-index={index}>
            {/* Title Single */}
            {isFirst ? (
                <div 
                    ref={titleEditable.ref}
                    onInput={titleEditable.handleInput}
                    onClick={() => setActiveField?.('drawTitle')}
                    contentEditable 
                    suppressContentEditableWarning
                    className={`input-title-single animate-pulse-once ${activeField === 'drawTitle' ? 'active-field' : ''}`}
                    style={{ fontSize: `${Math.min(drawTitleSize || 2.5, 3.0)}cqw` }}
                    data-placeholder="Nhập tiêu đề..."
                />
            ) : (
                <div 
                    className="display-title-single"
                    style={{ fontSize: `${Math.min(drawTitleSize || 2.5, 3.0)}cqw` }}
                    dangerouslySetInnerHTML={{ __html: sanitizeTicketHtml(activeFirstTicket.title) }}
                />
            )}

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
                    dangerouslySetInnerHTML={{ __html: sanitizeTicketHtml(activeFirstTicket.contentTop) }}
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
                    dangerouslySetInnerHTML={{ __html: sanitizeTicketHtml(activeFirstTicket.contentTopRight) }}
                />
            )}

            {/* Code Left */}
            {isAutoIncrement ? (
                <div 
                    className="display-code-left"
                    style={{ fontSize: `${drawCodeSize || 3.8}cqw` }}
                >
                    {ticket.code}
                </div>
            ) : (
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
            )}
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
                    dangerouslySetInnerHTML={{ __html: sanitizeTicketHtml(activeFirstTicket.contentBottom) }}
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
                    dangerouslySetInnerHTML={{ __html: sanitizeTicketHtml(activeFirstTicket.contentBottomRight) }}
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
                    dangerouslySetInnerHTML={{ __html: sanitizeTicketHtml(activeFirstTicket.footer) }}
                />
            )}
        </div>
    );
});

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

    // Selection listener for floating text formatting toolbar
    const [toolbarPos, setToolbarPos] = React.useState<{ top: number; left: number } | null>(null);
    const [activeMenu, setActiveMenu] = React.useState<'font' | 'size' | null>(null);
    const savedRangeRef = useRef<Range | null>(null);

    React.useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                setToolbarPos(null);
                setActiveMenu(null);
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
                setActiveMenu(null);
                return;
            }

            // Cache the selection range
            savedRangeRef.current = range.cloneRange();

            const rects = range.getClientRects();
            if (rects.length > 0) {
                const rect = rects[0];
                setToolbarPos({
                    top: rect.top + window.scrollY - 50,
                    left: rect.left + window.scrollX + rect.width / 2,
                });
            } else {
                setToolbarPos(null);
                setActiveMenu(null);
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    const applyStyleToSelection = (styleName: string, styleValue: string) => {
        let range = savedRangeRef.current;
        const selection = window.getSelection();
        
        if (!range && selection && selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        }

        if (!range) return;

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

        // Force focus back to the editable container to avoid losing it during active menu changes
        editableContainer.focus();

        // Clean style value for fontFamily inline JS assignment
        let cleanValue = styleValue;
        if (styleName === 'fontFamily') {
            cleanValue = styleValue.replace(/['"]/g, '');
        }

        // If selection is collapsed (no text highlighted), apply style to the entire block content
        if (range.collapsed) {
            try {
                const currentHTML = editableContainer.innerHTML;
                const propName = styleName === 'fontFamily' ? 'font-family' : styleName;
                
                // Wrap the whole content in a span with the specified font-family or style
                editableContainer.innerHTML = `<span style="${propName}: ${styleValue}">${currentHTML}</span>`;
                
                // Trigger React input change to sync to state & other tickets
                const event = new Event('input', { bubbles: true });
                editableContainer.dispatchEvent(event);
                
                // Re-select all contents to allow subsequent edits
                const newRange = document.createRange();
                newRange.selectNodeContents(editableContainer);
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
                savedRangeRef.current = newRange;
                return;
            } catch (e) {
                console.error('Error applying custom style to container:', e);
            }
        }

        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        const span = document.createElement('span');
        span.style[styleName as any] = cleanValue;
        
        try {
            span.appendChild(range.extractContents());
            range.insertNode(span);
            
            // Re-select the span element to keep focus and highlight
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
            savedRangeRef.current = newRange;

            // Trigger React input change
            const event = new Event('input', { bubbles: true });
            editableContainer.dispatchEvent(event);
        } catch (e) {
            console.error('Error applying custom style to selection:', e);
        }
    };

    const handleFormat = (command: string) => {
        let range = savedRangeRef.current;
        const selection = window.getSelection();
        
        if (range && selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        document.execCommand(command, false);
        
        if (selection && selection.rangeCount > 0) {
            savedRangeRef.current = selection.getRangeAt(0).cloneRange();
        }

        const newSelection = window.getSelection();
        if (!newSelection || newSelection.rangeCount === 0) return;
        const newRange = newSelection.getRangeAt(0);
        let parent = newRange.commonAncestorContainer;
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

    const getSelectedFontSize = (): number => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return 3.5;
        const range = selection.getRangeAt(0);
        let parent: HTMLElement | null = range.commonAncestorContainer as HTMLElement;
        if (parent.nodeType === Node.TEXT_NODE) {
            parent = parent.parentElement;
        }
        
        const span = parent?.closest('span[style*="font-size"]');
        if (span) {
            const fs = (span as HTMLElement).style.fontSize;
            const match = fs.match(/([\d.]+)/);
            if (match) return parseFloat(match[1]);
        }
        return 3.5;
    };

    const adjustFontSize = (amount: number) => {
        const current = getSelectedFontSize();
        const newVal = Math.max(0.5, Math.min(20, parseFloat((current + amount).toFixed(1))));
        applyStyleToSelection('fontSize', `${newVal}cqw`);
        
        if (savedRangeRef.current) {
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(savedRangeRef.current);
            }
        }
    };

    const handleFontSizeInputChange = (valStr: string) => {
        const val = parseFloat(valStr);
        if (!isNaN(val) && val > 0) {
            applyStyleToSelection('fontSize', `${val}cqw`);
        }
    };

    return (
        <div className="bg-white p-0 shadow-xl border border-slate-200 shrink-0 w-full max-w-sm mx-auto overflow-hidden no-print-bg">
            <style>
                {useMemo(() => `
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

                @media screen {
                    .sticker-container.draw-page {
                        display: none;
                    }
                    .sticker-container.draw-page.active-preview-page {
                        display: block;
                    }
                }
                @media print {
                    .sticker-container.draw-page {
                        display: block !important;
                    }
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
                 .draw-ticket-block > div {
                     overflow: hidden;
                 }
                 .draw-ticket-block[data-index="0"] { top: 0%; }
                 .draw-ticket-block[data-index="1"] { top: 25%; }
                 .draw-ticket-block[data-index="2"] { top: 50%; }
                 .draw-ticket-block[data-index="3"] { top: 75%; }

                 .draw-ticket-block .input-title-single {
                       position: absolute;
                       left: 2.2%;
                       top: 2.0%;
                       width: 95.6%;
                       height: 18.0%;
                       display: flex;
                       align-items: center;
                       justify-content: center;
                       font-family: 'UTM Avo', sans-serif;
                       font-weight: bold;
                       font-size: 3.6cqw;
                       color: #000;
                       background: #ffffff;
                       z-index: 10;
                       outline: none;
                       cursor: text;
                       text-align: center;
                       white-space: nowrap;
                       line-height: 1.4;
                  }
 
                  
 
                  .draw-ticket-block .input-content-top-left {
                      position: absolute;
                      left: 2.2%;
                      top: 21.0%;
                      width: 35.0%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
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
                      line-height: 1.15;
                  }
 
                  .draw-ticket-block .input-content-top-right {
                      position: absolute;
                      left: 52.4%;
                      top: 21.0%;
                      width: 35.0%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: center;
                      text-align: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      white-space: nowrap;
                      word-break: normal;
                      padding: 0.5cqw 1cqw;
                  }
 
                  .draw-ticket-block .input-content-bottom-left {
                      position: absolute;
                      left: 2.2%;
                      top: 50.0%;
                      width: 47.0%;
                      height: 32.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
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
                      justify-content: center;
                      align-items: center;
                      text-align: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      white-space: nowrap;
                      word-break: normal;
                      padding: 0.5cqw 1cqw;
                  }
 
                  .draw-ticket-block .input-code-left {
                      position: absolute;
                      left: 36.5%;
                      top: 33.0%;
                      width: 12.0%;
                      height: 11%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.8cqw;
                      color: #000000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      text-align: center;
                  }

                   .draw-ticket-block .display-code-left {
                       position: absolute;
                       left: 36.5%;
                       top: 33.0%;
                       width: 12.0%;
                       height: 11%;
                       display: flex;
                       align-items: center;
                       justify-content: center;
                       font-family: 'UTM Avo', sans-serif;
                       font-weight: bold;
                       font-size: 3.8cqw;
                       color: #000000;
                       text-align: center;
                       pointer-events: none;
                       user-select: none;
                   }
 
                  .draw-ticket-block .display-code-right {
                      position: absolute;
                      left: 86.7%;
                      top: 33.0%;
                      width: 12.0%;
                      height: 11%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.8cqw;
                      color: #000000;
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

                  .draw-ticket-block .display-title-single {
                       position: absolute;
                       left: 2.2%;
                       top: 2.0%;
                       width: 95.6%;
                       height: 18.0%;
                       display: flex;
                       align-items: center;
                       justify-content: center;
                       font-family: 'UTM Avo', sans-serif;
                       font-weight: bold;
                       font-size: 3.6cqw;
                       color: #000;
                       background: #ffffff;
                       z-index: 10;
                       text-align: center;
                       white-space: nowrap;
                       line-height: 1.4;
                  }
                  .draw-ticket-block .input-title-single *,
                  .draw-ticket-block .display-title-single * {
                      margin: 0 !important;
                      padding: 0 !important;
                      line-height: 1.4 !important;
                  }

                  .draw-ticket-block .display-content-top-left {
                      position: absolute;
                      left: 2.2%;
                      top: 21.0%;
                      width: 35.0%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: flex-start;
                      text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      color: #000;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                      line-height: 1.15;
                  }

                  .draw-ticket-block .display-content-top-right {
                      position: absolute;
                      left: 52.4%;
                      top: 21.0%;
                      width: 35.0%;
                      height: 30.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: center;
                      text-align: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      color: #000;
                      white-space: nowrap;
                      word-break: normal;
                      padding: 0.5cqw 1cqw;
                  }

                  .draw-ticket-block .display-content-bottom-left {
                       position: absolute;
                       left: 2.2%;
                       top: 50.0%;
                       width: 47.0%;
                       height: 32.0%;
                       display: flex;
                       flex-direction: column;
                       justify-content: center;
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
                      justify-content: center;
                      align-items: center;
                      text-align: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      white-space: nowrap;
                      word-break: normal;
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

                     /* Khống chế font-size tuyệt đối khi in để tránh Chrome Print Engine phóng to sai lệch */
                     .draw-ticket-block .input-title-single,
                      .draw-ticket-block .display-title-single {
                          font-size: 13pt !important;
                          line-height: 1.4 !important;
                          white-space: nowrap !important;
                     }
                     .draw-ticket-block .input-content-top-left,
                     .draw-ticket-block .display-content-top-left {
                         font-size: 9.5pt !important;
                          line-height: 1.15 !important;
                     }
                     .draw-ticket-block .input-content-bottom-left,
                     .draw-ticket-block .display-content-bottom-left {
                         font-size: 8.5pt !important;
                         line-height: 1.3 !important;
                     }
                     .draw-ticket-block .input-code-left,
                     .draw-ticket-block .display-code-left,
                     .draw-ticket-block .display-code-right {
                         font-size: 14pt !important;
                         line-height: 1.1 !important;
                     }
                     .draw-ticket-block .input-footer-left,
                     .draw-ticket-block .display-footer-left {
                         font-size: 13pt !important;
                         line-height: 1.2 !important;
                     }
                 }
                 `, [stickerType, bgImage, headerTextSize, percentTextSize, nameTextSize, oldPriceTextSize, newPriceTextSize, footerTextSize, subHeaderTextSize])}
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
            {(() => {
                const showDropdownBelow = toolbarPos ? (toolbarPos.top - window.scrollY < 180) : false;
                return toolbarPos && (
                    <div 
                        className="fixed z-[9999] -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/60 p-1.5 rounded-lg shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 print:hidden"
                        style={{ 
                            top: `${toolbarPos.top}px`, 
                            left: `${toolbarPos.left}px` 
                        }}
                        onMouseDown={(e) => {
                            // Prevent toolbar from taking focus away from selection
                            e.preventDefault();
                        }}
                    >
                        {/* Font Custom Dropdown */}
                        <div className="relative">
                            <Button
                                variant="ghost"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setActiveMenu(activeMenu === 'font' ? null : 'font')}
                                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto text-white text-[11px] font-semibold px-2 py-1 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 border-r border-slate-700/80 mr-0.5"
                            >
                                Font <span className="text-[7px] opacity-75">▼</span>
                            </Button>
                            
                            {activeMenu === 'font' && (
                                <div 
                                    onMouseDown={(e) => e.preventDefault()}
                                    className={`absolute left-0 mb-2 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl py-1 flex flex-col min-w-[150px] max-h-[200px] overflow-y-auto z-[10000] scrollbar-thin overflow-x-hidden ${
                                        showDropdownBelow ? 'top-full mt-2' : 'bottom-full mb-2'
                                    }`}
                                >
                                    {[
                                        { name: 'UTM Avo', val: "UTM Avo, sans-serif" },
                                        { name: 'Plus Jakarta Sans', val: "Plus Jakarta Sans, sans-serif" },
                                        { name: 'Inter', val: "Inter, sans-serif" },
                                        { name: 'Oswald', val: "Oswald, sans-serif" },
                                        { name: 'Roboto Condensed', val: "Roboto Condensed, sans-serif" },
                                        { name: 'Fjalla One', val: "Fjalla One, sans-serif" },
                                        { name: 'Jost', val: "Jost, sans-serif" },
                                        { name: 'Josefin Sans', val: "Josefin Sans, sans-serif" },
                                        { name: 'Alata Regular', val: "Alata Regular, sans-serif" },
                                        { name: 'Shopee Text', val: "Shopee Text, sans-serif" },
                                        { name: 'SF Pro Display', val: "SF Pro Display, sans-serif" },
                                        { name: 'Samsung Sharp Sans', val: "Samsung Sharp Sans, sans-serif" },
                                        { name: 'Shopee Display', val: "Shopee Display, sans-serif" },
                                        { name: 'UTM Colossalis', val: "UTM Colossalis, sans-serif" }
                                    ].map(font => (
                                        <Button
                                            variant="ghost"
                                            key={font.val}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                applyStyleToSelection('fontFamily', font.val);
                                                setActiveMenu(null);
                                            }}
                                            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto justify-start px-3 py-1.5 text-left text-[11px] text-slate-200 hover:text-white hover:bg-slate-800 transition-colors w-full whitespace-nowrap"
                                            style={{ fontFamily: font.val }}
                                        >
                                            {font.name}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Size adjust controls: - [input] + */}
                        <div className="flex items-center gap-1 bg-slate-800/80 rounded px-1.5 py-0.5 border border-slate-700/50 mr-1 no-print">
                            <Button
                                variant="ghost"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => adjustFontSize(-0.2)}
                                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors"
                                title="Giảm size chữ"
                            >
                                -
                            </Button>
                            <input 
                                type="text"
                                onMouseDown={(e) => e.stopPropagation()} 
                                onClick={(e) => e.stopPropagation()}
                                value={getSelectedFontSize().toFixed(1)}
                                onChange={(e) => handleFontSizeInputChange(e.target.value)}
                                className="w-9 h-5 bg-slate-900 border border-slate-700 text-white text-[10px] font-bold rounded text-center focus:outline-none focus:border-rose-500"
                                title="Kích thước cqw"
                            />
                            <Button
                                variant="ghost"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => adjustFontSize(0.2)}
                                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded text-xs font-black transition-colors"
                                title="Tăng size chữ"
                            >
                                +
                            </Button>
                        </div>

                        {/* Bold button */}
                        <Button
                            variant="ghost"
                            onClick={() => handleFormat('bold')}
                            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="In đậm (Bold)"
                        >
                            <Bold size={13} className="stroke-[2.5]" />
                        </Button>

                        {/* Italic button */}
                        <Button
                            variant="ghost"
                            onClick={() => handleFormat('italic')}
                            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="In nghiêng (Italic)"
                        >
                            <Italic size={13} className="stroke-[2.5]" />
                        </Button>

                        {/* Underline button */}
                        <Button
                            variant="ghost"
                            onClick={() => handleFormat('underline')}
                            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="Gạch chân (Underline)"
                        >
                            <Underline size={13} className="stroke-[2.5]" />
                        </Button>

                        {/* Tooltip arrow */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-slate-900/95" />
                    </div>
                );
            })()}
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
        </div>
    );
};

