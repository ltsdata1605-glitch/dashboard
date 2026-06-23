import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Icon } from '../../common/Icon';

interface FilterPopoverProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    alignment?: 'left' | 'right';
}

export const FilterPopover: React.FC<FilterPopoverProps> = ({ 
    label, options, selected, onChange, isOpen, onToggle, onClose, alignment = 'right' 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && 
                popoverRef.current && !popoverRef.current.contains(event.target as Node) && 
                triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            if (triggerRef.current) {
                setTriggerRect(triggerRef.current.getBoundingClientRect());
            }
            requestAnimationFrame(() => {
                inputRef.current?.focus({ preventScroll: true });
            });
        }
    }, [isOpen]);

    const toggleOption = (option: string) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onChange(newSelected);
    };

    const handleSelectAll = () => onChange(options);
    const handleDeselectAll = () => onChange([]);

    const deferredSearchTerm = React.useDeferredValue(searchTerm);

    const filteredOptions = useMemo(() => {
        return options.filter(opt => String(opt).toLowerCase().includes(deferredSearchTerm.toLowerCase()));
    }, [options, deferredSearchTerm]);

    const hasFilters = selected.length > 0 && selected.length < options.length;

    // Compute desktop popover position style from trigger rect
    const desktopStyle = useMemo(() => {
        if (!triggerRect) return {};
        const style: React.CSSProperties = {
            position: 'fixed',
            top: triggerRect.bottom + 8,
            width: 288, // w-72 = 18rem = 288px
            zIndex: 9999,
        };
        if (alignment === 'left') {
            style.left = triggerRect.left;
        } else {
            style.right = window.innerWidth - triggerRect.right;
        }
        return style;
    }, [triggerRect, alignment]);

    return (
        <div className="relative inline-flex items-center ml-1">
            <button
                ref={triggerRef}
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                onMouseDown={stopPropagation}
                className={`p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${hasFilters ? 'text-primary-600 dark:text-primary-400 bg-white/50' : 'text-inherit opacity-60 hover:opacity-100'}`}
                title={`Lọc ${label}`}
            >
                <Icon name="filter" size={3} className={`sm:hidden ${hasFilters ? "fill-current" : ""}`} />
                <Icon name="filter" size={3.5} className={`hidden sm:block ${hasFilters ? "fill-current" : ""}`} />
                {hasFilters && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-slate-800"></span>
                )}
            </button>

            {/* Always use portal to escape parent transform/overflow */}
            {isOpen && ReactDOM.createPortal(
                <>
                    {/* Mobile: full-width bottom overlay */}
                    <div className="sm:hidden fixed inset-0 bg-black/30 z-[9998]" onClick={(e) => { e.stopPropagation(); onClose(); }} />
                    {/* Desktop: invisible overlay to catch clicks */}
                    <div className="hidden sm:block fixed inset-0 z-[9997]" onClick={(e) => { e.stopPropagation(); onClose(); }} />
                    
                    {/* Mobile: bottom sheet */}
                    <div 
                        ref={popoverRef}
                        onClick={stopPropagation}
                        onMouseDown={stopPropagation}
                        className="sm:hidden fixed z-[9999] bottom-0 left-0 right-0 w-full rounded-t-2xl shadow-xl bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10 p-3 cursor-default text-left"
                    >
                        <div className="flex justify-center mb-2">
                            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                        </div>
                        <div className="mb-2">
                            <input 
                                ref={inputRef}
                                type="text" 
                                placeholder="Tìm kiếm..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5 mb-1.5">
                            <button onClick={handleSelectAll} className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline">Chọn tất cả</button>
                            <span className="text-[10px] text-slate-400 font-semibold">{selected.length} / {options.length}</span>
                            <button onClick={handleDeselectAll} className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:underline">Bỏ chọn</button>
                        </div>
                        <div className="overflow-y-auto max-h-[40vh] space-y-0.5 custom-scrollbar">
                            {filteredOptions.length > 0 ? (
                                <>
                                    {filteredOptions.slice(0, 200).map(option => (
                                        <label key={option} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer active:bg-slate-200 dark:active:bg-slate-600">
                                            <span className="text-xs text-slate-700 dark:text-slate-300 truncate pr-2 flex-grow" title={option}>{option}</span>
                                            <div className="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selected.includes(option)} 
                                                    onChange={() => toggleOption(option)} 
                                                    className="sr-only peer" 
                                                />
                                                <div className="w-8 h-[18px] bg-slate-200 peer-focus:outline-none rounded-full dark:bg-slate-600 peer-checked:after:translate-x-[14px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                                            </div>
                                        </label>
                                    ))}
                                    {filteredOptions.length > 200 && (
                                        <div className="text-center py-2 text-xs italic text-slate-400 font-medium">
                                            Hiển thị 200 kết quả đầu tiên.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center text-xs text-slate-500 py-4">Không tìm thấy kết quả</div>
                            )}
                        </div>
                    </div>

                    {/* Desktop: dropdown */}
                    <div 
                        onClick={stopPropagation}
                        onMouseDown={stopPropagation}
                        className="hidden sm:block rounded-lg shadow-xl bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10 p-3 cursor-default text-left"
                        style={desktopStyle}
                    >
                        <div className="mb-3">
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
                            <button onClick={handleSelectAll} className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline">Chọn tất cả</button>
                            <span className="text-xs text-slate-400 font-semibold">{selected.length} / {options.length}</span>
                            <button onClick={handleDeselectAll} className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:underline">Bỏ chọn</button>
                        </div>
                        <div className="overflow-y-auto max-h-60 space-y-0.5 custom-scrollbar">
                            {filteredOptions.length > 0 ? (
                                <>
                                    {filteredOptions.slice(0, 200).map(option => (
                                        <label key={option} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer active:bg-slate-200 dark:active:bg-slate-600">
                                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2 flex-grow" title={option}>{option}</span>
                                            <div className="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selected.includes(option)} 
                                                    onChange={() => toggleOption(option)} 
                                                    className="sr-only peer" 
                                                />
                                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                                            </div>
                                        </label>
                                    ))}
                                    {filteredOptions.length > 200 && (
                                        <div className="text-center py-2 text-xs italic text-slate-400 font-medium">
                                            Hiển thị 200 kết quả đầu tiên. Vui lòng sử dụng ô tìm kiếm để xem thêm.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center text-xs text-slate-500 py-4">Không tìm thấy kết quả</div>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};
