import React from 'react';
import { QRIcon } from './Icons';
import { Product } from './types';
import { Button } from '../../components/shared/ui/Button';
import { Search, X, ScanLine, ChevronRight } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onIconClick: () => void;
  disabled: boolean;
  suggestions: Product[];
  onSuggestionClick: (product: Product) => void;
  showNoResults: boolean;
  isMobile?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  searchQuery, 
  onSearchChange, 
  onIconClick, 
  disabled, 
  suggestions, 
  onSuggestionClick,
  showNoResults,
  isMobile
}) => {
  const handleClear = () => {
    // Kích hoạt sự kiện change với chuỗi rỗng
    const dummyEvent = {
      target: { value: '' }
    } as React.ChangeEvent<HTMLInputElement>;
    onSearchChange(dummyEvent);
  };

  return (
    <div className="w-full">
      {!isMobile && (
        <div className="flex justify-between items-center mb-1.5">
          <h2 className="text-sm font-semibold text-slate-800">Tìm kiếm sản phẩm</h2>
        </div>
      )}

      <div className="relative w-full">
        {/* Input container */}
        <div className={`relative flex items-center bg-white rounded-xl sm:rounded-lg border transition-all ${
          isMobile 
            ? 'border-slate-200 shadow-xs focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100' 
            : 'border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500'
        } ${disabled ? 'bg-slate-50 opacity-60' : ''}`}>
          {/* Icon Search */}
          <div className="pl-3 pr-1 text-slate-400 flex items-center pointer-events-none">
            <Search className={`${isMobile ? 'h-4 w-4' : 'h-4.5 w-4.5'} text-slate-400`} />
          </div>

          {/* Input text */}
          <input
            type="text"
            placeholder={isMobile ? "Nhập tên hoặc mã sản phẩm..." : "Nhập mã hoặc tên sản phẩm..."}
            value={searchQuery}
            onChange={onSearchChange}
            disabled={disabled}
            autoComplete="off"
            className={`w-full py-2.5 sm:py-2.5 pl-1 pr-2 text-sm sm:text-base text-slate-800 placeholder-slate-400 bg-transparent border-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed`}
          />

          {/* Nút Clear X (khi có text) */}
          {searchQuery && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors mr-1 cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Nút Quét mã Scan / QR */}
          <div className="pr-1.5 flex items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={onIconClick}
              disabled={disabled}
              title="Quét mã vạch / QR"
              className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1.5 sm:p-2 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors flex items-center gap-1 font-bold ${
                isMobile ? 'bg-sky-50/80 text-sky-600 text-xs px-2' : ''
              }`}
            >
              <ScanLine className="h-4 w-4" />
              {isMobile && <span className="text-[11px] font-semibold hidden xs:inline">Quét</span>}
            </Button>
          </div>
        </div>

        {/* Dropdown Gợi ý kết quả */}
        {(suggestions.length > 0 || showNoResults) && (
          <ul className={`absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 sm:max-h-80 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150`}>
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.msp}
                onClick={() => onSuggestionClick(suggestion)}
                className="px-3.5 py-2.5 sm:py-3 cursor-pointer hover:bg-sky-50/80 active:bg-sky-100 transition-colors flex items-center justify-between gap-2"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSuggestionClick(suggestion)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200/50">
                      {suggestion.msp}
                    </span>
                    {suggestion.giaGiam && (
                      <span className="text-xs font-bold text-rose-600 tabular-nums">
                        {suggestion.giaGiam}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-xs sm:text-sm text-slate-800 truncate mt-0.5" title={suggestion.sanPham}>
                    {suggestion.sanPham}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              </li>
            ))}
            {showNoResults && (
              <li className="px-4 py-3 text-xs sm:text-sm text-slate-500 text-center">
                Không tìm thấy sản phẩm phù hợp.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SearchBar;