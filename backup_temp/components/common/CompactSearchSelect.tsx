import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Icon } from './Icon';

interface CompactSearchSelectProps {
    value: string;
    options: string[];
    onChange: (val: string) => void;
    defaultLabel?: string;
    className?: string;
    dropdownAlign?: 'left' | 'right';
}

export const CompactSearchSelect: React.FC<CompactSearchSelectProps> = ({
    value, options, onChange, defaultLabel = 'Tất cả', className = '', dropdownAlign = 'left'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const filteredOptions = useMemo(() => {
         return options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
    }, [options, search]);

    return (
        <div className={`relative inline-block ${className}`} ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-1.5 focus:outline-none"
                title={value === 'all' ? defaultLabel : value}
            >
                <span className="truncate block">{value === 'all' ? defaultLabel : value}</span>
                <Icon name="chevron-down" size={3.5} className="opacity-50 flex-shrink-0" />
            </button>
            
            {isOpen && (
                <div className={`absolute z-50 mt-1 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${dropdownAlign === 'right' ? 'right-0' : 'left-0'}`}>
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                        <div className="relative">
                            <Icon name="search" size={3.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Tìm kiếm..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                            />
                        </div>
                    </div>
                    <ul className="max-h-48 overflow-y-auto w-full custom-scrollbar py-1">
                        <li 
                            onClick={() => { onChange('all'); setIsOpen(false); }}
                            className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 ${value === 'all' ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                            <span>{defaultLabel}</span>
                            {value === 'all' && <Icon name="check" size={3.5} />}
                        </li>
                        {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                            <li 
                                key={opt}
                                onClick={() => { onChange(opt); setIsOpen(false); }}
                                className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 ${value === opt ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                            >
                                <span className="truncate pr-2">{opt}</span>
                                {value === opt && <Icon name="check" size={3.5} className="flex-shrink-0" />}
                            </li>
                        )) : (
                            <li className="px-3 py-3 text-xs text-center text-slate-400">Không có kết quả</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};
