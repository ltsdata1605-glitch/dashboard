import React, { useRef } from 'react';
import { Printer, Settings, CheckCircle2 } from 'lucide-react';

export default function StickerPrinterView() {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="w-full h-full p-4 lg:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-900 flex flex-col lg:flex-row gap-8 justify-center items-start">
            <style>
                {`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #print-section, #print-section * {
                        visibility: visible;
                    }
                    #print-section {
                        position: absolute;
                        left: 50%;
                        top: 0;
                        transform: translateX(-50%);
                        width: 197mm !important;
                        height: 285mm !important;
                        margin: 0;
                        padding: 0;
                        border: none !important;
                    }
                    .no-print {
                        display: none !important;
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
                    text-decoration: line-through;
                }

                .sticker-container .extra2 {
                    font-size: 27.5cqw;
                    font-weight: 900;
                    top: 76.4%;
                    height: 19.5%;
                    right: 2.68%;
                    left: auto;
                    width: 84%;
                    justify-content: flex-end;
                }
                `}
            </style>

            {/* Print Section (Left) */}
            <div className="bg-white p-4 lg:p-8 rounded-2xl shadow-xl border border-slate-200 shrink-0 w-full max-w-[550px] overflow-hidden no-print-bg">
                <div id="print-section" className="w-full">
                    <div className="sticker-container">
                        <div className="extra1" contentEditable suppressContentEditableWarning>-00%</div>
                        <div className="old" contentEditable suppressContentEditableWarning>00.000.000</div>
                        <div className="name" contentEditable suppressContentEditableWarning>TÊN SẢN PHẨM</div>
                        <div className="extra2" contentEditable suppressContentEditableWarning>0.000</div>
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
                </div>
            </div>
        </div>
    );
}
