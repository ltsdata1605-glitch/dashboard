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
import { generateBarcodeDataUrl } from '../../components/views/BarcodeCanvas';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';


const StickerEventApp = lazy(() => import('./StickerEventApp'));

const STICKER_DB_KEY = 'stickerPrinterState';
const STICKER_HISTORY_KEY = 'stickerPrintHistory';
const STICKER_SAVED_LISTS_KEY = 'stickerSavedLists';

export default function StickerPrinterView() {
    const { activeTab } = useActiveTab();
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [stickerMode, setStickerMode] = useState<'sticker' | 'event'>('sticker');
    const [eventEverOpened, setEventEverOpened] = useState(false);
    const [stickerType, setStickerType] = useState<'gia_soc' | 'gio_vang'>('gia_soc');
    const [bgImage, setBgImage] = useState('/frame/X24_NEW.png');
    
    // Dynamic Font Sizes and Active Field Trackers
    const [activeField, setActiveField] = useState<'header' | 'subHeader' | 'percent' | 'oldPrice' | 'name' | 'newPrice' | 'footer'>('header');
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
    const [previewOldPrice, setPreviewOldPrice] = useState('5.490.000');
    const [previewNewPrice, setPreviewNewPrice] = useState('3.490');

    const [isLoaded, setIsLoaded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

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
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Load print history and saved lists only once on mount
    useEffect(() => {
        setMounted(true);
        // Load print history
        getSetting<PrintHistoryEntry[]>(STICKER_HISTORY_KEY).then(history => {
            if (history) setPrintHistory(history);
        }).catch(() => {});
        // Load saved lists
        getSetting<SavedStickerList[]>(STICKER_SAVED_LISTS_KEY).then(lists => {
            if (lists) setSavedLists(lists);
        }).catch(() => {});
    }, []);

    // Load settings from Firestore (if logged in) or IndexedDB
    useEffect(() => {
        let active = true;
        async function loadSettings() {
            try {
                let saved: any = null;
                if (user) {
                    const docRef = doc(db, 'users', user.uid, 'settings', 'stickerPrinter');
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        saved = docSnap.data();
                    }
                }
                
                if (!saved) {
                    saved = await getSetting<any>(STICKER_DB_KEY);
                }
                
                if (saved && active) {
                    if (saved.stickerType) setStickerType(saved.stickerType);
                    if (saved.bgImage) setBgImage(saved.bgImage);
                    if (saved.headerTextContent) setHeaderTextContent(saved.headerTextContent);
                    if (saved.subHeaderTextContent) setSubHeaderTextContent(saved.subHeaderTextContent);
                    if (saved.footerTextContent) setFooterTextContent(saved.footerTextContent);
                    if (saved.showBarcode != null) setShowBarcode(saved.showBarcode);
                    if (saved.previewName) setPreviewName(saved.previewName);
                    if (saved.previewOldPrice) setPreviewOldPrice(saved.previewOldPrice);
                    if (saved.previewNewPrice) setPreviewNewPrice(saved.previewNewPrice);
                    if (saved.discountDisplayMode) setDiscountDisplayMode(saved.discountDisplayMode);
                    
                    // Font sizes
                    if (saved.headerTextSize != null) setHeaderTextSize(saved.headerTextSize);
                    if (saved.subHeaderTextSize != null) setSubHeaderTextSize(saved.subHeaderTextSize);
                    if (saved.percentTextSize != null) setPercentTextSize(saved.percentTextSize);
                    if (saved.oldPriceTextSize != null) setOldPriceTextSize(saved.oldPriceTextSize);
                    if (saved.nameTextSize != null) setNameTextSize(saved.nameTextSize);
                    if (saved.newPriceTextSize != null) setNewPriceTextSize(saved.newPriceTextSize);
                    if (saved.footerTextSize != null) setFooterTextSize(saved.footerTextSize);
                    
                    // Sync loaded Firestore settings to local IndexedDB
                    if (user) {
                        await saveSetting(STICKER_DB_KEY, saved);
                    }
                }
            } catch (err) {
                console.error("Error loading settings:", err);
            } finally {
                if (active) {
                    setIsLoaded(true);
                }
            }
        }
        loadSettings();
        return () => {
            active = false;
        };
    }, [user]);

    // Save state to IndexedDB and Firebase whenever key values change (debounced)
    useEffect(() => {
        if (!isLoaded) return;
        const timer = setTimeout(async () => {
            const dataToSave = {
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
                updatedAt: new Date().toISOString()
            };
            
            try {
                await saveSetting(STICKER_DB_KEY, dataToSave);
            } catch (e) {
                console.error("IndexedDB save failed", e);
            }
            
            if (user) {
                try {
                    const docRef = doc(db, 'users', user.uid, 'settings', 'stickerPrinter');
                    await setDoc(docRef, dataToSave);
                } catch (e) {
                    console.error("Firebase save failed", e);
                }
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [
        isLoaded,
        user,
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
        discountDisplayMode
    ]);


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
            } catch (err) {
                toast.error("Lỗi đọc file Excel");
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const downloadTemplate = () => {
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
            header = ['CODE', 'SẢN PHẨM', 'GIÁ NIÊM YẾT', 'GIÁ GIẢM', 'THỜI GIAN ÁP DỤNG', 'SỐ LƯỢNG SUẤT'];
            sampleData = [
                ['ABC123', 'Quạt điều hoà Daikiosan DMI03', '5490000', '3490000', 'TỪ 08/05 ĐẾN 10/05', '5 SUẤT/NGÀY'],
                ['DEF456', 'Tủ lạnh Samsung RT29K5012S8', '8990000', '6990000', 'TỪ 08/05 ĐẾN 10/05', '5 SUẤT/NGÀY'],
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
                    });
                }

                if (newPages.length === 0) {
                    toast.error('Không tìm thấy dữ liệu hợp lệ trong file.');
                    return;
                }

                // Add all imported stickers to the print queue
                setManualPages(prev => [...prev, ...newPages]);
                toast.success(`Đã thêm ${newPages.length} sticker vào hàng đợi in`);
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
        const newPriceText = sticker.querySelector('.extra2 span')?.textContent || sticker.querySelector('.extra2')?.textContent || '';
        const footerText = sticker.querySelector('.footer-text')?.textContent || footerTextContent;
        const subHeader = sticker.querySelector('.sub-header')?.textContent || subHeaderTextContent;

        setHeaderTextContent(headerText);
        setSubHeaderTextContent(subHeader);
        setFooterTextContent(footerText);
        setPreviewOldPrice(oldPriceText);
        setPreviewNewPrice(newPriceText);

        // Extract barcode value from img alt attribute if it exists
        const barcodeImg = sticker.querySelector('.barcode img');
        const barcodeVal = barcodeImg?.getAttribute('alt') || '';
        if (barcodeVal) {
            setBarcodeImei(barcodeVal);
        }

        setPreviewName(nameText);
        setBatchItems([]);
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
        const printSection = document.getElementById('print-section');
        if (!printSection) return;

        const previewPageCount = batchItems.length > 0 ? batchItems.filter(i => i.selected).length : (manualPages.length === 0 ? 1 : 0);
        const selectedManualPages = manualPages.filter(p => p.selected !== false);
        const totalPages = previewPageCount + selectedManualPages.length;

        if (totalPages === 0) {
            toast.error("Không có trang nào để in!");
            return;
        }

        const printHost = document.createElement('div');
        printHost.id = 'print-host';
        
        if (batchItems.length > 0 || manualPages.length === 0) {
            printHost.innerHTML = printSection.innerHTML;
        } else {
            printHost.innerHTML = '';
        }

        // Then append queued manual pages
        selectedManualPages.forEach(page => {
            printHost.innerHTML += page.html;
        });

        // Loop through all stickers inside printHost and force percentage discount!
        const stickers = printHost.querySelectorAll('.sticker-container');
        stickers.forEach(sticker => {
            const oldEl = sticker.querySelector('.old') as HTMLElement;
            const newEl = sticker.querySelector('.extra2') as HTMLElement;
            const pctEl = sticker.querySelector('.extra1') as HTMLElement;
            if (oldEl && newEl && pctEl) {
                const oldVal = Number(oldEl.innerText.replace(/\D/g, ''));
                let newVal = Number(newEl.innerText.replace(/\D/g, ''));
                if (oldVal > 0 && newVal > 0) {
                    if (newVal * 1000 <= oldVal * 1.5 && newVal < oldVal) {
                        newVal = newVal * 1000;
                    }
                    const ratio = Math.round((newVal / oldVal - 1) * 100);
                    if (ratio < 0) {
                        pctEl.innerText = `${ratio}%`;
                    } else {
                        pctEl.innerText = '';
                    }
                }
            }
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
                            <span className="text-[10px] lg:text-[11px] font-medium text-slate-500 mr-0.5 dark:text-slate-400">{getActiveFieldLabel()}:</span>
                            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-full overflow-hidden shadow-sm h-[22px] lg:h-[26px]">
                                <button onClick={() => setActiveFontSize(s => Math.max(1, s - 0.2))} className="px-1.5 lg:px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors" title="Giảm size">-</button>
                                <span className="px-0 text-[10px] lg:text-[11px] font-bold text-slate-700 dark:text-slate-300 w-6 lg:w-8 text-center">{getActiveFontSize()}</span>
                                <button onClick={() => setActiveFontSize(s => s + 0.2)} className="px-1.5 lg:px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors" title="Tăng size">+</button>
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
                    discountThreshold={discountThreshold}
                    handleDiscountThresholdChange={handleDiscountThresholdChange}
                    activeQueuePageId={activeQueuePageId}
                    setActiveQueuePageId={setActiveQueuePageId}
                />
            </div>
        </div>
    );
}
