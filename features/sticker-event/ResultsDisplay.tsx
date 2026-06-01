
import React, { useState, useEffect, memo } from 'react';
import { Product } from './types';
import { InfoIcon, SearchIcon, CheckboxIcon, CheckboxCheckedIcon, MinusCircleIcon, PlusCircleIcon, PrintIcon, Trash2Icon } from './Icons';

interface ResultsDisplayProps {
  results: Product[];
  hasData: boolean;
  highlightedMsp?: string | null;
  onToggleSelect: (msp: string) => void;
  onQuantityChange: (msp: string, delta: number) => void;
  onSetQuantity: (msp: string, quantity: number) => void;
  onPrintSingle: (product: Product) => void;
  onDelete: (msp: string) => void;
  isMobile: boolean;
}

import { formatCurrency } from './utils/format';

interface ProductCardProps {
  result: Product;
  isHighlighted: boolean;
  onToggleSelect: (msp: string) => void;
  onQuantityChange: (msp: string, delta: number) => void;
  onSetQuantity: (msp: string, quantity: number) => void;
  onPrintSingle: (product: Product) => void;
  onDelete: (msp: string) => void;
  isMobile: boolean;
}

const parsePrice = (priceStr: string): number => {
  if (!priceStr) return 0;
  return parseInt(priceStr.replace(/[^\d]/g, '')) || 0;
};

