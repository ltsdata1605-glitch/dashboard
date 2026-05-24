import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Package } from 'lucide-react';
import { useActiveTab } from '../../contexts/LayoutContext';
import { saveSetting, getSetting } from '../../services/dbService';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

import { StickerPage, SavedStickerList, PrintHistoryEntry, BatchItem } from './stickerprinter/types';
import { StickerPrintPreview } from './stickerprinter/StickerPrintPreview';
import { StickerManualQueue } from './stickerprinter/StickerManualQueue';
import { StickerPrintControls } from './stickerprinter/StickerPrintControls';

const StickerEventApp = lazy(() => import('./StickerEventApp'));

const STICKER_DB_KEY = 'stickerPrinterState';
const STICKER_HISTORY_KEY = 'stickerPrintHistory';
const STICKER_SAVED_LISTS_KEY = 'stickerSavedLists';

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
    const [previewName, setPreviewName] = useState('Quạt điều hoà Daikiosan DMI03');

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
                if (saved.footerTextContent) setFooterTextContent(saved.footerTextContent);
                if (saved.showBarcode != null) setShowBarcode(saved.showBarcode);
                if (saved.previewName) setPreviewName(saved.previewName);
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
                previewName,
                manualPages,
            }).catch(() => {});
        }, 500);
        return () => clearTimeout(timer);
    }, [isLoaded, stickerType, bgImage, headerTextSize, batchItems, headerTextContent, subHeaderTextContent, footerTextContent, showBarcode, manualPages, previewName]);

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
                if (inventoryCodes) {
                    items.forEach(it => {
                        it.selected = inventoryCodes.has(String(it.imei).replace(/\D/g, '').replace(/^0+/, ''));
                    });
                }
                setBatchItems(items);
                setShowBarcode(true);

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
                    const normalized = String(colF).trim().replace(/\D/g, '').replace(/^0+/, '');
                    if (normalized) codes.add(normalized);
                }
                if (codes.size === 0) {
                    toast.error('Không tìm thấy mã sản phẩm trong cột F của file tồn kho.');
                    return;
                }
                setInventoryCodes(codes);
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
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = page.html;
        const sticker = tempDiv.querySelector('.sticker-container') as HTMLElement;
        if (!sticker) return;

        const headerText = sticker.querySelector('.header-text')?.textContent || headerTextContent;
        const nameText = sticker.querySelector('.name')?.textContent || '';
        const oldPriceText = sticker.querySelector('.old')?.textContent || '';
        const newPriceText = sticker.querySelector('.extra2')?.textContent || '';
        const percentText = sticker.querySelector('.extra1')?.textContent || '';
        const footerText = sticker.querySelector('.footer-text')?.textContent || footerTextContent;
        const subHeader = sticker.querySelector('.sub-header')?.textContent || subHeaderTextContent;

        setHeaderTextContent(headerText);
        setSubHeaderTextContent(subHeader);
        setFooterTextContent(footerText);
        setPreviewName(nameText);

        setBatchItems([{
            id: `loaded_${Date.now()}`,
            name: nameText,
            oldPrice: oldPriceText,
            newPrice: newPriceText,
            percent: percentText,
            imei: '',
            selected: true,
        }]);
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

        const printHost = document.createElement('div');
        printHost.id = 'print-host';
        printHost.innerHTML = printSection.innerHTML;

        manualPages.forEach(page => {
            printHost.innerHTML += page.html;
        });

        document.body.appendChild(printHost);

        const root = document.getElementById('root');
        if (root) root.style.display = 'none';

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

            <div className={`w-full h-full overflow-y-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8 justify-center items-start ${stickerMode === 'event' ? 'invisible' : 'visible'}`}>
                <div className="flex flex-col gap-4">
                    <StickerPrintPreview
                        batchItems={batchItems}
                        stickerType={stickerType}
                        showBarcode={showBarcode}
                        headerTextContent={headerTextContent}
                        subHeaderTextContent={subHeaderTextContent}
                        footerTextContent={footerTextContent}
                        barcodeImei={barcodeImei}
                        bgImage={bgImage}
                        headerTextSize={headerTextSize}
                        previewName={previewName}
                        setHeaderTextContent={setHeaderTextContent}
                        setSubHeaderTextContent={setSubHeaderTextContent}
                        setFooterTextContent={setFooterTextContent}
                        setBarcodeImei={setBarcodeImei}
                        setPreviewName={setPreviewName}
                    />
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
                    />
                </div>
                <StickerPrintControls
                    manualPages={manualPages}
                    batchItems={batchItems}
                    showBarcode={showBarcode}
                    setShowBarcode={setShowBarcode}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    inventoryCodes={inventoryCodes}
                    printHistory={printHistory}
                    showHistory={showHistory}
                    setShowHistory={setShowHistory}
                    handlePrint={handlePrint}
                    addCurrentPage={addCurrentPage}
                    handleExcelUpload={handleExcelUpload}
                    handleTemplateUpload={handleTemplateUpload}
                    handleInventoryUpload={handleInventoryUpload}
                    downloadTemplate={downloadTemplate}
                    clearInventory={clearInventory}
                    handleReset={handleReset}
                    toggleAllSelection={toggleAllSelection}
                    toggleItemSelection={toggleItemSelection}
                    clearBatchItems={() => setBatchItems([])}
                    restoreHistory={restoreHistory}
                    deleteHistory={deleteHistory}
                />
            </div>
        </div>
    );
}
