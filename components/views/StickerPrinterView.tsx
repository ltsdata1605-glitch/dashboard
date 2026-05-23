import React, { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Settings, CheckCircle2, Image as ImageIcon, Upload, Plus, Trash2, RotateCcw, Clock, ChevronDown, ChevronUp, X, Download, FileSpreadsheet, Package } from 'lucide-react';
import { useActiveTab } from '../../contexts/LayoutContext';
import { saveSetting, getSetting } from '../../services/dbService';
import BarcodeCanvas from './BarcodeCanvas';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const StickerEventApp = lazy(() => import('./stickerevent/StickerEventApp'));

const STICKER_DB_KEY = 'stickerPrinterState';
const STICKER_HISTORY_KEY = 'stickerPrintHistory';
const STICKER_SAVED_LISTS_KEY = 'stickerSavedLists';

interface SavedStickerList {
    id: string;
    name: string;
    pages: StickerPage[];
    timestamp: number;
    stickerType: 'gia_soc' | 'gio_vang';
    headerTextContent: string;
}

interface StickerPage {
    id: string;
    html: string;
    label: string;
    oldPrice: string;
    newPrice: string;
    percent: string;
    timestamp: number;
}

interface PrintHistoryEntry {
    id: string;
    timestamp: number;
    label: string;
    pageCount: number;
    stickerType: 'gia_soc' | 'gio_vang';
    bgImage: string;
    headerTextSize: number;
    batchItems: BatchItem[];
    headerTextContent: string;
    subHeaderTextContent: string;
    footerTextContent: string;
    showBarcode: boolean;
    manualPages: StickerPage[];
}

interface BatchItem {
    id: string;
    name: string;
    oldPrice: string;
    newPrice: string;
    percent: string;
    imei: string;
    selected: boolean;
}

