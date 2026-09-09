import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { saveSetting, getSetting } from '../services/dbService';
import { saveListToFirestore, fetchSavedListsFromFirestore, deleteSavedListFromFirestore } from '../services/firebaseService';
import { auth } from '../firebase';
import { StickerPage, SavedStickerList, PrintHistoryEntry, BatchItem, TicketDrawData } from '../stickerprinter/types';
import { resolvePagePrices, generatePageHtml, isHistoryDuplicate, generateDrawPagesHtml } from '../stickerprinter/pageHtmlUtils';
import { parsePercentValue, parseBatchItemsFromExcelRows, downloadStickerTemplate, parseTemplateExcelData, parseErpPriceExcelData } from '../stickerprinter/excelParsers';
import { getStickerPreviewStyles } from '../stickerprinter/stickerPreviewStyles';

const STICKER_DB_KEY = 'stickerPrinterState';
const STICKER_HISTORY_KEY = 'stickerPrintHistory';
const STICKER_SAVED_LISTS_KEY = 'stickerSavedLists';

/** ID cố định cho entry lịch sử mặc định — không xoá được. */
export const DEFAULT_HISTORY_ID = '__default_draw_template__';

/** Nội dung phiếu rút thăm mặc định — dùng làm giá trị khởi tạo và entry lịch sử cố định. */
const DEFAULT_DRAW_TICKET_TEMPLATE: TicketDrawData = {
    id: '1',
    title: 'PHIẾU RÚT THĂM TRÚNG THƯỞNG 19 & 26/9',
    code: '1',
    footer: 'HÙNG VƯƠNG',
    contentTop: 'RÚT THĂM 19H<div>MIỄN PHÍ 370 SUẤT:</div>',
    contentTopRight: 'MIỄN PHÍ',
    contentBottom: '<div>- 150 Bộ 3 hộp (75 Suất/ngày)</div><div>- 8 Tủ sấy quần áo (4 Suất/ngày)</div><div>- 8 Nồi cơm (4 Suất/ngày)</div>',
    contentBottomRight: '2 Máy giặt 8kg<div>(1 suất/ ngày)</div>',
};

/** Entry lịch sử mặc định — luôn hiển thị ở cuối tab Lịch sử, không thể xoá. */
export const DEFAULT_DRAW_HISTORY_ENTRY: PrintHistoryEntry = {
    id: DEFAULT_HISTORY_ID,
    timestamp: 0, // epoch 0 → luôn nằm cuối khi sort theo thời gian
    label: 'Phiếu Rút Thăm — Mẫu mặc định',
    pageCount: 1000,
    stickerType: 'draw',
    bgImage: '/frame/bg_phieu.png',
    headerTextSize: 8,
    subHeaderTextSize: 13,
    percentTextSize: 36.9,
    oldPriceTextSize: 14.2,
    nameTextSize: 3.6,
    newPriceTextSize: 26.5,
    footerTextSize: 3.2,
    batchItems: [],
    headerTextContent: '',
    subHeaderTextContent: '',
    footerTextContent: '',
    showBarcode: false,
    manualPages: [],
    drawContentTopLeftSize: 3.5,
    drawContentTopRightSize: 3.5,
    drawContentBottomLeftSize: 1.7,
    drawContentBottomRightSize: 2.2,
    drawTitleSize: 2.5,
    drawCodeSize: 3.8,
    drawFooterSize: 3.8,
};

