
import React from 'react';
import { Icon } from './Icon';

interface DropdownFilterProps {
    type: string;
    label: string;
    options: string[];
    selected: string[];
    onChange: (type: string, selected: string[]) => void;
    hideLabel?: boolean;
    debugId?: string;
    debugInfo?: string;
}

const DropdownFilter: React.FC<DropdownFilterProps> = ({ type, label, options, selected, onChange, hideLabel = false, debugId, debugInfo }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(type, e.target.checked ? options : []);
    };
    
    const handleOptionChange = (option: string) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onChange(type, newSelected);
    };

    const filteredOptions = options.filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let displayLabel = `Lọc ${label.toLowerCase()}`;
    if (selected.length > 0 && selected.length < options.length) {
        displayLabel = `${label} (${selected.length})`;
    } else if (selected.length === options.length && options.length > 0) {
        displayLabel = `${label} (Tất cả)`;
    }


    return (
        <div data-debug-id={debugId} data-debug-info={debugInfo} className="w-full">
            {!hideLabel && <label className="block text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 mb-2 tracking-widest ml-1">{label}</label>}
            <div className="relative" ref={containerRef}>
                <button 
                    onClick={() => setIsOpen(!isOpen)} 
                    className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 inline-flex justify-between items-center text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-200 transition-all outline-none"
                >
                    <span className="truncate">{displayLabel}</span>
                    <Icon name="chevron-down" size={4} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isOpen && (
                    <div className="absolute z-[100] mt-2 w-full rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 ring-1 ring-black/5 p-4 animate-in fade-in zoom-in-95 duration-200">
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full text-base bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none mb-3"
                        />
                        <div className="flex items-center border-b border-slate-50 dark:border-slate-800 pb-3 mb-2 px-1">
                            <input 
                                type="checkbox" 
                                id={`select-all-${type}`} 
                                checked={options.length > 0 && selected.length === options.length} 
                                onChange={handleSelectAll} 
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                            />
                            <label htmlFor={`select-all-${type}`} className="ml-3 block text-sm font-bold text-indigo-600 cursor-pointer">Chọn tất cả</label>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
                            {filteredOptions.length > 0 ? filteredOptions.map(option => (
                                <label key={option} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group">
                                    <div className="flex items-center min-w-0">
                                        <input 
                                            type="checkbox" 
                                            id={`cb-${type}-${option}`} 
                                            value={option} 
                                            checked={selected.includes(option)} 
                                            onChange={() => handleOptionChange(option)} 
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                                        />
                                        <span className="ml-3 block text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{option}</span>
                                    </div>
                                    <Icon name="chevron-right" size={3} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </label>
                            )) : (
                                <p className="text-center text-xs text-slate-400 py-4 font-bold">Không tìm thấy kết quả</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DropdownFilter;
