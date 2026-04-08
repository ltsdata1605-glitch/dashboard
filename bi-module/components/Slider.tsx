
import React from 'react';
import { ResetIcon } from './Icons';

interface SliderProps {
    label: React.ReactNode;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    displayValue?: React.ReactNode;
    onReset?: () => void;
    showInput?: boolean;
}

const Slider: React.FC<SliderProps> = ({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    unit = '%',
    displayValue,
    onReset,
    showInput = true
}) => {
    return (
        <div className="group/slider">
            <div className="flex justify-between items-center mb-1.5">
                <div className="flex-1 min-w-0 pr-2">
                    <label className="text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate block">
                        {label}
                    </label>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                    {displayValue !== undefined ? (
                        <div className="text-right">{displayValue}</div>
                    ) : (
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 focus-within:border-primary-500 transition-colors">
                            <input 
                                type="number"
                                value={value}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) onChange(val);
                                }}
                                className="w-12 bg-transparent text-right text-xs font-black text-primary-600 dark:text-primary-400 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[10px] font-bold text-slate-400">{unit}</span>
                        </div>
                    )}
                    
                    {onReset && (
                        <button
                            type="button"
                            onClick={onReset}
                            className="p-1 text-slate-400 hover:text-primary-500 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all opacity-0 group-hover/slider:opacity-100"
                            title="Reset về mặc định"
                        >
                            <ResetIcon className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>
            
            <div className="relative h-6 flex items-center">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary-500 hover:accent-primary-600 transition-all"
                />
            </div>
        </div>
    );
};

export default Slider;