export function useStickerPrinterData() {
    const [stickerMode, setStickerMode] = useState<'sticker' | 'event'>('sticker');
    const [eventEverOpened, setEventEverOpened] = useState(false);
    const [stickerType, setStickerType] = useState<'gia_soc' | 'gio_vang' | 'draw'>('draw');
    const [bgImage, setBgImage] = useState('/frame/bg_phieu.png');
    const [priceSource, setPriceSource] = useState<'sale' | 'service'>('sale');
    
    // Ticket draw state — khởi tạo từ mẫu mặc định
    const [drawTickets, setDrawTickets] = useState<TicketDrawData[]>([
        { ...DEFAULT_DRAW_TICKET_TEMPLATE, id: '1', code: '1' },
        { ...DEFAULT_DRAW_TICKET_TEMPLATE, id: '2', code: '2' },
        { ...DEFAULT_DRAW_TICKET_TEMPLATE, id: '3', code: '3' },
        { ...DEFAULT_DRAW_TICKET_TEMPLATE, id: '4', code: '4' },
    ]);
    const [drawStartNumber, setDrawStartNumber] = useState<number>(1);
    const [drawTotalTickets, setDrawTotalTickets] = useState<number>(4000);
    const [drawAutoIncrement, setDrawAutoIncrement] = useState<boolean>(true);

    const [drawContentTopLeftSize, setDrawContentTopLeftSize] = useState(3.5);
    const [drawContentTopRightSize, setDrawContentTopRightSize] = useState(3.5);
    const [drawContentBottomLeftSize, setDrawContentBottomLeftSize] = useState(1.7);
    const [drawContentBottomRightSize, setDrawContentBottomRightSize] = useState(2.2);
    const [drawTitleSize, setDrawTitleSize] = useState(2.5);
    const [drawCodeSize, setDrawCodeSize] = useState(3.8);
    const [drawFooterSize, setDrawFooterSize] = useState(3.8);
    
    // Dynamic Font Sizes and Active Field Trackers
    const [activeField, setActiveField] = useState<string>('drawContentBottomLeft');
    const [headerTextSize, setHeaderTextSize] = useState(8);
    const [subHeaderTextSize, setSubHeaderTextSize] = useState(13);
    const [percentTextSize, setPercentTextSize] = useState(36.9);
    const [oldPriceTextSize, setOldPriceTextSize] = useState(14.2);
    const [nameTextSize, setNameTextSize] = useState(3.6);
    const [newPriceTextSize, setNewPriceTextSize] = useState(26.5);
    const [footerTextSize, setFooterTextSize] = useState(3.2);
    const [discountDisplayMode, setDiscountDisplayMode] = useState<'percent' | 'amount'>('percent');
    const [discountThreshold, setDiscountThreshold] = useState('');
    const [activeQueuePageId, setActiveQueuePageId] = useState<string | null>(null);
    const [activeSubTab, setActiveSubTab] = useState<'data' | 'queue' | 'history'>('data');

    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const [headerTextContent, setHeaderTextContent] = useState('QUẠT ĐIỀU HOÀ');
    const [subHeaderTextContent, setSubHeaderTextContent] = useState('0 SUẤT/NGÀY');
    const [footerTextContent, setFooterTextContent] = useState('Khuyến mãi áp dụng đến hết ngày 3/5/2026');
    const [searchTerm, setSearchTerm] = useState('');
    const [showBarcode, setShowBarcode] = useState(false);
    const [barcodeImei, setBarcodeImei] = useState('123456');
    const [manualPages, setManualPages] = useState<StickerPage[]>([]);
    const [printHistory, setPrintHistory] = useState<PrintHistoryEntry[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [savedLists, setSavedLists] = useState<SavedStickerList[]>([]);
    // true = savedLists vừa được cập nhật từ storage (indexeddb-change), không phải người
    // dùng gõ — effect ghi-lại IndexedDB đọc cờ này để không ghi lại y hệt dữ liệu vừa đọc
    // ra (tránh vòng lặp vô hạn với useCloudSync.ts, xem 2 effect bên dưới).
    const skipNextSavedListsSaveRef = useRef(false);
    const [showSavedLists, setShowSavedLists] = useState(false);
    const [previewName, setPreviewName] = useState('Quạt điều hoà Daikiosan DMI03');
    const [previewOldPrice, setPreviewOldPrice] = useState('5.490.000');
    const [previewNewPrice, setPreviewNewPrice] = useState('3.490');

    const [isLoaded, setIsLoaded] = useState(false);
    const [isSaveListModalOpen, setIsSaveListModalOpen] = useState(false);

    useEffect(() => {
        if (stickerType === 'draw' && activeSubTab === 'queue') {
            setActiveSubTab('data');
        }
    }, [stickerType, activeSubTab]);

    const getActiveFieldLabel = () => {
        switch (activeField) {
            case 'header': return 'Tiêu đề';
            case 'subHeader': return 'Tiêu đề phụ';
            case 'percent': return '% Giảm';
            case 'oldPrice': return 'Giá cũ';
            case 'name': return 'Tên SP';
            case 'newPrice': return 'Giá mới';
            case 'footer': return 'Khuyến mãi';
            default: return 'Cỡ chữ';
        }
    };

    const applyFontSizeToSelection = (sizeVal: number) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;

        const range = selection.getRangeAt(0);
        let parent = range.commonAncestorContainer;
        if (parent.nodeType === 3) { // TEXT_NODE
            parent = parent.parentNode || parent;
        }

        let current: Node | null = parent;
        let editableContainer: HTMLElement | null = null;
        while (current) {
            if (current.nodeType === 1) { // ELEMENT_NODE
                const el = current as HTMLElement;
                if (el.getAttribute('contenteditable') === 'true') {
                    editableContainer = el;
                    break;
                }
            }
            current = current.parentNode;
        }

        if (editableContainer) {
            const span = document.createElement('span');
            span.style.fontSize = `${sizeVal.toFixed(1)}cqw`;
            
            try {
                span.appendChild(range.extractContents());
                range.insertNode(span);
                
                const event = new Event('input', { bubbles: true });
                editableContainer.dispatchEvent(event);
                return true;
            } catch (e) {
                console.error('Error applying font size to selection:', e);
            }
        }
        return false;
    };

    const getActiveFontSize = (): number => {
        switch (activeField) {
            case 'header': return headerTextSize;
            case 'subHeader': return subHeaderTextSize;
            case 'percent': return percentTextSize;
            case 'oldPrice': return oldPriceTextSize;
            case 'name': return nameTextSize;
            case 'newPrice': return newPriceTextSize;
            case 'footer': return footerTextSize;
            default: return headerTextSize;
        }
    };

    const getDrawActiveFontSize = (): number => {
        switch (activeField) {
            case 'drawTitle': return drawTitleSize;
            case 'drawContentTopLeft': return drawContentTopLeftSize;
            case 'drawContentTopRight': return drawContentTopRightSize;
            case 'drawContentBottomLeft': return drawContentBottomLeftSize;
            case 'drawContentBottomRight': return drawContentBottomRightSize;
            case 'drawCode': return drawCodeSize;
            case 'drawFooter': return drawFooterSize;
            default: return drawContentTopLeftSize;
        }
    };

    const setDrawActiveFontSize = (newVal: number | ((prev: number) => number)) => {
        const getVal = (prev: number) => typeof newVal === 'function' ? newVal(prev) : newVal;
        switch (activeField) {
            case 'drawTitle': setDrawTitleSize(getVal); break;
            case 'drawContentTopLeft': setDrawContentTopLeftSize(getVal); break;
            case 'drawContentTopRight': setDrawContentTopRightSize(getVal); break;
            case 'drawContentBottomLeft': setDrawContentBottomLeftSize(getVal); break;
            case 'drawContentBottomRight': setDrawContentBottomRightSize(getVal); break;
            case 'drawCode': setDrawCodeSize(getVal); break;
            case 'drawFooter': setDrawFooterSize(getVal); break;
            default: setDrawContentTopLeftSize(getVal);
        }
    };

    const getDrawActiveFieldLabel = () => {
        switch (activeField) {
            case 'drawTitle': return 'Cỡ chữ Tiêu đề';
            case 'drawContentTopLeft': return 'Cỡ chữ Giải thưởng trái';
            case 'drawContentTopRight': return 'Cỡ chữ Giải thưởng phải';
            case 'drawContentBottomLeft': return 'Cỡ chữ Thông tin trái';
            case 'drawContentBottomRight': return 'Cỡ chữ Thông tin phải';
            case 'drawCode': return 'Cỡ chữ Mã số';
            case 'drawFooter': return 'Cỡ chữ Siêu thị';
            default: return 'Cỡ chữ Giải thưởng trái';
        }
    };

    const setActiveFontSize = (val: number | ((s: number) => number)) => {
        const update = (s: number) => {
            const nextVal = typeof val === 'function' ? val(s) : val;
            return Number(nextVal.toFixed(1));
        };
        switch (activeField) {
            case 'header': setHeaderTextSize(update); break;
            case 'subHeader': setSubHeaderTextSize(update); break;
            case 'percent': setPercentTextSize(update); break;
            case 'oldPrice': setOldPriceTextSize(update); break;
            case 'name': setNameTextSize(update); break;
            case 'newPrice': setNewPriceTextSize(update); break;
            case 'footer': setFooterTextSize(update); break;
        }
    };

    const updateBatchItem = (id: string, updates: Partial<BatchItem>) => {
        setBatchItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
    };

    useEffect(() => {
        if (!isLoaded) return;
        if (stickerType !== 'draw') return;

        setDrawTickets(prev => {
            const firstTicketData = prev[0] || { id: '1', title: '', code: '', footer: '', contentTop: '', contentTopRight: '', contentBottom: '', contentBottomRight: '' };
            const newTickets: TicketDrawData[] = [];
            for (let i = 0; i < drawTotalTickets; i++) {
                const ticketCode = drawAutoIncrement ? (drawStartNumber + i).toString() : (prev[i]?.code || '');
                if (i === 0) {
                    newTickets.push({
                        ...firstTicketData,
                        id: '1',
                        code: drawAutoIncrement ? drawStartNumber.toString() : (firstTicketData.code || '1')
                    });
                } else {
                    newTickets.push({
                        id: (i + 1).toString(),
                        title: '', 
                        footer: '',
                        contentTop: '',
                        contentTopRight: '',
                        contentBottom: '',
                        contentBottomRight: '',
                        code: ticketCode
                    });
                }
            }
            return newTickets;
        });
    }, [drawStartNumber, drawTotalTickets, drawAutoIncrement, stickerType, isLoaded]);

    // Lắng nghe event từ FloatingFormatToolbar khi người dùng điều chỉnh size chữ
    // qua popup (bôi đen text → nhấn +/−). Cập nhật React state tương ứng để
    // ticket #2-#4 (dùng style từ state) cũng thay đổi size đồng bộ.
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            const size = detail?.size;
            const field = detail?.field;
            if (typeof size === 'number' && stickerType === 'draw') {
                if (field) {
                    switch (field) {
                        case 'drawTitle': setDrawTitleSize(size); break;
                        case 'drawContentTopLeft': setDrawContentTopLeftSize(size); break;
                        case 'drawContentTopRight': setDrawContentTopRightSize(size); break;
                        case 'drawContentBottomLeft': setDrawContentBottomLeftSize(size); break;
                        case 'drawContentBottomRight': setDrawContentBottomRightSize(size); break;
                        case 'drawCode': setDrawCodeSize(size); break;
                        case 'drawFooter': setDrawFooterSize(size); break;
                        default: setDrawActiveFontSize(size);
                    }
                } else {
                    setDrawActiveFontSize(size);
                }
            }
        };
        document.addEventListener('draw-font-size-change', handler);
        return () => document.removeEventListener('draw-font-size-change', handler);
    }, [stickerType, activeField]);  

    useEffect(() => {
        const match = previewName.match(/(?:IMEI|CODE):\s*([A-Za-z0-9]+)/i);
        if (match) {
            setBarcodeImei(match[1]);
        } else {
            const fallbackMatch = previewName.match(/\(([A-Za-z0-9]+)\)/);
            if (fallbackMatch) {
                setBarcodeImei(fallbackMatch[1]);
            }
        }
    }, [previewName]);

    useEffect(() => {
        if (!activeQueuePageId) return;
        const activePage = manualPages.find(p => p.id === activeQueuePageId);
        if (activePage) {
            const { newPrice } = resolvePagePrices(activePage, priceSource);
            setPreviewNewPrice(newPrice);
        }
    }, [priceSource, activeQueuePageId, manualPages]);

    // Helper to update sub tab in URL
    const updateSubQueryParam = (sub: string) => {
        try {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('sub', sub);
            window.history.replaceState(null, '', newUrl.toString());
        } catch (e) {
            console.error("Failed to sync sub-tab to URL:", e);
        }
    };

    // Preload StickerEventApp; read initial sub tab from URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        let sub = urlParams.get('sub');
        if (!sub) {
            sub = 'draw';
            updateSubQueryParam('draw');
        }
        
        if (sub === 'gia-soc') {
            setStickerMode('sticker');
            setStickerType('gia_soc');
            setHeaderTextContent('QUẠT ĐIỀU HOÀ');
            setBgImage('/frame/X24_NEW.png');
            setHeaderTextSize(8);
        } else if (sub === 'gio-vang') {
            setStickerMode('sticker');
            setStickerType('gio_vang');
            setHeaderTextContent('TỪ 00/00 ĐẾN 00/00');
            setBgImage('/frame/GVO2-scaled.png');
            setHeaderTextSize(8);
        } else if (sub === 'draw') {
            setStickerMode('sticker');
            setStickerType('draw');
            setBgImage('/frame/bg_phieu.png');
            setActiveField('drawContentBottomLeft');
        } else if (sub === 'event') {
            setStickerMode('event');
            setEventEverOpened(true);
        }
        
        const timer = setTimeout(() => {
            import('../StickerEventApp').catch(err => {
                console.warn('Failed to preload StickerEventApp:', err);
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    // Load settings, saved lists, and print history purely from IndexedDB
    useEffect(() => {
        let active = true;
        async function loadAllData() {
            try {
                const savedState = await getSetting<any>(STICKER_DB_KEY);
                
                if (savedState && active) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const currentSub = urlParams.get('sub');
                    
                    if (!currentSub) {
                        setStickerMode('sticker');
                        setStickerType('draw');
                        setBgImage('/frame/bg_phieu.png');
                    } else {
                        if (currentSub === 'gia-soc') {
                            setStickerMode('sticker');
                            setStickerType('gia_soc');
                        } else if (currentSub === 'gio-vang') {
                            setStickerMode('sticker');
                            setStickerType('gio_vang');
                        } else if (currentSub === 'draw') {
                            setStickerMode('sticker');
                            setStickerType('draw');
                        } else if (currentSub === 'event') {
                            setStickerMode('event');
                            setEventEverOpened(true);
                        }
                    }
                    if (savedState.bgImage) setBgImage(savedState.bgImage);
                    if (savedState.headerTextContent) setHeaderTextContent(savedState.headerTextContent);
                    if (savedState.subHeaderTextContent) setSubHeaderTextContent(savedState.subHeaderTextContent);
                    if (savedState.footerTextContent) setFooterTextContent(savedState.footerTextContent);
                    if (savedState.showBarcode != null) setShowBarcode(savedState.showBarcode);
                    if (savedState.previewName) setPreviewName(savedState.previewName);
                    if (savedState.previewOldPrice) setPreviewOldPrice(savedState.previewOldPrice);
                    
                    if (savedState.previewNewPrice) {
                        const digits = String(savedState.previewNewPrice).replace(/\D/g, '');
                        if (digits) {
                            let val = Number(digits);
                            if (val >= 100000) {
                                val = Math.floor(val / 1000);
                            }
                            setPreviewNewPrice(val.toLocaleString('vi-VN'));
                        } else {
                            setPreviewNewPrice(savedState.previewNewPrice);
                        }
                    }
                    
                    if (savedState.discountDisplayMode) setDiscountDisplayMode(savedState.discountDisplayMode);
                    if (savedState.barcodeImei) setBarcodeImei(savedState.barcodeImei);
                    if (savedState.discountThreshold != null) setDiscountThreshold(savedState.discountThreshold);
                    if (savedState.searchTerm != null) setSearchTerm(savedState.searchTerm);
                    
                    const loadedPages = (savedState.manualPages || []).map((page: StickerPage) => {
                        if (page.newPrice) {
                            const digits = String(page.newPrice).replace(/\D/g, '');
                            if (digits) {
                                let val = Number(digits);
                                if (val >= 100000) {
                                    val = Math.floor(val / 1000);
                                    return { ...page, newPrice: val.toLocaleString('vi-VN') };
                                }
                            }
                        }
                        return page;
                    });
                    
                    const loadedItems = (savedState.batchItems || []).map((item: BatchItem) => {
                        if (item.newPrice) {
                            const digits = String(item.newPrice).replace(/\D/g, '');
                            if (digits) {
                                let val = Number(digits);
                                if (val >= 100000) {
                                    val = Math.floor(val / 1000);
                                    return { ...item, newPrice: val.toLocaleString('vi-VN') };
                                }
                            }
                        }
                        return item;
                    });
                    
                    if (loadedPages.length === 0 && loadedItems.length === 0) {
                        setActiveSubTab('data');
                    } else if (savedState.activeSubTab) {
                        setActiveSubTab(savedState.activeSubTab === 'help' ? 'data' : savedState.activeSubTab);
                    }
                    setManualPages(loadedPages);
                    setBatchItems(loadedItems);
                    if (savedState.priceSource) setPriceSource(savedState.priceSource);
                    
                    if (savedState.headerTextSize != null) setHeaderTextSize(savedState.headerTextSize);
                    if (savedState.subHeaderTextSize != null) setSubHeaderTextSize(savedState.subHeaderTextSize);
                    if (savedState.percentTextSize != null) setPercentTextSize(savedState.percentTextSize);
                    if (savedState.oldPriceTextSize != null) setOldPriceTextSize(savedState.oldPriceTextSize);
                    if (savedState.nameTextSize != null) setNameTextSize(savedState.nameTextSize);
                    if (savedState.newPriceTextSize != null) setNewPriceTextSize(savedState.newPriceTextSize);
                    if (savedState.footerTextSize != null) setFooterTextSize(savedState.footerTextSize);

                    if (savedState.drawTickets) {
                        // Tự động nâng cấp nếu dữ liệu cũ còn lưu mẫu cũ (12/9, 420 suất, hoặc 40 suất)
                        if (savedState.drawTickets[0]?.title?.includes('12/9') || savedState.drawTickets[0]?.contentTop?.includes('420') || savedState.drawTickets[0]?.contentTop?.includes('40 SUẤT')) {
                            setDrawTickets(prev => [
                                { ...DEFAULT_DRAW_TICKET_TEMPLATE, id: '1', code: '1' },
                                ...prev.slice(1)
                            ]);
                        } else {
                            setDrawTickets(savedState.drawTickets);
                        }
                    }
                    if (savedState.drawStartNumber != null) setDrawStartNumber(savedState.drawStartNumber);
                    if (savedState.drawTotalTickets != null) {
                        setDrawTotalTickets(savedState.drawTotalTickets === 4 ? 4000 : savedState.drawTotalTickets);
                    } else {
                        setDrawTotalTickets(4000);
                    }
                    if (savedState.drawAutoIncrement != null) setDrawAutoIncrement(savedState.drawAutoIncrement);
                    if (savedState.drawContentTopLeftSize != null) setDrawContentTopLeftSize(savedState.drawContentTopLeftSize);
                    if (savedState.drawContentTopRightSize != null) setDrawContentTopRightSize(savedState.drawContentTopRightSize);
                    if (savedState.drawContentBottomLeftSize != null) {
                        setDrawContentBottomLeftSize(savedState.drawContentBottomLeftSize === 2.2 ? 1.7 : savedState.drawContentBottomLeftSize);
                    } else {
                        setDrawContentBottomLeftSize(1.7);
                    }
                    if (savedState.drawContentBottomRightSize != null) setDrawContentBottomRightSize(savedState.drawContentBottomRightSize);
                    if (savedState.drawTitleSize != null) setDrawTitleSize(savedState.drawTitleSize);
                    if (savedState.drawCodeSize != null) setDrawCodeSize(savedState.drawCodeSize);
                    if (savedState.drawFooterSize != null) setDrawFooterSize(savedState.drawFooterSize);
                }

                const savedListsData = await getSetting<SavedStickerList[]>(STICKER_SAVED_LISTS_KEY);
                if (savedListsData && active) {
                    setSavedLists(savedListsData);
                }

                const printHistoryData = await getSetting<PrintHistoryEntry[]>(STICKER_HISTORY_KEY);
                if (printHistoryData && active) {
                    setPrintHistory(printHistoryData);
                }
            } catch (err) {
                console.error("Error loading sticker data:", err);
            } finally {
                if (active) {
                    setIsLoaded(true);
                }
            }
        }
        loadAllData();
        return () => {
            active = false;
        };
    }, []);

    // Sync savedLists từ cloud sync — đánh dấu lần cập nhật này KHÔNG phải do
    // người dùng gõ, để effect "Sync savedLists to IndexedDB" bên dưới bỏ qua
    // đúng 1 lần, tránh ghi lại y hệt dữ liệu vừa đọc từ storage (xem giải
    // thích vòng lặp ở skipNextSavedListsSaveRef).
    useEffect(() => {
        const handleDbChange = (event: Event) => {
            if ((event as CustomEvent<{ key?: string }>).detail?.key === STICKER_SAVED_LISTS_KEY) {
                getSetting<SavedStickerList[]>(STICKER_SAVED_LISTS_KEY).then(data => {
                    if (data) {
                        skipNextSavedListsSaveRef.current = true;
                        setSavedLists(data);
                    }
                });
            }
        };
        window.addEventListener('indexeddb-change', handleDbChange);
        return () => window.removeEventListener('indexeddb-change', handleDbChange);
    }, []);

    // Save state to IndexedDB (debounced)
    useEffect(() => {
        if (!isLoaded) return;
        const timer = setTimeout(async () => {
            const dataToSave = {
                stickerMode,
                stickerType,
                bgImage,
                headerTextContent,
                subHeaderTextContent,
                footerTextContent,
                showBarcode,
                previewName,
                previewOldPrice,
                previewNewPrice,
                discountDisplayMode,
                headerTextSize,
                subHeaderTextSize,
                percentTextSize,
                oldPriceTextSize,
                nameTextSize,
                newPriceTextSize,
                footerTextSize,
                barcodeImei,
                discountThreshold,
                searchTerm,
                activeQueuePageId,
                activeSubTab,
                manualPages,
                batchItems,
                priceSource,
                drawTickets,
                drawStartNumber,
                drawTotalTickets,
                drawAutoIncrement,
                drawContentTopLeftSize,
                drawContentTopRightSize,
                drawContentBottomLeftSize,
                drawContentBottomRightSize,
                drawTitleSize,
                drawCodeSize,
                drawFooterSize,
                updatedAt: new Date().toISOString()
            };
            
            try {
                await saveSetting(STICKER_DB_KEY, dataToSave);
            } catch (e) {
                console.error("IndexedDB save failed", e);
            }
        }, 500);

        // Emergency immediate save on tab unload or hide
        const handleFlushSave = () => {
            const dataToSave = {
                stickerMode,
                stickerType,
                bgImage,
                headerTextContent,
                subHeaderTextContent,
                footerTextContent,
                showBarcode,
                previewName,
                previewOldPrice,
                previewNewPrice,
                discountDisplayMode,
                headerTextSize,
                subHeaderTextSize,
                percentTextSize,
                oldPriceTextSize,
                nameTextSize,
                newPriceTextSize,
                footerTextSize,
                barcodeImei,
                discountThreshold,
                searchTerm,
                activeQueuePageId,
                activeSubTab,
                manualPages,
                batchItems,
                priceSource,
                drawTickets,
                drawStartNumber,
                drawTotalTickets,
                drawAutoIncrement,
                drawContentTopLeftSize,
                drawContentTopRightSize,
                drawContentBottomLeftSize,
                drawContentBottomRightSize,
                drawTitleSize,
                drawCodeSize,
                drawFooterSize,
                updatedAt: new Date().toISOString()
            };
            saveSetting(STICKER_DB_KEY, dataToSave).catch(e => console.error("Flush save failed", e));
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                handleFlushSave();
            }
        };

        window.addEventListener('beforeunload', handleFlushSave);
        window.addEventListener('visibilitychange', handleVisibility);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('beforeunload', handleFlushSave);
            window.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [
        isLoaded, stickerMode, stickerType, bgImage, headerTextContent, subHeaderTextContent,
        footerTextContent, showBarcode, previewName, previewOldPrice, previewNewPrice,
        headerTextSize, subHeaderTextSize, percentTextSize, oldPriceTextSize, nameTextSize,
        newPriceTextSize, footerTextSize, discountDisplayMode, barcodeImei, discountThreshold,
        searchTerm, activeQueuePageId, activeSubTab, manualPages, batchItems, priceSource,
        drawTickets, drawStartNumber, drawTotalTickets, drawAutoIncrement, drawContentTopLeftSize,
        drawContentTopRightSize, drawContentBottomLeftSize, drawContentBottomRightSize,
        drawTitleSize, drawCodeSize, drawFooterSize
    ]);

    // Sync savedLists to IndexedDB — bỏ qua nếu thay đổi này vừa đến từ chính
    // storage (xem handleDbChange ở trên). Nếu không bỏ qua: đọc từ cloud →
    // setSavedLists → effect này ghi lại y hệt dữ liệu đó → bắn lại
    // 'ycx-setting-changed' → useCloudSync.ts (hooks/) coi là sửa đổi mới của
    // user → đồng bộ lên Firestore lần nữa → cloud "mới hơn" → quay lại đầu →
    // vòng lặp vô hạn ghi/đọc mỗi ~2.5s (đã xác nhận bằng log thật 2026-07-18).
    useEffect(() => {
        if (!isLoaded) return;
        if (skipNextSavedListsSaveRef.current) {
            skipNextSavedListsSaveRef.current = false;
            return;
        }
        const timer = setTimeout(async () => {
            try {
                await saveSetting(STICKER_SAVED_LISTS_KEY, savedLists);
            } catch (e) {
                console.error("IndexedDB save savedLists failed", e);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [isLoaded, savedLists]);

    // Sync printHistory to IndexedDB
    useEffect(() => {
        if (!isLoaded) return;
        const timer = setTimeout(async () => {
            try {
                await saveSetting(STICKER_HISTORY_KEY, printHistory);
            } catch (e) {
                console.error("IndexedDB save printHistory failed", e);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [isLoaded, printHistory]);

    const handleDiscountThresholdChange = (val: string) => {
        setDiscountThreshold(val);
        const cleanInput = val.replace(/[^0-9]/g, '');
        const limit = parseInt(cleanInput, 10);
        
        if (isNaN(limit)) {
            setManualPages(prev => prev.map(p => ({ ...p, selected: true })));
            setBatchItems(prev => prev.map(i => ({ ...i, selected: true })));
        } else {
            setManualPages(prev => prev.map(p => {
                const pct = parsePercentValue(p.percent);
                return { ...p, selected: pct >= limit };
            }));
            setBatchItems(prev => prev.map(i => {
                const pct = parsePercentValue(i.percent);
                return { ...i, selected: pct >= limit };
            }));
        }
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const XLSX = await import('xlsx');
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                const items = parseBatchItemsFromExcelRows(data, discountThreshold);
                setBatchItems(items);
                setActiveSubTab('data');
                if (items.length > 0) {
                    const first = items[0];
                    setPreviewName(first.name);
                    setPreviewOldPrice(first.oldPrice);
                    setPreviewNewPrice(first.newPrice);
                    setBarcodeImei(first.imei);
                } else {
                    // BUG FIX: file rỗng/sai định dạng cột trước đây không báo gì — người dùng
                    // không biết upload có thành công hay không (parseBatchItemsFromExcelRows
                    // âm thầm trả về [] nếu không khớp cấu trúc cột cố định của file "giá ĐSD - TBBM").
                    toast.error("Không tìm thấy dữ liệu hợp lệ trong file. Kiểm tra lại đúng định dạng file giá ĐSD - TBBM.");
                }
            } catch (err) {
                toast.error("Lỗi đọc file Excel");
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const downloadTemplate = () => downloadStickerTemplate(stickerType);

    const loadPageToEditor = (page: StickerPage) => {
        if (page.label) setPreviewName(page.label);
        if (page.oldPrice) setPreviewOldPrice(page.oldPrice);
        if (page.code) setBarcodeImei(page.code);
        if (page.header != null) setHeaderTextContent(page.header);
        if (page.footer != null) setFooterTextContent(page.footer);
        if (page.subHeader != null) setSubHeaderTextContent(page.subHeader);

        const { newPrice } = resolvePagePrices(page, priceSource);
        setPreviewNewPrice(newPrice);

        if (!page.label && page.html) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = page.html;
            const sticker = tempDiv.querySelector('.sticker-container') as HTMLElement;
            if (sticker) {
                const headerText = sticker.querySelector('.header-text')?.textContent || headerTextContent;
                const nameText = sticker.querySelector('.name')?.textContent || '';
                const oldPriceText = sticker.querySelector('.old')?.textContent || '';
                const newPriceText = sticker.querySelector('.extra2 span')?.textContent || sticker.querySelector('.extra2')?.textContent || '';
                const footerText = sticker.querySelector('.footer-text')?.textContent || footerTextContent;
                const subHeader = sticker.querySelector('.sub-header')?.textContent || subHeaderTextContent;

                setHeaderTextContent(headerText);
                setSubHeaderTextContent(subHeader);
                setFooterTextContent(footerText);
                setPreviewOldPrice(oldPriceText);
                setPreviewNewPrice(newPriceText);

                const barcodeImg = sticker.querySelector('.barcode img');
                const barcodeVal = barcodeImg?.getAttribute('alt') || '';
                if (barcodeVal) {
                    setBarcodeImei(barcodeVal);
                }
                setPreviewName(nameText);
            }
        }
        setBatchItems([]);
    };

    const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const XLSX = await import('xlsx');
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                const parsed = parseTemplateExcelData(data, {
                    stickerType, bgImage, headerTextContent, subHeaderTextContent, footerTextContent, discountThreshold,
                });
                if (parsed.error) {
                    toast.error(parsed.error);
                    return;
                }
                const { pages: newPages, headerTextContent: thoiGian, subHeaderTextContent: soLuong, footerTextContent: khuyenMai } = parsed;
                if (thoiGian !== headerTextContent) setHeaderTextContent(thoiGian);
                if (soLuong !== subHeaderTextContent) setSubHeaderTextContent(soLuong);
                if (khuyenMai !== footerTextContent) setFooterTextContent(khuyenMai);

                setManualPages(prev => [...prev, ...newPages]);
                setActiveSubTab('queue');
                if (newPages.length > 0) {
                    loadPageToEditor(newPages[0]);
                }
                toast.success(`Đã thêm ${newPages.length} sticker vào hàng đợi in`);
            } catch (err) {
                toast.error('Lỗi đọc file Excel');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const handleErpPriceUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'purifier' | 'appliance') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const XLSX = await import('xlsx');
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                const parsed = parseErpPriceExcelData(data, {
                    type, priceSource, stickerType, bgImage, discountThreshold,
                });
                if (parsed.error) {
                    toast.error(parsed.error);
                    return;
                }

                const newPages = parsed.pages;
                setManualPages(prev => [...prev, ...newPages]);
                setActiveSubTab('queue');
                if (newPages.length > 0) {
                    loadPageToEditor(newPages[0]);
                }
                toast.success(`Đã thêm ${newPages.length} sticker vào hàng đợi in`);
            } catch (err) {
                console.error(err);
                toast.error('Lỗi đọc file Excel ERP');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const toggleItemSelection = (id: string) => {
        setBatchItems(prev => prev.map(it => it.id === id ? { ...it, selected: !it.selected } : it));
    };

    const toggleAllSelection = (select: boolean) => {
        setBatchItems(prev => prev.map(it => ({ ...it, selected: select })));
    };

    const addCurrentPage = () => {
        const printSection = document.getElementById('print-section');
        if (!printSection) return;
        const firstSticker = printSection.querySelector('.sticker-container') as HTMLElement;
        if (!firstSticker) return;
        const label = firstSticker.querySelector('.name')?.textContent || 'Sticker';
        const oldPrice = firstSticker.querySelector('.old')?.textContent || '';
        const newPrice = firstSticker.querySelector('.extra2')?.textContent || '';
        const percent = firstSticker.querySelector('.extra1')?.textContent || '';
        const cleanInput = discountThreshold.replace(/[^0-9]/g, '');
        const limit = parseInt(cleanInput, 10);
        const isSelected = isNaN(limit) ? true : parsePercentValue(percent) >= limit;

        const page: StickerPage = {
            id: `page_${Date.now()}`,
            html: firstSticker.outerHTML,
            label: label.substring(0, 50),
            oldPrice,
            newPrice,
            percent,
            timestamp: Date.now(),
            code: barcodeImei,
            selected: isSelected,
            salePrice: newPrice,
            header: headerTextContent,
            footer: footerTextContent,
            subHeader: subHeaderTextContent,
        };
        setManualPages(prev => [...prev, page]);
    };

    const removeManualPage = (id: string) => {
        setManualPages(prev => prev.filter(p => p.id !== id));
        if (activeQueuePageId === id) {
            setActiveQueuePageId(null);
        }
    };

    const clearManualPages = () => {
        setManualPages([]);
        setActiveQueuePageId(null);
    };

    const togglePageSelection = (id: string) => {
        setManualPages(prev => prev.map(p => p.id === id ? { ...p, selected: p.selected === false ? true : false } : p));
    };

    const toggleAllPagesSelection = (select: boolean) => {
        setManualPages(prev => prev.map(p => ({ ...p, selected: select })));
    };

    const saveCurrentList = () => {
        if (manualPages.length === 0) return;
        setIsSaveListModalOpen(true);
    };

    const handleSaveCurrentList = async (name: string) => {
        // BUG FIX: trước đây ID cục bộ (`list_${Date.now()}`) và ID Firestore (auto-gen của
        // saveListToFirestore) là 2 ID KHÁC NHAU cho cùng 1 danh sách — kết quả trả về của
        // saveListToFirestore() bị bỏ qua, không lưu lại. Hậu quả: deleteSavedList() không có cách
        // nào biết ID Firestore thật để xóa (chỉ xóa được cục bộ), danh sách "xóa" xong vẫn tái xuất
        // hiện sau lần đồng bộ Cloud kế tiếp. Lấy ID Firestore thật (nếu lưu cloud thành công) và
        // dùng luôn ID đó cho bản ghi cục bộ, kèm storeId để xóa đúng chỗ sau này.
        const currentUser = auth.currentUser;
        let cloudId: string | null = null;
        let targetStoreId = '';

        if (currentUser) {
            try {
                const cachedData = sessionStorage.getItem(`userData_${currentUser.uid}`);
                let storeId = '';
                let username = currentUser.uid;
                if (cachedData) {
                    try {
                        const parsed = JSON.parse(cachedData);
                        if (parsed.storeId) storeId = parsed.storeId;
                        if (parsed.username) username = parsed.username;
                    } catch {
                        // Cache hỏng/không phải JSON → dùng giá trị mặc định phía trên. CÓ CHỦ Ý
                        // không chặn luồng: đây chỉ là cache tăng tốc, thiếu thì đọc lại từ server.
                    }
                }
                // BUG FIX: đã bỏ fallback đọc 'cached_dept_id'/'cached_emp_name' — 2 khoá này
                // thuộc app gốc (contexts/AuthContext.tsx), vô tình trùng IndexedDB với
                // sticker-event nên đọc nhầm dữ liệu của nhau (xem giải thích chi tiết tại
                // StickerEventApp.tsx#onConfirmSaveList), khiến storeId lúc lưu có thể khác lúc
                // tải lại, làm danh sách vừa lưu không hiện ra trong "DS đã lưu".
                targetStoreId = storeId || 'SUPERADMIN';
                const itemsToSave = manualPages.map(p => ({
                    msp: p.code || p.id,
                    sanPham: p.label,
                    giaGoc: p.oldPrice,
                    giaGiam: p.newPrice,
                    khuyenMai: p.percent,
                    quantity: 1,
                    header: p.header,
                    subHeader: p.subHeader,
                    footer: p.footer,
                    discountDisplayMode: p.discountDisplayMode,
                }));
                cloudId = await saveListToFirestore(targetStoreId, username, name, itemsToSave, {
                    stickerType,
                    headerTextContent,
                    pages: manualPages,
                });
            } catch (err) {
                console.error("[Cloud Sync] Error saving list to Firestore:", err);
            }
        }

        const list: SavedStickerList = {
            id: cloudId || `list_${Date.now()}`,
            name,
            pages: manualPages,
            timestamp: Date.now(),
            stickerType,
            headerTextContent,
            storeId: cloudId ? targetStoreId : undefined,
        };

        setSavedLists(prev => {
            const next = [list, ...prev].slice(0, 50);
            saveSetting(STICKER_SAVED_LISTS_KEY, next).catch(() => {});
            return next;
        });

        setIsSaveListModalOpen(false);
        toast.success(`Đã lưu danh sách "${name}" thành công!`);
    };

    const toggleShowSavedLists = useCallback(async () => {
        const nextState = !showSavedLists;
        setShowSavedLists(nextState);
        if (nextState && auth.currentUser) {
            try {
                const currentUser = auth.currentUser;
                const cachedData = sessionStorage.getItem(`userData_${currentUser.uid}`);
                let storeId = '';
                let isAdmin = false;
                let username = currentUser.uid;
                if (cachedData) {
                    try {
                        const parsed = JSON.parse(cachedData);
                        if (parsed.storeId) storeId = parsed.storeId;
                        if (parsed.username) username = parsed.username;
                        if (parsed.role === 'admin' || parsed.role === 'superadmin') isAdmin = true;
                    } catch {
                        // Cache hỏng → giữ mặc định (isAdmin = false, tức quyền THẤP NHẤT). Cố ý
                        // không nâng quyền khi không đọc được cache.
                    }
                }
                // BUG FIX: đã bỏ fallback đọc 'cached_dept_id'/'cached_emp_name' — 2 khoá này
                // thuộc app gốc (contexts/AuthContext.tsx), vô tình trùng IndexedDB với
                // sticker-event nên đọc nhầm dữ liệu của nhau (xem giải thích chi tiết tại
                // StickerEventApp.tsx#onConfirmSaveList), khiến storeId lúc lưu có thể khác lúc
                // tải lại, làm danh sách vừa lưu không hiện ra trong "DS đã lưu".
                const targetStoreId = storeId || 'SUPERADMIN';
                // Nếu là Admin/Quản lý: LẤY TOÀN BỘ DANH SÁCH DO CẢ NHÂN VIÊN VÀ ADMIN TẠO (truyền undefined cho userId)
                const cloudLists = await fetchSavedListsFromFirestore(targetStoreId, isAdmin ? undefined : username);
                if (cloudLists.length > 0) {
                    const formattedLists: SavedStickerList[] = cloudLists.map((c: any) => {
                        let pages: StickerPage[] = [];
                        if (c.stickerMeta?.pages) {
                            pages = c.stickerMeta.pages;
                        } else if (Array.isArray(c.items)) {
                            pages = c.items.map((item: any, idx: number) => ({
                                id: item.msp || `page_${idx}`,
                                label: item.sanPham || item.name || 'Sản phẩm',
                                oldPrice: item.giaGoc || '',
                                newPrice: item.giaGiam || '',
                                percent: item.khuyenMai || '',
                                timestamp: Date.now(),
                                code: item.msp || '',
                                header: item.header,
                                subHeader: item.subHeader,
                                footer: item.footer,
                                discountDisplayMode: item.discountDisplayMode,
                                html: ''
                            }));
                        }
                        return {
                            id: c.id,
                            name: c.userId ? `${c.name} (${c.userId})` : c.name,
                            pages,
                            timestamp: new Date(c.createdAt).getTime() || Date.now(),
                            stickerType: c.stickerMeta?.stickerType || 'gia_soc',
                            headerTextContent: c.stickerMeta?.headerTextContent || '',
                            storeId: c.storeId || targetStoreId,
                        };
                    });
                    
                    // Merge Cloud lists với Local lists hiện tại để không làm mất danh sách vừa tạo
                    setSavedLists(prev => {
                        const merged = [...formattedLists, ...prev];
                        const uniqueMap = new Map<string, SavedStickerList>();
                        merged.forEach(item => uniqueMap.set(item.id, item));
                        const result = Array.from(uniqueMap.values()).sort((a, b) => b.timestamp - a.timestamp);
                        saveSetting(STICKER_SAVED_LISTS_KEY, result).catch(() => {});
                        return result;
                    });
                }
            } catch (err) {
                console.error("[Cloud Sync] Error fetching saved lists from Firestore:", err);
            }
        }
    }, [showSavedLists]);

    const loadSavedList = (list: SavedStickerList) => {
        setManualPages(list.pages);
        if (list.stickerType) setStickerType(list.stickerType);
        if (list.headerTextContent) setHeaderTextContent(list.headerTextContent);
        setShowSavedLists(false);
        setActiveQueuePageId(null);
    };

    const deleteSavedList = async (list: SavedStickerList) => {
        // BUG FIX: trước đây chỉ xóa khỏi state cục bộ/IndexedDB, KHÔNG gọi Firestore — danh sách
        // "xóa" xong vẫn còn nguyên trên Cloud nên tái xuất hiện ngay sau lần Đồng bộ Cloud kế tiếp
        // (toggleShowSavedLists gộp lại từ server). Chỉ xóa được Firestore khi có storeId (danh sách
        // đã đồng bộ cloud thành công lúc lưu) — danh sách thuần cục bộ (chưa đăng nhập lúc lưu) thì
        // storeId rỗng, chỉ xóa cục bộ như cũ.
        if (list.storeId) {
            try {
                await deleteSavedListFromFirestore(list.storeId, list.id);
            } catch (err) {
                console.error("[Cloud Sync] Error deleting list from Firestore:", err);
                toast.error('Không thể xóa danh sách trên Cloud. Vui lòng thử lại.');
                return;
            }
        }
        setSavedLists(prev => {
            const next = prev.filter(l => l.id !== list.id);
            saveSetting(STICKER_SAVED_LISTS_KEY, next).catch(() => {});
            return next;
        });
    };

    const restoreHistory = (entry: PrintHistoryEntry) => {
        setStickerType(entry.stickerType);
        setBgImage(entry.bgImage);
        setHeaderTextSize(entry.headerTextSize);
        if (entry.subHeaderTextSize != null) setSubHeaderTextSize(entry.subHeaderTextSize);
        if (entry.percentTextSize != null) setPercentTextSize(entry.percentTextSize);
        if (entry.oldPriceTextSize != null) setOldPriceTextSize(entry.oldPriceTextSize);
        if (entry.nameTextSize != null) setNameTextSize(entry.nameTextSize);
        if (entry.newPriceTextSize != null) setNewPriceTextSize(entry.newPriceTextSize);
        if (entry.footerTextSize != null) setFooterTextSize(entry.footerTextSize);
        setBatchItems(entry.batchItems);
        setHeaderTextContent(entry.headerTextContent);
        setSubHeaderTextContent(entry.subHeaderTextContent);
        setFooterTextContent(entry.footerTextContent);
        setShowBarcode(entry.showBarcode);
        setManualPages(entry.manualPages || []);
        if (entry.discountDisplayMode) setDiscountDisplayMode(entry.discountDisplayMode);
        setShowHistory(false);
        setActiveQueuePageId(null);

        // Khôi phục drawTickets & draw font sizes khi restore entry mặc định
        if (entry.id === DEFAULT_HISTORY_ID) {
            setDrawTickets([
                { ...DEFAULT_DRAW_TICKET_TEMPLATE, id: '1', code: '1' },
                { ...DEFAULT_DRAW_TICKET_TEMPLATE, id: '2', code: '2' },
                { ...DEFAULT_DRAW_TICKET_TEMPLATE, id: '3', code: '3' },
                { ...DEFAULT_DRAW_TICKET_TEMPLATE, id: '4', code: '4' },
            ]);
            setDrawStartNumber(1);
            setDrawTotalTickets(4000);
            setDrawAutoIncrement(true);
            setDrawContentBottomLeftSize(1.7);
            if (entry.drawContentTopLeftSize != null) setDrawContentTopLeftSize(entry.drawContentTopLeftSize);
            if (entry.drawContentTopRightSize != null) setDrawContentTopRightSize(entry.drawContentTopRightSize);
            if (entry.drawContentBottomRightSize != null) setDrawContentBottomRightSize(entry.drawContentBottomRightSize);
            if (entry.drawTitleSize != null) setDrawTitleSize(entry.drawTitleSize);
            if (entry.drawCodeSize != null) setDrawCodeSize(entry.drawCodeSize);
            if (entry.drawFooterSize != null) setDrawFooterSize(entry.drawFooterSize);
            toast.success('Đã khôi phục phiếu mẫu mặc định!');
        }
    };

    const deleteHistory = (id: string) => {
        // Không cho xoá entry mặc định
        if (id === DEFAULT_HISTORY_ID) return;
        setPrintHistory(prev => {
            const next = prev.filter(h => h.id !== id);
            saveSetting(STICKER_HISTORY_KEY, next).catch(() => {});
            return next;
        });
    };

    const handleReset = () => {
        setBatchItems([]);
        setSearchTerm('');
        setHeaderTextContent('HÀNG TRƯNG BÀY');
        setFooterTextContent('Khuyến mãi áp dụng đến hết ngày 3/5/2026');
        setHeaderTextSize(8);
        setActiveQueuePageId(null);
        // Khi reset ở chế độ draw, khôi phục phiếu mẫu mặc định
        if (stickerType === 'draw') {
            setDrawTickets([
                { ...DEFAULT_DRAW_TICKET_TEMPLATE, id: '1', code: '1' },
                { ...DEFAULT_DRAW_TICKET_TEMPLATE, id: '2', code: '2' },
                { ...DEFAULT_DRAW_TICKET_TEMPLATE, id: '3', code: '3' },
                { ...DEFAULT_DRAW_TICKET_TEMPLATE, id: '4', code: '4' },
            ]);
            setDrawStartNumber(1);
            setDrawTotalTickets(4000);
            setDrawAutoIncrement(true);
            setDrawContentBottomLeftSize(1.7);
        }
    };

    const handlePrint = () => {
        if (stickerType === 'draw') {
            const totalPages = Math.ceil((drawTickets?.length || 0) / 4);
            if (totalPages === 0) {
                toast.error("Không có phiếu rút thăm nào để in!");
                return;
            }

            const printHost = document.createElement('div');
            printHost.id = 'print-host';
            
            printHost.innerHTML = `
                <style>
                    #print-host .header-text { font-size: ${headerTextSize}cqi !important; }
                    #print-host .sub-header { font-size: ${subHeaderTextSize}cqi !important; }
                    #print-host .extra1 { font-size: ${percentTextSize}cqi !important; }
                    #print-host .old { font-size: ${oldPriceTextSize}cqi !important; }
                    #print-host .name { font-size: ${nameTextSize}cqi !important; }
                    #print-host .extra2 { font-size: ${newPriceTextSize}cqi !important; }
                    #print-host .footer-text { font-size: ${footerTextSize}cqi !important; }
                    #print-host .sticker-container {
                        outline: none !important;
                    }
                    ${getStickerPreviewStyles({
                        stickerType,
                        bgImage,
                        headerTextSize,
                        subHeaderTextSize,
                        percentTextSize,
                        oldPriceTextSize,
                        nameTextSize,
                        newPriceTextSize,
                        footerTextSize
                    })}
                </style>
            `;

            // Sinh HTML cho tất cả trang từ data (preview chỉ render 1 trang)
            const allPagesHtml = generateDrawPagesHtml({
                drawTickets,
                bgImage,
                drawTitleSize: drawTitleSize,
                drawCodeSize: drawCodeSize,
                drawFooterSize: drawFooterSize,
                drawContentTopLeftSize: drawContentTopLeftSize,
                drawContentTopRightSize: drawContentTopRightSize,
                drawContentBottomLeftSize: drawContentBottomLeftSize,
                drawContentBottomRightSize: drawContentBottomRightSize,
                isAutoIncrement: drawAutoIncrement,
            });
            printHost.insertAdjacentHTML('beforeend', allPagesHtml);

            document.body.appendChild(printHost);

            const root = document.getElementById('root');
            if (root) root.style.display = 'none';

            const historyEntry: PrintHistoryEntry = {
                id: `history_${Date.now()}`,
                timestamp: Date.now(),
                label: 'Phiếu Rút Thăm',
                pageCount: totalPages,
                stickerType,
                bgImage,
                headerTextSize,
                subHeaderTextSize,
                percentTextSize,
                oldPriceTextSize,
                nameTextSize,
                newPriceTextSize,
                footerTextSize,
                batchItems: [],
                headerTextContent,
                subHeaderTextContent,
                footerTextContent,
                showBarcode,
                manualPages: [],
                discountDisplayMode,
            };

            setPrintHistory(prev => {
                const dupIdx = prev.findIndex(entry => isHistoryDuplicate(entry, historyEntry));
                let next;
                if (dupIdx !== -1) {
                    const matched = { ...prev[dupIdx], timestamp: Date.now() };
                    const filtered = prev.filter((_, idx) => idx !== dupIdx);
                    next = [matched, ...filtered];
                } else {
                    next = [historyEntry, ...prev];
                }
                const sliced = next.slice(0, 20);
                saveSetting(STICKER_HISTORY_KEY, sliced).catch(() => {});
                return sliced;
            });

            setTimeout(() => {
                window.print();
                if (root) root.style.display = '';
                document.body.removeChild(printHost);
            }, 200);

            return;
        }

        const previewPageCount = batchItems.length > 0 ? batchItems.filter(i => i.selected).length : (manualPages.length === 0 ? 1 : 0);
        const selectedManualPages = manualPages.filter(p => p.selected !== false);
        const totalPages = previewPageCount + selectedManualPages.length;

        if (totalPages === 0) {
            toast.error("Không có trang nào để in!");
            return;
        }

        const printHost = document.createElement('div');
        printHost.id = 'print-host';
        
        printHost.innerHTML = `
            <style>
                #print-host .header-text { font-size: ${headerTextSize}cqi !important; }
                #print-host .sub-header { font-size: ${subHeaderTextSize}cqi !important; }
                #print-host .extra1 { font-size: ${percentTextSize}cqi !important; }
                #print-host .old { font-size: ${oldPriceTextSize}cqi !important; }
                #print-host .name { font-size: ${nameTextSize}cqi !important; }
                #print-host .extra2 { font-size: ${newPriceTextSize}cqi !important; }
                #print-host .footer-text { font-size: ${footerTextSize}cqi !important; }
                #print-host .sticker-container {
                    outline: 1.5px dashed #6366f1;
                    outline-offset: 1px;
                }
            </style>
        `;

        if (batchItems.length > 0) {
            const selectedBatchItems = batchItems.filter(i => i.selected);
            selectedBatchItems.forEach(item => {
                const tempPage: StickerPage = {
                    id: item.id,
                    html: '',
                    label: item.name,
                    oldPrice: item.oldPrice,
                    newPrice: item.newPrice,
                    percent: item.percent,
                    timestamp: Date.now(),
                    code: showBarcode ? item.imei : undefined,
                    header: headerTextContent,
                    subHeader: subHeaderTextContent,
                    footer: footerTextContent,
                };
                printHost.insertAdjacentHTML('beforeend', generatePageHtml(tempPage, priceSource, stickerType, bgImage, discountDisplayMode));
            });
        } else if (manualPages.length === 0) {
            const printSection = document.getElementById('print-section');
            if (printSection) {
                printHost.insertAdjacentHTML('beforeend', printSection.innerHTML);
            }
        }

        selectedManualPages.forEach(page => {
            let finalHeader = page.header || '';
            let finalSubHeader = page.subHeader || '';
            let finalFooter = page.footer || '';

            if (stickerType === 'gio_vang') {
                const isGiaSocHeader = !finalHeader || finalHeader === 'SẢN PHẨM GIÁ SỐC' || finalHeader === 'QUẠT ĐIỀU HOÀ' || !finalHeader.toUpperCase().startsWith('TỪ');
                if (isGiaSocHeader) {
                    finalHeader = headerTextContent;
                }
                if (!finalSubHeader || !finalSubHeader.toUpperCase().includes('SUẤT')) {
                    finalSubHeader = subHeaderTextContent;
                }
            } else if (stickerType === 'gia_soc') {
                const isGioVangHeader = finalHeader && (finalHeader.toUpperCase().startsWith('TỪ') || finalHeader.includes('/'));
                if (isGioVangHeader) {
                    finalHeader = headerTextContent;
                }
            }

            const tempPage: StickerPage = {
                ...page,
                header: finalHeader,
                subHeader: finalSubHeader,
                footer: finalFooter || footerTextContent
            };
            printHost.insertAdjacentHTML('beforeend', generatePageHtml(tempPage, priceSource, stickerType, bgImage, discountDisplayMode));
        });

        document.body.appendChild(printHost);

        const root = document.getElementById('root');
        if (root) root.style.display = 'none';

        const historyEntry: PrintHistoryEntry = {
            id: `history_${Date.now()}`,
            timestamp: Date.now(),
            label: headerTextContent || 'Sticker',
            pageCount: totalPages,
            stickerType,
            bgImage,
            headerTextSize,
            subHeaderTextSize,
            percentTextSize,
            oldPriceTextSize,
            nameTextSize,
            newPriceTextSize,
            footerTextSize,
            batchItems,
            headerTextContent,
            subHeaderTextContent,
            footerTextContent,
            showBarcode,
            manualPages,
            discountDisplayMode,
        };
        setPrintHistory(prev => {
            const dupIdx = prev.findIndex(entry => isHistoryDuplicate(entry, historyEntry));
            let next;
            if (dupIdx !== -1) {
                const matched = { ...prev[dupIdx], timestamp: Date.now() };
                const filtered = prev.filter((_, idx) => idx !== dupIdx);
                next = [matched, ...filtered];
            } else {
                next = [historyEntry, ...prev];
            }
            const sliced = next.slice(0, 20);
            saveSetting(STICKER_HISTORY_KEY, sliced).catch(() => {});
            return sliced;
        });

        setTimeout(() => {
            window.print();
            if (root) root.style.display = '';
            document.body.removeChild(printHost);
        }, 200);
    };

    const [activeDrawPage, setActiveDrawPage] = useState(0);
    const totalDrawPages = useMemo(() => Math.ceil((drawTickets?.length || 0) / 4), [drawTickets?.length]);

    return {
        stickerMode, setStickerMode,
        eventEverOpened, setEventEverOpened,
        stickerType, setStickerType,
        bgImage, setBgImage,
        priceSource, setPriceSource,
        drawTickets, setDrawTickets,
        drawStartNumber, setDrawStartNumber,
        drawTotalTickets, setDrawTotalTickets,
        drawAutoIncrement, setDrawAutoIncrement,
        drawContentTopLeftSize, setDrawContentTopLeftSize,
        drawContentTopRightSize, setDrawContentTopRightSize,
        drawContentBottomLeftSize, setDrawContentBottomLeftSize,
        drawContentBottomRightSize, setDrawContentBottomRightSize,
        drawTitleSize, setDrawTitleSize,
        drawCodeSize, setDrawCodeSize,
        drawFooterSize, setDrawFooterSize,
        activeField, setActiveField,
        headerTextSize, setHeaderTextSize,
        subHeaderTextSize, setSubHeaderTextSize,
        percentTextSize, setPercentTextSize,
        oldPriceTextSize, setOldPriceTextSize,
        nameTextSize, setNameTextSize,
        newPriceTextSize, setNewPriceTextSize,
        footerTextSize, setFooterTextSize,
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
        printHistory, setPrintHistory,
        showHistory, setShowHistory,
        savedLists, setSavedLists,
        showSavedLists, setShowSavedLists: toggleShowSavedLists,
        previewName, setPreviewName,
        previewOldPrice, setPreviewOldPrice,
        previewNewPrice, setPreviewNewPrice,
        isLoaded, setIsLoaded,
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
    };
}
