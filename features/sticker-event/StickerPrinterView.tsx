import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Package } from 'lucide-react';
import { useActiveTab } from '../../contexts/LayoutContext';
import { saveSetting, getSetting } from './services/dbService';
import toast from 'react-hot-toast';

import { StickerPage, SavedStickerList, PrintHistoryEntry, BatchItem, TicketDrawData } from './stickerprinter/types';
import { StickerPrintPreview } from './stickerprinter/StickerPrintPreview';
import { StickerManualQueue } from './stickerprinter/StickerManualQueue';
import { StickerPrintControls } from './stickerprinter/StickerPrintControls';
import { Button } from '../../components/shared/ui/Button';
import { generateBarcodeDataUrl } from '../../components/views/BarcodeCanvas';
import { useAuth } from '../../contexts/AuthContext';



import ErrorBoundary from '../../components/common/ErrorBoundary';

const StickerEventApp = lazy(() => import('./StickerEventApp'));
import SaveListModal from './SaveListModal';

const STICKER_DB_KEY = 'stickerPrinterState';
const STICKER_HISTORY_KEY = 'stickerPrintHistory';
const STICKER_SAVED_LISTS_KEY = 'stickerSavedLists';

const cleanWaterPurifierName = (nameStr: string): string => {
    if (!nameStr) return '';
    let cleaned = nameStr;
    cleaned = cleaned.replace(/Máy lọc nước/gi, 'MLN');
    const removeSubstrings = [
        'RO nóng lạnh tủ đứng',
        '\\(IMEI\\)',
        'nước nóng lạnh',
        'RO âm tủ',
        'RO tủ đứng',
        'điện giải nóng nguội',
        'nóng lạnh RO',
        'RO nóng nguội lạnh tủ đứng'
    ];
    for (const sub of removeSubstrings) {
        const regex = new RegExp(sub, 'gi');
        cleaned = cleaned.replace(regex, '');
    }
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
};

const resolvePagePrices = (page: StickerPage, priceSource: 'sale' | 'service') => {
    let newPrice = page.newPrice;
    let percent = page.percent;

    if (priceSource === 'service' && page.servicePrice) {
        newPrice = page.servicePrice;
        if (page.oldPrice && page.servicePrice) {
            const oldVal = Number(page.oldPrice.replace(/\D/g, ''));
            let newVal = Number(page.servicePrice.replace(/\D/g, ''));
            if (oldVal > 0 && newVal > 0) {
                if (newVal * 1000 <= oldVal * 1.5 && newVal < oldVal) {
                    newVal = newVal * 1000;
                }
                const ratio = Math.round((newVal / oldVal - 1) * 100);
                percent = ratio < 0 ? `${ratio}%` : '';
            }
        }
    } else if (page.salePrice) {
        newPrice = page.salePrice;
        if (page.oldPrice && page.salePrice) {
            const oldVal = Number(page.oldPrice.replace(/\D/g, ''));
            let newVal = Number(page.salePrice.replace(/\D/g, ''));
            if (oldVal > 0 && newVal > 0) {
                if (newVal * 1000 <= oldVal * 1.5 && newVal < oldVal) {
                    newVal = newVal * 1000;
                }
                const ratio = Math.round((newVal / oldVal - 1) * 100);
                percent = ratio < 0 ? `${ratio}%` : '';
            }
        }
    }
    return { newPrice, percent };
};

const generatePageHtml = (
    page: StickerPage, 
    priceSource: 'sale' | 'service', 
    stickerType: 'gia_soc' | 'gio_vang' | 'draw',
    bgImage: string,
    discountDisplayMode: 'percent' | 'amount' = 'percent'
) => {
    if (stickerType === 'draw') {
        return `<div class="sticker-container" data-type="${stickerType}" style="background-image:url('${bgImage}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:2482/3512;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;"></div>`;
    }

    let { newPrice, percent } = resolvePagePrices(page, priceSource);
    
    // Fallback parsing for header, subHeader, and footer from page.html
    let header = page.header;
    let subHeader = page.subHeader;
    let footer = page.footer;
    
    if (page.html && (!header || !subHeader || !footer)) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(page.html, 'text/html');
            const headerEl = doc.querySelector('.header-text');
            const subHeaderEl = doc.querySelector('.sub-header');
            const footerEl = doc.querySelector('.footer-text');
            
            if (header === undefined && headerEl) header = headerEl.textContent || '';
            if (subHeader === undefined && subHeaderEl) subHeader = subHeaderEl.textContent || '';
            if (footer === undefined && footerEl) footer = footerEl.textContent || '';
        } catch (e) {
            console.error('Error parsing fallback fields from page.html:', e);
        }
    }
    
    let barcodeHtml = '';
    if (page.code) {
        try {
            const url = generateBarcodeDataUrl(page.code);
            barcodeHtml = `<div class="barcode"><img src="${url}" style="image-rendering:pixelated;width:100%;height:100%;object-fit:fill" alt="${page.code}" /></div>`;
        } catch (e) {
            console.error('Barcode error:', e);
        }
    }

    const subHeaderHtml = stickerType === 'gio_vang' 
        ? `<div class="sub-header">${subHeader || ''}</div>` : '';
    
    const priceHtml = `<div class="extra2">${newPrice}</div>`;

    if (discountDisplayMode === 'amount') {
        const oldVal = Number(String(page.oldPrice).replace(/\D/g, ''));
        let newVal = Number(String(newPrice).replace(/\D/g, ''));
        if (oldVal > 0 && newVal > 0) {
            if (newVal * 1000 <= oldVal * 1.5 && newVal < oldVal) {
                newVal = newVal * 1000;
            }
            const diff = oldVal - newVal;
            if (diff > 0) {
                percent = `-${(diff/1000).toLocaleString('vi-VN')}K`;
            }
        }
    }

    return `<div class="sticker-container" data-type="${stickerType}" style="background-image:url('${bgImage}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:197/285;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;">
        ${barcodeHtml}
        <div class="header-text">${header || ''}</div>
        ${subHeaderHtml}
        <div class="extra1">${percent}</div>
        <div class="old">${page.oldPrice}</div>
        <div class="name">${page.label}</div>
        ${priceHtml}
        <div class="footer-text">${footer || ''}</div>
    </div>`;
};

