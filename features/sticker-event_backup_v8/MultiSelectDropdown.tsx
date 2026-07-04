import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Chọn...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(v => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  return (
    <div className={`${label ? 'space-y-1' : ''} relative`} ref={dropdownRef}>
      {label && <label className="text-xs font-semibold text-slate-500">{label}</label>}
      <div 
        className={`w-full border border-slate-200 rounded-lg bg-white cursor-pointer flex justify-between items-center ${label ? 'text-base sm:text-sm px-3 py-2 min-h-[42px] sm:min-h-[38px]' : 'text-[11px] px-2 py-1.5 min-h-0'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`truncate ${selectedValues.length === 0 ? 'text-slate-400' : 'text-slate-800'}`}>
          {selectedValues.length === 0 
            ? placeholder 
            : selectedValues.length === 1 
              ? selectedValues[0] 
              : `Đã chọn ${selectedValues.length}`}
        </span>
        <svg className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ml-1 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 flex flex-col">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-lg">
            <input
              type="text"
              className="w-full text-base sm:text-sm border-slate-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto p-2 flex-1">
            {filteredOptions.length > 0 && (
              <label className="flex items-center px-2 py-2 hover:bg-slate-50 cursor-pointer rounded-md border-b border-slate-100 mb-1">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mr-3 w-4 h-4 sm:w-3 sm:h-3"
                  checked={selectedValues.length === options.length && options.length > 0}
                  onChange={handleSelectAll}
                />
                <span className="text-base sm:text-sm font-medium text-slate-700">Chọn tất cả</span>
              </label>
            )}
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-3 text-sm text-slate-500 text-center">Không tìm thấy kết quả</div>
            ) : (
              filteredOptions.map(opt => (
                <label key={opt} className="flex items-center px-2 py-2 hover:bg-slate-50 cursor-pointer rounded-md">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mr-3 w-4 h-4 sm:w-3 sm:h-3"
                    checked={selectedValues.includes(opt)}
                    onChange={() => handleToggle(opt)}
                  />
                  <span className="text-base sm:text-sm text-slate-700 truncate" title={opt}>{opt}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