const ProductCard: React.FC<ProductCardProps> = memo(({ result, isHighlighted, onToggleSelect, onQuantityChange, onSetQuantity, onPrintSingle, onDelete, isMobile }) => {
  const giaGocNum = parsePrice(result.giaGoc);
  const giaGiamNum = parsePrice(result.giaGiam);
  const discountPercent = giaGocNum > 0 ? Math.round(((giaGocNum - giaGiamNum) / giaGocNum) * 100) : 0;
  
  return (
  <div 
    data-msp={result.msp}
    className={`bg-white ${isMobile ? 'p-1.5' : 'px-3 py-2'} rounded-md shadow-sm border hover:shadow-md hover:border-indigo-400 transition-all duration-200 flex flex-col sm:flex-row ${isMobile ? 'gap-1' : 'gap-3'} items-start sm:items-center fade-in ${isHighlighted ? 'animate-pulse-strong border-amber-500 border-2' : 'border-slate-200'}`}
  >
    {/* Left/Top: Info */}
    <div className="flex-1 min-w-0 w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-xs text-slate-900 line-clamp-1" title={result.sanPham}>
            {result.sanPham}
          </h3>
          <span className="font-mono text-[10px] text-indigo-600">{result.msp}</span>
        </div>
        
        <div className={`flex items-center gap-3 ${isMobile ? 'mt-0.5' : ''} w-full sm:w-auto`}>
          {/* Giá + %giảm */}
          <div className="text-left sm:text-right">
            <div className="flex items-center gap-1.5 sm:justify-end">
              <p className="text-sm font-bold text-red-600 leading-none">{result.giaGiam}</p>
              {discountPercent > 0 && (
                <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded leading-none">
                  -{discountPercent}%
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 line-through">{result.giaGoc}</p>
          </div>
          {/* Thưởng — ưu tiên to hơn */}
          <div className="text-right">
            <p className="text-sm font-bold text-violet-600 leading-none">{formatCurrency(result.tongThuong)}</p>
            <p className="text-[10px] text-slate-400">
              <span className="text-green-600">ERP: {formatCurrency(result.thuongERP)}</span>
              <span className="mx-0.5">|</span>
              <span className="text-red-500">Nóng: {formatCurrency(result.thuongNong)}</span>
            </p>
          </div>
        </div>
      </div>
      
      {/* Promotion */}
      {result.khuyenMai && result.khuyenMai.trim() && (
        <div className="flex items-center gap-1 mt-0.5">
          <span className="shrink-0 text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">KM</span>
          <p className="text-[11px] font-medium text-slate-700 line-clamp-1" title={result.khuyenMai}>
            {result.khuyenMai}
          </p>
        </div>
      )}
    </div>
    
    {/* Right/Bottom: Controls — LARGER */}
    <div className={`flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 ${isMobile ? 'pt-1' : ''} sm:pl-3 sm:border-l`}>
        <div className="flex items-center gap-2">
             <button
                onClick={() => onToggleSelect(result.msp)}
                title={result.selected ? "Bỏ chọn" : "Chọn in"}
                className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5"
            >
                {result.selected ? <CheckboxCheckedIcon className="h-7 w-7 text-indigo-600" /> : <CheckboxIcon className="h-7 w-7" />}
            </button>
            <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200">
                <button
                    onClick={() => onQuantityChange(result.msp, -1)}
                    disabled={result.quantity <= 0}
                    className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <MinusCircleIcon className="h-5 w-5" />
                </button>
                <input
                    type="number"
                    value={result.quantity}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) onSetQuantity(result.msp, val);
                        else if (e.target.value === '') onSetQuantity(result.msp, 1);
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-10 text-center font-bold text-base text-slate-800 bg-transparent border-none focus:ring-0 p-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none -moz-appearance-textfield"
                />
                <button
                    onClick={() => onQuantityChange(result.msp, 1)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                >
                    <PlusCircleIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
        <div className="flex items-center gap-1.5">
            {!isMobile && (
                <button
                    onClick={() => onPrintSingle(result)}
                    title="In sản phẩm này"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                    <PrintIcon className="h-4 w-4" />
                    In
                </button>
            )}
            <button
                onClick={() => onDelete(result.msp)}
                title="Xóa sản phẩm"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
                <Trash2Icon className="h-5 w-5" />
            </button>
        </div>
    </div>
  </div>
  );
});
ProductCard.displayName = 'ProductCard';

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; message: string }> = ({ icon, title, message }) => (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl shadow-lg border border-slate-200 min-h-[400px]">
        <div className="p-4 bg-slate-100 rounded-full mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-base text-slate-500 max-w-sm">
            {message}
        </p>
    </div>
);

const Annotation: React.FC<{ number: number; className: string }> = ({ number, className }) => (
    <div className={`absolute w-5 h-5 bg-indigo-600 text-white text-xs font-bold flex items-center justify-center rounded-full border-2 border-white shadow-lg ${className}`}>
        {number}
    </div>
);

const InstructionsPanel = () => (
  <div className="text-left p-8 bg-white rounded-2xl shadow-xl border-2 border-indigo-100 min-h-[400px] flex flex-col justify-center transition-all duration-300">
    <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-indigo-100 rounded-full">
            <InfoIcon className="h-8 w-8 text-indigo-600" />
        </div>
        <div>
            <h3 className="text-2xl font-bold text-slate-900">Hướng dẫn sử dụng Hệ thống In Sticker Event</h3>
            <p className="text-slate-500">Làm theo các bước sau để bắt đầu sử dụng</p>
        </div>
    </div>

    <div className="text-base text-slate-700 space-y-3 leading-relaxed">
      <ol className="list-none space-y-2">
          <li className="flex items-start"><span className="font-bold text-indigo-600 mr-2 w-5 text-center">1.</span><span><strong>Truy cập:</strong> <code className="text-indigo-700 font-semibold bg-indigo-50 px-2 py-1 rounded-md">ERP &gt; In bảng giá</code></span></li>
          <li className="flex items-start"><span className="font-bold text-indigo-600 mr-2 w-5 text-center">2.</span><span><strong>Chọn Ngành hàng:</strong> <code className="text-indigo-700 font-semibold bg-indigo-50 px-2 py-1 rounded-md">Điện gia dụng, Dụng cụ nhà bếp,...</code></span></li>
          <li className="flex items-start"><span className="font-bold text-indigo-600 mr-2 w-5 text-center">3.</span><span><strong>Chọn Nhóm hàng:</strong> <code className="text-indigo-700 font-semibold bg-indigo-50 px-2 py-1 rounded-md">Tất cả</code></span></li>
          <li className="flex items-start"><span className="font-bold text-indigo-600 mr-2 w-5 text-center">4.</span><span><strong>Chọn Vị trí trưng bày:</strong> <code className="text-indigo-700 font-semibold bg-indigo-50 px-2 py-1 rounded-md">2 - Kệ trưng bày</code></span></li>
          <li className="flex items-start"><span className="font-bold text-indigo-600 mr-2 w-5 text-center">5.</span><span><strong>Chọn Mẫu in:</strong> <code className="text-indigo-700 font-semibold bg-indigo-50 px-2 py-1 rounded-md">81 - Bảng giá Gia Dụng - Phu Kiện rút gọn...</code></span></li>
          <li className="flex items-start"><span className="font-bold text-indigo-600 mr-2 w-5 text-center">6.</span><span><strong>Xuất file:</strong> Bấm nút <strong className="text-slate-900">"In"</strong>, sau đó chọn định dạng <code className="text-indigo-700 font-semibold bg-indigo-50 px-2 py-1 rounded-md">Excel Workbook Data - only (*.xlsx)</code>.</span></li>
      </ol>
    </div>
    
    <div className="mt-6 pt-5 border-t border-slate-200">
         <h4 className="font-semibold text-lg text-slate-800 mb-2">Lưu ý quan trọng</h4>
         <ul className="list-disc list-outside space-y-2 pl-5 text-slate-600">
            <li>Mỗi lần chỉ xuất được <strong>một ngành hàng</strong>. Để in nhiều ngành, bạn cần xuất nhiều file.</li>
            <li>Công cụ cho phép <strong className="text-indigo-700">tải lên nhiều file cùng lúc</strong> để gộp dữ liệu từ nhiều ngành hàng.</li>
            <li>Sau khi có file, hãy sử dụng nút <strong className="text-emerald-600">"Tải lên"</strong> ở bảng điều khiển bên trái.</li>
         </ul>
    </div>

    <div className="mt-6 pt-5 border-t border-slate-200">
         <h4 className="font-semibold text-lg text-slate-800 mb-2">Xem thử Sticker Demo</h4>
         <p className="text-sm text-slate-600 mb-3">Công cụ có thể tạo ra nhiều loại sticker với kích thước và bố cục khác nhau.</p>
         <div className="flex items-start gap-4 overflow-x-auto py-4 -mx-8 px-8 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            
            {/* Demo 1: Annotated Sticker */}
            <div className="relative flex-shrink-0 w-[280px] h-[170px]">
                <div className="absolute top-2 left-2 w-64 h-40 bg-white border-2 border-black rounded-lg p-2 flex flex-col shadow-lg">
                    <div className="w-full h-full border-t-2 border-l-2 border-r-2 border-b-8 border-black p-1.5 flex justify-between">
                        <div className="w-4">&nbsp;</div> {/* Ghost Bar */}
                        <div className="flex-grow flex flex-col justify-around text-center relative">
                            {/* Top right info */}
                            <div className="absolute top-0 right-0 text-center z-10">
                                <div className="w-10 h-10 bg-gray-200 p-0.5 border border-gray-400"><img src="https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=123456789&bgcolor=ffffff" alt="QR Code"/></div>
                                <p className="text-[7px] font-sans mt-0.5">21707 - 1.200</p>
                            </div>
                            {/* Main content */}
                            <p className="text-sm font-bold leading-tight px-12">IPHONE 15 PRO MAX 256GB</p>
                            <div>
                                <p className="text-xs line-through">34.990.000</p>
                                <p className="text-4xl font-extrabold" style={{fontFamily: 'Oswald, sans-serif'}}>29.990</p>
                            </div>
                            <p className="text-xs">• PMH 500K</p>
                        </div>
                        <div className="w-4 flex justify-center items-end pb-1">
                            <p className="text-[7px] [writing-mode:vertical-rl] text-gray-500 whitespace-nowrap">Ngày in: 14/08</p>
                        </div>
                    </div>
                </div>
                <Annotation number={1} className="top-0 right-14" />
                <Annotation number={2} className="top-11 right-0" />
                <Annotation number={3} className="top-1/2 -translate-y-1/2 left-12" />
                <Annotation number={4} className="bottom-2 right-16" />
            </div>

            {/* Demo 2: Medium Sticker */}
            <div className="flex-shrink-0 w-48 h-32 bg-white border-2 border-black rounded-lg p-1.5 flex flex-col shadow-lg mt-2">
                <div className="w-full h-full border-t border-l border-r border-b-4 border-black p-1.5 flex flex-col justify-around text-center">
                    <p className="text-xs font-bold leading-tight">NỒI CƠM ĐIỆN TỬ SHARP</p>
                    <div>
                        <p className="text-2xl font-extrabold" style={{fontFamily: 'Oswald, sans-serif'}}>1.490</p>
                        <p className="text-violet-600 text-[9px] font-bold">Thưởng: 500</p>
                    </div>
                     <p className="text-[8px]">• Giảm ngay 100K</p>
                </div>
            </div>

            {/* Demo 3: Bill Printer Sticker */}
             <div className="flex-shrink-0 w-32 h-48 bg-white border-2 border-black rounded-lg p-1.5 flex flex-col shadow-lg mt-2">
                <div className="w-full h-full border-t border-l border-r border-b-8 border-black p-1.5 flex flex-col justify-around text-center">
                    <p className="text-xs font-bold leading-tight">TAI NGHE BLUETOOTH SONY</p>
                     <div>
                        <p className="text-2xl font-extrabold" style={{fontFamily: 'Oswald, sans-serif'}}>890</p>
                    </div>
                     <p className="text-[8px]">• Bảo hành 12 tháng</p>
                </div>
            </div>
         </div>
         <div className="mt-4 px-4 text-xs text-slate-600 grid grid-cols-2 gap-x-6 gap-y-2">
            <div className="flex items-center gap-2"><div className="w-4 h-4 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">1</div><span>Mã QR của sản phẩm</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">2</div><span>Tên người in & Tổng thưởng</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">3</div><span>Tên, Giá & Khuyến mãi</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">4</div><span>Ngày giờ in sticker</span></div>
         </div>
    </div>
  </div>
);


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, hasData, highlightedMsp, onToggleSelect, onQuantityChange, onSetQuantity, onPrintSingle, onDelete, isMobile }) => {
  const [visibleCount, setVisibleCount] = useState(30);

  useEffect(() => {
    setVisibleCount(30);
  }, [results]);

  if (!hasData) {
    return <InstructionsPanel />;
  }

  if (results.length > 0) {
    const visibleResults = results.slice(0, visibleCount);
    return (
        <div className={`flex flex-col ${isMobile ? 'gap-1' : 'gap-1.5'}`}>
            {visibleResults.map((product) => (
                <ProductCard 
                    key={product.msp} 
                    result={product} 
                    isHighlighted={product.msp === highlightedMsp}
                    onToggleSelect={onToggleSelect}
                    onQuantityChange={onQuantityChange}
                    onSetQuantity={onSetQuantity}
                    onPrintSingle={onPrintSingle}
                    onDelete={onDelete}
                    isMobile={isMobile}
                />
            ))}
            {results.length > visibleCount && (
                <div className="flex justify-center py-4">
                    <button
                        onClick={() => setVisibleCount(prev => prev + 50)}
                        className="px-6 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors text-sm shadow-sm flex items-center gap-2"
                    >
                        Hiển thị thêm (còn {results.length - visibleCount} sản phẩm)
                    </button>
                </div>
            )}
        </div>
    );
  }
  
  return (
      <EmptyState
          icon={<SearchIcon className="mx-auto h-12 w-12 text-slate-400" />}
          title="Sẵn sàng tìm kiếm"
          message="Danh sách kết quả của bạn đang trống. Sử dụng thanh tìm kiếm hoặc các công cụ nhanh để thêm sản phẩm."
      />
  );
};

export default ResultsDisplay;
