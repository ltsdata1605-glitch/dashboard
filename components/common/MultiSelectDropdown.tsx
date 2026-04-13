
import React, { useState, useRef, useEffect, useMemo, useDeferredValue } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

interface MultiSelectDropdownProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    label: string;
    placeholder?: string;
    className?: string;
    variant?: 'default' | 'compact';
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ 
    options, 
    selected, 
    onChange, 
    label,
    placeholder = "Tìm kiếm...",
    className = "",
    variant = 'default'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const isOutsideContainer = containerRef.current && !containerRef.current.contains(event.target as Node);
            const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target as Node);
            if (isOutsideContainer && isOutsideDropdown) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside, { passive: true });
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const minW = Math.max(rect.width, 240);
            
            setDropdownStyles({
                minWidth: `${minW}px`,
            });
        }
    }, [isOpen]);

    const handleToggleOption = (option: string) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onChange(newSelected);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.checked ? options : []);
    };

    const deferredSearchTerm = useDeferredValue(searchTerm);

    const filteredOptions = useMemo(() => {
        return options.filter(option =>
            option.toLowerCase().includes(deferredSearchTerm.toLowerCase())
        );
    }, [options, deferredSearchTerm]);

    // Format display text or tags
    const renderContent = () => {
        const labelText = variant === 'compact' ? label : label;
        if (selected.length === 0) return <span className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-wider">{label}</span>;
        if (selected.length === options.length) return <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider">Tất cả</span>;
        
        if (variant === 'compact') {
            return <span className="text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-wider">{label} ({selected.length})</span>;
        }

        if (selected.length <= 2) {
            return (
                <div className="flex flex-wrap gap-1">
                    {selected.map(item => (
                        <span key={item} className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] px-1.5 py-0.5 rounded-md border border-indigo-100/50 dark:border-indigo-800/50 font-bold max-w-[80px] truncate">
                            {item}
                        </span>
                    ))}
                </div>
            );
        }
        
        return <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selected.length} {label}</span>;
    };

    return (
        <div className={`relative w-full ${className}`} ref={containerRef} style={{ zIndex: isOpen ? 50 : 11 }}>
            <button 
                type="button" 
                onClick={() => setIsOpen(!isOpen)} 
                className={`w-full flex items-center justify-between rounded-xl border transition-all duration-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                    variant === 'compact' ? 'min-h-[32px] py-1' : 'min-h-[38px] py-1.5'
                } ${
                    isOpen 
                    ? 'border-indigo-500 bg-white dark:bg-slate-800 shadow-md ring-2 ring-indigo-500/10' 
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'
                }`}
            >
                <div className="flex-grow flex items-center overflow-hidden">
                    {renderContent()}
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                    {selected.length > 0 && (
                        <div className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-black animate-in fade-in zoom-in duration-200">
                            {selected.length}
                        </div>
                    )}
                    <Icon 
                        name="chevron-down" 
                        size={3.5} 
                        className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                    />
                </div>
            </button>

            {isOpen && createPortal(
                <div 
                    ref={dropdownRef}
                    style={{
                        ...dropdownStyles,
                        position: 'fixed',
                        top: containerRef.current ? containerRef.current.getBoundingClientRect().bottom + 6 : 0,
                        left: containerRef.current ? Math.min(containerRef.current.getBoundingClientRect().left, window.innerWidth - 260) : 0,
                    }}
                    className="z-[9999] overflow-hidden bg-white dark:bg-slate-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-black/40 border border-slate-200 dark:border-slate-700 flex flex-col backdrop-blur-sm w-max max-w-[90vw]"
                >
                    {/* Search Field */}
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30">
                        <div className="relative">
                            <Icon name="search" size={3.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder={placeholder}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (filteredOptions.length > 0) {
                                            handleToggleOption(filteredOptions[0]);
                                        }
                                    }
                                }}
                                className="w-full text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-700/50">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    checked={selected.length === options.length && options.length > 0} 
                                    onChange={handleSelectAll} 
                                    className="peer sr-only" 
                                />
                                <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 transition-all peer-checked:bg-indigo-600 peer-checked:border-indigo-600" />
                                <Icon name="check" size={3} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Tất cả {label}</span>
                        </label>
                        <span className="text-[10px] font-bold text-slate-400">{filteredOptions.length} / {options.length}</span>
                    </div>

                    {/* Options List */}
                    <div className="flex-grow overflow-y-auto custom-scrollbar p-1 max-h-48">
                        {filteredOptions.length > 0 ? (
                            <div className="grid grid-cols-1 gap-0.5">
                                {filteredOptions.slice(0, 200).map(option => {
                                    const isSelected = selected.includes(option);
                                    return (
                                        <button
                                            type="button"
                                            key={option}
                                            onClick={() => handleToggleOption(option)}
                                            className={`flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-lg transition-all ${
                                                isSelected 
                                                ? 'bg-indigo-50/60 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' 
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                            }`}
                                        >
                                            <div className={`relative flex items-center justify-center w-4 h-4 rounded border-2 transition-all ${
                                                isSelected ? 'bg-indigo-600 border-indigo-600 shadow-sm' : 'border-slate-300 dark:border-slate-600'
                                            }`}>
                                                {isSelected && <Icon name="check" size={3} className="text-white" />}
                                            </div>
                                            <span className={`text-[12px] truncate ${isSelected ? 'font-black' : 'font-medium'}`}>{option}</span>
                                        </button>
                                    );
                                })}
                                {filteredOptions.length > 200 && (
                                    <div className="text-center py-2 text-[10px] items-center italic text-slate-400 font-medium">
                                        Hiển thị 200 kết quả đầu tiên. Vui lòng sử dụng ô tìm kiếm để xem thêm.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                                <Icon name="search-x" size={6} className="text-slate-300 mb-2" />
                                <p className="text-[11px] text-slate-500 font-medium">Không tìm thấy "{searchTerm}"</p>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default MultiSelectDropdown;