export default function StickerPrinterView() {
    const { activeTab } = useActiveTab();
    const [mounted, setMounted] = useState(false);
    const [stickerMode, setStickerMode] = useState<'sticker' | 'event'>('sticker');
    const [eventEverOpened, setEventEverOpened] = useState(false);
    const [stickerType, setStickerType] = useState<'gia_soc' | 'gio_vang'>('gia_soc');
    const [bgImage, setBgImage] = useState('/frame/X24_NEW.png');
    const [headerTextSize, setHeaderTextSize] = useState(8);
    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const [headerTextContent, setHeaderTextContent] = useState('QUẠT ĐIỀU HOÀ');
    const [subHeaderTextContent, setSubHeaderTextContent] = useState('0 SUẤT/NGÀY');
    const [footerTextContent, setFooterTextContent] = useState('Khuyến mãi áp dụng đến hết ngày 3/5/2026');
    const [searchTerm, setSearchTerm] = useState('');
    const [showBarcode, setShowBarcode] = useState(false);
    const [inventoryCodes, setInventoryCodes] = useState<Set<string> | null>(null);
    const [barcodeImei, setBarcodeImei] = useState('123456');
    const [manualPages, setManualPages] = useState<StickerPage[]>([]);
    const [printHistory, setPrintHistory] = useState<PrintHistoryEntry[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [savedLists, setSavedLists] = useState<SavedStickerList[]>([]);
    const [showSavedLists, setShowSavedLists] = useState(false);
    const nameRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const previewNameRef = useRef('Quạt điều hoà Daikiosan DMI03');
    const footerContentRef = useRef('Khuyến mãi áp dụng đến hết ngày 3/5/2026');
    const headerRef = useRef<HTMLDivElement>(null);
    const subHeaderRef = useRef<HTMLDivElement>(null);
    const oldPriceRef = useRef<HTMLDivElement>(null);
    const newPriceRef = useRef<HTMLDivElement>(null);
    const percentRef = useRef<HTMLDivElement>(null);

    const [isLoaded, setIsLoaded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Load saved state from IndexedDB on mount
    useEffect(() => {
        setMounted(true);
        getSetting<any>(STICKER_DB_KEY).then(saved => {
            if (saved) {
                if (saved.stickerType) setStickerType(saved.stickerType);
                if (saved.bgImage) setBgImage(saved.bgImage);
                if (saved.headerTextSize != null) setHeaderTextSize(saved.headerTextSize);
                if (saved.batchItems) setBatchItems(saved.batchItems);
                if (saved.headerTextContent) setHeaderTextContent(saved.headerTextContent);
                if (saved.subHeaderTextContent) setSubHeaderTextContent(saved.subHeaderTextContent);
                if (saved.footerTextContent) {
                    setFooterTextContent(saved.footerTextContent);
                    footerContentRef.current = saved.footerTextContent;
                }
                if (saved.showBarcode != null) setShowBarcode(saved.showBarcode);
                if (saved.previewName) previewNameRef.current = saved.previewName;
                if (saved.manualPages) setManualPages(saved.manualPages);
            }
            setIsLoaded(true);
        }).catch(() => setIsLoaded(true));
        // Load print history
        getSetting<PrintHistoryEntry[]>(STICKER_HISTORY_KEY).then(history => {
            if (history) setPrintHistory(history);
        }).catch(() => {});
        // Load saved lists
        getSetting<SavedStickerList[]>(STICKER_SAVED_LISTS_KEY).then(lists => {
            if (lists) setSavedLists(lists);
        }).catch(() => {});
    }, []);

    // Save state to IndexedDB whenever key values change (debounced)
    useEffect(() => {
        if (!isLoaded) return;
        const timer = setTimeout(() => {
            saveSetting(STICKER_DB_KEY, {
                stickerType,
                bgImage,
                headerTextSize,
                batchItems,
                headerTextContent,
                subHeaderTextContent,
                footerTextContent,
                showBarcode,
                previewName: previewNameRef.current,
                manualPages,
            }).catch(() => {});
        }, 500);
        return () => clearTimeout(timer);
    }, [isLoaded, stickerType, bgImage, headerTextSize, batchItems, headerTextContent, subHeaderTextContent, footerTextContent, showBarcode, manualPages]);

    useEffect(() => {
        if (nameRef.current && !nameRef.current.hasAttribute('data-initialized')) {
            nameRef.current.innerText = previewNameRef.current;
            nameRef.current.setAttribute('data-initialized', 'true');
        }
        if (footerRef.current && !footerRef.current.hasAttribute('data-initialized')) {
            footerRef.current.innerText = footerContentRef.current;
            footerRef.current.setAttribute('data-initialized', 'true');
        }
        if (headerRef.current && document.activeElement !== headerRef.current) {
            headerRef.current.innerText = headerTextContent;
        }
        if (subHeaderRef.current && document.activeElement !== subHeaderRef.current) {
            subHeaderRef.current.innerText = subHeaderTextContent;
        }
    });

    const handleTextInput = (e: React.FormEvent<HTMLDivElement>) => {
        setHeaderTextContent(e.currentTarget.innerText);
    };

    const handleSubHeaderInput = (e: React.FormEvent<HTMLDivElement>) => {
        setSubHeaderTextContent(e.currentTarget.innerText);
    };

    const handleFooterTextInput = (e: React.FormEvent<HTMLDivElement>) => {
        const text = e.currentTarget.innerText;
        footerContentRef.current = text;
        setFooterTextContent(text);
    };

    const handleNameInput = (e: React.FormEvent<HTMLDivElement>) => {
        const text = e.currentTarget.innerText;
        previewNameRef.current = text;
        const match = text.match(/(?:IMEI|CODE):\s*([A-Za-z0-9]+)/i);
        setBarcodeImei(match ? match[1] : '');
    };

    const handlePriceInput = (e: React.FormEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const rawText = el.innerText;
        
        // Bỏ qua nếu có chữ cái (để người dùng có thể gõ chữ "LIÊN HỆ", "HẾT",...)
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

        // Auto-calculate percentage from old and new price
        autoCalcPercent();
    };

    const autoCalcPercent = () => {
        const oldEl = oldPriceRef.current;
        const newEl = newPriceRef.current;
        const pctEl = percentRef.current;
        if (!oldEl || !newEl || !pctEl) return;

        const oldVal = Number(oldEl.innerText.replace(/\D/g, ''));
        // For new price: in gio_vang mode the value is in thousands (has .000 suffix), in gia_soc mode it's also in thousands
        let newVal = Number(newEl.innerText.replace(/\D/g, ''));
        // newPrice is displayed in thousands (e.g. 3.490 = 3,490,000), oldPrice is full (e.g. 5.490.000)
        if (oldVal > 0 && newVal > 0) {
            // Detect if newVal is much smaller than oldVal (displayed in thousands)
            if (newVal * 1000 <= oldVal * 1.5 && newVal < oldVal) {
                newVal = newVal * 1000;
            }
            const ratio = Math.round((newVal / oldVal - 1) * 100);
            if (ratio < 0) {
                pctEl.innerText = `${ratio}%`;
            }
        }
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
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
                        // Remove closing parenthesis if it was wrapped accidentally before extraction
                        imeiRaw = imeiRaw.replace(/\)$/, '').trim();
                    } else if (aqUpper.includes('CODE:')) {
                        imeiRaw = aq.substring(aqUpper.indexOf('CODE:') + 5).trim();
                        imeiRaw = imeiRaw.replace(/\)$/, '').trim();
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

                    items.push({
                        id: `item_${i}_${Date.now()}`,
                        name,
                        oldPrice,
                        newPrice,
                        percent,
                        imei: imeiRaw,
                        selected: true
                    });
                }
                setBatchItems(items);
            } catch (err) {
                toast.error("Lỗi đọc file Excel");
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const downloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        const header = ['CODE', 'SẢN PHẨM', 'GIÁ NIÊM YẾT', 'GIÁ GIẢM', 'THỜI GIAN ÁP DỤNG', 'SỐ LƯỢNG SUẤT'];
        const sampleData = [
            ['ABC123', 'Quạt điều hoà Daikiosan DMI03', '5490000', '3490000', 'TỪ 08/05 ĐẾN 10/05', '5 SUẤT/NGÀY'],
            ['DEF456', 'Tủ lạnh Samsung RT29K5012S8', '8990000', '6990000', 'TỪ 08/05 ĐẾN 10/05', '5 SUẤT/NGÀY'],
        ];
        const ws = XLSX.utils.aoa_to_sheet([header, ...sampleData]);
        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 18 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'Sticker_Template.xlsx');
    };

    const parsePrice = (val: any): number => {
        if (val == null) return 0;
        const str = String(val).replace(/[^0-9]/g, '');
        return str ? Number(str) : 0;
    };

    const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                
                const items: BatchItem[] = [];
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.length < 2) continue;

                    const code = row[0] != null ? String(row[0]).trim() : '';
                    const name = row[1] != null ? String(row[1]).trim() : '';
                    if (!name) continue;

                    const retailPrice = parsePrice(row[2]);
                    const salePrice = parsePrice(row[3]);

                    const oldPrice = retailPrice ? retailPrice.toLocaleString('vi-VN') : '';
                    const newPrice = salePrice ? Number(Math.floor(salePrice / 1000)).toLocaleString('vi-VN') : '';

                    let percent = '';
                    if (retailPrice > 0 && salePrice > 0) {
                        const ratio = Math.round((salePrice / retailPrice - 1) * 100);
                        percent = `${ratio}%`;
                    }

                    items.push({
                        id: `tpl_${i}_${Date.now()}`,
                        name,
                        oldPrice,
                        newPrice,
                        percent,
                        imei: code,
                        selected: true,
                    });
                }
                if (items.length === 0) {
                    toast.error('Không tìm thấy dữ liệu hợp lệ trong file.');
                    return;
                }
                // Auto-filter by inventory if loaded
                if (inventoryCodes) {
                    items.forEach(it => {
                        it.selected = inventoryCodes.has(String(it.imei).replace(/\D/g, '').replace(/^0+/, ''));
                    });
                }
                setBatchItems(items);
                setShowBarcode(true);

                // Apply THỜI GIAN ÁP DỤNG and SỐ LƯỢNG SUẤT from first data row
                const firstRow = data[1];
                if (firstRow) {
                    const thoiGian = firstRow[4] != null ? String(firstRow[4]).trim() : '';
                    const soLuong = firstRow[5] != null ? String(firstRow[5]).trim() : '';
                    if (thoiGian) setHeaderTextContent(thoiGian);
                    if (soLuong) setSubHeaderTextContent(soLuong);
                }
            } catch (err) {
                toast.error('Lỗi đọc file Excel');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const handleInventoryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                const codes = new Set<string>();
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.length < 6) continue;
                    const colF = row[5];
                    if (colF == null) continue;
                    // Normalize: convert to string, trim, strip non-digits, remove leading zeros
                    const normalized = String(colF).trim().replace(/\D/g, '').replace(/^0+/, '');
                    if (normalized) codes.add(normalized);
                }
                if (codes.size === 0) {
                    toast.error('Không tìm thấy mã sản phẩm trong cột F của file tồn kho.');
                    return;
                }
                setInventoryCodes(codes);
                // Auto-filter existing batch items
                if (batchItems.length > 0) {
                    setBatchItems(prev => prev.map(it => ({
                        ...it,
                        selected: codes.has(String(it.imei).replace(/\D/g, '').replace(/^0+/, ''))
                    })));
                }
            } catch (err) {
                toast.error('Lỗi đọc file tồn kho');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const clearInventory = () => {
        setInventoryCodes(null);
        // Restore all items to selected
        setBatchItems(prev => prev.map(it => ({ ...it, selected: true })));
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
        const page: StickerPage = {
            id: `page_${Date.now()}`,
            html: firstSticker.outerHTML,
            label: label.substring(0, 50),
            oldPrice,
            newPrice,
            percent,
            timestamp: Date.now(),
        };
        setManualPages(prev => [...prev, page]);
    };

    const loadPageToEditor = (page: StickerPage) => {
        // Parse data from the saved HTML and load into React state
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = page.html;
        const sticker = tempDiv.querySelector('.sticker-container') as HTMLElement;
        if (!sticker) return;

        // Extract text content from the saved sticker HTML
        const headerText = sticker.querySelector('.header-text')?.textContent || headerTextContent;
        const nameText = sticker.querySelector('.name')?.textContent || '';
        const oldPriceText = sticker.querySelector('.old')?.textContent || '';
        const newPriceText = sticker.querySelector('.extra2')?.textContent || '';
        const percentText = sticker.querySelector('.extra1')?.textContent || '';
        const footerText = sticker.querySelector('.footer-text')?.textContent || footerTextContent;
        const subHeader = sticker.querySelector('.sub-header')?.textContent || subHeaderTextContent;

        // Apply to React state
        setHeaderTextContent(headerText);
        setSubHeaderTextContent(subHeader);
        setFooterTextContent(footerText);
        footerContentRef.current = footerText;
        previewNameRef.current = nameText;

        // Clear batch items and set as single-item to populate the sticker
        setBatchItems([{
            id: `loaded_${Date.now()}`,
            name: nameText,
            oldPrice: oldPriceText,
            newPrice: newPriceText,
            percent: percentText,
            imei: '',
            selected: true,
        }]);

        // Reset contentEditable refs
        if (nameRef.current) {
            nameRef.current.removeAttribute('data-initialized');
        }
        if (footerRef.current) {
            footerRef.current.removeAttribute('data-initialized');
        }
        // Dòng vẫn giữ nguyên trong hàng đợi — KHÔNG xóa
    };

    const removeManualPage = (id: string) => {
        setManualPages(prev => prev.filter(p => p.id !== id));
    };

    const clearManualPages = () => {
        setManualPages([]);
    };

    const saveCurrentList = () => {
        if (manualPages.length === 0) return;
        const name = prompt('Đặt tên cho danh sách:', `DS ${new Date().toLocaleDateString('vi-VN')}`);
        if (!name) return;
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
    };

    const loadSavedList = (list: SavedStickerList) => {
        setManualPages(list.pages);
        if (list.stickerType) setStickerType(list.stickerType);
        if (list.headerTextContent) setHeaderTextContent(list.headerTextContent);
        setShowSavedLists(false);
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
        setBatchItems(entry.batchItems);
        setHeaderTextContent(entry.headerTextContent);
        setSubHeaderTextContent(entry.subHeaderTextContent);
        setFooterTextContent(entry.footerTextContent);
        footerContentRef.current = entry.footerTextContent;
        setShowBarcode(entry.showBarcode);
        setManualPages(entry.manualPages || []);
        setShowHistory(false);
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
    };

    const handlePrint = () => {
        const printSection = document.getElementById('print-section');
        if (!printSection) return;

        // Create a temporary wrapper directly under <body>
        const printHost = document.createElement('div');
        printHost.id = 'print-host';
        printHost.innerHTML = printSection.innerHTML;

        // Append manual pages (queued sticker snapshots)
        manualPages.forEach(page => {
            printHost.innerHTML += page.html;
        });

        document.body.appendChild(printHost);

        // Hide the app, show only the print host
        const root = document.getElementById('root');
        if (root) root.style.display = 'none';

        // Save to print history
        const selectedCount = batchItems.filter(i => i.selected).length;
        const totalPages = Math.max(selectedCount, 1) + manualPages.length;
        const historyEntry: PrintHistoryEntry = {
            id: `history_${Date.now()}`,
            timestamp: Date.now(),
            label: headerTextContent || 'Sticker',
            pageCount: totalPages,
            stickerType,
            bgImage,
            headerTextSize,
            batchItems,
            headerTextContent,
            subHeaderTextContent,
            footerTextContent,
            showBarcode,
            manualPages,
        };
        setPrintHistory(prev => {
            const next = [historyEntry, ...prev].slice(0, 20);
            saveSetting(STICKER_HISTORY_KEY, next).catch(() => {});
            return next;
        });

        window.print();

        // Cleanup: restore the app
        if (root) root.style.display = '';
        document.body.removeChild(printHost);
    };

    return (
        <div className="print-wrapper w-full h-[calc(100vh-64px)] bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
            {mounted && activeTab === 'tools-print-sticker' && document.getElementById(isMobile ? 'mobile-topbar-actions' : 'global-header-actions') && createPortal(
                <div className="flex items-center gap-0.5 lg:gap-1 bg-white/60 dark:bg-slate-900/60 p-1 lg:p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300 mr-1 lg:mr-0">
                    <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-0.5 lg:p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                        <button
                            onClick={() => {
                                setStickerMode('sticker');
                                setStickerType('gia_soc');
                                setHeaderTextContent('QUẠT ĐIỀU HOÀ');
                                setBgImage('/frame/X24_NEW.png');
                                setHeaderTextSize(8);
                            }}
                            className={`flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${
                                stickerMode === 'sticker' && stickerType === 'gia_soc' 
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="lg:hidden">Giá Sốc</span>
                            <span className="hidden lg:inline">{stickerMode === 'sticker' && stickerType === 'gia_soc' && <CheckCircle2 size={14} className="inline mr-1 text-indigo-600 dark:text-indigo-400" />}Giá Sốc</span>
                        </button>
                        <button
                            onClick={() => {
                                setStickerMode('sticker');
                                setStickerType('gio_vang');
                                setHeaderTextContent('TỪ 00/00 ĐẾN 00/00');
                                setBgImage('/frame/GVO2-scaled.png');
                                setHeaderTextSize(8);
                            }}
                            className={`flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${
                                stickerMode === 'sticker' && stickerType === 'gio_vang' 
                                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="lg:hidden">Giờ Vàng</span>
                            <span className="hidden lg:inline">{stickerMode === 'sticker' && stickerType === 'gio_vang' && <CheckCircle2 size={14} className="inline mr-1 text-amber-600 dark:text-amber-400" />}Giờ Vàng</span>
                        </button>
                        <button
                            onClick={() => { setStickerMode('event'); setEventEverOpened(true); }}
                            className={`flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full font-semibold text-[11px] lg:text-[13px] transition-all ${
                                stickerMode === 'event' 
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="lg:hidden">Event</span>
                            <span className="hidden lg:inline">{stickerMode === 'event' && <CheckCircle2 size={14} className="inline mr-1 text-emerald-600 dark:text-emerald-400" />}<Package size={14} className="inline mr-1" />Event - Tồn kho</span>
                        </button>
                    </div>
                    
                    {stickerMode === 'sticker' && (
                        <div className="flex items-center gap-1 ml-0.5 lg:ml-1 pl-1.5 lg:pl-2 border-l border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-left-2 duration-200">
                            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-full overflow-hidden shadow-sm h-[22px] lg:h-[26px]">
                                <button onClick={() => setHeaderTextSize(s => Number((s - 0.2).toFixed(1)))} className="px-1.5 lg:px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors" title="Giảm size">-</button>
                                <span className="px-0 text-[10px] lg:text-[11px] font-bold text-slate-700 dark:text-slate-300 w-5 lg:w-7 text-center">{headerTextSize}</span>
                                <button onClick={() => setHeaderTextSize(s => Number((s + 0.2).toFixed(1)))} className="px-1.5 lg:px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors" title="Tăng size">+</button>
                            </div>
                        </div>
                    )}
                </div>,
                document.getElementById(isMobile ? 'mobile-topbar-actions' : 'global-header-actions')!
            )}

            {/* Event native component — always mounted once opened, toggled via CSS */}
            {eventEverOpened && (
                <div className={`absolute inset-0 z-10 w-full h-full overflow-y-auto transition-opacity duration-200 ${stickerMode === 'event' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
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
                </div>
            )}

            {/* Sticker editor — always mounted, toggled via CSS */}
            <div className={`w-full h-full overflow-y-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8 justify-center items-start ${stickerMode === 'event' ? 'invisible' : 'visible'}`}>

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
                    font-family: 'UTM Penumbra', sans-serif !important;
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

            {/* Print Section (Left) */}
            <div className="bg-white p-0 shadow-xl border border-slate-200 shrink-0 w-full max-w-[550px] overflow-hidden no-print-bg">
                <div id="print-section" className="w-full">
                    {batchItems.length > 0 ? (
                        batchItems.filter(it => it.selected).map((item, index, arr) => (
                            <div key={item.id} className="sticker-container" data-type={stickerType} style={{ pageBreakAfter: index < arr.length - 1 ? 'always' : 'auto' }}>
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
                                <div className="old" contentEditable suppressContentEditableWarning>{item.oldPrice}</div>
                                <div className="name" contentEditable suppressContentEditableWarning>{item.name}</div>
                                {stickerType === 'gio_vang' ? (
                                    <div className="extra2 flex items-baseline justify-center">
                                        <span contentEditable suppressContentEditableWarning>{item.newPrice}</span>
                                        <span className="small-zeros" contentEditable={false}>.000</span>
                                    </div>
                                ) : (
                                    <div className="extra2" contentEditable suppressContentEditableWarning>{item.newPrice}</div>
                                )}
                                <div className="footer-text" contentEditable suppressContentEditableWarning>{footerTextContent}</div>
                            </div>
                        ))
                    ) : (
                        <div className="sticker-container" data-type={stickerType}>
                            {showBarcode && barcodeImei && (
                                <div className="barcode">
                                    <BarcodeCanvas value={barcodeImei} />
                                </div>
                            )}
                            <div className="header-text" ref={headerRef} onInput={handleTextInput} contentEditable suppressContentEditableWarning />
                            {stickerType === 'gio_vang' && (
                                <div className="sub-header" ref={subHeaderRef} onInput={handleSubHeaderInput} contentEditable suppressContentEditableWarning />
                            )}
                            <div className="extra1" ref={percentRef} contentEditable suppressContentEditableWarning>-36%</div>
                            <div className="old" ref={oldPriceRef} onInput={handlePriceInput} contentEditable suppressContentEditableWarning>5.490.000</div>
                            <div className="name" ref={nameRef} onInput={handleNameInput} contentEditable suppressContentEditableWarning />
                            {stickerType === 'gio_vang' ? (
                                <div className="extra2 flex items-baseline justify-center">
                                    <span ref={newPriceRef} onInput={handlePriceInput} contentEditable suppressContentEditableWarning>10.990</span>
                                    <span className="small-zeros" contentEditable={false}>.000</span>
                                </div>
                            ) : (
                                <div className="extra2" ref={newPriceRef} onInput={handlePriceInput} contentEditable suppressContentEditableWarning>3.490</div>
                            )}
                            <div className="footer-text" ref={footerRef} onInput={handleFooterTextInput} contentEditable suppressContentEditableWarning />
                        </div>
                    )}
                </div>
            </div>

            {/* Instruction Panel (Right) - no-print */}
            {/* Manual Pages Queue */}
            {manualPages.length > 0 && (
                <div className="w-full max-w-[550px] no-print">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                <Clock size={16} className="text-indigo-500" />
                                Hàng đợi in ({manualPages.length} trang)
                            </h4>
                            <div className="flex items-center gap-2">
                                <button onClick={saveCurrentList} className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold uppercase flex items-center gap-1" title="Lưu danh sách này">
                                    <CheckCircle2 size={12} /> Lưu DS
                                </button>
                                <button onClick={clearManualPages} className="text-[11px] text-red-500 hover:text-red-600 font-bold uppercase flex items-center gap-1">
                                    <Trash2 size={12} /> Xóa tất cả
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {manualPages.map((page, idx) => (
                                <div 
                                    key={page.id} 
                                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors group"
                                    onClick={() => loadPageToEditor(page)}
                                    title="Click để load lại và chỉnh sửa"
                                >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 w-6 h-6 flex items-center justify-center rounded-full shrink-0">{idx + 1}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs text-slate-700 dark:text-slate-300 truncate font-medium">{page.label}</p>
                                            <div className="flex gap-2 mt-0.5 text-[10px]">
                                                <span className="text-red-600 font-bold">{page.newPrice}</span>
                                                <span className="line-through text-slate-400">{page.oldPrice}</span>
                                                {page.percent && <span className="text-green-600 font-bold">{page.percent}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); removeManualPage(page.id); }} 
                                        className="text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Saved Lists */}
            {savedLists.length > 0 && manualPages.length === 0 && (
                <div className="w-full max-w-[550px] no-print">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
                        <button 
                            onClick={() => setShowSavedLists(!showSavedLists)}
                            className="w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <ImageIcon size={16} className="text-emerald-500" />
                                Danh sách đã lưu ({savedLists.length})
                            </span>
                            {showSavedLists ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {showSavedLists && (
                            <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
                                {savedLists.map(list => (
                                    <div key={list.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 group">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{list.name}</p>
                                            <div className="flex gap-2 mt-0.5 text-[10px] text-slate-400">
                                                <span>{new Date(list.timestamp).toLocaleDateString('vi-VN')}</span>
                                                <span>•</span>
                                                <span>{list.pages.length} trang</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 shrink-0 ml-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => loadSavedList(list)}
                                                className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 transition-colors text-[10px] font-bold"
                                                title="Tải danh sách"
                                            >
                                                <RotateCcw size={13} />
                                            </button>
                                            <button 
                                                onClick={() => deleteSavedList(list.id)}
                                                className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-lg hover:bg-red-200 transition-colors"
                                                title="Xóa"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Instruction Panel (Right) - no-print */}
            <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 no-print">
                <div className="flex gap-2 mb-4">
                    <button 
                        onClick={handlePrint}
                        className="flex-1 bg-[#fbbc04] hover:bg-[#f0b400] text-black font-black text-lg py-3.5 rounded-xl flex items-center justify-center gap-2.5 transition-transform active:scale-95 shadow-lg shadow-yellow-500/30"
                    >
                        <Printer size={24} />
                        BẤM ĐỂ IN {manualPages.length > 0 && `(${(batchItems.filter(i => i.selected).length || 1) + manualPages.length})`}
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
                                        Danh sách in ({batchItems.filter(i => i.selected).length}/{batchItems.length})
                                    </h4>
                                    <div className="flex gap-3">
                                        <button onClick={() => toggleAllSelection(true)} className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold uppercase">Chọn hết</button>
                                        <button onClick={() => toggleAllSelection(false)} className="text-[11px] text-slate-500 hover:text-slate-600 font-bold uppercase">Bỏ chọn</button>
                                        <button onClick={() => setBatchItems([])} className="text-[11px] text-red-500 hover:text-red-600 font-bold uppercase">Xóa</button>
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
                                    {batchItems.filter(it => it.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
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
            </div>
        </div>
    );
}
