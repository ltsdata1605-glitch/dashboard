import React from 'react';
import { QRIcon } from './Icons';
import { Product } from './types';

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

  return (
    <div>
      <div className={`flex justify-between items-center mb-1 ${isMobile ? 'hidden' : ''}`}>
        <h2 className="text-lg font-semibold text-slate-800">Tìm kiếm sản phẩm</h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Nhập mã hoặc tên sản phẩm..."
            value={searchQuery}
            onChange={onSearchChange}
            disabled={disabled}
            autoComplete="off"
            className={`w-full ${isMobile ? 'pl-10 pr-3 py-2 text-sm' : 'pl-12 pr-4 py-3 text-base'} border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed`}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
             <button
              type="button"
              onClick={onIconClick}
              disabled={disabled}
              title="Quét mã vạch/mã QR"
              className="p-1 rounded-full hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <QRIcon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-slate-400`} />
            </button>
          </div>
          {(suggestions.length > 0 || showNoResults) && (
             <ul className={`absolute z-20 w-full ${isMobile ? 'bottom-full mb-1' : 'mt-1'} bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto`}>
                {suggestions.map((suggestion) => (
                    <li
                        key={suggestion.msp}
                        onClick={() => onSuggestionClick(suggestion)}
                        className="px-4 py-3 cursor-pointer hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-0 flex items-center justify-between"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && onSuggestionClick(suggestion)}
                    >
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 truncate" title={suggestion.sanPham}>{suggestion.sanPham}</p>
                            <p className="text-sm text-slate-500">MSP: {suggestion.msp}</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right text-slate-400 flex-shrink-0 ml-2"><path d="m9 18 6-6-6-6"/></svg>
                    </li>
                ))}
                {showNoResults && (
                    <li className="px-4 py-2 text-slate-500">Không tìm thấy sản phẩm.</li>
                )}
             </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;