const isHistoryDuplicate = (a: PrintHistoryEntry, b: PrintHistoryEntry): boolean => {
    if (a.stickerType !== b.stickerType) return false;
    if (a.headerTextContent !== b.headerTextContent) return false;
    if (a.subHeaderTextContent !== b.subHeaderTextContent) return false;
    if (a.footerTextContent !== b.footerTextContent) return false;
    if (a.showBarcode !== b.showBarcode) return false;
    if (a.discountDisplayMode !== b.discountDisplayMode) return false;
    if (a.pageCount !== b.pageCount) return false;

    // Compare batchItems (exact content fields)
    if (a.batchItems.length !== b.batchItems.length) return false;
    for (let i = 0; i < a.batchItems.length; i++) {
        const itemA = a.batchItems[i];
        const itemB = b.batchItems[i];
        if (itemA.name !== itemB.name ||
            itemA.oldPrice !== itemB.oldPrice ||
            itemA.newPrice !== itemB.newPrice ||
            itemA.percent !== itemB.percent ||
            itemA.imei !== itemB.imei ||
            itemA.selected !== itemB.selected) {
            return false;
        }
    }

    // Compare manualPages (exact content fields)
    if (a.manualPages.length !== b.manualPages.length) return false;
    for (let i = 0; i < a.manualPages.length; i++) {
        const pA = a.manualPages[i];
        const pB = b.manualPages[i];
        if (pA.label !== pB.label ||
            pA.oldPrice !== pB.oldPrice ||
            pA.newPrice !== pB.newPrice ||
            pA.percent !== pB.percent ||
            pA.code !== pB.code ||
            pA.header !== pB.header ||
            pA.subHeader !== pB.subHeader ||
            pA.footer !== pB.footer ||
            pA.selected !== pB.selected) {
            return false;
        }
    }

    return true;
};

