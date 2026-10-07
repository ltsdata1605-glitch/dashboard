import React from 'react';
import { AppIcon } from '../../components/shared/ui/icon/AppIcon';
import { Product } from './types';
import { Button } from '../../components/shared/ui/Button';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onIconClick: () => void;
  disabled: boolean;
  suggestions: Product[];
  onSuggestionClick: (product: Product) => void;
  showNoResults: boolean;
  isMobile?: boolean;
  hideTitle?: boolean;
  compact?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  searchQuery, 
  onSearchChange, 
  onIconClick, 
  disabled, 
  suggestions, 
  onSuggestionClick,
  showNoResults,
  isMobile,
  hideTitle = false,
  compact = false,
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
      {!isMobile && !hideTitle && (
        <div className="flex justify-between items-center mb-1.5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tìm kiếm sản phẩm</h2>
        </div>
      )}

      <div className="relative w-full">
        {/* Input container */}
        <div className={`relative flex items-center bg-white dark:bg-slate-800 rounded-xl sm:rounded-lg border transition-all ${
          compact
            ? 'border-slate-200 dark:border-slate-700 h-8 sm:h-8.5 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500'
            : isMobile 
              ? 'border-slate-200 shadow-xs focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100' 
              : 'border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500'
        } ${disabled ? 'bg-slate-50 dark:bg-slate-900 opacity-60' : ''}`}>
          {/* Icon Search */}
          <div className="pl-2.5 pr-1 text-slate-400 flex items-center pointer-events-none">
            <AppIcon name="search" size={compact ? 'sm' : 'md'} className="text-slate-400" />
          </div>

          {/* Input text */}
          <input
            type="text"
            placeholder={isMobile ? "Nhập tên hoặc mã sản phẩm..." : "Nhập mã hoặc tên sản phẩm..."}
            value={searchQuery}
            onChange={onSearchChange}
            disabled={disabled}
            autoComplete="off"
            className={`w-full ${compact ? 'py-1 text-xs' : 'py-2.5 sm:py-2.5 text-sm sm:text-base'} pl-1 pr-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent border-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed`}
          />

          {/* Nút Clear X (khi có text) */}
          {searchQuery && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors mr-1 cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <AppIcon name="close" size="sm" />
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
              <AppIcon name="scan" size="md" />
              {isMobile && <span className="text-[11px] font-semibold hidden xs:inline">Quét</span>}
            </Button>
          </div>
        </div>

        {/* Dropdown Gợi ý kết quả */}
        {(suggestions.length > 0 || showNoResults) && (
          <ul className={`absolute z-50 w-full min-w-[280px] sm:min-w-[340px] left-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 sm:max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 animate-in fade-in slide-in-from-top-1 duration-150`}>
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.msp}
                onClick={() => onSuggestionClick(suggestion)}
                className="px-3 py-2 cursor-pointer hover:bg-sky-50/80 dark:hover:bg-slate-700/60 active:bg-sky-100 transition-colors flex items-center justify-between gap-2"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSuggestionClick(suggestion)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-200/50 dark:border-sky-800/50">
                      {suggestion.msp}
                    </span>
                    {suggestion.giaGiam && (
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                        {suggestion.giaGiam}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate mt-0.5" title={suggestion.sanPham}>
                    {suggestion.sanPham}
                  </p>
                </div>
                <AppIcon name="chevronRight" size="sm" className="text-slate-400" />
              </li>
            ))}
            {showNoResults && (
              <li className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 text-center">
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