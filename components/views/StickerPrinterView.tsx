import React, { useState, useRef } from 'react';
import { Printer, Settings, CheckCircle2, Upload, ChevronUp, ChevronDown } from 'lucide-react';

const FONTS = [
    { label: 'Mặc định (Arial)', value: 'Arial, sans-serif' },
    { label: 'Inter', value: "'Inter', sans-serif" },
    { label: 'Oswald', value: "'Oswald', sans-serif" },
    { label: 'Roboto Condensed', value: "'Roboto Condensed', sans-serif" },
    { label: 'Fjalla One', value: "'Fjalla One', sans-serif" },
    { label: 'Archivo Narrow', value: "'Archivo Narrow', sans-serif" },
    { label: 'Jost', value: "'Jost', sans-serif" },
    { label: 'Bai Jamjuree', value: "'Bai Jamjuree', sans-serif" },
    { label: 'Anton', value: "'Anton', sans-serif" },
    { label: 'Bebas Neue', value: "'Bebas Neue', sans-serif" },
    { label: 'Kanit', value: "'Kanit', sans-serif" },
    { label: 'Alata Regular', value: "'Alata Regular', sans-serif" },
    { label: 'Shopee Text', value: "'Shopee Text', sans-serif" },
    { label: 'SF Pro Display', value: "'SF Pro Display', sans-serif" },
    { label: 'SVN-Gilroy', value: "'SVN-Gilroy', sans-serif" },
    { label: 'Samsung Sharp Sans', value: "'Samsung Sharp Sans', sans-serif" },
    { label: 'Shopee Display', value: "'Shopee Display', sans-serif" },
    { label: 'UTM Aurora', value: "'UTM Aurora', sans-serif" },
    { label: 'UTM Avo', value: "'UTM Avo', sans-serif" },
    { label: 'UTM Cafeta', value: "'UTM Cafeta', sans-serif" },
    { label: 'UTM Colossalis', value: "'UTM Colossalis', sans-serif" },
    { label: 'UTM Gloria', value: "'UTM Gloria', sans-serif" },
    { label: 'UTM Libel KT', value: "'UTM Libel KT', sans-serif" },
    { label: 'UTM Pacific Standard', value: "'UTM Pacific Standard', sans-serif" },
    { label: 'UTM Penumbra', value: "'UTM Penumbra', sans-serif" },
    { label: 'Impact', value: 'Impact, sans-serif' },
    { label: 'Arial Black', value: '"Arial Black", sans-serif' }
];

const WEIGHTS = [
    { label: 'Đen (900)', value: '900' },
    { label: 'Siêu Đậm (800)', value: '800' },
    { label: 'Đậm (700)', value: '700' },
    { label: 'Bán Đậm (600)', value: '600' },
    { label: 'Vừa (500)', value: '500' },
    { label: 'Thường (400)', value: '400' }
];

