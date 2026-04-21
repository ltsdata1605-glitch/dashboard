import React, { useState, useRef, useEffect, useMemo, useDeferredValue } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

interface SingleSelectDropdownProps {
    options: { value: string; label: string }[];
    selected: string;
    onChange: (selected: string) => void;
    label: string;
    placeholder?: string;
    className?: string;
    variant?: 'default' | 'compact';
}

const SingleSelectDropdown: React.FC<SingleSelectDropdownProps> = ({ 
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
             const minW = Math.max(rect.width, 180);
             setDropdownStyles({ minWidth: `${minW}px` });
        }
    }, [isOpen]);

    const handleSelectOption = (value: string) => {
        onChange(value);
        setIsOpen(false);
    };

    const deferredSearchTerm = useDeferredValue(searchTerm);

    const filteredOptions = useMemo(() => {
        return options.filter(option =>
            option.label.toLowerCase().includes(deferredSearchTerm.toLowerCase())
        );
    }, [options, deferredSearchTerm]);

    const hasSelection = selected !== 'all' && selected !== '';
    const selectedOption = options.find(o => o.value === selected);
    // If not selected or selected value doesn't exist in options, show default label.
    // However, if the user explicitly wants "all", maybe options has an object {value: 'all', label: 'Tất cả'}.
    const selectedLabel = selectedOption ? selectedOption.label : label;

    const renderContent = () => {
        // We always use the text-[10px] with uppercase and tracking-wider to match other inputs.
        // If variant=compact OR there is no selection, show it plainly (with indigo color if selected)
        if (!hasSelection || variant === 'compact') {
            return <span className={`font-black uppercase tracking-wider whitespace-nowrap text-[10px] ${hasSelection ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {variant === 'compact' && hasSelection && selectedLabel !== 'Tất cả' ? selectedLabel : label}
            </span>;
        }

        // Default variant with a selection shows a pill
        return (
            <span className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] px-1.5 py-0.5 rounded-md border border-indigo-100/50 dark:border-indigo-800/50 font-bold max-w-[120px] truncate">
                {selectedLabel}
            </span>
        );
    };

    return (
        <div className={`relative w-full ${className}`} ref={containerRef} style={{ zIndex: isOpen ? 50 : 11 }}>
            <button 
                type="button" 
                onClick={() => setIsOpen(!isOpen)} 
                className={`w-full flex items-center justify-between rounded-xl border transition-all duration-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                    variant === 'compact' ? 'min-h-[32px] py-1' : 'min-h-[38px] py-1.5'
                } ${
                    hasSelection || isOpen
                    ? 'border-indigo-500 bg-white dark:bg-slate-800 shadow-md ring-2 ring-indigo-500/10' 
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'
                }`}
            >
                <div className="flex-grow flex items-center overflow-hidden pr-2">
                    {renderContent()}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
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
                        top: containerRef.current ? containerRef.current.getBoundingClientRect().bottom + 4 : 0,
                        left: containerRef.current ? Math.min(containerRef.current.getBoundingClientRect().left, window.innerWidth - 180) : 0,
                    }}
                    className="z-[999999] overflow-hidden bg-white dark:bg-slate-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-black/40 border border-slate-200 dark:border-slate-700 flex flex-col backdrop-blur-sm w-max max-w-[90vw]"
                >
                    {options.length > 5 && (
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30">
                        <div className="relative">
                            <Icon name="search" size={3.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder={placeholder}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && filteredOptions.length > 0) {
                                        e.preventDefault();
                                        handleSelectOption(filteredOptions[0].value);
                                    }
                                }}
                                className="w-full text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-2 flex-1 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                autoFocus
                            />
                        </div>
                    </div>
                    )}

                    <div className="flex-grow overflow-y-auto custom-scrollbar p-1 max-h-48">
                        {filteredOptions.length > 0 ? (
                            <div className="grid grid-cols-1 gap-0.5">
                                {filteredOptions.map(option => {
                                    const isSelected = selected === option.value;
                                    return (
                                        <button
                                            type="button"
                                            key={option.value}
                                            onClick={() => handleSelectOption(option.value)}
                                            className={`flex items-center justify-between w-full text-left px-2.5 py-2 rounded-lg transition-all ${
                                                isSelected 
                                                ? 'bg-indigo-50/60 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' 
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                            }`}
                                        >
                                            <span className={`text-[12px] truncate ${isSelected ? 'font-black' : 'font-medium'}`}>{option.label}</span>
                                            {isSelected && <Icon name="check" size={3.5} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                                <Icon name="search-x" size={6} className="text-slate-300 mb-2" />
                                <p className="text-[11px] text-slate-500 font-medium">Không có kết quả</p>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SingleSelectDropdown;