export default function StickerPrinterView() {
    const { activeTab } = useActiveTab();
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [stickerMode, setStickerMode] = useState<'sticker' | 'event'>('sticker');
    const [eventEverOpened, setEventEverOpened] = useState(false);
    const [stickerType, setStickerType] = useState<'gia_soc' | 'gio_vang' | 'draw'>('gia_soc');
    const [bgImage, setBgImage] = useState('/frame/X24_NEW.png');
    const [priceSource, setPriceSource] = useState<'sale' | 'service'>('sale');
    
    // Ticket draw state
    const [drawTickets, setDrawTickets] = useState<TicketDrawData[]>([
        { id: '1', title: '', code: '1', footer: '', contentTop: '', contentTopRight: '', contentBottom: '', contentBottomRight: '' },
        { id: '2', title: '', code: '2', footer: '', contentTop: '', contentTopRight: '', contentBottom: '', contentBottomRight: '' },
        { id: '3', title: '', code: '3', footer: '', contentTop: '', contentTopRight: '', contentBottom: '', contentBottomRight: '' },
        { id: '4', title: '', code: '4', footer: '', contentTop: '', contentTopRight: '', contentBottom: '', contentBottomRight: '' },
    ]);
    const [drawStartNumber, setDrawStartNumber] = useState<number>(1);
    const [drawTotalTickets, setDrawTotalTickets] = useState<number>(4);
    const [drawAutoIncrement, setDrawAutoIncrement] = useState<boolean>(true);



    const [drawContentTopLeftSize, setDrawContentTopLeftSize] = useState(3.5);
    const [drawContentTopRightSize, setDrawContentTopRightSize] = useState(3.5);
    const [drawContentBottomLeftSize, setDrawContentBottomLeftSize] = useState(2.2);
    const [drawContentBottomRightSize, setDrawContentBottomRightSize] = useState(2.2);
    const [drawTitleSize, setDrawTitleSize] = useState(2.5);
    const [drawCodeSize, setDrawCodeSize] = useState(3.8);
    const [drawFooterSize, setDrawFooterSize] = useState(3.8);
    
    // Dynamic Font Sizes and Active Field Trackers
    const [activeField, setActiveField] = useState<string>('header');
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

    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const updateBatchItem = (id: string, updates: Partial<BatchItem>) => {
        setBatchItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
    };
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
    const [showSavedLists, setShowSavedLists] = useState(false);
    const [previewName, setPreviewName] = useState('Quạt điều hoà Daikiosan DMI03');
    const [previewOldPrice, setPreviewOldPrice] = useState('5.490.000');
    const [previewNewPrice, setPreviewNewPrice] = useState('3.490');

    const [isLoaded, setIsLoaded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isSaveListModalOpen, setIsSaveListModalOpen] = useState(false);

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

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

    // Set mounted state and preload StickerEventApp
    useEffect(() => {
        setMounted(true);
        
        // Read initial sub tab from URL
        const urlParams = new URLSearchParams(window.location.search);
        let sub = urlParams.get('sub');
        if (!sub) {
            sub = 'event';
            updateSubQueryParam('event');
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
        } else if (sub === 'event') {
            setStickerMode('event');
            setEventEverOpened(true);
        }
        
        // Preload StickerEventApp in background to avoid lag on click
        const timer = setTimeout(() => {
            import('./StickerEventApp').catch(err => {
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
                // 1. Load sticker printer settings / states
                const savedState = await getSetting<any>(STICKER_DB_KEY);
                
                if (savedState && active) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const currentSub = urlParams.get('sub');
                    
                    if (!currentSub) {
                        if (savedState.stickerMode) setStickerMode(savedState.stickerMode);
                        if (savedState.stickerType) setStickerType(savedState.stickerType);
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
                    
                    // Normalize previewNewPrice to thousands if >= 100,000
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
                    
                    // Normalize manualPages prices to thousands if >= 100,000
                    const loadedPages = (savedState.manualPages || []).map((page: any) => {
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
                    
                    // Normalize batchItems prices to thousands if >= 100,000
                    const loadedItems = (savedState.batchItems || []).map((item: any) => {
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
                    
                    // Font sizes
                    if (savedState.headerTextSize != null) setHeaderTextSize(savedState.headerTextSize);
                    if (savedState.subHeaderTextSize != null) setSubHeaderTextSize(savedState.subHeaderTextSize);
                    if (savedState.percentTextSize != null) setPercentTextSize(savedState.percentTextSize);
                    if (savedState.oldPriceTextSize != null) setOldPriceTextSize(savedState.oldPriceTextSize);
                    if (savedState.nameTextSize != null) setNameTextSize(savedState.nameTextSize);
                    if (savedState.newPriceTextSize != null) setNewPriceTextSize(savedState.newPriceTextSize);
                    if (savedState.footerTextSize != null) setFooterTextSize(savedState.footerTextSize);

                    // Ticket draw settings
                    if (savedState.drawTickets) setDrawTickets(savedState.drawTickets);
                    if (savedState.drawStartNumber != null) setDrawStartNumber(savedState.drawStartNumber);
                    if (savedState.drawTotalTickets != null) setDrawTotalTickets(savedState.drawTotalTickets);
                    if (savedState.drawAutoIncrement != null) setDrawAutoIncrement(savedState.drawAutoIncrement);
                    if (savedState.drawContentTopLeftSize != null) setDrawContentTopLeftSize(savedState.drawContentTopLeftSize);
                    if (savedState.drawContentTopRightSize != null) setDrawContentTopRightSize(savedState.drawContentTopRightSize);
                    if (savedState.drawContentBottomLeftSize != null) setDrawContentBottomLeftSize(savedState.drawContentBottomLeftSize);
                    if (savedState.drawContentBottomRightSize != null) setDrawContentBottomRightSize(savedState.drawContentBottomRightSize);
                    if (savedState.drawTitleSize != null) setDrawTitleSize(savedState.drawTitleSize);
                    if (savedState.drawCodeSize != null) setDrawCodeSize(savedState.drawCodeSize);
                    if (savedState.drawFooterSize != null) setDrawFooterSize(savedState.drawFooterSize);
                }

                // 2. Load saved lists
                const savedListsData = await getSetting<SavedStickerList[]>(STICKER_SAVED_LISTS_KEY);
                if (savedListsData && active) {
                    setSavedLists(savedListsData);
                }

                // 3. Load print history
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

    // Lắng nghe sự thay đổi của stickerSavedLists từ cloud sync để cập nhật UI thời gian thực
    useEffect(() => {
        const handleDbChange = (event: Event) => {
            if ((event as CustomEvent<{ key?: string }>).detail?.key === STICKER_SAVED_LISTS_KEY) {
                getSetting<SavedStickerList[]>(STICKER_SAVED_LISTS_KEY).then(data => {
                    if (data) setSavedLists(data);
                });
            }
        };
        window.addEventListener('indexeddb-change', handleDbChange);
        return () => window.removeEventListener('indexeddb-change', handleDbChange);
    }, []);

    // Save state to IndexedDB whenever key values change (debounced)
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
                // Ticket draw states
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
        return () => clearTimeout(timer);
    }, [
        isLoaded,
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
        headerTextSize,
        subHeaderTextSize,
        percentTextSize,
        oldPriceTextSize,
        nameTextSize,
        newPriceTextSize,
        footerTextSize,
        discountDisplayMode,
        barcodeImei,
        discountThreshold,
        searchTerm,
        activeQueuePageId,
        activeSubTab,
        manualPages,
        batchItems,
        priceSource,
        // Ticket draw dependencies
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
        drawFooterSize
    ]);

    // Sync savedLists to IndexedDB
    useEffect(() => {
        if (!isLoaded) return;
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


    const parsePercentValue = (percentStr: string | undefined): number => {
        if (!percentStr) return 0;
        const clean = percentStr.replace(/[^0-9]/g, '');
        const val = parseInt(clean, 10);
        return isNaN(val) ? 0 : val;
    };

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
                
                const items: BatchItem[] = [];
                for (let i = 0; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.length < 9) continue;

                    const e = row[4] ? String(row[4]).trim() : '';
                    const f = row[5] ? String(row[5]).trim() : '';
                    const aq = row[42] ? String(row[42]).trim() : '';
                    
                    let imeiRaw = '';
                    const aqUpper = aq.toUpperCase();
                    if (aqUpper.includes('IMEI:')) {
                        imeiRaw = aq.substring(aqUpper.indexOf('IMEI:') + 5).trim();
                        imeiRaw = imeiRaw.replace(/\)$/, '').trim();
                    } else if (aqUpper.includes('CODE:')) {
                        imeiRaw = aq.substring(aqUpper.indexOf('CODE:') + 5).trim();
                        imeiRaw = imeiRaw.replace(/\)$/, '').trim();
                    } else if (aq) {
                        if (/^[A-Za-z0-9]+$/.test(aq) && aq.length > 3) {
                            imeiRaw = aq;
                        }
                    }

                    const nameParts = [e, f].filter(Boolean);
                    if (aq) {
                        nameParts.push(aq.startsWith('(') ? aq : `(${aq})`);
                    }
                    const name = nameParts.join(' ');
                    if (!name || name === 'TÊN SẢN PHẨM') continue;

                    let percent = '';
                    if (row[8]) {
                        const match = String(row[8]).match(/\((-\d+%)\)/);
                        if (match) percent = match[1];
                    }

                    let oldPrice = '';
                    if (row[7]) {
                        const digits = String(row[7]).replace(/\D/g, '');
                        if (digits) oldPrice = Number(digits).toLocaleString('vi-VN');
                    }

                    let newPrice = '';
                    if (row[6]) {
                        const digits = String(row[6]).replace(/\D/g, '');
                        if (digits) newPrice = Number(Math.floor(Number(digits) / 1000)).toLocaleString('vi-VN');
                    }

                    const cleanInput = discountThreshold.replace(/[^0-9]/g, '');
                    const limit = parseInt(cleanInput, 10);
                    const isSelected = isNaN(limit) ? true : parsePercentValue(percent) >= limit;

                    items.push({
                        id: `item_${i}_${Date.now()}`,
                        name,
                        oldPrice,
                        newPrice,
                        percent,
                        imei: imeiRaw,
                        selected: isSelected
                    });
                }
                setBatchItems(items);
                setActiveSubTab('data');
                if (items.length > 0) {
                    const first = items[0];
                    setPreviewName(first.name);
                    setPreviewOldPrice(first.oldPrice);
                    setPreviewNewPrice(first.newPrice);
                    setBarcodeImei(first.imei);
                }
            } catch (err) {
                toast.error("Lỗi đọc file Excel");
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const downloadTemplate = async () => {
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();
        let header: string[];
        let sampleData: string[][];
        let filename: string;
        let cols: { wch: number }[];

        if (stickerType === 'gia_soc') {
            header = ['TIÊU ĐỀ', 'CODE', 'TÊN SẢN PHẨM', 'GIÁ GỐC', 'GIÁ GIẢM', 'KHUYẾN MÃI'];
            sampleData = [
                ['QUẠT ĐIỀU HOÀ', 'ABC123', 'Quạt điều hoà Daikiosan DMI03', '5490000', '3490000', 'Khuyến mãi áp dụng đến hết ngày 3/5/2026'],
                ['TỦ LẠNH', 'DEF456', 'Tủ lạnh Samsung RT29K5012S8', '8990000', '6990000', 'Khuyến mãi áp dụng đến hết ngày 3/5/2026'],
            ];
            filename = 'Sticker_Template_Gia_Soc.xlsx';
            cols = [
                { wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 45 }
            ];
        } else {
            const today = new Date();
            const currentDay = today.getDay();
            const dayOfWeek = currentDay === 0 ? 7 : currentDay;
            const friday = new Date(today);
            friday.setDate(today.getDate() + (5 - dayOfWeek));
            const sunday = new Date(today);
            sunday.setDate(today.getDate() + (7 - dayOfWeek));
            const pad = (n: number) => String(n).padStart(2, '0');
            const fridayStr = `${pad(friday.getDate())}/${pad(friday.getMonth() + 1)}`;
            const sundayStr = `${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}`;
            const timeRangeStr = `TỪ ${fridayStr} ĐẾN ${sundayStr}`;

            header = ['CODE', 'SẢN PHẨM', 'GIÁ NIÊM YẾT', 'GIÁ GIẢM', 'THỜI GIAN ÁP DỤNG', 'SỐ LƯỢNG SUẤT'];
            sampleData = [
                ['ABC123', 'Quạt điều hoà Daikiosan DMI03', '5490000', '3490000', timeRangeStr, '5 SUẤT/NGÀY'],
                ['DEF456', 'Tủ lạnh Samsung RT29K5012S8', '8990000', '6990000', timeRangeStr, '5 SUẤT/NGÀY'],
            ];
            filename = 'Sticker_Template_Gio_Vang.xlsx';
            cols = [
                { wch: 15 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 18 }
            ];
        }

        const ws = XLSX.utils.aoa_to_sheet([header, ...sampleData]);
        ws['!cols'] = cols;
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, filename);
    };

    const parsePrice = (val: unknown): number => {
        if (val == null) return 0;
        const str = String(val).replace(/[^0-9]/g, '');
        return str ? Number(str) : 0;
    };

    const loadPageToEditor = (page: StickerPage) => {
        if (page.label) setPreviewName(page.label);
        if (page.oldPrice) setPreviewOldPrice(page.oldPrice);
        if (page.code) setBarcodeImei(page.code);
        if (page.header != null) setHeaderTextContent(page.header);
        if (page.footer != null) setFooterTextContent(page.footer);
        if (page.subHeader != null) setSubHeaderTextContent(page.subHeader);

        const { newPrice } = resolvePagePrices(page, priceSource);
        setPreviewNewPrice(newPrice);

        // Fallback for older pages without properties
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
                
                if (!data || data.length < 2) {
                    toast.error('File không chứa đủ dữ liệu');
                    return;
                }

                // Detect column headers from first row
                const headers = (data[0] || []).map(h => String(h).trim().toUpperCase());
                
                let codeIndex = -1;
                let nameIndex = -1;
                let retailPriceIndex = -1;
                let salePriceIndex = -1;
                let thoiGianIndex = -1;
                let soLuongIndex = -1;
                let khuyenMaiIndex = -1;

                if (stickerType === 'gia_soc') {
                    codeIndex = headers.findIndex(h => h === 'CODE' || h === 'CODE:');
                    nameIndex = headers.findIndex(h => h === 'TÊN SẢN PHẨM' || h === 'SẢN PHẨM');
                    retailPriceIndex = headers.findIndex(h => h === 'GIÁ GỐC' || h === 'GIÁ NIÊM YẾT');
                    salePriceIndex = headers.indexOf('GIÁ GIẢM');
                    thoiGianIndex = headers.findIndex(h => h === 'TIÊU ĐỀ' || h === 'THỜI GIAN ÁP DỤNG');
                    khuyenMaiIndex = headers.indexOf('KHUYẾN MÃI');

                    // If header match failed, assume the new order of columns:
                    // 1. TIÊU ĐỀ, 2. CODE, 3. TÊN SẢN PHẨM, 4. GIÁ GỐC, 5. GIÁ GIẢM, 6. KHUYẾN MÃI
                    if (codeIndex === -1 && nameIndex === -1 && retailPriceIndex === -1) {
                        thoiGianIndex = 0;
                        codeIndex = 1;
                        nameIndex = 2;
                        retailPriceIndex = 3;
                        salePriceIndex = 4;
                        khuyenMaiIndex = 5;
                    }
                } else {
                    // gio_vang
                    codeIndex = headers.findIndex(h => h === 'CODE' || h === 'CODE:');
                    nameIndex = headers.findIndex(h => h === 'SẢN PHẨM' || h === 'TÊN SẢN PHẨM');
                    retailPriceIndex = headers.findIndex(h => h === 'GIÁ NIÊM YẾT' || h === 'GIÁ GỐC');
                    salePriceIndex = headers.indexOf('GIÁ GIẢM');
                    thoiGianIndex = headers.findIndex(h => h === 'THỜI GIAN ÁP DỤNG' || h === 'TIÊU ĐỀ');
                    soLuongIndex = headers.indexOf('SỐ LƯỢNG SUẤT');

                    // If header match failed, assume the old order of columns:
                    // CODE, SẢN PHẨM, GIÁ NIÊM YẾT, GIÁ GIẢM, THỜI GIAN ÁP DỤNG, SỐ LƯỢNG SUẤT
                    if (codeIndex === -1 && nameIndex === -1 && retailPriceIndex === -1) {
                        codeIndex = 0;
                        nameIndex = 1;
                        retailPriceIndex = 2;
                        salePriceIndex = 3;
                        thoiGianIndex = 4;
                        soLuongIndex = 5;
                    }
                }

                // Read header/subheader/footer text content from first data row if available to sync editor preview
                const firstRow = data[1];
                if (firstRow) {
                    let thoiGian = headerTextContent;
                    let soLuong = subHeaderTextContent;
                    let khuyenMai = footerTextContent;
                    
                    if (thoiGianIndex !== -1 && firstRow[thoiGianIndex] != null) {
                        const t = String(firstRow[thoiGianIndex]).trim();
                        if (t) thoiGian = t;
                    }
                    if (soLuongIndex !== -1 && firstRow[soLuongIndex] != null) {
                        const s = String(firstRow[soLuongIndex]).trim();
                        if (s) soLuong = s;
                    }
                    if (khuyenMaiIndex !== -1 && firstRow[khuyenMaiIndex] != null) {
                        const k = String(firstRow[khuyenMaiIndex]).trim();
                        if (k) khuyenMai = k;
                    }

                    if (thoiGian !== headerTextContent) setHeaderTextContent(thoiGian);
                    if (soLuong !== subHeaderTextContent) setSubHeaderTextContent(soLuong);
                    if (khuyenMai !== footerTextContent) setFooterTextContent(khuyenMai);
                }

                const newPages: StickerPage[] = [];
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.length < 2) continue;

                    const code = codeIndex !== -1 && row[codeIndex] != null ? String(row[codeIndex]).trim() : '';
                    const name = nameIndex !== -1 && row[nameIndex] != null ? String(row[nameIndex]).trim() : '';
                    if (!name) continue;

                    const retailPrice = retailPriceIndex !== -1 ? parsePrice(row[retailPriceIndex]) : 0;
                    const salePrice = salePriceIndex !== -1 ? parsePrice(row[salePriceIndex]) : 0;

                    const oldPrice = retailPrice ? retailPrice.toLocaleString('vi-VN') : '';
                    const newPrice = salePrice ? Number(Math.floor(salePrice / 1000)).toLocaleString('vi-VN') : '';

                    let percent = '';
                    if (retailPrice > 0 && salePrice > 0) {
                        const ratio = Math.round((salePrice / retailPrice - 1) * 100);
                        percent = `${ratio}%`;
                    }

                    // Row-specific header
                    let rowHeader = headerTextContent;
                    if (thoiGianIndex !== -1 && row[thoiGianIndex] != null) {
                        const val = String(row[thoiGianIndex]).trim();
                        if (val) rowHeader = val;
                    }

                    // Row-specific subheader
                    let rowSubHeader = subHeaderTextContent;
                    if (soLuongIndex !== -1 && row[soLuongIndex] != null) {
                        const val = String(row[soLuongIndex]).trim();
                        if (val) rowSubHeader = val;
                    }

                    // Row-specific footer
                    let rowFooter = footerTextContent;
                    if (khuyenMaiIndex !== -1 && row[khuyenMaiIndex] != null) {
                        const val = String(row[khuyenMaiIndex]).trim();
                        if (val) rowFooter = val;
                    }

                    // Build sticker HTML using actual pre-rendered image data URL for barcode
                    let barcodeHtml = '';
                    if (code) {
                        try {
                            const url = generateBarcodeDataUrl(code);
                            barcodeHtml = `<div class="barcode"><img src="${url}" style="image-rendering:pixelated;width:100%;height:100%;object-fit:fill" alt="${code}" /></div>`;
                        } catch (e) {
                            console.error('Error generating barcode for template item:', e);
                        }
                    }

                    const subHeaderHtml = stickerType === 'gio_vang' 
                        ? `<div class="sub-header">${rowSubHeader}</div>` : '';
                    
                    let priceHtml = '';
                    if (stickerType === 'gio_vang') {
                        priceHtml = `<div class="extra2" style="display:flex;align-items:baseline;justify-content:center"><span>${newPrice}</span><span class="small-zeros">.000</span></div>`;
                    } else {
                        priceHtml = `<div class="extra2">${newPrice}</div>`;
                    }

                    const html = `<div class="sticker-container" data-type="${stickerType}" style="background-image:url('${bgImage}');background-size:100% 100%;background-repeat:no-repeat;background-position:center;width:100%;aspect-ratio:197/285;position:relative;overflow:hidden;container-type:inline-size;font-family:Arial,sans-serif;">
                        ${barcodeHtml}
                        <div class="header-text">${rowHeader}</div>
                        ${subHeaderHtml}
                        <div class="extra1">${percent}</div>
                        <div class="old">${oldPrice}</div>
                        <div class="name">${name}</div>
                        ${priceHtml}
                        <div class="footer-text">${rowFooter}</div>
                    </div>`;

                    const cleanInput = discountThreshold.replace(/[^0-9]/g, '');
                    const limit = parseInt(cleanInput, 10);
                    const isSelected = isNaN(limit) ? true : parsePercentValue(percent) >= limit;

                    newPages.push({
                        id: `tpl_${i}_${Date.now()}`,
                        html,
                        label: name.substring(0, 50),
                        oldPrice,
                        newPrice,
                        percent,
                        timestamp: Date.now(),
                        code: code,
                        selected: isSelected,
                        header: rowHeader,
                        subHeader: rowSubHeader,
                        footer: rowFooter,
                    });
                }

                if (newPages.length === 0) {
                    toast.error('Không tìm thấy dữ liệu hợp lệ trong file.');
                    return;
                }

                // Add all imported stickers to the print queue
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


    const formatPriceInThousands = (rawVal: unknown): string => {
        if (rawVal == null || rawVal === '') return '';
        const digits = String(rawVal).replace(/\D/g, '');
        if (!digits) return '';
        const val = Number(digits);
        return Number(Math.floor(val / 1000)).toLocaleString('vi-VN');
    };

    const formatFullPrice = (rawVal: unknown): string => {
        if (rawVal == null || rawVal === '') return '';
        const digits = String(rawVal).replace(/\D/g, '');
        if (!digits) return '';
        return Number(digits).toLocaleString('vi-VN');
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
                
                if (!data || data.length < 2) {
                    toast.error('File không chứa đủ dữ liệu');
                    return;
                }

                const newPages: StickerPage[] = [];
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.length === 0) continue;

                    let rawCode = '';
                    let rawName = '';
                    let rawOldPrice = '';
                    let rawSalePrice = '';
                    let rawServicePrice = '';
                    let rawPromo = '';
                    let header = '';

                    if (type === 'purifier') {
                        header = 'MÁY LỌC NƯỚC';
                        rawCode = row[55] != null ? String(row[55]).trim() : '';
                        rawName = row[44] != null ? String(row[44]).trim() : '';
                        rawOldPrice = row[33] != null ? String(row[33]).trim() : '';
                        rawSalePrice = row[20] != null ? String(row[20]).trim() : '';
                        rawServicePrice = row[1] != null ? String(row[1]).trim() : '';
                        rawPromo = row[31] != null ? String(row[31]).trim() : '';

                        if (rawName) {
                            rawName = cleanWaterPurifierName(rawName);
                        }
                    } else {
                        header = 'DUY NHẤT HÔM NAY';
                        rawCode = row[28] != null ? String(row[28]).trim() : '';
                        rawName = row[27] != null ? String(row[27]).trim() : '';
                        rawOldPrice = row[16] != null ? String(row[16]).trim() : '';
                        rawSalePrice = row[17] != null ? String(row[17]).trim() : '';
                        rawServicePrice = row[8] != null ? String(row[8]).trim() : '';
                        rawPromo = row[31] != null ? String(row[31]).trim() : '';
                    }

                    if (!rawName) continue;

                    let code = rawCode;
                    if (code.includes('-')) {
                        code = code.split('-')[0].trim();
                    }

                    const oldPrice = formatFullPrice(rawOldPrice);
                    const salePrice = formatPriceInThousands(rawSalePrice);
                    const servicePrice = formatPriceInThousands(rawServicePrice);

                    const currentPrice = priceSource === 'service' ? (servicePrice || salePrice) : (salePrice || servicePrice);
                    
                    let percent = '';
                    const oldVal = Number(oldPrice.replace(/\D/g, ''));
                    let newVal = Number(currentPrice.replace(/\D/g, ''));
                    if (oldVal > 0 && newVal > 0) {
                        if (newVal * 1000 <= oldVal * 1.5 && newVal < oldVal) {
                            newVal = newVal * 1000;
                        }
                        const ratio = Math.round((newVal / oldVal - 1) * 100);
                        percent = ratio < 0 ? `${ratio}%` : '';
                    }

                    const cleanInput = discountThreshold.replace(/[^0-9]/g, '');
                    const limit = parseInt(cleanInput, 10);
                    const isSelected = isNaN(limit) ? true : parsePercentValue(percent) >= limit;

                    const page: StickerPage = {
                        id: `erp_${type}_${i}_${Date.now()}`,
                        html: '',
                        label: rawName,
                        oldPrice,
                        newPrice: currentPrice,
                        percent,
                        timestamp: Date.now(),
                        code,
                        selected: isSelected,
                        salePrice,
                        servicePrice,
                        header,
                        footer: rawPromo,
                    };

                    page.html = generatePageHtml(page, priceSource, stickerType, bgImage);
                    newPages.push(page);
                }

                if (newPages.length === 0) {
                    toast.error('Không tìm thấy dữ liệu hợp lệ trong file.');
                    return;
                }

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

    const handleSaveCurrentList = (name: string) => {
        const list: SavedStickerList = {
            id: `list_${Date.now()}`,
            name,
            pages: manualPages,
            timestamp: Date.now(),
            stickerType,
            headerTextContent,
        };
        setSavedLists(prev => {
            const next = [list, ...prev].slice(0, 20);
            saveSetting(STICKER_SAVED_LISTS_KEY, next).catch(() => {});
            return next;
        });
        setIsSaveListModalOpen(false);
        toast.success(`Đã lưu danh sách "${name}" thành công!`);
    };

    const loadSavedList = (list: SavedStickerList) => {
        setManualPages(list.pages);
        if (list.stickerType) setStickerType(list.stickerType);
        if (list.headerTextContent) setHeaderTextContent(list.headerTextContent);
        setShowSavedLists(false);
        setActiveQueuePageId(null);
    };

    const deleteSavedList = (id: string) => {
        setSavedLists(prev => {
            const next = prev.filter(l => l.id !== id);
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
    };

    const deleteHistory = (id: string) => {
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
    };

    const handlePrint = () => {
        const previewPageCount = batchItems.length > 0 ? batchItems.filter(i => i.selected).length : (manualPages.length === 0 ? 1 : 0);
        const selectedManualPages = manualPages.filter(p => p.selected !== false);
        const totalPages = previewPageCount + selectedManualPages.length;

        if (totalPages === 0) {
            toast.error("Không có trang nào để in!");
            return;
        }

        const printHost = document.createElement('div');
        printHost.id = 'print-host';
        
        // Define style for print host based on current font sizes
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
                    outline: ${stickerType === 'draw' ? 'none' : '1.5px dashed #6366f1'};
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
                // insertAdjacentHTML thay vì `innerHTML +=` — `+=` đọc lại serialize toàn bộ nội
                // dung đã chèn trước đó rồi parse lại từ đầu mỗi lần, khiến in hàng loạt là O(n²)
                // theo số trang. insertAdjacentHTML chỉ parse+chèn phần HTML mới, O(n) tổng thể.
                printHost.insertAdjacentHTML('beforeend', generatePageHtml(tempPage, priceSource, stickerType, bgImage, discountDisplayMode));
            });
        } else if (manualPages.length === 0) {
            // If both are empty, this handles the default preview template
            const printSection = document.getElementById('print-section');
            if (printSection) {
                printHost.insertAdjacentHTML('beforeend', printSection.innerHTML);
            }
        }

        // Then append queued manual pages
        selectedManualPages.forEach(page => {
            let finalHeader = page.header || '';
            let finalSubHeader = page.subHeader || '';
            let finalFooter = page.footer || '';

            if (stickerType === 'gio_vang') {
                // If printing Giờ Vàng, override header if it's a Giá Sốc header or empty
                const isGiaSocHeader = !finalHeader || finalHeader === 'SẢN PHẨM GIÁ SỐC' || finalHeader === 'QUẠT ĐIỀU HOÀ' || !finalHeader.toUpperCase().startsWith('TỪ');
                if (isGiaSocHeader) {
                    finalHeader = headerTextContent;
                }
                // Override subHeader if empty or invalid for Giờ Vàng
                if (!finalSubHeader || !finalSubHeader.toUpperCase().includes('SUẤT')) {
                    finalSubHeader = subHeaderTextContent;
                }
            } else if (stickerType === 'gia_soc') {
                // If printing Giá Sốc, override header if it contains Giờ Vàng time range
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
                // If a duplicate print job exists, move it to the top and refresh timestamp
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

        // Use setTimeout to allow the browser to paint and decode images (including base64 barcodes) before opening print dialog
        setTimeout(() => {
            window.print();
            if (root) root.style.display = '';
            document.body.removeChild(printHost);
        }, 200);
    };

    return (
        <div className="print-wrapper w-full h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
            {mounted && activeTab === 'tools-print-sticker' && document.getElementById(isMobile ? 'mobile-topbar-actions' : 'global-header-actions') && createPortal(
                <div className="flex items-center gap-0.5 lg:gap-1 bg-white/60 dark:bg-slate-900/60 p-1 lg:p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300 mr-1 lg:mr-0">
                    <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-0.5 lg:p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setStickerMode('sticker');
                                setStickerType('gia_soc');
                                setHeaderTextContent('QUẠT ĐIỀU HOÀ');
                                setBgImage('/frame/X24_NEW.png');
                                setHeaderTextSize(8);
                                updateSubQueryParam('gia-soc');
                            }}
                            className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${
                                stickerMode === 'sticker' && stickerType === 'gia_soc'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="lg:hidden">Giá Sốc</span>
                            <span className="hidden lg:inline">{stickerMode === 'sticker' && stickerType === 'gia_soc' && <CheckCircle2 size={14} className="inline mr-1 text-indigo-600 dark:text-indigo-400" />}Giá Sốc</span>
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setStickerMode('sticker');
                                setStickerType('gio_vang');
                                setHeaderTextContent('TỪ 00/00 ĐẾN 00/00');
                                setBgImage('/frame/GVO2-scaled.png');
                                setHeaderTextSize(8);
                                updateSubQueryParam('gio-vang');
                            }}
                            className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${
                                stickerMode === 'sticker' && stickerType === 'gio_vang'
                                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="lg:hidden">Giờ Vàng</span>
                            <span className="hidden lg:inline">{stickerMode === 'sticker' && stickerType === 'gio_vang' && <CheckCircle2 size={14} className="inline mr-1 text-amber-600 dark:text-amber-400" />}Giờ Vàng</span>
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setStickerMode('sticker');
                                setStickerType('draw');
                                setBgImage('/frame/bg_phieu.png');
                                updateSubQueryParam('draw');
                                setActiveField('drawContentTopLeft');
                            }}
                            className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${
                                stickerMode === 'sticker' && stickerType === 'draw'
                                    ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="lg:hidden">Rút Thăm</span>
                            <span className="hidden lg:inline">{stickerMode === 'sticker' && stickerType === 'draw' && <CheckCircle2 size={14} className="inline mr-1 text-rose-600 dark:text-rose-400" />}Phiếu Rút Thăm</span>
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setStickerMode('event');
                                setEventEverOpened(true);
                                updateSubQueryParam('event');
                            }}
                            className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${
                                stickerMode === 'event'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="lg:hidden">Event</span>
                            <span className="hidden lg:inline">{stickerMode === 'event' && <CheckCircle2 size={14} className="inline mr-1 text-emerald-600 dark:text-emerald-400" />}<Package size={14} className="inline mr-1" />Event - Tồn kho</span>
                        </Button>
                    </div>
                    
                    {stickerMode === 'sticker' && (
                        <div className="flex items-center gap-1 ml-0.5 lg:ml-1 pl-1.5 lg:pl-2 border-l border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-left-2 duration-200">
                            <span className="text-[10px] lg:text-[11px] font-medium text-slate-500 mr-0.5 dark:text-slate-400">
                                {stickerType === 'draw' ? `${getDrawActiveFieldLabel()}:` : `${getActiveFieldLabel()}:`}
                            </span>
                            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-full overflow-hidden shadow-sm h-[22px] lg:h-[26px]">
                                <Button
                                    variant="ghost"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        if (stickerType === 'draw') {
                                            const curSize = getDrawActiveFontSize();
                                            const newSize = Math.max(1, curSize - 0.2);
                                            setDrawActiveFontSize(newSize);
                                            applyFontSizeToSelection(newSize);
                                        } else {
                                            setActiveFontSize(s => Math.max(1, s - 0.2));
                                        }
                                    }}
                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-full w-auto px-1.5 lg:px-2 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors"
                                    title="Giảm size"
                                >
                                    -
                                </Button>
                                <span className="px-0 text-[10px] lg:text-[11px] font-bold text-slate-700 dark:text-slate-300 w-6 lg:w-8 text-center">
                                    {stickerType === 'draw' ? getDrawActiveFontSize().toFixed(1) : getActiveFontSize()}
                                </span>
                                <Button
                                    variant="ghost"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        if (stickerType === 'draw') {
                                            const curSize = getDrawActiveFontSize();
                                            const newSize = curSize + 0.2;
                                            setDrawActiveFontSize(newSize);
                                            applyFontSizeToSelection(newSize);
                                        } else {
                                            setActiveFontSize(s => s + 0.2);
                                        }
                                    }}
                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-full w-auto px-1.5 lg:px-2 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors"
                                    title="Tăng size"
                                >
                                    +
                                </Button>
                            </div>
                        </div>
                    )}
                </div>,
                document.getElementById(isMobile ? 'mobile-topbar-actions' : 'global-header-actions')!
            )}

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
