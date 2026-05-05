import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Settings, CheckCircle2, Image as ImageIcon, Upload } from 'lucide-react';
import { useActiveTab } from '../../contexts/LayoutContext';
import * as XLSX from 'xlsx';

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
    const [stickerType, setStickerType] = useState<'gia_soc' | 'gio_vang'>('gia_soc');
    const [bgImage, setBgImage] = useState('/frame/X24_NEW.png');
    const [headerTextSize, setHeaderTextSize] = useState(8);
    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const [headerTextContent, setHeaderTextContent] = useState('QUẠT ĐIỀU HOÀ');
    const [subHeaderTextContent, setSubHeaderTextContent] = useState('0 SUẤT/NGÀY');
    const [footerTextContent, setFooterTextContent] = useState('Khuyến mãi áp dụng đến hết ngày 3/5/2026');
    const [searchTerm, setSearchTerm] = useState('');
    const [showBarcode, setShowBarcode] = useState(false);
    const [barcodeImei, setBarcodeImei] = useState('123456');
    const nameRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const previewNameRef = useRef('Quạt điều hoà Daikiosan DMI03');
    const footerContentRef = useRef('Khuyến mãi áp dụng đến hết ngày 3/5/2026');
    const headerRef = useRef<HTMLDivElement>(null);
    const subHeaderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

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
                console.error(err);
                alert("Lỗi đọc file Excel");
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
        document.body.appendChild(printHost);

        // Hide the app, show only the print host
        const root = document.getElementById('root');
        if (root) root.style.display = 'none';

        window.print();

        // Cleanup: restore the app
        if (root) root.style.display = '';
        document.body.removeChild(printHost);
    };

    return (
        <div className="print-wrapper w-full h-full p-4 lg:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-900 flex flex-col lg:flex-row gap-8 justify-center items-start">
            {mounted && activeTab === 'tools-print-sticker' && document.getElementById('global-header-actions') && createPortal(
                <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300">
                    <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                        <button
                            onClick={() => {
                                setStickerType('gia_soc');
                                setHeaderTextContent('QUẠT ĐIỀU HOÀ');
                                setBgImage('/frame/X24_NEW.png');
                                setHeaderTextSize(8);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-[13px] transition-all ${
                                stickerType === 'gia_soc' 
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                        >
                            {stickerType === 'gia_soc' && <CheckCircle2 size={14} className="text-indigo-600 dark:text-indigo-400" />} Giá Sốc
                        </button>
                        <button
                            onClick={() => {
                                setStickerType('gio_vang');
                                setHeaderTextContent('TỪ 00/00 ĐẾN 00/00');
                                setBgImage('/frame/GVO2-scaled.png');
                                setHeaderTextSize(7.5);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-[13px] transition-all ${
                                stickerType === 'gio_vang' 
                                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                        >
                            {stickerType === 'gio_vang' && <CheckCircle2 size={14} className="text-amber-600 dark:text-amber-400" />} Giờ Vàng
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-left-2 duration-200">
                        <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-full overflow-hidden shadow-sm h-[26px]">
                            <button onClick={() => setHeaderTextSize(s => Number((s - 0.2).toFixed(1)))} className="px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors" title="Giảm size">-</button>
                            <span className="px-0 text-[11px] font-bold text-slate-700 dark:text-slate-300 w-7 text-center">{headerTextSize}</span>
                            <button onClick={() => setHeaderTextSize(s => Number((s + 0.2).toFixed(1)))} className="px-2 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black transition-colors" title="Tăng size">+</button>
                        </div>
                    </div>
                </div>,
                document.getElementById('global-header-actions')!
            )}
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
                    top: 4.2%;
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
                    height: 2.2%;
                    display: flex;
                    justify-content: center;
                }
                .sticker-container .barcode img {
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
                                        <img src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(item.imei)}&includetext=false`} alt="barcode" crossOrigin="anonymous" />
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
                                    <img src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeImei)}&includetext=false`} alt="barcode" crossOrigin="anonymous" />
                                </div>
                            )}
                            <div className="header-text" ref={headerRef} onInput={handleTextInput} contentEditable suppressContentEditableWarning />
                            {stickerType === 'gio_vang' && (
                                <div className="sub-header" ref={subHeaderRef} onInput={handleSubHeaderInput} contentEditable suppressContentEditableWarning />
                            )}
                            <div className="extra1" contentEditable suppressContentEditableWarning>-36%</div>
                            <div className="old" onInput={handlePriceInput} contentEditable suppressContentEditableWarning>5.490.000</div>
                            <div className="name" ref={nameRef} onInput={handleNameInput} contentEditable suppressContentEditableWarning />
                            {stickerType === 'gio_vang' ? (
                                <div className="extra2 flex items-baseline justify-center">
                                    <span onInput={handlePriceInput} contentEditable suppressContentEditableWarning>10.990</span>
                                    <span className="small-zeros" contentEditable={false}>.000</span>
                                </div>
                            ) : (
                                <div className="extra2" onInput={handlePriceInput} contentEditable suppressContentEditableWarning>3.490</div>
                            )}
                            <div className="footer-text" ref={footerRef} onInput={handleFooterTextInput} contentEditable suppressContentEditableWarning />
                        </div>
                    )}
                </div>
            </div>

            {/* Instruction Panel (Right) - no-print */}
            <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 no-print">
                <button 
                    onClick={handlePrint}
                    className="w-full bg-[#fbbc04] hover:bg-[#f0b400] text-black font-black text-xl py-4 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg shadow-yellow-500/30 mb-8"
                >
                    <Printer size={28} />
                    BẤM ĐỂ IN
                </button>

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
                </div>
            </div>
        </div>
    );
}