export default function StickerPrinterView() {
    const [percentFont, setPercentFont] = useState("'UTM Avo', sans-serif");
    const [percentWeight, setPercentWeight] = useState('900');
    
    const [oldPriceFont, setOldPriceFont] = useState("'UTM Penumbra', sans-serif");
    const [oldPriceWeight, setOldPriceWeight] = useState('400');
    
    const [newPriceFont, setNewPriceFont] = useState("'UTM Colossalis', sans-serif");
    const [newPriceWeight, setNewPriceWeight] = useState('400');
    
    const [nameFont, setNameFont] = useState("'Alata Regular', sans-serif");
    const [nameWeight, setNameWeight] = useState('400');

    // Mảng lưu trữ các font người dùng tự tải lên
    const [customFonts, setCustomFonts] = useState<{label: string, value: string}[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const allFonts = [...FONTS, ...customFonts].sort((a, b) => {
        if (a.label.includes('Mặc định')) return -1;
        if (b.label.includes('Mặc định')) return 1;
        return a.label.localeCompare(b.label);
    });

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            // Đọc file dưới dạng ArrayBuffer
            const buffer = await file.arrayBuffer();
            
            // Tạo tên font an toàn từ tên file
            const fontName = 'CustomFont_' + file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '') + Date.now();
            
            // Sử dụng FontFace API để load font vào trình duyệt
            const fontFace = new FontFace(fontName, buffer);
            const loadedFace = await fontFace.load();
            document.fonts.add(loadedFace);

            const newFontOption = { 
                label: `Đã Tải Lên: ${file.name.split('.')[0]}`, 
                value: `'${fontName}', sans-serif` 
            };

            setCustomFonts(prev => [...prev, newFontOption]);
            
            // Tự động áp dụng font vừa tải lên cho toàn bộ form
            setPercentFont(newFontOption.value);
            setOldPriceFont(newFontOption.value);
            setNewPriceFont(newFontOption.value);
            setNameFont(newFontOption.value);

            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
            
            alert(`Tải font "${file.name}" thành công!`);
        } catch (error) {
            console.error("Lỗi khi tải font:", error);
            alert("Không thể tải font. Vui lòng đảm bảo định dạng file là .ttf, .otf hoặc .woff");
        }
    };

    const applyPreset = (preset: 'anton' | 'bebas' | 'kanit') => {
        if (preset === 'anton') {
            setPercentFont("'Anton', sans-serif"); setPercentWeight('400');
            setOldPriceFont("'Anton', sans-serif"); setOldPriceWeight('400');
            setNewPriceFont("'Anton', sans-serif"); setNewPriceWeight('400');
            setNameFont("'Roboto Condensed', sans-serif"); setNameWeight('700');
        } else if (preset === 'bebas') {
            setPercentFont("'Bebas Neue', sans-serif"); setPercentWeight('400');
            setOldPriceFont("'Bebas Neue', sans-serif"); setOldPriceWeight('400');
            setNewPriceFont("'Bebas Neue', sans-serif"); setNewPriceWeight('400');
            setNameFont("'Inter', sans-serif"); setNameWeight('700');
        } else if (preset === 'kanit') {
            setPercentFont("'Kanit', sans-serif"); setPercentWeight('900');
            setOldPriceFont("'Kanit', sans-serif"); setOldPriceWeight('900');
            setNewPriceFont("'Kanit', sans-serif"); setNewPriceWeight('900');
            setNameFont("'Kanit', sans-serif"); setNameWeight('600');
        }
    };

    const FontSelectWithArrows = ({ value, onChange, options }: { value: string, onChange: (v: string) => void, options: {label: string, value: string}[] }) => {
        const currentIndex = options.findIndex(o => o.value === value);
        const handlePrev = () => {
            if (currentIndex > 0) onChange(options[currentIndex - 1].value);
            else onChange(options[options.length - 1].value);
        };
        const handleNext = () => {
            if (currentIndex < options.length - 1) onChange(options[currentIndex + 1].value);
            else onChange(options[0].value);
        };

        return (
            <div className="flex w-2/3 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-700 focus-within:ring-2 focus-within:ring-[#fbbc04]/50 transition-shadow">
                <select 
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 text-sm p-2.5 bg-transparent text-slate-800 dark:text-white outline-none cursor-pointer appearance-none"
                    style={{ fontFamily: value }}
                >
                    {options.map(f => <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
                </select>
                <div className="flex flex-col border-l border-slate-200 dark:border-slate-600 w-8 bg-slate-100 dark:bg-slate-800 shrink-0">
                    <button onClick={handlePrev} className="flex-1 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400" title="Font trước"><ChevronUp size={14}/></button>
                    <div className="h-[1px] bg-slate-200 dark:bg-slate-600 w-full"></div>
                    <button onClick={handleNext} className="flex-1 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400" title="Font sau"><ChevronDown size={14}/></button>
                </div>
            </div>
        );
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

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="w-full h-full p-4 lg:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-900 flex flex-col lg:flex-row gap-8 justify-center items-start">
            <style>
                {`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    html, body {
                        width: 210mm;
                        height: 297mm;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #print-section, #print-section * {
                        visibility: visible;
                    }
                    #print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        transform: none !important;
                        background: white;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .sticker-container {
                        width: 210mm !important;
                        height: 297mm !important;
                        aspect-ratio: auto !important;
                        background-size: 100% 100% !important;
                        border-radius: 0 !important;
                    }
                }

                .sticker-container {
                    width: 100%;
                    aspect-ratio: 197 / 285;
                    position: relative;
                    background-image: url('https://admintnb.com/wp-content/uploads/2026/04/X24.png');
                    background-position: center;
                    background-size: contain;
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

                .sticker-container .extra1 {
                    font-size: 36.9cqw;
                    font-weight: 900;
                    top: 30.9%;
                    height: 25.8%;
                }

                .sticker-container .name {
                    font-size: 2.6cqw;
                    font-weight: bold;
                    top: 60.8%;
                    height: 4.6%;
                }

                .sticker-container .old {
                    font-size: 14.2cqw;
                    font-weight: bold;
                    top: 66.6%;
                    height: 9.8%;
                }

                .sticker-container .extra2 {
                    font-size: 26.5cqw;
                    font-weight: 900;
                    top: 75.5%;
                    height: 21%;
                    right: 24%;
                    left: auto;
                    width: 68%;
                    justify-content: flex-end;
                    letter-spacing: -0.05em;
                }
                `}
            </style>

            {/* Print Section (Left) */}
            <div className="bg-white p-0 rounded-xl lg:rounded-2xl shadow-xl border border-slate-200 shrink-0 w-full max-w-[550px] overflow-hidden no-print-bg">
                <div id="print-section" className="w-full">
                    <div className="sticker-container">
                        <div className="extra1" style={{ fontFamily: percentFont, fontWeight: percentWeight }} contentEditable suppressContentEditableWarning>-30%</div>
                        <div className="old" style={{ fontFamily: oldPriceFont, fontWeight: oldPriceWeight }} onInput={handlePriceInput} contentEditable suppressContentEditableWarning>19.990.000</div>
                        <div className="name" style={{ fontFamily: nameFont, fontWeight: nameWeight }} contentEditable suppressContentEditableWarning>TÊN SẢN PHẨM</div>
                        <div className="extra2" style={{ fontFamily: newPriceFont, fontWeight: newPriceWeight }} onInput={handlePriceInput} contentEditable suppressContentEditableWarning>10.990</div>
                    </div>
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
                                Lưu ý: Bạn có thể click trực tiếp vào phần nội dung (giá, tên, % giảm) ở khung bên trái để sửa thông tin trước khi in.
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 space-y-4 border-t border-slate-200 dark:border-slate-700 pt-6">
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider mb-2">Tùy chỉnh Font Chữ</h4>
                        
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-slate-500">Đổi Font Nhanh:</label>
                                
                                {/* Nút Tải Font Riêng */}
                                <div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileUpload} 
                                        accept=".ttf,.otf,.woff,.woff2" 
                                        className="hidden" 
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1.5 py-1 px-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded text-[10px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-sm"
                                        title="Tải font chữ từ máy tính của bạn (.ttf, .otf, .woff)"
                                    >
                                        <Upload size={12} />
                                        TẢI FONT RIÊNG TỪ MÁY
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => applyPreset('anton')} className="py-2 px-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm">Anton</button>
                                <button onClick={() => applyPreset('bebas')} className="py-2 px-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm">Bebas</button>
                                <button onClick={() => applyPreset('kanit')} className="py-2 px-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm">Kanit</button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">Phần trăm (%):</label>
                            <div className="flex gap-2">
                                <FontSelectWithArrows value={percentFont} onChange={setPercentFont} options={allFonts} />
                                <select 
                                    value={percentWeight}
                                    onChange={(e) => setPercentWeight(e.target.value)}
                                    className="w-1/3 text-sm p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fbbc04]/50 cursor-pointer"
                                >
                                    {WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">Giá Cũ (Gạch ngang):</label>
                            <div className="flex gap-2">
                                <FontSelectWithArrows value={oldPriceFont} onChange={setOldPriceFont} options={allFonts} />
                                <select 
                                    value={oldPriceWeight}
                                    onChange={(e) => setOldPriceWeight(e.target.value)}
                                    className="w-1/3 text-sm p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fbbc04]/50 cursor-pointer"
                                >
                                    {WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">Giá Mới:</label>
                            <div className="flex gap-2">
                                <FontSelectWithArrows value={newPriceFont} onChange={setNewPriceFont} options={allFonts} />
                                <select 
                                    value={newPriceWeight}
                                    onChange={(e) => setNewPriceWeight(e.target.value)}
                                    className="w-1/3 text-sm p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fbbc04]/50 cursor-pointer"
                                >
                                    {WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">Tên Sản Phẩm:</label>
                            <div className="flex gap-2">
                                <FontSelectWithArrows value={nameFont} onChange={setNameFont} options={allFonts} />
                                <select 
                                    value={nameWeight}
                                    onChange={(e) => setNameWeight(e.target.value)}
                                    className="w-1/3 text-sm p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fbbc04]/50 cursor-pointer"
                                >
                                    {WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
